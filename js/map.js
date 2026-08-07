const MapView = (() => {
  let _contextId = null;
  let _callbacks = {};

  // Single global drag state — avoids N×2 listener accumulation
  let _drag = null;

  // ── Init ─────────────────────────────────────────────────────────────
  function init(callbacks) {
    _callbacks = callbacks;

    document.addEventListener('mousemove', _onDragMove);
    document.addEventListener('mouseup',   _onDragEnd);

    document.getElementById('markers-layer')
      .addEventListener('contextmenu', _onMapRightClick);
  }

  // ── Public API ───────────────────────────────────────────────────────
  async function loadContext(entityId, animate = false) {
    _contextId = entityId;

    const [entity, children] = await Promise.all([
      Engine.getEntity(entityId),
      Engine.getChildren(entityId),
    ]);

    _render(entity, children, animate);
  }

  async function refresh() {
    if (_contextId) await loadContext(_contextId, false);
  }

  function getContextId() { return _contextId; }

  // ── Rendering ────────────────────────────────────────────────────────
  function _render(entity, children, animate) {
    const bg     = document.getElementById('map-bg');
    const layer  = document.getElementById('markers-layer');
    const mapWrap = document.getElementById('map-wrap');

    // Background
    if (entity?.imageUrl) {
      bg.style.backgroundImage = `url(${CSS.escape ? entity.imageUrl : JSON.stringify(entity.imageUrl)})`;
      bg.style.backgroundImage = `url("${entity.imageUrl.replace(/"/g, '%22')}")`;
    } else {
      bg.style.backgroundImage = 'none';
      bg.style.background = _proceduralGradient(entity?.id || '');
    }

    // Fade-in on context switch
    if (animate) {
      mapWrap.classList.remove('fading', 'loading');
      void mapWrap.offsetWidth; // reflow to restart animation
      mapWrap.classList.add('loading');
      mapWrap.addEventListener('animationend', () => mapWrap.classList.remove('loading'), { once: true });
    }

    // Markers
    layer.innerHTML = '';
    for (const child of children) {
      layer.appendChild(_makeMarker(child));
    }
  }

  function _makeMarker(entity) {
    const info = Engine.getTypeInfo(entity.type);
    const el   = document.createElement('div');

    el.className = 'map-marker';
    el.dataset.id         = entity.id;
    el.dataset.type       = entity.type;
    el.dataset.navigable  = Engine.isNavigable(entity.type);
    el.style.left         = (entity.position?.x ?? 50) + '%';
    el.style.top          = (entity.position?.y ?? 50) + '%';
    el.style.setProperty('--mc', info.color);

    el.innerHTML = `
      <div class="marker-dot">${escHtml(info.icon)}</div>
      <div class="marker-label">${escHtml(entity.name)}</div>
    `;

    el.addEventListener('click',     (e) => _onMarkerClick(e, entity));
    el.addEventListener('auxclick',  (e) => { if (e.button === 1) _onMarkerMiddleClick(entity); });
    el.addEventListener('contextmenu', (e) => { e.stopPropagation(); _onMarkerRightClick(e, entity); });
    el.addEventListener('mousedown', (e) => { if (e.button === 0) _onDragStart(e, entity, el); });

    return el;
  }

  // ── Procedural background ─────────────────────────────────────────── 
  function _proceduralGradient(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
    // Rotate through earthy hues (green-forest, navy-deep, ember) instead of full spectrum
    const palettes = [
      'radial-gradient(ellipse at 28% 38%, rgba(40,60,30,0.65) 0%, transparent 52%), radial-gradient(ellipse at 68% 58%, rgba(30,30,58,0.65) 0%, transparent 48%), linear-gradient(140deg, #0e1a18 0%, #0d1020 55%, #180e0a 100%)',
      'radial-gradient(ellipse at 35% 45%, rgba(30,50,58,0.70) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(40,28,58,0.60) 0%, transparent 45%), linear-gradient(140deg, #0a1520 0%, #0d0820 55%, #100e1a 100%)',
      'radial-gradient(ellipse at 25% 55%, rgba(58,38,20,0.60) 0%, transparent 50%), radial-gradient(ellipse at 65% 40%, rgba(30,40,20,0.65) 0%, transparent 48%), linear-gradient(140deg, #180e08 0%, #0d1010 55%, #0e1820 100%)',
    ];
    return palettes[h % palettes.length];
  }

  // ── Click handlers ───────────────────────────────────────────────────
  function _onMarkerClick(e, entity) {
    e.preventDefault();
    if (_drag?.moved) return; // was a drag, not a click

    if (Engine.isNavigable(entity.type)) {
      _animateNavigate(e.currentTarget, entity);
    } else {
      _callbacks.onSelect?.(entity, false);
    }
  }

  function _onMarkerMiddleClick(entity) {
    _callbacks.onSelect?.(entity, true);
  }

  function _onMarkerRightClick(e, entity) {
    e.preventDefault();
    ContextMenu.show(e.clientX, e.clientY, [
      { action: 'open',   label: 'Open',   handler: () => _callbacks.onSelect?.(entity, false) },
      { action: 'edit',   label: 'Edit',   handler: () => _callbacks.onEdit?.(entity) },
      { action: 'delete', label: 'Delete', danger: true, handler: () => _callbacks.onDelete?.(entity) },
    ]);
  }

  function _onMapRightClick(e) {
    // Only fires when clicking the empty map (markers stop propagation)
    e.preventDefault();
    const layer = document.getElementById('markers-layer');
    const rect  = layer.getBoundingClientRect();
    const x     = ((e.clientX - rect.left) / rect.width)  * 100;
    const y     = ((e.clientY - rect.top)  / rect.height) * 100;

    ContextMenu.show(e.clientX, e.clientY, [
      {
        action: 'add',
        label:  'Add entity here',
        handler: () => _callbacks.onAddAt?.({ x: +x.toFixed(2), y: +y.toFixed(2) }),
      },
    ]);
  }

  // ── Zoom navigation animation ─────────────────────────────────────── 
  function _animateNavigate(markerEl, entity) {
    const mapWrap = document.getElementById('map-wrap');
    markerEl.classList.add('navigating');
    mapWrap.classList.add('fading');

    setTimeout(() => {
      markerEl.classList.remove('navigating');
      mapWrap.classList.remove('fading');
      _callbacks.onNavigate?.(entity);
    }, 420);
  }

  // ── Drag ─────────────────────────────────────────────────────────────
  function _onDragStart(e, entity, el) {
    e.preventDefault();
    const layer = document.getElementById('markers-layer');
    _drag = {
      entityId:  entity.id,
      el,
      container: layer,
      startX:    e.clientX,
      startY:    e.clientY,
      x:         entity.position?.x ?? 50,
      y:         entity.position?.y ?? 50,
      moved:     false,
    };
  }

  function _onDragMove(e) {
    if (!_drag) return;
    if (!_drag.moved && Math.hypot(e.clientX - _drag.startX, e.clientY - _drag.startY) < 6) return;

    _drag.moved = true;
    const rect  = _drag.container.getBoundingClientRect();
    _drag.x = Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width  * 100));
    _drag.y = Math.max(0, Math.min(100, (e.clientY - rect.top)  / rect.height * 100));

    _drag.el.style.left = _drag.x + '%';
    _drag.el.style.top  = _drag.y + '%';
  }

  async function _onDragEnd() {
    if (!_drag) return;
    if (_drag.moved) {
      await Engine.updateEntity(_drag.entityId, {
        position: { x: +_drag.x.toFixed(2), y: +_drag.y.toFixed(2) },
      });
    }
    _drag = null;
  }

  return { init, loadContext, refresh, getContextId };
})();
