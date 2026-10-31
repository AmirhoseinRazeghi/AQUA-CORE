(function (A) {
  'use strict';
  const clone = v => (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
  class TagDatabase {
    constructor(definitions) {
      this.tags = new Map();
      this.revision = 0;
      (definitions || []).forEach(d => this.define(d));
    }
    define(def) {
      const [id, description, type, unit, range, readOnly] = def;
      if (this.tags.has(id)) throw new Error('Duplicate tag: ' + id);
      this.tags.set(id, {
        id, description, type, unit, range, readOnly: !!readOnly, value: type === 'DI' || type === 'DO' ? false : 0, quality: 'GOOD', timestamp: Date.now(), source: 'SIM', revision: 0
      }
      );
    }
    has(id) {
      return this.tags.has(id);
    }
    get(id) {
      const t = this.tags.get(id);
      return t ? clone(t) : undefined;
    }
    value(id, fallback) {
      const t = this.tags.get(id);
      return t ? t.value : fallback;
    }
    set(id, value, options) {
      const t = this.tags.get(id);
      if (!t) throw new Error('Unknown tag: ' + id);
      const o = options || {
      }
      ;
      if (t.readOnly && o.force !== true) throw new Error('Read-only tag: ' + id);
      const previous = t.value;
      t.value = value;
      t.quality = o.quality || t.quality || 'GOOD';
      t.timestamp = o.timestamp || Date.now();
      t.source = o.source || 'SIM';
      t.revision = ++this.revision;
      if (!Object.is(previous, value) || o.forceEvent) A.bus.emit('tag.changed', {
        id, value, previous, tag: clone(t)
      }
      );
      return t;
    }
    update(id, value, options) {
      return this.set(id, value, Object.assign({
        force: true
      }
      , options || {
      }
      ));
    }
    quality(id, quality, detail) {
      const t = this.tags.get(id);
      if (!t) return;
      const old = t.quality;
      t.quality = quality;
      t.timestamp = Date.now();
      t.revision = ++this.revision;
      A.bus.emit('tag.quality', {
        id, previous: old, quality, detail: detail || ''
      }
      );
    }
    markAllGood() {
      this.tags.forEach((t,id) => {
        t.quality='GOOD'; t.timestamp=Date.now();
      }
      );
    }
    list(filter) {
      const arr = [...this.tags.values()];
      return (filter ? arr.filter(filter) : arr).map(clone);
    }
    snapshot() {
      const o = {
      }
      ;
      this.tags.forEach((t,id) => {
        o[id] = {
          value: t.value, quality: t.quality, timestamp: t.timestamp, source: t.source
        }
        ;
      }
      );
      return o;
    }
    restore(snapshot) {
      Object.entries(snapshot || {
      }
      ).forEach(([id,v]) => {
        if (this.tags.has(id)) this.update(id, v.value, {
          quality: v.quality || 'GOOD', source: 'RESTORE'
        }
        );
      }
      );
    }
    exportDefinitions() {
      return this.list().map(t => ({
        id:t.id, description:t.description, type:t.type, unit:t.unit, range:t.range, readOnly:t.readOnly
      }
      ));
    }
  }
  A.TagDatabase = TagDatabase;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
