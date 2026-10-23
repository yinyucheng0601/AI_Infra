# DeepSeek V4 · 模型架构

[打开交互 Pattern](index.html?level=l0)

2026-10-22 用户完成多轮视觉与交互评审，明确确认 V4 定稿并收录 Library / Patterns。

## 收录范围

- L0 整网概览、L1 模型架构、L2 CSA 计算语义。
- mHC 残差旁路、算子、Tensor、参数与 KV 状态的分层表达。
- 模块折叠展开、关联路径 hover、画布拖拽缩放、深浅主题及来源检查。

## 来源与维护

这是 `pto-design-system/patterns/model-architecture-v4` 定稿版本的展示快照，类型为 hybrid-pattern。`vendor/` 仅包含页面必需的共享渲染器、V4 数据及样式，不是另一套独立实现。后续修改应先更新来源，再同步快照及 `source-manifest.json` 中的 SHA256。来源源码不随页面打包，来源位置作为元数据保留。模型结构依据本地 DeepSeek V4 Flash 源码及配置，运行时值未采集。

## 验证

来源布局回归覆盖 63 种 CSA 展开组合；本次收录检查资源闭包、目录契约、JS 语法与来源文件哈希一致性。视觉验收沿用用户对定稿版本的确认，本次不另运行浏览器自动化。
