'use strict';
let canvas = document.querySelector('#sphere');
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = {speed:.6, density:1, zoom:1, yaw:.4, pitch:-.18, paused:reduced.matches, dragging:false};
let width=0,height=0,dpr=1,last=0,raf=0,dirty=true;
// A continuous, seeded 3D field. Sampling it in object space makes every
// character patch follow the rotating sphere rather than shimmer randomly.
const perm = new Uint8Array(512);
const values = Array.from({length:256},(_,i)=>i);
let seed=72;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let i=255;i>0;i--){let j=Math.floor(rand()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
for(let i=0;i<512;i++)perm[i]=values[i&255];
const fade=t=>t*t*t*(t*(t*6-15)+10);
const mix=(a,b,t)=>a+(b-a)*t;
function grad(h,x,y,z){h&=15;let u=h<8?x:y,v=h<4?y:(h===12||h===14?x:z);return ((h&1)?-u:u)+((h&2)?-v:v);}
function noise(x,y,z){
 const X=Math.floor(x)&255,Y=Math.floor(y)&255,Z=Math.floor(z)&255;
 x-=Math.floor(x);y-=Math.floor(y);z-=Math.floor(z);
 const u=fade(x),v=fade(y),w=fade(z),A=perm[X]+Y,AA=perm[A]+Z,AB=perm[A+1]+Z,B=perm[X+1]+Y,BA=perm[B]+Z,BB=perm[B+1]+Z;
 return mix(mix(mix(grad(perm[AA],x,y,z),grad(perm[BA],x-1,y,z),u),mix(grad(perm[AB],x,y-1,z),grad(perm[BB],x-1,y-1,z),u),v),mix(mix(grad(perm[AA+1],x,y,z-1),grad(perm[BA+1],x-1,y,z-1),u),mix(grad(perm[AB+1],x,y-1,z-1),grad(perm[BB+1],x-1,y-1,z-1),u),v),w);
}
// Bake the continuous field once. Animation only samples this small volume;
// no per-character Perlin evaluation or text shaping happens in the frame loop.
const N=64, volume=new Uint8Array(N*N*N);
for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){
 volume[x+N*(y+N*z)]=Math.round((noise(x*.5,y*.5,z*.5)*.5+.5)*255);
}
const glyphs='.:+=xX08S#@', tw=32, th=48;
// Glyph identity is a pure function of the screen cell, NEVER sphere state.
function fixedGlyph(col,row){let n=(Math.imul(col,374761393)+Math.imul(row,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177)>>>0;return ((n^(n>>>16))>>>0)%11;}
const atlas=document.createElement('canvas');atlas.width=tw*glyphs.length;atlas.height=th;
const ac=atlas.getContext('2d');
ac.font='40px "SFMono-Regular",Consolas,"Liberation Mono",monospace';
ac.fillStyle='rgb(207,203,220)';ac.textAlign='center';ac.textBaseline='middle';
for(let i=0;i<glyphs.length;i++)ac.fillText(glyphs[i],(i+.5)*tw,th*.5);
function makeGPU(){
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
 if(!gl)return null;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram();
 gl.attachShader(program,shader(gl.VERTEX_SHADER,`#version 300 es
 precision highp float;
 uniform vec2 viewport, cell;
 uniform float radius;
 uniform vec4 rotation;
 uniform highp sampler3D field;
 out vec2 uv;
 flat out float glyph;
 flat out float opacity;
 float sampleField(vec3 p){return texture(field,(p*2.+.5)/64.).r*2.-1.;}
 void main(){
   int cols=int(ceil(viewport.x/cell.x));
   vec2 grid=vec2(gl_InstanceID%cols,gl_InstanceID/cols);
   // The grid origin is fixed to the viewport, independent of sphere rotation.
   vec2 center=(grid+.5)*cell;
   vec2 p=(center-viewport*vec2(.5,.465))/radius;
   float rr=dot(p,p);
   uint n=uint(grid.x)*374761393u+uint(grid.y)*668265263u;
   n=(n^(n>>13u))*1274126177u;
   glyph=float((n^(n>>16u))%11u);opacity=0.;
   if(rr<1.){
     float z=sqrt(1.-rr);
     float vy=p.y*rotation.w+z*rotation.z;
     float vz=-p.y*rotation.z+z*rotation.w;
     vec3 object=vec3(p.x*rotation.y-vz*rotation.x,vy,p.x*rotation.x+vz*rotation.y);
     float f=sampleField(object*2.6+vec3(8.3,2.4,4.1))*.75
            +sampleField(object*6.8+vec3(17.,3.,1.))*.25;
     float density=smoothstep(-.09,.38,f);
     // Rotation changes ONLY opacity. Glyph and position are immutable.
     opacity=smoothstep(-.12,.02,f)*(.20+.80*density)*pow(z,.44)*(.85-.14*p.x-.12*p.y);
   }
   uv=vec2(float(gl_VertexID%2),float(gl_VertexID/2));
   vec2 pos=center+(uv-.5)*cell;
   gl_Position=vec4(pos/viewport*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
 }`));
 gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`#version 300 es
 precision mediump float;
 uniform sampler2D atlas;
 in vec2 uv;
 flat in float glyph;
 flat in float opacity;
 out vec4 color;
 void main(){if(opacity<.005)discard;
   vec4 ink=texture(atlas,vec2((glyph+uv.x)/11.,uv.y));
   color=vec4(ink.rgb,ink.a*opacity);
 }`));
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 gl.useProgram(program);gl.bindVertexArray(gl.createVertexArray());
 gl.activeTexture(gl.TEXTURE0);const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_3D,tex);
 gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
 gl.texImage3D(gl.TEXTURE_3D,0,gl.R8,N,N,N,0,gl.RED,gl.UNSIGNED_BYTE,volume);
 for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T,gl.TEXTURE_WRAP_R])gl.texParameteri(gl.TEXTURE_3D,axis,gl.REPEAT);
 gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.uniform1i(gl.getUniformLocation(program,'field'),0);
 gl.activeTexture(gl.TEXTURE1);const glyphTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,glyphTex);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.uniform1i(gl.getUniformLocation(program,'atlas'),1);
 const locations=Object.fromEntries(['viewport','cell','radius','rotation'].map(k=>[k,gl.getUniformLocation(program,k)]));
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 gl.clearColor(37/255,38/255,37/255,1);
 return {kind:'webgl2',render(cell,radius){
   gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT);
   gl.uniform2f(locations.viewport,width,height);gl.uniform2f(locations.cell,cell*.66,cell);
   gl.uniform1f(locations.radius,radius);gl.uniform4f(locations.rotation,Math.sin(state.yaw),Math.cos(state.yaw),Math.sin(state.pitch),Math.cos(state.pitch));
   gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,Math.ceil(width/(cell*.66))*Math.ceil(height/cell));
 }};
}
// Cached-glyph fallback for browsers without WebGL2. Same stationary grid.
function makeCPU(){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return null;
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
 function sample(x,y,z){
  x*=2;y*=2;z*=2;const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
  const get=(a,b,c)=>volume[(a&63)+N*((b&63)+N*(c&63))]/127.5-1;
  return mix(mix(mix(get(ix,iy,iz),get(ix+1,iy,iz),fx),mix(get(ix,iy+1,iz),get(ix+1,iy+1,iz),fx),fy),mix(mix(get(ix,iy,iz+1),get(ix+1,iy,iz+1),fx),mix(get(ix,iy+1,iz+1),get(ix+1,iy+1,iz+1),fx),fy),fz);
 }
 return {kind:'canvas2d',render(cell,radius){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.fillStyle='#252625';ctx.fillRect(0,0,width,height);
  const cw=cell*.66,sy=Math.sin(state.yaw),cy=Math.cos(state.yaw),sp=Math.sin(state.pitch),cp=Math.cos(state.pitch);
  for(let py=cell*.5;py<height;py+=cell)for(let px=cw*.5;px<width;px+=cw){
   const x=(px-width*.5)/radius,y=(py-height*.465)/radius,rr=x*x+y*y;if(rr>=1)continue;
   const z=Math.sqrt(1-rr),vy=y*cp+z*sp,vz=-y*sp+z*cp,ox=x*cy-vz*sy,oz=x*sy+vz*cy;
   const f=sample(ox*2.6+8.3,vy*2.6+2.4,oz*2.6+4.1)*.75+sample(ox*6.8+17,vy*6.8+3,oz*6.8+1)*.25;
   const density=smooth(-.09,.38,f),opacity=smooth(-.12,.02,f)*(.2+.8*density)*Math.pow(z,.44)*(.85-.14*x-.12*y);
   if(opacity<.005)continue;ctx.globalAlpha=opacity;
   ctx.drawImage(atlas,fixedGlyph(Math.round(px/cw-.5),Math.round(py/cell-.5))*tw,0,tw,th,px-cw*.5,py-cell*.5,cw,cell);
  }ctx.globalAlpha=1;
 }};
}
let renderer;
try{renderer=makeGPU()||makeCPU();}catch(error){
 console.warn('GPU unavailable; using cached Canvas glyphs.',error);
 const fresh=canvas.cloneNode();canvas.replaceWith(fresh);canvas=fresh;renderer=makeCPU();
}
if(renderer)canvas.dataset.renderer=renderer.kind;
function wake(){dirty=true;if(renderer&&!raf&&!document.hidden)raf=requestAnimationFrame(frame);}
function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);wake();}
function frame(now){
 raf=0;if(document.hidden)return;
 const active=!state.paused&&!state.dragging&&state.speed>0;
 // The CPU fallback is capped at 30 fps. Paused and hidden views do no work.
 const interval=renderer.kind==='canvas2d'?1000/30:1000/60;
 if(!dirty&&now-last<interval-1){if(active)raf=requestAnimationFrame(frame);return;}
 const dt=Math.min((now-last)/1000,.05)||0;last=now;
 if(active){state.yaw+=dt*state.speed*.3;state.pitch+=dt*state.speed*.055;}
 renderer.render(15/state.density,Math.min(width*.42,height*.405)*state.zoom);
 dirty=false;if(active)raf=requestAnimationFrame(frame);
}
addEventListener('resize',resize);
addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{last=performance.now();wake();}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);raf=0;});
canvas.addEventListener('webglcontextrestored',()=>{renderer=makeGPU();resize();});
resize();
function sync(){wake();for(const key of ['speed','density','zoom']){$(key).value=state[key];$(key+'Out').textContent=state[key].toFixed(1)+'×';}$('pause').textContent=state.paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',state.paused?'播放动画':'暂停动画');}
for(const key of ['speed','density','zoom'])$(key).addEventListener('input',e=>{state[key]=+e.target.value;sync();});
function toggle(){state.paused=!state.paused;sync();}
$('pause').onclick=toggle;
$('reset').onclick=()=>{Object.assign(state,{speed:.6,density:1,zoom:1,yaw:.4,pitch:-.18,paused:reduced.matches});sync();};
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}}
$('fullscreen').onclick=fullscreen;
addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(e.code==='Space'){e.preventDefault();toggle();}if(e.key.toLowerCase()==='h')document.body.classList.toggle('hidden-ui');if(e.key.toLowerCase()==='f')fullscreen();if(e.key==='Escape')document.body.classList.remove('hidden-ui');});
let pointer=null;
canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY,id:e.pointerId};state.dragging=true;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!pointer||e.pointerId!==pointer.id)return;state.yaw-=(e.clientX-pointer.x)*.006;state.pitch+=(e.clientY-pointer.y)*.006;pointer.x=e.clientX;pointer.y=e.clientY;wake();});
const end=()=>{pointer=null;state.dragging=false;wake();};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.max(.5,Math.min(1.8,state.zoom-e.deltaY*.001));sync();},{passive:false});
reduced.addEventListener('change',e=>{if(e.matches){state.paused=true;sync();}});
if(renderer){sync();}else{$('error').style.display='block';}
