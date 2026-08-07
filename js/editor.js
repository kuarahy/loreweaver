const EntityEditor = (() => {
  let _callbacks  = {};
  let _editId     = null; // null = new entity
  let _parentId   = null;
  let _position   = null;

  // ── Init ─────────────────────────────────────────────────────────────
  function init(callbacks) {
    _callbacks = callbacks;

    document.getElementById('btn-modal-close')
      .addEventListener('click', _close);

    document.getElementById('modal-overlay')
      .addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') _close(); });

    // Attribute row deletion — delegated to modal-body
    document.getElementById('modal-body')
      .addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-del-attr')) {
          e.target.closest('.attr-row').remove();
        }
      });
  }

  // ── Public API ───────────────────────────────────────────────────────
  function open(entity) {
    _editId   = entity.id;
    _parentId = entity.parentId;
    _position = entity.position;
    _renderForm(entity);
    _openOverlay();
  }

  function openNew(opts = {}) {
    _editId   = null;
    _parentId = opts.parentId || MapView.getContextId();
    _position = opts.position || null;
    _renderForm(null);
    _openOverlay();
  }

  // ── Form rendering ───────────────────────────────────────────────────
  function _renderForm(entity) {
    const isEdit    = !!entity;
    const parentType = null; // could resolve for type filtering — future enhancement
    const allowedTypes = _parentId
      ? Engine.getAllowedChildTypes(_getParentType())
      : Engine.getAllTypes().map(t => t.type);

    document.getElementById('modal-title').textContent = isEdit ? 'Edit Entity' : 'New Entity';

    document.getElementById('modal-body').innerHTML = `
      <div class="form-group">
        <label class="form-label" for="f-type">Type</label>
        <select id="f-type" class="form-select" ${isEdit ? 'disabled' : ''}>
          ${_typeOptions(allowedTypes, entity?.type)}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="f-name">Name</label>
        <input id="f-name" class="form-input" type="text" placeholder="Entity name" value="${escHtml(entity?.name || '')}">
      </div>
      <div class="form-group">
        <label class="form-label" for="f-description">Description</label>
        <textarea id="f-description" class="form-textarea" placeholder="Description…">${escHtml(entity?.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="f-image">Map Image URL</label>
        <input id="f-image" class="form-input" type="url" placeholder="https://…" value="${escHtml(entity?.imageUrl || '')}">
      </div>
      <div class="form-group">
        <label class="form-label" for="f-tags">Tags <span style="color:var(--text-dim)">(comma-separated)</span></label>
        <input id="f-tags" class="form-input" type="text" placeholder="tag1, tag2" value="${escHtml((entity?.tags || []).join(', '))}">
      </div>
      <div class="form-group">
        <label class="form-label">Attributes</label>
        <div id="attr-rows">
          ${_attrRows(entity?.attributes || {})}
        </div>
        <button type="button" class="btn-add-attr" id="btn-add-attr">＋ Add attribute</button>
      </div>
      <div class="form-group">
        <label class="form-label" for="f-gm-notes">GM Notes <span style="color:var(--text-dim)">(private)</span></label>
        <textarea id="f-gm-notes" class="form-textarea" placeholder="Notes visible only to you…">${escHtml(entity?.gmNotes || '')}</textarea>
      </div>
      <div class="modal-footer">
        <div>
          ${isEdit ? '<button type="button" class="btn-danger" id="btn-delete-entity">Delete</button>' : ''}
        </div>
        <div class="modal-footer-end">
          <button type="button" class="btn-ghost" id="btn-cancel-editor">Cancel</button>
          <button type="button" class="btn-primary" id="btn-save-entity">Save</button>
        </div>
      </div>
    `;

    document.getElementById('btn-add-attr')
      .addEventListener('click', () => {
        document.getElementById('attr-rows').insertAdjacentHTML('beforeend', _attrRow('', ''));
      });

    document.getElementById('btn-cancel-editor')
      .addEventListener('click', _close);

    document.getElementById('btn-save-entity')
      .addEventListener('click', _onSave);

    document.getElementById('btn-delete-entity')
      ?.addEventListener('click', _onDelete);
  }

  function _typeOptions(types, selected) {
    return types.map(type => {
      const info = Engine.getTypeInfo(type);
      return `<option value="${escHtml(type)}" ${type === selected ? 'selected' : ''}>
        ${escHtml(info.icon)} ${escHtml(info.label)}
      </option>`;
    }).join('');
  }

  function _attrRows(attrs) {
    return Object.entries(attrs).map(([k, v]) => _attrRow(k, v)).join('');
  }

  function _attrRow(key, value) {
    return `<div class="attr-row">
      <input class="form-input attr-key"   type="text" placeholder="Key"   value="${escHtml(key)}">
      <input class="form-input attr-value" type="text" placeholder="Value" value="${escHtml(value)}">
      <button type="button" class="btn-del-attr" title="Remove">×</button>
    </div>`;
  }

  // ── Save / Delete ─────────────────────────────────────────────────── 
  async function _onSave() {
    const data = _collectForm();
    if (!data.name.trim()) {
      document.getElementById('f-name').focus();
      return;
    }

    let entity;
    let isNew = false;

    if (_editId) {
      entity = await Engine.updateEntity(_editId, data);
    } else {
      const pos = _position || { x: 50, y: 50 };
      entity = await Engine.createEntity(data.type, _parentId, { ...data, position: pos });
      isNew = true;
    }

    _close();
    _callbacks.onSaved?.({ entity, isNew, deleted: false });
  }

  async function _onDelete() {
    if (!_editId) return;
    if (!confirm('Delete this entity and all its children?')) return;

    const entity = await Engine.getEntity(_editId);
    await Engine.deleteEntity(_editId);
    _close();
    _callbacks.onSaved?.({ entity, isNew: false, deleted: true });
  }

  function _collectForm() {
    const attrRows   = document.querySelectorAll('#attr-rows .attr-row');
    const attributes = {};
    attrRows.forEach(row => {
      const k = row.querySelector('.attr-key').value.trim();
      const v = row.querySelector('.attr-value').value.trim();
      if (k) attributes[k] = v;
    });

    return {
      type:        document.getElementById('f-type').value,
      name:        document.getElementById('f-name').value.trim(),
      description: document.getElementById('f-description').value.trim(),
      imageUrl:    document.getElementById('f-image').value.trim() || null,
      tags:        document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      gmNotes:     document.getElementById('f-gm-notes').value.trim(),
      attributes,
    };
  }

  function _getParentType() {
    // Best-effort — used only for allowed-type filtering
    // Engine.getEntity is async; we don't block the render for this
    return 'world'; // fallback shows all types
  }

  // ── Overlay helpers ───────────────────────────────────────────────── 
  function _openOverlay() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.getElementById('f-name').focus();
  }

  function _close() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    _editId = _parentId = _position = null;
  }

  return { init, open, openNew };
})();
