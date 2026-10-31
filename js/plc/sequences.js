(function (A) {
  'use strict';
  class SequenceManager {
    constructor(config,process){
      this.config=config;
      this.process=process;
      this.backwash={
        filter:null,state:'IDLE',step:0,timer:0,elapsed:0,reason:'',requestedBy:'AUTO'
      }
      ;
      this.distribution={
        lead:'P401A',lag:'P401B',state:'IDLE',changeoverTimer:0
      }
      ;
      this.packagingEnabled=false;
      this.events=[];
    }
    requestBackwash(filter,source='HMI'){
      if(!['A','B'].includes(filter))return {
        ok:false,reason:'Unknown filter'
      }
      ;
      if(this.backwash.state!=='IDLE'&&this.backwash.state!=='COMPLETE')return {
        ok:false,reason:'Backwash sequence already active'
      }
      ;
      const other=filter==='A'?'B':'A';
      if(this.process.filters[other].state!=='SERVICE')return {
        ok:false,reason:'Alternate filter is not available in service'
      }
      ;
      this.backwash={
        filter,state:'PRECHECK',step:10,timer:0,elapsed:0,reason:'',requestedBy:source
      }
      ;
      A.bus.emit('sequence.backwash',{
        state:'PRECHECK',filter
      }
      );
      return {
        ok:true
      }
      ;
    }
    step(dt,mode,faults){
      const b=this.backwash;
      if(b.state==='PRECHECK'){
        const other=b.filter==='A'?'B':'A';
        if(this.process.filters[other].state!=='SERVICE'){
          b.state='FAULT';
          b.reason='No alternate filter in service';
        }
        else{
          this.process.filters[b.filter].state='ISOLATED';
          b.state='ISOLATE';
          b.step=20;
          b.timer=0;
        }
      }
      else if(b.state==='ISOLATE'){
        b.timer+=dt;
        if(faults['XV-201'+b.filter+'_MISMATCH']){
          b.state='FAULT';
          b.reason='Valve feedback mismatch';
        }
        else if(b.timer>=2){
          b.state='BACKWASH';
          b.step=40;
          b.timer=0;
        }
      }
      else if(b.state==='BACKWASH'){
        b.timer+=dt;
        this.process.filters[b.filter].step(0,dt,true);
        if(b.timer>=90){
          b.state='RINSE';
          b.step=50;
          b.timer=0;
        }
      }
      else if(b.state==='RINSE'){
        b.timer+=dt;
        this.process.filters[b.filter].step(0,dt,true);
        if(b.timer>=60){
          b.state='RETURN';
          b.step=60;
          b.timer=0;
        }
      }
      else if(b.state==='RETURN'){
        b.timer+=dt;
        if(b.timer>=2){
          this.process.filters[b.filter].state='SERVICE';
          b.state='VERIFY';
          b.step=70;
          b.timer=0;
        }
      }
      else if(b.state==='VERIFY'){
        b.timer+=dt;
        if(this.process.filters[b.filter].dp<this.config.plant.filters.backwashRequestDP){
          b.state='COMPLETE';
          b.step=80;
        }
        else if(b.timer>5){
          b.state='FAULT';
          b.reason='DP did not recover below request threshold';
        }
      }
      if(b.state==='FAULT'){
        this.process.filters[b.filter].state='FAULT';
      }
      const p=this.process.pumps;
      const lead=p[this.distribution.lead],lag=p[this.distribution.lag];
      if(lead&&lead.fault&&lag&&!lag.fault&&this.distribution.state!=='CHANGEOVER'){
        this.distribution.state='CHANGEOVER';
        this.distribution.changeoverTimer=0;
        this.distribution.lead=this.distribution.lag;
        this.distribution.lag='P401C';
        A.bus.emit('sequence.changeover',{
          lead:this.distribution.lead
        }
        );
      }
      if(this.distribution.state==='CHANGEOVER'){
        this.distribution.changeoverTimer+=dt;
        if(this.distribution.changeoverTimer>3)this.distribution.state='RUNNING';
      }
    }
    resetBackwash(){
      if(this.backwash.filter)this.process.filters[this.backwash.filter].state='SERVICE';
      this.backwash={
        filter:null,state:'IDLE',step:0,timer:0,elapsed:0,reason:'',requestedBy:'AUTO'
      }
      ;
    }
  }
  A.SequenceManager=SequenceManager;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
