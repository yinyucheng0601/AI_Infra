
const opGlyph=(i,x,y)=>`<path d="${i.path}" transform="translate(${x} ${y}) scale(1.25)" fill="none" stroke="#eee" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
const opNode=(i,x,y)=>i.id==='add'?`<circle cx="${x+180}" cy="${y+32}" r="30" fill="#101010" stroke="#aaa" stroke-width="2"/><path d="M${x+168} ${y+32}h24M${x+180} ${y+20}v24" stroke="#eee" stroke-width="2.5"/>`:`<rect x="${x}" y="${y}" width="360" height="64" rx="32" fill="#4f4f4f"/><circle cx="${x+32}" cy="${y+32}" r="22" fill="#101010"/>${opGlyph(i,x+17,y+17)}<text x="${x+180}" y="${y+33}" fill="#eee" font-size="20" text-anchor="middle" dominant-baseline="middle">${esc(i.name)}</text>`;

window.PtoOpIcons = [
  {
    "id": "add",
    "name": "Residual Add",
    "description": "残差相加",
    "path": "M22 12a10 10 0 1 1-20 0a10 10 0 1 1 20 0 M7 12h10 M12 7v10"
  },
  {
    "id": "matmul",
    "name": "MatMul",
    "description": "矩阵乘法",
    "path": "M3 4h4M3 4v16h4M21 4h-4M21 4v16h-4M8 7h3v3H8zM14 7h3v3h-3zM8 14h3v3H8zM14 14h3v3h-3z"
  },
  {
    "id": "linear",
    "name": "Linear Projection",
    "description": "线性投影",
    "path": "M4 6v12M20 4v16M7 8l10-2M7 12h10M7 16l10 2"
  },
  {
    "id": "norm",
    "name": "RMSNorm",
    "description": "归一化",
    "path": "M4 6h16M7 12h10M9 18h6"
  },
  {
    "id": "embedding",
    "name": "Embedding",
    "description": "嵌入查表",
    "path": "M4 4h9v16H4zM4 9h9M4 15h9M16 12h5M19 10l2 2-2 2"
  },
  {
    "id": "attention",
    "name": "Attention",
    "description": "注意力计算",
    "path": "M4 5h5v5H4zM15 5h5v5h-5zM9 16h6v5H9zM6 10l6 6M18 10l-6 6"
  },
  {
    "id": "rope",
    "name": "RoPE",
    "description": "旋转位置编码",
    "path": "M5 8a8 8 0 0 1 14 0M19 4v4h-4M19 16a8 8 0 0 1-14 0M5 20v-4h4"
  },
  {
    "id": "compress",
    "name": "Compress",
    "description": "压缩聚合",
    "path": "M4 4l7 7M4 20l7-7M20 4l-7 7M20 20l-7-7M4 8V4h4M16 4h4v4M4 16v4h4M16 20h4v-4"
  },
  {
    "id": "expand",
    "name": "Expand",
    "description": "展开广播",
    "path": "M10 10L4 4M14 10l6-6M10 14l-6 6M14 14l6 6M4 8V4h4M16 4h4v4M4 16v4h4M16 20h4v-4"
  },
  {
    "id": "mix",
    "name": "HC Mix",
    "description": "流间混合",
    "path": "M4 6h3l10 12h3M4 18h3L17 6h3M4 12h16"
  },
  {
    "id": "gate",
    "name": "Gate / Multiply",
    "description": "门控乘法",
    "path": "M3 7h6M3 17h6M9 5v14h4a7 7 0 0 0 0-14H9M20 12h3"
  },
  {
    "id": "activation",
    "name": "SiLU",
    "description": "激活函数",
    "path": "M4 19h16M5 19V4M5 16c8 4 7-8 14-12"
  },
  {
    "id": "softmax",
    "name": "Softmax",
    "description": "归一化概率",
    "path": "M5 20v-5M12 20V5M19 20v-9M3 3h18"
  },
  {
    "id": "topk",
    "name": "Top-K",
    "description": "候选选择",
    "path": "M4 5h16M4 10h12M4 15h8M15 17l3 3 4-6"
  },
  {
    "id": "router",
    "name": "Router / MoE",
    "description": "专家路由",
    "path": "M4 12h7M11 12l5-7h4M11 12h9M11 12l5 7h4"
  },
  {
    "id": "concat",
    "name": "Concat",
    "description": "拼接",
    "path": "M3 5h6v5H3zM15 5h6v5h-6zM6 10v4h12v-4M12 14v6M8 20h8"
  },
  {
    "id": "split",
    "name": "Split",
    "description": "分支拆分",
    "path": "M12 3v7M5 20v-5l7-5 7 5v5M3 18l2 2 2-2M17 18l2 2 2-2"
  },
  {
    "id": "reshape",
    "name": "Reshape",
    "description": "形状变换",
    "path": "M4 4h10v7H4zM10 15h10v5H10zM18 5h3v7M3 14v6h4"
  },
  {
    "id": "transpose",
    "name": "Transpose",
    "description": "维度交换",
    "path": "M4 7h15M16 4l3 3-3 3M7 20V5M4 8l3-3 3 3"
  },
  {
    "id": "reduce",
    "name": "Reduce / Pool",
    "description": "规约汇聚",
    "path": "M4 4l8 8 8-8M4 10l8 8 8-8M12 18v3"
  },
  {
    "id": "cache",
    "name": "KV Read / Write",
    "description": "状态读写",
    "path": "M5 4h14v16H5zM5 8h14M9 12h6M9 16h6"
  },
  {
    "id": "conv",
    "name": "Conv / Patch",
    "description": "卷积与分块",
    "path": "M4 4h16v16H4zM4 10h16M10 4v16M14 14h6M14 14v6"
  },
  {
    "id": "exchange",
    "name": "All-to-All",
    "description": "通信交换",
    "path": "M3 8h17M16 4l4 4-4 4M21 16H4M8 12l-4 4 4 4"
  },
  {
    "id": "sample",
    "name": "Sampling",
    "description": "采样选择",
    "path": "M5 5h2M11 5h2M17 5h2M5 11h2M17 11h2M5 17h2M11 17h2M17 17h2M10 10l6 3-3 1-1 3z"
  }
];

window.PtoOpIconFor = function(label){
 const rules=[['add',/residual.*(add|merge)|add shared/i],['embedding',/embedding|lookup|engram|hash/i],['attention',/attention|sdpa/i],['topk',/top.?k|candidate|filter|sort/i],['router',/router|routed|expert|moe/i],['compress',/compress/i],['expand',/expand/i],['mix',/hc pre|mix|sinkhorn/i],['norm',/norm/i],['rope',/rope/i],['concat',/concat|merge/i],['softmax',/softmax/i],['gate',/gate|weight/i],['activation',/silu|swiglu|gelu|relu|softplus|clamp/i],['reduce',/reduce|mean|pool|sum/i],['conv',/patch|conv/i],['reshape',/unfold|pad|resize/i],['sample',/sample|sampling|draft input/i],['cache',/kv|cache|mask/i],['linear',/projection|linear|head|aligner/i]];
 const id=rules.find(([,r])=>r.test(label))?.[0]||'linear';return window.PtoOpIcons.find(i=>i.id===id);
};

/* Reusable SVG grammar. No DOM or report runtime dependency. */
(function(root){
'use strict';
const tokens=Object.freeze({font:14,gap:24,dataWidth:160,dataHeight:64,opWidth:260,opHeight:48,cell:24,role:{activation:'#B1EF6B',weight:'#BCA0F3',aggregate:'#F2C45F',gradient:'#79D4F2',optimizer:'#B0B0B0'},parallel:{DP:'#8CE580',TP:'#B58AF7',SP:'#80B7F7',CP:'#80E5D3',PP:'#E580CF',EP:'#F7B080'}});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(x,y,s,size=14,color='#E8E8E8',anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" dominant-baseline="middle">${esc(s)}</text>`;
const rect=(x,y,w,h,rx=4,stroke='#888',fill='#202020',extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" stroke="${stroke}" fill="${fill}" ${extra}/>`;
function rankBoard(x,y,w,h,fill='#393939'){
const compact=h<64,inset=compact?9:16,r=compact?3:5;
let body=`<rect class="rank-outline outline" x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill}"/>`;
for(const px of [x+inset,x+w-inset])for(const py of [y+inset,y+h-inset])body+=`<circle class="rank-pin" cx="${px}" cy="${py}" r="${r}" fill="#2b2b2b"/>`;
return body;
}
function data(o,x,y,opts={}){
 const expanded=opts.expanded,shape=o.shape||[2,4],rows=shape.length===1?1:shape[0],cols=shape.length===1?shape[0]:shape[1],w=expanded?cols*tokens.cell:tokens.dataWidth,h=expanded?rows*tokens.cell:tokens.dataHeight,color=tokens.role[o.role]||'#B0B0B0';
 let body=expanded?'':rect(x,y,w,h,6,'none','#2d2d2d');
 if(expanded){for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){body+=rect(x+c*24+2,y+r*24+2,20,20,1,'none',color,'fill-opacity=".18" data-element="true"');if(o.values)body+=text(x+c*24+12,y+r*24+12,o.values[r*cols+c],11,color,'middle')}body+=text(x,y-14,`${o.label} · [${shape}]`,14)}
 else {
  for(let i=0;i<4;i++)body+=rect(x+8,y+8+i*12,10,10,0,'none',color,`fill-opacity="${[1,.8,.6,.4][i]}"`);
  body+=text(x+27,y+22,o.label,16,'#fff')+text(x+27,y+46,`${shape.join(' × ')}  ${o.dtype||'FP16'}`,12,'#ccc');
 }
 if(opts.parallel&&opts.parallel!=='none'){let pc=tokens.parallel[opts.parallel];body+=`<path data-decoration="distribution" d="M${x},${y+h+8}v6h${w}v-6" stroke="${pc}" fill="none"/>`+text(x+w/2,y+h+30,`${opts.parallel} · ${opts.placement||'分片'}`,12,pc,'middle')}
 return `<g data-object="${esc(o.id)}" data-kind="${o.kind||'value'}" data-role="${esc(o.role||'activation')}" data-representation="${expanded?'expanded':'collapsed'}">${body}</g>`;
}
// Memory grid is a surface texture, not an element or capacity scale.
function memory(id,label,detail,x,y,w=300,h=106,physical=false){
 let b=rect(x,y,w,h,12,'none',physical?'#087CFA':'#2d2d2d');
 const cols=17,rows=5,gap=3,pad=9,cw=(w-pad*2-gap*(cols-1))/cols,ch=(h-pad*2-gap*(rows-1))/rows;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)b+=rect(x+pad+c*(cw+gap),y+pad+r*(ch+gap),cw,ch,1.5,physical?'#B3D7FF':'#aaa','#000','fill-opacity=".10" style="stroke-width:.65;stroke-opacity:.30"');
 b+=text(x+24,y+h*.36,label,Math.min(32,w*.09),'#fff')+text(x+24,y+h*.74,detail,Math.min(18,w*.047),'#eee');
 return `<g data-object="${esc(id)}" data-kind="${physical?'storage':'memref'}">${b}</g>`;
}
function node(kind,id,label,x,y){let w=180,h=64,b='';
 if(kind==='op'||kind==='communication'){w=tokens.opWidth;h=tokens.opHeight;b=rect(x,y,w,h,24,'#858585','#505050',kind==='communication'?'stroke-dasharray="5 4"':'')+`<g font-weight="650">${text(x+w/2,y+24,label,18,'#fff','middle')}</g>`}
 else if(kind==='add'||kind==='multiply'){w=h=48;const cx=x+24,cy=y+24;b=`<circle cx="${cx}" cy="${cy}" r="24" stroke="#ddd" fill="#111" style="stroke-width:1.5"/><path d="${kind==='add'?`M${cx-8} ${cy}H${cx+8} M${cx} ${cy-8}V${cy+8}`:`M${cx-6} ${cy-6}L${cx+6} ${cy+6} M${cx-6} ${cy+6}L${cx+6} ${cy-6}`}" stroke="#eee" fill="none" style="stroke-width:2" stroke-linecap="round"/>`}
 else if(kind==='memref'||kind==='storage'){return memory(id,label,kind==='memref'?'MemRef':'内存分配',x,y,w,h,kind==='storage')}
 else if(kind==='instruction'||kind==='task'){
 w=260;h=60;const green='#9EF04B';
 b=rect(x,y,w,h,0,'none',green)+rect(x+10,y+12,36,36,3,'none','#080b05');
 const icon=kind==='instruction'?'M9 9 L16 17 L9 25 M20 25 H29':'M9 10 H27 M9 18 H20 M9 26 H16 M23 22 L28 26 L23 30';
 b+=`<path data-icon="${kind}" transform="translate(${x+10} ${y+12})" d="${icon}" fill="none" stroke="${green}" style="stroke-width:2.6"/>`;
 b+=`<g font-weight="650">${text(x+62,y+30,label,20,'#080b05')}</g>`;
 }
 else if(kind==='rank'){b=rankBoard(x,y,w,h)+text(x+24,y+27,label,14)}
 else if(kind==='pass'){h=32;b=rect(x,y,w,h,0,'#aaa')+text(x+w/2,y+16,label,14,'#eee','middle')}
 else {const purple=['kernel','task','function','loop'].includes(kind),color=purple?'#9B91FF':'#999';b=rect(x,y,w,h,kind==='task'?8:2,color,'#202020',kind==='loop'?'stroke-dasharray="5 4"':'')+text(x+12,y+17,kind.toUpperCase(),10,color)+text(x+12,y+43,label);if(['kernel','function','rank','storage'].includes(kind))b+=`<path d="M${x},${y+28}h${w}" stroke="${color}"/>`;if(kind==='loop')b+=`<path d="M${x},${y}v${h}" stroke="${color}" stroke-width="3"/>`}
 return `<g data-object="${esc(id)}" data-kind="${kind}">${b}</g>`;
}
function edge(x1,y1,x2,y2,kind='data',label=''){let binding=kind==='binding',mapping=kind==='mapping',dash=kind==='call'?'8 5':mapping?'2 5':'';return `<path data-relation="${kind}" d="M${x1} ${y1} H${(x1+x2)/2} V${y2} H${x2}" fill="none" stroke="#aaa" ${dash?`stroke-dasharray="${dash}"`:''} marker-end="url(#${binding?'bind':mapping?'map':'arrow'})"/>`+(label?text((x1+x2)/2,(y1+y2)/2-12,label,12,'#aaa','middle'):'')}
function wrap(body,w=900,h=340){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="对象与关系示例"><style>text{font-family:Inter,'PingFang SC',system-ui,sans-serif}path,rect,circle{stroke-width:1.5}</style><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9" stroke="#aaa" fill="none"/></marker><marker id="bind" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7"><circle cx="5" cy="5" r="3" stroke="#aaa" fill="#202020"/></marker><marker id="map" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8"><path d="M1 5L5 1L9 5L5 9Z" stroke="#aaa" fill="#202020"/></marker></defs>${body}</svg>`}
function render(id,o={}){let b='',ex=!!o.expanded;const v=(id,label,role,shape,values)=>({id,label,role,shape,values});
 if(id==='pattern-compute'){
 // Expanded dimensions: X 2x4, W 4x3, Y 2x3. Fixed cell pitch throughout.
 b=edge(ex?136:200,190,350,190)+edge(480,ex?126:94,480,166,'data','参数输入')+edge(610,190,680,190)+data(v('X','X','activation',[2,4]),40,166,{expanded:ex})+data(v('W','W','weight',[4,3]),ex?444:400,30,{expanded:ex})+node('op','matmul','MatMul',350,166)+data(v('Y','Y','activation',[2,3]),680,166,{expanded:ex})+text(40,290,'X [2,4] × W [4,3] → Y [2,3]；示例尺寸，格子不编码数值。',14);
 }else if(id==='pattern-distribution'){
 const mode=o.mode||'shard',lab={shard:'分片',replica:'复制',partial:'部分结果'}[mode];
 b=text(40,26,mode==='shard'?'按列切分 W：局部 [4,2]，全局 [4,4]':mode==='replica'?'每个 Rank 保存完整 W [4,4] 的副本':'沿 K 维切分 MatMul：Y = Y₀ + Y₁，各部分结果均为 [2,4]',16);
 for(let i=0;i<2;i++){let x=40+i*440;b+=rankBoard(x,55,390,235)+text(x+24,82,'Rank '+i,14)+data(v(mode==='replica'?'W':mode==='partial'?'Y'+i:'W'+i,mode==='replica'?'W · 副本 '+i:mode==='partial'?'Y'+i+' · 待求和':'W'+i+' · 列 '+(i===0?'[0,2)':'[2,4)'),mode==='partial'?'activation':'weight',mode==='shard'?[4,2]:mode==='partial'?[2,4]:[4,4]),x+45,110,{expanded:ex,parallel:'TP',placement:lab})}b+=text(40,320,mode==='partial'?'部分结果不是输出的互斥分片；求和归约后得到完整输出。':'角色色位于数据内部；TP 标记位于对象外侧。Rank 表示进程身份。',13);
 }else if(id==='pattern-storage'){
 b=data(v('V','V','activation',[4,4]),40,70,{expanded:ex})+data({...v('view','V 的视图','activation',[2,4]),kind:'view'},40,225,{expanded:ex})+node('memref','M0','M0 · offset 0 B',345,70)+node('memref','M1','M1 · offset 16 B',345,225)+node('storage','B0','B0 · 32 B',660,135)+edge(ex?136:200,102,345,102,'binding')+edge(ex?136:200,257,345,257,'binding')+edge(525,102,660,167,'binding')+edge(525,257,660,183,'binding')+text(660,240,'FP16 · 连续行布局',13)+text(660,265,'视图引用 [16,32) B',13)+text(40,335,'同一底层分配 B0；视图改变索引范围，不创建新的数据副本。示例偏移以字节计。',13);
 return wrap(b,900,375);
 }else if(id==='system-value') b=data(v(o.vector?'vector-0':'value-0',o.vector?'v':'X',o.role||'activation',o.vector?[6]:[2,4],o.vector?[1,2,3,4,5,6]:undefined),80,65,{...o,expanded:ex});
 else if(id.startsWith('relation-')) b=edge(60,100,330,100,id.slice(9))+text(195,155,{data:'生产者 → 消费者',call:'调用方 → 被调用函数',binding:'值 / 视图 — 存储引用',mapping:'跨阶段对应（需要证据）'}[id.slice(9)],13,'#aaa','middle');
 else b=node(id.replace('system-',''),id,'示例 '+id.replace('system-',''),85,75);
 return wrap(b,id.startsWith('pattern-')?900:420,id.startsWith('pattern-')?350:280);
}
const api={tokens,rankBoard,data,memory,node,edge,wrap,render};if(typeof module!=='undefined')module.exports=api;root.VisualSystem=api;
})(typeof globalThis!=='undefined'?globalThis:this);


const C={i:'#B1EF6B',w:'#BCA0F3',g:'#79D4F2',a:'#F2C45F',n:'#d6d6d6'};
let registry={},selected='',shown=0,page=1,phase=0;const pages=[{}, {title:'从模型架构到完整分布式训练计算图'}];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function text(x,y,t,cls='text',anchor='start',fill=''){return `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}"${fill?` style="fill:${fill}"`:''}>${esc(t)}</text>`}
function register(id,title,body){registry[id]={title,body};return id}
function hit(id,svg,title,body){if(title)register(id,title,body);return `<g data-layer="${/^full-(w-|dw-|cache-|regather-)/.test(id)?'wgrad':/^full-b-|^full-input-dY|^full-value-b-|^full-param-b-/.test(id)?'backward':'forward'}" class="hit${selected===id?' selected':''}" role="button" tabindex="0" data-node="${esc(id)}" aria-label="${esc(title||registry[id]?.title||id)}">${svg}</g>`}
function opCategory(name){
 if(/^(QKV|PROJ|FC[12]|DGRAD|WGRAD)/i.test(name))return 'linear';
 if(/MHA|Attention/i.test(name))return 'attention';
 if(/GeLU/i.test(name))return 'activation';
 if(/Softmax/i.test(name))return 'softmax';
 if(/QK|^PV$|^d[P VQK]\s*=/i.test(name))return 'matmul';
 if(/Scale/.test(name))return 'cache';
 if(/^dQKV/.test(name))return 'concat';
 return null;
}
function op(x,y,name,id,body,w=260){
 const category=opCategory(name);
 if(!category)return hit(id,`<g data-kind="view"><rect class="outline" x="${x}" y="${y}" width="${w}" height="48" rx="4" fill="#242424"/>${text(x+w/2,y+30,name,'small','middle')}</g>`,name,body);
 const icon=window.PtoOpIcons.find(i=>i.id===category);
 const scale=Math.min(w/360,48/64),nw=360*scale,nh=64*scale;
 let node=opNode({...icon,name},0,0).replace('<rect ','<rect class="outline" ');
 return hit(id,`<g data-kind="op" data-category="${category}" data-renderer="legend-library/opNode" transform="translate(${x+(w-nw)/2} ${y+(48-nh)/2}) scale(${scale})">${node}</g>`,name,body);
}
function comm(x,y,name,id,body,w=140){
 let node=opNode({...window.PtoOpIcons.find(i=>i.id=== (/^RS/.test(name)?'reduce':'expand')),name},0,0).replace('<rect ','<rect class="outline" ').replace('fill="#4f4f4f"','fill="#292929" stroke="#aaa" stroke-width="2" stroke-dasharray="6 5"');
 const scale=Math.min(w/360,48/64);
 return hit(id,`<g data-kind="communication" data-category="${/^RS/.test(name)?'reduce':'expand'}" transform="translate(${x+(w-360*scale)/2} ${y+(48-64*scale)/2}) scale(${scale})">${node}</g>`,name,body);
}
function path(d,col='n',dash=false,arrow=true){return `<path class="wire" d="${d}" stroke="${C[col]||col}"${dash?' stroke-dasharray="6 5"':''}${arrow?` marker-end="url(#m-${col in C?col:'n'})"`:''}/>`}
function line(x1,y1,x2,y2,c='n',dash=false){return path(`M${x1} ${y1}L${x2} ${y2}`,c,dash)}
function frame(x,y,w,h,label){return `<rect class="panel-frame" x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>${text(x+18,y+27,label,'small')}`}
function tensor(x,y,rows,cols,role,label,shape,id,body,cell=10){const gap=3,c=C[role],w=cols*(cell+gap)+9,h=rows*(cell+gap)+9;let s=`<rect class="outline" x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#111" stroke="${c}" stroke-opacity=".7"/>`;for(let r=0;r<rows;r++)for(let k=0;k<cols;k++)s+=`<rect x="${x+6+k*(cell+gap)}" y="${y+6+r*(cell+gap)}" width="${cell}" height="${cell}" fill="${c}" opacity="${.23+((r*3+k*5)%7)*.075}"/>`;s+=text(x+w/2,y+h+23,label,'text','middle',c)+text(x+w/2,y+h+43,shape,'small mono','middle');return hit(id,s,label+' '+shape,body)}
function rankBox(x,y,label,id,body,extra=''){let s=GLYPHS.rank.replace(/R00/g,label);return hit(id,`<g transform="translate(${x-70} ${y-30})">${s}</g>${extra}`,label,body)}
function svg(body,w=900,h=650){const pre='figure-'+page+'-';const content=body.replace(/url\(#m-([^)]+)\)/g,(_,k)=>'url(#'+pre+'m-'+k+')').replace(/url\(#map\)/g,'url(#'+pre+'map)');return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(pages[page].title||'模型计算与集群通信主题图')}"><defs>${Object.entries(C).map(([k,c])=>`<marker id="${pre}m-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="${c}" stroke-width="1.4"/></marker>`).join('')}<marker id="${pre}map" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 6L6 1L11 6L6 11Z" fill="#131313" stroke="#aaa"/></marker></defs><g data-viewport="true">${content}</g></svg>`}
function mapline(d){return `<path d="${d}" fill="none" stroke="#888" stroke-width="1.3" stroke-dasharray="2 5" marker-end="url(#map)"/>`}
/* Full forward/backward graph, with each relation retained in a single canvas. */
const B=C.i;
function group(key,body){return body;}
function matrix(x,y,w=190,h=54,key='x',color=B,rows=3,cols=12,seed=0){const pitch=Math.min(w/cols,h/rows),gw=pitch*cols,gh=pitch*rows,sx=x+(w-gw)/2,sy=y+(h-gh)/2,cell=pitch-2;let a=`<rect x="${sx-3}" y="${sy-3}" width="${gw+6}" height="${gh+6}" fill="#111" stroke="${color}" stroke-opacity=".5"/>`;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const o=.22+((r*17+c*7+seed*3)%11)/15;a+=`<rect class="grid-cell" x="${sx+c*pitch}" y="${sy+r*pitch}" width="${cell}" height="${cell}" fill="${color}" opacity="${o}"/>`}return group(key,a)}
/* Approved matrix geometry: square cells, role colors, stable data identity. */
function valueGeometry(cx,y,shape){const [rows,cols]=shape,pitch=Math.min(72/cols,72/rows),gw=pitch*cols,gh=pitch*rows;return {cx,cy:y+36,x:cx-gw/2,y:y+(72-gh)/2,w:gw,h:gh,pitch,cell:pitch-2,top:y+(72-gh)/2-3,bottom:y+(72+gh)/2+3,left:cx-gw/2-3,right:cx+gw/2+3};}
function matrixValue(cx,y,label,shape,role,id,objectId,body,labelSide='right'){
 const g=valueGeometry(cx,y,shape),color=C[role];let b=`<g data-object="${esc(objectId)}" data-role="${role==='w'?'weight':role==='g'?'gradient':role==='a'?'aggregate':'activation'}" data-representation="matrix">`+matrix(cx-36,y,72,72,id,color,shape[0],shape[1],0).replace('<rect ','<rect class="outline" ');
 const sh='['+shape.join(',')+']';if(labelSide==='bottom')b+=text(cx,y+94,label,'small','middle',color)+text(cx,y+114,sh,'small mono','middle');else{const lx=cx+(labelSide==='left'?-52:52),an=labelSide==='left'?'end':'start';b+=text(lx,y+28,label,'small',an,color)+text(lx,y+52,sh,'small mono',an);}
 b+='</g>';const rendered=hit(id,b,label+' '+sh,body);Object.assign(registry[id],{objectId,shape,role});return rendered;
}
function cachedCollection(x,y,id){const objectId='attention-state';let b=`<g data-object="${objectId}" data-role="activation" data-representation="collapsed"><rect class="outline" x="${x}" y="${y}" width="160" height="64" rx="4" stroke="#888" fill="#202020"/><rect x="${x+10}" y="${y+12}" width="4" height="40" rx="1" stroke="none" fill="${C.i}"/>${text(x+24,y+24,'Attention 状态','small','start','#E8E8E8')}${text(x+24,y+46,'Qᵣ / Kᵣ / Vᵣ / P','tiny','start')}</g>`;const r=hit(id,b,'Attention 前向状态','折叠的数据集合图元：包含 Qᵣ、Kᵣ、Vᵣ 各 [8,2] 与 P[8,8]。MHA grad 使用这些前向状态；实现可选择保存或重计算。');registry[id].objectId=objectId;return r;}
const LINEAR_WEIGHTS={qkv:{name:'Wqkvᵣ',shape:[8,6]},proj:{name:'Wprojᵣ',shape:[2,8]},fc1:{name:'W1ᵣ',shape:[8,4]},fc2:{name:'W2ᵣ',shape:[4,8]}};
function paramRef(cx,y,key,id,side='bottom'){const p=LINEAR_WEIGHTS[key];return matrixValue(cx,y,p.name,p.shape,'w',id,'weight-'+key,'本 Rank 的同一份参数 '+p.name+'，shape ['+p.shape+']。前向线性计算读取 W；DGRAD 读取其转置。两处图形是同一对象的不同引用，选中时联动。',side);}
function parameterWire(x1,y,x2,transpose=false){return path(`M${x1} ${y}H${x2}`,'w',true)+ (transpose?text((x1+x2)/2,y-30,'Wᵀ','tiny','middle',C.w):'');}
