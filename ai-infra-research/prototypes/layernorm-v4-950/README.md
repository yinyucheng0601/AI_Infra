# LayerNormV4 · Ascend 950

直接打开 [index.html](index.html)。页面内嵌资源、算子配置和固定提交的源码，可离线完成核查。固定 ops-nn commit 为 `0a2a8d3377914e6d458043ae7923e18456ec45a2`。

## Host → Kernel

上游 Host 单测共用 DAV_3510（Ascend 950）、56 个 AIV、253,952 B UB、256 B VReg、32 B UB block。X、γ、β 和输出均为 FP32，参数齐全，归一化尾轴为 16，ε 为 1e−5。

| X shape | Host 证据 | Kernel 窗口 |
| --- | --- | --- |
| 65536 × 16 | `ceil(A/56)=1171 > 512`，优先级 125 的 Transpose 命中。FP32 对应 800。 | 核 0，首块 704 行，含尾块 467 行的预取。NDDMA 搬入 RA，X 原位中心化，Y 转回 AR。 |
| 28672 × 16 | `ceil(A/56)=512`，未满足 Transpose 的严格大于条件。优先级 150 的 Two-Pass Perf 命中，FP32 对应 500。 | 核 0，512 行进入一个 UB tile。短轴统计在 UB 内进行，仿射复用 `tmpBuf` 中的中心化 X。 |

面板串联 Host 单测断言、模板优先级、tile 公式、Key 派发和 Kernel `InitBuffer`。横轴每格对应一个源码步骤。Tensor 区间记录窗口内的数据有效范围或队列槽的占用范围，`InitBuffer` 字节量按完整预留计算。窗口截断的 γ/β 和预取尾块仍延续到后续执行。浏览器测试覆盖交互，Host 单测未在本地重跑，本轮未采集设备 Trace、地址或时延。

## 复用与适配

| 部分 | 本次实现 |
| --- | --- |
| 实际复用 | RMSNorm `comparison.js` 的 `taskImage` 与 PTO `swimlane-task` 绘制器，原型使用的 `GridTensor` 图元，以及 RMSNorm `memory-inspector-adapter.js` 的 UB 区间块。 |
| 实际复用 | RMSNorm `page.html` 的缩放、平移、Fit、提示机制、样式及核查面板外壳。面板改用 LayerNorm 的 Host/Kernel 证据，打开与关闭仅更新面板状态。 |
| LayerNorm 适配 | `build.py` 计算两条路径的 tile、有效行数、缓冲预留与对象字节量，绑定内嵌源码。 `app.js` 把步骤、Tensor、UB 区间和源码范围联动。当前 RMSNorm 原型没有播放，本文新增按步播放与单步前后导航。 |
| 仍硬编码 | 两个 Host 单测配置、核 0 和观察窗口、语义步骤切分、生命周期端点及固定提交行锚点。画布道宽、标签和 750 ms 播放步长都是界面配置。当前适配范围为这两个 FP32 用例。 |

重新生成时，将包含固定提交的 ops-nn checkout 路径传给 `rtk python3 build.py /path/to/ops-nn`。构建直接从 Git 对象读取源码并检查行锚点、单测 Key、区间和缓冲容量。

## 迁移后的工具栏与独立面板

右上角四个图标由构建从 RMSNorm 源模板提取，沿用顺序、尺寸和 Liquid Glass icon 预设。底部使用 control 预设，浮动面板使用 panel 预设。

缓冲生命周期和 RMSNorm 使用同一个 `buffer-lifetime-plot.js`，在主画布沿源码轴展开，点区间块可联动步骤和固定源码。LayerNorm 纵轴使用基于 InitBuffer 的逻辑偏移，区分双槽占用和 TBuf 顺序复用。关闭图层恢复展开前的视角。硬件映射复用 RMSNorm 的窗口结构、尺寸、定位、中性灰样式以及 AIV 渲染和路径逻辑。窗口可拖动、调整大小，关闭时保留当前视角。
