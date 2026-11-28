---
name: design-spatial-systems-ui
description: 设计、优化或评审复杂系统可视化界面，采用编辑排版、开放主体舞台、中性灰与精密数据交互。用于技术图解、科学与基础设施观测、矩阵、拓扑、2D/2.5D/3D 图、时间轴及无限画布的创建和视觉改造，或明确要求 Spatial Systems UI 风格时。普通表格后台、营销页和纯内容网站不自动套用。
---

# Spatial Systems UI

## 资源与职责

先完整阅读 [风格规范](references/style-guide.md)。选择主体形式时阅读 [可视化决策](references/visualization-patterns.md)；评审与交付前阅读 [验收规则](references/review-rubric.md)。实现时复用 [设计变量](assets/design-tokens.css)，映射到现有项目变量，避免全局样式污染。实现深色空间画布悬浮控件时，阅读 [Liquid Glass 接入](references/liquid-glass.md)，复制内置 JS/CSS 到目标项目；使用已确认的小控件、面板分离预设，不重新手写光学效果。

负责界面设计与实现。接入统一 workflow 时读取呈现契约和调用约束，再选择布局、Pattern 和组件绑定。领域规则决定对象、关系和数据含义，呈现契约决定用户操作与更新条件，本 Skill 决定如何在界面实现。保留已有图元的语义规范；不要用小圆角控件规则覆盖算子图元。用户明确要求和项目约束优先，冲突时说明取舍。

## 源码调查视图

核对索引、分块或布局时，按[调查视图](references/investigation-view.md)实现开放画布、同对象联动与按需检查器。显示有证据的映射，缺口按上游契约反馈。

## 工作流程

1. 明确评审、方案或实现，读取当前页面、数据和参考。评审交付分析。
2. 按任务、焦点与数据尺度选主体形式、布局和必要状态。用位置、对齐、留白和连接表达关系。检查忽略说明后分组和差异是否仍可辨，保留名称、单位和必要状态。
3. 用偏中性的表面和宿主 token。深色空间画布区分主体和悬浮控件；Liquid Glass 使用 control、panel、icon 对应预设。投影、颜色和动效均对应数据；跨视图色标一致，热力数值保持一致的透明度口径。
4. 优先原地展开，在信息 Zoom In 中保留对象锚点。Hover 预览，点击稳定选择；精确读数进入浮层。打开检查器保留视角，无避让空间时可进入沉浸检查并保留返回状态。返回恢复视角、滚动和选择；支持键盘、触控及减少动态效果。
5. 在许可环境检查桌面和窄屏、总览、选择、浮层与缩放，按验收规则迭代。区分静态与真实渲染证据，按用户指定方式交付。

## 已定稿页面与诊断修复交互

在已批准 UI 上增量修改，或设计告警、方案选择、修复前后对照时，先读 [增量设计与修复流程](references/approved-ui-and-repair-flow.md)。保留定稿结构；优先填充分组；一项决策用一张完整卡片；用户明确的实心材质优先于默认 Liquid Glass。

## 复用与验收契约

按[可视化交付契约](references/visual-delivery-contract.md)先锁定任务路径、控件和工作台外壳，再选完整 Pattern 并校验证据。菜单、工具栏、面板和提示依风格规范第 9–10 节检查选中、hover、焦点、单一 tooltip、内容高度与分组。交互色读取[风格规范](references/style-guide.md#高亮颜色来源)。

## 既有 Demo 视觉迁移

改造已有可视化、按参考迁移另一算子或批量替换图元时，先读 [既有 Demo 迁移流程](references/demo-visual-migration.md)。先完成信息与控件消融、状态和事件盘点，再迁移共享组件；不能用持续追加 CSS 代替结构整理。局部修复按受影响契约缩小检查范围，不要求每次重新走完整流程。

接入统一 workflow 或 checkout 时，从同级 ai-infra-investigation 的 `references/task-contract.md` 与 `references/presentation-semantics.md` 读取共享契约；独立安装包内从本 Skill 的 `references/task-contract.md` 与 `references/presentation-semantics.md` 读取同版契约。

收到资产登记时，按 `tokens`、`component` 和声明的交互 API 接入宿主，核对实际文件指纹。沿用宿主选中态和键盘焦点约束。
