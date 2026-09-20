# Transformer 层内图解

## 设计用途

用渐进式、可交互的图解把 Transformer Layer 中容易混淆的对象放回同一条计算链，帮助读者建立从 token、激活、参数到 Attention、FFN、残差和梯度的整体心智模型。

## 阅读提纲

- Token 如何变成模型中的数值表示
- 激活、参数与计算节点的区别
- Attention 与 FFN 两个计算子层
- 残差连接、mHC 与完整 Layer
- 输出 token 与训练梯度

## 来源与边界

原文位于 AI Infra 工作区根目录的 `transformer-layer-guide-v3.html`。本次按用户指定收录，并将原页面封面的双子层结构图用于知识卡片封面；未对文中技术结论进行独立事实复审。
