# 编译与执行图元扩展

2026-10-10 用户确认，来源：PyPTO compilation guide。适用于编译器、Kernel 与任务图解；不是行业统一符号，也不强制覆盖普通模型模块的旧样式。

## 复用入口

[compiler-primitives.js](../assets/compiler-primitives.js) 提供独立 SVG 字符串生成器 `CompilerPrimitives`，无需依赖原报告。生成单文件报告时内联资产，不保留外部脚本依赖。先注入 `css` 与 `defs`，再调用图元方法；页面负责点击和键盘事件，以 `data-key` 查 `glossary`。

```js
const P = CompilerPrimitives;
const body = P.kernel(20,20,280,160,'projection','AIC')
  + P.op(55,90,'tile.matmul','op',210)
  + P.task(360,60,'T0 → projection',210)
  + P.line(360,92,300,92,'call','调用');
// 将 <style>P.css</style>、P.defs、body 注入同一个 SVG。
```

同页多个 SVG 须给 defs 内 marker id 与 marker-end 引用一起加唯一前缀，避免重复 id。资产中的图元为默认尺寸，组合后检查标签与边界；不要把原报告坐标当作通用布局。

## 图元契约

| 对象 | 形状与颜色 | 语义 |
| --- | --- | --- |
| Tensor / Tile | 小圆角矩形、低亮度方格、文字叠加到 grid 内 | 沿用数据角色色，Tile 可标 shape 与 memory space |
| IR OP | 胶囊、主色 `#685CF0`、函数小标记、白字 | IR 中的操作；优先标 `tensor.matmul` / `tile.matmul` 等层级明确的名称 |
| Loop | 紫色左括线、其余虚线范围、同紫色标签 | 包含重复执行的语句；迭代次数不是设备数量 |
| Kernel | 紫色函数容器、名称栏、执行目标标签 | 设备执行入口；内部可含 OP 与循环 |
| Task | 紫色系圆角卡片、TASK、任务身份 | 一次 Kernel 调度；展示目标、参数与依赖 |
| 设备指令 | 紫色系紧凑直角窄条 | Kernel 内部执行动作；类别示意必须与真实 ISA/Trace 区分 |
| MemRef | 暖沙色槽形、两侧内竖线 | 存储引用；不是物理缓冲硬件 |
| IR | 中性灰范围与局部数据流节点 | 程序表示；局部 DAG 不能代表全部 IR |
| Pass | 中性灰窄矩形、准确 Pass 名 | 分析或改写 IR 的步骤；不是 IR，也不是运行时任务 |

计算相关对象共享 `#685CF0`，依靠形状和文字区分层级。Task 不能恢复成蓝色。输入绿、权重蓝紫、聚合黄、梯度青保留数据语义。IR 的外部结构与 Pass 中性化，IR 内的 OP 可继续用紫色。通用 Callable 是报告统称，PyPTO 使用 Function；不要发明新的 IR 类型。

## 关系与组合

- 数据依赖：浅灰白实线、双折角箭头，不用绿色实心三角；保留正交折线。
- 调用：灰色长虚线、开口箭头，Task 直接指向 Kernel 边界，并标“调用”。
- 任务依赖：灰色实线开口箭头，明确谁先完成；存储绑定用圆端点。
- 跨阶段教学对应：灰色点线、空心菱形；这不是数据依赖或运行耗时。
- Loop / Kernel 的包含关系用边界表达。Task 不画成 Kernel 内的一条指令。
- 图例使用等宽 divider 网格；已有 Tile / OP 只作为新增结构的内部例子，不重复列为新增图元。
- IR 与 Pass 的关系用输入 IR → 若干具名 Pass → 输出 IR；若省略步骤要标明“部分 Pass”，不能把列表称为完整流水线。
- 完整图分开运行关系与编译过程：Task 调用 Kernel；Kernel 的 IR 编译形成设备代码；底部展示 Pass 处理 IR。避免用一条轴混合定义、调度和编译阶段。

## 指令与泳道层级

Task 是一次 kernel dispatch；OP 是编译 IR 操作；设备指令由编译结果决定，三者不一一对应。Task 时间线展示任务执行，Kernel 内部指令时间线展示更细粒度执行事件。泳道只是布局，必须标注观察粒度。没有真实指令证据时仅使用“搬运 / 计算 / 同步”等类别示意，不伪造 ISA 名称、顺序或耗时；无时间数据时窄条等宽。

## 官方依据（核对于 2026-10-10）

- [Task 定义与依赖](https://www.pypto.ai/pypto/user/tasks/00-model/)
- [TaskId 与调度](https://www.pypto.ai/pypto/user/tasks/02-submit/)
- [PTO Codegen](https://www.pypto.ai/pypto/dev/codegen/00-pto_codegen/)
- [MatMul 分块变换](https://www.pypto.ai/pypto/dev/passes/18-auto_tile_matmul_l0/)
- [Kernel 内部指令分析](https://www.pypto.ai/pypto-lib/debug-and-tune/incore-simulator-profiling/)

官网事实与图形约定分开：以上外观是本系列约定。具体编译步骤、目标和真实指令随版本及配置核对。

## 编译与内存概念的区分

- **生命周期干涉与地址冲突**：生命周期干涉是内存复用分析的约束。在不同值需要同时保留时，它们不能覆盖同一字节；这不表示编译结果已经存在非法地址重叠。实际地址冲突还需结合地址范围、别名、控制流和操作语义判断。解释示例干涉图时说明节点、边及构造依据，不宣称实现必然生成这种图。
- **Tile 值、MemRef、base 与缓冲区**：分别说明计算值、内存引用、底层分配身份与存储范围。不要将 MemRef 与 base 当作同义词；多个 MemRef 可引用同一 base 并具有不同偏移。图中的缓冲区不是新增 IR 类型或物理硬件模块。
- **生命周期与运行时间**：静态定义／使用位置或源码行号不等于设备执行时间。循环、分支、视图别名与流水 stage 可能影响复用判定；不能仅从图中的语句先后推断执行不重叠。
- **候选复用与安全共享**：生命周期不重叠只是候选条件，还需核对空间、分配大小、操作 no-alias、目标后端与并发约束。shape / dtype / layout 是否构成门槛应查当前实现，不凭直觉增加“类型相同才可复用”的规则。
- **分配大小、逻辑数据量与地址高水位**：共享、对齐、保留区和视图可能使这些量不同。高水位按同一内存空间的已占用区间末端计算；内存占用下降不直接证明执行加速。
