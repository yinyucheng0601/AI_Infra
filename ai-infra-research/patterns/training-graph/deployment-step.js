// Isolated final step. The nine-stage graph and Rank renderers are inherited.
let deploymentActive=false,deploymentPreparing=false,deploymentState=null;
let deploymentGraphPrimary=false;
let deploymentMode='dispatch',deploymentFocus=0,deploymentInspector=false,deploymentSaved=null;
const deploymentLayers=new Set(['dispatch']);
// Match Rank band roles; MoE routing inherits the canonical EP orange.
const deploymentColors={tp:'#808080',cache:C.i,dispatch:'#FF9500',return:'#FF9500',dp:C.g,edp:C.g};
const deploymentCamera={z:1,x:0,y:0};let deploymentPan=null,deploymentMoved=false;
const deploymentSVG=document.createElementNS('http://www.w3.org/2000/svg','svg');
deploymentSVG.id='deployment-surface';deploymentSVG.setAttribute('aria-label','灵衢板内设备与通信组');deploymentSVG.setAttribute('hidden','');
deploymentSVG.innerHTML='<g id="deployment-world"></g>';document.body.append(deploymentSVG);
const deploymentModes=document.createElement('nav');deploymentModes.id='deployment-modes';deploymentModes.hidden=true;deploymentModes.setAttribute('aria-label','查看部署通信');document.body.append(deploymentModes);

function renderDeploymentStep(){
 scheduleRender.cancel();
 if(!deploymentActive){
  deploymentView='Top';deploymentGraphPrimary=false;document.body.classList.remove('deployment-graph-primary');
  deploymentSaved={rankPrimary,rankInspectorOpen,rankFocus,rankBandFocus,selected,panelOpen,view:{...view},box:document.querySelector('#stage>svg').getAttribute('viewBox'),autoLayout};
  deploymentCamera.z=1;deploymentCamera.x=deploymentCamera.y=0;deploymentFocus=rankFocus;deploymentInspector=false;
 }
 // Reuse the exact last computation state, without admitting stage 10 into its model.
 deploymentPreparing=true;current=8;rankPrimary=false;panelOpen=false;
 try{render();}finally{current=9;deploymentPreparing=false;}
 autoLayout=false;deploymentActive=true;document.body.classList.add('deployment-step');document.body.classList.remove('rank-primary');document.body.dataset.step='9';
 document.querySelector('#panel').hidden=true;document.querySelector('#secondary-control').hidden=true;document.querySelector('#expert-count-control').hidden=true;
 deploymentSVG.removeAttribute('hidden');deploymentModes.hidden=false;
 cancelAnimationFrame(cameraFrame);view={z:1,x:0,y:0};apply();
 const b=fullGraphBounds;document.querySelector('#stage>svg').setAttribute('viewBox',`${b.x-24} ${b.y-24} ${b.width+48} ${b.height+48}`);
 deploymentState=trainingDeploymentState(parameterState,deploymentFocus,deploymentMode==='all'?'dispatch':deploymentMode);
 drawDeployment();syncDeploymentPrimary();fitDeployment();updateNav();syncPlayback();lastStage=9;
 if(!document.querySelector('#info-panel').hidden)writeDeploymentInfo();
 if(deploymentInspector)writeDeploymentPanel();
}
function leaveDeploymentStep(){
 syncDeploymentControlLayout(false);deploymentGraphPrimary=false;document.body.classList.remove('deployment-graph-primary');
 const graphStage=document.querySelector('#stage');graphStage.removeAttribute('role');graphStage.removeAttribute('tabindex');graphStage.removeAttribute('aria-label');delete graphStage.dataset.tip;
 resetDeploymentPanelAnchor();physicalPath.hidden=true;
 deploymentActive=false;deploymentSVG.setAttribute('hidden','');deploymentModes.hidden=true;document.body.classList.remove('deployment-step');
 deploymentInspector=false;document.querySelector('#panel').hidden=true;
 observationControl.hidden=true;deploymentDialHost.hidden=true;document.body.classList.remove('observation-session');
 const s=deploymentSaved;if(!s)return;
 rankPrimary=s.rankPrimary;rankInspectorOpen=false;rankFocus=s.rankFocus;rankBandFocus=s.rankBandFocus;selected=s.selected;panelOpen=false;
 document.body.classList.toggle('rank-primary',rankPrimary);document.querySelector('#rank-open').hidden=rankPrimary;document.querySelector('#rank-canvas').toggleAttribute('hidden',!rankPrimary);document.querySelector('#rank-return').hidden=!rankPrimary;document.querySelector('#graph-return').hidden=!rankPrimary;
 view={...s.view};autoLayout=s.autoLayout;document.querySelector('#stage>svg').setAttribute('viewBox',s.box);lastStage=8;deploymentSaved=null;
}
// Convert inherited Rank geometry into the unchanged 4×2 Rank layout.
function deploymentRankPort(id,side){
 const rank=deploymentState.ranks[id],band=rankBandLayout(rank.bands).find(b=>b.id==='communication');
 const [x,y]=deploymentProject(()=>window.RankMemoryView.geometry.P(side==='right'?245:0,side==='right'?0:155,band.z+band.h/2));
 const scale=290/553,offset=(300-460*scale)/2;
 return {x:(id%4)*330+15+offset+(x-345)*scale,y:95+Math.floor(id/4)*430+(y-222)*scale};
}
function deploymentLink(edge,index){
 const a=edge.from,b=edge.to,sameRow=Math.floor(a/4)===Math.floor(b/4);
 if(!sameRow){
  const from=deploymentRankPort(a,'right'),to=deploymentRankPort(b,'right');
  const channel=Math.max(from.x,to.x)+24+index*24;
  return `M${from.x} ${from.y}H${channel}V${to.y}H${to.x}`;
 }
 const forward=a<b,from=deploymentRankPort(a,forward?'right':'left'),to=deploymentRankPort(b,forward?'left':'right');
 if(Math.abs(a-b)===1)return `M${from.x} ${from.y}H${to.x}`;
 const direction=forward?1:-1,offset=20+index*22,corridor=410+Math.floor(a/4)*430+index*24;
 return `M${from.x} ${from.y}H${from.x+direction*offset}V${corridor}H${to.x-direction*20}V${to.y}H${to.x}`;
}
function deploymentRankGlyph(rank){
 const previous={current,rankFocus,rankBandFocus};
 try{current=8;rankFocus=deploymentFocus;rankBandFocus='communication';return deploymentView==='2.5D'?rankCube(rank):deploymentOrthographicGlyph(rank)+`<text x="575" y="245" text-anchor="middle" fill="#eee" font-size="25">Rank ${rank.id}</text>`;}
 finally{current=previous.current;rankFocus=previous.rankFocus;rankBandFocus=previous.rankBandFocus;}
}
function drawDeployment(){
 physicalPath.hidden=true;physicalFitBounds=null;
 syncDeploymentDial();observationSync();if(observationData){observationDraw();return;}
 const s=deploymentState,c=s.config,focus=s.ranks[s.focus];
 if(s.mode==='cache'&&!c.recollect){deploymentMode='tp';deploymentState=trainingDeploymentState(parameterState,deploymentFocus,deploymentMode==='all'?'dispatch':deploymentMode);drawDeployment();return;}
 // Inherit the actual previous-step scene, including rankCube(), all bands,
 // expert group backgrounds and fixed positions. Do not substitute hardware icons.
 const inherited=document.querySelector('#rank-world').cloneNode(true);
 inherited.querySelectorAll('defs,[data-rank-route],[data-rank-return]').forEach(el=>el.remove());
 inherited.querySelectorAll('[data-rank-id]').forEach(el=>{
  const id=+el.dataset.rankId;el.dataset.deploymentRank=id;el.classList.add('deployment-node');
  el.setAttribute('aria-pressed',String(id===s.focus));
  el.setAttribute('aria-label',`Rank ${id}，NPU ${id}，专家组 ${s.ranks[id].group}`);
  el.dataset.tip=`Rank ${id} · NPU ${id} · 查看分片与通信组`;
  // Use the original renderer, including its typography and category colors.
  el.querySelector('svg').innerHTML=deploymentRankGlyph(s.ranks[id]);
 });
 let body=`<defs><marker id="deployment-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L9 5L1 9" fill="none" stroke="${C.i}" stroke-width="1.5"/></marker></defs>`+['dispatch','return'].map(mode=>`<defs><marker id="deployment-arrow-${mode}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="14" markerHeight="14" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L9 5L1 9" fill="none" stroke="${deploymentColors[mode]}" stroke-width="2"/></marker></defs>`).join('')+inherited.innerHTML;
 const available=['tp',...(c.recollect?['cache']:[]),'dispatch','return','dp','edp'];
 deploymentLayers.clear();(deploymentMode==='all'?available:[s.mode]).forEach(mode=>deploymentLayers.add(mode));
 const drawn=[];
 available.filter(mode=>deploymentLayers.has(mode)).forEach((mode,layer)=>{
  const state=trainingDeploymentState(parameterState,deploymentFocus,mode);
  // Collective scope is shown from the selected Rank, not as a redundant clique.
  const edges=['tp','cache','dp','edp'].includes(mode)?state.edges.filter(e=>e.from===s.focus||e.to===s.focus):state.edges;
  edges.forEach((e,i)=>{if(e.local)return;drawn.push({...e,mode});body+=`<path class="deployment-path deployment-layer-${mode}" style="stroke:${deploymentColors[mode]}" data-deployment-layer="${mode}" data-deployment-edge="${e.from}-${e.to}" d="${deploymentLink(e,i,layer)}" ${e.directed?`marker-end="url(#deployment-arrow-${mode})"`:""}/>`;});
 });
 // Token selection always has a visible physical ownership result, even while
 // inspecting collective layers. Repeated routing inputs may share Top-2 owners.
 for(const rank of s.ranks){const chosen=s.route.chosen.filter(e=>rank.experts.includes(e));if(!chosen.length)continue;
 const x=(rank.id%4)*330+165,y=95+Math.floor(rank.id/4)*430+305;
 body+=`<g data-deployment-token="${parameterState.token}" data-token-owner="${rank.id}"><text x="${x}" y="${y}" text-anchor="middle" style="fill:#eee;font:13px ui-monospace,monospace">t${parameterState.token} · ${chosen.map(e=>'E'+e).join(' / ')}</text></g>`;
 }
 body+=`<text class="deployment-board-label" x="660" y="8" text-anchor="middle">板 0 · 灵衢 UB</text>`;
 updateGraphSvg(document.querySelector('#deployment-world'),'<svg xmlns="http://www.w3.org/2000/svg">'+body+'</svg>');applyEPCopper(document.querySelector('#deployment-world'),'.deployment-layer-dispatch,.deployment-layer-return');applyDeploymentCamera();
 const collective=['tp','cache','dp','edp'].includes(s.mode);
 const modes=[['tp',c.tp===1?'TP · 本地':c.sp?'TP/SP · AG/RS':'TP · AllReduce'],...(c.recollect?[['cache','缓存 · AG']]:[]),['dispatch','EP · Dispatch'],['return','EP · Return'],['dp','DP · 梯度'],['edp','专家副本 · 梯度']];
 const tips={tp:'TP 组内前向与反向通信；SP 开启时使用 AG/RS',cache:'WGRAD 前在 TP 组内重新收集保存的输入分片',dispatch:'token 按 Top-2 专家归属分发',return:'专家输出返回来源 Rank',dp:'稠密参数梯度在相同 TP lane 的 DP 组同步',edp:'同一专家、同一 TP 分片在专家副本组同步'};
 deploymentModes.innerHTML=`<button data-deployment-mode="all" aria-pressed="${deploymentMode==='all'}" data-tip="单选查看全部通信类型">全部</button>`+modes.map(([id,label])=>`<button data-deployment-mode="${id}" aria-pressed="${deploymentMode===id}" style="--mode-color:${deploymentColors[id]}" data-tip="${tips[id]}；单选查看通信关系">${label}</button>`).join('');
 const title=deploymentLayers.size===0?'选择通信关系':deploymentLayers.size>1?'通信关系叠加':{tp:'TP / SP 组内通信',cache:'WGRAD 前取回缓存',dispatch:'token 分发到专家',return:'专家输出返回来源',dp:'稠密参数梯度同步',edp:'同一专家分片梯度同步'}[s.mode];
 const operation=s.mode==='cache'?'AllGather(Xᵣ / Aᵣ)':s.mode==='dp'||s.mode==='edp'?'AllReduce(dW)':c.sp?'AllGather / ReduceScatter':'AllReduce';
 const paths=collective?`Rank {${s.members}}\n${s.members.length===1?'本地 · 无跨 Rank 通信':operation}`:s.edges.map(e=>`R${e.from} ${e.local?'· 本地':'→ R'+e.to} · ${e.experts.map(e=>'E'+e).join(' / ')}`).join('\n');
 const detail={tp:c.sp?'SP 复用 TP 组；前向与反向按依赖执行 AG / RS。':'行并行部分结果在 TP 组内归约。',cache:'仅保存序列分片，WGRAD 前 AG 恢复前向输入。',dp:'Attention / Router 等稠密参数的相同 TP 分片在 DP 组同步。',edp:c.expertDP===1?'当前每位专家只有一份副本，无跨副本同步。':'仅同步同一专家的相同 TP 分片。'};
 document.querySelector('#impact').innerHTML=`<div class="step-number">10</div><b>${title}</b><span>${deploymentLayers.size>1?Array.from(deploymentLayers).map(m=>({tp:'TP/SP',cache:'缓存 AG',dispatch:'Dispatch',return:'Return',dp:'DP',edp:'专家副本'})[m]).join(' · '):collective?detail[s.mode]:`t${parameterState.token} · TP lane ${focus.lane} · 专家副本 ${focus.replica}`}</span><div class="deployment-key">${esc(paths)}\nt${parameterState.token} → ${s.route.chosen.map(e=>'E'+e).join(' / ')}</div>`;
 document.querySelector('#config').innerHTML=`<strong>8 个 Rank · TP ${c.tp} · EP ${c.ep}</strong><br>单板部署 · Rank r ↔ NPU r`;
 // The graph thumbnail keeps the same node IDs, experts and token route.
 document.querySelectorAll('#world [data-node]').forEach(el=>{
  const id=el.dataset.node,expert=id.match(/^moe-e(\d+)/),comm=!!el.querySelector('[data-kind=communication]');
  const owned=expert&&(collective?focus.experts.includes(+expert[1]):s.route.chosen.includes(+expert[1]));
  const relevantComm=s.mode==='dp'||s.mode==='edp'?false:collective?comm&&!/^moe-(dispatch|combine)$/.test(id):id===(s.mode==='return'?'moe-combine':'moe-dispatch');
  el.classList.toggle('rank-owned',!!(owned||relevantComm));el.classList.toggle('rank-context',!owned&&!relevantComm);
 });
 if(deploymentView==='Top')drawDeploymentTop();
}
function syncDeploymentPrimary(){
 document.body.classList.toggle('deployment-graph-primary',deploymentGraphPrimary);
 const graph=document.querySelector('#stage');
 if(deploymentGraphPrimary){graph.removeAttribute('role');graph.removeAttribute('tabindex');delete graph.dataset.tip;}
 else{graph.setAttribute('role','button');graph.setAttribute('tabindex','0');graph.setAttribute('aria-label','切换计算图为主体');graph.dataset.tip='点击切换计算图为主体';}
 const b=fullGraphBounds;view={z:1,x:0,y:0};apply();document.querySelector('#stage>svg').setAttribute('viewBox',`${b.x-24} ${b.y-24} ${b.width+48} ${b.height+48}`);
}
function toggleDeploymentPrimary(){pausePlayback();deploymentGraphPrimary=!deploymentGraphPrimary;deploymentInspector=false;document.querySelector('#panel').hidden=true;syncDeploymentPrimary();fitDeployment();}
function fitDeployment(){
 const physical=deploymentView==='Top'&&physicalFitBounds,b=physical||document.querySelector('#deployment-world').getBBox(),sw=innerWidth,sh=innerHeight,padding=physical?12:80;
 if(deploymentGraphPrimary){const r=deploymentSVG.getBoundingClientRect(),ratio=r.width/Math.max(1,r.height),h=Math.max(b.height+padding,(b.width+padding)/ratio),w=h*ratio;deploymentSVG.setAttribute('viewBox',`${b.x+b.width/2-w/2} ${b.y+b.height/2-h/2} ${w} ${h}`);return;}
 const left=sw>1000?260:24,right=sw>1000?300:24,top=100,dock=document.querySelector('#deployment-control-dock'),bottom=Math.min(dock&&!dock.hidden?dock.getBoundingClientRect().top-18:sh-160,typeof deploymentTraceOpen!=='undefined'&&deploymentTraceOpen&&!deploymentTracePanel.hidden?deploymentTracePanel.getBoundingClientRect().top-18:sh),available=Math.max(200,bottom-top),scale=Math.min(Math.max(280,sw-left-right)/(b.width+padding),available/(b.height+padding)),centerX=(left+sw-right)/2,centerY=top+available/2;
 deploymentSVG.setAttribute('viewBox',`${b.x+b.width/2-centerX/scale} ${b.y+b.height/2-centerY/scale} ${sw/scale} ${sh/scale}`);
}

function applyDeploymentCamera(){document.querySelector('#deployment-world').setAttribute('transform',`translate(${deploymentCamera.x} ${deploymentCamera.y}) scale(${deploymentCamera.z})`);}
function deploymentTool(id){if(id==='fit'){deploymentCamera.z=1;deploymentCamera.x=deploymentCamera.y=0;fitDeployment();}else{const b=deploymentSVG.viewBox.baseVal,x=b.x+b.width/2,y=b.y+b.height/2,z=Math.max(.4,Math.min(6,deploymentCamera.z*(id==='plus'?1.3:1/1.3)));deploymentCamera.x=x-(x-deploymentCamera.x)*z/deploymentCamera.z;deploymentCamera.y=y-(y-deploymentCamera.y)*z/deploymentCamera.z;deploymentCamera.z=z;}applyDeploymentCamera();}
function selectDeploymentRank(id){pausePlayback();deploymentFocus=id;deploymentInspector=true;deploymentState=trainingDeploymentState(parameterState,id,deploymentMode==='all'?'dispatch':deploymentMode);drawDeployment();writeDeploymentPanel();}
function writeDeploymentPanel(){document.querySelector('#panel').hidden=true;}
function writeDeploymentInfo(){if(observationData){observationInfo();return;}document.querySelector('#info-content').innerHTML=`<h3>设备与映射</h3><p>本步保留第 09 步的 2.5D Rank、内部色带和分组，叠加灵衢板内连接关系；显式绑定 Rank r ↔ NPU 槽 r。该绑定是本案例的部署输入，并非驱动采集；未套用 A3 的双 Die Rank 口径。</p><h3>通信关系</h3><p>沿用第 09 步的 TP/SP、缓存策略、EP、DP、专家副本与 Top-2 路由。稠密 dW 在 DP 组同步；专家 dW 仅在同一专家分片的副本组同步，不能直接套用稠密 DP 组。PP=CP=1，无对应跨 Rank 通信。TP 连线表示组内连接关系；Dispatch / Return 箭头表示当前 token 在同一 TP lane 上的去向，不表示集合通信算法的实际发送顺序。专家位于来源 Rank 时标为本地。</p><p>当前训练配置只使用板内 Unified Bus；顶视可查看来源拓扑模板的主机侧与交换层结构，外围连接不表示当前流量。没有配置容量、实测链路带宽或运行 Trace。</p><h3>使用</h3><p>右上角复用 Atlas 视角轮盘；顶视图接入灵衢 Pattern 的完整 POD、板和硬件互联渲染，点击板行展开 CPU/NPU/DPU/NIC、L1、交换板和平面。淡线为配置拓扑，选中设备自身连接提高对比度；不表示实测包路径。立体/正视/侧视使用原 Rank 对象；切换保留选择与通信类型。点击 Rank 仅切换选择与关联连线；切换计算、缓存、路由或梯度同步查看关系；通信项为单选；全部项显示所有通信类型，其余项只显示对应类型。选择 t0–t7 时主体标出 Top-2 专家承载 Rank；TP/DP 分组本身不随 token 改变。当前路由样本每四个 token 重复输入，因此 t0/t4 等可有相同专家去向。滚轮缩放、拖动画布，适应按钮返回总览。左方向键返回专家分布。</p><h3>官方依据</h3><div class="source-links"><a href="https://www.huawei.com/cn/news/2025/9/hc-superpod-innovation" target="_blank" rel="noopener">华为 · 灵衢与八 NPU 企业级超节点</a><a href="https://www.hiascend.com/doc_center/source/zh/canncommercial/900/programug/acldevg/aclcppdevg_000537.html" target="_blank" rel="noopener">CANN · HCCL 与 UB 等底层链路</a><a href="https://www.hiascend.com/doc_center/source/zh/canncommercial/900/API/hcclug/hcclug_000066.html" target="_blank" rel="noopener">CANN · A3 Device 与 Rank 口径</a></div>`+physicalRelationLegend();}

document.addEventListener('click',e=>{
 if(current!==9)return;
 if((!deploymentGraphPrimary&&e.target.closest('#stage'))||(deploymentGraphPrimary&&e.target.closest('#deployment-surface'))){e.stopImmediatePropagation();toggleDeploymentPrimary();return;}
 const mode=e.target.closest('[data-deployment-mode]'),node=e.target.closest('#stage [data-node]');
 if(['fit','plus','minus'].includes(e.target.id)){e.stopImmediatePropagation();if(deploymentGraphPrimary){if(e.target.id==='fit')syncDeploymentPrimary();else{view.z=Math.max(.4,Math.min(6,view.z*(e.target.id==='plus'?1.3:1/1.3)));apply();}}else deploymentTool(e.target.id);return;}
 if(mode){e.stopImmediatePropagation();pausePlayback();deploymentMode=mode.dataset.deploymentMode;deploymentLayers.clear();deploymentLayers.add(deploymentMode);deploymentState=trainingDeploymentState(parameterState,deploymentFocus,deploymentMode==='all'?'dispatch':deploymentMode);drawDeployment();return;}
 if(node){anchorDeploymentPanel(e,node);e.stopImmediatePropagation();selectDeploymentGraph(node.dataset.node);positionDeploymentPanel();return;}
 if(e.target.id==='close')deploymentInspector=false;
},true);
function selectDeploymentGraph(id){pausePlayback();selected=id;const expert=id.match(/^moe-e(\d+)/);if(expert){const c=deploymentState.config,r=deploymentState.ranks[deploymentFocus];deploymentFocus=(r.replica*c.ep+Math.floor(+expert[1]/(c.experts/c.ep)))*c.tp+r.lane;}else if(/dispatch|return|combine/.test(id))deploymentMode=/return|combine/.test(id)?'return':'dispatch';else if(/ag|rs/.test(id))deploymentMode='tp';deploymentLayers.clear();deploymentLayers.add(deploymentMode);deploymentState=trainingDeploymentState(parameterState,deploymentFocus,deploymentMode==='all'?'dispatch':deploymentMode);drawDeployment();deploymentInspector=false;document.querySelector('#panel').hidden=true;}
deploymentSVG.addEventListener('click',e=>{const n=e.target.closest('[data-deployment-rank]');if(n&&!deploymentMoved){anchorDeploymentPanel(e,n);selectDeploymentRank(+n.dataset.deploymentRank);positionDeploymentPanel();}});
deploymentSVG.addEventListener('keydown',e=>{const n=e.target.closest('[data-deployment-rank]');if(n&&['Enter',' '].includes(e.key)){e.preventDefault();anchorDeploymentPanel(e,n);selectDeploymentRank(+n.dataset.deploymentRank);positionDeploymentPanel();}});
document.addEventListener('keydown',e=>{if(current!==9)return;if(!deploymentGraphPrimary&&e.target.closest('#stage')&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();toggleDeploymentPrimary();return;}if(e.key==='Escape')deploymentInspector=false;const n=e.target.closest('#stage [data-node]');if(n&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();anchorDeploymentPanel(e,n);selectDeploymentGraph(n.dataset.node);positionDeploymentPanel();}},true);
deploymentSVG.addEventListener('wheel',e=>{e.preventDefault();const p=deploymentSVG.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(deploymentSVG.getScreenCTM().inverse()),z=Math.max(.4,Math.min(6,deploymentCamera.z*Math.exp(-e.deltaY*.001)));deploymentCamera.x=q.x-(q.x-deploymentCamera.x)*z/deploymentCamera.z;deploymentCamera.y=q.y-(q.y-deploymentCamera.y)*z/deploymentCamera.z;deploymentCamera.z=z;applyDeploymentCamera();},{passive:false});
deploymentSVG.onpointerdown=e=>{if(e.button!==0||deploymentGraphPrimary)return;deploymentMoved=false;deploymentPan={x:e.clientX,y:e.clientY,vx:deploymentCamera.x,vy:deploymentCamera.y};};
deploymentSVG.onpointermove=e=>{if(!deploymentPan)return;const dx=e.clientX-deploymentPan.x,dy=e.clientY-deploymentPan.y;if(Math.hypot(dx,dy)>5)deploymentMoved=true;if(deploymentMoved){deploymentSVG.setPointerCapture(e.pointerId);const scale=deploymentSVG.getScreenCTM().a;deploymentCamera.x=deploymentPan.vx+dx/scale;deploymentCamera.y=deploymentPan.vy+dy/scale;applyDeploymentCamera();}};
deploymentSVG.onpointerup=()=>{deploymentPan=null;setTimeout(()=>deploymentMoved=false,0);};deploymentSVG.onpointercancel=()=>deploymentPan=null;
window.addEventListener('resize',()=>{if(current===9){fitDeployment();const b=fullGraphBounds;document.querySelector('#stage>svg').setAttribute('viewBox',`${b.x-24} ${b.y-24} ${b.width+48} ${b.height+48}`);}});

// A thumbnail is a view switch, never a pan surface.
document.addEventListener('pointerdown',e=>{if(current===9&&((!deploymentGraphPrimary&&e.target.closest('#stage'))||(deploymentGraphPrimary&&e.target.closest('#deployment-surface')))){e.stopImmediatePropagation();}},true);
document.addEventListener('keydown',e=>{if(current===9&&!deploymentGraphPrimary&&e.target.closest('#stage')&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();toggleDeploymentPrimary();}},true);
