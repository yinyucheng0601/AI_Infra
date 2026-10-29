---
name: ai-infra-glyphs
description: 从 AI Infra 正式图例与 Pattern 库选择并复用 Tensor、OP、存储、任务和关系图元，核对 variant、类别图标、来源和版本。用于制作技术图的图元接入或样式漂移修复；不负责领域推导或整页设计。
---

# 计算可视化图元体系

输入是领域模型中的对象/关系及所需交互。输出对象类型 → 正式 item/variant → renderer 或 SVG → 来源指纹的对应表及使用代码。

## 来源顺序

AI_Infra checkout 中的正式源为 `ai-infra-research/reports/llm-compute/diagram-legend-library/`：先读 OBJECT-SYSTEM.md，以 index.html / inventory.json 的已收录对象为准，按需读取 visual-system.js、op-icons.js 或 build.cjs 对应 renderer。review / extract 页面和旧报告不自动成为已确认资产。

离线安装时读取 [来源清单](assets/source-manifest.json) 与随包 `assets/legend-library.html`、`assets/inventory.json`。它们是正式库的生成快照，不是第二维护源；来源不可读时使用快照并报告版本。运行仓库 `scripts/package_investigation.py` 才能更新快照，不静默覆盖来源指纹。

## 接入约束

复用实际 SVG 或 renderer，不凭截图重画近似样式。静态 SVG 能用于已定义 variant；参数化或交互需求需核对 renderer。随包没有合适 renderer 时使用明确支持的静态范围，或从可读 checkout 接入；不要承诺快照本身支持任意形状。

Tensor 标签位置、OP 类别 badge/icon 由具体 variant 决定，宿主 CSS 不覆盖内部结构。抽象张量图元与逐元素索引矩阵分别使用，不将示意格数当真实元素数。矩阵需要逐元素检查时使用领域模型生成，不给每个元素强套抽象 Tensor 外壳。

OP 类别显式选择，未知类别不默认回落到 Linear。数据角色、选择与调查范围不共用一套颜色。线条区分数据依赖、映射、包含和时间关系；不把所有箭头解释为时间顺序。

缺少表达时保留可读名称和来源缺口，记录候选，不自动新增正式图元或改已定稿 Pattern。产物检查实际 SVG/DOM 的标签、类别图标、比例和选择行为；文件存在/颜色接近不算复用通过。
