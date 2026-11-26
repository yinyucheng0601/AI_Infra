(function(){'use strict';let CTX,H,T,F,Q,current=8,parameterState;const TRAINING_MODEL={};
function deriveTrainingConfig(){const c=CTX.config;return {stage:8,experts:c.experts,moe:true,ep:c.ep,tp:c.tp,sp:false,seq:T,detailed:true,training:true,wgrad:true,recollect:false,deployed:true,worldSize:RankAtlasModel.world(c),dp:RankAtlasModel.dpReplica(c),expertDP:RankAtlasModel.dpReplica(c)/c.ep};}
function moeRoute(t){const e=TrainingModel.route(CTX.config,CTX.rank,CTX.layer,CTX.mb),s=e.ids.indexOf(CTX.rank),token=Math.min(t,e.assignments[s].length-1);return {chosen:e.assignments[s][token],alpha:e.routingWeights[s][token],scores:[]};}
function moeStatistics(count){return {loads:Array(count).fill(0)};}
// Layout adaptation only. Card geometry comes from the approved expert grid.
function layoutTrainingExperts(count,ep){
 const source=layoutExpertGrid(count,ep);if(!source.compact)return source;
 const perGroup=count/ep,columns=Math.min(ep===1?16:8,perGroup);
 const groupColumns=Math.min(ep,2**Math.max(0,Math.ceil(Math.log2(12/columns))));
 const width=source.cards[0].width,height=source.cards[0].height,stride=width+36;
 const groupWidth=(columns-1)*stride+width,groupHeight=Math.ceil(perGroup/columns)*100+52;
 const totalWidth=groupColumns*groupWidth+(groupColumns-1)*64;
 const cards=source.cards.map(card=>{const local=card.id%perGroup;return {...card,
  x:-totalWidth/2+(card.owner%groupColumns)*(groupWidth+64)+width/2+(local%columns)*stride,
  y:220+Math.floor(card.owner/groupColumns)*groupHeight+Math.floor(local/columns)*100};});
 const halfWidth=totalWidth/2+52,combineY=Math.max(...cards.map(c=>c.y+c.height))+80;
 return {...source,cards,halfWidth,combineY,height:combineY+80};
}


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
function hit(id,svg,title,body){if(title)register(id,title,body);return `<g data-layer="${/^full-(w-|dw-|cache-|regather-)/.test(id)?'wgrad':/^full-b-|^full-input-dY|^full-value-b-|^full-param-b-/.test(id)?'backward':'forward'}" class="hit cg-hit${selected===id?' selected':''}" role="button" tabindex="0" data-node="${esc(id)}" data-cg-node="${esc(id)}" aria-label="${esc(title||registry[id]?.title||id)}">${svg}</g>`}
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
function matrix(x,y,w=190,h=54,key='x',color=B,rows=3,cols=12,seed=0){const extent=Math.max(rows,cols);rows=Math.max(1,Math.round(rows/extent*8));cols=Math.max(1,Math.round(cols/extent*8));const pitch=Math.min(w/cols,h/rows),gw=pitch*cols,gh=pitch*rows,sx=x+(w-gw)/2,sy=y+(h-gh)/2,cell=pitch-2;let a=`<rect x="${sx-3}" y="${sy-3}" width="${gw+6}" height="${gh+6}" fill="#111" stroke="${color}" stroke-opacity=".5"/>`;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const o=.22+((r*17+c*7+seed*3)%11)/15;a+=`<rect class="grid-cell" x="${sx+c*pitch}" y="${sy+r*pitch}" width="${cell}" height="${cell}" fill="${color}" opacity="${o}"/>`}return group(key,a)}
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

function buildTrainingRows({detailed,tp,sp,seq,moe}){
 const rows=[],byId={};
 function add(id,kind,name,shape,extra={}){const r={id,kind,name,shape,...extra};rows.push(r);byId[id]=r;return r;}
 const val=(id,name,shape,extra)=>add(id,'value',name,shape,extra);
 const opR=(id,name,category,extra)=>add(id,'op',name,null,{category,...extra});
 val('model-input-H0','H₀',[seq,H]);
 opR('module-norm1','Norm 1','norm');val('full-input-X',sp?'Xᵣ':'X',[seq,H]);
 if(!detailed)opR('module-attn','Attention','attention');
 else{
 if(sp){opR('full-f-agq','AG(Xᵣ)','expand',{communication:true});val('full-value-f-0','X',[T,H]);}
 opR('full-f-qkv','QKV','linear',{linear:'qkv'});val('full-value-f-1','QKVᵣ',[T,Q/tp]);
 opR('full-f-mha','MHA','attention');val('full-value-f-2','Oᵣ',[T,H/tp]);
 opR('full-f-proj','PROJ','linear',{linear:'proj'});
 if(tp>1){val('full-value-f-3','Zprojᵣ',[T,H]);opR('full-f-rsp',sp?'RS(R_Attn)':'AR(R_Attn)','reduce',{communication:true});}
 }
 val('model-attn-result',sp?'R_Attnᵣ':'R_Attn',[seq,H]);
 add('module-add1','add','Residual Add 1');val('model-boundary-Y',sp?'Hₐᵣ':'Hₐ',[seq,H]);
 opR('module-norm2','Norm 2','norm');val('full-value-f-4',sp?'Aᵣ':'A',[seq,H]);
 if(!detailed)opR('module-mlp','FFN','linear');
 else{
 if(sp){opR('full-f-agf','AG(Aᵣ)','expand',{communication:true});val('full-value-f-5','A',[T,H]);}
 if(moe)add('module-moe','moe','MoE');else{opR('full-f-fc1','FC1','linear',{linear:'fc1'});val('full-value-f-6','Uᵣ',[T,F/tp]);
 opR('full-f-gelu','GeLU','activation');val('full-value-f-7','Vᵣ',[T,F/tp]);
 opR('full-f-fc2','FC2','linear',{linear:'fc2'});
 }
 if(tp>1){val('full-value-f-8','Z2ᵣ',[T,H]);opR('full-f-rsf',sp?'RS(Y)':'AR(Y)','reduce',{communication:true});}
 }
 val('full-value-f-9',sp?'Yᵣ':'Y',[seq,H]);add('module-add2','add','Residual Add 2');val('model-output',sp?'H₁ᵣ':'H₁',[seq,H]);
 return {rows,byId};
}
function trainingGraphSnapshot(config,rows,positions,edges,registry){
 return {schema:'training-graph.v1',model:{...TRAINING_MODEL,experts:config.experts},config,
 nodes:Object.entries(registry).map(([id,n])=>({id,label:n.title,description:n.body,kind:n.role?'tensor':(n.expert!==undefined||rows.find(r=>r.id===id)?.kind==='moe')?'module':positions[id]?'operation':'module',shape:n.shape||null,role:n.role||null,objectId:n.objectId||id,sources:[...(n.docs||[])],layout:positions[id]||null})),
 groups:config.stage===8&&config.moe?Array.from({length:config.dp},(_,row)=>{const ep=row%config.ep,replica=Math.floor(row/config.ep);return {id:'expert-group-'+replica+'-'+ep,parallelism:'EP',replica,ranks:Array.from({length:config.tp},(_,tp)=>row*config.tp+tp),experts:Array.from({length:config.experts/config.ep},(_,i)=>ep*config.experts/config.ep+i)};}):[],
 edges:edges.map(e=>({...e})),sequence:rows.map(r=>r.id)};
}

let graphModel=null;
function trainingGraph(){
 const config=deriveTrainingConfig(current,parameterState);
 const {moe,ep,experts,detailed,training,wgrad,tp,sp,seq,recollect}=config;
 const expertLayout=layoutTrainingExperts(experts,ep),stats=moeStatistics(experts);
 const cf=358,cw=moe?cf+expertLayout.halfWidth+320:1030,cb=moe?cf+expertLayout.halfWidth+1020:wgrad?1702:1030,ow=256,oh=ow*64/360;
 const {rows,byId}=buildTrainingRows(config),positions={},semanticEdges=[],sides={forward:cf,backward:cb,wgrad:cw};
 const cursorY=layoutTrainingRows(rows,{expertLayout});
 const color=C.i;let links='',nodes='',notes='';
 function remember(id,name,body,docs,extra={}){Object.assign(registry[id],{title:name,body,docs,audited:true,...extra});}
 function edge(id,a,b,col='i',dash=false,via=null){semanticEdges.push({id,from:a.id,to:b.id,role:col,relation:'data-dependency',sourcePort:{x:a.x,y:a.y},targetPort:{x:b.x,y:b.y}});const d=via||`M${a.x} ${a.y}V${b.y}`;return `<path class="wire" data-edge="${id}" d="${d}" stroke="${C[col]}" ${dash?'stroke-dasharray="6 5"':''} marker-end="url(#m-${col})"/>`;}
 function port(id,x,y){return {id,x,y};}
 function glyph(id,x,y,name,category,body,docs,communication=false){const icon=window.PtoOpIcons.find(i=>i.id===category);if(!icon)throw Error('Unknown op category '+category);let g=opNode({...icon,name},0,0).replace('<rect ','<rect class="outline" ');if(communication)g=g.replace('fill="#4f4f4f"','fill="#292929" stroke="#aaa" stroke-width="2" stroke-dasharray="7 6"');const s=hit(id,`<g data-kind="${communication?'communication':'op'}" data-category="${category}" transform="translate(${x-128} ${y}) scale(${ow/360})">${g}</g>`,name,body);remember(id,name,body,docs);positions[id]={x:x-128,y,width:ow,height:oh};return s;}
 function matrixNode(id,cx,top,name,shape,role,body,docs,objectId=id){const g=valueGeometry(cx,top-36+Math.max(42,72*shape[0]/Math.max(...shape))/2,shape);const y=top+(Math.max(42,72*shape[0]/Math.max(...shape))-72)/2;const s=matrixValue(cx,y,name,shape,role,id,objectId,body,'right');remember(id,name+' ['+shape+']',body,docs,{shape,role,objectId});positions[id]={x:g.left,y:g.top,width:g.right-g.left,height:g.bottom-g.top};return s;}
 function addNode(id,x,cy,body,role='i'){const icon=window.PtoOpIcons.find(i=>i.id==='add'),s=hit(id,`<g data-kind="op" transform="translate(${x-126} ${cy-22.4}) scale(.7)">${opNode(icon,0,0)}</g>`,role==='i'?'Residual Add':'梯度相加',body);remember(id,role==='i'?'Residual Add':'梯度相加',body,['model','grad']);positions[id]={x:x-22,y:cy-22,width:44,height:44};return s;}

// Runs inside the original trainingGraph renderer. Keep its Router/Dispatch/
// full expert grid/Combine geometry; bind ownership to the host's ETP1 model.
function drawMoe(r){
 const ys=r.y,t=parameterState.token,{chosen,alpha}=moeRoute(t,experts),source=CTX.rank,conf=CTX.config;
 nodes+=glyph('moe-router',cf,ys,`Router · Top-${conf.topk}`,'router','路由系数来自当前来源 token 的 Top-K 路径。',['moe']);
 nodes+=matrixNode('moe-router-weight',cf+240,ys-10,'Wr',[H,experts],'w',`Router 参数 [${H}, ${experts}]。`,['moe']);
 links+=edge('moe-wr-router',port('moe-router-weight',cf+198,ys+oh/2),port('moe-router',cf+128,ys+oh/2),'w',true,`M${cf+198} ${ys+oh/2}H${cf+128}`);
 nodes+=glyph('moe-dispatch',cf,ys+95,ep>1?'Dispatch · All-to-All':'Dispatch · 本地分组','exchange','按专家归属分发输入激活；CP 与 TP lane 保持不变。',['moe'],ep>1);
 links+=edge('moe-router-dispatch',port('moe-router',cf,ys+oh),port('moe-dispatch',cf,ys+95));
 for(let owner=0;owner<ep;owner++){
  const cards=expertLayout.cards.filter(c=>c.owner===owner),left=cf+Math.min(...cards.map(c=>c.x-c.width/2))-10,right=cf+Math.max(...cards.map(c=>c.x+c.width/2))+10,top=ys+Math.min(...cards.map(c=>c.y))-60,bottom=ys+Math.max(...cards.map(c=>c.y+c.height));
  const target=window.TrainingModel.representative(conf,source,owner*experts/ep);
  notes+=`<rect class="module-frame" x="${left}" y="${top}" width="${right-left}" height="${bottom-top}" rx="12"/>`+text(left+14,top+20,`EP ${owner} · Rank ${target} · ETP1`,'small');
 }
 for(const card of expertLayout.cards){
  const e=card.id,x=cf+card.x,y=ys+card.y,active=chosen.includes(e),target=window.TrainingModel.representative(conf,source,e),id='moe-e'+e,width=expertLayout.compact?card.width:72,height=width*91/71;
  const replicas=window.TrainingModel.owners(conf,source,e),desc=`E${e} · Gate/Up 各 [${H},${F}]，Down [${F},${H}]；ETP1；参数副本 ${replicas.length} 个。`;
  nodes+=`<g class="compact-expert ${active?'is-route':'off-route'}" data-expert="${e}">`+hit(id,expertGlyph(e,x,y,width),`Expert ${e}`,desc)+text(x,y+height+20,`R${target}`,'small','middle')+'</g>';
  remember(id,`Expert ${e}`,desc,['moe'],{expert:e});positions[id]={x:x-width/2,y,width,height};
  if(active){
   links+=edge('moe-dispatch-'+e,port('moe-dispatch',cf,ys+95+oh),port(id,x,y),'i',target!==source,`M${cf} ${ys+95+oh}H${cf-expertLayout.halfWidth+40}V${y-12}H${x}V${y}`);
   links+=edge('moe-return-'+e,port(id,x,y+height),port('moe-combine',cf,ys+expertLayout.combineY),'i',target!==source,`M${x} ${y+height}V${y+height+5}H${x+width/2+10}V${y+height+35}H${cf+expertLayout.halfWidth-40}V${ys+expertLayout.combineY-20}H${cf}V${ys+expertLayout.combineY}`);
  }
 }
 nodes+=glyph('moe-combine',cf,ys+expertLayout.combineY,ep>1?'返回 All-to-All · 加权合并':'按 token 加权合并','mix','按原 token 索引恢复顺序，按路由系数合并专家贡献。',['moe'],ep>1);
 registry['module-moe']={title:'MoE FFN',body:`${experts} experts · Top-${conf.topk} · ETP1`,docs:['moe'],audited:true};positions['module-moe']={x:cf-expertLayout.halfWidth,y:ys,width:expertLayout.halfWidth*2,height:expertLayout.height};
}
 const roleBodies={
 'model-input-H0':'H₀ 是当前 Block 的输入。SP 开启时仅持有本 Rank 的 token 行。',
 'model-boundary-Y':'Hₐ = H₀ + R_Attn；同一张量同时进入 Norm₂ 和第二条恒等残差旁路。',
 'model-output':'H₁ = Hₐ + Y，是当前 Block 的输出。输入、分支结果与残差相加保持相同隐藏维。',
 'model-attn-result':'R_Attn 是 Attention 输出投影经 TP 归约后的分支输出，与 H₀ 逐元素相加。',
 'full-value-f-9':'Y 是 FFN 分支结果，经第二次残差相加形成 H₁。',
 'full-input-X':'X = Norm₁(H₀)，供 QKV 投影使用。SP 开启时，先保存本地 token 分片 Xᵣ，再通过 AG 取得完整 X。',
 'full-value-f-4':moe?'A = Norm₂(Hₐ)，供 Router 与入选专家共同读取；SP 开启时先收集 token 行。':'A = Norm₂(Hₐ)，供 FC1 使用。SP 开启时本 Rank 持有 Aᵣ，计算前经 AG 恢复 A。',
 'full-value-f-0':`X 由 TP 组内 ${tp} 份 Xᵣ 沿 token 维拼接得到，供 QKV 使用。`,
 'full-value-f-1':`QKVᵣ = X Wqkvᵣ，合并 ${4/tp} 个注意力头的 Q、K、V；每头宽度为2。`,
 'full-value-f-2':`Oᵣ 由本 Rank 的 ${4/tp} 个头执行 P·V 后拼接得到，供 PROJ 使用。`,
 'full-value-f-3':'Zprojᵣ = Oᵣ Wprojᵣ，是本 Rank 对 Attention 分支结果的数值贡献；不能当作完整 R_Attn。',
 'full-value-f-5':`A 由 ${tp} 份 Aᵣ 沿 token 维拼接得到，供 FC1 使用。`,
 'full-value-f-6':'Uᵣ = A W1ᵣ，是 FC1 的输出，也是 GELU 求导所需的前向输入。',
 'full-value-f-7':'Vᵣ = GELU(Uᵣ)，供 FC2 前向及 FC2_WGRAD 读取。',
 'full-value-f-8':'Z2ᵣ = Vᵣ W2ᵣ，是本 Rank 对 FFN 分支结果的贡献，随后经 TP 求和。'};
 for(let i=0;i<rows.length;i++){
 const r=rows[i];
 if(r.kind==='moe'){drawMoe(r);}
 else if(r.kind==='value')nodes+=matrixNode(r.id,cf,r.y,r.name,r.shape,'i',(roleBodies[r.id]||'前向计算产生的激活；形状由相邻矩阵乘法和 TP 切分决定。')+' 形状 ['+r.shape+']。',['model','linear','tp']);
 else if(r.kind==='add')nodes+=addNode(r.id,cf,r.cy,r.id==='module-add1'?'Hₐ = H₀ + R_Attn。反向时，上游梯度分别传给两条输入路径。':'H₁ = Hₐ + Y。反向时 dH₁ 同时传给 FFN 分支和恒等旁路。');
 else{
 let body=r.id==='module-norm1'?'LayerNorm₁ 沿每个 token 的隐藏维归一化 H₀，得到 X。':r.id==='module-norm2'?'LayerNorm₂ 归一化 Hₐ，得到 A。':r.id==='module-attn'?'QKV 投影生成查询、键和值；各头执行因果 Attention，合并后作输出投影。':r.id==='module-mlp'?'FFN = Linear(8→16) → GELU → Linear(16→8)，每个 token 使用同一组参数。':r.communication?(r.category==='expand'?`AG 沿 token 维拼接 ${tp} 份 [${seq},8] 激活，所有 Rank 得到 [T,H]。`:sp?`RS(sum) 合并 ${tp} 个 Rank 的 [T,H] 部分和，再沿 token 维分发 [${seq},8]。`:`AllReduce(sum) 合并 ${tp} 个 Rank 的 [T,H] 部分和，每 Rank 得到同一完整结果。`):r.name==='MHA'?`本 Rank 有 ${4/tp} 个头，每头宽度2。P=softmax(mask(QKᵀ/√2))；O=PV。因果 Mask 排除未来 token，无 Attention dropout。`:r.name==='GeLU'?'V = GELU(U) = U Φ(U)，不改变形状。':`${r.name} 是线性变换，前向 Y=XW。权重按输入×输出维记，与 PyTorch weight 的存储方向相反。`;
 nodes+=glyph(r.id,cf,r.y,r.name,r.category,body,r.communication?['nccl','tp']:r.category==='norm'?['model']:r.category==='attention'?['attention']:r.category==='activation'?['gelu']:['linear','tp'],!!r.communication);
 }
 if(i){const prev=rows[i-1];links+=edge('f-'+prev.id+'-'+r.id,port(prev.id,cf,prev.bottom),port(r.id,cf,r.top));}
 }
 for(const [src,dst] of [['model-input-H0','module-add1'],['model-boundary-Y','module-add2']]){const a=byId[src],b=byId[dst],rail=moe&&dst==='module-add2'?cf-expertLayout.halfWidth+20:cf-220;links+=edge('residual-'+dst,port(src,cf-25,a.cy),port(dst,cf-22,b.cy),'i',false,`M${cf-25} ${a.cy}H${rail}V${b.cy}H${cf-22}`);}
 const bands=[['module-norm1','module-add1','Attention 子层'],['module-norm2','module-add2','FFN 子层']];for(const [first,last,label] of bands){const a=byId[first],b=byId[last];notes+=`<rect class="module-frame" x="${moe&&first==='module-norm2'?cf-expertLayout.halfWidth:cf-250}" y="${a.y-20}" width="${moe&&first==='module-norm2'?expertLayout.halfWidth*2:550}" height="${b.bottom-a.y+40}" rx="12"/>`+text(cf-234,a.y-30,label,'small');}
 if(!detailed){graphModel={...config,experts,stats,moe,ep,tp,sp,seq,rows,positions,edges:semanticEdges};graphModel.snapshot=trainingGraphSnapshot(config,rows,positions,semanticEdges,registry);return svg(notes+links+nodes,820,cursorY+30);}
 // Shared parameter identity is retained when TP changes shape.
 const weights={qkv:[H,Q/tp],proj:[H/tp,H],...(!moe?{fc1:[T,F/tp],fc2:[F/tp,H]}:{})},inputId={qkv:sp?'full-value-f-0':'full-input-X',proj:'full-value-f-2',fc1:sp?'full-value-f-5':'full-value-f-4',fc2:'full-value-f-7'};
 const outputId={qkv:'full-value-f-1',proj:tp>1?'full-value-f-3':'model-attn-result',fc1:'full-value-f-6',fc2:tp>1?'full-value-f-8':'full-value-f-9'};
 for(const key of Object.keys(weights)){const r=byId['full-f-'+key],sh=weights[key];nodes+=matrixNode('full-param-f-'+key,cf+238,r.cy-36,LINEAR_WEIGHTS[key].name,sh,'w',`前向读取 W${shapeText(sh)}，DGRAD 读取 Wᵀ。两处引用为同一对象。`,['linear','tp'],'weight-'+key);links+=edge('param-f-'+key,port('full-param-f-'+key,cf+196,r.cy),port(r.id,cf+128,r.cy),'w',true,`M${cf+196} ${r.cy}H${cf+128}`);}
 function shapeText(a){return '['+a.join(',')+']';}
 if(training){
 const gradRows=[];function backValue(id,r,name,shape,body){nodes+=matrixNode(id,cb,r.y,name,shape,'g',body,['grad','linear','tp']);return {id,y:r.y,cy:r.cy,top:r.top,bottom:r.bottom};}
 // Each backward record occupies its corresponding forward row; no forward node is replaced.
 let reverse=[];
 const bOpMap={
 'module-moe':['moe-backward','MoE · 输入梯度','router'],
 'full-f-qkv':['full-b-dq','QKV_DGRAD','linear'], 'full-f-mha':['full-b-dm','MHA grad','attention'], 'full-f-proj':['full-b-dp','PROJ_DGRAD','linear'],
 'full-f-fc1':['full-b-d1','FC1_DGRAD','linear'],'full-f-gelu':['full-b-dg','GeLU grad','activation'],'full-f-fc2':['full-b-d2','FC2_DGRAD','linear'],
 'full-f-agq':['full-b-rsq','RS(dX)','reduce'],'full-f-agf':['full-b-rs1','RS(dA)','reduce'],
 'full-f-rsp':sp?['full-b-agp','AG(dR_Attn)','expand']:null,'full-f-rsf':sp?['full-b-ag2','AG(dY)','expand']:null,
 'module-norm1':['model-back-norm1','Norm 1 grad','norm'],'module-norm2':['model-back-norm2','Norm 2 grad','norm']};
 const gradValueMap={
 'full-input-X':['full-value-b-0','dXᵣ',[seq,H]],'full-value-f-0':['full-value-b-1','dX⁽ᵖ⁾ᵣ',[T,H]],
 'full-value-f-1':['full-value-b-2','dQKVᵣ',[T,Q/tp]],'full-value-f-2':['full-value-b-3','dOᵣ',[T,H/tp]],
 'full-value-f-3':['full-value-b-4','dR_Attn',[T,H]],'model-attn-result':['model-grad-attn-result','dR_Attnᵣ',[seq,H]],
 'model-boundary-Y':['model-grad-boundary','dHₐ,Norm',[seq,H]],'full-value-f-4':['full-value-b-5','dAᵣ',[seq,H]],'full-value-f-5':['full-value-b-6','dA⁽ᵖ⁾ᵣ',[T,H]],
 'full-value-f-6':['full-value-b-7','dUᵣ',[T,F/tp]],'full-value-f-7':['full-value-b-8','dVᵣ',[T,F/tp]],
 'full-value-f-8':['full-value-b-9','dY',[T,H]],'full-value-f-9':['model-grad-ffn-result','dYᵣ',[seq,H]],
 'model-output':['full-input-dY','dH₁ᵣ',[seq,H]]};
 if(!sp&&tp>1){gradValueMap['full-input-X'][1]='dX⁽ᵖ⁾ᵣ';gradValueMap['full-value-f-4'][1]='dA⁽ᵖ⁾ᵣ';}
 for(const r of rows){
 if(r.id==='model-input-H0'){nodes+=addNode('model-back-add0',cb,r.cy,'dH₀ = Norm₁grad(dX) + dHₐ。后一项来自第一条恒等残差旁路。','g');nodes+=text(cb+38,r.cy+5,'dH₀','small','start',C.g);reverse.push({id:'model-back-add0',top:r.cy-22,bottom:r.cy+22,cy:r.cy});continue;}
 if(r.id==='module-add1'){nodes+=addNode('model-back-add1',cb,r.cy,'dHₐ = Norm₂grad(dA) + dH₁。dH₁ 来自第二条恒等残差旁路；dHₐ 随后同时送往 Attention 分支和 H₀ 的恒等旁路。','g');nodes+=text(cb+38,r.cy+5,'dHₐ','small','start',C.g);reverse.push({id:'model-back-add1',top:r.cy-22,bottom:r.cy+22,cy:r.cy});continue;}
 if(r.id==='module-add2')continue; // Add adjoint is a fan-out, not an addition.
 if(gradValueMap[r.id]){const [id,name,shape]=gradValueMap[r.id];const partial=name.includes('⁽ᵖ⁾')||!sp&&tp>1&&['full-input-X','full-value-f-4'].includes(r.id);const body=r.id==='model-boundary-Y'?'dHₐ,Norm 仅来自 Norm₂ 的反向路径；还要与第二条残差旁路返回的 dH₁ 相加，才得到完整 dHₐ。':r.id==='full-value-f-9'?'H₁=Hₐ+Y 的加法反向将 dH₁ 原样传给 Y 分支，因此 dY=dH₁。':partial?'这是本 Rank 对输入梯度的部分贡献；TP 归约完成后才得到完整的输入梯度或其序列分片。':`损失对 ${r.name} 的梯度，形状 ${shapeText(shape)}。它传给前一项计算，与优化器使用的参数梯度 dW 不同。`;reverse.push(backValue(id,r,name,shape,body));}
 else if(bOpMap[r.id]){const [id,name,cat]=bOpMap[r.id];let body=r.id==='module-moe'?'合并的反向将 αᵢ·dY 送回入选专家；各专家计算 dAᵢ，分发的反向将贡献送回来源并求和；Router 的分数梯度也贡献给 dA。Top-k 的离散专家编号不作连续求导。':name.includes('DGRAD')?'输入梯度 dX=dY·Wᵀ。它读取输出梯度与权重，不需要该线性层的前向输入。':name.includes('Norm')?'归一化的反向读取前向输入与当前输出梯度，计算对归一化输入的梯度。':name==='GeLU grad'?'dU=dV ⊙ GELU′(U)，需要前向 U。':name==='MHA grad'?'从 dO 和前向 Q/K/V/P 的数学依赖计算 dQ、dK、dV；融合实现可保存其他中间量或重计算。':cat==='expand'?'AG 拼接输出梯度的 token 分片，恢复 [T,H]。':'RS(sum) 归约输入梯度的各 Rank 贡献，并沿 token 维分片。';nodes+=glyph(id,cb,r.y,name,cat,body,r.id==='module-moe'?['moe','grad']:['grad','tp','attention'],r.communication);reverse.push({id,top:r.y,bottom:r.y+oh,cy:r.cy});}
 }
 for(let i=reverse.length-1;i>0;i--){const a=reverse[i],b=reverse[i-1];if(tp>1&&!sp&&['model-back-norm1','model-back-norm2'].includes(b.id)){const id=b.id==='model-back-norm1'?'full-b-rsq':'full-b-rs1',name=b.id==='model-back-norm1'?'AR(dX)':'AR(dA)',x=cb-230,y=a.top-20;nodes+=glyph(id,x,y,name,'reduce','各 TP Rank 的输入梯度只是部分贡献；AllReduce(sum) 合并为完整 [T,H] 输入梯度，再进入 Norm 的反向。',['tp','nccl'],true);links+=edge('ar-input-'+id,port(a.id,cb,a.top),port(id,x+128,y+oh/2),'g',true,`M${cb} ${a.top}V${y+oh/2}H${x+128}`);links+=edge('ar-output-'+id,port(id,x,y),port(b.id,cb,b.bottom),'g',true,`M${x} ${y}V${b.bottom+12}H${cb}V${b.bottom}`);continue;}links+=edge('b-'+a.id+'-'+b.id,port(a.id,cb,a.top),port(b.id,cb,b.bottom),'g',true);}
 const identity2=byId['model-output'],sum1=byId['module-add1'],sum0=byId['model-input-H0'];
 links+=edge('grad-residual2',port('full-input-dY',cb+38,identity2.cy),port('model-back-add1',cb+22,sum1.cy),'g',true,`M${cb+38} ${identity2.cy}H${cb+225}V${sum1.cy}H${cb+22}`);
 links+=edge('grad-residual1',port('model-back-add1',cb,sum1.cy-22),port('model-back-add0',cb+22,sum0.cy),'g',true,`M${cb} ${sum1.cy-22}H${cb+260}V${sum0.cy}H${cb+22}`);
 for(const key of Object.keys(weights)){const r=byId['full-f-'+key],sh=weights[key];nodes+=matrixNode('full-param-b-'+key,cb-238,r.cy-36,LINEAR_WEIGHTS[key].name,sh,'w','读取与前向相同的参数对象；DGRAD 使用其转置。',['linear','grad'],'weight-'+key);links+=edge('param-b-'+key,port('full-param-b-'+key,cb-196,r.cy),port(bOpMap[r.id][0],cb-128,r.cy),'w',true,`M${cb-196} ${r.cy}H${cb-128}`);}
 // Nonlinear and normalization backward dependencies keep explicit object mappings.
 for(const [source,target,backId] of [['model-input-H0','module-norm1','model-back-norm1'],['model-boundary-Y','module-norm2','model-back-norm2'],...(!moe?[['full-value-f-6','full-f-gelu','full-b-dg']]:[])]){const a=byId[source],b=byId[target];links+=edge('saved-'+backId,port(source,cf+38,a.cy),port(backId,cb-128,b.cy),'i',false,`M${cf+38} ${a.cy}H${cf+330}V${b.cy}H${cb-128}`);}
 const mha=byId['full-f-mha'];links+=edge('save-attention-state',port('full-f-mha',cf+128,mha.cy),port('full-attention-state',cf+190,mha.cy),'i',false,`M${cf+128} ${mha.cy}H${cf+190}`);nodes+=cachedCollection(cf+190,mha.y-8,'full-attention-state');remember('full-attention-state','Attention 前向状态',`每 Rank ${4/tp} 个头；Q/K/V 各 [8,${8/tp}]，每头 P[T,H]。这是数学反向依赖；实际保存内容由内核和重计算策略决定。`,['attention','grad']);links+=edge('attention-state',port('full-attention-state',cf+350,mha.cy),port('full-b-dm',cb-128,mha.cy),'i',false,`M${cf+350} ${mha.cy}H${cb-128}`);
 if(wgrad){for(const key of Object.keys(weights)){
 const r=byId['full-f-'+key],inp=byId[inputId[key]],out=byId[outputId[key]],sh=weights[key],name=key==='qkv'?'QKV':key==='proj'?'PROJ':key.toUpperCase();
 nodes+=glyph('full-w-'+key,cw,r.y,name+'_WGRAD','linear',`dW = Xᵀ·dY，shape ${shapeText(sh)}。它与 DGRAD 属于同一次反向；WGRAD 需要该线性层的前向输入。`,['linear','grad']);
 nodes+=matrixNode('full-dw-'+key,cw+220,r.cy-36,'d'+LINEAR_WEIGHTS[key].name,sh,'g','参数梯度与权重分片同形状；优化器使用该梯度更新参数，不作为上游激活梯度传播。',['grad'],'grad-weight-'+key);
 links+=edge('dw-'+key,port('full-w-'+key,cw+128,r.cy),port('full-dw-'+key,cw+178,r.cy),'g',true,`M${cw+128} ${r.cy}H${cw+178}`);
 const gradId=gradValueMap[out.id][0];links+=edge('wgrad-dy-'+key,port(gradId,cb-38,out.cy),port('full-w-'+key,cw+64,r.y+oh),'g',true,`M${cb-38} ${out.cy}H${cw+285}V${r.y+80}H${cw+64}V${r.y+oh}`);
 if(recollect&&['qkv','fc1'].includes(key)){
 const source=byId[key==='qkv'?'full-input-X':'full-value-f-4'];nodes+=glyph('full-cache-'+key,cw,r.y+95,key==='qkv'?'AG(Xᵣ)':'AG(Aᵣ)','expand','本例只保存序列分片；WGRAD 前重新收集完整输入。保留完整输入时可以省去该次 AG。',['tp','grad'],true);
 nodes+=matrixNode('full-regather-'+key,cw,r.y-95,key==='qkv'?'X':'A',[T,H],'i','从缓存的序列分片重新收集得到完整线性层输入。',['tp','grad']);
 links+=edge('cache-source-'+key,port(source.id,cf+38,source.cy),port('full-cache-'+key,cw-128,r.y+95+oh/2),'i',false,`M${cf+38} ${source.cy}H${cf+380}V${r.y+95+oh/2}H${cw-128}`);
 links+=edge('cache-up-'+key,port('full-cache-'+key,cw,r.y+95),port('full-regather-'+key,cw,r.y-23),'i',false,`M${cw} ${r.y+95}H${cw-190}V${r.y-59}H${cw-38}`);
 links+=edge('cache-to-w-'+key,port('full-regather-'+key,cw,r.y-23),port('full-w-'+key,cw,r.y),'i');
 }else{links+=edge('wgrad-x-'+key,port(inp.id,cf+38,inp.cy),port('full-w-'+key,cw-128,r.cy),'i',false,`M${cf+38} ${inp.cy}H${cf+380}V${r.cy}H${cw-128}`);}
 }}
 }
 if(moe&&training){const r=byId['module-moe'];nodes+=glyph('moe-wgrad',cw,r.y+400,'专家 / Router WGRAD','linear','各专家保存 dispatch 后的前向输入和 GeLU 输出，计算 dW1=AᵀdU、dW2=VᵀdE；Router 参数梯度来自被选分数的 softmax 路径。每位专家的权重独立。',['moe','grad']);if(recollect){nodes+=glyph('moe-router-regather',cw,r.y+280,'AG(Aᵣ) · Router WGRAD','expand','只保存序列分片时，Router WGRAD 重新收集完整 A。专家 WGRAD 另外读取保留的 dispatch 后输入。',['moe','tp','grad'],true);links+=edge('moe-router-cache',port('full-value-f-4',cf+38,byId['full-value-f-4'].cy),port('moe-router-regather',cw-128,r.y+280+oh/2),'i',false,`M${cf+38} ${byId['full-value-f-4'].cy}H${cw-190}V${r.y+280+oh/2}H${cw-128}`);links+=edge('moe-router-cache-wgrad',port('moe-router-regather',cw,r.y+280+oh),port('moe-wgrad',cw,r.y+400));}else{const source=byId[sp?'full-value-f-5':'full-value-f-4'];links+=edge('moe-wgrad-input',port(source.id,cf+38,source.cy),port('moe-wgrad',cw-128,r.y+400+oh/2),'i',false,`M${cf+38} ${source.cy}H${cw-180}V${r.y+400+oh/2}H${cw-128}`);} links+=edge('moe-wgrad-packed',port('moe-dispatch',cf+128,r.y+95+oh/2),port('moe-wgrad',cw-128,r.y+400+oh/2),'i',false,`M${cf+128} ${r.y+95+oh/2}H${cw-220}V${r.y+400+oh/2}H${cw-128}`);links+=edge('moe-wgrad-grad',port('moe-backward',cb-128,r.y+oh/2),port('moe-wgrad',cw,r.y+400),'g',true,`M${cb-128} ${r.y+oh/2}H${cw}V${r.y+400}`);}
 const titles=text(cf,28,'Forward / 前向','text','middle')+(training?text(cb,28,'DGRAD / 输入梯度','text','middle'):'')+(wgrad?text(cw,28,'WGRAD / 参数梯度','text','middle'):'');
 graphModel={...config,experts,stats,moe,ep,tp,sp,seq,rows,positions,edges:semanticEdges,weights,inputId,outputId,recollect};graphModel.focusBounds=current>=7?{x:cf-(moe?expertLayout.halfWidth+50:330),y:byId['module-norm2'].y-50,width:moe?expertLayout.halfWidth*2+100:800,height:byId['model-output'].bottom-byId['module-norm2'].y+100}:null;graphModel.snapshot=trainingGraphSnapshot(config,rows,positions,semanticEdges,registry);return svg(notes+links+nodes+titles,training?cb+320:850,cursorY+30);
}

window.TrainingFullGraph={render(c){CTX=c;H=RankAtlasModel.H;F=RankAtlasModel.I;T=c.config.mbs*c.config.seq/c.config.cp;Q=H+2048;parameterState={token:TrainingGraphState.token};registry={};selected=c.selected||(TrainingGraphState.searchExpert!==null&&TrainingGraphState.searchExpert<c.config.experts?'moe-e'+TrainingGraphState.searchExpert:'');TRAINING_MODEL.tokens=T;TRAINING_MODEL.hidden=H;TRAINING_MODEL.ffn=F;TRAINING_MODEL.heads=null;
let html=trainingGraph();const dom=new DOMParser().parseFromString(html,'image/svg+xml'),svgNode=dom.documentElement;
svgNode.classList.add('approved-compute-svg','training-full-source');const left=Math.min(-160,graphModel.positions['module-moe'].x-50),right=svgNode.viewBox.baseVal.width;svgNode.setAttribute('data-width',String(right-left));
const moe=graphModel.positions['module-moe'];for(const [key,value] of Object.entries({x:moe.x-48,y:moe.y-90,width:moe.width+96,height:moe.height+180}))svgNode.setAttribute('data-moe-'+key,String(value));svgNode.setAttribute('data-height',String(graphModel.rows.at(-1).bottom+100));svgNode.setAttribute('data-left',String(left));svgNode.setAttribute('data-layout-key','full:'+c.config.experts+':'+c.config.ep);
const focus=selected&&graphModel.positions[selected];if(focus&&TrainingGraphState.searchExpert!==null){svgNode.setAttribute('data-search-key',selected);svgNode.setAttribute('data-focus-x',String(focus.x+focus.width/2));svgNode.setAttribute('data-focus-y',String(focus.y));}const notes={};for(const [id,n] of Object.entries(registry)){const node=svgNode.querySelector('[data-cg-node="'+id+'"]');let description=n.role?`${n.title} · ${n.shape?.join(' × ')||''}`:n.expert!==undefined?n.body:n.title+' · 当前层计算依赖';
notes[id]={title:n.title,description};if(n.expert!==undefined)notes[id].communication={enabled:true,members:TrainingModel.owners(c.config,c.rank,n.expert)};
const comm={'moe-dispatch':'ep-dispatch','moe-combine':'ep-combine','full-f-rsp':'tp-attn','full-f-rsf':'tp-ffn','full-b-rsq':'tp-attn','full-b-agp':'tp-attn','full-b-rs1':'tp-ffn','full-b-ag2':'tp-ffn'}[id];if(comm)notes[id].communication=c.bindings.comm[comm];
if(n.role)notes[id].tensor={category:n.role==='w'?0:n.role==='g'?1:3,target:{kind:n.role==='w'?'parameter':n.role==='g'?'parameter-gradient':'activation',rank:c.rank,layer:c.layer,indices:n.expert!==undefined?[3,4]:[]},summary:n.shape?.join(' × '),description};
if(node){node.setAttribute('data-wb-tip',description);node.setAttribute('aria-pressed',String(selected===id));}
}
const groups=Array.from({length:c.config.ep},(_,owner)=>({id:'L'+c.layer+'-ep-'+owner,parallelism:'EP',experts:Array.from({length:c.config.experts/c.config.ep},(_,i)=>owner*c.config.experts/c.config.ep+i),ranks:[TrainingModel.representative(c.config,c.rank,owner*c.config.experts/c.config.ep)]}));window.TrainingGraphSnapshot={...graphModel.snapshot,groups,layer:c.layer,rank:c.rank,topk:c.config.topk,experts:c.config.experts,chosen:moeRoute(parameterState.token).chosen,sourceToken:parameterState.token,mb:c.mb};return {html:svgNode.outerHTML,notes};
}};
})();
