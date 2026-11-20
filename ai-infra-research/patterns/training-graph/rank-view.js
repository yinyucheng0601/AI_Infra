// Axis geometry from the local Rank renderer; bands encode logical objects, never GB.
let rankInspectorOpen=false;
let rankPrimary=false,rankFocus=0,rankBandFocus=null,rankSnapshot=null,rankSignature='',graphReturnCamera=null;
const rankCamera={z:1,x:0,y:0};let rankPan=null,rankMoved=false,rankSwapBusy=false;
function rankCube(rank){
 const {P,polygon,block}=window.RankMemoryView.geometry,height=64*6.7;
 let out=polygon([[0,0,0],[245,0,0],[245,155,0],[0,155,0]],'#181818')+polygon([[0,0,0],[245,0,0],[245,0,height],[0,0,height]],'#202020')+polygon([[0,0,0],[0,155,0],[0,155,height],[0,0,height]],'#202020');
 const h=(height-32-(rank.bands.length-1)*14)/rank.bands.length;
 rank.bands.forEach((b,i)=>{const z=16+i*(h+14),a=P(239,142,z+h/2),focused=rank.id===rankFocus&&b.id===rankBandFocus;
 out+=`<g data-rank-band="${b.id}" data-tip="${esc(b.name+' · 点击查看对象与分片')}">${block(z,h,focused?'#eeeeee':b.color)}<text transform="matrix(.8660254 -.5 0 1 ${a[0]} ${a[1]})" fill="${focused?'#111':'#111'}" font-size="17">${esc(b.name)}</text></g>`;});
 out+=`<path d="M${P(0,155,height)} L${P(0,0,height)} L${P(245,0,height)} L${P(245,155,height)} Z M${P(0,155,height)} L${P(0,155,0)} L${P(245,155,0)} L${P(245,0,0)} L${P(245,0,height)} M${P(245,155,height)} L${P(245,155,0)}" fill="none" stroke="#bbb" stroke-width="2"/>`;
 const wall=P(0,140,height);out+=`<g transform="matrix(.8660254 -.5 0 1 ${wall[0]} ${wall[1]-48})"><text fill="#eee" font-size="25">Rank ${rank.id}</text><text y="23" fill="#bbb" font-size="14">TP ${rank.lane}${current===8?' · 专家组 '+rank.group:''}</text></g>`;
 return out;
}
function fitRanks(){const svg=document.querySelector('#rank-canvas');if(!svg||!rankSnapshot)return;const {tp,ep}=rankSnapshot.config,w=Math.max(600,tp*330),h=ep*390+170+(current===7?90:0),sw=innerWidth,sh=innerHeight,scale=Math.min(Math.max(300,sw-(sw>1000?600:60))/w,Math.max(200,sh-270)/h);svg.setAttribute('viewBox',`${(w-sw/scale)/2} ${(h-sh/scale)/2} ${sw/scale} ${sh/scale}`);}
function applyRankCamera(){document.querySelector('#rank-world').setAttribute('transform',`translate(${rankCamera.x} ${rankCamera.y}) scale(${rankCamera.z})`);}
function renderRankView(){
 rankSnapshot=trainingRankState(current,parameterState);if(rankFocus>=rankSnapshot.ranks.length)rankFocus=0;
 const state=rankSnapshot,rank=state.ranks[rankFocus];if(rankBandFocus&&!rank.bands.some(b=>b.id===rankBandFocus))rankBandFocus=rankInspectorOpen?'weights':null;document.querySelector('#graph-return').dataset.label='Rank '+rankFocus+' · 计算图 ↗';
 document.querySelector('#rank-preview').innerHTML=`<svg viewBox="345 222 460 553" aria-hidden="true">${rankCube(rank)}</svg>`;
 document.querySelector('#rank-preview-caption').textContent=`Rank ${rank.id} · ${state.title}`;
 const cfg=state.config,w=Math.max(600,cfg.tp*330),coords=new Map(state.ranks.map(r=>[r.id,{x:(w-cfg.tp*330)/2+r.lane*330,y:75+r.group*390}]));
 let body=`<defs><marker id="rank-route-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="${C.i}"/></marker></defs>`;
 for(let group=0;group<cfg.ep;group++){
 const members=state.ranks.filter(r=>r.group===group),y=75+group*390;
 body+=`<rect x="0" y="${y-35}" width="${w}" height="375" rx="14" fill="#fff" fill-opacity=".035"/>`+text(16,y-12,current===8?`专家组 ${group} · E${members[0].experts[0]}–E${members[0].experts.at(-1)} · 组内 ${cfg.tp} 份 TP 分片`:`${cfg.tp>1?'TP 组':'当前 Block'} · Rank {${members.map(r=>r.id)}}`,'text');
 if(current>=4&&cfg.tp>1){body+=`<path d="M75 ${y+320}H${w-75}" stroke="#aaa" fill="none"/>`+text(w/2,y+345,cfg.sp?'AG / RS · token 行收集与归约分发':'AllReduce(sum) · TP 部分贡献求和','small','middle');}
 }
 for(const r of state.ranks){const p=coords.get(r.id);body+=`<g data-rank-id="${r.id}" class="rank-item" role="button" tabindex="0" aria-label="Rank ${r.id}，TP ${r.lane}，${state.title}" aria-pressed="${r.id===rankFocus}"><svg x="${p.x}" y="${p.y}" width="300" height="290" viewBox="345 222 460 553">${rankCube(r)}</svg>${r.id===rankFocus?`<rect x="${p.x+106}" y="${p.y+287}" width="88" height="26" rx="13" fill="#eee"/>`:''}${text(p.x+150,p.y+305,'Rank '+r.id,'small','middle',r.id===rankFocus?'#111':'#bbb')}</g>`;}
 if(current===7){const y=75+cfg.ep*390;body+=text(w/2,y,`待分配专家池 · ${cfg.experts} experts · Top-2`,'text','middle')+text(w/2,y+28,'本步只展开 MoE 结构，下一步再指定专家归属','small','middle');}
 if(current===8){const lane=rankFocus%cfg.tp,source=coords.get(lane),route=moeRoute(parameterState.token,cfg.experts);route.chosen.forEach((e,i)=>{const owner=Math.floor(e/(cfg.experts/cfg.ep)),target=coords.get(owner*cfg.tp+lane);if(owner===0){body+=text(20,75+cfg.ep*390+i*24,`t${parameterState.token}：R${lane} · 本组 E${e} · 无 EP 搬运`,'small');return;}const x=source.x+275;body+=`<path data-rank-route="${e}" d="M${x} ${source.y+145}H${x+40+i*20}V${target.y+145}H${target.x+275}" fill="none" stroke="${C.i}" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#rank-route-arrow)"/><path data-rank-return="${e}" d="M${target.x+275} ${target.y+170}H${x+55+i*20}V${source.y+170}H${source.x+275}" fill="none" stroke="${C.i}" stroke-width="1.5" stroke-dasharray="3 5" marker-end="url(#rank-route-arrow)"/>`+text(20,75+cfg.ep*390+i*24,`t${parameterState.token}：R${lane} ⇄ R${owner*cfg.tp+lane} · E${e} · α ${route.alpha[i].toFixed(2)}`,'small');});}
 updateGraphSvg(document.querySelector('#rank-world'),'<svg xmlns="http://www.w3.org/2000/svg">'+body+'</svg>');applyRankCamera();
 const signature=[current,cfg.tp,cfg.ep,cfg.sp,cfg.experts,cfg.recollect].join(':');if(signature!==rankSignature){rankCamera.x=rankCamera.y=0;rankCamera.z=1;applyRankCamera();fitRanks();rankSignature=signature;}if(rankInspectorOpen&&rankPrimary){writeTrainingRankPanel();markRankGraphOwnership();}
}
function toggleRankPrimary(value=!rankPrimary){
 if(rankSwapBusy||value===rankPrimary)return;rankSwapBusy=true;
 const graph=document.querySelector('#stage'),surface=document.querySelector('#rank-surface'),a=graph.getBoundingClientRect(),b=surface.getBoundingClientRect();
 if(value)graphReturnCamera={stage:current,signature:rankSignature,view:{...view},box:document.querySelector('#stage>svg').getAttribute('viewBox'),autoLayout};
 rankPrimary=value;document.querySelector('#rank-open').setAttribute('aria-expanded',String(value));document.body.classList.toggle('rank-primary',value);document.querySelector('#rank-open').hidden=value;document.querySelector('#rank-canvas').toggleAttribute('hidden',!value);document.querySelector('#rank-return').hidden=!value;document.querySelector('#graph-return').hidden=!value;fitRanks();
 if(!value){if(rankInspectorOpen){rankInspectorOpen=false;document.querySelector('#panel').hidden=true;}if(graphReturnCamera?.stage===current&&graphReturnCamera.signature===rankSignature){view={...graphReturnCamera.view};autoLayout=graphReturnCamera.autoLayout;document.querySelector('#stage>svg').setAttribute('viewBox',graphReturnCamera.box);apply();}else{autoLayout=true;view={z:1,x:0,y:0};apply();fitStage(false);}}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const animations=reduced?[]:[[graph,a],[surface,b]].map(([el,old])=>{const n=el.getBoundingClientRect();return el.animate([{transformOrigin:'0 0',transform:`translate(${old.left-n.left}px,${old.top-n.top}px) scale(${old.width/n.width},${old.height/n.height})`},{transformOrigin:'0 0',transform:'none'}],{duration:400,easing:'cubic-bezier(.22,1,.36,1)'}).finished.catch(()=>{});});Promise.all(animations).finally(()=>rankSwapBusy=false);
}
function inspectTrainingRank(id,band='weights'){
 rankInspectorOpen=true;rankFocus=id;rankBandFocus=band;renderRankView();markRankGraphOwnership();writeTrainingRankPanel();
}
function writeTrainingRankPanel(){const id=rankFocus,band=rankBandFocus;const r=rankSnapshot.ranks[id],b=r.bands.find(b=>b.id===band)||r.bands[0];
 document.querySelector('#panel').hidden=false;document.querySelector('#ptitle').textContent=`Rank ${id} · ${b.name}`;
 document.querySelector('#pbody').innerHTML=`<p>${esc(b.detail)}</p><p>TP 组：{${r.tpGroup}}${current===8?'；EP 同 lane 通信组：{'+r.epPeers+'}':''}</p>${current===8?`<p>专家 E${r.experts[0]}–E${r.experts.at(-1)} 的 TP 分片 ${r.lane+1}/${rankSnapshot.config.tp}。</p>`:''}`;
}
function linkGraphToRanks(id){rankInspectorOpen=false;const match=id.match(/^moe-e(\d+)/);if(match&&current===8){const group=Math.floor(+match[1]/(graphModel.experts/graphModel.ep));rankFocus=group*graphModel.tp+(rankFocus%graphModel.tp);}rankBandFocus=match||registry[id]?.role==='w'||/param|weight/.test(id)?'weights':registry[id]?.role==='g'||/dw|wgrad|full-w-|full-b-|model-back-/.test(id)?'gradient':/cache|ag|rs/.test(id)?'communication':'activation';renderRankView();}
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
