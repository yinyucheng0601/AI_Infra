# 算子应用上下文与修复记录

核查日期：2026-10-28。目标仓库固定版本仍为 `04c0c97dc5623053fefc585786697a8c19b9504a`。

## 它在哪里使用

LogSumExp 是通用归约原语，语义简洁不代表只处理少量数据。当前 case 包含 390663 个 float32 输入、2067 个输出，每个输出汇聚 189 项；这只是挑战赛中的一个测试配置。

一个更大应用是语言模型的 next-token 训练。模型 hidden 经 LM Head 形成词表 logits z。对每个有效预测位置，数学上 `logZ = logsumexp(z, vocab_axis)`、`log p = z - logZ`，再根据目标 token 形成负对数似然。CrossEntropyLoss 等价于 LogSoftmax 后接 NLLLoss，实际框架可以融合这些计算，不要求有独立 LogSumExp Kernel。

页面“算子上下文”采用 N 个有效预测位置、隐藏维度 H、词表大小 V 的符号形状；这是通用数学关系，不是把当前 [7,27,53,39] 测试强行解释成模型维度。当前 case 归约前两轴，语言模型例子归约词表轴，两者不能直接等同。

依据：
- [PyTorch 2.14 LogSoftmax](https://docs.pytorch.org/docs/2.14/generated/torch.nn.LogSoftmax.html)：对数归一化公式。
- [PyTorch 2.14 CrossEntropyLoss](https://docs.pytorch.org/docs/2.14/generated/torch.nn.CrossEntropyLoss.html)：LogSoftmax + NLLLoss 等价关系。
- [Transformers GPT-2 源码](https://github.com/huggingface/transformers/blob/main/src/transformers/models/gpt2/modeling_gpt2.py)：模型隐藏状态经过 lm_head，标签移位后调用 CrossEntropyLoss。这是外部应用参考，未作为目标仓库的源码证据，也未复制到目标算子快照。

## 仓库有没有修复

只对公开目标仓库作有限结论，不代表其它 fork、私有版本或作者本地没有方案。

- 当前远端公开分支：master=`04c0c97dc5623053fefc585786697a8c19b9504a`；argmax_with_value=`7e0271517f1c5a43f4f7e26c663147c15ae0ba98`，后者早于当前主干。
- 本地完整历史中 `git log --all -- basic/logsum_exp` 只有 `ca9b9b36d096b5e9e67f9eaae2d5ccf4d9e746fa`（PR #11 的合并提交）。当前文件已包含该更新。
- [PR #11](https://github.com/linnlh/ascendc-competition-s3/pull/11) 于 2025-01-26 合并，提交包括“更新 LogSumExp 算子”“更新 LogSumExp”和 README 更新；没有 PR 正文或 issue comments 提供修复解释。
- GitHub API 查询全部 issues（含 PR）返回 #1–#13，均已关闭；未发现后续 LogSumExp/case5 修复条目。
- 当前根 README 状态为 4/5，算子 README 仍记录 case5 历史性能测试失败。这些文字不构成本轮运行结果，也没有确认的原始 profiling。

因此页面不能提供“已有且已验证”的修复按钮。可继续核对的对象是：实际 API 路由、有效轴分类后的未初始化数组读取、尾块合法搬运边界、yQueue 分配及输出形状契约。仅作为调查清单；本轮不修改算子或声称修复有效。

“复制给 coding agent”将当前坐标、选择对象、参数、固定源码位置和用户问题打包成可读代码文本，目的是让原会话重现调查状态。它不执行修复、不发送消息，也不建立实时回传。入口已收进“继续调查”。
