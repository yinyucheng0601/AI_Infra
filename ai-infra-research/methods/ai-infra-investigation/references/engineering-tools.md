# 工程工具与复跑

工程工具位于本 Skill 的 `scripts/engineering/`，以下命令从该目录执行。根据任务按需调用。普通分析和只读取 Markdown 时可直接开始。

## 输入与验证

- [仓库锁](../scripts/engineering/config/repository-lock.json)约束本包来源与资产范围，[用例锁](../scripts/engineering/config/fixture-lock.json)标注合成和目录来源用例。原始 Kernel 和 Trace 由用户或本地来源提供，先校验指纹。原始采集、投影输出和验收日志留在任务目录。
- [跨层规范](cross-layer-identity-contract.md)与[任务契约](task-contract.md)确定身份、方向与证据。图结构对应 1.0 旧图、1.1 运行投影和 1.2 关系图，v1.3.0 增补三类 Unpack 对象和关系。另附可视化计划 Schema。
- 使用 Python 3.10+。需要图校验、Trace 投影或 Unpack 时，在任务虚拟环境执行 `python3 -m pip install -r requirements.txt`。依赖缺失时记录具体包与安装入口，继续可确认的分析。
- Schema、关系规则、目录候选和固定来源适用范围见[限制](../scripts/engineering/reports/KNOWN-LIMITATIONS.md)。

| 可执行入口 | 调用与结果 |
| --- | --- |
| 包校验 | `python3 scripts/validate_package.py` 核对工具清单、版本、来源锁、路径、JSON 和哈希。 |
| 工程回归 | `python3 scripts/run_regression.py --out-dir /path/to/task/validation` 复跑结构、图语义、Python 语法与原始断言。 |
| 图校验 | `python3 scripts/validate_graph.py --json /path/to/graph.json` 以逐边结果决定展示。1.1 图另传 `--trace /path/to/capture.json` 复查原始字段。非零退出阻止生成，零退出仍检查逐边是否未决。无图参数时检查所附图 fixture。 |
| Unpack | `python3 scripts/adapt_unpack.py --kernel /path/to/unpack.cpp --configs examples/unpack-configs.json` 从锁定的二维 Compact FP16 axis 1 配置（行 1–4096，列 2–15）输出 Task、源码步骤、候选绑定、证据图和未覆盖尾行。版本不符、非法配置或关系不成立时退出。既有 checkout 中的 Unpack builder 接收 `--unpack-configs`、`--unpack-out`，并可通过 `--unpack-adapter` 选择当前安装路径。 |
| DeepSeek | `python3 scripts/build_trace_example.py --trace /path/to/capture.json --out-dir /path/to/task/trace` 检查固定采集指纹及 1110、1112、1269 三条记录，生成证据图、原始摘录和离线 Inspector。使用同一 Trace 复查图；1.1 的确认边从图的 edges 读取，兼容的 CLI JSON 摘要不展开这些边。 |
| PyPTO 数据盘点 | `python3 scripts/scan_pypto_data.py /path/to/PyPTO3-main/data --out /path/to/task/inventory.json` 按文件输出路径、大小、摘要与读错误。目录存在才扫描；盘点只提供文件身份。 |
| 离线示例 | `python3 scripts/build_example.py` 重建内置示例；`--graph /path/to/relation.json --out /path/to/task/relations.html` 校验 1.2 图后生成关系和证据定位。 |

供 Python 消费者导入的模块从上述工具根解析。将该根加入调用进程的模块搜索路径后，可用 `adapters.pypto_trace_adapter.normalize_trace` 规范化事件，或用 `normalize_event` 兼容单条记录。匿名单条记录缺原始索引时使用未解析占位，批量保留记录差异。另有固定来源的 `adapters.deepseek_capture`、`adapters.unpack_source` 和 [Pattern 候选路由](pattern-routing.md)。这些模块按实际数据覆盖调用，调用后仍需校验和验收。

使用 [随包任务输入](../scripts/engineering/examples/request.json)、[可视化计划](../scripts/engineering/examples/visualization-plan.json)和[离线示例](../scripts/engineering/examples/artifact/index.html)理解基本交接。正式交付按[呈现契约](presentation-semantics.md)及[界面交付约定](ui-delivery.md)补齐来源、证据、验证和复跑说明。[上游版本记录](../scripts/engineering/reports/CHANGELOG.md)记录 v1.3.0 行为与历史验证范围。

## Design System 资产登记

从 `ai-infra-research/catalog/assets.json` 选择资产 ID。网页目录由 JavaScript 渲染，读取器可能只得到外壳。从工程工具目录运行：

```sh
rtk python3 -B scripts/register_design_assets.py --repository /path/to/AI_Infra --asset <catalog-id> --output /path/to/task/design-assets.json
```

按需重复 `--asset`，省略时盘点整个目录。用 `--sources /path/to/sources.json` 提供显式跨仓映射。`--strict` 保留登记报告并对静态缺口返回非零。登记按工作区字节核验来源 SHA256，保留 catalog revision 和验证声明。读取状态、漂移、排除及外链分别记录。交付引用、指纹和调用契约，复制或修改资产须先取得授权。

可运行 `rtk node tests/design_assets_browser.cjs /path/to/AI_Infra /path/to/task/design-assets.json` 对 Unpack 和 DeepSeek V4 两个入口复核。登记需包含 `unpack-layout-inspector` 和 `model-architecture-v41`。用 `PLAYWRIGHT_MODULE` 指定 Playwright 模块路径，用 `CHROMIUM_EXECUTABLE` 指定浏览器。脚本按哈希加载已登记依赖，输出独立的逐入口结果。静态依赖覆盖字面引用和已声明资源，补充验证动态请求与未覆盖交互。
