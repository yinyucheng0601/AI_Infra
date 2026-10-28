# Case5 · 源码分析记录

分析日期：2026-10-28。固定仓库：https://github.com/linnlh/ascendc-competition-s3 ，commit `04c0c97dc5623053fefc585786697a8c19b9504a`。下述路径均相对于 `basic/logsum_exp/`。文件内容、SHA256 与固定版本链接见 `sources.json`；页面内嵌相同证据，可离线检查。

## 数学与调用

`tests/LogSumExpCase5/scripts/gen_data.py:12-15`：float32，均匀随机输入 [-3,3)，shape [7,27,53,39]，`torch.logsumexp(x,[0,1])`。数学输出 y[c,d] = ln Σa=0..6 Σb=0..26 exp(x[a,b,c,d])，shape [53,39]，2067 个输出，每个 189 个不同输入。输入共 390663 个元素，1562652 B。行主序 stride 为 [55809,2067,39,1]，元素偏移 `((a*27+b)*53+c)*39+d`，字节偏移乘 4。

`tests/LogSumExpCase5/src/main.cpp:25-38` 明确传入 dim=[0,1]、keepdim=false、ACL_FLOAT，但输出描述为扁平 [2067]。`src/op_runner.cpp:311-334` 调用 aclnnLogSumExpGetWorkspaceSize / aclnnLogSumExp。其元素数与参考一致，形状不同。Host `op_host/log_sum_exp.cpp:111-116` 的 InferShape 直接复制输入形状；实际 API 路由、形状校验与是否到达本 Kernel 需要作者或运行确认。

README:15-16 的“性能测试失败”是固定版本中的历史文字，未包含本轮运行证据，不能认定当前仍失败。

## Host 与当前生效路径

`op_host/log_sum_exp.cpp:29-53,77-103`：tileNum=2067、tileLen=1、shapeLen=4、dimLen=2、shape=[7,27,53,39]、dim=[0,1]、strides=[55809,2067]、TilingKey=2、BlockDim=1。连续轴合并代码已注释。UB 容量和 dtypeSize 被读取，但不参与该分块决策。tiling.h:5-12 的 shape/dim/strides 数组容量均为 10，仅有效前缀有确定赋值，其余不是已知零。

`op_kernel/log_sum_exp.cpp:1078-1082` 调用 **735 行开始的当前 KernelLogSumExp2**，不使用 384 行开始的注释旧版本，也不使用 KernelLogSumExp。入口不向 Kernel2 传递 strides。

## 分块、搬运、整理和归约

Kernel:4-5,736-760：BUFFER_NUM=2，BLOCK_SIZE=32 B，float32 下 elemPerBlk=8；outerTileLen=8，outerTileNum=4，outerTailTileLen=7；innerTileLen=16，innerTileNum=1，innerTailTileLen=11。tileElemBase=7 (766-769)。反转轴后 shape=[39,53,27,7]，有效 dim=[3,2]，预期 tileDim=[1,0] (783-793)。

**模型前提**：上述轴分类依赖有效 dim 前缀正常分类。783-793 的循环在 dimOffset 达到 dimLen 后仍读取 dim[dimOffset]；Host 没有初始化这个数组尾部。原型不把未初始化内存设为零，不声称能确定这段 C++ 的所有实际执行结果。后面的请求枚举以预期 tileDim=[1,0] 为显式条件。这是待确认项，不是已运行的 bug 结论。

Process:812-855：53 个 c；每个 c 有 d 起点 0、8、16、24、32 的五组，每组先 b=0..15、后 b=16..26，两次 CopyIn，共 530 次调用请求。每次涵盖所有 a=0..6。srcSlice/dstSlice 的确定赋值来自 942-977、1002-1029。

- 源数据在每个 (a,b,c) 的 8 个 d 槽中连续；不同 b 的源行起点差 2067 元素 / 8268 B，不能连成一个连续归约段。
- 目的描述压紧 c 和 b 分块，形状按常规轴顺序为 [7,L,1,8]，L=16 或 11。每行 8 槽连续；目标索引 `((a*L+(b-b0))*8+lane)`。这是 SliceInfo 参数的布局解释，不是实测地址。
- `CopyIn:867-870` 调用切片 DataCopy。请求量分别为 7×16×8=896 元素 / 3584 B、7×11×8=616 元素 / 2464 B。
- `ComputeSum:893-921` 对 lane 逐个执行 GatherMask，pattern=mask32[lane]，repeatTime=ceil(computeLen/8)，即 14 或 10。预期从 x[q*8+lane] 整理为 work[q]，然后 Exp、ReduceSum、Add，computeLen=112 或 77。尾分块 GatherMask 普通模式覆盖 80 行、选择 80 个槽，其中前 77 个进入 Exp/ReduceSum，最后 3 个槽未参与归约；对应 x 的 640 槽中，616 槽本次写入，24 槽在已分配 xQueue 中但本次未写入。必须区分额外本地读取与额外归约贡献。
- `Compute:924-931` 对 sum 做 Ln，抽取 sum[lane*8] 为紧密输出。`CopyOut:934-939` 使用 DataCopyPad，完整组写 32 B，末组写 28 B；输出偏移覆盖 [0,2067)，每个一次。
- ComputeMax 虽然有定义，但 Process 不调用。生效路径是直接 exp/sum/log，没有 max-subtraction；不据此推测本 case 的精度结果或耗时。

## 保留的差异和验证边界

尾列组在 838 行仍调用 UpdateOuter(outerTileLen=8)，因此请求 d=32..39；ComputeSum/CopyOut 的 outerLen=7。d=39 不属于合法张量坐标，也不属于当前输出的归约集合。若按线性地址解释：前 10016 个额外请求落到分配内其他合法元素，最后一个请求偏移为 390663，等于输入总长。总请求 400680 槽 = 390663 必需槽 + 10017 额外槽；合法输入无遗漏，10016 个合法地址被重复请求一次，另有 1 个分配外请求。这是**条件化静态请求模型**的结果，不能把不合法切片的 API 行为或最终硬件访问当成已知。

同一 8 列搬运服务 8 个不同输出，是分组复用，不是对同一个输出重复归约。尾组额外 lane 没有进入 lane 循环。GatherMask 各 lane 扫描相同本地向量是按列整理，不能与 GM 重复请求混为一谈。

其他待确认：yQueue 的 InitBuffer 长度表达式在 771 行计算为 8，若按字节单位，少于 8 float 的 32 B；实际对齐和 CANN 版本需核对。dim 数组未初始化尾部、输出形状/API 路由、切片合法性均需作者或匹配版本工具链确认。没有确认原始 profiling，不绘制时间轴、不推断瓶颈或加速比。

辅助 API 文档仅用于解释参数，不代表此仓库使用这些版本：
- [CANN 9.0 Slice Data Transfer](https://www.hiascend.com/doc_center/source/en/CANNCommunityEdition/900/API/ascendcopapi/atlasascendc_api_07_0105.html)：SliceInfo、shapeValue 和 32 B burst 单位。
- [CANN 8.0 GatherMask](https://www.hiascend.com/doc_center/source/en/canncommercial/800/apiref/ascendcopapi/atlasascendc_api_07_0071.html) 与 [9.1 GatherMask](https://www.hiascend.com/document/detail/en/CANNCommunityEdition/910/API/ascendcopapi/docs/en/api/SIMD-API/basic_api/memory_vector_compute/compare_and_select/GatherMask.md)：普通模式每 repeat 256 B、pattern 筛选。硬件内部调度与耗时不在模型中。

## 设计复用与范围

使用 llm-compute-diagrams 当前 data-2 矩阵的方格、固定格距和输入绿 #B1EF6B；以真实 7×27 成员集合替代示例网格，统一亮度不编码未知值。聚合结果使用 #F2C45F；选择白色描边；请求边界差异用橙红斜线，不覆盖数据角色。复用 Spatial Systems UI 的中性灰设计变量、开放主体和稳定检查器；地址映射线仅表达存储关系，无时间意义。未新增正式图元、修改 Skills/Pattern/catalog。

表达缺口候选：为“逻辑集合 / API 请求范围 / 实测访问”提供共享证据层级，以及为尾块越界请求和 GatherMask 未写入槽提供可审阅变体。仅记录候选，不纳入正式资产。
