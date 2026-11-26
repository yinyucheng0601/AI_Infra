# 训练可视化 整合新版

入口：`../index_training.html`。以既有 Rank Atlas 为宿主，整合 Layer Stack、完整 MoE 训练计算图与多 Rank 内存和通信关系。默认配置及容量由共享 Rank 模型推导；播放表示训练步骤顺序，不表示实测耗时。

- Layer / Rank 主辅切换，分别保存相机。
- 连续相邻层吸附、选中邻层跟随、单击转正并聚焦 MoE；Esc 返回。
- 专家分组与 Dispatch / Combine / TP 通信精确关联 Rank。
- F/B、微批、累积和参数更新共用一个时钟。
- 深浅主题、全视口画布、拖拽/滚轮/适应、键盘入口与 reduced-motion。
- Liquid Glass 使用正式 `patterns/liquid-glass-controls` v2 原文件，含 LICENSE；播放条不使用模糊背景。独立通信/OOM 场景及旧 Tab 已移除。

## 维护

在 AI_Infra 根目录运行：

```sh
rtk python3 ai-infra-research/patterns/npu-memory-atlas/variants/index_training/build.py
```

`build.py` 和 `reference-build.py` 从仓库内现有源提取 UI，生成独立入口与资源；不要直接改生成文件。`provenance.json` 记录实际来源指纹。仅消费的 inference 组件与已提交源一致时固定其 Git revision，避免把无关默认模型草稿带入发布。

本机预览使用 `preview.py`，只绑定回环地址和任务白名单；正式入口本身是普通静态页面，无本机路径或本地服务依赖。

## 检查

`verify-model.cjs`、`verify-clock.cjs` 检查模型、布局及全模型时钟。`verify-corrections.cjs`、`verify-stack-journey.cjs`、`verify-moe-focus.cjs`、`verify-ui-linkage.cjs`、`verify-glass.cjs` 覆盖完整操作路径、通信分组和深浅材质。浏览器检查使用工作区既有 Playwright 与 Chrome；检查输出不作为运行依赖发布。
