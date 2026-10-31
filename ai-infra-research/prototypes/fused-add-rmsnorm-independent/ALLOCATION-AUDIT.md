# CANN 分配地址调查 · 2026-10-30

## 结论
尚不能将 displayOffset 升格为实际 UB 地址。CANN 8.5.0 是明确的构建预设，但作者实际构建所用 SDK 未锁定；未取得匹配版本分配器头文件或编译产物。

## 已核对
- 固定算子提交 7729cdf7bc37d77bd3c82448414b77cea3e96637 的 CMakePresets.json 设置 ASCEND_CANN_PACKAGE_PATH=/usr/local/Ascend/cann-8.5.0。
- checker/build.sh:23–32 用 ASCEND_TOOLKIT_HOME 覆盖上述设置。因此预设不等于运行版本。
- checker/run.sh 加载仓库根 env.sh，该文件未包含于作者固定提交。
- 课程 ZJUSCT/HPC101 当前 env.sh 依次尝试 cann/set_env.sh、ascend-toolkit/latest/set_env.sh、cann-8.5.0/set_env.sh；前两项软链接的实际目标未知。课程脚本为当前版本旁证，不是作者历史容器快照。内容及 Git blob SHA 保存在 allocation-evidence.json。
- 固定仓库 tree 没有 build_out、kernel object、反汇编或地址日志。课程说明明确不提交构建产物。
- 本机标准 /usr/local/Ascend 与 /opt/Ascend 路径没有 SDK；工作区文件检索没有匹配分配器头文件。
- 尝试官方 asc-devkit 8.5.0 头文件 URL，返回 HTML 网页壳，不是头文件；不视为已读取实现，也不能据此判断该标签是否存在。

## 缺少的最小输入
作者/复现实验环境实际 ASCEND_TOOLKIT_HOME 的 realpath 和 SDK version.info；该 SDK 中 kernel_tpipe*、kernel_tque* 与缓冲池相关头文件及依赖；或相同 shape/tiling/编译选项的编译产物与可定位源码的反汇编/地址日志。应先核实 910B 分支、UB 起点、对齐、分配顺序及 AllocTensor 槽选择，再推导地址。

## 已知与未知分开
InitBuffer 大小、缓冲数量、显式 row&1 输出缓冲身份由算子源码支持；队列显示分轨和 displayOffset 仍是逻辑排布。没有修改页面数据或宣称设备验证。

## 链接
- https://github.com/llrnb666-arch/HPC101-AscendC-FusedRMSNorm/blob/7729cdf7bc37d77bd3c82448414b77cea3e96637/src/ascendc/CMakePresets.json
- https://github.com/llrnb666-arch/HPC101-AscendC-FusedRMSNorm/blob/7729cdf7bc37d77bd3c82448414b77cea3e96637/checker/build.sh
- https://github.com/ZJUSCT/HPC101/blob/master/src/lab3p5/env.sh
- https://hpc101.zjusct.io/lab/Lab3.5-AscendC-Op/
