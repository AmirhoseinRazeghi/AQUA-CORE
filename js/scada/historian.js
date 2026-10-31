(function (A) {
  'use strict';
  class Historian {
    constructor(config,tags){
      this.config=config;
      this.tags=tags;
      this.series=new Map();
      this.max=config.historian.maxSamplesPerTag||10000;
      this.virtualAccumulator=0;
      this.events=[];
      this.storageAvailable=false;
      this.bytesEstimate=0;
    }
    sample(dt,virtualSeconds){
      if(A.faultLab&&A.faultLab.activeMap().HISTORIAN_FULL)return;
      this.virtualAccumulator+=dt;
      if(this.virtualAccumulator<this.config.historian.processSampleSeconds)return;
      this.virtualAccumulator=0;
      const ids=['LIT-101','FIT-101','PIT-102','DPIT-201A','DPIT-201B','AIT-301','LIT-401','FIT-401','PIT-401','AIT-401','VFD-101A_SPD_REF','VFD-401A_SPD_REF'];
      ids.forEach(id=>{
        const t=this.tags.get(id);if(!t)return;if(!this.series.has(id))this.series.set(id,[]);const a=this.series.get(id);a.push({
          t:virtualSeconds,v:Number(t.value)||0,q:t.quality
        }
        );if(a.length>this.max)a.splice(0,a.length-this.max);
      }
      );
    }
    get(tag,limit=300){
      return (this.series.get(tag)||[]).slice(-limit);
    }
    getAll(){
      const out={
      }
      ;
      this.series.forEach((v,k)=>out[k]=v.slice());
      return out;
    }
    csv(tags){
      const selected=tags&&tags.length?tags:[...this.series.keys()];
      const times=new Set();
      selected.forEach(id=>this.get(id).forEach(p=>times.add(p.t)));
      const sorted=[...times].sort((a,b)=>a-b);
      const map=new Map();
      selected.forEach(id=>{
        map.set(id,new Map(this.get(id,10000).map(p=>[p.t,p.v])));
      }
      );
      const rows=[['virtual_seconds',...selected].join(',')];
      sorted.forEach(t=>rows.push([t,...selected.map(id=>map.get(id).has(t)?map.get(id).get(t):'')].join(',')));
      return rows.join('\n');
    }
    exportCSV(tags){
      const csv=this.csv(tags);
      const blob=new Blob([csv],{
        type:'text/csv;charset=utf-8'
      }
      );
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download='aquacore-historian.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
    count(){
      let n=0;
      this.series.forEach(a=>n+=a.length);
      return n;
    }
    clear(){
      this.series.clear();
      this.virtualAccumulator=0;
    }
  }
  A.Historian=Historian;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
