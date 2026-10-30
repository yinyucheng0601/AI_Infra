#include "kernel_operator.h"
#include "kernel_operator_list_tensor_intf.h"

using namespace AscendC;

constexpr uint32_t kUnpackCopyUbBytes = 128 * 1024;
constexpr uint32_t kUnpackCopyTileBytes = 32 * 1024;
constexpr uint32_t kUnpackCopyBuffers = 3;
constexpr uint32_t kUnpackRowBurstMaxBytes = 32 * 1024;
constexpr uint32_t kUnpackMatrixCols = 16;
constexpr uint32_t kUnpackMatrixTileBytes = 48 * 1024;
constexpr uint32_t kUnpackCompactBuffers = 3;
constexpr uint32_t kUnpackCompactTileBytes = 30 * 1024;
constexpr uint32_t kUnpackMatrixBufferBytes = kUnpackCompactBuffers * kUnpackCompactTileBytes;
constexpr uint32_t kUnpackMatrixOffsetBytes = 8 * 1024;

__aicore__ inline uint64_t MinU64(uint64_t a, uint64_t b)
{
    return a < b ? a : b;
}

__aicore__ inline uint64_t CeilDivU64(uint64_t value, uint64_t divisor)
{
    return divisor == 0 ? 0 : (value + divisor - 1) / divisor;
}

__aicore__ inline uint32_t AlignUp32(uint32_t value)
{
    return (value + 31) / 32 * 32;
}

struct UnpackTaskRange {
    uint64_t start;
    uint64_t end;
};

struct UnpackTaskSpan {
    uint64_t start;
    uint64_t count;
};

struct UnpackSchedulePlan {
    uint64_t totalTasks;
    UnpackTaskSpan matrixDeinterleaveTasks;
    UnpackTaskSpan rowBurstCopyTasks;
    UnpackTaskSpan copyChunkTasks;
    uint64_t matrixRowBlocks;
    uint64_t matrixRowsPerTask;
    uint64_t matrixColBlocks;
    uint64_t rowBurstRowBlocks;
    uint64_t rowBurstRowsPerTask;
    uint64_t chunksPerOutput;
    uint32_t copyTileSize;
};

struct UnpackCopyTaskDesc {
    uint32_t outputIndex;
    uint64_t inputOffset;
    uint64_t outputOffset;
    uint32_t tile;
};

struct UnpackRowBurstTaskDesc {
    uint32_t outputIndex;
    uint64_t inputOffset;
    uint64_t outputOffset;
    uint32_t rows;
    uint32_t rowBytes;
    uint32_t paddedRowBytes;
    uint32_t rightPadding;
    uint32_t srcStrideBytes;
};

template <typename T>
__aicore__ inline uint64_t GetUnpackMatrixRowsPerTask()
{
    return kUnpackMatrixTileBytes / (kUnpackMatrixCols * sizeof(T));
}

template <typename T>
__aicore__ inline uint64_t GetUnpackCompactMatrixRowsPerTask(uint64_t num)
{
    uint64_t rows = kUnpackMatrixOffsetBytes / sizeof(uint32_t);
    const uint64_t srcRows = num == 0 ? 0 : kUnpackCompactTileBytes / (num * sizeof(T));
    const uint64_t dstRows = num == 0 ? 0 : kUnpackCompactTileBytes / (num * sizeof(T));
    rows = rows < srcRows ? rows : srcRows;
    rows = rows < dstRows ? rows : dstRows;
    return rows / kUnpackMatrixCols * kUnpackMatrixCols;
}

__aicore__ inline void AppendUnpackTaskSpan(UnpackSchedulePlan& plan, UnpackTaskSpan& span, uint64_t count)
{
    span.start = plan.totalTasks;
    span.count = count;
    plan.totalTasks += count;
}

__aicore__ inline UnpackTaskRange GetUnpackTaskRange(uint64_t totalTasks)
{
    const uint64_t blockNum = GetBlockNum();
    return {GetBlockIdx() * totalTasks / blockNum, (GetBlockIdx() + 1) * totalTasks / blockNum};
}

__aicore__ inline bool GetUnpackLocalTaskRange(
    const UnpackTaskRange& assignedRange, const UnpackTaskSpan& span, UnpackTaskRange& localRange)
{
    if (span.count == 0) {
        return false;
    }
    const uint64_t spanEnd = span.start + span.count;
    const uint64_t start = assignedRange.start > span.start ? assignedRange.start : span.start;
    const uint64_t end = assignedRange.end < spanEnd ? assignedRange.end : spanEnd;
    if (start >= end) {
        return false;
    }
    localRange.start = start - span.start;
    localRange.end = end - span.start;
    return true;
}

template <typename T>
__aicore__ inline UnpackSchedulePlan BuildUnpackSchedulePlan(const UnpackTilingData& tilingData)
{
    UnpackSchedulePlan plan{0, {0, 0}, {0, 0}, {0, 0}, 0, 0, 0, 0, 0, 0, kUnpackCopyTileBytes / sizeof(T)};
    if (tilingData.totalSize == 0 || tilingData.num == 0) {
        return plan;
    }

    if (tilingData.innerSize > 1) {
        const uint64_t rowBytes = tilingData.innerSize * sizeof(T);
        const uint64_t paddedRowBytes = AlignUp32(static_cast<uint32_t>(rowBytes));
        const uint64_t rightPadding = (paddedRowBytes - rowBytes) / sizeof(T);
        if (tilingData.outerSize > 1 && rowBytes > 0 && rowBytes <= kUnpackRowBurstMaxBytes &&
            rightPadding <= 255) {
            uint64_t rowsPerTask = kUnpackRowBurstMaxBytes / paddedRowBytes;
            rowsPerTask = rowsPerTask == 0 ? 1 : rowsPerTask;
            rowsPerTask = rowsPerTask > tilingData.outerSize ? tilingData.outerSize : rowsPerTask;
            plan.rowBurstRowsPerTask = rowsPerTask;
            plan.rowBurstRowBlocks = CeilDivU64(tilingData.outerSize, plan.rowBurstRowsPerTask);
            AppendUnpackTaskSpan(plan, plan.rowBurstCopyTasks, tilingData.num * plan.rowBurstRowBlocks);
            return plan;
        }
        plan.chunksPerOutput = CeilDivU64(tilingData.innerSize, plan.copyTileSize);
        AppendUnpackTaskSpan(plan, plan.copyChunkTasks, tilingData.num * tilingData.outerSize * plan.chunksPerOutput);
        return plan;
    }

    plan.matrixRowsPerTask = GetUnpackMatrixRowsPerTask<T>();
    if constexpr (sizeof(T) == 2 || sizeof(T) == 4) {
        if (tilingData.num < kUnpackMatrixCols) {
            const uint64_t compactRows = GetUnpackCompactMatrixRowsPerTask<T>(tilingData.num);
            plan.matrixRowsPerTask = compactRows == 0 ? plan.matrixRowsPerTask : compactRows;
        }
    }
    plan.matrixRowBlocks = CeilDivU64(tilingData.totalSize, plan.matrixRowsPerTask);
    plan.matrixColBlocks = CeilDivU64(tilingData.num, kUnpackMatrixCols);
    AppendUnpackTaskSpan(plan, plan.matrixDeinterleaveTasks, plan.matrixRowBlocks * plan.matrixColBlocks);
    return plan;
}

__aicore__ inline void SetUnpackCopyMte2Mte3(uint32_t bufferIndex)
{
    if (bufferIndex == 0) {
        SetFlag<HardEvent::MTE2_MTE3>(EVENT_ID0);
    } else if (bufferIndex == 1) {
        SetFlag<HardEvent::MTE2_MTE3>(EVENT_ID1);
    } else {
        SetFlag<HardEvent::MTE2_MTE3>(EVENT_ID2);
    }
}

__aicore__ inline void WaitUnpackCopyMte2Mte3(uint32_t bufferIndex)
{
    if (bufferIndex == 0) {
        WaitFlag<HardEvent::MTE2_MTE3>(EVENT_ID0);
    } else if (bufferIndex == 1) {
        WaitFlag<HardEvent::MTE2_MTE3>(EVENT_ID1);
    } else {
        WaitFlag<HardEvent::MTE2_MTE3>(EVENT_ID2);
    }
}

__aicore__ inline void SetUnpackCopyMte3Mte2(uint32_t bufferIndex)
{
    if (bufferIndex == 0) {
        SetFlag<HardEvent::MTE3_MTE2>(EVENT_ID0);
    } else if (bufferIndex == 1) {
        SetFlag<HardEvent::MTE3_MTE2>(EVENT_ID1);
    } else {
        SetFlag<HardEvent::MTE3_MTE2>(EVENT_ID2);
    }
}

__aicore__ inline void WaitUnpackCopyMte3Mte2(uint32_t bufferIndex)
{
    if (bufferIndex == 0) {
        WaitFlag<HardEvent::MTE3_MTE2>(EVENT_ID0);
    } else if (bufferIndex == 1) {
        WaitFlag<HardEvent::MTE3_MTE2>(EVENT_ID1);
    } else {
        WaitFlag<HardEvent::MTE3_MTE2>(EVENT_ID2);
    }
}

__aicore__ inline void SetUnpackMatrixMte2V(uint32_t bufferIndex)
{
    if (bufferIndex == 0) {
        SetFlag<HardEvent::MTE2_V>(EVENT_ID0);
    } else if (bufferIndex == 1) {
        SetFlag<HardEvent::MTE2_V>(EVENT_ID1);
    } else {
        SetFlag<HardEvent::MTE2_V>(EVENT_ID2);
    }
}

__aicore__ inline void WaitUnpackMatrixMte2V(uint32_t bufferIndex)
{
    if (bufferIndex == 0) {
        WaitFlag<HardEvent::MTE2_V>(EVENT_ID0);
    } else if (bufferIndex == 1) {
        WaitFlag<HardEvent::MTE2_V>(EVENT_ID1);
    } else {
        WaitFlag<HardEvent::MTE2_V>(EVENT_ID2);
    }
}

__aicore__ inline void SetUnpackMatrixVMte3(uint32_t bufferIndex)
{
    if (bufferIndex == 0) {
        SetFlag<HardEvent::V_MTE3>(EVENT_ID0);
    } else if (bufferIndex == 1) {
        SetFlag<HardEvent::V_MTE3>(EVENT_ID1);
    } else {
        SetFlag<HardEvent::V_MTE3>(EVENT_ID2);
    }
}

__aicore__ inline void WaitUnpackMatrixVMte3(uint32_t bufferIndex)
{
    if (bufferIndex == 0) {
        WaitFlag<HardEvent::V_MTE3>(EVENT_ID0);
    } else if (bufferIndex == 1) {
        WaitFlag<HardEvent::V_MTE3>(EVENT_ID1);
    } else {
        WaitFlag<HardEvent::V_MTE3>(EVENT_ID2);
    }
}

__aicore__ inline void SetUnpackMatrixMte3Mte2(uint32_t bufferIndex)
{
    if (bufferIndex == 0) {
        SetFlag<HardEvent::MTE3_MTE2>(EVENT_ID0);
    } else if (bufferIndex == 1) {
        SetFlag<HardEvent::MTE3_MTE2>(EVENT_ID1);
    } else {
        SetFlag<HardEvent::MTE3_MTE2>(EVENT_ID2);
    }
}

__aicore__ inline void WaitUnpackMatrixMte3Mte2(uint32_t bufferIndex)
{
    if (bufferIndex == 0) {
        WaitFlag<HardEvent::MTE3_MTE2>(EVENT_ID0);
    } else if (bufferIndex == 1) {
        WaitFlag<HardEvent::MTE3_MTE2>(EVENT_ID1);
    } else {
        WaitFlag<HardEvent::MTE3_MTE2>(EVENT_ID2);
    }
}

template <typename T>
__aicore__ inline UnpackCopyTaskDesc GetUnpackCopyTask(
    uint64_t task, const UnpackTilingData& tilingData, const UnpackSchedulePlan& plan)
{
    const uint64_t tasksPerOutput = tilingData.outerSize * plan.chunksPerOutput;
    const uint64_t outputIndex = tasksPerOutput == 0 ? 0 : task / tasksPerOutput;
    const uint64_t localTask = tasksPerOutput == 0 ? 0 : task - outputIndex * tasksPerOutput;
    const uint64_t outer = plan.chunksPerOutput == 0 ? 0 : localTask / plan.chunksPerOutput;
    const uint64_t chunk = plan.chunksPerOutput == 0 ? 0 : localTask - outer * plan.chunksPerOutput;
    const uint64_t innerOffset = chunk * plan.copyTileSize;
    const uint32_t tile = static_cast<uint32_t>(
        MinU64(static_cast<uint64_t>(plan.copyTileSize), tilingData.innerSize - innerOffset));

    return {
        static_cast<uint32_t>(outputIndex),
        (outer * tilingData.num + outputIndex) * tilingData.innerSize + innerOffset,
        outer * tilingData.innerSize + innerOffset,
        tile};
}

template <typename T>
__aicore__ inline UnpackRowBurstTaskDesc GetUnpackRowBurstTask(
    uint64_t task, const UnpackTilingData& tilingData, const UnpackSchedulePlan& plan)
{
    const uint64_t outputIndex = plan.rowBurstRowBlocks == 0 ? 0 : task / plan.rowBurstRowBlocks;
    const uint64_t rowBlock = plan.rowBurstRowBlocks == 0 ? 0 : task - outputIndex * plan.rowBurstRowBlocks;
    const uint64_t rowStart = rowBlock * plan.rowBurstRowsPerTask;
    const uint32_t rows = static_cast<uint32_t>(
        MinU64(plan.rowBurstRowsPerTask, tilingData.outerSize - rowStart));
    const uint32_t rowBytes = static_cast<uint32_t>(tilingData.innerSize * sizeof(T));
    const uint32_t paddedRowBytes = AlignUp32(rowBytes);
    const uint32_t rightPadding = (paddedRowBytes - rowBytes) / sizeof(T);
    const uint32_t srcStrideBytes = static_cast<uint32_t>((tilingData.num - 1) * tilingData.innerSize * sizeof(T));

    return {
        static_cast<uint32_t>(outputIndex),
        (rowStart * tilingData.num + outputIndex) * tilingData.innerSize,
        rowStart * tilingData.innerSize,
        rows,
        rowBytes,
        paddedRowBytes,
        rightPadding,
        srcStrideBytes};
}

template <typename T>
__aicore__ inline void StoreUnpackMatrixScalar(GlobalTensor<T>& xGm, GlobalTensor<T>& yGm,
    ListTensorDesc& yDesc, const UnpackTilingData& tilingData, uint64_t rowStart, uint64_t rowCount,
    uint64_t colBase, uint64_t validCols)
{
    for (uint64_t colOffset = 0; colOffset < validCols; ++colOffset) {
        const uint64_t outputIndex = colBase + colOffset;
        yGm.SetGlobalBuffer(
            yDesc.GetDataPtr<__gm__ T>(static_cast<uint32_t>(outputIndex)), tilingData.totalSize);
        for (uint64_t rowOffset = 0; rowOffset < rowCount; ++rowOffset) {
            const uint64_t row = rowStart + rowOffset;
            yGm.SetValue(row, xGm.GetValue(row * tilingData.num + outputIndex));
        }
        SetFlag<HardEvent::S_MTE3>(EVENT_ID0);
        WaitFlag<HardEvent::S_MTE3>(EVENT_ID0);
    }
}

template <typename T>
__aicore__ inline void PrepareUnpackGatherOffsets(
    const LocalTensor<uint32_t>& offsetLocal, uint64_t rows, uint64_t rowStrideBytes)
{
    ArithProgression<int32_t>(
        offsetLocal.ReinterpretCast<int32_t>(),
        static_cast<int32_t>(0),
        static_cast<int32_t>(rowStrideBytes),
        static_cast<uint32_t>(rows));
}

template <typename T>
__aicore__ inline void RunUnpackCompactMatrixTask(GlobalTensor<T>& xGm, GlobalTensor<T>& yGm,
    ListTensorDesc& yDesc, const UnpackTilingData& tilingData, uint64_t rowStart, uint64_t rowCount,
    uint64_t colBase, uint64_t validCols, const LocalTensor<T>& srcLocal, const LocalTensor<T>& dstLocal,
    const LocalTensor<uint32_t>& offsetLocal)
{
    if constexpr (sizeof(T) == 2 || sizeof(T) == 4) {
        const uint64_t vectorRows = rowCount / kUnpackMatrixCols * kUnpackMatrixCols;
        if (vectorRows == 0) {
            StoreUnpackMatrixScalar<T>(xGm, yGm, yDesc, tilingData, rowStart, rowCount, colBase, validCols);
            return;
        }

        DataCopyExtParams inCopyParams{
            1,
            static_cast<uint32_t>(vectorRows * tilingData.num * sizeof(T)),
            0,
            0,
            0};
        DataCopyPadExtParams<T> padParams{false, 0, 0, 0};
        DataCopyPad(srcLocal, xGm[rowStart * tilingData.num], inCopyParams, padParams);
        SetFlag<HardEvent::MTE2_V>(EVENT_ID0);
        WaitFlag<HardEvent::MTE2_V>(EVENT_ID0);

        for (uint32_t colOffset = 0; colOffset < validCols; ++colOffset) {
            const uint32_t srcBaseAddr = static_cast<uint32_t>((colBase + colOffset) * sizeof(T));
            Gather(dstLocal[colOffset * vectorRows], srcLocal, offsetLocal, srcBaseAddr,
                static_cast<uint32_t>(vectorRows));
        }
        SetFlag<HardEvent::V_MTE3>(EVENT_ID0);
        WaitFlag<HardEvent::V_MTE3>(EVENT_ID0);

        DataCopyExtParams outCopyParams{1, static_cast<uint32_t>(vectorRows * sizeof(T)), 0, 0, 0};
        for (uint32_t colOffset = 0; colOffset < validCols; ++colOffset) {
            yGm.SetGlobalBuffer(
                yDesc.GetDataPtr<__gm__ T>(static_cast<uint32_t>(colBase + colOffset)), tilingData.totalSize);
            DataCopyPad(yGm[rowStart], dstLocal[colOffset * vectorRows], outCopyParams);
        }
        SetFlag<HardEvent::MTE3_MTE2>(EVENT_ID0);
        WaitFlag<HardEvent::MTE3_MTE2>(EVENT_ID0);

        if (vectorRows < rowCount) {
            StoreUnpackMatrixScalar<T>(
                xGm, yGm, yDesc, tilingData, rowStart + vectorRows, rowCount - vectorRows, colBase, validCols);
        }
    } else {
        StoreUnpackMatrixScalar<T>(xGm, yGm, yDesc, tilingData, rowStart, rowCount, colBase, validCols);
    }
}

template <typename T>
__aicore__ inline void PrefetchUnpackCompactMatrixTask(GlobalTensor<T>& xGm,
    const UnpackTilingData& tilingData, uint64_t rowStart, uint64_t vectorRows,
    const LocalTensor<T>& srcLocal, uint32_t bufferIndex)
{
    DataCopyExtParams inCopyParams{
        1,
        static_cast<uint32_t>(vectorRows * tilingData.num * sizeof(T)),
        0,
        0,
        0};
    DataCopyPadExtParams<T> padParams{false, 0, 0, 0};
    DataCopyPad(srcLocal, xGm[rowStart * tilingData.num], inCopyParams, padParams);
    SetUnpackMatrixMte2V(bufferIndex);
}

template <typename T>
__aicore__ inline void ComputeUnpackCompactMatrixTask(GlobalTensor<T>& yGm, ListTensorDesc& yDesc,
    const UnpackTilingData& tilingData, uint64_t rowStart, uint64_t vectorRows, uint64_t colBase,
    uint64_t validCols, const LocalTensor<T>& srcLocal, const LocalTensor<T>& dstLocal,
    const LocalTensor<uint32_t>& offsetLocal, uint32_t bufferIndex)
{
    WaitUnpackMatrixMte2V(bufferIndex);
    for (uint32_t colOffset = 0; colOffset < validCols; ++colOffset) {
        const uint32_t srcBaseAddr = static_cast<uint32_t>((colBase + colOffset) * sizeof(T));
        Gather(dstLocal[colOffset * vectorRows], srcLocal, offsetLocal, srcBaseAddr,
            static_cast<uint32_t>(vectorRows));
    }
    SetUnpackMatrixVMte3(bufferIndex);
    WaitUnpackMatrixVMte3(bufferIndex);

    DataCopyExtParams outCopyParams{1, static_cast<uint32_t>(vectorRows * sizeof(T)), 0, 0, 0};
    for (uint32_t colOffset = 0; colOffset < validCols; ++colOffset) {
        yGm.SetGlobalBuffer(
            yDesc.GetDataPtr<__gm__ T>(static_cast<uint32_t>(colBase + colOffset)), tilingData.totalSize);
        DataCopyPad(yGm[rowStart], dstLocal[colOffset * vectorRows], outCopyParams);
    }
    SetUnpackMatrixMte3Mte2(bufferIndex);
}

template <typename T>
__aicore__ inline void RunUnpackCompactMatrixTasks(GlobalTensor<T>& xGm, GlobalTensor<T>& yGm,
    ListTensorDesc& yDesc, const UnpackTilingData& tilingData, const UnpackSchedulePlan& plan,
    const UnpackTaskRange& taskRange, const LocalTensor<T> srcLocal[kUnpackCompactBuffers],
    const LocalTensor<T> dstLocal[kUnpackCompactBuffers], const LocalTensor<uint32_t>& offsetLocal)
{
    if constexpr (sizeof(T) == 2 || sizeof(T) == 4) {
        uint64_t pipelineEnd = taskRange.end;
        if (pipelineEnd > taskRange.start) {
            const uint64_t lastTask = pipelineEnd - 1;
            const uint64_t lastRowStart = lastTask * plan.matrixRowsPerTask;
            const uint64_t lastRowCount = MinU64(plan.matrixRowsPerTask, tilingData.totalSize - lastRowStart);
            const uint64_t lastVectorRows = lastRowCount / kUnpackMatrixCols * kUnpackMatrixCols;
            if (lastVectorRows == 0) {
                pipelineEnd = lastTask;
            }
        }

        const uint64_t totalTasks = pipelineEnd > taskRange.start ? pipelineEnd - taskRange.start : 0;
        const uint32_t warmupTasks = static_cast<uint32_t>(
            totalTasks < 2 ? totalTasks : static_cast<uint64_t>(2));
        for (uint32_t i = 0; i < warmupTasks; ++i) {
            const uint64_t task = taskRange.start + i;
            const uint64_t rowStart = task * plan.matrixRowsPerTask;
            const uint64_t rowCount = MinU64(plan.matrixRowsPerTask, tilingData.totalSize - rowStart);
            const uint64_t vectorRows = rowCount / kUnpackMatrixCols * kUnpackMatrixCols;
            PrefetchUnpackCompactMatrixTask<T>(
                xGm, tilingData, rowStart, vectorRows, srcLocal[i], i);
        }

        for (uint64_t taskOffset = 0; taskOffset < totalTasks; ++taskOffset) {
            const uint64_t task = taskRange.start + taskOffset;
            const uint32_t bufferIndex = static_cast<uint32_t>(taskOffset % kUnpackCompactBuffers);
            const uint64_t rowStart = task * plan.matrixRowsPerTask;
            const uint64_t rowCount = MinU64(plan.matrixRowsPerTask, tilingData.totalSize - rowStart);
            const uint64_t vectorRows = rowCount / kUnpackMatrixCols * kUnpackMatrixCols;

            ComputeUnpackCompactMatrixTask<T>(yGm, yDesc, tilingData, rowStart, vectorRows, 0,
                tilingData.num, srcLocal[bufferIndex], dstLocal[bufferIndex], offsetLocal, bufferIndex);

            const uint64_t prefetchOffset = taskOffset + 2;
            if (prefetchOffset < totalTasks) {
                const uint64_t prefetchTask = taskRange.start + prefetchOffset;
                const uint32_t prefetchBuffer = static_cast<uint32_t>(prefetchOffset % kUnpackCompactBuffers);
                if (prefetchOffset >= kUnpackCompactBuffers) {
                    WaitUnpackMatrixMte3Mte2(prefetchBuffer);
                }
                const uint64_t prefetchRowStart = prefetchTask * plan.matrixRowsPerTask;
                const uint64_t prefetchRowCount =
                    MinU64(plan.matrixRowsPerTask, tilingData.totalSize - prefetchRowStart);
                const uint64_t prefetchVectorRows =
                    prefetchRowCount / kUnpackMatrixCols * kUnpackMatrixCols;
                PrefetchUnpackCompactMatrixTask<T>(xGm, tilingData, prefetchRowStart, prefetchVectorRows,
                    srcLocal[prefetchBuffer], prefetchBuffer);
            }
        }

        const uint64_t waitCount = totalTasks < kUnpackCompactBuffers ? totalTasks : kUnpackCompactBuffers;
        for (uint64_t i = 0; i < waitCount; ++i) {
            const uint32_t bufferIndex = static_cast<uint32_t>((totalTasks - 1 - i) % kUnpackCompactBuffers);
            WaitUnpackMatrixMte3Mte2(bufferIndex);
        }

        if (pipelineEnd < taskRange.end) {
            const uint64_t rowStart = pipelineEnd * plan.matrixRowsPerTask;
            if (rowStart < tilingData.totalSize) {
                const uint64_t rowCount = MinU64(plan.matrixRowsPerTask, tilingData.totalSize - rowStart);
                StoreUnpackMatrixScalar<T>(xGm, yGm, yDesc, tilingData, rowStart, rowCount, 0, tilingData.num);
            }
        }
    } else {
        for (uint64_t task = taskRange.start; task < taskRange.end; ++task) {
            const uint64_t rowStart = task * plan.matrixRowsPerTask;
            if (rowStart >= tilingData.totalSize) {
                continue;
            }
            const uint64_t rowCount = MinU64(plan.matrixRowsPerTask, tilingData.totalSize - rowStart);
            StoreUnpackMatrixScalar<T>(xGm, yGm, yDesc, tilingData, rowStart, rowCount, 0, tilingData.num);
        }
    }
}

template <typename T>
__aicore__ inline void RunUnpackPackedMatrixTask(GlobalTensor<T>& xGm, GlobalTensor<T>& yGm,
    ListTensorDesc& yDesc, const UnpackTilingData& tilingData, uint64_t rowStart, uint64_t rowCount,
    uint64_t colBase, uint64_t validCols, const LocalTensor<T>& srcLocal, const LocalTensor<T>& dstLocal,
    const LocalTensor<uint32_t>& offsetLocal)
{
    const uint64_t vectorRows = rowCount / kUnpackMatrixCols * kUnpackMatrixCols;
    if (vectorRows == 0) {
        StoreUnpackMatrixScalar<T>(xGm, yGm, yDesc, tilingData, rowStart, rowCount, colBase, validCols);
        return;
    }

    if constexpr (sizeof(T) == 1) {
        StoreUnpackMatrixScalar<T>(xGm, yGm, yDesc, tilingData, rowStart, rowCount, colBase, validCols);
        return;
    }

    if (validCols < kUnpackMatrixCols) {
        StoreUnpackMatrixScalar<T>(xGm, yGm, yDesc, tilingData, rowStart, rowCount, colBase, validCols);
        return;
    }

    const uint32_t inputRowBytes = static_cast<uint32_t>(validCols * sizeof(T));
    const uint32_t inputStrideBytes = static_cast<uint32_t>((tilingData.num - validCols) * sizeof(T));
    const bool contiguousInput = inputStrideBytes == 0;
    DataCopyExtParams inCopyParams{
        contiguousInput ? static_cast<uint16_t>(1) : static_cast<uint16_t>(vectorRows),
        contiguousInput ? static_cast<uint32_t>(vectorRows * inputRowBytes) : inputRowBytes,
        inputStrideBytes,
        0,
        0};
    DataCopyPadExtParams<T> fullPadParams{false, 0, 0, 0};
    DataCopyPadExtParams<T> tailPadParams{true, 0, static_cast<uint8_t>(kUnpackMatrixCols - validCols),
        static_cast<T>(0)};
    const DataCopyPadExtParams<T>& padParams =
        validCols == kUnpackMatrixCols ? fullPadParams : tailPadParams;
    DataCopyPad(srcLocal, xGm[rowStart * tilingData.num + colBase], inCopyParams, padParams);
    SetFlag<HardEvent::MTE2_V>(EVENT_ID0);
    WaitFlag<HardEvent::MTE2_V>(EVENT_ID0);

    if constexpr (sizeof(T) == 4) {
        for (uint32_t colOffset = 0; colOffset < validCols; ++colOffset) {
            const uint32_t srcBaseAddr = static_cast<uint32_t>(colOffset * sizeof(T));
            Gather(dstLocal[colOffset * vectorRows], srcLocal, offsetLocal, srcBaseAddr,
                static_cast<uint32_t>(vectorRows));
        }
    } else {
        uint64_t srcList[kUnpackMatrixCols];
        uint64_t dstList[kUnpackMatrixCols];
        TransDataTo5HDParams transDataParams(false, false, 1, 0, 0);
        for (uint64_t transOffset = 0; transOffset < vectorRows; transOffset += kUnpackMatrixCols) {
            for (uint32_t i = 0; i < kUnpackMatrixCols; ++i) {
                srcList[i] = static_cast<uint64_t>(
                    srcLocal[transOffset * kUnpackMatrixCols + i * kUnpackMatrixCols].GetPhyAddr());
                dstList[i] = static_cast<uint64_t>(dstLocal[i * vectorRows + transOffset].GetPhyAddr());
            }
            TransDataTo5HD<T>(dstList, srcList, transDataParams);
        }
    }
    SetFlag<HardEvent::V_MTE3>(EVENT_ID0);
    WaitFlag<HardEvent::V_MTE3>(EVENT_ID0);

    DataCopyExtParams outCopyParams{1, static_cast<uint32_t>(vectorRows * sizeof(T)), 0, 0, 0};
    for (uint32_t colOffset = 0; colOffset < validCols; ++colOffset) {
        yGm.SetGlobalBuffer(
            yDesc.GetDataPtr<__gm__ T>(static_cast<uint32_t>(colBase + colOffset)), tilingData.totalSize);
        DataCopyPad(yGm[rowStart], dstLocal[colOffset * vectorRows], outCopyParams);
    }
    SetFlag<HardEvent::MTE3_MTE2>(EVENT_ID0);
    WaitFlag<HardEvent::MTE3_MTE2>(EVENT_ID0);

    if (vectorRows < rowCount) {
        StoreUnpackMatrixScalar<T>(
            xGm, yGm, yDesc, tilingData, rowStart + vectorRows, rowCount - vectorRows, colBase, validCols);
    }
}

template <typename T>
__aicore__ inline void UnpackMatrixDeinterleaveKernel(GM_ADDR x, GM_ADDR y, const UnpackTilingData& tilingData)
{
    const UnpackSchedulePlan plan = BuildUnpackSchedulePlan<T>(tilingData);
    if (plan.totalTasks == 0) {
        return;
    }
    const UnpackTaskRange taskRange = GetUnpackTaskRange(plan.totalTasks);
    if (taskRange.start >= taskRange.end) {
        return;
    }

    GlobalTensor<T> xGm;
    GlobalTensor<T> yGm;
    ListTensorDesc yDesc(reinterpret_cast<__gm__ void*>(y));
    xGm.SetGlobalBuffer(reinterpret_cast<__gm__ T*>(x), tilingData.totalSize * tilingData.num);

    TPipe pipe;
    TBuf<QuePosition::VECCALC> srcBuf;
    TBuf<QuePosition::VECCALC> dstBuf;
    TBuf<QuePosition::VECCALC> offsetBuf;
    pipe.InitBuffer(srcBuf, kUnpackMatrixBufferBytes);
    pipe.InitBuffer(dstBuf, kUnpackMatrixBufferBytes);
    pipe.InitBuffer(offsetBuf, kUnpackMatrixOffsetBytes);
    LocalTensor<T> srcLocal = srcBuf.Get<T>();
    LocalTensor<T> dstLocal = dstBuf.Get<T>();
    LocalTensor<uint32_t> offsetLocal = offsetBuf.Get<uint32_t>();
    LocalTensor<T> compactSrcLocal[kUnpackCompactBuffers];
    LocalTensor<T> compactDstLocal[kUnpackCompactBuffers];
    for (uint32_t i = 0; i < kUnpackCompactBuffers; ++i) {
        compactSrcLocal[i] = srcLocal[i * (kUnpackCompactTileBytes / sizeof(T))];
        compactDstLocal[i] = dstLocal[i * (kUnpackCompactTileBytes / sizeof(T))];
    }

    bool compactOffsetsReady = false;
    bool packedOffsetsReady = false;
    if (tilingData.num < kUnpackMatrixCols && (sizeof(T) == 2 || sizeof(T) == 4)) {
        if (!compactOffsetsReady) {
            PrepareUnpackGatherOffsets<T>(offsetLocal, plan.matrixRowsPerTask, tilingData.num * sizeof(T));
            compactOffsetsReady = true;
        }
        RunUnpackCompactMatrixTasks<T>(
            xGm, yGm, yDesc, tilingData, plan, taskRange, compactSrcLocal, compactDstLocal, offsetLocal);
        return;
    }

    for (uint64_t task = taskRange.start; task < taskRange.end; ++task) {
        const uint64_t rowBlock = plan.matrixColBlocks == 0 ? 0 : task / plan.matrixColBlocks;
        const uint64_t colBlock = plan.matrixColBlocks == 0 ? 0 : task - rowBlock * plan.matrixColBlocks;
        const uint64_t rowStart = rowBlock * plan.matrixRowsPerTask;
        if (rowStart >= tilingData.totalSize) {
            continue;
        }

        const uint64_t colBase = colBlock * kUnpackMatrixCols;
        const uint64_t validCols = MinU64(static_cast<uint64_t>(kUnpackMatrixCols), tilingData.num - colBase);
        const uint64_t rowCount = MinU64(plan.matrixRowsPerTask, tilingData.totalSize - rowStart);
        if (tilingData.num <= kUnpackMatrixCols && validCols < kUnpackMatrixCols &&
            (sizeof(T) == 2 || sizeof(T) == 4)) {
            if (!compactOffsetsReady) {
                PrepareUnpackGatherOffsets<T>(offsetLocal, plan.matrixRowsPerTask, tilingData.num * sizeof(T));
                compactOffsetsReady = true;
            }
            RunUnpackCompactMatrixTask<T>(
                xGm, yGm, yDesc, tilingData, rowStart, rowCount, colBase, validCols, srcLocal, dstLocal, offsetLocal);
            continue;
        }

        if constexpr (sizeof(T) == 4) {
            if (!packedOffsetsReady) {
                PrepareUnpackGatherOffsets<T>(offsetLocal, plan.matrixRowsPerTask, kUnpackMatrixCols * sizeof(T));
                packedOffsetsReady = true;
            }
        }
        RunUnpackPackedMatrixTask<T>(
            xGm, yGm, yDesc, tilingData, rowStart, rowCount, colBase, validCols, srcLocal, dstLocal, offsetLocal);
    }
}

template <typename T>
__aicore__ inline void UnpackRowBurstCopyKernel(
    GM_ADDR x, GM_ADDR y, const UnpackTilingData& tilingData, const UnpackSchedulePlan& plan)
{
    if (plan.rowBurstCopyTasks.count == 0) {
        return;
    }
    const UnpackTaskRange assignedRange = GetUnpackTaskRange(plan.totalTasks);
    UnpackTaskRange taskRange{0, 0};
    if (!GetUnpackLocalTaskRange(assignedRange, plan.rowBurstCopyTasks, taskRange)) {
        return;
    }

    GlobalTensor<T> xGm;
    GlobalTensor<T> yGm;
    ListTensorDesc yDesc(reinterpret_cast<__gm__ void*>(y));
    xGm.SetGlobalBuffer(reinterpret_cast<__gm__ T*>(x), tilingData.totalSize * tilingData.num);

    TPipe pipe;
    TBuf<QuePosition::VECCALC> ubBuf;
    pipe.InitBuffer(ubBuf, kUnpackCopyUbBytes);
    LocalTensor<uint8_t> tmp = ubBuf.Get<uint8_t>();
    const uint32_t rowBytes = static_cast<uint32_t>(tilingData.innerSize * sizeof(T));
    const uint32_t tileBytes = static_cast<uint32_t>(plan.rowBurstRowsPerTask * AlignUp32(rowBytes));
    LocalTensor<T> local[kUnpackCopyBuffers];
    for (uint32_t i = 0; i < kUnpackCopyBuffers; ++i) {
        local[i] = tmp[i * tileBytes].ReinterpretCast<T>();
    }

    DataCopyPadExtParams<T> padParams{false, 0, 0, 0};
    const uint64_t totalTasks = taskRange.end > taskRange.start ? taskRange.end - taskRange.start : 0;
    const uint32_t warmupTasks = static_cast<uint32_t>(
        totalTasks < kUnpackCopyBuffers ? totalTasks : static_cast<uint64_t>(kUnpackCopyBuffers));
    for (uint32_t i = 0; i < warmupTasks; ++i) {
        const UnpackRowBurstTaskDesc desc = GetUnpackRowBurstTask<T>(taskRange.start + i, tilingData, plan);
        DataCopyExtParams copyParams{
            static_cast<uint16_t>(desc.rows),
            desc.rowBytes,
            desc.srcStrideBytes,
            0,
            0};
        DataCopyPadExtParams<T> rowPadParams{desc.rightPadding != 0, 0, static_cast<uint8_t>(desc.rightPadding), 0};
        DataCopyPad(local[i], xGm[desc.inputOffset], copyParams, rowPadParams);
        SetUnpackCopyMte2Mte3(i);
    }

    for (uint64_t taskOffset = 0; taskOffset < totalTasks; ++taskOffset) {
        const uint32_t bufferIndex = static_cast<uint32_t>(taskOffset % kUnpackCopyBuffers);
        const UnpackRowBurstTaskDesc desc = GetUnpackRowBurstTask<T>(taskRange.start + taskOffset, tilingData, plan);
        DataCopyExtParams outCopyParams{
            static_cast<uint16_t>(desc.rows),
            desc.rowBytes,
            0,
            0,
            0};

        WaitUnpackCopyMte2Mte3(bufferIndex);
        yGm.SetGlobalBuffer(yDesc.GetDataPtr<__gm__ T>(desc.outputIndex), tilingData.totalSize);
        DataCopyPad(yGm[desc.outputOffset], local[bufferIndex], outCopyParams);
        SetUnpackCopyMte3Mte2(bufferIndex);

        const uint64_t prefetchOffset = taskOffset + kUnpackCopyBuffers;
        if (prefetchOffset < totalTasks) {
            WaitUnpackCopyMte3Mte2(bufferIndex);
            const UnpackRowBurstTaskDesc prefetchDesc =
                GetUnpackRowBurstTask<T>(taskRange.start + prefetchOffset, tilingData, plan);
            DataCopyExtParams prefetchCopyParams{
                static_cast<uint16_t>(prefetchDesc.rows),
                prefetchDesc.rowBytes,
                prefetchDesc.srcStrideBytes,
                0,
                0,
            };
            DataCopyPadExtParams<T> prefetchPadParams{
                prefetchDesc.rightPadding != 0, 0, static_cast<uint8_t>(prefetchDesc.rightPadding), 0};
            DataCopyPad(local[bufferIndex], xGm[prefetchDesc.inputOffset], prefetchCopyParams, prefetchPadParams);
            SetUnpackCopyMte2Mte3(bufferIndex);
        }
    }

    const uint64_t waitCount = totalTasks < kUnpackCopyBuffers ? totalTasks : kUnpackCopyBuffers;
    for (uint64_t i = 0; i < waitCount; ++i) {
        const uint32_t bufferIndex = static_cast<uint32_t>((totalTasks - 1 - i) % kUnpackCopyBuffers);
        WaitUnpackCopyMte3Mte2(bufferIndex);
    }
}

template <typename T>
__aicore__ inline void UnpackCopyKernel(GM_ADDR x, GM_ADDR y, const UnpackTilingData& tilingData)
{
    const UnpackSchedulePlan plan = BuildUnpackSchedulePlan<T>(tilingData);
    if (plan.rowBurstCopyTasks.count != 0) {
        UnpackRowBurstCopyKernel<T>(x, y, tilingData, plan);
        return;
    }
    if (plan.copyChunkTasks.count == 0) {
        return;
    }
    const UnpackTaskRange assignedRange = GetUnpackTaskRange(plan.totalTasks);
    UnpackTaskRange taskRange{0, 0};
    if (!GetUnpackLocalTaskRange(assignedRange, plan.copyChunkTasks, taskRange)) {
        return;
    }

    GlobalTensor<T> xGm;
    GlobalTensor<T> yGm;
    ListTensorDesc yDesc(reinterpret_cast<__gm__ void*>(y));
    xGm.SetGlobalBuffer(reinterpret_cast<__gm__ T*>(x), tilingData.totalSize * tilingData.num);

    TPipe pipe;
    TBuf<QuePosition::VECCALC> ubBuf;
    pipe.InitBuffer(ubBuf, kUnpackCopyUbBytes);
    LocalTensor<uint8_t> tmp = ubBuf.Get<uint8_t>();
    const uint32_t tileBytes = AlignUp32(plan.copyTileSize * sizeof(T));
    LocalTensor<T> local[kUnpackCopyBuffers];
    for (uint32_t i = 0; i < kUnpackCopyBuffers; ++i) {
        local[i] = tmp[i * tileBytes].ReinterpretCast<T>();
    }

    DataCopyPadExtParams<T> padParams{false, 0, 0, 0};
    const uint64_t totalTasks = taskRange.end > taskRange.start ? taskRange.end - taskRange.start : 0;
    const uint32_t warmupTasks = static_cast<uint32_t>(
        totalTasks < kUnpackCopyBuffers ? totalTasks : static_cast<uint64_t>(kUnpackCopyBuffers));
    for (uint32_t i = 0; i < warmupTasks; ++i) {
        const UnpackCopyTaskDesc desc = GetUnpackCopyTask<T>(taskRange.start + i, tilingData, plan);
        DataCopyExtParams copyParams{1, static_cast<uint32_t>(desc.tile * sizeof(T)), 0, 0, 0};
        DataCopyPad(local[i], xGm[desc.inputOffset], copyParams, padParams);
        SetUnpackCopyMte2Mte3(i);
    }

    for (uint64_t taskOffset = 0; taskOffset < totalTasks; ++taskOffset) {
        const uint32_t bufferIndex = static_cast<uint32_t>(taskOffset % kUnpackCopyBuffers);
        const UnpackCopyTaskDesc desc = GetUnpackCopyTask<T>(taskRange.start + taskOffset, tilingData, plan);
        DataCopyExtParams copyParams{1, static_cast<uint32_t>(desc.tile * sizeof(T)), 0, 0, 0};

        WaitUnpackCopyMte2Mte3(bufferIndex);
        yGm.SetGlobalBuffer(yDesc.GetDataPtr<__gm__ T>(desc.outputIndex), tilingData.totalSize);
        DataCopyPad(yGm[desc.outputOffset], local[bufferIndex], copyParams);
        SetUnpackCopyMte3Mte2(bufferIndex);

        const uint64_t prefetchOffset = taskOffset + kUnpackCopyBuffers;
        if (prefetchOffset < totalTasks) {
            WaitUnpackCopyMte3Mte2(bufferIndex);
            const UnpackCopyTaskDesc prefetchDesc =
                GetUnpackCopyTask<T>(taskRange.start + prefetchOffset, tilingData, plan);
            DataCopyExtParams prefetchCopyParams{
                1, static_cast<uint32_t>(prefetchDesc.tile * sizeof(T)), 0, 0, 0};
            DataCopyPad(local[bufferIndex], xGm[prefetchDesc.inputOffset], prefetchCopyParams, padParams);
            SetUnpackCopyMte2Mte3(bufferIndex);
        }
    }

    const uint64_t waitCount = totalTasks < kUnpackCopyBuffers ? totalTasks : kUnpackCopyBuffers;
    for (uint64_t i = 0; i < waitCount; ++i) {
        const uint32_t bufferIndex = static_cast<uint32_t>((totalTasks - 1 - i) % kUnpackCopyBuffers);
        WaitUnpackCopyMte3Mte2(bufferIndex);
    }
}

template <typename T>
__aicore__ inline void UnpackKernel(GM_ADDR x, GM_ADDR y, const UnpackTilingData& tilingData)
{
    if (tilingData.innerSize <= 1) {
        UnpackMatrixDeinterleaveKernel<T>(x, y, tilingData);
    } else {
        UnpackCopyKernel<T>(x, y, tilingData);
    }
}

extern "C" __global__ __aicore__ void unpack(GM_ADDR x, GM_ADDR y, GM_ADDR workspace, GM_ADDR tiling)
{
    (void)workspace;
    GET_TILING_DATA(tiling_data, tiling);
#if ORIG_DTYPE_X == DT_FLOAT16
    UnpackKernel<half>(x, y, tiling_data);
#elif ORIG_DTYPE_X == DT_BF16
    if (tiling_data.innerSize <= 1) {
        UnpackMatrixDeinterleaveKernel<int16_t>(x, y, tiling_data);
    } else {
        UnpackCopyKernel<bfloat16_t>(x, y, tiling_data);
    }
#elif ORIG_DTYPE_X == DT_FLOAT
    UnpackKernel<float>(x, y, tiling_data);
#elif ORIG_DTYPE_X == DT_INT32
    UnpackKernel<int32_t>(x, y, tiling_data);
#elif ORIG_DTYPE_X == DT_INT16
    UnpackKernel<int16_t>(x, y, tiling_data);
#elif ORIG_DTYPE_X == DT_UINT8
    UnpackKernel<uint8_t>(x, y, tiling_data);
#elif ORIG_DTYPE_X == DT_INT8
    UnpackKernel<int8_t>(x, y, tiling_data);
#elif ORIG_DTYPE_X == DT_BOOL
    if (tiling_data.innerSize <= 1) {
        UnpackMatrixDeinterleaveKernel<uint8_t>(x, y, tiling_data);
    } else {
        UnpackCopyKernel<bool>(x, y, tiling_data);
    }
#endif
}
