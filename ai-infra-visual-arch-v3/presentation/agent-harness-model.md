# 两页架构图的语义约束

## Page 01：职责域而非抽象层级

- Engineer Intent：委托目标、范围、预算、完成依据。
- Agent Orchestration：计划与任务推进；Harness 在其内部反复组织上下文、模型调用、工具执行与反馈。LLM 是调用能力，不是与应用 Agent 并列的架构层。
- AI Infra Instrumentation：提供静态资料、运行记录、采集条件及来源版本，不直接产出诊断结论。
- Semantic & Evidence Model：提供对象身份与关系。Compute Object 是可定位实体；Execution 是一次有上下文的执行；Observation 是记录事实；Evidence 是可追溯引用；Finding 是带类型、适用范围与验证状态的判断。
- Pattern-Driven Workspace：查询语义模型形成视图。Operator / Training / Inference 共享对象导航、跨层追踪、检查器和证据交互，领域对象与 Pattern 可以不同。

关系白名单：Intent 委托 Orchestration；Orchestration 写入任务与工具执行记录；Instrumentation 向模型提供原始记录；模型向编排提供证据供重规划；模型向 Workspace 提供查询投影。模型内部：Execution 作用于 Object、产生 Observation；Observation 定位 Object；Evidence 引用 Observation 或原始产物；Finding 引用 Evidence。容器只表达归属。

共享基础通过适用模块文字表达，不添加无意义的全连接箭头。Semantic Contract 约束采集身份、编排记录、模型关系与视图绑定。Interaction Contract 约束工作空间交互。Pattern Registry 向工作空间提供视图，并声明依赖的语义字段与交互契约。

## Page 02：RMSNorm 诊断方案

Goal 分解 Task；Task 启动 Tool Execution；工具采集原始材料供 Evidence 引用；Hypothesis 引用证据并交给 Validation 检验；经过核验才能归纳 Finding。Finding 同样引用 Evidence，同一证据可支持或反驳多个解释。验证不足时回到 Task，允许重采集与重试；图没有声称当前已完成任何步骤。

Source→IR 表达降低；IR→Tile 表达调度与分块；Tile→Memory 表达地址映射；Memory→Device 表达运行位置绑定，必须依赖实际执行元数据，而不是静态编译转换。静态链接和运行定位在图中分别使用实线和虚线，并以关系文字限定含义。

统一工作空间：Task Progress、Compute Graph、Execution Timeline、Evidence Inspector。选择对象同步改变对象高亮、原位检查说明、时间线过滤上下文与证据检查器。联动键为 object_id、execution_id、build_id；现阶段尚无执行输入，不生成假时间条。

本机文本文件入口仅把用户选择的原始内容保存到当前对象的页面内存，并允许原位滚动检查；不会自动推导真实性、运行绑定、性能结论或验证结果。刷新不持久化。

人机职责使用独立配色：淡黄色表示人的意图与判断入口，淡紫色表示 Agent 的编排与自主执行，中性灰表示系统、模型和数据。选中对象继续使用黄绿色高亮。Task Status、Finding Type、Validation Status 使用独立字段与文字，避免借用人机职责色来暗示状态。目前分别为待执行、未归类、未执行。

精简：计算对象映射仅在统一工作空间的 Compute Graph 出现一次；删除独立映射带、重复的选中对象标签、重复的操作说明和大段底部注释。保留对象原位详情、时间线、证据检查与必要的关系图例。

## 人的持续介入

人的职责包含初始委托和运行中的介入。Intent 负责目标、约束与完成依据；Workspace 支持核查、补充材料与调整，并通过指向 Agent Orchestration 的介入关系表达修改约束、暂停或接管。该关系表示控制输入，不是证据流，也不意味着必须逐步审批。
