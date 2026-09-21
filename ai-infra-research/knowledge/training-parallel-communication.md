# 多卡并行配置与通信图解

从训练任务出发，解释各 Rank 持有的数据与计算职责，以及跨卡通信产生的原因。

## 阅读提纲

- 并行策略、通信语义与实现算法的层级
- DP、TP、PP、CP、SP 与 EP
- 集合通信、P2P 与 Ring 逐轮演示
- ZeRO 状态分片与并行组配置
- 追踪 Rank 并查看训练计算依赖

## 来源与验证

来源为知识库图解目录 `reports/llm-compute/training-parallel-communication-v1.html`。
2026-09-21：按用户要求收录并发布，提取源页面封面 SVG 并转换为浅色；未独立复审技术结论。
