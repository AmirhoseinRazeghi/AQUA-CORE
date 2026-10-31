(function (A) {
  'use strict';
  class SimulationClock {
    constructor(config) {
      this.stepSeconds = (config.scanMs || 50) / 1000; this.speed = 1; this.paused = false; this.virtualSeconds = 0; this.accumulator = 0; this.scan = 0; this.lastWall = 0; this.driftMs = 0; this.overruns = 0; this.running = false; this.maxCatchUp = config.simulation.maxCatchUpScans || 6; this.maxWallDelta = config.simulation.maxWallDelta || 0.25;
    }
    advance(wallDelta) {
      if (this.paused || this.speed === 0) return 0;
      const safeDelta = Math.min(Math.max(0, wallDelta), this.maxWallDelta);
      this.accumulator += safeDelta * this.speed;
      let steps = 0;
      while (this.accumulator >= this.stepSeconds && steps < this.maxCatchUp) {
        this.accumulator -= this.stepSeconds; this.virtualSeconds += this.stepSeconds; this.scan += 1; steps += 1;
      }
      if (this.accumulator >= this.stepSeconds) {
        this.overruns += 1; this.driftMs = this.accumulator * 1000; this.accumulator = Math.min(this.accumulator, this.stepSeconds * 0.99);
      }
      else this.driftMs = this.accumulator * 1000;
      return steps;
    }
    setSpeed(speed) {
      const valid=[0,0.25,1,2,5]; if (!valid.includes(speed)) throw new Error('Unsupported simulation speed'); this.speed=speed; this.paused=speed===0; A.bus.emit('clock.speed',{
        speed
      }
      );
    }
    togglePause() {
      this.paused=!this.paused; this.speed=this.paused?0:(this.speed===0?1:this.speed); A.bus.emit('clock.pause',{
        paused:this.paused
      }
      );
    }
    reset() {
      this.virtualSeconds=0;this.accumulator=0;this.scan=0;this.overruns=0;this.driftMs=0;
    }
    formatted() {
      const s=Math.floor(this.virtualSeconds), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60; return `T+${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    }
  }
  A.SimulationClock = SimulationClock;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
