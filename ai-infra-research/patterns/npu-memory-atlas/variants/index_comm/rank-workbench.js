/* rank-intro step 10 capabilities hosted by the existing atlas controls.
 * Source reference: rank-intro-config-preview.js (2026-10-10).
 * Layout/selection are independent from projection and the teaching clock.
 */
(function(){
 'use strict';
 const M=RankAtlasModel;
 const state={layout:'space',grain:'layer',layer:null,op:null,expert:null,query:false,graphScene:false,inspect:false,showTP:true,showLayer:true,heat:false,space:null,flat:{zoom:1,x:0,y:0},hits:[],draft:null,repair:null};
 const legacy={render,transform,fitCanvas,changeZoom,setAtlasMode,switchScope,renderShardInspector,shardSpec,shardOwnership,simulationState};
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>n<.01?(n*1000).toFixed(2)+' MB':n.toFixed(2)+' GB';
 const icon=paths=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round">${paths}</svg>`;
 const icons={cube:icon('<path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10 9-5M12 12 3 7m9 5v10"/>'),top:icon('<path d="M3 4h18v16H3Z M3 8h18"/><path d="m8 14 4-3 4 3"/>'),front:icon('<path d="M4 4h16v16H4Z M4 15h16"/>'),side:icon('<path d="M4 4h16v16H4Z M10 4v16"/>'),stage:icon('<rect x="3" y="4" width="7" height="16"/><rect x="14" y="4" width="7" height="16"/>'),layer:icon('<path d="M3 4h18v16H3Z M9 4v16m6-16v16M3 12h18"/>')};
 icons.cubes=icon('<g transform="translate(1 1) scale(.58)"><path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10 9-5M12 12 3 7m9 5v10"/></g><g transform="translate(9 9) scale(.58)"><path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10 9-5M12 12 3 7m9 5v10"/></g>');
 function add(tag,id,attrs={}){const e=document.createElement(tag);e.id=id;Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));document.body.append(e);return e;}
 const stage=add('div','flat-stage',{hidden:'',role:'region','aria-label':'Rank × Layer 展平矩阵'});stage.innerHTML='<canvas id="flat-canvas" tabindex="0" aria-label="Rank × Layer 矩阵，方向键选择，Enter 查看详情"></canvas>';
 const flatHelp=add('div','flat-help',{hidden:''});
 const canvas=$('flat-canvas'),ctx=canvas.getContext('2d');
 let visibleExecution=false;
 window.rankAtlasPlaybackRate=()=>state.layout==='flat'&&canvas.dataset.detailTier==='3'&&visibleExecution?.005:1;
 const context=add('div','flat-context',{hidden:'','aria-live':'polite'}),hover=add('div','flat-hover',{hidden:''}),tooltip=add('div','workbench-tooltip',{hidden:'',role:'tooltip'});
 const query=add('aside','graph-query',{hidden:'','aria-label':'计算图与专家查询'});
 query.innerHTML='<header><strong>计算图</strong><button type="button" data-close-query aria-label="关闭计算图">×</button></header><label for="query-op">查找算子或专家</label><input id="query-op" type="search" placeholder="RMSNorm / Combine / E24"><label for="query-layer">查看范围</label><select id="query-layer"></select><div id="operator-path" class="operator-path"></div><p class="config-note" id="query-note"></p>';
 const graphButton=document.createElement('button');graphButton.id='graph-mode';graphButton.type='button';graphButton.textContent='计算图';graphButton.setAttribute('aria-pressed','false');$('ep-oom-mode').after(graphButton);
 const orbit=document.querySelector('.view-dial');orbit.id='rank-view-dial';orbit.innerHTML='<div class="view-orbit"></div><button id="cycle-view" type="button" aria-label="切换3D / 2D" data-wb-tip="切换3D / 2D"></button>'+[0,1,2,3].map(i=>`<button class="dial-port" type="button" data-slot="${i}"></button>`).join('')+'<span id="view-name" class="dial-name" aria-live="polite"></span>';
 function dial(){
  orbit.dataset.layout=state.layout;const flat=state.layout==='flat';
  const centerIcon=flat?'layer':'cube';
  if($('cycle-view').dataset.icon!==centerIcon){$('cycle-view').innerHTML=icons[centerIcon];$('cycle-view').dataset.icon=centerIcon;}
  $('cycle-view').setAttribute('aria-pressed',String(flat));
  const names=flat?['PP Stage','Layer']:['立体视图','顶视图','正视图','侧视图'];
  const keys=flat?['stage','layer']:[scope==='all'?'cubes':'cube','top','front','side'];
  orbit.querySelectorAll('.dial-port').forEach((b,i)=>{b.hidden=i>=names.length;const key=keys[i]||'';if(b.dataset.icon!==key){b.innerHTML=icons[key]||'';b.dataset.icon=key;}b.setAttribute('aria-label',flat?(i?'展开 Layer':'聚合 PP Stage'):(names[i]||''));if(!flat&&i===0)b.setAttribute('aria-label',scope==='all'?'切换到单 Rank':'切换到全部 Rank');b.dataset.wbTip=!flat&&i===0?b.getAttribute('aria-label')+' · 立体视图':b.getAttribute('aria-label');b.setAttribute('aria-pressed',String(flat?(i===0?state.grain==='stage':state.grain==='layer'):viewMode===viewModes[i]));});
  $('view-name').textContent=flat?(state.grain==='layer'?'Layer':'PP Stage'):viewMode;
 }
 const viewScope=add('div','view-scope',{'aria-label':'Cube 观察范围'});document.querySelector('.scope-switch').hidden=true;viewScope.append($('rank'));
 syncViewDial=dial;
 function tip(e){
  const b=e.target.closest('[data-wb-tip]');if(!b)return;
  tooltip.textContent=b.dataset.wbTip;tooltip.hidden=false;
  const t=tooltip.getBoundingClientRect(),pointer=e.type.startsWith('pointer');
  const r=pointer?null:b.getBoundingClientRect();
  const x=pointer?e.clientX+14:r.left+r.width/2-t.width/2;
  const y=pointer?e.clientY+18:r.bottom+8;
  tooltip.style.left=Math.max(8,Math.min(innerWidth-t.width-8,x))+'px';
  tooltip.style.top=Math.max(8,y+t.height>innerHeight-8?(pointer?e.clientY:r.top)-t.height-10:y)+'px';
 }
 const sceneTips={'[data-mode=explode]':'显存构成 · 立体 / 展开','[data-mode=shard]':'参数分布 · 立体 / 展开','[data-mode=comm]':'Token 分发与回收 · 顶视图','#ep-oom-mode':'显存溢出 · 正视图','#graph-mode':'算子与专家 · 展开视图'};
 for(const [selector,text] of Object.entries(sceneTips))document.querySelector(selector).dataset.wbTip=text;
 for(const host of [orbit,$('ep-dock')]){host.addEventListener('pointerover',tip);host.addEventListener('pointermove',tip);host.addEventListener('focusin',tip);host.addEventListener('pointerout',()=>tooltip.hidden=true);host.addEventListener('focusout',()=>tooltip.hidden=true);host.addEventListener('click',()=>tooltip.hidden=true);}
 $('cycle-view').onclick=()=>setLayout(state.layout==='space'?'flat':'space');
 orbit.querySelectorAll('.dial-port').forEach((b,i)=>b.onclick=()=>{if(state.layout==='flat'){state.grain=i===0?'stage':'layer';render();}else if(i===0){const next=scope==='all'?'single':'all';if(mode==='comm')setAtlasMode('explode');viewMode='2.5D';epIncidentActive=false;switchScope(next);fitCanvas();}else{if(mode==='comm'&&i!==1&&i!==2)legacy.setAtlasMode('explode');viewMode=viewModes[i];epIncidentActive=false;dial();fitCanvas();}tooltip.hidden=true;});

 // Single configuration ledger: all views read the same model and runtime state.
 baseGroups.splice(0,baseGroups.length,...M.groups(0,atlasConfig));
 makeRanks=()=>Array.from({length:worldSize},(_,i)=>M.rank(i,atlasConfig));
 rankGroups=id=>M.groups(id,atlasConfig);
 moduleOrder.splice(0,moduleOrder.length,5,7,0,1,2,7,8,3,4,9,10,7,6);
 ranks=makeRanks();params=ranks.map(r=>M.parameters(r.id,atlasConfig));rankReserved=params.map(n=>n*16/1e9+M.activation(atlasConfig)+BASE_RESERVE);
 simulationState=(t,id=renderRank)=>ATLAS_EMBED&&atlasHostState?legacy.simulationState(t,id):M.memory(id,atlasConfig,t);
 applySimulation=function(){
  const st=simulationState(simTime),mem=M.memory(renderRank,atlasConfig,simTime);
  cats.forEach((c,i)=>{c.value=mem.values[i];});
  if(ATLAS_EMBED&&atlasHostState){cats[1].value=st.gradient;cats[3].value=st.activation;cats[4].value=st.workspace;cats[5].value=st.communication;cats[6].value=Math.max(0,mem.total-cats.slice(0,6).reduce((a,c)=>a+c.value,0));cats[7].value=Math.max(0,HBM-cats.slice(0,7).reduce((a,c)=>a+c.value,0));}
  cats[6].sub='进程预留；已释放空间可复用';cats[7].sub=mem.overflow?'容量不足 '+fmt(mem.overflow):'容量减去进程预留';
  if(mode==='comm'&&viewMode==='Front'&&epIncidentActive&&renderRank===relationRank){const fault=incidentAt();cats[5].value=fault.usedBytes/1e9;const live=cats.slice(0,6).reduce((n,c)=>n+c.value,0);cats[6].value=Math.max(0,HBM-fault.freeBytes/1e9-live);cats[7].value=fault.freeBytes/1e9;}
  $('phase').textContent=`Step ${step} · ${st.phase} · μb ${st.mb}/${MICROBATCHES}`+(st.layer===null?'':` · L${st.layer}`);
  $('phase').title=st.detail;$('timeline').value=mode==='comm'?Math.round(epEventAt(simTime,relationRank).frame.t*1000):Math.round(simTime);
  $('play').dataset.playing=String(playing);$('play').setAttribute('aria-label',playing?'暂停':'播放');$('play').title=playing?'暂停':'播放';
 };
 shardOwnership=function(index,id=renderRank){if(index<9)return legacy.shardOwnership(index,id);const r=ranks[id],[lo,hi]=M.bounds(id,atlasConfig);return {present:rankGroups(id)[index][2]>0,expert:false,layers:`L${lo}–${hi-1}`,axis:`TP${TP} 分片`,replica:`DP${r.dpIndex}`,identity:`L${lo}–${hi-1} · ${baseGroups[index][0]} · TP${r.tp}`,key:`${r.pp}:${index}:${r.tp}`};};
 shardSpec=function(index,id=renderRank){
  if(index<9){const spec=legacy.shardSpec(index,id),[lo,hi]=M.bounds(id,atlasConfig),dense=Math.max(0,Math.min(hi,atlasConfig.dense)-lo),moe=hi-lo-dense;if(index===3||index===4)spec.copies=moe*EXPERTS/EP;if(index===8)spec.copies=moe;return spec;}
  const owner=shardOwnership(index,id),[lo,hi]=M.bounds(id,atlasConfig),dense=Math.max(0,Math.min(hi,atlasConfig.dense)-lo),copies=index===9?(hi-lo-dense)*atlasConfig.shared:dense;
  return {index,id,local:rankGroups(id)[index][2],owner,rule:`FFN 三矩阵 · TP${TP} 分片`,axis:'columns',parts:TP,part:ranks[id].tp,full:`3 × ${H} × ${I}`,shape:`3 × ${H} × ${I/TP}`,copies,unit:index===9?'层 × 共享专家':'Dense 层',fraction:1/TP,identity:owner.identity,replicas:M.dpReplica(atlasConfig)*atlasConfig.cp,scope:'共享 / Dense FFN 按 TP 分片，ETP 仅作用于 routed experts。'};
 };

 // Extend the original configuration popover; preserve its display controls.
 const configHost=$('parallel-config');
 const fields=(items)=>'<div class="config-grid">'+items.map(([k,label,min,max])=>`<div class="rank-spacing-row"><label for="cfg-${k}">${label}</label><input id="cfg-${k}" type="number" min="${min}" max="${max}" step="1" value="${atlasConfig[k]}"></div>`).join('')+'</div>';
 configHost.innerHTML='<legend>配置 · 模型与训练</legend><span id="config" class="readout"></span><div class="config-section"><h3>并行与集群</h3>'+fields([['tp','TP',1,8],['pp','PP',1,128],['dp','DP',1,2048],['ep','EP',1,128],['cp','CP',1,128],['node','每节点卡数',1,64]])+'<div class="config-grid"><div><label for="cfg-mode">EP 口径</label><select id="cfg-mode"><option value="split">切出 · EP 折入 DP</option><option value="ortho">正交 · EP 独立</option></select></div><div><label for="cfg-world">World Size</label><output id="cfg-world"></output></div></div></div><div class="config-section"><h3>模型结构 · H4096 / FFN2048 / ETP1</h3>'+fields([['layers','总层数',1,128],['dense','前置 Dense 层',0,128],['experts','路由专家数',1,128],['shared','共享专家数',0,16],['topk','Top-K',1,128]])+'</div><div class="config-section"><h3>训练与容量</h3>'+fields([['mbs','Micro Batch',1,32],['seq','Sequence Length',1,262144],['ga','梯度累积',1,64]])+'<div class="config-grid"><div><label for="cfg-hbm">卡型号 / 容量</label><select id="cfg-hbm"><option value="32">昇腾 910 · 32 GB</option><option value="64" selected>昇腾 910B · 64 GB</option><option value="128">昇腾 950PR · 128 GB</option></select></div><div><label for="cfg-batch">Global Batch</label><output id="cfg-batch"></output></div></div></div><p class="config-note">GB = 10⁹ bytes。ETP=1，ZeRO 关闭。</p><button id="apply-config" type="button">应用配置</button><p id="config-status" role="status" aria-live="polite"></p><div class="config-actions"><button id="config-repair" type="button" hidden>应用联动方案</button><button id="config-allow-oom" type="button" hidden>应用并观察超容量</button><button id="config-cancel" type="button">取消修改</button></div>';
 const spatialSettings=document.createElement('section');spatialSettings.id='spatial-settings';while(configHost.nextSibling)spatialSettings.append(configHost.nextSibling);configHost.after(spatialSettings);
 const display=document.createElement('section');display.className='config-section';display.innerHTML='<div id="flat-display-settings"><h3>展平显示</h3><div class="config-checks"><label><input id="flat-tp" type="checkbox" checked>TP 标注</label><label><input id="flat-layer-label" type="checkbox" checked>Layer 标注</label><label><input id="flat-heat" type="checkbox">内存观测</label></div></div><h3>定位</h3><div class="query-locations"><div><label for="locate-rank">Rank</label><input id="locate-rank" type="number" min="0" value="23"></div><div><label for="locate-layer">Layer</label><input id="locate-layer" type="number" min="0" value="7"></div></div><button id="locate-apply" type="button">定位 Rank × Layer</button>';$('rank-settings-panel').append(display);
 configValues=()=>{const c={};for(const k of Object.keys(M.baseline))c[k]=k==='mode'?$('cfg-'+k).value:Number($('cfg-'+k).value);return c;};
 function syncDraft(){const c=configValues();$('cfg-world').textContent=Number.isFinite(M.world(c))?M.world(c):'—';$('cfg-batch').textContent=Number.isFinite(c.mbs*M.dpReplica(c)*c.ga)?c.mbs*M.dpReplica(c)*c.ga:'—';state.draft=c;state.repair=null;$('config-repair').hidden=true;$('config-allow-oom').hidden=true;}
 function fillConfig(){for(const [k,v] of Object.entries(atlasConfig))$('cfg-'+k).value=String(v);syncDraft();$('config').textContent=`${worldSize} Rank · TP${TP} / PP${PP} / DP${atlasConfig.dp} / EP${EP} / CP${atlasConfig.cp}`;$('config-status').textContent='';$('config-status').dataset.state='';configHost.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));}
 configHost.addEventListener('input',syncDraft);configHost.addEventListener('change',e=>{if(e.target.id==='cfg-mode'){const c=configValues(),previous=state.draft?.mode||atlasConfig.mode;const oldDP=Number($('cfg-dp').value);$('cfg-dp').value=previous==='split'?oldDP/c.ep:oldDP*c.ep;}syncDraft();});
 // Keep the pre-change mode while the select's input event is dispatched.
 $('cfg-mode').addEventListener('input',e=>e.stopPropagation());
 function reportConfig(c){const check=M.validate(c);configHost.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));check.bad.forEach(k=>$('cfg-'+k)?.setAttribute('aria-invalid','true'));const peak=check.ok?M.peak(c):null;$('config-status').dataset.state='error';state.repair=M.repair(c);$('config-repair').hidden=!state.repair;$('config-allow-oom').hidden=!check.ok||peak<=c.hbm;$('config-status').textContent=check.ok?`预计峰值 ${fmt(peak)}，超过 ${c.hbm} GB。当前画面仍使用已应用配置。`:check.errors.join('；')+'。当前画面仍使用已应用配置。';if(state.repair)$('config-status').textContent+=` 联动建议：EP ${state.repair.ep}、PP ${state.repair.pp}，${M.world(state.repair)} Rank，预计 ${fmt(M.peak(state.repair))}/卡。`;}
 function commit(c,allowOverflow=false){
  const check=M.validate(c);if(!check.ok||(!allowOverflow&&M.peak(c)>c.hbm)){reportConfig(c);return false;}
  if(mode==='comm')legacy.setAtlasMode('explode');
  atlasConfig={...c};({tp:TP,pp:PP,ep:EP,layers:L,experts:EXPERTS,ga:MICROBATCHES,hbm:HBM,node:cardsPerNode}=c);DP=M.lanes(c);worldSize=M.world(c);PEAK_ACT=M.activation(c);CYCLE_MS=c.ga*3500+3000;
  ranks=makeRanks();params=ranks.map(r=>M.parameters(r.id,c));rankReserved=params.map(n=>n*16/1e9+PEAK_ACT+BASE_RESERVE);epEventCache.clear();selectedRank=Math.min(selectedRank,worldSize-1);relationRank=relationRank===null?null:Math.min(relationRank,worldSize-1);state.layer=null;state.op=null;state.expert=null;state.space=null;simTime=0;lastFrame=null;
  $('rank').innerHTML=ranks.map(r=>`<option value="${r.id}">R${r.id}</option>`).join('');$('tensor-list').innerHTML=baseGroups.map((g,i)=>`<button role="option" tabindex="-1" data-index="${i}" aria-selected="false">${esc(g[0])}</button>`).join('');
  $('timeline').max=String(CYCLE_MS);$('locate-rank').max=String(worldSize-1);$('locate-layer').max=String(L-1);document.title=worldSize+' Rank · 内存与通信';fillConfig();setSettingsOpen(false);rebuildQuery();fitCanvas();return true;
 }
 applyParallelConfig=()=>commit(configValues());$('apply-config').onclick=applyParallelConfig;$('config-repair').onclick=()=>{if(state.repair)commit(state.repair);};$('config-allow-oom').onclick=()=>commit(configValues(),true);$('config-cancel').onclick=fillConfig;
 $('flat-tp').onchange=e=>{state.showTP=e.target.checked;render();};$('flat-layer-label').onchange=e=>{state.showLayer=e.target.checked;render();};$('flat-heat').onchange=e=>{state.heat=e.target.checked;render();};
 $('locate-apply').onclick=()=>{const r=Number($('locate-rank').value),l=Number($('locate-layer').value);if(!Number.isInteger(r)||!ranks[r]||!Number.isInteger(l)||l<0||l>=L){$('config-status').textContent='请输入范围内的 Rank 与 Layer。';return;}const [lo,hi]=M.bounds(r,atlasConfig);if(l<lo||l>=hi){$('config-status').textContent=`R${r} 只持有 L${lo}–L${hi-1}，请调整 Layer。`;return;}selectedRank=r;relationRank=r;state.layer=l;state.op=null;state.expert=null;state.inspect=true;setSettingsOpen(false);setLayout('flat');render();};
 fillConfig();
 const originalSettings=setSettingsOpen;setSettingsOpen=function(open){if(open){state.query=false;state.inspect=false;shardInfoOpen=false;syncShell();renderInspector();}originalSettings(open);};

 function setLayout(next){
  if(next===state.layout)return;
  if(next==='flat'){
   if(mode==='comm')legacy.setAtlasMode('explode');
   state.space={viewMode,scope,zoom,pan:[...pan]};scope='all';state.layout='flat';if(state.layer!==null){const [lo,hi]=M.bounds(selectedRank,atlasConfig);if(state.layer<lo||state.layer>=hi)state.layer=null;}
  }else{state.layout='space';state.graphScene=false;if(state.space){({viewMode,scope,zoom}=state.space);pan=[...state.space.pan];}state.query=false;}
  tooltip.hidden=true;hover.hidden=true;syncShell();dial();render();
  if(next==='flat'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)canvas.animate([{transform:'translateY(14px) scale(.985)'},{transform:'translateY(0) scale(1)'}],{duration:280,easing:'ease-out'});
 }
 function syncShell(){const flat=state.layout==='flat';$('memory-legend').hidden=flat||!labels;viewScope.hidden=flat;spatialSettings.hidden=flat;$('flat-display-settings').hidden=!flat;$('flat-heat').closest('label').hidden=true;document.body.dataset.layout=state.layout;document.body.dataset.query=String(state.query);stage.hidden=!flat;flatHelp.hidden=!flat;context.hidden=!flat;query.hidden=!state.query;syncSceneButtons();}
 function syncSceneButtons(){
  const oom=mode==='comm'&&viewMode==='Front'&&epIncidentActive;
  graphButton.setAttribute('aria-pressed',String(state.graphScene));
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(!state.graphScene&&!oom&&b.dataset.mode===mode)));
  $('ep-oom-mode').setAttribute('aria-pressed',String(!state.graphScene&&oom));
 }
 setAtlasMode=function(next){state.graphScene=false;state.query=false;if(next==='comm'){if(state.layout==='flat')setLayout('space');state.inspect=false;state.query=false;if(atlasConfig.layers===atlasConfig.dense){$('phase').textContent='当前为全 Dense 模型，没有 EP 专家通信。';return;}if(atlasConfig.seq/atlasConfig.cp*atlasConfig.mbs*EXPERTS*EP>16777216){setSettingsOpen(true);$('config-status').textContent='当前精确 token 路由规模过大。请缩小 Sequence / Micro Batch / EP 后查看逐 token 动画；配置与显存视图不受影响。';return;}}
  if(state.layout==='flat'&&next!=='comm'){setLayout('space');}legacy.setAtlasMode(next);syncShell();};
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setAtlasMode(b.dataset.mode));
 const oomClick=$('ep-oom-mode').onclick;$('ep-oom-mode').onclick=()=>{setAtlasMode('comm');if(mode!=='comm')return;state.inspect=false;oomClick();dial();};
 switchScope=function(next){if(state.layout==='flat'){scope=next;render();}else legacy.switchScope(next);};$('single').onclick=()=>switchScope('single');$('all').onclick=()=>switchScope('all');
 transform=function(){if(state.layout==='flat')drawFlat();else legacy.transform();};
 changeZoom=function(factor){if(state.layout==='flat'){zoomFlat(factor);}else legacy.changeZoom(factor);};
 fitCanvas=function(){if(state.layout==='flat'){state.flat={zoom:1,x:0,y:0};render();}else legacy.fitCanvas();};$('plus').onclick=()=>changeZoom(1.25);$('minus').onclick=()=>changeZoom(.8);$('fit').onclick=fitCanvas;

 function zoomFlat(factor,ax,ay){
  const b=stage.getBoundingClientRect();ax=ax??b.width/2;ay=ay??b.height/2;
  const before=state.flat.zoom,next=Math.max(.3,Math.min(80,before*factor)),ratio=next/before;
  state.flat.x=(ax-b.width/2)*(1-ratio)+state.flat.x*ratio;
  state.flat.y=(ay-b.height/2)*(1-ratio)+state.flat.y*ratio;
  state.flat.zoom=next;hover.hidden=true;drawFlat();
 }
 // Parameter-backed categories share the same accounting in the grid and inspector.
 function operatorParams(op,local,expert=state.expert){
  if(!op||op.group===null)return 0;
  if(['norm1','norm2','finalnorm'].includes(op.id))return H;
  if(op.id==='experts')return (local[3][2]+local[4][2])/(expert===null?1:EXPERTS/EP);
  return local[op.group][2];
 }
 function parameterMemory(p,id){const mem=M.memory(id,atlasConfig,simTime);return [p*2/1e9,params[id]?mem.values[1]*p/params[id]:0,p*12/1e9];}
 // Screen-space thresholds keep labels legible independently of topology size.
 function drawCellDetail(x,y,w,h,id,layer,ink,muted,soft){
  if(layer===null||Math.round(state.flat.zoom*100)<=100||w<48||h<54)return 1;
  const dense=layer<atlasConfig.dense,run=M.execution(id,atlasConfig,simTime),running=run.layer===layer&&run.keys.length>0;
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  ctx.fillStyle=soft;ctx.fillRect(x+1,y+1,w-2,h-2);

  ctx.textAlign='center';ctx.fillStyle=ink;ctx.font='10px ui-monospace, monospace';
  ctx.fillText(`R${id} · L${layer}${running&&w>230?" · "+run.label:""}`,x+w/2,y+12,w-8);
  const detail=w>=132&&h>=278;
  if(running){visibleExecution=true;canvas.dataset.execution=`R${id} L${layer} · ${run.label} · ${run.keys.join(' / ')}`;}
  const nodes=detail?[['norm1'],['q','kv'],['attention'],['out'],['residual1'],['norm2'],...(dense?[['dense']]:[['router'],['dispatch'],['experts',...(atlasConfig.shared?['shared']:[])],['combine']]),['residual2']]:[];
  if(!detail){
   ctx.strokeStyle=muted;ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(x+5,y+h*.52);ctx.lineTo(x+w-5,y+h*.52);ctx.stroke();
   if(running){const attention=run.keys.some(k=>['norm1','q','kv','attention','out','residual1'].includes(k));ctx.fillStyle=ink;ctx.beginPath();ctx.arc(x+6,y+h*(attention?.34:.76),2.5,0,Math.PI*2);ctx.fill();}
   ctx.font=`${w<78?8:11}px Arial`;ctx.fillText(w<78?'Attn':'Attention',x+w/2,y+h*.34);ctx.fillText(dense?'Dense':'MoE',x+w/2,y+h*.76);
  }else{
   const step=(h-30)/nodes.length;
   nodes.forEach((keys,i)=>{const ny=y+25+i*step,nh=step-6,nw=(w-16-(keys.length-1)*4)/keys.length;
    keys.forEach((key,j)=>{const op=ops.find(o=>o.id===key),nx=x+8+j*(nw+4),active=state.op===key&&selectedRank===id&&state.layer===layer;
     const executing=running&&run.keys.includes(key);
     ctx.fillStyle=executing?'#fff':soft;ctx.fillRect(nx,ny,nw,nh);ctx.strokeStyle=active?ink:muted;ctx.lineWidth=active?2:.6;ctx.strokeRect(nx,ny,nw,nh);
     ctx.fillStyle=executing?'#000':ink;ctx.font='12px Arial';const name=key==='q'?'Q':key==='kv'?'K / V':key==='shared'?'Shared FFN':op.name;ctx.fillText(name,nx+nw/2,ny+nh/2,nw-6);
     state.hits.push({x:nx,y:ny,w:nw,h:nh,id,layer,op:key});
    });
    if(i<nodes.length-1){ctx.strokeStyle=muted;ctx.beginPath();ctx.moveTo(x+w/2,ny+nh);ctx.lineTo(x+w/2,ny+step);ctx.stroke();}
   });
  }
  ctx.restore();return detail?3:2;
 }
 function drawFlat(){
  if(state.layout!=='flat')return;
  const box=stage.getBoundingClientRect(),w=box.width,h=box.height;if(w<1||h<1)return;
  const dpr=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const style=getComputedStyle(document.documentElement),ink=style.getPropertyValue('--wb-fg').trim(),muted=style.getPropertyValue('--wb-muted').trim(),soft=style.getPropertyValue('--wb-soft').trim();
  const perStage=TP*DP,rows=scope==='single'?1:perStage,span=L/PP;
  // Layer tiles follow the reference: width : height = 1 : 4.
  // Rank padding (6px) and row gap (4px) sit outside that ratio.
  const bw=(w-156)/PP*state.flat.zoom,tileWidth=Math.max(1,(bw-16)/span-3),rh=tileWidth*4+10,x0=(w-PP*bw)/2+state.flat.x,y0=(h-rows*rh)/2+state.flat.y;
  canvas.dataset.layerTileWidth=String(tileWidth);canvas.dataset.layerTileHeight=String(tileWidth*4);
  const selected=ranks[selectedRank],rowSelected=selectedRank%perStage;
  state.hits=[];visibleExecution=false;canvas.dataset.execution='';let maxTier=1;
  ctx.textBaseline='middle';
  for(let pp=0;pp<PP;pp++){
   if(scope==='single'&&pp!==selected.pp)continue;
   const gx=x0+pp*bw+4,gw=bw-8;if(gx+gw<0||gx>w)continue;
   ctx.font='11px ui-monospace,monospace';ctx.textAlign='center';ctx.fillStyle=muted;
   if(labels)ctx.fillText(`PP${pp} · L${pp*span}–${(pp+1)*span-1}`,gx+gw/2,y0-30);
   const cw=(gw-8)/span;
   if(labels&&state.showLayer&&state.grain==='layer')for(let l=0;l<span;l++)if(l%Math.max(1,Math.ceil(32/cw))===0)ctx.fillText('L'+(pp*span+l),gx+4+(l+.5)*cw,y0-14);
   for(let row=0;row<rows;row++){
    const id=pp*perStage+(scope==='single'?rowSelected:row),gy=y0+row*rh+2,gh=rh-4;if(gy+gh<0||gy>h)continue;
    const run=M.execution(id,atlasConfig,simTime),chosen=id===selectedRank;
    ctx.strokeStyle=chosen?ink:'#388d7b';ctx.lineWidth=chosen&&state.layer===null?1.5:.6;ctx.strokeRect(gx,gy,gw,gh);
    let groupTier=1;
    if(state.grain==='layer')for(let l=0;l<span;l++){
     const layer=pp*span+l,x=gx+5+l*cw,y=gy+3,cw2=Math.max(1,cw-3),ch=Math.max(1,gh-6);if(x+cw2<0||x>w)continue;
     const executing=run.layer===layer;
     ctx.fillStyle=executing?'#c17df3':document.documentElement.dataset.theme==='light'?'#d8d8d8':'#383838';ctx.fillRect(x,y,cw2,ch);
     const tier=drawCellDetail(x,y,cw2,ch,id,layer,ink,muted,soft);maxTier=Math.max(maxTier,tier);groupTier=Math.max(groupTier,tier);
     if(tier===1&&labels&&ch>32&&cw2>28){ctx.font='10px ui-monospace,monospace';ctx.textAlign='center';ctx.fillStyle=executing?'#151515':muted;ctx.fillText('L'+layer,x+cw2/2,y+9);}
     if(executing&&tier>1){ctx.fillStyle='#c17df3';ctx.fillRect(x,y,3,ch);}
     if(chosen&&state.layer===layer){ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.strokeRect(x+.5,y+.5,cw2-1,ch-1);}
     state.hits.push({x,y,w:cw2,h:ch,id,layer});
    }
    if(labels&&groupTier===1&&gh>24){ctx.fillStyle=chosen?ink:'#48b99d';ctx.font=`${Math.min(26,Math.max(16,gh*.22))}px ui-monospace,monospace`;ctx.textAlign='center';const left=Math.max(8,gx),right=Math.min(w-8,gx+gw);ctx.fillText('R'+id,(left+right)/2,gy+gh/2);}
    if(groupTier>1&&labels){ctx.fillStyle=muted;ctx.font='10px ui-monospace,monospace';ctx.textAlign='left';ctx.fillText('R'+id,Math.max(8,gx+5),gy-5);}
    state.hits.push({x:gx,y:gy,w:gw,h:gh,id,layer:null});
   }
  }
  canvas.dataset.detailTier=String(maxTier);canvas.dataset.gridCenter=String(box.left+x0+PP*bw/2);canvas.setAttribute('aria-label',`Rank × Layer · ${['','分布','模块','算子'][maxTier]} · ${canvas.dataset.execution}`);
  ctx.font='11px ui-monospace,monospace';ctx.textAlign='right';
  if(labels)for(let row=0;row<rows;row+=Math.max(1,Math.ceil(17/rh))){const y=y0+(row+.5)*rh;if(y<0||y>h)continue;const r=ranks[selected.pp*perStage+(scope==='single'?rowSelected:row)];ctx.fillStyle=r.id===selectedRank?ink:muted;ctx.fillText(state.showTP?`D${r.dpIndex}${atlasConfig.cp>1?' C'+r.cp:''} T${r.tp}`:'R'+r.id,x0-10,y);}
  flatHelp.textContent='大框：Rank · 灰格：Layer · 紫色：当前层 · 白底：当前算子 · 白框：选中'+(maxTier===3&&visibleExecution?' · 细节慢放':'');
  $('zoom').textContent=Math.round(state.flat.zoom*100)+'%';
 }
 function hit(e){const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;return state.hits.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);}
 function selectCell(h){if(h.op){selectedRank=h.id;state.layer=h.layer;selectOperator(ops.find(o=>o.id===h.op));return;}state.op=null;state.expert=null;selectedRank=h.id;relationRank=h.id;state.layer=h.layer;state.inspect=true;const [lo,hi]=M.bounds(h.id,atlasConfig);if(state.layer!==null&&(state.layer<lo||state.layer>=hi))state.layer=null;rebuildQuery();render();}
 let drag=null;
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,fx:state.flat.x,fy:state.flat.y,moved:false};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(drag){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4)drag.moved=true;if(drag.moved){state.flat.x=drag.fx+e.clientX-drag.x;state.flat.y=drag.fy+e.clientY-drag.y;hover.hidden=true;drawFlat();}return;}const h=hit(e);hover.hidden=!h;if(h){const mem=M.memory(h.id,atlasConfig,simTime);hover.textContent=`R${h.id}${h.layer===null?' · L'+M.bounds(h.id,atlasConfig)[0]+'–L'+(M.bounds(h.id,atlasConfig)[1]-1):' × L'+h.layer}${h.op?' · '+ops.find(o=>o.id===h.op).name:''} · PP${ranks[h.id].pp} · ${mem.phase}`;hover.style.left=Math.max(8,Math.min(innerWidth-hover.offsetWidth-8,e.clientX+12))+'px';hover.style.top=Math.max(8,Math.min(innerHeight-hover.offsetHeight-8,e.clientY+16))+'px';}});
 canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const h=hit(e);if(h)selectCell(h);}drag=null;});canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('pointerleave',()=>hover.hidden=true);
 canvas.addEventListener('wheel',e=>{e.preventDefault();const b=canvas.getBoundingClientRect();zoomFlat(Math.exp(-e.deltaY*.002),e.clientX-b.left,e.clientY-b.top);},{passive:false});
 let pinch=null;
 canvas.addEventListener('touchstart',e=>{if(e.touches.length===2){e.preventDefault();drag=null;const [a,b]=e.touches;pinch={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2};}},{passive:false});
 canvas.addEventListener('touchmove',e=>{if(!pinch||e.touches.length!==2)return;e.preventDefault();const [a,b]=e.touches,distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),x=(a.clientX+b.clientX)/2,y=(a.clientY+b.clientY)/2,box=canvas.getBoundingClientRect();zoomFlat(distance/Math.max(1,pinch.distance),pinch.x-box.left,pinch.y-box.top);state.flat.x+=x-pinch.x;state.flat.y+=y-pinch.y;pinch={distance,x,y};drawFlat();},{passive:false});
 canvas.addEventListener('touchend',()=>{pinch=null;drag=null;});
 canvas.addEventListener('keydown',e=>{if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')fitCanvas();else zoomFlat(e.key==='-'?.8:1.25);return;}const [lo,hi]=M.bounds(selectedRank,atlasConfig);if(e.key==='Enter'){state.inspect=true;render();return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowUp'||e.key==='ArrowDown')selectedRank=Math.max(0,Math.min(worldSize-1,selectedRank+(e.key==='ArrowUp'?-1:1)));else state.layer=Math.max(lo,Math.min(hi-1,(state.layer??lo)+(e.key==='ArrowLeft'?-1:1)));const [a,b]=M.bounds(selectedRank,atlasConfig);if(state.layer!==null)state.layer=Math.max(a,Math.min(b-1,state.layer));relationRank=selectedRank;state.inspect=true;rebuildQuery();render();});

 const ops=[{id:'embed',name:'Embedding',group:5,global:'input'},{id:'norm1',name:'RMSNorm',group:7},{id:'q',name:'Q projection',group:0},{id:'kv',name:'K / V projection',group:1},{id:'attention',name:'Attention',group:null},{id:'out',name:'Output projection',group:2},{id:'residual1',name:'Residual Add',group:null},{id:'norm2',name:'Pre-FFN RMSNorm',group:7},{id:'router',name:'Router · Top-K',group:8,moe:true},{id:'dispatch',name:'EP Dispatch',group:null,moe:true},{id:'experts',name:'Expert Compute',group:3,moe:true},{id:'combine',name:'EP Combine',group:null,moe:true},{id:'shared',name:'Shared Expert FFN',group:9,moe:true},{id:'dense',name:'Dense FFN',group:10,dense:true},{id:'residual2',name:'Residual Add',group:null},{id:'finalnorm',name:'Final RMSNorm',group:7,global:'output'},{id:'head',name:'LM Head',group:6,global:'output'}];
 function opExists(id,layer,pp){const op=ops.find(o=>o.id===id);if(!op)return true;if(op.global)return layer===null&&(op.global==='input'?pp===0:pp===PP-1);if(layer===null){const lo=pp*L/PP,hi=(pp+1)*L/PP;return op.dense?lo<atlasConfig.dense:op.moe?hi>atlasConfig.dense&&(id!=='shared'||atlasConfig.shared>0):true;}return op.dense?layer<atlasConfig.dense:op.moe?layer>=atlasConfig.dense&&(id!=='shared'||atlasConfig.shared>0):true;}
 function selectOperator(op){state.expert=null;state.op=op.id;state.inspect=true;if(op.global){const lane=selectedRank%(TP*DP);selectedRank=(op.global==='input'?0:PP-1)*TP*DP+lane;state.layer=null;}else{let l=state.layer??M.bounds(selectedRank,atlasConfig)[0];if(op.moe)l=Math.max(l,atlasConfig.dense);if(op.dense)l=Math.min(l,atlasConfig.dense-1);if(l<0||l>=L)return;state.layer=l;selectedRank=Math.floor(l/(L/PP))*TP*DP+selectedRank%(TP*DP);}relationRank=selectedRank;if(op.group!==null)$('tensor').value=String(op.group);playing=false;if(innerWidth<=900)state.query=false;rebuildQuery();render();}
 function expertMarkup(search=''){
  const match=/^e\s*(\d+)$/i.exec(search),hasMoE=state.layer===null?atlasConfig.dense<L:state.layer>=atlasConfig.dense;
  if(!hasMoE||(!match&&state.op!=='experts'))return '';
  const ids=Array.from({length:EXPERTS},(_,e)=>e).filter(e=>!match||e===+match[1]);
  return '<section class="expert-detail" aria-label="路由专家"><span class="graph-caption">路由专家 · 选择后定位所属 Rank</span><div id="expert-list" class="expert-grid">'+ids.map(e=>`<button type="button" data-expert="${e}" data-local="${Math.floor(e/(EXPERTS/EP))===ranks[selectedRank].ep}" aria-pressed="${state.expert===e}" title="E${e} · EP${Math.floor(e/(EXPERTS/EP))}">E${e}</button>`).join('')+'</div>'+(ids.length?'':'<p class="config-note">没有该编号的专家。</p>')+'</section>';
 }
 function graphMarkup(layer,search){
  const node=id=>{const o=ops.find(o=>o.id===id);return `<button type="button" data-op="${id}" aria-pressed="${state.op===id}">${o.name}</button>`+(id==='experts'?expertMarkup(search):'');};
  const arrow='<span class="flow-arrow" aria-hidden="true">↓</span>',chain=ids=>ids.map(node).join(arrow);
  if(/^e\s*\d+$/i.test(search))return expertMarkup(search);
  if(search)return ops.filter(o=>(!o.moe||atlasConfig.dense<L)&&(o.id!=='shared'||atlasConfig.shared>0)&&(!o.dense||atlasConfig.dense>0)&&(o.name.toLowerCase().includes(search)||o.id.includes(search))).map(o=>node(o.id)).join('<span class="query-gap"></span>');
  const attention='<div class="residual-flow"><span class="residual-label">残差</span>'+node('norm1')+arrow+'<div class="graph-branches">'+node('q')+node('kv')+'</div>'+arrow+chain(['attention','out','residual1'])+'</div>';
  function ffn(moe){return '<div class="residual-flow"><span class="residual-label">残差</span>'+node('norm2')+arrow+(moe?'<div class="graph-branches moe-branches"><div class="graph-chain">'+chain(['router','dispatch','experts','combine'])+'</div>'+(atlasConfig.shared?'<div class="graph-chain shared-branch">'+node('shared')+'</div>':'')+'</div>'+(atlasConfig.shared?'<span class="graph-merge">求和 ⊕</span>':''):node('dense'))+arrow+node('residual2')+'</div>';}
  if(layer!==null)return attention+arrow+ffn(layer>=atlasConfig.dense);
  return node('embed')+arrow+'<div class="graph-repeat"><span class="graph-caption">Transformer × '+L+'</span>'+attention+arrow+(atlasConfig.dense?'<details open><summary>L0–'+(atlasConfig.dense-1)+' · Dense</summary>'+ffn(false)+'</details>':'')+(atlasConfig.dense<L?'<details open><summary>L'+atlasConfig.dense+'–'+(L-1)+' · MoE</summary>'+ffn(true)+'</details>':'')+'</div>'+arrow+chain(['finalnorm','head']);
 }
 function rebuildQuery(){
  const select=$('query-layer');if(!select)return;const key=L+':'+atlasConfig.dense;if(select.dataset.layers!==key){select.innerHTML='<option value="all">整网</option>'+Array.from({length:L},(_,l)=>`<option value="${l}">Layer ${l}${l<atlasConfig.dense?' · Dense':' · MoE'}</option>`).join('');select.dataset.layers=key;}
  select.value=state.layer===null?'all':String(state.layer);
  const search=$('query-op').value.trim().toLowerCase(),l=state.layer,pp=ranks[selectedRank].pp;
  $('operator-path').innerHTML=graphMarkup(l,search);
  $('query-note').textContent=l===null?`${L} 层 · ${atlasConfig.dense} Dense / ${L-atlasConfig.dense} MoE。选择算子查看归属与显存；选择 Expert Compute 查看专家。`:`L${l} · PP${pp} · ${l<atlasConfig.dense?'Dense FFN':`${EXPERTS} routed + ${atlasConfig.shared} shared experts`}。`;

 }
 graphButton.onclick=()=>{if(state.layout!=='flat')setLayout('flat');state.graphScene=true;state.query=true;mode='explode';selectedMemoryCategory=null;syncShell();rebuildQuery();render();};query.querySelector('[data-close-query]').onclick=()=>{state.graphScene=false;state.query=false;syncShell();render();};
 $('rank').onchange=()=>{const id=Number($('rank').value);const [lo,hi]=M.bounds(id,atlasConfig);selectCell({id,layer:state.layer===null?null:Math.max(lo,Math.min(hi-1,state.layer))});};
 $('query-op').oninput=rebuildQuery;$('query-layer').onchange=e=>{if(e.target.value==='all')state.layer=null;else{const l=Number(e.target.value);state.layer=l;selectedRank=Math.floor(l/(L/PP))*TP*DP+selectedRank%(TP*DP);relationRank=selectedRank;}state.op=null;state.expert=null;rebuildQuery();render();};
 query.addEventListener('click',e=>{const op=e.target.closest('[data-op]');if(op){selectOperator(ops.find(o=>o.id===op.dataset.op));return;}const expert=e.target.closest('[data-expert]');if(expert){const n=Number(expert.dataset.expert),r=ranks[selectedRank],lane=r.edp*EP+Math.floor(n/(EXPERTS/EP));state.layer=Math.max(state.layer??r.pp*L/PP,atlasConfig.dense);selectedRank=Math.floor(state.layer/(L/PP))*TP*DP+lane*TP+r.tp;relationRank=selectedRank;state.expert=n;state.op='experts';state.inspect=true;playing=false;if(innerWidth<=900)state.query=false;rebuildQuery();render();}});

 function renderInspector(){
  const panel=$('shard-inspector');if(!state.inspect){panel.classList.remove('workbench-inspector');if(state.layout==='flat'){panel.hidden=true;$('shard-info').classList.toggle('hidden',mode!=='shard');}else legacy.renderShardInspector();return;}
  panel.hidden=false;panel.classList.add('workbench-inspector');$('shard-info').classList.remove('hidden');$('shard-info').setAttribute('aria-expanded','true');
  const r=ranks[selectedRank],mem=M.memory(r.id,atlasConfig,simTime),op=ops.find(o=>o.id===state.op),[lo,hi]=M.bounds(r.id,atlasConfig),local=M.groups(r.id,atlasConfig,state.layer),p=local.reduce((n,g)=>n+g[2],0);
  if(state.layout==='flat'){
   panel.innerHTML=`<header class="wb-inspector-head"><strong>结构与执行</strong><button type="button" data-close-inspector aria-label="关闭详情">×</button></header><h2>R${r.id}${state.layer===null?'':` × L${state.layer}`}</h2><p>PP${r.pp} · DP${r.dpIndex} · CP${r.cp} · TP${r.tp} · EP${r.ep}<br>持有 L${lo}–L${hi-1}</p>${op?`<p><strong>${esc(op.name)}</strong><br>${op.group!==null?esc(shardSpec(op.group,r.id).rule):'计算 / 通信节点'}</p>`:''}<p>${mem.phase} · μb ${mem.mb}/${MICROBATCHES}${mem.layer===null?'':` · 当前 L${mem.layer}`}</p><button type="button" data-open-memory>查看此 Rank 显存 ↗</button>`;return;
  }
  let detail='';
  if(op){const count=operatorParams(op,local),shares=parameterMemory(count,r.id);const sp=op.group===null?null:shardSpec(op.group,r.id);detail=`<p><strong>${esc(op.name)}</strong>${state.expert!==null&&op.id==='experts'?` · E${state.expert}`:''}<br>${sp?esc(sp.rule)+'<br>本地形状 '+esc(op.id==='experts'?`Gate / Up: ${H} × ${I}; Down: ${I} × ${H}`:sp.shape):op.id==='dispatch'||op.id==='combine'?`[tokens, H${H}] · Top-K ${atlasConfig.topk} · EP${EP}`:'无独立常驻参数'}<br>${count?`${count.toLocaleString()} 个参数 · BF16 ${fmt(count*2/1e9)}`:'通信 / 计算中间量不重复记入权重'}</p><table aria-label="所选算子显存份额"><caption>所选算子 · 常驻份额</caption><tbody>${shares.map((v,i)=>`<tr><td><i style="display:inline-block;width:8px;height:8px;background:${cats[i].color}"></i> ${cats[i].name}</td><td>${fmt(v)}</td><td>${i===1&&mem.values[1]===0?'—':(p?(count/p*100).toFixed(2):'0.00')+'%'}</td></tr>`).join('')}</tbody></table><p class="meta">占${state.layer===null?'本 Rank':'本 Layer'}同类内存的份额；梯度数值随训练阶段变化。<br>激活与临时工作区按整卡查看，未分摊到算子。</p>`;}
  const title=state.layer===null?`Rank ${r.id}`:`R${r.id} × L${state.layer}`;
  const markup=`<header class="wb-inspector-head"><strong>显存账与归属</strong><button type="button" data-close-inspector aria-label="关闭详情">×</button></header><h2>${title}</h2><div class="meta">PP${r.pp} · DP${r.dpIndex} · CP${r.cp} · TP${r.tp} · EP${r.ep}<br>持有 L${lo}–${hi-1} · E${r.ep*EXPERTS/EP}–${(r.ep+1)*EXPERTS/EP-1}</div>${detail}${state.layer===null?'':`<p>该 Layer 参数 ${p.toLocaleString()}<br>权重 ${fmt(p*2/1e9)} · 梯度上限 ${fmt(p*2/1e9)} · 优化器 ${fmt(p*12/1e9)}</p>`}<table><caption class="meta">整张 Rank · 当前训练帧</caption><tbody>${cats.slice(0,7).map((c,i)=>`<tr class="ledger-row"><td><i style="background:${c.color}"></i>${c.name}</td><td>${fmt(mem.values[i])}</td></tr>`).join('')}</tbody></table><div class="total ${mem.overflow?'overflow':''}">${fmt(mem.total)} / ${HBM} GB</div>${mem.overflow?`<p class="overflow">超出容量 ${fmt(mem.overflow)}</p>`:''}<p class="meta">${mem.phase} · μb ${mem.mb}/${MICROBATCHES}<br>GB = 10⁹ bytes。${state.layer===null?'':'Layer 账只列常驻参数；激活与预留按整卡核对。'}</p>`;
  if(panel.innerHTML!==markup)panel.innerHTML=markup;
 }
 $('shard-inspector').addEventListener('click',e=>{if(e.target.closest('[data-open-memory]')){setLayout('space');mode='explode';scope='single';relationRank=selectedRank;state.inspect=true;fitCanvas();render();return;}if(e.target.closest('[data-close-inspector]')){state.inspect=false;shardInfoOpen=false;render();}});
 const infoClick=$('shard-info').onclick;$('shard-info').onclick=()=>{if(state.layout==='flat'||state.inspect){state.inspect=!state.inspect;render();}else infoClick();};
 renderShardInspector=function(){renderInspector();};
 render=function(){
  syncShell();
  if(state.layout==='space'){legacy.render();if(state.inspect)renderInspector();syncSceneButtons();dial();return;}
  setRankData(selectedRank);applySimulation();drawFlat();renderInspector();
  const r=ranks[selectedRank];context.innerHTML=`<strong>${state.heat?'Rank · HBM':'Rank × '+(state.grain==='layer'?'Layer':'PP Stage')}</strong>${worldSize} Rank · ${L} Layers<br>R${r.id}${state.layer===null?'':` × L${state.layer}`}`;
  $('ep-navigation').innerHTML='';$('ep-token-legend').hidden=true;$('ep-incident').hidden=true;document.body.dataset.epMode='false';$('ep-stops').classList.add('hidden');$('ep-markers').hidden=true;$('ep-oom-mode').setAttribute('aria-pressed','false');
  $('relations').classList.add('hidden');$('tensor').classList.toggle('hidden',mode!=='shard');$('single').setAttribute('aria-pressed',String(scope==='single'));$('all').setAttribute('aria-pressed',String(scope==='all'));$('rank').classList.toggle('hidden',scope==='all');$('rank').value=selectedRank;$('labels').setAttribute('aria-pressed',String(labels));document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  const legend=$('memory-legend');legend.hidden=true;const indices=state.heat?[0,2,1,3,4,5,6]:mode==='shard'?[0,2]:state.grain==='layer'?[0,1,2,3,4,5,6,7]:[0,1,2];const markup=indices.map(i=>`<button type="button" data-memory-category="${i}" aria-pressed="${selectedMemoryCategory===i}"><i style="background:${cats[i].color}"></i>${cats[i].name}</button>`).join('');if(legend.innerHTML!==markup)legend.innerHTML=markup;
  syncTensorMenu();$('tensor').classList.toggle('hidden',state.graphScene||mode!=='shard');syncSceneButtons();dial();
 };
 // New parameter modules join the existing tensor menu, with its keyboard handling.
 $('tensor-list').innerHTML=baseGroups.map((g,i)=>`<button role="option" tabindex="-1" data-index="${i}" aria-selected="false">${esc(g[0])}</button>`).join('');
 new ResizeObserver(()=>{if(state.layout==='flat')drawFlat();}).observe(stage);
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){tooltip.hidden=true;hover.hidden=true;if(state.query){state.graphScene=false;state.query=false;syncShell();render();}}});
 window.RankWorkbench={setLayout,applyConfig:(c,allowOverflow=false)=>commit({...atlasConfig,...c},allowOverflow),select:(rank,layer=null)=>{if(!ranks[rank])return false;const [lo,hi]=M.bounds(rank,atlasConfig);if(layer!==null&&(layer<lo||layer>=hi))return false;selectCell({id:rank,layer});return true;},snapshot:()=>({config:{...atlasConfig},layout:state.layout,view:viewMode,grain:state.grain,rank:selectedRank,layer:state.layer,op:state.op,query:state.query,world:worldSize,memory:M.memory(selectedRank,atlasConfig,simTime),flat:{...state.flat}})};
 rebuildQuery();syncShell();dial();render();if(!ATLAS_EMBED)requestAnimationFrame(tick);
})();
