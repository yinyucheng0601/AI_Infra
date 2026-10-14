# Rank 显存与计算图：设计目标、实现契约与全盘复核

审查日期：2026-10-13。入口：`../index_comm.html`。分支：`codex/rank-transformer-communication-p18`。

本文件合并本轮对话全部优化要求，并作为当前设计目标的唯一汇总。`../index_comm-plan.md` 是历史实施记录；其中旧的完成勾选、控件限制和旧文案不代表当前版本已验收。用户后续明确授权的调整优先。首次复核只更新文档与审查脚本；随后已按用户授权修改运行实现。下面第 0 节是最新执行结果，其余问题清单保留为修复前证据。

## 0. 执行结果 · 2026-10-13

分片聚焦：选择权重分片后，仅当前参数、消费算子及其直接参数连接保持明亮；其他节点、连线、框架与说明降至 8% 不透明度。其他参数不显示分片持有条带，避免与当前选择混淆。暗化对象仍可点击切换目标。

颜色规则修正：紫色强调仅用于原本中性的灰色对象；tensor 的 hover、focus、选择与分片保留自身语义色，增强纹理不替换色相。

本轮已实施数据与联动修复；**自动契约通过，浏览器视觉验收未完成**。当前 file:// 页仍被 Browser Use URL policy 拦截，没有绕过策略，也没有把 DOM fixture 当作真实浏览器。

| 复核项 | 本轮实现与结果 |
| --- | --- |
| D01 / A01 | 分片轴、shape、消费节点移入 rank-model 的 parameterShard / parameterMetadata；修正模型 groups 与图中 Embedding 行切、Head 列切；图渲染不再改写传入 bindings。宿主旧布局适配仍保留，不进行整页重写。 |
| D02 | Dense 与专家副本分别返回 denseMembers / expertMembers，展示其并集；ETP1 包含 TP 副本。baseline R23 为 6/7/22/23；CP2、正交 EP 均通过契约检查。 |
| D03 | 用 moeLayer 解析 stage 内实际 MoE 层并纳入事件缓存键；没有 MoE 层的 stage 拒绝通信入口与通信 Rank 切换；OOM 不再强行选中没有 MoE 层的 R23。 |
| D04 | 参数 tensor 提供 typed target（rank、layer、indices），聚合 Attention 为 [0,1,2]；parameterRegions 为各 Layer/类别生成守恒的逻辑分配区间，空间内存中对对应区间按内存类别原色高亮；展平保留当前视图并标记目标层与消费者。不把逻辑区间称为设备实测地址。 |
| D04 精度边界 | 激活仍定位整卡激活大类，未伪造各 tensor 的独立驻留块；dZ 的 category=null，不再选中参数梯度，并明确其未独立分配。梯度区间随当前已分配梯度容量等比例定位。 |
| D05 / G10 | Norm、Router、Shared 参数接入主体消费者；Shared FFN 经 TP 归约与 routed 结果相加；Embedding 接层输入，末层显示 Final RMSNorm 与 LM Head；补最终 Norm tensor。下一步参数回路覆盖层内 Norm/Router/Shared。移除顶部孤立参数条带。 |
| D06 | 配置、Rank/Layer 选择清理过期目标，搜索清除旧 notes/关系；关抽屉清通信选择；参数 tensor 的精确类别保留到内存定位。 |
| D07 | 合并轴标注 DP×CP / DP×EP / DP×EP×CP；通信 caption 使用当前 MBS×Sequence/CP 与 Top-K。 |
| A02 | 通信场景通过 sceneMemory 读取 epEventAt 的 bufferBytes，空间块与 workbench snapshot 使用相同事件量；训练整步仍使用原容量模型，OOM 维持独立的受限分配预算。两种时钟/对象不混为一套实测时间线。 |
| A03 | 修复 DOM fixture 的 SVG/hover API；将过时的“variant CSS 必须等于 baseline”断言换成当前必要样式契约，继续验证 baseline SHA-256 未变；新增完整宿主+workbench 挂载与交互状态测试。 |
| A04 | GLYPH-SOURCES 区分片段复用、renderer 规则适配与本地扩展；glyph-provenance.json 记录 dataTiles、tensorNode、ir-op 上游函数哈希，由 audit-graph 验证。 |
| U01 | 大分片数采用以所选分片为中心的局部窗口：最多16列/8行；节点保留当前索引、总数、范围与“局部”标识，完整规则保留在自定义 tooltip。抽屉窄宽仍为横向滚动，真实布局待验收。 |
| U02 | “整网”更名“当前 Rank 首层”，上下文显示实际 Layer，不再宣称当前单层图是整网。 |
| U03 | Rank/SVG 原生 title 转为统一 tooltip 数据，工具按钮与专家按钮一并使用自定义 tooltip；展平 OP 选择染紫，执行态仍独立使用白底。 |
| U04 | 抽屉播放高亮与 G/O 分片仍按原约定延后；未新增播放条，未制造 ZeRO 分片。 |

本次验证：

- `test-rank-model.cjs`、`test-execution.cjs` 通过。
- `audit-graph.cjs`：14 项通过，0 失败；含全部11类别、本地分配守恒、混合 Dense/MoE、CP/正交副本组、消费者存在性、render 不修改输入、图元来源。
- `test-workbench.cjs`：先执行完整 `test-ep.cjs`（EP/OOM/回拖/恢复），再挂载真实 workbench 适配层；通过精确 tensor 目标、Shared、搜索/配置清理、空间与展平视角保持、事件缓冲一致性。
- `validate_catalog.py` 与图元库 `validate.cjs` 通过；`git diff --check` 通过。
- 真实浏览器：file:// 读取被策略阻止；1400×900、窄屏、文字遮挡、连续播放下点击稳定性和2048 Rank性能仍无实机结论。

复跑新增完整链路：

```sh
rtk proxy node ai-infra-research/patterns/npu-memory-atlas/variants/index_comm/test-workbench.cjs
```

以下第1–8节为首次审查基线；完成状态以本节及后续实机验收为准。

## 1. 首次审查结论（修复前）

**尚未完成全部优化目标，不应标为最终验收通过。** 空间可读性、独立抽屉、图元复用、基础 shape/容量和关联选择已有实现；精确数据目标、专家副本组、部分权重消费关系和跨场景状态还存在缺口。

- 数据模型的 Rank/Layer 参数账守恒、配置校验、执行时钟测试通过。
- 新增计算图契约审查：8 项中 3 项通过、5 项失败；失败分别是两个分片方向、专家副本组、共享专家消费关系、聚合参数的精确定位目标。
- EP 回归在 DOM fixture 初始化处中断：`document.createElementNS is not a function`，后续 UI/OOM 断言未执行。不能将历史通过记录当成本轮通过。
- 浏览器读取当前 file:// 页面被 Browser Use URL policy 拦截。本轮没有完成 1400×900 标准视口及窄屏实机 smoke test；所有遮挡、点击手感、文字溢出、主题与连续播放视觉结果均保留待验收。
- “播放驱动抽屉算子高亮”是用户明确允许后续接入的目标，不作为首版缺陷；展平矩阵已有执行高亮，并不代表抽屉也接入了。

## 2. 已确认的设计原则

1. 同一页面、同一套场景和播放控件；计算图是独立开关的抽屉，可以叠加于空间与展平视图。
2. 操作的对象层级必须明确：Rank → Layer → 参数类别 → 分片；通信关系另有通信类型、参与组和边界条件。
3. 不因点击通信节点自动切换到 2.5D 或通信场景。关系高亮与 EP 动画是两种不同的操作。
4. 2.5D 多 Rank 可去色压暗，保留内部体块、明暗面与外轮廓；Top/Front/Side 保留类别颜色。
5. 复用 P18 拓扑与图元库资产；tensor 使用 01.4 数据角色，文字位于节点内。OP 中性灰胶囊、函数徽标；通信深灰胶囊、虚线和双向箭头徽标。
6. 高亮遵循对象自身颜色：激活绿、参数紫、梯度青等有语义色的对象保留原色，通过填充强度增强；仅原本没有语义高亮色的灰色对象（OP、通信胶囊、加法节点等）使用 `#c17df3` 染色。不增加白色选择边框，结构边框与通信虚线保留。
7. 禁止在页面标签、图例、tooltip、抽屉中添加“教学模拟”“教学纹理”“仅作教学示意”等同义免责声明。数据来源与假设留在内部文档；不把推导量写成实测量。此约束已进入 `ai-infra-research/AGENTS.md`。
8. 完成必须同时满足语义、数据、交互和视觉验收；文件存在、测试通过或截图相似均不能单独替代完成。

## 3. 优化目标逐项对照

状态定义：**已接入**＝源码可定位，尚不等于本轮浏览器通过；**部分**＝明确有范围缺口；**待后续**＝用户允许延后。

| ID | 用户要求 / 验收标准 | 当前状态与证据 |
| --- | --- | --- |
| V01 | 默认多 Rank 去色、压暗，突出轮廓与空间 | 已接入：`focusedRankGeometry / neutralRankGeometry`；仅 2.5D，通信除外 |
| V02 | 去色仍保留内存体块 | 已接入：对原 geometry 改填充，不删除分区；待检验细层可见度 |
| V03 | Top/Front 等平面视图保留颜色 | 已接入：非 2.5D 直接返回原 geometry |
| V04 | 行间、层间留出明确轮廓空隙 | 已接入：默认轴间距 560 / 800 / 1500；大规模/极端比例仍待视觉验证 |
| V05 | 连线仅针对选中 Rank 的关联 Rank | 已接入关系选择与 graphRelation；通信播放层另由现有场景处理 |
| V06 | 三轴同原点、原点不被遮挡、TP 换方向 | 已接入：外侧共同原点与 TP 反向射线；需浏览器核查缩放/间距变化 |
| V07 | 端点标 DP/TP/PP、排数；不显示 XYZ；字体小、线暗、文字沿轴斜切 | 已接入 `drawRankRulers`；DP 合并 CP 时的含义见 D07 |
| V08 | 默认打开 125% | 已接入全 Rank 空间初始 zoom=1.25；单卡/展平独立相机不等于都固定 125% |
| V09 | 所有视图对象 hover，角标与中心标记 | 空间 SVG 和展平 Canvas 均接入对象 hover；真实命中/缩放视觉待验证 |
| G01 | 基于现有通信 tab 扩展，复用计算图入口 | 已接入；保留通信/OOM 场景，未新增播放器 |
| G02 | 抽屉独立于 2D，按钮放左下分层之前并隔开 | 已接入 `graph-mode`、separator、toggleGraphDrawer |
| G03 | 抽屉不透明、取消 Liquid 效果 | 已接入实体 #111 背景及 filter/backdrop-filter none；不参与玻璃注册 |
| G04 | 查找与 Layer 选择默认收起 | 已接入原生 details，无 open 属性 |
| G05 | 手动调宽，撑至底部控件上方，响应视口 | pointer/键盘 resize + ResizeObserver 动态 bottom；SVG min-width=900，窄抽屉采用滚动而非缩小重排 |
| G06 | 真正复用 P18/图元库，不只是相似 CSS | 通过本地适配器嵌入图元片段、复用 tensorNode/dataTiles 规则；有本地改写，来源校验不完整，见 A04 |
| G07 | tensor 文字叠在 01.4 节点内部 | 已接入名称、shape/容量；分片增加第三行 |
| G08 | OP 去色胶囊；通信 icon 与 OP 区分 | 已接入函数字符徽标与双向箭头徽标；当前所有通信共用一个徽标 |
| G09 | 左 K/V、右权重与消费 OP 同高直连 | 已接入 CP1 K/V→Attention 与权重→OP；CP>1 保留 K/V→交换→Attention 的必要两段 |
| G10 | 更新后参数接回主体 | 已接入虚线指向下一训练步 Attention/FFN 参数；Norm/Router/Shared 未完整覆盖 |
| G11 | tooltip 使用设计系统，不用原生默认 | 图内 cg-hit 使用 data-wb-tip；专家按钮/Rank/关系线等仍有原生 title，属部分完成 |
| G12 | 点 tensor 定位内存 | 部分：切到单 Rank 2.5D 并选中大类；未定位具体 Layer 内存块或参数类别，见 D04 |
| G13 | 点通信节点显示相关 Rank，不强制换场景/视角 | 已接入空间与展平关系层；单卡提供“查看全部关联 Rank”；组数据有 D02 |
| G14 | 播放条驱动抽屉 OP 高亮 | 待后续；当前只有展平图使用 M.execution |
| W01 | Rank＋Layer＋权重类别准确映射 | 参数数量与层归属测试通过；无指定 Layer 时选该 Rank 第一个适用层，不是用户明确选择的层 |
| W02 | 分片点击后参数节点与消费 OP 染紫 | Q/KV/Out→折叠 Attention，专家→Experts，Dense→FFN 已接入；Norm/Router 为顶部补充节点；Shared 缺失主体消费者 |
| W03 | 所有 Rank 点击一致响应 | 增加 pointerdown/up 捕获，避免重绘吞点击；不持有类别时给出无权重反馈；跨播放/拖拽仍待实机回归 |
| W04 | 移除左侧 XYZ selector | CSS 隐藏 relations，内部 DOM 值仍作遗留状态使用；不是状态模型已删除 |
| W05 | 计算图呈现分片，当前持有保留参数语义色、其余压暗 | 已接入 W 节点条带与索引范围；Embedding/Head 方向错误；尚非 W/G/O 全套分片 |
| W06 | 本地 shape/容量随所选分片更新 | 元素数与 bytes 测试通过；复合 FFN 三矩阵 shape 是打包表示，不能当每个矩阵的真实二维朝向 |

## 4. 场景与状态架构

### 当前运行链路

`index_comm.html` 内联脚本持有全局配置、Rank、相机、场景、通信/OOM 和播放器；加载 `rank-model.js` 后，`rank-workbench.js` 保存 legacy 函数并覆盖 render、applySimulation、rankGroups、shardSpec、setAtlasMode 等入口。SVG 空间与 Canvas 展平共用参数模型，拥有独立相机。计算图由 `compute-graph.js` 生成数据绑定与固定 SVG 布局，`approved-glyphs.js` 提供图元。

| 模块 | 负责 | 主要风险 |
| --- | --- | --- |
| rank-model.js | 配置合法性、Rank 编码、Layer 归属、参数量、显存估算、执行序列 | groups、execution 与图中消费关系分别维护 |
| ep-model.js | Token 路由、分配、回收、缓冲与故障模型 | 独立事件时间与整步显存时钟需要明确适配 |
| HTML 内联宿主 | 空间投影、内存分区、EP/OOM、播放、选择 | 大量可变全局，加载顺序影响行为 |
| rank-workbench.js | 新配置、展平、抽屉、双向选择 | monkey patch、隐式 DOM 控件状态、多个选择字段 |
| compute-graph.js | tensor/通信数据绑定、权重选择、P18 布局 | render 会改写传入 bindings；组与消费关系独立计算 |
| approved-glyphs.js | SVG 图元适配 | 来源片段和本地扩展之间缺乏自动差异验证 |

### 需要固化的交互契约

| 操作 | 应改变 | 应保留 |
| --- | --- | --- |
| 开关抽屉 | drawer.open | 场景、投影、Rank/Layer、播放时刻、相机 |
| 选择权重分片 | rank/layer/category/shard + 参数和消费者高亮；暂停 | 当前投影与场景、抽屉开关 |
| 选择通信节点 | relation.kind/members/boundary | 场景、投影、相机；不启动 EP 动画 |
| 选择 tensor | 内存定位目标，显式区分整类与具体块 | rank/layer/category 不能丢失；当前实现会切单卡2.5D，应在后续统一交互审查中确认 |
| 切配置 | 重新验证所有目标与缓存；无效目标清理 | 合法且仍存在的上下文可保留，不能留下旧权重选择 |
| 切 Layer | 目标归属、shape、消费者、通信边界 | 所选 Rank 应随 PP 归属一致更新 |
| 播放/拖动 | 时间和执行态 | 用户选择高亮与执行高亮应是独立字段，互不覆盖 |

建议目标状态：`selection={rank,layer,parameter,expert,tensor}`、`relation={kind,members}`、`scene={mode,projection,scope}`、`drawer={open,width}`、`clock={domain,time,playing}`。集中用 action 更新，纯 selector 推导 shape/归属/高亮；保留现有 UI，不要求一次重写整个页面。

## 5. 发现清单与优先级

P1：影响语义/数据准确性；P2：影响交互完整性、可读性与维护；P3：后续增强。以下尚未修复。

### D01 · P1 · Embedding 与 LM Head 分片方向颠倒

`compute-graph.js:shard` 将 index6 视为行、index5 视为列。现有宿主 shardSpec 明确 Embedding `[V,H]` 按行切，Head `[H,V]` 按列切。当前元素数仍正确，但图中持有方向和范围文字误导。新审查脚本已复现两个失败。修复后需验证 rank0/1 和 rank96/97。

### D02 · P1 · 专家梯度同步组漏 TP 副本

baseline R23 当前 expertMembers 为 `[7,23]`。本仓库 ETP1 专家副本模型 `ep-model.expertReplicas(23)` 为 `[6,7,22,23]`；compute bindings 额外要求 x.tp===r.tp，漏掉 R6/R22。不能简单把所有参数都改成同一组：Dense TP 分片与 Expert 完整矩阵的副本集合不同，应分别返回 typed groups，并验证 CP 和 ortho。

### D03 · P1 · 混合 Dense/MoE 下 EP 事件 Layer 不一致

`setAtlasMode` 仅拒绝全 Dense 配置；`epEventAt` 总将代表事件 layer 设为 stage 首层。Dense=2 时 PP0 首层 L0 为 Dense，仍可创建 EP 事件；完全 Dense 的某个 stage 也可能被动画覆盖。应找所选 stage 的实际 MoE 层，没有则禁用该 stage 的 EP 事件。本项为源码确认，尚未浏览器复现。

### D04 · P1 · tensor “定位”目前仅定位显存大类

`selectGraphNode` 只将 `note.tensor.category` 写给 selectedMemoryCategory，并切 single/explode/2.5D。未把 index 或 Layer 内的目标传给内存几何。默认 weight-attn 聚合 Q/KV/Out 且没有精确 index；不能给它随意补一个 index，而应提供类别集合或展开后精确定位。dz 是激活梯度，却映射到类别1（整卡参数梯度），不是独立激活梯度区域。需定义 target 的对象类型与支持精度，避免高亮错误内存区。

### D05 · P2 · Shared/Norm/Router/全局参数联动未闭合

Shared index9 的 consumers=[]，主体仅有“共享专家分支折叠”文字；无法高亮真实消费节点。Norm/Router 和 Embedding/Head 以图顶附加条带显示，未连接主体；最终 Norm 也未单独表达。原“Rank+Layer+类别→消费 OP”对这些类别只部分完成。Q/KV/Out 指向折叠 Attention 是明确的聚合粒度，不是三个具体 OP 均已高亮。

### D06 · P2 · 选择生命周期可能残留

`commit` 未清 graphWeight；`selectCell` 未清 graphWeight/state.graphComm；搜索模式提前返回时未刷新 graphNotes/graphRelation。旧选择在返回同一 Rank、清空搜索或重开抽屉后有重新出现的风险。关闭抽屉清 graphRelation，但 state.graphComm 留存，重开会恢复关系。需要集中规定哪些操作保留、哪些清除，再进行浏览器复现。

### D07 · P2 · CP/正交 EP 配置的标注口径

全局 DP 被赋为 M.lanes(c)=dpReplica×CP，空间尺仍称“DP 排”。CP>1 时这是合并 lane 数，不是纯 DP 数；应显示正确维度/分组，而非仅改数值。通信 caption 中仍硬编码 `8,192 TOKENS × TOP-8`（HTML 约661行），与可配置 seq/mbs/cp/topk 不一致；其他 legend 已使用动态值。需检查该 caption 分支实际可达性。

### A01 · P2 · 多套语义定义漂移

groups、旧 shardSpec、weightSelection、ops、execution、graph layout 各有独立类别/消费表；D01/D02 是已发生的漂移。建议先提取参数描述表（shape、轴、复制组、消费节点），各 renderer 读取同一结果；不要为抽屉再建独立账本。

### A02 · P2 · 事件缓冲与整卡显存不是同一计算路径

workbench applySimulation 使用 M.memory，通信缓冲为公式估算；EP 图使用 epEventAt.frame 的逐事件缓冲，OOM 再有局部覆盖。不能宣称所有视图的通信缓冲已由同一个事件账本驱动。应逐阶段对比 baseline 和 CP/Top-K 变化下两侧值，选择统一来源或明确对象口径。

### A03 · P2 · 测试与实际挂载链路脱节

test-ep.cjs 的 DOM stub 已不能初始化新 hover API；原 suite 中后续 UI/OOM 检查失效。rank-model 测试通过只证明账守恒，不证明图中轴向、组成员和目标定位。应修复 fixture 并增加真实入口 smoke test，禁止以吞掉异常使测试变绿。

### A04 · P2 · 图元来源说明不够精确

GLYPH-SOURCES 声称 exact fragments，但 tensor 已采用 data-4 renderer、本地分片叠加，OP 也有本地重写。sources 哈希清单仍有旧 data-2，未覆盖当前 data-4/ir-op 实际来源。应区分原始片段、适配规则和扩展，并以自动核查保证“复用”可追溯。

### U01 · P2 · 响应式与信息密度仍需验收

抽屉可缩至360px，图最小宽900px；横向滚动是当前行为，不是图自动重排。分片第三行长字符串没有换行/裁剪，EP128 的条带在260px节点中难以区分。需在1400×900、1280×720、390×844检查文字与控件，不能仅检查容器宽度。

### U02 · P2 · 整网选项与图范围不一致

query-layer 的 all 标签为“整网”，graphMarkup 却用当前 Rank 首层作为 current，仅画一层。应改成明确的当前层/代表层语义，或真正增加整网层级；不能继续让用户以为 Embedding→所有层→Head 均已显示。

### U03 · P2 · tooltip 与高亮尚未全域统一

计算图普通节点使用自定义 tooltip；expertMarkup 仍输出原生 title，Rank/SVG 关系与旧工具按钮也保留 title。展平细节 OP 仍用白底执行态/白框选择态；若统一紫色要求扩展至全部视图，需要先区分“选中”与“正在执行”。抽屉灰/紫样式目前已接入。

### U04 · P3 · 分片展示范围与播放

当前只有 W 节点具备分片条带，G/O 未呈现所选分片继承关系；ZeRO关闭时不能照搬截图的 W/G/O 全部跨 DP 切分。后续若增加，必须按 TP/EP 的实际归属及优化器本地状态标注。抽屉播放同步另行接入，不新增播放条。

## 6. 数据契约与检查口径

- World = TP × PP × dpReplica × CP；split 的 dpReplica=DP，ortho 为 DP×EP。
- Rank id = (PP index × lanes + lane) × TP + TP index；PP 连续持有 layers/PP 层。
- 权重/参数梯度按2 bytes/元素，优化器账按12 bytes/参数；GB=10⁹、MB=10⁶；OOM局部标注使用MiB，不能混写。
- shape 为逻辑计算形状；Q/KV 按输出维、Out 按输入维、Embedding按词表行、Head按输出词表列。
- Experts 按 EP 分配完整专家，ETP1；Norm/Router 为完整副本；Dense/Shared 三矩阵应能拆解 Gate/Up 与 Down 方向。
- 激活 T=MBS×Seq/CP；当前无 SP。CP远端K/V是远端总逻辑量，不等于峰值缓冲驻留量。
- 不因高亮改变数据或容量；不把全层聚合、当前选中分片、常驻参数、瞬时缓冲混成一个数。
- ZeRO关闭，不制造 AllGather/ReduceScatter 节点；PP发送仅在stage边界有效。

## 7. 验证记录与待执行矩阵

本轮源码覆盖：HTML空间/场景/播放，rank-model，ep-model接口及已有测试，workbench配置/Canvas/选择/抽屉，compute-graph与glyph/CSS，历史README与计划。不是逐像素或完整浏览器行为验证。

| 检查 | 本轮结果 |
| --- | --- |
| test-rank-model.cjs | 通过；基线、CP2、ortho、Dense/Shared、不同TP/PP、容量与非法配置 |
| test-execution.cjs | 通过；前向/反向/更新、Dense/MoE/Shared、类别边界 |
| audit-graph.cjs | 3通过/5失败；失败对应D01、D02、D04、D05；非豁免快照 |
| test-ep.cjs | 中断于DOM stub缺createElementNS；不能列为通过 |
| validate_catalog.py | 通过：31 curated assets |
| diagram-legend-library/validate.cjs | 通过：来源哈希、图例与库内规则；不能代替抽屉适配器来源一致性检查 |
| audit-graph语法 / git diff --check | 通过 |
| 浏览器smoke | file://读取被URL策略阻止，未执行；未绕过策略 |

复跑（从 `/Users/yin/AI_Infra`）：

```sh
rtk proxy node ai-infra-research/patterns/npu-memory-atlas/variants/index_comm/test-rank-model.cjs
rtk proxy node ai-infra-research/patterns/npu-memory-atlas/variants/index_comm/test-execution.cjs
rtk proxy node ai-infra-research/patterns/npu-memory-atlas/variants/index_comm/audit-graph.cjs
rtk proxy node ai-infra-research/patterns/npu-memory-atlas/variants/index_comm/test-ep.cjs
rtk proxy python3 ai-infra-research/scripts/validate_catalog.py
```

浏览器恢复可用后必须检查：

| 场景 | 操作 | 通过条件 |
| --- | --- | --- |
| 初始/2.5D/Top/Front/Side | 默认、缩放、轴距、hover、明暗主题 | 125%入口、去色只在2.5D、原点可见、空隙明确 |
| 空间/展平＋抽屉 | 开关、拖宽、窗口resize、滚动 | 原相机不跳、底部不遮挡、查找默认收起、文字可读 |
| 权重＋抽屉 | R0/1/23/96/127；全部11类；Dense/Shared | 所有存在类别能定位，参数/消费者/shape同一上下文 |
| 通信节点 | TP/EP/CP/DP/PP；stage首/中/末层 | 不换场景、参与Rank与组口径一致、禁用边界无伪连线 |
| 通信/OOM | 分发/计算/回收、暂停回拖、退出 | 单一可控时钟、失败申请不增加占用、返回场景无残留 |
| 状态交叉 | 选分片→搜索→改配置→换Rank→关开抽屉 | 不恢复过期目标、不残留错误关系、不吞点击 |
| 极端配置 | CP2、ortho、TP1/8、EP1/128、2048Rank | 数值/尺子/禁用入口正确，记录性能与可读性边界 |

## 8. 修复顺序与完成门槛

1. 先修数据：D01轴向、D02副本组、D03事件Layer、D04定位类型；补自动契约检查。
2. 再闭合选择：Shared/全局/Norm消费者、选择失效规则、整网范围命名；不以顶端孤立条带代替主体关系。
3. 统一参数语义表和通信组接口，分开用户选择与执行状态；逐步消除重复定义。
4. 修复EP测试fixture，完成上述浏览器矩阵，检查窄屏/主题/hover/播放与数据更新组合。
5. 最后补播放驱动抽屉、G/O分片等延后项。每一项记录本次代码证据和实际验收，不沿用历史“已完成”。

当前发布判断：可继续探索与评审；不具备“所有场景、所有配置、所有关联目标已完成”的证据。
