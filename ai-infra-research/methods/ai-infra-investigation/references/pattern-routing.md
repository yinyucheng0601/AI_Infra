# 全域 Pattern 路由与验收

这是当前库的选型索引，不是固定白名单。每次检索 catalog/assets.json 的 type=pattern，并按任务检查相关 Knowledge 与项目已有实现；目录变化后以真实入口为准。入口可能是跳转页或 Markdown 说明，须继续找到实际页面及脚本。先复用完整交互 Pattern，再接入图元。没有新的浏览器验收时，只记录源码检查，不声称页面视觉已复验。

| 表达目标 | 库中入口（相对 ai-infra-research） | 重点复用与验收 |
|---|---|---|
| 模型整体、单层与分支 | patterns/model-architecture-v4/、model-architecture-v41/ | L0/L1/L2 展开、层选择、残差、KV/权重状态、路径联动；检查源码/config 对应及重复层身份 |
| 模型层与训练状态 | patterns/pangu-layer-atlas.md、pangu-layer-atlas-2.md → 仓库根 layer_stack/ | 层叠/侧视、层内计算、激活/梯度/权重、Rank 内存联动；不要把已有示例动画当实测训练轨迹 |
| 训练内存、并行与部署 | patterns/npu-memory-atlas/variants/index_comm.html | 单 Rank/全 Rank、TP/PP/DP/EP 组、分片归属、Token 分发/回收、逻辑与物理布局；检查 world size、各组成员、内存口径与配置变化 |
| 服务器、机柜和硬件层级 | patterns/atlas-950-explorer.md、atlas-950-anatomy.md → 仓库根对应目录 | 部件选择、抽出/内部视图、跨尺度聚焦、轴测/方向切换；芯片、设备、服务器、机柜身份分开，几何不充当硬件规格证据 |
| 算子计算链 | patterns/paged-attention-graph/ | 分阶段展开、张量/OP/存储、跨核同步及选择联动；保留对象与数据依赖语义 |
| 多核与请求运行 | patterns/csa-swimlane/、critical-path-swimlane/ | Rank/AIC/AIV 泳道、Prefill/Decode、Host/Device、时间导航、依赖与原始事件；检查时钟/单位/事件归属，静态关系不能当实测时长 |
| 编译与内存诊断 | patterns/csa-pass-field/、memory-inspector/、pass-error-cases/ | Pass 差分、控制作用域、内存绑定/生命周期、候选与方案；检查前后对象身份和方案应用来源 |
| 算子映射调查 | patterns/reduction-memory-inspector/、expand-broadcast-inspector/、unpack-layout-inspector/、unpack-case3-inspector/、scale-broadcast-inspector/ | 索引、地址、广播/拆分、Task/Core、源码与交接；检查配置、边界及独立 CPU 参考 |
| 调优实验与取舍 | patterns/rsfa-performance-comparison/ | 配置×实现、收益/退化、波动与原始样本；检查基线、比值、硬件/计时口径，不能从耗时编造瓶颈 |
| 基础对象和组合语法 | reports/llm-compute/diagram-legend-library/ | Tensor/OP、调度、部署和关系的 variant 与 renderer；它是资产来源之一，不替代以上完整 Pattern |

按任务选择模型/源码、配置校验、CPU 参考、测量分析或设备实验。统一验收来源、对象身份、关系、交互和设计；不强制每个场景都具有 shape、逐元素地址、告警或继续调查。调优闭环区分观测→候选→方案→授权修改→重测，缺少环境时交付可验证方案，不宣布已优化。

组合 Pattern 时共享稳定对象 ID 和选择上下文；例如模型层→Rank 分片→服务器→运行事件，必须有真实映射依据。跨尺度或跨视图关系不存在时不要只为展示而连线。统一设计语言不等于统一成一种图或一个算子工作台。
## 可调用资产

分开绑定三类对象。领域呈现契约提供对象、关系、证据和操作场景；业务 Pattern 承载轴、图元、视图和双向联动；定稿工作台提供 Toolbar、Icon Buttons、Info、Inspector、导航、缩放与 Liquid UI。复用图元只覆盖业务 Pattern 的一部分。

同类迁移沿用可调用 Pattern 接口，或读取定稿 HTML 的构建入口。每个必选项在调用约束中记录「目标行为或呈现 → Pattern / 工作台组件 → 源文件与挂载点 → 数据适配与验收动作」。例如固定源码核查应绑定当前步骤与源码锚点，并复用参考 Inspector 的结构、打开与返回行为。保留现有接口；没有独立 renderer 的工作台同样可复用实际 HTML、SVG、CSS 和 JS。

在有 AI Infra 资产 checkout 时，从 catalog 的内容入口进入对应 Pattern。若随资产提供接口，先读取该资产的 README 与声明，核实实际数据和支持能力。首例位于 `patterns/critical-path-swimlane/`，其 `pattern.json` 的 `workbench` 项和 README 定义声明、输入、两个 renderer 及校验方法。交付读取呈现契约和用户调用约束，先校验必选项，再挂载并记录可选项的省略。资产不可用时记录缺口与恢复条件；单独安装 Skill 时按任务提供资产 checkout 或目录允许的资产包。

## 工程包路由候选

工程工具中的 `adapters.catalog_adapter.route_semantic_object(object_type, task_type)` 保留 1.3.0 的候选映射供已有消费者使用。返回候选时，根据任务和调用约束进入 catalog 检查实际入口、支持能力与数据，再由 ai-infra-glyphs 核对正式 item、variant、SVG 或 renderer 及来源。候选 ID 未在目录确认时保持待确认。没有精确图元时使用带语义名称的中性占位，并记录未解析映射。未知对象返回 unresolved。
