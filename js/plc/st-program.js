(function (A) {
  'use strict';
  A.IntakeSTSource = `PROGRAM PRG_INTAKE
  VAR
      TankLevel      : REAL;
      PumpA_Fault    : BOOL;
      PumpB_Fault    : BOOL;
      StartRequest   : BOOL;
      PumpA_Command  : BOOL;
      PumpB_Command  : BOOL;
      LowLowTrip     : BOOL;
      HighHighTrip   : BOOL;
  END_VAR

  LowLowTrip := (TankLevel <= 10.0);
  HighHighTrip := (TankLevel >= 95.0);

  IF LowLowTrip OR HighHighTrip OR NOT StartRequest THEN
      PumpA_Command := FALSE;
      PumpB_Command := FALSE;
  ELSIF NOT PumpA_Fault THEN
      PumpA_Command := TRUE;
      PumpB_Command := FALSE;
  ELSIF NOT PumpB_Fault THEN
      PumpA_Command := FALSE;
      PumpB_Command := TRUE;
  ELSE
      PumpA_Command := FALSE;
      PumpB_Command := FALSE;
  END_IF;
  END_PROGRAM`;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
