# 分布式训练 Demo：真实 / Mock 通信观测升级方案

日期：2026-11-23\
状态：产品与数据接入设计草案；已实现构造会话的 2.5D 指标叠加；Ascend 实测接入与浏览器视觉待验证\
适用入口：`training-demo.html`，现有契约见 [SPEC.md](SPEC.md)

## 1. 产品判断

当前 Demo 已能解释模型展开、TP/SP、缓存取数、MoE、专家归属与 Rank 部署关系。第 10 步的连线来自规则推导，并非一次训练运行中的传输记录。

本次升级的目标是让开发者追踪一次具体通信操作：定位它的参与 Rank、计算依赖、各 Rank 的执行情况，以及可确认的设备归属。核心问题是：**某个 MoE 层的一轮 Dispatch → 专家计算 → Combine 为什么拖慢后续计算：是路由负载倾斜、前置计算晚到，还是通信执行阶段变长？** 观察单位是一个 microbatch 的完整 EP 通信组；单 token 只作为下钻对象。

先以真实训练案例确定调查对象，再审计公开数据与采集入口。真实数据与 Mock 服务于同一调查对象，不分别设计小规模和完整规模两套产品。两条路径消费同一套数据契约，但保存各自来源与能力范围。公开 GPU Trace 不能被改名为昇腾 HCCL/灵衢实测，真实运行也不能强行套入当前单 Block 的示例计算图。

当前已完成公开 NCCL Trace 下载与本地事件关联审计（见 §12），尚无已核验的 Ascend 原始通信样本；未运行设备测试、未改动 Demo。NCCL 样本仅供解析与交互验证，不接到 Ascend Rank 上。

## 2. 开发者任务与成功标准

| 开发者问题 | 必要对象 / 证据 | 产品行为 |
|---|---|---|
| 这次通信为什么存在？ | 计算节点、张量/梯度 bucket、通信域 | 从通信进入其前置计算和数据用途；没有映射时保留未知 |
| 哪些 Rank 共同参与？ | 真实 group ID、成员与 local/global Rank 对应 | 一次选择高亮完整参与组，标出缺失采集成员 |
| 哪个 Rank 晚到？ | 同一次操作的跨 Rank 对齐、可比较时间基准 | 对齐显示进入时间和跨度，回看前置计算 |
| 是否真的传得慢？ | 数据量、传输时间、等待口径、对照样本 | 区分到达差异与传输阶段变化，不仅比较总耗时 |
| 是否影响训练速度？ | 计算/通信重叠、关键路径或完整 step 边界 | 展示暴露的通信时间与后续依赖；不能把所有通信时长相加当收益 |
| 为什么 MoE 的某些 Rank 更忙？ | 批次路由统计、收发量、专家执行事件 | 关联专家负载与通信不均；单 token 路径不能替代全局负载 |
| 部署位置是否相关？ | 实际设备映射、物理拓扑、链路信息 | 定位承载设备；没有数据时只展示逻辑参与关系 |

成功标准是用户能从“发现异常”走到“有证据支持的下一步调查”，不是仅看到更多指标或更大的 Rank 阵列。

## 3. 本次检索到的开源数据与参考

检索以官方项目仓库和文档为依据。证据层级逐来源记录；HTA 已完成文件级审计，其他候选不能因文件存在就宣布可完成端到端分析。

| 来源 | 已确认内容 | 建议用途 | 接入前仍须核验 |
|---|---|---|---|
| Meta HolisticTraceAnalysis（HTA） | 已下载解析八份 Trace，确认 NCCL、worldSize=64、覆盖 Rank0–7；提取 Rank0 本地关联链 [S1] | 通用多 Rank profiler 适配参考；评估事件对齐、CPU/GPU 关联与时间线，不预设为 MoE EP 样本 | group/sequence 与跨 Rank 对时尚未建立；八份文件不是完整八卡任务；仅用于独立 GPU 解析验证，不绑定 Ascend Rank |
| Meta PARAM | `et_replay/tests/inputs` 提供 `resnet_et.json.gz`、`resnet_kineto.json.gz`、`dlrm_pytorch_et.tar.gz`、`dlrm_kineto.tar.gz` 等；另有 ET 采集与 replay 文档 [S2][S3] | 审计 ET 与 Kineto 的关联，研究计算/通信依赖和回放入口；可作为 HTA 字段不足时的备选 | 解压后实际 Rank 数、collective 类型、事件 ID 对应及采集范围；不能直接假定两个同名前缀文件逐事件一一对应 |
| MLCommons Chakra | 官方项目提供执行图 schema、采集/转换/生成工具，并链接 Trace Library [S4][S5] | 借鉴计算、通信、依赖的统一表示；后续适配层与确定性 Mock 的格式参考 | 每份具体 Trace 是采集、转换还是生成；时长是否实测；本轮没有选定某份数据集 |
| Ascend msprof-analyze | 官方开源集群分析工具；文档说明多 Rank 输入、通信时间/矩阵输出 [S6] | 昇腾接入的优先字段与格式参考，后续解析真实 profiler 导出 | 本轮未确认一套可直接使用且完整的公开昇腾多 Rank 原始采集数据。工具源码和文档例子不等于真实样本 |
| MindStudio Insight | 官方文档展示通信域、通信矩阵、Rank 耗时分析与时间线跳转 [S7][S8] | 参考通信对象与排查路径，校准各指标定义 | 不同版本、设备、采集级别的字段支持范围；缺失指标不能补零 |

### 3.1 从真实需求确定通信组与规模

**研究主对象：一个 MoE 层、一个 microbatch、一个完整的 64 Rank EP 组，以及对应 Dispatch → 专家计算 → Combine 链。** EP64 是有官方训练案例与昇腾通信基准共同支撑的研究对象，不是通用最优配置，也不是已拿到的真实采集数据。

| 官方依据 | 已确认事实 | 对产品的含义与边界 |
|---|---|---|
| DeepSeek-V3 原始技术报告 §3.1–3.2 [S9] | 2048 H800 集群；每节点 8 GPU；PP16，EP64 跨 8 节点，使用 ZeRO-1，未使用 TP | 证明跨节点 EP64 是实际训练需求。2048 是作业规模，64 是当前调查的通信组规模，两者不能混用。不能据此把 GPU 节点映射改名为昇腾部署 |
| DeepEP-Ascend 官方仓库 [S10] | 提供 MoE dispatch/combine、训练反向接口及 EP 测试入口；公开 EP8/16/32/64/128 通信基准，声明设备为 Ascend 950DT，CANN 9.2.0，PoC HDK，使用 netlayer 1 外部 Clos 网络 | 给出直接相关的昇腾采集/复现入口。它是通信基准，不是完整训练运行；其网络描述也不能替代待观察运行的实际 UB/灵衢路径 |
| Megatron Bridge 0.3.0 DeepSeek-V3 配方 [S11] | 另一实现使用 TP2、PP16、EP64、1024 GPU | 同一模型可有不同并行实现，不能以模型名推导 TP 或完整组成员；读取实际配方与通信域 |

选择 EP 的产品判断：DP 梯度同步主要解释梯度就绪、同步与反向重叠；EP 则同时关联动态 token 路由、专家负载、收发不均、通信计算依赖与物理部署，更符合本 Demo 已建立的 MoE → 专家归属 → 部署调查路径。这里是面向当前产品任务的选择，不声称 EP 总是训练中最慢的通信。

不再规定 TP4/DP2/EP2，也不改成 TP2/EP4 来适配旧画布。TP、ETP、PP、CP、DP、EDP 和全局 Rank 编号来自选中的运行；EP64 只定义目标通信组大小，不足以反推全作业配置。现有 8 Rank 是推导演示实现，不能约束观测数据。

**数据选择随调查对象调整：**

1. 昇腾优先审计 DeepEP-Ascend 的 EP 测试接口、输出与 profiler 可采集字段。若具备硬件与依赖环境，再获取 EP64 的事件、收发统计和设备映射；当前没有运行条件或采集结果的证据。
2. 完整训练诊断还必须有专家 GEMM、路由负载、microbatch/layer 身份、前后依赖。单独通信基准只支持通信调查，不能证明专家计算或训练关键路径。
3. HTA ViT、PARAM 继续作为通用事件适配与依赖格式参考。没有证明其中包含目标 MoE EP 操作之前，不将其作为主案例，也不因恰好有八份文件决定产品规模。
4. Mock 采用同一个 EP64 调查对象及相同数据契约，构造可检验的原因对照。未知的真实数据由缺失状态表达，不靠 Mock 填补实测字段。

### 3.2 下载与审计清单

接入实施时逐项完成：

- 记录仓库 URL、commit SHA、文件相对路径、下载时间、内容哈希和适用许可证。
- 检查压缩文件是否为真实数据、Git LFS 指针或需要额外下载的包。
- 读取每份 Trace 的 Rank/world/group 元数据，输出可用成员与缺失成员清单。
- 列出通信事件字段的实际覆盖率；核对操作顺序、输入元素数、dtype、消息大小与 CPU/GPU correlation。
- 选择一例可可靠跨 Rank 匹配的操作，保留原始事件索引作为证据。
- 检查时钟来源、单位与跨设备偏移。无法证明可比较时，不计算跨 Rank 到达差。
- 记录 adapter 能力矩阵与拒绝原因。无法满足完整观测时降为局部事件查看，不能补造遗漏成员。

## 4. 数据契约：结构、执行与观测叠加分离

完整字段、引用关系、指标定义与校验规则见 [OBSERVABILITY-SCHEMA.md](OBSERVABILITY-SCHEMA.md)，版本 `communication-observation.v1`（已实现核心 adapter/校验，完整扩展校验待补齐）。

数据不以 Traceview 泳道为中心，也不以旧 Demo 的八 Rank 为中心。2.5D 主体、检查器、交换矩阵与按需时间线读取同一组对象。

| 数据层 | 核心对象 | 对应视图与证据边界 |
|---|---|---|
| 运行与结构 | Run、Rank、Group、Placement、Resource、TopologyLink | 确定参与者和归属；Rank 数、设备数与采集覆盖分别保存 |
| 执行事实 | ExecutionContext、Occurrence、RankEvent、Relation | 识别一次操作及本地事件；CPU、Runtime、设备事件保持原始名称 |
| 观测值 | MetricDefinition、MetricObservation、ExchangeRecord、ExpertLoad | 在 Rank、色带、逻辑关系或物理链路上叠加；每个值有单位、统计范围及来源 |
| 证据与能力 | Source、Evidence、Clock、Alignment、Capability | 决定哪些展示与计算成立；缺失不补零，不靠同名事件配对 |
| 视图投影 | 独立 ViewState、显式 ObjectBinding | 保存选择、展开和指标；不把坐标、颜色和选择状态写进采集事实 |

一次通信允许只有本地事件而没有完整 occurrence；逻辑交换记录允许没有物理路径；聚合指标允许没有逐事件时间戳。缺少 Trace 不阻止有证据的指标叠加，缺少传输记录则不画实际流量。

## 5. 真实数据与 Mock 如何共用产品

| 路线 | 解决的问题 | 数据要求 | 可以展示 | 不作出的承诺 |
|---|---|---|---|---|
| 真实 profiler | 找到某次运行的异常通信及候选原因 | 可追溯原始文件、事件身份、采集范围 | 实际存在的事件、指标、依赖和设备信息 | 不凭总耗时诊断网络故障；不把缺失字段伪造成实测 |
| 确定性 Mock | 走通“晚到”与“传输变慢”的对照操作链 | 固定场景 ID、生成版本、输入参数、预期结果 | 构造规则实际提供的指标、事件与对象联动 | 数值不被表述为任何具体产品的实测性能 |
| 规则推导（现 Demo） | 理解模型与并行机制 | 当前固定模型与配置 | 分片、专家归属、通信组和案例绑定 | 不自动升级为真实执行或真实资源拓扑 |

真实样本与 Mock 作为不同 session 选择，分别保存选择状态；不在同一条时间线上无标识混拼。页面不新增常驻免责声明。来源放入已有 Info、数据集入口和对象检查器中；必要的未知字段在对应位置可辨识。

## 6. 同一 EP 调查对象的真实 / Mock 数据契约

以完整 EP64 通信域为主线，绑定一次 MoE 层执行及其 microbatch。真实输入读取完整成员表、专家归属与物理映射；Mock 使用独立、可追溯的 EP64 配置。不能凭 EP64 自行填出服务器数、TP/ETP 或交换机路径，也不能将 DeepSeek-V3 的 GPU 拓扑移植为 Ascend 实测。

### 6.1 开发者需要区分的原因

| 对照 | 明确控制的变量 | 所需证据与下一步调查 |
|---|---|---|
| 同口径基线 | 同一模型/层、消息规格、路由负载口径、设备与运行配置 | 建立逐 Rank、逐专家、逐阶段比较，不只比较一个总时长 |
| 路由/专家负载倾斜 | 改变专家收到的 token 分布，其余配置保持可比 | 接收 token 数、专家 GEMM 时长、Combine 就绪；调查路由与专家布局 |
| 前置计算晚到 | 固定路由与消息规格，延后某参与者输入就绪 | 同时钟的前置事件与设备通信事件；调查上游计算及调度 |
| 通信阶段变长 | 固定输入就绪及逻辑消息规格，改变通信执行阶段 | 通信事件与可用的传输统计；核对算法、竞争和链路，不能直接判为网络故障 |

这些是同一任务的证据对照，不是“小 Mock → 大案例”的产品分级。Mock 数值由生成器给出并保存因果规则、随机种子和预期结论，文档不先编造硬件时延。真实输入必须保留采集指标定义；缺失的等待或传输分解不套用构造值。

### 6.2 EP 扩展与通用契约

EP64 是目标研究案例，通用 schema 不将组大小写死。`ExecutionContext` 绑定 layer、microbatch、方向；`ExpertLoad`、`RouteSample` 与 `ExchangeRecord` 保存 EP 专用负载与逻辑交换。一个 Dispatch/Combine 阶段可关联多个融合 kernel 或异步事件，不能要求其必然对应单个 HCCL AllToAll。

所有记录复用通用证据、覆盖与度量结构。逻辑 token 按目的 Rank 去重，专家分配计数、padding 和物理字节分别保存；具体定义见 schema。训练反向使用独立 context/occurrence，不能与前向 Combine 混为一次操作。

## 7. 2.5D 叠加为主体，时间线按需展开

保留当前 01–10 推导流程及 Rank 2.5D 图元，不新增“观测”按钮或 step。加载兼容的观测 session 后，直接选择 Rank、数据层或通信关系检查对应证据；没有映射的对象不能强行绑定。外部运行的模型、规模和硬件不一致时使用独立 session，退出恢复原步骤、配置、选择与镜头。

### 7.1 主体上的信息分工

| 图元 | 叠加内容 | 交互与限制 |
|---|---|---|
| Rank 立方体 | 当前 occurrence 的本地耗时、负载或有证据的状态 | 一次选择一个指标；用统一尺度短条与白色数值比较，不改变立方体几何 |
| 内部数据色带 | 本次操作涉及的梯度、权重、激活等数据角色 | 只有显式语义映射时高亮；色带高度不冒充显存容量 |
| 逻辑通信关系 | 已知参与范围、方向，按需查看逻辑收发量 | 组关系不等于逐对传输；无交换记录不生成流量线 |
| 物理链路 | 有采集证据的吞吐、利用率或错误指标 | 拓扑存在不代表某次操作走过该链路；路径需单独证据 |
| 邻近检查器 | 原始字段、指标定义、来源与覆盖 | 点击对象展开，避免常驻指标墙 |

默认以一个 occurrence 和一个指标为焦点。无跨 Rank occurrence 身份时，只展示已选 Rank 的本地事件，不能把各 Rank 的第 N 个同名操作拼成全组。无跨 Rank 对时不能显示晚到差或确定的等待状态；kernel 时长不能标为纯传输时间。

EP64 总览按有证据的设备域聚合；缺少设备映射时按逻辑组呈现，不虚构服务器分组。展开后复用原 Rank 图元，不平铺 64 个大立方体和全连接线。缺失覆盖保留可见，聚合须标明成员与统计方式。

### 7.2 时间线与辅助视图

Traceview 仅在追查执行先后、重叠或前置计算时按需展开，复用已有泳道/时间轴/详情 Pattern；具体组件接口仍待核对。泳道由数据产生，不固定三条，不要求每个数据集都有 Runtime 或设备事件。

Ascend 会话仅展示来源中实际存在的框架、CANN Runtime、HCCL/通信算子事件；原始事件名和执行层级分别保存，不把 NCCL/CUDA 改名导入。时序邻近只作为上下文，ID 关联不自动等于执行依赖。没有逐事件时间的统计样本仍能展示 2.5D 指标，但不伪造时间条。

交换矩阵用于检查密集收发关系，可与 Rank 选择联动；计算图只在有 layer/算子映射时联动。所有视图共用对象 ID 与选择状态，不各造一份事件。

### 7.3 延续已确认设计规则

通信分类为一排单行胶囊，单选并保留“全部”。线宽 3px，虚线实段 12px、空段 8px；端点连接实际边界，错开重叠路径。token/专家提示用白色文字，不使用绿色胶囊。

TP/SP 用通信灰，缓存取数用激活绿，梯度同步用梯度青，MoE/EP 用正式橙色。语义颜色与性能编码分离：不使用类别色表示快慢，不改变现有色带含义；耗时/负载使用中性短条与数值，选择遵循已有填充规则。

“全部”保留多种通信类别的聚合查看；观测模式仍限制在当前 context/occurrence 范围，不能铺出整个运行的所有连线。每个可见指标保留单位，详细口径按需展开；未知不显示为零。

## 8. 接入架构与阶段

建议新增独立 `observation-model` 与来源 adapter，不把 profiler 字段写进现有 `deriveTrainingConfig()`。

```text
真实采集 / 公开 Trace ── backend adapter ─┐
                                        ├─ 统一观测契约 ─ 校验 / 能力判断 ─ 观测视图
确定性 Mock ── scenario generator ──────┘
当前推导模型 ── 显式对象映射 ─────────────┘
```

| 阶段 | 交付 | 完成条件 |
|---|---|---|
| P0 数据审计 | 候选下载清单、哈希、字段覆盖、一个可匹配 occurrence | 证明操作身份、成员完整性和时钟能力；否则记录降级 |
| P1 EP 调查模型与交互 | 同一 EP64 对象契约、负载/晚到/通信对照，空间/时间/详情联动 | 不绑定旧八 Rank 布局；每个判断有对应字段与证据 |
| P2 Ascend 样本接入 | 核验 Ascend 原始数据、实现 adapter、按能力绑定 2.5D 指标与事件 | 所有显示指标可回溯；NCCL 样本仅用于独立解析测试 |
| P3 昇腾与设备关系 | HCCL 导出适配、真实 Rank/Device 信息、可确认物理关系 | 不混淆 Die/NPU/Rank，不使用虚构 UB 路径 |
| P4 比较与扩展 | 同口径基线、反向交换与其他通信组 | 可解释差异，同时保存数据范围和配置变化 |

不预设 P2 的真实样本一定具备 TP/DP/EP 标签、完整时钟或设备拓扑。依据数据能力呈现，而非为了填满视图补造字段。

## 9. 验收清单

### 数据与推导

- session、group、occurrence、RankEvent 和原始事件引用可区分且唯一。
- group 成员与 capturedRanks 分开；缺失采集不能显示成零时长。
- occurrence 匹配经过类型、序号及适用规格核对，不凭同名配对。
- 时钟/单位/聚合范围可核查，不以不同机器原始时间戳直接相减。
- 真实与 Mock 使用不同 session；实测、配置、推导、未知保留字段来源。
- 没有点对点传输记录时，不将星形或全连接关系线冒充实际传输。
- EP64 成员覆盖、逐专家负载、阶段事件及 Mock 因果对照可复核；真实数据不继承 Mock 指标。

### 用户任务与交互

- 同一个 occurrence 可在 Rank、时间线、检查器之间追踪，切视图不丢选择。
- 一次点击能找到全部已知参与者及缺失者，不只显示一对示例 Rank。
- 负载倾斜、晚到、通信阶段变长各自引导有证据的下一步调查，不自动宣布真实根因。
- 退出观测模式恢复推导步骤与镜头，01–10 的原有行为保持。
- 原 Rank 图元不被平面芯片替换；按真实边界左右居中。
- 单行 Tab、全部单选、颜色、3px线宽、虚实长度、白色token文字符合既有约定。
- 用户可只看必要通信，不因默认全部模式产生无法追踪的线网。

### 验证证据

依次记录源码/schema校验、数据审计、数值检查、DOM交互、1440×1000浏览器视觉与操作、实际设备验证。每层独立标为通过/失败/未验证。离线构建、文件存在、DOM测试不能替代真实浏览器视觉检查。

## 10. 当前状态与下一步

已完成 EP 需求研究、DeepEP-Ascend 源码入口审计、确定性 EP64 Mock，以及公开 NCCL Trace 下载与本地关联审计。Mock 旧契约和 NCCL 提取格式均非新版通用 schema 的实现。

本次修订确立 2.5D 指标叠加为主、时间线为按需证据视图，并整理独立 schema。下一步核验 Ascend 原始 profiling 或通信统计样本：先检查实际字段与能力，再实现 adapter、指标绑定和图元联动。不因缺少完整 Trace 而拒绝有证据的聚合指标，也不把 GPU 数据放进 NPU 会话。

已实现旧 EP Mock 与独立 NCCL 提取格式适配、核心校验，以及第 10 步中的会话选择、64 Rank 逻辑总览、八 Rank 2.5D 切片、单指标叠加与来源检查（主体自动选取关键指标、对象详情保留其他指标，底部仅用通信类型筛选）。没有已核验的 Ascend 通信事件样本或实际灵衢路径。前九步通过 DOM 基线回归；本轮通过实际 Headless Chrome 1440×1000 的 POD/板下钻、设备选择与返回检查，并查看截图。用户当前浏览器标签与 8768 实时页面未验证。详见 [observation/IMPLEMENTATION.md](observation/IMPLEMENTATION.md)。

## 11. DeepEP-Ascend 源码入口审计（2026-11-23）

证据层级：在线读取 main 分支三个 Python 源文件，未固定 commit、未运行；后续采集必须固定版本。本次没有获得实际事件文件。

### 11.1 可以取得什么

- 测试入口 `tests/ep/test_ep.py` 构造路由、验证收发与专家计数，并分别测试 Dispatch/Combine。它生成 Combine 输入，没有真实专家 GEMM，因此不能作为完整训练层的证据。[S12]
- `deep_ep/utils/envs.py` 的 `init_dist` 将节点数乘本地进程数形成实际 world size；默认组用作 EP 组，HCCL 初始化并绑定本地 NPU Device。启动环境中的 WORLD_SIZE 在此表示节点数，导入器不能直接当成总 Rank 数。[S14]
- `deep_ep/utils/testing.py` 的 `KernelProfile` 是按 kernel 汇总的指标对象；解析器声明跨迭代平均。它可支撑阶段比较，不足以恢复每一次 occurrence 的跨 Rank 时间线。[S13]

### 11.2 可视化输入与缺口

| 产品对象 | 当前入口的证据 | 接入动作 |
|---|---|---|
| 完整通信组 | 默认 process group 与实际 rank/world size | 显式导出成员表、设备 ID、主机与版本；真实训练子组另行读取 |
| 路由和专家负载 | 测试中的 topk 与接收计数对象 | 导出逐样本快照；区分逻辑 token、专家展开量和 padding |
| 逐 Rank 逻辑交换矩阵 | 收发元数据可供分析 | 按来源/目的地聚合并校验守恒；不能标成物理链路字节 |
| 通信阶段对比 | kernel 汇总指标 | 导出结构化统计并保留计时定义、轮次与模式 |
| 一次操作的时间线 | 汇总值不能提供 | 保留原始 profiler 事件，添加 iteration/phase/pass 身份与关联 |
| 专家计算与关键路径 | 此测试没有真实 GEMM | 接入训练插桩，关联 layer/microbatch、GEMM 和后续消费者 |
| 灵衢物理路径 | 进程组不能提供 | 独立采集 Rank/Device/Die/NPU/节点映射及拓扑；实际路径仍需传输证据 |

### 11.3 采集改造要求

1. 在外部适配/采集脚本中保存 run、模式、重复轮次、Rank、通信阶段及原始证据引用；此次不改上游仓库。
2. 路由与收发计数在计时区外导出，避免 host 拷贝改变被测执行。统计快照需与对应轮次一致，不能把正确性测试的数值配给另一轮性能事件。
3. 保留原始 profiler 文件及单轮事件，汇总表只作为派生输出。异步调用返回、通信完成和 epilogue 完成分别记录。
4. 不拼接不同 profiling pass 成一次真实执行；不把本地耗时转换成跨节点统一起点。跨 Rank 时钟能力另验。
5. Benchmark 与训练数据使用同一观测契约、不同 scope；缺少 GEMM 的会话只允许通信调查。路由本身由测试构造，即便通信在真实设备执行，也要按字段记录来源。

**结论：已找到可扩展的采集入口，尚未找到可直接导入的完整 EP64 训练 Trace。** 当前最明确的工作是编写结构化导出适配规范，并核查 profiler 原始事件保留能力；没有硬件执行时不能宣称完成真实通信连接。

## 参考来源

- [S1：HTA ViT 多 Rank 文件目录](https://github.com/facebookresearch/HolisticTraceAnalysis/tree/main/tests/data/vision_transformer)。已下载并解析固定 commit 的八份文件，见 §12。
- [S2：PARAM 样本目录](https://github.com/facebookresearch/param/tree/main/et_replay/tests/inputs)。本轮核对到 ET/Kineto 文件与压缩包名。
- [S3：PARAM ET 采集与回放文档](https://github.com/facebookresearch/param/blob/main/docs/using_ET.md)。作为采集/回放流程参考。
- [S4：Chakra 官方仓库](https://github.com/mlcommons/chakra)。作为计算/通信/依赖表示与工具参考。
- [S5：Chakra Trace Library](https://github.com/mlcommons/chakra/wiki/Chakra-Trace-Library)。候选数据导航；未选定具体库内样本。
- [S6：Ascend msprof-analyze 集群分析说明](https://github.com/Ascend/msprof-analyze/blob/master/docs/en/user_guide/cluster_analyse_instruct.md)。输入完整性、结果文件与通信字段参考。不同芯片/采集模式的支持范围须核对；工具公开不代表数据公开。
- [S7：MindStudio Insight 通信界面](https://www.hiascend.com/doc_center/source/en/mindstudio/830/GUI_baseddevelopmenttool/MindStudioInsight/Insight_userguide_0052.html)。通信域、矩阵、传输大小、时长和链路类型参考。
- [S8：MindStudio 通信与时间线调优案例](https://www.hiascend.com/doc_center/source/zh/mindstudio/81RC1/practicalcases/GeneralPerformanceIssue/toolsample6_027.html)。从通信异常到时间线调查的任务路径参考。

- [S9：DeepSeek-V3 原始技术报告 §3.1–3.2](https://arxiv.org/html/2412.19437v2#S3)。实际训练规模、EP64 跨节点、无 TP 与计算通信重叠的依据。
- [S10：DeepEP-Ascend 官方仓库](https://github.com/deepseek-ai/DeepEP-Ascend)。昇腾 Dispatch/Combine 接口、EP8–EP128 基准与测试入口；须保留设备、工具链和计时范围条件，不能当作训练 Trace。
- [S11：Megatron Bridge 0.3.0 DeepSeek-V3 配方](https://docs.nvidia.com/nemo/megatron-bridge/0.3.0/models/llm/deepseek-v3.html)。另一框架实现的并行配置，不能替代原始训练配置。

- [S12：EP 测试源码](https://github.com/deepseek-ai/DeepEP-Ascend/blob/main/tests/ep/test_ep.py)。在线源码审计，未执行。
- [S13：Profiling 辅助源码](https://github.com/deepseek-ai/DeepEP-Ascend/blob/main/deep_ep/utils/testing.py)。汇总对象及解析器口径。
- [S14：分布式初始化源码](https://github.com/deepseek-ai/DeepEP-Ascend/blob/main/deep_ep/utils/envs.py)。节点与进程 Rank 映射。

## 12. 已完成的公开 Trace 内容审计

已实际下载并解析 HTA ViT 八份 Trace，固定 commit 和 SHA256；确认它们来自 world_size=64 的 NCCL 作业，而非完整八 Rank 作业。每份包含 5 条 AllReduce GPU kernel。已提取一条 Rank0 的 CPU→CUDA launch→GPU 关联事件，可用于独立的 GPU 本地事件详情与时间线验证，不能接到 Ascend Rank 上；跨 Rank occurrence、通信组成员、时钟比较尚未建立。不能将它解释为 EP 或灵衢采集。

结果、可重跑解析器、原始文件及授权文件位于 `review-output/distributed-training-evolution/trace-audit/`；详见该目录 README.md。本样本仅验证解析与交互机制；Ascend 观测接入仍需对应技术栈的数据。

## 13. 顶视重做：完整灵衢物理 Pattern

原 64 Rank 方格和橙色逻辑折线视图已移除。当前顶视复用来源 Pattern 的完整 POD、板、设备与互联函数，保留 CPU/NPU/DPU/NIC、L1/L2 平面及选中板关系。内置 Mock 增加显式 configured 落位及来源，真实导入不套用该规则。原 2.5D 与前九步保持；通信指标叠加在原设备对象旁，包路径仍无实测数据。实现与分层验证见 observation/IMPLEMENTATION.md。
