(function (A) {
  'use strict';
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const HOLDING=[
  [40001,'Operating mode command','UINT16','R/W','0 OFF · 1 AUTO · 2 MANUAL',1], [40002,'Command word','UINT16','R/W','Bit0 Start · Bit1 Stop · Bit2 Reset · Bit3 Ack',0], [40003,'Command source (reserved)','UINT16','R/O','0 HMI · 1 Modbus · 2 Test harness',0],
  [40004,'PIC-401 setpoint','UINT16','R/W','0.01 bar/count',300], [40005,'LIC-101 setpoint','UINT16','R/W','0.1 %/count',550], [40006,'FIC-201 setpoint','UINT16','R/W','0.01 m³/h/count',800], [40007,'AIC-301 setpoint','UINT16','R/W','0.01 pH/count',720], [40008,'Backwash request','UINT16','R/W','0 none · 1 Filter A · 2 Filter B',0], [40009,'Packaging enable','UINT16','R/W','0 Disable · 1 Enable',0], [40010,'Speed limit','UINT16','R/W','0.1 %/count',1000], [40011,'HMI heartbeat','UINT16','R/W','Simulation sequence',0], [40012,'Fault injection control','UINT16','R/W','0 none · 1 test enable',0]
  ];
  const INPUT=[
  [30001,'PLC state','UINT16','enum'],[30002,'Scan counter low','UINT16','count'],[30003,'Last scan runtime','UINT16','ms'],[30004,'TK-101 level','UINT16','0.1 %'],[30005,'FIT-101 flow','UINT16','0.01 m³/h'],[30006,'PIT-102 pressure','UINT16','0.01 bar'],[30007,'DPIT-201A','UINT16','0.01 bar'],[30008,'DPIT-201B','UINT16','0.01 bar'],[30009,'AIT-301 pH','UINT16','0.01 pH'],[30010,'TK-401 level','UINT16','0.1 %'],[30011,'FIT-401 flow','UINT16','0.01 m³/h'],[30012,'PIT-401 pressure','UINT16','0.01 bar'],[30013,'AIT-401 conductivity','UINT16','µS/cm'],[30014,'Pump available mask','UINT16','bitmask'],[30015,'Active alarm count','UINT16','count'],[30016,'Unack alarm count','UINT16','count'],[30017,'Filter A state','UINT16','enum'],[30018,'Filter B state','UINT16','enum'],[30019,'Accepted package count','UINT16','low word'],[30020,'Rejected package count','UINT16','low word'],[30021,'Quality flags','UINT16','bitmask'],[30022,'E-STOP state','UINT16','enum'],[30023,'Communication health','UINT16','enum'],[30024,'Historian buffer percent','UINT16','0.1 %']
  ];
  const COILS=[[1,'System auto active'],[2,'System tripped'],[3,'P-101A run command'],[4,'P-101B run command'],[5,'P-401A run command'],[6,'P-401B run command'],[7,'P-401C run command'],[8,'Packaging running'],[9,'Start pulse'],[10,'Stop pulse'],[11,'Reset pulse'],[12,'Alarm acknowledge pulse']];
  const DISCRETE=[[10001,'TK-101 low-low'],[10002,'TK-101 high-high'],[10003,'P-101A fault'],[10004,'P-101B fault'],[10005,'P-401A fault'],[10006,'P-401B fault'],[10007,'P-401C fault'],[10008,'Packaging guard OK'],[10009,'E-STOP healthy'],[10010,'Bottle present']];
  class ModbusSimulator {
    constructor(tags,plc,alarms,process){
      this.tags=tags;
      this.plc=plc;
      this.alarms=alarms;
      this.process=process;
      this.holding=new Map(HOLDING.map(r=>[r[0],r[5]]));
      this.transactions=0;
      this.lastError=null;
      this.lastFrame=null;
      this.audit=[];
      this.connected=true;
    }
    readHolding(ref,count=1){
      if(A.faultLab&&A.faultLab.activeMap().MODBUS_INVALID)return this.exception(3,2,'Injected invalid-address fault');
      this.transactions++;
      if(!Number.isInteger(ref)||!Number.isInteger(count)||count<1||count>125||ref<40001||ref+count-1>40012)return this.exception(3,2,'Illegal data address/quantity');
      const values=[];
      for(let a=ref;a<ref+count;a++)values.push(this.holding.get(a));
      return {
        ok:true,functionCode:3,address:ref,count,values,transactionId:this.transactions,unitId:1
      }
      ;
    }
    readInput(ref,count=1){
      this.transactions++;
      if(!Number.isInteger(ref)||!Number.isInteger(count)||count<1||count>125||ref<30001||ref+count-1>30024)return this.exception(4,2,'Illegal data address/quantity');
      const values=[];
      for(let a=ref;a<ref+count;a++)values.push(this.inputValue(a));
      return {
        ok:true,functionCode:4,address:ref,count,values,transactionId:this.transactions,unitId:1
      }
      ;
    }
    inputValue(a){
      const v=id=>this.tags.value(id,0);
      const sum=this.alarms.summary();
      const p=this.plc;
      const map={
        30001:p.tripLatched?2:(p.mode==='AUTO'||p.mode==='MANUAL'?1:0),30002:p.scanCounter&0xffff,30003:Math.round(p.lastScanMs),30004:Math.round(v('LIT-101')*10),30005:Math.round(v('FIT-101')*100),30006:Math.round(v('PIT-102')*100),30007:Math.round(v('DPIT-201A')*100),30008:Math.round(v('DPIT-201B')*100),30009:Math.round(v('AIT-301')*100),30010:Math.round(v('LIT-401')*10),30011:Math.round(v('FIT-401')*100),30012:Math.round(v('PIT-401')*100),30013:Math.round(v('AIT-401')),30014:(this.process.pumps.P101A.available?1:0)|(this.process.pumps.P101B.available?2:0)|(this.process.pumps.P401A.available?4:0)|(this.process.pumps.P401B.available?8:0)|(this.process.pumps.P401C.available?16:0),30015:sum.active,30016:sum.unack,30017:this.filterEnum(this.process.filters.A.state),30018:this.filterEnum(this.process.filters.B.state),30019:this.process.packaging.accepted&0xffff,30020:this.process.packaging.rejected&0xffff,30021:(v('AIT-301')>0?1:0)|(v('AIT-401')>0?2:0)|(v('FIT-101')>=0?4:0),30022:this.plc.estop?1:(this.plc.estopResetRequired?2:0),30023:this.connected?0:1,30024:Math.min(1000,Math.round(this.tags.list().length/500*1000))
      }
      ;
      return clamp(Math.round(map[a]||0),0,65535);
    }
    filterEnum(s){
      return ({
        SERVICE:0,ISOLATED:1,PRECHECK:2,BACKWASH:3,RINSE:4,RETURN:5,FAULT:6
      }
      )[s]??0;
    }
    writeSingleRegister(ref,value,source='SIMULATOR'){
      if(A.faultLab&&A.faultLab.activeMap().MODBUS_WRITE_DENY){
        this.auditWrite(ref,value,'REJECTED:injected write deny');
        return this.exception(6,3,'Injected write-deny fault');
      }
      this.transactions++;
      if(!Number.isInteger(value)||value<0||value>65535)return this.exception(6,3,'Illegal data value');
      const row=HOLDING.find(r=>r[0]===ref);
      if(!row)return this.exception(6,2,'Illegal data address');
      if(row[3]!=='R/W')return this.rejectWrite(ref,'Register is read-only');
      const old=this.holding.get(ref);
      const result=this.applyHolding(ref,value,source);
      if(!result.ok)return this.rejectWrite(ref,result.reason);
      this.holding.set(ref,value);
      this.auditWrite(ref,value,source);
      return {
        ok:true,functionCode:6,address:ref,value,previous:old,transactionId:this.transactions,unitId:1
      }
      ;
    }
    writeMultipleRegisters(ref,values,source='SIMULATOR'){
      if(!Array.isArray(values)||values.length<1||values.length>123)return this.exception(16,3,'Invalid register count');
      const staged=[];
      for(let i=0;i<values.length;i++){
        const addr=ref+i,row=HOLDING.find(r=>r[0]===addr),val=values[i];
        if(!row||row[3]!=='R/W'||!Number.isInteger(val)||val<0||val>65535)return this.exception(16,!row?2:3,'Atomic write rejected; no registers changed');
        const validation=this.validateHolding(addr,val);
        if(!validation.ok)return this.exception(16,3,'Atomic write rejected: '+validation.reason);
        staged.push([addr,val]);
      }
      // All values are validated before any command is queued: failed batches have no side effects.
      staged.forEach(([addr,val])=>{
        this.applyHolding(addr,val,source);this.holding.set(addr,val);this.auditWrite(addr,val,source);
      }
      );
      return {
        ok:true,functionCode:16,address:ref,count:values.length,transactionId:++this.transactions,unitId:1
      }
      ;
    }
    validateHolding(ref,val){
      if(!Number.isInteger(val)||val<0||val>65535)return {
        ok:false,reason:'Illegal data value'
      }
      ;
      switch(ref){
        case 40001: if(val>2)return {
          ok:false,reason:'Invalid mode enum'
        }
        ;
        break;
        case 40004: if(val<50||val>550)return {
          ok:false,reason:'PIC-401 setpoint outside 0.50..5.50 bar'
        }
        ;
        break;
        case 40005: if(val<100||val>900)return {
          ok:false,reason:'LIC-101 setpoint outside 10..90%'
        }
        ;
        break;
        case 40006: if(val>1000)return {
          ok:false,reason:'FIC-201 setpoint outside 0..10.00 m3/h'
        }
        ;
        break;
        case 40007: if(val<680||val>760)return {
          ok:false,reason:'AIC-301 setpoint outside 6.80..7.60 pH'
        }
        ;
        break;
        case 40008: if(val>2)return {
          ok:false,reason:'Invalid filter selection'
        }
        ;
        break;
        case 40009: if(val>1)return {
          ok:false,reason:'Packaging enable must be 0 or 1'
        }
        ;
        break;
        case 40010: if(val>1000)return {
          ok:false,reason:'Speed limit exceeds 100.0%'
        }
        ;
        break;
      }
      return {
        ok:true
      }
      ;
    }
    applyHolding(ref,val,source){
      const valid=this.validateHolding(ref,val);
      if(!valid.ok)return valid;
      try{
        switch(ref){
          case 40001:this.plc.request('SET_MODE',{
            mode:['OFF','AUTO','MANUAL'][val]
          }
          ,'MODBUS');
          break;
          case 40002:if(val&1)this.plc.request('START_UNIT',{
          }
          ,'MODBUS');
          if(val&2)this.plc.request('STOP_UNIT',{
          }
          ,'MODBUS');
          if(val&4)this.plc.request('RESET_TRIP',{
          }
          ,'MODBUS');
          if(val&8)this.plc.request('ACK_ALARM',{
          }
          ,'MODBUS');
          break;
          case 40004:this.plc.request('SETPOINT',{
            loop:'PIC401',value:val/100,min:0.5,max:5.5
          }
          ,'MODBUS');
          break;
          case 40005:this.plc.request('SETPOINT',{
            loop:'LIC101',value:val/10,min:10,max:90
          }
          ,'MODBUS');
          break;
          case 40006:this.plc.request('SETPOINT',{
            loop:'FIC201',value:val/100,min:0,max:10
          }
          ,'MODBUS');
          break;
          case 40007:this.plc.request('SETPOINT',{
            loop:'AIC301',value:val/100,min:6.8,max:7.6
          }
          ,'MODBUS');
          break;
          case 40008:if(val===1)this.plc.request('BACKWASH',{
            filter:'A'
          }
          ,'MODBUS');
          else if(val===2)this.plc.request('BACKWASH',{
            filter:'B'
          }
          ,'MODBUS');
          break;
          case 40009:this.plc.request('PACKAGING_ENABLE',{
            enabled:val===1
          }
          ,'MODBUS');
          break;
          case 40010:this.plc.request('SET_SPEED_LIMIT',{
            value:val/10
          }
          ,'MODBUS');
          break;
          default:break;
        }
        return {
          ok:true
        }
        ;
      }
      catch(e){
        return {
          ok:false,reason:e.message
        }
        ;
      }
    }
    writeSingleCoil(ref,value){
      this.transactions++;
      if(!Number.isInteger(ref))return this.exception(5,2,'Coil address must be an integer');
      if(![9,10,11,12].includes(ref))return this.exception(5,2,'Coil is read-only or unmapped');
      if(![0,1].includes(value))return this.exception(5,3,'Illegal coil value');
      if(value){
        const command={
          9:'START_UNIT',10:'STOP_UNIT',11:'RESET_TRIP',12:'ACK_ALARM'
        }
        [ref];
        this.plc.request(command,{
        }
        ,'MODBUS');
      }
      return {
        ok:true,functionCode:5,address:ref,value,transactionId:this.transactions
      }
      ;
    }
    readCoils(ref,count=1){
      if(!Number.isInteger(ref)||!Number.isInteger(count)||count<1||count>2000||ref<1||ref+count-1>12)return this.exception(1,2,'Illegal coil address/quantity');
      const values=[];
      for(let a=ref;a<ref+count;a++)values.push(this.coilValue(a));
      return {
        ok:true,functionCode:1,address:ref,count,values,transactionId:++this.transactions
      }
      ;
    }
    coilValue(a){
      const o=this.plc.outputs;
      return ({
        1:this.plc.mode==='AUTO',2:this.plc.tripLatched,3:!!o.P101A_START,4:!!o.P101B_START,5:!!o.P401A_START,6:!!o.P401B_START,7:!!o.P401C_START,8:!!o.PK501_ENABLE,9:false,10:false,11:false,12:false
      }
      )[a]||false;
    }
    readDiscrete(ref,count=1){
      if(!Number.isInteger(ref)||!Number.isInteger(count)||count<1||count>2000||ref<10001||ref+count-1>10010)return this.exception(2,2,'Illegal discrete input address/quantity');
      const values=[];
      for(let a=ref;a<ref+count;a++)values.push(this.discreteValue(a));
      return {
        ok:true,functionCode:2,address:ref,count,values,transactionId:++this.transactions
      }
      ;
    }
    discreteValue(a){
      const v=id=>!!this.tags.value(id,false);
      return ({
        10001:v('ZSL-101'),10002:v('ZSH-101'),10003:v('P101A_FLT_FB'),10004:v('P101B_FLT_FB'),10005:v('P401A_FLT_FB'),10006:v('P401B_FLT_FB'),10007:v('P401C_FLT_FB'),10008:v('GS501_GUARD'),10009:v('ES001_LOOP'),10010:v('PE501_BOTTLE')
      }
      )[a]||false;
    }
    exception(fc,code,message){
      this.lastError={
        functionCode:fc,exceptionCode:code,message
      }
      ;
      return {
        ok:false,exception:true,functionCode:fc|0x80,exceptionCode:code,message,transactionId:++this.transactions
      }
      ;
    }
    rejectWrite(ref,reason){
      this.auditWrite(ref,null,'REJECTED:'+reason);
      return this.exception(6,3,reason);
    }
    auditWrite(ref,value,source){
      this.audit.unshift({
        time:new Date().toISOString(),address:ref,value,source
      }
      );
      if(this.audit.length>500)this.audit.length=500;
      A.bus.emit('modbus.write',{
        ref,value,source
      }
      );
    }
    encodeMBAP(transactionId,unitId,pduBytes){
      const length=1+pduBytes.length;
      return [transactionId>>8,transactionId&255,0,0,length>>8,length&255,unitId,...pduBytes];
    }
    decodeMBAP(bytes){
      if(!Array.isArray(bytes)||bytes.length<8)throw new Error('MBAP frame too short');
      const length=(bytes[4]<<8)|bytes[5];
      if(bytes.length!==6+length)throw new Error('MBAP length mismatch');
      return {
        transactionId:(bytes[0]<<8)|bytes[1],protocolId:(bytes[2]<<8)|bytes[3],length,unitId:bytes[6],pdu:bytes.slice(7)
      }
      ;
    }
    table(){
      return {
        holding:HOLDING,input:INPUT,coils:COILS,discrete:DISCRETE
      }
      ;
    }
  }
  A.ModbusSimulator=ModbusSimulator;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
