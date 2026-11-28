---
name: llm-compute-diagrams
description: 制作或扩展大模型计算领域的渐进式交互图解网页，涵盖 Transformer 子层、Dense/MoE、分布式并行与通信、推理和 Traceview 泳道。用于讲清计算机制及复用本系列领域图元；具体源码索引与布局核查交给 operator-mapping-investigation，完整调查界面使用 ai-infra-investigation。普通概念问答不强制生成网页。
---

# 大模型计算图解

面向正在建立 AI Infra 概念体系的读者，默认中文与可离线使用的单文件 HTML。简单概念可直接答复。具体源码索引、分块与布局用 operator-mapping-investigation；完整调查用 ai-infra-investigation。先确认对应入口可读。见[旧入口兼容说明](references/operator-investigation.md)。

## 正式图元

默认读取[已确认图元规范](references/approved-glyphs.md)和[离线图例](assets/approved-legend-library.html)，使用 manifest 指定的 SVG。浅色或 Keynote 图解读取[浅色变体](references/keynote-light-glyphs.md)。依据当前需求和正式基线核对图元，旧示例用于参考。

## 先确定要解释的关系

确定读者的问题与关系范围。区分通用机制、具体实现和例子；模型、论文、框架或 Trace 的具体结论以配置、论文、源码或原始记录为依据。按[文字规范](references/teaching-and-copy.md#技术概念与专业表达)统一术语，记录推导与假设。

按主题读取相关参考，避免把所有主题知识都塞入每次任务：

- 视觉、网页交互或图元实现：读取 [visual-system.md](references/visual-system.md)。
- 编译流程、IR、Pass、Kernel、Task 或设备指令图解：同时核对其中的流程、职责、证据与工具链边界，读取 [compiler-objects.md](references/compiler-objects.md)，复用 [compiler-primitives.js](assets/compiler-primitives.js)。该扩展保留历史实现；视觉样式以已确认图元规范为准，尤其 Task／指令为绿色矩形，Kernel 为低对比容器。
- 标题、正文、知识递进：读取 [teaching-and-copy.md](references/teaching-and-copy.md)。
- Attention、FFN、Dense、MoE、普通残差或 mHC：读取 [sublayers.md](references/sublayers.md)。
- 多卡训练、并行组和通信：读取 [parallelism.md](references/parallelism.md)。切分图例使用 [visual-system.md 的确认色板](references/visual-system.md#并行切分与-moe-图例用户确认)，区分张量填色与切分维度色；EP／MoE 标识沿用橙色。
- 生成、prefill、decode、KV cache：读取 [inference.md](references/inference.md)。
- 模型结构与 trace、泳道层级、异常联动：读取 [traceview.md](references/traceview.md)。

## 组织一条渐进的讲解线

为每步确定读者问题、结论、图中变化、解释与来源。由完整任务定位切入，依赖顺序引入细节，最终汇合为可交互总览。相邻步骤复用输入、shape、dtype、对象身份与选中位置；切换案例时明示。形状相同的 Before/After 仍需显示操作集合、类型、存储或关系的实际变化。解释区域按需展开。

## 用统一图元承载准确语义

查阅 [visual-system.md](references/visual-system.md) 和[参考 HTML 图元页](assets/reference-guide.html)，按实际关系使用矩阵、依赖箭头、资源容器或泳道。关系字段区分包含、分片、执行和时间，并保留映射依据。图元、语义色与交互依正式字典和主题参考，涵盖 Add/Multiply、已确认色板、正方形格与 shape 标注。计算所得的系数按中间值处理，可训练参数按权重处理。图例、标签、释义和总览同步。

## 复用参考，但不继承旧内容

[reference-guide.html](assets/reference-guide.html) 是用户确认过的完整离线示例，包含封面、底部文字 step 导航、右上角 info、图元释义、正方形矩阵和可缩放总览。它是视觉及交互参考，不是事实来源，也不是每个新主题的固定课程结构。

新建系列页面时可提取示例的 CSS、矩阵和连线函数、info、导航及缩放实现，先整理成统一的数据结构再扩展。示例的原始页码、重排数组、diagramId、条件分支和固定总览尺寸属于该案例；移植时同步处理，优先改为稳定页面 ID 和每张图自身的 bounds，避免复制出只能处理原 11 页的程序。

修改已有交付物时直接编辑该文件，保留用户已经接受的内容与交互；只将本次范围所需的改动引入。说明文字的修改不应顺带改变布局和图形语义。

## 实现和交付

- 默认内联 HTML/CSS/JS/SVG。新建系列按主题保留封面、单套底部文字步骤导航和右上角 Info；解释按需展开。可点击矢量总览提供 fit、缩放、拖动与复位；小屏固定图解 fit 画布，允许页面滚动。使用[画布尺度](references/visual-system.md#画布尺度与交互验收)控制默认放大上限。
- [键盘连续阅读](references/visual-system.md#键盘连续阅读)先遍历有序子态再跨页，跨页到相邻页边界，首尾停留。章节按钮按章节跳转。只保留有助理解的对象操作。
- 按[可视化交付契约](references/visual-delivery-contract.md)核对概念、shape、图元、箭头、选中解释、导航、Info、fit、缩放后命中、边界布局和离线依赖。语法、模拟 DOM、浏览器分别记录。交付实际校验过的单文件与下载入口。
- 收录 Library 时用主题图沿用目录封面尺度；按现有构建同步离线版、来源指纹与验证。已收录主题保留身份及版本，新主题单独命名；按授权发布。

接入统一 workflow 时按同组 ai-infra-investigation 的 `references/task-contract.md`（独立安装包内从本 Skill 的 `references/task-contract.md`）交付领域对象、关系、证据和缺口，由呈现 Skill 和 Systems UI 接续。

复用 catalog 分组中的模型图解时，明确选择具体变体入口，核对 renderer、依赖和该入口的浏览器记录。DeepSeek V4 与 V4.1 分别核验。
