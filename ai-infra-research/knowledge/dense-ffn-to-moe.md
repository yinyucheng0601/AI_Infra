# 从 Dense FFN 到 MoE

以渐进交互图解解释 Dense FFN、SwiGLU、专家路由、分发与加权合并，以及它们在 Transformer Layer 中的位置。

## 阅读提纲

- FFN 子层边界与逐 token 的共享参数计算
- 两层 FFN 与 SwiGLU 门控
- 专家集合、Router、Top-k 与按专家分组
- 加权合并、残差、参数容量与计算开销
- MoE 子层及完整模型总览

## 来源与验证

来源：AI Infra 根目录 `dense-ffn-to-moe-v1.html`。

2026-09-20：按用户要求收录，直接提取源页面 coverDiagram 的封面 SVG，转换为白底浅色缩略图；未独立复审技术结论。
