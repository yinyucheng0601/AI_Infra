/* Four source-grounded presentation builds. Motion is explanatory, never timing data. */
(()=>{
 'use strict';
 const slides=[...document.querySelectorAll('#deck>.slide')];
 const data=JSON.parse(document.querySelector('#launch-data').textContent);
 const reduce=matchMedia('(prefers-reduced-motion:reduce)');
 const captions=[["01 / 06　让开发者用更少注意力完成关键判断", "02 / 06　从结果与检查点 发现问题，再按需调查", "03 / 06　由问题复杂度和决策风险决定表达方式", "04 / 06　由决策困难触发可视化", "05 / 06　让开发者在关键时刻能够介入和纠正", "06 / 06　生成最少但足够的可视化"], ["01 / 06　总耗时只能说明慢，不能说明差异在哪", "02 / 06　按同一时间轴排列 Host 事件窗口", "03 / 06　Lane 6 最晚进入 runner_run", "04 / 06　查看 bind 与调用窗的原始区间", "05 / 06　检查 Lane 6 跨步骤是否重复出现", "06 / 06　每次展开，都回答一个更具体的问题"], ["01 / 06　先看 Layer Stack 完整设计", "02 / 06　保留层序，拉出当前层 L18", "03 / 06　沿层内计算定位 Query", "04 / 06　进入 Query 的 64 × 64 原型采样", "05 / 06　从分布进入具体采样坐标", "06 / 06　层、节点、模式与采样共同保留对象身份"], ["01 / 06　从选中对象开始，随时展开核查", "02 / 06　选中 scale[0,0]，指认两个关联输出", "03 / 06　改变参数，检查作用范围是否符合预期", "04 / 06　用算式检查联动是否有依据", "05 / 06　展开核查面板，整理问题与交接证据", "06 / 06　保留问题与证据，供下一轮继续核查"], ["01 / 06　全屏查看正式图元库", "02 / 06　浏览全部 20 张 Pattern 封面", "03 / 06　Dimension 累积构建，叠加真实界面", "04 / 06　图元、Pattern 与框架构成生成资产", "05 / 06　Skill 串联选择、组装与核查", "06 / 06　复用设计判断，约束 Agent 输出"]];
 captions.push(['从发现问题，到理解证据，再到介入纠正']);
 const notes=JSON.parse(document.querySelector('#speaker-data').textContent),panel=document.querySelector('.speaker-panel'),notesBody=panel.querySelector('.pinned-notes-content'),notesTrigger=document.querySelector('.notes-button');
 const notesDock=document.createElement('div');notesDock.className='notes-dock';document.body.append(notesDock);notesDock.append(notesTrigger,panel);
 notesTrigger.setAttribute('aria-expanded','false');let notesCloseTimer;
 function setNotes(open){clearTimeout(notesCloseTimer);document.body.classList.toggle('notes-open',open);notesTrigger.setAttribute('aria-expanded',String(open));}
 notesDock.addEventListener('pointerenter',()=>setNotes(true));notesDock.addEventListener('pointerleave',()=>{notesCloseTimer=setTimeout(()=>setNotes(false),180);});
 notesDock.addEventListener('focusin',()=>setNotes(true));notesDock.addEventListener('focusout',e=>{if(!notesDock.contains(e.relatedTarget))notesCloseTimer=setTimeout(()=>setNotes(false),180);});
 function renderNotes(){
  const n=notes[active];if(!n)return;notesBody.replaceChildren();
  const label=document.createElement('div');label.className='notes-step';label.textContent=`${active+1} / ${slides.length} · ${step<0?'理论封面':'分镜 '+(step-firstStep(slides[active])+1)}`;
  const current=document.createElement('p');current.className='notes-current';current.textContent=step<0?n.intro.script:n.steps[step];
  notesBody.append(label,current);
 }

 function toggleNotes(){setNotes(!document.body.classList.contains('notes-open'));}
 notesTrigger.addEventListener('click',e=>{if(matchMedia('(hover:none)').matches||e.detail===0)toggleNotes();else setNotes(true);});panel.querySelector('.notes-pin-close').addEventListener('click',()=>setNotes(false));
 let last=4;
 const firstStep=slide=>slide.id==='summary'?0:slide.id==='closing'?5:slide.id==='language'?0:-1;
 const lastStep=slide=>slide.id==='summary'?0:slide.id==='language'?4:5;
 captions[0]=captions[0].slice(0,5).map(t=>t.replace('/ 06','/ 05'));
 captions.push(Array(6).fill('生成最少但足够的可视化'));
 let active=-1,step=0,auto=true,timeout=null,remaining=null,deadline=0,mode='slide';
 const play=document.querySelector('[data-play]');
 const rootStyle=getComputedStyle(document.documentElement);
 const emphasis=Number.parseFloat(rootStyle.getPropertyValue('--duration-very-slow'))||500;
 const ease=rootStyle.getPropertyValue('--ease-smooth-out').trim()||'ease-out';
 let scaleModel=ScaleModel.create();
 const fmt=n=>Number.isInteger(n)?String(n):String(Math.round(n*1000)/1000);
 function pop(el){if(reduce.matches||!el)return;el.animate([{opacity:.2,transform:'translateY(12px)',filter:'blur(3px)'},{opacity:1,transform:'translateY(0)',filter:'blur(0)'}],{duration:emphasis,easing:ease});}
 function buildScale(){
  for(const id of ['x0','x1','y0','y1']){
   const grid=document.querySelector(`[data-matrix="${id}"]`);
   for(let i=0;i<60;i++){const c=document.createElement('span');c.className='data-cell'+(i===0?' selected':'');if(i!==0)c.setAttribute('aria-hidden','true');c.dataset.index=String(i+(id.endsWith('1')?60:0));grid.append(c);}
  }
  const svg=document.querySelector('#scale-ops');
  svg.innerHTML=VisualSystem.node('multiply','scale-multiply','',660,218)+VisualSystem.node('add','scale-add','',760,218);
  updateScale(false,false);
 }
 function updateScaleConnections(){
  if(slides[active]?.id!=='agent')return;
  const svg=document.querySelector('.scale-connections'),ctm=svg.getScreenCTM();if(!ctm)return;const inverse=ctm.inverse();
  const pt=(el,side)=>{const b=el.getBoundingClientRect();return new DOMPoint(side==='left'?b.left:side==='right'?b.right:b.left+b.width/2,side==='bottom'?b.bottom:side==='top'?b.top:b.top+b.height/2).matrixTransform(inverse);};
  const mul=document.querySelector('[data-object="scale-multiply"] circle'),add=document.querySelector('[data-object="scale-add"] circle'),m=pt(mul,'left'),a=pt(add,'right');
  const inputs=[...svg.querySelectorAll('.input-line')],outputs=[...svg.querySelectorAll('.result-line')];
  ['x0','x1'].forEach((id,i)=>{const p=pt(document.querySelector(`[data-matrix="${id}"]`),'right'),mx=(p.x+m.x)/2;inputs[i].setAttribute('d',`M${p.x} ${p.y} H${mx} V${m.y} H${m.x}`);});
  ['y0','y1'].forEach((id,i)=>{const p=pt(document.querySelector(`[data-matrix="${id}"]`),'left'),mx=(a.x+p.x)/2;outputs[i].setAttribute('d',`M${a.x} ${a.y} H${mx} V${p.y} H${p.x}`);});
  const value=pt(document.querySelector('[data-scale-value]'),'bottom'),top=pt(mul,'top');svg.querySelector('.parameter-line').setAttribute('d',`M${value.x} ${value.y+5} H${top.x} V${top.y}`);
 }
 function updateScale(changed,animate=true){
  scaleModel.s[0]=changed?1:-1;
  for(const id of ['x0','x1','y0','y1']){
   document.querySelectorAll(`[data-matrix="${id}"] .data-cell`).forEach(c=>{const i=+c.dataset.index;const n=id.startsWith('x')?scaleModel.x[i]:ScaleModel.element(scaleModel,i).y;const old=c.textContent;c.textContent=fmt(n);c.title=`${id.startsWith('x')?'x':'y'}[${Math.floor(i/60)},${Math.floor(i/10)%6},${i%10}] = ${n}`;if(animate&&old!==c.textContent&&c.classList.contains('selected'))pop(c);});
  }
  const val=document.querySelector('[data-scale-value]');const old=val.textContent;val.textContent=changed?'1':'−1';if(animate&&old!==val.textContent)pop(val);
  [0,60].forEach((i,b)=>{const el=document.querySelector(`[data-readout="${b}"]`),text=fmt(ScaleModel.element(scaleModel,i).y);if(el.textContent!==text){el.textContent=text;if(animate)pop(el);}});
  document.querySelector('.handoff-object').textContent='y['+ScaleModel.context(scaleModel,0).selection.coord.join(',')+']';
  document.querySelector('.impact-number').textContent=String(ScaleModel.affected(scaleModel,0).length);
 }
 function buildLanes(){
  const s=data.d23,critical=s.lanes.reduce((a,b)=>b.rrStart>a.rrStart?b:a);
  const lo=-100,hi=280,W=1200,H=440,x=v=>(v-lo)/(hi-lo)*W;
  const hostY=i=>35+i*9,deviceY=i=>245+i*9;
  let body='<svg viewBox="0 0 1200 440" class="lane-svg" aria-label="D23：16 条 Host bind 与 runner_run 调用窗口，共享毫秒时间轴">';
  body+='<line x1="'+x(0)+'" x2="'+x(0)+'" y1="15" y2="410" stroke="#283323" stroke-dasharray="3 7"/>';
  for(const kind of ['bind','runner'])s.lanes.forEach((l,i)=>{
   const y=kind==='bind'?hostY(i):deviceY(i),start=kind==='bind'?l.bindStart:l.rrStart,end=kind==='bind'?l.bindEnd:l.rrEnd;
   body+=`<g class="lane-row ${l.dev===critical.dev?'critical':''}" data-lane="${l.dev}"><text x="-25" y="${y+5}" class="svg-lane-number">${l.dev}</text><rect class="lane-window ${kind}" x="${x(start)}" y="${y}" width="${x(end)-x(start)}" height="5" style="--row:${i}"><title>lane ${l.dev} · ${kind} · ${fmt(start)}–${fmt(end)} ms</title></rect></g>`;
  });
  const ci=s.lanes.findIndex(l=>l.dev===critical.dev);
  body+=`<g class="critical-connector"><path d="M${x(critical.bindEnd)} ${hostY(ci)+2.5} H${x(critical.rrStart)} V${deviceY(ci)+2.5}"/></g>`;
  [-100,0,100,200].forEach(t=>body+=`<text class="svg-axis" x="${x(t)}" y="432" text-anchor="middle">${t} ms</text>`);
  body+='</svg>';document.querySelector('#lane-chart').innerHTML=body;
  document.querySelector('[data-critical]').textContent=critical.dev;
  document.querySelector('[data-entry]').innerHTML=fmt(critical.rrStart)+' <small>ms</small>';
 }
 function drawSample(){
  const {values,limit}=data.sample,c=document.querySelector('#layer-sample'),ctx=c.getContext('2d');
  const stops=[[0,[51,51,51]],[.28,[80,80,80]],[.55,[136,136,136]],[.78,[188,188,188]],[1,[238,238,238]]];
  ctx.fillStyle='#080a09';ctx.fillRect(0,0,512,512);
  values.forEach((v,i)=>{const t=Math.pow(Math.max(0,Math.min(1,Math.abs(v)/limit)),.8);let k=0;while(k<stops.length-2&&t>stops[k+1][0])k++;const[a,ca]=stops[k],[b,cb]=stops[k+1],f=(t-a)/(b-a);ctx.fillStyle='rgb('+ca.map((x,j)=>Math.round(x+(cb[j]-x)*f)).join(',')+')';ctx.fillRect((i%64)*8,Math.floor(i/64)*8,7.5,7.5);});
 }
 function updateQueryLink(){
  if(slides[active]?.id!=='layers'||step<3)return;
  const selected=document.querySelector('.selected-plane [data-node="query-activation"] .tensor-outline'),canvas=document.querySelector('#layer-sample'),svg=document.querySelector('.query-link');
  if(!selected)return;const a=selected.getBoundingClientRect(),b=canvas.getBoundingClientRect(),ctm=svg.getScreenCTM();if(!ctm)return;
  const inverse=ctm.inverse(),from=new DOMPoint(a.right,a.top+a.height/2).matrixTransform(inverse),to=new DOMPoint(b.left,b.top+b.height*.22).matrixTransform(inverse);
  const sx=from.x,sy=from.y,tx=to.x,ty=to.y,m=(sx+tx)/2;
  svg.querySelector('path').setAttribute('d',`M${sx} ${sy} H${m} V${ty} H${tx}`);
 }
 function updateFrameworkLink(){}
 function syncFramework(){const frame=document.querySelector('.asset-framework iframe');if(frame?.contentWindow)frame.contentWindow.postMessage({type:'csa-dimension',playing:slides[active]?.id==='system'&&step===2},location.origin);}
 function syncLayerDemo(){const frame=document.querySelector('#layers iframe');if(frame?.contentWindow)frame.contentWindow.postMessage({type:'deck-layer-playback',playing:slides[active]?.id==='layers'&&step===0},location.origin);}
 function clearClock(){if(timeout!==null){remaining=Math.max(0,deadline-performance.now());clearTimeout(timeout);timeout=null;}}
 function updateControl(){document.querySelector('[data-prev]').disabled=active===0&&step===0;document.querySelector('[data-next]').disabled=active===slides.length-1&&step===last;play.textContent=step<0?'进入案例':step===last?'已播完':auto?'暂停':'继续';play.disabled=step===last;play.dataset.icon=step<0?'▶':step===last?'✓':auto?'Ⅱ':'▶';play.setAttribute('aria-label',step<0?'进入案例并自动播放':step===last?'本页已播完':auto?'暂停分步演示':'继续分步演示');play.setAttribute('title',step<0?'进入案例（空格 / →）':step===last?'本页已播完；R 返回第一页':auto?'暂停（空格 / P）':'继续（空格 / P）');document.querySelector('.scene-progress').style.setProperty('--progress',((slides.slice(0,active).reduce((sum,s)=>sum+lastStep(s)-firstStep(s)+1,0)+step-firstStep(slides[active])+1)/slides.reduce((sum,s)=>sum+lastStep(s)-firstStep(s)+1,0)*100)+'%');}
 function schedule(){clearClock();if(!auto||step<0||step>=last||mode!=='slide'||document.hidden)return;const duration=remaining??(slides[active]?.id==='system'&&step===2?10000:step<0?8000:step===0?(slides[active]?.id==='language'?4800:2400):step===3?4400:3300);deadline=performance.now()+duration;timeout=setTimeout(()=>{timeout=null;remaining=null;setStep(step+1);schedule();},duration);}

 function setStep(n){
  clearClock();remaining=null;
  const cards=active===0?[...slides[0].querySelectorAll(".principle-card")]:[];
  cards.forEach(el=>el.getAnimations().forEach(animation=>animation.cancel()));
  const before=cards.map(el=>el.getBoundingClientRect());
  const previousStep=step;step=Math.max(firstStep(slides[active]),Math.min(last,n));const slide=slides[active];slide.dataset.direction=step<previousStep?'back':'forward';slide.dataset.step=String(step);slide.dataset.depth=step>=3?'detail':'overview';document.documentElement.style.setProperty('--active-accent',getComputedStyle(slide).getPropertyValue('--accent'));
  if(previousStep<0&&step===0){slide.dataset.chapterReady='false';requestAnimationFrame(()=>requestAnimationFrame(()=>{slide.dataset.chapterReady='true'}));}
  if(slide.id==='language'){
   const focus=[-1,1,0,0,2,-1][step];
   slide.querySelectorAll('[data-module]').forEach((el,i)=>{el.classList.toggle('is-focused',Number(el.dataset.module)===focus);});
   if(!reduce.matches&&step!==previousStep)cards.forEach((el,i)=>{const a=before[i],b=el.getBoundingClientRect();if(a.width&&b.width)el.animate([{transform:`translate(${a.left-b.left}px,${a.top-b.top}px) scale(${a.width/b.width},${a.height/b.height})`},{transform:"none"}],{duration:850,easing:"cubic-bezier(.22,1,.36,1)"});});

  }
  const caption=slide.querySelector('[data-caption]');if(step>=0&&caption.textContent!==captions[active][step]){caption.textContent=captions[active][step];pop(caption);}
  if(slide.id==='system'){const head=slide.querySelector('.asset-series-head');head.getAnimations().forEach(a=>a.cancel());if(step===2&&!reduce.matches)head.animate([{opacity:1},{opacity:0}],{delay:1000,duration:400,fill:'forwards',easing:ease});}
  if(slide.id==='system'&&step>=0&&step<=2){document.querySelector('[data-series-title]').textContent=['01 原子图元','02 组合 Pattern','03 框架画布'][step];document.querySelectorAll('[data-series-node]').forEach(el=>el.classList.toggle('current',Number(el.dataset.seriesNode)===step));}
  if(slide.id==='framework'){requestAnimationFrame(updateFrameworkLink);setTimeout(updateFrameworkLink,550);}
  if(slide.id==='agent'){updateScale(step>=2);requestAnimationFrame(updateScaleConnections);setTimeout(updateScaleConnections,550);}
  if(slide.id==='layers'&&step>=3){requestAnimationFrame(updateQueryLink);setTimeout(updateQueryLink,1150);}
  if(slide.id==='agent'){slide.classList.toggle('audit-open',step===4);updateAudit();}syncFramework();syncLayerDemo();renderNotes();updateControl();
 }
 function enter(index){
  const previous=slides[active]?.id;
  const source=previous==='closing'&&slides[index]?.id==='summary'?document.querySelector('#closing .bento-conclusion'):null;
  const sourceBox=source?.getBoundingClientRect();
  if(sourceBox&&!reduce.matches){requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const target=document.querySelector('.minimal-viz-title'),box=target.getBoundingClientRect();
   target.animate([{transform:`translate(${sourceBox.left-box.left}px,${sourceBox.top-box.top}px) scale(${sourceBox.width/box.width},${sourceBox.height/box.height})`,background:'#f1ece3',borderRadius:'12px'},{transform:'none',background:'transparent',borderRadius:'0px'}],{duration:700,easing:'cubic-bezier(.22,1,.36,1)'});
   document.querySelector('.summary-inner>svg').animate([{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'none'}],{duration:500,delay:350,fill:'backwards',easing:'cubic-bezier(.22,1,.36,1)'});
  }));}

  clearClock();remaining=null;active=index;auto=firstStep(slides[active])>=0;last=lastStep(slides[active]);slides.forEach((s,i)=>{s.classList.toggle('launch-paused',!auto);if(i!==active){s.querySelector('.t-stagger')?.classList.remove('is-shown');s.dataset.step=s.id==='closing'?'5':'0';s.dataset.depth=s.id==='closing'?'detail':'overview';}});
  slides[active].dataset.chapterReady='false';requestAnimationFrame(()=>requestAnimationFrame(()=>{slides[index].dataset.chapterReady='true';}));
  const block=slides[active].querySelector('.t-stagger');block.classList.remove('is-hiding','is-shown');void block.offsetHeight;requestAnimationFrame(()=>block.classList.add('is-shown'));
  setStep(firstStep(slides[active]));schedule();
 }
 function manual(){clearClock();auto=false;slides[active].classList.add('launch-paused');}
 function advance(){if(step<0){clearClock();auto=true;slides[active].classList.remove('launch-paused');setStep(0);schedule();return;}manual();if(step<last)setStep(step+1);else if(active<slides.length-1)window.DeckNav.goTo(active+1);}
 function back(){manual();if(step>(firstStep(slides[active])))setStep(step-1);else if(active>0){window.DeckNav.goTo(active-1);setStep(last);}}
 function restart(){manual();const first=slides.findIndex(slide=>slide.id==='language');window.DeckNav.setView('slide',false);if(active!==first)window.DeckNav.goTo(first);else enter(first);manual();setStep(0);updateControl();}
 function replay(){auto=true;slides[active].classList.remove('launch-paused');enter(active);}
 function toggle(){if(step<0){advance();return;}if(step===last){clearClock();auto=false;updateControl();return;}auto=!auto;slides[active].classList.toggle('launch-paused',!auto);updateControl();schedule();}
 document.querySelector('#layers iframe').addEventListener('load',syncLayerDemo);window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===document.querySelector('#layers iframe').contentWindow&&event.data?.type==='layer-demo-ready')syncLayerDemo();});

 const auditSlide=document.querySelector('#agent'),auditTrigger=auditSlide.querySelector('.scale-audit-trigger'),auditQuestion=document.querySelector('#scale-story-question');
 function auditContext(){return ScaleModel.context(scaleModel,0,auditQuestion.value);}
 function updateAudit(){const e=ScaleModel.element(scaleModel,0);auditTrigger.setAttribute('aria-expanded',String(auditSlide.classList.contains('audit-open')));document.querySelector('[data-audit-values]').innerHTML=`<p class="audit-equation">${e.x} × ${e.scale} − 1.5 = <b>${e.y}</b></p><p class="audit-delta">Δy ${e.delta} · 关联输出 ${ScaleModel.affected(scaleModel,0).length} 个</p>`;document.querySelector('[data-audit-evidence]').textContent=JSON.stringify(auditContext(),null,2);}
 auditTrigger.onclick=()=>{auditSlide.classList.toggle('audit-open');updateAudit();};document.querySelector('[data-audit-close]').onclick=()=>{auditSlide.classList.remove('audit-open');updateAudit();auditTrigger.focus();};auditQuestion.addEventListener('input',updateAudit);
 document.querySelector('[data-audit-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(auditContext(),null,2));document.querySelector('[data-audit-status]').textContent='已复制问题与证据';}catch{document.querySelector('[data-audit-status]').textContent='请从证据预览选择复制';}};
 document.querySelector('[data-audit-export]').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(auditContext(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='scale-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===document.querySelector('.asset-framework iframe')?.contentWindow&&e.data?.type==='csa-dimension-ready')syncFramework();});
 buildScale();buildLanes();drawSample();document.querySelector('[data-sample-value]').textContent=fmt(data.sample.values[18*64+35]);
 document.querySelectorAll('.reuse-gallery figure').forEach((el,i)=>el.style.setProperty('--order',String(i)));
 document.addEventListener('deck:change',e=>{const index=e.detail.index;if(index!==active)enter(index);});
 document.addEventListener('deck:view',e=>{mode=e.detail.view==='navigator'?'slide':e.detail.view;schedule();});
 document.addEventListener('keydown',e=>{if(e.metaKey&&e.shiftKey&&e.key.toLowerCase()==='r'){e.preventDefault();e.stopImmediatePropagation();restart();return;}if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('.lightbox.open')||e.target.closest('input,textarea,select,[contenteditable]'))return;if(e.key==='r'||e.key==='R'){e.preventDefault();restart();}if(e.key==='p'||e.key==='P'){e.preventDefault();toggle();}});
 play.addEventListener('click',toggle);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearClock();else schedule();});
 reduce.addEventListener('change',schedule);

 new ResizeObserver(()=>requestAnimationFrame(updateFrameworkLink)).observe(document.querySelector('#system'));
 new ResizeObserver(()=>requestAnimationFrame(updateQueryLink)).observe(document.querySelector('#layers'));
 new ResizeObserver(()=>requestAnimationFrame(updateScaleConnections)).observe(document.querySelector('#agent'));
 const hoverZone=document.createElement('div');hoverZone.className='playback-hover-zone';hoverZone.setAttribute('aria-hidden','true');document.body.append(hoverZone);let controlsTimer;
 function showControls(){clearTimeout(controlsTimer);document.body.classList.add('controls-awake');}
 function hideControls(){clearTimeout(controlsTimer);controlsTimer=setTimeout(()=>{if(!document.querySelector('.deck-view-switcher:hover,.deck-view-switcher:focus-within'))document.body.classList.remove('controls-awake');},180);}
 hoverZone.addEventListener('pointerenter',showControls);hoverZone.addEventListener('pointerleave',hideControls);const controls=document.querySelector('.deck-view-switcher');controls.addEventListener('pointerenter',showControls);controls.addEventListener('pointerleave',hideControls);controls.addEventListener('focusin',showControls);controls.addEventListener('focusout',hideControls);document.addEventListener('pointermove',e=>{if(e.clientY>=innerHeight-64)showControls();else hideControls();},{passive:true});document.body.classList.remove('controls-awake');
 function bindRestart(frame){try{const doc=frame.contentDocument;if(!doc||doc.documentElement.dataset.deckRestartBound)return;doc.documentElement.dataset.deckRestartBound='true';doc.addEventListener('keydown',e=>{if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest('input,textarea,select,[contenteditable],button,a')){const action=e.key.toLowerCase()==='r'?restart:e.key===' '?toggle:e.key==='ArrowRight'||e.key==='ArrowDown'?advance:e.key==='ArrowLeft'||e.key==='ArrowUp'?back:e.key==='PageDown'?()=>window.DeckNav.goTo(Math.min(slides.length-1,active+1)):e.key==='PageUp'?()=>window.DeckNav.goTo(Math.max(0,active-1)):null;if(action){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)action();return;}}if(e.metaKey&&e.shiftKey&&e.key.toLowerCase()==='r'){e.preventDefault();e.stopImmediatePropagation();restart();}},true);}catch{}}
 document.querySelectorAll('iframe').forEach(frame=>{frame.addEventListener('load',()=>bindRestart(frame));bindRestart(frame);});
 const edgeNav=document.createElement('div');edgeNav.className='navigator-hover-zone';edgeNav.setAttribute('aria-hidden','true');document.body.append(edgeNav);
 const navPanel=document.querySelector('.deck-navigator');let hoverNav=false,navCloseTimer;
 function openEdgeNav(){clearTimeout(navCloseTimer);if(document.body.classList.contains('preview-open')||document.body.classList.contains('navigator-open'))return;hoverNav=true;window.DeckNav.setView('navigator',false);}
 function closeEdgeNav(){clearTimeout(navCloseTimer);navCloseTimer=setTimeout(()=>{if(hoverNav&&!navPanel.matches(':hover')&&!navPanel.contains(document.activeElement)){hoverNav=false;window.DeckNav.setView('slide',false);}},220);}
 edgeNav.addEventListener('pointerenter',openEdgeNav);edgeNav.addEventListener('pointerleave',closeEdgeNav);
 navPanel.addEventListener('pointerenter',()=>clearTimeout(navCloseTimer));navPanel.addEventListener('pointerleave',closeEdgeNav);navPanel.addEventListener('focusout',closeEdgeNav);
 navPanel.addEventListener('click',e=>{if(e.target.closest('.nav-item')){hoverNav=false;window.DeckNav.setView('slide',false);}});
 window.DeckMotion={advance,back,replay,toggle,getState:()=>({index:active,step,auto,mode}),getScaleContext:()=>ScaleModel.context(scaleModel,0)};
 // Touch navigation follows the same frame actions as the keyboard.
 const touchUI=()=>matchMedia('(pointer:coarse), (max-width:700px)').matches;
 const blocked='button,a,input,textarea,select,[contenteditable],.notes-dock,.deck-view-switcher,.deck-navigator,.deck-lighttable,.lightbox,.scale-audit-panel';
 function bindTouch(doc){
  if(doc.documentElement.dataset.deckTouchBound)return;doc.documentElement.dataset.deckTouchBound='true';
  let start=null;
  doc.addEventListener('touchstart',e=>{if(!touchUI()||mode!=='slide'||e.touches.length!==1||e.target.closest(blocked)){start=null;return;}const t=e.touches[0];start={x:t.clientX,y:t.clientY,time:performance.now()};},{passive:true});
  doc.addEventListener('touchcancel',()=>start=null,{passive:true});
  doc.addEventListener('touchend',e=>{if(!start)return;const a=start;start=null;if(e.touches.length||!e.changedTouches.length)return;const t=e.changedTouches[0],dx=t.clientX-a.x,dy=t.clientY-a.y,dist=Math.max(Math.abs(dx),Math.abs(dy));
   if(dist>48&&performance.now()-a.time<1200){if(e.cancelable)e.preventDefault();(Math.abs(dx)>Math.abs(dy)?dx:dy)<0?advance():back();}
   else if(dist<10&&performance.now()-a.time<350){if(e.cancelable)e.preventDefault();toggle();}
  },{passive:false});
 }
 bindTouch(document);document.querySelectorAll('iframe').forEach(frame=>{const bind=()=>{try{if(frame.contentDocument)bindTouch(frame.contentDocument);}catch{}};frame.addEventListener('load',bind);bind();});
 const icons={slide:'▣',navigator:'☷',overview:'⊞'};document.querySelectorAll('[data-view]').forEach(b=>{if(icons[b.dataset.view])b.dataset.icon=icons[b.dataset.view];});
 enter(window.deckCurrent||0);
})();

