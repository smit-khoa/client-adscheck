import { describe, expect, it, vi } from "vitest"
import { buildTSV, escapeTSVCell, getCopyEntries, writeClipboard } from "../use-range-copy"
import type { CopyableColumn } from "../use-range-copy"

// ── escapeTSVCell ──────────────────────────────────────────────
describe("escapeTSVCell", () => {
    it("returns plain string when no special chars", () => {
        expect(escapeTSVCell("hello")).toBe("hello")
        expect(escapeTSVCell(42)).toBe("42")
    })

    it("returns empty string for null/undefined", () => {
        expect(escapeTSVCell(null)).toBe("")
        expect(escapeTSVCell(undefined)).toBe("")
    })

    it("wraps + doubles quotes when value has tab/newline/cr/quote", () => {
        expect(escapeTSVCell("a\tb")).toBe('"a\tb"')
        expect(escapeTSVCell("a\nb")).toBe('"a\nb"')
        expect(escapeTSVCell("a\rb")).toBe('"a\rb"')
        expect(escapeTSVCell('a"b')).toBe('"a""b"')
    })
})

// ── getCopyEntries ─────────────────────────────────────────────
describe("getCopyEntries", () => {
    const cols: CopyableColumn[] = [
        { field: "name", name: "Tên" },
        { field: "status", name: "Trạng thái", copyable: false },
        {
            field: "fb",
            name: "Facebook",
            copyFields: [
                { key: "fb_name", label: "FB Name", field: "fb_name" },
                { key: "fb_id", label: "FB ID", field: "fb_id" }
            ]
        }
    ]

    it("maps a plain column to one entry using field as key/field", () => {
        const entries = getCopyEntries(cols, 0, 0)
        expect(entries).toEqual([{ key: "name", parentKey: "name", label: "Tên", field: "name", type: undefined }])
    })

    it("skips a column with copyable=false", () => {
        const entries = getCopyEntries(cols, 1, 1)
        expect(entries).toEqual([])
    })

    it("expands copyFields into multiple entries", () => {
        const entries = getCopyEntries(cols, 2, 2)
        expect(entries.map(e => e.key)).toEqual(["fb_name", "fb_id"])
        expect(entries[0]?.parentKey).toBe("fb")
        expect(entries[1]?.label).toBe("FB ID")
    })

    it("dedups duplicate keys across columns", () => {
        const dupe: CopyableColumn[] = [
            { field: "a", name: "A" },
            { field: "a", name: "A again" }
        ]
        const entries = getCopyEntries(dupe, 0, 1)
        expect(entries).toHaveLength(1)
    })
})

// ── buildTSV ───────────────────────────────────────────────────
describe("buildTSV", () => {
    const entries = getCopyEntries([{ field: "a", name: "A" }, { field: "b", name: "B" }], 0, 1)
    const rows = [
        { a: "1", b: "2" },
        { a: "3", b: "4" }
    ]
    const range = { rowStart: 0, rowEnd: 1, colStart: 0, colEnd: 1 }

    it("builds a 2x2 tab/newline grid", () => {
        expect(buildTSV(range, entries, rows, {})).toBe("1\t2\n3\t4")
    })

    it("prepends header labels when includeHeader", () => {
        expect(buildTSV(range, entries, rows, { includeHeader: true })).toBe("A\tB\n1\t2\n3\t4")
    })

    it("uses formatCopyValue override when provided", () => {
        const fmt = (key: string, row: Record<string, any>) => (key === "a" ? `X${row.a}` : undefined)
        // key "a" overridden, key "b" falls back to raw row value
        expect(buildTSV(range, entries, rows, { formatCopyValue: fmt })).toBe("X1\t2\nX3\t4")
    })

    it("emits empty cells for null/undefined raw values", () => {
        const rows2 = [{ a: null, b: undefined }]
        const range1 = { rowStart: 0, rowEnd: 0, colStart: 0, colEnd: 1 }
        expect(buildTSV(range1, entries, rows2, {})).toBe("\t")
    })

    it("emits empty line for a missing row", () => {
        const range3 = { rowStart: 0, rowEnd: 2, colStart: 0, colEnd: 1 }
        expect(buildTSV(range3, entries, rows, {})).toBe("1\t2\n3\t4\n")
    })
})

// ── writeClipboard ─────────────────────────────────────────────
describe("writeClipboard", () => {
    it("uses navigator.clipboard.writeText in a secure context", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        vi.stubGlobal("navigator", { clipboard: { writeText } })
        vi.stubGlobal("isSecureContext", true)

        const ok = await writeClipboard("hello")
        expect(ok).toBe(true)
        expect(writeText).toHaveBeenCalledWith("hello")
        vi.unstubAllGlobals()
    })

    it("falls back to execCommand when clipboard API unavailable", async () => {
        vi.stubGlobal("navigator", {})
        vi.stubGlobal("isSecureContext", false)
        const execCommand = vi.fn().mockReturnValue(true)
        // jsdom lacks execCommand by default
        ;(document as any).execCommand = execCommand

        const ok = await writeClipboard("fallback")
        expect(ok).toBe(true)
        expect(execCommand).toHaveBeenCalledWith("copy")
        vi.unstubAllGlobals()
    })
})
