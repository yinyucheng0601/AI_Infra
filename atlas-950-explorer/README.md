# Atlas 950 · 3D Explorer

基于公开资料的非官方概念展示。默认是代表性计算机柜，不是完整超节点；板卡布局与管线不代表官方工程结构。

## 运行

直接打开项目根目录的 `index.html`：这是包含模型、贴图和脚本的独立 HTML，可离线预览。

`dist/` 保留拆分的 HTML、CSS、JavaScript 和模型资源，方便修改。如需预览拆分版本，在此目录运行 `python3 -m http.server 8765 --directory dist`，访问 http://localhost:8765。

修改 `dist/` 后，需要同步更新根目录的独立 `index.html`。

静态页面，无构建步骤。Three.js、Draco 与模型均随站点本地提供，不依赖 CDN。

## 交互

拖动旋转、滚轮缩放；左侧选择机柜、计算节点、NPU、互联、电源或液冷。计算节点可移开冷板。右上角支持自动旋转、隐藏外壳和关闭网格。Home 返回机柜，Escape 关闭视图选项。

## 内容边界

- 2026 年 7 月华为公布的 1024 卡、256 TB、1 EFLOPS FP8 仅用于关于面板，属于整套超节点指标。
- 单柜模型不宣称准确卡数、功率或尺寸。
- 昇腾标识为文字字标，非官方矢量 Logo。
- 原始基础机械模型来自 Oxide Explorer，独立 Logo 网格已在衍生 GLB 中移除；原始下载不变。
- 页面实现为独立代码，未使用原站压缩应用脚本。

## 资料

- https://www.huawei.com/cn/news/2026/7/atlas-950-superpod
- https://www.huawei.com/cn/news/2025/9/hc-superpod-innovation
- https://explorer.oxide.computer/
