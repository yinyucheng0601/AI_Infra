# NPU Memory Atlas

训练内存轴测交互的基准 Pattern 与衍生方案。基准来自 `npu-memory-atlas-training-v10.html`，于 2026-09-30 整理；页面内容原样保留。

## 文件组织

- [index.html](index.html)：基准页面，后续方案以此为起点。
- [npu-memory-atlas-embed.js](npu-memory-atlas-embed.js)：基准和现有衍生版的嵌入通信适配脚本。
- [variants/](variants/)：衍生方案，每种方案单独命名，避免覆盖基准。
- [variants/liquid-glass.html](variants/liquid-glass.html)：整理前已有的 Liquid Glass 方案，保留其原有实现。
- [历史评审记录](../reviews/npu-memory-atlas-training-v10-2026-09-28/README.md)：历史快照与评审范围，原位置保留。

## 衍生约定

1. 复制 `index.html` 为 `variants/<方案名>.html`，将脚本引用改为 `../npu-memory-atlas-embed.js`。
2. 方案专属资源放入 `variants/<方案名>/`；如果需要改嵌入协议，使用方案自己的脚本，避免影响基准。
3. 在本文件登记方案入口、目标与验证情况；未经明确决定，不将衍生改动回写基准。
4. 基准本身需要更新时，记录变更原因、验证结果和新 SHA256，再运行现有回归检查。

## 基准与验证

- 整理时基准 SHA256：`09834f47dc35a20fae8bb53ae0c5eca68a36b2ab4b9dae55c24e45494ac887fd`。
- 本次为目录整理，不表示新增设计评审。历史 UI approved 范围与后续待评审项以评审记录为准。
- 数据与训练过程是教学模拟，不代表实测数据。
- 外层旧版 HTML 入口已移除；已有嵌入页面改为直接引用本目录的基准入口。
- 目录入口由 `catalog/assets.json` 管理，展示页通过 `scripts/build.py` 生成。

## 方案登记

| 方案 | 入口 | 目标 | 验证情况 |
| --- | --- | --- | --- |
| 基准 v10 | [index.html](index.html) | 训练内存分层、多 Rank 与并行关系 | 迁移前后字节一致；沿用既有评审范围 |
| Liquid Glass | [variants/liquid-glass.html](variants/liquid-glass.html) | 玻璃质感控件探索 | 仅调整脚本相对路径；视觉待验收 |
| Rank EP 通信 | [variants/index_comm.html](variants/index_comm.html) | 保留原模式；新增通信入口，自动聚焦 EP 组，以 Token 图元呈现激活分发与输出回收，复用原播放控件 | CSS／基准哈希、含在途量的 Token 守恒、模式恢复检查通过；1280×720 浏览器完成五阶段、14 秒慢放、主题、来源切换与缩放检查；设计待用户验收；[实施计划](variants/index_comm-plan.md) |

本次整理校验：目录校验（27 项）和脚本依赖检查通过，基准与迁移前 HEAD 逐字节一致。现有 `tests/test_npu_parallel_relations.cjs` 在 `Approved HTML and CSS changed` 断言处失败；已在临时目录使用迁移前 HEAD 文件复现，属于既有快照不一致，后续逻辑断言未执行。本次未进行浏览器视觉验收。
