# 五类汇报模板

| layout | 名称 | 职责 |
|---|---|---|
| chapter | 章节导入页 | 全幅底色、内面板、章节标题、主图、底部论据 |
| cards | 卡片展开页 | 卡片容器、各卡片内容；展开/回收由内容组件控制 |
| concept | 概念拆解页 | 固定 PPT 标题区、逐步机制图、状态说明 |
| demo | Demo 展示页 | 独立 PPT 标题、iframe 展示区，标题不进入 iframe |
| architecture | 架构页 | 架构关系图、分组和层级 |

## 使用

复制同目录示例 Markdown，放入 pages/，在 slides.md 中添加 src。标题、说明、讲稿在 Markdown 内编辑。共用间距与全幅尺寸在 components/PageFrame.vue；每类布局在 layouts/。

已有八页通过对应 layout 接入，embedded:true 表示兼容已定稿的复杂场景组件，保留其坐标和动画；不要将它用于新页面。案例页的章节导入、Demo、概念拆解仍保留为同一页内的三个分步阶段，未擅自拆页。模板不接管领域计算算法。

示例是单独的预览 deck：rtk proxy npx slidev templates.md --port 8855。不加入正式汇报。
