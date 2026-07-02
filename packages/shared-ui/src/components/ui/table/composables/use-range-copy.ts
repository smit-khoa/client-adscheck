// Pure copy-core for Excel-like range copy: flatten columns into copy entries,
// build TSV, and write to clipboard. No DOM/selection state here — that lives in
// use-table-range-selection. Kept side-effect-free (except clipboard) so it is
// unit-testable in isolation.

// Soft cap: reject copy if a range exceeds this many cells.
export const COPY_CELL_CAP = 10000

export interface CopyField {
    key: string
    label?: string
    field?: string
    type?: string
    copyable?: boolean
}

// Minimal column shape this module needs. Table.vue's Column extends it with the
// optional copy fields below — additive, so existing callers are unaffected.
export interface CopyableColumn {
    field: string
    name: string
    type?: string
    copyable?: boolean
    copyFields?: CopyField[]
}

export interface CopyEntry {
    key: string
    parentKey: string
    label: string
    field: string
    type?: string
}

export interface CopyRange {
    rowStart: number
    rowEnd: number
    colStart: number
    colEnd: number
}

export interface BuildTSVOptions {
    includeHeader?: boolean
    formatCopyValue?: (key: string, row: Record<string, any>) => string | undefined
}

// Flatten the columns in [colStart, colEnd] into copy entries.
// - plain column → one entry keyed by `field`
// - column.copyFields → one entry per sub-field
// - column.copyable === false → skip the whole column
// - copyField.copyable === false → skip that sub-field
// Duplicate keys break preset hashing → warn + skip.
export function getCopyEntries(columns: CopyableColumn[], colStart: number, colEnd: number): CopyEntry[] {
    const entries: CopyEntry[] = []
    const seenKeys = new Set<string>()

    for (let c = colStart; c <= colEnd; c++) {
        const column = columns[c]
        if (!column) continue
        if (column.copyable === false) continue

        if (Array.isArray(column.copyFields) && column.copyFields.length) {
            column.copyFields.forEach(f => {
                if (!f || f.copyable === false) return
                const key = f.key
                if (!key) return
                if (seenKeys.has(key)) {
                    console.warn(`[range-copy] duplicate copyField key "${key}" — ignored`)
                    return
                }
                seenKeys.add(key)
                entries.push({
                    key,
                    parentKey: column.field || key,
                    label: f.label || key,
                    field: f.field || key,
                    type: f.type !== undefined ? f.type : column.type
                })
            })
        } else {
            const key = column.field
            if (!key || seenKeys.has(key)) continue
            seenKeys.add(key)
            entries.push({
                key,
                parentKey: key,
                label: column.name || key,
                field: key,
                type: column.type
            })
        }
    }
    return entries
}

// RFC 4180 escape for a TSV cell. Only wrap + double-quote when the value
// contains a tab, newline, or double-quote.
export function escapeTSVCell(value: unknown): string {
    if (value === null || value === undefined) return ""
    const str = String(value)
    if (str.indexOf("\t") !== -1 || str.indexOf("\n") !== -1 || str.indexOf("\r") !== -1 || str.indexOf('"') !== -1) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

// Build a TSV string from a range + entries + rows.
// Default cell value = String(row[field] ?? ""). `formatCopyValue(key, row)`,
// when provided and not undefined, overrides per cell (errors fall back to raw).
export function buildTSV(range: CopyRange, entries: CopyEntry[], rows: Record<string, any>[], options: BuildTSVOptions): string {
    const lines: string[] = []
    const fmt = options.formatCopyValue

    if (options.includeHeader) {
        lines.push(entries.map(e => escapeTSVCell(e.label || e.key)).join("\t"))
    }

    for (let r = range.rowStart; r <= range.rowEnd; r++) {
        const row = rows[r]
        if (!row) {
            lines.push("")
            continue
        }
        const cells = entries.map(e => {
            let value: string | undefined
            if (fmt) {
                try {
                    value = fmt(e.key, row)
                } catch (err) {
                    console.warn(`[range-copy] formatCopyValue error for "${e.key}":`, err)
                    value = undefined
                }
            }
            if (value === undefined) value = row[e.field]
            return escapeTSVCell(value)
        })
        lines.push(cells.join("\t"))
    }
    return lines.join("\n")
}

// Modern Clipboard API with legacy execCommand fallback (HTTP contexts / older
// browsers). Returns whether the write succeeded.
export async function writeClipboard(text: string): Promise<boolean> {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof isSecureContext !== "undefined" && isSecureContext) {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch {
            // fall through to legacy path
        }
    }
    try {
        const ta = document.createElement("textarea")
        ta.value = text
        ta.style.position = "fixed"
        ta.style.left = "-9999px"
        ta.style.top = "0"
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        const success = document.execCommand("copy")
        document.body.removeChild(ta)
        return success
    } catch {
        return false
    }
}
