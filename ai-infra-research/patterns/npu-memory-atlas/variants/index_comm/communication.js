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
const a=M.rank(rank,config),layer=Math.max(config.dense,a.pp*config.layers/config.pp,Math.min((a.pp+1)*config.layers/config.pp-1,Number(params.get('layer')||7))),ids=Array.from({length:M.world(config)},(_,id)=>M.rank(id,config)).filter(b=>b.pp===a.pp&&b.cp===a.cp&&Math.floor(b.dpIndex/config.ep)===Math.floor(a.dpIndex/config.ep)&&b.tp===a.tp).map(b=>b.id),columns=Math.ceil(ids.length/2),colors=['#26bda6','#4c83e3','#c875a0','#d2b85c'];
const color=id=>colors[ids.indexOf(id)%colors.length],pos=id=>{const i=ids.indexOf(id),row=i<columns?0:1,col=i%columns;return {x:250+col*(900/Math.max(1,columns-1)),y:row?665:180,row};};
$('context').textContent=`${M.world(config)} Rank · EP${config.ep} · L${layer} · PP${a.pp} / TP${a.tp} / CP${a.cp} · ${ids.map(id=>'R'+id).join('、')}`;
$('source').innerHTML=ids.map(id=>`<option value="${id}">R${id}</option>`).join('');$('source').value=rank;
$('back').href='index_comm.html#'+new URLSearchParams({rank:String(rank),config:JSON.stringify(config)});
function deck(){ $('back').href='index_comm.html#'+new URLSearchParams({rank:String(rank),config:JSON.stringify(config)}); $('deck').innerHTML=ids.map(id=>{const p=pos(id),x=p.x,y=p.y;return `<g class="rank-hit ${id===rank?'rank-selected':''}" data-rank="${id}" tabindex="0" role="button" aria-label="选择 Rank ${id}" aria-pressed="${id===rank}"><path class="rank-shell" d="M${x-65} ${y-38}l65 -32 65 32v85l-65 32-65-32Z M${x-65} ${y-38}l65 32 65-32 M${x} ${y-6}v85"/><text class="rank-label" x="${x}" y="${y-89}" text-anchor="middle">R${id}</text><text class="rank-meta" x="${x}" y="${y-72}" text-anchor="middle">${id===rank?'SELECTED':'EP '+ids.indexOf(id)}</text></g>`;}).join('');}
function routes(){if(!ready)return;direction=t>=.7;deck();const visible=flows.filter(f=>!f.local&&(all||f.source===rank));let defs='',svg='',ports='';const totals=new Map(ids.map(id=>[id,{in:0,out:0}]));for(const f of visible){const s=direction?f.target:f.source,d=direction?f.source:f.target;totals.get(s).out+=f.tokens;totals.get(d).in+=f.tokens;}
const offsets=new Map(ids.map(id=>[id,{in:0,out:0}])),max=Math.max(1,...[...totals.values()].flatMap(v=>[v.in,v.out])),scale=95/max;
visible.forEach((f,i)=>{const source=direction?f.target:f.source,target=direction?f.source:f.target,s=pos(source),d=pos(target),width=f.tokens*scale,so=offsets.get(source),to=offsets.get(target),sx=s.x-48+so.out*scale+width/2,dx=d.x-48+to.in*scale+width/2,sy=s.row?s.y-48:s.y+90,dy=d.row?d.y-48:d.y+90;so.out+=f.tokens;to.in+=f.tokens;
const lane=340+(i/Math.max(1,visible.length-1))*170,path=`M${sx} ${sy} C${sx} ${lane},${dx} ${lane},${dx} ${dy}`,key='flow-'+i;
defs+=`<linearGradient id="${key}" gradientUnits="userSpaceOnUse" x1="${sx}" y1="${sy}" x2="${dx}" y2="${dy}"><stop stop-color="${color(source)}"/><stop offset="1" stop-color="${color(target)}"/></linearGradient>`;
svg+=`<path class="flow" tabindex="0" role="img" aria-label="R${source} 到 R${target}，${f.tokens} assignments" d="${path}" fill="none" stroke="url(#${key})" stroke-width="${width}"><title>R${source} → R${target} · ${f.tokens.toLocaleString()} assignments · ${(f.bytes/1e6).toFixed(2)} MB · ${direction?'Combine':'Dispatch'}</title></path>`;});
for(const id of ids){const p=pos(id),y=p.row?p.y-48:p.y+90;ports+=`<path d="M${p.x-52} ${y}h104" stroke="${color(id)}" stroke-width="4"/><text class="rank-meta" x="${p.x}" y="${p.row?y-14:y+22}" text-anchor="middle">收 ${totals.get(id).in.toLocaleString()} · 发 ${totals.get(id).out.toLocaleString()}</text>`;}
$('flows').innerHTML='<defs>'+defs+'</defs>'+svg;$('ports').innerHTML=ports;const local=flows.find(f=>f.local&&f.source===rank);$('detail').textContent=`流量带宽度 ∝ assignments（Top-K 专家分配） · 渐变：发送 Rank → 接收 Rank · R${rank} 本地 ${local?.tokens.toLocaleString()||0}，不画跨卡路径`;
}
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