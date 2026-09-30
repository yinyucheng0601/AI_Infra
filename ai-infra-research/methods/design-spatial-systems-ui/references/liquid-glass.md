# Liquid Glass 接入

用于深色空间画布外围控件。小控件的折射感和密集面板的可读性分别使用固定预设；参数表见 [风格规范第 10 节](style-guide.md#10-控件与面板)。已有项目若有明确材质要求，遵循用户选择。

## 资源

将 [JS](../assets/liquid-glass-controls/liquid-glass.js)、[CSS](../assets/liquid-glass-controls/liquid-glass.css) 和 [MIT 许可证](../assets/liquid-glass-controls/LICENSE) 复制到目标项目，使用项目内相对路径。不要引用本机 skill 的绝对路径。可参考 [独立示例](../assets/liquid-glass-controls/demo.html)。

```html
<link rel="stylesheet" href="./liquid-glass-controls/liquid-glass.css">
<script defer src="./liquid-glass-controls/liquid-glass.js"></script>
<nav data-liquid-glass="control" style="border-radius:999px">…</nav>
<aside data-liquid-glass="panel" style="border-radius:20px">…</aside>
<button data-liquid-glass="icon" style="border-radius:50%" aria-label="设置">…</button>
```

CSS 放在宿主样式之后，只提供材质；尺寸、间距、文字、圆角、选中态与焦点由宿主负责。圆角从 computed style 获取。整组控件一个背板，不给内部按钮重复挂滤镜。可为读数标记 `data-liquid-readout`，为面板辅助文案标记 `data-liquid-muted`。

动态 DOM 与 hidden/class/style 切换自动管理。也可使用 `LiquidGlassControls.init(element, 'control'|'panel'|'icon')`、`refresh()`、`destroy(element)`；整页停止用 `disconnect()`，恢复用 `start()`。清理时还原原内联背景和滤镜，不与其他脚本同时写这些内联属性。

## 验证与边界

- 内置 [逻辑回归](../assets/liquid-glass-controls/test.cjs)：`node assets/liquid-glass-controls/test.cjs`。它使用 DOM 替身，不能代替浏览器光学验收。
- 源页面效果已获用户确认；复用到新页面后需按宿主背景检查文字、选中态、浮层开关与性能，不把已有测试当成新页面验收。
- Chromium 完整折射；其他浏览器沿用上游检测并回退为模糊；不支持模糊则实色。不要声称回退效果与折射相同。
- 不扫描 Shadow DOM；父级 opacity/filter、嵌套玻璃可能影响采样。纯色背景上的折射不明显，不为突出材质随意增加业务对象或动画。
- 资源来自 https://github.com/rizzytoday/liquid-glass ，保留 MIT 许可证。当前封装加入预设、生命周期管理和隐藏元素零尺寸保护。
