import { describe, expect, it } from "vitest"
import { applyCheckboxRowRangeSelection, checkboxRowRange, getCheckboxDragAction, getCheckboxRangeAction } from "../use-checkbox-row-range-selection"

const rows = [
    { id: "1" },
    { id: "2" },
    {},
    { id: "4" },
    { id: "5" }
]

const getRowId = (row: Record<string, unknown>): string | null => typeof row.id === "string" ? row.id : null

describe("checkboxRowRange", () => {
    it("normalizes downward and upward row ranges", () => {
        expect(checkboxRowRange(1, 4)).toEqual({ rowStart: 1, rowEnd: 4 })
        expect(checkboxRowRange(4, 1)).toEqual({ rowStart: 1, rowEnd: 4 })
    })
})

describe("getCheckboxRangeAction", () => {
    it("selects when the anchor row is currently unchecked", () => {
        expect(getCheckboxRangeAction(false)).toBe("select")
    })

    it("deselects when the anchor row is currently checked", () => {
        expect(getCheckboxRangeAction(true)).toBe("deselect")
    })
})

describe("getCheckboxDragAction", () => {
    it("copies a checked anchor onto the range", () => {
        expect(getCheckboxDragAction(true)).toBe("select")
    })

    it("copies an unchecked anchor onto the range", () => {
        expect(getCheckboxDragAction(false)).toBe("deselect")
    })
})

describe("applyCheckboxRowRangeSelection", () => {
    it("adds every valid id in the range when action is select", () => {
        // Existing ids keep their order; new range ids append in row order.
        expect(applyCheckboxRowRangeSelection(["5"], rows, 0, 4, getRowId, "select")).toEqual(["5", "1", "2", "4"])
    })

    it("removes every valid id in the range when action is deselect", () => {
        expect(applyCheckboxRowRangeSelection(["1", "2", "4", "5"], rows, 1, 4, getRowId, "deselect")).toEqual(["1"])
    })

    it("supports shift-click ranges using the final row action", () => {
        const action = getCheckboxRangeAction(rows[3] ? ["1", "4"].includes(getRowId(rows[3]) ?? "") : false)
        expect(applyCheckboxRowRangeSelection(["1", "4"], rows, 0, 3, getRowId, action)).toEqual([])
    })

    it("keeps selected ids unique when selecting an overlapping range", () => {
        expect(applyCheckboxRowRangeSelection(["1", "2"], rows, 0, 4, getRowId, "select")).toEqual(["1", "2", "4", "5"])
    })

    it("returns the original selection when row indexes are invalid", () => {
        expect(applyCheckboxRowRangeSelection(["1"], rows, -1, 3, getRowId, "select")).toEqual(["1"])
        expect(applyCheckboxRowRangeSelection(["1"], rows, 0, 99, getRowId, "select")).toEqual(["1"])
    })
})
