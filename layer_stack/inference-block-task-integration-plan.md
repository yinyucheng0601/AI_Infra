# Layer Atlas · Block / Task 观测接入计划

日期：2026-11-20
状态：阶段一、二已完成本地实现与逻辑检查，视觉待确认；阶段三、四待实施。
目标：`inference-layer-stack.html`、`inference-layer-stack.css` 及对应数据适配器。
承接：[推理观测改造总计划](inference-profile-integration-plan.md)。本文件细化 PA 执行维度和底部观察区，不代表已完成实现。

## 1. 目标与设计约定

补齐“当前调用 → Rank → Layer → PA → 执行 Block → Task → Stack / Page”的下钻关系，让计算图中的次数、Shape、精度、存储、状态和同步由同一执行上下文驱动。

底部复用现有 Token/Page 区域，在 **Token / Page → Task Generation → Block Assignment** 三种观察状态间连续切换，不增加独立常驻 Block 面板，也不把 Block 格子堆进计算图。

- Token/Page：观察缓存中的逻辑数据位置。
- Task Generation：Batch × KV Head任务矩阵，表达任务来源。
- Block Assignment：同一批Task重排，表达执行归属及各Task的序列工作量。
- 主体：显示当前 Layer、PA 或所选 Task 的计算关系。
- 底部整请求播放轴：继续控制调用和 Layer；Task 内 Stack/Tick 使用局部步进，不混入整请求播放轴。

执行 Block 与 KV Page 是不同对象。Page 可能被多个 Task 读取，不建立虚假的一一对应。Block 是执行分配单位，不默认等于物理 Core；Task 是本 PA 实现中的语义任务，不与 profile 的同名 task 字段直接等同。

## 2. 来源与计数口径

优先复用 Compute Explorer 的完整语义模型、任务分配和次数推导机制：

- `/Users/yin/PyPTO3-main/Design/PyPTO-Compute-Explorer-UI/js/paged-attention-semantic-graph.js`
- 同目录 `paged-attention-model.js`
- 同目录 `visualization2-graph-intra.js`
- 同目录嵌入的 `paged_attention_pypto.py` 源码与同步模型。

参考案例中 Task 对应 Batch × KV Head，按 Task ID 分配到执行 Block；Page 为128个 token，4 Pages组成一个 Stack。这些参数属于参考实现，不直接套用到当前 TP2 profile。

以参考 Task 长度1025为例：P=ceil(1025/128)=9，S=ceil(P/4)=3。

| 项目 | 次数 | 单位与含义 |
|---|---:|---|
| QK Matmul | P=9 | 每 Task / AIC，每个有效 Page 一次 |
| PV Page 贡献 | P=9 | 每 Task / AIC；首 Page Matmul ×S，其余 Matmul Accumulate ×(P−S) |
| Scaling/Mask、Online Softmax | S=3 | 每 Task / 每 AIV Lane |
| Context Accumulate | S=3 | 每 Task / 每 AIV Lane |
| Output Normalize | 1 | 每 Task / 每 AIV Lane，循环后执行 |
| Rescale FIFO 移位 | S+PRE_LAUNCH | 与有效 rescale 产生/消费次数分开统计 |

次数属于源码循环推导，不是耗时，也不直接等同于设备指令数或 profiler 调用数。徽标和详情必须保留计数单位、公式和来源。

现有 TP2 的整网 Block Num20 / Mix Block Num40，不用来证明 PA 的 Block 配置。缺失字段使用用户已授权的 mock，但独立保存来源，不回填实测 profile；TP 分片、本 Rank KV Head 范围及物理页映射分别配置，不凭全模型 Head 数推断。

## 3. 阶段一：补齐执行模型与稳定对象身份

### 工作

- 接入完整 PA schema，保留 composite 子图、端口、Shape、dtype、存储空间、执行单元、状态、同步及源码引用，替代当前精简数据投影。
- 建立执行上下文：调用、Rank、Layer、算子、Batch、序列有效长度、Q/KV Head 范围、Block 配置、Page/Stack 参数。
- 建立 Block→Tasks、Task→Stacks→Pages、Page→token 范围及反向查询。
- 使用带上下文的稳定 ID，区分 execution Block、逻辑 Page、物理 Page、语义 Task 与 profile 事件。
- 次数以独立 overlay 存储：count、unit、formula、source、provenance；区分实测、源码推导和 mock。

### 验收

- 1025长度案例得到9 Pages、3 Stacks及上表计数；覆盖128/129、512/513等边界。
- Task 分配无遗漏、无重复；尾 Page 和尾 Stack 的有效长度正确。
- Rank、Layer、调用切换后查询不串上下文；无法确认的实测映射不被自动绑定。

## 4. 阶段二修订：Token/Page → Task Generation → Block Assignment

2026-11-20重新核对源demo后确认：替换原Block按钮与独立Task列表。底部保留三个连续观察状态，同一批Task保持身份与选择，不重建成另一组卡片。

### 工作

- Token/Page保持紧凑默认状态；显式进入Task Generation或Block Assignment后，展开同一底部观察区，可收回；不重置主体相机。
- Task Generation复用Batch行 × 本Rank KV Head列，每张Task显示Q Head点、Task ID；Batch侧序列条表达Stack及尾部有效长度。
- Block Assignment复用源 `visualization2-assignment-morph.js` 的固定KV列与纵向重排算法，按Task ID % Block数分组；Task ID和节点保持。卡片内Q Head编码交叉切换为Stack编码，尾Stack按有效token比例填充。
- 单击Block只选中其全部Tasks；单击Task只检查Batch、Head、Pages/Stacks及归属Block。明确点击“展开Task”才进入主体计算图，返回恢复原视角。
- Task检查与Task计算图打开状态分离；切回Token/Page投影该Task所属Batch。选Page后可关联读取该Page的多个Tasks。
- 复用源布局与分块编码机制，适配宿主选择态、tooltip、键盘和reduced-motion；不复制绿色高亮或描边选择态。
- 当前4个本Rank KV Heads为显式mock配置，64 Tasks/24 Blocks随配置生成；不直接复制截图8列128 Tasks，也不宣称为TP2实测映射。

### 验收

- 两种布局包含同一批Task，各自节点身份、KV列、选择保持；分组无重复、遗漏。
- 128/129与512/513等尾Page/Stack表达正确，非整除Block/Head配置仍按模数正确分配。
- Task Generation ↔ Block Assignment只重排底部；Token/Page往返保留Task与Batch关联；Block点击不直接打开主体。
- 展开Task与返回PA保留原视角；模型切换清除旧映射；DS不继承Qwen的执行参数。

## 5. 阶段三：图层、次数与 Task 内部展开

### 工作

- 复用参考的图层机制：数据节点、Shape、精度、存储及执行、状态/控制、同步，并加入执行次数。
- 默认保留基本数据流，细节按需开启；图层切换保持节点身份和相机。
- OP 使用 ×N 徽标，详情显示口径和公式，不把不同单位的次数直接相加。
- Task 内用适量 Stack 叠层表达重复结构，并提供 Stack/Page 实例选择；大量实例不全部平铺。
- 保留 online softmax 的 m、l_sum、rescale、o 状态反馈，以及生产/消费同步；状态更新、FIFO移位和计算次数分别表达。
- Task 内局部 Stack/Tick 步进与全局播放解耦。

### 验收

- 参考 Task 的计数、状态和数据依赖可核对到源码。
- 隐藏图层不会误删依赖或重建选择；重复切换、展开、收起后仍可返回。
- 未开启高级图层时主体保持可读，不依赖大量常驻说明文字。

## 6. 阶段四：Token、Page、Block、Task 与 Rank 联动

### 工作

- 选 Task，再切回 Token/Page：显示对应 Batch 的序列，突出读取范围及相关 Pages。
- 选 Stack：突出其包含的 Pages和 token 范围。
- 选 Page：突出相关 Tasks、QK/PV实例和缓存读取关系；关系允许一对多。
- 保留当前执行位置与独立检查位置两个状态，检查历史 Page不自动 seek 全局播放。
- Rank 保持所属关系；物理页映射有数据时接入，mock映射单独记录，不伪造实测地址。
- Qwen先接入已有PA实现；DS V4同步共享导航、图层和返回行为，SWA/CSA/HCA执行模型按各自实现补齐，不套用Qwen的次数和Head分工。

### 验收

- 从Task可追到Page/token，从Page可反查相关Task；跨Rank、Layer、调用不串选。
- Qwen与DS切换后共享交互一致，模型特有数据隔离。
- 整请求播放、局部步进、独立检查三者互不误驱动。

## 7. 交付顺序与检查

优先完成阶段一、二，先交付可操作的下钻链，再实施阶段三、四。每阶段更新数据来源、映射规则及验证记录。

实现检查覆盖映射边界、选择恢复、模型隔离、图层开关和返回路径；视觉验收覆盖底部连续切换、主体过渡、相机保持、tooltip和明暗主题。静态/逻辑检查、浏览器视觉确认、提交与线上发布分别记录，不互相替代。自动浏览器检查遵循仓库授权规则。

## 8. 实施记录 · 2026-11-20

阶段一、二本地实现：

- 内嵌完整 Compute Explorer PA semantic schema，保留 composite、端口、存储、dtype、Shape、同步及源码元数据；默认展示仍为数据投影，图层开关留在阶段三。
- `PAExecution` 独立配置为24 Blocks、16 Batches、每 Rank 4 KV Heads、128-token Page、4 Pages/Stack。这些是用户授权 mock 的显式输入，不是 TP2 实测配置。Batch0 随当前调用取132–136长度，其余 Batch 使用参考序列长度；Rank0/1 的 Head 范围为配置投影。
- Block→Task 分配、Page/Stack 划分、反向查询、计数单位与公式、上下文稳定 ID 已接入。原始 profile 不修改。
- 底部同一区域支持 Token/Page 与 Block/Task 切换；选 Block 展示 Tasks，选 Task 进入对应计算图，返回 PA 恢复原相机。底部维度切换只动画局部内容，不操作主体相机。
- Task 图保留当前 Batch、KV Head、序列、Page/Stack 上下文。切回 Token/Page 显示对应 Batch；Page 检查关联相关 Block/Task。完整 Stack实例、状态图层与次数徽标仍待阶段三、四。
- 调用、Layer及模型切换清除旧 Task 下钻；模型切换清除旧 Page 检查。DS不展示Qwen的mock任务分配。

检查：`scripts/test-pa-execution.cjs` 覆盖1/128/129/512/513/1025/3584边界、Task分配完整性、次数推导、反向查询与上下文ID隔离；本地 fake-DOM 冒烟检查覆盖 Task 图、Batch Token投影、返回相机和DS隔离。它们不代表浏览器视觉验收或设备验证。8896白名单HTTP入口已核对返回新源码。

尚未提交或发布；不以当前记录表示阶段三、四已完成。


### 阶段二修订实现 · 2026-11-20

已替换初版Block按钮列表。底部显式进入Task Generation或Block Assignment时展开，收回按钮返回紧凑Token/Page；主体相机不变。两种布局共用同一批SVG Task节点、Task ID和固定KV列。直接复用参考 `createLayout`、`partitionWidth`、`sequenceSegments` 函数，保留来源注释；去除参考的页面外壳依赖，适配宿主颜色、tooltip与键盘操作。

Task重排420ms，只沿Y方向移动；Q Head点与Stack填充交叉切换，支持中断反向及reduced-motion。单击Block检查其全部Tasks，单击Task只选择，使用“展开Task”进入计算图。检查Task的Batch可投影回Token/Page。不同Rank的Head范围仍为mock配置，序列长度/采集时长来源保持分离。

检查通过：8 Heads/24 Blocks、4 Heads/24 Blocks，以及3 Heads/5 Blocks非整除配置的任务完整性与固定KV列；513-token尾Stack填充；fake-DOM检查Task节点身份、Block/Task选择、Token Batch投影及主体相机不变。未自动进行浏览器视觉验收，未提交发布。次数徽标、完整Stack状态图层仍按阶段三推进。


### 阶段三局部接入 · 2026-11-20

Token/Page与Task Generation（含Block Assignment）的进出增加底部观察区及内容共享快照转场，浏览器不支持ViewTransition时降级为位移淡入，reduced-motion直接切换；不操作主体相机。Task Generation与Block Assignment继续使用原Task节点纵向重排。

Task计算图加入QK、PV、Scaling/Mask、Softmax、Context Accumulate、Output Normalize六处×N徽标，显示AIC/Task或每AIV Lane/Task单位；PV tooltip拆分Matmul与Matmul Accumulate。重复区域使用最多三层容器和实际Stacks/Pages计数。次数来自已有源码循环适配器，不标为实测次数。完整状态反馈和高级图层开关仍未完成。

fake-DOM检查Task20（3584 tokens）的QK/PV各28次、Softmax/Accumulate各7次、Normalize1次及六个徽标存在；视觉动画待用户确认。


### OP重复实例图元修正 · 2026-11-20

撤掉外置圆形次数徽标。按参考 `compute-graph-scene.js / applyPypaExecution` 的绘制机制移植SVG版：由后向前逐个实例绘制相同胶囊轮廓，直接复用 `paged-attention-execution.js` 的deckOffset（每层右7、下5），灰度为max(38,82−instance×4)，徽标放回节点右上角。实例层数随实际次数，不用一张背景容器代替OP重复。Task纵向布局和fit范围按最大叠层位移计算，避免重复层压住后续Tensor；浅色主题使用对应浅灰。

检查：Task20的六个次数徽标及72张后置实例轮廓存在，源码推导次数保持。视觉仍待用户确认。


### 完整Task语义图复用 · 2026-11-20

移除此前手写的简化Task拓扑。直接内嵌参考 `visualization2-graph-intra.js` 的 `createModel` / `semanticModel` 原函数，接入参考 `paged-attention-pypto-source.js` 中的原Python源码，为状态更新公式、源码行号、端口和同步保留真实定义。宿主适配器只提供当前Task的序列、Head、Page/Stack和Q Tile配置，不按序列长短删节点。

SVG投影遍历上述模型的全部17节点和全部边，加入Partial Context、m、l_sum、Rescale FIFO、o以及跨Stack反馈；Task Inputs/Compute/Output分组和三组同步定义来自同一模型。布局和重复实例厚度随次数计算，主页面的颜色和导航仍沿用宿主。

验证：128、1025、3584三种长度下节点数17、全部边身份一致、状态反馈与三组同步定义存在；映射计数、视角返回及模型隔离逻辑检查通过。浏览器视觉未自动验收。
