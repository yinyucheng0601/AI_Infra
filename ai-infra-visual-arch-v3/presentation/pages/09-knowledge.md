---
layout: architecture
embedded: true
---

<KnowledgeArchitecture />

<!--
领域知识：保留两个阶段，对应总览的多对象、跨层级与语义关系。
01 多对象：六类知识对象的用户导图，视角可交叉。hover 仅高亮；只有存在图例的条目支持点击锚定浮层。
02 跨层级：模型定义、执行实现、运行记录三个区域。融合原 03 的关系语义：
- Layer / GPU 的包含关系；Kernel 自身图元内包含 MatMul。
- Tensor → MatMul 的数据输入关系。
- 编译 / 资源映射使用点线空心菱形；编译可融合、拆分，不承诺一对一。
- Task → Kernel 使用长虚线开口箭头，标注调用 / 启动。
- Task 产生运行事件；Event 在 Trace 的泳道中记录。Trace 普通事件统一中性灰，无异常证据不染色。
关系均为代表性表达，不表示同一次实测运行；Trace 不编码实测持续时间。
不再有独立的 03 阶段、四卡页或其渲染分支。

01 ↔ 02 保留实际 term 锚点到正式图元的 720ms 过渡，文字和图元不拉伸。
两个阶段默认自动循环；查看浮层时暂停。方向键在 01 左侧返回前页，在 02 右侧进入下一页。
knowledge-stage 支持 1/2；旧值 3 收敛到 2。低动态偏好直接切换。
页码从 useSlideContext 读取，插页不改变交互边界。

图元来源与适配见 knowledgeGlyphManifest.json；导图与浮层来源见 public/knowledge-mindmap/provenance.json、legend-provenance.json。
卡片 gap=16，Tab 白底选中，页背景 F0F1F3。
-->
