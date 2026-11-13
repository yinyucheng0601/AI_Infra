// Representative relations, not a measured compilation or execution trace.
// OP icon: diagram-legend-library/op-icons.js matmul; Task: visual-system.js task path.
export const domains=[{"name": "模型与算法"}, {"name": "张量与算子"}, {"name": "编译与内核"}, {"name": "指令与存储"}, {"name": "硬件与集群"}, {"name": "并行与通信"}, {"name": "任务与运行"}, {"name": "观测与证据"}]
export const objects=[{"id": "Layer", "label": "Layer", "a": [116.0, 231.4], "b": [160, 230], "c": [145, 231.4], "used": true, "kind": "object"}, {"id": "Attention", "label": "Attention", "a": [255.0, 231.4], "b": [260, 231.4], "c": [260, 231.4], "used": false, "kind": "object"}, {"id": "Loss", "label": "Loss", "a": [116.0, 300.94], "b": [120, 300.94], "c": [120, 300.94], "used": false, "kind": "object"}, {"id": "Tensor", "label": "Tensor", "a": [430.0, 231.4], "b": [700, 230], "c": [840, 218.86], "used": true, "kind": "tensor"}, {"id": "Shape", "label": "Shape", "a": [569.0, 231.4], "b": [585, 231.4], "c": [585, 231.4], "used": false, "kind": "object"}, {"id": "Operator", "label": "Operator", "a": [430.0, 300.94], "b": [420, 230], "c": [320, 231.4], "used": true, "kind": "op"}, {"id": "IR", "label": "IR", "a": [744.0, 231.4], "b": [770, 231.4], "c": [770, 231.4], "used": false, "kind": "object"}, {"id": "Pass", "label": "Pass", "a": [883.0, 231.4], "b": [910, 231.4], "c": [910, 231.4], "used": false, "kind": "object"}, {"id": "Kernel", "label": "Kernel", "a": [744.0, 300.94], "b": [420, 390], "c": [505, 231.4], "used": true, "kind": "object"}, {"id": "Tile", "label": "Tile", "a": [883.0, 300.94], "b": [910, 300.94], "c": [910, 300.94], "used": false, "kind": "object"}, {"id": "DMA", "label": "DMA", "a": [1058.0, 231.4], "b": [1095, 231.4], "c": [1095, 231.4], "used": false, "kind": "object"}, {"id": "Register", "label": "Register", "a": [1197.0, 231.4], "b": [1235, 231.4], "c": [1235, 231.4], "used": false, "kind": "object"}, {"id": "HBM", "label": "HBM", "a": [1058.0, 300.94], "b": [590, 339.7], "c": [1200, 306.64], "used": false, "kind": "object"}, {"id": "Core", "label": "Core", "a": [116.0, 469.6], "b": [1230, 390], "c": [1210, 575.68], "used": true, "kind": "object"}, {"id": "GPU", "label": "GPU", "a": [255.0, 469.6], "b": [1080, 390], "c": [1085, 575.68], "used": true, "kind": "object"}, {"id": "Rank", "label": "Rank", "a": [116.0, 539.14], "b": [920, 390], "c": [950, 575.68], "used": true, "kind": "object"}, {"id": "Node", "label": "Node", "a": [255.0, 539.14], "b": [260, 563.14], "c": [260, 563.14], "used": false, "kind": "object"}, {"id": "TP", "label": "TP", "a": [430.0, 469.6], "b": [850, 339.7], "c": [780, 476.5], "used": false, "kind": "object"}, {"id": "EP", "label": "EP", "a": [569.0, 469.6], "b": [585, 493.6], "c": [585, 493.6], "used": false, "kind": "object"}, {"id": "Collective", "label": "Collective", "a": [430.0, 539.14], "b": [1100, 339.7], "c": [1020, 476.5], "used": false, "kind": "object"}, {"id": "Task", "label": "Task", "a": [744.0, 469.6], "b": [700, 390], "c": [215, 500.44], "used": true, "kind": "task"}, {"id": "Stream", "label": "Stream", "a": [883.0, 469.6], "b": [910, 493.6], "c": [910, 493.6], "used": false, "kind": "object"}, {"id": "Event", "label": "Event", "a": [744.0, 539.14], "b": [700, 570], "c": [365, 500.44], "used": true, "kind": "object"}, {"id": "Trace", "label": "Trace", "a": [1058.0, 469.6], "b": [420, 570], "c": [540, 569.98], "used": true, "kind": "object"}, {"id": "Metric", "label": "Metric", "a": [1197.0, 469.6], "b": [335, 624.7], "c": [540, 624.7], "used": false, "kind": "object"}, {"id": "Profile", "label": "Profile", "a": [1058.0, 539.14], "b": [1095, 563.14], "c": [1095, 563.14], "used": false, "kind": "object"}, {"id": "Shard", "label": "Shard", "a": [569.0, 300.94], "b": [335, 339.7], "c": [1030, 218.86], "used": false, "kind": "tensor"}]
export const relations=[
  {
    "id": "Layer-Operator",
    "source": "Layer",
    "target": "Operator",
    "label": "包含",
    "type": "structure",
    "offset": [
      0,
      0
    ]
  },
  {
    "id": "Operator-Kernel",
    "source": "Operator",
    "target": "Kernel",
    "label": "编译映射",
    "type": "mapping",
    "offset": [
      0,
      0
    ]
  },
  {
    "id": "Kernel-Core",
    "source": "Kernel",
    "target": "Core",
    "label": "资源映射",
    "type": "mapping",
    "offset": [
      0,
      0
    ]
  },
  {
    "id": "Tensor-Operator",
    "source": "Tensor",
    "target": "Operator",
    "label": "输入",
    "type": "structure",
    "offset": [
      -23,
      0
    ]
  },
  {
    "id": "Tensor-Shard",
    "source": "Tensor",
    "target": "Shard",
    "label": "切分",
    "type": "mapping",
    "offset": [
      0,
      0
    ]
  },
  {
    "id": "Shard-HBM",
    "source": "Shard",
    "target": "HBM",
    "label": "驻留",
    "type": "mapping",
    "offset": [
      0,
      0
    ]
  },
  {
    "id": "Task-Kernel",
    "source": "Task",
    "target": "Kernel",
    "label": "启动",
    "type": "mapping",
    "offset": [
      35,
      0
    ]
  },
  {
    "id": "Kernel-HBM",
    "source": "Kernel",
    "target": "HBM",
    "label": "访问",
    "type": "structure",
    "offset": [
      35,
      0
    ]
  },
  {
    "id": "GPU-Core",
    "source": "GPU",
    "target": "Core",
    "label": "包含",
    "type": "structure",
    "offset": [
      0,
      0
    ]
  },
  {
    "id": "Rank-GPU",
    "source": "Rank",
    "target": "GPU",
    "label": "部署映射",
    "type": "mapping",
    "offset": [
      38,
      0
    ]
  },
  {
    "id": "TP-Collective",
    "source": "TP",
    "target": "Collective",
    "label": "通信需求",
    "type": "mapping",
    "offset": [
      0,
      0
    ]
  },
  {
    "id": "Rank-Collective",
    "source": "Rank",
    "target": "Collective",
    "label": "参与",
    "type": "structure",
    "offset": [
      30,
      0
    ]
  },
  {
    "id": "Task-Event",
    "source": "Task",
    "target": "Event",
    "label": "产生运行事件",
    "type": "evidence",
    "offset": [
      0,
      0
    ]
  },
  {
    "id": "Event-Trace",
    "source": "Event",
    "target": "Trace",
    "label": "记录于",
    "type": "evidence",
    "offset": [
      0,
      0
    ]
  },
  {
    "id": "Trace-Metric",
    "source": "Trace",
    "target": "Metric",
    "label": "聚合统计",
    "type": "evidence",
    "offset": [
      30,
      0
    ]
  },
  {
    "id": "Collective-Task",
    "source": "Collective",
    "target": "Task",
    "label": "调度为通信任务",
    "type": "mapping",
    "offset": [
      0,
      0
    ]
  }
]
export const finalRelations=[["Layer", "Operator", "组成"], ["Operator", "Kernel", "编译"], ["Tensor", "Shard", "切分"], ["Shard", "HBM", "驻留"], ["Task", "Event", "记录"], ["Event", "Trace", "观测", 25, 0], ["TP", "Collective", "要求"], ["Rank", "Collective", "参与", -15, 0], ["Rank", "GPU", "部署"], ["GPU", "Core", "包含"]]
export const opIcon="<path d=\"M3 4h4M3 4v16h4M21 4h-4M21 4v16h-4M8 7h3v3H8zM14 7h3v3h-3zM8 14h3v3H8zM14 14h3v3h-3z\"/>"
export const taskIcon="<path d=\"M9 10H27M9 18H20M9 26H16M23 22L28 26L23 30\"/>"
