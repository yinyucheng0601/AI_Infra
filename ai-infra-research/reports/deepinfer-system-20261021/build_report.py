from pathlib import Path
import json, re, hashlib

OUT=Path(__file__).parent
SRC=Path('/private/tmp/deepinfer-research-20261021')
REV='9bd9cf243fc53ef9afbf8f04d391d989117d6ab9'
pages=[]
def page(nav,title,lead,paragraphs,trade,nodes,edges,refs,states=None):
    pages.append(dict(nav=nav,title=title,lead=lead,paragraphs=paragraphs,trade=trade,nodes=nodes,edges=edges,refs=refs,states=states or ['执行关系']))
def n(label,x,y,detail,kind='op',w=260):return dict(label=label,x=x,y=y,detail=detail,kind=kind,w=w)
Q='doc/inference_deployment_qa.md'
M='deepinfer/model_executor/models/v4_modules/'
E='deepinfer/model_executor/eplb/'
page('研究入口','DeepInfer 如何把计算能力变成推理吞吐？','系统结构 → 一次执行 → 四层机制 → 完整执行图',[
'研究对象是 DeepSeek 官方 DeepInfer，支持模型为 DeepSeek‑V4.1‑Flash。本文以 2026‑10‑21 获取的固定源码快照为依据，沿 NVIDIA 路径解释主要优化，并单独指出硬件与部署边界。',
'先区分服务拓扑、引擎调用和设备数据流，再追踪请求进入批次、Attention、专家执行、采样及下一轮。算子效率、专家分布、通信和调度共同决定有效吞吐；任何一个环节都可能成为关键路径。'],
'阅读主线：每一步都说明输入输出、实现入口和性能代价。点击图元可查看对应解释；底部按章节阅读。',[
n('系统结构',100,120,'先定位服务、引擎和设备三个层级。'),n('一次推理执行',480,120,'从 LLMEngine.step 进入 worker，再到模型与采样。'),n('四项性能机制',100,340,'算子融合、专家放置、跨卡传输、验证与流水重叠。'),n('完整执行图',480,340,'将先前解释过的机制汇合；实线表达执行或数据依赖，点线表达反馈。')],[[0,1],[1,2],[2,3]],['README.md',Q])
page('实际系统','先把生产系统与开源引擎放回各自位置','生产服务采用 E/P/D 分离；开源交付覆盖离线推理核心。',[
'官方生产架构由入口、Vision Encoder、Prefill、Decode 和独立 KV 存储组成。入口先完成缓存匹配，再由不同阶段的负载均衡器分发；Attention 采用 DP，MoE 采用 EP，生产配置中 DP 数量等于 EP 数量。',
'Prefill 推荐 EP2–8 / DP2–8，在 HBM 容量允许时取较小规模；Decode 推荐 EP64–128 / DP64–128，以 Wide‑EP 降低每卡专家权重流量。官方当前生产配置不使用 TP 和 CP，仓库仍实现 balanced CP，能力与部署选择应分别阅读。',
'README 明确缺少完整在线服务所需的 KV 系统、E/P/D 分离和跨 DP 副本负载均衡。源码已有 cache_engine、block manager 及阶段接口，表示引擎能管理设备缓存与衔接阶段，并不等于完整生产存储服务已经开源。'],
'取舍：阶段分离让 TTFT 与 TBT 的资源预算独立，但增加 KV 传输、路由及服务运维成本。',[
n('入口 / Recipe',100,80,'生产：协议与 token 序列转换；缓存命中长度在路由前确定。','service'),n('Vision Encoder',100,220,'生产：图像编码独立部署；文本请求直接进入 Prefill。','service'),n('Prefill · EP2–8',480,220,'生产推荐范围；处理提示词并建立 KV。','service'),n('Decode · EP64–128',480,390,'生产推荐 Wide‑EP；迭代产生输出。','service'),n('KV Storage / 3FS',100,390,'生产披露：block KV 存放于独立存储集群；完整管理实现未包含在此次开源中。','service')],[[0,1],[0,2],[1,2],[2,3],[4,2,'feedback'],[3,4,'feedback']],['README.md',Q,'deepinfer/worker/cache_engine.py'])
page('调用主干','一次请求怎样进入设备执行？','选取文本生成路径，跟踪同一请求从 prefill 到 decode。',[
'离线入口 LLM 接收请求，LLMEngine.add_request 建立 Sequence 并加入 scheduler。每次 step 调用 C++ scheduler.schedule，生成 SequenceMetadata 与 SchedulerOutputs，确定本轮请求集合、查询长度及缓存块状态。',
'引擎经 _execute_model_async_step 调用 Worker.execute_model_step。worker 先修正 ZOS 元数据，执行主模型，再处理前一轮输出，然后执行本轮采样。prompt 或关闭 ZOS 时，本轮后处理立即完成；ZOS decode 将它留到下一轮。',
'Prefill 处理提示词中的一段或全部位置，Decode 处理新增位置以及选中的草稿验证位置。图中的请求身份连续；批次内其他请求及模型层数由实际配置决定。'],
'取舍：批次预算同时受到 token 数、序列数、缓存容量和设备执行曲线约束。单个请求的等待时间与整批吞吐需要一起观察。',[
n('LLM / add_request',100,80,'输入 token 与 SamplingParams → Sequence。'),n('scheduler.schedule',480,80,'输出请求集合、seqlen_q、块与状态操作。'),n('execute_model_step',480,240,'统一 prompt / decode / placeholder 执行入口。'),n('主模型 → Sampler',100,240,'模型输出进入采样及草稿验证；输出尚需 CPU 更新账本。'),n('process_outputs',100,420,'更新接受 token、结束状态与后续调度依据。'),n('下一轮 Decode',480,420,'未结束请求继续；结束请求释放相关资源。')],[[0,1],[1,2],[2,3],[3,4],[4,5],[5,1,'feedback']],['deepinfer/entrypoints/llm.py','deepinfer/engine/llm_engine.py','deepinfer/worker/worker.py','csrc/engine/scheduler.hpp'])
page('层内结构','进入模型层：先处理 Attention，再执行专家分支','残差状态通过 HC 连接计算分支；这里将连接内部折叠。',[
'Decoder 层通过 HC 的读取、混合与写回连接 Attention 和 FFN。输入残差状态具有多路特征，分支得到归一化后的隐藏向量；HCHead 在输出端将残差状态收敛为用于预测的隐藏向量。',
'V4Attention 组织查询投影、SWA KV 与压缩 KV；压缩分支可经 indexer 选择候选，再调用 prefill 或 decode 专用注意力内核。跨层共享关系由 SharedLayerTopology 和 CrossLayerRuntime 管理，具体路径取决于层配置。',
'Attention 输出再次经 HC / Norm 进入 DeepseekMoE。路由专家处理选中 token，共享专家处理本地输入，合并结果再写回残差状态。后续章节分别展开这些折叠模块。'],
'取舍：跨层共享与压缩降低重复计算和 KV 流量，但引入共享状态、索引元数据及更复杂的层配置约束。',[
n('残差状态 X',100,80,'HC 输入保留多路特征；实际路数读取模型配置。','value'),n('HC / Norm',480,80,'读取多路残差并归一化，输出分支输入。'),n('V4 Attention',480,235,'查询投影、SWA / 压缩 KV、候选选择和注意力计算。'),n('HC / Norm',100,235,'完成上一分支写回并准备 FFN 输入。'),n('DeepseekMoE',100,410,'动态路由专家 + 复制的共享专家。'),n('下一层残差',480,410,'完成分支写回，再传入下一层。','value')],[[0,1],[1,2],[2,3],[3,4],[4,5]],[M+'hc.py',M+'attn.py',M+'cross_layer.py',M+'mlp.py','deepinfer/model_executor/models/decoder_layer.py'])
page('算子效率','减少中间写回，再选择匹配数据布局的内核','效率来自具体融合边界、低精度格式与专用 Attention 路径。',[
'HC 的 _mega_mhc 将上一子层 post、当前子层 pre、RMSNorm 和可选 FP8 cast 合入 deep_gemm.mega_mhc。它还能直接写入 Mega MoE 的 sym_buffer 及 scale-factor 区域，减少中间张量的往返与格式搬运。首层缺少上一分支数据，走单独处理路径。',
'Attention 区分 prefill_attn_varlen_sparse 与 decode_mla_mqa_sparse；decode 使用 paged KV 和预先准备的 FlashMLA 调度元数据。Indexer 通过 DeepGEMM 的 FP8/FP4 MQA logits 与候选 top-k 筛选压缩块，计算稀疏性由索引生成与消费共同实现。',
'MoE 显式区分 fp8×fp4、fp8×fp8、bf16×bf16。通用路径使用 grouped GEMM，并把 SwiGLU、路由系数及 per-token cast 结合；权重布局与 scale-factor 布局在加载或准备阶段转换，以匹配 TMA 等内核要求。'],
'取舍：融合减少 launch 和 HBM 流量，却要求严格的指针、对齐及数据布局契约；低精度需匹配权重、激活和 scale，不能仅凭 dtype 推断端到端加速。',[
n('上一分支输出',100,80,'输入 BF16 分支输出和延迟 HC 状态。','value'),n('Mega mHC',480,80,'post + pre + RMSNorm + 可选 cast 的融合入口。'),n('FP8 + scale',480,245,'可直接落入后续消费者约定的缓冲区。','value'),n('Grouped / Mega MoE',100,245,'按激活、权重格式选择匹配的 GEMM 内核。'),n('Indexer → FlashMLA',100,420,'稀疏候选与 paged KV 元数据决定注意力访问范围。'),n('分支输出',480,420,'结果回到 HC；输出端维持正确的残差接口。','value')],[[0,1],[1,2],[2,3],[3,5],[4,5]],[M+'hc.py',M+'mlp.py',M+'index_attn.py',M+'attn.py'])
page('专家分布','路由选择逻辑专家，EPLB 安排物理副本','逻辑语义保持稳定；热点通过副本与放置调整分摊。',[
'gate_forward 使用模型的 sqrtsoftplus scoring、correction bias、top-k 与归一化配置，生成 topk_idx / topk_weights。EPLB 提供 logical_to_physical_map 和 logical_count，把逻辑专家选择映射到包含冗余副本的物理槽位；共享专家单独管理。',
'policy.py 先根据历史 token 负载贪心选择要复制的逻辑专家，再通过 _batch_greedy_indices 将物理专家分配到每卡固定容量的槽位。其放置目标考虑每一个历史 step 的最慢 rank，再将这些峰值相加，而非只平均整个窗口的总 token 数。',
'统计由实际接收专家 token 的执行路径累加。周期性重排更新映射，并搬运专家权重；shuffle.py 提供 NCCL batched P2P 通用实现及 symm_mem / IPC 域内直接读取实现。'],
'取舍：冗余专家占 HBM，重排消耗带宽与时间；统计窗口越长越稳定，越短越能追踪热点。历史均衡不能保证下一批没有偏斜。',[
n('Router · logical top-k',100,80,'模型语义：选择逻辑专家及路由系数。'),n('logical → physical',480,80,'映射表将同一专家对应到一个或多个物理槽。'),n('Rank A · 专家槽位',100,255,'每 rank 分到相同数量的物理槽，槽内保存权重副本。','expert'),n('Rank B · 专家槽位',480,255,'热点逻辑专家可在多个 rank 上存在副本。','expert'),n('接收计数 / 历史窗口',100,425,'计数按实际物理专家接收 token 记录。'),n('副本选择 + 贪心放置',480,425,'重新计算副本和位置，shuffle 权重并更新映射。')],[[0,1],[1,2],[1,3],[2,4],[3,4],[4,5,'feedback'],[5,1,'feedback']],[M+'mlp.py',E+'policy.py',E+'__init__.py',E+'shuffle.py'])
page('通信路径','同一 MoE 语义，有两条设备执行路径','切换状态比较 Mega MoE 与显式 DeepEP 调用。',[
'初始化时 use_mega_moe 同时检查硬件 / dtype 条件和 PG.is_within_nvl_domain(expert_parallel_group)。满足条件后，gate 直接写 sym_buffer，mega_moe_func 消费对称缓冲、两组专家权重及共享专家参数，融合分发、专家计算和归并。',
'通用路径调用 EPBuffer.dispatch，把输入与 top-k 路由送到持有物理专家的 rank；current_stream_wait 建立通信完成到计算的依赖。随后两个 grouped GEMM 和 SwiGLU 生成专家输出；EPBuffer.combine 按 handle 恢复来源位置，并合入共享专家输出。',
'显式路径通过 previous_event、async_with_compute_stream、defer_epilogue 和通信 SM 预算控制流间衔接。代码在 combine 前捕获事件并计算 shared_forward，给共享专家计算与通信留下重叠机会；依赖等待仍然存在，不能把异步 API 当成全程无等待。'],
'取舍：Wide‑EP 减少每卡专家权重读取，却增加跨卡 token 交换并放大最慢 rank 的影响。Mega MoE 的优势依赖 scale-up 拓扑和匹配内核。',[
n('Gate → sym_buffer',100,100,'Mega：路由索引、权重及输入放入预分配的对称缓冲。'),n('Mega MoE',480,100,'Mega：融合通信、专家执行与归并；shared 可一起融合。'),n('DeepEP Dispatch',100,270,'通用：返回展开输入、路由权重和恢复来源所需 handle。','comm'),n('Grouped GEMM / SwiGLU',480,270,'通用：按专家接收 token 分组执行两次矩阵乘法。'),n('Shared expert',100,440,'通用：本地共享专家计算，以 bias 传给 combine。'),n('DeepEP Combine',480,440,'通用：专家输出回到原 token 位置并与共享分支合并。','comm')],[[0,1],[2,3],[3,5],[4,5]],[M+'mlp.py','deepinfer/model_executor/parallel_utils/parallel_state.py'],['Mega MoE · 域内融合','DeepEP · 通用路径'])
page('阶段取舍','Prefill 与 Decode 为什么使用不同并行规模？','计算形态变化，决定 EP 规模与缓存策略。',[
'Prefill 一次处理较多 token，专家矩阵乘法的 M 维通常更大。官方选择满足容量要求的较小 EP，降低通信和协调成本；Decode 每条请求新增位置少，Wide‑EP 把专家权重分散到更多设备，并把多个 Attention DP rank 的 token 聚合到专家侧。',
'Attention DP 与专家 EP 是同一组设备上的两种工作分配。每卡独立处理本地请求的注意力，进入 MoE 后按专家交换激活；所以 Attention 负载均衡与专家负载均衡对应两种不同偏斜。仅让每卡请求数相同，不能保证 KV 长度或专家 token 数均衡。',
'源码的 CPManager 用 DeepEP BucketBuffer 提供 token 轴 all-gather，session 内完成等待，返回张量别名受复用约束。它解释仓库为何列出 balanced CP 支持；本报告的生产主线采用 Q&A 所述 DP / EP。'],
'取舍：扩大 EP 需要足够的并发、互联和 EPLB 配合；EP8 与 EP64 的比较应固定请求长度、延迟约束和硬件域。',[
n('Attention DP · Rank A',100,100,'本地请求 A 的查询与 KV 访问，成本随上下文和查询长度变化。'),n('Attention DP · Rank B',480,100,'本地请求 B；请求数相同仍可能具有不同 KV 长度。'),n('EP token exchange',290,270,'跨 DP rank 汇集路由至同一专家的 token。','comm'),n('专家权重分布',100,440,'更大的 EP 把物理专家分散到更多设备。','expert'),n('合并后返回 DP',480,440,'MoE 输出恢复到原来负责请求的 rank。')],[[0,2],[1,2],[2,3],[3,4]],[Q,M+'mlp.py','deepinfer/model_executor/parallel_utils/cp.py'])
page('验证预算','DSpark 把验证算力分给高边际收益的草稿','先确定总预算，再决定各请求验证多少位置。',[
'草稿模型产生多个候选 token，Confidence Head 估计各候选的接受概率。MTPVarlen.schedule 根据硬件 decode 性能曲线、历史 forward / sampler 时间以及接受率，选择使“预期接受 token 数 / 估计执行时间”最大的 total_q。',
'实现区分两个历史队列：始终用 N−2 轮接受率估计最优总预算，以 N−1 轮信息决定逐请求 seqlen_q；每条请求先保留一个基础查询位置。没有性能曲线时退化为验证已有全部草稿。',
'ZOS 中 CPU 尚未获得最新 confidence，因此只提前确定总预算，GPU 在 prepare_zos_inputs 路径内重新计算各请求长度与 remap，并将结果写回 pinned buffer。随后修正 CPU 采样元数据，让本轮采样和验证采用一致的布局。'],
'取舍：草稿越多，潜在接受量越大，验证工作也越多。官方 EP64/DP64、60 序列/rank 的估算吞吐从 13730 到 14466 tok/s/rank（+5.4%）；16 序列/rank 为 −1.5%，收益依赖负载。',[
n('Draft + Confidence',100,80,'每个请求输出草稿 token 和接受率预测。'),n('CPU · total_q',480,80,'以旧一轮信息及硬件曲线选择总验证预算。'),n('GPU · seqlen / remap',480,250,'使用较新的设备端信息修正每请求长度和排列。'),n('Target verification',100,250,'主模型对所选前缀位置执行验证。'),n('Sampler / acceptance',100,425,'得到实际接受 token，更新下一轮状态。'),n('Runtime estimator',480,425,'用 forward 和 sampler 的测量更新时间模型。')],[[0,1],[1,2],[2,3],[3,4],[4,5],[5,1,'feedback']],['csrc/engine/mtp_varlen.hpp','deepinfer/worker/worker.py',M+'heads.py',Q])
page('异步调度','把 CPU 后处理放进下一轮 GPU 执行窗口','ZOS 将相邻轮次错开；事件同步保证消费顺序。',[
'同步执行中，GPU 完成本轮 forward 和 sample 后，CPU 才能后处理，然后调度下一轮；这段 CPU 工作让 GPU 等待。ZOS 提前调度下一批，在提交当前 forward 后处理上一轮，再提交当前 sample。',
'Worker.execute_model_step 的顺序可直接核对：execute_main_model → _post_process_step(prev_step_state) → execute_sample → 保存 curr_step_state。_post_process_step 仍需同步上一轮 sample_end_evt；ZOS 改变同步发生的位置，使等待尽量被已提交的设备工作覆盖。',
'当前轮是否包含已经结束的请求、草稿长度及 KV 位置，需要 _correct_seqlens_qk、MetadataZOS 与 remap 衔接。DeferredRelease 延迟释放输出、metadata 和 clone 引用，防止设备尚在消费时复用资源。'],
'取舍：“zero-overhead”是隐藏调度开销的目标。若 CPU 处理比设备窗口长、事件依赖未满足或元数据整理过重，仍会出现气泡；应通过真实 trace 验证。',[
n('CPU · schedule(N)',100,80,'确定本轮批次，允许上一轮结果仍在途。'),n('GPU · forward(N)',480,80,'提交当前主模型执行。'),n('CPU · post(N−1)',100,260,'等待上一轮 sample 事件后更新结果；当前 GPU forward 可并行。'),n('GPU · sample(N)',480,260,'以校正后的元数据执行本轮采样。'),n('保存本轮状态',480,435,'将 curr_step_state 留给下一轮后处理。'),n('CPU · schedule(N+1)',100,435,'进入下一次调度，形成稳态流水。')],[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0,'feedback']],['deepinfer/worker/worker.py','deepinfer/worker/zos_status.py','deepinfer/engine/llm_engine.py',Q])
page('缓存与重放','缓存命中后，怎样补齐 SWA 状态？','block KV 复用与 SWA 重建采用不同恢复规则。',[
'官方系统把 block KV 存入独立 3FS 集群，SWA 状态保存在 host 内存。缓存匹配在路由前完成；KV 获取异步到共享内存，再以逐层 swap-in 尽量覆盖 H2D 时间。完整存储与路由实现仍属于生产披露范围。',
'SWA bounded replay 只重算最近 128 个 token，并把窗口限定为 max(s,i−127) 到 i；s 是 replay 起点。Encoder 的 SWA 缺失时，复用已命中的 block KV，只重建 SWA；已有 block KV 不重算、不覆盖。',
'Decoder 的 block KV 可由最后 encoder hidden 投影，prefill 只在 encoder 层做主要计算；decoder SWA 以最后 128 个 token 重建，结果仅用于 decode，不写回 prefix cache。该重放生成的是近似状态，性能收益与精确恢复的语义需要一起理解。'],
'取舍：固定范围的近似重放替代随层数扩大的精确 SWA 恢复，减少 prefill 工作；应按目标任务评估质量。官方“接近减半”属于该 CED 配置的 prefill 计算结论。',[
n('Prefix match',100,80,'先确定 block KV 命中长度，作为路由输入。','service'),n('复用 block KV',480,80,'从存储取回已有压缩 KV；生产存储层未完整开源。','value'),n('最近 128 token',100,260,'SWA replay 的固定输入范围。','value'),n('Bounded replay',480,260,'以截断窗口重建 SWA；block KV 保持复用。'),n('Decoder 状态',480,435,'decoder replay 状态只用于继续 decode。','value'),n('继续 Decode',100,435,'合并可复用的 block KV 与重建的 SWA 状态。')],[[0,1],[0,2],[2,3],[1,5],[3,4],[4,5]],[Q,'deepinfer/model_executor/input_metadata/yoco.py',M+'attn.py'])
page('完整执行图','将四项优化汇合到同一条执行路径','点击节点回看实现；沿实线读执行，沿点线读控制反馈。',[
'从本轮 schedule 开始：元数据修正 → HC / Attention → HC / Gate → 专家计算与跨卡交换 → 输出头 / 验证 → 采样。图中重复层折叠为一段，HC 保留真实子层连接语义，EPLB 是跨轮反馈。',
'算子效率缩短每个设备阶段；EPLB 减少专家侧尾部；通信融合降低 token 交换与计算的衔接成本；DSpark 控制验证总工作量，ZOS 再把 CPU 开销尽量放入 GPU 窗口。任一收益都必须在其他约束下衡量。',
'验证高性能应同时记录 TTFT、TBT、有效接受 token/s、每层 MoE slowest/mean、通信暴露时间及 CPU 气泡。examples/benchmark.py 与 examples/sweep/run_sweep.sh 是复现实验入口；仓库图表的 4 SM100 prefill 与 64 SM100 decode 不是同资源规模比较。'],
'本报告完成源码与官方文档解读，未运行 SM100 / Ascend 950 推理基准；图的位置与连线长度表达结构和先后关系，不编码测量耗时。',[
n('Schedule / total_q',65,65,'调度控制：C++ scheduler 与 MTPVarlen 共同决定本轮工作量。',w=260),n('ZOS 修正元数据',445,65,'GPU 修正 seqlen、remap、KV 位置。',w=260),n('HC / Attention',445,190,'算子效率：Mega mHC、压缩 / SWA KV、稀疏 FlashMLA。',w=260),n('HC / Gate',65,190,'生成逻辑专家选择，读取 EPLB 物理映射。',w=260),n('Mega MoE / DeepEP',65,325,'通信：域内融合，或 dispatch → grouped GEMM → combine。','comm'),n('输出头 / 验证 / 采样',445,325,'DSpark 验证候选；采样生成本轮接受结果。'),n('专家统计 → EPLB',65,470,'专家分布：累计计数，更新副本与放置，周期搬运权重。','expert'),n('下一轮后处理',445,470,'异步调度：保留在途状态，将 CPU 后处理与下一次 forward 重叠。')],[[0,1],[1,2],[2,3],[3,4],[4,5],[4,6,'feedback'],[6,3,'feedback'],[5,7],[7,0,'feedback']],['deepinfer/engine/llm_engine.py','deepinfer/worker/worker.py',M+'hc.py',M+'attn.py',M+'mlp.py',E+'__init__.py','csrc/engine/mtp_varlen.hpp','examples/benchmark.py','examples/sweep/run_sweep.sh'])

# Resolve evidence at the exact inspected commit. Internal inventory records hashes.
files=sorted({r for p in pages for r in p['refs']})
for f in files:
    if not (SRC/f).exists():
        if f=='examples/sweep/run_sweep.sh':
            for p in pages:p['refs']=['scripts/run_sweep.sh' if r==f else r for r in p['refs']]
files=sorted({r for p in pages for r in p['refs']})
evidence=[]
for f in files:
    data=(SRC/f).read_bytes()
    evidence.append(dict(path=f,sha256=hashlib.sha256(data).hexdigest(),lines=len(data.splitlines()),url=f'https://github.com/deepseek-ai/DeepInfer/blob/{REV}/{f}'))
(OUT/'sources.json').write_text(json.dumps(dict(revision=REV,accessed='2026-10-21',files=evidence),ensure_ascii=False,indent=2))
template=(OUT/'template.html').read_text()
glyph=Path('/Users/yin/AI_Infra/ai-infra-research/methods/llm-compute-diagrams/assets/approved-glyphs/pattern-compute.svg').read_text()
result=template.replace('__PAGES__',json.dumps(pages,ensure_ascii=False)).replace('__REV__',REV).replace('__GLYPH__',glyph)
(OUT/'deepinfer-system-20261021-r1.html').write_text(result)
print(f'Built {len(pages)} chapters; {len(evidence)} official files pinned at {REV}')
