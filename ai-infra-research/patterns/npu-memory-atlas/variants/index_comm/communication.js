/* Standalone communication scene. Routing is computed once in a Worker;
 * SVG geometry changes only on source/filter/direction changes, never per frame.
 * Counts are deterministic router assignments, not measured traffic. */
(()=>{'use strict';
const $=id=>document.getElementById(id),M=RankAtlasModel,params=new URLSearchParams(location.hash.slice(1));
let config={...M.baseline},rank=23,t=Number(params.get('t')||0),playing=false,all=false,flows=[],last=null,paint=0,direction=false,ready=false,incidents=[],fault=params.get('fault')==='1';
try{if(params.has('config'))config={...config,...JSON.parse(params.get('config'))};}catch{};
const check=M.validate(config);if(!check.ok){$('notice').textContent=check.errors.join('；');return;}
rank=Math.max(0,Math.min(M.world(config)-1,Number(params.get('rank')||23)));if(!Number.isInteger(rank))rank=23;
t=Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
const a=M.rank(rank,config),layer=Math.max(config.dense,a.pp*config.layers/config.pp,Math.min((a.pp+1)*config.layers/config.pp-1,Number(params.get('layer')||7))),ids=Array.from({length:M.world(config)},(_,id)=>M.rank(id,config)).filter(b=>b.pp===a.pp&&b.cp===a.cp&&Math.floor(b.dpIndex/config.ep)===Math.floor(a.dpIndex/config.ep)&&b.tp===a.tp).map(b=>b.id),colors=['#26bda6','#4c83e3','#c875a0','#d2b85c'];
const capacityInput=Number(params.get('capacity')||32),capacity=Number.isInteger(capacityInput)&&capacityInput>=1&&capacityInput<=32?capacityInput:32;
const world=M.world(config),nodeSize=config.node,corridor=1100;
// Keep the approved cabinet/row/column mapping and isometric Rank glyph.
// Only the communication scene widens the gap between the two columns.
const physical=Array.from({length:world},(_,id)=>{const p=RankPhysicalLayout.position(id,{world,capacity});return {...p,node:Math.floor(p.slot/nodeSize),x:p.x+p.group*corridor+p.column*corridor};}),memberSet=new Set(ids),activeRows=new Set(ids.map(id=>physical[id].group+':'+physical[id].row)),focusIds=physical.map((p,id)=>({p,id})).filter(v=>activeRows.has(v.p.group+':'+v.p.row)).map(v=>v.id);
const color=id=>colors[ids.indexOf(id)%colors.length];
const project=(x,y,z)=>[(x-y)*Math.sqrt(3)/2,(x+y)*.5-z];
const point=(id,x=0,y=0,z=0)=>{const p=physical[id];return project(p.x+x,p.y+y,p.z+z);};
const polygon=pts=>pts.map(p=>p.join(',')).join(' '),h=245*4/3;
const corners=id=>[[0,0,0],[245,0,0],[245,245,0],[0,245,0],[0,0,h],[245,0,h],[245,245,h],[0,245,h]].map(p=>point(id,...p));
let focusing=true;
let camera={x:0,y:0,w:1400,h:850};
function setCamera(points){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs)-180,y=Math.min(...ys)-180,w=Math.max(...xs)-x+180,height=Math.max(...ys)-y+180;camera={x,y,w,h:height};$('traffic').setAttribute('viewBox',`${x} ${y} ${w} ${height}`);}
function fit(focus=false){focusing=focus;setCamera((focus?focusIds:physical.map((_,id)=>id)).flatMap(corners));deck();}
$('fit').onclick=()=>fit(false);$('focus').onclick=()=>fit(true);
$('context').textContent=`${world} Rank · ${Math.ceil(world/capacity)} 柜 · 物理机柜 · 竖向 Sankey · 每柜至多 ${capacity} Rank · EP${config.ep} · L${layer}`;
$('source').innerHTML=ids.map(id=>`<option value="${id}">R${id}</option>`).join('');$('source').value=rank;$('all').setAttribute('aria-pressed',String(all));
function backLink(){$('back').href='index_comm.html#'+new URLSearchParams({rank:String(rank),config:JSON.stringify(config),capacity:String(capacity),layout:'physical'});}
function deck(){
 backLink();let markup='';
 const order=physical.map((p,id)=>({p,id})).sort((a,b)=>a.p.z-b.p.z||(a.p.x+a.p.y)-(b.p.x+b.p.y));
 for(const {p,id} of order){if(focusing&&!focusIds.includes(id))continue;const c=corners(id),active=memberSet.has(id),top=[c[4],c[5],c[6],c[7]],left=[c[0],c[3],c[7],c[4]],right=[c[0],c[1],c[5],c[4]],label=point(id,122,122,h+65);
 markup+=`<g class="physical-rank ${active?'ep-member':''} ${id===rank?'rank-selected':''}" ${active?`data-rank="${id}" tabindex="0" role="button" aria-label="选择 Rank ${id}" aria-pressed="${id===rank}"`:''}><title>R${id} · 机柜 ${p.group} · 节点 ${p.node} · 槽位 ${p.slot%nodeSize}${active?' · 当前 EP 组':''}</title><polygon class="rank-shell" points="${polygon(top)}"/><polygon class="rank-shell" points="${polygon(left)}"/><polygon class="rank-shell" points="${polygon(right)}"/><path class="rank-shell" fill="none" d="M${c[1]}L${c[2]}L${c[3]} M${c[2]}L${c[6]}"/>${active||id%capacity<2?`<text class="rank-label" x="${label[0]}" y="${label[1]}" text-anchor="middle">R${id}</text>`:''}</g>`;
 }
 $('deck').innerHTML=markup;
 let floor='';
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(let g=0;g<Math.ceil(world/capacity);g++){
  const rs=physical.map((p,id)=>({p,id})).filter(v=>v.p.group===g),points=rs.flatMap(v=>corners(v.id)),expanded=points.flatMap(([x,y])=>[[-70,-100],[70,-100],[70,60],[-70,60]].map(([dx,dy])=>[x+dx,y+dy])).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),lo=[],hi=[];
  for(const p of expanded){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}
  for(const p of [...expanded].reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}
  const hull=lo.slice(0,-1).concat(hi.slice(0,-1)),x=Math.min(...points.map(p=>p[0]))-70,y=Math.min(...points.map(p=>p[1]))-145;
  floor+=`<polygon class="cabinet-border" points="${polygon(hull)}"/><text x="${x}" y="${y}">机柜 ${g} · R${rs[0].id}–R${rs.at(-1).id} · ${rs.length} Rank</text>`;
 }
 $('floor').innerHTML=floor;
}
function routes(){
 if(!ready)return;direction=t>=.7;deck();const visible=flows.filter(f=>!f.local&&(all||f.source===rank));let defs='',svg='',ports='';
 const totals=new Map(ids.map(id=>[id,{in:0,out:0}]));for(const f of visible){const s=direction?f.target:f.source,d=direction?f.source:f.target;totals.get(s).out+=f.tokens;totals.get(d).in+=f.tokens;}
 const offsets=new Map(ids.map(id=>[id,{in:0,out:0}])),max=Math.max(1,...[...totals.values()].flatMap(v=>[v.in,v.out])),scale=190/max;
 visible.forEach((f,i)=>{const source=direction?f.target:f.source,target=direction?f.source:f.target,s=physical[source],d=physical[target],width=f.tokens*scale,so=offsets.get(source),to=offsets.get(target),sa=20+so.out*scale+width/2,da=20+to.in*scale+width/2;so.out+=f.tokens;to.in+=f.tokens;
 // All route bends live on the cabinet front plane (Y=0). Endpoint
 // slots are vertical segments on the inward-facing edge of each Rank.
 const sx=s.x+(s.column===0?245:0),dx=d.x+(d.column===0?245:0),sz=s.z+45+sa,dz=d.z+45+da;
 const leftBase=Math.min(s.x-s.column*(385+corridor),d.x-d.column*(385+corridor));
 const lane=leftBase+330+(i+.5)/Math.max(1,visible.length)*(corridor+155-170);
 const xyz=[[sx,0,sz],[lane,0,sz],[lane,0,dz],[dx,0,dz]],points=xyz.map(p=>project(...p)),path='M'+points.map(p=>p.join(' ')).join(' L'),key='flow-'+i;

 defs+=`<linearGradient id="${key}" gradientUnits="userSpaceOnUse" x1="${points[0][0]}" y1="${points[0][1]}" x2="${points.at(-1)[0]}" y2="${points.at(-1)[1]}"><stop stop-color="${color(source)}"/><stop offset="1" stop-color="${color(target)}"/></linearGradient>`;
 svg+=`<path class="flow" tabindex="0" role="img" aria-label="R${source} 到 R${target}，${f.tokens} assignments" d="${path}" fill="none" stroke="url(#${key})" stroke-width="${width}" stroke-linejoin="round"><title>R${source} → R${target} · ${f.tokens.toLocaleString()} assignments · ${(f.bytes/1e6).toFixed(2)} MB · ${direction?'Combine':'Dispatch'} · 机柜 ${s.group} → ${d.group}</title></path>`;
 });
 for(const id of ids){const p=physical[id],x=p.column===0?245:0,a=point(id,x,0,65),b=point(id,x,0,255),label=point(id,x+(p.column===0?24:-24),0,290);ports+=`<path d="M${a}L${b}" stroke="${color(id)}" stroke-width="9" stroke-linecap="round"/><text class="port-label" x="${label[0]}" y="${label[1]}" text-anchor="${p.column===0?'start':'end'}">R${id} · ${(direction?totals.get(id).in:totals.get(id).out).toLocaleString()}</text>`;}
 $('flows').innerHTML='<defs>'+defs+'</defs>'+svg;$('ports').innerHTML=ports;const local=flows.find(f=>f.local&&f.source===rank);$('detail').textContent=`机柜行列保持 · 竖向通信平面 · 流量带宽度 ∝ assignments · R${rank} 本地 ${local?.tokens.toLocaleString()||0} · 拖动平移，滚轮缩放`;
}
let drag=null;
$('traffic').addEventListener('wheel',e=>{e.preventDefault();const rect=$('traffic').getBoundingClientRect(),q=Math.exp(Math.max(-100,Math.min(100,e.deltaY))*.002),rx=(e.clientX-rect.left)/rect.width,ry=(e.clientY-rect.top)/rect.height;camera.x+=camera.w*rx*(1-q);camera.y+=camera.h*ry*(1-q);camera.w*=q;camera.h*=q;$('traffic').setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.w} ${camera.h}`);},{passive:false});
$('traffic').onpointerdown=e=>{if(e.target.closest('[data-rank]')||e.target.closest('.flow'))return;drag={x:e.clientX,y:e.clientY,c:{...camera}};$('traffic').setPointerCapture(e.pointerId);};
$('traffic').onpointermove=e=>{if(!drag)return;const r=$('traffic').getBoundingClientRect(),scale=Math.max(drag.c.w/r.width,drag.c.h/r.height);camera={...drag.c,x:drag.c.x-(e.clientX-drag.x)*scale,y:drag.c.y-(e.clientY-drag.y)*scale};$('traffic').setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.w} ${camera.h}`);};
$('traffic').onpointerup=$('traffic').onpointercancel=()=>{drag=null;};
fit(true);
function update(){if(fault&&ready){const f=incidents.find(f=>f.id===rank);$('notice').textContent=f?`R${rank} · 暂存 ${(f.retainedBytes/1e6).toFixed(2)} MB · 新申请 ${(f.requestBytes/1e6).toFixed(2)} MB · 可用 ${(f.freeBytes/1e6).toFixed(2)} MB · ${t>=.44?'申请失败':'等待申请'}`:'';}const next=t>=.7;if(next!==direction)routes();$('progress').value=Math.round(t*1000);$('phase').textContent=t===1?'回收完成':t<.16?'路由分桶':t<.44?'Dispatch · 分发':t<.7?'专家计算':'Combine · 回收';$('play').textContent=playing?'暂停':'播放';$('play').setAttribute('aria-label',playing?'暂停':'播放');}
function stop(){playing=false;last=null;update();}
$('incident').setAttribute('aria-pressed',String(fault));$('incident').onclick=()=>{fault=!fault;$('incident').setAttribute('aria-pressed',String(fault));if(!fault)$('notice').textContent='';update();};
$('source').onchange=()=>{rank=Number($('source').value);routes();update();};$('all').onclick=()=>{all=!all;$('all').setAttribute('aria-pressed',String(all));routes();};
$('deck').onclick=e=>{const hit=e.target.closest('[data-rank]');if(hit){rank=Number(hit.dataset.rank);$('source').value=rank;routes();}};
$('deck').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();const hit=e.target.closest('[data-rank]');if(hit){rank=Number(hit.dataset.rank);$('source').value=rank;routes();}}};
$('progress').oninput=()=>{t=Number($('progress').value)/1000;stop();};
function tick(now){if(!playing||document.hidden){last=null;return;}if(last!==null)t=Math.min(fault?.44:1,t+(now-last)/8000);last=now;if(now-paint>50){update();paint=now;}if(t===1||(fault&&t>=.44)){stop();return;}requestAnimationFrame(tick);}
$('play').onclick=()=>{if(!ready)return;if(playing){stop();return;}if(t===1)t=0;playing=true;last=null;update();requestAnimationFrame(tick);};$('restart').onclick=()=>{t=0;stop();};document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
deck();update();
if(Math.max(a.pp*config.layers/config.pp,config.dense)>=(a.pp+1)*config.layers/config.pp){$('notice').textContent='当前配置为全 Dense 模型，没有 EP 专家通信。';return;}
if(config.seq/config.cp*config.mbs*config.experts*config.ep>16777216){$('notice').textContent='当前路由规模过大，请在显存页缩小 Sequence / Micro Batch / EP 后重试。';return;}
const blob=new Blob([EPTeachingModel.workerSource,$('communication-worker').textContent],{type:'text/javascript'}),workerURL=URL.createObjectURL(blob);let worker;
try{worker=new Worker(workerURL);worker.onerror=()=>{$('notice').textContent='路由计算未能启动，请通过本地 HTTP 预览打开此页面。';worker.terminate();URL.revokeObjectURL(workerURL);};worker.onmessage=({data})=>{worker.terminate();URL.revokeObjectURL(workerURL);if(data.error){$('notice').textContent=data.error;return;}flows=data.flows;incidents=data.incidents;ready=true;$('notice').textContent='';$('amount').textContent=`跨卡 ${((data.total-data.local)/data.total*100).toFixed(1)}%`;routes();update();};worker.postMessage({config,ids,layer});}catch{URL.revokeObjectURL(workerURL);$('notice').textContent='请通过本地 HTTP 预览打开通信页以启用后台路由计算。';}
})();