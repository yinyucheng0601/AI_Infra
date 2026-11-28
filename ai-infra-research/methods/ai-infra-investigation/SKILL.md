---
name: ai-infra-investigation
description: 用于 AI Infra 领域分析、机制讲解、结构浏览、实验比较和交互调查，按任务直接回答或生成、改进可视化。覆盖模型架构、训练、推理、算子开发、编译、Rank 与服务器部署、通信存储及性能调优。开发者提供问题、代码或已有产物即可触发，按需复用领域分析、完整 Pattern、正式图元和空间界面。
---

# AI Infra 可视化工作流

## 发起任务

输入可为问题、代码或已有产物；按需带配置、Trace 和界面约束。先读项目材料，只补阻塞信息。见[首次任务](references/first-task.md)。

## 1. 识别任务与交付目标

确定问题、对象、交付物与完成标准。界面任务区分从零生成、同类迁移和局部修改。迁移时按 [工程工具](references/engineering-tools.md#design-system-资产登记)从 catalog ID 核对定稿入口、依赖和实际构建源，将参考工作台列为必选；局部修改验收受影响项。资产示例仅用于核对接口。

记录调用约束：布局、Pattern、组件、轴及操作能力分别标为必选、偏好或由 Skill 决定。按 [Pattern 路由](references/pattern-routing.md) 核对数据前提，传给实现与验收。

## 2. 建立领域模型与证据

按下方领域路由及[任务契约](references/task-contract.md)产出对象、关系、来源、版本、条件和缺口。

对固定 Unpack、DeepSeek、PyPTO Trace 或交换证据图，按[工程工具](references/engineering-tools.md)确认版本、输入与依赖，再运行适用的适配或校验。先处理非法图和来源不符，再把确认关系、合法未知和原始定位传给后续阶段。

证据不足时按缺口找 CANNBot Skills 等工具，核对输入、框架、硬件与适用范围。可用结果回绑对象及来源；不可用时说明缺口并继续已确认部分。

**选择交付路径。**

- **直接回答。** 结论与来源足以推进任务时，在本阶段交付回答、可追溯来源、适用范围及未知项。核对回答是否回应问题且受证据支持。
- **结构呈现／对照，或交互调查。** 需要界面表达、定位或核查时，进入呈现契约。对照先确认共同基准和口径。
- **阶段性交付。** 必要证据无法获取，或实现阶段确认必选能力无法满足时，交付已确认的结果、具体缺口或未兑现项、原因及恢复条件。取得新证据后回领域分析；补齐能力后重新核对调用约束与实现可行性。

## 3. 定义呈现契约

由 observability-design-style 按[呈现语义契约](references/presentation-semantics.md)定义组件无关的定位与核查。交互调查补发起上下文和结果更新。核对调用前提，例如步骤播放需离散步骤，设备时间播放需带单位的 Trace。

## 4. 选择并实现界面

由 design-spatial-systems-ui 使用呈现契约和调用约束。按[页面交付约定](references/ui-delivery.md)固定工作台组件；按 [Pattern 路由](references/pattern-routing.md)校验并挂载完整资产，再绑定正式图元和领域数据。先走代表操作，记录偏好调整和未启用能力。必选能力无法满足时走阶段性交付。

## 5. 按任务验收

逐项核对实际布局、Pattern、组件与轴模式是否兑现必选约束，记录偏好调整，并验证代表任务。按 [联合操作路径](references/journey-review.md) 记录通过、失败与未验证项。

| 交付 | 最小验收 |
|---|---|
| 直接回答 | 问题有答复，来源可追溯，适用范围明确。在领域分析阶段完成。 |
| 结构呈现／对照 | 能定位关键对象并核查依据；对照核对共同基准、单位和口径。 |
| 交互调查 | 走通定位、核查、继续调查与结果返回。对象 ID 贯穿路径；反馈和结果更新符合契约；关闭或返回后按约定恢复选择和视角。使用候选时按 [候选复核](references/candidate-review.md) 验证。 |

证据缺口显示具体原因及下一步；必要证据未补齐时阶段性交付。按根因返回证据、呈现或实现阶段。分别记录脚本、真实渲染、设备与 Runtime 状态。Runtime 交接见[候选复核](references/candidate-review.md#runtime-接入说明)。

## 领域路由

| 任务 | 优先组织的对象与关系 | 分析与表达入口 |
|---|---|---|
| 模型架构与计算机制 | 模型→层→模块→OP，张量、权重、状态与复用 | llm-compute-diagrams；模型源码/config 提取器；模型架构与 Layer Atlas Pattern |
| 训练 | 前向/反向、梯度、优化器状态、重计算、并行组、分片与内存 | llm-compute-diagrams；训练 Layer/Rank/内存与通信 Pattern |
| 推理与 Serving | 请求、Prefill/Decode、调度批次、KV cache、Host/Device | inference / traceview 参考；请求泳道、模型图与状态视图 |
| Rank、服务器、集群部署 | 逻辑并行组→Rank→设备→节点/服务器→机柜，通信与存储归属 | parallelism 参考；Rank Atlas、物理布局、硬件 Explorer/Anatomy |
| 算子开发 | 索引、布局、tiling、buffer、Task/Core 与同步 | operator-mapping-investigation；已有算子调查 Pattern；所需 API/审计工具 |
| 编译与 IR / Pass | 前后快照、对象身份、变换、控制作用域、内存绑定 | compiler-objects 参考；Pass Field、Memory Inspector、诊断 Pattern |
| 性能调优 | 目标指标、配置、实现版本、测量样本、退化、瓶颈候选与方案验证 | profiling/实验分析器；RSFA 比较、请求/多核泳道及相关领域 Pattern |

优先使用项目已有解析器。遇到不支持的 IR、Trace 或 API，收敛到可验证范围。按需从同组安装目录或 checkout 读取领域 Skill；总入口独立包提供工作流和工程工具。
