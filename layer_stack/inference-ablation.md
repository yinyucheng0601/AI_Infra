# 推理页消融 · 2026-11-06

实现入口：inference-layer-stack.html。对照入口：inference-layer-stack-before-ablation.html（改前 HTML、CSS、两个脚本完整内嵌快照，不引用本轮的新控件）。
参考：Pass Error Cases CP-01 的右上工具、Info 浮层、主题和右下视窗控制；图标复用 UiIcon.jsx 的路径，玻璃控件复用 Spatial Systems UI 的 liquid-glass-controls，并保留 LICENSE。

## 消融记录

| 原有信息或控件 | 本轮处理 | 保留的任务能力 |
|---|---|---|
| 左上独立帮助按钮、帮助弹窗、Rank 预算链接 | 合并为右上 Info | 操作、颜色、架构依据、预算来源仍可查 |
| 左侧历史范围、当前位置、前后箭头、小位置条 | 删除重复组 | 底部请求轴控制执行阶段；Token 表检查历史位置 |
| Token 表顶部 Prompt/132/133/EOS 按钮 | 删除与请求轴重复的阶段跳转 | 请求轴保留全部阶段；输出 token 仍可打开 Token 表 |
| 查看 KV 按钮及 KV 弹窗 | 合并进 Token 表与 Rank | SWA 范围、HCA 来源与检查联动保留 |
| Token 视图大胶囊与关闭按钮 | 顶部图标开关、抽屉小关闭入口 | 默认打开，可收起再恢复；开关不改变相机 |
| 层内图内部缩放按钮、重复 Model/返回 | 缩放统一到右下，仅保留一个 Model 返回 | 当前可见画布的缩放、Fit、返回与层切换保留 |
| 播放重置同时重置相机 | 分离职责 | 重播只重置请求；右下 Fit 单独处理视野 |
| 非 KV | 改名为权重与运行缓冲 | 官方 8.62 GiB 是合计数，未伪造细项字节占比 |
| 画布装饰十字、训练页无用样式 | 删除 | 不影响领域数据或交互 |

## 保持不变

43 层类型、阶段顺序、播放节奏、layer pop、稳定主干线、底部灰色历史/蓝色当前 token、检查状态与执行进度分离；未新增主体与 Rank 的连线。
内存预算仍是 TensorRT-LLM 文档案例 79.10 GiB：权重与运行缓冲 8.62、KV 池 63.44、剩余 7.04。不是当前模型/设备的实测分配。

## 实验边界

这次是以任务能力为约束的界面消融，有独立改前快照可比；未进行用户任务计时，不声称操作效率的实测提升。
验证记录在交付时补充：深浅色、Info/Token 开关相机保持、当前画布缩放、执行轴、KV 双向检查、桌面和窄屏边界。


## 验证记录 · 2026-11-10

- 通过：脚本语法、固定 DOM 引用完整性、git diff --check、localhost HTTP 200。
- 通过（11-06 浏览器）：2240×1172 下 Info 开关不改变主相机；Token 表开关不改变相机；深浅色切换；右下视窗控制根据当前可见图切换目标；历史 Token 检查不跳执行轴；层内检查时 Rank 避让；浏览器错误记录为空。
- 通过（11-06 浏览器）：390×844 无页面水平溢出，Info 浮层位于视口范围。
- 已修正、未复验：390×844 Token 抽屉底部从104px改到120px，消除与播放轴约10px重叠。
- 未验证：本轮最终完整请求播放与修正后的窄屏截图。11-06审批检查超时，11-10浏览器控制再次连续超时；不将代码检查等同于动画验收。
- 未进行用户任务计时或统计性 A/B 测试。


## 后续修正

2026-11-10：层内图已移至左侧，删除所有打开层内图时隐藏 Rank 的规则，Rank 与 Token 表继续联动。此前“层内检查时 Rank 避让”的决定已被本条替代。


## 2026-11-19 · 模型切换

- 复用原层栈、播放轴、图元和 Rank 联动；模型选择在标题旁，切换重建层身份和播放步长，保持请求阶段并夹紧层号。
- Qwen 来源：`PyPTO3-main/Design/PyPTO-Compute-Explorer-UI/js/paged-attention-pypto-source.js` 的嵌入源码明确声明 Qwen3-14B，40 Q heads / 8 KV heads / head dim 128，page 128、stack 4 pages。该算子属于 decode pipeline，不是 Qwen 的模型名称。
- 官方 config：https://huggingface.co/Qwen/Qwen3-14B/blob/main/config.json 。40 layers、hidden 5120、intermediate 17408、无 sliding window。Qwen 层图为聚合架构，不是逐 tile 的算子 DAG；使用 RMSNorm、Q/K norm、RoPE、GQA、Dense SwiGLU 和两次残差。
- Token 表展示全因果历史和逻辑页/offset；未提供 block table 时不生成物理页编号。Rank 继续使用明确标识的官方参考预算，不将其当作 Qwen 实测显存。请求 token 位置沿用原 demo 示例，不冒充源码 BATCH16/SEQ3584 实际运行。
- 验证：JS 语法、Node DOM stub 运行检查（初始化、40 层切换、L39 选择与 cache 激活、逻辑页映射、恢复 43 层）通过。浏览器工具连接超时，尚未完成实际视觉验收。未 push。


## 2026-11-19 · 层正视图与全屏画布

- 点击层后暂停播放，插值层面投影、位置及相机 viewBox；相邻层退场。输入、Attention、FFN、输出通过共享 node ID 和屏幕矩阵进行 FLIP 衔接，随后展开细节。返回逆向收拢并恢复进入前相机。Reduced motion 直接完成状态转换。
- 正视图 SVG 与容器铺满整个视口，导航、Rank、Token 表独立浮在画布上；Fit 的留白只作用于相机，不限制画布边界。此前缩进容器造成右侧分支裁切，已移除。拖动和缩放仍覆盖全屏。
- Node DOM stub 回归通过：DeepSeek 进入/退出、相机精确恢复、Qwen L39、正视图中切模型安全退出。该检查不是浏览器视觉验收；最终布局待用户预览。

- 正视图默认缩放 75%，完整图的水平中心与全屏 SVG 中心对齐。复用 `review-output/distributed-training-evolution/training-demo.html` Step 1 的无描边低对比模块底框与圆形加号残差图元。Qwen 使用两处 Residual Add；V4 的 HC Post 保留混合语义，不误标为普通 Add。

### 2026-11-19 · Qwen Token → Page → Task 联动

- 复用底部 Token 格子，按逻辑 Page 0（0–127）、Page 1（128–133）分组，标示有效容量；不增加第二份 Token 表。
- 当前执行位置与临时检查位置分离；点击 Token/Page 不改变播放轴。当前层、页内 offset、Stack 跟随检查。
- Decode 增加 KV Head 0–7 选择；以当前单请求为 batch 0，按 Compute Explorer 相同规则计算 Task=batch×8+head、计算 Block=Task%24、Q Heads=head×5…head×5+4。Prefill 隐藏 Decode 任务分配。
- 来源：PyPTO-Compute-Explorer-UI/js/paged-attention-model.js、visualization2-anatomy.js。Page=128、Stack=4 Pages；未接入实际 block_table/slot_mapping，不显示物理页 ID；未跨页面同步 Explorer 的默认16请求案例。
- 检查：Node 位置127/128边界、133 offset5、Head7/Task7/Block07/Q35–39、检查不改当前位置、切回DS清理Qwen元信息、原视角回归通过；本地浏览器实际点击Decode133、Head7、Token128，确认显示Page1 offset0且写入仍133，并检查全页布局。

- Qwen Token 表改为4px方形槽位，页内16×8完整展示128槽；展开Compute Explorer参考容量28逻辑页/3584位置，未用页弱化标识，不宣称物理分配；当前执行和检查色保持分离。默认打开Qwen并自动播放。
