# 来源、内容覆盖与验证边界

日期：2026-10-20。交付形态：llm-compute-diagrams 分步交互图解。

## 内容分类

- source：用户附件中的 12 类观测对象、5 种视图、六项认识修正、优先级、Buffer 案例和对象来源映射限制。
- official：以下核对的官方文档与源码。保持中英双语术语和直接链接，不将在线分支等同于用户构建版本。
- synthesis：六环节 Pipeline、Pass invocation 记录契约、对象与环节的关联、框架适配模型。

## 图解结构与覆盖

| 图解章节 | 内容覆盖 | 有序子状态 |
|---|---|---|
| 00 封面 | 总体主题与关系预览 | 1 |
| 01 对象关系 | Pass / Object / Diagnostic / Evidence；程序实体、存储绑定、调用与来源关系 | 1 |
| 02 通用流程 | 全幅六环节主流程；删除融合/验证的全程职责区及提示性页脚，画布只保留六环节与产物 | 1 |
| 03 环节展开 | 同一 BF16 MatMul 的语义契约、Tensor→Tile 显式装载/写回、K 分块动画、Left/Right/Acc 字节数、流水累加及 PTO 操作映射 | 6 |
| 04 切片规范化 | CanonicalizeTileSlice 的零偏移、行偏移和符号索引单测；逐状态显示原始及改写后索引 | 3 |
| 05 12 类对象 | 十二组关系图元；分块与布局可进入大图，展开真实 K 分块 case 和按代码规则推导的 ND→NZ 窗口 | 12 |
| 06 对象追溯 | 复用前、复用后、语义别名、一对多及多对一、来源未知；复用绑定与值使用区间分开 | 4 |
| 07 五种视图 | 编译演化、空间映射、执行流水、依赖关系、诊断证据与英文名称逐项对照；静态与实测证据分开 | 5 |
| 08 框架适配 | 四框架同屏对照；四个问题维度为表示边界、分块与布局、调度与同步、证据采集 | 4 |
| 09 完整总览 | 六环节及产物扩大为完整主线；代表性调用、BF16 值、MemRef、Left 数据量与五种视图衔接；删除实施顺序与优先级 tab | 1 |
| 10 官方来源 | 官方事实、本文归纳、案例假设、版本及复现边界 | 1 |

共 11 章节、39 个有序阅读状态。底部仅一套阅读导航，上一步/下一步与方向键均先遍历本页状态再跨页，左右互为逆序，首尾不循环。图内选择直接定位环节、调用、对象、视图或框架，不另设重复的工具栏状态按钮。K 动画的 8 个迭代状态不计作新的章节阅读状态。

## 图元与交互来源

- 页面框架：reports/llm-compute/pypto-compilation-guide/index.html；当前报告使用深色主画布及底部导航。右侧解释面板默认关闭，选择图元或点击“解释与来源”后展开，可由关闭按钮、收起按钮或 Esc 关闭。
- compiler-primitives.js 内联复用数据网格、OP 胶囊、Pass 与正交关系线；历史 Task / MemRef 样式不作为当前基线。
- Task、Instruction、MemRef、Memory Space 直接内嵌已确认 approved-glyphs 资产，保留形状、颜色及比例。
- Kernel 为低对比容器；Task 与目标操作使用亮绿矩形并以图标区别；逻辑值采用绿色网格。
- 图例、阅读操作及案例边界集中在 info；具体官方事实放入按需面板及 08 页直接来源链接。图元保持颜色与比例，观测分面以既有实体的关系组合表达。

## PyPTO3 源码与 case 核对

- 本地仓库：`/Users/yin/PyPTO3-main`，代码位于 `repo/pto`。HEAD：`87b129aaf31a1c3748d4dd8a485c74f3465ed692`。本轮读取的文件没有报告未提交修改。
- R01–R10 为本地仓库证据，S01–S10 为官方文档和源码。R 链接按已核对的 origin、提交及路径构造，远端访问仍取决于仓库权限与该提交的远端可用性。
- [repository-evidence.json](repository-evidence.json) 保存相对路径、行号、原文摘录和完整文件 SHA-256，可在本地追溯，不依赖远端链接可达。
- R01 / R03：`test_skinny_gemm_pipelined` 与 `AutoTileMatmulL0` 实现。Ascend950 的 BF16 `A[16,2048] @ B[2048,64]`，选择 `(m,n,k)=(16,64,256)`，8 次 K 迭代；读取 Left `[16,256]` 和 Right `[256,64]`，FP32 Acc `[16,64]`。首次 `tile.matmul`，之后 `tile.matmul_acc`；IR 属性 stage=2。这些是单测 Expected 及代码机制，本轮未重新运行编译器或 NPU。
- R02 / R07：默认 TileView 与物理 box 计算。Mat/Left 默认 `col_major / row_major`，普通 Right 默认 `row_major / col_major`。默认 fractal=512 B，BF16 的 box 为 `16×16`；Acc 的默认 fractal=1024 B，不能无条件沿用 operand 的字节口径。
- NZ 大图使用从上述规则推导的 BF16 `[32,32]` 窗口，NZ 块序为 `[N1,M1,M0,N0]`。元素 `(17,2)` 的 ND 平坦元素索引为 546，NZ 元素索引为 274。这里是元素索引，乘以 2 才是 BF16 字节偏移。
- R05：零偏移 case、row offset=16 case，以及 symbolic extract index `ko` 加 constant col offset=256 case。第三状态准确显示 `[0,ko] → [0,ko+256]`，不把常量 slice 偏移写成动态偏移。
- R06：读取默认 pipeline 构造代码，保留实际注册的顺序；09 只列代表性调用，省略了它们之间其他 Pass。
- R08：INT64 标量索引 `i+0→i`，来源为 `test_add_zero`；并非任意浮点 Tensor 的无条件代数改写。
- R09：`tile.matmul→pto.tmatmul`、`tile.matmul_acc→pto.tmatmul.acc`。PTO 操作身份与最终机器指令分开。
- R10：`convert_tensor_to_tile_ops_pass.cpp` 的 `BridgeInputSpaces` 在 Tensor 参数与目标存储空间之间生成 `tile.load`；返回值转换处生成 `tile.store`。03 的 Tensor→Tile 对照据这些规则展开相同 MatMul，逻辑 shape 保持不变，操作集合、TileType 与存储关系具体化。
- 03 的六环节统一采用 `A:BF16[16,2048]`、`B:BF16[2048,64]`、`C:FP32[16,64]`。语义页固定契约，不再借用独立的 INT64 简化案例。输入契约及前端降级是根据签名和 Pass 规则的展开，K-loop 来自单测 Expected；未将它们冒充同一运行的已采集快照。
- K 动画的 A 网格为 32 列×4 行采样，按连续 4 列组成一个高亮组；B 网格为 4 列×16 行采样，按连续 2 行组成一组。组轮廓与格间边界对齐。每组分别映射 `A[:,ko:ko+256]` 和 `B[ko:ko+256,:]`，不是单个标量格。数据块大小沿用 square-grid 图元，抽样格数不声称真实元素数。
- 动画按提取、计算、累加呈现每次 K 迭代，2.1 秒一轮为阅读节奏，没有设备时间比例。播放、暂停、下一块和重置属于动画传输控制；导航会暂停动画并保留选中的 ko，存储页据此显示同一操作数。
- R04 补充 DDR direct-store / Mat-scratch 和 full-K / split-K 的独立维度，详见原始 kernel 文件；不以一个 case 推断所有分块策略。
- 08 的横向对照按同一观测问题组织，未公开的下游内部 Pass 不补造名单。TileLang 指令选择保留 target/platform 条件，Triton 对照限定 NVIDIA 后端，cuTile 保留公开产物与内部轨迹的可见边界。

## 官方来源台账


### S01 MLIR · Pass Infrastructure

- URL: https://mlir.llvm.org/docs/PassManagement/
- 支持：Pass 管理、动态 pipeline、分析缓存与插桩。分析事件须独立建模。
- 状态：2026-10-20 在线核对。可变分支 / 文档，未将其固定为用户构建版本。

### S02 PyPTO · Pass / PassPipeline / PassManager

- URL: https://www.pypto.ai/pypto/zh/dev/passes/00-pass_manager/
- 支持：有序 Pass、前后回调、required / produced / invalidated 性质与实际校验。
- 状态：2026-10-20 在线核对。可变分支 / 文档，未将其固定为用户构建版本。

### S03 PyPTO · Memory Map

- URL: https://www.pypto.ai/pypto/user/tools/02-memory-map/
- 支持：静态地址与生命周期；PTOAS 规划模式下 dump 缺少已分配偏移。
- 状态：2026-10-20 在线核对。可变分支 / 文档，未将其固定为用户构建版本。

### S04 Triton · NVIDIA backend / compiler.py

- URL: https://github.com/triton-lang/triton/blob/main/third_party/nvidia/backend/compiler.py
- 支持：make_ttir、make_ttgir、make_llir 与目标相关分支；TTGIR 内重复布局清理。
- 状态：2026-10-20 在线核对。可变分支 / 文档，未将其固定为用户构建版本。

### S05 TileLang-Ascend · engine/phase.py

- URL: https://github.com/tile-ai/tilelang-ascend/blob/ascendc_pto/tilelang/engine/phase.py
- 支持：LowerAndLegalize / OptimizeForTarget：布局、流水、内存规划、同步与指令选择。
- 状态：2026-10-20 在线核对。可变分支 / 文档，未将其固定为用户构建版本。

### S06 NVIDIA · cuTile Python Compilation and Export

- URL: https://docs.nvidia.com/cuda/cutile-python/compilation.html
- 支持：JIT 特化与 AOT 导出；Tile IR bytecode 与 cubin 产物边界。
- 状态：2026-10-20 在线核对。可变分支 / 文档，未将其固定为用户构建版本。

### S07 NVIDIA · Tile IR Programming Model

- URL: https://docs.nvidia.com/cuda/tile-ir/latest/sections/prog_model.html
- 支持：逻辑 tile thread 的硬件线程映射由编译器处理。
- 状态：2026-10-20 在线核对。可变分支 / 文档，未将其固定为用户构建版本。

### S08 NVIDIA · Tile IR Optimization Guide

- URL: https://docs.nvidia.com/cuda/tile-ir/latest/sections/optimization_guide.html
- 支持：Tile IR 优化、目标 lowering、提示与 remarks 的职责边界。
- 状态：2026-10-20 在线核对。可变分支 / 文档，未将其固定为用户构建版本。

### S09 TileLang-Ascend · 官方仓库说明

- URL: https://github.com/tile-ai/tilelang-ascend/tree/ascendc_pto
- 支持：Ascend C / PTO 与 AscendNPU IR 路线应分别记录。
- 状态：2026-10-20 在线核对。可变分支 / 文档，未将其固定为用户构建版本。

### S10 PTOAS · 官方只读镜像

- URL: https://github.com/hw-native-sys/PTOAS
- 支持：仓库说明其为 GitCode cann/pto-as 的只读镜像；内部 pipeline 仍需独立采集。
- 状态：2026-10-20 在线核对。可变分支 / 文档，未将其固定为用户构建版本。

## 缺失及处理

- 原始分析保存在 source-analysis.txt，未经改写。
- 已读取远端 PyPTO3 main@5547283136bca92467a9b02dd0a02697e39fc4d4 的 Competitive_Analysis/四框架Pass对比_PyPTO_TileLang_Triton_cuTile_20261019.md；作为对照分析，具体机制仍以源码和官方定义为准。
- 用户材料的 GitHub +1 / +2 无完整链接，未当作引用；通过官方来源补充可核实机制。
- 未提供编译快照、硬件 trace 或性能实验。图中调用及槽位为具体案例关系，不代表真实运行。
- 未验证 PTOAS 内部完整 pipeline；Passes.td 声明顺序仅支持注册信息。
- 内存复用案例收紧：复用可以改变存储绑定，不要求逻辑值的使用区间改变。
- 跨 Pass 来源不完全确定时保留未知，避免根据 SSA 名称制造完整追溯。

## 验证

见 validation.json；检查脚本语法、离线文件一致性、39 状态正反向连续阅读、渲染文字边界与相交、图内选择和释义、解释面板开关、info、缩放与适应、桌面与窄屏布局。浏览器检查不代替编译器运行或硬件验证。

## 形状编码与 NZ 地址展开修订

- 05 的十二项统一展开到完整图解，入口均标注展开图解，详情统一提供返回全部对象入口。
- K 提取采用稀疏采样格：A为2×32、B为32×4、C为2×8；相同方格尺寸保持横向或纵向的形状特征，真实shape通过文字标注，不用格数承诺真实元素数。
- NZ 使用两个32列地址展开面板，每格一个BF16元素。ND面板按地址m×32+n排布，NZ按[N1,M1,M0,N0]计算地址。逻辑四块使用稳定的四级绿色明度，在右侧可见变为连续256元素区间，白框追踪(17,2)的546→274元素索引变化。

## 2026-10-20 对照修订

- 六环节为抽象决策流程；职责分类与实际调用顺序分别表达。同类职责可重复，注册数、源码调用点和一次运行的调用数不混计。
- PyPTO 任务依赖与流水变换、PTOAS 下游硬件同步及指令调度分开，不将全部正确性职责归给 PTOAS。
- MaterializeSemanticAliases 为语义要求，MemoryReuse 为独立值的可选存储复用；PTOAS 规划时前者仍运行。依据 R06。
- cuTile 的公开 CUDA Tile IR Pass 与下游优化轨迹分开。官方定义：https://github.com/NVIDIA/cuda-tile/blob/main/include/cuda_tile/Dialect/CudaTile/Transforms/Passes.td 。FuseFMA 改变舍入行为，不能假设所有规范化均保持数值位模式。
- 编译期不变量、roundtrip 与运行期数值、内存及并发检测分别采集；并不推断 Triton 缺少编译期验证。
- 不继承对照分析中硬件映射只影响性能、III/IV 永远不可共享、TableGen 顺序等于执行顺序等过强判断。

## 画布尺寸规范

默认视图中 1 SVG 单位最多对应 1 CSS 像素；标准画布上限980×650，宽流程画布上限1260×650。容器不足时等比缩小，放大按钮仍可主动缩放。内容数量不改变默认字号或图元尺寸。

画布正文16、辅助14、说明15、图内标题22；流程标题18、编号26。对象详情复用1倍图元，移除原1.8倍放大；总览Pass移除1.2倍放大。微缩预览仍保留缩略比例。
