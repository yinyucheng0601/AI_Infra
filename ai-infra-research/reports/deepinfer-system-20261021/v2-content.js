const REV='9bd9cf243fc53ef9afbf8f04d391d989117d6ab9';
const ROOT=`https://github.com/deepseek-ai/DeepInfer/blob/${REV}/`;
const V4='deepinfer/model_executor/models/v4_modules/';
const refs={
 readme:['开源范围与默认开关','README.md',1,48],
 architecture:['生产系统与并行部署','doc/inference_deployment_qa.md',25,70],
 eplbdoc:['EPLB 的生产参数与负载比','doc/inference_deployment_qa.md',92,106],
 precision:['FP4 的实际存储对象','doc/inference_deployment_qa.md',212,234],
 dsparkdoc:['DSpark：负载与收益数据','doc/inference_deployment_qa.md',239,264],
 zosdoc:['异步调度设计','doc/inference_deployment_qa.md',266,276],
 engine:['LLMEngine.step','deepinfer/engine/llm_engine.py',860,983],
 worker:['Worker.execute_model_step','deepinfer/worker/worker.py',89,187],
 hc:['HC 融合条件与 Mega mHC',V4+'hc.py',174,315],
 attn:['Prefill / Decode Attention',V4+'attn.py',589,670],
 backend:['FlashMLA 调用与融合接口','deepinfer/model_executor/layers/attention_backend.py',1,155],
 index:['稀疏 logits 与候选选择',V4+'index_attn.py',284,376],
 gate:['逻辑专家与物理槽位映射',V4+'mlp.py',174,255],
 route:['Gate 与 grouped GEMM',V4+'mlp.py',359,459],
 comm:['Dispatch / Combine 与 Mega MoE',V4+'mlp.py',461,616],
 policy:['复制与放置算法','deepinfer/model_executor/eplb/policy.py',12,144],
 shuffle:['专家权重搬运','deepinfer/model_executor/eplb/shuffle.py',1,160],
 balance:['统计窗口与周期重排','deepinfer/model_executor/eplb/__init__.py',131,289],
 mtp:['MTPVarlen::schedule','csrc/engine/mtp_varlen.hpp',150,280],
 bench:['官方 benchmark 扫描配置','examples/sweep/run_sweep.sh',1,100],
 cp:['CPManager 的 token 轴 gather','deepinfer/model_executor/parallel_utils/cp.py',1,58]
};
const chapters=[
 {id:'cover',nav:'封面',group:'DEEPINFER / SYSTEM STUDY'},
 {id:'system',nav:'系统结构',group:'01 / SYSTEM & DEPLOYMENT',title:'DeepInfer 位于怎样的推理系统中？',sub:'先定位真实组件，再进入一张卡上的执行。',h:'Prefill 与 Decode 的设备组织，从一开始就不同。',p:[
 '官方生产系统把 Vision Encoder、Prefill、Decode 分开部署，并通过独立 KV 存储复用前缀。Attention 在每个 DP rank 上处理本地请求，MoE 把这些 rank 连接成专家并行组；同一组设备切换子层的分工。',
 'Prefill 选择 HBM 容量允许的较小 EP2–8；Decode 选择 EP64–128。这里的差异会一路影响专家的矩阵形状、权重读取量、通信范围和批次调度。开源仓库交付离线引擎核心，生产 KV 系统、完整 E/P/D 分离与跨实例负载均衡仍需额外服务。'],
 take:'读系统结构时，先抓住“本地 Attention → 跨卡 MoE → 返回本地请求”这条反复执行的主干。',trade:'独立部署使 TTFT 与逐 token 延迟可以分别配置资源，同时增加状态移交、缓存恢复和路由开销。',formula:'Prefill：EP2–8 / DP2–8\nDecode：EP64–128 / DP64–128',sources:['architecture','readme'],states:['生产部署','开源引擎范围']},
 {id:'execution',nav:'一次执行',group:'02 / FOLLOW ONE DECODE STEP',title:'跟随一轮 Decode，找到四项优化的位置',sub:'从 CPU 的批次决策，走到接受 token 和下一轮状态。',h:'四项优化介入的是同一条执行链。',p:[
 'LLMEngine.step 调用 C++ scheduler，输出本轮 SequenceMetadata 与 SchedulerOutputs。Worker 随后修正查询长度和位置，调用主模型，再执行采样。图中把重复模型层折叠为一个层段，沿同一轮次逐步展开。',
 '在层内，HC 为 Attention 和 MoE 准备输入。Attention 访问本地请求的 KV，Gate 选择逻辑专家，EPLB 把选择映射到物理副本；MoE 执行后返回本地隐藏状态，输出头与采样器完成验证、接受和下一轮状态更新。'],
 take:'算子决定每段工作做得多快；专家分布决定谁拖尾；通信决定数据何时到达；调度决定做多少工作以及何时提交。',trade:'层内路径、跨卡通信与跨轮 CPU/GPU 流水存在不同依赖，必须分别定位，才能解释端到端收益。',formula:'schedule → metadata → repeated layers → verify / sample\n每层：HC → Attention → HC → Gate → MoE',sources:['engine','worker','hc','comm'],states:['批次与元数据','Attention','Gate 与专家','验证与采样']},
 {id:'fusion',nav:'融合与布局',group:'03 / OPERATOR EFFICIENCY',title:'Mega mHC 把子层边界变成一个融合入口',sub:'观察真正被消除的中间边界，以及直接写给下一消费者的数据。',h:'减少中间写回，还要对齐下一内核的输入布局。',p:[
 'HCLayerMixin._hc_fused_post_pre 检查是否存在完整 lazy post 数据、是否启用 Mega mHC，以及是否存在中途 intervention。满足条件后，上一子层 post、当前 pre、RMSNorm 与可选 FP8 cast 通过 deep_gemm.mega_mhc 完成。',
 '面向 Mega MoE 时，cast_kwargs 指定 sym_buffer.x 与 scale-factor 输出位置。融合结果直接满足后续消费者的指针和布局契约，避免先产生通用中间表示再搬运。分支仍保留 BF16 结果供 Gate 使用；FP8、routed/shared scale 与新残差各有独立去向。'],
 take:'融合的关键是跨操作边界保留数据，减少中间张量往返，同时生产下一计算所需的格式。',trade:'首层缺少前一子层的 lazy post 数据；Engram 等 intervention 需要插入处理时，也不能进入同一融合内核。',formula:'post(prev) + pre(curr) + RMSNorm + optional cast\n→ BF16 / FP8 + scale / updated residual',sources:['hc','gate'],states:['逻辑操作边界','Mega mHC 融合','消费者布局']},
 {id:'attention',nav:'Attention 访存',group:'04 / OPERATOR EFFICIENCY',title:'稀疏 Attention 的收益，取决于实际访问的 KV',sub:'从压缩块与 SWA 窗口，看 Indexer 如何决定 FlashMLA 的输入。',h:'候选选择、低精度存储和注意力内核共同缩小工作量。',p:[
 'V4Attention 把 SWA KV 与压缩 KV 分开管理。稀疏分支由 MQA indexer 计算候选 logits、选出索引；decode_mla_mqa_sparse 接收 paged cache、索引以及 FlashMLA 调度元数据。计算依据选中的位置访问缓存，避免仅在图上声称“稀疏”。',
 '官方说明 main KV 使用 per-16、e4m3 scale 的 FP4；indexer KV 与 routed-expert 权重使用 per-32、ue8m0 的 MXFP4。Prefill 与 Decode 分别调用不同接口，满足条件时还可把 Q Norm、RoPE、Attention 与输出 cast 融合。'],
 take:'性能分析应同时看读取多少 KV、索引生成付出多少工作，以及实际落到哪个 Attention 内核。',trade:'压缩和低精度减少存储及读取量，但增加 scale、索引、布局转换与内核适配约束；不同层的共享关系也会改变实际路径。',formula:'压缩候选索引 + SWA 索引 → FlashMLA\nPrefill：varlen sparse / Decode：paged KV',sources:['attn','index','backend','precision'],states:['KV 与候选索引','Prefill / Decode 接口']},
 {id:'experts',nav:'专家放置',group:'05 / EXPERT DISTRIBUTION',title:'EPLB 如何让热点专家不再集中拖慢少数 rank？',sub:'逻辑专家保持身份；副本数、物理位置和每卡接收量发生变化。',h:'先决定复制谁，再决定各副本放在哪张卡。',p:[
 'Gate 选择逻辑专家，logical_to_physical_map 和 logical_count 把它映射到真实槽位。policy.py 依据历史 token 负载贪心选择冗余副本，再把物理专家按每副本负载排序，分配到每卡固定容量的槽位。',
 '放置评分把每个历史 step 的最慢 rank 负载相加，因此保留时间窗口中的负载差异。右图固定三步输入、8 个逻辑专家与 12 个物理槽，按源码的复制和放置规则计算前后结果；条宽只编码窗口平均调用量。'],
 take:'优化目标对应专家阶段的尾部，而不是让专家数量看起来平均。每卡槽数相同，接收的 token 仍可能相差很大。',trade:'额外副本占用 HBM；shuffle.py 通过 NCCL P2P 或域内 symm_mem/IPC 搬运权重。重排频率需要在热点响应速度与迁移代价之间选择。',formula:'评分 = Σstep maxrank(该 rank 的专家负载)\n约束：每个 rank 固定物理槽位数',sources:['policy','route','balance','shuffle'],states:['重排前','复制与放置后']},
 {id:'wideep',nav:'Wide-EP',group:'06 / EXPERT DISTRIBUTION × COMMUNICATION',title:'为什么 Decode 要把 EP 扩大到 64–128 卡？',sub:'同一批请求从各卡 Attention 汇入专家组，再回到来源 rank。',h:'分摊权重读取，同时让专家从更多请求汇集 token。',p:[
 '每卡 Attention 服务本地请求。进入 MoE 后，各卡选中同一个逻辑专家的 token 汇集到该专家的物理副本。扩大 EP 将专家权重分摊到更多卡；固定每卡并发时，全组提供的 token 也增加，有利于改善专家 GEMM 的 M 维。',
 '官方 Decode 配置在 EP64 时每卡为 7 个物理专家槽（不含共享专家），统计窗口 1,000 步、每 10,000 步重排，披露 moe_lb 为 1.090。Prefill 使用更小的 EP，并采用 100 步窗口、每 1,000 步重排。'],
 take:'Wide‑EP 的收益需要带宽、并发和 EPLB 同时配合。单卡参数读取减少以后，通信和专家尾部的权重会变大。',trade:'固定全局并发时扩大 EP，不会自动增加每专家 token 数。扩大通信域也增加故障与协调影响，需结合部署条件判断。',formula:'Tglobal = EP × 每卡 token 数\n每专家平均调用量 ≈ Tglobal × top-k / 专家数',sources:['architecture','eplbdoc','gate','cp'],states:['Prefill · EP2–8','Decode · EP64–128']},
 {id:'communication',nav:'MoE 通信',group:'07 / COMMUNICATION × OPERATOR EFFICIENCY',title:'Mega MoE 将跨卡交换与专家计算共同组织',sub:'用相同输入输出，对照两条真正存在于源码中的路径。',h:'同一 NVLink 域内，优先进入融合执行路径。',p:[
 'use_mega_moe 检查硬件、MMA 数据类型及 EP 组是否处于同一 NVLink 域。满足条件时，gate 把 top-k 写入 SymmBuffer，mega_moe_func 直接消费输入、两组专家权重和共享专家参数，完成融合执行。',
 '通用路径显式调用 EPBuffer.dispatch → grouped GEMM → SwiGLU / cast → grouped GEMM → EPBuffer.combine。dispatch 返回 handle 与分组 token 计数；combine 用 handle 恢复来源位置，并把 shared expert 结果作为 bias 合入。'],
 take:'通信优化必须贯穿路由、专家计算和回传；只缩短 dispatch API 的耗时，无法解释整个 MoE 分支的完成时间。',trade:'通用路径仍有 current_stream_wait 与事件依赖。通信使用 SM 预算，与专家计算可能争用资源；异步调用本身不保证通信全部被隐藏。',formula:'Mega：Gate → SymmBuffer → mega_moe_func\n通用：Dispatch → Grouped compute → Combine',sources:['gate','comm'],states:['DeepEP 显式路径','Mega MoE 域内融合']},
 {id:'dspark',nav:'DSpark 预算',group:'08 / SCHEDULING: HOW MUCH TO VERIFY',title:'DSpark 根据接受概率分配验证算力',sub:'把“最多生成 5 个草稿”与“本轮验证多少个”分开。',h:'选择最大化有效 token 吞吐的验证预算。',p:[
 'Confidence Head 估计草稿 token 的接受概率。MTPVarlen::schedule 把概率与 profiled decode 曲线结合，并用历史 forward 与 sampler 时间修正成本，选择预期接受 token 数除以估计耗时最大的 total_q。每个请求至少保留一个基础位置。',
 '调度器区分预算与逐请求长度：CPU 用 N−2 轮信息选择总预算。在 ZOS 模式下，较新的 confidence 尚未回到 CPU，GPU 再修正每个请求的 seqlen_q 与 remap，并回填 pinned buffer，使采样使用一致的布局。'],
 take:'高置信候选值得验证，低置信候选会增加计算却很少增加接受 token。最佳预算还会被设备的实际执行曲线改变。',trade:'变长验证增加排序、重映射和元数据处理成本。低并发下，减少验证量未必抵消这些成本；下一章用官方数据检验。',formula:'目标：max  E[接受 token] / (forward_ms + sampler_ms)\nCPU 定 total_q → GPU 修正每请求长度',sources:['mtp','worker','dsparkdoc'],states:['草稿与置信度','总预算与长度修正']},
 {id:'zos',nav:'ZOS 流水',group:'09 / SCHEDULING: WHEN TO EXECUTE',title:'ZOS 将 CPU 后处理移动到下一轮 GPU 执行窗口',sub:'对照真实提交顺序，理解气泡为何有机会被覆盖。',h:'当前 forward 已提交时，再消费上一轮采样结果。',p:[
 'Worker.execute_model_step 的顺序是 execute_main_model → _post_process_step(prev_step_state) → execute_sample → 保存 curr_step_state。ZOS decode 的当前后处理留给下一步，使 CPU 更新上一轮账本时，GPU 可以执行当前主模型。',
 '_post_process_step 仍同步上一轮 sample_end_evt；_correct_seqlens_qk 修正查询、KV 长度和 remap。DeferredRelease 延后释放在途引用。性能收益来自同步位置和流水顺序的改变，同时保持这些数据依赖。'],
 take:'DSpark 决定本轮做多少验证，ZOS 决定这些工作与 CPU 调度如何交错；两者通过 seqlen_q 与 remap 接合。',trade:'CPU 工作超过设备覆盖窗口、等待事件未完成或整理元数据过重，仍会出现气泡。“zero-overhead”描述优化目标。',formula:'当前：launch forward(N) → post(N−1) → launch sample(N)\n保留 state(N)，供下一轮消费',sources:['worker','engine','zosdoc'],states:['同步串行','ZOS 跨轮重叠']},
 {id:'evidence',nav:'性能证据',group:'10 / OFFICIAL PERFORMANCE EVIDENCE',title:'动态验证的收益，随并发水平变化',sub:'官方 EP64 / DP64 数据：用有效吞吐检验工作量削减。',h:'减少验证 token 数，并不等于等比例提升吞吐。',p:[
 '官方 Q&A 对照 fixed‑5 与动态验证。60 条序列/rank 时，平均验证长度由 5.00 降到 3.58，平均接受长度由 3.30 变为 3.21，估算吞吐从 13,730 升至 14,466 token/s/rank，提升 5.4%。',
 '16 条序列/rank 时收益为 −1.5%；96 条时为 +11.0%。这组变化支持“按负载决定验证预算”，也说明要把草稿接受质量、硬件利用率与调度附加工作放在同一个端到端指标中观察。'],
 take:'算子、专家、通信与调度的局部优化，最终都要回到满足延迟要求下的有效 token 吞吐。',trade:'这里复绘 Q&A 的估算吞吐表。README 的 prefill / decode 图分别使用 4 / 64 张 SM100，同属 scale-up 域，不能当作同资源规模的横向对照。',formula:'吞吐口径：token/s/rank\n并发口径：sequences/rank · EP64/DP64',sources:['dsparkdoc','readme','bench'],states:['16','32','48','60','72','96']},
 {id:'complete',nav:'完整执行图',group:'11 / INTEGRATED EXECUTION MAP',title:'回到完整执行图：四项优化怎样一起生效？',sub:'先沿激活主干阅读，再打开专家与跨轮控制关系。',h:'性能由计算、分布、数据就绪与工作预算共同决定。',p:[
 '本地残差经 HC 进入 Attention，再经 HC 和 Gate 进入跨卡专家阶段；结果回到本地，经过后续层、输出头与采样。参数读取、KV 访问、专家映射与采样结果分别接入对应消费者。',
 'EPLB 从接收计数反馈到物理专家放置；DSpark 从 confidence 和执行曲线决定下一轮验证预算；ZOS 用在途状态把当前设备工作与前一轮 CPU 后处理连接起来。选择不同观察层，可逐项回看这些关系。'],
 take:'DeepInfer 的高性能来自边界之间的协同：更少的中间读写、更均衡的专家尾部、更紧密的通信计算组织，以及更合适的验证预算和提交顺序。',trade:'判断一次修改是否有效，应保持模型、精度、拓扑与流量口径一致，检查 TTFT/TBT、接受 token/s、MoE 负载比和暴露的通信/CPU 等待。',formula:'算子效率 × 专家分布 × 通信组织 × 调度策略\n→ 满足延迟约束下的有效推理吞吐',sources:['hc','attn','comm','balance','mtp','worker'],states:['计算主干','专家与通信','调度反馈']}
];
const perf=[
 {c:16,v:4.44,a:3.24,fa:3.32,f:4891,d:4816,g:-1.5},
 {c:32,v:3.65,a:3.17,fa:3.25,f:8964,d:9111,g:1.6},
 {c:48,v:3.94,a:3.26,fa:3.30,f:12032,d:12467,g:3.6},
 {c:60,v:3.58,a:3.21,fa:3.30,f:13730,d:14466,g:5.4},
 {c:72,v:3.24,a:3.12,fa:3.29,f:14962,d:15961,g:6.7},
 {c:96,v:3.24,a:3.15,fa:3.30,f:16817,d:18660,g:11.0}
];
const inputHistory=[[40,4,6,8,4,4,6,8],[35,5,5,10,6,4,6,9],[30,10,4,10,8,5,7,6]];
// Fixed-case replay of policy.py: replicate using sum of per-step peaks, then place by batch-greedy scoring.
function placement(){let count=Array(8).fill(1),map=Array.from({length:8},(_,i)=>i);
 for(let extra=0;extra<4;extra++){let scores=count.map((_,e)=>inputHistory.reduce((sum,row)=>{const load=row.map((v,j)=>(v+j*1e-4)/count[j]),mx=load.indexOf(Math.max(...load));if(e===mx)load[e]=row[e]/(count[e]+1);return sum+Math.max(...load)},0));let e=scores.indexOf(Math.min(...scores));map.push(e);count[e]++;}
 const order=map.map((e,i)=>({e,i,w:inputHistory.reduce((sum,row)=>sum+row[e],0)/count[e]})).sort((a,b)=>b.w-a.w||a.i-b.i);let loads=Array.from({length:4},()=>[0,0,0]),ranks=Array.from({length:4},()=>[]);
 for(const p of order){let scores=loads.map((l,r)=>ranks[r].length===3?Infinity:inputHistory.reduce((sum,row,t)=>sum+Math.max(...loads.map((v,j)=>v[t]+(j===r?row[p.e]/count[p.e]:0))),0));let r=scores.indexOf(Math.min(...scores));ranks[r].push(p.e);loads[r]=loads[r].map((v,t)=>v+inputHistory[t][p.e]/count[p.e]);}
 return ranks;
}
const beforeRanks=[[0,1,2],[3,4,5],[6,7,0],[1,2,3]],afterRanks=placement();
function rankLoads(ranks){const counts=Array(8).fill(0);ranks.flat().forEach(e=>counts[e]++);return ranks.map(es=>inputHistory.reduce((sum,row)=>sum+es.reduce((s,e)=>s+row[e]/counts[e],0),0)/inputHistory.length);}
