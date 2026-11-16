# Slidev 分页与动效约定

当前基于 Slidev 53.1.0，13 个主题页面；同一主题内的逐步讲解使用原生 clicks。

- `slides.md` 决定页面顺序，frontmatter 的 `clicks` 决定页内步数，`useSlideContext().$clicks` 驱动内容状态。
- 主文档使用 Slidev 默认快捷键和 `useNav()`；不再注册并行的全局翻页监听。
- iframe 中的按键不会冒泡到主文档，只在子文档转发一次到 `next()` / `prev()`，输入框保留自己的按键。
- 页面切换由原生 `fade` 负责，时长通过 `--slidev-transition-duration` 设置为 250ms；不覆写页面 opacity、z-index 或 TransitionGroup 生命周期。
- 场景首次进入附近时准备，创建后保留；离开只暂停播放，不在转场过程中销毁和重建。
- 场景 HTML 随模块打包。同页的 iframe 保持同一个实例，切换讲解状态不会重建外层 iframe。
- 图表内部的缩放、展开及播放独立于分页。跨页不叠加 FLIP、临时覆盖层或额外整页入场动画；三原则卡片仅在同页内使用位置变化动效。
- 如需恢复页内步骤，使用官方 clicks / v-click / v-motion，再由 Slidev 的 next / prev 消费步骤；不要叠加手写步骤导航。

## 核查

验证一次按键只到达一个目标页，连续按键与反向导航顺序正确；检查 iframe 获得焦点后的翻页。动效应采样整个过程，确认透明度没有反转，不能仅凭最终截图或构建成功判断。

## 官方依据

- [动画与转场](https://sli.dev/guide/animations)
- [导航快捷键](https://sli.dev/guide/ui#navigation-actions)
- [快捷键配置](https://sli.dev/custom/config-shortcuts)
- [53.1.0 页面预加载与 TransitionGroup](https://github.com/slidevjs/slidev/blob/v53.1.0/packages/client/internals/SlidesShow.vue)

## 固定章节标签

章节标签由 `global-top.vue` 单一实例渲染，内容读取每页 frontmatter 的 `chapterLabel` / `chapterLabelEn`。位置在 1440 × 810 画布中固定为 left 54px、top 37px，不进入页面转场，不跟随各图表容器定位。旧标签仅隐藏并保留其排版占位；iframe 在嵌入模式隐藏自身标签。

使用依赖导航状态的全局图层时，导出 PDF / 图片使用官方 `--per-slide` 选项。
