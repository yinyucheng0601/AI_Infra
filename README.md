<!-- AI Infra：AI 基础设施交互图解、LLM 推理可视化、编译 Pass、内存分析、Ascend 硬件架构。 -->

<div align="center">

# AI Infra

**用交互图解探索 AI 基础设施：LLM 模型计算与推理、编译 Pass、内存通信和 Ascend 硬件架构。**

**简体中文** · [English](README.en.md)

[![许可：保留全部权利](https://img.shields.io/badge/License-All_Rights_Reserved-555555)](COPYRIGHT.md)
![平台：Web 浏览器](https://img.shields.io/badge/Platform-Web_Browser-555555)
![在线浏览：无需安装](https://img.shields.io/badge/Online_View-No_Install-555555)

[探索 Library](https://yinyucheng0601.github.io/AI_Infra/ai-infra-research/index.html) · [交互作品 Patterns](https://yinyucheng0601.github.io/AI_Infra/ai-infra-research/patterns.html) · [设计方法 Skills](https://yinyucheng0601.github.io/AI_Infra/ai-infra-research/skills.html)

</div>

[![Atlas 950 Anatomy：从机柜群逐层进入 NPU 组件](ai-infra-research/web/media/atlas-950-anatomy-cover.png)](https://yinyucheng0601.github.io/AI_Infra/atlas-950-anatomy/index.html)

## 为什么看 AI Infra？

把分散在模型、编译器和硬件中的概念连接成可探索的视图，服务技术理解、设计评审与团队知识积累。

| 想弄清的问题 | 可以探索的内容 |
| --- | --- |
| 模型与算子如何组织计算？ | 模型架构、Attention 计算链与张量关系 |
| 编译优化如何改变程序？ | Pass 流程、数据流、控制作用域与内存绑定 |
| 一次推理请求如何执行？ | Prefill / Decode 时间轴、Host / Device 执行关系 |
| 内存对象与硬件如何组织？ | 地址与生命周期视图、机柜到 NPU 的逐层展开 |
| 复杂系统界面如何表达？ | 图元、交互 Patterns 与设计 Skills |

## 从这些作品开始

| 作品 | 可以查看什么 |
| --- | --- |
| [Atlas 950 Anatomy](https://yinyucheng0601.github.io/AI_Infra/atlas-950-anatomy/index.html) | 从机柜群到计算抽屉、组件和 950DT 封装的连续轴测展开 |
| [Paged Attention 计算图](https://yinyucheng0601.github.io/AI_Infra/ai-infra-research/patterns/paged-attention-graph/Design/Toolkit%20Studio/graph-style-preview.html) | QK Matmul、Softmax、PV Matmul 与 Online Update 的计算链 |
| [编译 Pass 可观测图解](https://yinyucheng0601.github.io/AI_Infra/ai-infra-research/reports/llm-compute/pass-observability-guide/index.html) | 沿同一 MatMul 案例关联编译环节、观测对象与视图 |
| [Memory Inspector](https://yinyucheng0601.github.io/AI_Infra/ai-infra-research/patterns/memory-inspector/index.html) | 按地址与静态生命周期探索函数内存分配，联动对象和源码 |
| [Inference Request](https://yinyucheng0601.github.io/AI_Infra/ai-infra-research/patterns/critical-path-swimlane/index.html) | 沿共享时间轴缩放一次推理请求，检查 Host 与 Device 关系 |

## 快速开始

**直接浏览：** 打开 [Library](https://yinyucheng0601.github.io/AI_Infra/ai-infra-research/index.html)，选择内容卡片进入图解；在线浏览无需安装 Python、Node 或本地依赖。上方封面可直接进入 Atlas 950 Anatomy。

**本地维护：** 已有仓库副本时，在仓库根目录运行以下命令启动预览服务（Python 3.10+，服务仅使用标准库）：

```sh
python3 ai-infra-research/scripts/serve.py
```

打开 <http://127.0.0.1:8766/>。完整跨仓原文阅读需按 [运行与维护](ai-infra-research/docs/running.md) 配置 `ai-infra-research/.local/sources.json`；部分页面另有外部资源依赖。预览服务只提供白名单资源。

## 内容如何组织

```text
AI_Infra/
├── ai-infra-research/
│   ├── catalog/assets.json   # 统一资产目录
│   ├── reports/             # 研究报告与交互图解
│   ├── patterns/            # 视觉与交互作品
│   ├── methods/             # 设计方法与 Skills
│   ├── web/                 # Library 页面源文件
│   └── scripts/             # 构建、目录校验与本地预览
├── atlas-950-anatomy/       # Atlas 950 轴测图解
└── atlas-950-explorer/      # Atlas 950 硬件探索
```

资产按设计价值精选收录；`catalog/assets.json` 是目录的唯一来源。Library 页面由 `web/` 与目录生成，维护时修改源文件并构建。各作品的来源与验证记录随资产保存。

## 适合谁看

- **AI Infra 与开发者工具设计师**：研究计算图、时间轴、内存视图和多层级系统交互。
- **模型、编译器与性能工程师**：借助图解讨论计算、执行和存储之间的关系。
- **技术负责人和研究团队**：在评审与交流中定位代表作品、设计思路和来源证据。

## 常见问题

<details>
<summary>AI Infra 是什么类型的仓库？</summary>

这是 AI 基础设施设计研究与交互可视化资产库，包含图解、报告、Patterns 和设计方法。收录对象以设计成果为单位。

</details>

<details>
<summary>应该先打开 Library、Patterns 还是 Skills？</summary>

Library 用于按主题探索内容；Patterns 集中浏览交互作品；Skills 用于了解设计方法、示例及对应操作流程。

</details>

<details>
<summary>在线浏览需要安装依赖或准备 NPU 吗？</summary>

不需要准备 NPU 或安装本地开发依赖，直接用浏览器打开已发布页面。个别页面加载外部字体或其他资源时需要网络连接。

</details>

<details>
<summary>如何本地预览，为什么部分原文打不开？</summary>

使用 Python 3.10+ 启动上面的预览服务。跨仓原文需要配置来源仓库映射；未连接的来源不会因克隆本仓库而自动获得。具体配置见运行与维护文档。

</details>

<details>
<summary>可以复制图表、复用代码或用于商业项目吗？</summary>

原创内容保留全部权利，公开访问不构成复用授权。请参阅下方完整版权条款和 [COPYRIGHT.md](COPYRIGHT.md)；独立标注许可的第三方材料按各自许可处理。

</details>

## 反馈与维护

发现失效链接、内容问题或交互异常，可通过 [GitHub Issues](https://github.com/yinyucheng0601/AI_Infra/issues) 提供页面地址、复现步骤与预期表现。维护者新增资产前请阅读 [收录规则](ai-infra-research/docs/scope.md) 和 [协作流程](ai-infra-research/docs/contributing.md)。

目录校验（在仓库根目录运行）：

```sh
python3 ai-infra-research/scripts/validate_catalog.py
```

**让模型、编译与硬件之间的关系看得见。**

## 致谢

Atlas 950 Anatomy 基于 Ryan 的 [Anatomy Skill 源仓库](https://github.com/wheresryan22/anatomy) 构建。感谢其轴测图解方法与几何工具包。 [官网](https://skills.wheresryan.sh/anatomy) · [原始 MIT 许可](atlas-950-anatomy/ANATOMY-LICENSE.txt)

[维护指南](ai-infra-research/README.md) · [联系作者](https://github.com/yinyucheng0601)

---

> **版权保留 · 禁止商用 · 未经书面授权禁止转载、复制、修改及再分发。** 公开访问不代表开放授权；本仓库原创内容采用下述保留全部权利声明。

## 版权与使用限制

Copyright © 2026 yinyucheng0601 及相关权利人。**保留全部权利（All Rights Reserved）。**

本声明适用于本仓库及其 GitHub Pages 网站中由仓库作者享有权利的原创内容，包括代码、文档、研究报告、文字、图表、插图、界面与交互设计、动画、演示、模板和其他原创资产。本声明不授予开源许可或一般性非商业使用许可。

除适用法律允许、适用平台条款要求或相关权利人另行明确授权的范围外，未经相关权利人事先书面许可，禁止以下行为：

1. **任何商业使用**：包括销售、付费分发、商业产品或服务集成、企业内部业务使用、客户项目交付、咨询、付费培训、广告、营销、引流，以及其他直接或间接获取商业利益的使用。
2. **复制与传播**：复制、转载、摘编、翻译、出版、上传、镜像、再分发或在其他网站、平台及资料库中展示全部或部分受保护内容；免费分享或注明出处不构成授权。
3. **修改与衍生使用**：改编、修改、移植、二次开发、提取或复用受保护的代码、图表、设计及其他资产，或据此制作、发布衍生作品。
4. **批量采集与模型使用**：抓取、批量下载或整理受保护内容用于数据集、模型训练、微调、蒸馏、评测或其他人工智能产品与服务。
5. **权利标识与转授权**：删除、遮盖或篡改版权声明、署名、水印和来源信息；冒充原创作者；擅自转授权或声称对本仓库内容享有所有权。

### 授权、例外与第三方内容

- **授权须明确取得**：任何超出法律及平台允许范围的使用，包括非商业使用，均须事先获得相关权利人的书面许可。可通过 [仓库所有者 GitHub 主页](https://github.com/yinyucheng0601) 联系。未回复不构成同意；授权仅在书面约定的用途、范围及期限内有效。
- **公开不等于授权**：仓库或网站可访问、可下载、可查看源码，不代表获得商用、转载、修改或再分发许可。GitHub 服务条款允许的平台内查看及 Fork 等行为，以该条款为限，不额外授予平台外使用权。
- **保留法定例外**：本声明不限制适用法律规定的合理使用、合理引用及其他不可排除的权利，也不主张对不受著作权保护的事实、思想或方法享有排他权。
- **尊重第三方权利**：第三方代码、依赖、字体、图片、引用材料及其他明确标注独立许可的内容，仍按各自原有许可及权利声明处理，本声明不改变或收回其授权。例如，仓库中的 `liquid-glass-controls` 第三方内容适用其随附的 MIT License。第三方许可不自动延伸至本仓库其他原创内容。
- **既有授权**：本声明不追溯撤销已合法授予且仍有效的许可；相关内容应按其适用版本的授权条款处理。

对于未经授权的使用，相关权利人保留依法要求停止侵权、删除侵权内容、赔偿损失及采取其他法律救济措施的权利。
