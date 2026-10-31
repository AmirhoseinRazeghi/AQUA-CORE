(function (A) {
  'use strict';
  const assert=(condition,message)=>{
    if(!condition)throw new Error(message||'Assertion failed');
  }
  ;
  class TestRunner {
    constructor(){
      this.results=[];this.running=false;
    }
    async runAll(){
      if(this.running)return this.results;this.running=true;const tests=this.tests();const results=[];for(const t of tests){
        const start=performance.now();try{
          await t.run();results.push({
            id:t.id,name:t.name,status:'PASS',duration:performance.now()-start,message:'All assertions passed'
          }
          );
        }
        catch(e){
          results.push({
            id:t.id,name:t.name,status:'FAIL',duration:performance.now()-start,message:e.message
          }
          );
        }
      }
      this.results=results;this.running=false;A.bus.emit('tests.completed',{
        results,summary:this.summary()
      }
      );return results;
    }
    tests(){
      return [
      {
        id:'UT-001',name:'Tank mass balance',run:()=>{
          const t=new A.TankModel('T',10,5);t.step(4,1,3600);assert(Math.abs(t.volume-8)<1e-9,'Expected 8 m³ after net 3 m³/h for one hour');
        }
      }
      ,
      {
        id:'UT-002',name:'Tank overflow clamp and flag',run:()=>{
          const t=new A.TankModel('T',2,1.9);const r=t.step(2,0,3600);assert(t.volume===2&&r.overflow,'Overflow must clamp and expose flag');
        }
      }
      ,
      {
        id:'UT-003',name:'Pump ramp limit',run:()=>{
          const p=new A.PumpModel('P',{
            nominalFlow:5,rampUp:10,rampDown:20
          }
          );p.step(100,1);assert(Math.abs(p.speed-10)<1e-9,'Ramp up should be limited to 10%/s');
        }
      }
      ,
      {
        id:'UT-004',name:'Pump trip removes run feedback',run:()=>{
          const p=new A.PumpModel('P');p.step(100,5);p.trip();p.step(100,1);assert(!p.runFeedback&&p.speed<100,'Faulted pump must not report running');
        }
      }
      ,
      {
        id:'UT-005',name:'TON timer',run:()=>{
          const fb=new A.FunctionBlocks.TON();fb.update(true,1,.4);assert(!fb.Q,'TON early');fb.update(true,1,.6);assert(fb.Q,'TON must energize at PT');
        }
      }
      ,
      {
        id:'UT-006',name:'R_TRIG one-scan pulse',run:()=>{
          const fb=new A.FunctionBlocks.R_TRIG();assert(fb.update(true).Q,'Rising edge missing');assert(!fb.update(true).Q,'Rising edge repeated');assert(!fb.update(false).Q,'Falling edge should not pulse R_TRIG');
        }
      }
      ,
      {
        id:'UT-007',name:'PID output saturation',run:()=>{
          const p=new A.PIDController('T',{
            kp:100,ki:10,min:0,max:100,setpoint:100
          }
          );const u=p.update(0,100,.1);assert(u<=100&&u>=0,'Output outside limits');
        }
      }
      ,
      {
        id:'UT-008',name:'ST parser and interpreter',run:()=>{
          const src=`PROGRAM T\nVAR X : REAL; Y : BOOL; END_VAR\nX := 12.5;\nIF X > 10.0 THEN Y := TRUE; ELSE Y := FALSE; END_IF;\nEND_PROGRAM`;const p=new A.STInterpreter().compile(src);const o=p.execute();assert(o.Y===true,'IF branch did not execute');
        }
      }
      ,
      {
        id:'UT-009',name:'ST rejects unsupported syntax',run:()=>{
          let failed=false;try{
            new A.STInterpreter().compile('PROGRAM T VAR X : REAL; END_VAR WHILE TRUE DO X := 1.0; END_WHILE; END_PROGRAM');
          }
          catch(e){
            failed=true;
          }
          assert(failed,'Unsupported WHILE syntax must be rejected');
        }
      }
      ,
      {
        id:'PT-001',name:'Modbus FC03 register read',run:()=>{
          const m=A.app.modbus;const r=m.readHolding(40001,2);assert(r.ok&&r.values.length===2,'Holding-register read failed');
        }
      }
      ,
      {
        id:'PT-002',name:'Modbus illegal address exception',run:()=>{
          const r=A.app.modbus.readHolding(49999,1);assert(!r.ok&&r.exceptionCode===2,'Expected illegal data address exception');
        }
      }
      ,
      {
        id:'PT-003',name:'Modbus read-only write rejection',run:()=>{
          const r=A.app.modbus.writeSingleRegister(30001,1);assert(!r.ok,'Read-only register write must fail');
        }
      }
      ,
      {
        id:'PT-004',name:'OPC-shaped node read',run:()=>{
          const n=A.app.opc.read('ns=2;s=LIT-101.Value');assert(n.value!==undefined&&n.statusCode,'OPC node missing value or quality');
        }
      }
      ,
      {
        id:'IT-001',name:'E-STOP latch and no auto restart',run:()=>{
          const tags=new A.TagDatabase(A.TagDefinitions),process=new A.ProcessEngine(A.Config,tags),arbiter=new A.CommandArbiter(),instrumentation=new A.InstrumentationLayer(tags),p=new A.PLCScanEngine(A.Config,tags,process,arbiter,instrumentation);p.activateEStop();assert(p.estop&&p.tripLatched,'E-STOP should latch trip');p.estop=false;p.estopResetRequired=true;assert(p.tripLatched&&p.mode==='TRIPPED','Release must not clear trip automatically');assert(!arbiter.validate({
            command:{
              type:'START_UNIT'
            }
          }
          ).ok,'Start must remain blocked until trip reset');p.reset();
        }
      }
      ,
      {
        id:'IT-002',name:'Command arbiter rejects unsafe start',run:()=>{
          const arb=new A.CommandArbiter();arb.setSafety({
            mode:'AUTO',estop:true,tripped:true
          }
          );const item={
            command:{
              type:'START_UNIT'
            }
          }
          ;assert(!arb.validate(item).ok,'Start command must be inhibited by E-STOP');
        }
      }
      ,
      {
        id:'PT-005',name:'MBAP codec length',run:()=>{
          const m=A.app.modbus;const b=m.encodeMBAP(42,1,[3,0x9c,0x41,0,1]);const d=m.decodeMBAP(b);assert(d.transactionId===42&&d.unitId===1&&d.pdu.length===5,'MBAP round trip failed');
        }
      }
      ,
      {
        id:'PT-006',name:'Modbus input register block',run:()=>{
          const r=A.app.modbus.readInput(30001,24);assert(r.ok&&r.values.length===24&&Number.isFinite(r.values[9]),'Input register block must be available and numeric');
        }
      }
      ,
      {
        id:'PT-007',name:'Modbus setpoint range validation',run:()=>{
          const r=A.app.modbus.writeSingleRegister(40004,9999);assert(!r.ok&&r.exceptionCode===3,'Out-of-range setpoint must be rejected');
        }
      }
      ,
      {
        id:'PT-008',name:'Modbus multi-write atomic validation',run:()=>{
          const m=A.app.modbus;const before=m.holding.get(40009),queued=A.app.arbiter.queue.length;const r=m.writeMultipleRegisters(40009,[1,2000]);assert(!r.ok&&m.holding.get(40009)===before&&A.app.arbiter.queue.length===queued,'Rejected FC16 batch must have no side effects');
        }
      }
      ,
      {
        id:'PT-009',name:'Modbus coils and discrete inputs',run:()=>{
          const m=A.app.modbus;const c=m.readCoils(1,8),d=m.readDiscrete(10001,10);assert(c.ok&&c.values.length===8&&d.ok&&d.values.length===10,'Coil/discrete tables are not readable');
        }
      }
      ,
      {
        id:'IT-003',name:'E-STOP reset command is permitted while trip latched',run:()=>{
          const a=new A.CommandArbiter();a.setSafety({
            mode:'TRIPPED',estop:false,tripped:true
          }
          );const v=a.validate({
            command:{
              type:'RESET_ESTOP'
            }
          }
          );assert(v.ok,'RESET_ESTOP must remain available to clear the E-stop input before trip reset');
        }
      }
      ,
      {
        id:'IT-004',name:'Fault injection mapping is complete',run:()=>{
          const ids=new Set(A.FaultScenarioDefinitions.map(x=>x[0]));assert(ids.has('FI-026')&&ids.has('FI-027'),'Distribution pump scenarios must be defined');
        }
      }
      ,
      {
        id:'UT-010',name:'CTU counts rising edges only',run:()=>{
          const c=new A.FunctionBlocks.CTU();c.update(true,false,2);c.update(true,false,2);c.update(false,false,2);c.update(true,false,2);assert(c.CV===2,'CTU must increment once per rising edge');
        }
      }
      ,
      {
        id:'UT-011',name:'Filter differential pressure responds to loading',run:()=>{
          const f=new A.FilterModel('F',{
            cleanDP:.15,backwashRequestDP:.8,tripDP:1.2,loadRate:.0001,washRate:.004
          }
          );for(let i=0;i<100;i++)f.step(4,1,false);assert(f.dp>.15,'Filter DP should increase during service');
        }
      }
      ,
      {
        id:'UT-012',name:'Valve travel is rate-limited',run:()=>{
          const v=new A.ValveModel('XV',2);v.step(100,.5);assert(v.position>0&&v.position<100,'Valve should move gradually, not jump to full stroke');
        }
      }
      ,
      {
        id:'UT-013',name:'PID manual output is bounded',run:()=>{
          const p=new A.PIDController('T',{
            min:0,max:100,bias:20
          }
          );p.setMode('MANUAL',140);assert(p.update(50,50,.1)===100,'Manual output must clamp to controller limits');
        }
      }
      ,
      {
        id:'UT-014',name:'Clearing pump fault restores availability',run:()=>{
          const tags=new A.TagDatabase(A.TagDefinitions),p=new A.ProcessEngine(A.Config,tags);p.pumps.P101A.fault=true;p.step(.05,{
          }
          ,{
          }
          );assert(!p.pumps.P101A.fault,'Cleared fault condition should release the modeled drive fault');
        }
      }
      ,
      {
        id:'PT-010',name:'Modbus speed limit command is supported',run:()=>{
          const m=A.app.modbus,r=m.writeSingleRegister(40010,650);assert(r.ok,'Speed limit register write should be accepted');A.app.plc.scan(A.Config.scanMs/1000);const applied=A.app.plc.speedLimitPercent===65;m.writeSingleRegister(40010,1000);A.app.plc.scan(A.Config.scanMs/1000);assert(applied,'PLC should apply the speed limit value');
        }
      }
      ,
      {
        id:'PT-011',name:'OPC browse exposes measurement variables',run:()=>{
          const rows=A.app.opc.browse('ns=2;s=Measurements');assert(rows.length>10&&rows.some(x=>x.nodeId==='ns=2;s=PIT-401.Value'&&x.value!==undefined),'Measurement nodes should be browsable');
        }
      }
      ,
      {
        id:'IT-005',name:'Fault injection records an auditable lifecycle',run:()=>{
          const lab=new A.FaultInjectionLab();lab.inject('FI-013');assert(lab.activeMap().ESTOP&&lab.history[0].event==='INJECTED','Fault injection must activate and log');lab.clear('FI-013');assert(!lab.activeMap().ESTOP&&lab.history[0].event==='CLEARED','Fault clear must be logged');
        }
      }
      ,
      {
        id:'IT-006',name:'E-STOP scan inhibits all motion outputs',run:()=>{
          const tags=new A.TagDatabase(A.TagDefinitions),process=new A.ProcessEngine(A.Config,tags),arbiter=new A.CommandArbiter(),instrumentation=new A.InstrumentationLayer(tags),p=new A.PLCScanEngine(A.Config,tags,process,arbiter,instrumentation);p.activateEStop();p.scan(A.Config.scanMs/1000);assert(p.tripLatched&&Object.entries(p.outputs).every(([k,v])=>!((k.endsWith('_START')||k==='PK501_ENABLE'||k==='P301_START'||k.startsWith('VFD'))&&v)),'E-STOP must inhibit run and speed outputs');p.reset();
        }
      }
      ];
    }
    summary(){
      const pass=this.results.filter(r=>r.status==='PASS').length,fail=this.results.filter(r=>r.status==='FAIL').length;return {
        total:this.results.length,pass,fail,rate:this.results.length?pass/this.results.length*100:0
      }
      ;
    }
    exportJSON(){
      const blob=new Blob([JSON.stringify({
        project:'AQUA-CORE',generatedAt:new Date().toISOString(),summary:this.summary(),results:this.results
      }
      ,null,2)],{
        type:'application/json'
      }
      );const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='aquacore-test-report.json';a.click();URL.revokeObjectURL(url);
    }
  }
  A.TestRunner=TestRunner;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
