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
    let index=Math.max(0,data.steps.findIndex(s=>s.id===(hash.get('step')||options.step||'D09'))),selected=null,hover=null,layer='all',showInspector=false,range=fitRange(data.steps[index]);
    if(hash.has('lane')&&data.steps[index].lanes.some(l=>String(l.dev)===hash.get('lane')))selected=Number(hash.get('lane'));
    let overview=hash.get('view')==='all';
    let offset=0;const timeline=data.steps.map(step=>{const entry={step,offset};offset+=step.end;return entry;});
    const allRange=[Math.min(0,...timeline.map(t=>t.offset+t.step.t0)),Math.max(...timeline.map(t=>t.offset+t.step.t1))];
    const fullRange=()=>overview?allRange:fitRange(data.steps[index]);
    if(overview)range=[...allRange];
    root.classList.add('cps');
    root.innerHTML=`<header><h1 class="page-title">Critical Path Swimlane</h1></header>
    <div class="workspace"><div class="canvas"><svg role="group" aria-label="Serving Host Device 共享时间轴泳道" tabindex="0"></svg></div></div>
    <div class="top-tools"><button data-inspect data-liquid-glass="icon" aria-expanded="false" aria-label="打开检查器" title="检查器">☷</button><button data-info data-liquid-glass="icon" aria-expanded="false" aria-label="运行信息与数据口径" title="运行信息与数据口径">ⓘ</button></div>
    <aside class="inspect-panel" data-liquid-glass="panel" hidden><button class="close" data-close-inspect aria-label="关闭检查器">×</button><div class="inspector"></div></aside>
    <section class="info-panel" data-liquid-glass="panel" hidden><button class="close" data-close-info aria-label="关闭运行信息">×</button><h2>运行信息与数据口径</h2><p>DSpark Serving · 单请求 · 16 NPU。</p><p>GBS1 服务端 STRACE，共用 Host CLOCK_MONOTONIC。0 = 上一步结束；负数为流水重叠。Device 行显示 Host 记录的 runner_run 调用窗口，不表示纯设备执行时间。bind 为采集的 bind 总窗口，未拆分分配与 H2D。lane 间时长合计不等于墙钟时间。末端接近是观察结果，具体同步行为需设备事件验证。</p><div class="legend"><span><i></i>采集时间窗</span><span><i class="red"></i>最晚进入路径</span><span><i class="white"></i>悬停 / 固定选择</span><span>虚线 = 同 lane 调用衔接</span></div><p>未选中段宽度按 step 周期；选中段放大显示名称。滚轮缩放 · 拖动空白平移 · ← → 切步 · Esc 关闭面板。</p><div class="source-links"><a href="README.md">Pattern 契约</a><a href="provenance.json">来源指纹</a><a href="https://github.com/yinyucheng0601/PyPTO3/blob/55472831/Data/serving-strace-swimlane(2).json">原始 STRACE</a></div></section>
    <div class="preview" role="tooltip" hidden></div>
    <div class="bottom-controls"><button data-overview data-liquid-glass="control" aria-pressed="false" title="All steps overview">All Steps</button><div class="navigator" aria-label="Execution step navigation"></div></div><nav class="toolbar" data-liquid-glass="control" aria-label="Canvas zoom"><button data-zoom="out" aria-label="Zoom out">−</button><button data-zoom="in" aria-label="Zoom in">＋</button><button data-fit>Fit</button></nav>`;
    const $=s=>root.querySelector(s),svg=$('svg');
    const stepName=s=>s.id==='P'?'Prefill':s.id==='DI'?'Draft Init':'Decode '+s.id.slice(1);
    data.steps.forEach((s,i)=>{const b=document.createElement('button');b.style.flexGrow=s.periodMs;b.dataset.label=stepName(s);b.setAttribute('aria-label',stepName(s)+' · '+fmt(s.periodMs));const label=document.createElement('span');label.textContent=stepName(s);b.append(label);on(b,'click',()=>setStep(i));$('.navigator').append(b);});
    const text=(parent,x,y,t,cls='')=>{const e=add(parent,'text',{x,y,class:cls});e.textContent=t;return e;};
    function add(parent,tag,attrs={}){const scale=svg.clientHeight/650;attrs={...attrs};for(const key of ['y','y1','y2','height'])if(typeof attrs[key]==='number')attrs[key]*=scale;if(attrs.points)attrs.points=attrs.points.split(' ').map(p=>{const [x,y]=p.split(',');return x+','+(Number(y)*scale);}).join(' ');const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));parent.append(e);return e;}
    let paintPinned=()=>{};
    function bandTitle(y,label,left){
      const title=text(svg,44,y,label,'band-title');title.setAttribute('text-anchor','start');
      const centerY=y*svg.clientHeight/650-8;const badge=add(svg,'g',{transform:`translate(16,${centerY})`,'aria-hidden':'true'});add(badge,'circle',{r:15,fill:'#292929'});const icon=add(badge,'g',{transform:'translate(-8,-8) scale(.73)',fill:'none',stroke:'#c0c0c0','stroke-width':1.4});
      const paths={Serving:'M2 2H20V9H2Z M2 13H20V20H2Z M5 5H7 M5 16H7',Host:'M1 2H21V16H1Z M11 16V21 M6 21H16',Device:'M5 5H17V17H5Z M8 1V5 M14 1V5 M8 17V21 M14 17V21 M1 8H5 M1 14H5 M17 8H21 M17 14H21'};
      add(icon,'path',{d:paths[label]});
    }
    function sync(){if(!options.syncHash)return;const p=new URLSearchParams();if(overview)p.set('view','all');p.set('step',data.steps[index].id);if(selected!=null)p.set('lane',selected);history.replaceState(null,'','#'+p);}
    function info(l){return `lane ${l.dev} → dev ${l.dev} · bind ${fmt(l.bindEnd-l.bindStart)} · 调用前空档 ${fmt(Math.max(0,l.rrStart-l.bindEnd))} · runner_run ${fmt(l.rrEnd-l.rrStart)}`;}
    function positionTip(clientX,clientY){
      const tip=$('.preview'),box=root.getBoundingClientRect(),gap=16,pad=12;
      let x=clientX-box.left+gap,y=clientY-box.top+gap;
      if(x+tip.offsetWidth>box.width-pad)x=clientX-box.left-tip.offsetWidth-gap;
      if(y+tip.offsetHeight>box.height-pad)y=clientY-box.top-tip.offsetHeight-gap;
      tip.style.left=Math.max(pad,Math.min(x,box.width-tip.offsetWidth-pad))+'px';
      tip.style.top=Math.max(pad,Math.min(y,box.height-tip.offsetHeight-pad))+'px';
    }
    function showTip(l,x,y,step=data.steps[index]){const tip=$('.preview');tip.textContent=`${stepName(step)} · Lane ${l.dev}\nbind          ${fmt(l.bindEnd-l.bindStart)}\n调用前空档    ${fmt(Math.max(0,l.rrStart-l.bindEnd))}\nrunner_run    ${fmt(l.rrEnd-l.rrStart)}`;tip.hidden=false;positionTip(x,y);}
    function inspector(){const s=data.steps[index],m=metrics(s),l=s.lanes.find(l=>l.dev===selected);const p=$('.inspector');$('.inspect-panel').hidden=!showInspector;p.hidden=!showInspector;if(!showInspector)return;p.replaceChildren();const cap=document.createElement('div');cap.className='eyebrow';cap.textContent=l?'PINNED LANE / '+s.id:'STEP / '+s.id;p.append(cap);const h=document.createElement('h2');h.textContent=l?`lane ${l.dev} → dev ${l.dev}`:'最晚进入 · lane '+m.critical.dev;p.append(h);const dl=document.createElement('dl');const values=l?[['bind 总窗',fmt(l.bindEnd-l.bindStart)],['调用前空档',fmt(Math.max(0,l.rrStart-l.bindEnd))],['runner_run 总窗',fmt(l.rrEnd-l.rrStart)],['进入时刻',fmt(l.rrStart)],['runner_run 结束',fmt(l.rrEnd)]]:[['进入前 · 关键 lane',fmt(m.critical.rrStart)],['至本步结束',fmt(s.end-m.critical.rrStart)],['16 lane bind 合计',fmt(m.bindSum)],['进入时刻极差',fmt(m.startSpread)],['结束时刻极差',fmt(m.endSpread)]];values.forEach(([k,v])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;dl.append(dt,dd);});p.append(dl);const note=document.createElement('p');note.textContent='runner_run 包含调用与可能的同步等待。当前数据未独立采集 device_wall。';p.append(note);if(l){const b=document.createElement('button');b.textContent='取消固定';on(b,'click',()=>{selected=null;sync();render();});p.append(b);}}
    function render(){
      svg.onpointermove=null;svg.onclick=null;
      const s=data.steps[index],m=metrics(s),active=hover??selected;
      $('[data-overview]').setAttribute('aria-pressed',String(overview));
      [...$('.navigator').children].forEach((b,i)=>b.setAttribute('aria-pressed',!overview&&i===index?'true':'false'));
      if(overview){renderOverview();return;}
      const width=Math.max(300,$('.canvas').clientWidth),height=svg.clientHeight,left=148,right=24,plot=width-left-right;
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.replaceChildren();
      const X=t=>left+(t-range[0])/(range[1]-range[0])*plot;
      const defs=add(svg,'defs'),clip=add(defs,'clipPath',{id:uid});add(clip,'rect',{x:left,y:0,width:plot,height:600});
      const drawing=add(svg,'g',{'clip-path':`url(#${uid})`});
      const H=d=>200+d*10,D=d=>420+d*10;
      [[40,'Serving'],[104,'Host'],[390,'Device']].forEach(([y,t])=>bandTitle(y,t,left));
      [0,s.end].forEach(t=>{add(drawing,'line',{x1:X(t),x2:X(t),y1:45,y2:600,class:'guide'});text(drawing,X(t)+5,36,t===0?'0 · 上一步结束':'本步结束');});
      const span=(a,b,y,h,cls,tip)=>{const e=add(drawing,'rect',{x:X(a),y:y-h/2,width:Math.max(1,X(b)-X(a)),height:h,class:cls});if(tip){const title=add(e,'title');title.textContent=tip;}return e;};
      s.serving.forEach(e=>{if(e.kind==='wait')add(drawing,'line',{x1:X(e.s),x2:X(e.s+e.d),y1:60,y2:60,class:'wait'});else span(e.s,e.s+e.d,60,5,'bar',e.n+' · '+fmt(e.d));});
      const roles=['prepare','dispatch','reclaim'];roles.forEach((r,i)=>text(svg,left-8,130+i*18,['准备','下发','回收'][i]).setAttribute('text-anchor','end'));
      s.worker.forEach(e=>{const y=126+Math.max(0,roles.indexOf(e.t))*18;if(e.kind==='wait')add(drawing,'line',{x1:X(e.s),x2:X(e.s+e.d),y1:y,y2:y,class:'wait'});else{const node=span(e.s,e.s+e.d,y,10,'bar',e.n+' · '+fmt(e.d));node.style.opacity=e.kind==='own'?1:.35;}});
      s.lanes.forEach(l=>{
        const hot=l.dev===m.critical.dev,focus=l.dev===active;
        [[H(l.dev),'host'],[D(l.dev),'device']].forEach(([y,kind])=>{
          if(hot||focus)add(drawing,'rect',{x:left,y:y-5,width:plot,height:10,fill:focus?'#ffffff':'#fd5644',opacity:focus?.09:.07});
          if(l.dev%4===0||hot||focus)text(svg,44,y+4,(kind==='host'?'lane ':'dev ')+l.dev,hot?'label-hot':'').setAttribute('text-anchor','start');
          const hit=add(drawing,'rect',{x:left,y:y-5,width:plot,height:10,class:'row-hit',tabindex:0,role:'button','aria-label':info(l),'aria-pressed':selected===l.dev});
          const enter=e=>{hover=l.dev;showTip(l,e.clientX,e.clientY);render();};
          on(hit,'pointerenter',e=>{if(hover!==l.dev)enter(e);});on(hit,'focus',()=>{const box=hit.getBoundingClientRect();showTip(l,box.left+box.width/2,box.top);});on(hit,'blur',()=>{$('.preview').hidden=true;});
          const choose=()=>{selected=l.dev;showInspector=true;$(".info-panel").hidden=true;$("[data-info]").setAttribute("aria-expanded","false");sync();render();};on(hit,'click',choose);on(hit,'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
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
    function laneAnalysis(dev){
      selected=dev;paintPinned();showInspector=true;$('.info-panel').hidden=true;$('[data-info]').setAttribute('aria-expanded','false');sync();
      const rows=data.steps.map(s=>{const l=s.lanes.find(l=>l.dev===dev),bind=l.bindEnd-l.bindStart;const sorted=s.lanes.map(l=>l.bindEnd-l.bindStart).sort((a,b)=>a-b);return {s,l,bind,median:(sorted[7]+sorted[8])/2};});
      const avg=key=>rows.reduce((a,r)=>a+key(r),0)/rows.length;
      const ranks=data.steps[0].lanes.map(l=>({dev:l.dev,bind:data.steps.reduce((a,s)=>{const x=s.lanes.find(x=>x.dev===l.dev);return a+x.bindEnd-x.bindStart;},0)/data.steps.length})).sort((a,b)=>b.bind-a.bind);
      const latest=rows.filter(r=>metrics(r.s).critical.dev===dev).length,mean=avg(r=>r.bind),med=avg(r=>r.median),peak=Math.max(...rows.map(r=>r.bind));
      const panel=$('.inspector');panel.hidden=false;$('.inspect-panel').hidden=false;$('[data-inspect]').setAttribute('aria-expanded','true');
      panel.innerHTML=`<div class="eyebrow">ALL STEPS / LANE ${dev}</div><h2>Host lane ${dev} · Bind</h2><dl><dt>平均 bind · 排名 ${ranks.findIndex(r=>r.dev===dev)+1} / 16</dt><dd>${fmt(mean)}</dd><dt>相对逐步中位均值</dt><dd>${(mean/med).toFixed(2)}×</dd><dt>最晚进入 runner_run</dt><dd>${latest} / ${rows.length} steps</dd><dt>runner_run 平均调用窗</dt><dd>${fmt(avg(r=>r.l.rrEnd-r.l.rrStart))}</dd></dl><h3>Bind across steps</h3><svg class="analysis-spark" viewBox="0 0 280 78" role="img" aria-label="lane bind 与每步中位趋势"><polyline points="${rows.map((r,i)=>`${i/(rows.length-1)*280},${74-r.median/peak*68}`).join(' ')}" fill="none" stroke="#aaa" stroke-dasharray="3 3"/><polyline points="${rows.map((r,i)=>`${i/(rows.length-1)*280},${74-r.bind/peak*68}`).join(' ')}" fill="none" stroke="#fd5644"/></svg><p>实线：lane ${dev}；虚线：每步 16 lane 中位。横轴 P → D52，纵轴 0–${fmt(peak)}。</p><h3>Bind ranking · mean</h3>${ranks.slice(0,5).map(r=>`<div class="analysis-rank"><span>lane ${r.dev}</span><meter min="0" max="${ranks[0].bind}" value="${r.bind}"></meter><span>${r.bind.toFixed(1)} ms</span></div>`).join('')}<h3>阶段分布</h3><p>${['P','DI','Decode'].map(stage=>{const rs=rows.filter(r=>stage==='Decode'?r.s.id.startsWith('D')&&r.s.id!=='DI':r.s.id===stage);return stage+'：'+rs.filter(r=>metrics(r.s).critical.dev===dev).length+'/'+rs.length+' steps 最晚进入';}).join('<br>')}</p><p>红色行头表示该 lane 至少一次最晚进入 runner_run，属于排查线索。bind 未拆分分配与 H2D；runner_run 不是纯设备执行时间。</p>`;
    }
    function renderOverview(){
      const width=Math.max(300,$('.canvas').clientWidth),left=148,right=24,plot=width-left-right;
      svg.setAttribute('viewBox',`0 0 ${width} ${svg.clientHeight}`);svg.replaceChildren();
      const X=t=>left+(t-range[0])/(range[1]-range[0])*plot,H=d=>187+d*12,D=d=>413+d*12;
      const defs=add(svg,'defs'),clip=add(defs,'clipPath',{id:uid});add(clip,'rect',{x:left,y:0,width:plot,height:600});
      const g=add(svg,'g',{'clip-path':`url(#${uid})`});
      timeline.forEach(({step,offset},i)=>{if(i%2===0)for(const [y,height]of [[68,22],[116,52],[181,192],[407,192]])add(g,'rect',{x:X(offset),y,width:Math.max(0,X(offset+step.end)-X(offset)),height,fill:'#171717','pointer-events':'none'});});
      const pinned=[H,D].map(Y=>add(g,'rect',{x:left,y:selected==null?0:Y(selected)-6,width:plot,height:12,fill:'#fff',opacity:.055,'pointer-events':'none',visibility:selected==null?'hidden':'visible'}));
      const row=add(g,'rect',{x:left,y:0,width:plot,height:12,fill:'#fff',opacity:.10,'pointer-events':'none',visibility:'hidden'});
      const pair=add(g,'rect',{x:left,y:0,width:plot,height:12,fill:'#fff',opacity:.06,'pointer-events':'none',visibility:'hidden'});
      const col=add(g,'rect',{x:left,y:70,width:0,height:530,fill:'#fff',opacity:.08,'pointer-events':'none',visibility:'hidden'});
      [[65,'Serving'],[104,'Host'],[392,'Device']].forEach(([y,label])=>bandTitle(y,label,left));
      // Merge overlapping context copies into role occupancy; no repeated step context.
      ['prepare','dispatch','reclaim'].forEach((role,ri)=>{
        const y=122+ri*18;const label=text(svg,44,y+4,['准备','下发','回收'][ri]);label.setAttribute('text-anchor','start');
        for(const wait of [false,true]){
          const intervals=timeline.flatMap(({step,offset})=>step.worker.filter(w=>w.t===role&&(w.kind==='wait')===wait).map(w=>[offset+w.s,offset+w.s+w.d])).sort((a,b)=>a[0]-b[0]);
          const merged=[];for(const [start,end]of intervals){const last=merged[merged.length-1];if(last&&start<=last[1]+.02)last[1]=Math.max(last[1],end);else merged.push([start,end]);}
          merged.forEach(([a,b])=>{const n=wait?add(g,'line',{x1:X(a),x2:X(b),y1:y,y2:y,class:'wait'}):add(g,'rect',{x:X(a),y:y-3,width:Math.max(1,X(b)-X(a)),height:6,fill:'#aaa'});add(n,'title').textContent=role+(wait?' · waiting':' · active')+' · '+fmt(b-a);});
        }
      });
      const counts=new Map();data.steps.forEach(s=>{const dev=metrics(s).critical.dev;counts.set(dev,(counts.get(dev)||0)+1);});const flagged=new Set(counts.keys());
      const highlight=(dev,entry,band)=>{const scale=svg.clientHeight/650;for(const r of [row,pair])r.setAttribute('visibility',dev==null?'hidden':'visible');if(dev!=null){row.setAttribute('y',((band==='runner'?D(dev):H(dev))-6)*scale);pair.setAttribute('y',((band==='runner'?H(dev):D(dev))-6)*scale);}col.setAttribute('visibility',entry?'visible':'hidden');if(entry){const x=X(entry.offset);col.setAttribute('x',x);col.setAttribute('width',Math.max(2,X(entry.offset+entry.step.end)-x));}};
      const rowHeaders=[];
      for(let dev=0;dev<16;dev++)for(const [y,band]of [[H(dev),'bind'],[D(dev),'runner']]){
        const hot=flagged.has(dev);if(dev%4!==0&&!hot&&dev!==selected)continue;const label=text(svg,44,y+4,'lane '+dev,hot?'label-hot':'');label.setAttribute('text-anchor','start');label.style.cursor='pointer';label.setAttribute('tabindex','0');label.setAttribute('role','button');label.setAttribute('aria-label',`Analyze lane ${dev}${hot?' · latest entry observed':''}`);label.dataset.lane=dev;rowHeaders.push(label);const labelTitle=add(label,'title');labelTitle.textContent='Analyze lane '+dev+(hot?' · latest entry '+counts.get(dev)+' / '+data.steps.length+' steps':'');
        on(label,'pointerenter',()=>{highlight(dev,null,band);$('.preview').hidden=true;});on(label,'focus',()=>highlight(dev,null,band));on(label,'click',()=>laneAnalysis(dev));on(label,'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();laneAnalysis(dev);}});
      }
      paintPinned=()=>{const scale=svg.clientHeight/650;pinned.forEach((r,i)=>{r.setAttribute('visibility',selected==null?'hidden':'visible');if(selected!=null)r.setAttribute('y',((i===0?H(selected):D(selected))-6)*scale);});rowHeaders.forEach(h=>h.style.textDecoration=Number(h.dataset.lane)===selected?'underline':'none');};paintPinned();
      timeline.forEach((entry,i)=>{
        const {step,offset}=entry;if(offset+step.end<range[0]||offset+step.t0>range[1])return;
        const m=metrics(step),x=X(offset),w=X(offset+step.end)-x;
        const lines=add(g,'g',{'pointer-events':'none'});
        step.serving.filter(e=>e.kind==='own').forEach(e=>add(lines,'rect',{x:X(offset+e.s),y:77,width:Math.max(1,X(offset+e.s+e.d)-X(offset+e.s)),height:5,class:'bar'}));
        step.lanes.forEach(l=>{const hot=l.dev===m.critical.dev;[[l.bindStart,l.bindEnd,H(l.dev)],[l.rrStart,l.rrEnd,D(l.dev)]].forEach(([a,b,y])=>add(lines,'line',{x1:X(offset+a),x2:X(offset+b),y1:y,y2:y,stroke:hot?'#fd5644':'#888','stroke-width':hot?2:1.4}));});
        const stride=Math.max(1,Math.ceil(54*42/plot));const show=i===0||i===data.steps.length-1||(i>=2&&(i-2)%stride===0);if(show){const label=text(lines,x+Math.max(2,w/2),22,step.id);label.setAttribute('text-anchor','middle');}add(lines,'line',{x1:x+w/2,x2:x+w/2,y1:29,y2:34,stroke:'#555'});
        const head=add(g,'rect',{x,y:4,width:Math.max(2,w),height:52,fill:'transparent',tabindex:0,role:'button','aria-label':'Open '+stepName(step)});
        const headerTip=e=>{highlight(null,entry);const tip=$('.preview');tip.textContent=stepName(step)+'\n'+fmt(step.periodMs)+'\nClick to open step';tip.hidden=false;positionTip(e.clientX,e.clientY);};on(head,'pointerenter',headerTip);on(head,'focus',()=>highlight(null,entry));on(head,'click',()=>setStep(i));on(head,'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setStep(i);}});
      });
      const locate=e=>{const b=svg.getBoundingClientRect(),x=e.clientX-b.left,y=(e.clientY-b.top)/b.height*650;if(x<left||x>width-right)return null;const t=range[0]+(x-left)/plot*(range[1]-range[0]);const entry=timeline.find(ti=>t>=ti.offset&&t<ti.offset+ti.step.end);const band=y>=407&&y<599?'runner':y>=181&&y<373?'bind':null;const dev=band?Math.round((y-(band==='bind'?187:413))/12):null;return {entry,band,dev};};
      svg.onpointermove=e=>{if(!overview)return;const at=locate(e);if(!at){if(!rowHeaders.includes(e.target))highlight(null,null);return;}if(at.dev!=null&&at.entry){highlight(at.dev,at.entry,at.band);const l=at.entry.step.lanes.find(l=>l.dev===at.dev);showTip(l,e.clientX,e.clientY,at.entry.step);}else if(at.band){highlight(at.dev,null,at.band);}else if((e.clientY-svg.getBoundingClientRect().top)/svg.clientHeight*650>56){highlight(null,null);$('.preview').hidden=true;}};
      svg.onclick=e=>{if(!overview)return;const at=locate(e);if(at?.dev!=null){laneAnalysis(at.dev);}};
      const span=range[1]-range[0],tick=Math.pow(10,Math.floor(Math.log10(span)))/2;
      for(let t=Math.ceil(range[0]/tick)*tick;t<=range[1];t+=tick){const x=X(t);if(x<left||x>width-right)continue;add(svg,'line',{x1:x,x2:x,y1:605,y2:612,stroke:'#858585'});text(svg,x,634,(t/1000).toFixed(1)+' s').setAttribute('text-anchor','middle');}
      if(showInspector&&selected!=null)laneAnalysis(selected);else{$('.inspect-panel').hidden=true;$('[data-inspect]').setAttribute('aria-expanded','false');}
    }
    const uid='cps-clip-'+Math.random().toString(36).slice(2);
    function setStep(i){overview=false;index=Math.max(0,Math.min(data.steps.length-1,i));hover=null;$('.preview').hidden=true;range=fitRange(data.steps[index]);sync();render();}
    function zoom(f,anchor=.5){const full=fullRange(),w=range[1]-range[0],at=range[0]+w*anchor;range=boundedRange(at-w*f*anchor,at+w*f*(1-anchor),full);render();}
    on($('[data-fit]'),'click',()=>{range=[...fullRange()];render();});
    root.querySelectorAll('[data-zoom]').forEach(b=>on(b,'click',()=>zoom(b.dataset.zoom==='in'?.7:1.4)));
    on($('[data-overview]'),'click',()=>{overview=!overview;showInspector=false;hover=null;$('.preview').hidden=true;range=[...fullRange()];sync();render();});
    on($('[data-inspect]'),'click',()=>{if(overview){setStep(index);}showInspector=!showInspector;$('.info-panel').hidden=true;$('[data-info]').setAttribute('aria-expanded','false');render();});
    on($('[data-close-inspect]'),'click',()=>{showInspector=false;render();$('[data-inspect]').focus();});
    const toggleInfo=()=>{const panel=$('.info-panel');panel.hidden=!panel.hidden;$('[data-info]').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){showInspector=false;render();}};
    on($('[data-info]'),'click',toggleInfo);on($('[data-close-info]'),'click',()=>{toggleInfo();$('[data-info]').focus();});
    on(svg,'pointerleave',()=>{hover=null;$('.preview').hidden=true;render();});
    on(svg,'pointermove',e=>{if(!$('.preview').hidden)positionTip(e.clientX,e.clientY);});
    svg.addEventListener('wheel',e=>{e.preventDefault();const box=svg.getBoundingClientRect();zoom(e.deltaY>0?1.15:.87,Math.max(0,Math.min(1,(e.clientX-box.left)/box.width)));},{passive:false,signal:abort.signal});
    let drag=null;on(svg,'pointerdown',e=>{if(e.target.closest('.row-hit'))return;drag={x:e.clientX,range:[...range]};svg.setPointerCapture(e.pointerId);});on(svg,'pointermove',e=>{if(!drag)return;const shift=(drag.x-e.clientX)/svg.clientWidth*(drag.range[1]-drag.range[0]);range=boundedRange(drag.range[0]+shift,drag.range[1]+shift,fullRange());render();});on(svg,'pointerup',()=>drag=null);on(svg,'pointercancel',()=>drag=null);
    on(root,'keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const inNav=e.target.closest('.navigator');setStep(index+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1));if(inNav)$('.navigator').children[index].focus();}if(e.key==='Escape'){showInspector=false;$('.info-panel').hidden=true;$('[data-info]').setAttribute('aria-expanded','false');$('.preview').hidden=true;render();}});
    const observer=new ResizeObserver(()=>render());observer.observe(root);sync();render();
    return {setStep:id=>{const i=data.steps.findIndex(s=>s.id===id);if(i<0)throw new Error('Unknown step '+id);setStep(i);},getState:()=>({step:data.steps[index].id,selected,layer,view:overview?'all':'step',range:[...range],showInspector}),destroy:()=>{observer.disconnect();abort.abort();root.replaceChildren();root.classList.remove('cps');}};
  }
  const api={mount,metrics,fitRange,boundedRange};if(typeof module!=='undefined')module.exports=api;global.CriticalPathSwimlane=api;
})(typeof window!=='undefined'?window:globalThis);
