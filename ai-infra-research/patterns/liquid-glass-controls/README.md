# Liquid Glass Controls

从 `npu-memory-atlas-training-v10-liquid-glass.html` 提取的深色画布玻璃材质。原页面未修改。零依赖、无构建步骤，普通 HTML、file://、Vue / React 页面均可使用。CSS 仅作用于带属性的元素，不接管布局、字号、圆角、按钮事件、焦点或选中态。

## 最短接入

复制本目录，加载两个文件（CSS 放在业务 CSS 之后）：

```html
<link rel="stylesheet" href="./liquid-glass-controls/liquid-glass.css">
<script defer src="./liquid-glass-controls/liquid-glass.js"></script>

<nav data-liquid-glass="control" style="border-radius:999px;padding:8px">
  <button>缩小</button><span data-liquid-readout>100%</span><button>放大</button>
</nav>
<aside data-liquid-glass="panel" style="border-radius:20px;padding:20px">
  <h2>配置</h2><p>清晰阅读的磨砂面板</p>
</aside>
<button data-liquid-glass="icon" style="border-radius:50%" aria-label="设置">⚙</button>
```

把 `control` 加在整组控件的背板上，不要同时给容器和每个内部按钮叠加滤镜。独立圆按钮使用 `icon`。实际圆角从 CSS 读取；给页面留出有图形的背景，纯色背后不会出现明显折射。

## 固定效果参数

| 参数 | control：顶部/底部控件 | panel：配置/数据面板 | icon：独立圆按钮 |
|---|---:|---:|---:|
| 折射 scale | -110 | -12 | -36 |
| RGB 色散 | 0 / 4 / 8 | 0 / 0 / 0 | 0 / 1 / 2 |
| 折射后背景模糊 | 4px | 18px | 4px |
| 深色背板不透明度 | 28% | 94% | 72% |
| 位移图边缘平滑 blur | 8px | 8px | 6px |

`alpha=1`、`saturation=1`、`frost=0`；背板颜色由 CSS 管理。文字与图标自身不模糊。圆角、尺寸、排版和交互状态沿用宿主页面。

## 动态页面

脚本自动处理新插入的元素、属性切换、隐藏浮层和卸载。可通过 `hidden`、class 或 style 控制面板，无需手动重建滤镜。

```js
LiquidGlassControls.init(element, 'control'); // 给已有元素接入
LiquidGlassControls.init(element, 'panel');   // 切换预设
LiquidGlassControls.refresh();               // 特殊布局变更后同步
LiquidGlassControls.destroy(element);        // 移除属性、滤镜；还原原内联背景/滤镜
LiquidGlassControls.disconnect();            // 停止自动管理，清理全部实例
LiquidGlassControls.start();                 // 恢复自动管理
```

React / Vue 在挂载后加载一次脚本，模板直接声明 `data-liquid-glass` 即可；如由组件调用 `init`，卸载时调用 `destroy`。这些框架接入方式未做运行验证。不要让其他脚本同时改写同一元素的内联 `background` / `backdrop-filter`。

## 兼容与边界

- 完整折射沿用上游 Chromium 检测；Safari / Firefox 回退为背景模糊（control / icon 12px，panel 18px）。未在这些浏览器逐一验证。
- 无背景模糊支持时使用实色背板。
- 当前版本针对深色背景；浅色主题需要另行调整对比度。
- 不扫描 Shadow DOM；祖先 opacity/filter 和嵌套玻璃可能改变背景采样。
- CSS 动画改变祖先可见性而不触发属性变化时，可在动画结束调用 `refresh()`。
- 包不会加载网络资源或持续播放动画。大面积或大量滤镜仍需结合宿主页面测性能。

## 文件与验证

- `liquid-glass.js`：上游光学实现及预设/自动生命周期封装。
- `liquid-glass.css`：局部材质样式。
- `demo.html`：三个预设、面板开关的独立示例，可直接打开。
- `test.cjs`：Node 下的生命周期逻辑回归（使用 DOM 替身，不代替浏览器渲染验证）。运行 `node test.cjs`。
- `LICENSE`：保留上游 MIT 许可证。

上游：https://github.com/rizzytoday/liquid-glass 。本地仅对上游 ResizeObserver 回调增加隐藏元素零尺寸保护，光学算法保持不变。源页面效果经用户确认；独立示例尚未进行浏览器视觉验收。
