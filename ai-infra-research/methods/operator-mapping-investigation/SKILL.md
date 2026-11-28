---
name: operator-mapping-investigation
description: 核查算子源码中的多维索引、线性地址、分块、搬运后布局与计算集合，建立可独立验证的映射模型及源码证据。用于具体布局与边界假设调查；不负责页面样式，不从任意源码自动诊断瓶颈。
---

# 算子映射调查

读取[建模与验证流程](references/mapping-workflow.md)。从固定 revision 的 Host / Kernel 生效分支与当前配置出发，独立核对普通和边界对象。命中固定 Compact FP16 Unpack 时使用该参考的专用路径。

交付独立于界面的模型、稳定 ID、带文件/行号/revision 的证据、成立条件和缺口。在统一 workflow 或 checkout 中按同组 ai-infra-investigation 的 `references/task-contract.md` 交接；独立安装包内从本 Skill 的 `references/task-contract.md` 读取同版契约；仅需分析时在此交付。

复用已有算子 Pattern 时，在交付记录关联算子源码指纹、catalog 入口及该入口已通过的交互用例。交互通过仅覆盖界面行为，映射正确性仍由独立索引模型与源码证据确认。
