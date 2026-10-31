(function (A) {
  'use strict';
  const SCENARIOS=[
  ['FI-001','LIT-101 transmitter stuck','Level transmitter','LIT-101_STUCK','Instrument value held at last valid sample.'],
  ['FI-002','LIT-101 bad quality','AI channel','LIT-101_BAD','Level control must not trust the channel.'],
  ['FI-003','P-101A drive fault','Intake pump','P101A_FAULT','Duty pump trips; standby logic selects pump B.'],
  ['FI-004','P-101A no run feedback','Intake pump','P101A_NO_RUN','Start feedback is suppressed for timeout demonstration.'],
  ['FI-005','PIT-401 high pressure','Distribution header','PIT-401_HIGH','Header pressure is forced above the high limit.'],
  ['FI-006','PIT-401 stale value','Communication layer','PIT-401_STALE','Pressure signal quality becomes STALE.'],
  ['FI-007','DPIT-201A high DP','Filter A','DPIT-201A_HIGH','Filter A loading increases toward backwash request.'],
  ['FI-008','XV-201A feedback mismatch','Valve A','XV-201A_MISMATCH','Valve position feedback is frozen.'],
  ['FI-009','AIT-301 out of range','pH analyzer','AIT-301_OOR','Analyzer quality becomes OUT_OF_RANGE.'],
  ['FI-010','pH process disturbance','Dosing model','PH_DISTURBANCE','Small deterministic process disturbance is applied.'],
  ['FI-011','TK-401 high-high level','Clearwell','TK-401_HIGHHIGH','Clearwell is driven toward simulated high-high.'],
  ['FI-012','TK-401 low-low level','Clearwell','TK-401_LOWLOW','Clearwell inventory is depleted for protection test.'],
  ['FI-013','Plant E-STOP active','Safety input','ESTOP','Normal outputs are removed and trip remains latched after release.'],
  ['FI-014','Packaging guard open','Packaging cell','GS501_OPEN','Conveyor, fill and capper are inhibited.'],
  ['FI-015','Conveyor jam','Packaging cell','CV501_JAM','Packaging state machine enters FAULT.'],
  ['FI-016','Bottle absent','Photoelectric sensor','BOTTLE_ABSENT','No-bottle/no-fill permissive is checked.'],
  ['FI-017','Underfill','Filling station','UNDERFILL','Bottle is rejected after fill inspection.'],
  ['FI-018','Modbus invalid address','Protocol simulator','MODBUS_INVALID','Illegal data address exception is returned.'],
  ['FI-019','Modbus unauthorized write','Register layer','MODBUS_WRITE_DENY','Write to read-only register is rejected and audited.'],
  ['FI-020','Historian storage limit','Storage layer','HISTORIAN_FULL','History sampling is paused gracefully; control continues.'],
  ['FI-021','UI render delay marker','Browser diagnostics','UI_RENDER_DELAY','Diagnostic flag only; does not alter plant physics.'],
  ['FI-022','P-401B drive fault','Distribution pump','P401B_FAULT','Distribution standby pump becomes unavailable.'],
  ['FI-023','Filter B analyzer fault','Filter B','DPIT-201B_BAD','Differential pressure channel quality is invalid.'],
  ['FI-024','CAP-501 actuator fault','Capper','CAP_FAULT','Package fails inspection and is routed to reject.'],
  ['FI-025','P-101B drive fault','Intake pump','P101B_FAULT','Intake standby pump becomes unavailable.'],
  ['FI-026','P-401A drive fault','Distribution pump','P401A_FAULT','Distribution lead pump becomes unavailable.'],
  ['FI-027','P-401C drive fault','Distribution pump','P401C_FAULT','Distribution reserve pump becomes unavailable.']
  ];
  class FaultInjectionLab {
    constructor(){
      this.active=new Set();
      this.history=[];
      this.sequence=0;
    }
    definitions(){
      return SCENARIOS.map(d=>({
        id:d[0],name:d[1],area:d[2],key:d[3],description:d[4],active:this.active.has(d[3])
      }
      ));
    }
    inject(id){
      const d=SCENARIOS.find(s=>s[0]===id);
      if(!d)throw new Error('Unknown fault scenario '+id);
      if(this.active.has(d[3]))return false;
      this.active.add(d[3]);
      this.log(d,'INJECTED');
      A.bus.emit('fault.updated',{
        id,key:d[3],active:true
      }
      );
      return true;
    }
    clear(id){
      const d=SCENARIOS.find(s=>s[0]===id);
      if(!d)return false;
      const changed=this.active.delete(d[3]);
      if(changed){
        this.log(d,'CLEARED');
        A.bus.emit('fault.updated',{
          id,key:d[3],active:false
        }
        );
      }
      return changed;
    }
    toggle(id){
      const d=SCENARIOS.find(s=>s[0]===id);
      if(!d)return false;
      return this.active.has(d[3])?this.clear(id):this.inject(id);
    }
    clearAll(){
      [...this.active].forEach(key=>{
        const d=SCENARIOS.find(s=>s[3]===key);if(d)this.clear(d[0]);
      }
      );
    }
    activeMap(){
      const out={
      }
      ;
      this.active.forEach(k=>out[k]=true);
      return out;
    }
    isActive(id){
      const d=SCENARIOS.find(s=>s[0]===id);
      return !!d&&this.active.has(d[3]);
    }
    log(d,event){
      this.history.unshift({
        sequence:++this.sequence,id:d[0],name:d[1],event,time:new Date().toISOString()
      }
      );
      if(this.history.length>500)this.history.length=500;
    }
  }
  A.FaultInjectionLab=FaultInjectionLab;
  A.FaultScenarioDefinitions=SCENARIOS;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
