# AI Infra 视觉设计复盘 · HTML 初稿

四页、16:9。直接打开 `index.html`，或运行 `rtk python3 serve.py` 后访问本地地址。

- ← / →、PageUp / PageDown、空格：翻页。Home / End：首尾页。
- 1 / 2 / 3：演示、导航器、总览。
- N：当前页讲稿、来源与证据边界。Esc：关闭讲稿或图片。
- 点击案例图：查看完整原图。

## 编辑

内容、布局和讲稿保存在 `build.py`；运行 `rtk python3 build.py` 重建。
`index.html` 的文字与布局为原生 HTML；`speaker-notes.json` 提供结构化讲稿。
截图保持为原始媒体，未来 PPT 导出时文字与布局可重新生成可编辑对象，截图仍作为图片。
当前没有生成或导出 PPTX。

## 来源

- 翻页、导航器、总览及缩略图运行时复用并适配 [report-deck-skill](https://github.com/Vinniechenyu/report-deck-skill)。模板保存在 `vendor/deck-template.html`。
- 汇报论证参考 [Derive-Experience-Design](https://github.com/yinyucheng0601/Derive-Experience-Design)。
- 实际图像来自 AI_Infra 仓库已有截图，未将示例数值当作设备测量或用户效率收益。
- Tensor SVG 为正式图例库 `system-value / data-1` 的原样导出；未重新绘制。
- 逐项路径与 SHA256 见 `assets/manifest.json`；每页具体来源与范围见讲稿。

没有对外发布、推送，或修改原型和图例库。
