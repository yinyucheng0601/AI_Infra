// All hardware figures are inherited from ../atlas-950-explorer/index.html,
// ABOUT dialog, line 81 in the source snapshot. No live telemetry is implied.
export const model = Object.freeze({
  totalCards: 1024, npuPerRack: 64, drawersPerRack: 32, npuPerDrawer: 2,
  unifiedMemoryTB: 256, fp8Eflops: 1,
  package: { name: '950DT', memoryGB: 144, memoryTBps: 4, interconnectTBps: 2 },
});
export const rackEquivalents = model.totalCards / model.npuPerRack;
export const levels = [
  { title: '一个超节点，多柜协同', kicker: '01 / SUPERPOD',
    text: '计算分布在多台机柜中。灵衢互联把它们组织成一个协同计算系统：跨柜交换数据，才能让分布在不同 NPU 上的工作一起推进。',
    metric: '1,024', unit: '卡 · 整套展示配置',
    note: '图中 16 柜是按 64 NPU / 柜折算的规模表达；排列和互联设备的位置不代表实际部署拓扑。',
    hint: '点击机柜深入 · → 进入下一层', readout: '1,024 ÷ 64 = 16 柜等效' },
  { title: '机柜把计算单元组织起来', kicker: '02 / COMPUTE RACK',
    text: '计算抽屉装入导轨，背部接口接入互联系统。供电与散热支撑这些计算单元持续工作；一台机柜只是超节点的一部分。',
    metric: '64', unit: 'NPU / 计算机柜',
    note: '沿用原页面的 32 抽屉 × 2 NPU 布局假设。下部模块表达互联和供电的功能，不指定实际设备数量。',
    hint: '拖动滑杆拉出抽屉 · 点击抽屉进入', readout: '32 抽屉 × 2 NPU = 64 NPU' },
  { title: '打开抽屉，找到计算的起点', kicker: '03 / COMPUTE DRAWER',
    text: '两个 NPU 模组承接计算，CPU 与 DRAM 提供主机侧支撑。沿导轨装回后，背部盲插接口把这个抽屉接入机柜；冷板贴合器件，把热量带走。',
    metric: '2', unit: 'NPU / 抽屉 · 页面布局',
    note: '升起冷板可查看 NPU 模组。内部位置、封装分区与散热细节为原页面结构概念的重新绘制。',
    hint: '拖动滑杆升起冷板 · 点击部件查看', readout: 'NPU × 2 · CPU · DRAM · 背部接口' },
];
export const subjects = {
  npu: ['NPU 模组', '执行张量计算。此处沿用每抽屉两个模组的布局；封装参考选用 950DT，不能用它反推整套展示配置。'],
  cpu: ['CPU 与主机内存', 'CPU 负责主机侧控制与任务组织，旁侧 DRAM 是主机内存，与 NPU 封装内存属于不同层级。'],
  ports: ['背部盲插接口', '抽屉沿导轨推进，与机柜侧接口对接。互联让 NPU 可以交换数据；本图不指定链路路由或交换层级。'],
  cold: ['液冷冷板', '冷板贴合发热器件，把热量传向液冷回路。升起动作用于观察装配关系；图中没有运行温度或流量读数。'],
};
