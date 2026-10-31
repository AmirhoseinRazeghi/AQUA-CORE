(function (A) {
  'use strict';
  const SPEEDS = [0.25, 1, 2, 5];
  const downloadJSON = (name, value) => {
    const blob = new Blob([JSON.stringify(value, null, 2)], {
      type: 'application/json'
    }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  ;
  function boot() {
    if (A.app) return;
    const config = A.Config;
    const bus = A.bus;
    const tags = new A.TagDatabase(A.TagDefinitions);
    const clock = new A.SimulationClock(config);
    const arbiter = new A.CommandArbiter();
    const process = new A.ProcessEngine(config, tags);
    const instrumentation = new A.InstrumentationLayer(tags);
    const faultLab = new A.FaultInjectionLab();
    A.faultLab = faultLab;
    const plc = new A.PLCScanEngine(config, tags, process, arbiter, instrumentation);
    const alarms = new A.AlarmManager(tags, config);
    const historian = new A.Historian(config, tags);
    const modbus = new A.ModbusSimulator(tags, plc, alarms, process);
    const opc = new A.OPCInformationModel(tags);
    const packaging = new A.PackagingCellController(plc, process);
    const activeFaultIds = () => faultLab.definitions().filter(x => x.active).map(x => x.id);
    const app = {
      config, bus, tags, clock, arbiter, process, instrumentation, faultLab,
      plc, alarms, historian, modbus, opc, packaging,
      renderer: null, ui: null, testRunner: null,
      diagnostics() {
        return {
          product: 'AQUA-CORE', version: config.version,
          virtualTime: clock.virtualSeconds,
          clock: {
            speed: clock.speed, paused: clock.paused, scan: clock.scan, overruns: clock.overruns, driftMs: clock.driftMs
          }
          ,
          plc: {
            scanCounter: plc.scanCounter, lastScanMs: plc.lastScanMs, watchdogMs: plc.watchdogMs, tripLatched: plc.tripLatched, mode: plc.mode
          }
          ,
          historian: {
            samples: historian.count()
          }
          , opc: opc.namespace(),
          faults: activeFaultIds(), alarms: alarms.summary(),
          browser: {
            userAgent: navigator.userAgent, canvas2d: !!document.createElement('canvas').getContext('2d'), webgl: !!document.createElement('canvas').getContext('webgl')
          }
        }
        ;
      }
      ,
      exportSession() {
        return {
          product: 'AQUA-CORE', schemaVersion: 1, exportedAt: new Date().toISOString(),
          tags: tags.snapshot(),
          clock: {
            virtualSeconds: clock.virtualSeconds, speed: clock.speed, paused: clock.paused
          }
          ,
          faults: activeFaultIds(),
          plc: {
            mode: plc.mode, startRequest: plc.startRequest, pkgEnable: plc.pkgEnable
          }
          ,
          historian: historian.getAll()
        }
        ;
      }
      ,
      importSession(data) {
        if (!data || data.product !== 'AQUA-CORE') throw new Error('Invalid AQUA-CORE session file');
        if (data.tags) tags.restore(data.tags);
        if (data.clock) {
          clock.virtualSeconds = Math.max(0, Number(data.clock.virtualSeconds) || 0);
          if (SPEEDS.includes(Number(data.clock.speed))) clock.setSpeed(Number(data.clock.speed));
          if (data.clock.paused) clock.setSpeed(0);
        }
        faultLab.clearAll();
        const known = new Set(faultLab.definitions().map(x => x.id));
        (Array.isArray(data.faults) ? data.faults : []).forEach(id => {
          if (known.has(id)) faultLab.inject(id);
        }
        );
        if (data.plc) {
          plc.mode = ['OFF', 'AUTO', 'MANUAL', 'TRIPPED'].includes(data.plc.mode) ? data.plc.mode : 'AUTO';
          plc.startRequest = !!data.plc.startRequest;
          plc.pkgEnable = !!data.plc.pkgEnable;
          arbiter.setSafety({
            mode: plc.mode, estop: plc.estop, tripped: plc.tripLatched
          }
          );
        }
        bus.emit('session.imported', {
        }
        );
      }
    }
    ;
    app.testRunner = new A.TestRunner();
    A.app = app;
    // Publish one coherent initial process state before rendering the HMI.
    process.step(config.scanMs / 1000, {
    }
    , faultLab.activeMap());
    alarms.evaluate(process, plc, faultLab.activeMap());
    app.ui = new A.SCADAUI(app);
    bus.on('safety.estop', () => app.ui.toast('Simulated E-STOP active — normal outputs inhibited', 'danger'));
    bus.on('plc.watchdog', e => app.ui.toast(`PLC scan watchdog: ${Number(e.payload.duration).toFixed(2)} ms`, 'warning'));
    bus.on('session.imported', () => app.ui.render());
    bus.on('system.reset', () => {
      alarms.reset(); historian.clear();
    }
    );
    bus.on('alarm.ackAll', () => alarms.acknowledge());
    // Header controls are deliberately kept outside the HMI page router.
    document.getElementById('pauseButton')?.addEventListener('click', () => {
      clock.togglePause();
      const button = document.getElementById('pauseButton');
      button.textContent = clock.paused ? '▶' : 'Ⅱ';
      button.setAttribute('aria-label', clock.paused ? 'Resume simulation' : 'Pause simulation');
      app.ui.updateShell();
    }
    );
    document.getElementById('speedButton')?.addEventListener('click', () => {
      const current = clock.speed || 1;
      const next = SPEEDS[(SPEEDS.indexOf(current) + 1) % SPEEDS.length];
      clock.setSpeed(next);
      document.getElementById('speedButton').textContent = `${next}×`;
      app.ui.updateShell();
    }
    );
    document.getElementById('estopButton')?.addEventListener('click', () => {
      if (!plc.estop) plc.activateEStop();
      else plc.resetEStop();
      app.ui.updateShell();
    }
    );
    document.getElementById('exportSessionButton')?.addEventListener('click', () => downloadJSON('aquacore-session.json', app.exportSession()));
    document.getElementById('importSessionButton')?.addEventListener('click', () => document.getElementById('sessionImportInput')?.click());
    document.getElementById('sessionImportInput')?.addEventListener('change', event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          app.importSession(JSON.parse(String(reader.result))); app.ui.toast('Session imported', 'success');
        }
        catch (error) {
          app.ui.toast(`Import failed: ${error.message}`, 'error');
        }
        event.target.value = '';
      }
      ;
      reader.onerror = () => app.ui.toast('Could not read selected session file', 'error');
      reader.readAsText(file);
    }
    );
    document.getElementById('dismissBanner')?.addEventListener('click', () => document.querySelector('.safety-banner')?.remove());
    // Storage is optional; blocked storage never prevents simulator startup.
    try {
      const saved = localStorage.getItem(config.storage.key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.schemaVersion === config.storage.schemaVersion && parsed.tags) tags.restore(parsed.tags);
      }
    }
    catch (error) {
      console.info('[AQUA-CORE] Persistent storage unavailable; memory-only mode.', error.message);
    }
    let last = performance.now(), uiAccumulator = 0, storageAccumulator = 0;
    function frame(now) {
      const wallDelta = Math.min(Math.max(0, (now - last) / 1000), 0.5);
      last = now;
      const steps = clock.advance(wallDelta);
      for (let i = 0; i < steps; i++) {
        plc.scan(clock.stepSeconds);
        alarms.evaluate(process, plc, faultLab.activeMap());
        historian.sample(clock.stepSeconds, clock.virtualSeconds);
        // PLC scans do not count as Modbus client transactions.
      }
      uiAccumulator += wallDelta;
      storageAccumulator += wallDelta;
      if (uiAccumulator >= 0.2) {
        app.ui.refresh(); uiAccumulator = 0;
      }
      if (storageAccumulator >= 20) {
        storageAccumulator = 0;
        try {
          localStorage.setItem(config.storage.key, JSON.stringify({
            schemaVersion: config.storage.schemaVersion, tags: tags.snapshot(), savedAt: new Date().toISOString()
          }
          ));
        }
        catch (error) {
          /* optional persistence */
        }
      }
      requestAnimationFrame(frame);
    }
    document.documentElement.classList.add('app-ready');
    requestAnimationFrame(frame);
    console.info('[AQUA-CORE] Runtime initialized', app.diagnostics());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {
    once: true
  }
  );
  else boot();
}
)(window.AquaCore = window.AquaCore || {
}
);
;
