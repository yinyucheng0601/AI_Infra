# 同步审计测试材料

业务入口已合并到 `../compute-investigation-trial/unpack.html?sync=1`；本目录 index.html 为兼容跳转。page.html / app.js 保留为早期接口实验源，不再构建为业务界面。好坏例与修改副本仅用于扫描回归，不进入 Unpack 配置菜单。

# 同步证据试验

打开 `index.html`。权威页面源为 `page.html` / `app.js` / `model.js`，运行 `python3 build.py` 重建独立 HTML；教程、右上角按钮和 hover/focus tip 复用 prototypes/_shared。

扫描器固定为 hicann/cannbot-skills 的 `f305e200aa4b1e1fed73cd21ff1f083b8df25a1e`。代码、原始输出与来源指纹分别在 sources/、raw/、manifest.json。只携带本实验必要的源码片段，不安装 Skill 或设备工具链。上游许可见 LICENSE-CANN。

复扫：`python3 run_scan.py --skill /path/to/cannbot-skills/ops/ascendc-sync-audit`，随后运行 build.py 和 verify.cjs。脚本先核对扫描器和源码指纹；退出 1 为扫描候选，不作为脚本崩溃。

9 个配置包括标准流水好坏例及修复副本、索引好例、索引坏例及两级改动、region 依赖例，以及真实 Unpack 固定版本。所有原始候选保留，两个扫描器不去重、不合并“通过”状态。图只绘制实际 coverage / dependency，缺失关联不由 UI 猜测。字段赋址是 producer 地址线索，不能冒充实际执行或消费事件。

修复仅发生在本地最小例副本。Unpack 未修改：三个结构候选仍需条件路径、helper 语义和 SDK 核查；图零检出不证明同步正确。候选审查与后续验证方案见 REVIEW.md。没有设备编译、运行或收益结论。
