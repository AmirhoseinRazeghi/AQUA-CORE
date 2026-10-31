(function (A) {
  'use strict';
  const DEFINITIONS = [
  ['ALM-001','TK-101 low-low level','LIT-101','P1','Raw tank level is at or below 10%.','Intake pump dry-run risk.','Restore source level; verify transmitter; reset trip.'],
  ['ALM-002','TK-101 low level','LIT-101','P3','Raw tank level is below 20%.','Reduced raw-water inventory.','Check source inflow and consumption.'],
  ['ALM-003','TK-401 low-low level','LIT-401','P1','Clearwell level is at or below 8%.','Distribution and packaging are inhibited.','Restore upstream flow; verify level quality.'],
  ['ALM-004','TK-401 high-high level','LIT-401','P1','Clearwell level is at or above 95%.','Overflow risk; upstream feed is stopped.','Check distribution demand and level loop.'],
  ['ALM-005','P-101A drive fault','P101A_FLT_FB','P2','Intake duty pump A has a drive fault.','Duty pump unavailable.','Inspect drive; clear fault; reset.'],
  ['ALM-006','P-101B drive fault','P101B_FLT_FB','P2','Intake standby pump B has a drive fault.','No standby intake pump.','Inspect drive; clear fault; reset.'],
  ['ALM-007','P-401A drive fault','P401A_FLT_FB','P2','Distribution pump A has a drive fault.','Pressure control capacity reduced.','Inspect drive and duty/standby selection.'],
  ['ALM-008','P-401B drive fault','P401B_FLT_FB','P2','Distribution pump B has a drive fault.','Pressure control capacity reduced.','Inspect drive and duty/standby selection.'],
  ['ALM-009','P-401C drive fault','P401C_FLT_FB','P2','Distribution pump C has a drive fault.','Pressure control capacity reduced.','Inspect drive and availability.'],
  ['ALM-010','Filter A differential pressure high','DPIT-201A','P3','Filter A differential pressure exceeds 0.80 bar.','Filter loading is increasing.','Request backwash when alternate filter is in service.'],
  ['ALM-011','Filter B differential pressure high','DPIT-201B','P3','Filter B differential pressure exceeds 0.80 bar.','Filter loading is increasing.','Request backwash when alternate filter is in service.'],
  ['ALM-012','Filter differential pressure trip','DPIT-201A','P2','Filter A differential pressure exceeds 1.20 bar.','Filter A removed from service.','Inspect blockage and complete wash sequence.'],
  ['ALM-013','pH analyzer bad quality','AIT-301','P2','AIT-301 quality is not GOOD.','Automatic dosing and product acceptance are inhibited.','Restore analyzer signal and confirm stable quality.'],
  ['ALM-014','Product pH outside sample band','AIT-301','P2','Modeled pH is outside 6.8–7.6.','Product stream is diverted to reject tank.','Check dosing loop and raw-water disturbance.'],
  ['ALM-015','Header high pressure','PIT-401','P1','Distribution header pressure exceeds 6 bar.','Distribution pumps are stopped by model interlock.','Check PIC-401, demand and pump outputs.'],
  ['ALM-016','Plant E-STOP active','ES001_LOOP','P1','Simulation emergency-stop input is active.','Normal output commands are removed and trip is latched.','Clear simulated cause, reset E-STOP, then issue a new start.'],
  ['ALM-017','Packaging guard open','GS501_GUARD','P1','Packaging guard is open.','Packaging motion is inhibited.','Close guard and reset local cell.'],
  ['ALM-018','Conveyor jam','CV501_RUN','P2','Conveyor jam fault is injected.','Packaging cell enters FAULT.','Clear jam and reset the cell.'],
  ['ALM-019','LIT-101 sensor quality','LIT-101','P2','Raw tank level transmitter quality is not GOOD.','Intake level control is inhibited.','Restore instrument quality and verify process response.'],
  ['ALM-020','PIT-401 stale communication','PIT-401','P2','Header pressure measurement is stale.','Pressure PID uses no new measurement.','Restore modeled communication and verify tag timestamp.']
  ];
  class AlarmManager {
    constructor(tags,config){
      this.tags=tags;
      this.config=config;
      this.alarms=new Map();
      this.events=[];
      this.sequence=0;
      this.definitions=DEFINITIONS.map(d=>({
        id:d[0],name:d[1],tag:d[2],priority:d[3],conditionText:d[4],consequence:d[5],action:d[6]
      }
      ));
      this.definitions.forEach(d=>this.alarms.set(d.id,Object.assign({
      }
      ,d,{
        state:'NORMAL',active:false,acknowledged:false,firstInTime:null,lastChangeTime:null,ackTime:null,activeSeconds:0
      }
      )));
      this.evalTimers={
      }
      ;
    }
    evaluate(process,plc,faults){
      const v=id=>this.tags.value(id,0);
      const q=id=>this.tags.get(id)?.quality||'BAD';
      const conditions={
        'ALM-001':v('LIT-101')<=10,'ALM-002':v('LIT-101')<20,'ALM-003':v('LIT-401')<=8,'ALM-004':v('LIT-401')>=95,
        'ALM-005':!!v('P101A_FLT_FB'),'ALM-006':!!v('P101B_FLT_FB'),'ALM-007':!!v('P401A_FLT_FB'),'ALM-008':!!v('P401B_FLT_FB'),'ALM-009':!!v('P401C_FLT_FB'),
        'ALM-010':v('DPIT-201A')>=.8,'ALM-011':v('DPIT-201B')>=.8,'ALM-012':v('DPIT-201A')>=1.2,'ALM-013':q('AIT-301')!=='GOOD','ALM-014':v('AIT-301')<6.8||v('AIT-301')>7.6,
        'ALM-015':v('PIT-401')>6,'ALM-016':!!plc.estop,'ALM-017':!v('GS501_GUARD'),'ALM-018':!!faults.CV501_JAM,'ALM-019':q('LIT-101')!=='GOOD','ALM-020':q('PIT-401')==='STALE'
      }
      ;
      Object.entries(conditions).forEach(([id,active])=>this.transition(id,active));
    }
    transition(id,active){
      const a=this.alarms.get(id);
      if(!a)return;
      const now=new Date().toISOString();
      if(active&&!a.active){
        a.active=true;
        a.acknowledged=false;
        a.state='ACTIVE_UNACK';
        a.firstInTime=now;
        a.lastChangeTime=now;
        a.activeSeconds=0;
        this.pushEvent(a,'ACTIVATED');
      }
      else if(!active&&a.active){
        a.active=false;
        a.state=a.acknowledged?'NORMAL':'RTN_UNACK';
        a.lastChangeTime=now;
        this.pushEvent(a,'RETURN_TO_NORMAL');
      }
      else if(active){
        a.activeSeconds+=this.config.scanMs/1000;
        if(!a.acknowledged)a.state='ACTIVE_UNACK';
        else a.state='ACTIVE_ACK';
      }
      else if(a.state==='RTN_UNACK'){
      }
    }
    acknowledge(id,operator='OPERATOR'){
      const list=id?[this.alarms.get(id)]:[...this.alarms.values()];
      list.filter(Boolean).forEach(a=>{
        if(a.state==='ACTIVE_UNACK'||a.state==='RTN_UNACK'){
          a.acknowledged=true;a.ackTime=new Date().toISOString();a.ackBy=operator;a.state=a.active?'ACTIVE_ACK':'NORMAL';this.pushEvent(a,'ACKNOWLEDGED');
        }
      }
      );
      A.bus.emit('alarm.changed',{
        id
      }
      );
    }
    pushEvent(a,event){
      const e={
        sequence:++this.sequence,alarmId:a.id,name:a.name,priority:a.priority,event,tag:a.tag,time:new Date().toISOString(),cause:a.conditionText,action:a.action
      }
      ;
      this.events.unshift(e);
      if(this.events.length>(this.config.storage.maxEvents||5000))this.events.length=5000;
      A.bus.emit('alarm.event',e);
    }
    active(){
      return [...this.alarms.values()].filter(a=>a.active);
    }
    unacknowledged(){
      return [...this.alarms.values()].filter(a=>a.state==='ACTIVE_UNACK'||a.state==='RTN_UNACK');
    }
    summary(){
      const active=this.active(),unack=this.unacknowledged();
      return {
        active:active.length,unack:unack.length,p1:active.filter(a=>a.priority==='P1').length,p2:active.filter(a=>a.priority==='P2').length,p3:active.filter(a=>a.priority==='P3').length,p4:active.filter(a=>a.priority==='P4').length
      }
      ;
    }
    reset(){
      this.alarms.forEach(a=>{
        a.active=false;a.acknowledged=false;a.state='NORMAL';a.firstInTime=null;a.ackTime=null;
      }
      );
      this.events=[];
    }
  }
  A.AlarmManager=AlarmManager;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
