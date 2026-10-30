#include "unpack_tiling.h"
#include "register/op_def_registry.h"

namespace optiling {
static int64_t GetIntAttr(gert::TilingContext* context, uint32_t index, int64_t defaultValue)
{
    const gert::RuntimeAttrs* attrs = context->GetAttrs();
    if (attrs == nullptr || attrs->GetAttrNum() <= index) {
        return defaultValue;
    }
    const int64_t* int64Value = attrs->GetAttrPointer<int64_t>(index);
    if (int64Value != nullptr) {
        return *int64Value;
    }
    const int32_t* int32Value = attrs->GetAttrPointer<int32_t>(index);
    return int32Value == nullptr ? defaultValue : static_cast<int64_t>(*int32Value);
}

static ge::graphStatus TilingFunc(gert::TilingContext* context)
{
    constexpr uint32_t kSmallBlockDim = 8;
    constexpr uint32_t kMaxBlockDim = 50;
    constexpr uint64_t kLargeScalarOutputThreshold = 4096;
    const gert::StorageShape* inputShape = context->GetInputShape(0);
    const auto& shape = inputShape->GetStorageShape();
    const int64_t dimNum = shape.GetDimNum();
    int64_t num = GetIntAttr(context, 0, 1);
    int64_t axis = GetIntAttr(context, 1, 0);
    if (axis < 0) {
        axis += dimNum;
    }

    uint64_t totalSize = 1;
    for (int i = 0; i < dimNum; ++i) {
        totalSize *= static_cast<uint64_t>(shape.GetDim(i));
    }
    uint64_t innerSize = 1;
    for (int i = static_cast<int>(axis) + 1; i < dimNum; ++i) {
        innerSize *= static_cast<uint64_t>(shape.GetDim(i));
    }
    if (num <= 0 && axis >= 0 && axis < dimNum) {
        num = shape.GetDim(axis);
    }
    const uint64_t outputSize = num == 0 ? 0 : totalSize / static_cast<uint64_t>(num);
    const uint64_t numU = static_cast<uint64_t>(num);
    uint32_t blockDim = 1;
    uint64_t perCoreSize = outputSize;
    if (innerSize <= 1) {
        const uint32_t maxBlockDim = outputSize >= kLargeScalarOutputThreshold ? kMaxBlockDim : kSmallBlockDim;
        uint64_t rowSplit = 1;
        if (numU > 0 && numU < maxBlockDim && outputSize >= kLargeScalarOutputThreshold) {
            rowSplit = maxBlockDim / numU;
            rowSplit = rowSplit > outputSize ? outputSize : rowSplit;
            blockDim = static_cast<uint32_t>(numU * rowSplit);
        } else {
            const uint64_t parallelSize = numU == 0 ? 1 : numU;
            blockDim = static_cast<uint32_t>(parallelSize < maxBlockDim ? parallelSize : maxBlockDim);
        }
        perCoreSize = rowSplit == 0 ? outputSize : (outputSize + rowSplit - 1) / rowSplit;
    } else {
        constexpr uint64_t kLargeCopyOutputThreshold = 4096;
        const uint64_t parallelSize = outputSize == 0 ? 1 : outputSize * (numU == 0 ? 1 : numU);
        const uint32_t maxBlockDim = outputSize >= kLargeCopyOutputThreshold ? kMaxBlockDim : kSmallBlockDim;
        blockDim = static_cast<uint32_t>(parallelSize < maxBlockDim ? parallelSize : maxBlockDim);
        perCoreSize = (outputSize + blockDim - 1) / blockDim;
    }

    UnpackTilingData tiling;
    tiling.set_totalSize(outputSize);
    tiling.set_perCoreSize(perCoreSize);
    tiling.set_num(static_cast<uint64_t>(num));
    tiling.set_outerSize(innerSize == 0 ? 0 : outputSize / innerSize);
    tiling.set_innerSize(innerSize);
    context->SetBlockDim(blockDim);
    tiling.SaveToBuffer(context->GetRawTilingData()->GetData(), context->GetRawTilingData()->GetCapacity());
    context->GetRawTilingData()->SetDataSize(tiling.GetDataSize());
    return ge::GRAPH_SUCCESS;
}
}

namespace ge {
static ge::graphStatus InferShape(gert::InferShapeContext* context)
{
    return GRAPH_SUCCESS;
}

static ge::graphStatus InferDataType(gert::InferDataTypeContext* context)
{
    return GRAPH_SUCCESS;
}
}

namespace ops {
class Unpack : public OpDef {
public:
    explicit Unpack(const char* name) : OpDef(name)
    {
        const std::initializer_list<ge::DataType> dtypes = {
            ge::DT_FLOAT16, ge::DT_BF16, ge::DT_FLOAT, ge::DT_INT32,
            ge::DT_INT16, ge::DT_UINT8, ge::DT_INT8, ge::DT_BOOL};
        const std::initializer_list<ge::Format> formats = {
            ge::FORMAT_ND, ge::FORMAT_ND, ge::FORMAT_ND, ge::FORMAT_ND,
            ge::FORMAT_ND, ge::FORMAT_ND, ge::FORMAT_ND, ge::FORMAT_ND};

        this->Input("x").ParamType(REQUIRED).DataType(dtypes).Format(formats).UnknownShapeFormat(formats);
        this->Output("y").ParamType(DYNAMIC).DataType(dtypes).Format(formats).UnknownShapeFormat(formats);
        this->Attr("num").Int();
        this->Attr("axis").AttrType(OPTIONAL).Int(0);
        this->SetInferShape(ge::InferShape).SetInferDataType(ge::InferDataType);
        this->AICore().SetTiling(optiling::TilingFunc);
        this->AICore().AddConfig("ascend910b");
    }
};

OP_ADD(Unpack);
}
