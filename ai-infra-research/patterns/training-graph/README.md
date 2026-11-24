# 分布式训练 · Training Graph

当前功能、参数约束与验收基线见 [SPEC.md](SPEC.md)（2026-11-23）；下文含按日期保留的历史迭代记录。

公开入口：`index.html`，离线单文件：`training-demo.html`。本目录为 Library 维护入口，包含配置、图结构、布局、SVG 增量更新与测试源码。

复用正式 Tensor/OP 图元、Layer Stack 进度轨道及 Dense→MoE 路由数值。10 步推导，支持 TP/SP、Dense/MoE 与 EP 配置、token 路径、全窗口画布与 FFN 聚焦。PP、CP、独立 DP 调节未实现。

通过 `python3 build-offline.py` 重建离线文件；`node verify-graph.cjs`、`node verify-renderer.cjs`、`python3 verify-math.py` 验证模型与渲染契约。324 配置是测试排列，非同时渲染数量。

路由数值与符号训练图分开；GeLU 专家，4 专家 Top-2，无容量截断。专家组内 TP，组间 EP，本例 world_size=TP×EP，TP+EP 时有效 SP 开启。其余技术依据见页面 info 与 sources-audit.md。

维护验证：2026-11-19 配置/路由/增量更新与数学检查通过；浏览器启动异常，最新视觉验收尚未完成。

## 可调专家数（2026-11-19）

支持 E=4/8/16/32/64，固定 H=8、F=16、Top-2、每位 GeLU 专家 256 参数。MoE 分支总参数 264E（专家与 Router）；单 token 使用 512+8E 个矩阵参数。负载统计限定来源组 0 的当前 8 token 样本，16 次调用，不冒充全部 EP 来源的负载。新增 Router 列采用固定正弦权重，前 4 列保留参考报告，所有 top-2 与 softmax 系数实际计算。专家数不改变 EP 或 Rank 总数。

4/8 专家展开三算子；16/32/64 使用紧凑阵列，点击专家在悬浮面板展开正式 OP 内部图。专家数独立滑轨位于主轨上方，调整后联动 shapes、统计、EP 分组与镜头。612 组合及 5 种规模的路由/参数量/完整分组检查通过。

本轮桌面浏览器验证：1440×1000 下 5 档切换、64 专家渲染、点击展开及 EP 步骤中专家滑轨 Home/ArrowRight/End 原生键盘调节通过；无脚本异常。检查了紧凑阵列的标签与对比度，未覆盖移动端。浏览器测试入口 verify-browser-experts.cjs。

MoE 步骤默认直接展开专家，移除 Dense/MoE UI 开关，原二级滑轨直接调专家数；EP 步骤保留专家数和 EP 两个独立参数。

紧凑专家恢复正式 OP 内部 20px 字号和 256px 节点宽度，与同图算子同一比例；整行堆叠的 EP 分组使用相同 x 坐标，移除组间水平偏移。

Top-2 路径保留原有灰色 OP；只将未入选专家设为 opacity=0.35。桌面浏览器检查 5 档专家规模下恰有两位专家强调，并验证实际计算样式。

## Rank 主辅画布（2026-11-20）

默认右下角呈现当前典型 Rank；点击与计算图互换主体，保留步骤/参数/选择和独立镜头。复用本地 `model-parallel-rank-deck` 的五个纯规划函数（原函数体保留，未加载其 Three.js/OpenPangu 渲染路径）；复用参考页 `rank-memory-view.js` 的轴测几何 API，未调用预算 renderer。来源指纹见 rank-pattern/provenance.json。

rank-model.js 对当前单个 Block 建立 TP/EP/权重/边界激活行的适配，不扩展 PP/CP。前四步为未映射部署的逻辑计算；TP/SP/取数步骤表达组内权重与激活/梯度归属；MoE 步骤专家池待分配；最后一步显示 E/EP 归属和组内 TP 权重分片。EP peer 为不同专家组的同 TP lane，token 路由包含分发和返回；无跨组分配时明确显示本组。

Rank 的等高逻辑带仅表示对象类别，不编码字节、容量、显存比例或实测生命周期；不复用推理 KV 预算。Norm 参数、优化器状态和真实内存缓冲大小尚未建模。

验证：verify-ranks.cjs 检查 810 种状态的数量/组/专家范围/SP 行；verify-browser-ranks.cjs 在 1440×1000 检查九步、实际点击互换、SVG 可见性、专家→Rank、检查器变化、工具缩放与镜头恢复，并检查主/辅最终画面。移动端仅做控件避让，未完成设备视觉验收。

## 用户专家图元（2026-11-20）

专家数 >8 使用用户提供的 expert-icon.svg 原始两矩形结构、71:91 比例及动态 E00–E63 编号；不再使用线性类别 badge 或 OP 胶囊。4/8 专家保留展开计算。计数位于图标下方，边的端口按实际图标边界重算；Top-2 保持原色，其余 opacity=0.35。来源见 expert-icon-provenance.json，原图不含文字，编号由 expert-glyph.js 叠加。

修正 Rank 色带撑满问题：角色带使用固定布局高度，顶部保留开放区域，不按容器高度归一化；视图标注容量未配置，不将留白解释为已测量的空闲空间。专家图标文字按普通 OP 的最终画布字号 20×256/360 校准，抵消图标自身缩放比例。

专家图标高度进一步统一为普通 OP 高度 256×64/360；宽度按 71:91 等比缩放。字号仍按最终画布字号对齐，紧凑网格按实际边界重新布局。

## Rank 视图消融与缩略 fit

计算图缩略画布扩大为 390×315（1.5 倍），按完整计算图独立 viewBox 居中 fit，重置仅用于缩略显示的平移缩放；返回时恢复保存的主画布镜头。Rank 主视图移除单卡背景/标题、底部重复 Rank 标签、容量横幅和每组重复通信说明，保留组归属及连线。左侧说明按九步适配 Rank，视图交换时恢复对应说明；容量未知保留在左侧范围说明中。

## 固定部署资源（2026-11-20）

前四步没有 Rank 归属；从 TP 步骤开始固定部署 8 个 Rank，且 Rank 0–7 的位置保持不变。PP=CP=1，稠密层 DP=8/TP，EP 在 DP 维内分组，同一专家的副本数 EDP=DP/EP；planner 采用 TP×EP×EDP=8 的坐标分解。TP=4 时 EP 最大为 2，控件按可用度数收敛。EP 不增加资源，专家数也不改变资源。专家图展示副本 0 的路由，检查器列出所有专家副本的 Rank；Rank 视图展示全部副本。DP/EDP 梯度同步关系在检查器中给出，计算图暂不展开这些同步算子。

### Step 10 顶视重做（2026-11-23）

顶视现接入完整灵衢 POD/板/设备与互联 Pattern，替代 64 Rank 方格及逻辑折线。内置 Mock 使用显式配置的落位，点击板行下钻、POD 面包屑返回，指标仍可从 Rank 详情追溯。实际 Headless Chrome 1440×1000 已检查 POD、板、设备选择与视角恢复；详见 [实现与证据](observation/IMPLEMENTATION.md)。

## 部署与 TraceView 发布（2026-11-24）

第 10 步默认 Top：复用已确认的深浅硬件 SVG、POD / 板级拓扑和 2.5D / 正视 / 侧视切换。右下角缩略图点击互换主体，独立相机；器件点击只更新选择与关联，不再弹出遮挡面板。设置、导入、层级、token 和 TraceView 开关收进右上角设置入口。

关联线按 TP / 缓存 / EP / DP 等语义着色，EP 为 #FF9500；中性线及其端点为 40% 白色。独立 TraceView 复用 hierarchical-timeline / swimlane-task，与 Rank 和通信类型双向选择。当前 8 Rank 配置使用可追溯的 64 事件 Mock，内置 EP64 数据保持独立来源；未对齐的 Rank 时钟不伪造统一时间轴。

见 [布局与交互验证](deployment-validation.md)、[观测 schema](OBSERVABILITY-SCHEMA.md) 与 [Mock 样本](observation/configured-trace-mock.v1.json)。
