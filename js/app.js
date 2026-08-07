const App = (() => {
  // ── State ─────────────────────────────────────────────────────────────
  let _navStack = []; // history of entityId strings
  let _searchTimer = null;

  // ── Bootstrap ─────────────────────────────────────────────────────────
  async function init() {
    await Engine.init();

    _wireModules();
    _wireTopbar();
    _wireWorldManager();
    _wireKeyboard();

    const worlds = await Engine.getAllWorlds();

    if (worlds.length === 0) {
      await _loadSampleData();
    }

    const startWorlds = await Engine.getAllWorlds();
    if (startWorlds.length === 0) {
      _showEmptyState();
      return;
    }

    // Restore or default to first world
    let activeId = Engine.getActiveWorldId();
    if (!activeId || !startWorlds.find(w => w.id === activeId)) {
      activeId = startWorlds[0].id;
      await Engine.setActiveWorld(activeId);
    }

    // Hash routing
    const hash = location.hash;
    const entityMatch = hash.match(/^#\/entity\/(.+)$/);
    if (entityMatch) {
      const entity = await Engine.getEntity(entityMatch[1]);
      if (entity) {
        const worldId = await Engine.getWorldForEntity(entity.id);
        if (worldId) await Engine.setActiveWorld(worldId.id);
        await _navigateTo(entity);
        return;
      }
    }

    await _openWorld(activeId);
  }

  // ── Module wiring ──────────────────────────────────────────────────────
  function _wireModules() {
    MapView.init({
      onNavigate: _onMapNavigate,
      onSelect:   _onMapSelect,
      onEdit:     _onEdit,
      onDelete:   _onDelete,
      onAddAt:    _onAddAt,
    });

    Sidebar.init({
      onNavigateTo: _navigateTo,
      onEdit:       _onEdit,
    });

    EntityEditor.init({
      onSaved: _onEntitySaved,
    });
  }

  // ── Topbar ─────────────────────────────────────────────────────────────
  function _wireTopbar() {
    document.getElementById('btn-worlds')
      .addEventListener('click', _showWorldManager);

    document.getElementById('btn-new-entity')
      .addEventListener('click', () => EntityEditor.openNew({}));

    document.getElementById('btn-nav-back')
      .addEventListener('click', _navBack);

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => _runSearch(searchInput.value), 180);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { searchInput.value = ''; _clearSearch(); }
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────
  async function _openWorld(worldId) {
    _navStack = [];
    const world = await Engine.getEntity(worldId);
    if (!world) return;

    _navStack.push(worldId);
    await MapView.loadContext(worldId, false);
    _syncViews();
    _renderBreadcrumb();
    document.getElementById('btn-new-entity').disabled = false;
  }

  async function _navigateTo(entity) {
    if (!entity) return;
    const alreadyActive = _navStack[_navStack.length - 1] === entity.id;
    if (!alreadyActive) _navStack.push(entity.id);

    if (Engine.isNavigable(entity.type)) {
      await MapView.loadContext(entity.id, true);
      _syncViews();
    } else {
      await Sidebar.open(entity);
    }

    _renderBreadcrumb();
  }

  async function _navBack() {
    if (_navStack.length <= 1) return;
    _navStack.pop();
    const id = _navStack[_navStack.length - 1];
    await MapView.loadContext(id, false);
    _syncViews();
    _renderBreadcrumb();
  }

  function _onMapNavigate(entity) {
    _navigateTo(entity);
  }

  function _onMapSelect(entity, newTab) {
    if (newTab) {
      const url = new URL(location.href);
      url.hash  = `/entity/${entity.id}`;
      window.open(url.toString(), '_blank');
    } else {
      Sidebar.open(entity);
    }
  }

  function _onEdit(entity) {
    EntityEditor.open(entity);
  }

  function _onDelete(entity) {
    if (!confirm(`Delete "${entity.name}" and all its children?`)) return;
    Engine.deleteEntity(entity.id).then(() => {
      if (Sidebar.getCurrentId() === entity.id) Sidebar.close();
      MapView.refresh();
    });
  }

  function _onAddAt(opts) {
    EntityEditor.openNew({ position: opts, parentId: MapView.getContextId() });
  }

  async function _onEntitySaved({ entity, isNew, deleted }) {
    await MapView.refresh();

    if (!deleted && !isNew) {
      // If sidebar was showing this entity, refresh it
      if (Sidebar.getCurrentId() === entity.id) {
        await Sidebar.refreshCurrent();
      }
    } else if (deleted) {
      if (Sidebar.getCurrentId() === entity.id) Sidebar.close();
    } else if (isNew && Engine.isNavigable(entity.type)) {
      // Could auto-navigate to new navigable — just refresh for now
    }
  }

  // ── View sync ──────────────────────────────────────────────────────────
  function _syncViews() {
    const mapView    = document.getElementById('map-view');
    const listView   = document.getElementById('list-view');
    const emptyState = document.getElementById('empty-state');

    // Always show map when there's a context
    if (MapView.getContextId()) {
      mapView.classList.add('active');
      listView.classList.remove('active');
      emptyState.classList.remove('active');
    } else {
      mapView.classList.remove('active');
      emptyState.classList.add('active');
    }

    // Back button visibility
    document.getElementById('btn-nav-back').style.display =
      _navStack.length > 1 ? 'inline-flex' : 'none';
  }

  function _showEmptyState() {
    document.getElementById('map-view').classList.remove('active');
    document.getElementById('list-view').classList.remove('active');
    document.getElementById('empty-state').classList.add('active');
  }

  // ── Breadcrumb ─────────────────────────────────────────────────────────
  async function _renderBreadcrumb() {
    const crumb = document.getElementById('breadcrumb');
    if (!crumb) return;

    const parts = [];
    for (const id of _navStack) {
      const entity = await Engine.getEntity(id);
      if (entity) parts.push({ id, name: entity.name });
    }

    crumb.innerHTML = parts.map((p, i) =>
      i < parts.length - 1
        ? `<span class="crumb-seg crumb-link" data-crumb-id="${escHtml(p.id)}">${escHtml(p.name)}</span><span class="crumb-sep"> › </span>`
        : `<span class="crumb-seg">${escHtml(p.name)}</span>`
    ).join('');

    crumb.querySelectorAll('.crumb-link').forEach(el => {
      el.addEventListener('click', async () => {
        const idx = _navStack.indexOf(el.dataset.crumbId);
        if (idx !== -1) {
          _navStack = _navStack.slice(0, idx + 1);
          const id  = _navStack[idx];
          await MapView.loadContext(id, false);
          _syncViews();
          _renderBreadcrumb();
        }
      });
    });
  }

  // ── Search ──────────────────────────────────────────────────────────────
  async function _runSearch(query) {
    if (!query.trim()) { _clearSearch(); return; }

    const results  = await Engine.searchEntities(query);
    const listView = document.getElementById('list-view');
    const mapView  = document.getElementById('map-view');

    mapView.classList.remove('active');
    listView.classList.add('active');

    document.getElementById('search-results').innerHTML = results.length
      ? results.map(e => {
          const info = Engine.getTypeInfo(e.type);
          return `<div class="search-result" data-result-id="${escHtml(e.id)}">
            <span class="sr-icon">${escHtml(info.icon)}</span>
            <div class="sr-body">
              <span class="sr-name">${escHtml(e.name)}</span>
              <span class="sr-type">${escHtml(info.label)}</span>
            </div>
          </div>`;
        }).join('')
      : '<div class="search-empty">No results found.</div>';

    document.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', async () => {
        const entity = await Engine.getEntity(el.dataset.resultId);
        if (entity) {
          _clearSearch();
          await Sidebar.open(entity);
        }
      });
    });
  }

  function _clearSearch() {
    document.getElementById('list-view').classList.remove('active');
    if (MapView.getContextId()) {
      document.getElementById('map-view').classList.add('active');
    }
  }

  // ── World Manager ──────────────────────────────────────────────────────
  function _wireWorldManager() {
    document.getElementById('btn-world-modal-close')
      .addEventListener('click', _hideWorldManager);

    document.getElementById('world-modal-overlay')
      .addEventListener('click', (e) => {
        if (e.target.id === 'world-modal-overlay') _hideWorldManager();
      });

    document.getElementById('btn-create-world')
      .addEventListener('click', _createWorld);

    document.getElementById('btn-import-world')
      .addEventListener('click', _importWorld);
  }

  function _showWorldManager() {
    _renderWorldList();
    const overlay = document.getElementById('world-modal-overlay');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function _hideWorldManager() {
    const overlay = document.getElementById('world-modal-overlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  async function _renderWorldList() {
    const worlds = await Engine.getAllWorlds();
    const list   = document.getElementById('world-list');

    list.innerHTML = worlds.length ? worlds.map(w =>
      `<div class="world-item ${w.id === Engine.getActiveWorldId() ? 'active' : ''}" data-world-id="${escHtml(w.id)}">
        <div class="world-item-name">${escHtml(w.name)}</div>
        <div class="world-item-desc">${escHtml(w.description || '')}</div>
        <div class="world-item-actions">
          <button class="btn-ghost btn-sm" data-action="open"   data-world-id="${escHtml(w.id)}">Open</button>
          <button class="btn-ghost btn-sm" data-action="export" data-world-id="${escHtml(w.id)}">Export</button>
          <button class="btn-danger btn-sm" data-action="delete" data-world-id="${escHtml(w.id)}">Delete</button>
        </div>
      </div>`
    ).join('') : '<div class="world-empty">No worlds yet. Create one below.</div>';

    list.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.worldId;
        if (btn.dataset.action === 'open')   { await _openWorld(id); _hideWorldManager(); }
        if (btn.dataset.action === 'export') { await _exportWorld(id); }
        if (btn.dataset.action === 'delete') { await _deleteWorld(id); _renderWorldList(); }
      });
    });
  }

  async function _createWorld() {
    const name = prompt('World name:');
    if (!name?.trim()) return;
    const world = await Engine.createWorld({ name: name.trim() });
    await Engine.setActiveWorld(world.id);
    await _openWorld(world.id);
    _hideWorldManager();
  }

  async function _exportWorld(worldId) {
    const data = await Engine.exportWorld(worldId);
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a    = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(blob),
      download: `${data.world.name.replace(/\s+/g, '_')}.loreweaver.json`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function _importWorld() {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json' });
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data?.world) { alert('Invalid LoreWeaver export file.'); return; }
        const world = await Engine.importWorld(data);
        await Engine.setActiveWorld(world.id);
        await _openWorld(world.id);
        _hideWorldManager();
      } catch {
        alert('Failed to import world. Check the file format.');
      }
    });
    input.click();
  }

  async function _deleteWorld(worldId) {
    const world = await Engine.getEntity(worldId);
    if (!confirm(`Delete world "${world?.name}" and all its contents? This cannot be undone.`)) return;
    await Engine.deleteEntity(worldId);
    if (Engine.getActiveWorldId() === worldId) {
      _navStack = [];
      _showEmptyState();
    }
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  function _wireKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ContextMenu.hide();
        Sidebar.close();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('search-input').focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (MapView.getContextId()) EntityEditor.openNew({});
      }
    });
  }

  // ── Sample data ────────────────────────────────────────────────────────
  async function _loadSampleData() {
    await Engine.importWorld(SAMPLE_WORLD);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
