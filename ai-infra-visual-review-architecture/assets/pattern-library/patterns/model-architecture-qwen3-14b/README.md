# Qwen3-14B 模型架构 Pattern

入口：index.html。独立维护于 AI_Infra。

三个证据视图：官方模型架构（单层选择）、动态 Paged Attention 示例、TP=1 采集调用入口。

model_architecture.json 是事实层；model_architecture_graph.json 保存层级；adapter.js 负责投影布局，preview.js 复用已有查看器交互。sources/ 保存配置及逐行可查看的源码。vendor/ 为已确认图元和主题依赖。

此页面尚未登记为已验收 Library 资产；待用户确认后收录。
