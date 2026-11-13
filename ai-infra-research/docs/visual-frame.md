# 智能计算领域的跨层知识视觉设计体系：设计理念、核心特征与方法论

这实际上是比传统 AI Infra 可观测性设计更底层的一个问题：智能计算领域的视觉设计，不只是把复杂的技术信息展示出来，而是如何将一个跨越模型、算法、算子、编译器、计算任务、通信网络和集群硬件的复杂计算系统，转化为人和 Agent 都能够理解、分析、操作和推理的视觉知识体系。

我认为，应当将它从传统的 UI 设计、数据可视化和技术架构图设计中独立出来，形成一套专门的方法论。

可以暂时将其命名为：

# Intelligent Computing Visual System

智能计算领域视觉设计体系

## 从跨层计算知识建模，到动态计算过程表达，再到人机协同的视觉推理。

知识维度

多对象、跨层级、复杂关联、语义依赖

计算维度

静态结构、动态状态、时序演进、资源变化

认知维度

视觉分组、空间映射、关系识别、异常感知

工程维度

Agent 调用、数据绑定、交互、渲染和验证

核心判断：

传统 UI 设计以功能和操作为中心，传统数据可视化以数据和统计关系为中心，而智能计算领域视觉设计应当以计算对象、计算关系、计算行为和计算证据为中心。

它既要表达系统是什么，也要解释系统为什么这样运行，以及运行过程中发生了什么。

# 一、为什么智能计算需要独立的视觉设计体系？

首先需要证明：这个领域的复杂度是否已经超出了传统 UI 和可视化设计方法的有效范围。

我认为主要有五个结构性原因。

## 1. 知识不是单层结构，而是跨层关联的知识网络

智能计算领域不是一个简单的层级架构，而是多个知识体系相互交叉。

例如，一个 Transformer 模型中的 Attention：

[A Guide to LLM Inference (Part 2): Attention Optimisation – Stephen Carmody](https://images.openai.com/static-rsc-4/HaBiI_jgN7nK4z-zovatcunNKwvhDT2ZOJjGyM1NejoKy4LtKnuF8IT3afcvvgsX0l9ZJeW1mD33bln1PHGfz5JtOoCGV-LteqGuISRnpGm5i2O7DvN7GlflPXk2VOo9ZjRlJ8jSYPcfFclhu2dvnzASIZ_Tk2zGo9-9W4q4oKI?purpose=inline)

[stephencarmody.github.io](https://stephencarmody.github.io/llm-inference-2-attention/?utm_source=chatgpt.com)

它至少同时涉及：

| 知识层   | 典型对象                  | 关注问题      |
| ----- | --------------------- | --------- |
| 模型语义层 | Attention、Head、Layer  | 模型计算逻辑是什么 |
| 算法层   | QK、Softmax、PV         | 数学计算如何执行  |
| 算子层   | MatMul、Transpose      | 如何实现计算    |
| 编译层   | IR、Pass、Tile、Layout   | 如何转换和优化   |
| 指令层   | Vector、Cube、DMA       | 实际执行什么指令  |
| 存储层   | Register、L1、L2、HBM、UB | 数据在哪里     |
| 硬件层   | Core、NPU、GPU、卡间互联     | 计算资源如何组织  |
| 集群层   | Rank、Node、Topology    | 如何分布式执行   |

这些不是八张互相独立的架构图。

真正重要的是它们之间的关联：

- 一个模型算子对应哪些计算任务？
- 一个 Tile 被分配到哪些计算核心？
- 一个 Tensor 的切分如何影响通信？
- 一个通信操作为什么导致等待？
- 一个硬件资源瓶颈如何反向影响模型性能？

因此，视觉设计的核心对象不应该只是层级，而是：

对象 + 关系 + 属性 + 状态 + 行为 + 证据。

这里存在一个重要转变：视觉设计不再只是给对象安排位置，而是要建立对象之间的语义映射。

## 2. 模型逻辑与集群硬件之间存在多对多映射

这是智能计算视觉设计最重要的结构性挑战之一。

模型逻辑并不能简单地映射成硬件拓扑。

例如：

模型逻辑空间

#### Layer 0

Attention

#### Layer 1

MLP

#### Layer N

Attention

并行策略、切分策略、执行映射

物理资源空间

Node 0

NPU 0

NPU 1

Node 1

NPU 2

NPU 3

概念示意：逻辑计算对象与物理设备不是一一对应关系。

例如 DP、TP、PP、EP：

- DP：模型副本与数据分片之间的关系。
- TP：一个算子的张量计算如何跨设备切分。
- PP：模型层如何映射到不同执行阶段。
- EP：MoE 专家如何映射到设备以及如何路由 Token。

同一个逻辑计算对象，可能跨越多个物理设备；同一个物理设备，又可能承载多个逻辑计算对象。

因此，视觉上不能简单地把模型图和集群拓扑图并列展示。

必须建立：

逻辑对象 → 分布式切分 → 执行任务 → 物理资源 → 运行证据

之间的可追溯映射。

这意味着领域视觉设计需要支持多视图、跨层关联、双向定位和上下文继承。

## 3. 静态结构和动态计算数据同时存在

传统 UI 通常展示相对稳定的对象和状态。

智能计算领域则存在两类完全不同的数据。

| 静态数据      | 动态数据        |
| --------- | ----------- |
| 模型结构      | Tensor 实际流转 |
| 算子定义      | Kernel 执行   |
| Tile 切分规则 | Tile 执行时间   |
| 并行策略      | Rank 间通信    |
| 内存规划      | 内存实际占用      |
| 指令定义      | 指令执行统计      |
| 硬件拓扑      | 设备利用率、带宽    |
| 编译配置      | Pass 转换结果   |

更重要的是，两类数据并非独立。

例如，静态的 TP=2 策略决定了 Tensor 如何切分，而动态的 AllReduce 时延反映了实际通信成本。

静态数据解释计算结构，动态数据验证计算行为。

因此，领域视觉设计必须同时表达结构、运行状态及其因果关联，而不能仅仅展示实时指标。

## 4. 计算和通信存在不同的逻辑复杂度

传统图表擅长展示数值，但智能计算的复杂性不只是数值大小。

例如：

- MatMul：计算量、矩阵维度、数据精度和计算吞吐。
- Softmax：规约依赖、数据读写、数值稳定性。
- Attention：计算依赖、KV 数据访问、长序列复杂度。
- AllReduce：参与 Rank、数据量、通信拓扑和同步等待。
- MoE：Router 决策、Token Dispatch、Expert 负载不均衡、Combine。

它们对应不同的视觉表达需求：

| 复杂度类型 | 应当表达的内容     | 合适的视觉机制   |
| ----- | ----------- | --------- |
| 结构复杂度 | 对象层级、组成关系   | 树、分层图     |
| 计算复杂度 | 计算依赖、计算规模   | 计算图、数据流图  |
| 通信复杂度 | 数据交换、拓扑、参与者 | 通信关系图、拓扑图 |
| 时序复杂度 | 先后顺序、并发、等待  | 时间轴、时序图   |
| 资源复杂度 | 资源占用、竞争、瓶颈  | 资源热力图、映射图 |
| 数值复杂度 | 精度、误差、数据分布  | 对比图、误差分布图 |

这直接证明了一个设计原则：

智能计算领域不存在一种可以表达所有计算问题的万能图形。必须根据计算语义选择视觉编码方式。

## 5. 用户需要理解的不是数据本身，而是数据背后的计算机制

一个普通监控界面可能告诉用户：

- NPU 利用率 65%；
- HBM 带宽 80%；
- AllReduce 耗时 2.4ms。

但对算子开发者和 Infra 工程师来说，这些信息还不够。

他们真正需要理解的是：

- 为什么 NPU 利用率只有 65%？
- 哪个计算阶段没有充分利用硬件？
- HBM 带宽高，是因为数据重复读取还是访存不连续？
- AllReduce 为什么耗时 2.4ms？
- 这是否影响后续计算阶段？
- 应该修改算子、并行策略还是集群配置？

所以设计的最终目标不是指标可见，而是：

从现象定位对象，从对象追踪关系，从关系解释机制，从证据形成判断。

# 二、从人的视知觉出发：如何让复杂计算变得可理解？

领域视觉设计不能只从技术对象出发，还必须考虑人是如何接收、组织和理解信息的。

人的视觉系统并不擅长同时阅读大量相互独立的技术参数，但非常擅长识别空间结构、形状差异、运动、分组和异常。

这决定了智能计算领域不能把复杂度简单地转化为更多信息、更多节点和更多颜色。

## 1. 人的视觉认知有五种重要能力

| 视觉认知机制 | 人的认知优势         | 设计应该如何利用           |
| ------ | -------------- | ------------------ |
| 空间定位   | 快速判断对象的位置      | 用空间位置表达层级、拓扑和执行映射  |
| 视觉分组   | 将相关对象自动组织为整体   | 用容器、邻近、边界表达计算单元    |
| 特征识别   | 快速识别形状、颜色、方向差异 | 用一致的视觉编码区分对象类型和状态  |
| 运动感知   | 识别变化、流动和异常     | 用动画、时序和状态变化表达动态计算  |
| 视觉记忆   | 记住对象位置和空间关系    | 保持跨视图的对象位置、颜色和标识一致 |

其中有一个特别重要的科学依据。

Cleveland 和 McGill 关于图形感知的研究，以及后续相关研究指出，人对定量信息的判断能力与视觉编码方式有关。通常位置和长度比面积、体积以及颜色深浅更适合精确数值比较。

[image](https://www.google.com/s2/favicons?domain=https://academic.oup.com\&sz=32)

Oxford Academic+2



因此，在智能计算领域：

- 不能用面积大小替代精确的计算量比较。
- 不能只用颜色表达所有性能差异。
- 不能让颜色同时代表数据类型、执行状态和异常等级。
- 不能依靠复杂的 3D 透视关系表达需要精确比较的资源分配。
- 不能把所有对象都做成同一种 Card。

### 视觉编码应该建立明确的语义契约

我建议建立这样的编码体系：

| 视觉属性   | 优先表达的语义     | 例子                            |
| ------ | ----------- | ----------------------------- |
| 空间位置   | 层级、顺序、拓扑    | Layer、Rank、Core               |
| 形状     | 对象类别        | Tensor、Operator、Memory        |
| 边线和连接  | 依赖、调用、通信    | Dataflow、Collective           |
| 面积     | 容量、规模的粗略感知  | Memory Capacity               |
| 长度和位置  | 精确数值比较      | Latency、Bandwidth             |
| 色彩     | 类别、状态或风险    | Compute、Communication、Warning |
| 动态运动   | 数据流动、执行过程   | Token Dispatch、DMA            |
| 纹理和透明度 | 辅助区分、重叠、不可用 | Sharded、Unmapped              |

尤其建议把颜色的语义限定在有限范围内。

例如：

- 蓝色：计算对象。
- 绿色：数据与存储对象。
- 紫色：通信对象。
- 灰色：结构和上下文。
- 橙色：需要关注的状态。
- 红色：明确的异常或故障。

这只是一个候选语义规范，最终应通过跨产品一致性测试确定，而不是认为这些颜色具有天然的固定含义。

## 2. 从视觉阅读转向空间认知

传统 UI 经常采用：

标题 → 卡片 → 表格 → 图表 → 详情。

这种结构适合业务管理，但对复杂计算的表达存在局限。

智能计算领域更需要让用户能够在一个空间中建立认知：

[Medium](https://images.openai.com/static-rsc-4/PgwoKqSKZsa_kex8ct7OCHB33gA2foG7WdhhQXiZUZk1obdiVejSZ79LZJBncmBrihh1iz9kUlaksQlnIZAOrxuZ1AdMGrkreezWCL4HLjp01oUawor2OBljDe_gQxcnX0rU9hMaUYGuJZyyz3Q5RK-8MDNwu-_MAtR1OLZzUtw?purpose=inline)

[medium.com](https://medium.com/%40nicolarohrseitz/the-cartography-of-uncertainty-83e511672714?utm_source=chatgpt.com)

例如，一个 Tensor 对象不应该只是一个数据表格中的名称。

它应该能够表达：

1. 它属于哪个模型层。
2. 它由哪个算子产生。
3. Shape、Dtype、Layout 是什么。
4. 它如何被切分成 Tile。
5. 它分布在哪些 Rank。
6. 它实际驻留在哪里。
7. 它被哪些计算任务消费。
8. 它在运行时发生了什么变化。

这种视觉表达不是简单的信息聚合，而是帮助人建立计算系统的心理模型。

设计目标是让用户能够通过视觉空间理解原本需要在多个代码文件、日志、指标和文档之间反复切换才能理解的关系。

## 3. 认知负荷决定信息呈现策略

这里还需要区分三种复杂度：

- 内在复杂度：计算本身就很复杂，例如 MoE 路由、分布式同步。
- 外在复杂度：由糟糕的信息组织造成，例如跨页面寻找同一个 Tensor。
- 有益复杂度：用户为了理解计算机制而必须进行的分析，例如比较两个 Pass 的 Layout 变化。

视觉设计不能消灭计算本身的复杂度，但可以显著减少外在复杂度。

因此应该遵循三个策略：

第一，分层而不是删减。

保留完整的专业信息，但按用户当前任务组织呈现。

第二，渐进展开而不是一次铺满。

先展示模型和计算结构，再展开算子、Tensor、Tile、指令和内存细节。

第三，关联而不是重复。

同一个 Tensor 在模型图、算子图、内存视图和通信视图中应当是同一个对象，而不是四份独立信息。

这意味着视觉设计需要支持跨视图定位、对象身份保持、上下文继承和多层级钻取。

# 三、从 Agent 工程能力出发：视觉设计正在从人工制作转向可计算生成

这是智能计算领域区别于传统可视化设计的另一个关键变化。

过去：

设计师理解需求 → 人工组织信息 → 人工绘制组件 → 开发实现交互。

Agent 参与之后：

用户提出计算问题 → Agent 理解问题 → 获取工程数据 → 建立对象关系 → 选择视觉模式 → 绑定数据 → 生成和验证界面。

视觉设计的部分工作开始具有可执行性。

但必须明确：Agent 可以生成视觉表达，不意味着 Agent 天然理解计算领域的正确性。

## 1. Agent 的工程能力正在改变视觉设计的生产方式

| Agent 能力 | 对视觉设计的影响              |
| -------- | --------------------- |
| 代码理解     | 可以识别算子、模型、IR、调用关系     |
| 工具调用     | 可以获取编译、运行、Profiler 数据 |
| 数据处理     | 可以聚合、关联和计算指标          |
| 知识检索     | 可以调用领域知识、规范和案例        |
| UI 代码生成  | 可以动态组装图表和交互组件         |
| 多步骤执行    | 可以完成诊断、定位和验证工作        |
| 结果校验     | 可以检查数据、结构和部分视觉约束      |

由此产生一个设计上的重要变化：

过去设计师主要交付页面和组件。

未来领域视觉设计还需要交付：

- 对象语义定义。
- 关系模型。
- 视觉编码规范。
- 图形组件规范。
- 数据绑定规范。
- 交互行为规范。
- Agent 可调用的视觉 Pattern。
- 结果验证规则。

也就是说，设计系统本身必须逐渐变成 Agent 可以理解和执行的知识系统。

## 2. Agent 生成视觉内容需要四层工程契约

第一层：Domain Schema

定义 Tensor、Operator、Tile、Rank、Memory、Event 等领域对象

第二层：Relationship & Rule

定义对象之间的映射、依赖、切分、执行和通信关系

第三层：Visual Pattern

定义图形类型、空间布局、视觉编码和交互模式

第四层：Runtime & Validation

数据绑定、渲染、交互、性能、语义和结果校验

这四层不能混淆。

举个例子：

用户问：

> 为什么这个 MoE 训练任务中有些 Expert 利用率很低？

Agent 应该先理解：

- Expert 是什么对象。
- Token 如何路由。
- EP 如何切分。
- Expert 与 Rank 如何映射。
- Dispatch 和 Combine 如何通信。
- Expert 负载如何计算。

然后才选择适合的视觉模式：

- Token 路由关系图。
- Expert 负载分布图。
- Rank 拓扑图。
- AllToAll 通信时序图。

最后将真实运行数据绑定进去。

如果 Agent 直接根据问题生成一个漂亮的 Dashboard，却没有正确表达 Token → Expert → Rank → Communication 的关系，那么这个界面即使渲染完美，也没有领域价值。

## 3. 设计系统应该从 Component System 进化为 Visual Knowledge System

这是我认为值得重点建立的理念。

传统 Design System：

`Color → Typography → Component → Page`

智能计算领域：

`Domain Object → Semantic Relationship → Visual Pattern → Interaction → Runtime`

二者不是互相替代，而是需要叠加。

例如：

| 层级 | 传统设计系统            | 智能计算视觉系统                             |
| -- | ----------------- | ------------------------------------ |
| 基础 | 颜色、字体、间距          | 对象语义、关系语义                            |
| 组件 | Card、Table、Button | Tensor Node、Compute Graph、Memory Map |
| 模式 | Dashboard、表单、列表   | 计算流、通信拓扑、Pass Diff                   |
| 交互 | 点击、筛选、编辑          | 跨层追踪、时序回放、因果定位                       |
| 规则 | 页面布局规则            | 计算语义和视觉映射规则                          |
| 验证 | UI 一致性、交互可用性      | 数据正确性、计算语义、关系完整性                     |

一个成熟的领域视觉系统，应该使 Agent 能够根据计算问题调用正确的视觉模式，而不是仅仅根据组件库拼凑页面。

# 四、从渲染机制出发：复杂视觉表达需要什么样的技术体系？

这里需要区分设计层和渲染层。

不是所有复杂的计算可视化都应该采用相同的前端渲染技术。

当前主流 Web 技术大致有以下几种：

| 技术               | 特征                | 适合的领域场景         |
| ---------------- | ----------------- | --------------- |
| DOM / HTML / CSS | 语义结构、文本、交互、布局     | 属性面板、代码、表格、详情   |
| SVG              | 保留对象结构、矢量图形、元素可交互 | 计算图、架构图、拓扑图     |
| Canvas 2D        | 即时绘制、适合大量图形批量渲染   | 热力图、密集时间轴       |
| WebGL            | GPU 加速的图形渲染       | 大规模节点网络、复杂空间可视化 |
| WebGPU           | GPU 图形和计算能力       | 更复杂的并行数据处理和可视化  |

SVG 与 Canvas 的核心区别之一是保留模式与即时绘制模式：SVG 保留图形对象结构，Canvas 则主要由程序控制绘制过程。两者也可以组合使用。

[image](https://www.google.com/s2/favicons?domain=https://wiki.whatwg.org\&sz=32)

WHATWG Wiki+1

&#x20;WebGPU 则提供 GPU 渲染和计算接口，但并不意味着所有图形都应该使用 WebGPU。

[image](https://www.google.com/s2/favicons?domain=https://www.w3.org\&sz=32)

W3C+1



## 1. 应当根据数据规模和交互复杂度选择渲染方式

不同渲染技术的适用分工

DOM / CSS

语义与交互

代码、配置、属性、日志、操作按钮。

SVG

结构与关系

模型计算图、IR 图、算子数据流、通信拓扑。

Canvas

高密度二维数据

大规模时间线、执行事件、热力图、性能轨迹。

WebGL / WebGPU

大规模并行可视化

海量执行节点、GPU 资源映射、大规模并行状态渲染。

实际工程中，我更建议采用混合渲染架构：

- DOM 管理交互、文本和属性。
- SVG 管理需要选择和追踪的计算关系。
- Canvas 管理大量密集的运行数据。
- WebGL / WebGPU 管理需要高吞吐绘制的复杂图形。

例如，一个集群通信可视化：

- 底层 Canvas 绘制数千个通信事件。
- SVG 绘制关键 Rank 之间的关系。
- DOM 显示选中 Rank 的通信指标和属性。
- Agent 负责生成查询、筛选和诊断结果。

这种方式比全部使用 DOM 或全部使用 Canvas 更合理。

## 2. 渲染技术本身会反向影响视觉设计

这是设计师经常忽略的部分。

例如：

- 如果节点数量非常多，必须考虑聚合、LOD 和视图裁剪。
- 如果对象之间存在大量连接，必须处理边的重叠和视觉遮挡。
- 如果运行事件数量很大，必须考虑时间窗口和数据抽样。
- 如果需要跨层追踪，必须保持对象 ID 和选择状态一致。
- 如果使用动态动画，必须控制更新频率，避免动画影响用户观察和性能。

因此，领域视觉设计不是先画好图，再让开发人员想办法实现。

它必须同时考虑：

领域语义是否正确、视觉表达是否有效、渲染性能是否可接受、交互是否可以执行。

# 五、综合以上因素，建立智能计算领域视觉设计的六大设计理念

结合领域知识结构、计算复杂度、人的视觉认知、Agent 工程能力和渲染机制，我认为可以归纳出六个核心理念。

1\. 关系优先（Relationship First）

不以孤立对象为中心，而以对象之间的映射、依赖、流转、分布和因果关系为核心。让用户理解计算系统如何组织和运行。

2\. 跨层贯通（Cross-layer Continuity）

同一个计算对象能够在模型、算子、编译、指令、内存和硬件视图中保持身份一致，支持上下游追踪和双向映射。

3\. 计算过程可见（Computational Dynamics）

同时表达静态结构和动态行为，将计算、通信、内存、同步和时序统一到运行过程之中。

4\. 认知减负（Cognitive Optimization）

利用空间、分组、视觉层级和渐进展开降低外在认知负担，不以减少专业信息为代价。

5\. 人机协同可执行（Human-Agent Executability）

视觉系统不仅供人阅读，也应当具备结构化语义、数据接口、交互协议和可验证规则，支持 Agent 生成、修改和调用。

6\. 复杂度自适应（Complexity Adaptive）

根据对象规模、数据密度、交互深度和计算复杂度选择不同的视觉表达和渲染技术，保证可理解性与工程性能。

这六项不是六种风格，而是六项设计原则。

# 六、形成一套可落地的视觉设计方法论

我建议将方法论抽象为：

# Domain → Relationship → Computation → Cognition → Visualization → Execution

即：

领域建模 → 关系建模 → 计算建模 → 认知建模 → 视觉表达 → 工程执行。

这套方法论可以进一步分解为七个步骤。

## Step 1：领域知识建模（Domain Modeling）

先回答：我们要表达的智能计算系统到底由什么组成？

建立领域对象字典。

| 对象类别 | 对象示例                            |
| ---- | ------------------------------- |
| 模型对象 | Model、Layer、Attention、Expert    |
| 数据对象 | Tensor、Activation、Gradient、KV   |
| 计算对象 | Operator、Tile、Block、Kernel      |
| 编译对象 | Graph、IR、Pass、Layout            |
| 执行对象 | Task、Stream、Event、Barrier       |
| 通信对象 | Send、Receive、AllReduce、AllToAll |
| 存储对象 | Register、UB、L1、HBM              |
| 资源对象 | Core、NPU、GPU、Node、Rank          |

这里需要注意：不同技术体系中，对象的定义和层级可能不同，不能强行用一棵固定树覆盖所有体系。

## Step 2：跨层关系建模（Relationship Modeling）

这是整套方法论最重要的一步。

不要仅仅定义对象，还要定义关系类型。

| 关系类型              | 含义  | 示例                 |
| ----------------- | --- | ------------------ |
| Contains          | 包含  | Model 包含 Layer     |
| Produces          | 产生  | Operator 产生 Tensor |
| Consumes          | 消费  | Operator 消费 Tensor |
| Transforms        | 转换  | Pass 转换 IR         |
| Partitions        | 切分  | TP 切分 Tensor       |
| Maps To           | 映射  | Tile 映射到 Core      |
| Executes On       | 执行于 | Kernel 执行于 NPU     |
| Communicates With | 通信  | Rank 之间 AllReduce  |
| Depends On        | 依赖  | Task 依赖 Barrier    |
| Resides In        | 驻留于 | Tensor 驻留于 UB      |

最终形成一个多类型、可追踪的领域关系图谱。

## Step 3：计算机制建模（Computational Modeling）

进一步理解每个对象在计算过程中发生什么。

这一步不能停留在架构层。

需要明确：

- 数据如何产生和消费。
- 计算如何分解和执行。
- 数据如何在不同存储层迁移。
- 任务如何调度和同步。
- 通信如何发生。
- 计算如何并行。
- 性能和精度如何变化。

例如一个 Attention 算子，不仅需要表达 QK、Softmax、PV 的计算关系，还要表达 Tensor Shape、Tile 切分、内存驻留、数据搬运、同步和实际执行时间。

## Step 4：认知任务建模（Cognitive Modeling）

需要问：用户到底要完成什么认知任务？

建议归纳为八类：

| 用户认知任务 | 典型问题           |
| ------ | -------------- |
| 认识     | 系统由什么组成？       |
| 理解     | 对象之间是什么关系？     |
| 追踪     | 这个数据从哪里来、到哪里去？ |
| 比较     | 两个执行方案有什么区别？   |
| 定位     | 问题发生在哪个对象或阶段？  |
| 解释     | 为什么会发生这个问题？    |
| 预测     | 修改配置后可能发生什么？   |
| 验证     | 优化是否真正生效？      |

这一步直接决定视觉设计的目标。

例如：

- 认识集群拓扑：采用拓扑图。
- 理解计算依赖：采用计算图。
- 追踪 Tensor：采用数据流和跨层映射。
- 比较 Pass：采用差异视图。
- 定位通信瓶颈：采用时序图和 Rank 拓扑。
- 验证精度：采用误差分布和逐层对比。

## Step 5：视觉模式设计（Visual Pattern Design）

将认知任务映射为视觉表达。

建议建设领域专属 Pattern Library：

## 智能计算领域视觉模式库

[Introduction to Deep Learning | Sebastian Raschka, PhD](https://images.openai.com/static-rsc-4/BR3XsCBz-wagMp5oMME0IdT9ddmqQwGbCf5ZllbbPSKojQHzZvIUXOw0uMmWuc3zsrLuOrTPPzOtm9Gj7xpOoD8mJkqhCoY-6Z_CuFA4L6vL_hL8w8XXOihfi2VKnOn85d9VM7rayaDWJDhPHGUAW-qNkNCNCfLxAgLHR5186H0?purpose=inline)

计算关系模式

计算图、数据流、依赖图

[Infra for Distributed Model Training of LLM: Part TWO — Topology Design | by ming gao | Medium](https://images.openai.com/static-rsc-4/Z1urmxrluzsLXVxRACXmYPP_buJKoWRAtUCHM_l707Z7DXzltjExzHfj5zaBSA8IiCwBvmLc1YE9BbAIckkMhgk-bN3L2zTOBjMePDMajLd3D7YdaMi1pEeL_dN_POSMl_SJXhyMt6pq_F4RmBjJBTzpFXDQFl3T6cN1zYsA-t4?purpose=inline)

资源映射模式

Rank、设备拓扑、并行映射

[Nsight Systems | NVIDIA Developer](https://images.openai.com/static-rsc-4/5-KV8kcRF2nkCt3C4P-P4G85fzyWekXc6HwuFgO_6Y0s213HjMohVepH0j7L1oDx4GBirHptmLvG6sbhUt04KcEIueJDy_XvmRoJu0ZgLjAJt37ZamnfOtE0Ha2p9bc2-Nv0A0W4ghO9Gd_Luys3JrwDeyK855cfrY6A7BhVVZo?purpose=inline)

动态时序模式

执行时间线、通信、同步

[Notes of CSAPP — 2. A Tour of Computer Systems Cont. | by Wei Wang | Medium](https://images.openai.com/static-rsc-4/dxg1BVrs5I09VTWmmyK5eaT1bdrxDohJYMj1PIvNm_rLn0bW5GJZMAsmPlWd2mjPqF1EIu375Lg0Txw9QkGsUmaTze9aBQ5awgK7fZxDPpVAkcAMO8pQSqK4BmdJ1rwT39p0sKpje7CR6g9y0B6SAk4bWbOTQ0FT7ew8CgBTo5w?purpose=inline)

资源状态模式

内存、带宽、缓存、资源占用

[Slide31.png | Computation Structures | Electrical Engineering and Computer Science | MIT OpenCourseWare](https://images.openai.com/static-rsc-4/BdK3fzgXd47qRNXtC3pOmTJqqpztDKZTKJKCl248ZD1KNGCqFRDUwOGTHZ9h2D3gzyiBNuTfXO3t-YrtZ_ieJXt9ZkWGkMEUqOJigIpg_D1YSe2-Prw7JBj1hQ4YyWtyodfR7lEz_ryTLd_AyMiGhFPh3Y4_2OZAKwTXJ4y-TtI?purpose=inline)

编译转换模式

IR、Pass、Diff、优化过程

[隐形的守护者（风控技术篇）-时序流异常检测（Self-Isolation-Stream)-京东云开发者社区](https://images.openai.com/static-rsc-4/IEX_2-uchlJbz8mTxvtdj1528741Jm94uhd5WXgEVEewY9j6hCGknJlx0hhDYyfUmLXw91D63z3ONt8gUU1sBj6Q6JDgMe2kN6bcX5iHxkICcSkNGb_H47pMkm2tcIML1pGBNQ5EnQh_HiTiolud5SArpLjJJum3s1ufiJiAyIw?purpose=inline)

诊断证据模式

异常、精度差异、根因分析

每个 Pattern 必须定义：

1. 适用的计算问题。
2. 所需的领域对象。
3. 必须表达的关系。
4. 视觉编码规则。
5. 交互和钻取规则。
6. 数据输入 Schema。
7. Agent 调用约束。
8. 渲染和性能限制。
9. 正确性验证规则。

## Step 6：人机协同与渲染实现（Execution）

将视觉 Pattern 转化为可以执行的工程能力。

Agent 负责：

- 理解用户问题。
- 检索数据和知识。
- 识别领域对象。
- 选择 Pattern。
- 组织数据和交互。
- 提出诊断假设。

视觉引擎负责：

- 对象身份管理。
- 数据绑定。
- 图形布局。
- 图形渲染。
- 状态同步。
- 用户交互。

用户负责：

- 判断业务上下文。
- 选择分析方向。
- 验证诊断结论。
- 决定是否修改代码和系统配置。

最重要的是，Agent 不能凭空补齐缺失的运行数据，也不能将推测的计算关系呈现成已经证实的事实。

## Step 7：多维度验证（Validation）

视觉设计需要同时验证五个维度：

| 验证维度      | 核心问题      | 评价指标                     |
| --------- | --------- | ------------------------ |
| 领域正确性     | 对象和关系是否真实 | 语义准确率、关系完整率              |
| 认知有效性     | 用户是否理解    | 任务正确率、理解时间               |
| 视觉有效性     | 是否容易识别    | 信息查找时间、误读率               |
| 工程有效性     | 是否能稳定执行   | 渲染延迟、交互响应                |
| Agent 有效性 | 是否能正确生成   | Schema 通过率、Pattern 选择准确率 |

这也可以借鉴 Tamara Munzner 提出的可视化设计四层嵌套模型：领域问题、数据与任务抽象、视觉编码与交互、算法实现。其核心启示是，上游领域建模错误会传递到后续所有设计环节。

[image](https://www.google.com/s2/favicons?domain=https://pubmed.ncbi.nlm.nih.gov\&sz=32)

PubMed+1



# 七、最终形成什么样的设计体系？

我建议不要将其最终落成一套单纯的 Design System，而是形成四个相互依赖的体系。

# Intelligent Computing Visual Architecture

01 · Domain Knowledge System

领域知识体系

对象、属性、层级、关系、计算语义、硬件语义。

02 · Visual Language System

视觉语言体系

空间布局、视觉编码、图形语法、颜色语义、状态规范。

03 · Visual Pattern & Interaction System

视觉模式与交互体系

计算图、时序图、拓扑图、内存图、诊断图、跨层交互。

04 · Agent & Rendering System

Agent 与渲染执行体系

Skill、MCP、Schema、数据接口、渲染引擎、自动验证。

底层共同依赖：真实数据、计算语义、对象身份、版本和证据来源。

## 八、与传统 UI 设计的本质区别

最终可以用这张表来明确设计范式的转变：

| 比较维度 | 传统 UI 设计     | 智能计算领域视觉设计           |
| ---- | ------------ | -------------------- |
| 设计中心 | 功能、页面、操作     | 计算对象、关系、机制           |
| 基础单元 | UI Component | Domain Object        |
| 信息组织 | 页面与模块        | 计算结构与关系网络            |
| 主要表达 | 状态、信息、流程     | 结构、数据流、执行、因果         |
| 时间维度 | 页面状态变化       | 计算过程和时序演进            |
| 空间表达 | 布局和导航        | 逻辑空间、物理空间、资源映射       |
| 交互方式 | 点击、编辑、筛选     | 追踪、映射、比较、回放、诊断       |
| 数据来源 | 业务数据         | 代码、编译、运行、Profiler、硬件 |
| 生成方式 | 人工设计与开发      | 人工规范 + Agent 动态组装    |
| 质量标准 | 易用、美观、一致     | 语义正确、认知有效、可验证、可执行    |

# 九、我的最终判断：可以抽象为一种新的视觉设计范式

我认为最值得提出的不是一种新的 UI 风格，而是：

# Computational Visual Intelligence

## 计算智能视觉设计

以计算知识为基础，以关系为组织方式，以动态过程为表达对象，以人的认知为优化目标，以 Agent 为生成和执行主体，以渲染技术为实现基础。

它的目标是让复杂的智能计算系统能够被看见、理解、追踪、分析、诊断和验证。

我进一步认为，它可以浓缩成五个设计方法论关键词：

1. 语义化（Semantic）：先理解计算对象和真实含义，而不是先画图。
2. 关系化（Relational）：以跨层对象关系组织视觉空间。
3. 动态化（Dynamic）：将结构、执行、时序和资源变化统一表达。
4. 认知化（Cognitive）：围绕人的理解和决策优化视觉信息。
5. 可执行化（Executable）：让视觉规范成为 Agent 可以调用、组合、验证的工程资产。

其中，前四个解决的是如何让人理解复杂计算，第五个解决的是如何让这套视觉体系在 Agent 时代持续生产和演进。

最重要的设计主张：不是把智能计算系统画得更清楚，而是把计算系统的知识、关系和运行机制转化为人和 Agent 都能操作的视觉认知空间。

这才是它与传统 UI 设计、普通 Dashboard、传统数据可视化和静态技术架构图之间最根本的区别。

理论依据与边界： 这里提出的是针对智能计算领域的综合设计框架，不是已经得到学术界验证的独立学科。视觉感知编码依据 Cleveland–McGill 等研究；设计分层依据 Munzner 的 Nested Model；渲染分工依据现有 Web 图形技术机制。具体方法论仍需通过算子开发、模型训练和推理任务进行用户实验验证。

参考理论与技术资料

- [Tamara Munzner — A Nested Model for Visualization Design and Validation](https://www.cs.ubc.ca/labs/imager/tr/2009/NestedModel/?utm_source=chatgpt.com)
- [Perceptual and Cognitive Foundations of Information Visualization](https://doi.org/10.1146/annurev-vision-110323-110009?utm_source=chatgpt.com)
- [Cleveland & McGill — Graphical Perception](https://academic.oup.com/jrsssa/article/150/3/192/7106201?utm_source=chatgpt.com)
- [SVG and Canvas — Rendering Models](https://wiki.whatwg.org/wiki/SVG_and_canvas?utm_source=chatgpt.com)
- [W3C WebGPU Specification](https://www.w3.org/TR/webgpu/?utm_source=chatgpt.com)