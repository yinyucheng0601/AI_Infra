// Axis geometry from the local Rank renderer; bands encode logical objects, never GB.
let rankInspectorOpen=false,graphImpactMarkup='';
let rankPrimary=false,rankFocus=0,rankBandFocus=null,rankSnapshot=null,rankSignature='',graphReturnCamera=null;
const rankCamera={z:1,x:0,y:0};let rankPan=null,rankMoved=false,rankSwapBusy=false;
function rankCube(rank,mini=false,unmapped=false){
 const {P,polygon,block}=window.RankMemoryView.geometry,height=64*6.7;
 let out=polygon([[0,0,0],[245,0,0],[245,155,0],[0,155,0]],'#181818')+polygon([[0,0,0],[245,0,0],[245,0,height],[0,0,height]],'#151515')+polygon([[0,0,0],[0,155,0],[0,155,height],[0,0,height]],'#151515');
 rankBandLayout(rank.bands).forEach(b=>{const {z,h}=b,a=P(239,142,z+h/2),focused=rank.id===rankFocus&&b.id===rankBandFocus;
 if(unmapped){out+=`<g data-unmapped-band opacity=".45">${block(z,h,'#444444')}</g>`;return;}
 out+=`<g data-rank-band="${b.id}" data-layout-z="${z}" data-layout-height="${h}" data-tip="${esc(b.name+' · 点击查看对象与分片')}">${block(z,h,focused?'#eeeeee':b.color)}<text transform="matrix(.8660254 -.5 0 1 ${a[0]} ${a[1]})" fill="${focused?'#111':'#111'}" font-size="17">${esc(({weights:'权重 W',activation:current===0?'输入 H₀':current>=6?'缓存 X/A':'激活',gradient:current>=3?'dX / dW':'dX',communication:current===8?'TP / EP / DP':rankSnapshot.config.tp===1?'DP':rankSnapshot.config.sp?'AG / RS':'AR'})[b.id]||b.name)}</text></g>`;});
 out+=`<path d="M${P(0,155,height)} L${P(0,0,height)} L${P(245,0,height)} L${P(245,155,height)} Z M${P(0,155,height)} L${P(0,155,0)} L${P(245,155,0)} L${P(245,0,0)} L${P(245,0,height)} M${P(245,155,height)} L${P(245,155,0)}" fill="none" stroke="#bbb" stroke-width="2"/>`;
 const wall=P(0,140,height);if(!unmapped)out+=`<g transform="matrix(.8660254 -.5 0 1 ${wall[0]} ${wall[1]-48})"><text fill="#eee" font-size="25">Rank ${rank.id}</text>${rankSnapshot.config.tp>1?`<text y="23" fill="#bbb" font-size="14">TP ${rank.lane}${mini&&current===8?' · 专家组 '+rank.group:''}</text>`:''}</g>`;
 return out;
}
function fitRanks(){const svg=document.querySelector('#rank-canvas');if(!svg||!rankSnapshot?.config.deployed)return;const w=1320,h=950,sw=innerWidth,sh=innerHeight,left=sw>1000?310:24,right=sw>1000?440:24,available=Math.max(280,sw-left-right),scale=Math.min(available/w,Math.max(200,sh-270)/h),cx=left+available/2;svg.setAttribute('viewBox',`${w/2-cx/scale} ${(h-sh/scale)/2} ${sw/scale} ${sh/scale}`);}
function fitGraphThumbnail(){if(!rankPrimary||!fullGraphBounds)return;cancelAnimationFrame(cameraFrame);view={z:1,x:0,y:0};apply();const b=fullGraphBounds;document.querySelector('#stage>svg').setAttribute('viewBox',`${b.x-24} ${b.y-24} ${b.width+48} ${b.height+48}`);}

function applyRankCamera(){document.querySelector('#rank-world').setAttribute('transform',`translate(${rankCamera.x} ${rankCamera.y}) scale(${rankCamera.z})`);}
function renderRankView(){
 rankSnapshot=trainingRankState(current,parameterState);
 const opener=document.querySelector('#rank-open');opener.disabled=!rankSnapshot.config.deployed;opener.dataset.tip=rankSnapshot.config.deployed?'展开固定 8 个 Rank 的部署视图':'逻辑计算尚未映射部署；TP 步骤开始显示固定 8 个 Rank';
 if(!rankSnapshot.config.deployed){if(rankPrimary)toggleRankPrimary(false);rankInspectorOpen=false;document.querySelector('#rank-world').innerHTML='';document.querySelector('#rank-preview').innerHTML=`<svg viewBox="345 222 460 553" aria-hidden="true">${rankCube({bands:[{id:'weights'},{id:'activation'},{id:'gradient'}]},true,true)}</svg>`;document.querySelector('#rank-preview-caption').textContent='Rank · 尚未映射部署';return;}
 if(rankFocus>=rankSnapshot.ranks.length)rankFocus=0;
 const state=rankSnapshot,rank=state.ranks[rankFocus];if(rankBandFocus&&!rank.bands.some(b=>b.id===rankBandFocus))rankBandFocus=rankInspectorOpen?'weights':null;document.querySelector('#graph-return').dataset.label='Rank '+rankFocus+' · 计算图 ↗';
 document.querySelector('#rank-preview').innerHTML=`<svg viewBox="345 222 460 553" aria-hidden="true">${rankCube(rank,true)}</svg>`;
 document.querySelector('#rank-preview-caption').textContent=`${state.title} · 容量未配置`;
 const cfg=state.config,w=1320,coords=new Map(state.ranks.map(r=>[r.id,{x:(r.id%4)*330+15,y:95+Math.floor(r.id/4)*430}]));
 let body=`<defs><marker id="rank-route-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="${C.i}"/></marker></defs>`;
 for(let row=0;row<cfg.dp;row++){
 const members=state.ranks.filter(r=>r.row===row),first=members[0],x=(first.id%4)*330,y=75+Math.floor(first.id/4)*430;
 const label=current===8?`E${first.experts[0]}–E${first.experts.at(-1)} · 专家副本 ${first.replica}`:`TP 组 {${members.map(r=>r.id)}}`;
 body+=`<rect x="${x}" y="${y-35}" width="${cfg.tp*330-12}" height="395" rx="14" fill="#fff" fill-opacity=".035"/>`+text(x+16,y-12,label,'text');
 if(cfg.tp>1)body+=`<path d="M${x+55} ${y+337}H${x+cfg.tp*330-55}" stroke="#555" fill="none"/>`;
 }
 for(const r of state.ranks){const p=coords.get(r.id);body+=`<g data-rank-id="${r.id}" class="rank-item" role="button" tabindex="0" aria-label="Rank ${r.id}，TP ${r.lane}，${state.title}" aria-pressed="${r.id===rankFocus}"><svg x="${p.x}" y="${p.y}" width="300" height="290" viewBox="345 222 460 553">${rankCube(r)}</svg></g>`;}
 if(current===7){const y=915;body+=text(w/2,y,`待分配专家池 · ${cfg.experts} experts · Top-2`,'text','middle');}
 if(current===8){const lane=rankFocus%cfg.tp,replica=rank.replica,base=replica*cfg.ep*cfg.tp,source=coords.get(base+lane),route=moeRoute(parameterState.token,cfg.experts);route.chosen.forEach((e,i)=>{const owner=Math.floor(e/(cfg.experts/cfg.ep)),target=coords.get(base+owner*cfg.tp+lane);if(owner===0){return;}const x=source.x+275;body+=`<path data-rank-route="${e}" d="M${x} ${source.y+145}H${x+40+i*20}V${target.y+145}H${target.x+275}" fill="none" stroke="${C.i}" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#rank-route-arrow)"/><path data-rank-return="${e}" d="M${target.x+275} ${target.y+170}H${x+55+i*20}V${source.y+170}H${source.x+275}" fill="none" stroke="${C.i}" stroke-width="1.5" stroke-dasharray="3 5" marker-end="url(#rank-route-arrow)"/>`;});}
 updateGraphSvg(document.querySelector('#rank-world'),'<svg xmlns="http://www.w3.org/2000/svg">'+body+'</svg>');applyRankCamera();
 const signature=[current,cfg.tp,cfg.ep,cfg.sp,cfg.experts,cfg.recollect].join(':');if(signature!==rankSignature){rankCamera.x=rankCamera.y=0;rankCamera.z=1;applyRankCamera();fitRanks();rankSignature=signature;}if(rankInspectorOpen&&rankPrimary){writeTrainingRankPanel();markRankGraphOwnership();}if(rankPrimary)fitGraphThumbnail();updateRankImpact();
}
function toggleRankPrimary(value=!rankPrimary){
 if(value&&!rankSnapshot?.config.deployed)return;if(rankSwapBusy||value===rankPrimary)return;rankSwapBusy=true;
 const graph=document.querySelector('#stage'),surface=document.querySelector('#rank-surface'),a=graph.getBoundingClientRect(),b=surface.getBoundingClientRect();
 if(value){cancelAnimationFrame(cameraFrame);}if(value)graphReturnCamera={stage:current,signature:rankSignature,view:{...view},box:document.querySelector('#stage>svg').getAttribute('viewBox'),autoLayout};
 rankPrimary=value;document.querySelector('#rank-open').setAttribute('aria-expanded',String(value));document.body.classList.toggle('rank-primary',value);document.querySelector('#rank-open').hidden=value;document.querySelector('#rank-canvas').toggleAttribute('hidden',!value);document.querySelector('#rank-return').hidden=!value;document.querySelector('#graph-return').hidden=!value;fitRanks();if(value)fitGraphThumbnail();updateRankImpact();
 if(!value){if(rankInspectorOpen){rankInspectorOpen=false;document.querySelector('#panel').hidden=true;}if(graphReturnCamera?.stage===current&&graphReturnCamera.signature===rankSignature){view={...graphReturnCamera.view};autoLayout=graphReturnCamera.autoLayout;document.querySelector('#stage>svg').setAttribute('viewBox',graphReturnCamera.box);apply();}else{autoLayout=true;view={z:1,x:0,y:0};apply();fitStage(false);}}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const animations=reduced?[]:[[graph,a],[surface,b]].map(([el,old])=>{const n=el.getBoundingClientRect();return el.animate([{transformOrigin:'0 0',transform:`translate(${old.left-n.left}px,${old.top-n.top}px) scale(${old.width/n.width},${old.height/n.height})`},{transformOrigin:'0 0',transform:'none'}],{duration:400,easing:'cubic-bezier(.22,1,.36,1)'}).finished.catch(()=>{});});Promise.all(animations).finally(()=>rankSwapBusy=false);
}
function inspectTrainingRank(id,band='weights'){
 if(!rankSnapshot?.config.deployed)return;
 rankInspectorOpen=true;rankFocus=id;rankBandFocus=band;renderRankView();markRankGraphOwnership();writeTrainingRankPanel();
}
function writeTrainingRankPanel(){const id=rankFocus,band=rankBandFocus;const r=rankSnapshot.ranks[id],b=r.bands.find(b=>b.id===band)||r.bands[0];
 document.querySelector('#panel').hidden=false;document.querySelector('#ptitle').textContent=`Rank ${id} · ${b.name}`;
 document.querySelector('#pbody').innerHTML=`<p>${esc(b.detail)}</p><p>部署固定 8 个 Rank；TP 组：{${r.tpGroup}}；稠密层 DP 组：{${r.dpPeers}}${current===8?'；EP 同 lane 通信组：{'+r.epPeers+'}':''}</p>${current===8?`<p>专家 E${r.experts[0]}–E${r.experts.at(-1)} 的 TP 分片 ${r.lane+1}/${rankSnapshot.config.tp}。</p>`:''}`;
}
function linkGraphToRanks(id){rankInspectorOpen=false;if(!graphModel.deployed)return;const match=id.match(/^moe-e(\d+)/);if(match&&current===8){const group=Math.floor(+match[1]/(graphModel.experts/graphModel.ep));rankFocus=rankSnapshot.ranks[rankFocus].replica*graphModel.ep*graphModel.tp+group*graphModel.tp+(rankFocus%graphModel.tp);}rankBandFocus=match||registry[id]?.role==='w'||/param|weight/.test(id)?'weights':registry[id]?.role==='g'||/dw|wgrad|full-w-|full-b-|model-back-/.test(id)?'gradient':/cache|ag|rs/.test(id)?'communication':'activation';renderRankView();}
document.querySelector('#rank-open').onclick=()=>toggleRankPrimary(true);document.querySelector('#rank-return').onclick=()=>toggleRankPrimary(false);document.querySelector('#graph-return').onclick=()=>toggleRankPrimary(false);
const rankSurface=document.querySelector('#rank-canvas');
rankSurface.addEventListener('click',e=>{const item=e.target.closest('[data-rank-id]');if(item&&!rankMoved)inspectTrainingRank(+item.dataset.rankId,e.target.closest('[data-rank-band]')?.dataset.rankBand||'weights');});
rankSurface.addEventListener('keydown',e=>{const item=e.target.closest('[data-rank-id]');if(item&&['Enter',' '].includes(e.key)){e.preventDefault();inspectTrainingRank(+item.dataset.rankId);}});
rankSurface.addEventListener('wheel',e=>{e.preventDefault();const p=rankSurface.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(rankSurface.getScreenCTM().inverse()),z=Math.max(.3,Math.min(6,rankCamera.z*Math.exp(-e.deltaY*.001)));rankCamera.x=q.x-(q.x-rankCamera.x)*z/rankCamera.z;rankCamera.y=q.y-(q.y-rankCamera.y)*z/rankCamera.z;rankCamera.z=z;applyRankCamera();},{passive:false});
rankSurface.onpointerdown=e=>{if(e.button!==0)return;rankMoved=false;rankPan={x:e.clientX,y:e.clientY,vx:rankCamera.x,vy:rankCamera.y};};rankSurface.onpointermove=e=>{if(!rankPan)return;const dx=e.clientX-rankPan.x,dy=e.clientY-rankPan.y;if(Math.hypot(dx,dy)>5)rankMoved=true;if(rankMoved){rankSurface.setPointerCapture(e.pointerId);const scale=rankSurface.getScreenCTM().a;rankCamera.x=rankPan.vx+dx/scale;rankCamera.y=rankPan.vy+dy/scale;applyRankCamera();}};rankSurface.onpointerup=()=>{rankPan=null;setTimeout(()=>rankMoved=false,0);};rankSurface.onpointercancel=()=>rankPan=null;
window.addEventListener('resize',()=>{if(rankPrimary)fitRanks();});

function rankTool(id){if(id==='fit'){rankCamera.z=1;rankCamera.x=rankCamera.y=0;applyRankCamera();fitRanks();return;}const box=document.querySelector('#rank-canvas').viewBox.baseVal,cx=box.x+box.width/2,cy=box.y+box.height/2,z=Math.max(.3,Math.min(6,rankCamera.z*(id==='plus'?1.3:1/1.3)));rankCamera.x=cx-(cx-rankCamera.x)*z/rankCamera.z;rankCamera.y=cy-(cy-rankCamera.y)*z/rankCamera.z;rankCamera.z=z;applyRankCamera();}
document.addEventListener('click',e=>{if(e.target.id==='close')rankInspectorOpen=false;});document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(rankInspectorOpen)rankInspectorOpen=false;else if(rankPrimary)toggleRankPrimary(false);}});

function markRankGraphOwnership(){const rank=rankSnapshot.ranks[rankFocus],ids=new Set(rank.objects.map(o=>o.id));document.querySelectorAll('#world [data-node]').forEach(el=>{const n=registry[el.dataset.node],expert=el.dataset.node.match(/^moe-e(\d+)/);const related=rankBandFocus==='weights'?(ids.has(n?.objectId)||ids.has(el.dataset.node)||expert&&rank.experts.includes(+expert[1])):rankBandFocus==='gradient'?n?.role==='g':rankBandFocus==='activation'?n?.role==='i':!!el.querySelector('[data-kind=communication]');el.classList.toggle('rank-owned',!!related);el.classList.toggle('rank-context',!related);});}

function updateRankImpact(){
 const root=document.querySelector('#impact');if(!rankPrimary){if(graphImpactMarkup)root.innerHTML=graphImpactMarkup;return;}if(!rankSnapshot?.config.deployed)return;
 const {config:c}=rankSnapshot,r=rankSnapshot.ranks[rankFocus],range=r.tokenRows[0]+'–'+r.tokenRows.at(-1);
 const copy=[
 ['逻辑模型尚未部署','当前展示模型定义，不指定权重和输入的 Rank 归属。','权重 W · 输入 H₀'],
 ['前向读取权重与激活','每个算子从本 Rank 读取权重和输入，生成激活；供反向使用的输入需要保留。','读取 W、X → 产生激活'],
 ['输入梯度传回前层','使用输出梯度与权重转置计算 dX，再沿前向依赖的反方向传播。','dX = dY · Wᵀ'],
 ['参数梯度使用保存的输入','本 Rank 读取前向输入与输出梯度形成 dW；dX 继续传向前层，dW 供参数更新。','dW = Xᵀ · dY'],
 ['TP 组内切分权重',`8 个 Rank 分为 ${c.dp} 组 TP 副本。Rank ${r.id} 持有第 ${r.lane+1}/${c.tp} 份权重，TP 组为 {${r.tpGroup}}。`,`Wqkv [8,${24/c.tp}]\nWproj [${8/c.tp},8]`],
 [c.sp?'SP 按 token 行分片':'边界激活保持完整',c.sp?`Rank ${r.id} 的子层边界持有 token 行 ${range}。AG 收集完整输入，RS 归约并重新分发行。`:'当前配置不切分子层边界 token 行；各 Rank 保留完整边界激活。',c.sp?`本地 [${c.seq},8] ⇄ 完整 [8,8]`:'边界激活 [8,8]'],
 ['反向前取回缓存输入',c.recollect?`Rank ${r.id} 仅保存 token 行 ${range} 的 Xᵣ/Aᵣ；WGRAD 前在 TP 组内 AG 重新收集。`:'本 Rank 保留完整 X/A，WGRAD 直接读取，无需再次收集。',c.recollect?'缓存分片 → AG → WGRAD':'完整缓存 → WGRAD'],
 ['专家池等待部署',`${c.experts} 位专家已定义；此步骤仅展开 MoE 结构，尚未指定专家的 Rank 归属。现有 TP/SP 配置保持不变。`,`待分配 E00–E${c.experts-1}`],
 [`Rank ${r.id} 的专家分片`,`专家副本 ${r.replica} 的组 ${r.group} 承载 E${r.experts[0]}–E${r.experts.at(-1)}；Rank ${r.id} 持有其中第 ${r.lane+1}/${c.tp} 份 TP 权重。`,current===8?moeRoute(parameterState.token,c.experts).chosen.map(e=>{const owner=Math.floor(e/(c.experts/c.ep)),target=(r.replica*c.ep+owner)*c.tp+r.lane;return `t${parameterState.token} → E${e} / R${target}（${owner?'跨组':'本组'}）`;}).join('\n'):'']
 ][current];
 root.innerHTML=`<div class="step-number">${String(current+1).padStart(2,'0')}</div><b>${esc(copy[0])}</b><span>${esc(copy[1])}</span><pre class="stage-formula">${esc(copy[2])}</pre><small>固定 8 个 Rank · 容量未配置${current>=4?' · TP '+c.tp+' · DP '+c.dp:''}${current===8?' · EP '+c.ep:''}</small>`;
}
