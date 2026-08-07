const Utils = (() => {
  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Singleton context menu — lazily resolves DOM elements
  const ContextMenu = {
    _el:       null,
    _list:     null,
    _cleanup:  null,

    show(x, y, items) {
      if (!this._el) {
        this._el   = document.getElementById('ctx-menu');
        this._list = document.getElementById('ctx-list');
      }

      this._list.innerHTML = items.map(item =>
        `<li class="ctx-item${item.danger ? ' danger' : ''}"
             data-action="${escHtml(item.action)}">${escHtml(item.label)}</li>`
      ).join('');

      // Keep menu within viewport
      this._el.style.left = x + 'px';
      this._el.style.top  = y + 'px';
      this._el.classList.add('open');
      this._el.setAttribute('aria-hidden', 'false');

      // Clamp after paint so we know the rendered size
      requestAnimationFrame(() => {
        const r = this._el.getBoundingClientRect();
        if (r.right  > window.innerWidth)  this._el.style.left = (x - r.width)  + 'px';
        if (r.bottom > window.innerHeight) this._el.style.top  = (y - r.height) + 'px';
      });

      if (this._cleanup) this._cleanup();

      const onItem = (e) => {
        const li = e.target.closest('.ctx-item');
        if (!li) return;
        const found = items.find(i => i.action === li.dataset.action);
        if (found) found.handler();
        this.hide();
      };

      const onOutside = (e) => {
        if (!this._el.contains(e.target)) this.hide();
      };

      this._list.addEventListener('click', onItem);
      document.addEventListener('mousedown', onOutside);

      this._cleanup = () => {
        this._list.removeEventListener('click', onItem);
        document.removeEventListener('mousedown', onOutside);
        this._cleanup = null;
      };
    },

    hide() {
      if (this._el) {
        this._el.classList.remove('open');
        this._el.setAttribute('aria-hidden', 'true');
      }
      if (this._cleanup) this._cleanup();
    },
  };

  return { escHtml, ContextMenu };
})();

// Expose as globals for cross-module use
const { escHtml, ContextMenu } = Utils;
