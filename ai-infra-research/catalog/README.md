# 资产目录契约 v1

assets.json 是人工筛选后的正式索引，不是扫描结果。当前收录 18 篇知识内容；已排除 A5 PMU 中间稿及三篇不纳入汇报范围的过程文档。此处 reviewed 仅指题名/内容提纲/设计范围已核对，不等于技术事实或视觉功能验收。

每项字段：

| 字段 | 含义 |
|---|---|
| id | 全库稳定的小写英文/数字/连字符标识 |
| title | 展示标题 |
| type | knowledge / case / pattern / method |
| summary | 一句话说明设计价值 |
| domains | 领域标签数组 |
| media | 表达媒介数组，如 web / tui / 3d / document |
| status | draft / reviewed / validated / archived |
| visibility | internal / public；public 必须有 publicationReview |
| content | 本仓库内可访问的相对文件路径 |
| sources | 来源对象数组：repository（项目名）、url（可空）、path（仓内相对路径）、revision（可空） |
| validation | 验证证据字符串数组；validated 时不得为空 |
| related | 关联资产 ID 数组 |
| publicationReview | 可选；公开发布审核依据 |
| topics | 多选数组：ecosystem / operators / training / inference / competitive / experience / visual |
| author | 卡片署名；当前默认 Yucheng，Dynamo 竞争分析为 Yuanfeng |
| form | 内容形式，如白皮书、知识地图、研究洞察、设计说明 |
| designValue | 为什么属于设计范围、用于什么设计工作 |
| outline | 阅读提纲字符串数组 |
| reviewedAt | 目录审阅日期 |

来源对象额外包含 sha256，记录策展时源文件的内容指纹。预览服务比对当前源文件并提示变化，不静默覆盖指纹。repository 使用配置键 pto / pypto / devkit，本机根路径只存在于 .local/sources.json。

来源 URL 或 revision 为空表示待核实。索引不存本机绝对路径；暂未完成来源确认的草稿仍须提供真实项目名及相对路径。
