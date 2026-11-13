/* EP scene and legacy memory scene share Rank identity, not an invented 1F1B clock. */
(()=>{
  'use strict';
  const M=window.EPTeachingModel;
  if(!M||ATLAS_EMBED)return;
  const state={pp:0,edp:1,tp:1,layer:7,mb:0,hot:false,selected:23,direction:'out',time:0,playing:false,last:null,active:true};
  let config={...M.baseline},event;
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  const mb=n=>(n/1e6).toFixed(1)+' MB';
  const app=document.createElement('main');app.id='ep-app';app.className='ep-app';
  app.innerHTML=`<header class="ep-head"><div><div class="ep-kicker">RANK COMMUNICATION / TOP</div><h1>Token 去哪里，结果从哪里回来</h1><p id="ep-config"></p></div><div class="ep-actions"><button id="ep-theme" aria-label="切换深浅主题">深 / 浅</button><button id="ep-memory">显存空间 ↗</button></div></header>
    <div class="ep-selectors"><label>Stage <select id="ep-stage-select" aria-label="PP Stage"></select></label><label>副本 <select id="ep-replica" aria-label="EDP 副本"></select></label><label>TP <select id="ep-tp" aria-label="TP 位置"></select></label><label>Layer <select id="ep-layer" aria-label="模型层"></select></label><label>微批次 <select id="ep-mb" aria-label="微批次"></select></label><label>路由 <select id="ep-load" aria-label="路由负载"><option value="balanced">均衡</option><option value="hot">专家桶偏热</option></select></label></div>
    <nav id="ep-context" class="ep-context" aria-label="128 Rank 中的 EP 组"></nav>
    <div class="ep-stage"><strong id="ep-stage-title"></strong><span id="ep-stage-description"></span></div>
    <div class="ep-viewport"><svg id="ep-canvas" class="ep-canvas" viewBox="0 0 1400 400" role="group" aria-label="EP 组通信俯视图"></svg></div>
    <div class="ep-network-note"><span id="ep-route-note"></span><span>带宽＝本次路由 Token 数 · 箭头＝传输方向 · 卡内 LOCAL 不计网络流量</span></div>
    <section class="ep-readouts" aria-label="当前 Rank 通信读数"><div><h2 id="ep-owner"></h2><div class="ep-number" id="ep-owner-count"></div><p id="ep-owner-note"></p><div class="ep-meter"><i id="ep-owner-progress"></i></div></div><div><h2>通信暂存缓冲 · 当前占用</h2><div class="ep-number" id="ep-buffer"></div><p id="ep-buffer-note"></p></div><div><h2>本组跨 Rank Payload · 本次事件合计</h2><div class="ep-number" id="ep-total"></div><p id="ep-total-note"></p></div></section>
    <nav class="ep-controls bar" aria-label="EP 事件播放"><button id="ep-play" aria-label="播放 EP 事件">播放</button><button id="ep-restart">重播</button><input id="ep-time" type="range" min="0" max="1000" step="1" value="0" aria-label="EP 事件进度"><div class="ep-phases">${M.phases.map((p,i)=>`<button data-ep-phase="${i}" aria-pressed="${i===0}">${['路由','分发','计算','回收'][i]}</button>`).join('')}</div><button id="ep-direction" aria-pressed="false">追踪本卡 Token</button></nav>
    <p class="ep-caption">单 Layer × 单微批次的前向教学回放 · Top-1 · BF16 · 不代表完整训练调度或实测传输速率。点击 Rank 切换主语。</p>
    <details class="ep-detail"><summary>数据与显存口径</summary><p>复用 rank-intro 的并行规模：ETP=1，每个专家保持完整；同一 EDP 内的两个 TP 位置使用相同路由，分别显示为两个 EP 通信组。此视图采用独立的 Top-1 教学数据，每个来源 Rank 有 8,192 个逻辑 Token。流带宽度固定表示本次路由总量，阶段进度假设匀速，不能作为网络速率。回收的是专家输出，按原 Token 位置合并。</p><p>网络总量每条有向传输只计一次；不含本地 Token，不含协议、元数据与重传。缓冲模型在每次分发／回收开始时一次性申请完整收发暂存，阶段结束后释放；卡内激活读数仅含本层专家侧输入／输出持有量，未包含模型其他显存，也不是 HBM 实测水位。与旧显存空间共享 Rank 身份；旧页仍使用独立的训练概览模拟。</p></details>`;
  document.body.append(app);
  const entry=document.createElement('button');entry.id='ep-entry';entry.className='ep-entry';entry.textContent='Top · EP 通信';entry.hidden=true;document.body.append(entry);
  const get=id=>document.getElementById(id);
  function options(el,count,selected,prefix='',offset=0){el.innerHTML=Array.from({length:count},(_,i)=>`<option value="${i+offset}">${prefix}${i+offset}</option>`).join('');el.value=String(selected);}
  function configure(){
    config={...M.baseline,tp:TP,pp:PP,dp:DP,ep:EP,etp:ETP};
    const r=M.coordinates(Math.min(selectedRank,TP*PP*DP-1),config);
    Object.assign(state,{pp:r.pp,edp:r.edp,tp:r.tp,selected:r.id});
    state.layer=Math.max(r.pp*config.layers/config.pp,Math.min((r.pp+1)*config.layers/config.pp-1,state.layer));
    options(get('ep-stage-select'),config.pp,state.pp,'PP');options(get('ep-replica'),config.dp/config.ep,state.edp,'EDP');options(get('ep-tp'),config.tp,state.tp,'TP');options(get('ep-mb'),config.microbatches,state.mb+1,'',1);
    get('ep-config').textContent=`${config.tp*config.pp*config.dp} Rank · TP${config.tp} / PP${config.pp} / DP${config.dp} / EP${config.ep} / ETP${config.etp} · ${config.layers} 层 · ${config.experts} 专家`;
    rebuild();
  }
  function rebuild(){
    event=M.event({...state,config});if(!event.ids.includes(state.selected))state.selected=event.ids[0];
    options(get('ep-layer'),config.layers/config.pp,state.layer,'L',state.pp*config.layers/config.pp);
    state.time=0;state.last=null;
    get('ep-context').innerHTML=Array.from({length:config.pp},(_,pp)=>Array.from({length:config.dp/config.ep},(_,edp)=>Array.from({length:config.tp},(_,tp)=>`<button data-ep-group="${pp},${edp},${tp}" aria-pressed="${pp===state.pp&&edp===state.edp&&tp===state.tp}" title="${M.members(pp,edp,tp,config).map(r=>'R'+r).join(' · ')}">P${pp} · D${edp} · T${tp}</button>`).join('')).join('')).join('');
    get('ep-context').setAttribute('aria-label',`${config.tp*config.pp*config.dp} Rank 的 EP 组；P 为 PP，D 为 EDP，T 为 TP`);
    draw();
  }
  function draw(){
    const f=M.frame(event,state.time),own=f.ranks.find(r=>r.id===state.selected),combine=f.phase.id==='combine',network=f.phase.id==='dispatch'||combine;
    const flowList=event.flows.filter(x=>!x.local&&(state.direction==='out'?x.source===state.selected:x.target===state.selected));
    const center=id=>event.ids.length===1?700:90+event.ids.indexOf(id)*(1220/(event.ids.length-1));
    const width=Math.min(142,1100/event.ids.length),cardY=224;
    const oldFocus=document.activeElement?.getAttribute('data-ep-rank');
    let svg=`<defs><marker id="ep-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="currentColor" stroke-width="1.4"/></marker></defs><text x="20" y="22" font-size="12" class="ep-muted">PP${state.pp} / EDP${state.edp} / TP${state.tp} · L${state.layer} · μb ${state.mb+1}/${config.microbatches}</text><text x="1380" y="22" text-anchor="end" font-size="12" class="ep-muted">${f.complete?'已完成':network?'网络传输':f.phase.id==='compute'?'卡内计算':'卡内分桶'}</text>`;
    flowList.forEach((flow,i)=>{
      const from=combine?flow.target:flow.source,to=combine?flow.source:flow.target;
      const sourceX=center(from),targetX=center(to),rise=62+Math.abs(event.ids.indexOf(from)-event.ids.indexOf(to))*18;
      const selectedOffset=(i-(flowList.length-1)/2)*6;
      const x1=sourceX+(from===state.selected?selectedOffset:0),x2=targetX+(to===state.selected?selectedOffset:0);
      const path=`M${x1} ${cardY-8} C${x1} ${cardY-rise},${x2} ${cardY-rise},${x2} ${cardY-8}`;
      const value=flow.tokens*.008;
      svg+=`<path class="ep-ribbon ${network?'active':''}" d="${path}" stroke-width="${Math.max(.8,value)}" opacity="${network?.30:.10}"><title>R${from} → R${to} · ${fmt(flow.tokens)} tokens · ${mb(flow.bytes)} · ${combine?'专家输出':'Token 激活'}</title></path>`;
      // A fixed-width route plus a fine progress stroke: no width/rate ambiguity.
      if(network)svg+=`<path d="${path}" fill="none" stroke="currentColor" stroke-width="1.2" pathLength="1" stroke-dasharray="${f.q} 1" opacity=".85"/><path d="${path}" fill="none" stroke="currentColor" stroke-width=".6" opacity=".5" marker-end="url(#ep-arrow)"/>`;
    });
    f.ranks.forEach((r,i)=>{
      const x=center(r.id),selected=r.id===state.selected,expertStart=i*(config.experts/config.ep),hot=event.hot&&i===3%config.ep;
      const line=combine?`返回 ${fmt(r.returned+r.local)} / ${fmt(config.seq)}`:f.phase.id==='route'?`待发 ${fmt(r.remoteOut)}`:`已收 ${fmt(r.received)} / ${fmt(r.remoteIn)}`;
      svg+=`<g class="ep-node" data-ep-rank="${r.id}" role="button" tabindex="0" aria-pressed="${selected}" aria-label="Rank ${r.id}，专家 ${expertStart} 到 ${expertStart+config.experts/config.ep-1}，${line}"><rect class="ep-card ${selected?'selected':''}" x="${x-width/2}" y="${cardY}" width="${width}" height="112" rx="2"/><path d="M${x-16} ${cardY}H${x+16}" stroke="currentColor" stroke-width="3"/><text x="${x-width/2+12}" y="${cardY+28}" font-size="19">R${r.id}</text><text x="${x-width/2+12}" y="${cardY+49}" font-size="11" class="ep-muted">E${expertStart}–${expertStart+config.experts/config.ep-1}${hot?' · 热点':''}</text><text x="${x-width/2+12}" y="${cardY+73}" font-size="11">${line}</text><text x="${x-width/2+12}" y="${cardY+94}" font-size="10" class="ep-muted">LOCAL ${fmt(r.local)}</text><text x="${x}" y="${cardY+137}" text-anchor="middle" font-size="11" class="ep-muted">专家持有 ${mb(r.activationBytes)}</text></g>`;
      if(f.phase.id==='route'){
        let bx=x-width/2+12;
        event.matrix[i].forEach((tokens,d)=>{const bw=tokens/(config.seq*config.mbs)*(width-24);svg+=`<rect x="${bx}" y="${cardY+102}" width="${Math.max(0,bw-1)}" height="3" fill="currentColor" opacity="${d===i?.85:.35}"><title>分给 R${event.ids[d]}：${fmt(tokens)} tokens${d===i?' · 留在本卡':''}</title></rect>`;bx+=bw;});
      }
      if(f.phase.id==='compute')svg+=`<path d="M${x-width/2} ${cardY+115}h${width*f.q}" stroke="currentColor" stroke-width="2"><title>专家计算进度 ${Math.round(f.q*100)}% · 教学假设</title></path>`;
    });
    get('ep-canvas').innerHTML=svg;
    if(oldFocus!==null&&oldFocus!==undefined)get('ep-canvas').querySelector(`[data-ep-rank="${oldFocus}"]`)?.focus({preventScroll:true});
    const descriptions={route:'按专家归属分桶；本地 Token 保留在卡内',dispatch:'激活送往专家 Rank；流带总宽保持不变',compute:'网络暂停，专家使用收到的激活进行计算',combine:'专家输出返回原始 Rank，按 Token 位置合并'};
    get('ep-stage-title').textContent=(f.complete?'已完成 · ':`${M.phases.indexOf(f.phase)+1} / 4 · `)+f.phase.name;
    get('ep-stage-description').textContent=descriptions[f.phase.id];
    get('ep-route-note').textContent=`${state.direction==='out'?`追踪 R${state.selected} 的 Token：分发出去 → 输出返回`:`追踪 R${state.selected} 的专家：接收输入 → 返回输出`} · ${flowList.length} 个远端`;
    get('ep-owner').textContent=`R${state.selected} · ${combine?'远端输出已返回':f.phase.id==='route'?'本次专家输入总量':'远端 Token 已接收'}`;
    get('ep-owner-count').textContent=f.phase.id==='route'?fmt(own.expertTokens)+' tokens':fmt(combine?own.returned:own.received)+' / '+fmt(combine?own.remoteOut:own.remoteIn);
    get('ep-owner-note').textContent=`本地 ${fmt(own.local)} · 专家输入 ${fmt(own.expertTokens)} · 当前专家侧持有 ${mb(own.activationBytes)}`;
    get('ep-owner-progress').style.width=(f.phase.id==='route'?0:combine?f.combine:f.dispatch)*100+'%';
    get('ep-buffer').textContent=mb(own.bufferBytes);
    get('ep-buffer-note').textContent=own.bufferBytes?'本阶段完整收发暂存 · 完成后释放':'当前没有跨 Rank 收发暂存';
    get('ep-total').textContent=mb(event.dispatchBytes*2);
    get('ep-total-note').textContent=`分发 ${mb(event.dispatchBytes)} + 回收 ${mb(event.dispatchBytes)} · 本地 ${fmt(event.localTokens)} tokens 不计入`;
    get('ep-time').value=Math.round(state.time*1000);get('ep-time').setAttribute('aria-valuetext',`${f.phase.name} ${Math.round(f.q*100)}%`);
    get('ep-play').textContent=state.playing?'暂停':'播放';get('ep-play').setAttribute('aria-label',state.playing?'暂停 EP 事件':'播放 EP 事件');
    app.querySelectorAll('[data-ep-phase]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.epPhase===M.phases.indexOf(f.phase)));
  }
  function setActive(active){
    state.active=active;state.playing=false;state.last=null;playing=false;lastFrame=null;
    app.hidden=!active;entry.hidden=active;document.body.classList.toggle('ep-active',active);
    if(active){configure();get('ep-play').focus({preventScroll:true});}
    else{selectedRank=state.selected;relationRank=state.selected;$('relations').value='ep';fitCanvas();entry.focus({preventScroll:true});}
  }
  get('ep-memory').onclick=()=>setActive(false);entry.onclick=()=>setActive(true);
  get('ep-theme').onclick=()=>{$('theme-toggle').click();};
  for(const [id,key] of [['ep-stage-select','pp'],['ep-replica','edp'],['ep-tp','tp'],['ep-layer','layer'],['ep-mb','mb']])get(id).onchange=e=>{
    state[key]=+e.target.value-(key==='mb'?1:0);
    if(key==='pp')state.layer=state.pp*config.layers/config.pp;
    rebuild();
  };
  get('ep-load').onchange=e=>{state.hot=e.target.value==='hot';rebuild();};
  get('ep-context').onclick=e=>{const b=e.target.closest('[data-ep-group]');if(!b)return;[state.pp,state.edp,state.tp]=b.dataset.epGroup.split(',').map(Number);state.layer=state.pp*config.layers/config.pp;get('ep-stage-select').value=state.pp;get('ep-replica').value=state.edp;get('ep-tp').value=state.tp;rebuild();};
  const selectRank=e=>{const node=e.target.closest('[data-ep-rank]');if(node){state.selected=+node.dataset.epRank;draw();}};
  get('ep-canvas').onclick=selectRank;
  get('ep-canvas').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRank(e);}};
  get('ep-play').onclick=()=>{if(state.time>=1)state.time=0;state.playing=!state.playing;state.last=null;draw();};
  get('ep-restart').onclick=()=>{state.time=0;state.last=null;draw();};
  get('ep-time').oninput=e=>{state.time=+e.target.value/1000;state.playing=false;state.last=null;draw();};
  app.querySelectorAll('[data-ep-phase]').forEach(b=>b.onclick=()=>{state.time=M.phases[+b.dataset.epPhase].start;state.playing=false;state.last=null;draw();});
  get('ep-direction').onclick=e=>{state.direction=state.direction==='out'?'in':'out';e.currentTarget.textContent=state.direction==='out'?'追踪本卡 Token':'追踪本卡专家';e.currentTarget.setAttribute('aria-pressed',state.direction==='in');draw();};
  document.addEventListener('visibilitychange',()=>{state.last=null;});
  let painted=0;
  function animate(now){
    if(state.active&&state.playing&&!document.hidden){if(state.last!==null)state.time=Math.min(1,state.time+(now-state.last)/16000);state.last=now;if(state.time===1)state.playing=false;if(now-painted>66||!state.playing){draw();painted=now;}}
    else state.last=null;
    requestAnimationFrame(animate);
  }
  selectedRank=23;setActive(true);requestAnimationFrame(animate);
})();
