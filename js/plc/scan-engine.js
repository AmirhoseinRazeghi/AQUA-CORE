(function (A) {
  'use strict';
  const clamp=A.MathUtil.clamp;
  class PLCScanEngine {
    constructor(config,tags,process,arbiter,instrumentation){
      this.config=config;
      this.tags=tags;
      this.process=process;
      this.arbiter=arbiter;
      this.instrumentation=instrumentation;
      this.mode='AUTO';
      this.estop=false;
      this.estopResetRequired=false;
      this.tripLatched=false;
      this.commands={
      }
      ;
      this.outputs={
      }
      ;
      this.loops={
      }
      ;
      Object.entries(config.pid).forEach(([name,p])=>{
        this.loops[name]=new A.PIDController(name,p);
      }
      );
      this.st=new A.STInterpreter().compile(A.IntakeSTSource);
      this.sequence=new A.SequenceManager(config,process);
      this.scanMs=0;
      this.lastScanMs=0;
      this.scanCounter=0;
      this.watchdogMs=20;
      this.lastErrors=[];
      this.startRequest=true;
      this.pkgEnable=false;
      this.manualCommands={
      }
      ;
      this.commandHistory=[];
      this.speedLimitPercent=100;
    }
    request(type,data,source){
      this.arbiter.submit(Object.assign({
        type
      }
      ,data||{
      }
      ),source||'HMI');
    }
    handleCommand(c){
      switch(c.type){
        case'SET_MODE':if(this.estop||this.tripLatched)throw new Error('Reset trip before changing mode');
        this.mode=c.mode;
        this.loops.LIC101.setMode(c.mode==='MANUAL'?'MANUAL':'AUTO');
        return this.mode;
        case'START_UNIT':this.startRequest=true;
        return true;
        case'STOP_UNIT':this.startRequest=false;
        return true;
        case'SETPOINT':if(!this.loops[c.loop])throw new Error('Unknown loop');
        this.loops[c.loop].params.setpoint=c.value;
        return c.value;
        case'SET_SPEED_LIMIT':if(!Number.isFinite(c.value)||c.value<0||c.value>100)throw new Error('Speed limit must be 0..100%');
        this.speedLimitPercent=c.value;
        return c.value;
        case'SET_PID_MODE':this.loops[c.loop].setMode(c.mode,c.output);
        return true;
        case'SET_PID_TUNINGS':this.loops[c.loop].setTunings(c.kp,c.ki,c.kd);
        return true;
        case'BACKWASH':return this.sequence.requestBackwash(c.filter,'HMI');
        case'PACKAGING_ENABLE':this.pkgEnable=!!c.enabled;
        return this.pkgEnable;
        case'MANUAL_JOG':if(this.mode!=='MANUAL')throw new Error('Select MANUAL mode before jogging equipment');
        if(!['P101A','P101B','P401A','P401B','P401C'].includes(c.equipment))throw new Error('Unsupported manual equipment');
        this.manualCommands[c.equipment]=!!c.enabled;
        return this.manualCommands[c.equipment];
        case'MANUAL_STOP':this.manualCommands={
        }
        ;
        return true;
        case'ESTOP':this.activateEStop();
        return true;
        case'RESET_ESTOP':if(!this.estop) return true;
        this.estop=false;
        this.estopResetRequired=true;
        return true;
        case'RESET_TRIP':if(this.estop)throw new Error('E-STOP still active');
        this.tripLatched=false;
        this.estopResetRequired=false;
        Object.values(this.process.pumps).forEach(p=>{
          if(!p.fault)p.reset();
        }
        );
        return true;
        case'ACK_ALARM':A.bus.emit('alarm.ackAll',{
        }
        );
        return true;
        case'RESET_SIM':this.reset();
        return true;
        default:throw new Error('Unsupported command '+c.type);
      }
    }
    activateEStop(){
      this.estop=true;
      this.estopResetRequired=true;
      this.tripLatched=true;
      this.mode='TRIPPED';
      this.outputs={
      }
      ;
      this.commands={
      }
      ;
      this.arbiter.setSafety({
        mode:'TRIPPED',estop:true,tripped:true
      }
      );
      A.bus.emit('safety.estop',{
        active:true
      }
      );
    }
    resetEStop(){
      this.request('RESET_ESTOP');
    }
    scan(dt){
      const started=performance.now();
      this.scanCounter++;
      this.arbiter.setSafety({
        mode:this.mode,estop:this.estop,tripped:this.tripLatched
      }
      );
      this.arbiter.drain((c)=>this.handleCommand(c));
      const faults=A.faultLab?A.faultLab.activeMap():{
      }
      ;
      this.instrumentation.setFaults(faults);
      this.instrumentation.evaluate(this.scanCounter*dt);
      this.sequence.step(dt,this.mode,faults);
      const level=this.tags.value('LIT-101',55),clearLevel=this.tags.value('LIT-401',56),pressure=this.tags.value('PIT-401',.6),flow=this.tags.value('FIT-101',0),ph=this.tags.value('AIT-301',6.65);
      const lic=this.loops.LIC101.update(level,this.loops.LIC101.params.setpoint,dt,this.tags.get('LIT-101').quality);
      const fic=this.loops.FIC201.update(flow,this.loops.FIC201.params.setpoint,dt,this.tags.get('FIT-101').quality);
      const pic=this.loops.PIC401.update(pressure,this.loops.PIC401.params.setpoint,dt,this.tags.get('PIT-401').quality);
      const aic=this.loops.AIC301.update(ph,this.loops.AIC301.params.setpoint,dt,this.tags.get('AIT-301').quality);
      const auto=this.mode==='AUTO'&&!this.tripLatched&&!this.estop;
      const start=auto&&this.startRequest;
      const intakeStart=start&&level>this.config.plant.intake.stopLevel*100&&level<97;
      this.st.setInputs({
        TankLevel:level,PumpA_Fault:!!faults.P101A_FAULT, PumpB_Fault:!!faults.P101B_FAULT,StartRequest:intakeStart
      }
      );
      const stOut=this.st.execute();
      const pA=auto&&stOut.PumpA_Command,pB=auto&&stOut.PumpB_Command;
      const distAllowed=auto&&clearLevel>8&&!faults['LIT-401_BAD'];
      const p401a=distAllowed&&pic>1;
      const p401b=distAllowed&&pic>70;
      const p401c=distAllowed&&this.sequence.distribution.state==='CHANGEOVER';
      const filterA=this.process.filters.A.state==='SERVICE',filterB=this.process.filters.B.state==='SERVICE';
      const fcv=auto?clamp(fic,0,100):0;
      const doseEnabled=auto&&flow>0.4&&this.tags.get('AIT-301').quality==='GOOD';
      this.outputs={
        P101A_START:pA,P101B_START:pB,VFD101A:pA?lic:0,VFD101B:pB?lic:0,P401A_START:p401a,P401B_START:p401b,P401C_START:p401c,VFD401A:p401a?pic:0,VFD401B:p401b?pic:0,VFD401C:p401c?pic:0,XV201A_OPEN:filterA,XV201B_OPEN:filterB,FCV201_REF:fcv,P301_START:doseEnabled,D301_RATE_REF:doseEnabled?aic:0,PK501_ENABLE:auto&&this.pkgEnable
      }
      ;
      if(this.mode==='MANUAL'&&!this.tripLatched&&!this.estop){
        const m=this.manualCommands;
        this.outputs.P101A_START=!!m.P101A;
        this.outputs.P101B_START=!!m.P101B;
        this.outputs.P401A_START=!!m.P401A;
        this.outputs.P401B_START=!!m.P401B;
        this.outputs.P401C_START=!!m.P401C;
        this.outputs.VFD101A=m.P101A?35:0;
        this.outputs.VFD101B=m.P101B?35:0;
        this.outputs.VFD401A=m.P401A?35:0;
        this.outputs.VFD401B=m.P401B?35:0;
        this.outputs.VFD401C=m.P401C?35:0;
        this.outputs.XV201A_OPEN=!!m.P101A;
        this.outputs.XV201B_OPEN=!!m.P101B;
        this.outputs.FCV201_REF=35;
        this.outputs.PK501_ENABLE=false;
      }
      const speedLimit=clamp(this.speedLimitPercent,0,100);
      ['VFD101A','VFD101B','VFD401A','VFD401B','VFD401C'].forEach(k=>{
        this.outputs[k]=Math.min(Number(this.outputs[k])||0,speedLimit);
      }
      );
      this.evaluateInterlocks(faults);
      if(this.tripLatched||this.estop){
        Object.keys(this.outputs).forEach(k=>{
          if(k.endsWith('_START')||k==='PK501_ENABLE'||k==='P301_START')this.outputs[k]=false;
        }
        );
        this.outputs.VFD101A=this.outputs.VFD101B=this.outputs.VFD401A=this.outputs.VFD401B=this.outputs.VFD401C=this.outputs.FCV201_REF=this.outputs.D301_RATE_REF=0;
      }
      this.process.step(dt,this.outputs,faults);
      this.publishDiagnostics({
        lic,fic,pic,aic,stOut
      }
      );
      this.scanMs=performance.now()-started;
      this.lastScanMs=this.scanMs;
      if(this.scanMs>this.watchdogMs){
        A.bus.emit('plc.watchdog',{
          scan:this.scanCounter,duration:this.scanMs
        }
        );
      }
      A.bus.emit('plc.scan',{
        scan:this.scanCounter,duration:this.scanMs,outputs:this.outputs
      }
      );
      return this.scanMs;
    }
    evaluateInterlocks(f){
      const raw=this.process.rawTank.level,clear=this.process.clearTank.level;
      if(raw<=10){
        this.outputs.P101A_START=false;
        this.outputs.P101B_START=false;
      }
      if(raw>=95){
        this.outputs.P101A_START=false;
        this.outputs.P101B_START=false;
      }
      if(clear<=8){
        this.outputs.P401A_START=this.outputs.P401B_START=this.outputs.P401C_START=false;
      }
      if(clear>=95){
        this.outputs.P101A_START=this.outputs.P101B_START=false;
      }
      if(this.process.headerPressure>this.config.plant.distribution.highPressure){
        this.outputs.P401A_START=this.outputs.P401B_START=this.outputs.P401C_START=false;
        this.tripLatched=true;
      }
      if(f['ESTOP'])this.activateEStop();
      if(f['P101A_FAULT']&&f['P101B_FAULT']){
        this.tripLatched=true;
        this.mode='TRIPPED';
      }
      if(f['P401A_FAULT']&&f['P401B_FAULT']&&f['P401C_FAULT']){
        this.tripLatched=true;
        this.mode='TRIPPED';
      }
      if(f['GS501_OPEN']||f['CV501_JAM'])this.outputs.PK501_ENABLE=false;
    }
    publishDiagnostics(l){
      const set=(id,v)=>this.tags.update(id,v,{
        source:'PLC'
      }
      );
      set('VFD-101A_SPD_REF',this.outputs.VFD101A||0);
      set('VFD-101B_SPD_REF',this.outputs.VFD101B||0);
      set('VFD-401A_SPD_REF',this.outputs.VFD401A||0);
      set('VFD-401B_SPD_REF',this.outputs.VFD401B||0);
      set('VFD-401C_SPD_REF',this.outputs.VFD401C||0);
      set('FCV-201_REF',this.outputs.FCV201_REF||0);
      set('D301_RATE_REF',this.outputs.D301_RATE_REF||0);
      set('P101A_START',!!this.outputs.P101A_START);
      set('P101B_START',!!this.outputs.P101B_START);
      set('P401A_START',!!this.outputs.P401A_START);
      set('P401B_START',!!this.outputs.P401B_START);
      set('P401C_START',!!this.outputs.P401C_START);
      set('P301_START',!!this.outputs.P301_START);
      set('CV501_RUN',!!this.outputs.PK501_ENABLE);
      set('FILL501_OPEN',!!this.outputs.PK501_ENABLE);
      set('CAP501_RUN',!!this.outputs.PK501_ENABLE);
      set('REJ501_EXT',false);
      this.loopSnapshot={
        LIC101:l.lic,FIC201:l.fic,PIC401:l.pic,AIC301:l.aic
      }
      ;
    }
    setMode(mode){
      this.request('SET_MODE',{
        mode
      }
      );
    }
    reset(){
      this.mode='OFF';
      this.startRequest=false;
      this.pkgEnable=false;
      this.tripLatched=false;
      this.estop=false;
      this.estopResetRequired=false;
      this.process.reset();
      Object.values(this.loops).forEach(l=>l.reset());
      this.st.reset();
      this.sequence.resetBackwash();
      this.commands={
      }
      ;
      this.outputs={
      }
      ;
      this.manualCommands={
      }
      ;
      this.speedLimitPercent=100;
      this.arbiter.setSafety({
        mode:'OFF',estop:false,tripped:false
      }
      );
      A.bus.emit('system.reset',{
      }
      );
    }
  }
  A.PLCScanEngine=PLCScanEngine;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
