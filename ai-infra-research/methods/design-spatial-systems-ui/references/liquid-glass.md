# Liquid glass · v2 定稿

方案 B 厚板玻璃（Canvas 位移图 + SVG 背景滤镜，无 WebGL）。
control 用于整组工具栏，icon 用于独立按钮，panel 是透明磨砂，不折射正文。

| 参数 | 定稿值 |
|---|---:|
| 折射强度 | 100 |
| 折射覆盖宽度 | 36px |
| 玻璃厚度 | 37px |
| 默认背景模糊 | 1px |
| 高光强度 · 浅色 / 深色 | 2.2 / 0.8 |
| 高光聚焦 | 28 |
| 侧壁取色 | 95 |
| 侧壁宽度 | 2.75px |
| 折射率 | 1.50 |
| 背景 · 浅色 / 深色 | 透明 / 5% 白色 |
| 控件外投影 | 0 7px 20px，黑色 8% |

高光从左上向右衰减，右下局部反光，彩色侧壁外侧保留细白光；弱化内阴影，不加整圈 border。
panel：24px blur、深色 78% / 浅色 74% 背板，无 border，柔和 shadow。
设置控件使用紧凑胶囊选择器、细轨道 Slider、小圆点和清晰读数。
主体图元与告警保持语义材质，不接玻璃。

## 接入与 API

加载../assets/liquid-glass-controls/ liquid-glass.css、liquid-glass.js，保留 LICENSE。
宿主负责布局、圆角与定位；控件需 relative/absolute/fixed 定位上下文。
在整组背板上添加 data-liquid-glass="control"，独立按钮用 icon，磨砂面板用 panel。
不要在整组背板和内部按钮重复添加滤镜。

根元素 data-theme 为 light 或 dark（缺省深色），变化时自动更新。
LiquidGlassControls.getSettings() 返回当前参数；
configure({blur:1}) 调整背景模糊（0–20px），文字与高光保持清晰。
深色高光独立保存，其余参数共享。
init(element,'control'|'icon'|'panel')、destroy(element)、refresh()、disconnect()、start() 管理生命周期。

## 验证与边界

Chromium 支持 SVG 背景折射；其他浏览器回退为按实际参数驱动的背景模糊，尚未逐一验收。
尺寸变化自动重建；大量实例与大尺寸需按宿主测性能，不扫描 Shadow DOM。
node test.cjs 检查默认参数、主题隔离、存储与边界，不替代浏览器光学验收。
demo.html 为深浅色与模糊调节预览；Pass Error Cases 为已调整的业务接入。
基于 rizzytoday/liquid-glass MIT 扩展；v2 厚板位移、侧壁采样与方向高光为本地实现。
