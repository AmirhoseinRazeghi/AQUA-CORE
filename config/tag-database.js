(function (A) {
  'use strict';
  A.TagDefinitions = [
  ['LIT-101','Raw tank level','AI','%','0..100',true],['FIT-101','Intake flow','AI','m³/h','0..12',true],['PIT-102','Intake discharge pressure','AI','bar','0..10',true],
  ['DPIT-201A','Filter A differential pressure','AI','bar','0..2',true],['DPIT-201B','Filter B differential pressure','AI','bar','0..2',true],['AIT-301','Dosing outlet pH','AI','pH','0..14',true],
  ['LIT-401','Clearwell level','AI','%','0..100',true],['FIT-401','Product header flow','AI','m³/h','0..12',true],['PIT-401','Distribution header pressure','AI','bar','0..10',true],['AIT-401','Conductivity proxy','AI','µS/cm','0..2000',true],
  ['IIT-101A','P-101A motor current proxy','AI','A','0..20',true],['IIT-401A','P-401A motor current proxy','AI','A','0..20',true],
  ['ZSH-101','Raw tank high-high switch','DI','bool','0/1',true],['ZSL-101','Raw tank low-low switch','DI','bool','0/1',true],
  ['P101A_RUN_FB','P-101A running feedback','DI','bool','0/1',true],['P101A_FLT_FB','P-101A drive fault','DI','bool','0/1',true],['P101B_RUN_FB','P-101B running feedback','DI','bool','0/1',true],['P101B_FLT_FB','P-101B drive fault','DI','bool','0/1',true],
  ['P401A_RUN_FB','P-401A running feedback','DI','bool','0/1',true],['P401A_FLT_FB','P-401A drive fault','DI','bool','0/1',true],['P401B_RUN_FB','P-401B running feedback','DI','bool','0/1',true],['P401B_FLT_FB','P-401B drive fault','DI','bool','0/1',true],['P401C_RUN_FB','P-401C running feedback','DI','bool','0/1',true],['P401C_FLT_FB','P-401C drive fault','DI','bool','0/1',true],
  ['PE501_BOTTLE','Bottle present sensor','DI','bool','0/1',true],['PE502_FILL_POS','Bottle at fill position','DI','bool','0/1',true],['PE503_CAP_POS','Bottle at capper','DI','bool','0/1',true],['GS501_GUARD','Packaging guard closed','DI','bool','0/1',true],['ES001_LOOP','Plant E-stop loop healthy','DI','bool','0/1',true],
  ['VFD-101A_SPD_REF','P-101A speed reference','AO','%','0..100',true],['VFD-101B_SPD_REF','P-101B speed reference','AO','%','0..100',true],['VFD-401A_SPD_REF','P-401A speed reference','AO','%','0..100',true],['VFD-401B_SPD_REF','P-401B speed reference','AO','%','0..100',true],['VFD-401C_SPD_REF','P-401C speed reference','AO','%','0..100',true],['FCV-201_REF','Filter flow control valve position','AO','%','0..100',true],['D301_RATE_REF','Dosing pump rate proxy','AO','%','0..100',true],
  ['P101A_START','P-101A start command','DO','bool','0/1',false],['P101B_START','P-101B start command','DO','bool','0/1',false],['P401A_START','P-401A start command','DO','bool','0/1',false],['P401B_START','P-401B start command','DO','bool','0/1',false],['P401C_START','P-401C start command','DO','bool','0/1',false],['P301_START','Dosing pump start command','DO','bool','0/1',false],['CV501_RUN','Packaging conveyor run','DO','bool','0/1',false],['FILL501_OPEN','Filling valve command','DO','bool','0/1',false],['CAP501_RUN','Capper command','DO','bool','0/1',false],['REJ501_EXT','Reject actuator command','DO','bool','0/1',false]
  ];
}
)(window.AquaCore = window.AquaCore || {
}
);
;
