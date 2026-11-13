AI Infra 可解释性与可观测性设计体系：总结与技术验证

整体方向成立
 5 项需要修正或补充

一、总体结论
前面的方案已经形成了较完整的 AI Infra UX 设计框架，覆盖算子开发、大模型训练和模型推理三个领域，并将计算对象、跨层关系、可视化、Agent 诊断和证据验证组织在一起。

最值得保留的核心判断是：以计算对象组织信息，以工程问题驱动交互，以证据建立可信结论，由 Agent 动态选择可视化模式。

但需要区分三类内容：
- 技术事实：可以通过编译器、Profiler、运行时文档或实际数据验证。
- 设计假设：逻辑合理，但需要开发者研究和可用性实验验证。
- 架构提案：属于自主设计的方法论，尚不能被视为已经验证的行业标准。
二、核心设计观点总结与验证
设计观点	验证结果	结论与修正建议
Object-Centric：以计算对象为中心	成立	能支持从模型、算子追踪到执行和硬件，适合作为信息组织原则
Relationship-Aware：跨层关系建模	成立	符合复杂计算系统的分析需求，但必须区分静态映射与动态执行关系
Evidence-Driven：以证据支撑诊断	成立	必须保留原始来源、采集条件、证据与结论的对应关系
Agent-Native：Agent 动态生成界面	设计假设	方向合理，但动态布局的稳定性、准确率和认知成本尚需验证
Human-Controlled：人工干预	成立	高风险修改、实验配置和验证标准需要明确控制权限
Unified Observability Core	架构提案	共享语义与交互契约具有价值，但三类领域不一定能共用全部数据 Schema
单画布渐进披露	设计假设	符合此前提出的上下文连续性需求，需要测试复杂场景下的导航效率
问题驱动而非 Dashboard 驱动	设计假设	与已有开发者访谈方向一致，仍需比较不同任务的使用效率
先算子、再训练和推理	实施建议	RMSNorm 可以验证局部诊断闭环，但不能覆盖分布式系统特有的通信、调度与因果问题

总体判断：方法论具有一致性，尚未构成经过实验验证的完整设计系统。 当前最主要的工作应从继续扩充概念，转向验证语义模型、Pattern 选择和诊断交互是否真正可复用。
三、三个领域的能力对照
维度	算子开发 Operator	大模型训练 Training	大模型推理 Inference
核心研究对象	Operator / Tensor / Tile	Model / Layer / Rank	Request / Token / KV
用户核心问题	为什么这样编译、执行或出错？	计算如何分布、为何低效？	请求为什么延迟、吞吐为何下降？
主要关注	精度、内存、性能	训练稳定性、计算通信、资源利用	TTFT、ITL、TPS、调度与缓存
关键关联路径	Source → IR → Tile → Core	Model → Parallelism → Rank → Device	Request → Step → Operator → Device
主要可视化	计算图、Pass Diff、Tensor Grid、执行泳道	模型图、并行拓扑、通信时间线	请求时间线、KV Map、延迟归因
Agent 典型任务	定位访存或精度问题	分析计算通信不均衡	诊断长上下文延迟
典型验证任务	RMSNorm Shape 性能退化	MoE Expert Load Imbalance	Decode ITL 异常
共享能力	对象选择、上下文关联、证据追踪、实验比较、结果验证	同左	同左
差异化能力	编译转换与指令语义	分布式并行与训练质量	请求调度与缓存生命周期

这里有一个重要结论：三个领域真正共享的是语义契约、交互协议和诊断机制，并非完全相同的页面或可视化形式。

因此，统一设计系统更适合采用“共享底层能力 + 领域专属 Pattern”的结构。
四、技术事实核查：哪些内容需要修正？
对照 PyTorch、Megatron Core、vLLM、NVIDIA Nsight 和 OpenTelemetry 的官方文档，核心技术概念基本正确，但以下五项值得修正。
核查项	原方案	验证结果	建议修正
六层语义模型	L1–L6 包含模型、算子、编译、内存、硬件、运行结果	需调整	六层不属于同一种层级。模型、编译、硬件是对象层；Runtime Outcome 是测量结果。建议把指标作为可关联属性，而非固定第六层
分布式并行度	DP × PP × CP × TP × EP = Total Ranks	有条件成立	Megatron Core 支持该乘积关系，但不同实现存在不同的 Dense/Expert 并行网格。不能脱离实现直接推导 Rank 归属
性能归因	分析计算、通信、内存的耗时贡献	成立	必须保留并行重叠和关键路径，避免重复计算耗时
KV Cache Hit/Miss	作为 KV Cache Inspector 的通用能力	需细化	Prefix Cache Hit、Block Reuse、KV Residency 和 KV Gather 是不同概念，不能用一个命中率概括
统一数据 Schema	所有计算对象共享 Identity、Time、Space、Metrics 等字段	需分层	静态对象没有天然的 timestamp/duration，应区分 Object、Execution、Observation、Evidence

参考依据：
- Megatron Core Parallelism Guide：确认多维并行组织及 Expert Parallelism 的约束。
  
  Megatron Core
- PyTorch Distributed Tensor Parallel：支持多维设备网格与张量映射。
  
  PyTorch 2.14 documentation
- NVIDIA Nsight Systems：支持时间线、并发和执行行为分析。
  
  Nsight Systems
- vLLM Metrics：明确 TTFT、ITL、Prefix Cache 和 KV Residency 的不同测量语义。
  
  vLLM
- OpenTelemetry Semantic Conventions：提供跨系统关联 Trace、Metric、Log 的标准化思路。
  
  OpenTelemetry
五、Design System 架构核查
层级	原方案内容	必要性	可复用性	评估
L1 Visual Foundations	色彩、字体、间距、动效、密度	高	跨领域	保留
L2 Semantic Objects	Tensor、Operator、Rank、Request	高	部分共享	保留，明确对象 Schema
L3 Visualization Components	Graph、Timeline、Matrix、Topology 等	高	跨领域	保留，避免每个领域重复开发引擎
L4 Interaction Contracts	Select、Expand、Compare、Trace、Validate	极高	跨领域	优先建设，决定不同视图能否协同
L5 Pattern Library	21 个认知、诊断与操作模式	高	按场景组合	保留，先验证高频 Pattern
L6 Domain Applications	Operator、Training、Inference	高	领域专属	保留，不强求相同界面结构

这六层有一个需要修正的架构细节：Semantic & Interaction Contracts 不应该只位于 L4。语义契约是对象、可视化、Agent 和数据源共同依赖的基础，因此更适合作为贯穿各层的横向规范。
六、21 个 Design Patterns 归类核查
原方案数量正确：6 个认知模式、8 个诊断模式、7 个工程操作模式，共 21 个。
分类	Patterns	优先验证	评估
领域认知（6）	P01 Semantic Graph、P02 Cross-Layer Mapping、P03 Shape & Layout、P04 Parallelism Topology、P05 Memory Hierarchy、P06 Communication Graph	P02、P03、P05	对象关系与空间认知基础
诊断分析（8）	P07 Precision、P08 Pass Diff、P09 Compute-Memory、P10 Timeline、P11 Compute-Communication Overlap、P12 Model Attribution、P13 Request Attribution、P14 Training Quality	P08、P09、P10、P13	最直接关联工程问题定位
工程操作（7）	P15 Diagnostic Plan、P16 Hypothesis & Evidence、P17 Parameter Experiment、P18 Code Diff、P19 Validation Gate、P20 Human Approval、P21 Recovery & Replay	P15、P16、P19	Agent-Native 交互的关键能力

需要进一步完善的 Pattern 定义
当前缺口	建议补充
Pattern 之间可能重复	明确基础 Pattern、复合 Pattern 与领域实例的继承关系
只定义了展示形式	增加输入数据条件、缺失数据时的退化策略
没有自动选择标准	定义 Problem Type → Semantic Objects → Pattern 的匹配规则
Evidence 不够细	增加来源、采集条件、时间范围、验证方式与可信状态
缺少跨 Pattern 的联动规则	统一 Selection、Focus、Time Range、Compare Baseline
缺少信息密度约束	定义 Overview、Inspect、Detail 不同尺度的内容边界

尤其值得强调：21 个 Pattern 是初始分类假设，而不是已经证明完整、互斥、最优的分类体系。 后续应通过真实任务检验哪些模式经常组合、哪些可以合并。
七、Agent-Native 交互机制验证
能力	设计要求	验证方法	当前判断
问题理解	从自然语言识别问题和计算对象	给定 20–30 个真实问题，检查对象识别准确率	待验证
Pattern Selection	自动选择合适的可视化	对比专家预期的 Pattern 组合	待验证
Context Binding	视图之间保持对象、时间与设备上下文	跨图选择后检查定位一致性	需要原型
Evidence Traceability	Finding 可追溯至具体证据	随机抽查结论与原始来源	设计原则成立
Progressive Disclosure	随分析深度逐步呈现细节	测试定位时间、返回次数、上下文丢失率	待用户实验
Human Intervention	用户能调整 Agent 的诊断计划与验证范围	测试干预、恢复和继续执行	需要原型
Validation	通过精度、性能及回归测试确认结果	使用真实执行数据与 Golden/基线比较	工程必要能力

这里还需要修正原来的证据状态模型：
原状态	更准确的含义
Observed	数据实际被观测或记录
Inferred	根据现有数据得到推断
Hypothesized	提出待验证的机制假说
Validated	某项结论通过指定方法验证

这四个标签并非严格互斥。例如，一项观察本身也可能已经通过复测验证。因此，建议将它们拆成两个维度：结论类型（Observation / Inference / Hypothesis）与验证状态（Pending / Passed / Failed / Inconclusive）。

这样在 Agent UI 中，结论的性质与验证进度就不会混淆。
八、实施优先级与验证标准
阶段	优先工作	核心交付物	成功标准
P0	语义模型和契约	Object / Relation / Evidence Schema	能表达三个领域的核心对象和关系
P1	算子诊断样例	RMSNorm 端到端 Prototype	找到真实问题并追溯到证据
P2	Pattern 组合与联动	Graph + Timeline + Inspector	跨视图操作保持上下文
P3	Agent 诊断协同	Plan、Finding、Evidence、Validation	开发者能审核并干预诊断
P4	训练场景扩展	MoE Model-to-Rank Prototype	正确关联计算、通信与设备
P5	推理场景扩展	Request-to-Hardware Prototype	能定位 ITL 异常关键路径
P6	自动生成设计系统	Pattern Registry + Renderer	根据问题稳定生成可用的交互视图

九、最终建议：压缩为四个核心研究方向
从你的实际工作定位看，完整平台架构可以作为长期愿景，但 UX 研究需要聚焦更少、更可验证的课题。
研究方向	核心问题	推荐验证对象	优先级
1. Cross-Layer Semantics	如何让开发者理解计算对象跨模型、编译、硬件的映射？	RMSNorm、MoE Layer	P0
2. Progressive Spatial Interaction	如何在复杂计算系统中保持空间上下文、降低跨层认知成本？	单画布缩放、泳道原位展开	P0
3. Evidence-Driven Diagnosis	如何让 Agent 的结论可检查、可验证、可追溯？	Pass Diff、Memory Diagnosis	P0
4. Agent-Native Pattern Generation	如何从具体工程问题动态组织可视化？	Problem → Pattern → UI	P1


最终评审结论
技术基础
基本可靠

核心领域概念有官方技术依据，部分并行、数据 Schema 与测量语义需要修正。

设计体系完整性
框架完整

已覆盖对象、关系、组件、Pattern、Agent、验证与交付，但存在分类重叠。

UX 有效性
尚待验证

需要证明渐进披露、跨图关联和 Agent 生成界面能降低任务完成时间与认知负担。

工程落地可行性
适合渐进实施

优先验证现有算子 Prototype 的跨层关联和证据闭环，再向训练、推理扩展。

我认为对你的 AI Infra Design System 来说，最有价值的下一步是：从 21 个抽象 Pattern 中提取 5–7 个高频组合，围绕你已经做过的 RMSNorm、Pass 可视化、MoE 通信和 KV Cache 原型进行交叉验证。

真正需要证明的是：相同的语义模型与交互模式，能否在不同的计算领域反复解决开发者的问题，同时保持低认知成本和可验证性。

！以下是问答原文：

Q1：请分析典型的agent生成背后的工程逻辑，总结出基于agent的生成逻辑，应该如何对生成内容的框架-流程-表达，进行组织和抽象出界面交互架构，典型设计模式框架以及设计系统，以便于用户更好的理解和观测，

# Agent 生成逻辑与界面交互架构：从工程机制到设计系统

我认为，这个问题的核心不是给 Agent 的输出增加一层可视化 UI，而是要建立一套新的面向 Agent 生成过程的交互组织体系。

传统 UI 主要组织的是人已经定义好的功能、数据和操作；Agent UI 面对的则是一个动态生成的过程：

- 用户提出目标，但不一定定义完整路径。
- Agent 自主理解问题、拆解任务、选择工具和组织执行。
- 执行过程中产生中间结果、状态变化、证据、决策和副作用。
- 最后生成内容、方案、代码、分析结果或可执行产物。
- 用户需要理解 Agent 为什么这么做、现在做到哪里、结果是否可信，以及如何干预。

因此，需要把 Agent 的生成过程转化为一套可理解、可观测、可干预、可验证的界面架构。

我建议先建立一个核心认识：

Agent 不只是内容生成器，而是一个以目标为驱动、以状态为基础、以工具为执行能力、以反馈为控制机制的动态生产系统。

这会直接改变界面设计的基本对象。

## 一、典型 Agent 背后的工程逻辑

首先，需要区分 Agent 的工程执行机制与最终内容的表达机制。两者不是一回事。

### 1. Agent 的典型工程架构

一个具备工具调用和自主执行能力的 Agent，通常可以抽象成下面的结构：

[The Autonomous Enterprise: A Comprehensive Guide to Building and Securing AI Agents - perfecXion.ai](https://images.openai.com/static-rsc-4/SjBpDh3MP9FDLZAXSQJR6WtmvOvqWp41j1yfvXwqjLW_b3FS4BXtI2Be2jlSKh_jpyTR9heBxgjg09e0naO58Rl0JwEht-p3IvkSbPbdcOYPwZtmlLnqFZQUPmcGiZRASGYMmBqoizJQjR7Q2ztEZjjiwVYAFf5fYk3DNveNgF4?purpose=inline)

[perfecxion.ai](https://perfecxion.ai/articles/ai-agents-security-comprehensive-guide.html?utm_source=chatgpt.com)

| 工程模块            | 核心职责              | 产生的对象       |
| --------------- | ----------------- | ----------- |
| Input / Context | 接收用户目标、上下文和约束     | 任务定义        |
| Understanding   | 理解意图、识别问题和约束      | 意图、实体、条件    |
| Planning        | 拆解目标、建立任务依赖       | 计划、子任务、DAG  |
| Reasoning       | 推理、选择路径、判断下一步     | 决策、假设       |
| Tool Calling    | 调用搜索、代码、API、MCP 等 | 工具请求        |
| Execution       | 执行具体任务            | 操作、执行状态     |
| Observation     | 获取工具反馈、环境变化       | 结果、日志、证据    |
| Memory          | 保存和检索必要上下文        | 历史、经验、状态    |
| Evaluation      | 检验结果是否符合目标        | 验证结果、差距     |
| Response        | 整理并生成最终产物         | 文档、代码、图表、UI |

这里有一个重要区别：

- Planning 决定做什么。
- Reasoning 决定为什么这样做。
- Tool Calling 决定调用什么能力。
- Execution 决定实际发生什么。
- Observation 决定从环境获得什么反馈。
- Evaluation 决定是否达到目标。
- Response 决定如何向用户表达结果。

这些环节可以交替执行，并不一定是单向流水线。

### 2. Agent 的核心执行循环

可以将其抽象为：

## Agent Runtime Loop

Goal

用户目标、约束、上下文

Plan & Decide

任务拆解、路径选择、决策

Act

工具调用、代码执行、外部操作

Observe

工具结果、环境反馈、执行证据

Evaluate

目标检查、结果验证、异常判断

未达成：反馈给 Plan & Decide，继续循环

Deliver

形成最终结果和可交付产物

需要注意：这不是每个 Agent 都严格遵循的固定顺序。简单任务可能一次推理就完成；复杂任务可能有多个并行子 Agent、多轮工具调用、人工审批以及失败重试。

### 3. 从工程逻辑中提取六类基础对象

这是我认为后续 UI 架构最重要的抽象。

| 对象       | 表达什么      | 用户需要观察什么    |
| -------- | --------- | ----------- |
| Goal     | 要完成什么     | 目标、约束、完成标准  |
| Task     | 需要完成哪些工作  | 任务分解、依赖、进度  |
| Decision | 为什么选择某条路径 | 选择依据、替代方案   |
| Action   | 实际执行了什么   | 工具、参数、操作    |
| Evidence | 执行后获得了什么  | 数据、日志、来源、结果 |
| Artifact | 最终生产了什么   | 代码、报告、图表、文件 |

这六类对象比直接呈现 Thought、Tool、Message 等底层日志更适合作为用户交互架构的基础。

尤其要注意：Decision 不等于模型内部思维链，Evidence 不等于执行日志，Artifact 也不等于最终回答。

用户需要看到的是可审计的决策摘要、可追溯的证据、可操作的产物，而不是模型的私有内部推理。

## 二、从 Agent 工程执行到内容生成：建立三层组织模型

真正设计 Agent UI 时，不能简单地把上述工程模块一一映射成页面。

因为 Agent 的工程过程和用户的认知过程不一致。

例如，用户要求 Agent 分析一个算子性能问题，Agent 内部可能进行了 20 次工具调用、3 次代码分析、2 次数据查询和 1 次验证。用户并不需要按照这个顺序阅读全部操作。

用户真正想知道的是：

1. 当前在解决什么问题？
2. Agent 如何组织这个问题？
3. 它采取了什么行动？
4. 得到了什么证据？
5. 为什么得出这个结论？
6. 结果是否可靠？
7. 我可以在哪里干预？

因此，我建议建立一个三层模型：

## Agent 内容生成的三层组织模型

Layer 01 · Frame

框架组织层：定义生成内容的认知结构

目标、上下文、问题、约束、任务结构、完成标准。

Goal

Context

Scope

Constraints

Task Model

Layer 02 · Process

流程组织层：表达 Agent 的动态执行过程

计划、决策、任务依赖、工具调用、执行反馈、验证、人工介入。

Plan

Decision

Action

Observation

Evaluation

Intervention

Layer 03 · Expression

表达组织层：将生成结果转化为用户可理解的产物

结构化内容、数据、图表、代码、文档、交互组件及其证据。

Structure

Content

Evidence

Visualization

Artifact

Validation

三层之间的关系

Frame 决定生成什么；Process 决定如何生成；Expression 决定如何理解和使用生成结果。

这三个层次不是三个独立页面，而是同一个 Agent 任务在不同认知维度上的投影。

### 1. Frame：框架组织——让用户理解 Agent 正在解决什么

Agent 接收到的用户需求通常是不完整的。

它需要将自然语言转化为结构化的问题模型。

例如：

用户输入：

> 分析 RMSNorm 算子在不同 Shape 下的性能瓶颈，并判断是否可以通过 UB 驻留优化。

Agent 应当把它组织成：

| 框架对象             | 生成内容                    |
| ---------------- | ----------------------- |
| Objective        | 找出性能瓶颈                  |
| Domain           | RMSNorm / Ascend NPU    |
| Input            | Shape、dtype、Layout、硬件参数 |
| Constraints      | UB 容量、带宽、精度约束           |
| Subproblems      | 规约、访存、数据搬运              |
| Success Criteria | 精度通过、性能改善               |
| Deliverables     | 瓶颈分析、优化方案、验证报告          |

这一步的价值在于，将模糊需求转化为用户可以检查和修正的结构。

建议设计模式：Goal & Context Frame。

[AI Agents Built for Teams: Shared Context and Transparency in Enterprise AI • Asana](https://images.openai.com/static-rsc-4/U9-TwVhRaGfXL2ZmdfcqFvbY2iWplln7dsK2qxk6E1UiF075DgaIJVU_y9SHNZcQuw2OjvliYFBv2ufsb37dns4Uv-hLH8U-kgWE5coEPodgw5U-bMPnMCM95SfpuTEM9Sse1zd2q2-PQ5RWHyh2pAPkkJlGx1JWjKwXoZxbY9I?purpose=inline)

[asana.com](https://asana.com/inside-asana/ai-agents-built-for-teams-context-transparency?utm_source=chatgpt.com)

建议交互：

- Goal：目标描述和完成标准。
- Context：Agent 已获得的上下文和数据。
- Scope：本次分析涉及的范围。
- Constraints：不能违反的约束。
- Deliverables：预期交付内容。

重要的是，Agent 应当区分用户明确提供的信息、从上下文获取的信息以及自行推断的假设。

不能把推断出的约束伪装成用户已经确认的事实。

### 2. Process：流程组织——让用户理解 Agent 如何完成任务

这是 Agent UI 与传统内容 UI 差异最大的地方。

传统软件主要呈现固定业务流程；Agent 的执行路径可能动态变化。

典型流程至少需要支持五种表达形式：

[Sequential Workflow in LangGraph. When you start building AI applications… | by Akash Shinde | Jan, 2026 | Medium](https://images.openai.com/static-rsc-4/OlkP8tL9t6GPaa7ofxRBTQufReVM0XJJWZULTuuGf05BCX-rAeLClZ7EXof1viDZmfesbH5f4BertVnTc8cwtnsGn0jjhnNZSNArRgzUqRZ2w4V24qsu1rUU-GrGdX9wfAwychgsIkqykZiIbL8_Ov9VRi0FWauVvM_y2Lkd9uY?purpose=inline)

A. Sequential Flow · 顺序流程

适合明确的多步骤任务，例如检索 → 分析 → 撰写 → 验证。

表达重点：步骤、状态、前后依赖。

[Computation Graph Orchestration - Community Support - Temporal Community Forum](https://images.openai.com/static-rsc-4/idWsgtDk9uAqa45fxXBXhShcYDwjpkozMVyMGDUqYHdNPWocKYDggEteyAbScXK_TttJd23lz3EQ2YHBv_YMQCM-_VSD6WmpAsno50eX8ezLkiOaCBy1FHnaBg9iGWOdof5JnDvNDqDRnxRw8lRyxjd0lrDoqhENu_yVoFpn42E?purpose=inline)

B. DAG / Parallel Flow · 并行任务

适合多个子任务并行执行，例如分别分析计算、访存和通信。

表达重点：任务依赖、并行关系、汇合点。

[Gemini 3.5 Flash API for Multimodal Reasoning and Agentic AI | Kie.ai](https://images.openai.com/static-rsc-4/-HxbQ7FRgO1R21A0cKhtJe2UJVutQP6uDeOw-CyODFYgjlTBi_p7xpMIAmkCxXB7ZA-mwrChd8HKZ5PPgSMGJQZtL1yqrZRoHNXhCqQmsDPViH6g4dnjzs21Kvwabc4nCqwgGsZQe_p8sECrBY_i1HUZuzS3PH4eKVYY3CPtPiI?purpose=inline)

C. Execution Timeline · 执行时间线

适合长任务、工具调用、多轮执行。

表达重点：时间、工具、输入输出、耗时、失败和重试。

[What is Agentic AI Workflow? - Quantiphi](https://images.openai.com/static-rsc-4/-4EO_q3yTzrslS4ZxUNZ_dhT3yI4NmSZefeIEjbwE8EsGE2GxSYcoTTpNjPu79K-lKhA40qBSl0Iyjn7jiIw1ztKJvNZw8Y7bfqM1enXqFvUoNQr196TwB4VNLYFjf2Mwv6YZckLnTstJXUzYo2YDnoQzBjBDIvapAX_C0srWcI?purpose=inline)

D. Feedback Loop · 反馈循环

适合生成 → 检查 → 修正 → 再生成。

表达重点：验证条件、失败原因、修正前后差异。

[Human in the loop | Vidvatta Learning Hub](https://images.openai.com/static-rsc-4/iLGeyKq2rLoIOZlWdKHOYWTpLr9ZL7IKl9DVXp-ngKQppEDsMYPu0ko6fDCwlOtTWdF6SE4SG2eyekYTz-BvWoIjAFCJSz--9OJBjSX4oGHsUvtXPnZJjpjlauWcpC-CkLetyNMRYVjyfQhwn8hkKaVVkZkcayG1rgkv6INCI5s?purpose=inline)

E. Human-in-the-loop · 人机协同

适合需要用户确认的高风险操作或关键决策。

表达重点：待确认事项、影响范围、批准与拒绝。

这里有一个关键设计原则：

不要用一种固定的流程图表现所有 Agent 行为。应该根据实际执行拓扑，选择最合适的可视化模式。

例如，多个 Agent 并行研究属于 DAG；单个 Agent 反复调用工具属于执行时间线；生成结果反复被评估属于反馈循环。

这也是为什么需要在设计系统中建立多种流程表达模式，而不是只建立一个 Workflow 组件。

### 3. Expression：表达组织——让用户理解 Agent 生成了什么

Agent 的最终输出不应该被限制为文本。

从工程角度，生成结果可能是：

| 产物类型  | 推荐表达形式                        |
| ----- | ----------------------------- |
| 解释与分析 | Markdown / Rich Text          |
| 结构化数据 | Table / JSON Inspector        |
| 任务关系  | DAG / Dependency Graph        |
| 统计与指标 | Chart / Metric Cards          |
| 代码    | Code Editor / Diff            |
| 系统架构  | Architecture Diagram          |
| 诊断结论  | Findings / Evidence Panel     |
| 操作结果  | Execution Result / Status     |
| 综合交付物 | Report / Document / Dashboard |

这里最值得关注的是：

表达内容应该由产物语义决定，而不是由 Agent 使用了什么工具决定。

例如，Agent 使用 Python 分析数据，不代表用户应该看到 Python 执行界面。最终如果产物是性能趋势分析，主视图应该是趋势图和指标解释；Python 执行日志应该处于可展开的证据层。

## 三、从三层组织模型抽象出界面交互架构

我建议不要采用传统的 Chat + Sidebar + Dashboard 作为唯一结构。

更合理的是构建一个：

Agent Workspace = Task Space + Process Space + Artifact Space

[UX/UI Design for AI Agent Platform — Light Mode by Alyona Fadieieva for In Sync on Dribbble](https://images.openai.com/static-rsc-4/ymxyEW6evRI5fvOWN1VZT9VwHsGIWpW52deHYS95xqXpFh_MBS3LM2ZgKunDTuuT88G0I4FBxgKud9TIrChhBwo-3lK45R6Kr0GC9XO8dvZ3LqhZzLP7g2DHkyAFQBmTBB_HVDcPecbLEUK3XZW85BhLYsWJnJeM6XKgwBzE4kY?purpose=inline)

[dribbble.com](https://dribbble.com/shots/27217112-UX-UI-Design-for-AI-Agent-Platform-Light-Mode?utm_source=chatgpt.com)

三个空间承担不同职责。

| 空间             | 核心问题        | 主要界面              |
| -------------- | ----------- | ----------------- |
| Task Space     | 要解决什么？      | 目标、上下文、约束、任务定义    |
| Process Space  | Agent 如何完成？ | 任务图、执行时间线、工具调用、验证 |
| Artifact Space | 最后生成什么？     | 文档、代码、图表、诊断报告     |

### 1. 推荐的整体交互布局

Agent Workspace

Running

TASK SPACE · 任务上下文

RMSNorm 性能诊断

目标：定位访存瓶颈，验证 UB 驻留优化

Ascend NPU

BF16

Shape Sweep

PROCESS SPACE · 执行过程

1. 分析输入与算子约束

   Completed
2. 并行分析规约与访存

   Completed
3. 计算 UB 驻留可行性

   Running
4. 精度和性能验证

   Pending

选择任务节点可查看输入、输出、证据和执行细节

ARTIFACT SPACE · 生成结果

性能诊断初步结果

# 3

待分析瓶颈

# 2

优化候选方案

支持报告、图表、代码和证据之间的关联

这只是一个逻辑布局示意，并不是要求所有产品固定采用三栏。

更重要的是三个空间能够相互关联：

- 点击 Task，知道它对应哪些执行过程。
- 点击 Process，知道它产生了哪些中间结果。
- 点击 Artifact，知道它依赖哪些任务和证据。
- 点击 Evidence，能够回到原始数据或工具执行记录。

这样，Agent 的生成内容就从单纯的聊天记录变成了一个有结构、有来源、有过程的生产空间。

## 四、典型 Agent UI 设计模式框架

如果要将上面的架构沉淀成可复用的设计系统，我建议建立八种核心设计模式（Design Patterns）。

这些模式不是页面模板，而是针对 Agent 生成过程中的不同认知和交互问题所形成的解决方案。

[AgentOp - Outcome-focused parallel agent desktop application | Tiny...](https://images.openai.com/static-rsc-4/QemXcXwtSCWkqsd6sokcdCYyaplfcGPuQcKiRKrC4RmmbCkV6-ykhH24nJsrYHvzHw505HeYlzDJMchMJjHx2vsHa8BzCgGINTQ_tHwjHasyfuCoz2CUlLatTY8_33QK9T4LTDqxahLm287DpsFLMeL2hSP5F1devBJxOkcgw3I?purpose=inline)

01 · Intent & Goal Pattern

目标理解

- 自然语言转结构化目标
- 目标、约束、完成条件
- 缺失信息与假设确认

解决：用户不知道 Agent 如何理解自己的需求。

[M04 Agent 核心架构 – 李文周的个人站点](https://images.openai.com/static-rsc-4/6JXuvKZF-34A8QspbgYp89W-I7nJeQs8O21MYrKgf54KQe8kDP1um48BxE-1NoIe8Yd-14Eqheld3BYyt2x7ip8H575GcuH6VTFzxfoe7QNQJQosCVwy1PjHCmUQaJ0deGznak-C7UuIK_q73DJhl-RFFciDs__FvKyiq6JYSao?purpose=inline)

02 · Planning & Decomposition Pattern

计划组织

- Task Tree / DAG
- 任务依赖与并行分解
- 任务动态调整

解决：用户无法理解复杂任务是如何被拆分的。

[CloudWatch Omni](https://images.openai.com/static-rsc-4/WzVoOBi9-z5C2wKBlqk19TUBqHZkQth4TJwUxaS2BH1q4V-S5Pxq5A8aL4eV6_kmA12fDIjAMS6ZjCVaqCHk2HsHW60rzkI70jF7l5Qi5Agr1Y5C7eX9JsKfiBRBO0ivFI19JWnh75GRBAoQP8NfB7tljOISfWmkjjn4h2Duv_0?purpose=inline)

03 · Execution & Trace Pattern

执行观测

- Agent / Tool / Action
- 执行时间、状态、耗时
- 错误、重试、调用链

解决：用户不知道 Agent 实际做了什么。

[Xybern · Agent Execution Trace](https://images.openai.com/static-rsc-4/IASiUPqShwBSrHup7zerfjHxMA6bdYFPQwbyprMTFIRa-wKFE469keQ4oCQ-htcApz_EcvxHPkW44eQwDry6VrLoN2-UaC-83JeLViXHSFHYYoeJeRHJyoviV_IvmuIJYslrXWJBw5dzNcO8p-FTXtpliNCwYyCLu-bF0C1AQ4E?purpose=inline)

04 · Evidence & Provenance Pattern

证据追溯

- 数据来源和引用
- 工具输出与执行结果
- 结论与证据之间的关联

解决：用户不知道结果从哪里来。

05 · Evaluation & Validation Pattern

质量验证

- 规则检查与质量评分
- 预期与实际对比
- 验证失败与修正建议

解决：用户无法判断生成结果是否正确。

[AI & Automation | Kinso Labs](https://images.openai.com/static-rsc-4/ypoVwUQkck-wIUr1J1h_0u0TEhjaZzE2ryxGzCshgxbyHhePZ4rjATfseEFgwTIINyjfn7phSBdcEREaquaftLg-ZWGZRQih_qeC5eXfVQ3CTL_r9C-uXoigQAMqf8U85gE9f0mzDgwRT_G4_sd9HOIM5y_1NW3_cN9ZSi5qa8Q?purpose=inline)

06 · Human Intervention Pattern

人工干预

- 暂停、批准、拒绝
- 修改参数和执行约束
- 重新执行、回滚、接管

解决：用户无法有效控制 Agent 的自主行为。

[Organize Desktop Files | Open Source Cowork Use Cases](https://images.openai.com/static-rsc-4/zdjodR5zR28Zinz-_VFy4wAZ2iW6OcK5bSwrFEFyAQNNLt_NVDeMkgDZsGf7uy3fSxgliHy2zWSxVEhhRIZ6yW7f-gMegV_yH-YgPkNetVA76_0kfX5WwZGfIxgQnRGg7RjXlKVpFOwBJc3IpCiG_tJbfidt_zPTbiXVJwxHamU?purpose=inline)

07 · Artifact & Composition Pattern

产物组织

- 文档、代码、图表
- 多种产物组合
- 版本、差异和关联

解决：生成内容分散、难以使用和管理。

[Agentic UI Is A Frontend Architecture Problem, Not A Chat Window](https://images.openai.com/static-rsc-4/IzirrfSduTIWKe8n0nMlyDqKMMH61BUTlFLzoQOn8KBmDuehH2qDwl5AyCQXhb2HP21ttMXHD8B4nEBDNVICbcTCIkgtO61zvd0IluhHJwM7s6QQGOY20qbq4SKUVo21GCf2c-DyoRfzvttnydpZP5NMzblFZga9C1PE1kkSejQ?purpose=inline)

08 · Recovery & Continuation Pattern

异常恢复

- 失败定位
- 断点续跑
- 上下文恢复和任务重规划

解决：Agent 出错后用户不知道如何继续。

这八种模式覆盖了 Agent 从理解任务到完成交付的关键交互问题。

其中有一个重要的设计判断：

Agent UI 的核心不应该是展示 Agent 的所有行为，而是让用户能够在关键节点获得理解、判断和控制能力。

## 五、进一步抽象：Agent Design System 应该由什么构成？

传统 Design System 通常由 Tokens、Components、Patterns、Templates 组成。

Agent Design System 需要在这个基础上增加一层：Agent Semantic Model（Agent 语义模型）。

因为 Agent 的状态、任务关系和执行结果具有动态性，普通 UI 组件无法单独表达它们。

我建议建立五层体系。

## Agent Design System · 五层体系

## 5. Experience Templates

完整体验模板

Research Workspace · Coding Agent · Diagnostic Workspace · Report Workspace

## 4. Interaction Patterns

交互模式

Planning · Execution · Evidence · Evaluation · Intervention

## 3. Semantic Components

语义组件

Task Node · Agent Card · Tool Call · Evidence Card · Artifact Viewer

## 2. Agent Semantic Model

语义与状态模型

Goal · Task · Decision · Action · Evidence · Artifact · State · Relation

## 1. Visual Foundation

视觉基础

Color · Typography · Spacing · Grid · Motion · Density · Shape

### 1. 第一层：Visual Foundation

解决视觉表达的统一性。

重点不只是颜色和圆角，还应该定义：

- 状态色：运行、等待、完成、失败、阻塞。
- 信息层级：核心对象、辅助信息、执行细节。
- 关系表达：依赖、调用、引用、数据流、控制流。
- 信息密度：概览、分析、调试三种密度。
- 动态反馈：执行动画、状态转换、局部更新。

对于开发者和 Infra 工程师，应该优先考虑结构清晰、信息准确和高密度信息的可读性，而不是装饰性动画。

### 2. 第二层：Agent Semantic Model

这是整个系统的核心。

建议所有 Agent 生成行为都尽量映射到统一的数据语义模型。

| 对象         | 核心属性                            | 关联关系        |
| ---------- | ------------------------------- | ----------- |
| Goal       | objective, constraints          | 包含 Task     |
| Task       | status, priority, dependency    | 产生 Action   |
| Agent      | role, capability                | 执行 Task     |
| Decision   | rationale_summary, alternatives | 影响 Task     |
| Action     | tool, input, output, timestamp  | 产生 Evidence |
| Evidence   | source, content, confidence     | 支持 Finding  |
| Artifact   | type, version, content          | 由 Task 产生   |
| Evaluation | criteria, result, score         | 验证 Artifact |

还需要一个贯穿所有对象的统一标识与关系机制：

- `task_id`：任务身份。
- `parent_task_id`：父子任务。
- `trace_id`：一次执行链。
- `span_id`：一次具体执行单元。
- `artifact_id`：产物身份。
- `evidence_id`：证据身份。

这样，界面就可以从不同视角呈现同一批数据，而不必为每个页面重新定义一套对象。

注意，这是一套建议的设计数据模型，不是某个 Agent 框架的标准字段规范。

### 3. 第三层：Semantic Components

组件应当围绕 Agent 对象设计，而不是围绕页面设计。

Goal Card

目标和约束

Task Node

任务和依赖

Agent Card

角色和能力

Tool Call

工具调用与反馈

Evidence Card

来源和证据

Evaluation Card

质量验证

Artifact Viewer

产物查看

Approval Gate

人工确认

每一个语义组件都应该具备：

1. 身份：它是什么。
2. 状态：它当前处于什么状态。
3. 关系：它与其他对象有什么联系。
4. 内容：它包含什么信息。
5. 操作：用户能够对它做什么。
6. 追溯：它如何回到原始执行记录。

### 4. 第四层：Interaction Patterns

将语义组件组织成可复用交互模式。

例如：

- Task Node + Dependency Graph = Planning Pattern。
- Tool Call + Timeline + Trace = Execution Pattern。
- Evidence Card + Source Inspector = Evidence Pattern。
- Evaluation Card + Diff = Validation Pattern。
- Artifact Viewer + Version History = Artifact Pattern。

### 5. 第五层：Experience Templates

最终才是面向不同 Agent 类型的体验模板。

| Agent 类型           | 主导交互架构                   |
| ------------------ | ------------------------ |
| Research Agent     | 研究计划 + 来源证据 + 报告         |
| Coding Agent       | 代码上下文 + 执行过程 + Diff      |
| Diagnostic Agent   | 问题模型 + 诊断链路 + 验证结果       |
| Data Agent         | 数据查询 + 分析流程 + 图表         |
| Automation Agent   | 任务状态 + 操作记录 + 审批         |
| Multi-Agent System | Agent 协作拓扑 + 任务交接 + 汇总产物 |

这五层体系能够支持同一套 Design System 被不同 Agent 产品复用。

## 六、特别重要：Agent UI 应该如何组织状态与交互？

上面讲的是静态架构，实际产品还必须处理动态执行。

我建议把状态设计独立为一套 State Model。

不能只使用 Loading、Success、Error 三种传统状态。

至少应该区分：

| 状态             | 语义     | UI 行为     |
| -------------- | ------ | --------- |
| Pending        | 尚未执行   | 显示等待和依赖   |
| Running        | 正在执行   | 显示进度或活动   |
| Waiting        | 等待外部响应 | 显示等待原因    |
| Needs Approval | 等待人工批准 | 显示审批操作    |
| Blocked        | 受到阻塞   | 显示阻塞原因    |
| Completed      | 已完成    | 展示结果      |
| Failed         | 执行失败   | 显示错误和恢复入口 |
| Cancelled      | 已取消    | 保留执行记录    |
| Skipped        | 被跳过    | 说明跳过原因    |
| Retrying       | 正在重试   | 展示重试状态    |

还要区分不同对象的状态。

例如：

- Agent 可以是 Running。
- Task 可以是 Completed。
- Tool Call 可以是 Failed。
- Artifact 可以是 Draft。
- Evaluation 可以是 Passed。

不能因为 Agent 总体还在运行，就让所有已完成的 Task 也一直显示 Running。

### 交互控制模型

我建议把用户控制能力抽象为四类：

Observe

查看、展开、追溯、检查

Modify

调整目标、参数、约束

Intervene

暂停、批准、拒绝、接管

Reconfigure

重新规划、重试、恢复

这四类能力可以作为 Agent 产品的通用交互动作体系。

## 七、Agent 生成界面最值得建立的五条设计原则

这部分是我认为区别于传统 UI 设计的真正核心。

### 原则 1：从页面组织转向对象组织

传统 UI：

页面 → 模块 → 组件 → 数据。

Agent UI：

目标 → 任务 → 决策 → 行动 → 证据 → 产物。

同一个对象可以出现在不同页面和视图中。

例如，一个 Task 可以同时出现在任务树、执行时间线、结果报告和异常定位界面中。

因此，应该优先建立统一的对象模型，再生成不同的界面表达。

### 原则 2：从静态布局转向动态拓扑

传统 UI 的页面结构一般由设计师预先定义。

Agent UI 的内容结构可能随执行发生变化：

- 新增子任务。
- 多个任务并行。
- 任务失败后重新规划。
- Agent 之间发生交接。
- 生成新的中间产物。
- 验证不通过，重新执行。

因此，需要支持动态布局、节点更新、关系变化和增量渲染。

但不代表所有内容都应该使用动态图。稳定的信息结构仍然应该保持稳定。

### 原则 3：从展示内容转向展示内容的形成过程

传统 UI 重点是 What。

Agent UI 还需要回答 How 和 Why。

| 维度      | 用户需要理解      |
| ------- | ----------- |
| What    | Agent 生成了什么 |
| How     | 通过哪些任务和操作生成 |
| Why     | 有哪些可审计的决策依据 |
| Where   | 证据和数据来自哪里   |
| Whether | 结果是否经过验证    |
| Control | 用户如何干预      |

特别强调：Why 应当展示决策摘要、依据、约束和替代方案，不应以暴露模型内部思维链作为可观测性的前提。

### 原则 4：从信息展示转向可干预的交互

传统 UI 更多是查看、编辑、提交。

Agent UI 应当让用户能够：

- 修改目标。
- 修改任务约束。
- 调整执行策略。
- 审批高风险动作。
- 对结果提出修正。
- 从失败节点恢复执行。

也就是说，用户不只是信息消费者，还是 Agent 执行过程的监督者和协作者。

### 原则 5：从结果可信转向证据可验证

Agent 生成内容不能仅依赖模型自己的置信度。

应该建立：

## Artifact Trust Chain

Artifact

最终报告 / 代码 / 诊断结论

Evaluation

检查规则、测试结果、质量验证

Evidence

原始数据、执行输出、来源、测试记录

Execution Trace

任务、工具、操作和执行记录

每个重要结论都应该能够追溯到对应证据，并明确区分：

- 已验证事实。
- Agent 推断。
- 尚未验证的假设。
- 验证失败的结论。

这对于代码生成、算子优化、Infra 诊断等专业场景尤其重要。

## 八、结合主流 Agent 工程实践，哪些设计判断有事实基础？

这里区分行业已经存在的工程实践和我提出的设计抽象。

| 工程实践         | 已有依据                                         | 对 UI 设计的启示    |
| ------------ | -------------------------------------------- | ------------- |
| Agent Loop   | OpenAI Agents SDK、Anthropic Agent 实践         | 必须表达执行、反馈和循环  |
| Tool Calling | OpenAI Agents / Responses                    | 工具调用需要可追溯     |
| Multi-Agent  | Manager、Handoff 等模式                          | 需要 Agent 协作拓扑 |
| Workflow     | Prompt Chaining、Routing、Orchestrator-Workers | 需要多种流程表达模式    |
| Trace        | Agents SDK Tracing                           | 需要执行链和调用细节    |
| Guardrails   | OpenAI Agent 工程实践                            | 需要权限、风险和审批界面  |
| Evaluation   | Agent 测试与评估实践                                | 需要验证结果与证据展示   |

这些工程模式有明确的实践依据：

- [Anthropic：Building Effective Agents](https://www.anthropic.com/research/building-effective-agents?utm_source=chatgpt.com)，总结了 Prompt Chaining、Routing、Parallelization、Orchestrator-Workers 和 Evaluator-Optimizer 等典型架构。
- [OpenAI：A Practical Guide to Building AI Agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/?utm_source=chatgpt.com)，讨论 Agent、工具、多 Agent 协作及 Manager 和 Decentralized 两种模式。
- [OpenAI：Building Agents](https://developers.openai.com/tracks/building-agents?utm_source=chatgpt.com)，介绍 Agent Loop、Handoffs、Guardrails、Session 和 Tracing。
- [OpenAI：Orchestration and Handoffs](https://developers.openai.com/api/docs/guides/agents/orchestration?utm_source=chatgpt.com)，区分 Agent 接管对话与 Agent 作为工具被调用两种控制权模式。

需要说明：上述工程资料证明的是 Agent 的运行机制和常见架构，并没有直接证明我提出的五层 Design System 或八种 UI Pattern 已经成为行业标准。它们是基于工程机制所做的设计体系抽象，需要通过实际用户测试验证。

## 九、最终建议：建立一套 Agent-Native Design Framework

我建议将整个方法论抽象为以下结构：

# Agent-Native Design Framework

面向动态生成、任务执行和人机协作的界面设计方法论

01 · GENERATION LOGIC

## Goal → Plan → Act → Observe → Evaluate

理解 Agent 如何工作：目标、规划、执行、反馈和验证。

02 · CONTENT MODEL

## Frame → Process → Expression

理解生成内容：框架、流程、表达。

03 · INTERACTION MODEL

## Observe → Modify → Intervene → Reconfigure

理解人如何参与：观察、修改、干预、重新配置。

04 · DESIGN SYSTEM

## Semantic Model → Components → Patterns → Templates

将设计方法转化为可复用的设计资产。

## 最终体验目标

Understand

理解 Agent

Observe

观察 Agent

Control

控制 Agent

Trust

验证 Agent

### 我的最终判断

如果从设计方法论角度进一步浓缩，我认为可以形成三个核心转变：

| 传统 UI 设计 | Agent-Native 设计 |
| -------- | --------------- |
| 页面与功能组织  | 对象与关系组织         |
| 固定流程与状态  | 动态任务与执行拓扑       |
| 结果与信息表达  | 生成过程与证据表达       |

而最重要的设计原则是：

以 Agent 的生成逻辑为基础，以用户的认知逻辑为组织方式，以可观测和可干预为交互目标，以语义化设计系统为工程实现手段。

这套体系不应该只适用于 ChatGPT 式对话产品。它可以用于 Coding Agent、Research Agent、Data Agent，也可以延伸到你一直研究的 AI Infra、算子开发、模型训练和推理诊断。

对于 AI Infra 场景，还有一个非常值得进一步探索的方向：将 Agent 的 Task、Decision、Action、Evidence、Artifact 与底层计算对象、性能指标、硬件资源和执行 Trace 建立关联。这样 Agent UI 就不仅是一个生成结果的工作台，而是一个能够理解复杂计算系统、观察其运行并参与诊断的工程交互系统。

下一步最有价值的是把这套理论变成一份可实施的 Agent UI Pattern Library： 以 Research、Coding、Diagnostic 三类 Agent 为验证对象，定义统一的数据 Schema、状态机、组件契约、布局模板和交互规则，再通过真实 Agent 执行数据检验它是否真的提高用户理解效率和问题定位效率。

Q2:聚焦算子开发，大模型训练推理的可解释和可观测的主要目标，形成一份可实施的界面交互架构，典型设计模式框架以及设计系统。

# AI Infra Agent-Native UX：算子开发与大模型训练推理的可解释、可观测界面交互架构

这次建议不再讨论通用 Agent UI，而是聚焦三个专业场景：

1. 算子开发（Operator Development）：让开发者理解算子代码如何转化为硬件执行，以及精度、性能、内存、同步问题为什么发生。
2. 大模型训练（Model Training）：让算法工程师和 Infra 工程师理解模型计算、并行策略、算子执行、通信与集群资源之间的关系，以及训练异常如何逐层定位。
3. 大模型推理（Model Inference）：让用户理解请求、Token、Batch、KV Cache、算子执行、计算通信、调度与硬件资源如何共同影响 ITL、TTFT、吞吐和显存。

这三个场景有共同的工程基础，但用户关注的对象、问题定位路径和交互粒度不同。

我认为最重要的设计方向是：

以计算对象为核心，以跨层关联为组织方式，以问题诊断为主要交互，以 Agent 执行过程为可观测链路，以验证结果为可信依据。

这与传统 APM、Profiler、Dashboard 以及 Agent Chat UI 都有所不同。

# 一、首先明确：三个场景究竟要解释和观测什么？

不应该先从页面和组件出发，而应该先定义用户需要建立的认知。

## 1. 算子开发：解释计算为什么这样执行，以及为什么出现问题

[Why Transformer Performance Is a GPU Matmul Problem](https://images.openai.com/static-rsc-4/wavnSGlRidZzfi9o_T5UGfkYLy3sObKMuRfIFl8t1eSu3Tye0tglEvTL8O8SBUqaMrVFgXqUdxmZ0IT4mK3-pd-OD2eGKJ6AP0S9yu6ptxQUwuH88osW68lZPrRkTN1p6Uml2DmaN9aLf400mbV6m3ZLqOKkNi47hyMOcw222G4?purpose=inline)

[fusheng-ji.github.io](https://fusheng-ji.github.io/blog/posts/transformer-performance-matmul-gpu/?utm_source=chatgpt.com)

算子开发者面对的不是简单的代码执行，而是一个多层约束系统。

从 PyTorch / TileLang / Triton / PyPTO 等编程接口，到 IR、Pass、指令和硬件执行，存在多层语义转换。

需要回答六个核心问题：

| 解释目标 | 需要观测的对象                          | 用户核心问题    |
| ---- | -------------------------------- | --------- |
| 计算语义 | Shape、Dtype、Layout、Stride、Mask   | 算子实际计算什么？ |
| 计算映射 | Tile、Block、Tensor、并行映射           | 计算如何分配？   |
| 精度   | Cast、Reduction、Accumulation      | 精度为什么变化？  |
| 内存   | GM、L1、L0、UB、Cache、搬运             | 数据如何流动？   |
| 执行   | Instruction、Pipeline、Sync        | 指令如何执行？   |
| 性能   | Compute、Memory、Occupancy、Latency | 性能瓶颈在哪里？  |

这里有一个特别重要的区别：

- 可解释性：让用户理解计算语义、编译转换和硬件行为之间的因果关系。
- 可观测性：让用户能够获取运行时实际发生的指标、事件和执行结果。

例如，用户看到 RMSNorm 性能下降：

可解释性要回答：为什么这个 Shape 造成两遍分块？为什么需要额外的数据搬运？

可观测性要回答：实际发生了多少次 MTE2 搬运？UB 占用多少？计算耗时多少？同步等待多少？

两者必须结合，才能形成有效的诊断。

## 2. 大模型训练：解释模型计算如何映射到集群，以及精度和性能如何变化

[Megatron-LM源码系列(一)：模型并行初始化 | MLTalks](https://images.openai.com/static-rsc-4/3KDHr5thFYujqPYUuLqJVXxahavbBYmvxXeKB_fX31W2WDPp4GwbLj1ZPwE0mFt6SrmeMVH79pSHbHSkIBfekW7T6rVfioxQs1MyXlBEzrpRKCCsccsFgyBclHdrVrHC-y6kEHDGVN43RiU1GicuXSGPFk4r6o2NGdvB4Xvr5ZM?purpose=inline)

[mltalks.com](https://www.mltalks.com/posts/2207923116/?utm_source=chatgpt.com)

训练场景的关键不只是模型结构，也不只是集群指标。

而是建立：

模型逻辑对象 → 并行计算 → 算子执行 → 通信 → 硬件资源 → 训练结果

之间的关联。

| 解释目标 | 需要观测的对象                      | 用户核心问题        |
| ---- | ---------------------------- | ------------- |
| 模型计算 | Layer、Block、Attention、MoE    | 模型在计算什么？      |
| 训练数据 | Batch、Sequence、Token         | 数据规模如何影响计算？   |
| 并行策略 | DP、TP、PP、CP、EP               | 计算如何分布到 Rank？ |
| 算子执行 | Forward、Backward、Optimizer   | 哪些算子消耗资源？     |
| 通信   | AllReduce、AllGather、AllToAll | 数据为什么需要跨卡传输？  |
| 资源   | HBM、UB、带宽、算力、链路              | 集群资源如何被使用？    |
| 训练质量 | Loss、Gradient、RMS、精度         | 训练结果为什么异常？    |

尤其需要建立模型计算对象与基础设施对象的关联。

例如：

- Weight 对应参数存储和梯度更新。
- Activation 对应前向激活和反向保存。
- Gradient 对应反向传播、规约与同步。
- Optimizer State 对应优化器状态存储与更新。
- MoE Token 对应 Router、Expert Dispatch、Combine 和 EP 通信。

这使得用户可以从模型层的问题定位到算子、Rank、通信域和硬件。

## 3. 大模型推理：解释请求如何转化为计算，以及延迟和吞吐为什么变化

[A survey on Inference Serving for Large Language Models | hello@woonyee.org \~ $](https://images.openai.com/static-rsc-4/mtI2Ym9aLJNhSDss-rjN1nDnpPN-x-172qUsrx18LLKPhGxMMrXKNTuAzSO3i0lEj80kHwGcVJMF1dcDX_0Y6RyW40amlHOHzrwN9fw-t3-zVAd0ZPsV9XTN22k_G4ehLgsgnGcZjlrOFAoEaRQmhB3XPhNuxkagDDIu2bPiYSg?purpose=inline)

[woonyee.org](https://woonyee.org/projects/ml-inference-sys-review/?utm_source=chatgpt.com)

推理场景与训练的关键区别是：用户关注的不仅是计算效率，还包括请求级服务质量。

| 解释目标     | 需要观测的对象                           | 用户核心问题        |
| -------- | --------------------------------- | ------------- |
| 请求       | Request、Session、Batch             | 请求如何进入系统？     |
| Token    | Input、Output、Sequence Length      | Token 如何影响计算？ |
| 阶段       | Prefill、Decode、PD                 | 哪个阶段产生瓶颈？     |
| KV Cache | Block、Page、Allocation、Reuse       | KV 如何存储和访问？   |
| 算子       | Attention、GEMM、RoPE、Norm          | 哪些算子影响延迟？     |
| 调度       | Continuous Batching、Queue、Routing | 请求如何被调度？      |
| 通信       | TP、EP、跨卡 KV、PD 通信                 | 通信如何影响延迟？     |
| 服务指标     | TTFT、ITL、TPS、吞吐                   | 用户体验为什么变差？    |

例如 ITL 突然增加：

不能只呈现一个延迟曲线，而要支持逐层追踪：

Request → Decode Step → Attention → KV Gather → MTE2 → Memory → Communication → Hardware。

# 二、统一抽象：建立 AI Infra 计算对象跨层模型

这是三个场景共用的核心基础，也是整个设计系统最值得投入的部分。

建议建立六层计算对象模型。

## AI Infra Cross-Layer Object Model

统一计算语义、执行行为与物理资源的关联

L1 · Model / Algorithm Objects

Layer · Attention · MoE · Weight · Activation · Gradient · KV Cache

L2 · Operator / Tensor Objects

Operator · Tensor · Shape · Dtype · Layout · Stride · Reduction

L3 · Compiler / Execution Objects

IR · Pass · Tile · Block · Instruction · Pipeline · Sync

L4 · Memory / Communication Objects

GM · HBM · UB · Cache · DMA · Collective · Link · Buffer

L5 · Hardware / Cluster Objects

Core · SM · Cube · Vector · NPU · Device · Rank · Server · Fabric

L6 · Runtime / Workload Outcomes

Latency · Throughput · MFU · Bandwidth · Loss · Accuracy · TTFT · ITL

注意：这六层是面向设计和诊断的逻辑对象层，不代表严格的编译器调用顺序。Runtime 与模型、硬件存在双向反馈，指标也应当关联到其真实采集层级。

## 1. 必须建立的跨层关系

只有对象还不够，真正有价值的是关系。

建议统一抽象为八类关系：

| 关系                  | 语义    | 示例                       |
| ------------------- | ----- | ------------------------ |
| Contains            | 包含    | Transformer 包含 Attention |
| Computes            | 计算    | RMSNorm 计算归一化            |
| Transforms          | 转换    | IR Pass 改变 Layout        |
| Maps To             | 映射    | Tile 映射到 Core            |
| Transfers           | 搬运    | GM → UB                  |
| Synchronizes        | 同步    | Barrier / Collective     |
| Consumes            | 资源消耗  | Operator 消耗带宽            |
| Causes / Correlates | 因果或相关 | KV Gather 与 ITL 增长相关     |

最后一类必须特别谨慎：只有通过实验、干预或可靠的因果证据建立的关系，才能标记为 Causes；仅有时间或指标相关性时应该标记为 Correlates。

## 2. 所有对象都应该有统一的可观测属性

建议建立统一的数据契约：

| 属性组           | 典型字段                               |
| ------------- | ---------------------------------- |
| Identity      | object_id、object_type              |
| Hierarchy     | parent_id、layer_id                 |
| Execution     | timestamp、duration、status          |
| Configuration | shape、dtype、layout、parallel_config |
| Resource      | memory、bandwidth、compute           |
| Performance   | latency、throughput、utilization     |
| Precision     | reference、actual、error             |
| Provenance    | source、trace_id、rank_id            |
| Relationship  | relation_type、target_id            |

并增加三个贯穿体系的维度：

- Time：什么时候发生？
- Space：发生在哪个算子、Rank、设备、内存区域？
- Semantics：这个数据代表什么计算对象？

这三个维度共同决定了一个问题能否被准确定位。

# 三、统一界面交互架构：一个底座、三个专业工作空间

建议采用：

Unified Observability Core + Three Domain Workspaces + Shared Diagnostic Agent

即一个统一的计算对象与观测底座，三个领域工作空间，共用一套 Agent 诊断交互能力。

## AI Infra Observability Workspace

Unified Diagnostic Agent

Shared

理解问题 · 生成诊断计划 · 调用工具 · 汇总证据 · 验证结果 · 解释结论

Operator

算子开发

Training

模型训练

Inference

模型推理

Shared Observability Core

Object Graph

Metrics & Events

Trace & Timeline

Evidence Store

Evaluation Engine

State & Control

Data & Tool Infrastructure

Profiler · Compiler · Runtime · Logs · Metrics · Distributed Trace · Hardware Telemetry · Test Framework

三个工作空间共享对象模型、指标模型、Trace、Evidence 和 Agent 控制能力，但不应该强行使用相同的主视图。

## 1. 算子开发工作空间

核心设计：Operator-Centric Workspace

[OpenXLA Project](https://images.openai.com/static-rsc-4/zVuHXKGm1XKDwO5u3rZKaZfSkOhmZFWAwJJGxdm2ttXFegYjEopZljB4JeGzNt2ic-RDct0W5KclS8KqlNWkPANK22-Nt6IqEypURP8hrU3BvXCe7U5DExM4Z8eP4HPFi3vHwVbs1UDHHv9OfzFrpb98-nDe5VbF5v8uOJ5M6v8?purpose=inline)

[openxla.org](https://openxla.org/xprof/trace_viewer?utm_source=chatgpt.com)

建议采用四个主要视图。

| 视图               | 主要内容                           | 核心交互                   |
| ---------------- | ------------------------------ | ---------------------- |
| Semantic View    | Tensor、Shape、Dtype、Layout、计算语义 | 检查输入输出、广播、规约           |
| Compilation View | IR、Pass、Tile、指令变化              | Pass Diff、IR Drilldown |
| Execution View   | Pipeline、Memory、Sync、Hardware  | 时间线、数据流、资源映射           |
| Diagnosis View   | 精度、性能、内存问题                     | 瓶颈定位、假设验证、修复           |

### 推荐的界面结构

Operator Diagnostic

Mock Scenario

RMSNorm · Ascend NPU · BF16

## 4096

Hidden Size

## BF16

Input Dtype

## 2

Candidate Paths

计算语义

Input Tensor

Shape: [B, 4096]

Reduction → Normalize → Scale

计算图与中间 Tensor

执行分析

Memory Movement

Inspect

Reduction Order

Validated

Synchronization

Pending

Agent Diagnostic

发现待验证假设：不同 Shape 下的 Tile 策略可能改变 UB 驻留和数据搬运次数。

需要结合编译结果和实际设备 Profile 验证，不能仅凭静态 Shape 判断性能瓶颈。

这里建议重点建设三个能力：

A. Semantic Inspector

把 Shape、Dtype、Layout、Stride、Mask、Reduction 等计算语义组织在同一个检查器中。

支持从 Tensor → Tile → Block → Instruction 的逐层下钻。

B. Pass Observability

把编译过程做成可比较、可追溯的变换链：

1. Source / DSL

   原始算子代码及编译配置
2. IR Transformation

   算子展开、类型转换、Layout 转换
3. Optimization Pass

   Fusion、Reduction、Memory Planning
4. Lowering / Instruction

   目标指令和硬件映射
5. Runtime Execution

   实际执行时间、内存和同步行为

每个 Pass 应当能够查看：

- 输入 IR 和输出 IR。
- Shape / Dtype / Layout 前后差异。
- 修改的计算语义。
- 引入或消除的内存、同步操作。
- 对精度和性能的影响。
- 是否有实际 Profile 证据。

C. Compute-Memory Inspector

建议建立一个计算与存储交互视图：

[【AI系统】推理内存布局_ai推理 64g内存是必备的吗-CSDN博客](https://images.openai.com/static-rsc-4/VRDIyB2A73grLMYlrAgLwMQYNdan5jMCYC30s9-O2S5YtAw4MRtJYpoAVwsHHgXUXK7yyaeTlwUS18t1o8GUGeA9Acs11cDvdSKB7ozoyCpPrCYn2TPVvKRAWk9ZLod_mGRhzVdPvle7p_JQnGtxd4XlChApYEgVOP-ingn-ABA?purpose=inline)

[blog.csdn.net](https://blog.csdn.net/m0_37046057/article/details/144319414?utm_source=chatgpt.com)

用户能够沿着：

Tensor → Tile → Memory Level → DMA / MTE → Compute Unit → Result

查看数据的产生、驻留、搬运、复用和同步。

这比只呈现一个算子耗时数字更有解释价值。

## 2. 大模型训练工作空间

核心设计：Model-to-Cluster Workspace

[Distributed Training: Scaling Transformers in Practice | Jaxformer: Scaling Modern Transformers](https://images.openai.com/static-rsc-4/dbU4zxou4GoLvuiQXgquHYMcL6jkb6O1u_jgIYddxj6KDn8xWkRCz11ad1BazyTer8bSr9DH9NoqwQxHfb4HhkAS6-NYsitO580kiTBJ5S2oUQNcuNkOZ7TNNi2H6Gigz3euiU2SLjO2r5M1JEQkpT2OUsfSaoJx8J03IFf_MDo?purpose=inline)

[jaxformer.com](https://jaxformer.com/distributed_training/?utm_source=chatgpt.com)

建议采用四个主要视图：

| 视图                        | 主要内容                         | 核心交互          |
| ------------------------- | ---------------------------- | ------------- |
| Model Graph               | Transformer、MoE、Layer、Tensor | 模型结构下钻        |
| Parallelism Map           | DP、TP、PP、CP、EP、Rank          | 并行映射和 Rank 定位 |
| Execution & Communication | Forward、Backward、Collective  | 计算通信时间线       |
| Training Diagnosis        | Loss、Gradient、MFU、Memory     | 训练质量和性能诊断     |

### 关键设计：并行关系必须与模型计算关联

不要只画一个 DP × TP × PP × EP 的配置矩阵。

用户需要知道这些并行维度实际作用在什么对象上。

以一个示例训练配置为例：

DeepSeek-V4 · Mock Training Topology

Illustrative configuration

# 128

Total Ranks

# 16

8-card Servers

# 64

Layers

# 256

Experts

Parallel Strategy

DP

2

PP

2

CP

2

TP

8

EP

4

## 2 × 2 × 2 × 8 × 4 = 256

注意：该配置乘积为 256，不是 128。它不能直接作为本场景的 128 Rank 拓扑。必须先修正并行配置，再生成 Rank 映射。

这个例子特别说明一个设计要求：可视化系统必须具备结构一致性验证，不能为了视觉完整而绘制不成立的并行拓扑。

对于 128 Rank，可以使用前面讨论过的：

\\[ 128=2\_{\mathrm{DP}}\times2\_{\mathrm{PP}}\times 2\_{\mathrm{CP}}\times8\_{\mathrm{TP}}\times2\_{\mathrm{EP}} \\]

但实际采用该配置仍需要结合 MoE 专家分配、通信域和模型实现验证。

### 训练场景建议重点建设四种可视化

A. Model Execution Graph

[Scaling Transformers - Parallelism Strategies from the Ultrascale Playbook | STAT 4830: Numerical Optimization for Data Science and Machine Learning](https://images.openai.com/static-rsc-4/TSBBHAru14TJT7haJAWsaogwmuQ4wGMYTd2uwQZFBBw-kIKyuGOF6tBTf1AGWJ28KlENj4IskoeuGlZSaF3hAsFOSyhzz0lyjWtPj1TKAvMDw_4wGznhhKck--SdMTYO6o1qoYU0NDtxlGQ2kAICNRXorf2qvitf5wA7NQqnOh4?purpose=inline)

[damek.github.io](https://damek.github.io/STAT-4830/section/12/notes.html?utm_source=chatgpt.com)

呈现：

Data → Embedding → Transformer → Loss → Backward → Gradient → Optimizer → Weight Update。

并允许叠加 PP Stage、Layer、Tensor 和算子。

B. Parallelism Topology

[用通俗易懂的方式讲解大模型分布式训练并行技术：概述_大模型训练 资源分配-CSDN博客](https://images.openai.com/static-rsc-4/xj9VJXyxkdKcKJCdGzWWm344ziC50qWkcXfdsB0yWFpRn1qZZJQBbLutTA4VVG2wJzkXi7QtTHtb60vst8wh83gR22xw5b8r7JHJLBmUQ0eYjp2adgPimZ3D84Z8IWDfPCBJxW7c0PoDIf7h2hYQgSBbnfXke2wPOAXhdUM5asE?purpose=inline)

[blog.csdn.net](https://blog.csdn.net/2301_78285120/article/details/132702115?utm_source=chatgpt.com)

将逻辑并行维度映射到：

- Global Rank / Local Rank。
- Device / Server。
- TP / EP / DP / PP / CP 通信域。
- 模型分片及其归属。

C. Compute-Communication Timeline

[PyTorch Trace Analysis for the Masses – PyTorch](https://images.openai.com/static-rsc-4/CigkvB3Qut-5q3dCvDYPHlECLfY2lns0gCFgCN0ZbFFPLLiHvMhSYuutF7rHCS46SRw12pbou9xe5URxayx6WgSSbDHw6aHaxzsUQb5Xuv5VkcwncdHRKTY7xTHvfbm62m2H0a8HVp34-9h16nOJz-FI_igJCCVsZyHNp_YnCF0?purpose=inline)

[pytorch.org](https://pytorch.org/blog/trace-analysis-for-masses/?utm_source=chatgpt.com)

这部分尤其重要。

不要简单地把计算和通信画成两个独立指标，而要表达：

- 计算何时开始、何时结束。
- 通信何时开始、何时结束。
- 两者是否重叠。
- 等待是否发生。
- 哪个通信操作形成关键路径。

D. Model-to-Hardware Drilldown

从一个 MoE Layer 开始：

MoE Token → Router → Expert → Dispatch → AllToAll → Combine。

然后向下钻取：

Expert → Operator → Rank → NPU → Link。

向上则能回到：

MoE Layer → Training Step → Loss / MFU。

这就是训练场景最重要的跨层交互路径。

## 3. 大模型推理工作空间

核心设计：Request-to-Hardware Workspace

[当我们谈论 AI 推理的 KV Cache，我们在说什么？ - 53AI-AI知识库|企业AI知识库|大模型知识库|AIHub](https://images.openai.com/static-rsc-4/32AzTWxqScMHh0iBWa0KYkehoKwDg7TGqbul8eO_KWXtdzZLKhI0Dcw3L0icfmwyuAypOhdAnnMDq7nVmxGJnAK7T2n3GtAgg8gQBx5pVDz0EhGXCLar83AdBbQ1piBP8qZCDpt49A8_hLRPmrShdTzerb1piO_SIUZ1SJbuwe0?purpose=inline)

[53ai.com](https://www.53ai.com/news/LargeLanguageModel/2026021137482.html?utm_source=chatgpt.com)

建议采用四个视图：

| 视图                     | 主要内容                         | 核心交互     |
| ---------------------- | ---------------------------- | -------- |
| Request View           | Request、Batch、Token、Sequence | 请求追踪     |
| Inference Flow         | Prefill、Decode、Attention、KV  | 阶段下钻     |
| Memory & Communication | KV Cache、HBM、通信、调度           | 数据流和资源分析 |
| Performance Diagnosis  | TTFT、ITL、TPS、吞吐              | 延迟归因和优化  |

### 关键设计：请求与计算的时间关联

例如一个 Decode Step 出现 ITL 增长：

Inference Diagnostic · Mock Scenario

Synthetic data

Model

Qwen3-14B

Batch

8

Context Length

8320

Step

384

Latency Breakdown

ITL

# 18.9 ms

示例异常值，需与正常基线比较

Q / RoPE

20%

KV Gather

45%

QK / Attention

20%

PV / Other

15%

以上百分比仅为示意分布，不能当作实际 Profiling 数据。

Diagnostic Path

1. Request / Decode Step
2. Attention / KV Gather
3. Memory Access / DMA
4. HBM / Device / Communication
5. ITL Impact Validation

### 建议重点建设三个可视化

A. Request Timeline

展示 Request → Queue → Prefill → Decode Step → Token Output。

支持从请求级延迟定位到具体算子。

B. KV Cache Inspector

[Paged Attention in LLMs - by Avi Chawla](https://images.openai.com/static-rsc-4/1nez1UjWoPq_yrdsxmvDXUFl9SEZtplhiOF9VVvSc5jrhCjd55sn-TNJDrIzpClIfLUK35Aq-amcAIjtR4Qhh8PV9d5Zbo43KtaW4byeT0kDgA14mw3F2YmuuHRbTLEUvtB9z5sfVi2hGV1Om5RH_wOpRvzl5tsZ4woCgkxnzHI?purpose=inline)

[blog.dailydoseofds.com](https://blog.dailydoseofds.com/p/paged-attention-in-llms?utm_source=chatgpt.com)

应该支持：

- Block / Page 分配。
- Token 到 KV Block 的映射。
- Cache Hit / Miss。
- KV Gather。
- KV Reuse。
- KV 跨设备访问。

C. Latency Attribution

把 TTFT、ITL 拆分到请求、阶段、算子、内存、通信和调度。

需要明确区分：

- 独立耗时。
- 关键路径耗时。
- 重叠执行耗时。

不能直接将所有子阶段耗时相加后当作请求延迟，否则并行和重叠执行会导致错误归因。

# 四、典型设计模式框架：建立专业领域的 Pattern Library

建议将设计模式分成三个层级，而不是把所有可视化图表放在同一个组件库中。

- L1：领域认知模式——帮助用户理解计算系统。
- L2：诊断分析模式——帮助用户定位问题。
- L3：工程操作模式——帮助用户验证、修改和恢复。

## 1. L1：领域认知模式

解决：用户如何理解复杂计算对象及其关系。

| Pattern                      | 主要对象                  | 推荐可视化               | 主要用途    |
| ---------------------------- | --------------------- | ------------------- | ------- |
| P01 Semantic Graph           | Tensor、Operator、Layer | 计算图                 | 理解计算语义  |
| P02 Cross-Layer Mapping      | 模型、算子、硬件              | 关联图                 | 理解跨层映射  |
| P03 Shape & Layout Inspector | Shape、Dtype、Layout    | 矩阵、Tensor Inspector | 理解数据约束  |
| P04 Parallelism Topology     | DP、TP、PP、EP、Rank      | 拓扑图                 | 理解并行策略  |
| P05 Memory Hierarchy         | HBM、UB、Cache          | 层级图、数据流             | 理解存储与搬运 |
| P06 Communication Graph      | Collective、Link、Rank  | 通信拓扑图               | 理解通信路径  |

## 2. L2：诊断分析模式

解决：用户如何找到问题、理解原因和验证假设。

| Pattern                           | 主要对象                       | 推荐可视化     | 主要用途    |
| --------------------------------- | -------------------------- | --------- | ------- |
| P07 Precision Inspector           | Dtype、Cast、Reduction、Error | 精度对比、误差分布 | 精度诊断    |
| P08 Pass Diff Inspector           | IR、Pass、Layout             | Diff、变换链  | 编译问题定位  |
| P09 Compute-Memory Inspector      | Compute、Memory、DMA         | 流程图、资源图   | 算子性能分析  |
| P10 Execution Timeline            | Kernel、Event、Sync          | Timeline  | 执行瓶颈定位  |
| P11 Communication-Compute Overlap | Compute、Collective         | 双轨时间线     | 训练通信诊断  |
| P12 Model Performance Attribution | Layer、Operator、Metric      | 贡献分析图     | 模型级性能归因 |
| P13 Request Latency Attribution   | Request、Token、KV           | 延迟分解、关键路径 | 推理性能诊断  |
| P14 Training Quality Inspector    | Loss、Gradient、Weight       | 趋势图、分布图   | 训练质量诊断  |

## 3. L3：工程操作模式

解决：用户如何与 Agent 协作，验证和修复问题。

| Pattern                   | 主要交互       | 用户价值          |
| ------------------------- | ---------- | ------------- |
| P15 Agent Diagnostic Plan | 生成、调整诊断计划  | 知道 Agent 要做什么 |
| P16 Hypothesis & Evidence | 假设、证据、反证   | 判断诊断是否可信      |
| P17 Parameter Experiment  | 参数配置、实验对照  | 验证优化效果        |
| P18 Code / Config Diff    | 修改前后比较     | 审查 Agent 修改   |
| P19 Validation Gate       | 精度、性能、回归检查 | 防止错误优化        |
| P20 Human Approval        | 审批、拒绝、接管   | 控制高风险操作       |
| P21 Recovery & Replay     | 断点恢复、重跑、回放 | 复现和恢复问题       |

Pattern 的统一组织结构

Problem Definition

用户遇到什么问题？

Object Model

涉及哪些计算对象？

Relationship Model

对象之间有哪些关系？

Visualization Model

用什么视觉形式表达？

Interaction Model

用户可以如何下钻、比较、过滤、干预？

Agent Contract

Agent 提供什么数据、执行什么动作？

Validation Criteria

如何证明界面信息准确、诊断有效？

这七项应该成为每个 Pattern 的标准设计文档。

# 五、Agent 如何与专业可观测界面结合？

这是区别于传统 Profiler、可视化工具和 Dashboard 的关键。

我不建议把 Agent 设计成一个始终固定在右侧的聊天机器人。

更好的模式是：

Agent 以诊断任务为单位工作，以计算对象为上下文，以证据为依据，以专业 Pattern 呈现结果。

## 1. Agent 的标准诊断流程

## Agent Diagnostic Lifecycle

1. Problem Intake

   接收问题、代码、模型配置、Profile 和运行数据。
2. Context Reconstruction

   建立计算对象、执行上下文、并行拓扑和指标基线。
3. Diagnostic Planning

   拆解诊断任务，选择需要的工具和观测数据。
4. Evidence Collection

   调用 Compiler、Profiler、Runtime、Trace 和测试工具。
5. Hypothesis Analysis

   提出候选原因，关联计算、内存、通信和硬件证据。
6. Validation

   执行对照实验、精度验证、性能验证和回归检查。
7. Deliverable

   输出诊断结论、证据链、优化建议和可复现报告。

## 2. Agent 的输入和输出必须结构化

例如，用户提出：

> RMSNorm 在大 Shape 下性能下降，帮我分析原因。

Agent 不应该只返回一段自然语言。

应该产生一组结构化对象：

| 对象             | Agent 输出                   |
| -------------- | -------------------------- |
| Problem        | RMSNorm 性能下降               |
| Context        | 设备、Shape、Dtype、编译配置        |
| Plan           | Shape 对比、Memory 分析、Pass 分析 |
| Evidence       | Profile、IR、Memory 事件       |
| Hypothesis     | UB 容量约束导致分块策略变化            |
| Validation     | 对照实验和实际性能                  |
| Finding        | 通过验证的瓶颈                    |
| Recommendation | 优化建议                       |
| Artifact       | 诊断报告、实验记录、代码 Diff          |

这里要引入一个重要概念：Evidence-linked UI。

Agent 输出的每一个 Finding，都应该能够关联到：

- 支持它的 Evidence。
- 对应的计算对象。
- 对应的时间与设备。
- 使用的验证方法。
- 结论的证据充分程度。

## 3. Agent 与用户的职责边界

| 工作         | Agent      | 用户    |
| ---------- | ---------- | ----- |
| 解析代码和计算图   | 主导         | 检查    |
| 收集 Profile | 主导         | 选择范围  |
| 生成诊断计划     | 主导         | 修改和确认 |
| 分析候选原因     | 主导         | 判断    |
| 生成优化方案     | 主导         | 选择    |
| 修改代码       | 执行授权范围内的操作 | 审核    |
| 精度与性能验证    | 执行测试       | 审核标准  |
| 高风险修改      | 请求批准       | 最终决定  |

尤其不能让 Agent 将静态分析的猜测直接显示为已确认的根因。

建议统一采用四种结论状态：

- Observed：实际观测到。
- Inferred：基于证据推断。
- Hypothesized：待验证假设。
- Validated：经过指定验证方法确认。

# 六、设计系统的工程实施方案

前面定义了语义模型、Pattern 和组件，现在需要将它们转化成真实可开发的系统。

建议分为六个工程层。

## AI Infra Observability Design System

06 · Domain Applications

Operator Workbench / Training Workbench / Inference Workbench

05 · Pattern Library

Semantic / Diagnostic / Experiment / Validation / Recovery

04 · Visualization Components

Graph / Timeline / Matrix / Inspector / Diff / Chart / Topology

03 · Semantic Object Components

Operator / Tensor / Rank / Memory / Kernel / Request / Evidence

02 · Semantic & Interaction Contracts

Schema / Relations / State / Events / Drilldown / Actions

01 · Visual Foundations

Color / Typography / Spacing / Motion / Density / Grid

## 1. Visual Foundation：视觉基础

结合 AI Infra 开发者的使用场景，建议采用：

- 白色或浅灰背景。
- 中性灰建立信息层级。
- 状态色严格表达语义，不装饰性使用。
- 关系线区分数据流、控制流、通信流。
- 重要节点突出，非关键节点弱化。
- 允许高密度信息，但提供逐层展开。
- 采用 16:9 主工作区域，支持横向复杂关系。

建议状态色统一：

| 状态          | 建议表达    |
| ----------- | ------- |
| Normal      | 中性灰     |
| Running     | 蓝色      |
| Success     | 绿色      |
| Warning     | 橙色      |
| Error       | 红色      |
| Inferred    | 紫色      |
| Unverified  | 虚线 / 浅灰 |
| User Action | 强调边框    |

颜色必须与图形、文字标签共同表达状态，不能仅靠颜色区分。

## 2. Semantic Object Components：语义组件

建议优先建设这些组件：

### Operator Node

算子身份、Shape、Dtype、执行状态

### Tensor Node

Shape、Layout、Stride、数据类型

### Kernel Node

Kernel、Tile、Block、指令映射

### Memory Node

容量、占用、读写、数据流

### Rank Node

Global Rank、Local Rank、通信域

### Request Node

Request、Batch、Token、KV

## 3. Visualization Components：可视化组件

这是专业领域设计系统与普通 UI Component Library 差异最大的地方。

建议建设七种基础可视化引擎：

| 引擎               | 解决问题     | 主要形式                        |
| ---------------- | -------- | --------------------------- |
| Graph Engine     | 计算对象及其关系 | DAG / Knowledge Graph       |
| Timeline Engine  | 时间与执行关系  | Trace / Gantt               |
| Topology Engine  | 空间与硬件关系  | Cluster / Rank Map          |
| Matrix Engine    | 多维对象对比   | Relation / Heatmap          |
| Inspector Engine | 单对象详细属性  | Property / Tensor Inspector |
| Diff Engine      | 前后变化     | IR / Code / Config Diff     |
| Metric Engine    | 数值和趋势    | Chart / Distribution        |

这里建议把可视化引擎与领域组件分开：

例如，Graph Engine 是通用基础能力，而 Operator Graph、Model Graph、Communication Graph 是基于不同语义 Schema 的领域应用。

不要为每一种领域图重复开发一套渲染机制。

## 4. Semantic & Interaction Contracts：语义与交互契约

这是防止不同团队各自开发、最后无法关联的关键。

所有可视化都应遵循统一的交互协议：

| 交互动作      | 标准行为     |
| --------- | -------- |
| Select    | 选中对象     |
| Expand    | 展开子对象    |
| Drilldown | 进入下一层    |
| Compare   | 与其他对象对比  |
| Trace     | 查看上下游执行链 |
| Filter    | 筛选对象和指标  |
| Inspect   | 打开属性检查器  |
| Correlate | 关联其他层对象  |
| Replay    | 回放执行过程   |
| Validate  | 触发验证流程   |

例如，用户在模型图点击某个 MoE Layer：

1. Model Graph 选中该 Layer。
2. Parallelism Map 高亮相关 Rank。
3. Execution Timeline 定位对应时间区间。
4. Communication Graph 高亮 EP 通信。
5. Metrics Panel 显示对应性能指标。
6. Agent 接收当前选中的对象作为诊断上下文。

这才是跨领域工作空间真正的统一交互能力。

# 七、实施优先级：不要一开始建设完整平台

建议以可验证的典型问题为切入点，而不是一次性实现全部 Pattern。

推荐实施路线

## Phase 1：建立统一语义和可观测基础

优先级最高 · 形成最小可用底座

- 统一对象 Schema。
- 定义跨层关系。
- 建立统一 Trace / Event / Metric 模型。
- 统一时间、设备、Rank、算子身份。
- 建立状态模型和 Evidence 数据契约。

交付物：Semantic Schema、Object Registry、Trace Contract。

## Phase 2：先实现算子诊断闭环

我建议先从算子开发开始。

原因是算子场景具有相对明确的输入输出、编译过程、精度参考和性能测试，比较适合验证整个架构。

首批实现：

1. Semantic Inspector。
2. Pass Diff Inspector。
3. Compute-Memory Inspector。
4. Precision Inspector。
5. Agent Diagnostic Plan。
6. Evidence & Validation。

选择 RMSNorm 作为验证案例，覆盖：

Shape → Layout → Reduction → Tile → Memory → Precision → Performance。

## Phase 3：扩展到训练

重点实现：

- Model Execution Graph。
- Parallelism Topology。
- Rank Mapping。
- Compute-Communication Timeline。
- Model-to-Hardware Drilldown。
- Loss / Gradient / MFU 诊断。

## Phase 4：扩展到推理

重点实现：

- Request Timeline。
- Prefill / Decode Flow。
- KV Cache Inspector。
- Latency Attribution。
- Compute / Communication / Memory 关联。
- Agent 根因验证和优化对照。

## Phase 5：建立跨场景 Agent Pattern Library

让同一个 Agent 可以在三个场景复用：

- 统一任务对象。
- 统一证据模型。
- 统一状态模型。
- 统一诊断计划。
- 领域专属工具适配。
- 领域专属 Pattern 自动选择。

## Phase 6：建立 Design System 自动生成能力

最终让 Agent 不仅生成诊断结论，也能够：

1. 根据用户问题识别领域。
2. 识别涉及的计算对象。
3. 选择适合的 Pattern。
4. 生成可视化布局。
5. 绑定真实数据。
6. 生成交互关系。
7. 校验 Schema 和数据完整性。
8. 生成最终可交互诊断工作空间。

这一步才是真正的 Agent-Native Visualization。

# 八、如何验证这套设计是否真正有价值？

我建议不要用页面美观度、组件数量或者可视化丰富度作为主要评价指标。

真正应该衡量的是：用户能否更快理解问题、更准确定位问题、更有效验证结论。

建议建立以下评价体系：

| 评价维度      | 核心指标                   | 验证方法             |
| --------- | ---------------------- | ---------------- |
| 理解效率      | 问题理解时间                 | 用户解释计算和执行关系所需时间  |
| 定位效率      | Time to Root Cause     | 从异常发现到确认根因的时间    |
| 诊断质量      | Root Cause Accuracy    | 与专家确认的根因对比       |
| 证据质量      | Evidence Coverage      | 结论有证据支持的比例       |
| 跨层能力      | Cross-layer Navigation | 从模型到算子、硬件的定位成功率  |
| Agent 可控性 | Intervention Success   | 用户能否正确干预和恢复      |
| 验证能力      | Validation Pass Rate   | 优化方案通过精度和性能检查的比例 |
| 使用效率      | Cognitive Load         | 信息查找次数、无效操作、主观负担 |

## 建议的第一批真实验证任务

## 三类典型场景的验证任务

Operator Development

RMSNorm Shape 变化引起性能下降

用户需要定位 Shape、Reduction、Layout、UB 驻留、数据搬运和性能之间的关系。

成功标准：能够找到真实瓶颈，并通过对照实验验证优化效果。

Model Training

MoE 训练通信与计算不均衡

用户需要定位 Token 分布、Expert Load、EP Dispatch、AllToAll、Rank 等待和训练性能之间的关系。

成功标准：找到造成关键路径延迟的因素，并通过实际通信和计算 Trace 验证。

Model Inference

长上下文 Decode ITL 异常

用户需要从 Request、KV Gather、Attention、Memory、通信逐层定位。

成功标准：确定延迟关键路径，完成优化前后 ITL 和吞吐对比。

实验上采用传统 Profiler / 日志界面作为对照组，Agent-Native Workspace 作为实验组。统一任务、数据、设备和问题难度，记录定位时间、根因准确率和证据完整率，并采用多名工程师交叉测试。

# 九、最终应该沉淀成什么？

我建议最终交付的不是三个独立产品，也不是一个大型 Dashboard，而是以下一套可复用资产。

# AI Infra Observability UX Framework

实施交付结构

01 · Domain Semantic Model

六层计算对象、八类关系、统一 Schema。

02 · Observability Interaction Architecture

对象浏览、跨层关联、时间追踪、属性检查、证据验证、人工干预。

03 · 21 Core Design Patterns

6 种认知模式、8 种诊断模式、7 种工程操作模式。

04 · Visualization Component Library

Graph、Timeline、Topology、Matrix、Inspector、Diff、Metric。

05 · Agent Interaction Protocol

任务计划、工具调用、Evidence、Finding、Validation、Artifact。

06 · Three Domain Workspaces

Operator / Training / Inference。

07 · Validation & Evaluation

真实任务、Mock 数据、专家标注、对照实验和评价指标。

## 最重要的三个设计决策

最后，我把整个方案再浓缩成三个决定，它们会影响后续所有 UX/UI 工作。

第一：不要以指标为中心设计，而要以计算对象及其关系为中心设计。

单独展示 MFU、Latency、Memory Utilization 没有足够的解释能力。用户需要知道指标对应哪个模型对象、算子、Rank、硬件资源和执行阶段。

第二：不要以 Dashboard 为中心设计，而要以问题定位路径为中心设计。

用户不是为了看数据而使用工具，而是为了完成一个工程任务。界面应该围绕问题组织计算图、Trace、拓扑、证据和验证，而不是把所有指标堆在一个页面。

第三：不要以 Agent 生成文本为中心设计，而要以 Agent 生成的结构化计算知识为中心设计。

Agent 应当生成可追溯的对象、关系、假设、证据和验证结果，界面再根据这些语义选择合适的 Pattern 和 Visualization。

我的最终方法论概括是：

# Object-Centric · Evidence-Driven · Agent-Native

对象驱动 · 证据驱动 · Agent 原生

- Object-Centric：用计算对象组织复杂系统。
- Relationship-Aware：用跨层关系解释计算和硬件。
- Evidence-Driven：用实际证据建立可信诊断。
- Agent-Native：让 Agent 动态生成和组织界面。
- Human-Controlled：让工程师始终能够理解、验证和干预。

我的实施优先级建议：先做一个完整的 RMSNorm 算子诊断原型，而不是先做三个场景的完整 Dashboard。

这个原型必须打通：

`用户代码 → 计算语义 → 编译 Pass → Tile / Memory → 硬件执行 → 精度 / 性能 → Agent 诊断 → 证据验证`

如果这条链路成立，再将相同的对象模型、交互契约和 Pattern 扩展到 DeepSeek-V4 训练和长上下文推理，就能够形成真正统一的 AI Infra 可解释、可观测设计系统。