# AI Infra Skills：职责与维护入口

面向训练与推理开发全流程，领域路由包括模型/计算、算子、编译、部署/通信与运行证据。现有规则覆盖这些任务的组织方式，不意味着已有任意框架的自动适配器。

开发者只需一个入口：**ai-infra-investigation · AI Infra 计算可视化 workflow**。它负责按任务调度，不要求用户先理解所有 Skill。机制讲解仍使用 llm-compute-diagrams，普通报错与单项查询不强制生成页面。

| 顺序 | Skill | 独立职责 | 不承担 |
|---|---|---|---|
| 调度 | [ai-infra-investigation](ai-infra-investigation/SKILL.md) | 输入、阶段调度、冲突处理与验收 | 通用自动诊断 |
| 领域 · 模型/编译/部署/运行 | [llm-compute-diagrams](llm-compute-diagrams/SKILL.md) | 按主题组织计算、变换、分布与事件关系 | 任意框架自动解析 |
| 领域 · 算子 | [operator-mapping-investigation](operator-mapping-investigation/SKILL.md) | 集合、地址、分块、布局、API 与证据模型 | 页面样式 |
| 2 | [ai-infra-glyphs](ai-infra-glyphs/SKILL.md) | 从正式库选择 variant / SVG / renderer | 领域推断 |
| 3 | [observability-design-style](observability-design-style/SKILL.md) | 总览、检查器、前提与调查交接 | 材质与配色重定义 |
| 4 | [design-spatial-systems-ui](design-spatial-systems-ui/SKILL.md) | 布局、尺度、选择、缩放与面板 | 改写数据和图元内部语义 |

## 开始试用

[首次试用与 prompt](../docs/operator-visualization-trial.md)。在 checkout 中可直接让 agent 读取总 workflow；需要安装时下载 `ai-infra-investigation-workflow.zip`，其中六个同级目录分别是完整 Skill。总 workflow 单独 ZIP 不包含其余阶段；不应只装总入口就宣称已具备整条流程。组合包不包含 Case05 原型源码，需要复用时读取 checkout。

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
