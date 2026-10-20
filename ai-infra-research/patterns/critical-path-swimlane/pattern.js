(function(global){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const fmt=n=>Number(n).toFixed(2)+' ms';
  function metrics(step){
    const critical=step.lanes.reduce((a,b)=>a.rrStart>b.rrStart?a:b);
    return {critical,bindSum:step.lanes.reduce((n,l)=>n+l.bindEnd-l.bindStart,0),startSpread:Math.max(...step.lanes.map(l=>l.rrStart))-Math.min(...step.lanes.map(l=>l.rrStart)),endSpread:Math.max(...step.lanes.map(l=>l.end))-Math.min(...step.lanes.map(l=>l.end))};
  }
  function fitRange(s){return [Math.min(s.t0,0,...s.lanes.map(l=>l.bindStart)),Math.max(s.t1,s.end)];}
  function boundedRange(a,b,full){const width=Math.min(full[1]-full[0],Math.max(5,b-a));const start=Math.min(full[1]-width,Math.max(full[0],a));return [start,start+width];}
  function mount(root,data,options={}){
    if(!data.steps?.length)throw new Error('Swimlane requires at least one step');
    data.steps.forEach(s=>{if(!s.lanes?.length)throw new Error('Step requires lanes');const ids=new Set();s.lanes.forEach(l=>{if(ids.has(l.dev)||![l.bindStart,l.bindEnd,l.rrStart,l.rrEnd,l.end].every(Number.isFinite)||l.bindStart>l.bindEnd||l.rrStart>l.rrEnd)throw new Error('Invalid lane windows');ids.add(l.dev);});});
    const abort=new AbortController(),on=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal});
    const hash=new URLSearchParams(options.syncHash?location.hash.slice(1):'');
    let index=Math.max(0,data.steps.findIndex(s=>s.id===(hash.get('step')||options.step||'D09'))),selected=null,hover=null,layer='all',showInspector=true,range=fitRange(data.steps[index]);
    if(hash.has('lane')&&data.steps[index].lanes.some(l=>String(l.dev)===hash.get('lane')))selected=Number(hash.get('lane'));
    root.classList.add('cps');
    root.innerHTML=`<header><div class="reading"><div><span class="eyebrow">STEP PERIOD</span><strong data-period></strong></div><div><span class="eyebrow">LATEST ENTRY</span><strong class="hot" data-critical></strong></div></div></header>
    <nav class="toolbar" aria-label="泳道操作"><button data-prev aria-label="上一步">←</button><select data-step aria-label="选择 step"></select><button data-next aria-label="下一步">→</button><span class="spacer"></span><button data-layer="all" aria-pressed="true">全部</button><button data-layer="host" aria-pressed="false">Host</button><button data-layer="device" aria-pressed="false">Device</button><button data-zoom="in" aria-label="放大时间轴">＋</button><button data-zoom="out" aria-label="缩小时间轴">−</button><button data-fit>完整范围</button><button data-inspect aria-expanded="true">检查器</button></nav>
    <div class="workspace"><div class="canvas"><svg role="group" aria-label="Serving Host Device 共享时间轴泳道" tabindex="0"></svg><div class="preview" aria-live="polite"></div></div><aside><div class="inspector"></div></aside></div>
    <div class="legend"><span><i></i>采集时间窗</span><span><i class="red"></i>最晚进入路径</span><span><i class="white"></i>悬停 / 固定选择</span><span>虚线连接 = 同 lane 调用衔接</span></div>
    <div class="navigator" aria-label="完整请求的 step 导航"></div><footer><span>54 steps · 导航宽度按 step 周期</span><span>滚轮缩放 · 拖动平移 · ↑ ↓ 切步 · Esc 关闭检查</span></footer>
    <details><summary>运行信息与数据口径</summary><p>DSpark Serving · 单请求 · 16 NPU。</p><p>GBS1 服务端 STRACE，共用 Host CLOCK_MONOTONIC。0 = 上一步结束；负数为流水重叠。Device 行显示 Host 记录的 runner_run 调用窗口，不表示纯设备执行时间。bind 为采集的 bind 总窗口，未拆分分配与 H2D。lane 间时长合计不等于墙钟时间。末端接近是观察结果，具体同步行为需设备事件验证。</p><div class="source-links"><a href="README.md">Pattern 契约</a><a href="provenance.json">来源指纹</a><a href="https://github.com/yinyucheng0601/PyPTO3/blob/55472831/Data/serving-strace-swimlane(2).json">原始 STRACE</a></div></details>`;
    const $=s=>root.querySelector(s),svg=$('svg'),select=$('[data-step]');
    data.steps.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.id;select.append(o);const b=document.createElement('button');b.style.flexGrow=s.periodMs;b.title=s.id+' · '+fmt(s.periodMs);b.setAttribute('aria-label',b.title);on(b,'click',()=>setStep(i));$('.navigator').append(b);});
    const text=(parent,x,y,t,cls='')=>{const e=add(parent,'text',{x,y,class:cls});e.textContent=t;return e;};
    function add(parent,tag,attrs={}){const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));parent.append(e);return e;}
    function sync(){if(!options.syncHash)return;const p=new URLSearchParams();p.set('step',data.steps[index].id);if(selected!=null)p.set('lane',selected);history.replaceState(null,'','#'+p);}
    function info(l){return `lane ${l.dev} → dev ${l.dev} · bind ${fmt(l.bindEnd-l.bindStart)} · 调用前空档 ${fmt(Math.max(0,l.rrStart-l.bindEnd))} · runner_run ${fmt(l.rrEnd-l.rrStart)}`;}
    function inspector(){const s=data.steps[index],m=metrics(s),l=s.lanes.find(l=>l.dev===selected);const p=$('.inspector');p.hidden=!showInspector;if(!showInspector)return;p.replaceChildren();const cap=document.createElement('div');cap.className='eyebrow';cap.textContent=l?'PINNED LANE / '+s.id:'STEP / '+s.id;p.append(cap);const h=document.createElement('h2');h.textContent=l?`lane ${l.dev} → dev ${l.dev}`:'最晚进入 · lane '+m.critical.dev;p.append(h);const dl=document.createElement('dl');const values=l?[['bind 总窗',fmt(l.bindEnd-l.bindStart)],['调用前空档',fmt(Math.max(0,l.rrStart-l.bindEnd))],['runner_run 总窗',fmt(l.rrEnd-l.rrStart)],['进入时刻',fmt(l.rrStart)],['结束时刻',fmt(l.end)]]:[['进入前 · 关键 lane',fmt(m.critical.rrStart)],['至本步结束',fmt(s.end-m.critical.rrStart)],['16 lane bind 合计',fmt(m.bindSum)],['进入时刻极差',fmt(m.startSpread)],['结束时刻极差',fmt(m.endSpread)]];values.forEach(([k,v])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;dl.append(dt,dd);});p.append(dl);const note=document.createElement('p');note.textContent='runner_run 包含调用与可能的同步等待。当前数据未独立采集 device_wall。';p.append(note);if(l){const b=document.createElement('button');b.textContent='取消固定';on(b,'click',()=>{selected=null;sync();render();});p.append(b);}}
    function render(){
      const s=data.steps[index],m=metrics(s),active=hover??selected;select.value=index;$('[data-period]').textContent=fmt(s.periodMs);$('[data-critical]').textContent='lane '+m.critical.dev;
      $('[data-prev]').disabled=index===0;$('[data-next]').disabled=index===data.steps.length-1;
      [...$('.navigator').children].forEach((b,i)=>b.setAttribute('aria-pressed',i===index?'true':'false'));
      const width=Math.max(300,$('.canvas').clientWidth),height=650,left=86,right=24,plot=width-left-right;
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.replaceChildren();
      const X=t=>left+(t-range[0])/(range[1]-range[0])*plot;
      const defs=add(svg,'defs'),clip=add(defs,'clipPath',{id:uid});add(clip,'rect',{x:left,y:0,width:plot,height:600});
      const drawing=add(svg,'g',{'clip-path':`url(#${uid})`});
      const H=d=>200+d*10,D=d=>420+d*10;
      [[40,'Serving'],[104,'Host'],[390,'Device']].forEach(([y,t])=>text(svg,4,y,t,'band-title'));
      [60,120,180,385,600].forEach(y=>add(drawing,'line',{x1:left,x2:width-right,y1:y,y2:y,stroke:'#383838'}));
      [0,s.end].forEach(t=>{add(drawing,'line',{x1:X(t),x2:X(t),y1:45,y2:600,class:'guide'});text(drawing,X(t)+5,36,t===0?'0 · 上一步结束':'本步结束');});
      const span=(a,b,y,h,cls,tip)=>{const e=add(drawing,'rect',{x:X(a),y:y-h/2,width:Math.max(1,X(b)-X(a)),height:h,class:cls});if(tip){const title=add(e,'title');title.textContent=tip;}return e;};
      s.serving.forEach(e=>{if(e.kind==='wait')add(drawing,'line',{x1:X(e.s),x2:X(e.s+e.d),y1:60,y2:60,class:'wait'});else span(e.s,e.s+e.d,60,5,'bar',e.n+' · '+fmt(e.d));});
      const roles=['prepare','dispatch','reclaim'];roles.forEach((r,i)=>text(svg,left-8,130+i*18,['准备','下发','回收'][i]).setAttribute('text-anchor','end'));
      s.worker.forEach(e=>{const y=126+Math.max(0,roles.indexOf(e.t))*18;if(e.kind==='wait')add(drawing,'line',{x1:X(e.s),x2:X(e.s+e.d),y1:y,y2:y,class:'wait'});else{const node=span(e.s,e.s+e.d,y,10,'bar',e.n+' · '+fmt(e.d));node.style.opacity=e.kind==='own'?1:.35;}});
      s.lanes.forEach(l=>{
        const hot=l.dev===m.critical.dev,focus=l.dev===active;
        [[H(l.dev),'host'],[D(l.dev),'device']].forEach(([y,kind])=>{
          if(hot||focus)add(drawing,'rect',{x:left,y:y-5,width:plot,height:10,fill:focus?'#ffffff':'#fd5644',opacity:focus?.09:.07});
          if(l.dev%4===0||hot||focus)text(svg,left-10,y+4,(kind==='host'?'lane ':'dev ')+l.dev,hot?'label-hot':'').setAttribute('text-anchor','end');
          const hit=add(drawing,'rect',{x:left,y:y-5,width:plot,height:10,class:'row-hit',tabindex:0,role:'button','aria-label':info(l),'aria-pressed':selected===l.dev});
          const enter=()=>{hover=l.dev;$('.preview').textContent=info(l);render();};
          on(hit,'pointerenter',()=>{if(hover!==l.dev)enter();});on(hit,'focus',()=>{$('.preview').textContent=info(l);});
          const choose=()=>{selected=l.dev;showInspector=true;sync();render();};on(hit,'click',choose);on(hit,'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
        });
        const hostBar=span(l.bindStart,l.bindEnd,H(l.dev),3,hot?'bar hot':'bar');hostBar.style.pointerEvents='none';hostBar.style.opacity=layer==='device'?.25:1;
        const devBar=span(l.rrStart,l.rrEnd,D(l.dev),3,hot?'bar hot':'bar');devBar.style.pointerEvents='none';devBar.style.opacity=layer==='host'?.25:1;
        if(hot||focus){add(drawing,'polyline',{points:`${X(l.bindEnd)},${H(l.dev)} ${X(l.rrStart)},${D(l.dev)}`,class:focus?'paired':'critical','stroke-dasharray':'3 4','pointer-events':'none'});if(focus){[ [l.bindStart,l.bindEnd,H(l.dev)],[l.rrStart,l.rrEnd,D(l.dev)] ].forEach(([a,b,y])=>add(drawing,'line',{x1:X(a),x2:X(b),y1:y,y2:y,class:'paired','pointer-events':'none'}));}}
      });
      const c=m.critical;text(drawing,Math.max(left+4,X(c.bindStart)+6),H(c.dev)-10,width<600?'最晚进入':`最晚进入 · bind ${fmt(c.bindEnd-c.bindStart)}`,'label-hot');
      const tick=Math.pow(10,Math.floor(Math.log10(range[1]-range[0])))/2;
      for(let t=Math.ceil(range[0]/tick)*tick;t<=range[1];t+=tick){add(svg,'line',{x1:X(t),x2:X(t),y1:604,y2:611,stroke:'#858585'});text(svg,X(t),630,String(Math.round(t))).setAttribute('text-anchor','middle');}text(svg,width-right,648,'ms').setAttribute('text-anchor','end');
      inspector();$('[data-inspect]').setAttribute('aria-expanded',String(showInspector));
    }
    const uid='cps-clip-'+Math.random().toString(36).slice(2);
    function setStep(i){index=Math.max(0,Math.min(data.steps.length-1,i));hover=null;range=fitRange(data.steps[index]);sync();render();}
    function zoom(f,anchor=.5){const full=fitRange(data.steps[index]),w=range[1]-range[0],at=range[0]+w*anchor;range=boundedRange(at-w*f*anchor,at+w*f*(1-anchor),full);render();}
    on(select,'change',()=>setStep(Number(select.value)));on($('[data-prev]'),'click',()=>setStep(index-1));on($('[data-next]'),'click',()=>setStep(index+1));on($('[data-fit]'),'click',()=>{range=fitRange(data.steps[index]);render();});
    root.querySelectorAll('[data-layer]').forEach(b=>on(b,'click',()=>{layer=b.dataset.layer;root.querySelectorAll('[data-layer]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));render();}));
    root.querySelectorAll('[data-zoom]').forEach(b=>on(b,'click',()=>zoom(b.dataset.zoom==='in'?.7:1.4)));
    on($('[data-inspect]'),'click',()=>{showInspector=!showInspector;render();});
    on(svg,'pointerleave',()=>{hover=null;$('.preview').textContent=selected==null?'悬停预览 · 点击固定 lane':info(data.steps[index].lanes.find(l=>l.dev===selected));render();});
    svg.addEventListener('wheel',e=>{e.preventDefault();const box=svg.getBoundingClientRect();zoom(e.deltaY>0?1.15:.87,Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)));},{passive:false,signal:abort.signal});
    let drag=null;on(svg,'pointerdown',e=>{if(e.target.closest('.row-hit'))return;drag={x:e.clientX,range:[...range]};svg.setPointerCapture(e.pointerId);});on(svg,'pointermove',e=>{if(!drag)return;const shift=(drag.x-e.clientX)/svg.clientWidth*(drag.range[1]-drag.range[0]);range=boundedRange(drag.range[0]+shift,drag.range[1]+shift,fitRange(data.steps[index]));render();});on(svg,'pointerup',()=>drag=null);on(svg,'pointercancel',()=>drag=null);
    on(root,'keydown',e=>{if(e.target.tagName==='SELECT')return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setStep(index+(e.key==='ArrowDown'?1:-1));}if(e.key==='Escape'){showInspector=false;render();}});
    const observer=new ResizeObserver(()=>render());observer.observe(root);sync();render();
    return {setStep:id=>{const i=data.steps.findIndex(s=>s.id===id);if(i<0)throw new Error('Unknown step '+id);setStep(i);},getState:()=>({step:data.steps[index].id,selected,layer,range:[...range],showInspector}),destroy:()=>{observer.disconnect();abort.abort();root.replaceChildren();root.classList.remove('cps');}};
  }
  const api={mount,metrics,fitRange,boundedRange};if(typeof module!=='undefined')module.exports=api;global.CriticalPathSwimlane=api;
})(typeof window!=='undefined'?window:globalThis);
