# DeepSeek V4 推理场景优化与验收计划

## 目标与约束
保留现有模型切换、罗盘、画布、图元、播放轴、Token/Task/Block 面板及 Rank 几何。通过数据适配而非重做 UI，将 DeepSeek 的请求、调度、Worker 和缓存上下文贯通。Qwen 不回归。新增 UI 必须证明不可由已有控件承载；重复标签、常驻说明与无操作价值的指标删除。

## 数据契约
- PTO trace 是本轮测量源；结构继续来自 Flash 模型配置和源码。
- 请求 ID、Prompt 长度、max_new_tokens、结束原因、调度步、Worker dispatch 使用实测。
- chip.run 是运行时调用，不能冒充模型层、Attention Task 或物理 Core。
- cache.snapshot 是快照生命周期，不是 SWA/HCA 的逐 token 读写。
- KV 字节占比不沿用 TensorRT 参考日志；未知容量不伪造 GiB。
- 不将 DP16 等同 TP16；Worker 与物理 Rank 的映射需独立证据。
- Token 文本与 token ID 不在采集中；位置只在有明确上下文时推导。

## 阶段 1：可复现数据模型
提取请求、Prefill/Decode dispatch、scheduler output、16 Worker、run ID 和时间关系；存储来源哈希、单位、覆盖范围和缺失字段。输出 compact JSON 与可重复运行脚本。测试事件计数、ID 关联与时间边界。

## 阶段 2：播放轴与 Token
用测量的阶段替换固定 132/133/EOS 故事。复用现有播放轴与阶段按钮，不新增第二条轴。Prompt 8192，按明确请求归属推导生成进度；动态 batch 不能全部投射到单请求。底部复用 Token/Page 面板展示请求；点击请求保持层与视角。采集未覆盖完整30输出时保持真实边界。

## 阶段 3：Worker 与 Rank
复用共享等距立方体和主辅切换，呈现 Worker 0–15。使用 dispatch 的 worker_id/run_id 关联；物理 Rank 未确认前名称使用 Worker。移除 DeepSeek 的79.10GiB参考预算。保留缓存分支点击与当前层关联；不把图形面积解释为测量字节。

## 阶段 4：层图与缓存
维持43层及SWA/CSA/HCA架构，输入shape切为当前8192 Prompt / 单位置Decode。层动画仅为结构遍历，整次调用时间不得均分后冒充层耗时。保留已有KV图元，源码推导的窗口与压缩范围独立于实测快照事件。

## 阶段 5：消融与验收
逐项比较：去掉新增摘要是否仍能操作；是否存在重复请求选择器/播放轴；是否把未知量画成事实。能由 tooltip/info 承载的说明不常驻。自动检查模型切换、播放/暂停/跳转、Token选择、Worker切换、图层进入/退出、主题及面板resize；浏览器验证默认、DeepSeek播放、Front/KV、Worker主视图、Qwen回归与窄屏。保留自动化证据和未验证项，不能用静态测试代替视觉验收。本次用户已明确授权自动验收。最后更新catalog来源指纹并校验；未经本轮发布要求不push。

## 当前进展
- 已核查PTO事件清单及远端文件列表。
- 阶段1完成：`scripts/extract-deepseek-profile.py` 与 `deepseek-profile-data.json`，含来源SHA256；自动断言通过。
- Prefill 批次为1/8/8请求，共17次请求参与、16个唯一请求；一个请求重复出现在后两批，保留原始记录，不去重改写批次；Decode的request membership缺失，不将各批次输出数直接作为单请求位置。
- 阶段2–4完成：26次dispatch+采集结束的单播放轴、R0–R15请求选择、8192个Prompt历史位置、16 Worker主辅切换、当前层缓存分支检查。默认模型仍为Qwen，所有原控件位置与图元renderer保留。
- Decode request membership无法从trace恢复，因此不实现伪造的单请求Decode绝对位置/实际KV占用；面板明确作为Prompt查询，完整事实边界置于既有Info与tooltip。
- 阶段5完成：Chrome 1600×1000及800×900自动验收；详见 `deepseek-profile-validation.md`。

## 重建数据
```sh
rtk proxy python3 layer_stack/scripts/extract-deepseek-profile.py /Users/yin/PyPTO3-main/Data/DeepseekV4/推理数据prof/trace_view_pto_tp1_dp16_8k_16b.json layer_stack/deepseek-profile-data.json --html layer_stack/inference-layer-stack.html
```
JSON保存完整审计信息；HTML内嵌仅选取页面所需字段，不产生额外HTTP请求。脚本可同步两者，适配器不修改原数据。
