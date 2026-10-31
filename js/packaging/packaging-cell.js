(function (A) {
  'use strict';
  class PackagingCellController {
    constructor(plc,process){
      this.plc=plc;
      this.process=process;
    }
    enable(enabled){
      this.plc.request('PACKAGING_ENABLE',{
        enabled:!!enabled
      }
      ,'HMI');
    }
    reset(){
      if(this.process.packaging.state==='FAULT'){
        this.process.packaging.state='WAIT_BOTTLE';
        this.process.packaging.timer=0;
        this.process.packaging.jam=false;
      }
      A.bus.emit('packaging.reset',{
      }
      );
    }
    snapshot(){
      const p=this.process.packaging;
      return {
        state:p.state,bottleId:p.bottleId,volume:p.fillVolume,accepted:p.accepted,rejected:p.rejected,enabled:p.enabled,conveyor:p.conveyor,capper:p.capper,reject:p.rejectActuator
      }
      ;
    }
  }
  A.PackagingCellController=PackagingCellController;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
