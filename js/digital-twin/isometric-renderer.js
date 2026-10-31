(function (A) {
  'use strict';
  const clamp = A.MathUtil.clamp;
  const V = {
    sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
    add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
    scale:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
    dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
    cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
    norm:a=>{
      const l=Math.hypot(...a)||1;return a.map(x=>x/l);
    }
  }
  ;
  function identity(){
    return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  }
  function multiply(a,b){
    const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;
  }
  function translation(x,y,z){
    const m=identity();m[12]=x;m[13]=y;m[14]=z;return m;
  }
  function scaling(x,y,z){
    const m=identity();m[0]=x;m[5]=y;m[10]=z;return m;
  }
  function quatMatrix(q){
    const [x,y,z,w]=q,x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;return new Float32Array([1-(yy+zz),xy+wz,xz-wy,0,xy-wz,1-(xx+zz),yz+wx,0,xz+wy,yz-wx,1-(xx+yy),0,0,0,0,1]);
  }
  function rotationY(a){
    const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]);
  }
  function perspective(fov,aspect,near,far){
    const f=1/Math.tan(fov/2),nf=1/(near-far),o=new Float32Array(16);o[0]=f/aspect;o[5]=f;o[10]=(far+near)*nf;o[11]=-1;o[14]=2*far*near*nf;return o;
  }
  function lookAt(eye,center,up){
    const z=V.norm(V.sub(eye,center)),x=V.norm(V.cross(up,z)),y=V.cross(z,x),o=identity();o[0]=x[0];o[1]=y[0];o[2]=z[0];o[4]=x[1];o[5]=y[1];o[6]=z[1];o[8]=x[2];o[9]=y[2];o[10]=z[2];o[12]=-V.dot(x,eye);o[13]=-V.dot(y,eye);o[14]=-V.dot(z,eye);return o;
  }
  function alignY(direction){
    const up=[0,1,0],d=V.norm(direction),dot=clamp(V.dot(up,d),-1,1);let q;if(dot<-.9999)q=[1,0,0,0];else{
      const c=V.cross(up,d);q=[c[0],c[1],c[2],1+dot];const l=Math.hypot(...q)||1;q=q.map(x=>x/l);
    }
    return quatMatrix(q);
  }
  function cubeGeometry(){
    const faces=[
    [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],[0,0,1]],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1],[0,0,-1]],
    [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1],[0,1,0]], [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],[0,-1,0]],
    [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1],[1,0,0]], [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,0,0]]
    ];const out=[];faces.forEach(f=>{
      const ps=f.slice(0,4),n=f[4];[0,1,2,0,2,3].forEach(i=>out.push(...ps[i].map(v=>v*.5),...n));
    }
    );return new Float32Array(out);
  }
  function cylinderGeometry(segments=28){
    const out=[];for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2,pa=[Math.cos(a)*.5,-.5,Math.sin(a)*.5],pb=[Math.cos(b)*.5,-.5,Math.sin(b)*.5],ta=[pa[0],.5,pa[2]],tb=[pb[0],.5,pb[2]],na=[Math.cos(a),0,Math.sin(a)],nb=[Math.cos(b),0,Math.sin(b)];[[pa,na],[pb,nb],[tb,nb],[pa,na],[tb,nb],[ta,na]].forEach(([p,n])=>out.push(...p,...n));const bottom=[0,-.5,0],top=[0,.5,0];out.push(...bottom,0,-1,0,...pb,0,-1,0,...pa,0,-1,0);out.push(...top,0,1,0,...ta,0,1,0,...tb,0,1,0);
    }
    return new Float32Array(out);
  }
  class IsometricRenderer {
    constructor(canvas,process){
      this.canvas=canvas;this.process=process;this.yaw=.58;this.pitch=.66;this.zoom=1;this.pan=[0,0,0];this.drag=null;this.lastRender=0;this.dpr=1;this.width=0;this.height=0;this.gl=null;this.ctx=null;this.meshes={
      }
      ;this.webglAvailable=false;this.tryWebGL();if(!this.gl)this.ctx=canvas.getContext('2d');this.attachControls();this.resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>this.resize()):null;if(this.resizeObserver)this.resizeObserver.observe(canvas);this.resize();
    }
    tryWebGL(){
      try{
        const gl=this.canvas.getContext('webgl',{
          alpha:false,antialias:true,preserveDrawingBuffer:false
        }
        )||this.canvas.getContext('experimental-webgl');if(!gl)return;this.gl=gl;this.webglAvailable=true;this.initGL();
      }
      catch(e){
        this.gl=null;this.webglAvailable=false;
      }
    }
    initGL(){
      const gl=this.gl;const vs=`attribute vec3 aPosition; attribute vec3 aNormal; uniform mat4 uMvp; uniform mat4 uModel; varying vec3 vNormal; void main(){gl_Position=uMvp*vec4(aPosition,1.0);vNormal=mat3(uModel)*aNormal;}`;const fs=`precision mediump float; uniform vec3 uColor; uniform vec3 uLightDir; varying vec3 vNormal; void main(){float d=max(dot(normalize(vNormal),normalize(uLightDir)),0.0);float light=0.34+0.66*d;gl_FragColor=vec4(uColor*light,1.0);}`;const compile=(type,src)=>{
        const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)||'Shader compile failed');return sh;
      }
      ;const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Shader link failed');this.program=program;gl.useProgram(program);this.locations={
        position:gl.getAttribLocation(program,'aPosition'),normal:gl.getAttribLocation(program,'aNormal'),mvp:gl.getUniformLocation(program,'uMvp'),model:gl.getUniformLocation(program,'uModel'),color:gl.getUniformLocation(program,'uColor'),light:gl.getUniformLocation(program,'uLightDir')
      }
      ;this.meshes.cube=this.createMesh(cubeGeometry());this.meshes.cylinder=this.createMesh(cylinderGeometry());gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(.035,.075,.12,1);
    }
    createMesh(data){
      const gl=this.gl,b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return {
        buffer:b,count:data.length/6
      }
      ;
    }
    attachControls(){
      this.canvas.addEventListener('pointerdown',e=>{
        this.drag={
          x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch,pan:this.pan.slice()
        }
        ;this.canvas.setPointerCapture?.(e.pointerId);
      }
      );this.canvas.addEventListener('pointermove',e=>{
        if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(e.buttons===1){
          this.yaw=this.drag.yaw+dx*.006;this.pitch=clamp(this.drag.pitch+dy*.004,.2,1.35);
        }
      }
      );this.canvas.addEventListener('pointerup',()=>{
        this.drag=null;
      }
      );this.canvas.addEventListener('pointercancel',()=>{
        this.drag=null;
      }
      );this.canvas.addEventListener('wheel',e=>{
        e.preventDefault();this.zoom=clamp(this.zoom*(e.deltaY>0?.92:1.08),.55,1.8);this.draw(this.process,null,true);
      }
      ,{
        passive:false
      }
      );
    }
    resize(){
      const r=this.canvas.getBoundingClientRect();this.dpr=Math.min(2,window.devicePixelRatio||1);this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);if(this.gl)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);else if(this.ctx)this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.draw(this.process,null,true);
    }
    draw(process,plc,force=false){
      const now=performance.now();if(!force&&now-this.lastRender<60)return;this.lastRender=now;this.process=process||this.process;if(this.gl)this.drawGL(this.process);else this.drawFallback(this.process);
    }
    model(pos,scale,rot=0){
      return multiply(multiply(translation(pos[0],pos[1],pos[2]),rotationY(rot)),scaling(scale[0],scale[1],scale[2]));
    }
    drawGL(p){
      const gl=this.gl;if(!gl||!this.program)return;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniform3f(this.locations.light,-.45,.85,.4);const target=[0,1.3,0],dist=19/this.zoom,cp=Math.cos(this.pitch),eye=[target[0]+dist*cp*Math.sin(this.yaw),target[1]+dist*Math.sin(this.pitch),target[2]+dist*cp*Math.cos(this.yaw)];const view=lookAt(eye,target,[0,1,0]),proj=perspective(Math.PI/4,this.width/Math.max(1,this.height),.1,100),vp=multiply(proj,view);this._vp=vp;
      const box=(pos,scale,color,rot=0)=>this.drawMesh(this.meshes.cube,this.model(pos,scale,rot),color);
      const cyl=(pos,radius,height,color,rot=0)=>this.drawMesh(this.meshes.cylinder,this.model(pos,[radius*2,height,radius*2],rot),color);
      const pipe=(a,b,r,color)=>{
        const d=V.sub(b,a),len=Math.hypot(...d),mid=V.scale(V.add(a,b),.5),model=multiply(multiply(translation(...mid),alignY(d)),scaling(r*2,len,r*2));this.drawMesh(this.meshes.cylinder,model,color);
      }
      ;
      const tank=(x,z,r,h,level,labelColor='#52b6d5')=>{
        const base=.18,waterH=clamp(level/100,0,1)*(h-.12);cyl([x,base+h/2,z],r,h,[.25,.37,.48]);cyl([x,base+Math.max(.02,waterH)/2,z],r*.91,Math.max(.025,waterH),[.08,.43,.59]);cyl([x,base+h+.06,z],r*1.03,.12,[.42,.52,.61]);cyl([x,base+.05,z],r*1.04,.1,[.21,.3,.4]);
      }
      ;
      const pump=(x,z,label,pumpModel)=>{
        const running=!!pumpModel?.runFeedback,color=pumpModel?.fault?[.62,.18,.2]:running?[.12,.58,.43]:[.29,.39,.5];box([x,.45,z],[.82,.48,.58],color);cyl([x-.05,.86,z],.27,.62,[.39,.49,.58]);cyl([x+.55,.48,z],.18,.3,[.6,.68,.72]);box([x,.12,z],[1.35,.12,.88],[.16,.22,.29]);
      }
      ;
      // Foundation and process skids.
      box([0,-.18,0],[22,.25,14],[.12,.17,.23]);
      box([-2,.02,-2],[6,.1,3.3],[.17,.23,.29]);box([2,.02,-2],[3.3,.1,3.3],[.17,.23,.29]);box([7,.02,1.8],[4,.1,4.3],[.17,.23,.29]);box([0,.02,5],[8,.1,3.2],[.17,.23,.29]);
      // Tanks, filters and dosing vessels.
      tank(-7,-2,1.05,2.8,p.rawTank.level);tank(5,-2,1.15,2.9,p.clearTank.level);tank(5.2,3.3,.64,1.55,p.rejectTank.level||2);
      cyl([-2,1.45,-2],.68,2.55,p.filters.A.state==='BACKWASH'?[.65,.42,.12]:[.47,.55,.64]);cyl([0,1.45,-2],.68,2.55,p.filters.B.state==='BACKWASH'?[.65,.42,.12]:[.47,.55,.64]);
      box([2.5,.8,-2],[1.2,1.4,1.25],[.26,.36,.48]);cyl([2.5,1.75,-2],.32,.6,[.35,.57,.69]);
      // Intake/distribution pumps and packaging line.
      pump(-5,1.1,'P-101A',p.pumps.P101A);pump(-5,-.2,'P-101B',p.pumps.P101B);
      pump(7,1.1,'P-401A',p.pumps.P401A);pump(7,2.3,'P-401B',p.pumps.P401B);pump(7,3.5,'P-401C',p.pumps.P401C);
      box( [0,.2,5.15],[5.7,.18,1.05],[.12,.22,.28]);for(let i=0;i<9;i++)cyl([-2.5+i*.63,.42,5.15],.16,.86,[.43,.51,.59],Math.PI/2);
      const phase=(p.scanCount||0)*.07;for(let i=0;i<3;i++){
        const x=-1.6+((phase+i*1.9)%4.5);box([x,.76,5.15],[.48,.55,.48],i===1?[.75,.48,.18]:[.64,.47,.27]);
      }
      // Product and transfer pipework, drawn as 3D cylinders.
      const blue=[.08,.42,.64],green=[.1,.56,.42],amber=[.68,.42,.14];
      pipe([-5.8,.65,-2],[-3.8,.65,-2],.12,blue);pipe([-3.8,.65,-2],[-2.8,.65,-2],.12,blue);pipe([-1.3,.72,-2],[.65,.72,-2],.11,blue);pipe([3.1,.75,-2],[4.2,.75,-2],.12,blue);pipe([5,1.3,-2],[5,2.5,-2],.12,green);
      pipe([6.1,.55,-1.4],[7,.55,1.1],.11,green);pipe([7,.55,3.9],[4.4,.55,5.1],.1,green);pipe([4.4,.55,5.1],[2.8,.55,5.1],.1,green);
      pipe([-5.8,.35,1.1],[-5.8,.35,-2],.09,amber);pipe([.8,1.1,-2],[1.9,1.1,-2],.08,amber);
      // Small valve markers and instrument posts.
      box([-3.4,.84,-2],[.24,.45,.3],[.18,.62,.54],Math.PI/4);box([4,.84,-2],[.24,.45,.3],[.18,.62,.54],Math.PI/4);
      cyl([-7,3.15,-2],.16,.18,[.3,.78,.78]);cyl([5,3.25,-2],.16,.18,[.3,.78,.78]);
      // Labels rendered as a subtle native 2D overlay only in fallback; status is also present in SCADA panels.
    }
    drawMesh(mesh,model,color){
      const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.enableVertexAttribArray(this.locations.position);gl.vertexAttribPointer(this.locations.position,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(this.locations.normal);gl.vertexAttribPointer(this.locations.normal,3,gl.FLOAT,false,24,12);gl.uniformMatrix4fv(this.locations.model,false,model);gl.uniformMatrix4fv(this.locations.mvp,false,multiply(this._vp,model));gl.uniform3fv(this.locations.color,color);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    }
    drawFallback(p){
      const c=this.ctx;if(!c)return;c.clearRect(0,0,this.width,this.height);const g=c.createLinearGradient(0,0,0,this.height);g.addColorStop(0,'#132438');g.addColorStop(1,'#091320');c.fillStyle=g;c.fillRect(0,0,this.width,this.height);const sx=this.width/15,sy=this.height/10,baseY=this.height*.70;const X=x=>this.width*.5+x*sx*.82,Y=z=>baseY+z*sy*.38;const tank=(x,z,label,level)=>{
        const xx=X(x),yy=Y(z),r=sx*.72,h=sy*2.05;c.fillStyle='#334b60';c.fillRect(xx-r,yy-h,r*2,h);c.fillStyle='#0b7090';c.fillRect(xx-r+5,yy-h+((100-level)/100)*(h-6),r*2-10,(level/100)*(h-6));c.strokeStyle='#9cb3c5';c.strokeRect(xx-r,yy-h,r*2,h);c.fillStyle='#d9e7f2';c.font='11px monospace';c.textAlign='center';c.fillText(label,xx,yy+16);
      }
      ;const pump=(x,z,label,m)=>{
        const xx=X(x),yy=Y(z);c.fillStyle=m?.fault?'#9d343b':m?.runFeedback?'#198b6b':'#40596d';c.fillRect(xx-22,yy-26,44,32);c.fillStyle='#d9e7f2';c.font='10px monospace';c.textAlign='center';c.fillText(label,xx,yy+18);
      }
      ;c.strokeStyle='#267eaa';c.lineWidth=8;c.beginPath();c.moveTo(X(-6),Y(-2));c.lineTo(X(-2),Y(-2));c.lineTo(X(0),Y(-2));c.lineTo(X(5),Y(-2));c.stroke();tank(-7,-2,'TK-101',p.rawTank.level);tank(5,-2,'TK-401',p.clearTank.level);tank(5,3.3,'TK-301R',p.rejectTank.level||2);pump(-5,1,'P-101A',p.pumps.P101A);pump(-5,-.2,'P-101B',p.pumps.P101B);pump(7,1,'P-401A',p.pumps.P401A);pump(7,2.3,'P-401B',p.pumps.P401B);pump(7,3.5,'P-401C',p.pumps.P401C);c.fillStyle='#344a5b';c.fillRect(X(-2)-28,Y(-2)-70,56,70);c.fillRect(X(0)-28,Y(-2)-70,56,70);c.fillStyle='#dce9f4';c.font='11px monospace';c.fillText('F-201A',X(-2),Y(-2)+12);c.fillText('F-201B',X(0),Y(-2)+12);c.fillRect(X(-2.8),Y(5)-18,X(3.5)-X(-2.8),30);c.fillStyle='#c9974b';for(let i=0;i<3;i++)c.fillRect(X(-1.7+i*1.3),Y(5)-42,25,24);
    }
    resetCamera(){
      this.yaw=.58;this.pitch=.66;this.zoom=1;this.pan=[0,0,0];this.draw(this.process,null,true);
    }
    destroy(){
      if(this.resizeObserver)this.resizeObserver.disconnect();
    }
  }
  A.IsometricRenderer=IsometricRenderer;
}
)(window.AquaCore = window.AquaCore || {
}
);
;
