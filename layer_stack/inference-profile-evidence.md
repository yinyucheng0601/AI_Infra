# Qwen TP2 数据接入证据

阶段0/1，2026-11-19。提取入口为scripts/extract-inference-profile.py，产物为inference-profile-data.json；尚未替换页面播放故事。

- torch kernel_details实际解析到5次aicore_kernel_0；按采集脚本顺序关联Prefill与Decode1–4。每次保留独立实测duration。
- Prefill、Decode两份L2各643事件，按orchestrator提交顺序恢复Embedding、40×16层内事件、Final RMS和LM Head。operator与layer归属是脚本规则推导，时间与core来自记录。
- L2和torch来自不同进程采集；L2 capture不绑定invocation ID，不能将一份decode细节复制给四步。
- TP=2声明Rank0/1；现有细粒度文件仅Rank0。Rank1无复制指标。
- Prompt位置、生成token ID/文本、page size和物理页映射尚未从这份运行确认，全部null。结束为capture-end，不推断EOS。
- 独立Compute Explorer的128-token Page、28页容量、24 Blocks不进入此运行数据。
- 输出仅含相对时间、稳定ID、算子/层/core与来源文件相对路径，不含采集机hostname、PID或家目录。

验证：提取器校验5调用、每capture643事件、runtime task唯一性；适配器以captureId和rank隔离细粒度查询。界面接入、TP分片精确布局、准备阶段Block映射仍待后续阶段。

## 阶段3：相对输入位置

进一步盘点未发现保存的Prompt长度、输入token快照或采集stdout；采集脚本引用的pypto_qwen3_tp_fused实现不在已检索源码文件中。不能仅由Prompt文字重建当时tokenizer结果。

页面暂以N表示Prompt长度：Prefill处理0…N−1；四次Decode输入依次为N、N+1、N+2、N+3，来自采集代码seq=ntok+1后逐步递增（seq含当前输入，位置=seq−1）。点击相对位置明确seek到对应调用，保留当前层；未声称生成token文本、物理Page或字节数。绝对Page图依赖输入长度和缓存布局，继续待接入。

## 用户授权的交互 mock（2026-11-19）
用户明确允许缺失数据使用 mock。Qwen Token/Page 展示采用 Prompt 长度132、Page size128、28页容量；Prefill观察位置131，Decode1–4输入132–135。读取范围0至当前输入（含当前写入），当前槽蓝色；独立检查不改变执行位置。以上不是TP2采集字段，不回填原始profile JSON；整网调用时长仍来自torch。
