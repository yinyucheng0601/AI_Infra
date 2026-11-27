# Keynote 浅色图元变体 · 2026-11-18

入口：`assets/keynote-light/manifest.json`，逐项复用 SVG。完整正式图例库快照：`assets/keynote-light/legend-library.html`。本变体来自 AI Infra 视觉设计框架 keynote 的实际图元，不覆盖深色基线。manifest 保留对象、显示尺寸、源描述与 SHA256。

- Tensor：保留正方形网格与宽高比例；浅底使用深色可读文字。参数与激活的角色色保持语义，不能把所有 Tensor 涂成同一种颜色。shape 是属性，不是物理资源。
- OP：复用 MatMul/Operator 的 fₓ 变体，保持图标圆底相对胶囊的原始比例，不缩小圆底。浅色胶囊不加 border；MatMul 等算子不可用 Attention 模块图标替代。Attention、FFN 等模块使用对应模块表达。
- Kernel：复用完整 projection / AIC / MatMul 容器，浅色外容器白色 fill；Kernel 与其内部 OP 分层表达，不把它们当同类节点。
- Rank：复用四角圆点的资源容器；浅色圆点低对比、小圆角。Rank 是执行身份与资源映射语境，不能用 GPU/Core 文本或普通任务块替代。
- Task、DMA、Pass、IR、Add、Collective 等使用 manifest 中对应对象；Add 和 Multiply 的圆形符号与 OP 胶囊语义不同。
- Trace：复用 trace-pattern.svg 的紧凑泳道与细事件；正常事件统一去色，仅异常事件使用强调色。Trace 是记录/证据容器，Event 是其内部事件，不能作为同类执行任务平铺。
- 连线使用圆角正交折线，区分结构/数据依赖、编译执行映射、运行证据关联。端点依据实际对象边界计算。跨层映射不等于算子数据依赖。
- 总览可用白底对象 tag，展开时转为正式图元，保留稳定 ID、对象身份与位置过渡。没有正式图例的术语保留文字，不伪造图元或可点击状态。
- 深浅主题分别复用，不将浅色外观当成所有主题的强制色板；不改变 SVG viewBox 与局部几何，统一等比缩放。

## 校验

逐项核对 manifest 哈希；长名称、Tensor 标签、fₓ 圆底、Kernel 容器、Rank 圆点及 Trace 异常高亮应与源图元一致。组合时对 defs/marker/clipPath ID 加实例前缀。SVG 文件已从 keynote 内嵌数据直接解码，不重新绘制。
