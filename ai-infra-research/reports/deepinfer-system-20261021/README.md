# DeepInfer 系统解读

交付文件：`deepinfer-system-20261021-r1.html`，内联 CSS、JS、SVG，核心内容离线可用。

研究快照：DeepSeek 官方 DeepInfer，commit `9bd9cf243fc53ef9afbf8f04d391d989117d6ab9`，2026-10-21 获取。24 个实际读取的官方文件路径、字节指纹及来源链接见 `sources.json`。模型与部署结论只覆盖报告中的版本、硬件与配置。

内容按系统拓扑、调用链、模型层、算子融合、专家放置、两种通信路径、并行取舍、DSpark 验证预算、ZOS、缓存重放、完整执行图组织。结构图由源码与官方文档人工组织；没有导入实测 trace。通信事件之间的图示位置和连线长度不承担时间度量。

性能表述来自官方 Q&A / README。生产基础设施与开源引擎分开说明。未运行 NVIDIA SM100 或 Ascend 950 模型推理与性能基准。

验证：`node verify.cjs` 通过脚本语法、全部章节与节点选择、双向连续阅读、通信分支边界、表单方向键保护、缩放复位和外部依赖检查。`python3 ../../scripts/validate_catalog.py` 通过现有目录校验。未执行浏览器自动化、截图或人工视觉验收；本次未收录或修改 Library 目录。

重建：`build_report.py` 读取同目录模板和临时官方源码快照。重建前需把 SRC 指向该固定 commit 的 checkout，并把图元路径指向本仓库技能目录。HTML 是实际交付文件，模板不单独交付给读者。
