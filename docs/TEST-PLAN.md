# Verification & Test Plan

## Automated in-app suite

The Test bench page runs 31 checks in three broad groups.

| ID range | Coverage |
|---|---|
| UT-001–UT-014 | Tank mass balance/overflow, pump ramp/trip, TON, R_TRIG, CTU, PID saturation/manual mode, ST parse/execute and unsupported syntax rejection, filter loading and valve travel |
| PT-001–PT-011 | Holding-register read, invalid-address exception, read-only write rejection, OPC node read/browse, MBAP codec, input registers, range validation, FC16 atomic validation, coils/discrete inputs and speed-limit command |
| IT-001–IT-006 | E-STOP latch/no restart, command arbitration during trip, E-STOP reset permission, fault-ID mapping, auditable fault lifecycle and all-motion output inhibition |

Expected result for the current source revision: **31 PASS, 0 FAIL**. This is an observed development test result, not a certification or proof of process safety.

## Manual acceptance checklist

- [ ] Open `index.html` with network disconnected.
- [ ] Confirm Plant Overview populates process values and no fatal overlay is shown.
- [ ] Navigate through every page and check for rendering exceptions.
- [ ] Observe tank levels and flows change during simulation.
- [ ] Change each PID setpoint within allowed engineering bounds; attempt an out-of-range value and confirm rejection.
- [ ] Compile the supplied ST program. Introduce an unsupported construct and confirm a clear compile error while the last valid program remains active.
- [ ] Switch to MANUAL and jog a supported pump. Confirm interlocks still inhibit an unsafe command.
- [ ] Inject P-101A fault and verify duty/standby logic response.
- [ ] Inject LIT-101 bad quality and confirm tag quality changes and alarm behavior appears.
- [ ] Request filter backwash and verify the alternate filter remains in SERVICE.
- [ ] Inject packaging guard-open and conveyor-jam faults; verify cell motion is inhibited.
- [ ] Activate E-STOP; confirm outputs are inhibited and trip remains latched after E-STOP release.
- [ ] Attempt to start while trip is latched; confirm command rejection.
- [ ] Reset trip and reselect AUTO; confirm no spontaneous restart.
- [ ] Read Holding/Input Registers and verify scaling against on-screen tags.
- [ ] Write an allowed setpoint and an invalid setpoint through the Modbus model.
- [ ] Export historian CSV and a session JSON snapshot.
- [ ] Reload the page and confirm local persistence is optional and failures do not prevent startup.

## Development smoke test

`tools/smoke-test.py` uses Playwright to inject the repository's local script files into a headless Chromium page, navigate all HMI routes, run the in-app test bench and capture a screenshot. It is an optional development tool; it is not required to run the application. See `tools/requirements-dev.txt`.

## Defect handling

For each defect, record: browser/OS, page, reproduction steps, initial mode/fault state, expected behavior, actual behavior, console error, test ID and fix. Add a regression test for every fixed control-logic defect when practical.
