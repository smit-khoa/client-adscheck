// Excel-like range selection for the data-grid (Composition API port of the
// Options-API mixin from the agency table). State is INDEX-BASED, never
// DOM-based, so it survives the grid's 2-axis virtualization.
//
// Coordinate model (adscheck-specific, differs from the source table):
//  - The scroll container is `dataGridMain`; the sticky header occupies the top
//    `headerHeight` px inside it. Frozen columns are sticky-left (scrollLeft does
//    NOT shift them); non-frozen columns translate by an absolute offset.
//  - Checkbox column width = 60. visibleColumns is already [...frozen, ...nonFrozen]
//    so frozen indices are always the contiguous prefix.
//
// Pure geometry (index↔pixel mapping, rect clipping) lives in range-coords.ts.
// This file owns reactive state + the mouse/keyboard pipeline + auto-scroll.

import { computed, reactive, type ComputedRef, type Ref } from "vue"
import { colIndexFromX, cumulativeWidths, rangeToRect, rowIndexFromY, type RowGeometry } from "./range-coords"

export interface ActionsAnchor {
    // grid-content content-space px (same space as the rows). The range's
    // bottom-right corner, inset inward, then clamped to the currently-scrolled
    // visible window — so the buttons sit inside the highlight but pin to the
    // table edge (never disappear) when the range scrolls out of view.
    top: number
    left: number
}

export interface RangeSelectColumn {
    field: string
    frozen?: boolean
}

export interface SelectionRange {
    rowStart: number
    rowEnd: number
    colStart: number
    colEnd: number
}

// Geometry rect for a range in content-absolute px (used to place the floating
// action buttons; the highlight itself is painted on the cells, not via rects).
export interface OverlayRect {
    top: number
    left: number
    width: number
    height: number
}

export interface UseRangeSelectionOptions {
    enabledRef: ComputedRef<boolean>
    visibleColumnsRef: ComputedRef<RangeSelectColumn[]>
    rowCountRef: ComputedRef<number>
    rowHeightRef: Ref<number> | ComputedRef<number>
    enableDynamicRowHeightRef: ComputedRef<boolean>
    rowPositionsRef: ComputedRef<number[]>
    scrollContainerRef: Ref<HTMLElement | null>
    showCheckboxRef: ComputedRef<boolean>
    getColumnWidth: (field: string) => number
    headerHeight?: number
    // Visual top offset from the range-actions overlay parent to the first body row.
    // Split-pane tables use body-only hit testing (`headerHeight: 0`) but still
    // render the floating actions under a parent that includes the header.
    actionsTopOffset?: number
    // Reactive scroll/viewport metrics — used to place the floating action
    // buttons in viewport space (clamped to the visible frame).
    scrollLeftRef: ComputedRef<number> | Ref<number>
    scrollTopRef: ComputedRef<number> | Ref<number>
    viewportWidthRef: ComputedRef<number> | Ref<number>
    containerHeightRef: ComputedRef<number> | Ref<number>
    frozenWidthRef: ComputedRef<number>
    // Optional pane-aware column hit-test. The default assumes one scroll container
    // owns both frozen and scrollable columns; split-pane tables can override it.
    getColIndexFromPoint?: (clientX: number) => number
    // Called on Cmd/Ctrl+C while a range exists — Table.vue wires this to copy.
    onCopyRequest?: () => void
}

const DEFAULT_HEADER_HEIGHT = 50
const AUTO_SCROLL_EDGE = 40
const AUTO_SCROLL_MAX_SPEED = 12
const HEADER_DRAG_THRESHOLD = 5
// Floating copy/settings button cluster size (must match .range-actions CSS).
const ACTIONS_WIDTH = 64
const ACTIONS_HEIGHT = 30
const ACTIONS_INSET = 4

export function useTableRangeSelection(opts: UseRangeSelectionOptions) {
    const headerHeight = opts.headerHeight ?? DEFAULT_HEADER_HEIGHT
    const actionsTopOffset = opts.actionsTopOffset ?? headerHeight

    const state = reactive({
        isDragging: false,
        dragMode: null as null | "body" | "col-handle",
        anchor: { row: 0, col: 0 },
        focus: { row: 0, col: 0 },
        ranges: [] as SelectionRange[],
        // Delayed activation: a plain mousedown only records pendingDrag so the
        // browser can still do native text selection inside a cell. The range
        // activates once the mouse leaves the anchor cell.
        pendingDrag: null as null | { anchor: { row: number; col: number } }
    })

    let autoScrollRAF: number | null = null
    let lastMouseEvent: MouseEvent | null = null
    let headerDownState: null | { colIndex: number; startX: number; startY: number } = null

    function rowGeometry(): RowGeometry {
        return {
            rowCount: opts.rowCountRef.value,
            rowHeight: opts.rowHeightRef.value,
            dynamic: opts.enableDynamicRowHeightRef.value,
            rowPositions: opts.rowPositionsRef.value
        }
    }

    function getColIndexFromX(clientX: number): number {
        if (opts.getColIndexFromPoint) return opts.getColIndexFromPoint(clientX)
        const container = opts.scrollContainerRef.value
        if (!container) return -1
        return colIndexFromX(clientX, container.getBoundingClientRect(), container.scrollLeft, opts.visibleColumnsRef.value, opts.showCheckboxRef.value, opts.getColumnWidth)
    }

    function getRowIndexFromY(clientY: number): number {
        const container = opts.scrollContainerRef.value
        if (!container) return -1
        return rowIndexFromY(clientY, container.getBoundingClientRect(), container.scrollTop, headerHeight, rowGeometry())
    }

    function getRowColFromPoint(clientX: number, clientY: number) {
        return { row: getRowIndexFromY(clientY), col: getColIndexFromX(clientX) }
    }

    // ── Cell-level highlight ───────────────────────────────────
    // Selection is painted by tinting the real cell background (not a floating
    // overlay layer). This keeps frozen cells pixel-locked while scrolling (they
    // are native sticky DOM, no translateX to lag), prevents transparent layers
    // from stacking (solid blend), and lets row-hover CSS override it naturally.
    // Returns: 0 = outside, 1 = in a secondary range, 2 = in the primary (last) range.
    function cellRangeLevel(rowIndex: number, colIndex: number): 0 | 1 | 2 {
        if (rowIndex < 0 || colIndex < 0) return 0
        let level: 0 | 1 = 0
        const lastIdx = state.ranges.length - 1
        for (let i = 0; i < state.ranges.length; i++) {
            const r = state.ranges[i]
            if (!r) continue
            if (rowIndex >= r.rowStart && rowIndex <= r.rowEnd && colIndex >= r.colStart && colIndex <= r.colEnd) {
                if (i === lastIdx) return 2
                level = 1
            }
        }
        return level
    }

    const activeRange = computed<SelectionRange | null>(() => state.ranges[state.ranges.length - 1] ?? null)

    // Column-only range membership (for header highlight): same as cellRangeLevel
    // but ignores rows. 2 = column in the primary range, 1 = secondary, 0 = none.
    function colRangeLevel(colIndex: number): 0 | 1 | 2 {
        if (colIndex < 0) return 0
        let level: 0 | 1 = 0
        const lastIdx = state.ranges.length - 1
        for (let i = 0; i < state.ranges.length; i++) {
            const r = state.ranges[i]
            if (!r) continue
            if (colIndex >= r.colStart && colIndex <= r.colEnd) {
                if (i === lastIdx) return 2
                level = 1
            }
        }
        return level
    }

    // Floating copy/settings buttons. The div is rendered under the table pane
    // root, not inside the scroll body, so top/left are VISUAL coordinates relative
    // to that overlay parent. Natural target = range bottom-right corner, inset
    // inward; when the range corner scrolls away, clamp to the visible table frame.
    // Hidden only while dragging or for a single-cell range.
    const actionsAnchor = computed<ActionsAnchor | null>(() => {
        const range = activeRange.value
        if (!range || state.isDragging) return null
        const cellCount = (range.rowEnd - range.rowStart + 1) * (range.colEnd - range.colStart + 1)
        if (cellCount <= 1) return null

        const cols = opts.visibleColumnsRef.value
        const widths = cumulativeWidths(cols, opts.showCheckboxRef.value, opts.getColumnWidth)
        const rect = rangeToRect(range, widths, rowGeometry())

        const frozenW = opts.frozenWidthRef.value
        const viewportW = opts.viewportWidthRef.value
        const containerH = opts.containerHeightRef.value
        const scrollLeft = opts.scrollLeftRef.value
        const scrollTop = opts.scrollTopRef.value

        const rangeAllFrozen = cols
            .slice(range.colStart, range.colEnd + 1)
            .every((c) => c.frozen)

        const visualLeft = rangeAllFrozen
            ? rect.left
            : rect.left - scrollLeft
        const visualTop = actionsTopOffset + rect.top - scrollTop

        const minLeft = ACTIONS_INSET
        const maxLeft = rangeAllFrozen
            ? frozenW - ACTIONS_WIDTH - ACTIONS_INSET
            : frozenW + viewportW - ACTIONS_WIDTH - ACTIONS_INSET
        const minTop = actionsTopOffset + ACTIONS_INSET
        const maxTop = actionsTopOffset + containerH - ACTIONS_HEIGHT - ACTIONS_INSET

        const desiredLeft = visualLeft + rect.width - ACTIONS_WIDTH - ACTIONS_INSET
        const desiredTop = visualTop + rect.height - ACTIONS_HEIGHT - ACTIONS_INSET
        // Clamp to [min, max]; cap min at max so narrow/short panes never invert
        // the range-actions into an off-screen push.
        const clamp = (v: number, min: number, max: number) => Math.max(Math.min(min, max), Math.min(v, max))
        return {
            left: clamp(desiredLeft, minLeft, maxLeft),
            top: clamp(desiredTop, minTop, maxTop)
        }
    })

    // ── Body mouse pipeline ────────────────────────────────────

    function shouldSkipBodyTarget(target: EventTarget | null): boolean {
        const el = target as HTMLElement | null
        if (!el || !el.closest) return true
        if (el.closest(".column-resizer")) return true
        if (el.closest(".checkbox-cell")) return true
        if (el.closest(".col-select-handle")) return true
        if (el.closest(".range-actions")) return true
        if (!el.closest(".grid-row")) return true
        return false
    }

    function isModifier(e: MouseEvent): boolean {
        return e.ctrlKey || e.metaKey
    }

    function updateRangeFocus(row: number, col: number) {
        state.focus = { row, col }
        const { anchor } = state
        const last = state.ranges[state.ranges.length - 1]
        if (!last) return
        last.rowStart = Math.min(anchor.row, row)
        last.rowEnd = Math.max(anchor.row, row)
        last.colStart = Math.min(anchor.col, col)
        last.colEnd = Math.max(anchor.col, col)
    }

    function onBodyMouseDown(e: MouseEvent) {
        if (!opts.enabledRef.value) return
        if (e.button !== 0) return
        if (shouldSkipBodyTarget(e.target)) return

        const { row, col } = getRowColFromPoint(e.clientX, e.clientY)
        if (row < 0 || col < 0) return

        // Shift+click → extend last range from the current anchor.
        if (e.shiftKey && state.ranges.length) {
            updateRangeFocus(row, col)
            e.preventDefault()
            return
        }

        // Ctrl/Cmd+click → add a new range immediately (multi-range).
        if (isModifier(e)) {
            state.ranges.push({ rowStart: row, rowEnd: row, colStart: col, colEnd: col })
            state.anchor = { row, col }
            state.focus = { row, col }
            state.isDragging = true
            state.dragMode = "body"
            document.addEventListener("mousemove", onBodyMouseMove)
            document.addEventListener("mouseup", onBodyMouseUp)
            e.preventDefault()
            return
        }

        // Plain click → defer activation so the browser can select cell text.
        // Clear old ranges now (visual feedback) but wait for drag to start one.
        if (state.ranges.length) {
            state.ranges = []
            state.dragMode = null
            stopAutoScroll()
        }
        state.pendingDrag = { anchor: { row, col } }
        document.addEventListener("mousemove", onBodyMouseMove)
        document.addEventListener("mouseup", onBodyMouseUp)
        // No preventDefault — keep native text selection until the drag leaves the cell.
    }

    function onBodyMouseMove(e: MouseEvent) {
        if (state.pendingDrag) {
            const { row, col } = getRowColFromPoint(e.clientX, e.clientY)
            if (row < 0 || col < 0) return
            const anchor = state.pendingDrag.anchor
            if (row === anchor.row && col === anchor.col) return // still in anchor cell

            try {
                window.getSelection()?.removeAllRanges()
            } catch {
                // Safari edge case with no selection — ignore.
            }
            state.ranges = [{ rowStart: anchor.row, rowEnd: anchor.row, colStart: anchor.col, colEnd: anchor.col }]
            state.anchor = { ...anchor }
            state.focus = { ...anchor }
            state.isDragging = true
            state.dragMode = "body"
            state.pendingDrag = null
            lastMouseEvent = e
            updateRangeFocus(row, col)
            checkAndStartAutoScroll(e)
            return
        }

        if (!state.isDragging) return
        lastMouseEvent = e
        const { row, col } = getRowColFromPoint(e.clientX, e.clientY)
        if (row >= 0 && col >= 0) updateRangeFocus(row, col)
        checkAndStartAutoScroll(e)
    }

    function onBodyMouseUp() {
        if (state.pendingDrag) {
            state.pendingDrag = null
            document.removeEventListener("mousemove", onBodyMouseMove)
            document.removeEventListener("mouseup", onBodyMouseUp)
            return
        }
        if (!state.isDragging) return
        state.isDragging = false
        state.dragMode = null
        stopAutoScroll()
        document.removeEventListener("mousemove", onBodyMouseMove)
        document.removeEventListener("mouseup", onBodyMouseUp)
    }

    // ── Header column handle (drag selects whole columns) ──────

    function onHeaderMouseDown(e: MouseEvent, colIndex: number) {
        if (!opts.enabledRef.value) return
        if (e.button !== 0) return
        const el = e.target as HTMLElement | null
        if (el?.closest?.(".column-resizer")) return
        if (el?.closest?.(".header-option")) return // sort/freeze dropdown

        headerDownState = { colIndex, startX: e.clientX, startY: e.clientY }
        document.addEventListener("mousemove", onHeaderMoveDetect)
        document.addEventListener("mouseup", onHeaderUpDetect)
    }

    function onHeaderMoveDetect(e: MouseEvent) {
        const s = headerDownState
        if (!s) return
        if (Math.max(Math.abs(e.clientX - s.startX), Math.abs(e.clientY - s.startY)) <= HEADER_DRAG_THRESHOLD) return
        document.removeEventListener("mousemove", onHeaderMoveDetect)
        document.removeEventListener("mouseup", onHeaderUpDetect)
        startColRangeSelect(e, s.colIndex)
        headerDownState = null
    }

    function onHeaderUpDetect() {
        document.removeEventListener("mousemove", onHeaderMoveDetect)
        document.removeEventListener("mouseup", onHeaderUpDetect)
        headerDownState = null
    }

    function startColRangeSelect(e: MouseEvent, startCol: number) {
        const rowLast = Math.max(0, opts.rowCountRef.value - 1)
        const newRange: SelectionRange = { rowStart: 0, rowEnd: rowLast, colStart: startCol, colEnd: startCol }
        if (isModifier(e)) state.ranges.push(newRange)
        else state.ranges = [newRange]
        state.anchor = { row: 0, col: startCol }
        state.focus = { row: rowLast, col: startCol }
        state.isDragging = true
        state.dragMode = "col-handle"
        document.addEventListener("mousemove", onColHandleMove)
        document.addEventListener("mouseup", onColHandleUp)
    }

    function onColHandleMove(e: MouseEvent) {
        if (!state.isDragging || state.dragMode !== "col-handle") return
        lastMouseEvent = e
        const col = getColIndexFromX(e.clientX)
        if (col < 0) return
        const last = state.ranges[state.ranges.length - 1]
        if (!last) return
        last.colStart = Math.min(state.anchor.col, col)
        last.colEnd = Math.max(state.anchor.col, col)
        checkAndStartAutoScroll(e)
    }

    function onColHandleUp() {
        if (state.dragMode !== "col-handle") return
        state.isDragging = false
        state.dragMode = null
        stopAutoScroll()
        document.removeEventListener("mousemove", onColHandleMove)
        document.removeEventListener("mouseup", onColHandleUp)
    }

    // ── Auto-scroll near container edges ───────────────────────

    function checkAndStartAutoScroll(e: MouseEvent) {
        const container = opts.scrollContainerRef.value
        if (!container) return
        const rect = container.getBoundingClientRect()
        const topEdge = rect.top + headerHeight
        const nearEdge = e.clientX - rect.left < AUTO_SCROLL_EDGE || rect.right - e.clientX < AUTO_SCROLL_EDGE || e.clientY - topEdge < AUTO_SCROLL_EDGE || rect.bottom - e.clientY < AUTO_SCROLL_EDGE
        if (nearEdge && autoScrollRAF === null) {
            autoScrollRAF = requestAnimationFrame(autoScrollLoop)
        }
    }

    function stopAutoScroll() {
        if (autoScrollRAF !== null) {
            cancelAnimationFrame(autoScrollRAF)
            autoScrollRAF = null
        }
    }

    function autoScrollLoop() {
        const container = opts.scrollContainerRef.value
        if (!state.isDragging || !lastMouseEvent || !container) {
            autoScrollRAF = null
            return
        }
        const rect = container.getBoundingClientRect()
        const { clientX, clientY } = lastMouseEvent
        const topEdge = rect.top + headerHeight
        let dx = 0
        let dy = 0
        if (clientX - rect.left < AUTO_SCROLL_EDGE && clientX > rect.left) dx = -AUTO_SCROLL_MAX_SPEED * (1 - (clientX - rect.left) / AUTO_SCROLL_EDGE)
        else if (rect.right - clientX < AUTO_SCROLL_EDGE && clientX < rect.right) dx = AUTO_SCROLL_MAX_SPEED * (1 - (rect.right - clientX) / AUTO_SCROLL_EDGE)
        if (clientY - topEdge < AUTO_SCROLL_EDGE && clientY > topEdge) dy = -AUTO_SCROLL_MAX_SPEED * (1 - (clientY - topEdge) / AUTO_SCROLL_EDGE)
        else if (rect.bottom - clientY < AUTO_SCROLL_EDGE && clientY < rect.bottom) dy = AUTO_SCROLL_MAX_SPEED * (1 - (rect.bottom - clientY) / AUTO_SCROLL_EDGE)

        if (dx === 0 && dy === 0) {
            autoScrollRAF = null
            return
        }
        const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth)
        const maxTop = Math.max(0, container.scrollHeight - container.clientHeight)
        container.scrollLeft = Math.max(0, Math.min(maxLeft, container.scrollLeft + dx))
        container.scrollTop = Math.max(0, Math.min(maxTop, container.scrollTop + dy))

        const { row, col } = getRowColFromPoint(clientX, clientY)
        if (row >= 0 && col >= 0) {
            if (state.dragMode === "col-handle") {
                const last = state.ranges[state.ranges.length - 1]
                if (last) {
                    last.colStart = Math.min(state.anchor.col, col)
                    last.colEnd = Math.max(state.anchor.col, col)
                }
            } else {
                updateRangeFocus(row, col)
            }
        }
        autoScrollRAF = requestAnimationFrame(autoScrollLoop)
    }

    // ── Clear + global keyboard/click ──────────────────────────

    function clearRanges() {
        state.ranges = []
        state.anchor = { row: 0, col: 0 }
        state.focus = { row: 0, col: 0 }
        state.isDragging = false
        state.dragMode = null
        state.pendingDrag = null
        stopAutoScroll()
    }

    function isEditingTarget(): boolean {
        const active = document.activeElement as HTMLElement | null
        if (!active) return false
        const tag = active.tagName
        return tag === "INPUT" || tag === "TEXTAREA" || active.isContentEditable
    }

    function onKeyDown(e: KeyboardEvent) {
        if ((e.key === "c" || e.key === "C") && (e.metaKey || e.ctrlKey)) {
            if (!opts.enabledRef.value || !state.ranges.length) return
            if (isEditingTarget()) return
            e.preventDefault()
            opts.onCopyRequest?.()
            return
        }
        if (e.key !== "Escape") return
        if (!state.ranges.length) return
        if (isEditingTarget()) return
        clearRanges()
    }

    function onDocumentMouseDown(e: MouseEvent) {
        if (!state.ranges.length && !state.pendingDrag) return
        if (state.isDragging) return
        // Shift / Ctrl / Cmd clicks extend or add ranges and depend on the
        // current selection still existing — this listener runs in the capture
        // phase (before the cell/header handlers), so clearing here would break
        // them. Leave the selection for the body/header handler to mutate.
        if (e.shiftKey || isModifier(e)) return
        const el = e.target as HTMLElement | null
        // Only keep the selection when the click targets the floating copy/settings
        // controls; any other plain click — even elsewhere inside the table
        // (toolbar, paging, empty space, headers) — clears it so the highlight
        // matches the user's mental model of "I clicked away".
        if (el?.closest?.(".range-actions")) return
        // The settings DropdownMenu portals its content to <body> (outside
        // .range-actions), so clicking the "copy header" checkbox would otherwise
        // read as an outside click and clear the selection mid-interaction. Exempt
        // the portaled content via its stable data-slot attribute.
        if (el?.closest?.('[data-slot="dropdown-menu-content"]')) return
        if (state.ranges.length) clearRanges()
        if (state.pendingDrag) {
            state.pendingDrag = null
            document.removeEventListener("mousemove", onBodyMouseMove)
            document.removeEventListener("mouseup", onBodyMouseUp)
        }
    }

    function attachGlobalListeners() {
        window.addEventListener("keydown", onKeyDown)
        document.addEventListener("mousedown", onDocumentMouseDown, true)
    }

    function detachGlobalListeners() {
        window.removeEventListener("keydown", onKeyDown)
        document.removeEventListener("mousedown", onDocumentMouseDown, true)
        // Remove every drag listener that could be mid-attached if the component
        // unmounts while a body/header/column-handle drag is in flight.
        document.removeEventListener("mousemove", onBodyMouseMove)
        document.removeEventListener("mouseup", onBodyMouseUp)
        document.removeEventListener("mousemove", onHeaderMoveDetect)
        document.removeEventListener("mouseup", onHeaderUpDetect)
        document.removeEventListener("mousemove", onColHandleMove)
        document.removeEventListener("mouseup", onColHandleUp)
        stopAutoScroll()
    }

    return {
        state,
        cellRangeLevel,
        colRangeLevel,
        activeRange,
        actionsAnchor,
        onBodyMouseDown,
        onHeaderMouseDown,
        clearRanges,
        attachGlobalListeners,
        detachGlobalListeners,
        // Exposed for unit testing of pure coordinate helpers.
        getColIndexFromX,
        getRowIndexFromY
    }
}
