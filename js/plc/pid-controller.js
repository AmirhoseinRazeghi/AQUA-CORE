(function (A) {
  'use strict';
  const clamp=A.MathUtil.clamp;
  class PIDController {
    constructor(name,params){
      this.name=name;
      this.params=Object.assign({
        kp:1,ki:0,kd:0,min:0,max:100,bias:0,setpoint:0,reverse:false,derivativeFilter:0.15
      }
      ,params||{
      }
      );
      this.mode='AUTO';
      this.integral=0;
      this.previousPV=null;
      this.derivative=0;
      this.output=this.params.bias;
      this.manualOutput=this.output;
      this.lastError=0;
      this.saturated=false;
      this.enabled=true;
    }
    update(pv,sp,dt,quality='GOOD') {
      const p=this.params;
      if(!this.enabled||quality!=='GOOD'||!Number.isFinite(pv)){
        this.output=clamp(this.output,p.min,p.max);
        return this.output;
      }
      if(this.mode==='MANUAL'){
        this.output=clamp(this.manualOutput,p.min,p.max);
        this.track(pv,sp);
        return this.output;
      }
      const direction=p.reverse?-1:1;
      const error=(sp-pv)*direction;
      const proportional=p.kp*error;
      let dRaw=0;
      if(this.previousPV!==null&&dt>0)dRaw=-(pv-this.previousPV)/dt*direction;
      const alpha=p.derivativeFilter>0?dt/(p.derivativeFilter+dt):1;
      this.derivative+=alpha*(dRaw-this.derivative);
      const candidateIntegral=this.integral+p.ki*error*dt;
      const raw=p.bias+proportional+candidateIntegral+p.kd*this.derivative;
      const limited=clamp(raw,p.min,p.max);
      this.saturated=limited!==raw;
      const drivesOutward=(raw>p.max&&error>0)||(raw<p.min&&error<0);
      if(!drivesOutward)this.integral=candidateIntegral;
      this.output=clamp(p.bias+proportional+this.integral+p.kd*this.derivative,p.min,p.max);
      this.previousPV=pv;
      this.lastError=error;
      return this.output;
    }
    track(pv,sp){
      this.previousPV=pv;
      this.lastError=(sp-pv)*(this.params.reverse?-1:1);
    }
    setMode(mode,manualOutput){
      if(!['AUTO','MANUAL'].includes(mode))throw new Error('Invalid PID mode');
      if(mode==='AUTO'&&this.mode==='MANUAL'){
        const p=this.params;
        this.integral=clamp(this.output-p.bias-p.kp*this.lastError-p.kd*this.derivative,p.min,p.max);
      }
      if(mode==='MANUAL'){
        this.manualOutput=manualOutput===undefined?this.output:manualOutput;
        this.output=this.manualOutput;
      }
      this.mode=mode;
    }
    setTunings(kp,ki,kd){
      if([kp,ki,kd].some(v=>!Number.isFinite(v)||v<0||v>1000))throw new Error('PID tuning outside bounds');
      this.params.kp=kp;
      this.params.ki=ki;
      this.params.kd=kd;
    }
    reset(){
      this.integral=0;
      this.previousPV=null;
      this.derivative=0;
      this.output=this.params.bias;
      this.manualOutput=this.output;
      this.lastError=0;
      this.saturated=false;
    }
    snapshot(){
      return {
        name:this.name,mode:this.mode,pv:this.previousPV,sp:this.params.setpoint,output:this.output,kp:this.params.kp,ki:this.params.ki,kd:this.params.kd,saturated:this.saturated
      }
      ;
    }
  }
  A.PIDController=PIDController;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
