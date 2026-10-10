# NPU Memory Atlas

训练内存轴测交互的基准 Pattern 与衍生方案。基准来自 `npu-memory-atlas-training-v10.html`，于 2026-09-30 整理；页面内容原样保留。

## 文件组织

- [index.html](index.html)：基准页面，后续方案以此为起点。
- [npu-memory-atlas-embed.js](npu-memory-atlas-embed.js)：基准和现有衍生版的嵌入通信适配脚本。
- [variants/](variants/)：衍生方案，每种方案单独命名，避免覆盖基准。
- [variants/liquid-glass.html](variants/liquid-glass.html)：整理前已有的 Liquid Glass 方案，保留其原有实现。
- [历史评审记录](../reviews/npu-memory-atlas-training-v10-2026-09-28/README.md)：历史快照与评审范围，原位置保留。

## 通信 demo 的展平工作台

入口为 `variants/index_comm.html`。右上角 240px 图形轮盘的中心切换 3D / 2D，四周分别选择立体、顶视、正视、侧视；2D 中改为 PP Stage / Layer 粒度。所有图标提供悬停与键盘焦点提示。

原配置按钮是唯一参数入口，支持模型层数、Dense/MoE、专家、TP/PP/DP/EP/CP、EP 口径、批量、序列长度、梯度累积和卡容量。非法配置不提交；容量不足可选择联动方案或显式应用以观察超容量。EP 口径转换保留物理卡数。默认保持通信 demo 原有的 48 层全 MoE / 0 shared 配置；将 Dense=2、Shared=1 可探索 rank-intro 的混合层结构。

`rank-model.js` 是空间、展平、算子与显存账的共同模型。GB 使用十进制；激活、工作区与时序均为教学估算，不能视为真实性能测量。`rank-workbench.js` 负责页面适配、矩阵、计算图与选择联动；`rank-workbench.css` 复用宿主主题与控件。能力参考 rank-intro 第 10 步，未复制源页壳、配置侧栏或五段自动演示，来源仓库未修改。

底部计算图入口支持整网/Layer、算子和专家查询；Q/K/V、共享与路由专家采用分支，残差单独标出。选择保留 Rank / Layer 上下文，详情复用原检查器。通信与 OOM 仍进入原 Top / Front 教学场景。空间相机与矩阵相机分别保留；缩放、标注、播放、主题沿用原入口。底部场景互斥选择，计算图选中时不会同时高亮分层/权重分片。轮盘左侧小 cube 在单/全部 Rank 间切换，以单 cube / 双 cube 表达当前范围；单 Rank 选择器位于轮盘下方，仅单 Rank 时显示。底部场景提供内容与对应视图的无边框光标提示；进入展开时观察全部 Rank，返回空间恢复原观察范围。

当前交互模型上限为 2048 Rank / 128 层。逐 token EP 动画使用精确模拟路由，在 `Seq/CP × Micro Batch × Experts × EP > 16,777,216` 时要求缩小配置，避免阻塞界面；配置与显存观察仍可用。

如本地服务尚未启动，可在本目录运行 `python3 serve-demo.py`，仅绑定 `127.0.0.1:8769` 且只开放该 demo 的显式资源白名单。已有服务占用该端口时直接复用。

验证命令（仓库根目录）：

```sh
rtk node patterns/npu-memory-atlas/variants/index_comm/test-rank-model.cjs
rtk node patterns/npu-memory-atlas/variants/index_comm/test-ep.cjs
```

2026-10-10：模型测试覆盖 Rank/Layer 账本守恒、CP/EP 映射、卡容量独立性、非法配置及联动修正；原 EP/OOM 回归通过。浏览器检查覆盖 3D/2D、侧视、R23 × L7 查询、EP/OOM 返回、配置修正和 390×780 窄屏。全库目录校验另受既有缺失文件 `patterns/pangu-layer-atlas.md`、`patterns/pangu-layer-atlas-2.md` 阻塞，与此 demo 无关。


### 2026-10-10 控件消融复核

采用移除控件后的任务可达性检查，不作为用户研究或性能实验。

| 候选项 | 处理 | 验证与保留理由 |
| --- | --- | --- |
| 计算图的额外 Rank 输入 | 删除 | 通过画布、原单 Rank 选择器、配置中的 Rank × Layer 定位共享选择；R23 × L7 定位可用 |
| 图尾常驻 E0–E63 专家网格 | 合并到 Expert Compute 节点，选中或搜索编号时出现 | 整网默认专家按钮从 64 个降为 0；搜索 E24 仍定位 R6 × L0、显示该专家参数 |
| 与当前视图无关的显示设置 | 按空间/展平互斥显示 | 展平不显示立方体比例、空间轴距和侧面标注；空间不显示展平选项；模型参数和定位共用 |
| 长篇计算图说明 | 缩为范围和操作提示 | Q/K/V 分支、MoE 分支、残差关系直接由图表达 |
| Layer 范围、单/全部 Rank、参数模块选择、显存检查器 | 保留 | 分别控制图的抽象层级、观察范围、参数分片与数值归属，不是重复功能 |

普通算子搜索不再附带无关专家网格。专家网格在节点内限高滚动。模型及原 EP/OOM 回归通过；目录校验仍受上述既有缺失文档阻塞。

## 衍生约定

1. 复制 `index.html` 为 `variants/<方案名>.html`，将脚本引用改为 `../npu-memory-atlas-embed.js`。
2. 方案专属资源放入 `variants/<方案名>/`；如果需要改嵌入协议，使用方案自己的脚本，避免影响基准。
3. 在本文件登记方案入口、目标与验证情况；未经明确决定，不将衍生改动回写基准。
4. 基准本身需要更新时，记录变更原因、验证结果和新 SHA256，再运行现有回归检查。

## 基准与验证

- 整理时基准 SHA256：`09834f47dc35a20fae8bb53ae0c5eca68a36b2ab4b9dae55c24e45494ac887fd`。
- 本次为目录整理，不表示新增设计评审。历史 UI approved 范围与后续待评审项以评审记录为准。
- 数据与训练过程是教学模拟，不代表实测数据。
- 外层旧版 HTML 入口已移除；已有嵌入页面改为直接引用本目录的基准入口。
- 目录入口由 `catalog/assets.json` 管理，展示页通过 `scripts/build.py` 生成。

## 方案登记

| 方案 | 入口 | 目标 | 验证情况 |
| --- | --- | --- | --- |
| 基准 v10 | [index.html](index.html) | 训练内存分层、多 Rank 与并行关系 | 迁移前后字节一致；沿用既有评审范围 |
| Liquid Glass | [variants/liquid-glass.html](variants/liquid-glass.html) | 玻璃质感控件探索 | 仅调整脚本相对路径；视觉待验收 |
| Rank EP 通信 | [variants/index_comm.html](variants/index_comm.html) | 保留原模式；新增通信入口，自动聚焦 EP 组，以 Token 图元呈现激活分发与输出回收，复用原播放控件 | CSS／基准哈希、含在途量的 Token 守恒、模式恢复检查通过；1280×720 浏览器完成五阶段、14 秒慢放、主题、来源切换与缩放检查；设计待用户验收；[实施计划](variants/index_comm-plan.md) |

本次整理校验：目录校验（27 项）和脚本依赖检查通过，基准与迁移前 HEAD 逐字节一致。现有 `tests/test_npu_parallel_relations.cjs` 在 `Approved HTML and CSS changed` 断言处失败；已在临时目录使用迁移前 HEAD 文件复现，属于既有快照不一致，后续逻辑断言未执行。本次未进行浏览器视觉验收。

### 展开视图对照检查（2026-10-10）

对照来源 rank-intro 的 drawPlane / drawSegs / drawDetail 与缩放手势：
- 已修正：画布左右等距，Fit 时 Rank 网格中心与视口中心一致；浮层不修改画布宽度。
- 已补齐：超过 100% 且格子足够大后，从概览进入 Attention / Dense 或 MoE 分区，再进入可点击算子；共用已有显存与归属 Inspector。Q / KV 并排，Dense / MoE 随配置变化。
- 已修正：缩放按钮绕画布中心、滚轮绕指针缩放；补 + / − / 0 键与双指缩放平移。
- 已修正：只选 Rank 时用连续外框，选 Layer 时用单格框；执行进度用顶部小三角，hover 明示本层权重及整卡占用。分层概览按权重 / 梯度 / 优化器构成绘制，不再只有权重色。
- 整合保留：TP / CP / EP 配置、Layer / PP 粒度、算子和专家查询、显存账、播放、容量风险均使用本 demo 已有入口。
- 与来源仍有差异：Embedding / Final Norm / LM Head 留在整网计算图，未作为矩阵独立端点列；来源的副本关系括号、同名 Layer 集合选择、3D 飞入展开过渡尚未移植。当前细节图是紧凑算子概览，完整残差与共享专家支路在计算图面板查看。未宣称源页逐项复刻。
- 验证：1400×900 下网格中心 x=700；381% 显示分区，1819% 显示算子，点击 R47 / L23 的 Expert Compute 可打开正确的参数形状与显存详情。双指手势已实现，未进行真实触屏验证。
