const Sidebar = (() => {
  let _currentId = null;
  let _callbacks = {};

  // ── Init ─────────────────────────────────────────────────────────────
  function init(callbacks) {
    _callbacks = callbacks;
    document.getElementById('btn-sidebar-close')
      .addEventListener('click', close);
  }

  // ── Public API ───────────────────────────────────────────────────────
  async function open(entity) {
    _currentId = entity.id;

    const [ancestors, children] = await Promise.all([
      Engine.getAncestors(entity.id),
      Engine.getChildren(entity.id),
    ]);

    _render(entity, ancestors, children);

    const sidebar = document.getElementById('sidebar');
    sidebar.classList.add('open');
  }

  function close() {
    document.getElementById('sidebar').classList.remove('open');
    _currentId = null;
  }

  async function refreshCurrent() {
    if (!_currentId) return;
    const entity = await Engine.getEntity(_currentId);
    if (entity) await open(entity);
    else close();
  }

  function getCurrentId() { return _currentId; }

  // ── Rendering ────────────────────────────────────────────────────────
  function _render(entity, ancestors, children) {
    const info    = Engine.getTypeInfo(entity.type);
    const content = document.getElementById('sidebar-content');

    content.style.setProperty('--mc', info.color);
    content.innerHTML = `
      ${_renderBadge(info, entity)}
      ${_renderTitle(entity)}
      ${_renderPath(ancestors)}
      ${_renderDescription(entity)}
      ${_renderAttributes(entity)}
      ${_renderTags(entity)}
      ${_renderChildren(children)}
      ${_renderGmNotes(entity)}
      ${_renderActions(entity)}
      ${_renderMeta(entity)}
    `;

    _bindSidebarEvents(content, entity);
  }

  function _renderBadge(info, entity) {
    return `<div class="sb-type-badge" style="--mc:${escHtml(info.color)}">${escHtml(info.icon)} ${escHtml(info.label)}</div>`;
  }

  function _renderTitle(entity) {
    return `<h2 class="sb-title">${escHtml(entity.name)}</h2>`;
  }

  function _renderPath(ancestors) {
    if (!ancestors.length) return '';
    const segs = ancestors.map((a, i) =>
      `<span class="sb-path-seg" data-path-id="${escHtml(a.id)}">${escHtml(a.name)}</span>` +
      (i < ancestors.length - 1 ? '<span class="sb-path-sep"> › </span>' : '')
    ).join('');
    return `<div class="sb-path">${segs}</div>`;
  }

  function _renderDescription(entity) {
    if (!entity.description) return '';
    return `<p class="sb-description">${escHtml(entity.description)}</p>`;
  }

  function _renderAttributes(entity) {
    const attrs = Object.entries(entity.attributes || {});
    if (!attrs.length) return '';
    const rows = attrs.map(([k, v]) =>
      `<span class="sb-attr-key">${escHtml(k)}</span><span class="sb-attr-val">${escHtml(v)}</span>`
    ).join('');
    return `<div class="sb-section">
      <div class="sb-section-title">Attributes</div>
      <div class="sb-attr-grid">${rows}</div>
    </div>`;
  }

  function _renderTags(entity) {
    const tags = entity.tags || [];
    if (!tags.length) return '';
    const pills = tags.map(t => `<span class="sb-tag">${escHtml(t)}</span>`).join('');
    return `<div class="sb-section">
      <div class="sb-section-title">Tags</div>
      <div class="sb-tags">${pills}</div>
    </div>`;
  }

  function _renderChildren(children) {
    if (!children.length) return '';
    const items = children.map(c => {
      const ci = Engine.getTypeInfo(c.type);
      return `<div class="sb-child" data-child-id="${escHtml(c.id)}">
        <span class="sb-child-icon">${escHtml(ci.icon)}</span>
        <span class="sb-child-name">${escHtml(c.name)}</span>
        <span class="sb-child-type">${escHtml(ci.label)}</span>
      </div>`;
    }).join('');
    return `<div class="sb-section">
      <div class="sb-section-title">Contains (${children.length})</div>
      <div class="sb-children">${items}</div>
    </div>`;
  }

  function _renderGmNotes(entity) {
    if (!entity.gmNotes) return '';
    return `<div class="sb-section">
      <div class="sb-section-title">GM Notes</div>
      <div class="sb-gm-notes">${escHtml(entity.gmNotes)}</div>
    </div>`;
  }

  function _renderActions(entity) {
    const canNavigate = Engine.isNavigable(entity.type);
    return `<div class="sb-section sb-actions">
      <button class="btn-ghost" id="sb-btn-edit">✏ Edit</button>
      ${canNavigate ? '<button class="btn-ghost" id="sb-btn-navigate">🗺 Navigate to</button>' : ''}
      <button class="btn-ghost" id="sb-btn-newtab">↗ New tab</button>
    </div>`;
  }

  function _renderMeta(entity) {
    const fmt = iso => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
    return `<div class="sb-meta">
      Created ${escHtml(fmt(entity.createdAt))} · Updated ${escHtml(fmt(entity.updatedAt))}
    </div>`;
  }

  // ── Event delegation ─────────────────────────────────────────────────
  function _bindSidebarEvents(content, entity) {
    content.querySelector('#sb-btn-edit')
      ?.addEventListener('click', () => _callbacks.onEdit?.(entity));

    content.querySelector('#sb-btn-navigate')
      ?.addEventListener('click', () => _callbacks.onNavigateTo?.(entity));

    content.querySelector('#sb-btn-newtab')
      ?.addEventListener('click', () => {
        const url = new URL(location.href);
        url.hash  = `/entity/${entity.id}`;
        window.open(url.toString(), '_blank');
      });

    content.querySelectorAll('.sb-path-seg').forEach(el => {
      el.addEventListener('click', async () => {
        const ancestor = await Engine.getEntity(el.dataset.pathId);
        if (ancestor) _callbacks.onNavigateTo?.(ancestor);
      });
    });

    content.querySelectorAll('.sb-child').forEach(el => {
      el.addEventListener('click', async () => {
        const child = await Engine.getEntity(el.dataset.childId);
        if (child) open(child);
      });
    });
  }

  return { init, open, close, refreshCurrent, getCurrentId };
})();
