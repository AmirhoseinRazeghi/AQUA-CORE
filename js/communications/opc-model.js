(function (A) {
  'use strict';
  class OPCInformationModel {
    constructor(tags){
      this.tags=tags;
      this.namespaceUri='urn:aqua-core:plant:simulation';
      this.nodes=new Map();
      this.subscribers=new Map();
      this.seed();
      A.bus.on('tag.changed',e=>this.notify(e.payload.id));
      A.bus.on('tag.quality',e=>this.notify(e.payload.id));
    }
    seed(){
      const add=(nodeId,browseName,nodeClass,parent,description)=>this.nodes.set(nodeId,{
        nodeId,browseName,nodeClass,parent,description,children:[]
      }
      );
      add('ns=2;s=AquaCorePlant','AquaCorePlant','Object',null,'AQUA-CORE simulated plant root');
      ['Intake','Filtration','Dosing','Distribution','Packaging','Equipment','Measurements','ControlLoops','Alarms','Diagnostics'].forEach(n=>add('ns=2;s='+n,n,'Object','ns=2;s=AquaCorePlant',n+' namespace'));
      this.nodes.get('ns=2;s=AquaCorePlant').children=[...this.nodes.keys()].filter(k=>k!=='ns=2;s=AquaCorePlant');
      this.tags.list().forEach(t=>{
        const id='ns=2;s='+t.id+'.Value';add(id,t.id+'.Value','Variable','ns=2;s=Measurements',t.description);this.nodes.get('ns=2;s=Measurements').children.push(id);
      }
      );
    }
    read(nodeId){
      const n=this.nodes.get(nodeId);
      if(!n)throw new Error('BadNodeIdUnknown');
      if(n.nodeClass==='Variable'){
        const tagId=n.browseName.split('.')[0],t=this.tags.get(tagId);
        return {
          nodeId,value:t.value,dataType:typeof t.value==='boolean'?'Boolean':'Double',engineeringUnits:t.unit,sourceTimestamp:new Date(t.timestamp).toISOString(),statusCode:t.quality,accessLevel:t.readOnly?'CurrentRead':'CurrentRead|CurrentWrite',description:t.description
        }
        ;
      }
      return {
        nodeId,browseName:n.browseName,nodeClass:n.nodeClass,children:n.children.slice(),description:n.description
      }
      ;
    }
    browse(nodeId){
      const n=this.nodes.get(nodeId);
      if(!n)throw new Error('BadNodeIdUnknown');
      return n.children.map(id=>this.read(id));
    }
    subscribe(nodeId,handler){
      if(!this.nodes.has(nodeId))throw new Error('BadNodeIdUnknown');
      if(!this.subscribers.has(nodeId))this.subscribers.set(nodeId,new Set());
      this.subscribers.get(nodeId).add(handler);
      return ()=>this.subscribers.get(nodeId)?.delete(handler);
    }
    notify(tagId){
      const nodeId='ns=2;s='+tagId+'.Value';
      const set=this.subscribers.get(nodeId);
      if(set){
        const v=this.read(nodeId);
        set.forEach(fn=>fn(v));
      }
    }
    namespace(){
      return {
        namespaceUri:this.namespaceUri,root:this.read('ns=2;s=AquaCorePlant'),nodeCount:this.nodes.size,serverImplemented:false,description:'OPC UA-shaped in-memory information model. No OPC UA transport, endpoint, certificate or discovery service is implemented.'
      }
      ;
    }
  }
  A.OPCInformationModel=OPCInformationModel;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
