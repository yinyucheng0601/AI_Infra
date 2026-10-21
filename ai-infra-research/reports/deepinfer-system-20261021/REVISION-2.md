# Revision 2 — DeepInfer performance atlas

## Revision 2.1

按用户反馈更新同一 HTML：封面增加 DeepInfer 和 DeepSeek Recipe 的官方开源背景、仓库链接及官方系统说明。01 页按用户附图和官方仓库 `doc/images/architecture_overview.png` 重绘 Recipe、Entrypoint、三个阶段 Load Balancer、服务副本、实例内部 EPLB 及 External KVCache Storage。请求/响应与 KV 路径分别编码；切换状态突出 DeepInfer 的引擎定位。

全篇标题与导语改为简洁的专业主题表述；修正 DSpark 指向性能章节的文字，并把完整图的四项性能因素改为并列关系，避免乘号暗示数学乘积。

补充来源核查：官方 Q&A 明确链接到知乎文章 `https://zhuanlan.zhihu.com/p/2095560295930508953`。本次原文请求返回 403，未宣称读取全文；GitHub 官方 Q&A 可访问，官方图与用户截图的结构一致。文章链接保留为延伸阅读，具体补充事实依据已读 Q&A 和官方图。

检查：12 页 31 状态逻辑验证通过；系统图两状态包含全部 11 个关键组件，SVG XML、唯一 ID 与估计画布文字边界检查通过；现有目录校验通过。浏览器验证沿用下述限制。

交付：`../llm-compute/deepinfer-performance-atlas-v2.html`。

用户指出第一轮缺少独立封面，页面可视化过于简陋。参考用户提供的 `deepinfer-performance-atlas-v1.html` 中的封面、张量、rank、负载条和泳道表达，重新组织为 DeepInfer 的实现解读。

12 页包括独立封面与 11 个内容章节。图解按主题单独绘制：服务拓扑、一次 Decode、Mega mHC 融合与消费者布局、Attention 索引与 KV、EPLB 物理槽位、Wide-EP、DeepEP / Mega MoE、DSpark、ZOS、官方性能数据、完整执行图。共 31 个离散阅读状态。

来源仍固定到 `9bd9cf243fc53ef9afbf8f04d391d989117d6ab9`。正文和对象释义直接指向该 commit 的具体源码行。性能页复绘官方 Q&A 表格，没有把该表的估算吞吐写成本地测量。EPLB 采用固定三步负载输入，按源码复制/放置规则推导；数据保存在 `v2-content.js`，每卡 3 槽，逻辑工作总量每步 80。

静态验证通过：JavaScript 语法、12 页和 31 状态的 SVG 生成、对象释义与唯一 ID、连续键盘阅读、跨页首末状态、输入控件方向键保护、缩放复位、官方来源路径/行号、EPLB 容量/工作量守恒、数据表关键值、离线依赖。SVG XML 解析及估计文本画布边界检查通过。现有 catalog 校验通过；本次没有修改目录。

浏览器验证受阻：CUA 对 `file://` URL 返回安全策略拒绝（仅允许 HTTP/HTTPS）。没有换端口、浏览器表面或其他方法绕过该限制。未完成浏览器视觉验收，未运行硬件推理基准。

重建：`rtk python3 build_v2.py`。检查：`rtk node verify_v2.cjs`。验证器核对原仓库路径时使用上一轮保留的临时 checkout；离线 HTML 的内容和交互不依赖该 checkout。
