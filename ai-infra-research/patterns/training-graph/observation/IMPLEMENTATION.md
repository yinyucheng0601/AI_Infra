# 通信观测实现与验证

日期：2026-11-23。本文描述当前实现，替代此前的方格顶视和局部互联方案。

## 表达约定

问题：通信组落在哪些设备，某 Rank 的负载/耗时依据是什么。立体视图沿用 rankCube 的层叠图元；顶视沿用灵衢 Pattern 的 POD→板→设备布局及互联。坐标表达配置归属，不承诺网络实测路径；短条按当前指标全组最大已知值归一化，不用图元高度表达性能。类别色遵循原图例，选择使用填充，不能使用描边圈选。

01–09 仍使用原模型与渲染。第 10 步“部署配置”保留原八 Rank 行为。观测会话的 worldSize、通信类别与指标分别处理；切视角保持 Rank、通信类别、当前操作及会话。详情在点击位置旁打开并限制在视口内；退出第 10 步清理定位和物理导航。

## 完整 Pattern 接入

- `deployment-pattern/lingqu-physical.js`：从用户提供的灵衢本地快照逐段提取 `buildPhysSvg / relSvg / lkDefs / cased / buildBoardSvg`，函数主体原样保留。用于集群/POD、板及设备关系，不再重新写一个近似布局。
- `deployment-pattern/lingqu-physical.css`：对应物理视图规则加宿主作用域；保留原图元、连接端点和路由，覆盖选中描边、LOD 根可见性、文字尺度及虚实节奏。
- `deployment-physical.js`：宿主选择、层级导航、设备绑定、灰度/指标条和详情适配。选中板在 POD 内展开原关系；点击板行下钻完整板视图，包含 CPU/NPU/DPU/NIC、L1、交换板、L2 平面，面包屑返回 POD。没有将逻辑 token 记录重新画成物理网络路径。
- `deployment-views.js`：原 AtlasControls 四视角轮盘；立体、正视、侧视保留 Rank 渲染。原 NPU 方格网和橙色折线实现已移除。
- 复用指纹与函数逐段哈希见 `deployment-pattern/provenance.json`。使用 `/private/tmp/lingqu-preview/public/patterns/lingqu-rank-map/` 快照；交付不依赖该临时路径。8768 实时页面没有完成核验，不宣称逐像素等同当前线上状态。

## 数据与证据

`observation/model.js` 提供 v1 核心校验、旧 EP Mock adapter、独立 NCCL raw adapter、确定性均衡/倾斜样本和通信类别识别。NCCL/CUDA 输入不进入 NPU 画布。

两份内置样本采用显式 `lingqu-950-template` 落位：64 Rank→一个 POD、八块板、每板八个 NPU。`resources/placements` 保存配置和 evidence；拓扑模板规定外围设备及互联，不表示运行时发现。其他导入不自动使用此模板；没有兼容映射时不能制造物理归属。Mock 倾斜将每四个 token 首位专家改为 E0；每场景均 8192 次专家分配，不推导额外通信耗时。

通信类型筛选保留全部、TP/SP、缓存、EP Dispatch/Return、DP、专家副本；PP/CP/未分类按输入追加。类型来自显式 communicationKind 或已知通信域，worldSize 不参与分类。内置样本只覆盖 EP；未覆盖类型显示缺失，不残留上一类的操作、指标或连线。

主体自动选择一个关键指标（接收 token 优先，其次阶段耗时），其余指标同时在 Rank 详情查看。没有三项指标 Tab。当前 UI 支持 Rank 指标；未接入逐事件时间线、交换矩阵或实测链路吞吐。三者不能因 schema 有字段就声称已支持。

## 使用与转换

打开 training-demo.html，第 10 步选择数据会话，右上角选择顶视。点击板行进入板视图，点击 NPU 查看 Rank 与指标来源，POD 面包屑返回。切回立体可查看同一 Rank。

`node observation/convert.cjs --mock baseline output.json`，或 `node observation/convert.cjs input.json output.json`。支持旧 EP Mock、raw-linked-communication.v1 和 v1 输入。导入 v1 JSON 上限 25 MB；不同 pass/聚合范围不能直接共用比较尺度。

## 验证证据

- 原模型：3840 种部署状态的闭包、专家归属和路由校验；原部署 DOM 操作链。
- 回归：01–09 的图、Rank、文案与参数 DOM 与重做前一致；切会话、通信过滤、四视角、详情锚点和退出恢复通过。
- 数据：负载守恒、缺失与零分开、无 Trace 汇总、非法引用/聚合/时间/技术栈冲突拒绝；混合 TP/DP/EP 构造输入可独立筛选；没有伪造倾斜性能惩罚。
- 浏览器：本轮使用实际 Headless Chrome，1440×1000，通过 64 NPU / 16 CPU / 32 NIC / 8 L1 / 32 L2 符号检查、真实指针板级下钻、Rank 44 详情视口边界、POD 返回、2.5D 选择保留及退出隐藏。没有脚本异常。POD 与板级截图均已查看，不再以 DOM 仿真代替主体可见性检查。
- 浏览器中发现并修复源 LOD 样式将根 SVG 隐藏的问题。图像见 screenshots/pod.png 与 screenshots/board-selected.png。
- 未验证：用户当前 IAB 标签状态、8768 实时页面、其他设备/窄屏和真实 Ascend profiling；未采集实测物理路径。

核心校验尚不覆盖全部跨时钟变换、扩展对象与复杂推导依赖环。物理模板适配只接受有明确映射的兼容 profile，不能宣称支持任意硬件拓扑。
