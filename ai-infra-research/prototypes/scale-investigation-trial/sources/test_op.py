import torch
import torch_npu
from torch_npu.testing.testcase import TestCase, run_tests
import custom_ops_lib
torch.npu.config.allow_internal_format = False
import numpy as np
import sys  

case_data = {
    'case1': {
        'input':np.random.uniform(-1000, 1000, [2, 6, 10]).astype(np.float32),
        'scale':np.random.uniform(-10, 10, [6,10]).astype(np.float32),
        'bias':np.random.uniform(-10, 10, [6,10]).astype(np.float32),
        'axis': 1,
        'axes_num': -1,
        'scale_from_blob': True
    }
}

def verify_result(real_result, golden):
    # 根据数据类型设置误差阈值（与原逻辑一致）
    if golden.dtype == torch.float32:
        rtol = 1e-4  # fp32相对误差阈值
        atol = 1e-4  # fp32绝对误差阈值
    else:
        rtol = 1e-3  # fp16相对误差阈值
        atol = 1e-3  # fp16绝对误差阈值

    minimum = 10e-10
    golden = torch.where(golden == 0, minimum, golden)
    real_result = torch.where(real_result == 0, minimum, real_result)

    abs_diff = torch.abs(real_result - golden)
    rel_diff = abs_diff / torch.max(torch.abs(real_result), torch.abs(golden))
    is_close = (abs_diff <= atol) | (rel_diff <= rtol)
    # 补充NaN判断（与equal_nan=True保持一致）
    both_nan = torch.isnan(real_result) & torch.isnan(golden)
    is_close = is_close | both_nan
    err_num = torch.sum(~is_close).item()  # 取反统计不满足的数量
    #print(err_num)
    #print(real_result[~is_close])
    #print(golden[~is_close])

    # 与原逻辑相同的误差数量判断
    if real_result.numel() * rtol < err_num:
        print(f"[ERROR] result error")
        return False
    print("test pass")
    return True

def custom_scale(
    tensor_input: torch.Tensor,
    tensor_scale: torch.Tensor,
    tensor_bias: torch.Tensor = None,
    axis: int = 1,
    axes_num: int = 1,
    scale_from_blob: bool = True
) -> torch.Tensor:
    """
    自定义Scale算子，严格遵循指定的维度规则，支持scale/bias广播、多数据类型（float32/float16/bfloat16）
    
    Args:
        tensor_input: 输入张量（任意维度，最高6维）
        tensor_scale: 缩放张量，shape需符合axis/axes_num/scale_from_blob规则
        tensor_bias: 偏移张量（可选），shape需与scale一致
        axis: 起始维度索引（会自动转换为正数）
        axes_num: scaleFromBlob=True时，表示从axis取的维度数；scaleFromBlob=False时无意义（用scale自身rank）
        scale_from_blob: True=用axes_num推导scale shape；False=用scale自身rank推导
    
    Returns:
        torch.Tensor: 缩放（+偏移）后的输出张量，shape与输入一致
    
    Raises:
        ValueError: 输入维度/shape不合法、广播不兼容、数据类型错误等
        TypeError: 输入不是torch.Tensor
    """
    # ===================== 1. 输入类型校验 =====================
    if not isinstance(tensor_input, torch.Tensor):
        raise TypeError(f"tensor_input必须是torch.Tensor，当前类型：{type(tensor_input)}")
    if not isinstance(tensor_scale, torch.Tensor):
        raise TypeError(f"tensor_scale必须是torch.Tensor，当前类型：{type(tensor_scale)}")
    if tensor_bias is not None and not isinstance(tensor_bias, torch.Tensor):
        raise TypeError(f"tensor_bias必须是torch.Tensor或None，当前类型：{type(tensor_bias)}")
    
    # 支持的数值类型（排除整数/布尔类型）
    supported_dtypes = {torch.float32, torch.float16, torch.bfloat16}
    if tensor_input.dtype not in supported_dtypes:
        raise ValueError(f"tensor_input仅支持{supported_dtypes}类型，当前类型：{tensor_input.dtype}")
    if tensor_scale.dtype != tensor_input.dtype:
        warnings.warn(f"tensor_scale类型({tensor_scale.dtype})与输入({tensor_input.dtype})不一致，自动转换")
        tensor_scale = tensor_scale.to(tensor_input.dtype)
    if tensor_bias is not None and tensor_bias.dtype != tensor_input.dtype:
        warnings.warn(f"tensor_bias类型({tensor_bias.dtype})与输入({tensor_input.dtype})不一致，自动转换")
        tensor_bias = tensor_bias.to(tensor_input.dtype)

    # ===================== 2. 维度预处理 =====================
    input_shape = tensor_input.shape
    input_rank = len(input_shape)
    if input_rank > 6:
        raise ValueError(f"输入张量最高支持6维，当前维度：{input_rank}")
    
    # 将axis转换为正数（处理负索引，如axis=-1 → input_rank-1）
    axis = axis if axis >= 0 else input_rank + axis
    if axis < 0 or axis >= input_rank:
        raise ValueError(f"axis={axis}超出输入张量维度范围[0, {input_rank-1}]")
    
    # ===================== 3. 推导scale的合法shape =====================
    if scale_from_blob:
        # scaleFromBlob=True: scale_shape = input_shape[axis:axis+axes_num]
        # 处理axes_num=-1（取到最后一维）
        end_axis = input_rank if axes_num == -1 else axis + axes_num
        if end_axis > input_rank:
            raise ValueError(f"axis={axis} + axes_num={axes_num} = {end_axis}，超出输入张量维度{input_rank}")
        expected_scale_shape = input_shape[axis:end_axis]
    else:
        # scaleFromBlob=False: scale_shape = input_shape[axis:axis+rank(scale)]
        scale_rank = len(tensor_scale.shape)
        end_axis = axis + scale_rank
        if end_axis > input_rank:
            raise ValueError(f"axis={axis} + scale维度数({scale_rank}) = {end_axis}，超出输入张量维度{input_rank}")
        expected_scale_shape = input_shape[axis:end_axis]
    
    # ===================== 4. 校验scale/bias的shape合法性 =====================
    if tensor_scale.shape != expected_scale_shape:
        raise ValueError(
            f"tensor_scale shape不合法！\n"
            f"预期shape（按规则推导）：{expected_scale_shape}\n"
            f"实际shape：{tensor_scale.shape}\n"
            f"输入shape：{input_shape}, axis={axis}, axes_num={axes_num}, scale_from_blob={scale_from_blob}"
        )
    
    if tensor_bias is not None and tensor_bias.shape != expected_scale_shape:
        raise ValueError(
            f"tensor_bias shape必须与scale一致！\n"
            f"scale shape：{tensor_scale.shape}\n"
            f"bias shape：{tensor_bias.shape}"
        )
    
    # ===================== 5. 构建广播维度（核心：将scale/bias扩展为输入的维度） =====================
    # 步骤1：为scale/bias补充前导维度，使其与输入的维度对齐（便于广播）
    # 示例：输入shape=[2,4,8,16], axis=2, scale_shape=[8,16] → 补充前2个维度为1 → [1,1,8,16]
    prepend_dims = [1] * axis  # 前导补1的维度数
    scale_broadcast_shape = prepend_dims + list(tensor_scale.shape)
    # 补充后导维度（如果有）：确保scale的广播shape长度与输入一致
    append_dims = [1] * (input_rank - len(scale_broadcast_shape))
    scale_broadcast_shape += append_dims
    tensor_scale_broadcast = tensor_scale.reshape(scale_broadcast_shape)
    
    # bias做同样的广播处理
    tensor_bias_broadcast = None
    if tensor_bias is not None:
        tensor_bias_broadcast = tensor_bias.reshape(scale_broadcast_shape)
    
    # ===================== 6. 核心计算：scale + 可选bias =====================
    output = tensor_input * tensor_scale_broadcast
    if tensor_bias_broadcast is not None:
        output += tensor_bias_broadcast
    
    # ===================== 7. 保证输出属性与输入一致 =====================
    output = output.to(device=tensor_input.device, dtype=tensor_input.dtype)
    return output

class TestCustomOP(TestCase):
    def test_custom_op_case(self,num):
        print(num)
        caseName='case'+str(num) 
        if int(num) == 3:
            input_x = case_data[caseName]["input"]
            scale = case_data[caseName]["scale"]
            bias = case_data[caseName]["bias"]
        else:
            input_x = torch.from_numpy(case_data[caseName]["input"])
            scale = torch.from_numpy(case_data[caseName]["scale"])
            bias_value = case_data[caseName]["bias"]
            bias = bias_value if bias_value is None else torch.from_numpy(bias_value)

        axis = case_data[caseName]['axis']
        axes_num = case_data[caseName]['axes_num']
        scale_from_blob = case_data[caseName]['scale_from_blob']

        output = custom_scale(input_x, scale, bias, axis=axis, axes_num=axes_num, scale_from_blob=scale_from_blob)
        # print(output)

        # 修改输入
        output_npu = custom_ops_lib.custom_op(input_x.npu(), scale.npu(), bias.npu(), axis, axes_num, scale_from_blob)
        # print(output_npu.cpu())
        if output_npu is None:
            print(f"{caseName} execution timed out!")
        else:
            if verify_result(output_npu.cpu(), output):
                print(f"{caseName} verify result pass!")
            else:
                print(f"{caseName} verify result failed!")

if __name__ == "__main__":
    TestCustomOP().test_custom_op_case(sys.argv[1])
    
