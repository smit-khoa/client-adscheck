export type CheckboxRangeAction = "select" | "deselect"

export interface CheckboxRowRange {
    rowStart: number
    rowEnd: number
}

export function checkboxRowRange(anchorRow: number, focusRow: number): CheckboxRowRange {
    return {
        rowStart: Math.min(anchorRow, focusRow),
        rowEnd: Math.max(anchorRow, focusRow)
    }
}

export function getCheckboxRangeAction(endingRowSelected: boolean): CheckboxRangeAction {
    return endingRowSelected ? "deselect" : "select"
}

// Drag-fill copies the anchor row's current checkbox state onto the whole range (Excel-like),
// unlike shift-click which toggles based on the ending row's state.
export function getCheckboxDragAction(anchorRowSelected: boolean): CheckboxRangeAction {
    return anchorRowSelected ? "select" : "deselect"
}

export function applyCheckboxRowRangeSelection<Row>(selectedIds: string[], rows: Row[], anchorRow: number, focusRow: number, getRowId: (row: Row) => string | null, action: CheckboxRangeAction): string[] {
    if (anchorRow < 0 || focusRow < 0 || anchorRow >= rows.length || focusRow >= rows.length) {
        return selectedIds
    }

    const range = checkboxRowRange(anchorRow, focusRow)
    const idsInRange = rows
        .slice(range.rowStart, range.rowEnd + 1)
        .map(getRowId)
        .filter((id): id is string => Boolean(id))

    if (action === "deselect") {
        const idsToRemove = new Set(idsInRange)
        return selectedIds.filter(id => !idsToRemove.has(id))
    }

    return Array.from(new Set([...selectedIds, ...idsInRange]))
}
