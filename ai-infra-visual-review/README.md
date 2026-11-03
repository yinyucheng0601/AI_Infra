# AI Infra 视觉设计复盘 · HTML Keynote

六章节、16:9，包含章节设计推导图、分步动画、悬浮讲稿，以及执行泳道、Layer Stack、Scale 的 iframe 演示。当前为持续评审中的草稿，尚未导出 PPTX。

## 观看

从仓库根目录启动静态服务，打开 `ai-infra-visual-review/index.html`；或在本目录运行 `python3 serve.py`。知识库入口为 `ai-infra-research/reports/ai-infra-visual-review/index.html`。

- 空格 / →：下一画面；←：上一画面。
- PageUp / PageDown：上一 / 下一章节。
- R：重播；P：播放 / 暂停；1 / 2 / 3：演示、导航、总览。
- N：讲稿面板，支持逐画面对照。

## 结构与编辑

章节顺序：设计原则 → 执行泳道（问题 / 结果驱动）→ Layer Stack（认知减负）→ Scale（有效控制）→ 页面框架 → 体系沉淀。

`launch-slides.html` 为页面结构，`launch.css` 为样式，`launch.js` 为播放逻辑，`speaker-notes.json` 为讲稿。运行 `python3 build.py` 重建 `index.html`。构建使用 `vendor/deck-template.html` 与 `history/draft-01/index.html`；保留这两个构建依赖。运行时资源集中在 `assets/`，须保持目录结构。

`report-narrative.md` 记录汇报主线，`chapter-derivation-diagrams.json` 记录推导输入。生成页内嵌样式、讲稿及部分数据，仍依赖 `launch.js` 和 `assets/`。

## 来源与边界

导航模板参考 [report-deck-skill](https://github.com/Vinniechenyu/report-deck-skill)，论证参考 [Derive-Experience-Design](https://github.com/yinyucheng0601/Derive-Experience-Design)。案例来自本仓库设计资产；来源记录见 `assets/manifest.json`、`assets/launch-manifest.json` 与各演示的 provenance 文件。第三方 Liquid Glass 许可随资源保留。

现有交互、采样与 Agent 演进目标分别表述；动画节奏不表示实际运行耗时，也不构成设备验证或用户效率收益证据。历史迭代截图与非构建必需副本不纳入收录。
