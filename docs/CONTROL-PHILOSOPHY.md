# Control Philosophy

## General philosophy

Control is divided into supervisory operating mode, automatic sequences, PID loops, discrete commands and protective interlocks. The process model is advanced only after a scan has produced its output image. A mode transition or operator request is queued and checked by the command arbiter.

## Operating modes

- **OFF:** no automatic run request. Only explicitly permitted management/reset commands pass the arbiter.
- **AUTO:** intake ST selection, PID controllers, backwash sequencing and packaging enable logic operate.
- **MANUAL:** supported pump jog commands are accepted. Safety inhibition and process-level interlocks remain active. The operator must deliberately stop jog commands.
- **TRIPPED:** entered after simulated E-STOP and selected major faults. Normal run outputs are inhibited until reset is completed.

## Intake pump sequence

1. Require AUTO, a start request, good LIT-101 quality and tank level between start/stop protection limits.
2. If neither pump is faulted, PRG_INTAKE commands P-101A.
3. If P-101A is faulted and P-101B is healthy, select P-101B.
4. If both pumps are faulted, both commands remain false and a modeled trip condition is raised.
5. Tank low-low and high-high conditions override the ST command and remove intake run commands.

## Filter operation

Both filters are modeled as available in SERVICE by default. Backwash request is rejected unless the other filter is in SERVICE. The selected filter goes through PRECHECK → ISOLATE → BACKWASH → RINSE → RETURN → VERIFY. Failure to recover below the differential-pressure request threshold enters FAULT. The time values are simulated durations, not commissioning settings.

## Clearwell and distribution

Distribution pumps require AUTO, acceptable clearwell inventory and valid pressure feedback. PIC-401 demand controls P-401A speed and may stage P-401B when demand rises. The sequence layer tracks lead/lag state and changeover when the lead pump faults. A header high-pressure interlock removes distribution pump commands and latches a trip.

## Dosing / pH

Dosing is enabled only when flow is present and AIT-301 quality is GOOD. AIC-301 produces the dosage reference. Out-of-band pH or invalid analyzer quality diverts product from the accepted-water route.

## Packaging cell

PK-501 is enabled from the HMI or Modbus model command. The process state machine performs bottle indexing, filling, inspection, capping and accept/reject routing. A guard-open or conveyor-jam fault moves the cell to FAULT and inhibits motion. The package sequence restarts only after an explicit reset/enable path.

## Simulated emergency stop and trip recovery

The simulated E-STOP is latched. It removes normal commands and sets the controller to TRIPPED. Releasing/resetting the simulated E-STOP input does not clear the trip latch. An operator must issue RESET_TRIP, reselect the desired operating mode and issue a new start request. No automatic restart is permitted after E-STOP release.

**Safety disclaimer:** this is only software behavior. It is not a safety-related control function and does not establish an emergency-stop circuit, safety integrity level, performance level or compliance with machinery/electrical safety requirements.

## Command validation

The arbiter checks command type, mode, E-STOP/trip state, loop identifier and engineering setpoint bounds. Commands are audited with source, status and rejection reason. The HMI does not write PLC output bits directly.
