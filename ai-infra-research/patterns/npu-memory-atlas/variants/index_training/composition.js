/* Training host orchestration. Reuses inference-layer-stack's primary swap
 * (ViewTransition + WAAPI fallback), Pangu plane geometry, atlas UI and clock.
 */
(()=>{
 'use strict';
 const M=RankAtlasModel,W=TrainingWorkbench,S=TrainingGraphState,svgNS='http://www.w3.org/2000/svg';
 const el=(name,attrs={},text)=>{const n=document.createElementNS(svgNS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;return n;};
 let frontStatus=null,frontAnimation=null,savedStackCamera=null,stackAutoFit=true,fitMicrobatch=-1;
 let stackPrimary=false,swapTransition=null,stackCamera=null,drawKey='',lastConfig=JSON.stringify(atlasConfig),manual=false,lastRank=selectedRank,stackSide=false,stackView=0;
 const stack=el('svg',{id:'training-stack',class:'approved-compute-svg',viewBox:'0 0 2600 1500',role:'group','aria-label':'训练模型层 · 2.5D Stack'}),world=el('g');stack.append(world);document.body.append(stack);
 const swap=document.createElement('button');swap.id='primary-swap';swap.type='button';document.body.append(swap);
 const identity=document.createElement('div');identity.id='training-identity';document.body.append(identity);
 const originalRender=render,originalZoom=changeZoom,originalFit=fitCanvas;
 const originalPlus=$('plus').onclick,originalMinus=$('minus').onclick;
 function chosenLayer(){return W.state.layer??M.bounds(selectedRank,atlasConfig)[0];}
 function selectLayer(layer){manual=true;playing=false;TrainingGraphState.bucket=null;W.setLayer(layer);}
 function fitStack(){
  stackAutoFit=true;fitMicrobatch=TrainingClock.state(atlasConfig,simTime).mb;
  const width=220+362*.72+Math.max(0,L-1)*40,height=462+362*.3312+Math.max(0,L-1)*12+Math.max(140,(fitMicrobatch+1)*84+100);
  const box=stack.getBoundingClientRect(),ratio=stackPrimary?box.width/Math.max(1,box.height):innerWidth/innerHeight,vw=Math.max(width+300,(height+400)*ratio),vh=vw/ratio;
  stackCamera={x:170-220+width/2-vw/2,y:365-(L-1)*12+height/2-vh/2,w:vw,h:vh};applyStackCamera();
 }
 function applyStackCamera(){if(stackCamera)stack.setAttribute('viewBox',`${stackCamera.x} ${stackCamera.y} ${stackCamera.w} ${stackCamera.h}`);}
 function zoomStack(factor,px=null,py=null){stackAutoFit=false;const b=stack.getBoundingClientRect();if(!stackCamera)fitStack();const old=stackCamera,w=Math.max(120,Math.min(18000,old.w/factor)),h=w*b.height/b.width,fx=px===null?.5:(px-b.left)/b.width,fy=py===null?.5:(py-b.top)/b.height;stackCamera={x:old.x+(old.w-w)*fx,y:old.y+(old.h-h)*fy,w,h};applyStackCamera();}
 const planeNodes=new Map(),planeLabels=new Map(),annotation=el('g',{'aria-hidden':'true'});stack.append(annotation);let planeConfig='';
 const geometry=createTrainingStackGeometry({paint({projectionX,projectionY,positions,selected,hovered}){for(let l=0;l<positions.length;l++){const g=planeNodes.get(l),label=planeLabels.get(l),p=positions[l];if(!g||!label)continue;g.setAttribute('transform',`matrix(${projectionX} ${projectionY} 0 1 ${p.x} ${p.y})`);g.classList.toggle('preview',l===hovered);label.setAttribute('x',p.x-8);label.setAttribute('y',p.y-8);label.classList.toggle('active',l===selected);label.classList.toggle('preview',l===hovered);label.setAttribute('opacity',p.occluded?'.28':'1');}}});

 const rails=createTrainingStackRails({svg:stack,el,onSeek(cursor){manual=false;playing=false;simTime=TrainingClock.time(atlasConfig,cursor);render();}});
 // Geometry keeps the rail-to-plane links attached throughout the dock motion.
 let railFrame=0;function paintRailMotion(){rails.update({count:L,ga:atlasConfig.ga,process:TrainingClock.state(atlasConfig,simTime),selected:chosenLayer(),geometry:geometry.snapshot()});if(geometry.snapshot().moving)railFrame=requestAnimationFrame(paintRailMotion);else railFrame=0;}
 function followDock(l){geometry.preview(l);if(!railFrame)railFrame=requestAnimationFrame(paintRailMotion);}
 function drawStack(){
  const layer=chosenLayer(),process=TrainingClock.state(atlasConfig,simTime),faceMode=process.phase==='backward'?'gradient':process.phase==='update'?'weight':'activation';
  if(stackCamera&&stackAutoFit&&fitMicrobatch!==process.mb&&!frontStatus)fitStack();
  const config=[L,atlasConfig.dense,atlasConfig.topk].join(':');
  if(config!==planeConfig){planeConfig=config;world.replaceChildren();annotation.replaceChildren();planeNodes.clear();planeLabels.clear();
   for(let l=L-1;l>=0;l--){const g=el('g',{class:'plane','data-layer':l,role:'button'});g.append(el('rect',{class:'outline',x:0,y:0,width:362,height:462,fill:'#131313',stroke:'#393939'}),el('g',{'data-matrix':l,transform:'translate(0 60)'}));world.append(g);planeNodes.set(l,g);const label=el('text',{class:'external-layer-number','data-layer':l,'font-family':'monospace','text-anchor':'end'},String(l));planeLabels.set(l,label);annotation.append(label);}
  }
  for(let l=0;l<L;l++){
   const g=planeNodes.get(l),selected=l===layer,ready=faceMode==='weight'||process.phase==='accumulate'||(process.backward?l>=process.layer:l<=process.layer);
   g.classList.toggle('chosen',selected);g.setAttribute('aria-pressed',String(selected));g.setAttribute('tabindex',stackPrimary?'0':'-1');g.setAttribute('aria-label',`Layer ${l} · ${l<atlasConfig.dense?'Dense':'MoE'}`);g.dataset.wbTip=`L${l} · 单击转正查看计算图`;
   const key=[faceMode,ready,selected].join(':');if(g.dataset.faceKey!==key){g.dataset.faceKey=key;g.querySelector('[data-matrix]').innerHTML=LayerStackFace.render({layer:l,mode:faceMode,ready,detailed:selected,dense:atlasConfig.dense,topk:atlasConfig.topk,lastLayer:L-1});g.querySelectorAll('title').forEach(n=>n.remove());const slot=g.querySelector('[data-matrix]'),box=slot.getBBox();slot.setAttribute('transform',`translate(${(362-box.width)/2-box.x} ${(462-box.height)/2-box.y})`);}
  }
  // Painter order is established once at creation: L(last) … L0.
  // Selection never promotes a plane above the nearer layers.
  geometry.update({count:L,selected:layer,side:stackSide,playing});
  rails.update({count:L,ga:atlasConfig.ga,process,selected:layer,geometry:geometry.snapshot()});
 }
 function sync(){
  const config=JSON.stringify(atlasConfig);if(config!==lastConfig){lastConfig=config;S.bucket=null;S.token=0;manual=false;stackCamera=null;drawKey='';}
  const mem=M.memory(selectedRank,atlasConfig,simTime);
  if(lastRank!==selectedRank){lastRank=selectedRank;const [lo,hi]=M.bounds(selectedRank,atlasConfig);if(chosenLayer()<lo||chosenLayer()>=hi)W.state.layer=M.moeLayer(selectedRank,atlasConfig)??lo;}
  document.body.classList.toggle('stack-primary',stackPrimary);
  if(frontStatus==='open'&&!W.state.query)leaveFront();
  swap.textContent=stackPrimary?'Rank ↗':'Layer Stack ↗';swap.setAttribute('aria-label',stackPrimary?'将 Rank 切换为主体':'将 Layer Stack 切换为主体');swap.dataset.wbTip=swap.getAttribute('aria-label');
  identity.innerHTML=`<strong>L${chosenLayer()} · ${chosenLayer()<atlasConfig.dense?'Dense':'MoE'}</strong>R${selectedRank} · ${L} Layers · ${worldSize} Rank`;
  $('graph-mode').textContent='计算图';
  document.querySelector('.view-dial:not(#stack-view-dial)').hidden=stackPrimary;stackDial.hidden=!stackPrimary;
  if(stackPrimary){$('zoom').textContent=stackCamera?Math.round(2600/stackCamera.w*100)+'%':'100%';}
  syncProgress();
  drawStack();if(!stackCamera)fitStack();syncSelects();normalizeControls();
  const tokenInput=$('training-token');if(tokenInput){const max=Math.max(0,Math.min(31,atlasConfig.seq/atlasConfig.cp-1));tokenInput.max=String(max);S.token=Math.min(max,S.token);tokenInput.value=String(S.token);tokenInput.setAttribute('aria-label',`跟踪来源 Rank 的 token，范围 0 至 ${max}`);tokenInput.dataset.wbTip=tokenInput.getAttribute('aria-label');tokenInput.closest('label').hidden=chosenLayer()<atlasConfig.dense;}
 }
 let lastPlaybackCursor=null,lastPlaybackStep=step;
 function followProcess(){
  if(manual||mode==='comm')return;let process=TrainingClock.state(atlasConfig,simTime);
  // Preserve every layer transition even when a costly Rank redraw misses a
  // browser frame. This is the source step axis, not an elapsed-time trace.
  if(playing&&step===lastPlaybackStep&&lastPlaybackCursor!==null&&process.cursor>lastPlaybackCursor+1){simTime=TrainingClock.time(atlasConfig,lastPlaybackCursor+1);process=TrainingClock.state(atlasConfig,simTime);}
  lastPlaybackCursor=process.cursor;lastPlaybackStep=step;if(process.layer===null)return;
  W.state.layer=process.layer;selectedRank=TrainingModel.rankForLayer(atlasConfig,selectedRank,process.layer);relationRank=selectedRank;lastRank=selectedRank;
 }
 render=function(){mode='explode';epIncidentActive=false;followProcess();originalRender();sync();};
 function setPrimary(next,animate=true){
  if(next===stackPrimary||swapTransition)return;
  const update=()=>{if(frontStatus)leaveFront();stackPrimary=next;document.body.classList.toggle('stack-primary',next);if(stackCamera){const cx=stackCamera.x+stackCamera.w/2,cy=stackCamera.y+stackCamera.h/2;stackCamera.h=stackCamera.w*innerHeight/innerWidth;stackCamera.x=cx-stackCamera.w/2;stackCamera.y=cy-stackCamera.h/2;applyStackCamera();}drawKey='';render();swap.focus({preventScroll:true});};
  if(!animate||matchMedia('(prefers-reduced-motion: reduce)').matches){update();return;}
  const scene=$('scene');stack.style.viewTransitionName='rank-swap-stage';scene.style.viewTransitionName='rank-swap-cube';
  if(document.startViewTransition){
   document.body.classList.add('composition-swapping');swapTransition=document.startViewTransition(update);swapTransition.ready.catch(()=>{});swapTransition.updateCallbackDone.catch(()=>{});
   swapTransition.finished.catch(()=>{}).finally(()=>{swapTransition=null;stack.style.viewTransitionName='';scene.style.viewTransitionName='';document.body.classList.remove('composition-swapping');});
  }else{
   const a=stack.getBoundingClientRect(),b=scene.getBoundingClientRect();update();
   const move=(node,from)=>{const to=node.getBoundingClientRect();return node.animate([{transformOrigin:'0 0',transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},{transformOrigin:'0 0',transform:'none'}],{duration:next?400:350,easing:'cubic-bezier(.22,1,.36,1)'});};
   swapTransition={};Promise.all([move(stack,a).finished,move(scene,b).finished].map(p=>p.catch(()=>{}))).finally(()=>{swapTransition=null;stack.style.viewTransitionName='';scene.style.viewTransitionName='';});
  }
 }
 swap.onclick=()=>setPrimary(!stackPrimary);
 const dialHost=document.createElement('div');dialHost.innerHTML=TrainingReferenceUI.dial;const stackDial=dialHost.firstElementChild;document.body.append(stackDial);stackDial.hidden=true;
 const presets=[{name:'2.5D',angle:-35,cube:['M74 45 99 59 74 74 49 59Z','M49 59 74 74 74 103 49 88Z','M74 74 99 59 99 88 74 103Z']},{name:'Front',angle:0,cube:['M49 49H99V99H49Z','M49 49H99V99H49Z','M49 49H99V99H49Z']},{name:'Side',angle:90,cube:['M49 49H99V99H49Z','M49 49H99V99H49Z','M49 49H99V99H49Z']}];
 function setStackView(index){stackView=index;const v=presets[index];stackSide=v.name==='Side';$('stack-view-name').textContent=v.name;$('stack-dial-marker').setAttribute('transform',`rotate(${v.angle} 74 74)`);stackDial.querySelectorAll('#stack-dial-cube path').forEach((n,i)=>n.setAttribute('d',v.cube[i]));$('stack-cycle-view').setAttribute('aria-label',`当前视角 ${v.name}，点击切换 ${presets[(index+1)%3].name}`);$('stack-cycle-view').dataset.wbTip=$('stack-cycle-view').getAttribute('aria-label');
  if(v.name==='Front'){enterFront(chosenLayer());}else{if(frontStatus)leaveFront();drawKey='';render();}
 }
 $('stack-cycle-view').onclick=()=>setStackView((stackView+1)%3);

 function leaveFront(keepGraph=false){
  if(!frontStatus)return;frontStatus=null;frontAnimation?.cancel();frontAnimation=null;$('training-layer-turn')?.remove();
  document.body.classList.remove('training-front-view');stackView=0;stackSide=false;
  $('stack-view-name').textContent='2.5D';stackDial.querySelectorAll('#stack-dial-cube path').forEach((n,i)=>n.setAttribute('d',presets[0].cube[i]));$('stack-dial-marker').setAttribute('transform','rotate(-35 74 74)');
  if(savedStackCamera){stackCamera={...savedStackCamera};savedStackCamera=null;applyStackCamera();}
  if(W.state.query&&!keepGraph)W.setGraph(false);
  stack.querySelector(`.plane[data-layer="${chosenLayer()}"]`)?.focus({preventScroll:true});
 }
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&frontStatus){e.preventDefault();e.stopImmediatePropagation();leaveFront();render();}},{capture:true});
 function enterFront(layer){
  if(frontStatus)return;selectLayer(layer);followDock(null);savedStackCamera={...stackCamera};frontStatus='opening';
  const g=planeNodes.get(layer),m=g.getScreenCTM();
  const reveal=()=>{frontAnimation=null;$('training-layer-turn')?.remove();document.body.classList.add('training-front-view');stackView=1;stackSide=false;$('stack-view-name').textContent='Front';stackDial.querySelectorAll('#stack-dial-cube path').forEach((n,i)=>n.setAttribute('d',presets[1].cube[i]));$('stack-dial-marker').setAttribute('transform','rotate(0 74 74)');W.setGraph(true);W.graphFit();W.focusMoe(true);frontStatus='open';$('graph-query').querySelector('[data-close-query]')?.focus({preventScroll:true});};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){reveal();return;}
  const overlay=el('svg',{id:'training-layer-turn',viewBox:`0 0 ${innerWidth} ${innerHeight}`,'aria-hidden':'true'}),copy=g.cloneNode(true);
  const originals=[g,...g.querySelectorAll('*')],copies=[copy,...copy.querySelectorAll('*')];
  originals.forEach((n,i)=>{const cs=getComputedStyle(n);for(const prop of ['fill','stroke','stroke-width','font-size','font-family','font-weight','text-anchor','dominant-baseline','opacity','display','paint-order','vector-effect'])copies[i].style.setProperty(prop,cs.getPropertyValue(prop));copies[i].removeAttribute('tabindex');});
  copy.removeAttribute('transform');overlay.append(copy);document.body.append(overlay);
  const scale=Math.min((innerWidth-240)/362,(innerHeight-200)/462),x=(innerWidth-362*scale)/2,y=(innerHeight-462*scale)/2;
  const style=getComputedStyle(document.documentElement);
  frontAnimation=copy.animate([{transform:`matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`},{transform:`matrix(${scale},0,0,${scale},${x},${y})`}],{duration:parseFloat(style.getPropertyValue('--training-turn-duration'))||400,easing:style.getPropertyValue('--training-turn-ease').trim()||'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
  frontAnimation.finished.then(reveal).catch(()=>{});
 }
 stack.addEventListener('wheel',e=>{if(!stackPrimary)return;e.preventDefault();zoomStack(Math.exp(-Math.max(-240,Math.min(240,e.deltaY))*.002),e.clientX,e.clientY);sync();},{passive:false});

 // Resolve a layer at its leading-edge lane before testing filled faces. A
 // popped foreground face otherwise steals every pointermove intended for the
 // next layer, freezing the dock while the cursor is actually moving across it.
 function pointerLayer(e){
  const direct=e.target.closest('.external-layer-number[data-layer]');if(direct)return Number(direct.dataset.layer);
  if(e.target.closest('.ground-rail'))return null;
  const m=stack.getScreenCTM();if(!m)return null;const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()),snapshot=geometry.snapshot();
  let nearest=null,distance=Infinity;
  snapshot.positions.forEach((p,l)=>{const dx=Math.abs(point.x-(p.x+snapshot.projectionX*12)),localY=point.y-p.y-snapshot.projectionY*12;if(dx<distance&&localY>=-28&&localY<=490){distance=dx;nearest=l;}});
  if(distance<=22)return nearest;
  const face=e.target.closest('.plane[data-layer]');return face?Number(face.dataset.layer):null;
 }
 let press=null,travel=0;
 stack.addEventListener('pointerdown',e=>{if(!stackPrimary||e.button!==0||e.target.closest('.ground-rail'))return;press={id:e.pointerId,x:e.clientX,y:e.clientY,c:{...stackCamera},target:planeNodes.get(pointerLayer(e))};travel=0;stack.setPointerCapture(e.pointerId);});
 stack.addEventListener('pointermove',e=>{if(!press)return;travel=Math.hypot(e.clientX-press.x,e.clientY-press.y);if(travel<4)return;stackAutoFit=false;const b=stack.getBoundingClientRect();stackCamera={...press.c,x:press.c.x-(e.clientX-press.x)*press.c.w/b.width,y:press.c.y-(e.clientY-press.y)*press.c.h/b.height};applyStackCamera();});
 stack.addEventListener('pointerup',e=>{if(!press)return;const p=press;press=null;if(travel<4&&p.target)enterFront(+p.target.dataset.layer);});
 stack.addEventListener('pointercancel',()=>{press=null;followDock(null)});
 let hoverPointer=null;stack.addEventListener('pointermove',e=>{if(press||e.pointerType==='touch'||hoverPointer&&hoverPointer.x===e.clientX&&hoverPointer.y===e.clientY)return;hoverPointer={x:e.clientX,y:e.clientY};followDock(pointerLayer(e));});stack.addEventListener('pointerleave',()=>{hoverPointer=null;followDock(null)});

 stack.addEventListener('keydown',e=>{const target=e.target.closest('[data-layer]');if(!target)return;if(['Enter',' '].includes(e.key)){e.preventDefault();enterFront(+target.dataset.layer);}if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const l=Math.max(0,Math.min(L-1,+target.dataset.layer+(e.key==='ArrowRight'?1:-1)));selectLayer(l);stack.querySelector(`[data-layer="${l}"]`)?.focus();}});
 stack.addEventListener('focusin',e=>{const g=e.target.closest('.plane[data-layer]');if(g)planeLabels.get(+g.dataset.layer).style.textDecoration='underline';});
 stack.addEventListener('focusout',e=>{const g=e.target.closest('.plane[data-layer]');if(g)planeLabels.get(+g.dataset.layer).style.textDecoration='';});
 for(const [id,factor] of [['plus',1.2],['minus',1/1.2]]){const fn=$(id).onclick;$(id).onclick=()=>{if(stackPrimary){zoomStack(factor);sync();}else fn?.();};}
 $('fit').onclick=()=>{if(stackPrimary){fitStack();sync();}else originalFit();};
 // Reuse inference's segmented request-track with Pangu's discrete F/B layer cursor.
 const progress=$('ep-playback'),controls=document.createElement('div'),track=document.createElement('div'),steps=document.createElement('nav');
 progress.className='training-progress';controls.className='mb-process';track.className='request-track';steps.id='training-steps';steps.setAttribute('aria-label','完整训练 Step：每个微批前向与反向');
 controls.append($('play'),$('restart'));track.append($('ep-progress'),steps);const phase=$('phase');progress.replaceChildren(controls,track,phase);document.body.append(progress);
 let progressConfig='';function syncProgress(){
  const process=TrainingClock.state(atlasConfig,simTime),key=[L,atlasConfig.ga].join(':');
  if(progressConfig!==key){progressConfig=key;steps.replaceChildren();for(let mb=0;mb<atlasConfig.ga;mb++)for(let backward=0;backward<2;backward++){const b=document.createElement('button');b.type='button';b.textContent=`μ${mb+1} ${backward?'B':'F'}`;b.dataset.start=String((mb*2+backward)*L);b.dataset.wbTip=`微批 ${mb+1} · ${backward?'反向 L'+(L-1)+' → L0':'前向 L0 → L'+(L-1)}`;b.onclick=()=>seekCursor(+b.dataset.start);steps.append(b);}for(const [offset,label]of [[0,'累积'],[1,'更新']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.start=String(atlasConfig.ga*L*2+offset);b.dataset.wbTip=label+'梯度 / 参数';b.onclick=()=>seekCursor(+b.dataset.start);steps.append(b);}}
  progress.hidden=false;steps.hidden=mode==='comm';if(mode==='comm')return;
  const axis=$('timeline');axis.min='0';axis.max=String(atlasConfig.ga*L*2+1);axis.step='1';axis.value=String(process.cursor);axis.setAttribute('aria-label','训练 Step 逐层播放轴');axis.style.setProperty('--played',`${process.cursor/Number(axis.max)*100}%`);
  const active=process.layer===null?atlasConfig.ga*2+(process.phase==='update'?1:0):process.mb*2+(process.backward?1:0);steps.style.gridTemplateColumns=`repeat(${atlasConfig.ga*2+2},minmax(0,1fr))`;[...steps.children].forEach((n,i)=>n.setAttribute('aria-current',i===active?'step':'false'));
  phase.textContent=`Step ${step} · μb ${process.mb+1}/${atlasConfig.ga} · ${process.phase==='forward'?'前向':process.phase==='backward'?'反向':process.phase==='update'?'权重更新':'梯度累积'}${process.layer===null?'':' · L'+process.layer}`;
  axis.setAttribute('aria-valuetext',phase.textContent);
 }
 const inheritedSeek=$('timeline').oninput;function seekCursor(cursor){manual=false;playing=false;lastFrame=null;simTime=TrainingClock.time(atlasConfig,cursor);render();}
 $('timeline').oninput=()=>{if(mode==='comm'){inheritedSeek();return;}seekCursor(+$('timeline').value);};
 const playAction=$('play').onclick;$('play').onclick=()=>{if(!playing)manual=false;playAction();};
 const restart=$('restart').onclick;$('restart').onclick=()=>{manual=false;restart?.();};
 // Retire the inherited scenario strip. Keep detached legacy references inert
 // so the copied host can update its existing bindings without null lookups.
 const scopeTabs=document.querySelector('.scope-switch');scopeTabs.hidden=true;scopeTabs.inert=true;
 const graphEntry=document.createElement('nav');graphEntry.className='bar training-graph-entry';graphEntry.setAttribute('aria-label','计算图操作');document.body.append(graphEntry);graphEntry.append($('graph-mode'));
 const toggleGraphEntry=$('graph-mode').onclick;$('graph-mode').onclick=()=>{toggleGraphEntry();if(W.state.query){W.setGraphWidth(innerWidth<760?innerWidth-48:innerWidth*.48);W.focusMoe(false);render();}};
 const scenarioStrip=document.querySelector('#ep-dock>nav[aria-label="视图操作"]');scenarioStrip.hidden=true;scenarioStrip.inert=true;scenarioStrip.querySelectorAll('button,select').forEach(n=>{n.disabled=true;n.tabIndex=-1;});
 $('communication-menu').remove();mode='explode';epIncidentActive=false;
 setAtlasMode=function(){mode='explode';epIncidentActive=false;render();};
 window.addEventListener('training:communication-selected',()=>{if(frontStatus)leaveFront(true);if(stackPrimary)setPrimary(false,false);scope='all';W.setGraphWidth(innerWidth<760?innerWidth-48:innerWidth*.48);originalFit();W.focusMoe(false);});
 // Existing drawer, plus the minimal token locator needed for route following.
 const tools=document.createElement('div');tools.id='graph-tools';tools.innerHTML='<button type="button" id="expert-overview" hidden>返回专家分布</button><label>Token <input id="training-token" type="number" min="0" max="31" step="1" value="0" aria-label="跟踪 token，范围 0 至 31"></label><button type="button" id="graph-fit">适应</button>';
 $('graph-query').querySelector('.graph-query-locator').after(tools);
 $('training-token').onchange=()=>{const n=Number($('training-token').value),max=Number($('training-token').max);S.token=Number.isInteger(n)?Math.max(0,Math.min(max,n)):0;$('training-token').value=S.token;W.refreshGraph();};
 $('graph-fit').onclick=()=>W.graphFit();
 $('expert-overview').onclick=()=>{S.bucket=null;S.searchExpert=null;$('query-op').value='';W.clearGraphSelection();W.refreshGraph();};
 $('graph-query').addEventListener('click',e=>{const g=e.target.closest('[data-training-bucket]');if(g){S.bucket=+g.dataset.trainingBucket;W.refreshGraph();}},true);
 $('graph-query').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-training-bucket]')){e.preventDefault();S.bucket=+e.target.dataset.trainingBucket;W.refreshGraph();}});
 const refresh=W.refreshGraph;W.refreshGraph=()=>{refresh();$('expert-overview').hidden=S.bucket===null;};
 // Native selects are retained as data inputs; the existing config-menu UI
 // provides the visible interaction, keyboard model and selected fill.
 const selects=new Map();let opened=null;
 function closeMenu(){if(!opened)return;opened.menu.hidden=true;opened.button.setAttribute('aria-expanded','false');opened=null;}
 function syncSelects(){
  document.querySelectorAll('select').forEach(select=>{
   if(!selects.has(select)){
    const button=document.createElement('button');button.type='button';button.className='config-trigger training-menu-trigger';button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',select.getAttribute('aria-label')||document.querySelector(`label[for="${select.id}"]`)?.textContent||select.id);
    button.dataset.wbTip=button.getAttribute('aria-label');select.after(button);const menu=document.createElement('div');menu.className='config-menu training-menu';menu.hidden=true;menu.setAttribute('role','listbox');menu.id=select.id+'-training-menu';button.setAttribute('aria-controls',menu.id);document.body.append(menu);
    const entry={select,button,menu};selects.set(select,entry);select.style.display='none';select.setAttribute('aria-hidden','true');select.tabIndex=-1;
    button.onclick=()=>{const was=opened===entry;closeMenu();if(was)return;menu.replaceChildren();Array.from(select.options).forEach((opt,i)=>{const b=document.createElement('button');b.type='button';b.role='option';b.dataset.wbTip=opt.textContent;b.setAttribute('aria-selected',String(opt.selected));b.textContent=opt.textContent;b.onclick=()=>{select.value=opt.value;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));closeMenu();syncSelects();button.focus();};menu.append(b);});
     const rect=button.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(innerWidth-260,rect.left))+'px';menu.style.top=Math.min(innerHeight-220,rect.bottom+8)+'px';menu.hidden=false;button.setAttribute('aria-expanded','true');opened=entry;menu.querySelector('[aria-selected=true]')?.focus();};
    menu.onkeydown=e=>{const opts=[...menu.children],at=opts.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMenu();button.focus();}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();opts[e.key==='Home'?0:e.key==='End'?opts.length-1:(at+(e.key==='ArrowDown'?1:-1)+opts.length)%opts.length]?.focus();}};
   }
   const {button}=selects.get(select),shown=select.id!=='relations'&&!select.hidden&&!select.classList.contains('hidden')&&getComputedStyle(select.parentElement).display!=='none';button.hidden=!shown;button.innerHTML='<span></span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" stroke-width="1.4"/></svg>';button.querySelector('span').textContent=select.selectedOptions[0]?.textContent||'—';
  });
 }
 document.addEventListener('pointerdown',e=>{if(opened&&!opened.menu.contains(e.target)&&!opened.button.contains(e.target))closeMenu();});
 // Reuse the existing information icon and centered usage-window component.
 const helpButton=$('shard-info').cloneNode(true);helpButton.id='training-help-open';helpButton.classList.remove('hidden');helpButton.setAttribute('aria-label','使用与来源');helpButton.dataset.wbTip='使用与来源';helpButton.removeAttribute('title');$('rank-settings-toggle').before(helpButton);
 const help=document.createElement('dialog');help.id='training-help';help.className='usage-window';help.setAttribute('aria-labelledby','training-help-title');help.innerHTML='<div class="panel-head"><h2 id="training-help-title">训练视图 · 使用与来源</h2><button type="button" id="training-help-close" aria-label="关闭帮助">×</button></div><h3>价值</h3><p>从模型层定位计算，再查看专家在 Rank 上的归属与通信。</p><h3>使用</h3><p>点击右下辅体互换 Rank 与 Layer Stack。点击 Layer 转正并聚焦 MoE；选择通信算子查看关联 Rank，修改 Token 跟踪 Top-K 路径。滚轮缩放、拖动画布，适应返回整体。</p><h3>扩展</h3><p>模型层数、专家数、Top-K 和并行度使用同一份配置。Route 跟踪范围为当前来源 Rank 的 token 0–31；通信关联按当前 Layer、TP lane 与 EP 组计算。</p><pre id="training-prompt">保持当前 Layer、Expert、Rank 和 Token 选择，核对专家归属、参数 shape 与通信组，并解释前向与反向的关系。</pre><button type="button" id="training-copy" aria-label="复制调查提示">复制</button><span id="training-copy-state" role="status"></span><h3>来源</h3><p>Rank Atlas · 训练专家分布 · Layer Stack。配置、分片和容量由宿主模型推导；播放轴表达过程顺序。</p>';
 document.body.append(help);
 const promptBlock=document.createElement('div');promptBlock.className='prompt-block';$('training-prompt').before(promptBlock);promptBlock.append($('training-prompt'),$('training-copy'));
 // Verbatim copy icon from logsumexp-case5's prompt-copy component.
 $('training-copy').innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></svg>';
 helpButton.onclick=()=>{closeMenu();help.showModal();};$('training-help-close').onclick=()=>help.close();help.addEventListener('close',()=>helpButton.focus());$('training-copy').onclick=async()=>{const status=$('training-copy-state');status.textContent='正在复制…';try{await Promise.race([navigator.clipboard.writeText($('training-prompt').textContent),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Clipboard timeout')),2000))]);status.textContent='已复制';}catch{status.textContent='复制失败，请选择文本复制';}};
 function normalizeControls(){
  document.querySelectorAll('button,input,summary,[role=option],[role=button]').forEach(n=>{if(n.hasAttribute('title')){n.dataset.wbTip=n.getAttribute('title');n.removeAttribute('title');}if(!n.dataset.wbTip)n.dataset.wbTip=n.getAttribute('aria-label')||n.textContent.trim()||n.id;});
  $('expert-overview').hidden=true;
 }
 // Escape is handled at the uppermost layer; lower host handlers do not also fire.
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(opened){e.stopImmediatePropagation();e.preventDefault();const b=opened.button;closeMenu();b.focus();return;}if(help.open)return;if(!$('rank-settings-panel').hidden){e.stopImmediatePropagation();setSettingsOpen(false);$('rank-settings-toggle').focus();return;}if(W.state.query){e.stopImmediatePropagation();W.closeGraph();return;}if(W.state.inspect){e.stopImmediatePropagation();W.hideDetails();}},true);
 window.addEventListener('resize',()=>{if(stackCamera){const b=stack.getBoundingClientRect(),cy=stackCamera.y+stackCamera.h/2;stackCamera.h=stackCamera.w*b.height/b.width;stackCamera.y=cy-stackCamera.h/2;applyStackCamera();}W.resizeGraph();});
 rootAPI();function rootAPI(){window.TrainingComposition={setPrimary,selectLayer,fitStack,setStackView,get primary(){return stackPrimary?'stack':'rank';},get layer(){return chosenLayer();},get camera(){return {...stackCamera};},get geometry(){return geometry.snapshot();},snapshot:()=>({primary:stackPrimary?'stack':'rank',layer:chosenLayer(),rank:selectedRank,time:simTime,step,playing,manual,stackCamera:{...stackCamera},graph:{...S}})};}
 originalFit();sync();
})();
