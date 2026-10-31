(function (A) {
  'use strict';
  class InstrumentationLayer {
    constructor(tags){
      this.tags=tags;
      this.channels=new Map();
      this.faults={
      }
      ;
      this.sampleSequence=0;
      A.TagDefinitions.forEach(def=>{
        const id=def[0],type=def[2];if(type==='AI')this.channels.set(id,{
          range:def[4],lastValue:null,lastChange:0,quality:'GOOD',stuck:false
        }
        );
      }
      );
    }
    setFaults(faults){
      this.faults=faults||{
      }
      ;
      this.channels.forEach((ch,id)=>{
        ch.stuck=!!this.faults[id+'_STUCK'];
      }
      );
    }
    evaluate(nowSeconds){
      this.sampleSequence++;
      for(const [id,ch] of this.channels){
        const t=this.tags.get(id);
        if(!t)continue;
        let quality='GOOD';
        if(this.faults[id+'_BAD'])quality='BAD_SENSOR';
        else if(this.faults[id+'_OOR'])quality='OUT_OF_RANGE';
        else if(this.faults[id+'_STALE'])quality='STALE';
        else if(this.faults[id+'_UNCERTAIN'])quality='UNCERTAIN';
        const value=t.value;
        if(ch.stuck&&ch.lastValue!==null)this.tags.update(id,ch.lastValue,{
          quality,source:'INSTRUMENT'
        }
        );
        else {
          ch.lastValue=value;
          this.tags.update(id,value,{
            quality,source:'INSTRUMENT'
          }
          );
        }
        ch.quality=quality;
      }
    }
    qualityGood(id){
      const t=this.tags.get(id);
      return !!t&&t.quality==='GOOD';
    }
    getSignal(id){
      const t=this.tags.get(id);
      return t?{
        value:t.value,unit:t.unit,quality:t.quality,timestamp:t.timestamp
      }
      :null;
    }
    rawToEU(raw,euMin,euMax,rawMin=4,rawMax=20){
      return euMin+(Math.max(rawMin,Math.min(rawMax,raw))-rawMin)*(euMax-euMin)/(rawMax-rawMin);
    }
    euToRaw(eu,euMin,euMax,rawMin=4,rawMax=20){
      return rawMin+(Math.max(euMin,Math.min(euMax,eu))-euMin)*(rawMax-rawMin)/(euMax-euMin);
    }
  }
  A.InstrumentationLayer=InstrumentationLayer;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
