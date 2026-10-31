(function (A) {
  'use strict';
  class CommandArbiter {
    constructor() {
      this.queue=[];
      this.audit=[];
      this.maxAudit=1000;
      this.sequence=0;
      this.mode='AUTO';
      this.estop=false;
      this.tripped=false;
    }
    setSafety({
      mode,estop,tripped
    }
    ) {
      if(mode) this.mode=mode;
      if(estop!==undefined)this.estop=!!estop;
      if(tripped!==undefined)this.tripped=!!tripped;
    }
    submit(command, source='HMI', metadata={
    }
    ) {
      const item={
        id:++this.sequence, command, source, metadata, submittedAt:Date.now(), status:'QUEUED'
      }
      ;
      this.queue.push(item);
      A.bus.emit('command.submitted',item);
      return item.id;
    }
    validate(item) {
      const c=item.command;
      if (!c || typeof c.type!=='string') return {
        ok:false,reason:'Malformed command'
      }
      ;
      if (this.estop && !['RESET_ESTOP','ACK_ALARM','CLEAR_FAULT'].includes(c.type)) return {
        ok:false,reason:'E-STOP active: command inhibited'
      }
      ;
      if (this.tripped && !['RESET_TRIP','RESET_ESTOP','ACK_ALARM','CLEAR_FAULT'].includes(c.type)) return {
        ok:false,reason:'System trip latched'
      }
      ;
      if (this.mode==='OFF' && !['START_UNIT','SET_MODE','ACK_ALARM','RESET_TRIP','RESET_ESTOP'].includes(c.type)) return {
        ok:false,reason:'Unit is OFF'
      }
      ;
      if (c.type==='SET_MODE' && !['OFF','AUTO','MANUAL'].includes(c.mode)) return {
        ok:false,reason:'Unsupported operating mode'
      }
      ;
      if (c.type==='SETPOINT' && (!Number.isFinite(c.value) || c.value<c.min || c.value>c.max)) return {
        ok:false,reason:'Setpoint outside configured bounds'
      }
      ;
      return {
        ok:true
      }
      ;
    }
    drain(handler) {
      const batch=this.queue.splice(0);
      const results=[];
      batch.forEach(item=>{
        const v=this.validate(item); if(!v.ok){
          item.status='REJECTED';item.reason=v.reason;
        }
        else {
          try{
            const result=handler(item.command,item);item.status='ACCEPTED';item.result=result;
          }
          catch(e){
            item.status='ERROR';item.reason=e.message;
          }
        }
        this.record(item);results.push(item); A.bus.emit('command.completed',item);
      }
      );
      return results;
    }
    record(item) {
      this.audit.unshift({
        id:item.id,source:item.source,type:item.command.type,status:item.status,reason:item.reason||'',at:new Date().toISOString()
      }
      );
      if(this.audit.length>this.maxAudit)this.audit.length=this.maxAudit;
    }
  }
  A.CommandArbiter=CommandArbiter;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
