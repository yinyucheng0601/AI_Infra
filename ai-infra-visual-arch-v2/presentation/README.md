# AI Infra 汇报 · Slidev

当前完整八页汇报的维护入口。原版文案、强调标签和逐页讲稿保留。

- `slides.md`：页面顺序与配置。
- `pages/*.md`：一页一个文件，标题、文字属性、原版讲稿；可用内置编辑器保存。
- `scenes/*.html`：复杂图解模板，按页拆分。
- `styles/deck.css`：原版图解样式；`styles/adapter.css`：框架适配与工具栏规则。
- `fixture.js`：分步和键盘；`scene-runtime.js`：数据图解、连线、核查和导出。
- `public/assets`：共享原目录素材，不重复复制。

在项目根目录运行 `rtk proxy npm run dev`；构建 `rtk proxy npm run build`。
改动场景模板后执行 `rtk proxy python3 presentation/prepare.py`。不要编辑生成的 `public/scenes/*.html`。

左右键走分步并在边界翻页；编辑器内方向键保留光标操作。工具栏 hover 或键盘聚焦时显示；摄像头与录制入口关闭。讲稿位于各页 Markdown 的注释中，可在 Notes 编辑。

原版 HTML/Python 构建链保留为迁移参考，当前 Slidev 不再依赖它生成源码。旧测量不代表当前完整汇报的性能。

## 模板

五类版式与复制示例见 [templates/README.md](templates/README.md)。`rtk proxy npm run dev:templates` 打开独立模板预览。新页使用 layouts/，现有复杂场景通过 embedded:true 保留原版视觉与动效。
