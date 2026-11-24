# 用户提供的物理器件 SVG

深色版本使用用户提供的 cpu.svg、npu.svg、dpu.svg、NIC.svg、switch.svg，保留当前渲染。浅色版本直接使用 cpu-light.svg、npu-light.svg、dpu-light.svg、NIC-light.svg、switch-light.svg，保留文件的配色、渐变、透明度和几何结构，不再经过程序灰度映射。

全部原文件逐字节复制到 user-icons/，SHA256 与原 viewBox 分别记录于 provenance.json 和 light-provenance.json。内嵌 HTML 仅为局部 ID 和引用加命名空间。Downloads 原文件不变。

深色器件沿用 160/149 缩放倍率。浅色器件统一使用 160/154，使最宽的 NPU 在 160 像素基准中完整显示；交换机按相同倍率保持横向比例。浅色页面背景保持 #F8F8F8。

已通过 approved-icons.js 接入主 Demo 第 10 步的 POD 与板级物理视图；原 hw-* 定义保留，通过独立 deployment-hw-* 符号避免影响其他步骤。HTML 内嵌全部资源，可单文件分享。
