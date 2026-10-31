# 双配置编译期地址布局对照

运行 `python3 build.py` 校验原始报告并生成独立 index.html；`python3 serve.py` 在 127.0.0.1:8822 白名单预览。

## 表达约定
- 问题：哪些 buffer 扩容，前序扩容如何累积为起址位移。
- 主图共享 0–192 KiB 字节刻度；两条布局按原始 Address range 绘制，不重新打包。末端是报告最高地址，不是保留区边界。
- 对象以报告原名关联。大小未变对象仍可选择；表格按地址顺序，显示精确字节差。
- 暖灰表示自身扩容；近白表示当前选择，两配置联动；关闭恢复默认高亮。不改视角。
- Live range 只保留原值；不解释闭区间端点，不画时间。
- 参考 Memory Inspector 的对象选择→证据检查路径、LogSumExp 的浮动源码窗口和关闭恢复。现有 renderer 含生命周期区间假设，因此本页独立地址 renderer，不声称直接复用了其代码。

## 来源与核对
Gist https://gist.github.com/Hzfengsy/8f655587af225f73665a1e9a3112441a
revision b59bfcf5ed6cc0bdef67d00c24e6f9e846383590。只收录本页证据需要的报告、PTO、原作者说明；不执行作者脚本。model.json 保存文件 SHA256。
77 个同名基础分配、81 MemRefs 原口径。每份 PTO 317 条 alloc_tile、77 个不同起址，与报告完全对应。地址关联不是 Tensor 身份证明。
12 个分配扩容，总量 5632 B；两配置分配顺序一致，连续且无地址重叠，每个起址差等于前序扩容之和。build.py 对上述关系进行断言。
作者约 8 KiB 保留区/NaN 解释待核查。缺最终二进制、保留区映射、运行 trace；README 与 HOW_TO_RUN 的 CANN 版本口径也需核实。
当前 RMSNorm、catalog 和共享 renderer 未修改。无设备验证。

## 浏览器核查
默认地址布局、12 项扩容筛选、mem_vec_114 自身 +512 B 与前序 +512 B、mem_vec_108 自身不变与推移 +512 B、PTO 展开、关闭恢复、帮助开关已检查。复制按钮已触发，成功反馈未确认。截图 preview.png。JS 语法、数据断言和 catalog 52 项校验通过。

## 2026-10-31 修订
改为实际加载 Memory Reuse Viewer 的 pattern.js / CSS 本地快照，通过实例适配器复用 Canvas、地址映射、命中、拖动与缩放。数据使用 rowIndex 表达报告顺序，无 allocTick/freeTick，关闭峰值计算与生命周期轴。两侧共享地址范围与同步视角；名称选择及原始证据浮窗保持。替代前版地址条与表格。共享组件与 RMSNorm 均未修改。
