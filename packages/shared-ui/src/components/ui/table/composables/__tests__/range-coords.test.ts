import { describe, expect, it } from "vitest"
import { colIndexFromX, cumulativeWidths, rangeToRect, rowIndexFromY, type RowGeometry } from "../range-coords"
import type { RangeSelectColumn, SelectionRange } from "../use-table-range-selection"

const cols: RangeSelectColumn[] = [
    { field: "a", frozen: true },
    { field: "b", frozen: true },
    { field: "c" },
    { field: "d" }
]
const widthOf = () => 100 // every column is 100px

function rect(left: number, width: number): DOMRect {
    return { left, top: 0, width, height: 400, right: left + width, bottom: 400, x: left, y: 0, toJSON: () => ({}) } as DOMRect
}

// ── cumulativeWidths ───────────────────────────────────────────
describe("cumulativeWidths", () => {
    it("includes the checkbox offset at index 0", () => {
        expect(cumulativeWidths(cols, true, widthOf)).toEqual([60, 160, 260, 360, 460])
    })

    it("starts at 0 when checkbox hidden", () => {
        expect(cumulativeWidths(cols, false, widthOf)).toEqual([0, 100, 200, 300, 400])
    })
})

// ── colIndexFromX ──────────────────────────────────────────────
describe("colIndexFromX", () => {
    // checkbox 60 + frozen a[60..160] b[160..260], then non-frozen shifted by scrollLeft.
    it("maps X within frozen columns (scrollLeft ignored)", () => {
        expect(colIndexFromX(70, rect(0, 800), 0, cols, true, widthOf)).toBe(0)
        expect(colIndexFromX(200, rect(0, 800), 0, cols, true, widthOf)).toBe(1)
    })

    it("applies scrollLeft once it crosses into non-frozen columns", () => {
        // Frozen b's check (relX<260) wins first, so X<260 maps to b. Past 260 the
        // walk applies scrollLeft 50: c is reachable for [260,310), d for [310,410).
        expect(colIndexFromX(265, rect(0, 800), 50, cols, true, widthOf)).toBe(2)
        expect(colIndexFromX(320, rect(0, 800), 50, cols, true, widthOf)).toBe(3)
    })

    it("clamps to the last column past the end", () => {
        expect(colIndexFromX(9999, rect(0, 800), 0, cols, true, widthOf)).toBe(3)
    })

    it("returns -1 for empty columns", () => {
        expect(colIndexFromX(100, rect(0, 800), 0, [], true, widthOf)).toBe(-1)
    })
})

// ── rowIndexFromY (fixed height) ───────────────────────────────
describe("rowIndexFromY fixed height", () => {
    const geo: RowGeometry = { rowCount: 10, rowHeight: 50, dynamic: false, rowPositions: [] }
    it("subtracts header height and adds scrollTop", () => {
        // clientY 100, container top 0, header 50, scrollTop 0 → relY 50 → row 1.
        expect(rowIndexFromY(100, rect(0, 800), 0, 50, geo)).toBe(1)
        // scrollTop 200 → relY 250 → row 5.
        expect(rowIndexFromY(100, rect(0, 800), 200, 50, geo)).toBe(5)
    })

    it("clamps to 0 above the first row and to last past the end", () => {
        expect(rowIndexFromY(10, rect(0, 800), 0, 50, geo)).toBe(0)
        expect(rowIndexFromY(99999, rect(0, 800), 0, 50, geo)).toBe(9)
    })
})

// ── rowIndexFromY (dynamic height, binary search) ──────────────
describe("rowIndexFromY dynamic height", () => {
    // rows of varying height: positions are cumulative tops.
    const positions = [0, 40, 120, 130, 300]
    const geo: RowGeometry = { rowCount: 5, rowHeight: 50, dynamic: true, rowPositions: positions }
    it("binary-searches the last position <= relY", () => {
        // header 0, scrollTop 0. relY = clientY.
        expect(rowIndexFromY(0, rect(0, 800), 0, 0, geo)).toBe(0)
        expect(rowIndexFromY(45, rect(0, 800), 0, 0, geo)).toBe(1)
        expect(rowIndexFromY(125, rect(0, 800), 0, 0, geo)).toBe(2)
        expect(rowIndexFromY(135, rect(0, 800), 0, 0, geo)).toBe(3)
        expect(rowIndexFromY(500, rect(0, 800), 0, 0, geo)).toBe(4)
    })
})

// ── rangeToRect ────────────────────────────────────────────────
describe("rangeToRect", () => {
    const geo: RowGeometry = { rowCount: 10, rowHeight: 50, dynamic: false, rowPositions: [] }
    const widths = cumulativeWidths(cols, true, widthOf) // [60,160,260,360,460]
    it("computes content-absolute top/left/width/height", () => {
        const range: SelectionRange = { rowStart: 1, rowEnd: 2, colStart: 1, colEnd: 2 }
        // left = widths[1]=160, right = widths[3]=360 → width 200. top=50, height=100.
        expect(rangeToRect(range, widths, geo)).toEqual({ top: 50, left: 160, width: 200, height: 100 })
    })

    it("uses rowPositions for dynamic height", () => {
        const dynGeo: RowGeometry = { rowCount: 5, rowHeight: 50, dynamic: true, rowPositions: [0, 40, 120, 130, 300] }
        const range: SelectionRange = { rowStart: 1, rowEnd: 2, colStart: 0, colEnd: 0 }
        // top = positions[1]=40, height = positions[3]-positions[1] = 130-40 = 90.
        const r = rangeToRect(range, widths, dynGeo)
        expect(r.top).toBe(40)
        expect(r.height).toBe(90)
    })
})
