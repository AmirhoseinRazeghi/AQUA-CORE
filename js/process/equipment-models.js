(function (A) {
  'use strict';
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  class TankModel {
    constructor(id,capacity,initial){
      this.id=id;
      this.capacity=capacity;
      this.volume=clamp(initial,0,capacity);
      this.overflow=false;
      this.empty=false;
      this.lastNetFlow=0;
    }
    get level(){
      return 100*this.volume/this.capacity;
    }
    step(qIn,qOut,dt){
      const delta=(qIn-qOut)*dt/3600;
      const raw=this.volume+delta;
      this.overflow=raw>this.capacity;
      this.empty=raw<0;
      this.volume=clamp(raw,0,this.capacity);
      this.lastNetFlow=qIn-qOut;
      return {
        volume:this.volume,level:this.level,overflow:this.overflow,empty:this.empty
      }
      ;
    }
    reset(volume){
      this.volume=clamp(volume,0,this.capacity);
      this.overflow=false;
      this.empty=false;
    }
  }
  class PumpModel {
    constructor(id,{
      nominalFlow=8,rampUp=32,rampDown=55
    }
    ={
    }
    ){
      this.id=id;
      this.nominalFlow=nominalFlow;
      this.rampUp=rampUp;
      this.rampDown=rampDown;
      this.speed=0;
      this.command=false;
      this.fault=false;
      this.available=true;
      this.state='STOPPED';
      this.runtimeHours=0;
      this.startCount=0;
      this.current=0;
      this.dischargePressure=0;
      this.runFeedback=false;
      this.startElapsed=0;
    }
    step(command,dt,hydraulicFactor=1){
      this.command=Number.isFinite(command)?clamp(command,0,100):((command&&this.available&&!this.fault)?100:0);
      const desired=this.command&&this.available&&!this.fault?this.command:0;
      const rate=desired>this.speed?this.rampUp:this.rampDown;
      const prior=this.speed;
      this.speed+=clamp(desired-this.speed,-rate*dt,rate*dt);
      if(prior===0&&this.speed>0)this.startCount++;
      if(this.speed>0&&this.speed<98)this.state='STARTING';
      else if(this.speed>=98)this.state='RUNNING';
      else if(prior>0)this.state='STOPPING';
      else this.state=this.fault?'TRIPPED':(this.available?'STOPPED':'UNAVAILABLE');
      this.runFeedback=this.speed>15&&!this.fault;
      this.current=this.runFeedback?1.8+0.105*this.speed*(0.75+0.25*hydraulicFactor):0;
      this.dischargePressure=this.runFeedback?2.2+0.025*this.speed:0;
      if(this.runFeedback)this.runtimeHours+=dt/3600;
      return this.flow(hydraulicFactor);
    }
    flow(hydraulicFactor=1){
      return this.runFeedback?this.nominalFlow*(this.speed/100)*clamp(hydraulicFactor,0,1.25):0;
    }
    trip(){
      this.fault=true;
      this.command=false;
      this.state='TRIPPED';
    }
    reset(){
      if(this.fault)this.fault=false;
      this.state='STOPPED';
    }
  }
  class ValveModel {
    constructor(id,travelSeconds=2){
      this.id=id;
      this.command=0;
      this.position=0;
      this.travelSeconds=travelSeconds;
      this.fault=false;
      this.feedback='CLOSED';
    }
    step(command,dt,forceMismatch=false){
      this.command=clamp(command,0,100);
      if(!this.fault&&!forceMismatch){
        const delta=100*dt/Math.max(this.travelSeconds,0.1);
        this.position+=clamp(this.command-this.position,-delta,delta);
      }
      this.feedback=this.fault?'UNKNOWN':(this.position>98?'OPEN':this.position<2?'CLOSED':'MOVING');
      return this.position;
    }
  }
  class FilterModel {
    constructor(id,config){
      this.id=id;
      this.loading=0;
      this.state='SERVICE';
      this.dp=config.cleanDP;
      this.flow=0;
      this.serviceTime=0;
      this.backwashTime=0;
      this.fault=false;
      this.cleanDP=config.cleanDP;
      this.requestDP=config.backwashRequestDP;
      this.tripDP=config.tripDP;
      this.loadRate=config.loadRate;
      this.washRate=config.washRate;
    }
    step(flow,dt,washing=false){
      this.flow=flow;
      if(washing||this.state==='BACKWASH'||this.state==='RINSE'){
        this.loading=Math.max(0,this.loading-this.washRate*dt);
        this.backwashTime+=dt;
      }
      else if(this.state==='SERVICE'){
        this.loading=Math.min(3,this.loading+this.loadRate*flow*dt*1000);
        this.serviceTime+=dt;
      }
      this.dp=this.cleanDP+0.42*this.loading+0.012*flow;
      return this.dp;
    }
    get needsWash(){
      return this.dp>=this.requestDP;
    }
    get tripped(){
      return this.dp>=this.tripDP||this.fault;
    }
    reset(){
      this.loading=0;
      this.state='SERVICE';
      this.fault=false;
    }
  }
  A.MathUtil={
    clamp,lerp:(a,b,t)=>a+(b-a)*t,rateLimit:(current,target,rate,dt)=>current+clamp(target-current,-rate*dt,rate*dt)
  }
  ;
  A.TankModel=TankModel;
  A.PumpModel=PumpModel;
  A.ValveModel=ValveModel;
  A.FilterModel=FilterModel;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
