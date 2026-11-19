# 分布式训练 · Training Graph

公开入口：`index.html`，离线单文件：`training-demo.html`。本目录为 Library 维护入口，包含配置、图结构、布局、SVG 增量更新与测试源码。

复用正式 Tensor/OP 图元、Layer Stack 进度轨道及 Dense→MoE 路由数值。9 步推导，支持 TP/SP、Dense/MoE 与 EP 配置、token 路径、全窗口画布与 FFN 聚焦。PP、CP、独立 DP 调节未实现。

通过 `python3 build-offline.py` 重建离线文件；`node verify-graph.cjs`、`node verify-renderer.cjs`、`python3 verify-math.py` 验证模型与渲染契约。324 配置是测试排列，非同时渲染数量。

路由数值与符号训练图分开；GeLU 专家，4 专家 Top-2，无容量截断。专家组内 TP，组间 EP，本例 world_size=TP×EP，TP+EP 时有效 SP 开启。其余技术依据见页面 info 与 sources-audit.md。

维护验证：2026-11-19 配置/路由/增量更新与数学检查通过；浏览器启动异常，最新视觉验收尚未完成。
