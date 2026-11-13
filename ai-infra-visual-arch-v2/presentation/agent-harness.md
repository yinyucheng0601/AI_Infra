---
theme: none
title: AI Agent 多层循环计算架构与 Agent-Native 人机交互架构
aspectRatio: 16/9
canvasWidth: 1440
transition: fade
---

<AgentHarnessArchitecture :detail="false" />

<!-- 五个职责域，不是五层堆栈。Engineer Intent 委托目标；Agent Orchestration 内包含 Harness 的迭代机制，通过模型和工具行动。Instrumentation 提供静态资料与运行记录；Semantic & Evidence Model 统一对象身份、执行上下文、观测、证据引用和发现。Workspace 查询投影此模型，三个领域共享导航、跨层追踪、检查器与证据交互。基础设施服务和 LLM 是依赖能力，不再与 Agent 放在同一层级。 -->

---

<AgentHarnessArchitecture :detail="true" />

<!-- RMSNorm 诊断方案，尚未载入实际运行数据。任务可迭代，假设与发现分别引用证据，证据可以复用。Finding 只有经核验并明确适用范围才能形成工程判断，不将假设自动提升为结论。Source→IR 是降低，IR→Tile 是调度和分块，Tile→Memory 是地址映射；Memory→Device 表示运行定位，不是静态变换。点击对象只切换同一工作空间中的检查上下文，实际 Trace、原始文件和实验产物均需真实数据绑定。Task Status、Finding Type、Validation Status 是不同字段；类型不代表通过。 -->
