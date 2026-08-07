const Store = (() => {
  const DB_NAME    = 'loreweaver';
  const DB_VERSION = 1;
  const KV_STORE   = 'kv';

  // ── LocalAdapter (IndexedDB) ─────────────────────────────────────────
  let _dbPromise = null;

  function _openDb() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => e.target.result.createObjectStore(KV_STORE);
      req.onsuccess       = (e) => resolve(e.target.result);
      req.onerror         = (e) => reject(e.target.error);
    });
    return _dbPromise;
  }

  function _idbOp(mode, fn) {
    return _openDb().then(db => new Promise((resolve, reject) => {
      const req = fn(db.transaction(KV_STORE, mode).objectStore(KV_STORE));
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    }));
  }

  const LocalAdapter = {
    get:    (key)        => _idbOp('readonly',  s => s.get(key)),
    set:    (key, value) => _idbOp('readwrite', s => s.put(value, key)),
    remove: (key)        => _idbOp('readwrite', s => s.delete(key)),
    clear:  ()           => _idbOp('readwrite', s => s.clear()),
  };

  // ── ServerAdapter (REST) ─────────────────────────────────────────────
  const ServerAdapter = {
    _base: '',

    init(baseUrl) { this._base = baseUrl || ''; },

    async get(key) {
      if (key === 'lw_worlds') {
        const r = await fetch(`${this._base}/api/worlds`);
        return r.ok ? r.json() : null;
      }
      if (key.startsWith('lw_entity_')) {
        const r = await fetch(`${this._base}/api/entities/${key.slice(10)}`);
        return r.ok ? r.json() : null;
      }
      return null;
    },

    async set(key, value) {
      if (!key.startsWith('lw_entity_')) return;
      await fetch(`${this._base}/api/entities/${key.slice(10)}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(value),
      });
    },

    async remove(key) {
      if (!key.startsWith('lw_entity_')) return;
      await fetch(`${this._base}/api/entities/${key.slice(10)}`, { method: 'DELETE' });
    },

    async clear() { /* no-op — server manages its own data */ },
  };

  // ── Adapter detection ────────────────────────────────────────────────
  function _detectAdapter() {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'hosted') {
      ServerAdapter.init(params.get('api') || '');
      return ServerAdapter;
    }
    return LocalAdapter;
  }

  const _adapter = _detectAdapter();

  // ── UUID ─────────────────────────────────────────────────────────────
  function uuid() {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
    buf[8] = (buf[8] & 0x3f) | 0x80; // variant
    const h = [...buf].map(b => b.toString(16).padStart(2, '0'));
    return `${h.slice(0,4).join('')}-${h.slice(4,6).join('')}-${h.slice(6,8).join('')}-${h.slice(8,10).join('')}-${h.slice(10).join('')}`;
  }

  return {
    uuid,
    isHosted: () => _adapter === ServerAdapter,
    get:      (key)        => _adapter.get(key),
    set:      (key, value) => _adapter.set(key, value),
    remove:   (key)        => _adapter.remove(key),
    clear:    ()           => _adapter.clear(),
  };
})();
