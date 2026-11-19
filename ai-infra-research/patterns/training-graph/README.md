# 分布式训练 · Training Graph

公开入口：`index.html`，离线单文件：`training-demo.html`。本目录为 Library 维护入口，包含配置、图结构、布局、SVG 增量更新与测试源码。

复用正式 Tensor/OP 图元、Layer Stack 进度轨道及 Dense→MoE 路由数值。9 步推导，支持 TP/SP、Dense/MoE 与 EP 配置、token 路径、全窗口画布与 FFN 聚焦。PP、CP、独立 DP 调节未实现。

通过 `python3 build-offline.py` 重建离线文件；`node verify-graph.cjs`、`node verify-renderer.cjs`、`python3 verify-math.py` 验证模型与渲染契约。324 配置是测试排列，非同时渲染数量。

路由数值与符号训练图分开；GeLU 专家，4 专家 Top-2，无容量截断。专家组内 TP，组间 EP，本例 world_size=TP×EP，TP+EP 时有效 SP 开启。其余技术依据见页面 info 与 sources-audit.md。

维护验证：2026-11-19 配置/路由/增量更新与数学检查通过；浏览器启动异常，最新视觉验收尚未完成。

## 可调专家数（2026-11-19）

支持 E=4/8/16/32/64，固定 H=8、F=16、Top-2、每位 GeLU 专家 256 参数。MoE 分支总参数 264E（专家与 Router）；单 token 使用 512+8E 个矩阵参数。负载统计限定来源组 0 的当前 8 token 样本，16 次调用，不冒充全部 EP 来源的负载。新增 Router 列采用固定正弦权重，前 4 列保留参考报告，所有 top-2 与 softmax 系数实际计算。专家数不改变 EP 或 Rank 总数。

4/8 专家展开三算子；16/32/64 使用紧凑阵列，点击专家在悬浮面板展开正式 OP 内部图。专家数独立滑轨位于主轨上方，调整后联动 shapes、统计、EP 分组与镜头。612 组合及 5 种规模的路由/参数量/完整分组检查通过。

本轮桌面浏览器验证：1440×1000 下 5 档切换、64 专家渲染、点击展开及 EP 步骤中专家滑轨 Home/ArrowRight/End 原生键盘调节通过；无脚本异常。检查了紧凑阵列的标签与对比度，未覆盖移动端。浏览器测试入口 verify-browser-experts.cjs。

MoE 步骤默认直接展开专家，移除 Dense/MoE UI 开关，原二级滑轨直接调专家数；EP 步骤保留专家数和 EP 两个独立参数。
