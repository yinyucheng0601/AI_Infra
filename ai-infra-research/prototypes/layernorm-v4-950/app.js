'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bytes = n => n < 1024 ? n + ' B' : +(n / 1024).toFixed(2) + ' KiB';
const tx = (x, y, text, cls = 'muted') => `<text x="${x}" y="${y}" class="${cls}">${esc(text)}</text>`;
let showBufferLife = false, beforeBufferView = null;
const view = { x: 0, y: 0, scale: 1 };
let caseIndex = 0, step = 0, lifeId = null, timer = null, panel = null, previousPanel = null;
const current = () => DATA.cases[caseIndex];
const activeEvent = () => current().events[step];
const living = () => current().life.filter(l => l.start <= step && step < l.end);
const selection = '#fff';
const tracks = ['MTE2', 'Vector', 'MTE3'];
const role = {activation:'#B1EF6B', weight:'#BCA0F3', aggregate:'#F2C45F'};
const x0 = 226, width = 1120;
const chip = (attrs, label, body) => `<g role="button" tabindex="0" ${attrs} aria-label="${esc(label)}" data-tip="${esc(label)}">${body}</g>`;
const row = (y, h, odd) => `<rect x="18" y="${y}" width="${width+x0-8}" height="${h}" fill="${odd ? '#1c1c1c' : '#161616'}"/>`;

function draw() {
  const c = current(), {events, life} = c, cw = width / events.length;
  const at = i => x0 + i * cw;
  const ubTop = 284, rowHeight = 53;
  const buffers = [...new Set(life.map(l => l.buffer))];
  const height = name => (1+Math.max(...life.filter(l=>l.buffer===name).map(l=>l.band||0)))*rowHeight;
  const lifeBottom = ubTop + buffers.reduce((sum,name)=>sum+height(name),0);
  let svg = tx(28, 24, c.route + '  ·  tilingKey ' + c.key, 'caption') +
    tx(28, 48, c.scope) + tx(28, 80, '源码步骤', 'caption');
  events.forEach((event, i) => {
    const color = i === step ? selection : '#282828';
    svg += `<rect x="${at(i)+3}" y="62" width="${cw-6}" height="26" rx="4" fill="${color}"/><text x="${at(i)+cw/2}" y="80" text-anchor="middle" fill="${i===step?'#111':'#aaa'}" font-size="12">${i+1}</text>`;
  });
  tracks.forEach((name, i) => {
    const y = 99 + i*49;
    svg += row(y, 48, i%2) + tx(28,y+29,name,'caption');
  });
  svg += `<path d="M${at(step)+cw/2} 88V${lifeBottom}" stroke="#888" stroke-dasharray="3 5" opacity=".55"/>`;
  events.forEach((e, i) => {
    const y = 106 + e.lane*49, w = cw-10;
    svg += chip(`data-step="${i}" aria-pressed="${i===step}"`, e.label,
      `<image x="${at(i)+5}" y="${y}" width="${w}" height="36" href="${taskImage(e.short,w,i===step,false,e.lane)}"/>`);
  });
  svg += tx(28, 267, 'Tensor / UB · 数据使用区间', 'caption');
  let y = ubTop;
  buffers.forEach((name, i) => {
    svg += row(y,height(name)-1,i%2) + tx(28,y+21,name,'caption') +
      tx(28,y+39, bytes(c.capacity[name])+' · InitBuffer');
    for (const l of life.filter(item => item.buffer === name)) {
      const blockY = y + 8 + (l.band||0)*rowHeight;
      const w = (l.end-l.start)*cw-9, live = l.start<=step && step<l.end;
      const color = l.id === lifeId ? selection : live ? role[l.role] : '#858585';
      const block = l.role === 'aggregate'
        ? MemoryInspectorBlock.render({x:at(l.start)+4,y:blockY,width:w,height:35,name:l.name,size:l.bytes,line:l.ref.line,endLine:l.ref.end,color:color==='#858585'?'#666':color})
        : GridTensor.render(at(l.start)+4,blockY,w,l.name,color,l.id);
      svg += chip(`data-life="${l.id}" data-live="${live}" style="--tensor-fill:${color}" aria-pressed="${l.id===lifeId}"`, l.name+' · '+bytes(l.bytes)+' · '+name,block);
    }
    y += height(name);
  });
  let bottom = lifeBottom;
  if (showBufferLife) {
    const plot = renderBufferLifetimePlot({
      x0,width,top:lifeBottom+51,steps:events.length,capacity:align(Object.values(c.capacity).reduce((sum,n)=>sum+n,0),32768),
      title:'UB 逻辑偏移 · 生命周期',
      description:'纵轴按 InitBuffer 预留生成逻辑偏移。双槽使用独立预留，TBuf 可按源码步骤复用。同一逻辑偏移不表示编译器或设备地址。',
      axis:bytes,items:bufferItems(c)
    });
    svg += plot.markup;
    svg += `<path d="M${at(step)+cw/2} ${lifeBottom}V${plot.bottom}" stroke="#888" stroke-dasharray="3 5" opacity=".55"/>`;
    bottom = plot.bottom;
  }
  svg += tx(28,bottom+28, '步骤 '+(step+1)+' · '+activeEvent().label,'caption');
  svg += tx(x0,bottom+28, '当前 UB 数据   '+(living().map(l=>l.name).join(' / ')||'—'));
  $('business').innerHTML = svg;
  $('identity').textContent = c.shape+' · FP32 · '+DATA.revision.slice(0,12);
  $('progress').textContent = (step+1)+' / '+events.length;
  $('prev').disabled = step === 0;
  $('next').disabled = step === events.length-1;
  document.querySelectorAll('[data-case]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.case===caseIndex)));
  transform();
  syncHardwareWindow();
}

function showPanel(id) {
  panel = id;
  for (const name of ['inspector','auditPanel','sourcePanel']) $(name).hidden = name !== id;
}

function refButton(ref, label) {
  const key = JSON.stringify(ref);
  return `<button class="audit-item" data-ref="${esc(key)}" data-tip="打开固定版本源码并高亮对应行">${esc(label)} <small>${esc(ref.file.split('/').pop())} · L${ref.line}–${ref.end}</small></button>`;
}

function inspect() {
  const focused = document.activeElement;
  const e = activeEvent(), c = current(), selected = c.life.find(l => l.id === lifeId);
  $('detail').innerHTML = `<span class="tag">步骤 ${step+1} · ${tracks[e.lane]}</span><h2>${esc(e.label)}</h2><p>${esc(e.note)}</p>` +
    living().map(l => `<button class="audit-item" data-life="${l.id}" aria-pressed="${l.id===lifeId}" data-tip="检查该 Tensor 的 UB 字节量、区间及源码">${esc(l.name)}<small>${esc(l.buffer)} · ${bytes(l.bytes)} · 步骤 ${l.start+1}–${l.end}</small></button>`).join('') +
    (selected ? `<p>${esc(selected.note)}<br>InitBuffer 预留 ${bytes(c.capacity[selected.buffer])}，当前对象 ${bytes(selected.bytes)}。</p>` + refButton(selected.ref,'定位 Tensor / UB 语句') + refButton(c.allocation,'定位 InitBuffer') : '') +
    refButton(e.ref,'定位当前 Kernel 步骤');
  updateHandoff();
  showPanel('inspector');
  if (focused?.id === 'inspect') $('inspector').querySelector('[data-close]').focus();
}

const auditGroups = [
  {title:'Host 分支与单测',refs:[0,1,2,3,4,5,6,8],summary:c=>c.route+' · 单测断言 Key '+c.key},
  {title:'tilingKey 与 Kernel 派发',refs:[9,10,11],summary:c=>'Key '+c.key+' → '+c.route+' Kernel'},
  {title:'UB 分配与数据使用',refs:[7,12],summary:c=>bytes(Object.values(c.capacity).reduce((sum,n)=>sum+n,0))+' · InitBuffer 预留'},
];
$('auditBadge').textContent = auditGroups.length;
$('audit').setAttribute('aria-label', '核查 Host tiling 与 Kernel，'+auditGroups.length+' 项');

function audit() {
  const c = current();
  $('audits').innerHTML = `<span class="tag">FP32 · ${esc(c.shape)} · Key ${c.key}</span><h2>${esc(c.route)}</h2><p>${esc(c.host)}</p>` +
    auditGroups.map(group=>`<details class="audit-group">
    <summary data-tip="展开此核查项的固定源码"><strong>${esc(group.title)}</strong><small class="audit-summary">${esc(group.summary(c))}</small></summary>
    <div class="audit-evidence">${group.refs.map(i=>refButton(c.audit[i],c.audit[i].label)).join('')}</div>
    </details>`).join('');
  showPanel('auditPanel');
  if (document.activeElement === $('audit')) $('auditPanel').querySelector('[data-close]').focus();
}

const selectedTensor = () => current().life.find(l=>l.id===lifeId);
const sourceUrl = ref => `https://gitcode.com/cann/ops-nn/blob/${DATA.revision}/${ref.file}#L${ref.line}-${ref.end}`;
function handoff() {
  const c = current(), tensor = selectedTensor();
  return {
    revision:DATA.revision, config:c.shape, dtype:'FP32', route:c.route, tilingKey:c.key,
    step:step+1, event:activeEvent(), tensor:tensor||null, buffers:living(),
    reservations:c.capacity, sources:[activeEvent().ref,tensor?.ref,c.allocation].filter(Boolean)
      .map(ref=>({...ref,url:sourceUrl(ref)})),
    question:$('question').value
  };
}
function updateHandoff() {
  $('handoff').textContent = JSON.stringify(handoff(),null,2);
}
async function copyEvidence(content,status) {
  try {
    await navigator.clipboard.writeText(content);
    $(status).textContent = '已复制';
  } catch {
    $(status).textContent = '复制失败，可手动选择并复制文本。';
  }
}
$('question').value = '核对当前步骤的 Tensor、UB 占用和固定源码，给出最小上板验证方案。';
$('question').oninput = updateHandoff;
$('copy').onclick = () => {
  $('inspector').querySelector('details').open = true;
  copyEvidence($('handoff').textContent,'copyStatus');
};
$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([$('handoff').textContent],{type:'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `layernorm-v4-${current().key}-step-${step+1}.json`;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
const tabRefs = {
  kernel:()=>selectedTensor()?.ref || activeEvent().ref,
  host:()=>current().audit[6],
  test:()=>current().audit[2],
  dispatch:()=>current().audit[11]
};
function sourceRecord(ref,tab) {
  if (panel !== 'sourcePanel') previousPanel = panel;
  tab ??= ref.file.includes('/tests/') ? 'test' : ref.file.includes('/op_kernel/') ?
    (ref.file.includes('_apt.')?'dispatch':'kernel') : 'host';
  $('revision').textContent = DATA.revision.slice(0,12);
  document.querySelectorAll('[data-src]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.src===tab)));
  const code = $('sourceCode');
  if (tab === 'raw') {
    $('sourceMeta').textContent = '当前配置、步骤与证据';
    code.textContent = JSON.stringify(handoff(),null,2);
  } else {
    $('sourceMeta').innerHTML = `<a class="source-link" href="${sourceUrl(ref)}" target="_blank" rel="noopener" data-tip="在 GitCode 打开固定提交">${esc(ref.file)} · L${ref.line}–${ref.end} ↗</a>`;
    code.innerHTML = DATA.sources[ref.file].split('\n').map((line,i)=>{
      const n = i+1;
      return `<span class="${n>=ref.line&&n<=ref.end?'active':''}" data-line="${n}"><em>${n}</em>${esc(line)||' '}</span>`;
    }).join('');
  }
  showPanel('sourcePanel');
  const line = code.querySelector('.active');
  code.scrollTop = line ? line.offsetTop-code.offsetTop-8 : 0;
}
document.querySelectorAll('[data-src]').forEach(b => b.onclick = () => {
  const tab = b.dataset.src;
  sourceRecord(tabRefs[tab]?.(),tab);
});

function stop() {
  clearInterval(timer);
  timer = null;
  $('play').textContent = '播放';
  $('play').setAttribute('aria-pressed','false');
}

function select(i, open = false, id = null) {
  step = Math.max(0, Math.min(current().events.length-1, i));
  lifeId = id;
  draw();
  if (open || panel === 'inspector') inspect();
}

function activate(button) {
  stop();
  const life = button.dataset.life || button.dataset.bufferId;
  if (life) {
    const l = current().life.find(l => l.id === life);
    select(l.start<=step && step<l.end ? step : l.start, true, l.id);
  } else {
    select(+button.dataset.step, true);
  }
  $('inspector').querySelector('[data-close]').focus();
}

$('canvas').onclick = e => {
  const object = e.target.closest('[data-step],[data-life],[data-buffer-id]');
  if (object && !moved) activate(object);
};
$('canvas').onkeydown = e => {
  const object = e.target.closest('[data-step],[data-life],[data-buffer-id]');
  if (object && ['Enter',' '].includes(e.key)) {
    e.preventDefault();
    activate(object);
  }
};
$('detail').onclick = $('audits').onclick = e => {
  const ref = e.target.closest('[data-ref]'), life = e.target.closest('[data-life]');
  if (ref) { stop(); sourceRecord(JSON.parse(ref.dataset.ref)); $('back').focus(); }
  if (life) {
    activate(life);
    $('detail').querySelector(`[data-life="${lifeId}"]`)?.focus();
  }
};
$('audit').onclick = () => { stop(); audit(); };
$('inspect').onclick = () => { stop(); inspect(); };
$('source').onclick = () => {
  stop();
  sourceRecord(tabRefs.kernel(),'kernel');
  $('back').focus();
};
$('info').onclick = () => {
  stop();
  const c = current(), e = activeEvent(), tensor = selectedTensor();
  $('usageRevision').textContent = DATA.revision;
  $('usagePrompt').textContent = `使用 ai-infra-investigation 核查 cann/ops-nn 的 norm/layer_norm_v4，固定提交 ${DATA.revision}。配置 FP32 ${c.shape}，${c.route}，tilingKey ${c.key}。当前步骤 ${step+1}「${e.label}」${tensor?'，Tensor「'+tensor.name+'」':''}。从 ${sourceUrl(tensor?.ref||e.ref)} 入手，核对 tiling、InitBuffer 和数据使用区间，给出最小设备 Trace 验证方案。`;
  $('promptStatus').textContent = '';
  $('usageWindow').showModal();
};
$('usageClose').onclick = () => $('usageWindow').close();
$('usageWindow').addEventListener('close',()=> $('info').focus({preventScroll:true}));
$('promptCopy').onclick = () => copyEvidence($('usagePrompt').textContent,'promptStatus');
$('back').onclick = () => {
  if (previousPanel === 'auditPanel') audit();
  else if (previousPanel === 'inspector') inspect();
  else showPanel(null);
  if (panel) $(panel).querySelector('[data-close]').focus();
  else $('source').focus();
};
function closePanel() {
  const from = panel;
  showPanel(null);
  if (from === 'sourcePanel' && !previousPanel) $('source').focus();
  else if (from === 'auditPanel' || from === 'sourcePanel' && previousPanel === 'auditPanel') $('audit').focus();
  else if (lifeId) $('business').querySelector(`[data-life="${lifeId}"]`)?.focus({preventScroll:true});
  else $('business').querySelector(`[data-step="${step}"]`)?.focus({preventScroll:true});
}
document.querySelectorAll('aside:not(#hardwarePanel) [data-close]').forEach(b => b.onclick = closePanel);
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('usageWindow').open) { if (panel) closePanel(); else if (!$('hardwarePanel').hidden) closeHardware(); } });
document.addEventListener('pointerover', showTip);
document.addEventListener('focusin', showTip);
document.addEventListener('pointerout', () => $('tooltip').hidden = true);
document.addEventListener('focusout', () => $('tooltip').hidden = true);
document.querySelectorAll('[data-case]').forEach(b => {
  const c = DATA.cases[+b.dataset.case];
  b.textContent = c.shape+' · '+c.route;
  b.dataset.tip = '切换到 FP32 '+c.shape+'，tilingKey '+c.key;
  b.onclick = () => {
    stop(); caseIndex = +b.dataset.case; select(0);
    if (panel === 'auditPanel') audit();
    else if (panel === 'sourcePanel') closePanel();
  };
});
$('prev').onclick = () => { stop(); select(step-1); };
$('next').onclick = () => { stop(); select(step+1); };
$('play').onclick = () => {
  if (timer !== null) { stop(); return; }
  if (panel === 'sourcePanel') closePanel();
  if (step === current().events.length-1) select(0);
  $('play').textContent = '暂停';
  $('play').setAttribute('aria-pressed','true');
  timer = setInterval(() => { select(step+1); if (step === current().events.length-1) stop(); },750);
};

const align = (n,block) => Math.ceil(n/block)*block;
const bufferColors = {weight:'#BCA0F3',aggregate:'#F2C45F',activation:'#79D4F2'};
function bufferItems(c) {
  let base = 0;
  const items = [];
  for (const [buffer,capacity] of Object.entries(c.capacity)) {
    const intervals = c.life.filter(l=>l.buffer===buffer);
    // Only X has overlapping requests in the displayed windows. Offset by a full reserved queue slot.
    const slotSize = buffer==='xQueue_' ? capacity/2 : capacity;
    for (const life of intervals) {
      const {id,name,start,end,ref} = life;
      const offset = base+(life.band||0)*slotSize;
      const color = id===lifeId ? selection : start<=step&&step<end ? bufferColors[life.role] : '#666';
      items.push({id,buffer,name,start,end,offset,size:life.bytes,color,eventIndex:start,
        srcLineStart:ref.line,srcLineEnd:ref.end,
        tip:`${buffer} / ${name} · ${bytes(life.bytes)} · 逻辑偏移 ${bytes(offset)} · L${ref.line}–${ref.end}`});
    }
    base += capacity;
  }
  return items;
}

$('memoryReuseButton').onclick = () => {
  stop();
  showBufferLife = !showBufferLife;
  $('memoryReuseButton').setAttribute('aria-pressed',String(showBufferLife));
  if (showBufferLife) beforeBufferView = {...view};
  else if (beforeBufferView) Object.assign(view,beforeBufferView);
  draw();
  if (showBufferLife) fit();
};

function eventHardwarePath() {
  const event = activeEvent();
  const transfer=event.label.includes('NDDMA')?'NDDMA':'MTE2';
  return [`GM → L2 → ${transfer} → UB`,'UB ↔ SIMD / Vector','UB → MTE3 → L2 → GM'][event.lane];
}

function closeHardware() {
  if (!$('hardwarePanel').hidden) toggleHardwareWindow();
  $('chipView').focus();
}
$('chipView').onclick = toggleHardwareWindow;
$('hardwarePanel').querySelector('[data-close]').onclick = closeHardware;
new ResizeObserver(() => {
  if (architecture.ready && !$('hardwarePanel').hidden) fitHardwareMini();
}).observe($('hardwareMiniViewport'));

const hardwarePanel = $('hardwarePanel'), hardwareHead = hardwarePanel.querySelector('.head');
let hardwareDrag;
hardwareHead.onpointerdown = e => {
  if (e.button !== 0 || e.target.closest('button')) return;
  const bounds = hardwarePanel.getBoundingClientRect();
  hardwareDrag = {x:e.clientX,y:e.clientY,left:bounds.left,top:bounds.top};
  hardwareHead.setPointerCapture(e.pointerId);
};
hardwareHead.onpointermove = e => {
  if (!hardwareDrag) return;
  const left = Math.max(8,Math.min(innerWidth-hardwarePanel.offsetWidth-8,hardwareDrag.left+e.clientX-hardwareDrag.x));
  const top = Math.max(8,Math.min(innerHeight-hardwarePanel.offsetHeight-8,hardwareDrag.top+e.clientY-hardwareDrag.y));
  hardwarePanel.style.setProperty('left',left+'px','important');
  hardwarePanel.style.setProperty('top',top+'px','important');
  hardwarePanel.style.setProperty('bottom','auto','important');
};
hardwareHead.onpointerup = hardwareHead.onpointercancel = () => {hardwareDrag=null;};
