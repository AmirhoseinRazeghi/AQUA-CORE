(function (A) {
  'use strict';
  const {
    clamp
  }
  =A.MathUtil;
  class ProcessEngine {
    constructor(config,tags){
      this.config=config;
      this.tags=tags;
      const p=config.plant;
      this.rawTank=new A.TankModel('TK-101',p.tanks.raw.capacity,p.tanks.raw.initial);
      this.clearTank=new A.TankModel('TK-401',p.tanks.clear.capacity,p.tanks.clear.initial);
      this.rejectTank=new A.TankModel('TK-301R',p.tanks.reject.capacity,p.tanks.reject.initial);
      this.pumps={
        P101A:new A.PumpModel('P-101A',{
          nominalFlow:4.6,rampUp:p.intake.pumpRampUp,rampDown:p.intake.pumpRampDown
        }
        ),P101B:new A.PumpModel('P-101B',{
          nominalFlow:4.6,rampUp:p.intake.pumpRampUp,rampDown:p.intake.pumpRampDown
        }
        ),P401A:new A.PumpModel('P-401A',{
          nominalFlow:4.2,rampUp:p.distribution.pumpRamp,rampDown:p.distribution.pumpRamp
        }
        ),P401B:new A.PumpModel('P-401B',{
          nominalFlow:4.2,rampUp:p.distribution.pumpRamp,rampDown:p.distribution.pumpRamp
        }
        ),P401C:new A.PumpModel('P-401C',{
          nominalFlow:4.2,rampUp:p.distribution.pumpRamp,rampDown:p.distribution.pumpRamp
        }
        ),P301:new A.PumpModel('P-301',{
          nominalFlow:0.01,rampUp:100,rampDown:100
        }
        )
      }
      ;
      this.valves={
        XV201A:new A.ValveModel('XV-201A',2),XV201B:new A.ValveModel('XV-201B',2),FCV201:new A.ValveModel('FCV-201',1.2)
      }
      ;
      this.filters={
        A:new A.FilterModel('F-201A',p.filters),B:new A.FilterModel('F-201B',p.filters)
      }
      ;
      this.headerPressure=0.6;
      this.ph=p.dosing.phSetpoint;
      this.conductivity=p.dosing.nominalConductivity+120;
      this.rawTurbidity=1.0;
      this.rejectDivert=false;
      this.intakeFlow=0;
      this.filteredFlow=0;
      this.distributionFlow=0;
      this.scanCount=0;
      this.totalWaterIn=0;
      this.totalWaterOut=0;
      this.packaging={
        state:'WAIT_BOTTLE',timer:0,bottlePresent:false,bottleId:0,fillVolume:0,accepted:0,rejected:0,enabled:false,conveyor:false,capper:false,rejectActuator:false,jam:false,underfill:false,qualityPass:true
      }
      ;
      this.lastStep={
      }
      ;
    }
    step(dt,commands,faults){
      const c=this.config.plant;
      const f=faults||{
      }
      ;
      const cmd=commands||{
      }
      ;
      this.scanCount++;
      Object.entries(this.pumps).forEach(([key,p])=>{
        if(f[key+'_FAULT']){
          p.fault=true;p.command=0;
        }
        else if(p.fault){
          p.reset();
        }
        if(f[key+'_CLEAR'])p.reset();
      }
      );
      const rawLevel=this.rawTank.level;
      const rawAvailable=rawLevel>c.intake.stopLevel*100&&!f['LIT-101_BAD'];
      const intA=this.pumps.P101A.step((cmd.P101A_START&&rawAvailable)?(cmd.VFD101A||100):0,dt,0.9);
      const intB=this.pumps.P101B.step((cmd.P101B_START&&rawAvailable)?(cmd.VFD101B||100):0,dt,0.9);
      this.intakeFlow=intA+intB;
      const vA=this.valves.XV201A.step(cmd.XV201A_OPEN?100:0,dt,!!f['XV-201A_MISMATCH']);
      const vB=this.valves.XV201B.step(cmd.XV201B_OPEN?100:0,dt,!!f['XV-201B_MISMATCH']);
      this.valves.FCV201.step(cmd.FCV201_REF||0,dt);
      const serviceA=this.filters.A.state==='SERVICE'&&!this.filters.A.fault;
      const serviceB=this.filters.B.state==='SERVICE'&&!this.filters.B.fault;
      const openFactor=((serviceA?vA/100:0)+(serviceB?vB/100:0));
      const filterCapacity=(serviceA?c.filters.capacityEach:0)+(serviceB?c.filters.capacityEach:0);
      if(f['DPIT-201A_HIGH'])this.filters.A.loading=Math.max(this.filters.A.loading,2.0);
      if(f['DPIT-201B_HIGH'])this.filters.B.loading=Math.max(this.filters.B.loading,2.0);
      const filterFlow=Math.min(this.intakeFlow,filterCapacity,Math.max(0,cmd.FCV201_REF||0)/100*c.intake.maxFlow)*Math.min(openFactor,1);
      this.filters.A.step(serviceA?Math.min(filterFlow/Math.max(1,(serviceA?1:0)+(serviceB?1:0)),c.filters.capacityEach):0,dt,this.filters.A.state!=='SERVICE');
      this.filters.B.step(serviceB?Math.min(filterFlow/Math.max(1,(serviceA?1:0)+(serviceB?1:0)),c.filters.capacityEach):0,dt,this.filters.B.state!=='SERVICE');
      const rawOut=this.intakeFlow;
      const overflowUpstream=this.clearTank.level>=95;
      const qualityGood=this.ph>=c.dosing.phLow&&this.ph<=c.dosing.phHigh&&!f['AIT-301_BAD']&&!f['AIT-301_OOR'];
      this.rejectDivert=!qualityGood||overflowUpstream;
      const dosingEnable=!!cmd.P301_START&&this.intakeFlow>0.4&&!f['AIT-301_BAD'];
      const dose= dosingEnable ? (cmd.D301_RATE_REF||0)/100 : 0;
      const phTarget=6.45+2.15*dose+0.04*(this.rawTurbidity-1);
      if(this.intakeFlow>0.4)this.ph+=Math.min(1,dt/c.dosing.tau)*(phTarget-this.ph);
      if(f['PH_DISTURBANCE'])this.ph+=0.002*Math.sin(this.scanCount/7);
      const acceptedToClear=this.rejectDivert?0:filterFlow;
      const rejectFlow=this.rejectDivert?filterFlow:0;
      this.filteredFlow=filterFlow;
      const distributionCmds=['P401A_START','P401B_START','P401C_START'];
      const qDist= this.pumps.P401A.step((cmd.P401A_START&&this.clearTank.level>8)?(cmd.VFD401A||100):0,dt,1)+this.pumps.P401B.step((cmd.P401B_START&&this.clearTank.level>8)?(cmd.VFD401B||100):0,dt,1)+this.pumps.P401C.step((cmd.P401C_START&&this.clearTank.level>8)?(cmd.VFD401C||100):0,dt,1);
      this.distributionFlow=qDist;
      if(f['TK-401_HIGHHIGH'])this.clearTank.reset(this.clearTank.capacity*.96);
      if(f['TK-401_LOWLOW'])this.clearTank.reset(this.clearTank.capacity*.05);
      if(f['P101A_NO_RUN'])this.pumps.P101A.runFeedback=false;
      if(f['P101B_NO_RUN'])this.pumps.P101B.runFeedback=false;
      const targetP=Math.min(6,0.55+qDist*0.29);
      this.headerPressure+=Math.min(1,dt/8)*(targetP-this.headerPressure);
      if(f['PIT-401_HIGH'])this.headerPressure=6.2;
      if(f['PIT-401_STALE']){
      }
      const pkg=this.stepPackaging(dt,cmd,f);
      const packageFlow=(pkg.fillOpen?c.packaging.bottleLitres/1000*(3600/Math.max(1,c.packaging.fillSeconds)):0);
      const clearOut=qDist+packageFlow;
      this.rawTank.step(Math.max(0,rawAvailable?4.2:0),rawOut,dt);
      this.clearTank.step(acceptedToClear,clearOut,dt);
      this.rejectTank.step(rejectFlow,0.015,dt);
      this.totalWaterIn+=Math.max(0,rawAvailable?4.2:0)*dt/3600;
      this.totalWaterOut+=clearOut*dt/3600;
      const filterAFlow=serviceA?Math.min(filterFlow,c.filters.capacityEach):0;
      const filterBFlow=serviceB?Math.min(Math.max(0,filterFlow-filterAFlow),c.filters.capacityEach):0;
      this.publish(cmd,f,pkg,filterAFlow,filterBFlow);
      this.lastStep={
        rawLevel:this.rawTank.level,clearLevel:this.clearTank.level,rawFlow:this.intakeFlow,filteredFlow:this.filteredFlow,distFlow:this.distributionFlow,pressure:this.headerPressure,ph:this.ph
      }
      ;
      return this.lastStep;
    }
    stepPackaging(dt,cmd,f){
      const s=this.packaging;
      s.enabled=!!cmd.PK501_ENABLE&&!f['GS501_OPEN'];
      s.timer+=dt;
      let fillOpen=false;
      if(f['CV501_JAM'])s.jam=true;
      if(!s.enabled){
        s.state='WAIT_BOTTLE';
        s.conveyor=false;
        s.capper=false;
        s.rejectActuator=false;
        s.timer=0;
        return {
          fillOpen:false
        }
        ;
      }
      if(f['GS501_OPEN']||f['CV501_JAM']){
        s.state='FAULT';
        s.conveyor=false;
        s.capper=false;
        s.rejectActuator=false;
        return {
          fillOpen:false
        }
        ;
      }
      switch(s.state){
        case'WAIT_BOTTLE':if(!f['BOTTLE_ABSENT']){
          s.bottlePresent=true;
          s.bottleId++;
          s.fillVolume=0;
          s.underfill=!!f['UNDERFILL'];
          s.qualityPass=true;
          s.state='INDEX';
          s.timer=0;
        }
        else{
          s.bottlePresent=false;
          s.conveyor=false;
        }
        break;
        case'INDEX':s.conveyor=true;
        if(s.timer>=this.config.plant.packaging.indexSeconds){
          s.conveyor=false;
          s.state='FILL';
          s.timer=0;
        }
        break;
        case'FILL':fillOpen=true;
        if(s.underfill){
          s.fillVolume+=0.15*dt;
        }
        else{
          s.fillVolume+=dt/this.config.plant.packaging.fillSeconds*this.config.plant.packaging.bottleLitres;
        }
        if(s.timer>=this.config.plant.packaging.fillSeconds){
          s.state='CHECK_FILL';
          s.timer=0;
        }
        break;
        case'CHECK_FILL':s.qualityPass=s.fillVolume>=this.config.plant.packaging.bottleLitres*this.config.plant.packaging.fillTolerance[0]&&s.fillVolume<=this.config.plant.packaging.bottleLitres*this.config.plant.packaging.fillTolerance[1];
        s.state='CAP';
        s.timer=0;
        break;
        case'CAP':s.capper=true;
        if(s.timer>=this.config.plant.packaging.capSeconds){
          s.capper=false;
          s.state='INSPECT';
          s.timer=0;
        }
        break;
        case'INSPECT':if(!s.qualityPass||f['CAP_FAULT']){
          s.state='REJECT';
          s.timer=0;
        }
        else{
          s.state='ACCEPT';
          s.timer=0;
        }
        break;
        case'REJECT':s.rejectActuator=true;
        if(s.timer>=0.35){
          s.rejectActuator=false;
          s.rejected++;
          s.bottlePresent=false;
          s.state='WAIT_BOTTLE';
          s.timer=0;
        }
        break;
        case'ACCEPT':s.accepted++;
        s.bottlePresent=false;
        s.state='WAIT_BOTTLE';
        s.timer=0;
        break;
        case'FAULT':break;
        default:s.state='WAIT_BOTTLE';
      }
      return {
        fillOpen
      }
      ;
    }
    publish(cmd,f,pkg,fa,fb){
      const set=(id,v,q='GOOD')=>this.tags.update(id,v,{
        quality:q,source:'PROCESS'
      }
      );
      set('LIT-101',this.rawTank.level,f['LIT-101_BAD']?'BAD_SENSOR':'GOOD');
      set('FIT-101',this.intakeFlow,f['FIT-101_STALE']?'STALE':'GOOD');
      set('PIT-102',this.pumps.P101A.dischargePressure+this.pumps.P101B.dischargePressure,'GOOD');
      set('DPIT-201A',this.filters.A.dp,f['DPIT-201A_BAD']?'BAD_SENSOR':'GOOD');
      set('DPIT-201B',this.filters.B.dp,'GOOD');
      set('AIT-301',this.ph,f['AIT-301_BAD']?'BAD_SENSOR':(f['AIT-301_OOR']?'OUT_OF_RANGE':'GOOD'));
      set('LIT-401',this.clearTank.level,'GOOD');
      set('FIT-401',this.distributionFlow,'GOOD');
      set('PIT-401',this.headerPressure,f['PIT-401_STALE']?'STALE':'GOOD');
      set('AIT-401',this.conductivity,'GOOD');
      set('IIT-101A',this.pumps.P101A.current,'GOOD');
      set('IIT-401A',this.pumps.P401A.current,'GOOD');
      set('ZSH-101',this.rawTank.level>=95,'GOOD');
      set('ZSL-101',this.rawTank.level<=10,'GOOD');
      ['P101A','P101B','P401A','P401B','P401C'].forEach(k=>{
        const p=this.pumps[k];set(k+'_RUN_FB',p.runFeedback);set(k+'_FLT_FB',p.fault);
      }
      );
      set('PE501_BOTTLE',pkg.bottlePresent);
      set('PE502_FILL_POS',pkg.state==='FILL');
      set('PE503_CAP_POS',pkg.state==='CAP');
      set('GS501_GUARD',!f['GS501_OPEN']);
      set('ES001_LOOP',!f['ESTOP']);
      [['VFD-101A_SPD_REF',cmd.VFD101A||0],['VFD-101B_SPD_REF',cmd.VFD101B||0],['VFD-401A_SPD_REF',cmd.VFD401A||0],['VFD-401B_SPD_REF',cmd.VFD401B||0],['VFD-401C_SPD_REF',cmd.VFD401C||0],['FCV-201_REF',cmd.FCV201_REF||0],['D301_RATE_REF',cmd.D301_RATE_REF||0],['P101A_START',!!cmd.P101A_START],['P101B_START',!!cmd.P101B_START],['P401A_START',!!cmd.P401A_START],['P401B_START',!!cmd.P401B_START],['P401C_START',!!cmd.P401C_START],['P301_START',!!cmd.P301_START],['CV501_RUN',pkg.conveyor],['FILL501_OPEN',pkg.fillOpen],['CAP501_RUN',pkg.capper],['REJ501_EXT',pkg.rejectActuator]].forEach(([id,v])=>set(id,v));
    }
    reset(){
      Object.values(this.pumps).forEach(p=>{
        p.reset();p.speed=0;
      }
      );
      Object.values(this.filters).forEach(f=>f.reset());
      this.rawTank.reset(11);
      this.clearTank.reset(8.4);
      this.rejectTank.reset(.05);
      this.headerPressure=.6;
      this.ph=this.config.plant.dosing.phSetpoint;
      this.packaging= {
        state:'WAIT_BOTTLE',timer:0,bottlePresent:false,bottleId:0,fillVolume:0,accepted:0,rejected:0,enabled:false,conveyor:false,capper:false,rejectActuator:false,jam:false,underfill:false,qualityPass:true
      }
      ;
    }
  }
  A.ProcessEngine=ProcessEngine;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
