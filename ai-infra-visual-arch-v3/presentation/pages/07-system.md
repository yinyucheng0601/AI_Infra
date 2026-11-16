---
chapterLabel: 4 落地实现
chapterLabelEn: DESIGN ASSETS / SKILL
layout: demo
embedded: true
clicks: 4
---

<DeckScene scene="system" subtitle-html="将设计资产嵌入工程调查，持续支撑三钻协同。" glyph-title="01 原子图元" pattern-title="02 组合 Pattern" framework-title="03 框架画布 · Pass Error Cases" />

<!--
一个agent怎么才能稳定有效能输出前面案例这样的可视化工具呢？这就需要把设计经验沉淀成代码和能力并且不断地自我迭代。

这里我们组有同学在研究上层的 Agent Harness，负责规划调查、调用工具和执行验证。我主要负责下面的设计层，通过 Design Skills 和 MCP，让 Agent 能够根据当前问题和证据，选择、组装并核查可视化表达。

具体沉淀为三类资产。

首先是**图元**，统一 Tensor、OP、Memory 等计算对象的视觉语义，让不同场景保持一致。

其次是 **Pattern**，把执行泳道、模型层级、参数联动等关系表达沉淀下来，让 Agent 根据问题选择合适的可视化方式。

最后是**交互框架**，统一画布、导航和核查面板，让复杂关系能够在同一个工作空间里逐步展开。这用一个内存案例，看看这些设计怎么用框架组合起来。

画布中展示了某个pass把四路绑定指向同一个内存地址，agent检查发现了问题和证据呈现在核查面板中，但是可视化本身还不足以给出解决方案，继续调查就是harness需要衔接的能力了，比如接入业务开发的一些cannbot skills，就能进一步实现校错调优。

这也对应了 Skill 的工作流程。先明确工程问题和现有证据，再决定需要表达什么关系，组合已有的图元、Pattern 和框架，最后核查对象绑定、交互和来源。
-->
