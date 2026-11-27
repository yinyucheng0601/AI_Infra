# AI Infra Skills：职责与维护入口

面向训练与推理开发全流程，领域路由包括模型/计算、算子、编译、部署/通信与运行证据。现有规则覆盖这些任务的组织方式，不意味着已有任意框架的自动适配器。

开发者只需一个入口：**ai-infra-investigation · AI Infra 计算可视化 workflow**。它负责按任务调度，不要求用户先理解所有 Skill。机制讲解仍使用 llm-compute-diagrams，普通报错与单项查询不强制生成页面。

**识别任务与交付目标 → 建立领域模型与证据 → 定义呈现契约 → 选择并实现界面 → 按任务验收。** 直接答复可停在领域分析。机制讲解、结构浏览、实验比较和交互调查按需组合。接入 Agent Runtime 时，宿主负责事件传输和操作回传，具体绑定在案例中验证。

| 阶段或资产 | 维护入口 | 输出 |
|---|---|---|
| 调度与验收 | [ai-infra-investigation](ai-infra-investigation/SKILL.md) | 任务路由、阶段选择和交付判据 |
| 领域 · 模型/编译/部署/运行 | [llm-compute-diagrams](llm-compute-diagrams/SKILL.md) | 对象、计算与事件关系、证据与未知项 |
| 领域 · 算子 | [operator-mapping-investigation](operator-mapping-investigation/SKILL.md) | 集合、地址、分块、布局、API 与证据 |
| 共享语义 | [任务契约](ai-infra-investigation/references/task-contract.md) | 对象、关系、作用域、证据与跨层引用 |
| 呈现设计 | [呈现契约](ai-infra-investigation/references/presentation-semantics.md) 与 [observability-design-style](observability-design-style/SKILL.md) | 组件无关的定位、核查、比较、操作和结果更新约定 |
| 界面实现 | [design-spatial-systems-ui](design-spatial-systems-ui/SKILL.md) | 画布、组件、布局和交互 |
| 共享资产 | [Pattern 路由](ai-infra-investigation/references/pattern-routing.md) 与 [正式泳道接口](../patterns/critical-path-swimlane/README.md) | 按 catalog 定位正式资产，核对声明和实际入口。专项图元复核用 [ai-infra-glyphs](ai-infra-glyphs/SKILL.md) |

## 开始试用

[首次试用与 prompt](../docs/operator-visualization-trial.md)。在 checkout 中可直接让 agent 读取总 workflow；需要安装时[下载 v1.3.0 六 Skill 组合包](https://github.com/yinyucheng0601/AI_Infra/releases/download/ai-infra-skills-v1.3.0/ai-infra-investigation-workflow.zip)，其中六个同级目录分别是完整 Skill。总入口独立包提供工作流和随包工程工具。需要配套领域、呈现、实现及图元 Skill 时安装组合包。组合包不包含 Case05 原型源码，需要复用时读取 checkout。

## 单一维护源与兼容

- 每个 Skill 的指令只在对应 methods 目录维护；ZIP 是分发快照。
- 正式图元唯一源仍在 `reports/llm-compute/diagram-legend-library`；`ai-infra-glyphs/assets` 为生成快照，附来源 SHA256，不单独编辑。
- llm-compute-diagrams 已有随包图元保留为历史兼容基线，不静默更新旧报告。调查 workflow 优先使用 ai-infra-glyphs 的正式库快照，来源漂移需明确核对。
- 旧工作台 Markdown 与 Skill ID 保留，原文草案不冒充新版全部规范；新 Skill 只提取证据组织职责。
- 旧调查参考路径保留路由说明；不再维护两套调查规则。安装副本/用户软链接不自动覆盖或删除。
- 用户要求和项目约束优先；领域决定关系，图元库决定图元内部几何，工作台决定信息层级，Systems UI 决定界面呈现。

## 构建与检查

```sh
rtk python3 ai-infra-research/scripts/build.py
rtk python3 ai-infra-research/scripts/validate_investigation.py
rtk python3 ai-infra-research/scripts/validate_catalog.py
```

build 会先生成正式图元分发快照及六 Skill 组合包，再按 catalog 生成各 Skill ZIP 和页面。检查区分包完整性/引用/契约与真实任务效果；尚无跨算子通用适配器验收。提交、push 和部署是另外的授权步骤。
