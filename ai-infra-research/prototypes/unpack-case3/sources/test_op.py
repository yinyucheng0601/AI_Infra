import sys

import numpy as np
import torch
import torch_npu
from torch_npu.testing.testcase import TestCase

import custom_ops_lib

torch.npu.config.allow_internal_format = False

DTYPES = {
    "float16": torch.float16,
    "bfloat16": torch.bfloat16,
    "float32": torch.float32,
    "int32": torch.int32,
    "int16": torch.int16,
    "uint8": torch.uint8,
    "int8": torch.int8,
    "bool": torch.bool,
}

case_data = {
    "case1": {
        "desc": "public fp16 unpack last dim",
        "shape": (24, 63),
        "axis": -1,
        "dtype": "float16",
        "range": (-500.0, 500.0),
    },
    "case2": {
        "desc": "large fp32 unpack axis0, many large outputs",
        "shape": (64, 2048, 64),
        "axis": 0,
        "dtype": "float32",
        "range": (-1.0, 1.0),
    },
    "case3": {
        "desc": "medium int32 unpack middle axis",
        "shape": (31, 17, 33),
        "axis": 1,
        "dtype": "int32",
        "range": (1, 10),
    },
    "case4": {
        "desc": "large fp16 unpack last axis with many outputs",
        "shape": (512, 512, 16),
        "axis": -1,
        "dtype": "float16",
        "range": (-1000.0, 1000.0),
    },
    "case5": {
        "desc": "hidden worst-case style: huge total bytes, high-rank bf16",
        "shape": (2, 8, 64, 64, 8),
        "axis": 2,
        "dtype": "bfloat16",
        "range": (-1.0, 1.0),
    },
    "case6": {
        "desc": "single output fp32 axis0",
        "shape": (1,),
        "axis": 0,
        "dtype": "float32",
        "range": (-1.0, 1.0),
    },
    "case7": {
        "desc": "fp16 alignment boundary axis0",
        "shape": (32,),
        "axis": 0,
        "dtype": "float16",
        "range": (-1.0, 1.0),
    },
    "case8": {
        "desc": "fp16 one element past alignment boundary axis0",
        "shape": (33,),
        "axis": 0,
        "dtype": "float16",
        "range": (-1.0, 1.0),
    },
    "case9": {
        "desc": "bool middle-axis unpack non-32 aligned",
        "shape": (7, 5, 33),
        "axis": 1,
        "dtype": "bool",
        "range": (0, 1),
    },
    "case10": {
        "desc": "int8 last-axis many small outputs",
        "shape": (257, 33),
        "axis": -1,
        "dtype": "int8",
        "range": (-10, 10),
    },
    "case11": {
        "desc": "uint8 axis0 large contiguous output chunks",
        "shape": (8, 1024, 4096),
        "axis": 0,
        "dtype": "uint8",
        "range": (1, 10),
    },
    "case12": {
        "desc": "fp32 axis=-2 large inner chunks",
        "shape": (16, 64, 1024),
        "axis": -2,
        "dtype": "float32",
        "range": (-1.0, 1.0),
    },
    "case13": {
        "desc": "bf16 last-axis 16 tile-unpack fast path",
        "shape": (128, 128, 16),
        "axis": -1,
        "dtype": "bfloat16",
        "range": (-1.0, 1.0),
    },
    "case14": {
        "desc": "int16 last-axis 16 tile-unpack fast path",
        "shape": (128, 128, 16),
        "axis": -1,
        "dtype": "int16",
        "range": (1, 10),
    },
    "case15": {
        "desc": "large bf16 unpack last axis with many outputs",
        "shape": (512, 512, 16),
        "axis": -1,
        "dtype": "bfloat16",
        "range": (-1000.0, 1000.0),
    },
    "case16": {
        "desc": "huge fp16 unpack last axis probe",
        "shape": (2048, 2048, 16),
        "axis": -1,
        "dtype": "float16",
        "range": (-1000.0, 1000.0),
        "enabled": False,
    },
    "case17": {
        "desc": "very huge fp16 unpack last axis probe",
        "shape": (4096, 4096, 16),
        "axis": -1,
        "dtype": "float16",
        "range": (-1000.0, 1000.0),
        "enabled": False,
    },
    "case18": {
        "desc": "huge fp16 unpack last axis num63 probe",
        "shape": (1024, 1024, 63),
        "axis": -1,
        "dtype": "float16",
        "range": (-1000.0, 1000.0),
        "enabled": False,
    },
    "case19": {
        "desc": "huge fp16 unpack axis -2 inner16 probe",
        "shape": (4096, 128, 16),
        "axis": -2,
        "dtype": "float16",
        "range": (-1000.0, 1000.0),
        "enabled": False,
    },
    "case20": {
        "desc": "huge fp16 unpack last axis num33 probe",
        "shape": (1024, 2048, 33),
        "axis": -1,
        "dtype": "float16",
        "range": (-1000.0, 1000.0),
        "enabled": False,
    },
    "case21": {
        "desc": "huge fp16 unpack last axis num128 probe",
        "shape": (512, 1024, 128),
        "axis": -1,
        "dtype": "float16",
        "range": (-1000.0, 1000.0),
        "enabled": False,
    },
    "case22": {
        "desc": "official-case4 candidate: large fp16 last-axis num4 row-split",
        "shape": (2024, 3000, 4),
        "axis": -1,
        "dtype": "float16",
        "range": (-1000.0, 1000.0),
        "enabled": False,
    },
    "case23": {
        "desc": "official-case4 candidate: large bf16 last-axis num4 row-split",
        "shape": (2024, 3000, 4),
        "axis": -1,
        "dtype": "bfloat16",
        "range": (-1000.0, 1000.0),
        "enabled": False,
    },
    "case24": {
        "desc": "official-case4 candidate: large fp32 last-axis num4 row-split",
        "shape": (2024, 3000, 4),
        "axis": -1,
        "dtype": "float32",
        "range": (-1000.0, 1000.0),
        "enabled": False,
    },
    "case25": {
        "desc": "official-case4 candidate: fp16 last-axis num16 with 2024x3000 rows",
        "shape": (2024, 3000, 16),
        "axis": -1,
        "dtype": "float16",
        "range": (-1000.0, 1000.0),
        "enabled": False,
    },
    "case26": {
        "desc": "regression: fp32 last-axis num16 full matrix transpose",
        "shape": (128, 128, 16),
        "axis": -1,
        "dtype": "float32",
        "range": (-1.0, 1.0),
    },
    "case27": {
        "desc": "regression: int32 last-axis num16 full matrix transpose",
        "shape": (128, 128, 16),
        "axis": -1,
        "dtype": "int32",
        "range": (-10, 10),
    },
    "case28": {
        "desc": "profile: fp16 innerSize>1 small-inner copy workload around 500us",
        "shape": (1280, 128, 16),
        "axis": 1,
        "dtype": "float16",
        "range": (-1000.0, 1000.0),
        "enabled": False,
    },
    "case29": {
        "desc": "profile: fp16 innerSize>1 non-32B row copy workload",
        "shape": (1280, 128, 15),
        "axis": 1,
        "dtype": "float16",
        "range": (-1000.0, 1000.0),
        "enabled": False,
    },
    "case30": {
        "desc": "profile: fp32 innerSize>1 non-32B row copy workload",
        "shape": (1024, 96, 7),
        "axis": 1,
        "dtype": "float32",
        "range": (-1000.0, 1000.0),
        "enabled": False,
    },
    "case31": {
        "desc": "profile: bf16 innerSize>1 rowBytes over row-burst tile",
        "shape": (256, 16, 20000),
        "axis": 1,
        "dtype": "bfloat16",
        "range": (-1.0, 1.0),
        "enabled": False,
    },
    "case33": {
        "desc": "profile: uint8 innerSize>1 non-32B row copy workload",
        "shape": (2048, 128, 33),
        "axis": 1,
        "dtype": "uint8",
        "range": (1, 10),
        "enabled": False,
    },
}


def make_tensor(spec):
    dtype = DTYPES[spec["dtype"]]
    shape = spec["shape"]
    lo, hi = spec["range"]
    seed = 3000 + int(spec["name"][4:])
    rng = np.random.default_rng(seed)
    if dtype == torch.bool:
        return torch.from_numpy(rng.integers(0, 2, shape).astype(np.bool_))
    if dtype.is_floating_point:
        data = rng.uniform(lo, hi, shape).astype(np.float32)
        return torch.from_numpy(data).to(dtype)
    data = rng.integers(int(lo), int(hi) + 1, shape, endpoint=False)
    return torch.from_numpy(data).to(dtype)


def verify_tensor(real_tensor, golden_tensor):
    if real_tensor.shape != golden_tensor.shape or real_tensor.dtype != golden_tensor.dtype:
        return False
    if not golden_tensor.dtype.is_floating_point:
        return torch.equal(real_tensor, golden_tensor)
    rtol = 1e-4 if golden_tensor.dtype == torch.float32 else 1e-3
    return bool(torch.all(torch.isclose(
        real_tensor.float(), golden_tensor.float(), atol=rtol, rtol=rtol, equal_nan=True)))


def verify_tensor_list(real_list, golden_list):
    if len(real_list) != len(golden_list):
        print(f"[ERROR] list length mismatch: real={len(real_list)}, golden={len(golden_list)}")
        return False
    failed = []
    for idx, (real_tensor, golden_tensor) in enumerate(zip(real_list, golden_list)):
        if not verify_tensor(real_tensor, golden_tensor):
            failed.append(idx)
            if len(failed) <= 8:
                print(f"[ERROR] tensor {idx} mismatch: real={real_tensor.shape}/{real_tensor.dtype}, "
                      f"golden={golden_tensor.shape}/{golden_tensor.dtype}")
    if failed:
        print(f"[ERROR] result error, failed_count={len(failed)}")
        return False
    print("test pass")
    return True


class TestCustomOP(TestCase):
    def test_custom_op_case(self, num):
        case_name = "case" + str(num)
        spec = dict(case_data[case_name])
        spec["name"] = case_name
        print(f"{case_name}: {spec['desc']}")

        input_x = make_tensor(spec)
        axis = spec["axis"]
        axis_norm = axis if axis >= 0 else input_x.dim() + axis
        num_value = input_x.shape[axis_norm]
        output = torch.unbind(input_x, dim=axis)
        single_shape = list(output[0].shape)

        output_npu = custom_ops_lib.custom_op(input_x.npu(), num_value, axis, single_shape)
        if output_npu is None:
            print(f"{case_name} execution timed out!")
            raise RuntimeError(f"{case_name} execution timed out")
        output_cpu = [ele.cpu() for ele in output_npu]
        if verify_tensor_list(output_cpu, output):
            print(f"{case_name} verify result pass!")
        else:
            print(f"{case_name} verify result failed!")
            raise AssertionError(f"{case_name} verify result failed")


if __name__ == "__main__":
    TestCustomOP().test_custom_op_case(sys.argv[1])
