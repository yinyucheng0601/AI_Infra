/* Four source-grounded presentation builds. Motion is explanatory, never timing data. */
(()=>{
 'use strict';
 const slides=[...document.querySelectorAll('#deck>.slide')];
 const data=JSON.parse(document.querySelector('#launch-data').textContent);
 const reduce=matchMedia('(prefers-reduced-motion:reduce)');
 const captions=[
  ['01 / 06　先看 Scale 完整设计','02 / 06　用联动选择显现参数共享','03 / 06　只更新实际关联的两个输出','04 / 06　把视觉对应展开为可核查的算式','05 / 06　保留对象、配置与来源','06 / 06　让当前调查进入开发者的 Agent 工作流'],
  ['01 / 06　先看执行泳道完整设计','02 / 06　降低背景强度，聚焦 lane 6','03 / 06　按同一时间轴比较进入时刻','04 / 06　展开当前泳道的事件读数','05 / 06　从视觉聚焦回到原始事件','06 / 06　用位置比较时间，用层级组织调查'],
  ['01 / 06　先看 Layer Stack 完整设计','02 / 06　保留层序，拉出当前层 L18','03 / 06　沿层内计算定位 Query','04 / 06　进入 Query 的 64 × 64 原型采样','05 / 06　从分布进入具体采样坐标','06 / 06　层、节点、模式与采样共同保留对象身份'],
  ['01 / 06　图元统一对象的视觉语义','02 / 06　Pattern 组织对象关系与联动','03 / 06　Skill 记录表达与核查方法','04 / 06　明确输入、设计约束与交付检查','05 / 06　在已有场景中复用','06 / 06　复用时持续核查语义、来源与选择']
 ];
 captions.unshift(['01 / 06　从设计目标推导视觉特征','02 / 06　分离对象角色与当前焦点','03 / 06　用形态辨认对象，用连线组织关系','04 / 06　用字体与空间建立阅读层级','05 / 06　并置层级概念与视觉状态','06 / 06　用三个场景验证视觉规则']);
 captions.splice(1,0,['01 / 06　主体占据连续画布','02 / 06　按信息职责建立阅读层级','03 / 06　同一任务的操作集中成组','04 / 06　对象导航与视角控制各司其职','05 / 06　检查浮层出现，主体视角保持','06 / 06　由空间、分组与按需信息共同构成框架']);
 const notes=JSON.parse(document.querySelector('#speaker-data').textContent),panel=document.querySelector('.speaker-panel'),notesBody=panel.querySelector('.pinned-notes-content'),notesTrigger=document.querySelector('.notes-button');
 document.body.classList.add('notes-pinned');
 function renderNotes(){
  const n=notes[active];if(!n)return;notesBody.replaceChildren();
  const label=document.createElement('div');label.className='notes-step';label.textContent=`${active+1} / ${slides.length} 幕 · ${step+1} / 6 画面`;
  const title=document.createElement('h2');title.textContent=n.title;
  const current=document.createElement('p');current.className='notes-current';current.textContent=n.steps[step];
  notesBody.append(label,title,current);
  const full=document.createElement('details'),summary=document.createElement('summary');summary.textContent='本幕完整讲稿';full.append(summary);n.steps.forEach((t,i)=>{const e=document.createElement('p');e.textContent=`${i+1}. ${t}`;full.append(e);});notesBody.append(full);
  const sources=document.createElement('details'),sh=document.createElement('summary');sh.textContent='来源与范围';sources.append(sh);n.sources.forEach(s=>{const a=document.createElement('a');a.href=s.url||'https://github.com/yinyucheng0601/AI_Infra/blob/main/'+s.path;a.target='_blank';a.rel='noopener';a.textContent=s.label;sources.append(a);});const bound=document.createElement('p');bound.textContent=n.boundary;sources.append(bound);notesBody.append(sources);
 }
 function toggleNotes(){const pinned=document.body.classList.toggle('notes-pinned');notesTrigger.setAttribute('aria-expanded',String(pinned));}
 notesTrigger.addEventListener('click',toggleNotes);panel.querySelector('.notes-pin-close').addEventListener('click',toggleNotes);
 const last=5;
 let active=-1,step=0,auto=false,timeout=null,mode='slide';
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
 function updateFrameworkLink(){
  if(slides[active]?.id!=='framework'||step<4)return;
  const selected=document.querySelector('.fw-plane [data-node="query-activation"] .tensor-outline'),inspector=document.querySelector('.fw-inspector'),svg=document.querySelector('.fw-inspect-link');
  if(!selected||!svg.getScreenCTM())return;
  const a=selected.getBoundingClientRect(),b=inspector.getBoundingClientRect(),inv=svg.getScreenCTM().inverse();
  const from=new DOMPoint(a.right,a.top+a.height/2).matrixTransform(inv),to=new DOMPoint(b.left,b.top+b.height*.3).matrixTransform(inv),mid=(from.x+to.x)/2;
  svg.querySelector('path').setAttribute('d',`M${from.x} ${from.y} H${mid} V${to.y} H${to.x}`);
 }
 function clearClock(){if(timeout!==null){clearTimeout(timeout);timeout=null;}}
 function updateControl(){document.querySelector('[data-prev]').disabled=active===0&&step===0;document.querySelector('[data-next]').disabled=active===slides.length-1&&step===last;play.textContent=step===last?'重播':auto?'暂停':'播放';play.setAttribute('aria-label',step===last?'重播本页动效':auto?'暂停分步演示':'播放分步演示');play.setAttribute('title',step===last?'重播本页（R）':auto?'暂停分步演示（P）':'播放分步演示（P）');document.querySelector('.scene-progress').style.setProperty('--progress',((active*6+step+1)/(slides.length*6)*100)+'%');}
 function schedule(){clearClock();if(!auto||reduce.matches||step>=last||mode!=='slide'||document.hidden)return;timeout=setTimeout(()=>{setStep(step+1);schedule();},step===0?2400:step===3?4400:3300);}
 function setStep(n){
  step=Math.max(0,Math.min(last,n));const slide=slides[active];slide.dataset.step=String(step);slide.dataset.depth=step>=3?'detail':'overview';document.documentElement.style.setProperty('--active-accent',getComputedStyle(slide).getPropertyValue('--accent'));
  const caption=slide.querySelector('[data-caption]');if(caption.textContent!==captions[active][step]){caption.textContent=captions[active][step];pop(caption);}
  if(slide.id==='framework'){requestAnimationFrame(updateFrameworkLink);setTimeout(updateFrameworkLink,550);}
  if(slide.id==='agent'){updateScale(step>=2);requestAnimationFrame(updateScaleConnections);setTimeout(updateScaleConnections,550);}
  if(slide.id==='layers'&&step>=3){requestAnimationFrame(updateQueryLink);setTimeout(updateQueryLink,1150);}
  renderNotes();updateControl();
 }
 function enter(index){
  clearClock();active=index;slides.forEach((s,i)=>{s.classList.toggle('launch-paused',!auto);if(i!==active){s.querySelector('.t-stagger')?.classList.remove('is-shown');s.dataset.step='0';s.dataset.depth='overview';}});
  const block=slides[active].querySelector('.t-stagger');block.classList.remove('is-hiding','is-shown');void block.offsetHeight;requestAnimationFrame(()=>block.classList.add('is-shown'));
  setStep(reduce.matches?last:0);schedule();
 }
 function manual(){clearClock();auto=false;slides[active].classList.add('launch-paused');}
 function advance(){manual();if(step<last)setStep(step+1);else if(active<slides.length-1)window.DeckNav.goTo(active+1);}
 function back(){manual();if(step>0)setStep(step-1);else if(active>0){window.DeckNav.goTo(active-1);setStep(last);}}
 function replay(){auto=true;slides[active].classList.remove('launch-paused');enter(active);}
 function toggle(){if(step===last){replay();return;}auto=!auto;slides[active].classList.toggle('launch-paused',!auto);updateControl();schedule();}
 buildScale();buildLanes();drawSample();document.querySelector('[data-sample-value]').textContent=fmt(data.sample.values[18*64+35]);document.querySelector('[data-framework-value]').textContent=fmt(data.sample.values[18*64+35]);
 document.querySelectorAll('.reuse-gallery figure').forEach((el,i)=>el.style.setProperty('--order',String(i)));
 document.addEventListener('deck:change',e=>{const index=e.detail.index;if(index!==active)enter(index);});
 document.addEventListener('deck:view',e=>{mode=e.detail.view;schedule();});
 document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('.lightbox.open')||e.target.closest('input,textarea,select,[contenteditable]'))return;if(e.key==='r'||e.key==='R'){e.preventDefault();replay();}if(e.key==='p'||e.key==='P'){e.preventDefault();toggle();}});
 play.addEventListener('click',toggle);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clearClock();else schedule();});
 reduce.addEventListener('change',()=>{if(reduce.matches){clearClock();setStep(last);}else schedule();});

 new ResizeObserver(()=>requestAnimationFrame(updateFrameworkLink)).observe(document.querySelector('#framework'));
 new ResizeObserver(()=>requestAnimationFrame(updateQueryLink)).observe(document.querySelector('#layers'));
 new ResizeObserver(()=>requestAnimationFrame(updateScaleConnections)).observe(document.querySelector('#agent'));
 let hideTimer;function wake(){document.body.classList.add('controls-awake');clearTimeout(hideTimer);hideTimer=setTimeout(()=>document.body.classList.remove('controls-awake'),2200);}
 document.addEventListener('pointermove',wake,{passive:true});document.addEventListener('keydown',wake);wake();
 window.DeckMotion={advance,back,replay,toggle,getState:()=>({index:active,step,auto,mode}),getScaleContext:()=>ScaleModel.context(scaleModel,0)};
 enter(window.deckCurrent||0);
})();
