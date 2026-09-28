/* Layer face: reference-derived structure, with an explicit Query-only data binding. */
(()=>{
'use strict';
const COLORS={activation:'#B1EF6B',weight:'#BCA0F3',gradient:'#79D4F2'};
const EDGE_COLOR='#777777';
const source='layer-front-notes.md';
const host=document.createElement('section');host.id='layer-front';host.hidden=true;
host.setAttribute('aria-label','当前层正面计算图');
host.innerHTML=`<header class="front-heading"><div class="front-tools"><button type="button" data-zoom="in" aria-label="放大层内图">＋</button><button type="button" data-zoom="out" aria-label="缩小层内图">−</button><button type="button" data-zoom="fit">适应</button><button type="button" id="front-info-button" aria-expanded="false">图例 ⓘ</button></div></header><div class="front-canvas"><svg id="front-graph" viewBox="0 0 1060 1120" preserveAspectRatio="xMidYMid meet" role="group" aria-label="当前层计算关系"></svg></div><aside id="front-node-info" hidden><button type="button" id="front-node-close" aria-label="关闭节点说明">×</button><h3></h3><p></p><button type="button" id="front-open-query">查看矩阵 ↗</button></aside><aside id="front-evidence" hidden><strong>图例与计算结构</strong><p><span style="color:#B1EF6B">■ 激活与中间张量</span><br><span style="color:#BCA0F3">■ 模型参数</span><br><span style="color:#79D4F2">■ 参数梯度 · 虚线表示反向关系</span></p><p>L0–L1：Dense FFN；L2–L48：MoE。每层包含 MLA、4 路 mHC 和 Sandwich Norm。</p><p>点击图元查看计算含义，点击 Query 张量查看矩阵。</p><a href="${source}" target="_blank" rel="noopener">结构来源 ↗</a></aside>`;
document.querySelector('main').append(host);
const svg=host.querySelector('svg'),panel=host.querySelector('#front-node-info');
let state={layer:0,mode:'activation',ready:false},lastKey='',selectedNode=null,zoom=1,drag=null,moved=false;
let nodes={};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(x,y,s,cls='',anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}">${esc(s)}</text>`;
function group(id,title,description,body,kind='structure',query=false){
 nodes[id]={title,description,query};
 return `<g class="front-node ${kind}" data-node="${id}" role="button" tabindex="0" aria-label="${esc(title)}" aria-pressed="${selectedNode===id}"><title>${esc(description)}</title>${body}</g>`;
}
function op(id,x,y,w,title,description){return group(id,title,description,`<rect class="op" x="${x-w/2}" y="${y-24}" width="${w}" height="48" rx="24"/>${text(x,y,title,'op-label')}`)}
// Matrix glyph geometry and luminance formula reused from transformer-layer-guide-v3.html.
function matrix(x,y,w,h,color,rows=3,cols=12,seed=0,anomalySamples=[]){
 const pitch=Math.min(w/cols,h/rows),gw=pitch*cols,gh=pitch*rows,sx=x+(w-gw)/2,sy=y+(h-gh)/2,cell=pitch-2;
 const alertBins=new Set(anomalySamples.map(index=>Math.floor(Math.floor(index/64)*rows/64)*cols+Math.floor(index%64*cols/64)));
 let a=`<rect class="tensor-outline" x="${sx-3}" y="${sy-3}" width="${gw+6}" height="${gh+6}" fill="#111" stroke="${color}" stroke-opacity=".5"/>`;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const o=.22+((r*17+c*7+seed*3)%11)/15;
  a+=`<rect class="grid-cell" x="${sx+c*pitch}" y="${sy+r*pitch}" width="${cell}" height="${cell}" fill="${alertBins.has(r*cols+c)?'#FD5644':color}" opacity="${alertBins.has(r*cols+c)?1:o}"/>`;
 }
 return a;
}
function tensor(id,x,y,title,description,kind='activation',query=false,streams=false){
 const color=COLORS[kind],w=streams?160:kind==='activation'?136:93,h=streams?43:kind==='activation'?35:47;
 const seed=[...id].reduce((n,c)=>n+c.charCodeAt(0),0);
 const anomalySamples=query&&state.ready&&state.mode===kind?(state.anomalySamples||[]):[];
 const hasAlert=anomalySamples.length>0;
 let body=matrix(x-w/2,y,w,h,color,3,kind==='activation'?12:10,seed,anomalySamples);
 if(hasAlert){
  body+=text(x+w/2+8,y-8,'!','anomaly-mark');
  description+=` ${anomalySamples.length} 个采样点超阈值；橙红格表示对应区域含异常采样。`;
 }
 if(kind==='activation')body+=text(x+w/2+24,y+h/2+6,title,'tensor-label','start');
 else body+=text(x,y+h+23,title,'tensor-label');
 return group(id,title,description,body,kind+(hasAlert?' has-alert':''),query);
}
function path(d,kind='activation'){return `<path class="front-edge ${kind}" d="${d}" stroke="${EDGE_COLOR}" marker-end="url(#front-${kind})"/>`}
function add(id,x,y){return group(id,'4 路逐元素相加','H_res 混合后的四路残差，加上 H_post 写回的四路分支结果。此处不是单流恒等旁路。',`<circle class="residual-circle" cx="${x}" cy="${y}" r="19"/><path class="add-mark" d="M${x-6} ${y} H${x+6} M${x} ${y-6} V${y+6}"/>`)}
function render(){
 const {layer,mode}=state,moe=layer>=2;nodes={};
 svg.dataset.mode=mode;svg.dataset.layer=layer;
 let b=`<defs>${Object.keys(COLORS).map(k=>`<marker id="front-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1 L8 5 L1 9" fill="none" stroke="${EDGE_COLOR}" stroke-width="1.3"/></marker>`).join('')}</defs>`;
 b+='<rect class="sublayer" x="75" y="108" width="950" height="474" rx="9"/><rect class="sublayer" x="75" y="648" width="950" height="358" rx="9"/>';
 b+=text(95,137,'01  MLA / Attention','section-label','start')+text(95,674,`02  ${moe?'MoE · 256 experts / top-8':'Dense FFN · SwiGLU'}`,'section-label','start');
 // Main branch reads a single H-vector from four streams; H_res mixes the bypass.
 b+=path('M440 88 V144')+path('M440 192 V214 H355 V234')+path('M440 214 H575 V234');
 b+=path('M355 282 V297')+path('M355 342 V395 H440 V411')+path('M575 282 V395 H440 V411');
 b+=path('M440 459 V473')+path('M440 521 V536')+path('M440 574 V585');
 b+=path('M357 62 H195 V555 H421')+text(179,332,'X','residual-label','end');
 b+=path('M440 638 V669')+path('M440 717 V735')+path('M440 783 V807')+path('M440 855 V872')+path('M440 920 V944');
 b+=path('M357 612 H195 V963 H421')+text(179,810,'Y','residual-label','end')+path('M440 982 V1020');
 // Parameter inputs terminate at the computation they parameterize, not at activations.
 b+=path('M743 258 H720 V210 H355 V234','weight')+path('M743 797 H695 V759 H620','weight');
 // A compact reverse dependency chain; no forward hidden snapshots masquerade as gradients.
 b+=path('M1000 1040 V258 H982','gradient')+path('M1000 797 H982','gradient');
 b+=`<g class="gradient">${text(1009,583,'反向依赖','minor','end')+text(1000,1067,'下游梯度','minor')}</g>`;
 b+=tensor('input',440,40,`X · T × 4 × 2560`,`L${layer} 层输入，4 路残差状态；单样本省略 batch 维。`,'activation',false,true);
 b+=op('attn-read',440,168,340,'Norm 1','从 4 路残差状态读取分支输入，再归一化。此节点折叠 mHC 连接系数生成与融合细节。');
 b+=op('q-down',355,258,180,'Query Down','MLA Query 低秩投影：2560 → 1024。现有层矩阵只对应这一步的权重、输出激活或参数梯度。');
 b+=op('kv',575,258,170,'KV Projection','MLA 的 KV 压缩维度为 512；KV 分支、位置编码和后续恢复投影折叠在此。');
 b+=tensor('query-activation',355,302,'T × 1024','Query 降维的输出激活，逻辑形状 32768 × 1024。沿用当前层、当前 MB 的 64 × 64 采样。','activation',true);
 b+=text(600,324,'Compress / Expand','minor','start')+text(600,353,'Position Encoding','minor','start');
 b+=op('mla',440,435,350,'Attention · MLA','包含 Query 后续归一化与升维、位置编码、Attention 聚合及输出映射。48 heads；QK non-RoPE 128 + RoPE 64，V 128。');
 b+=op('attn-write',440,497,340,'Post Norm 1','Sandwich Norm 的后置归一化作用于分支输出；H_post 将一路结果写回四路。');
 b+=add('attn-add',440,555);
 b+=tensor('between',440,590,'Y · T × 4 × 2560','Attention 子层四路合并结果，也是 FFN 子层输入。','activation',false,true);
 b+=op('ffn-read',440,693,340,'Norm 2','FFN 子层拥有自己的 mHC 读取与归一化，输入来自 Y 的四路状态。');
 b+=op('ffn',440,759,360,moe?'MoE':'FFN · SwiGLU',moe?'L2–L48 按训练参考采用 MoE：256 路由专家，sigmoid 门控，top-8，加上共享专家分支。路由与共享专家并行接收分支输入；图中折叠内部连线。专家中间维度 1024。':'L0–L1 采用 Dense FFN：2560 → 9216 → 2560，SwiGLU 门控非线性。');
 b+=op('ffn-output',440,831,320,moe?'Expert Combine':'Down Projection',moe?'按路由系数加权汇合被选专家，再与共享专家输出相加，返回 T × 2560。':'SwiGLU 中间结果通过 Down 投影回 hidden_size=2560。');
 b+=op('ffn-write',440,896,340,'Post Norm 2','FFN 输出归一化后写回四路，再与该子层的 H_res 混合旁路相加。');
 b+=add('ffn-add',440,963);
 b+=tensor('output',440,1024,`Z → ${layer===48?'主干输出':`L${layer+1}`}`,'本层四路输出，继续传给下一层。','activation',false,true);
 b+=tensor('query-weight',793,234,'W_Query','Query 降维权重；全局逻辑形状 1024 × 2560。与 stack 和矩阵检查器共用当前层快照。','weight',true);
 b+=tensor('query-gradient',932,234,'∂L/∂W_Query','Query 降维的参数梯度，与 W_Query 同形状；不是层间激活梯度。共用当前 Microbatch 采样。','gradient',true);
 b+=tensor('ffn-weight',793,778,'W_FFN','FFN 参数集合：Dense 层包含 Gate、Up、Down 投影；MoE 层包含 Router、路由专家与共享专家参数。','weight');
 b+=tensor('ffn-gradient',932,778,'∂L/∂W_FFN','FFN 参数梯度集合，与相应权重逐坐标对应。','gradient');
 b+=`<g class="weight">${text(836,451,'其余参数折叠','minor')}</g>`;
 svg.innerHTML=b;svg.setAttribute('aria-label',`L${layer} ${moe?'MoE':'Dense'} 层内图，${mode} 模式，训练参考结构`);
 if(!panel.hidden&&selectedNode&&nodes[selectedNode])showNode(selectedNode,false);
}
function positionNodePanel(){
 if(panel.hidden||host.hidden)return;
 const node=svg.querySelector(`[data-node="${selectedNode}"]`);
 if(!node)return;
 const anchor=node.querySelector('.op,.tensor-outline,circle')||node;
 const rect=anchor.getBoundingClientRect(),gap=12,margin=12;
 const width=panel.offsetWidth,height=panel.offsetHeight;
 const left=Math.max(margin,Math.min(rect.left,window.innerWidth-width-margin));
 const top=Math.max(margin,Math.min(rect.bottom+gap,window.innerHeight-height-margin));
 panel.style.left=`${left}px`;panel.style.top=`${top}px`;
}
function showNode(id,focus=false){
 const n=nodes[id];if(!n)return;selectedNode=id;panel.hidden=false;
 panel.querySelector('h3').textContent=`L${state.layer} / ${n.title}`;panel.querySelector('p').textContent=n.description;
 const button=panel.querySelector('#front-open-query');
 button.hidden=!n.query||!id.endsWith(state.mode)||!state.ready;button.disabled=!state.ready;
 button.textContent='查看矩阵 ↗';
 svg.querySelectorAll('[data-node]').forEach(g=>g.setAttribute('aria-pressed',String(g.dataset.node===id)));
 positionNodePanel();
 if(focus)panel.querySelector('#front-node-close').focus();
}
svg.addEventListener('click',e=>{const n=e.target.closest('[data-node]');if(n&&!moved)showNode(n.dataset.node)});
svg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const n=e.target.closest('[data-node]');if(n){e.preventDefault();showNode(n.dataset.node)}}});
panel.querySelector('#front-open-query').addEventListener('click',()=>{panel.hidden=true;window.dispatchEvent(new Event('layer-front:inspect-query'))});
panel.querySelector('#front-node-close').addEventListener('click',()=>{panel.hidden=true;svg.querySelector(`[data-node="${selectedNode}"]`)?.focus()});
const infoButton=host.querySelector('#front-info-button'),evidence=host.querySelector('#front-evidence');
infoButton.addEventListener('click',()=>{evidence.hidden=!evidence.hidden;infoButton.setAttribute('aria-expanded',String(!evidence.hidden))});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.hidden=true;evidence.hidden=true;infoButton.setAttribute('aria-expanded','false')}});
function fit(){zoom=1;svg.setAttribute('viewBox','0 0 1060 1120');positionNodePanel()}
function scale(factor,cx=530,cy=560){const next=Math.max(.65,Math.min(4,zoom*factor)),v=svg.viewBox.baseVal,r=zoom/next;svg.setAttribute('viewBox',`${cx+(v.x-cx)*r} ${cy+(v.y-cy)*r} ${v.width*r} ${v.height*r}`);zoom=next;positionNodePanel()}
host.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.zoom==='fit')fit();else{const v=svg.viewBox.baseVal;scale(button.dataset.zoom==='in'?1.25:.8,v.x+v.width/2,v.y+v.height/2)}}));
svg.addEventListener('wheel',e=>{e.preventDefault();const m=svg.getScreenCTM();if(!m)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse());scale(Math.exp(-Math.max(-160,Math.min(160,e.deltaY))*.0015),p.x,p.y)},{passive:false});
svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;moved=false;const m=svg.getScreenCTM();if(!m)return;drag={x:e.clientX,y:e.clientY,m:m.inverse(),box:[svg.viewBox.baseVal.x,svg.viewBox.baseVal.y,svg.viewBox.baseVal.width,svg.viewBox.baseVal.height]}});
svg.addEventListener('pointermove',e=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5&&!moved)return;moved=true;svg.setPointerCapture(e.pointerId);const a=new DOMPoint(drag.x,drag.y).matrixTransform(drag.m),b=new DOMPoint(e.clientX,e.clientY).matrixTransform(drag.m);svg.setAttribute('viewBox',`${drag.box[0]+a.x-b.x} ${drag.box[1]+a.y-b.y} ${drag.box[2]} ${drag.box[3]}`);positionNodePanel()});
svg.addEventListener('pointerup',()=>{drag=null});svg.addEventListener('pointercancel',()=>{drag=null;moved=false});
window.addEventListener('resize',positionNodePanel);
new ResizeObserver(positionNodePanel).observe(host);
window.LayerFront={update(next){state=next;const key=[next.layer,next.mode,next.ready,(next.anomalySamples||[]).join(',')].join(':');if(!host.hidden&&key!==lastKey){lastKey=key;render()}},setVisible(visible){host.hidden=!visible;if(visible){lastKey='';render();fit()}else{panel.hidden=true;evidence.hidden=true;infoButton.setAttribute('aria-expanded','false')}},fit};
document.getElementById('cycle-view').title='点击轮切：2.5D → Front → Side';
document.getElementById('cycle-view').setAttribute('aria-label','当前视角 2.5D，点击切换 Front');
})();
