// Pure geometry for range selection — index ↔ pixel mapping and rect clipping.
// No reactive/DOM state beyond the values passed in, so each function is
// unit-testable. Coordinate model documented in use-table-range-selection.ts.

import type { OverlayRect, RangeSelectColumn, SelectionRange } from "./use-table-range-selection"

export const CHECKBOX_WIDTH = 60

export interface RowGeometry {
    rowCount: number
    rowHeight: number
    dynamic: boolean
    rowPositions: number[]
}

// Cumulative left edges in content-absolute px: [checkbox, +w0, +w1, ...].
export function cumulativeWidths(cols: RangeSelectColumn[], showCheckbox: boolean, getColumnWidth: (field: string) => number): number[] {
    const widths: number[] = [showCheckbox ? CHECKBOX_WIDTH : 0]
    for (let i = 0; i < cols.length; i++) {
        const col = cols[i]
        widths.push((widths[i] ?? 0) + (col ? getColumnWidth(col.field) : 0))
    }
    return widths
}

// Map a viewport clientX to a visible-column index. Frozen columns are the
// contiguous sticky prefix (scrollLeft does not shift them); scrollLeft applies
// once the walk crosses into non-frozen columns.
export function colIndexFromX(clientX: number, containerRect: DOMRect, scrollLeft: number, cols: RangeSelectColumn[], showCheckbox: boolean, getColumnWidth: (field: string) => number): number {
    if (!cols.length) return -1
    const relX = clientX - containerRect.left
    let accX = showCheckbox ? CHECKBOX_WIDTH : 0
    let scrollLeftApplied = false
    for (let i = 0; i < cols.length; i++) {
        const col = cols[i]
        if (!col) continue
        if (!col.frozen && !scrollLeftApplied) {
            accX -= scrollLeft
            scrollLeftApplied = true
        }
        const w = getColumnWidth(col.field)
        if (relX < accX + w) return i
        accX += w
    }
    return cols.length - 1
}

// Map a viewport clientY to a row index. relY is in content-absolute px (the
// sticky header height is excluded). Binary-search positions when dynamic.
export function rowIndexFromY(clientY: number, containerRect: DOMRect, scrollTop: number, headerHeight: number, geo: RowGeometry): number {
    if (geo.rowCount <= 0) return -1
    const relY = clientY - containerRect.top - headerHeight + scrollTop
    if (relY < 0) return 0

    if (geo.dynamic) {
        let lo = 0
        let hi = geo.rowCount - 1
        let result = 0
        while (lo <= hi) {
            const mid = (lo + hi) >> 1
            if ((geo.rowPositions[mid] ?? mid * geo.rowHeight) <= relY) {
                result = mid
                lo = mid + 1
            } else {
                hi = mid - 1
            }
        }
        return result
    }
    const idx = Math.floor(relY / geo.rowHeight)
    return Math.max(0, Math.min(idx, geo.rowCount - 1))
}

function rowTop(row: number, geo: RowGeometry): number {
    if (geo.dynamic) return geo.rowPositions[row] ?? row * geo.rowHeight
    return row * geo.rowHeight
}

function rangeHeight(rowStart: number, rowEnd: number, geo: RowGeometry): number {
    if (geo.dynamic) {
        const start = geo.rowPositions[rowStart] ?? rowStart * geo.rowHeight
        const end = geo.rowPositions[rowEnd + 1] ?? (rowEnd + 1) * geo.rowHeight
        return end - start
    }
    return (rowEnd - rowStart + 1) * geo.rowHeight
}

export function rangeToRect(range: SelectionRange, cumWidths: number[], geo: RowGeometry): OverlayRect {
    const left = cumWidths[range.colStart] ?? 0
    const right = cumWidths[range.colEnd + 1] ?? left
    return {
        top: rowTop(range.rowStart, geo),
        left,
        width: right - left,
        height: rangeHeight(range.rowStart, range.rowEnd, geo)
    }
}
