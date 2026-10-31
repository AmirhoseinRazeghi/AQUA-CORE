(function (A) {
  'use strict';
  A.Config = {
    version: '1.0.0',
    scanMs: 50,
    historian: {
      fastSampleSeconds: 0.25, processSampleSeconds: 1, maxSamplesPerTag: 10000
    }
    ,
    simulation: {
      initialSpeed: 1, speedOptions: [0, 0.25, 1, 2, 5], maxCatchUpScans: 6, maxWallDelta: 0.25
    }
    ,
    plant: {
      tanks: {
        raw: {
          tag: 'TK-101', capacity: 20, initial: 11.0, low: 0.20, lowLow: 0.10, high: 0.90, highHigh: 0.95
        }
        ,
        clear: {
          tag: 'TK-401', capacity: 15, initial: 8.4, low: 0.15, lowLow: 0.08, high: 0.90, highHigh: 0.95
        }
        ,
        reject: {
          tag: 'TK-301R', capacity: 2, initial: 0.05
        }
      }
      ,
      intake: {
        nominalFlow: 8, maxFlow: 10, pumpRampUp: 32, pumpRampDown: 55, lowLevelStart: 0.15, stopLevel: 0.10, restartLevel: 0.16
      }
      ,
      filters: {
        count: 2, capacityEach: 4, cleanDP: 0.15, backwashRequestDP: 0.80, tripDP: 1.20, loadRate: 0.000018, washRate: 0.004
      }
      ,
      dosing: {
        phSetpoint: 7.2, phLow: 6.8, phHigh: 7.6, tau: 75, nominalConductivity: 650
      }
      ,
      distribution: {
        nominalPressure: 3.0, highPressure: 6.0, resetPressure: 5.0, maxFlow: 12, pumpRamp: 28
      }
      ,
      packaging: {
        bottleLitres: 1.0, nominalRatePerHour: 240, fillSeconds: 1.8, indexSeconds: 0.7, capSeconds: 0.8, inspectSeconds: 0.3, fillTolerance: [0.98, 1.02]
      }
    }
    ,
    pid: {
      LIC101: {
        kp: 3.4, ki: 0.05, kd: 0.1, min: 0, max: 100, setpoint: 55, bias: 0, reverse: true
      }
      ,
      FIC201: {
        kp: 8.0, ki: 0.3, kd: 0, min: 0, max: 100, setpoint: 8, bias: 0
      }
      ,
      PIC401: {
        kp: 18, ki: 0.65, kd: 0.2, min: 0, max: 100, setpoint: 3, bias: 45
      }
      ,
      AIC301: {
        kp: 9, ki: 0.12, kd: 0, min: 0, max: 100, setpoint: 7.2, bias: 48
      }
    }
    ,
    alarms: {
      debounceSeconds: 0.15, staleSeconds: 3, ackRequiredP1: true
    }
    ,
    storage: {
      key: 'aquacore.session.v1', schemaVersion: 1, maxEvents: 5000
    }
  }
  ;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
