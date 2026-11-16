---
chapterLabel: 1 设计依据与任务
chapterLabelEn: COMPUTATION
title: 【计算机制】从执行依赖理解运行行为
layout: architecture
embedded: true
---

<ComputationArchitecture />

<!--
同样是“这里耗时特别长”，究竟是在等待内存数据搬运，还是存在资源争用？这涉及计算、访存、通信、同步和资源调度等硬件与执行约束，需要结合运行证据进一步判断。

现在计算开发的一个趋势是，上层计算逻辑越来越抽象，底层执行和硬件资源的关系却越来越复杂。开发者即使理解了计算逻辑，也不容易直接判断它在硬件上如何执行，以及性能差异究竟来自哪里。
-->
