// Pure export-core for the data-grid Table: turn rows + visible columns into a
// downloadable .txt (TSV) / .csv / .xlsx file. Matrix building is side-effect-free
// so it is unit-testable in isolation; only `exportTable` touches the DOM/download.
// `xlsx` (SheetJS) is dynamically imported in the csv/xlsx branches to keep it out
// of the initial bundle — `.txt` never pulls it in.

import { escapeTSVCell } from "./use-range-copy"

export type ExportFormat = "txt" | "csv" | "xlsx"

export interface ExportColumn {
    field: string
    name: string
    type?: string
}

export interface ExportTableParams {
    rows: Record<string, any>[] // already flat objects (row.data)
    columns: ExportColumn[] // = visibleColumns, in display order
    format: ExportFormat
    fileName: string // without extension
    formatCopyValue?: (key: string, row: Record<string, any>) => string | undefined
}

// Build an Array-of-Arrays: [header row] + one row per data row.
// Header cell = column.name. Data cell resolution per (field, row):
//   1. formatCopyValue(field, row) when provided and not undefined (errors fall back)
//   2. raw = row[field]; for xlsx keep numbers as numbers (Excel stores them numeric)
//   3. otherwise raw ?? "" (null/undefined → empty string)
export function buildExportMatrix(params: ExportTableParams): (string | number)[][] {
    const { rows, columns, format, formatCopyValue } = params
    const keepNumber = format === "xlsx"

    const header = columns.map(c => c.name)
    const body = rows.map(row =>
        columns.map(col => {
            const field = col.field
            if (formatCopyValue) {
                try {
                    const v = formatCopyValue(field, row)
                    if (v !== undefined) return v
                } catch (err) {
                    console.warn(`[table-export] formatCopyValue error for "${field}":`, err)
                }
            }
            const raw = row[field]
            if (keepNumber && typeof raw === "number") return raw
            return raw ?? ""
        })
    )
    return [header, ...body]
}

// Serialize a matrix to TSV using the same RFC-4180 cell escaping as range-copy,
// so .txt output matches the clipboard format. Kept separate from buildTSV (which
// is tied to CopyRange/CopyEntry) — additive, no change to that API.
export function matrixToTSV(matrix: (string | number)[][]): string {
    return matrix.map(row => row.map(escapeTSVCell).join("\t")).join("\n")
}

// Browser download trigger for a Blob via a temporary <a download>.
function triggerBlobDownload(blob: Blob, fileNameWithExt: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileNameWithExt
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

// Build the file for the chosen format and trigger the download.
// Async because csv/xlsx lazy-import the (heavy) xlsx lib on demand.
export async function exportTable(params: ExportTableParams): Promise<void> {
    const matrix = buildExportMatrix(params)

    if (params.format === "txt") {
        const tsv = matrixToTSV(matrix)
        const blob = new Blob([tsv], { type: "text/plain;charset=utf-8" })
        triggerBlobDownload(blob, `${params.fileName}.txt`)
        return
    }

    const XLSX = await import("xlsx")
    const sheet = XLSX.utils.aoa_to_sheet(matrix)

    if (params.format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(sheet)
        // Prepend UTF-8 BOM so Excel reads Vietnamese characters correctly.
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
        triggerBlobDownload(blob, `${params.fileName}.csv`)
        return
    }

    // xlsx
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, "Sheet1")
    XLSX.writeFile(wb, `${params.fileName}.xlsx`)
}
