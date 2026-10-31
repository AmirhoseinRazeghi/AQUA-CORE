(function (A) {
  'use strict';
  class EventBus {
    constructor() {
      this.listeners = new Map();
      this.sequence = 0;
    }
    on(type, handler) {
      if (typeof handler !== 'function') throw new TypeError('Event handler must be a function');
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(handler);
      return () => this.off(type, handler);
    }
    once(type, handler) {
      const dispose = this.on(type, payload => {
        dispose(); handler(payload);
      }
      );
      return dispose;
    }
    off(type, handler) {
      const set = this.listeners.get(type);
      if (set) {
        set.delete(handler);
        if (!set.size) this.listeners.delete(type);
      }
    }
    emit(type, payload) {
      this.sequence += 1;
      const envelope = {
        type, sequence: this.sequence, timestamp: Date.now(), payload
      }
      ;
      const handlers = this.listeners.get(type);
      if (handlers) [...handlers].forEach(fn => {
        try {
          fn(envelope);
        }
        catch (error) {
          console.error('[AQUA-CORE event]', type, error);
        }
      }
      );
      const wildcard = this.listeners.get('*');
      if (wildcard) [...wildcard].forEach(fn => {
        try {
          fn(envelope);
        }
        catch (error) {
          console.error('[AQUA-CORE event]', error);
        }
      }
      );
      return envelope;
    }
    clear() {
      this.listeners.clear();
    }
  }
  A.EventBus = EventBus;
  A.bus = new EventBus();
}
)(window.AquaCore = window.AquaCore || {
}
);
;
