const REV='9bd9cf243fc53ef9afbf8f04d391d989117d6ab9';
const ROOT=`https://github.com/deepseek-ai/DeepInfer/blob/${REV}/`;
const V4='deepinfer/model_executor/models/v4_modules/';
const refs={
 readme:['开源范围与默认开关','README.md',1,48],
 background:['开源背景与系统范围','doc/inference_deployment_qa.md',1,23],
 architecture:['生产系统与并行部署','doc/inference_deployment_qa.md',25,70],
 eplbdoc:['EPLB 的生产参数与负载比','doc/inference_deployment_qa.md',92,106],
 precision:['FP4 的实际存储对象','doc/inference_deployment_qa.md',212,234],
 dsparkdoc:['DSpark：负载与收益数据','doc/inference_deployment_qa.md',239,264],
 zosdoc:['异步调度设计','doc/inference_deployment_qa.md',266,276],
 engine:['LLMEngine.step','deepinfer/engine/llm_engine.py',860,983],
 worker:['Worker.execute_model_step','deepinfer/worker/worker.py',89,187],
 hc:['HC 融合条件与 Mega mHC',V4+'hc.py',174,315],
 attn:['Prefill / Decode Attention',V4+'attn.py',589,670],
 backend:['FlashMLA 调用与融合接口','deepinfer/model_executor/layers/attention_backend.py',1,146],
 index:['稀疏 logits 与候选选择',V4+'index_attn.py',284,376],
 gate:['逻辑专家与物理槽位映射',V4+'mlp.py',174,255],
 route:['Gate 与 grouped GEMM',V4+'mlp.py',359,459],
 comm:['Dispatch / Combine 与 Mega MoE',V4+'mlp.py',461,616],
 policy:['复制与放置算法','deepinfer/model_executor/eplb/policy.py',12,140],
 shuffle:['专家权重搬运','deepinfer/model_executor/eplb/shuffle.py',1,160],
 balance:['统计窗口与周期重排','deepinfer/model_executor/eplb/__init__.py',131,289],
 mtp:['MTPVarlen::schedule','csrc/engine/mtp_varlen.hpp',150,275],
 bench:['官方 benchmark 扫描配置','examples/sweep/run_sweep.sh',1,90],
 cp:['CPManager 的 token 轴 gather','deepinfer/model_executor/parallel_utils/cp.py',1,54]
};
const externalRefs={officialArticle:['官方系统文章（知乎）','https://zhuanlan.zhihu.com/p/2095560295930508953'],officialDiagram:['官方系统架构图',ROOT+'doc/images/architecture_overview.png'],recipe:['DeepSeek Recipe 官方仓库','https://github.com/deepseek-ai/deepseek-recipe']};
const chapters=[
 {id:'cover',nav:'封面',group:'DEEPINFER / SYSTEM STUDY'},
 {id:'system',nav:'系统结构',group:'01 / SYSTEM & DEPLOYMENT',title:'DeepInfer在整体推理系统中的定位',sub:'协议入口、服务编排、推理引擎与 KV 存储的分层关系。',h:'DeepInfer 承担服务实例内部的推理执行。',p:[
 'DeepSeek 官方开源了服务于 DeepSeek‑V4.1‑Flash 的推理框架 DeepInfer，并同步开源协议与 token 转换组件 DeepSeek Recipe。官方架构中，Recipe 处理请求编码与响应解析；Entrypoint 衔接请求，三个阶段的 Load Balancer 分别组织 Vision Encoder、Prefill 和 Decode 服务。',
 'Prefill 与 Decode 实例内部各有 Expert-Parallel Load Balancer，配合 DeepInfer 的模型执行、通信和调度。Prefill 向 Decode 移交 KV；外部存储向 Prefill 提供可复用 KV，Decode 生成的 KV 写入存储。开源交付包含离线引擎核心；完整生产 KV 系统、E/P/D 分离和跨 DP 副本负载均衡仍需额外服务。'],
 take:'服务层决定请求进入哪个实例；实例内的 DeepInfer 组织算子、专家、通信与批次执行。两层协同决定端到端性能。',trade:'独立部署使 TTFT 与逐 token 延迟可以分别配置资源，同时增加状态移交、缓存恢复和路由开销。',formula:'Prefill：EP2–8 / DP2–8\nDecode：EP64–128 / DP64–128',sources:['background','architecture','readme','officialDiagram','recipe','officialArticle'],states:['官方系统架构','DeepInfer 引擎定位']},
 {id:'execution',nav:'一次执行',group:'02 / FOLLOW ONE DECODE STEP',title:'Decode 执行链与四项性能优化',sub:'批次决策、模型执行、验证采样与状态更新。',h:'四项优化共同作用于一轮 Decode。',p:[
 'LLMEngine.step 调用 C++ scheduler，输出本轮 SequenceMetadata 与 SchedulerOutputs。Worker 随后修正查询长度和位置，调用主模型，再执行采样。图中把重复模型层折叠为一个层段，沿同一轮次逐步展开。',
 '在层内，HC 为 Attention 和 MoE 准备输入。Attention 访问本地请求的 KV，Gate 选择逻辑专家，EPLB 把选择映射到物理副本；MoE 执行后返回本地隐藏状态，输出头与采样器完成验证、接受和下一轮状态更新。'],
 take:'算子效率决定局部耗时，专家分布影响执行尾部，通信决定数据就绪时刻，调度控制工作量与提交顺序。',trade:'层内路径、跨卡通信与跨轮 CPU/GPU 流水存在不同依赖，必须分别定位，才能解释端到端收益。',formula:'schedule → metadata → repeated layers → verify / sample\n每层：HC → Attention → HC → Gate → MoE',sources:['engine','worker','hc','comm'],states:['批次与元数据','Attention','Gate 与专家','验证与采样']},
 {id:'fusion',nav:'融合与布局',group:'03 / OPERATOR EFFICIENCY',title:'Mega mHC 的跨子层融合与数据布局',sub:'融合 post、pre、RMSNorm 与类型转换，直接生成后续内核所需的数据。',h:'跨操作融合减少中间读写与格式搬运。',p:[
 'HCLayerMixin._hc_fused_post_pre 检查是否存在完整 lazy post 数据、是否启用 Mega mHC，以及是否存在中途 intervention。满足条件后，上一子层 post、当前 pre、RMSNorm 与可选 FP8 cast 通过 deep_gemm.mega_mhc 完成。',
 '面向 Mega MoE 时，cast_kwargs 指定 sym_buffer.x 与 scale-factor 输出位置。融合结果直接满足后续消费者的指针和布局契约，避免先产生通用中间表示再搬运。分支仍保留 BF16 结果供 Gate 使用；FP8、routed/shared scale 与新残差各有独立去向。'],
 take:'融合的关键是跨操作边界保留数据，减少中间张量往返，同时生产下一计算所需的格式。',trade:'首层缺少前一子层的 lazy post 数据；Engram 等 intervention 需要插入处理时，也不能进入同一融合内核。',formula:'post(prev) + pre(curr) + RMSNorm + optional cast\n→ BF16 / FP8 + scale / updated residual',sources:['hc','gate'],states:['逻辑操作边界','Mega mHC 融合','消费者布局']},
 {id:'attention',nav:'Attention 访存',group:'04 / OPERATOR EFFICIENCY',title:'稀疏 Attention 的 KV 访问与内核执行',sub:'压缩 KV、SWA 窗口与候选索引共同决定访存范围。',h:'候选选择、低精度存储和注意力内核共同缩小工作量。',p:[
 'V4Attention 把 SWA KV 与压缩 KV 分开管理。稀疏分支由 MQA indexer 计算候选 logits、选出索引；decode_mla_mqa_sparse 接收 paged cache、索引以及 FlashMLA 调度元数据。内核依据选中的位置访问缓存，将候选筛选落实为实际计算与访存范围。',
 '官方说明 main KV 使用 per-16、e4m3 scale 的 FP4；indexer KV 与 routed-expert 权重使用 per-32、ue8m0 的 MXFP4。Prefill 与 Decode 分别调用不同接口，满足条件时还可把 Q Norm、RoPE、Attention 与输出 cast 融合。'],
 take:'Attention 性能由 KV 读取量、索引生成成本和实际内核路径共同决定。',trade:'压缩和低精度减少存储及读取量，但增加 scale、索引、布局转换与内核适配约束；不同层的共享关系也会改变实际路径。',formula:'压缩候选索引 + SWA 索引 → FlashMLA\nPrefill：varlen sparse / Decode：paged KV',sources:['attn','index','backend','precision'],states:['KV 与候选索引','Prefill / Decode 接口']},
 {id:'experts',nav:'专家放置',group:'05 / EXPERT DISTRIBUTION',title:'EPLB 的专家复制与物理放置',sub:'依据历史负载调整物理副本，降低专家阶段的执行尾部。',h:'热点专家复制与固定容量下的贪心放置。',p:[
 'Gate 选择逻辑专家，logical_to_physical_map 和 logical_count 把它映射到真实槽位。policy.py 依据历史 token 负载贪心选择冗余副本，再把物理专家按每副本负载排序，分配到每卡固定容量的槽位。',
 '放置评分把每个历史 step 的最慢 rank 负载相加，因此保留时间窗口中的负载差异。图中固定三步输入、8 个逻辑专家与 12 个物理槽，按源码的复制和放置规则计算前后结果；条宽只编码窗口平均调用量。'],
 take:'EPLB 优化每个历史 step 的最慢 rank 负载；固定槽位容量下，副本选择与放置共同决定 token 分布。',trade:'额外副本占用 HBM；shuffle.py 通过 NCCL P2P 或域内 symm_mem/IPC 搬运权重。重排频率需要在热点响应速度与迁移代价之间选择。',formula:'评分 = Σstep maxrank(该 rank 的专家负载)\n约束：每个 rank 固定物理槽位数',sources:['policy','route','balance','shuffle'],states:['重排前','复制与放置后']},
 {id:'wideep',nav:'Wide-EP',group:'06 / EXPERT DISTRIBUTION × COMMUNICATION',title:'Wide-EP 的权重分摊与通信代价',sub:'Attention 保持本地请求归属，MoE 按专家在全组汇集 token。',h:'扩大 EP 降低每卡专家权重读取量。',p:[
 '每卡 Attention 服务本地请求。进入 MoE 后，各卡选中同一个逻辑专家的 token 汇集到该专家的物理副本。扩大 EP 将专家权重分摊到更多卡；固定每卡并发时，全组提供的 token 也增加，有利于改善专家 GEMM 的 M 维。',
 '官方 Decode 配置在 EP64 时每卡为 7 个物理专家槽（不含共享专家），统计窗口 1,000 步、每 10,000 步重排，披露 moe_lb 为 1.090。Prefill 使用更小的 EP，并采用 100 步窗口、每 1,000 步重排。'],
 take:'Wide‑EP 的收益需要带宽、并发和 EPLB 同时配合。单卡权重读取量降低后，通信与专家尾部对总耗时的影响更加显著。',trade:'固定全局并发时扩大 EP，不会自动增加每专家 token 数。扩大通信域也增加故障与协调影响，需结合部署条件判断。',formula:'Tglobal = EP × 每卡 token 数\n每专家平均调用量 ≈ Tglobal × top-k / 专家数',sources:['architecture','eplbdoc','gate','cp'],states:['Prefill · EP2–8','Decode · EP64–128']},
 {id:'communication',nav:'MoE 通信',group:'07 / COMMUNICATION × OPERATOR EFFICIENCY',title:'Mega MoE 的通信与专家计算融合',sub:'相同输入输出下，对照 DeepEP 显式路径与域内融合路径。',h:'同一 NVLink 域内，优先进入融合执行路径。',p:[
 'use_mega_moe 检查硬件、MMA 数据类型及 EP 组是否处于同一 NVLink 域。满足条件时，gate 把 top-k 写入 SymmBuffer，mega_moe_func 直接消费输入、两组专家权重和共享专家参数，完成融合执行。',
 '通用路径显式调用 EPBuffer.dispatch → grouped GEMM → SwiGLU / cast → grouped GEMM → EPBuffer.combine。dispatch 返回 handle 与分组 token 计数；combine 用 handle 恢复来源位置，并把 shared expert 结果作为 bias 合入。'],
 take:'通信优化必须贯穿路由、专家计算和回传；只缩短 dispatch API 的耗时，无法解释整个 MoE 分支的完成时间。',trade:'通用路径仍有 current_stream_wait 与事件依赖。通信使用 SM 预算，与专家计算可能争用资源；异步调用本身不保证通信全部被隐藏。',formula:'Mega：Gate → SymmBuffer → mega_moe_func\n通用：Dispatch → Grouped compute → Combine',sources:['gate','comm'],states:['DeepEP 显式路径','Mega MoE 域内融合']},
 {id:'dspark',nav:'DSpark 预算',group:'08 / SCHEDULING: HOW MUCH TO VERIFY',title:'DSpark 的变长验证与算力分配',sub:'结合接受概率与硬件执行曲线，确定本轮草稿验证预算。',h:'选择最大化有效 token 吞吐的验证预算。',p:[
 'Confidence Head 估计草稿 token 的接受概率。MTPVarlen::schedule 把概率与 profiled decode 曲线结合，并用历史 forward 与 sampler 时间修正成本，选择预期接受 token 数除以估计耗时最大的 total_q。每个请求至少保留一个基础位置。',
 '调度器区分预算与逐请求长度：CPU 用 N−2 轮信息选择总预算。在 ZOS 模式下，较新的 confidence 尚未回到 CPU，GPU 再修正每个请求的 seqlen_q 与 remap，并回填 pinned buffer，使采样使用一致的布局。'],
 take:'候选的预期接受收益与验证成本共同决定预算；设备执行曲线影响增加验证位置的边际收益。',trade:'变长验证增加排序、重映射和元数据处理成本。低并发下，减少验证量未必抵消这些成本；性能证据章节给出官方对照数据。',formula:'目标：max  E[接受 token] / (forward_ms + sampler_ms)\nCPU 定 total_q → GPU 修正每请求长度',sources:['mtp','worker','dsparkdoc'],states:['草稿与置信度','总预算与长度修正']},
 {id:'zos',nav:'ZOS 流水',group:'09 / SCHEDULING: WHEN TO EXECUTE',title:'ZOS 的跨轮 CPU/GPU 流水重叠',sub:'调整后处理与提交顺序，利用设备执行窗口覆盖 CPU 开销。',h:'提交当前 forward 后处理上一轮采样结果。',p:[
 'Worker.execute_model_step 的顺序是 execute_main_model → _post_process_step(prev_step_state) → execute_sample → 保存 curr_step_state。ZOS decode 的当前后处理留给下一步，使 CPU 更新上一轮账本时，GPU 可以执行当前主模型。',
 '_post_process_step 仍同步上一轮 sample_end_evt；_correct_seqlens_qk 修正查询、KV 长度和 remap。DeferredRelease 延后释放在途引用。性能收益来自同步位置和流水顺序的改变，同时保持这些数据依赖。'],
 take:'DSpark 决定本轮做多少验证，ZOS 决定这些工作与 CPU 调度如何交错；两者通过 seqlen_q 与 remap 接合。',trade:'CPU 工作超过设备覆盖窗口、等待事件未完成或整理元数据过重，仍会出现气泡。“zero-overhead”描述优化目标。',formula:'当前：launch forward(N) → post(N−1) → launch sample(N)\n保留 state(N)，供下一轮消费',sources:['worker','engine','zosdoc'],states:['同步串行','ZOS 跨轮重叠']},
 {id:'evidence',nav:'性能证据',group:'10 / OFFICIAL PERFORMANCE EVIDENCE',title:'动态验证在不同并发下的性能收益',sub:'官方 EP64 / DP64 对照：验证长度、接受长度与有效吞吐。',h:'端到端收益取决于工作量与附加开销的平衡。',p:[
 '官方 Q&A 对照 fixed‑5 与动态验证。60 条序列/rank 时，平均验证长度由 5.00 降到 3.58，平均接受长度由 3.30 变为 3.21，估算吞吐从 13,730 升至 14,466 token/s/rank，提升 5.4%。',
 '16 条序列/rank 时收益为 −1.5%；96 条时为 +11.0%。这组变化支持“按负载决定验证预算”，也说明要把草稿接受质量、硬件利用率与调度附加工作放在同一个端到端指标中观察。'],
 take:'算子、专家、通信与调度的局部优化，最终都要回到满足延迟要求下的有效 token 吞吐。',trade:'这里复绘 Q&A 的估算吞吐表。README 的 prefill / decode 图分别使用 4 / 64 张 SM100，同属 scale-up 域，不能当作同资源规模的横向对照。',formula:'吞吐口径：token/s/rank\n并发口径：sequences/rank · EP64/DP64',sources:['dsparkdoc','readme','bench'],states:['16','32','48','60','72','96']},
 {id:'complete',nav:'完整执行图',group:'12 / INTEGRATED EXECUTION MAP',title:'DeepInfer 完整执行图与性能协同',sub:'汇合本地计算、专家并行、跨卡通信与跨轮调度。',h:'性能由计算、分布、数据就绪与工作预算共同决定。',p:[
 '本地残差经 HC 进入 Attention，再经 HC 和 Gate 进入跨卡专家阶段；结果回到本地，经过后续层、输出头与采样。参数读取、KV 访问、专家映射与采样结果分别接入对应消费者。',
 'EPLB 从接收计数反馈到物理专家放置；DSpark 从 confidence 和执行曲线决定下一轮验证预算；ZOS 用在途状态把当前设备工作与前一轮 CPU 后处理连接起来。选择不同观察层，可逐项回看这些关系。'],
 take:'DeepInfer 的高性能来自边界之间的协同：更少的中间读写、更均衡的专家尾部、更紧密的通信计算组织，以及更合适的验证预算和提交顺序。',trade:'判断一次修改是否有效，应保持模型、精度、拓扑与流量口径一致，检查 TTFT/TBT、接受 token/s、MoE 负载比和暴露的通信/CPU 等待。',formula:'算子效率 · 专家分布 · 通信组织 · 调度策略\n→ 满足延迟约束下的有效推理吞吐',sources:['hc','attn','comm','balance','mtp','worker'],states:['计算主干','专家与通信','调度反馈']}
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

Object.assign(refs,{
 ascStore:['Ascend KV 量化与 DMA 布局','deepinfer/model_executor/layers/tilelang_ops/asc/store_kv_cache.py',1,110],
 ascFusion:['Ascend 融合变换与寄存器流水','deepinfer/model_executor/layers/tilelang_ops/asc/fused_transform.py',1,110],
 ascMhc:['Ascend mHC 内部归约',V4+'mhc_ops.py',16,22],
 ascHc:['Mega mHC 平台条件',V4+'hc.py',90,105],
 ascSchedule:['Ascend 变长验证预算','deepinfer/model_executor/layers/tilelang_ops/asc/schedule_mtp_varlen.py',1,85],
 ascRuntime:['NPU 运行配置与能力边界','deepinfer/worker/runtime_config.py',54,69]
});
Object.assign(externalRefs,{
 ascGemm:['DeepGEMM-Ascend · 官方布局与 950DT 算子测试','https://github.com/deepseek-ai/DeepGEMM-Ascend#readme'],
 ascEp:['DeepEP-Ascend · 官方通信测试与能力状态','https://github.com/deepseek-ai/DeepEP-Ascend#readme']
});
chapters.splice(chapters.findIndex(p=>p.id==='complete'),0,{
 id:'ascend950',nav:'Ascend 950',group:'ASCEND 950 / IMPLEMENTATION BRANCH',title:'Ascend 950 的专用实现与性能取舍',sub:'从低精度布局、片上融合到专家通信与异步调度。',
 h:'950 优化落在数据布局、片上执行和互联通信。',
 p:['DeepInfer 支持 Ascend 950 与 CANN 9.2，构建时选择 DeepGEMM-Ascend、DeepEP-Ascend，并提供独立的 Ascend TileLang 内核。专用后端与模型执行主线共同组成 NPU 路径。',
 '算子层按 Ascend 格式打包 scale；融合 Norm、RoPE、Hadamard、量化和 KV 写入，减少中间搬运。mHC prenorm 在 Ascend 内核内部归约，默认 split 数为 1；GPU 的 Mega mHC 路径不能直接套用。',
 '通信层以 FP8 Dispatch、BF16 Combine 和延迟 epilogue 组织专家交换。专家放置策略与权重迁移能力需分别确认：配套库的 lb_prefetch_weights、lb_reduce_grads 通信内核仍未实现。',
 '调度层已有 Ascend 的 ZOS 元数据处理与变长验证预算内核。代码存在证明了执行路径，具体加速幅度仍需 NPU 端到端测试。'],
 take:'将 NPU 专用实现、配套库微基准和整模型吞吐分开阅读，才能判断优化实际覆盖到哪一层。',
 formula:'主仓证据：9bd9cf2\n配套库说明：2026-10-21 查阅的官方 README\n950DT 算子 / 通信测试 ≠ DeepInfer 端到端吞吐',
 trade:'FP4/FP8 降低计算与传输成本，同时约束 scale 布局、对齐和数值路径；流水深度受 UB 与寄存器资源限制。DeepInfer 首页推理曲线测自 SM100，不能用作 950 性能结论。',
 states:['算子与 KV','专家分布边界','950 专家通信','异步调度'],sources:['readme','ascFusion','ascStore','ascMhc','ascHc','ascGemm','ascEp','ascSchedule','ascRuntime']
});

const ascendStateCopy=[
 {h:'Ascend 改变了归约位置与缓存写入契约。',p:['GPU 与 Ascend 沿用同一模型计算语义，但执行分解不同：mHC prenorm 的 CUDA 默认采用 16 个 split，Ascend 默认 1 个 split，并在内核内部完成归约。','Ascend 的主 KV 缓存把量化 values 与 scales 放入同一 UB 行，再以一次精确长度 DMA 写出。GPU 调用侧则分别传入 cache_quant 与 cache_sf；这说明数据接口不同，不能仅据此推断 GPU 实际发起多少次搬运。','GEMM 还有另一套独立的 scale 契约：Ascend 将 K 维两个 UE8M0 scale 打包为 int16，再按 MN-major 存储。不要将 GEMM scale 布局与图中的 KV 行布局混为一谈。'],take:'950 的特殊性是内部归约、UB 行组织和硬件要求的 scale 格式，而不只是换用 NPU API。',trade:'融合减少中间读写，但受 shape、量化格式、UB 与寄存器预算约束。Mega mHC 的 GPU 分支不能作为 Ascend 已启用的证据。'},
 {h:'专家放置策略与平台迁移能力是两个层次。',p:['逻辑专家、物理副本和 rank 的映射关系在两个平台上仍然成立。负载均衡策略解决放在哪里、复制多少份；性能还取决于权重如何迁移以及能否与计算重叠。','GPU 主线中的专家重排需要结合 shuffle.py 和实际通信路径理解。Ascend 配套库虽然暴露 lb_prefetch_weights、lb_reduce_grads 接口，但官方说明相应通信内核尚未实现。','因此不能从 API 对齐推导出 GPU 与 NPU 的专家迁移能力完全相同，也不能据此认定整个 Ascend EPLB 不可用。需要独立追踪框架所用搬运路径。'],take:'本页对比的是能力证据：共同的专家布局模型，不等于相同的异步迁移实现。',trade:'更多副本可减轻热点，但增加权重容量与重排成本；当前没有可据此量化的 GPU / 950 EPLB 收益对照。'},
 {h:'通信语义相同，硬件通道与成本结构不同。',p:['GPU 与 Ascend 都需要把 token 发往专家，再将结果归并回来源 rank。NVIDIA 主线在条件满足时选择 Mega MoE / SymmBuffer，或显式 DeepEP Dispatch / Combine。','950 的 DeepEP-Ascend 使用 UBMEM 与 UBC_CTP/URMA 通道，并支持 FP8 Dispatch、BF16 Combine 和延迟 epilogue。它的主要约束包括互联通道、局部归约与 HBM 争用。','下方数值仅为 950DT EP64 微基准：16,384 tokens/rank 容量、H=7168、top-6 / 256 experts，使用手工配置 PoC HDK；计时不含最终 epilogue。没有同口径 GPU 数据，因此不绘制速度胜负对比。'],take:'比较通道和执行组织；950 通信带宽不能直接换算为整模型吞吐优势。',trade:'FP8 降低分发流量；Combine 仍有 BF16 传输、本地归约及 URMA 与 HBM 争用成本。'},
 {h:'跨轮调度策略共用，设备侧实现分别适配。',p:['ZOS 的主线是先提交 forward N，再处理上一轮结果，使 CPU 后处理尽可能被当前设备执行覆盖。该策略本身并非 950 独有。','Ascend 的差异落在设备侧元数据内核：gather_input_ids_zos、compute_seqlens_k_zos 与 schedule_mtp_varlen 等拥有独立实现；后者包含 MTE3 / MTE2 核间同步。','GPU 与 Ascend 是否达到相同重叠效果，取决于主模型执行时长、CPU 后处理、事件等待和元数据成本。源码确认实现路径，不证明相同的加速比例。'],take:'把共同的流水策略与 Ascend 专用元数据执行分开，才能看清平台特性。',trade:'异步流水隐藏部分开销，但不消除采样完成依赖。NPU 当前还禁止 batch-invariant 开关，运行配置启用确定性算法以控制数值稳定性。'}
];
