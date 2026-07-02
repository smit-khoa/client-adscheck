// Cmd+C copy flow — copies the active selection range to the clipboard as TSV.
// Always copies the full selected range; the only option is whether to include
// the column-header row, toggled from the range-actions settings dropdown and
// persisted globally (one preference for all tables).

import { ref } from "vue"
import { buildTSV, getCopyEntries, writeClipboard, COPY_CELL_CAP, type BuildTSVOptions, type CopyableColumn, type CopyRange } from "./use-range-copy"

export interface RangeCopyFlowOptions {
    // Reactive getters supplied by Table.vue
    getActiveRange: () => CopyRange | null
    getColumns: () => CopyableColumn[]
    getRows: () => Record<string, any>[]
    formatCopyValue?: (key: string, row: Record<string, any>) => string | undefined
    // UI hooks
    toastSuccess: (msg: string) => void
    toastWarning: (msg: string) => void
    toastError: (msg: string) => void
    // Fired after a successful clipboard write so the caller can play the
    // copy-confirmation animation over the just-copied range.
    onCopied?: () => void
}

const MSG = {
    noColumns: "Không có cột nào để sao chép",
    tooLarge: `Vùng chọn quá lớn (tối đa ${COPY_CELL_CAP} ô)`,
    copied: "Đã sao chép vào clipboard",
    copyFailed: "Không thể sao chép vào clipboard"
}

// Global localStorage key — the copy-header preference is shared across all tables.
const INCLUDE_HEADER_KEY = "range_copy_include_header"

function readCopyHeader(): boolean {
    try {
        return localStorage.getItem(INCLUDE_HEADER_KEY) === "1"
    } catch {
        return false
    }
}

function writeCopyHeader(value: boolean): void {
    try {
        localStorage.setItem(INCLUDE_HEADER_KEY, value ? "1" : "0")
    } catch {
        // silent — copy still works without the persisted preference
    }
}

export function useRangeCopyFlow(opts: RangeCopyFlowOptions) {
    // Whether to prepend the column-header row when copying (persisted globally).
    const copyHeader = ref(readCopyHeader())

    function setCopyHeader(value: boolean): void {
        copyHeader.value = value
        writeCopyHeader(value)
    }

    function buildOptions(includeHeader: boolean): BuildTSVOptions {
        return { includeHeader, ...(opts.formatCopyValue ? { formatCopyValue: opts.formatCopyValue } : {}) }
    }

    // Main Cmd+C / copy-button entrypoint — copies the whole active range.
    async function handleCopyShortcut(): Promise<void> {
        const range = opts.getActiveRange()
        if (!range) return

        const entries = getCopyEntries(opts.getColumns(), range.colStart, range.colEnd)
        if (!entries.length) {
            opts.toastWarning(MSG.noColumns)
            return
        }

        const rowCount = range.rowEnd - range.rowStart + 1
        if (rowCount * entries.length > COPY_CELL_CAP) {
            opts.toastWarning(MSG.tooLarge)
            return
        }

        const tsv = buildTSV(range, entries, opts.getRows(), buildOptions(copyHeader.value))
        const ok = await writeClipboard(tsv)
        if (ok) {
            opts.toastSuccess(MSG.copied)
            opts.onCopied?.()
        } else {
            opts.toastError(MSG.copyFailed)
        }
    }

    return {
        copyHeader,
        setCopyHeader,
        handleCopyShortcut
    }
}
