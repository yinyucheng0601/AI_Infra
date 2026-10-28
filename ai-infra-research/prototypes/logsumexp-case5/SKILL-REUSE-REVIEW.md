# 图元复用复盘与 Skill 改进候选

本轮只修改原型，不修改全局 Skill、正式图元或 Pattern。

## 原因

此前 renderScope 手写 3×8 高亮方格和下置标签，手写无类别图标的 OP 胶囊，并未调用完整库 renderer。引用颜色、尺寸和说明不等于复用组件，这是本次实现失误。

仓库同时存在旧 visual-system.js 通用函数与后来确认的带图标 OP、叠字 Tensor。不同入口的几何与标签约束不一致，单靠阅读 prose 容易取到旧版本。不能把这种版本分歧交给 agent 靠印象选择。

## 已在原型落实

build.py 从 training-parallel-communication-v1.html 提取 dataTiles/tensorNode，从 diagram-legend-library/build.cjs 提取 opGlyph/opNode，并内联 op-icons.js。glyph-provenance.json 记录三份源文件 SHA256。缺失函数或未知 OP 类别直接失败，不默认套 Linear 图标。Tensor 名称与 shape 叠在网格内，OP 图标与节点统一缩放。主画布逐元素矩阵继续承担精确索引语义。

Case5、TilingKey、Kernel 入口是调用路径标记，不套 OP 图元；没有现成 Subtract 类别时采用公式标注，不虚构图标。LM Head 显式映射 linear，LogSumExp 与损失聚合映射 reduce。

## 建议加入 Skill 的强制流程

1. 单一资产入口：manifest 明确 approved variant、renderer、依赖、版本及哈希。旧入口标明 deprecated；说明和示例由同一源生成。
2. 复用必须调用 renderer 或提取原始 SVG，不允许根据截图、颜色表或自然语言重画。仅可改变暴露的数据和布局参数。
3. 生成前提交内部 usage manifest：对象语义 → variant → category → renderer。Tensor 标签位置、OP 类别图标是必填契约；未知类别不能自动回退。
4. 布局与图元分离：layout 控制坐标、端口和折线；renderer 控制内部几何。宿主 CSS 不得覆盖图元字体、标签层次或 icon 尺寸。
5. 验收检查实际输出：Tensor 文字包围盒在 grid 内，OP 含 category badge/icon，角色颜色不被选择或异常色替代；与当前 approved 基线对照。仅“函数存在”不能算视觉验收。
6. 不把 case、tiling、函数入口等元信息画成数学 OP；区分逐元素数据矩阵和抽象 Tensor 图元。

## 本轮验证

离线构建成功；原有全部 2067 输出映射验证通过。HTTP 本地预览已确认文字覆盖网格、三处 OP 均显示类别图标。未运行 NPU。
