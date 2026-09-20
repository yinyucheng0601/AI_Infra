# ai-infra-research

AI Infra 设计研究与资产库。

[在线浏览知识库 · GitHub Pages](https://yinyucheng0601.github.io/AI_Infra/ai-infra-research/index.html)

面向设计成果盘点、内部汇报和团队资产积累，连接领域知识、设计案例、视觉模式及可执行的设计方法。不是技术项目大全，也不是源码镜像。

## 内容入口

- [Skill 库](skills.html)：可复用技能、示例与完整技能包；与知识库共用顶部导航，Pattern 暂未开放。
- [知识库](knowledge/README.md)：整理后的领域知识与研究洞察。
- [设计案例](cases/README.md)：问题、设计推演、方案与结果。
- [视觉与交互模式](patterns/README.md)：Web、TUI、3D 等表达与交互资产。
- [方法与 Skills](methods/README.md)：验证过的方法；第三阶段再封装 Skills。
- [资产目录](catalog/README.md)：统一索引、来源和关联关系。

当前完成第一阶段框架与第二阶段首批知识库实现：18 篇内容，来自 AI Infra、PTO、PyPTO Insight、DevKit 和盘古用户研究。分类支持多选，并区分模型训练、模型推理和竞争分析；A5 PMU 中间稿及三篇不纳入汇报范围的过程文档已排除。仅代表人工筛选和来源核对，不代表来源项目整体收录或视觉效果已验收。

[完整项目计划](docs/project-plan.md) · [运行与维护](docs/running.md) · [验证记录](docs/validation.md)

首页为 `index.html`；PTO 根目录 `whitepaper-gallery.html` 是同一套源文件生成的兼容入口，继续从 launch-v2 进入。不要分别手改两份页面。

## 建设顺序

1. 框架：定位、分类、收录规范、资产格式与协作规则。
2. 知识库：人工筛选、整理内容，再建设分类导航和卡片展示。兼顾汇报阅读与团队检索，不自动导入所有候选。
3. Skills：将已验证方法转为明确输入、输出、示例和质量检查的操作流程。

## 从哪里开始

先读 [收录规则](docs/scope.md) 和 [协作流程](docs/contributing.md)，再使用 [资产模板](templates/asset.md)。现有实现保留在原仓库，本仓库先管理索引和精选内容。

本仓库按内部用途建设，但 Git 本身不提供访问控制。创建远端前需确认私有权限；不得提交密钥、原始访谈或未经审查的敏感数据。

验证资产目录：`rtk python3 scripts/validate_catalog.py`（仅标准库）。本地预览：`rtk python3 scripts/serve.py`，默认 http://127.0.0.1:8766/。首次运行前参照运行文档配置来源映射。
