(function (A) {
  'use strict';
  A.Utils=A.Utils||{
  }
  ;
  A.Utils.download=function(name,content,type='text/plain;charset=utf-8'){
    const blob=new Blob([content],{
      type
    }
    );
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  ;
  A.Utils.escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    A.Utils.clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  })(window.AquaCore=window.AquaCore||{});
