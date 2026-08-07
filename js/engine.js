const Engine = (() => {
  const P = 'lw_';

  // ── Type registry ────────────────────────────────────────────────────
  const TYPES = {
    world:    { label: 'World',    icon: '🌍', color: '#c8963c' },
    region:   { label: 'Region',   icon: '🗺️',  color: '#3a80c8', navigable: true },
    location: { label: 'Location', icon: '📍', color: '#3ac860', navigable: true },
    npc:      { label: 'NPC',      icon: '👤', color: '#c840c8' },
    faction:  { label: 'Faction',  icon: '⚔️',  color: '#c85840' },
    quest:    { label: 'Quest',    icon: '📜', color: '#c8c840' },
    item:     { label: 'Item',     icon: '💎', color: '#40c8c8' },
    event:    { label: 'Event',    icon: '⚡', color: '#c89640' },
    note:     { label: 'Note',     icon: '📝', color: '#909090' },
  };

  const ALLOWED_CHILDREN = {
    world:    ['region', 'location', 'npc', 'faction', 'quest', 'item', 'event', 'note'],
    region:   ['region', 'location', 'npc', 'faction', 'quest', 'item', 'event', 'note'],
    location: ['npc', 'faction', 'quest', 'item', 'event', 'note'],
  };

  let _activeWorldId = null;

  // ── Key helpers ──────────────────────────────────────────────────────
  const _eKey  = id  => P + 'entity_' + id;
  const _wiKey = wid => P + 'world_entities_' + wid; // per-world entity ID index

  // ── World entity index ───────────────────────────────────────────────
  // Engine maintains lw_world_entities_{worldId}: string[] so getChildren
  // and searchEntities don't need a cursor scan of all IndexedDB keys.

  async function _indexAdd(worldId, entityId) {
    const ids = (await Store.get(_wiKey(worldId))) || [];
    if (!ids.includes(entityId)) {
      ids.push(entityId);
      await Store.set(_wiKey(worldId), ids);
    }
  }

  async function _indexRemove(worldId, entityId) {
    const ids = (await Store.get(_wiKey(worldId))) || [];
    await Store.set(_wiKey(worldId), ids.filter(id => id !== entityId));
  }

  // Walk up the parent chain to find the world ID for any entity
  async function _worldIdOf(id) {
    let cur = await Store.get(_eKey(id));
    while (cur) {
      if (cur.type === 'world') return cur.id;
      if (!cur.parentId) return null;
      cur = await Store.get(_eKey(cur.parentId));
    }
    return null;
  }

  // ── Entity factory ───────────────────────────────────────────────────
  function _make(type, parentId, data) {
    const now = new Date().toISOString();
    return {
      id:          Store.uuid(),
      type,
      parentId,
      name:        data.name        || ('New ' + (TYPES[type]?.label ?? type)),
      description: data.description || '',
      imageUrl:    data.imageUrl    || null,
      position:    data.position    || { x: 50, y: 50 },
      attributes:  data.attributes  || {},
      tags:        data.tags         || [],
      gmNotes:     data.gmNotes     || '',
      createdAt:   now,
      updatedAt:   now,
    };
  }

  // ── Worlds ───────────────────────────────────────────────────────────
  async function getAllWorlds() {
    const ids    = (await Store.get(P + 'worlds')) || [];
    const worlds = await Promise.all(ids.map(id => Store.get(_eKey(id))));
    return worlds.filter(Boolean);
  }

  async function getWorld() {
    return _activeWorldId ? Store.get(_eKey(_activeWorldId)) : null;
  }

  async function setActiveWorld(id) {
    _activeWorldId = id;
    await Store.set(P + 'active_world', id);
  }

  async function createWorld(data) {
    const world = _make('world', null, data);
    await Store.set(_eKey(world.id), world);

    const ids = (await Store.get(P + 'worlds')) || [];
    ids.push(world.id);
    await Store.set(P + 'worlds', ids);

    return world;
  }

  // ── Entities ─────────────────────────────────────────────────────────
  async function createEntity(type, parentId, data) {
    const entity  = _make(type, parentId, data);
    await Store.set(_eKey(entity.id), entity);

    const worldId = await _worldIdOf(parentId);
    if (worldId) await _indexAdd(worldId, entity.id);

    return entity;
  }

  async function updateEntity(id, data) {
    const entity = await Store.get(_eKey(id));
    if (!entity) throw new Error('Entity not found: ' + id);

    const updated = {
      ...entity, ...data,
      id,
      type:      entity.type,
      createdAt: entity.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await Store.set(_eKey(id), updated);
    return updated;
  }

  async function deleteEntity(id) {
    // Delete children first (recursively)
    const children = await getChildren(id);
    await Promise.all(children.map(c => deleteEntity(c.id)));

    const entity = await Store.get(_eKey(id));
    if (!entity) return;

    if (entity.type === 'world') {
      const ids = (await Store.get(P + 'worlds')) || [];
      await Store.set(P + 'worlds', ids.filter(i => i !== id));
      await Store.remove(_wiKey(id));
      if (_activeWorldId === id) {
        _activeWorldId = null;
        await Store.remove(P + 'active_world');
      }
    } else {
      const worldId = await _worldIdOf(id);
      if (worldId) await _indexRemove(worldId, id);
    }

    await Store.remove(_eKey(id));
  }

  async function getEntity(id) {
    return Store.get(_eKey(id));
  }

  async function getChildren(parentId) {
    const worldId = await _worldIdOf(parentId);
    if (!worldId) return [];

    const ids = (await Store.get(_wiKey(worldId))) || [];
    const all = await Promise.all(ids.map(id => Store.get(_eKey(id))));
    return all.filter(e => e?.parentId === parentId);
  }

  async function getAncestors(id) {
    const ancestors = [];
    let cur = await Store.get(_eKey(id));
    while (cur?.parentId) {
      const parent = await Store.get(_eKey(cur.parentId));
      if (!parent) break;
      ancestors.unshift(parent);
      cur = parent;
    }
    return ancestors;
  }

  async function getWorldForEntity(id) {
    const worldId = await _worldIdOf(id);
    return worldId ? Store.get(_eKey(worldId)) : null;
  }

  async function searchEntities(query) {
    if (!_activeWorldId || !query?.trim()) return [];
    const q   = query.toLowerCase();
    const ids = (await Store.get(_wiKey(_activeWorldId))) || [];
    const all = await Promise.all(ids.map(id => Store.get(_eKey(id))));
    return all.filter(e => e && (
      e.name.toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q) ||
      (e.tags || []).some(t => t.toLowerCase().includes(q))
    ));
  }

  // ── Import / Export ──────────────────────────────────────────────────
  async function exportWorld(worldId) {
    const world = await Store.get(_eKey(worldId));
    if (!world) return null;

    const ids      = (await Store.get(_wiKey(worldId))) || [];
    const entities = (await Promise.all(ids.map(id => Store.get(_eKey(id))))).filter(Boolean);

    return { world, entities };
  }

  async function importWorld(data) {
    const raw   = JSON.parse(JSON.stringify(data)); // deep copy — don't mutate source
    const idMap = {};
    const remap = (old) => { if (!idMap[old]) idMap[old] = Store.uuid(); return idMap[old]; };
    const now   = new Date().toISOString();

    const world = { ...raw.world, id: remap(raw.world.id), createdAt: now, updatedAt: now };
    await Store.set(_eKey(world.id), world);

    const wIds = (await Store.get(P + 'worlds')) || [];
    wIds.push(world.id);
    await Store.set(P + 'worlds', wIds);

    const entityIds = [];
    for (const e of (raw.entities || [])) {
      const entity = {
        ...e,
        id:        remap(e.id),
        parentId:  e.parentId ? remap(e.parentId) : world.id,
        createdAt: now,
        updatedAt: now,
      };
      await Store.set(_eKey(entity.id), entity);
      entityIds.push(entity.id);
    }

    await Store.set(_wiKey(world.id), entityIds);
    return world;
  }

  // ── Bootstrap ────────────────────────────────────────────────────────
  async function init() {
    const savedId = await Store.get(P + 'active_world');
    if (savedId) _activeWorldId = savedId;
  }

  // ── Type helpers ─────────────────────────────────────────────────────
  function getTypeInfo(type)          { return TYPES[type] || { label: type, icon: '?', color: '#94a3b8' }; }
  function getAllTypes()               { return Object.entries(TYPES).map(([type, info]) => ({ type, ...info })); }
  function getAllowedChildTypes(pType) { return ALLOWED_CHILDREN[pType] || []; }
  function isNavigable(type)          { return !!TYPES[type]?.navigable; }
  function getActiveWorldId()         { return _activeWorldId; }

  return {
    init,
    getAllWorlds, getWorld, setActiveWorld, createWorld,
    createEntity, updateEntity, deleteEntity, getEntity,
    getChildren, getAncestors, getWorldForEntity, searchEntities,
    exportWorld, importWorld,
    getTypeInfo, getAllTypes, getAllowedChildTypes, isNavigable, getActiveWorldId,
  };
})();
