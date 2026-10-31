(function (A) {
  'use strict';
  class TON {
    constructor(){
      this.elapsed=0;
      this.Q=false;
      this.ET=0;
    }
    update(IN,PT,dt){
      if(IN){
        this.elapsed=Math.min(PT,this.elapsed+dt);
        this.Q=this.elapsed>=PT;
      }
      else{
        this.elapsed=0;
        this.Q=false;
      }
      this.ET=this.elapsed;
      return this;
    }
    reset(){
      this.elapsed=0;
      this.Q=false;
      this.ET=0;
    }
  }
  class TOF {
    constructor(){
      this.elapsed=0;
      this.Q=false;
      this.wasIn=false;
      this.ET=0;
    }
    update(IN,PT,dt){
      if(IN){
        this.Q=true;
        this.elapsed=0;
      }
      else if(this.wasIn||this.Q){
        this.elapsed+=dt;
        if(this.elapsed>=PT)this.Q=false;
      }
      this.wasIn=!!IN;
      this.ET=this.elapsed;
      return this;
    }
    reset(){
      this.elapsed=0;
      this.Q=false;
      this.wasIn=false;
    }
  }
  class TP {
    constructor(){
      this.elapsed=0;
      this.Q=false;
      this.prev=false;
    }
    update(IN,PT,dt){
      if(IN&&!this.prev){
        this.elapsed=0;
        this.Q=true;
      }
      if(this.Q){
        this.elapsed+=dt;
        if(this.elapsed>=PT)this.Q=false;
      }
      this.prev=!!IN;
      return this;
    }
    reset(){
      this.elapsed=0;
      this.Q=false;
      this.prev=false;
    }
  }
  class R_TRIG {
    constructor(){
      this.prev=false;
      this.Q=false;
    }
    update(CLK){
      this.Q=!!CLK&&!this.prev;
      this.prev=!!CLK;
      return this;
    }
  }
  class F_TRIG {
    constructor(){
      this.prev=false;
      this.Q=false;
    }
    update(CLK){
      this.Q=!CLK&&this.prev;
      this.prev=!!CLK;
      return this;
    }
  }
  class CTU {
    constructor(){
      this.CV=0;
      this.Q=false;
      this.edge=new R_TRIG();
    }
    update(CU,R,PV){
      if(R){
        this.CV=0;
        this.Q=false;
      }
      else if(this.edge.update(CU).Q){
        this.CV+=1;
        this.Q=this.CV>=PV;
      }
      return this;
    }
  }
  class CTD {
    constructor(){
      this.CV=0;
      this.Q=false;
      this.edge=new R_TRIG();
    }
    update(CD,LD,PV){
      if(LD){
        this.CV=PV;
      }
      else if(this.edge.update(CD).Q){
        this.CV=Math.max(0,this.CV-1);
      }
      this.Q=this.CV<=0;
      return this;
    }
  }
  class SR {
    constructor(){
      this.Q1=false;
    }
    update(SET,RESET){
      if(SET)this.Q1=true;
      else if(RESET)this.Q1=false;
      return this;
    }
  }
  class RS {
    constructor(){
      this.Q1=false;
    }
    update(SET,RESET){
      if(RESET)this.Q1=false;
      else if(SET)this.Q1=true;
      return this;
    }
  }
  class FunctionBlockRegistry {
    constructor(){
      this.instances=new Map();
    }
    instance(name,type){
      if(!this.instances.has(name)){
        const C={
          TON,TOF,TP,R_TRIG,F_TRIG,CTU,CTD,SR,RS
        }
        [type];
        if(!C)throw new Error('Unsupported FB '+type);
        this.instances.set(name,new C());
      }
      return this.instances.get(name);
    }
    reset(){
      this.instances.clear();
    }
  }
  A.FunctionBlocks={
    TON,TOF,TP,R_TRIG,F_TRIG,CTU,CTD,SR,RS,FunctionBlockRegistry
  }
  ;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
