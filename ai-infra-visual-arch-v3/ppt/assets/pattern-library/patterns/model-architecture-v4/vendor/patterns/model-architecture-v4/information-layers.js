(function(global){
'use strict';
const names={shape:'Shape',precision:'精度',storage:'存储及执行',control:'状态 / 控制',count:'执行次数',sync:'同步'};
const width=count=>Math.min(6,1.5+.4*Math.log2(Math.max(1,count)));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function decorate(host,graph,enabled,evidence){
 const ns='http://www.w3.org/2000/svg',has=key=>enabled.has(key);
 const make=(tag,attrs={})=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;};
 const text=(parent,value,x,y,cls='v4-overlay-property')=>{const e=make('text',{x,y,'text-anchor':'middle',class:cls,'pointer-events':'none'});e.textContent=value;parent.append(e);return e;};
 for(const node of graph.nodes){
  if(node.role==='residual-annotation'||node.role==='mhc-merge'||node.id.endsWith('/expert_ellipsis')||/^[…⋯.]+$/.test(node.label))continue;
  const el=host.querySelector(`[data-node-id="${CSS.escape(node.id)}"]`);if(!el)continue;
  if(has('control')){
    const semantic=global.PtoCsaMappingRegistry?.getNode(node.id);
    const states=semantic?.entityKind==='LogicalState'?[semantic]:(semantic?.children||[]).map(id=>global.PtoCsaMappingRegistry.getNode(id)).filter(n=>n?.entityKind==='LogicalState');
    if(states.length){const mark=text(el,semantic?.entityKind==='LogicalState'?'持久状态':'跨 token 状态',-node.width/2+16,-node.height/2-10,'v4-overlay-state-marker');mark.setAttribute('text-anchor','start');const title=make('title');title.textContent=states.map(n=>n.label+' · '+(n.lifecycle||'跨 token 状态')).join('\n');mark.append(title);}
  }
  const entry=evidence.nodes[node.id];const edges=graph.edges.filter(e=>e.source===node.id||e.target===node.id);
  const shape=node.attrs?.shape||(node.label.match(/\[[^\]]+\]/)||[])[0]||edges.find(e=>e.tensor?.shape)?.tensor.shape;
  const dtype=node.attrs?.dtype||edges.find(e=>e.tensor?.dtype)?.tensor.dtype;
  const parts=[];if(has('shape')&&shape)parts.push(shape);if(has('precision')&&dtype)parts.push(String(dtype).toUpperCase());
  const label=el.querySelector('.pto-model-graphviz-node-label');
  const body=el.querySelector('rect');
  const hasIcon=Boolean(el.dataset.opIcon);
  const bodyX=Number(body?.getAttribute('x')??-node.width/2);
  const bodyWidth=Number(body?.getAttribute('width')??node.width);
  const bodyHeight=Number(body?.getAttribute('height')??node.height);
  const contentLeft=bodyX+16+Math.min(44,bodyHeight-16)+12;
  const rightInset=node.collapsed?64:20;
  const contentWidth=hasIcon?Math.max(24,bodyX+bodyWidth-rightInset-contentLeft):Math.max(40,node.width-28);
  if(hasIcon&&label){label.setAttribute('x',contentLeft);label.setAttribute('text-anchor','start');label.style.textAnchor='start';label.removeAttribute('textLength');label.removeAttribute('lengthAdjust');}

  if(label&&shape&&node.label.includes(shape)){label.textContent=node.label.replace(' · '+shape,'').replace(shape,'').trim();}
  const propertyRows=[];
  if(has('storage')&&entry)propertyRows.push({value:entry.cores.join('+')+(entry.memory.length?' · '+entry.memory.join('/'):''),cls:'v4-overlay-property v4-overlay-storage'});
  if(parts.length)propertyRows.push({value:parts.join(' · '),cls:'v4-overlay-property'});
  if(hasIcon&&label&&label.getComputedTextLength()>contentWidth){label.setAttribute('textLength',contentWidth);label.setAttribute('lengthAdjust','spacingAndGlyphs');}
  if(propertyRows.length&&label)label.setAttribute('y',Number(label.getAttribute('y'))-(propertyRows.length>1?16:10));
  propertyRows.forEach((row,i)=>{const line=text(el,row.value,hasIcon?contentLeft:0,propertyRows.length>1?5+i*16:18,row.cls);if(hasIcon){line.setAttribute('text-anchor','start');line.style.textAnchor='start';}const available=contentWidth;if(line.getComputedTextLength()>available){line.setAttribute('textLength',available);line.setAttribute('lengthAdjust','spacingAndGlyphs');}});
  if(!entry)continue;
  const title=make('title');title.textContent=`rank0 / d0 · ${entry.count} 核任务实例\n${Object.entries(entry.callables).map(([name,count])=>`${name}: ${count}`).join('\n')}`;el.append(title);
  const outlineY=-node.height/2-9;
  if(has('sync')&&entry.synchronization){
    const rect=el.querySelector('rect');const radius=Number(rect?.getAttribute('rx')||node.height/2)+9;
    const mark=make('g',{class:'v4-overlay-sync','pointer-events':'none'});
    mark.append(make('rect',{x:-node.width/2-9,y:outlineY,width:node.width+18,height:node.height+18,rx:radius,fill:'none',class:'v4-overlay-sync-outline'}));
    const t=make('title');t.textContent='TPipe 0 · AIC ⇄ AIV · TPUSH / TPOP（融合 kernel 内部）';mark.append(t);el.append(mark);
  }
  if(has('count')){
    const value='×'+entry.count,w=Math.max(46,value.length*9+20);
    const badge=make('g',{class:'v4-overlay-count-badge','pointer-events':'none'});
    badge.append(make('rect',{x:-w/2,y:outlineY-11,width:w,height:22,rx:11}));
    text(badge,value,0,outlineY+4,'v4-overlay-count');el.append(badge);el.dataset.coreTaskCount=entry.count;
  }
 }
 for(const edge of graph.edges){const entry=evidence.nodes[edge.source];for(const el of host.querySelectorAll(`[data-source="${CSS.escape(edge.source)}"][data-target="${CSS.escape(edge.target)}"]`)){
  const controlKinds=(edge.semanticEdgeTypes||[edge.semanticEdgeType]).filter(k=>['state','state-read','state-write','control','feedback'].includes(k));
  if(has('control')&&controlKinds.length){
    const kind=controlKinds[0];el.classList.add('v4-overlay-control-edge');el.dataset.controlKind=kind;
    const title=make('title');title.textContent=({'state-read':'读取持久状态','state-write':'写回持久状态',control:'控制依赖',feedback:'跨迭代反馈',state:'状态关系'})[kind];el.append(title);
    if(typeof el.getTotalLength==='function'&&el.parentNode){const point=el.getPointAtLength(el.getTotalLength()/2);const label=text(el.parentNode,({'state-read':'读状态','state-write':'写状态',control:'控制',feedback:'反馈',state:'状态'})[kind],point.x+8,point.y-7,'v4-overlay-control-label');label.setAttribute('text-anchor','start');}
  }
  if(has('count')&&entry&&edge.semanticEdgeType!=='parameter'){el.style.strokeWidth=String(width(entry.count));el.style.setProperty('--v4-edge-count-width',width(entry.count)+'px');el.dataset.coreTaskCount=entry.count;const t=make('title');t.textContent=`源节点映射的核任务实例 ×${entry.count} · rank0/d0`;el.append(t);}
 }}
}
function details(id,evidence){const n=evidence.nodes[id];if(!n)return '';return `<strong>${escape(id)}</strong><p>decode_csa_test · rank0 / d0 · 20260903</p><p>${n.count} 核任务实例 · ${escape(n.cores.join(' + '))}</p><p>片上空间：${escape(n.memory.join(' / ')||'未映射')}</p><p>线宽：源节点映射的核任务实例量。${escape(n.mapping)}</p><dl>${Object.entries(n.callables).map(([k,v])=>`<dt>${escape(k)}</dt><dd>${v}</dd>`).join('')}</dl>${n.synchronization?`<h4>TPipe 0 · AIC ⇄ AIV</h4><pre>${n.synchronization.sites.map(s=>`${s.symbol}:${s.line}\n${escape(s.code)}`).join('\n\n')}</pre><p>${escape(n.synchronization.path)}</p>`:''}<h4>编译来源</h4>${n.sourceRefs.map(r=>`<p>${escape(r.path)}:${r.line} · ${escape(r.symbol)}</p>`).join('')}`;}
global.PtoV4InformationLayers={names,width,decorate,details};
})(window);
