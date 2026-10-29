# 算子映射调查工具

- `unpack.html`：布局拆分、来源地址、任务与核分配。6 个新建验证配置覆盖三种任务路径。
- `expand.html`：广播索引、阶段与 Workspace 中转、参数范围自动核查。3 个新建验证配置。
- `index.html`：Unpack 的入口别名。

两个案例共享空间工作台与交接协议，各自使用独立领域模型，不组成计算链。

## 证据与能力边界

固定源码版本：

- Unpack：`heiheiha798/Ascend-Kernels-S8@13baf5274751fcf46aa04905c53ad285d656ac74`
- Expand：`wybxw/Ascend_ops_Base_S6@d5e06fa213468ad4f61f1151d37668f3fc5b9ce9`

`model.js` 独立于 DOM；`evidence.json` 保留固定 revision、行号与文件哈希。Task 使用正式 VisualSystem renderer，控件内联 Liquid Glass 资源与 MIT 许可。界面支持平移、焦点缩放、Fit、选择关联与按需证据浮层。

Expand 核查独立广播模型与 Host 阶段组合，并比较 step=1 时 `cur_elems+align_elems-1` 参数构造范围与逻辑输入范围。3 个配置有 2/4/0 个候选；点击可定位、查源码并导出问题。候选不是设备越界结论；没有验证 CANN 实际访问语义，没有运行 NPU，不宣称通用源码解析或性能诊断。

## 验证

`verify.cjs` 覆盖 223,169 个元素映射与最终脚本语法。`verify-audit.cjs` 覆盖精确参数区间、分支排除与人为阶段错误的检出。`verify-spatial.cjs` 通过 DOM 替身检查平移缩放、选择、浮层、菜单、任务关系和交接一致性；不替代真实渲染。

初版报告式布局的设计通过结论已撤回。当前空间版本的真实浏览器视觉验收受工具 file 协议限制，保持未验证。

## 构建

```sh
rtk python3 ai-infra-research/prototypes/compute-investigation-trial/build.py
rtk node ai-infra-research/prototypes/compute-investigation-trial/verify.cjs
rtk node ai-infra-research/prototypes/compute-investigation-trial/verify-spatial.cjs
rtk node ai-infra-research/prototypes/compute-investigation-trial/verify-audit.cjs
```

默认使用已保存证据快照离线重建；`--refresh-evidence` 才从构建脚本列出的只读 checkout 刷新。`preview.py` 仅绑定回环地址，白名单为三份生成 HTML。
