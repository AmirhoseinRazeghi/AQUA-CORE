# System Architecture

## Design intent

AQUA-CORE is a client-only industrial automation training environment. Every runtime component executes in one browser page and exchanges values through one shared tag database. The design favors deterministic simulation steps, explicit data ownership, traceable commands, and clearly documented simulation boundaries.

## Runtime layers

| Layer | Main modules | Responsibility |
|---|---|---|
| Presentation | `js/scada/ui.js`, `css/` | Page routing, faceplates, charts, operator actions and rendering |
| Command governance | `js/core/command-arbiter.js` | Queue, validate, accept/reject and audit operator commands |
| PLC runtime | `js/plc/scan-engine.js` | Scan order, operating mode, interlocks, PID and output image |
| Logic runtime | `js/plc/st-interpreter.js`, `st-program.js` | Parse and execute the documented Structured Text subset |
| Control functions | `function-blocks.js`, `pid-controller.js`, `sequences.js` | Timers, triggers, counters, latches, PID and step sequences |
| Process | `js/process/` | Dynamic state of tanks, pumps, valves, filters, process streams and packaging |
| Field instrumentation | `js/instrumentation/` | Analog input quality, stale/bad/out-of-range states and signal conversion helpers |
| Data services | `tag-database.js`, `historian.js`, `alarm-manager.js` | Live values, quality, sampling, alarms and event history |
| Communications labs | `js/communications/` | In-memory Modbus register model and OPC UA-shaped node model |
| Visualization | `js/digital-twin/` | Native WebGL 1 simplified 3D geometry with a Canvas 2D fallback |

## Scan cycle

The configured logical scan period is 50 ms. One scan follows this conceptual order:

1. Update safety state in the command arbiter.
2. Drain and validate queued operator / Modbus-model commands.
3. Apply active fault-injection state to instrumentation channels.
4. Evaluate instrument quality and update signal snapshots.
5. Advance backwash and equipment sequence state machines.
6. Read process variables and calculate PID outputs.
7. Execute the intake Structured Text program.
8. Build the PLC output image for AUTO or MANUAL mode.
9. Apply process permissives, interlocks and trip/E-STOP inhibition.
10. Advance the physical-process approximation using the output image.
11. Publish process feedback and PLC diagnostics to the tag database.
12. Evaluate alarms, sample the historian and refresh protocol-model data on the browser scheduler.

The runtime is not hard real-time. Browser tabs may be throttled; the clock caps catch-up steps and records timing drift/overruns rather than claiming a guaranteed 20 Hz cycle.

## Data ownership

- The **process engine** owns process physical state (tank volume, pump speed, filter loading, pressure and packaging sequence).
- The **instrumentation layer** applies quality and sampled signal behavior to tag values.
- The **PLC scan engine** owns the control output image, mode, trip and controller state.
- The **tag database** is the shared read model for HMI, historian, alarm manager and protocol-model pages.
- The **command arbiter** owns validation of commands originating from the UI or in-memory Modbus model.
- The **historian** is bounded and memory-resident; exporting CSV is an explicit user action.

## Command lifecycle

`HMI / protocol model → CommandArbiter.submit → queue → validate → PLCScanEngine.handleCommand → accepted/rejected audit event`.

The UI should not write an output tag directly. Commands change controller or sequence state; the next scan determines the resulting output image. Direct reset/injection helpers are limited to simulation and test functions.

## Browser and deployment constraints

All files are loaded through relative paths. There are no ES module imports, external CDN scripts, remote fonts, remote APIs or runtime build outputs. This avoids cross-origin and `file://` module restrictions and makes GitHub Pages deployment a static upload.

## Extensibility points

- The current renderer uses native WebGL 1 without a third-party 3D engine; Canvas 2D is retained as a feature-detected fallback.
- Replace the in-memory Modbus model with a gateway client only after defining an authentication, network and trust boundary.
- Replace the OPC UA-shaped data model with a real server adapter outside the browser.
- Replace process approximations with validated dynamic models and parameter sets from a real process-design basis.
