# Layer Atlas 推理观测改造计划

日期：2026-11-19  
状态：分阶段实施中；已接入调用摘要、相对 Token 序列、PA 展开草稿与双 Rank 主辅切换骨架。  
目标页面：`layer_stack/inference-layer-stack.html`  
首个运行基线：Qwen3-14B · TP=2。DeepSeek V4 保留，并同步共享交互及图元修改；没有对应 profile 的部分不套用 Qwen 实测数据。

## 1. 目标与当前问题

把页面组织为同一次运行的不同观察尺度：请求步骤 → 模型层 → 算子 → 执行任务；以及当前层、请求和 Rank 所属的 KV → 逻辑 Page → token 槽位。

当前页面混合了四类不同来源：

- 模型结构：Qwen3-14B 的 40 层、40 Q Heads／8 KV Heads；DS V4 的层序及缓存分支。
- 请求故事：固定 Prompt 0–131、Decode 输入132／133，以及人为设置的 EOS。
- 独立 PA 案例：16 请求、24 Attention Blocks、128-token Page、4 Pages/Stack、3584-token 参考容量。
- 内存参考：TensorRT 的79.10 GiB预算，非这次Qwen TP2运行的实测显存。

这些内容可以分别研究，但不能在同一个状态下被表达成一次真实运行。优先统一数据上下文，再增加PA展开和双Rank视图。

## 2. 已确认数据与证据边界

| 来源 | 已确认内容 | 接入限制 |
|---|---|---|
| TP2 torch profiler | 1次Prefill和4次Decode；rank0汇总中有5次整网kernel调用 | 不能从kernel名直接推出token文本、物理页ID或每层耗时 |
| TP2 L2 swimlane | Prefill与Decode各一次capture；每次643个AICore task；40层每层16个task，另有3个层外task | 与torch profiler分属独立采集，不共享绝对时间轴；不能把一份Decode展开记录当作4次实测 |
| TP2采集脚本 | 两个Rank执行并校验；最终细粒度可视化保存rank0；按提交顺序恢复层内task布局 | 层／算子归属包含脚本恢复规则，需保留映射依据；rank1明细需逐文件核查 |
| 独立Compute Explorer PA源码 | Page128、Stack4页、Attention SPMD Blocks24；按请求和KV Head组织语义Task | 不等于TP2整网运行的执行配置，不能沿用Task%24解释该profile |
| 当前TP2 kernel汇总 | 整网kernel的Block Num20、Mix Block Num40 | 这是整网kernel的执行字段，不等于某个PA子算子的24 Blocks，也不自动证明物理core归属 |

数据入口：

- `/Users/yin/PyPTO3-main/Data/pypto_qwen3_profiles/pypto_qwen3_profiles/README.md`
- 同目录 `collect_qwen3_tp2_profiles.py`
- 同目录 `tp2/swimlane/{prefill,decode}.json`、`{prefill,decode}_trace.json`
- 同目录 `tp2/torch/prof/**/ASCEND_PROFILER_OUTPUT/{kernel_details.csv,trace_view.json}`
- `/Users/yin/PyPTO3-main/Design/PyPTO-Compute-Explorer-UI/js/paged-attention-semantic-graph.js`
- 同目录 `paged-attention-model.js`、`paged-attention-pypto-source.js`

另有`Data/vllm_pypto_inference_data/trace_view_pypto_1.json`。它作为另一运行候选单独盘点，不默认与TP2采集合并。

## 3. 数据关系与对象身份

```text
Run（模型、配置、TP、来源）
 ├─ Capture（torch / L2；各自时钟与采样范围）
 ├─ Rank 0 / Rank 1
 └─ Invocation（Prefill / Decode 1…4）
      ├─ Request（仅在输入或日志可确认时绑定）
      └─ Layer L0…L39
           ├─ Architecture Operator
           │    └─ 已匹配的runtime task / kernel / core事件
           └─ KV State（Rank、层、请求、KV Head）
                └─ Logical Page → Token Offset
                     └─ Physical Page / Slot（需真实映射）
```

约定：

1. token position、token ID、token文本分别保存。当前位置133不表示词表ID133。
2. 逻辑页号由实际page size与位置推导；物理页必须来自block_table，写入槽必须来自slot_mapping。
3. 架构OP、PA语义Task、L2 runtime task ID、SPMD计算Block、物理core分别建模，不能只凭编号相同关联。
4. 实测时长来自特定Capture；跨Capture只能做结构关联，不画成同一轮事件。
5. 稳定选择包含runId、captureId、rankId、invocationId、layerId，以及可选opId、taskId、kvHead、pageId、tokenPosition。
6. 运行步骤与临时检查对象分离。检查历史token不改变播放步骤；只有明确seek才移动播放轴。
7. Rank数量来自TP配置，指标来自该Rank可核查记录。缺失明细不复制其他Rank。

## 4. 分阶段实施

### 阶段0：证据清点与数据契约

**工作**

- 清点两个Rank实际交付文件、完整性、运行标识、时间单位和覆盖范围。
- 解析torch的5次整网调用，验证它们与采集代码Prefill／Decode顺序的对应。
- 检查Prompt token数量、每步输入位置、生成ID／文本、EOS证据是否有日志或输入快照可用；没有则使用Decode序号，不补造132等位置。
- 核查TP2实际KV布局、page size、KV Head分片与权重分片，确认其与独立PA案例的差异。
- 查清截图QKV准备阶段16 Blocks、独立源码ROPE_CORES32、PA24 Blocks的展示与执行映射。
- 明确哪些架构OP与profile task可以匹配，哪些只能做模块级关联。

**交付**

- `inference-profile-evidence.md`：来源、字段口径、可用关系及缺失项。
- 精简数据schema和稳定ID约定；每条映射带source／derived／measured及依据。

**验收门槛**

能解释每个准备上屏的数字来自哪个文件；能够区分两种Capture和独立PA案例。缺失token或物理页不阻塞后续结构视图，但必须阻止对应数值上屏。

### 阶段1：构建独立运行数据适配层

**工作**

- 从HTML内的硬编码故事拆出模型配置、运行调用、Capture、层／OP映射、KV状态。
- 离线生成最小化JSON，前端不直接加载完整原始trace或采集机私有元数据。
- 解析torch调用序列和L2提交顺序，建立可追溯的40×16层内task映射。
- 明确整网调用、runtime task和PA语义Task的不同ID空间。
- 引入runId/captureId维度，为后续接入vLLM运行保留入口；本期默认仅接Qwen TP2。

**交付**

- `inference-profile-data.json`、`inference-profile-adapter.js`，以及必要的离线提取脚本。
- Qwen运行数据和DS架构数据通过同一接口消费，允许能力字段缺失。

**验收门槛**

5次整网调用、两份643-task capture、40层及16-task布局校验通过。数据不含虚构EOS、token文本、物理页或rank1细粒度时序。

### 阶段2：播放轴改为真实运行步骤

**工作**

- 默认Qwen，轴改成Prefill → Decode1 → Decode2 → Decode3 → Decode4 → 采集结束。
- 一条播放轴承载步骤；步骤内可定位Layer／OP，不另堆一条独立layer轴。
- 保留默认自动播放、L1起始观察、layer pop与暂停／重播；自动播放和手动选中保持分离。
- 全局轴可按torch实际调用时长组织；进入L2细节时显式选择独立Capture，不把它嵌成某次Decode的实测内部时间。
- 可调演示播放速度，但缩放后的播放节奏不改写实测时长。

**交付**

运行播放状态机、单轴导航和对应状态文字。

**验收门槛**

一次播放覆盖1次Prefill和4次Decode；结束不声称EOS。seek、暂停、重播、切层和切模型互不串状态。尚无细粒度数据时不伪造按层真实耗时。

### 阶段3：Token与KV Page改为运行驱动

**工作**

- 当前请求实际有效长度决定已用位置和Page数；没有长度证据则不沿用134。
- 保留紧凑方块与Page分组，悬停显示位置，当前、历史读取、临时检查、未用容量分开表达。
- 28页/3584参考容量移入独立案例或按需容量查看；不作为TP2运行默认事实。
- 选择token联动当前Rank、Layer、KV Head、Page和offset；选择Page联动本页有效范围。
- Prefill表达批量输入与因果访问；Decode表达当前输入、新增K/V及历史读取。
- 有真实block_table后才接物理页；KV字节数只在shape、dtype、分片与分配范围已确认时计算。

**交付**

运行驱动的Token/Page总览和KV访问适配器。

**验收门槛**

覆盖页边界、尾页容量、Prefill/Decode差异；检查token不改变执行位置。容量、有效位置、物理分配三者不混淆。

### 阶段4：PA节点展开与模型内连续下钻

**工作**

- Qwen Decode的Paged Attention节点右端增加expand入口；原位展开，不新开悬浮窗。
- 复用Compute Explorer语义子图和正式图元，先对齐实际运行实现再接参数；不照搬24 Blocks或固定Tensor shape。
- 核心链：QK → Scaling/Mask → Online Softmax → PV → Context Accumulate → Output Normalize。
- 原有Q准备、K/V准备、Cache Append与K/V Cache复用为共享对象，避免把整张fused图嵌入后重复出现。
- 展开时周围节点让位、layer frame随内容扩展；收起恢复原布局和视角。主线不随layer pop跳动。
- 计算Block选择后，仅展示有依据的Task、KV Head、Page关系；保持计算Block与存储Page不同。
- DS V4同步expand交互、残差图元、子层框和返回机制；其内部子图保持SWA／CSA／HCA与HC语义，不替换成Qwen PA。

**交付**

可展开PA子图、语义映射、模型能力驱动的展开入口。

**验收门槛**

Model → Layer Front → PA展开 → 收起 → 2.5D完整往返；共享节点连续，残差与子层保留，图可拖拽缩放，无重复缓存或归一化步骤。

### 阶段5：双Rank主辅视图交换

**工作**

- 默认Layer Stack为主体、Rank缩略图在右下角；缩略Rank整体作为热区，hover提示展开。
- 点击后Rank平滑移动并放大到主体，同时Layer Stack缩到右下角；点击缩略层栈反向交换。
- 主体Rank视图并排展示Rank0与Rank1；两者都参与全部40层，不能把层数平分为两组。
- 缩略状态只负责进入主视图；放大后启用内部层、KV与执行对象选择，避免子热区抢占入口。
- 保持运行步骤、层、token、缓存检查和各自主视图camera；切换不重新播放、不重置用户pan/zoom。
- 所有Rank的实测字段按各自文件提供；缺失的rank1指标留空，保留其结构身份。
- 移除主视图中的TensorRT参考比例。未接显存快照时不使用等厚切片暗示精确内存占比。
- 仅在通信OP与数据归属有证据时展示两Rank之间的通信；不为对称而补造链路或耗时。

**交付**

双Rank主体、主辅交换动画、共享选择状态及视角恢复。

**验收门槛**

两个方向交换均保持上下文；Rank主体能切层并联动缩略Stack；缺失数据不复制；两个Rank可完整查看，不被Token表或工具条遮挡。

### 阶段6：整体验收与消融

**工作**

- 清理重复阶段标签、重复token信息、无作用按钮和常驻解释；来源与映射细节放Info按需查看。
- 全视口无限画布；底部Token保持低视觉权重；右上工具与右下视窗控件延续现有系统。
- 保留用户确认配色：蓝色#3187EC及配套文字；历史位置中灰，未用容量弱化；不新增无语义黄绿高亮。
- Qwen与DS共同回归：模型切换、播放、pop、Front、展开、关闭、主题、拖拽、滚轮、fit、tooltip与键盘操作。
- 数据验收和视觉验收分开记录，浏览器预览不等于真实设备验证。

**交付**

证据说明、精简后的页面、关键交互验收记录。经用户确认发布范围后再更新Library资源与push。

**验收门槛**

完整走通：默认Qwen → 选择Decode → 进入Layer → 展开PA → 检查Token/Page → Rank成为主体 → 选择Rank／层 → 返回Stack；全程对象与数据来源一致，两个模型的共享行为一致。

## 5. 实施顺序与阶段检查点

```text
阶段0 证据契约
   ↓
阶段1 数据适配
   ↓
阶段2 运行播放 → 阶段3 Token/KV
                       ↓
                 阶段4 PA展开
                       ↓
                 阶段5 双Rank交换
                       ↓
                 阶段6 完整验收
```

每阶段完成后先交付一个可检查的结果和当前限制，再进入下一阶段。证据缺失时缩小该功能的数据承诺，不用另一运行的参数填空。阶段4和5可以先做不携带实测数值的交互骨架，但正式接入必须服从阶段0/1的契约。

本计划默认先完成阶段0与阶段1，建立可核查的数据底座；不先增加更多格子、统计文字或装饰性连线。

## 实施记录

- 首批已建立提取器、1286条L2事件、5次torch调用及Capture/Rank隔离适配器。阶段0仍待确认输入长度、TP分片精确KV布局和独立PA Blocks映射。
- 阶段2接入Qwen五次调用摘要：Prefill、Decode1–4、采集结束；每步仍用层序动画导航，非实测层时长；整网duration保留原测量。移除Qwen伪EOS/132/133/28页容量及参考预算。
- 当前没有在各次Decode挂载独立L2时序；Qwen Token表暂显示缺失状态，待阶段3接入可靠输入记录。DS原示例保留。
- 验证：Node全页面启动、5个层序阶段与结束状态、Qwen/DS切换、Front往返通过；本批尚未做浏览器视觉验收。

- 阶段3：Qwen 显示 Prompt 0…N−1 与后续相对输入 N…N+3；未接入绝对长度与页表。
- 阶段4：Qwen Decode 原位 PA 展开核心链草稿已接入；DS 内部展开及实际运行算子绑定尚未完成。
- 阶段5首批：Qwen Rank 缩略图整体点击进入双 Rank 主体，层栈缩到右下；点击缩略层栈区域返回。两 Rank 均有40层选择，选择联动当前层，保持播放位置与原 SVG camera。复用 RankMemoryView 投影，不绘制未经确认的显存比例。Rank1 明细缺失明确保留。
- 阶段5仍待：Rank 主体独立 pan/zoom camera、共享连续动画精修与视觉验收。DS 保持原参考 Rank，不推断其 TP 数量。
- 本批验证：Node 启动及 camera 回归、两个 Rank 与各40层覆盖、Rank1选层联动和返回状态保留通过；未执行浏览器视觉验收。

- Rank 视觉修复：复用原版开放外框路径、内部缩进与顶部留隙，恢复权重/缓冲、KV与当前层切片；不显示未确认的 GiB 或占比，逻辑分区高度不代表实测容量。
- Page 修复：底部独立展示 PA 案例的28×128槽容量，页/槽检查只更新案例读数，不改变TP2步骤；当前运行仍只确认相对输入序列。Node 检查覆盖末页末槽3583与运行状态隔离。
