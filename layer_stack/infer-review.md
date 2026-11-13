# Inference Layer Stack 产品分析与优化方案

核心判断：当前产品已经具备较好的模型推理结构可视化基础，但距离面向推理工程师的生产级可观测与问题诊断工具，还有明显差距。

它目前更接近一个交互式的 Model Inference Architecture Explorer（模型推理架构探索器），而不是完整的 Inference Observability / Debugging Workbench（推理可观测与诊断工作台）。

最值得保留的不是单独的 2.5D 模型层栈，而是它已经建立的几个重要交互关系：

1. 模型层与 Attention 类型的关联。
2. Token 位置与 Prefill / Decode 阶段的关联。
3. KV Cache 与模型层、Token 位置的关联。
4. 层内算子结构与缓存读写过程的关联。

下一阶段不建议简单增加更多指标、更多图表，而应将产品从：

模型结构是什么 → 推理过程中发生了什么 → 为什么发生性能问题 → Agent 如何定位和修改问题

逐步升级。

以下分析以当前线上页面和 GitHub `main` 分支的实现为依据。需要特别区分：代码中已经实现的交互、基于本地配置的结构信息、页面模拟数据，以及尚未接入的真实运行时能力。

## 1. 当前产品定位与能力盘点

已具备交互原型

尚非真实运行时观测

[LLM Visualization: A 3D Interactive Walkthrough of GPT-Style Transformers | WebGL / WebGPU Community — Showcase, Tutorials, Examples & More](https://images.openai.com/static-rsc-4/5qfhsbBqsUjnygvOnaDAulROG59Wr3WFSXb5xMSna7MdrA6FtzLa8f-rNBtP3R2QwXRUaacIKcETXIX7MjayxHfz5P2gZkq8_2a9mPUiuC6ctB4k7B_hblPXiPW-t71Ev0Yvz7W7NPx2CeOhJBIgFgd1SQc3iZMmnmvGzl-42Ng?purpose=inline)

[webgpu.com](https://www.webgpu.com/showcase/3d-interactive-llm-visualization-gpt-style-transformers/?utm_source=chatgpt.com)

### 1.1 已具备的核心能力

| 能力       | 当前实现                    | 客观评价               |
| -------- | ----------------------- | ------------------ |
| 模型层栈     | DeepSeek V4 Flash，43 层  | 结构总览清晰             |
| 层类型识别    | SWA / CSA / HCA         | 能表达不同 Attention 分支 |
| 空间视角     | 2.5D / Front / Side     | 有较好的结构探索能力         |
| 层级选择     | 43 层逐层定位                | 能建立全局与局部关联         |
| 推理阶段     | Prefill / Decode        | 已有阶段切换基础           |
| Token 过程 | Token 序列与位置推进           | 可以理解请求执行顺序         |
| KV Cache | SWA 逐位置、HCA 压缩记录        | 有缓存概念与层级关联         |
| 层内计算     | 投影、RoPE、Attention、MoE 等 | 具有初步计算路径表达         |
| 请求播放     | 步骤导航、播放、重置              | 支持静态场景探索           |

资料依据：线上页面及 `inference-layer-stack.html` 的 HTML、CSS、JavaScript 实现。

[image](https://www.google.com/s2/favicons?domain=https://yinyucheng0601.github.io\&sz=32)

模型推理+1



### 1.2 当前实现中值得肯定的设计

优势一：用模型层作为统一导航对象。

没有将模型架构、KV Cache、Token 视图拆成互不相关的页面，而是通过当前选中层进行联动。

这很重要，因为推理问题往往不是单独发生在某个指标上，而是发生在模型结构、数据对象和执行过程的交界处。

优势二：开始表达 Prefill 和 Decode 的不同计算语义。

代码已经区分：

- Prefill：输入 Prompt，建立历史 KV。
- Decode：输入当前 Token，读取历史 KV 并写入当前 KV。
- 采样：生成下一个 Token，再进入下一轮 Decode。

这比仅仅展示模型层级关系更接近实际推理执行过程。

优势三：开始表达不同 KV 类型的存储语义。

SWA 使用逐位置记录，HCA 使用压缩记录，并且可以跟随 Token 位置推进。

它已经具有进一步发展为 KV Cache 生命周期可视化的基础。

优势四：有结构和计算两个观察尺度。

2.5D 模型层栈负责宏观结构，Front 负责当前层的局部计算关系。这种全局—局部的交互方式值得保留。

但需要注意：当前 Front 图仍然主要是结构示意图，并非完整的算子执行 DAG 或硬件执行图。

## 2. 核心功能缺失：从结构可视化到真实推理观测

我认为当前最重要的缺失不是模型结构，而是三个维度：

- 状态缺失： 看得到 KV Cache 的位置，但看不到真实缓存状态和资源消耗。
- 执行缺失： 看得到计算关系，但看不到计算、通信、同步和等待如何共同影响延迟。
- 因果缺失： 看得到模型对象，但无法从性能异常反向定位到层、算子、设备、代码和配置。

下面分别分析。

### 2.1 KV Cache：当前最大的一处能力缺口

高优先级 P0

[Efficient Memory Management for Large Language Model Serving with PagedAttention - Zilliz Learn](https://images.openai.com/static-rsc-4/64eeBZhhEblFC87GhC6v9UZdBbzlC8PvS85qmk8CztKMdfqKBjM9a4426IYzVKTyCAgMahi1Fxph0CFlwAijlQJ17X_0crWCuYPl3RlxtmdOEqCqVXHNxg-akAFTwxFRyoNuBqvspAeUZxMIg-8ASadXaOdVUXhaGaudQWfeh4I?purpose=inline)

[Multi-tier dynamic storage of KV cache for LLM inference under resource-constrained conditions | Complex & Intelligent Systems | Springer Nature Link](https://images.openai.com/static-rsc-4/tnhVW1NAHFLC_sy22icdYv05pxNdX-ca9xM1Et-qK9mELi3o8cGj8fUJf8nUKucnmCSZU-UXRaAskTNq7sNjp--OXz_LJXF__LLsdNKIv0K8zVi2T49vcbEI1plTDGv7HFYy_WTbvvwcCHl85jN7-e_erFR6DTRBOJupQ3hXdos?purpose=inline)

[How prompt caching works - Paged Attention and Automatic Prefix Caching plus practical tips – sankalp's blog](https://images.openai.com/static-rsc-4/0ax1i9u8Lp8TAEniHQgxkrkjmNrLrUinYCYCrqhaGChSMnWTl_RGwZeQLKXin1-3lQucBKe5dia40kSephyjogk0wBi4UG3zU_IinQV2vc_vGcN33Q8ZEgxXCnwQ4XnwnT3iQRXS_ZlaE6wC0hd4l2EjKLav-9QI5so5uGUyGd4?purpose=inline)

10

当前具备什么？

目前已经可以：

- 按模型层查看 KV Cache。
- 按 Token 位置查看历史窗口。
- 区分 SWA 和压缩 KV。
- 观察 Decode 写入与历史读取。
- 根据当前层切换 KV 视图。

但它还没有解决工程师真正遇到的 KV Cache 问题。

| 高频工程问题           | 当前产品   | 缺失能力                  |
| ---------------- | ------ | --------------------- |
| KV Cache 占用过大    | 显示位置记录 | 实际字节数、HBM 占用          |
| 长上下文导致显存不足       | 显示滑窗   | 容量预算、增长曲线             |
| KV Cache 命中率低    | 未展示    | Prefix Cache Hit/Miss |
| Cache Block 分配异常 | 未展示    | Block Table、分配和释放     |
| 显存碎片             | 未展示    | 内部/外部碎片与可用块           |
| KV Cache 访问效率低   | 显示读取位置 | 读带宽、访存耗时、访问量          |
| KV Cache Offload | 未展示    | HBM→DRAM→SSD 数据迁移     |
| PD 分离            | 未展示    | Prefill/Decode KV 传输  |

尤其需要强调：

KV Cache 的位置视图，不等于 KV Cache 的存储与访问可观测性。

一个工程师真正需要理解的是：

KV Cache 的完整对象关系

Request / Sequence

Prompt Length · Decode Length · Batch · Prefix

Layer

Attention 类型、KV 结构

KV Tensor

K/V、Shape、Dtype、Layout

Block / Page

Block ID、映射、生命周期

Physical Memory

HBM、DRAM、SSD

运行时行为

Allocation → Write → Read → Reuse → Eviction → Transfer

性能结果

Memory Utilization · Cache Hit Rate · Bandwidth · Latency · Fragmentation

这里需要特别增加三个交互能力。

A. KV Cache 容量与生命周期

不只是展示一个 Cache，而是能够从 Request 下钻到 Layer、Tensor、Block、Physical Memory。

例如：

- 当前请求分配多少 KV Block？
- 哪些 Block 正在使用？
- 哪些被共享？
- 哪些正在被回收？
- 哪些进入 Offload？
- 为什么发生 Cache Eviction？

B. KV Cache 访问与性能

应该关联：

- KV Read / Write Bytes。
- HBM Read / Write Bandwidth。
- KV Gather 时间。
- Cache Hit Rate。
- Block 数量与访问次数。
- 不同 Layer 的 KV 访问差异。

C. KV Cache 跨设备流转

需要将 Prefill 和 Decode 分离部署纳入模型：

[A Practical Guide to LLM Inference at Scale](https://images.openai.com/static-rsc-4/ETaDDekPv8q4UPtzbgkDz5DD3zzt6vj0QbHZx-WRnxbMq-L6LR1Mu7WeoRsVbwTg6Tf_Ugtws6VqcaVnPlLqD9LeovQYNrpr635JVPNPBMH-ND4ZcM_zcM63kVZvs-GS2odxddf2cUBXtadhNu1AIhCUIKYOM3dryhT-m8irXZI?purpose=inline)

[theneuralmaze.com](https://www.theneuralmaze.com/p/a-practical-guide-to-llm-inference?utm_source=chatgpt.com)

Prefill 生成 KV，Decode 获取 KV，之间涉及 P2P、RDMA、网络传输、Host Staging、设备内存写入和同步。

vLLM 的公开设计已经涉及 KV Connector、Layerwise Transfer、Host Offloading 等机制；这些都是当前 Layer Stack 尚未覆盖的关键对象。

[image](https://www.google.com/s2/favicons?domain=https://docs.vllm.ai\&sz=32)

vLLM Ascend+2



优化建议：增加 KV Cache Inspector，而不是继续扩充当前 KV 弹窗。

它应该具有三个观察尺度：

1. Global：整个模型的 KV 分配和容量。
2. Layer：每层 KV 类型、大小、读写和压缩。
3. Block：具体 Block 的映射、生命周期和访问。

这样才有机会从架构解释工具升级为 KV 问题定位工具。

### 2.2 计算与通信掩盖：当前缺少最关键的执行时间关系

高优先级 P0

[PyTorch Trace Analysis for the Masses – PyTorch](https://images.openai.com/static-rsc-4/CigkvB3Qut-5q3dCvDYPHlECLfY2lns0gCFgCN0ZbFFPLLiHvMhSYuutF7rHCS46SRw12pbou9xe5URxayx6WgSSbDHw6aHaxzsUQb5Xuv5VkcwncdHRKTY7xTHvfbm62m2H0a8HVp34-9h16nOJz-FI_igJCCVsZyHNp_YnCF0?purpose=inline)

[Communication Overlap — NVIDIA NeMo Framework User Guide](https://images.openai.com/static-rsc-4/PL7DWlWgU_CDSbziUqSn5v1eBT7T_wS7nyyHDq5LvHeoohZ3f5BSYiJBkqfNUZ13ZrvWMwyTAfO0dv7Hp160I1-4oOby6RN5g1yfI_Q-vIT9pOILX0VfG7vhi0EJ7i1gc8e5ubAFXjRRCjdAM6LIOr-mDPfqIG-sWfQEh00eGxQ?purpose=inline)

[使用Nsight Systems分析与优化AI训练及推理性能-容器服务 Kubernetes 版 ACK-阿里云](https://images.openai.com/static-rsc-4/XzNRptio_lgqsB-Qz9JEa2YoEQTOCXgPldo8WAweHkekYFJ3KQa07jGYW7qyXKk2dOkLwWl_sSUHHkGpjLd3loA4lZOpNpuotVIqF7YwrD6pqbhx4-8oMXOfzi7mJW4nmKO5Wm4nDa_hCVLYvJalSMvyayQDoe8zGLCSZZdC3Qs?purpose=inline)

8

这是当前产品第二个非常明显的能力缺口。

当前层内图主要表达：

`Input → Projection → Attention → Output → MoE`

但在真实推理过程中，算子之间不只是计算依赖，还存在：

- Kernel Launch。
- Stream 调度。
- Event / Barrier。
- AllReduce / AllGather。
- ReduceScatter。
- AllToAll。
- P2P / RDMA。
- 通信等待。
- 计算与通信重叠。

计算图不等于执行时间图。

例如，一个 Attention 层可能存在以下过程：

示意：TP 推理中的计算与通信重叠

以下为解释性示意，并非该页面的实测数据。

时间 →

Rank 0 Compute

Projection

Attention

FFN

Rank 0 Comm

AllReduce

AllGather

Rank 1 Compute

Projection

Attention

FFN

Rank 1 Comm

AllReduce

AllGather

计算

通信

真正需要观测的是通信与计算是否同时执行、是否存在等待，以及通信是否处于关键路径。

工程师需要回答的不是简单的通信耗时，而是：

| 问题                        | 需要观测的对象                             |
| ------------------------- | ----------------------------------- |
| 通信是否掩盖在计算后面？              | Compute / Comm Overlap              |
| 通信是否拖慢计算？                 | Stream Dependency、Wait Time         |
| 哪个 Rank 最慢？               | Rank Skew、Straggler                 |
| AllReduce 是否成为瓶颈？         | Collective Duration、Bytes           |
| MoE AllToAll 是否拖慢 Decode？ | Dispatch / Combine Latency          |
| 哪个同步点阻塞了后续计算？             | Event / Barrier / Critical Path     |
| 带宽不足还是通信调度问题？             | Link Utilization、Bandwidth、Queueing |

NVIDIA Nsight Systems 已经将通信与计算重叠率、NCCL 时间、Rank 参与情况和 Straggler 作为专门分析对象。

[image](https://www.google.com/s2/favicons?domain=https://docs.nvidia.com\&sz=32)

Nsight Systems+1



优化建议：增加 Execution Timeline，作为 Layer Stack 的第二个核心视图。

它应该不是另一张独立的时间图，而是与当前模型层栈联动：

- 点击 Layer 18 → 时间线定位 Layer 18。
- 点击 AllReduce → 高亮相关计算节点和通信节点。
- 点击等待区间 → 反向定位依赖的 Event / Stream。
- 点击 Rank → 查看该 Rank 的执行进度和其他 Rank 的差异。
- 点击 MoE Expert → 定位对应的 Token Dispatch / Expert Compute / Combine。

最重要的是建立：

`Layer → Operator → Kernel → Stream → Communication → Rank → Device`

这条跨层关联链。

否则工程师只能看见通信耗时，却无法知道为什么通信影响了计算。

### 2.3 Agent 开发途径：当前产品还没有进入 Agent 工作流

高优先级 P0

这是我认为未来最值得投入的方向。

当前页面的交互方式主要是：

- 人工选择模型层。
- 人工推进 Token。
- 人工查看 KV。
- 人工查看层内图。
- 人工理解模型结构。

这是一种典型的 Human-driven Exploration。

但是，在 Agent 参与推理引擎开发、算子开发和性能优化之后，用户的工作方式会发生变化。

用户可能直接提出：

- 为什么 ITL 突然升高？
- 为什么 Decode 阶段 KV Gather 变慢？
- 为什么 TP 通信没有被计算掩盖？
- 为什么某些 Rank 比其他 Rank 慢？
- 哪个 Layer 导致 KV Memory 增长？
- 修改某个 Attention Kernel 后，为什么性能没有提升？

此时用户不应该从模型层栈开始寻找问题。

Agent 应该先定位问题，再让用户通过 Layer Stack 理解证据和因果关系。

当前代码没有发现面向 Agent 的任务入口、结构化诊断接口、运行时数据接口或诊断结果与代码位置的关联机制。因此，不能把当前的自动播放和交互导航视为 Agent 能力。

#### 建议的 Agent 工作流程

01 · Agent 接收问题

ITL 从 12ms 增长到 22ms，定位性能退化原因。

02 · Agent 关联证据

Request → Decode → Layer → KV → Kernel → Comm → Rank

03 · Agent 生成诊断假设

例如：KV Gather 延迟上升，可能与 KV 访问量、Cache Miss 或跨设备读取有关。

04 · Layer Stack 自动定位

自动选中异常 Layer，展示 KV 状态、计算路径、时间线及证据。

05 · Agent 给出修改建议

定位配置、算子或 Kernel 代码，展示修改前后的差异。

06 · 实验验证

重新运行，比较 TTFT、ITL、KV、通信重叠率和资源变化。

这里要明确 Agent 与 UI 的职责：

| Agent 负责 | UI 负责     |
| -------- | --------- |
| 任务理解     | 任务上下文展示   |
| 数据检索     | 多对象关系呈现   |
| 异常检测     | 异常位置高亮    |
| 根因假设     | 因果链与证据展示  |
| 代码定位     | 源码与运行对象映射 |
| 修改建议     | 修改前后差异    |
| 实验执行     | 实验结果比较    |

UI 不应该重复 Agent 已经完成的自然语言总结，而应该提供 Agent 难以通过纯文本高效表达的空间关系、时间关系、数量关系和证据关系。

## 3. 当前 UX 体验漏洞：为什么用户还不能用它解决真实问题？

除了功能缺失，当前交互模型也有一些值得优先修正的问题。

### 3.1 信息层级与用户任务不完全匹配

目前产品是模型结构优先：

`Layer → Token → KV → Layer 内部图`

但工程师实际的问题入口往往是：

`性能异常 → 推理阶段 → 异常请求 → 异常 Layer → KV / Compute / Communication`

两者是不同的信息组织方式。

建议增加两种入口：

- Architecture Mode： 保留当前模型层栈，面向结构理解和探索。
- Diagnosis Mode： 从异常请求、性能指标或 Agent 诊断结果进入，自动定位模型对象。

不要让所有用户都必须先理解完整模型结构，才能找到问题。

### 3.2 结构图的视觉语义与真实运行状态混淆

当前页面的层栈、Cache 图元、Token 位置和算子节点使用了比较一致的视觉语言。

但它们实际上代表不同性质的数据：

| 对象           | 数据性质    |
| ------------ | ------- |
| 模型层级         | 静态架构    |
| Attention 类型 | 模型配置    |
| Token 位置     | 请求运行状态  |
| KV Cache     | 运行时资源状态 |
| 算子执行         | 动态执行事件  |
| 性能异常         | 观测与分析结果 |

这些对象不应该仅依靠相似的图形样式表达。

建议统一增加数据状态标识：

- Static：静态配置。
- Observed：真实采集。
- Derived：计算推导。
- Simulated：模拟数据。
- Inferred：Agent 推断。

尤其需要区分 Agent 的推断结果与实际观测证据。

### 3.3 数据真实性和来源说明的位置不合理

当前页面的说明弹窗已经明确：

- 层类型和 128 位置的 SWA 窗口来自本地配置。
- Prompt 长度、生成位置和窗口范围属于页面设定和逻辑推导。
- 层内图根据 Attention 类型展示对应分支。

这是非常值得肯定的透明度设计。

但这类信息不应该只隐藏在帮助弹窗中。

建议每个关键数据对象都支持查看：

`Value → Source → Timestamp → Scope → Formula → Confidence`

例如：

| KV Cache 指标        | 展示内容        |
| ------------------ | ----------- |
| KV Size            | 真实采集 / 公式估算 |
| KV Window          | 模型配置        |
| Cache Hit Rate     | 运行时采集       |
| Compression Ratio  | 配置 / 实际观测   |
| Cache Read Latency | 运行时采集       |
| Agent 判断           | 推断及证据       |

这样才不会让用户误以为一个漂亮的模拟图就代表真实硬件行为。

### 3.4 2.5D 视觉探索与问题定位之间缺少快捷通道

当前 2.5D、Front、Side 视图适合结构探索，但对于定位任务，切换视角并不一定是最有效的交互。

建议增加：

- 从异常直接跳转到目标 Layer。
- 自动展开对应 KV / Operator。
- 选中时间线事件时同步定位模型层。
- 通过 URL 或诊断上下文恢复当前观察状态。
- 保留用户当前的筛选条件和选中对象。

尤其是最后一点：当 Agent 已经定位到某一 Layer 时，用户不应该因为切换视图而丢失上下文。

### 3.5 当前单请求示例不足以支撑推理工程分析

代码中固定了：

- 43 层。
- 一组固定的 SWA / CSA / HCA 映射。
- 132 个 Prompt Token。
- 位置 132、133 的 Decode 示例。
- 固定的请求步骤。

它可以很好地解释一个请求的逻辑过程，但还不能表达真实服务中的：

- 多请求并发。
- Continuous Batching。
- 不同请求长度。
- Chunked Prefill。
- 不同 Batch 下的 Decode。
- 请求抢占与恢复。
- 多 Rank 并行。
- 多设备执行。

这不是当前交互设计做得不好，而是当前数据模型的范围限制。

建议把请求序列从固定演示数据升级成可导入的 Request Trace。

## 4. 优化后的产品信息架构

我不建议把 KV Inspector、通信时间线、Agent 诊断分别做成三个孤立工具。

更合理的方式是以模型层栈为核心，建立五个关联观察视图。

## Inference Observability Workspace

统一上下文 Context

Model · Engine · Request · Phase · Batch · Rank · Device · Time Range

01 Architecture

模型层、Attention、MoE、算子结构

保留现有能力

02 KV Inspector

Block、容量、读写、命中、Offload

重点新增

03 Execution Timeline

Kernel、Stream、Comm、Sync、Rank

重点新增

04 Performance

TTFT、ITL、吞吐、延迟、资源效率

重点新增

05 Agent Diagnosis

贯穿所有视图

异常定位、证据关联、根因分析、代码定位、修改建议和实验验证。

统一对象关联

Request ↔ Layer ↔ Tensor ↔ KV ↔ Operator ↔ Kernel ↔ Stream ↔ Rank ↔ Device

所有视图共享同一份上下文，而不是分别维护独立的对象选择状态。

### 4.1 五个视图的具体职责

| 视图                 | 核心问题       | 主要可视化                |
| ------------------ | ---------- | -------------------- |
| Architecture       | 计算结构是什么？   | Layer Stack、算子 DAG   |
| KV Inspector       | 缓存如何存储和访问？ | Block Map、Memory Map |
| Execution Timeline | 计算和通信如何执行？ | 多轨时间线、依赖关系           |
| Performance        | 性能在哪里退化？   | 指标趋势、分布、异常           |
| Agent Diagnosis    | 为什么出现问题？   | 因果链、证据、修改建议          |

这里有一个重要原则：

Architecture 是空间结构，Execution 是时间结构，KV 是资源结构，Performance 是结果结构，Agent 是跨结构的诊断入口。

这五个维度共同构成推理场景的可观测体系。

## 5. 三个重点场景的具体 UI 优化方案

### 场景 A：KV Cache 问题定位

建议将现有 KV 弹窗升级为独立的 Inspector。

[vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention | Unknown NLP Lab](https://images.openai.com/static-rsc-4/3j39E9SVBvgcmxx5T06SIChZPwr3e6dn-CAnS_k7d4v1FdKWUtlAyhv8gstsQS8zYF5t2hGLPzF6f0D_7ZLAw8RDJSS53eootvHEiOsAuhEY2fPcEA4EGOTv_b6MThafMLD7yHslRbL3-fOIu0dDdZt13HocG8Ib6w7SuXzNdHY?purpose=inline)

[Introducing Radeon™ Memory Visualizer - AMD GPUOpen](https://images.openai.com/static-rsc-4/KQEbxEgqyYQGZN1xgR0Xnt_2DbVs8Qd4L0m0DErPWJvPGbzWKwfRv4mk2zcoSGogKdOprAlotO65DNZrlWX_Nhg7T0Db1TGEOo6Y8GExUmcjXxk93QZfRAt9DD4gntxky2xBVzClBDVlMEz_EQaaFfv5gZhLf_fx19B2GUD7MNo?purpose=inline)

[User Guide — Nsight Systems](https://images.openai.com/static-rsc-4/dJjrH3jsb8v6iy9AmLIBbGIdFwvNV7Jq7RzT79n2DsIHkiaQwik2mHRQ-KLkgGDNdfvgBIXEUQQ6KXnC4gVo5a4Z7qytjpt9Kz_fHNaq6Jfud7oWf7SM41oHEdlqbGRy7wyZqF7wObR7SoQcHM9b0gH6EyHrKpzQk5h2b95OOJM?purpose=inline)

7

建议布局：

| 区域 | 展示内容                          |
| -- | ----------------------------- |
| 顶部 | KV 总量、利用率、Hit Rate、读写带宽       |
| 左侧 | 模型层栈，标记每层 KV 资源占用             |
| 中间 | KV Block / Page 分配图           |
| 右侧 | 选中 Block 的详情和生命周期             |
| 底部 | KV Read / Write / Offload 时间线 |

关键交互：

1. 选 Layer → 高亮该层的 KV Block。
2. 选 Block → 查看关联 Request 和 Token。
3. 选 Request → 查看所有 Layer 的 KV 分布。
4. 选异常 → 展示资源增长、Eviction 和延迟变化。
5. Agent 定位 → 自动跳转对应 Block。

这里需要支持 GQA、MQA、MLA、压缩 KV 等不同模型缓存表示，不能把所有模型统一假设成相同的 K/V Tensor 和存储布局。

### 场景 B：计算与通信掩盖分析

建议增加真正的多轨时间线，而不是在层内图上继续增加通信节点。

[Profiling CUDA Using Nsight Systems: A Numba Example | by Carlos Costa, Ph.D. | TDS Archive | Medium](https://images.openai.com/static-rsc-4/hhvGYCMnC2kNww6Si8rmlBe9tcT4IhQGe_wjpemUirdPFJ3iiRtSO65JAz5bafq0WHwQZLdKcT31vmF_j9cf3dCEByJ6xkwLOfXQltDA3c9Lftr6MDz6w5JShNfVzrMOZPyZDFbeLoHjTwSngX8wrvCsKJnSHwLl1xPm3yLC69Y?purpose=inline)

[medium.com](https://medium.com/data-science/profiling-cuda-using-nsight-systems-a-numba-example-fc65003f8c52?utm_source=chatgpt.com)

建议分成四个层次：

| 轨道              | 关键对象                             |
| --------------- | -------------------------------- |
| Model           | Layer / Attention / MoE          |
| Compute         | Kernel / Compute Task            |
| Communication   | AllReduce / AllGather / AllToAll |
| Synchronization | Event / Barrier / Wait           |

右侧提供选中事件的 Inspector：

- Start / End / Duration。
- Rank / Device / Stream。
- 输入输出 Bytes。
- 依赖事件。
- 是否与计算重叠。
- 是否在关键路径。
- 相关算子和代码位置。

特别建议增加三个计算结果：

\\[ T\_{\text{compute}},\quad T\_{\text{comm}},\quad T\_{\text{overlap}} \\]

以及：

\\[ R\_{\text{overlap}} = \frac{T\_{\text{overlap}}} {T\_{\text{comm}}} \\]

其中必须明确时间窗口、事件配对规则以及是否存在多条并行通信流，不能简单地将所有 Kernel 时长相加后计算重叠率。

还要区分：

- 通信本身耗时。
- 通信未被计算掩盖的暴露时间。
- 同步导致的等待时间。

这三个指标对于定位问题有完全不同的意义。

### 场景 C：Agent 驱动推理开发

建议 Agent 不仅是右侧的聊天窗口，而是整个产品的任务组织者。

[Raindrop | AI Agent Monitoring & Observability](https://images.openai.com/static-rsc-4/4Zi9bQku_nMtUDPQF5hZoCrwRMiv8k0w9hL6FmdOH9yXoLCo8CKE2ed_XioHiUkrxDhMJjkJ2qaKhdhAfver9TnTFY8FIALe7sZrh1JKsXlKJ-N_fxL6g7BHjgQE1O4jXR74a3ykJWrDgX-jxUP76MQGJc-6YPs4NmA5shbL5y4?purpose=inline)

[raindrop.ai](https://www.raindrop.ai/?utm_source=chatgpt.com)

UI 建议采用：

顶部：Agent Task Context

显示当前 Agent 正在执行的任务、目标、运行环境和相关实验。

中间：Evidence Graph

显示 Agent 找到的异常对象：

`Request → Layer 18 → KV Gather → MTE2 → Memory Access`

每个节点都可以点击查看原始证据。

底部：Action / Experiment

展示：

- Agent 修改了什么。
- 修改了哪个文件、函数或 Kernel。
- 修改前后编译配置。
- 性能对比。
- 是否通过正确性验证。

关键在于让 Agent 的每一个诊断结论都能够回到原始证据，而不是只呈现一段解释性文字。

## 6. 优化优先级：应该先做什么？

不建议一次性重构全部产品。建议按用户价值和数据接入难度分三个阶段。

| 优先级 | 优化项目                | 用户价值 | 实施重点                           |
| --- | ------------------- | ---- | ------------------------------ |
| P0  | 真实数据接入与数据溯源         | 非常高  | Model / Request / Trace 数据统一   |
| P0  | KV Cache Inspector  | 非常高  | Block、容量、访问、生命周期               |
| P0  | Execution Timeline  | 非常高  | Compute / Comm / Sync / Rank   |
| P0  | Agent Diagnosis     | 非常高  | 自动定位、证据、代码映射                   |
| P1  | 多请求与 Batch 观测       | 高    | Continuous Batching、请求竞争       |
| P1  | Prefill / Decode 分离 | 高    | PD、KV Transfer、网络              |
| P1  | MoE 专项观测            | 高    | Router、Dispatch、Expert、Combine |
| P1  | 多 Rank / Device 关联  | 高    | TP / EP / DP、Rank Skew         |
| P2  | 性能实验对比              | 高    | Baseline、Regression、A/B        |
| P2  | Agent 自动优化闭环        | 高    | 修改、运行、验证、回滚                    |

### 6.1 实际需要哪些数据？

这是产品能否从演示工具变成真实工程工具的决定性条件。

| 数据来源                | 必需数据                           |
| ------------------- | ------------------------------ |
| Model Config        | Layer、Attention、MoE、KV 结构      |
| Request Trace       | Request ID、Token、Batch、阶段、时间   |
| KV Runtime          | Block ID、分配、释放、读写、命中           |
| Kernel Trace        | Kernel ID、Duration、Stream、输入输出 |
| Communication Trace | Collective、Bytes、Rank、Duration |
| Device Telemetry    | HBM、带宽、计算利用率                   |
| Scheduler Trace     | Batch 调度、请求等待、抢占               |
| Agent Trace         | 任务、工具调用、诊断结论、代码修改              |

建议所有数据使用统一关联标识：

`request_id / model_id / layer_id / operator_id / kernel_id / rank_id / device_id / timestamp`

尤其需要注意事件时钟同步、不同采集系统的时间精度和 Trace 丢失情况，否则无法可靠分析计算与通信重叠。

### 6.2 建议建立的验证指标

不能仅以页面是否完整、图形是否漂亮作为成功标准。

| 评价方向     | 验证指标                          |
| -------- | ----------------------------- |
| 问题定位     | Mean Time to Locate           |
| 诊断准确性    | Root Cause Precision / Recall |
| KV 分析    | KV 异常定位时间                     |
| 通信分析     | Overlap 问题识别准确率               |
| Agent 协作 | Agent 诊断证据采纳率                 |
| 工程效率     | 从异常到修复的时间                     |
| 可用性      | 用户任务完成率                       |

建议首先选择三个真实任务进行对照验证：

1. KV Cache 占用异常，定位造成内存增长的 Layer。
2. Decode ITL 上升，定位通信未掩盖的等待时间。
3. Agent 修改 Attention Kernel 后性能退化，定位变化发生在哪个执行环节。

比较传统日志、Profiler 与增强后的 Layer Stack 的任务完成时间和诊断准确性。

## 7. 最终建议：产品应该如何演进？

我认为应该保留当前产品的核心视觉资产，但改变产品的中心思想。

## 从 Layer Atlas 到 Inference Intelligence

当前阶段

Layer Atlas

理解模型结构、层级关系、Token 位置和 KV 基础逻辑。

下一阶段

Inference Observability

真实运行状态、KV 资源、执行时间、计算通信关系、性能异常。

目标阶段

Agent-driven Inference Engineering

Agent 自动定位问题、关联证据、解释因果、定位代码、执行修改和验证。

### 我认为最重要的五条设计主张

1\. 从结构展示转向对象关系展示。

不要只展示模型有多少层，而要展示 Layer、Tensor、KV、Kernel、Communication、Rank 之间的真实关系。

2\. 从静态架构转向动态执行。

推理性能问题发生在时间维度，必须将模型结构和运行时间线关联。

3\. 从指标展示转向资源与因果分析。

KV Cache、显存、通信和计算不能各自成为孤立指标，需要能够解释相互影响。

4\. 从人工探索转向 Agent 驱动的问题定位。

Agent 应负责搜索、筛选、推断和执行，UI 负责把复杂证据和工程关系清晰地呈现给人。

5\. 从视觉模拟转向可验证的数据表达。

每个数据对象必须具有来源、采集时间、作用范围、计算方法和可信状态。静态、模拟、推导和真实观测必须明确区分。

另外，建议逐步统一为白色或浅灰色的工程视觉基线，采用低干扰背景、清晰的数据层级和高辨识度的异常标记；同时允许用户切换主题。

### 8. 最终结论

| 评价维度            | 当前判断 |
| --------------- | ---- |
| 模型结构表达          | 较好   |
| 层级交互            | 较好   |
| Token / KV 逻辑解释 | 初步具备 |
| 真实 KV 资源观测      | 缺失   |
| 计算与通信执行观测       | 缺失   |
| 多请求与分布式观测       | 缺失   |
| Agent 工程集成      | 缺失   |
| 端到端问题诊断         | 尚未形成 |

我的建议是：下一轮不要优先优化 2.5D 模型层栈的表现形式，而是优先补齐 KV Cache Inspector + Execution Timeline + Agent Diagnosis。

这三个能力会真正改变产品的使用价值。

当前的 Layer Stack 已经解决了一个重要问题：让工程师理解模型推理结构。

下一阶段要解决的是：让工程师和 Agent 能够共同理解一次推理为什么慢、慢在哪里，以及应该修改什么。

这才是它区别于普通模型架构可视化工具的核心竞争力。

参考资料与技术依据

- [当前线上 Inference Layer Stack](https://yinyucheng0601.github.io/AI_Infra/layer_stack/inference-layer-stack.html?utm_source=chatgpt.com)
- [GitHub 源码](https://github.com/yinyucheng0601/AI_Infra/blob/main/layer_stack/inference-layer-stack.html?utm_source=chatgpt.com)
- [vLLM Ascend：Disaggregated Prefill](https://docs.vllm.ai/projects/ascend/en/main/developer_guide/Design_Documents/disaggregated_prefill.html?utm_source=chatgpt.com)
- [vLLM Ascend：KV Cache Offloading](https://docs.vllm.ai/projects/ascend/en/latest/developer_guide/Design_Documents/layerwise_and_sparse_kv_cache_offloading.html?utm_source=chatgpt.com)
- [NVIDIA Nsight Systems：性能分析指南](https://docs.nvidia.com/nsight-systems/AnalysisGuide/index.html?utm_source=chatgpt.com)
- [vLLM：Disaggregated Prefilling](https://docs.vllm.ai/en/stable/features/disagg_prefill/?utm_source=chatgpt.com)


#summary
| 维度          | 已具备优势                             | 功能缺失 / UX 漏洞                                                 | 优化方案                                                                         | 优先级 |
| ----------- | --------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- | --- |
| 模型架构        | 43 层模型栈、SWA/CSA/HCA 区分、2.5D 多视角   | 以结构探索为主，缺少模型上下游贯穿认知；层间关联不足                                   | 建立 Model → Layer → Operator → Tensor 连续下钻，保持空间上下文                            | P1  |
| 推理流程        | Prefill/Decode 切换、Token 推进、层内计算路径 | 阶段割裂，缺少从请求输入到生成输出的完整动态过程                                     | 统一 Request Timeline，连续展示 Prefill、Decode、Sampling、KV 更新                       | P0  |
| KV Cache    | 展示 Token 位置、滑动窗口、压缩 KV            | 缺少真实容量、Block 映射、命中率、读写、回收、Offload                            | KV Inspector：全局容量 → Layer → Tensor → Block → 物理内存，关联生命周期和性能                  | P0  |
| 计算与通信掩盖     | 已有层内算子计算关系                        | 缺少 Kernel、Stream、通信、同步及等待时间；无法判断重叠效果                         | Execution Timeline：Compute/Comm/Sync 多轨泳道，分析 Overlap、Critical Path、Rank Skew | P0  |
| 分布式推理       | 已有单模型、单请求演示基础                     | 缺少 TP/EP/DP、跨 Rank 通信、PD 分离、KV Transfer                      | 关联 Rank/Device，展示 AllReduce、AllToAll、KV 跨设备传输                                | P1  |
| MoE 专项      | 已有 MoE 层内结构                       | 缺少 Expert 路由、Token 分布、负载不均和通信开销                              | Expert Map + Dispatch/Compute/Combine 时间线，定位负载失衡                             | P1  |
| 多请求调度       | 支持单请求 Token 演进                    | 固定 Prompt/Decode 示例，缺少并发、Continuous Batching、Chunked Prefill | Request/Batch Timeline，分析请求竞争、排队和调度策略                                        | P1  |
| 性能诊断        | 可查看模型与 KV 逻辑关系                    | 缺少 TTFT、ITL、吞吐、显存及异常到根因的关联                                   | Performance → Request → Layer → Kernel/KV/Comm 逐级定位                          | P0  |
| Agent 开发工作流 | 已有可交互的结构探索界面                      | 依赖人工逐层查找，缺少 Agent 诊断入口、证据关联、代码映射                             | Agent 自动检索与定位 → UI 展示证据 → 代码修改 → 实验验证                                        | P0  |
| 交互体验        | 2.5D/Front/Side 多视角，层级选择联动        | 视图切换易丢上下文；人工选择成本高；问题入口不明确                                    | 统一画布、语义缩放、原位展开、异常直达、跨视图联动                                                    | P0  |
| 数据可信度       | 明确区分部分配置与模拟逻辑                     | 缺少真实 Trace、数据来源、时间戳、证据链                                      | 统一数据模型，支持真实 Trace 接入、数据溯源及 Agent 结论验证                                        | P0  |

总体建议： 保留现有 Layer Stack 的空间结构表达，优先建设 统一推理流程、KV Inspector、Compute/Comm Timeline、Agent Diagnosis 四项能力。所有能力共享 Request、Layer、Tensor、Kernel、Rank 等对象及上下文，避免拆成独立工具。产品目标从「理解模型结构」升级为「定位推理问题、解释性能瓶颈、验证优化效果」。