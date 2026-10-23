
const paper='https://arxiv.org/html/2609.19969v1';
const chapters=[
{nav:'导读',title:'DeepSeek V4.1',subtitle:'从单层计算，到长上下文的成本优化',section:'S1',states:['架构路线'],text:['报告围绕三个问题展开：长输入如何少算，长上下文如何少存，解码如何少做重复工作。完整架构图始终保留；切换章节将在原图中定位、高亮并展开对应模块。','阅读顺序：CED → CSA2 → 分层索引 → mHC → 缓存 → 视觉与 MoE → Engram → DSpark → 系统协同。论文指标与本地源码配置分别标注；性能数字沿用论文口径。']},
{nav:'CED',title:'长输入只需完整经过因果编码器',subtitle:'Causal Encoder–Decoder · §2.2 / Figure 3',section:'S2.SS2',states:['Prefill','Decode'],text:['主干的 L0–19 是因果编码器，L20–39 是解码器。解码器的全局 KV 来源于最后一层编码器输出，因此无需让全部 prompt 逐层经过解码器来产生全局 KV。','局部 SWA 仍依赖各解码层自己的隐状态。部署时对末尾窗口执行 bounded replay，补齐解码所需局部状态。长输入的计算量近似从 N×L 降至 N×L/2 + W×L/2；这不等于所有请求延迟都固定减半。']},
{nav:'CSA2',title:'缓存复用与索引复用是两种不同的节省',subtitle:'Compressed Sparse Attention 2 · §2.3.1 / Figure 4',section:'S2.SS3.SSS1',states:['Full · L20','Reindex · L24','Reuse · L25'],text:['Full 产生 Main KV、Indexer K 和 Top-K。Reindex 保留共享 KV，用本层 Indexer Q 重新打分；Reuse 同时读取共享 KV 与最近一次索引结果，省去本层索引计算。','三种模式都保留本层 Main Q 与局部 SWA KV。选层配置固定：KV 源为 L2、L8、L14、L20；额外索引源为 L24、L28、L32、L36。复用的对象从左侧进入当前层，避免把不同层画成同一个计算模块。']},
{nav:'分层索引',title:'先限定候选域，再在候选域中重新选择',subtitle:'Hierarchical Sparse Indexer · §2.3.2 / Figure 5',section:'S2.SS3.SSS2',states:['L20 全域评分','候选块筛选','L24 候选域评分'],text:['L20 对因果可见的位置评分，既得到自己的 Top-512，也按每个块内的最大分数选出 2,048 个块。每块 8 个位置，候选池最多含 16,384 个位置。','L24 等 Reindex 层只在相应 query 的候选池内重新评分并取 Top-512。后续索引的搜索量被候选池限制，但 L20 仍执行全域扫描；候选池与最终 Attention 读取集合是两个不同对象。']},
{nav:'mHC',title:'将输入混合系数前移，解除融合的数据依赖',subtitle:'Single-Pass mHC · §2.4.1 / Equations 2–6',section:'S2.SS4.SSS1',states:['V4 依赖','V4.1 前移'],text:['每个 token 保留四路 d 维残差。A 将四路读成一路，计算分支执行 Attention 或 MoE，C 将结果写回四路，B 混合旁路；两路结果在圆形加号处合并。','V4.1 的分支输入使用前一 block 生成的 A，而当前 block 继续预测新的系数。部署 Mega-mHC 可融合残差更新、输入混合、系数预测及输入预归一化。论文在 n=4 时的激活读写口径由 20d 降至 10d；这是该操作的访存量，不能当成整网加速倍数。']},
{nav:'缓存',title:'将精度压缩与缓存生命周期分开优化',subtitle:'FP4 Main KV & SWA Bounded Replay · §2.4.4 / §3.2',section:'S3.SS2',states:['运行时缓存','持久化与恢复'],text:['Main KV 使用 E2M1，每 16 通道配一个 E4M3 scale，注意力前反量化；SWA KV 保留 FP8。跨层共享与精度压缩共同作用，论文报告 global KV 为 890 bytes/token，约为 V4-Flash 的 1/4。','持久化缓存主要保留 global KV；局部 SWA 状态采用短生命周期管理，缺失时重放最近 W=128 个 token。Bounded Replay 是近似恢复，不与完整前向数学等价。论文报告相同工作负载下 persistent KV 约为 V4 的 1/8，不能与 global KV 比例再次相乘。']},
{nav:'视觉 · MoE',title:'视觉先压缩 token，专家路由按模态平衡',subtitle:'Multimodal architecture · §2.1.1',section:'S2.SS1.SSS1',states:['视觉输入','MoE 路由'],text:['DeepSeek-ViT 用 2D-RoPE 处理空间位置；本地配置为 32 层、隐藏维度 1024。3×3 pixel-unshuffle 将九个空间位置并入通道，再由 MLP projector 映射至主干 5120 维，视觉 token 数减少为原来的 1/9。','主干每层有 384 个路由专家，每个 token 选择 6 个，另有 1 个共享专家。论文为图像和文本分别维护专家选择修正偏置，分别更新负载；输出加权仍使用原始路由分数。不同模态的负载平衡与单 token 的专家计算量分开理解。']},
{nav:'Engram',title:'用可预取的条件存储补充神经计算',subtitle:'Conditional memory · §2.4.2 / §3.1.3',section:'S2.SS4.SSS2',states:['寻址与读取'],text:['Engram 在 L1 与 L14 注入 N-gram 条件记忆：tokenizer compression → 多头 hash → 表读取 → 上下文门控 → 分支融合。寻址由 token 序列决定，可提前发起读取，与主干计算重叠。','论文给出 196B Engram 参数，与 552B 主干参数分开统计。V4.1 去掉短因果卷积，并使用 momentum + Sinkhorn balancing 更新大表。容量增加主要来自存储，不等于每个 token 都激活全部表参数。']},
{nav:'DSpark',title:'一次提出多个候选，再按置信度安排验证',subtitle:'Speculative decoding · §2.4.3',section:'S2.SS4.SSS3',states:['并行草拟','调度验证'],text:['DSpark 用 3 个 Transformer block 在一次前向中计算 5 个草拟位置的基础 logits，轻量 Markov head 建模草拟 token 之间的依赖。置信度头估计各位置接受概率，再形成前缀存活概率。','验证长度还结合引擎吞吐曲线与当前负载选择，因此固定草稿宽度不等于固定接受长度或固定加速倍数。当前 Pattern 展示 forward_spec 计算分支；本地 generate.py 使用常规自回归采样，论文的服务调度不能直接从此图推定已启用。']},
{nav:'系统协同',title:'节省的计算与状态，需要系统实现兑现',subtitle:'Training & inference infrastructure · §2.5 / §3',section:'S3',states:['训练','推理'],text:['跨层共享跨越 pipeline stage 时，shadow indexer 保留单一参数 owner，副本同步参数并归并梯度；共享张量随 pipeline payload 传递，并按 micro-batch 管理生命周期。视觉编码执行解耦，图像分片与预取减少数据准备干扰。','推理侧通过 Mega-mHC、Mega-MoE 等融合减少启动与访存开销。论文的 CSA2 Reuse 层为 prefill 15 个 kernel、decode 11 个 kernel；这些是论文实现的计数，源码图的一个 OP 不等于一个设备 kernel。训练侧按参数类型选择 head-wise Muon、Sinkhorn-balanced update 或 AdamW。']},
{nav:'架构浏览',title:'回到具体的一层，核对来源与依赖',subtitle:'当前 V4.1 Pattern · 自由浏览',section:'S2',states:['Layer explorer'],text:['保留当前 Pattern 的 Layer selector、L0/L1/L2、模块展开、两行 Tensor 标签、侧边输入、残差合并、路径高亮与源码面板。一次呈现选中的主干层，跨层复用通过来源张量表达。','可依次查看 L20 Full、L24 Reindex、L25 Reuse，再对照相应章节。概念报告中的成本分析来自论文；此处节点与 shape 来自固定版本源码。']}
];
let page=0,sub=0,zoom=1,dx=0,dy=0,drag=null;const $=id=>document.getElementById(id);const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const guideSpecs=[
 ()=>({targets:['$layer','view/reference']}),
 ()=>({layer:sub?24:19,targets:['$layer','v41/expand']}),
 ()=>({layer:[20,24,25][sub],open:['$layer/attn'],targets:['$layer/attn','view/reference']}),
 ()=>({layer:sub===2?24:20,open:['$layer/attn','$layer/attn/index'],targets:['$layer/attn/index','view/reference']}),
 ()=>({layer:24,targets:['$layer/attention','view/reference']}),
 ()=>({layer:24,open:['$layer/attn','$layer/attn/window'],targets:sub?['$layer/attn/window']:['$layer/attn/shared_kv','$layer/attn/window','view/reference']}),
 ()=>sub?({layer:24,open:['$layer/moe','$layer/moe/gate'],targets:['$layer/moe']}):({open:['v41/vision','v41/vision/align'],targets:['v41/images','v41/vision','v41/merge']}),
 ()=>({layer:14,open:['$layer/engram','v41/hash'],targets:['$layer/engram','v41/hash']}),
 ()=>({open:['v41/dspark'],targets:['v41/main_hidden','v41/dspark']}),
 ()=>({layer:24,targets:sub?['$layer/attention','$layer/ffn']:['$layer','view/reference']}),
 ()=>({targets:[]})
];
window.addEventListener("message",e=>{if(e.source===$("explorer").contentWindow&&e.data?.type==="v41-guide-ready")applyGuide();});
function applyGuide(){const api=$('explorer').contentWindow?.V41Guide;if(api)api(guideSpecs[page]());}

const insights=[
 ['先看成本，再看模块','V4.1 将长上下文成本拆成计算、缓存和读取三类，分别优化。',['CED：减少长输入经过的计算层数','CSA2：减少重复生成的 KV 与索引','FP4 / Replay：降低状态保存成本'],'切换章节，左侧会定位具体实现。'],
 ['全局 KV 提前生成','长 prompt 完整运行编码器；解码器全局 KV 可直接从编码器末层输出投影。',['全局路径：编码器输出 → 解码器 KV','局部路径：末尾 128 tokens → Decoder SWA'],'长输入下，prefill 计算近似减半；实际延迟还取决于工作负载。'],
 ['共享缓存 ≠ 共享选择','Reindex 保留 KV 共享，同时允许本层重新决定关注哪些位置。',['Main Q 与 SWA KV：每层自己计算','Main KV / Indexer K：读取最近 Full 层','Top-K：本层生成，或复用最近索引源'],'少存一份缓存与少做一次索引，是两种独立收益。'],
 ['候选池大于最终选择','先缩小搜索域，再从域内挑选真正参与注意力的条目。',['L20：全域评分，同时产生候选块','2,048 块 × 8 位置：最多 16,384 候选','L24 等层：候选域内重新选 Top-512'],'后续索引工作量有上界；首个 Full 层仍需全域扫描。'],
 ['把等待依赖移到前一 block','本层输入混合读取 Aₗ₋₁，使输入混合无需等待本层系数归约。',['A：四路残差读成一路计算输入','B：混合四路旁路；C：将分支结果写回','圆形 ＋：合并两路四流结果'],'减少的是 mHC 激活读写；不能等同于整网快一倍。'],
 ['压缩精度，分开生命周期','Global KV 适合长期保存；局部 SWA 状态在缺失时可重建。',['Main KV：FP4 + 分组 scale','SWA KV：FP8，保留局部精度','Replay：最近 128 tokens，近似恢复'],'1/4 global 与 1/8 persistent 是不同口径，不能再相乘。'],
 ['先压缩视觉位置，再按模态路由','视觉 token 进入主干前压缩；进入 MoE 后分别平衡文本与图像的专家负载。',['3×3 pixel-unshuffle：空间位置减少为 1/9','Projector：映射至主干 5120 维','384 路由专家选 6，另有 1 个共享专家'],'模态修正偏置影响专家选择，输出加权仍用原始路由分数。'],
 ['地址可提前算，读取可提前发起','N-gram 的寻址只依赖 token 序列，可与主干计算重叠。',['L1 / L14 注入条件记忆','Hash → 表读取 → 上下文门控 → 融合','大表容量与单 token 激活量分开统计'],'196B 是 Engram 表参数规模，不是每个 token 的计算量。'],
 ['草稿并行，验证长度动态选择','五个草拟位置提供候选；置信度与引擎状态共同决定验证多少。',['3 个 block：一次产生 5 个位置的 logits','Markov head：补充草拟 token 间依赖','置信度 + 吞吐曲线：安排验证长度'],'5 个草拟位置不等于每次接受 5 个 token，也不等于 5 倍加速。'],
 ['共享状态必须跨阶段保持一致','结构上的复用需要参数同步、状态生命周期和 kernel 融合共同支持。',['训练：单一 owner，副本同步与梯度归并','共享状态：按 micro-batch 跟踪最后消费者','推理：融合算子，减少启动和访存开销'],'架构图的一个 OP，不等于设备上的一个 kernel。'],
 ['用单层检验跨层关系','从来源 Tensor 出发，跟随依赖检查当前层真正读取和生成的对象。',['L20：Full，建立共享全局状态','L24：Reindex，共享 KV、更新选择','L25：Reuse，共享 KV 与 Top-K'],'点击节点查看源码；展开子层查看局部计算。']
];
function readingVisual(){
 const flow=(items)=>`<div class="read-flow">${items.map((t,i)=>`${i?'<span class="read-arrow">↓</span>':''}<div>${t}</div>`).join('')}</div>`;
 const bars=(items,unit)=>`<div class="read-bars">${items.map(([label,value,max])=>`<div><span>${label}</span><strong>${value}${unit}</strong><i style="--bar:${value/max*100}%"></i></div>`).join('')}</div>`;
 switch(page){
 case 0:return flow(['计算 · CED','状态 · CSA2 + FP4','恢复 · Bounded Replay']);
 case 1:return flow(sub?['新 token','Encoder · 20 层','Decoder · 20 层']:['Prompt · N tokens','Encoder · 20 层','全局 KV 投影 + 末尾窗口 Replay']);
 case 2:return `<table class="read-table"><thead><tr><th>对象</th><th>${['Full','Reindex','Reuse'][sub]}</th></tr></thead><tbody><tr><td>Main KV / Index K</td><td>${sub?'复用':'生成'}</td></tr><tr><td>Top-K</td><td>${sub===2?'复用':'生成'}</td></tr><tr><td>Main Q / SWA KV</td><td>本层生成</td></tr></tbody></table>`;
 case 3:return flow(['因果可见位置','2,048 块 × 8 = 16,384 候选','Top-512 → Attention']);
 case 4:return bars([['V4 · 原始实现',20,20],['V4.1 · Single-Pass',10,20]],'d')+'<small>n = 4；mHC 激活读写量</small>';
 case 5:return `<div class="read-metrics"><div><strong>${sub?'≈ 1/8':'890'}</strong><span>${sub?'Persistent KV / V4':'bytes / token · Global KV'}</span></div></div><small>${sub?'论文同工作负载对比':'论文口径；Global KV 约为 V4 的 1/4'}</small>`;
 case 6:return sub?flow(['Token → Router','384 中选择 6 个 + 1 共享专家','按原始分数加权合并']):flow(['9 个空间位置','Pixel-unshuffle → 1 个位置','Projector → 5120 维']);
 case 7:return flow(['Token 序列 → N-gram Hash','表地址 → 预取','上下文门控 → 主干残差']);
 case 8:return flow(sub?['接受概率 → 前缀存活率','引擎吞吐曲线 + 当前负载','选择验证长度']:['3 个草拟 block','5 个位置并行 logits','Markov head → 候选序列']);
 case 9:return sub?bars([['Prefill',15,15],['Decode',11,15]],'')+'<small>论文 CSA2 Reuse 层的 kernel 数</small>':flow(['单一参数 owner','跨 stage 副本 + 共享 payload','micro-batch 生命周期']);
 default:return flow(['Full · L20','Reindex · L24','Reuse · L25']);
 }
}
function renderReading(c){let [title,lead,steps,gain]=insights[page];if(page===2){lead=['Full 在当前层建立 KV 与稀疏选择，供后续层读取。','Reindex 读取共享 KV，用本层 Indexer Q 更新稀疏选择。','Reuse 同时读取共享 KV 与已有 Top-K，跳过本层索引计算。'][sub];steps=['Main Q 与 SWA KV：每层自己计算',sub?'Main KV / Indexer K：读取最近 Full 层':'Main KV / Indexer K：当前 Full 层生成',sub===2?'Top-K：读取最近索引源':'Top-K：本层评分并生成'];}return `<div class="read-kicker">本节要点</div><h2>${title}</h2><p class="read-lead">${lead}</p><figure class="reading-visual"><figcaption>${c.states[sub]}</figcaption>${readingVisual()}</figure><h3>沿图理解</h3><ol class="read-steps">${steps.map(t=>`<li>${t}</li>`).join('')}</ol><div class="read-gain"><h3>收益与边界</h3><p>${gain}</p></div><details class="read-more"><summary>展开完整解释</summary>${c.text.map(t=>'<p>'+t+'</p>').join('')}</details><a target="_blank" rel="noopener" href="${paper}#${c.section}">论文对应章节 ↗</a>`;}
function render(){const c=chapters[page];$('title').textContent=c.title;$('subtitle').textContent=c.subtitle;$('count').textContent=String(page+1).padStart(2,'0')+' / '+chapters.length;$('copy').innerHTML=renderReading(c);$('states').innerHTML=c.states.length>1?c.states.map((s,i)=>`<button data-state="${i}" aria-pressed="${i===sub}">${s}</button>`).join(''):'';$('states').querySelectorAll('button').forEach(b=>b.onclick=()=>{sub=+b.dataset.state;render()});$('nav').innerHTML=chapters.map((c,i)=>`<button data-page="${i}" aria-current="${i===page?'step':'false'}">${String(i+1).padStart(2,'0')} ${c.nav}</button>`).join('');$('nav').querySelectorAll('button').forEach(b=>b.onclick=()=>{page=+b.dataset.page;sub=0;render()});if(!$('explorer').srcdoc){$('explorer').onload=applyGuide;$('explorer').srcdoc=new TextDecoder().decode(Uint8Array.from(atob(PATTERN),c=>c.charCodeAt(0)));}else applyGuide();$('selected').textContent='同一张架构图 · 章节定位并高亮模块 · 可继续展开或拖拽浏览';}
function stepReading(dir){if(dir>0){if(sub<chapters[page].states.length-1)sub++;else if(page<chapters.length-1){page++;sub=0;}}else{if(sub>0)sub--;else if(page>0){page--;sub=chapters[page].states.length-1;}}render();}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('infoPanel').hidden=true;$('info').setAttribute('aria-expanded','false');return}if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,textarea,[contenteditable]'))return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();stepReading(e.key==='ArrowRight'?1:-1)}if(e.key==='Enter'&&e.target.dataset.detail)$('selected').textContent=e.target.dataset.detail;});
$('info').onclick=()=>{const h=!$('infoPanel').hidden;$('infoPanel').hidden=h;$('info').setAttribute('aria-expanded',String(!h));};document.addEventListener('click',e=>{if(!e.target.closest('#infoPanel,#info')){$('infoPanel').hidden=true;$('info').setAttribute('aria-expanded','false')}});render();

const backLink=document.getElementById('back-architecture');
if(backLink){let destination='../../../patterns/model-architecture-v41/index.html';try{const raw=new URLSearchParams(location.search).get('returnTo');if(raw){const u=new URL(raw);if(['http:','https:'].includes(u.protocol)&&u.pathname.includes('/model-architecture-v41/'))destination=u.href;}}catch{}backLink.href=destination;}
