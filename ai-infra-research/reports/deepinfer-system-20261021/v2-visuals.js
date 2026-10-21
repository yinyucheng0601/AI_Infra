const C={i:'#B1EF6B',w:'#BCA0F3',a:'#F2C45F',ep:'#F7B080',dp:'#8CE580',cp:'#80E5D3',ink:'#e8e8e8',muted:'#ababab'};
const SYSTEM_COLORS={vision:'#A855F7',prefill:'#258CFF',decode:'#F43F8D',recipe:'#F2C45F',expert:C.ep,kv:'#62A8FF'};
let objects={};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function txt(x,y,s,size=16,color=C.ink,anchor='start',weight=400){return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}">${esc(s)}</text>`;}
function rect(x,y,w,h,fill='#1b1b1b',stroke='#444',rx=8,extra=''){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" ${extra}/>`;}
function hit(key,title,body,s,source){objects[key]={title,body,source};const system=key.startsWith('sys-');let outline='';if(system){const r=s.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);if(r)outline=rect(+r[1]-4,+r[2]-4,+r[3]+8,+r[4]+8,'none','#f2f2f2',10,'class="interaction-outline" stroke-width="2" pointer-events="none"');}return `<g class="hit ${system?'system-node ':''}${selected===key?'selected':''}" role="button" tabindex="0" data-key="${key}" aria-label="${esc(title)}">${s}${outline}</g>`;}
function op(x,y,label,key,body,source,w=260){return hit(key,label,body,rect(x,y,w,48,'#505050','#858585',24)+txt(x+w/2,y+30,label,18,'white','middle',650),source);}
function wire(d,kind='data'){return `<path d="${d}" fill="none" stroke="${kind==='weight'?C.w:'#999'}" stroke-width="1.5" ${kind==='feedback'?'stroke-dasharray="3 6"':kind==='weight'?'stroke-dasharray="6 5"':''} marker-end="url(#${kind==='weight'?'aw':'arrow'})"/>`;}
function frame(x,y,w,h,label,color='#555',dash=false){return rect(x,y,w,h,'#171717',color,10,dash?'stroke-dasharray="5 5"':'')+txt(x+18,y+28,label,14,color);}
function matrix(x,y,cols,rows,type='i',pitch=13,opacity=1){let s='';for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)s+=rect(x+c*pitch,y+r*pitch,pitch-3,pitch-3,C[type],'none',1,`opacity="${opacity*(.28+.12*((r+c)%4))}"`);return s;}
function tensor(x,y,label,shape,key,body,source,type='i',w=190){return hit(key,label,body,rect(x,y,w,73,'#191919','#666',5)+matrix(x+13,y+12,Math.floor((w-26)/13),4,type)+txt(x+16,y+28,label,16,C[type],'start',500).replace('<text ', '<text style="paint-order:stroke;stroke:#191919;stroke-width:4px" ')+txt(x+16,y+59,shape,13,'#d0d0d0').replace('<text ', '<text style="paint-order:stroke;stroke:#191919;stroke-width:4px" '),source);}
function comm(x,y,w,label,key,body,source){return hit(key,label,body,rect(x,y,w,48,'#202020','#b0b0b0',24,'stroke-dasharray="6 5"')+txt(x+w/2,y+30,label,18,'white','middle',650),source);}
function tag(x,y,label,color='#999'){return txt(x,y,label,13,color);}
function bracket(x,y,w,label,color=C.muted){return `<path d="M${x},${y-7}V${y}H${x+w}V${y-7}" stroke="${color}" fill="none"/>`+txt(x+w/2,y+24,label,14,color,'middle');}
function plus(x,y,key='sum'){return hit(key,'分支合并','对同一隐藏特征维度的结果逐元素合并；路由加权由实际 MoE 路径完成。',`<circle cx="${x}" cy="${y}" r="24" fill="#111" stroke="#ddd" stroke-width="1.6"/><path d="M${x-8},${y}H${x+8}M${x},${y-8}V${y+8}" stroke="#eee" stroke-width="2"/>`,'comm');}
function endpoint(x,y,label,color=C.i){return `<circle cx="${x}" cy="${y}" r="5" fill="${color}"/>`+txt(x+12,y+5,label,14,color);}
function base(body,w=980,h=650){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(chapters[current].title||'DeepInfer 执行结构')}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9" stroke="#aaa" fill="none"/></marker><marker id="aw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9" stroke="${C.w}" fill="none"/></marker><pattern id="wait" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#666"/></pattern></defs>${body}</svg>`;}
function band(y,label,detail){return txt(32,y,label,14,C.muted)+txt(948,y,detail,13,C.muted,'end')+`<line x1="32" x2="948" y1="${y+13}" y2="${y+13}" stroke="#303030"/>`;}
function coverArt(){let b='';b+=tag(40,32,'LOCAL ATTENTION / GLOBAL EXPERT GROUP');b+=frame(40,70,580,114,'ATTENTION DP',C.dp);for(let r=0;r<4;r++){const x=65+r*142;b+=matrix(x,117,8,3,'i',11)+txt(x+44,166,`Rank ${r===3?'…':r}`,13,C.muted,'middle');}b+=wire('M330 184V220')+comm(145,220,370,'Routing / token exchange','cover-ep','Attention 的本地请求在 MoE 阶段按专家重新汇集。','comm');for(let r=0;r<4;r++){const x=40+r*148;b+=frame(x,308,136,152,`EP · ${r===3?'…':r}`,C.ep);for(let e=0;e<3;e++)b+=rect(x+16,354+e*28,104,20,'#29262d','#695970',4)+matrix(x+22,359+e*28,10,1,'w',9);b+=wire(`M${x+68} 268V308`);}b+=wire('M108 460V492H552V460')+wire('M330 492V526')+tensor(200,526,'隐藏状态 → 下一层','同一 token 身份','cover-out','跨卡专家执行结束后，结果回到负责原请求的 rank。','comm','i',260);return base(b,660,630).replace(/ role="button" tabindex="0" data-key="[^"]+" aria-label="[^"]+"/g,'');}

function systemDiagram(){
 const focus=substate===1,kv=SYSTEM_COLORS.kv;
 const request=d=>wire(d),cache=d=>`<path d="${d}" fill="none" stroke="${kv}" stroke-width="2.6" marker-end="url(#kv-arrow)"/>`;
 const svc=(x,y,w,h,label,key,body,source='architecture',color='#777')=>hit(key,label,body,rect(x,y,w,h,'#222',color,7)+txt(x+w/2,y+h/2+6,label,17,C.ink,'middle',500),source);
 const stack=(x,y,w,h,color)=>rect(x-16,y-16,w,h,'#191919',color,7)+rect(x-8,y-8,w,h,'#1d1d1d',color,7);
 const outside=s=>`<g opacity="${focus?.38:1}">${s}</g>`;
 let b=band(30,'官方推理系统架构',focus?'DeepInfer：服务实例内的执行核心':'请求编排 / 推理服务 / KV 复用');
 b+=outside(txt(628,76,'User Request',14,C.muted,'middle')+txt(797,76,'User Response',14,C.muted,'middle')+request('M628 82V102')+request('M797 102V82'));
 b+=outside(svc(580,102,260,52,'DeepSeek Recipe','sys-recipe','将 API 请求转换为 token 序列与采样参数，并将模型输出解析为响应。DeepSeek Recipe 与 DeepInfer 同期独立开源。','recipe',SYSTEM_COLORS.recipe));
 b+=outside(request('M650 154V208')+request('M780 208V154')+txt(635,179,'Token List',12,C.muted,'end')+txt(635,196,'Sampling Parameters',12,C.muted,'end')+txt(796,185,'Token List',12,C.muted));
 b+=outside(stack(580,208,260,56,'#555')+svc(580,208,260,56,'Entrypoint','sys-entry','衔接协议层与推理服务，参与缓存匹配与请求生命周期；Decode 结果返回 Entrypoint。'));
 // Request orchestration follows the official architecture, independently of KV movement.
 b+=outside(request('M580 236H490V320')+request('M365 462H315V344H270')+request('M615 462H662V344H700')+request('M940 486H965V236H840'));
 b+=outside(svc(30,320,240,48,'Vision Encoder LB','sys-velb','为图像选择 Vision Encoder 服务，按 patch 工作量选择设备。完整跨服务负载均衡属于生产系统。')+svc(370,320,240,48,'Prefill Load Balancer','sys-plb','按上下文长度分桶及计算预算分发 Prefill 请求；与实例内部 EPLB 分属不同层级。')+svc(700,320,240,48,'Decode Load Balancer','sys-dlb','按请求并发和 KV 长度组织 Decode 负载；它不等同于专家副本放置。'));
 for(const x of [150,490,820])b+=outside(request(`M${x} 368V399H${x-45}V434`)+request(`M${x} 399V442`)+request(`M${x} 399H${x+45}V450`));
 b+=stack(30,450,250,100,SYSTEM_COLORS.vision)+stack(365,450,250,100,SYSTEM_COLORS.prefill)+stack(700,450,240,100,SYSTEM_COLORS.decode);
 b+=hit('sys-ve','Vision Encoder Service','独立编码图像并向 Prefill 返回 embedding；DeepInfer 仓库包含多模态与视觉模型执行模块。',rect(30,450,250,100,'#3C1764',SYSTEM_COLORS.vision,7)+txt(155,495,'Vision Encoder Service',17,C.ink,'middle')+txt(155,529,'image → embedding',13,C.muted,'middle'),'readme');
 b+=hit('sys-prefill','Prefill Service','实例运行模型前向、建立 KV 并执行专家并行。DeepInfer 提供执行核心；官方推荐 EP2–8 / DP2–8。',rect(365,450,250,100,'#103C75',SYSTEM_COLORS.prefill,7)+txt(490,535,'Prefill Service',17,C.ink,'middle'),'architecture');
 b+=hit('sys-decode','Decode Service','实例进行迭代生成和专家并行；DeepInfer 的 DSpark、ZOS、算子与通信路径在此协同。官方推荐 EP64–128 / DP64–128。',rect(700,450,240,100,'#691A40',SYSTEM_COLORS.decode,7)+txt(820,535,'Decode Service',17,C.ink,'middle'),'architecture');
 b+=svc(383,474,214,38,'Expert-Parallel LB','sys-peplb','统计实例内部的专家 token 负载，更新逻辑专家到物理副本的映射，并周期性搬运权重。','balance',C.ep)+svc(713,474,214,38,'Expert-Parallel LB','sys-deplb','Decode 的 Wide-EP 依赖 EPLB 降低专家执行尾部。服务级 Decode LB 与此组件承担不同职责。','balance',C.ep);
 b+=request('M280 504H365')+cache('M615 504H700');
 b+=outside(svc(365,586,575,46,'External KVCache Storage · 3FS','sys-storage','独立存储 block KV，使 Prefill 能复用任意前缀；Decode 生成的 KV 写回存储。SWA 状态另有 host 管理路径。','architecture'));
 b+=cache('M490 586V550')+cache('M820 550V586');
 b+=request('M35 594H92')+txt(107,599,'请求 / 响应',13,C.muted)+cache('M35 624H92')+txt(107,629,'KVCache',13,kv);
 if(focus)b+=txt(375,571,'DeepInfer · 模型执行 / 专家均衡 / 通信 / 调度',12,C.ink);
 b+=txt(940,649,'关系依据：DeepSeek 官方架构图 · 点击组件查看定位',12,C.muted,'end');
 return base(b).replace('</defs>',`<marker id="kv-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9" stroke="${kv}" fill="none" stroke-width="1.4"/></marker></defs>`);
}


function executionDiagram(){let b=band(35,'一个 Decode step 的调用与数据','选中阶段沿同一轮次展开');const opacity=k=>substate===k?1:.38;
b+=`<g opacity="${opacity(0)}">`+frame(30,70,920,108,'CPU · BATCH CONTROL')+op(55,115,'scheduler.schedule','ex-schedule','LLMEngine.step 调用 C++ scheduler，得到本轮请求和元数据。','engine',260)+op(365,115,'ZOS metadata','ex-meta','_correct_seqlens_qk 修正 query / KV 长度和 remap。','worker',260)+tensor(700,99,'本轮 token','seqlen_q / positions','ex-token','每个请求的当前输入和验证位置进入设备。','worker','i',215)+wire('M315 139H365')+wire('M625 139H700')+'</g>';
b+=frame(30,212,920,275,'GPU · REPEATED DECODER LAYERS');b+=wire('M807 172V200H190V255');
b+=`<g opacity="${opacity(1)}">`+op(60,255,'HC / Norm','ex-hc','准备 Attention 输入；可融合上一分支写回。','hc',260)+op(365,255,'V4 Attention','ex-attn','SWA 与压缩 KV / Indexer 共同组织 FlashMLA 访问。','attn',260)+tensor(720,244,'本地 KV','SWA + compressed','ex-kv','Attention 对本地请求缓存计算，DP rank 保留请求归属。','attn','i',190)+wire('M320 279H365')+wire('M720 280H625')+'</g>';
b+=wire('M495 303V330H190V366');b+=`<g opacity="${opacity(2)}">`+op(60,366,'HC / Gate','ex-gate','Gate 选择逻辑专家，EPLB 映射到物理副本。','route',260)+comm(365,366,260,'MoE across ranks','ex-moe','域内 Mega MoE 或显式 Dispatch → grouped compute → Combine。','comm')+tensor(720,355,'层输出','回到本地 token','ex-out','专家结果按来源恢复，写回残差后继续后续层。','comm','i',190)+wire('M320 390H365')+wire('M625 390H720')+tag(60,458,'EPLB 映射')+tag(365,458,'通信 / 专家 GEMM / 归并')+tag(720,458,'重复后续层')+'</g>';
b+=wire('M815 428V515H190V545');b+=`<g opacity="${opacity(3)}">`+op(60,545,'Head / verification','ex-head','主模型输出用于验证选定草稿前缀。','mtp',260)+op(365,545,'Sampler','ex-sampler','得到接受 token、结束标记与草稿信息。','worker',260)+tensor(720,533,'接受 token','下一轮 state','ex-next','ZOS 保留本轮 state，把 CPU 后处理留到下一轮。','worker','i',190)+wire('M320 569H365')+wire('M625 569H720')+'</g>';return base(b);}

function fusionDiagram(){let b=band(35,'子层交界的数据路径',substate===0?'展开逻辑操作':substate===1?'同一内核跨越操作边界':'输出直接进入消费者布局');b+=tensor(40,78,'上一分支输出','[T,H] · BF16','fu-input','上一子层的单路输出与 lazy HC 状态一起进入融合条件判断。','hc','i',220)+tensor(370,78,'Lazy HC state','residual / post / mix','fu-lazy','完整延迟写回状态是融合前提之一。','hc','i',260)+tensor(720,78,'HC 参数','mix + norm weights','fu-weight','生成读取、写回与归一化所需的可训练参数。','hc','w',220);b+=wire('M150 151V205')+wire('M500 151V178H150V205')+wire('M830 151V178H500V205','weight');
const names=['HC post','HC pre','RMSNorm','FP8 cast'];
if(substate===0){for(let i=0;i<4;i++){let x=40+i*240;b+=op(x,218,names[i],`fu-op${i}`,'这是 Mega mHC 所覆盖的逻辑操作之一；此展开强调操作边界，不声明独立 kernel 数量。','hc',140);if(i<3)b+=wire(`M${x+140} 242H${x+200}V294H${x+240}V242`)+matrix(x+162,280,4,3,'i',10);}b+=bracket(40,345,860,'操作间的临时结果与格式边界');b+=tag(55,422,'post 写回残差 → pre 读取分支 → Norm → 按消费者格式转换');b+=tag(55,455,'融合条件由 _hc_fused_post_pre 在运行路径中判断。');}
else{b+=frame(35,201,910,153,'DEEPGEMM / mega_mhc','#777');for(let i=0;i<4;i++){let x=58+i*226;b+=op(x,260,names[i],`fu-op${i}`,'处于同一 Mega mHC 调用内，减少分离执行的中间读写。','hc',140);if(i<3)b+=wire(`M${x+140} 284H${x+226}`);}b+=tag(55,384,'同一调用完成 post + pre + norm；cast 与输出格式按条件配置。');}
if(substate===2){b+=wire('M192 354V439')+wire('M490 354V439')+wire('M787 354V439');b+=tensor(40,439,'BF16 output','Gate consumer','fu-bf16','BF16 分支供路由 Gate 使用；它与 FP8 输出不是同一用途。','hc','i',260)+tensor(360,439,'sym_buffer.x','FP8 + routed/shared SF','fu-sym','cast_kwargs.out 让融合直接输出到 Mega MoE 的对称输入缓冲和 scale 区域。','hc','i',260)+tensor(680,439,'new_residual','[T, hc_mult, H]','fu-res','更新的多路残差继续保留，供后续 HC 使用。','hc','i',260);b+=bracket(360,554,260,'直接满足下一消费者的布局契约',C.i);}
else{b+=frame(40,500,900,93,'融合条件与限制')+tag(60,552,'完整 lazy post 数据 · 无中途 intervention · 满足 Mega mHC 开关与形状条件');}return base(b);}

function attentionDiagram(){let b=band(35,'本地请求的 Attention 数据访问','SWA + compressed KV / paged cache');b+=tensor(40,78,'Query','[T, heads, D]','at-q','当前查询经过投影；满足条件时 Norm 和 RoPE 可延后进入融合接口。','attn','i',220)+op(350,90,'MQA Indexer','at-index','DeepGEMM FP8/FP4 MQA logits 计算候选分数并选择索引。','index',260)+tensor(720,78,'Index K','MXFP4 · per-32','at-indexk','Indexer KV 使用 per-32 ue8m0 scale 的 MXFP4。','precision','i',220)+wire('M260 114H350')+wire('M720 114H610');
b+=frame(40,204,900,177,'KV CACHE · 当前查询的访问集合');for(let i=0;i<24;i++){let x=65+i*35;let chosen=[1,5,9,14].includes(i),swa=i>19;b+=hit(`at-block${i}`,swa?'SWA 近期窗口':chosen?'压缩 KV 候选块':'压缩 KV 块',swa?'SWA 索引提供近期局部窗口。':chosen?'Indexer 生成的候选索引指向此类压缩 KV 块。':'压缩 KV 通过索引进入实际 Attention 访问集合。',rect(x,258,29,62,chosen||swa?'#292929':'#1e1e1e',chosen||swa?C.ink:'#444',3)+matrix(x+5,266,2,4,'i',10,chosen||swa?1:.25),'attn');}b+=bracket(65,341,690,'压缩历史 KV · indexer 选择候选')+bracket(765,341,130,'SWA window',C.i);b+=wire('M480 138V190H132V252')+wire('M480 190H412V252')+wire('M480 190H587V252');
if(substate===0){b+=wire('M490 381V430')+op(360,430,'FlashMLA','at-mla','消费 SWA / compressed cache 的索引及调度元数据，执行实际注意力。','backend',260)+tensor(360,526,'Context','→ output projection','at-context','输出投影将 Attention context 接回隐藏状态。','attn','i',260)+wire('M490 478V526');b+=tag(40,480,'FP4 main KV：per-16 e4m3 scale')+tag(40,509,'候选选择也有计算与元数据成本');}
else{b+=wire('M490 381V410H250V450')+wire('M490 410H720V450')+op(110,450,'Prefill sparse','at-prefill','prefill_attn_varlen_sparse：按变长查询及索引访问 KV。','attn',260)+op(590,450,'Decode paged','at-decode','decode_mla_mqa_sparse：使用 paged cache 与 FlashMLA 调度元数据。','attn',260)+tag(110,536,'varlen query + KV + indices')+tag(590,536,'cache + indices + sched_meta')+bracket(110,572,740,'条件满足时融合 Norm / RoPE / Attention / output cast');}return base(b);}

function expertSlot(x,y,e,key){return hit(key,`逻辑专家 E${e} 的物理副本`,'紫色矩阵是相同逻辑专家的权重；物理槽位和 rank 可以改变，逻辑专家身份保持。',rect(x,y,176,48,'#252326',C.ep,8)+txt(x+14,y+30,`E${e}`,18)+matrix(x+65,y+10,8,2,'w',12),'policy');}
function expertsDiagram(){const ranks=substate===0?beforeRanks:afterRanks,loads=rankLoads(ranks),peak=Math.max(...loads),mean=loads.reduce((a,b)=>a+b)/4;let b=band(35,'logical expert → physical slot → rank','固定输入：3 steps / 8 logical / 12 physical');const meanE=inputHistory[0].map((_,e)=>inputHistory.reduce((sum,row)=>sum+row[e],0)/3);for(let e=0;e<8;e++){const x=40+e*115;b+=txt(x+35,82,`E${e}`,14,C.ep,'middle')+rect(x,99,70,6,'#292929','none',0)+rect(x,99,70*meanE[e]/35,6,C.ink,'none',0);}b+=tag(40,137,'同一逻辑路由负载 · 改变副本与物理放置');
for(let r=0;r<4;r++){const x=30+r*240;b+=frame(x,175,220,230,`RANK ${r} · 3 SLOTS`,C.ep);ranks[r].forEach((e,i)=>b+=expertSlot(x+22,222+i*57,e,`ep-${r}-${i}`));b+=txt(x+110,448,loads[r].toFixed(1),29,C.ink,'middle')+txt(x+110,473,'窗口平均调用量',13,C.muted,'middle');}
b+=band(514,'每卡窗口平均工作量','条宽按输入调用量计算');for(let r=0;r<4;r++){const x=45+r*240;b+=rect(x,542,180,12,'#242424','none',2)+rect(x,542,180*loads[r]/40,12,C.ink,'none',2)+txt(x,580,`R${r} · ${loads[r].toFixed(1)}`,14);}
b+=txt(45,626,`此输入的 max/mean：${(peak/mean).toFixed(3)}  ·  官方 Decode 配置披露 moe_lb = 1.090`,16,C.ink);return base(b);}

function wideepDiagram(){const decode=substate===1;let b=band(35,'同一组设备：Attention DP → MoE EP',decode?'官方 Decode：EP64–128':'官方 Prefill：EP2–8');for(let r=0;r<4;r++){let x=30+r*240;let rn=decode?(r===3?'63':r===2?'…':' '+r):r;b+=frame(x,75,220,475,`RANK ${rn}`);b+=tensor(x+25,125,'本地请求','Attention DP',`we-input${r}`,'Attention 访问本地请求 KV；该 rank 的请求身份在 MoE 前后保持。','architecture','i',170)+op(x+40,225,'Attention',`we-attn${r}`,'每卡独立完成本地请求的 Attention；随后按专家发送激活。','architecture',140)+wire(`M${x+110} 198V225`)+wire(`M${x+110} 273V314`);b+=wire(`M${x+110} 362V408`);const count=decode?7:4;for(let e=0;e<count;e++){let sx=x+22+(e%4)*47,sy=410+Math.floor(e/4)*53;b+=rect(sx,sy,39,43,'#252326',C.ep,4)+matrix(sx+7,sy+8,3,3,'w',9);}b+=tag(x+22,529,decode?'7 physical experts / rank':'local physical experts');}
b+=comm(45,314,890,'EP token exchange · 全组按专家汇集 / 按来源返回','we-ep','EP 不额外乘上设备数量；它是这些 rank 在专家子层中的组织方式。','comm');b+=bracket(45,580,890,decode?'EP64：7 槽 / rank，不含 shared expert · 窗口 1,000 步 / 重排 10,000 步':'Prefill：较大 token 批次 · 窗口 100 步 / 重排 1,000 步');return base(b);}

function communicationDiagram(){let mega=substate===1;let b=band(35,'同一组输入 / 同一隐藏维度输出',mega?'use_mega_moe = true':'显式 DeepEP 路径');b+=tensor(40,78,'Hidden X','BF16 / FP8 + SF','co-x','BF16 输入供 Gate，低精度激活及 scale 按选定计算路径准备。','comm','i',220)+op(350,90,'Gate','co-gate','bf16_mega_gate 或 moe_topk_gate 输出物理专家索引与路由系数。','route',260)+tensor(720,78,'top-k / weights','EPLB physical map','co-topk','逻辑路由已映射为物理专家；这里的权重是动态路由系数。','route','i',220)+wire('M260 114H350')+wire('M610 114H720');
if(!mega){b+=wire('M830 151V190H170V220')+comm(40,220,260,'Dispatch','co-dispatch','返回展开后的输入、top-k 权重与 handle；current_stream_wait 建立消费依赖。','comm')+op(360,220,'Grouped GEMM','co-gemm1','gate/up projection 按每专家接收量分组；M 维由接收 token 数决定。','route',260)+wire('M300 244H360')+tensor(720,208,'Expert W₁','FP4 / FP8 / BF16','co-w1','权重布局按 MMA 类型及内核要求处理。','gate','w',220)+wire('M720 244H620','weight');b+=wire('M490 268V320')+op(360,320,'SwiGLU / cast','co-swi','SwiGLU、top-k 权重处理与 per-token cast 结合。','route',260)+wire('M490 368V420')+op(360,420,'Grouped GEMM','co-gemm2','down projection 生成专家输出。','route',260)+tensor(720,408,'Expert W₂','down projection','co-w2','第二组专家权重将中间维映射回隐藏维。','route','w',220)+wire('M720 444H620','weight');b+=op(40,420,'Shared expert','co-shared','共享专家留在本地计算；结果作为 combine bias 合入。','comm',260)+wire('M170 468V554H360')+wire('M490 468V530')+comm(360,530,260,'Combine','co-combine','handle 恢复 token 来源；事件与通信流控制依赖，shared 作为 bias 合入。','comm')+wire('M620 554H720')+tensor(720,518,'Output Y','[T,H] · BF16','co-y','回到原请求 rank 的隐藏状态，供后续 HC 使用。','comm','i',220);}
else{b+=wire('M150 151V210')+wire('M830 151V210')+frame(35,210,910,127,'SYMMBUFFER · 对称输入与路由数据','#777')+matrix(65,260,20,3,'i',12)+txt(65,316,'x / x_sf',14,C.i)+matrix(445,260,20,3,'i',12)+txt(445,316,'topk_idx / topk_weights',14,C.i);b+=wire('M490 337V390')+frame(35,390,910,138,'DEEPGEMM / mega_moe_func',C.ep)+comm(58,444,260,'Dispatch','co-megad','分发在 Mega MoE 的融合执行中组织。','comm')+op(360,444,'Expert compute','co-megac','消费两组专家权重、activation 与 clamp 配置；shared 可一起融合。','comm',260)+comm(662,444,260,'Combine','co-megar','归并回来源 token，与专家计算共同组织。','comm')+wire('M318 468H360')+wire('M620 468H662')+bracket(50,566,880,'NVLink 域条件 + 受支持的 MMA 类型 + 对称缓冲布局');}return base(b);}

function dsparkDiagram(){let b=band(35,'验证预算的两级决策','默认最大草稿长度：5');b+=frame(35,73,910,197,'草稿模型 + CONFIDENCE HEAD');const labels=['请求 A','请求 B','请求 C'];for(let r=0;r<3;r++){b+=txt(60,139+r*50,labels[r],16);for(let i=0;i<5;i++){let x=200+i*134,y=110+r*50;let used=substate===0||i<[4,2,3][r];b+=hit(`ds-${r}-${i}`,`请求 ${'ABC'[r]} · draft ${i+1}`,'同一请求验证一个前缀；每个候选的接受率估计用于分配有限验证预算。图中长度用于呈现分配关系。',rect(x,y,112,34,used?'#292929':'#1d1d1d',used?C.ink:'#444',3)+txt(x+56,y+23,`d${i+1} / c${i+1}`,14,used?C.ink:'#666','middle'),'mtp');}}b+=wire('M270 270V318')+wire('M720 270V318');b+=frame(35,318,420,192,'CPU / 预算选择')+tag(56,369,'N−2 confidence + decode 性能曲线')+op(75,394,'Choose total_q','ds-budget','选择预期接受 token / 估计执行时间最大的总查询数。','mtp',260)+tag(56,479,'forward + sampler 历史时间修正成本');b+=frame(505,318,440,192,'GPU / 每请求长度')+tag(526,369,'较新的 confidence / 在途结果')+op(565,394,'seqlen_q / remap','ds-remap','ZOS 下 GPU 修正每请求长度，回填 pinned buffer 后再修正 CPU 采样元数据。','worker',260)+tag(526,479,'global selection → remap → pinned buffer');b+=wire('M455 418H565')+wire('M695 510V555')+comm(505,555,440,'Target model verification','ds-verify','按选中的前缀验证，得到实际接受 token；更多草稿不必全部验证。','mtp')+txt(50,587,'预算与分配分离，适配异步流水。',18,C.ink);return base(b);}

function event(x,y,w,label,key,body,kind='gpu'){return hit(key,label,body,rect(x,y,w,42,kind==='wait'?'url(#wait)':kind==='cpu'?'#292929':'#484848',kind==='cpu'?'#aaa':'#858585',4)+txt(x+w/2,y+26,label,14,C.ink,'middle'),'worker');}
function zosDiagram(){let b=band(35,'CPU / GPU 提交与完成依赖','横向表达先后和覆盖关系，无时间刻度');b+=txt(35,136,'CPU',17,C.ink)+txt(35,274,'GPU',17)+txt(35,420,'STATE',17);for(let y of [157,295,441])b+=`<line x1="130" y1="${y}" x2="940" y2="${y}" stroke="#303030"/>`;
if(substate===0){b+=event(135,109,130,'schedule N','zo-schedule','CPU 准备本轮批次。','cpu')+event(290,247,220,'forward N','zo-forward','执行本轮主模型。')+event(525,247,130,'sample N','zo-sample','本轮采样完成后，CPU 才能消费结果。')+event(680,109,125,'post N','zo-post','等待 sample 完成后更新请求账本。','cpu')+event(820,109,125,'schedule N+1','zo-next','更新后才能组织下一批。','cpu');b+=wire('M265 130H277V268H290')+wire('M655 268H667V130H680')+rect(680,247,265,42,'url(#wait)','#555',4)+txt(812,274,'设备等待 CPU',14,C.muted,'middle');b+=bracket(680,329,265,'后处理与下一轮调度暴露在设备间隙');b+=tensor(500,394,'state(N)','本轮完成后消费','zo-state','同步模式立即完成当前 step 的后处理。','worker','i',260)+wire('M590 289V394');}
else{b+=event(135,109,130,'schedule N','zo-schedule','允许上一轮结果仍在途，先准备当前批次。','cpu')+event(290,247,320,'forward N','zo-forward','先提交当前主模型，再进行 CPU 上一轮后处理。')+event(360,109,160,'post N−1','zo-post','同步上一轮 sample_end_evt；此时当前 forward 已经提交。','cpu')+event(625,247,155,'sample N','zo-sample','完成元数据修正后提交当前采样。')+event(800,109,145,'schedule N+1','zo-next','本轮 state 留给下一轮处理，形成流水。','cpu');b+=wire('M265 130H277V268H290')+wire('M520 130H600V268H625');b+=rect(290,174,320,45,'#242424','none',0)+txt(450,202,'当前 GPU 执行覆盖 CPU 后处理',14,C.ink,'middle');b+=tensor(135,394,'state(N−1)','sample_end_evt','zo-old','必须等待上一轮采样事件，再消费旧结果；依赖仍然保留。','worker','i',250)+tensor(620,394,'state(N)','延迟到下一轮','zo-new','curr_step_state 保存本轮元数据与采样输出，在下一轮后处理。','worker','i',250)+wire('M260 394V348H340V151')+wire('M705 289V394');}
b+=frame(35,520,910,88,'与 DSPARK 的连接')+tag(56,573,'CPU 先定 total_q；GPU 修正 seqlen_q / remap；采样前统一元数据。');return base(b);}

function evidenceDiagram(){const p=perf[substate],X=c=>80+(c-16)/80*810,Y=t=>410-(t-4000)/16000*310;let b=band(35,'官方 EP64 / DP64 对照','估算吞吐 · token/s/rank');for(let v=4000;v<=20000;v+=4000)b+=`<line x1="80" y1="${Y(v)}" x2="890" y2="${Y(v)}" stroke="#333"/>`+txt(65,Y(v)+5,(v/1000)+'k',13,C.muted,'end');for(const r of perf)b+=txt(X(r.c),446,r.c,14,C.muted,'middle');b+=txt(890,474,'并发序列 / rank',14,C.muted,'end');b+=`<path d="${perf.map((r,i)=>`${i?'L':'M'}${X(r.c)} ${Y(r.f)}`).join(' ')}" fill="none" stroke="#aaa" stroke-width="2"/><path d="${perf.map((r,i)=>`${i?'L':'M'}${X(r.c)} ${Y(r.d)}`).join(' ')}" fill="none" stroke="${C.i}" stroke-width="2"/>`;for(let i=0;i<perf.length;i++){const r=perf[i];b+=`<g data-state="${i}" role="button" tabindex="0" class="chart-point" aria-label="并发 ${r.c}"><circle cx="${X(r.c)}" cy="${Y(r.d)}" r="15" fill="transparent"/><circle cx="${X(r.c)}" cy="${Y(r.d)}" r="${i===substate?7:4}" fill="${C.i}" stroke="${i===substate?'#fff':'none'}" stroke-width="3"/><circle cx="${X(r.c)}" cy="${Y(r.f)}" r="4" fill="#aaa"/></g>`;}b+=`<line x1="${X(p.c)}" y1="80" x2="${X(p.c)}" y2="420" stroke="#777" stroke-dasharray="3 6"/>`+txt(95,78,'— fixed‑5',14,'#aaa')+txt(260,78,'— dynamic',14,C.i);b+=frame(35,505,910,110,`${p.c} SEQUENCES / RANK`);const vals=[['验证长度',`5.00 → ${p.v.toFixed(2)}`],['接受长度',`${p.fa.toFixed(2)} → ${p.a.toFixed(2)}`],['有效吞吐',`${p.f.toLocaleString()} → ${p.d.toLocaleString()}`],['收益',`${p.g>0?'+':''}${p.g.toFixed(1)}%`]];vals.forEach(([k,v],i)=>{let x=55+i*225;b+=txt(x,562,k,13,C.muted)+txt(x,594,v,i===2?19:24,i===3&&p.g<0?'#E8957D':C.ink);});return base(b);}

function completeDiagram(){let b=band(32,'LOCAL RANK / EXPERT GROUP / CROSS-STEP CONTROL','点选对象 → 实现入口与性能取舍');const deep=substate>=1,feedback=substate===2;const weak=s=>`<g opacity="${s?1:.2}">`;
b+=frame(28,65,260,550,'LOCAL REQUEST / DP',C.dp)+tensor(58,108,'Hidden X','token identity','all-x','本地请求的当前隐藏状态，从 Attention 到 MoE 后保持来源归属。','attn','i',200)+op(78,222,'HC / Attn','all-attn','Mega mHC 减少边界读写；V4Attention 通过 SWA / 压缩候选组织实际 KV 访问。','attn',140)+wire('M158 181V222')+op(78,328,'HC / Gate','all-gate','Gate 选择逻辑专家，并通过 EPLB map 得到物理专家。','route',140)+wire('M148 270V328')+tensor(58,459,'Layer output','→ subsequent layers','all-output','专家结果回本地后写回残差，继续后续层。','comm','i',200);
b+=frame(330,65,320,550,'EXPERT PARALLEL GROUP',C.ep)+comm(360,135,260,deep?'Dispatch / SymmBuffer':'MoE input','all-dispatch','域内走 SymmBuffer；通用路径通过 EPBuffer.dispatch 发送激活与 top-k。','comm')+wire('M218 352H309V159H360');b+=op(360,299,'Expert compute','all-expert','Grouped GEMM 或 Mega MoE 消费各物理专家的 token；接收量决定每专家工作形状。','comm',260)+wire('M490 183V299')+comm(360,459,260,'Combine / return','all-combine','结果按 handle 或融合路径回到原 token，包含共享分支。','comm')+wire('M490 347V459')+wire('M360 495H258');
b+=weak(deep)+tensor(360,213,'Expert weights','physical replicas','all-weights','EPLB 管理实际副本；额外容量换取更小专家尾部，并付出迁移代价。','policy','w',260)+wire('M490 286V299','weight')+tag(365,390,'receive counts → EPLB')+wire('M590 347H630V407H345V247H360','feedback')+tag(365,579,'Mega MoE 可融合此组内执行')+'</g>';
b+=frame(692,65,260,550,'OUTPUT / NEXT STEP');b+=op(752,128,'Head','all-head','模型输出用于验证草稿前缀并生成采样分布。','mtp',140)+op(752,239,'Sampler','all-sampler','采样产生接受 token、草稿与 confidence；结果进入在途 state。','worker',140)+wire('M258 510H680V152H752')+wire('M822 176V239')+tensor(722,333,'Accepted / draft','state(N)','all-state','当前轮采样输出由 ZOS 保存，供下一轮消费与修正。','worker','i',200)+wire('M822 287V333');
b+=weak(feedback)+op(752,456,'DSpark','all-dspark','total_q 由 confidence 与硬件曲线选择；GPU 修正每请求 seqlen_q 和 remap。','mtp',140)+wire('M822 406V456')+tag(719,552,'ZOS：post(N−1) 与 forward(N)')+tag(719,578,'交错；更新下轮预算与状态')+wire('M752 480H674V635H18V145H58','feedback')+'</g>';return base(b);}
const diagramFns={system:systemDiagram,execution:executionDiagram,fusion:fusionDiagram,attention:attentionDiagram,experts:expertsDiagram,wideep:wideepDiagram,communication:communicationDiagram,dspark:dsparkDiagram,zos:zosDiagram,evidence:evidenceDiagram,complete:completeDiagram};

function ascend950Detail(){
 let b=band(32,'ASCEND 950 · 专用后端执行路径',['片上融合与数据布局','放置策略与迁移能力','950DT · 专家交换','跨轮状态与验证预算'][substate]);
 if(substate===0){
 b+=tensor(40,85,'Hidden / KV','BF16 input','a-input','输入进入 Ascend 专用融合变换。','ascFusion','i',230)+wire('M270 120H340')+op(340,96,'Norm / RoPE / Cast','a-fuse','Ascend SIMD 寄存器流水覆盖 Norm、RoPE、Hadamard 与量化，减少中间数据落存。','ascFusion',300)+wire('M640 120H710')+tensor(710,85,'KV cache','values + scales','a-cache','数值与 scale 写入同一对齐 UB 行，再按有效长度 DMA 写出。','ascStore','i',230);
 b+=frame(40,220,900,160,'UB → GM / HBM · 一行合并写入');
 for(let i=0;i<16;i++)b+=rect(70+i*34,278,29,34,C.i,'none',2);
 for(let i=0;i<6;i++)b+=rect(640+i*34,278,29,34,C.a,'none',2);
 b+=txt(70,345,'量化 KV values',15,C.i)+txt(640,345,'scales',15,C.a);
 b+=op(50,439,'Scale packing','a-scale','GEMM 的两个 UE8M0 scale 打包为 int16，按 MN-major 排列；与上方 KV 行格式是不同数据契约。','ascGemm',260)+op(360,439,'mHC reduce inside','a-mhc','Ascend prenorm 默认 n_splits=1；CUDA 默认为 16。GPU Mega mHC 条件不适用于本分支。','ascMhc',270);
 b+=txt(50,548,'寄存器链 / 流水深度增加 → 并行性提高，也可能产生 spill',16)+txt(50,586,'形状与格式约束决定融合适用范围。',15,C.muted);
 }else if(substate===1){
 b+=txt(45,92,'逻辑专家 → 物理副本 → 设备执行',21);
 for(let r=0;r<3;r++){let x=45+r*310;b+=frame(x,145,270,230,'NPU RANK '+r,C.ep);for(let j=0;j<3;j++)b+=expertSlot(x+45,196+j*55,r*3+j,'a-slot'+r+j);}
 b+=comm(70,431,330,'权重搬运路径','a-migrate','不能仅凭 EPBuffer 接口同名认定权重预取迁移已实现。需单独追踪主框架采用的搬运后端。','shuffle')+wire('M400 455H490')+hit('a-limit','配套库能力边界','DeepEP-Ascend 官方说明：lb_prefetch_weights 与 lb_reduce_grads 的 Ascend 通信内核尚未实现；不能据此否定全部 EPLB，也不能宣称完整迁移重叠已落地。',rect(490,419,430,100,'#222','#aaa',8)+txt(510,454,'lb_prefetch_weights',18)+txt(510,487,'Ascend 通信内核尚未实现',16,C.muted),'ascEp');
 b+=txt(50,576,'布局策略可复用；权重迁移与计算重叠需独立确认。',18);
 }else if(substate===2){
 b+=tensor(45,92,'Token / top-k','FP8 dispatch','a-dispatch-in','FP8 激活按路由进入 EP all-to-all。','ascEp','i',240)+wire('M285 128H350')+comm(350,103,270,'UBMEM / URMA','a-fabric','950/A5 专用互联路径使用 UBMEM 与 UBC_CTP/URMA 通道。','ascEp')+wire('M620 128H700')+op(700,103,'Experts','a-experts','接收激活后执行本地专家计算；Combine 使用 BF16 返回并归约。','ascEp',230);
 b+=frame(45,224,885,237,'950DT · EP64 · 官方通信微基准');
 b+=txt(75,290,'Dispatch · FP8',18,C.i)+rect(75,310,600*325/400,23,C.i,'none',3)+txt(740,328,'323–327 GB/s',19);
 b+=txt(75,382,'Combine · BF16',18)+rect(75,402,600*296/400,23,'#aaa','none',3)+txt(740,420,'294–298 GB/s',19);
 b+=txt(50,510,'16,384 tokens/rank 容量 · H=7168 · top-6 / 256 experts',15,C.muted)+txt(50,544,'计时含 issue / drain，不含最终 epilogue；PoC HDK 手工配置。',15,C.muted)+txt(50,591,'Combine 受本地归约与 URMA / HBM 争用影响。',18);
 }else{
 b+=txt(40,115,'CPU',18)+txt(40,275,'NPU',18)+txt(40,435,'STATE',18);
 b+=event(155,86,200,'提交 forward N','a-submit','先提交当前轮主模型，再处理前一轮结果。','cpu')+event(420,86,260,'post N−1','a-post','跨轮流水仍须满足前一轮采样完成依赖。','cpu');
 b+=event(155,246,525,'forward N','a-forward','当前 NPU 执行期间可组织上一轮后处理；是否充分覆盖依赖实际工作负载。')+event(725,246,200,'sample N','a-sample','采样结果进入下一轮的状态处理。');
 b+=wire('M255 128V246')+wire('M680 267H725')+tensor(155,396,'state / input ids','ZOS metadata','a-meta','Ascend 目录提供 gather_input_ids_zos 与 compute_seqlens_k_zos 等设备侧元数据内核。','ascSchedule','i',250)+wire('M405 432H475')+op(475,408,'变长验证预算','a-budget','Ascend schedule_mtp_varlen 使用 MTE3/MTE2 核间同步组织预算相关数据依赖。','ascSchedule',310);
 b+=txt(155,535,'专用元数据内核 + 通用跨轮执行策略',20)+txt(155,578,'源码确认实现路径；暂无此处可引用的 950 端到端加速比例。',15,C.muted);
 }
 return base(b);
}
diagramFns.ascend950=ascend950Diagram;

function ascend950Diagram(){
 let b=band(30,'差异定位 · 白色外框标记平台特有实现',['mHC 归约与 KV 数据契约','专家放置与迁移能力','专家通信路径','跨轮执行与设备元数据'][substate]);
 b+=txt(250,82,'NVIDIA GPU',23,C.ink,'middle',600)+txt(730,82,'ASCEND 950',23,C.ink,'middle',600);
 b+='<path d="M490 105V607" stroke="#383838" stroke-dasharray="4 6"/>';
 const box=(x,y,w,h,label,key,body,source,color='#888')=>hit(key,label,body,rect(x,y,w,h,'#222',color,7)+txt(x+w/2,y+h/2+5,label,15,C.ink,'middle'),source);
 if(substate===0){
  for(const x of [55,535])b+=tensor(x,112,'mHC input','same model semantics','ac-input'+x,'两侧输入计算语义相同，但 prenorm 的归约分解不同。','ascMhc','i',390);
  b+=wire('M250 185V218')+wire('M730 185V218');
  for(let i=0;i<16;i++){let x=65+(i%8)*46,y=220+Math.floor(i/8)*38;b+=rect(x,y,38,29,'#444','#888',3)+txt(x+19,y+20,String(i),12,C.ink,'middle');}
  b+=txt(250,315,'16 splits → partial results',16,C.ink,'middle')+wire('M250 327V349')+box(100,349,300,46,'归约 partials','ac-partials','CUDA prenorm 默认 n_splits=16，产生 partials 供后续处理。','ascMhc');
  b+=box(565,220,330,175,'','ac-inside','Ascend 默认 n_splits=1，由内核内部完成归约。矩形表示归约范围，不表示单个硬件核。','ascMhc');
  b+=txt(730,250,'内核内完成',18,C.ink,'middle',600);
  for(let i=0;i<4;i++)b+=rect(590+i*72,273,54,28,'#666','#aaa',3)+`<path d="M${617+i*72} 301L730 336" fill="none" stroke="#eee"/>`;
  b+=rect(670,336,120,35,'#ddd','none',4)+txt(730,360,'归约结果',16,'#111','middle',600);
  b+=txt(65,438,'KV 调用侧：两个参数',15,C.muted)+box(65,463,180,56,'cache_quant','ac-quant','GPU 调用分别传入 cache_quant 和 cache_sf；参数数量不等于 DMA 次数。','ascFusion',C.i)+box(265,463,180,56,'cache_sf','ac-sf','独立 scale 参数；不能仅由接口推断底层访存次数。','ascFusion',C.a);
  b+=txt(545,438,'Ascend：同一 UB 行',15,C.muted);
  b+=hit('ac-row','values + scales → 单次 DMA','Ascend 主 KV 数值与 scale 在同一 UB 行组织，精确长度 DMA 写出有效载荷。',''+rect(545,463,370,56,'#222','#888',5)+rect(557,475,260,32,C.i,'none',2)+rect(823,475,80,32,C.a,'none',2),'ascStore');
  b+=wire('M730 519V552')+box(610,552,240,42,'HBM · KV record','ac-hbm','写出有效 payload，不将 UB 对齐 padding 写入相邻 token。','ascStore');
  b+=txt(65,566,'参数分离 ≠ 搬运次数结论',14,C.muted);
 }else if(substate===1){
  for(const x of [55,535]){
   b+=txt(x,128,'逻辑专家',14,C.muted);
   for(let e=0;e<4;e++)b+=rect(x+e*99,148,78,37,'#252326',C.ep,5)+txt(x+e*99+39,173,'E'+e,16,C.ink,'middle');
   b+=wire(`M${x+180} 185V219`)+txt(x+195,246,'副本 / rank 映射',16,C.ink,'middle');
   for(let r=0;r<2;r++){let xx=x+r*205;b+=frame(xx,275,190,180,'RANK '+r,C.ep);for(let e=0;e<2;e++)b+=expertSlot(xx+7,320+e*58,(r+e)%4,'ac-e'+x+r+e);}
  }
  b+=wire('M250 455V488')+box(65,488,380,65,'shuffle → 权重搬运路径','ac-gshuffle','专家重排实际搬运由框架 shuffle 路径组织；不能只看布局策略。','shuffle');
  b+=wire('M730 455V488')+hit('ac-unimplemented','权重预取接口尚未实现','DeepEP-Ascend 的 lb_prefetch_weights 与 lb_reduce_grads 通信内核尚未实现。这不是整个 EPLB 不可用的结论。',rect(545,488,370,65,'#222','#aaa',7,'stroke-dasharray="5 5"')+txt(730,515,'lb_prefetch_weights',16,C.ink,'middle')+txt(730,539,'Ascend 通信内核未实现',14,C.muted,'middle'),'ascEp');
  b+='<path d="M885 497L907 519M907 497L885 519" stroke="#fff" stroke-width="3"/>';
  b+=txt(250,592,'布局策略与搬运机制分别分析',14,C.muted,'middle')+txt(730,592,'虚线框：能力边界，非执行步骤',14,C.muted,'middle');
 }else if(substate===2){
  for(const x of [55,535])b+=tensor(x,112,'Token + top-k','route to expert rank','ac-token'+x,'相同专家交换语义：发送 token，执行专家，再返回来源 rank。','comm','i',390);
  b+=wire('M250 185V226')+wire('M730 185V226');
  b+=comm(65,226,380,'DeepEP / 条件式 Mega MoE','ac-gcomm','NVIDIA 路径按条件使用显式 DeepEP 或 Mega MoE；SymmBuffer 路径有域与格式条件。','comm');
  b+=comm(545,226,370,'DeepEP-Ascend','ac-ncomm','Ascend EP 提供 FP8 Dispatch、BF16 Combine 与延迟 epilogue。','ascEp');
  for(const x of [65,545]){b+=wire(`M${x+185} 274V310`);for(let r=0;r<3;r++){let xx=x+r*127;b+=frame(xx,310,115,110,'R'+r,C.ep)+matrix(xx+15,359,7,3,'w',12);}}
  b+='<path d="M122 300H376M122 300V310M249 300V310M376 300V310" stroke="#ddd" stroke-width="3" fill="none"/>';
  b+=rect(584,283,285,24,'#ddd','none',3)+txt(726,300,'UBMEM / URMA fabric',13,'#111','middle',600);
  for(let i=0;i<3;i++)b+=`<path d="M${602+i*127} 307V330" stroke="#fff" stroke-width="3"/>`;
  b+=txt(250,454,'NVLink 域 / SymmBuffer 条件',16,C.ink,'middle')+txt(730,454,'UBMEM / UBC_CTP / URMA',16,C.ink,'middle');
  b+=wire('M250 470V499')+wire('M730 470V499')+comm(65,499,380,'Combine → 原 token','ac-greturn','结果归并回来源 token。','comm')+comm(545,499,370,'BF16 Combine → 原 token','ac-nreturn','包含本地归约，并受 URMA 与 HBM 争用影响。','ascEp');
  b+=txt(250,585,'无同口径 GPU 带宽对照',14,C.muted,'middle')+txt(730,583,'950DT EP64：D 323–327 / C 294–298 GB/s',13,C.muted,'middle');
 }else{
  for(const x of [55,535]){
   b+=txt(x,131,'CPU',15,C.muted)+txt(x,258,x===55?'GPU':'NPU',15,C.muted);
   b+=event(x+5,151,145,'submit N','ac-submit'+x,'提交当前 forward 后，再处理上一轮状态。','cpu')+event(x+180,151,200,'post N−1','ac-post'+x,'上一轮后处理仍依赖其 sample 完成。','cpu');
   b+=wire(`M${x+76} 193V279`)+event(x+5,279,375,'forward N','ac-forward'+x,'同一跨轮策略：当前设备计算覆盖 CPU 后处理，不代表测量时间比例。');
   b+=wire(`M${x+190} 321V373`);
  }
  b+=box(65,373,375,95,'GPU metadata kernels','ac-gmeta','GPU 主线处理输入索引、序列长度和预算元数据。','worker');
  b+=hit('ac-nmeta','Ascend metadata kernels','独立 Ascend gather_input_ids_zos、compute_seqlens_k_zos 和变长验证预算实现；预算内核包含 MTE3/MTE2 核间同步。',rect(545,373,375,95,'#222','#888',7)+txt(732,400,'Ascend metadata kernels',16,C.ink,'middle')+rect(558,417,90,31,'#555','#ddd',4)+txt(603,438,'MTE3',14,C.ink,'middle')+rect(678,417,105,31,'#eee','none',4)+txt(730,438,'核间同步',14,'#111','middle',600)+rect(813,417,90,31,'#555','#ddd',4)+txt(858,438,'MTE2',14,C.ink,'middle')+wire('M648 432H678')+wire('M783 432H813'),'ascSchedule');
  for(const x of [65,545])b+=wire(`M${x+187} 468V509`)+tensor(x,509,'state(N) → 下一轮','accepted / draft / metadata','ac-state'+x,'当前轮状态进入下一轮消费，依赖仍被保留。','worker','i',375);
 }

 const focusKeys=[
 ['ac-partials','ac-inside','ac-quant','ac-sf','ac-row','ac-hbm'],
 ['ac-gshuffle','ac-unimplemented'],
 ['ac-gcomm','ac-ncomm'],
 ['ac-gmeta','ac-nmeta']
 ][substate];
 b=b.replace(/<g class="hit ([^"]*)" role="button" tabindex="0" data-key="([^"]+)"/g,(m,cls,key)=>`<g class="hit ${cls} ${focusKeys.includes(key)?'platform-difference':'platform-common'}" role="button" tabindex="0" data-key="${key}"`);
 const notes=[['16 路 partials → 后续归约','1 路 → 内核内归约'],['框架权重搬运路径','接口存在 · 通信内核缺失'],['域内融合路径受条件约束','950 专用互联通道'],['GPU 元数据执行','NPU 显式 MTE 核间同步']][substate];
 b+=rect(40,607,425,32,'#272727','#aaa',4)+rect(515,607,425,32,'#272727','#aaa',4)+txt(252,629,notes[0],14,C.ink,'middle',600)+txt(727,629,notes[1],14,C.ink,'middle',600);
 return base(b).replace('</defs>','</defs><style>.platform-common{opacity:.27}.platform-difference>rect:first-child{stroke:#fff;stroke-width:2.5}</style>');
}
diagramFns.ascend950=ascend950Diagram;
