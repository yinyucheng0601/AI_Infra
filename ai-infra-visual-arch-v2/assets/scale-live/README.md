# Scale investigation trial

入口：`index.html`（自包含，可离线打开）。`page.html` + `model.js` 为可编辑源，`build.py` 生成入口。只绑定回环且只白名单提供入口的预览：`rtk proxy python3 ai-infra-research/prototypes/scale-investigation-trial/serve.py`，地址 http://127.0.0.1:8798 。

固定来源：heiheiha798/Ascend-Kernels-S8，commit `13baf5274751fcf46aa04905c53ad285d656ac74`，`case_910b/Scale/test_op.py`；快照在 `sources/test_op.py`，SHA256 见 validation.json。仅审阅该测试与 CPU 参考，不推断 custom_op 的 Host/Kernel 分支。

## 结论与使用

case1 输入 [2,6,10]，参数 [6,10]，axis=1、axes_num=-1、scale_from_blob=True。参考 reshape=[1,6,10]：y[n,c,w]=x[n,c,w]*scale[c,w]+bias[c,w]，同一参数关联两个 batch 的两个输出。逻辑连续 FP32 offset 为 x/y: 4*(60*n+10*c+w) B，scale/bias: 4*(10*c+w) B。它不是设备物理访存证据。

选择任意元素或参数格，编辑底部数值并点“应用参数”。高亮色填充加黑字表示共享参数的关系；Δy 相对该配置初始参数。无 bias 可切换，参考变体切换会重建参数。按通道 [6] 参数 reshape=[1,6,1] 关联 20 个输出；False 分支用 rank(scale)，axes_num=0 不参与 shape 推导；负轴 -1 归一化到2，[10] 参数关联12个输出。参考变体均非上游现有 case 或已确认的设备支持范围。

确定性数据：x[i]=((37*i)%97-48)/4；s[k]=(k%9-4)/4；b[k]=(k%7-3)/2。上游随机数据无 seed，此数据不复现上游一次运行。乘法、加法各自 Math.fround，格内显示1位小数，检查器保留精确数值。关闭 bias 时基线也按无 bias 计算。

## 检查证据

`rtk proxy python3 ai-infra-research/prototypes/scale-investigation-trial/verify.py`：4配置、bias开关、参数变更共1920元素；独立逐坐标oracle，与源码 AST 提取的 custom_scale 对照。源码函数通过标准库 FP32 Tensor兼容层执行，**没有运行真实 PyTorch**。另测4组非法参数拒绝、参数影响集合、逻辑字节偏移、错误映射注入检测、边界交接。结果见 validation.json。

真实浏览器验证见 ui-validation.json，桌面预览 preview.png。复用参考的开放画布/浮层交互结构；正式乘加图元直接调用随交付复制的 visual-system.js，来源哈希在 glyph-provenance.json。矩阵为领域逐元素视图。尚未验收所有手势/键盘路径及玻璃光学效果；窄屏需要缩放和检查器读精确值。没有声称通用算子适配。

源码审阅项：L90/L93 warnings.warn 无 import warnings；bias=None 可被CPU参考接受，但 L185 测试入口直接 bias.npu()。当前 case1 不触发这些路径，不将其报告为设备故障。

未验证：真实 PyTorch、NPU、FP16/BF16、Host/Kernel、CANN、原随机样本。未安装开发环境，未修改来源仓库、其他试验目录或catalog，未提交或推送。既有工作区修改保持原状。
