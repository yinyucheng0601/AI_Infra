# 第9页三阶段视觉核查

1600×900，Chrome 本地预览。stage-1.png / stage-2.png / stage-3.png 为关键帧。

- 同一 SVG 对象 identity 在三种布局间连续移动；不是三张图片淡入淡出。
- 分组停留3.2秒，重排1.8秒；关系图停留4.2秒，重排2.2秒；终帧持续停留。
- 重新进入第9页重播，离开取消 RAF；低动态偏好直接展示终帧。
- 检查了自动播放、三个关键帧、终帧稳定、低动态偏好；浏览器无 pageerror。
- 八组是汇报的知识组织维度，不是互斥领域分类。
- 跨域图的代表关系不是同一运行实例；不编码测量时长或固定编译映射。
- OP MatMul icon 复用正式 op-icons.js；Task 标识复用 visual-system.js。布局、泳道、端口和关系由本页构造。
- 图例依据：ai-infra-research/reports/llm-compute/diagram-legend-library/OBJECT-SYSTEM.md；知识组织依据 docs/visual-frame.md。

## 评价与限制

文字由原卡片段落减为对象名、短关系标签和一条结论。第二帧通过 Tensor→Operator、Task→Kernel 和 Collective→Task 连接不同关系维度。终帧用节点边、网格、泳道、资源包含框表达四种结构。

终帧中 Reduce、并发任务和第二个 Rank 是由语义视角引入的细化对象，以淡入补充；并非每个形状都由前帧一一变形而来。布局为16:9固定坐标；不是小屏响应式知识浏览器。时间线表示关系，不表示真实测量长度。静态导出需固定终帧，支持 ?knowledge-stage=3；普通进入自动播放。
