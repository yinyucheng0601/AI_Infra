# RSFA performance trial

打开 `index.html`；本地静态文件，无网络依赖。固定数据在 source/ablation_raw_data.json，SHA-256 在 source-manifest.json。完整检查与逐配置结果在 validation.json。

## 任务与操作

共享比率轴比较同路径、同 case 的实现。点击或键盘选择一行，查看 BM/BN、原始样本、比率范围与源记录。可切换对照、avg/median、路径和采用门槛；拖动画布、滚轮缩放、适配。证据浮层可拖动与调整大小；关闭后保留选择与视角。编辑调查问题，展开预览并导出相同 JSON。

相对 baseline：non_causal fused 六项收益 10.46%–54.52%；causal fused 五项退化 4.63%–18.93%；c_2048_256 收益 0.259%，样本范围跨 1，应复测。causal fused_split 六项收益 48.92%–71.25%。这些是固定数据中的采用候选，不是跨硬件结论。

## 来源与边界

固定提交 ee08c6d2d73e5288db47f26fe715558e01ff5c3b，源数据时间戳 2026-07-16T04:05:59.360283（无时区）。源 avg/std 保留原值；median 用舍入样本重算。min/max 比率包络不是置信区间，不配对样本。比较包含 tiling 差异，不能分离优化因果。README 与 runner 同提交快照用于上下文；runner 五版本命名与 JSON 三版本名不同，不能证明生成关系。未安装开发环境、未执行 NPU 或正确性验证。

## Skill 与结构

执行 ai-infra-investigation，并读取 ai-infra-glyphs、observability-design-style、design-spatial-systems-ui。参考 prototypes/logsumexp-case5/page.html 的全视口主体、独立身份/控制、选择与视角分离、指针中心缩放、按需证据与问题交接机制；性能领域模型独立建立，无复制其领域数据。深色中性画布使用系统 tokens；工具栏接入正式 Liquid Glass control、证据与来源接入 panel 预设，保留许可证。共享坐标用于比率比较；未使用 Tensor/OP/Core 图元，正式库缺少此统计点/范围 renderer，使用原生 SVG，不声称正式图元复用。未改 catalog。

## 检查

30 组 / 600 样本；min/max 精确吻合；avg 与总体 std 重算允许 0.0011 ms 舍入误差。源快照哈希一致，JS 语法与最小 DOM VM 交互检查通过。

浏览器 file 协议被工具安全策略拒绝，未绕过；真实布局、桌面/窄屏、鼠标/触控/键盘命中、下载、来源跳转仍未验证。模拟 DOM 不代表视觉验收。交付是固定数据工具，不声称通用性能解析器。

## 控件修正

三个配置入口使用自定义 listbox，复用 compute-investigation-trial/spatial.html 的菜单样式、当前项、hover、焦点及键盘契约。缩放控件提取 logsumexp-case5/page.html 的原始 CSS 与 DOM 结构，保留 − / 比例 / ＋ / 适应；删除当前证据按钮。选择数据行仍打开证据浮层。来源样式提取于 system-controls.css，未修改参考目录。菜单支持方向键、Home/End、确认、Escape、Tab 与外部点击关闭。新版本真实浏览器操作与视觉仍未验收。

右上角按钮组现直接复用 unpack-case3/index.html 的四个 SVG 与 .top-actions/.icon 几何：依次查看退化配置、当前选择、原始数据、来源与前提。配置栏按该页的 left:50% / translateX(-50%) 居中，正文与配置字号显式设置，避免浏览器默认 16px 和局部 12px 混用。视口不足时配置栏移至第二行。新渲染尚未验收。

入口精简：删除右上角当前选择放大镜，保留退化核查、原始数据、来源与前提三个按钮。点击数据行查看对应证据；核查按钮依次定位退化项。配置栏始终 top:24px，不再移至第二行。
