import { describe, expect, it } from "vitest"
import { buildExportMatrix, matrixToTSV } from "../use-table-export"
import type { ExportColumn } from "../use-table-export"

const cols: ExportColumn[] = [
    { field: "name", name: "Tên" },
    { field: "status", name: "Trạng thái" },
    { field: "balance", name: "Số dư" }
]

const rows = [
    { name: "Acc A", status: "active", balance: 1000 },
    { name: "Acc B", status: "paused", balance: 0 }
]

// ── buildExportMatrix ──────────────────────────────────────────
describe("buildExportMatrix", () => {
    it("uses column.name for the header row, in column order", () => {
        const m = buildExportMatrix({ rows, columns: cols, format: "csv", fileName: "f" })
        expect(m[0]).toEqual(["Tên", "Trạng thái", "Số dư"])
    })

    it("keeps column order in data rows", () => {
        const reordered: ExportColumn[] = [cols[2]!, cols[0]!]
        const m = buildExportMatrix({ rows, columns: reordered, format: "csv", fileName: "f" })
        expect(m[0]).toEqual(["Số dư", "Tên"])
        expect(m[1]).toEqual([1000, "Acc A"])
    })

    it("prefers formatCopyValue when it returns a defined value", () => {
        const fmt = (key: string, row: Record<string, any>) => (key === "status" ? (row.status === "active" ? "Đang chạy" : "Tạm dừng") : undefined)
        const m = buildExportMatrix({ rows, columns: cols, format: "csv", fileName: "f", formatCopyValue: fmt })
        expect(m[1]).toEqual(["Acc A", "Đang chạy", 1000])
        expect(m[2]).toEqual(["Acc B", "Tạm dừng", 0])
    })

    it("falls back to raw value when formatCopyValue returns undefined", () => {
        const fmt = () => undefined
        const m = buildExportMatrix({ rows, columns: cols, format: "csv", fileName: "f", formatCopyValue: fmt })
        expect(m[1]).toEqual(["Acc A", "active", 1000])
    })

    it("keeps numbers as numbers for xlsx", () => {
        const m = buildExportMatrix({ rows, columns: cols, format: "xlsx", fileName: "f" })
        expect(m[1]![2]).toBe(1000)
        expect(typeof m[1]![2]).toBe("number")
    })

    it("stringifies numbers for non-xlsx is NOT done — raw kept; only formatting changes for xlsx number path", () => {
        // For txt/csv a raw number passes through as-is (matrixToTSV / sheet_to_csv stringify later).
        const m = buildExportMatrix({ rows, columns: cols, format: "txt", fileName: "f" })
        expect(m[1]![2]).toBe(1000)
    })

    it("maps null/undefined raw values to empty string", () => {
        const sparse = [{ name: null, status: undefined, balance: 5 }]
        const m = buildExportMatrix({ rows: sparse, columns: cols, format: "csv", fileName: "f" })
        expect(m[1]).toEqual(["", "", 5])
    })

    it("emits header-only matrix when there are no rows", () => {
        const m = buildExportMatrix({ rows: [], columns: cols, format: "csv", fileName: "f" })
        expect(m).toEqual([["Tên", "Trạng thái", "Số dư"]])
    })
})

// ── matrixToTSV ────────────────────────────────────────────────
describe("matrixToTSV", () => {
    it("joins cells with tabs and rows with newlines", () => {
        expect(matrixToTSV([["a", "b"], ["1", "2"]])).toBe("a\tb\n1\t2")
    })

    it("escapes cells containing tab/newline/quote", () => {
        expect(matrixToTSV([["a\tb", 'c"d'], ["e\nf", "g"]])).toBe('"a\tb"\t"c""d"\n"e\nf"\tg')
    })

    it("stringifies numbers", () => {
        expect(matrixToTSV([[1, 2.5]])).toBe("1\t2.5")
    })
})
