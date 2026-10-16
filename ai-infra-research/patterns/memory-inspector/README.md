# Memory Inspector · MI-01

2026-10-16 用户确认定稿。index.html 进入 MI-01 / Pass 32；demo.html 为来源独立 HTML 的完整快照。

唯一开发入口：PyPTO3-main/Design/pass-error-cases。更新时构建来源，再同步 demo.html 并更新来源指纹。

数据由 memory_map.py 对 32_after_AllocateMemoryAddr.py 执行 AST 静态分析生成：38 函数、697 Tiles、108 Views。包含地址、生命周期、别名合并、View、地址冲突与容量越界分析。

交互：固定坐标标注、独立横纵比例尺、拖动、网格、空间筛选、语义染色、对象详情、适配与重置。
