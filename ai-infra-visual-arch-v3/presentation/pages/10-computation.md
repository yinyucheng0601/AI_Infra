---
title: 【计算机制】从执行依赖理解运行行为
layout: architecture
embedded: true
---

<ComputationArchitecture />

<!--
三段布局：计算机制（含五类机制的相互制约）、执行映射、A/B 运行结果对比。
A/B 数据就绪时刻一致，计算区间等长；资源可用时刻不同造成完成延迟。相对区间非实测 Trace。
图中使用普通文字块表示计算逻辑、任务与资源，不使用正式 OP / Task 图元；任务按类型映射资源。
AIC/AIV 保留整块点击与原地硬件结构小面板。
-->
