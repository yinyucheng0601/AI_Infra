---
name: observability-design-style
description: 将 AI Infra 领域模型组织成机制讲解、结构浏览、实验对照或交互调查的呈现契约，明确用户定位、核查和后续操作。证据工作台用于观测和源码调查；界面由 Systems UI 或项目设计系统实现。
---

# AI Infra 呈现设计

输入是任务目标、领域模型、稳定对象 ID、证据与未确认项。按同级 ai-infra-investigation 的 `references/presentation-semantics.md` 输出组件无关的呈现契约。独立安装包内从本 Skill 的 `references/presentation-semantics.md` 读取同版契约。领域事实由上游维护，组件绑定交给界面实现。

## 调查模式 · 证据工作台

按[证据组织与交接](references/evidence-workbench.md)定义总览定位、详情核查、候选复核和结果返回。分别表达候选、失败与证据不足，操作沿同一对象引用返回原始证据。验收用户能否定位、核查和继续调查。

[旧工作台设计系统](observability-design-system.md)提供历史参考。材质、2.5D 与组件样式由当前项目或 Systems UI 决定。

使用资产登记中的交互契约核对交接路径。验收记录分开标明 catalog 历史验证、当前依赖核验和当前浏览器用例，并注明各自覆盖的入口。
