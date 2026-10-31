# Operator & Engineering Guide

## Main screen

The header shows simulation status, configured scan target, clock controls, export session and simulated E-STOP. The left navigation opens each HMI/engineering page. The persistent safety banner states that no physical process is connected.

## Process mimic

The isometric Canvas view is an operator visualization driven by the shared process model. Drag the mouse to orbit; use the wheel to zoom; use Reset Camera to restore the initial view. Tank fill, pump animation, line color and equipment states are illustrative. Do not use the visualization to infer physical dimensions or clearances.

## Equipment faceplates

Pump cards show state, speed and modeled current. Injecting a pump fault changes the simulation state; it is not a real drive trip. Manual jog requires MANUAL mode. Resetting a modeled pump fault does not clear an unrelated plant trip.

## Control loops

Each loop shows PV, SP, output, mode and tuning parameters. Setpoint and gain inputs are bounded. A controller with BAD/STALE/OUT_OF_RANGE PV quality holds the last bounded output. Use trends to examine loop response.

## Alarm page

Filter by active/unacknowledged/returned state, inspect cause and operator action, and acknowledge one or all eligible events. Acknowledgement does not remove the abnormal cause.

## PLC Engineering

The editor contains the exact ST source compiled by the local interpreter. Use Compile & Load to parse and load it. A failed compile preserves the last successfully loaded program. The watch table exposes selected tags and scan metrics.

## Communications

Select Modbus register blocks or issue single register/coil operations. Writes are range/access checked and audited. The OPC page browses local information-model nodes. Neither page makes network requests.

## Fault laboratory

Fault scenarios are independent test inputs. Inject only a small number of faults at once to keep cause/effect clear. After each experiment, clear the fault, wait for quality/state recovery, acknowledge returned alarms and reset trips deliberately.

## Export

- Historian Trend page: export selected tags to CSV.
- Header: export session JSON containing tag snapshot, clock, faults and controller mode state.
- Test bench: export a JSON validation report.
- Fault laboratory: export injection/clear history.
