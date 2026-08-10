import { readSheet, type CellValue } from 'read-excel-file/browser'
import { parseCsv, type ParsedRows } from './csv'

// `read-excel-file` (not the popular `xlsx`/SheetJS package — see csv.ts's
// comment on why) parses actual .xlsx cell values, which can be strings,
// numbers, booleans, or Dates. Everything downstream of this (column
// mapping, phone normalization) works on plain strings, so every cell is
// stringified here, once.
function cellToString(value: CellValue<number> | null): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

function isExcelFile(file: File): boolean {
  return /\.xlsx$/i.test(file.name)
}

// A phone column left in "General"/"Number" format in Excel (rather than
// "Text") loses its leading zero — e.g. "0599111222" becomes the number
// 599111222. Nothing can recover a digit that's already gone from the
// source file; normalizePhoneToE164 will just (correctly) flag the result
// as an invalid phone, same as any other malformed input.
export async function parseSpreadsheetFile(file: File): Promise<ParsedRows> {
  if (isExcelFile(file)) {
    const sheet = await readSheet(file)
    const [headerRow, ...dataRows] = sheet
    return {
      headers: (headerRow ?? []).map((h) => cellToString(h).trim()),
      rows: dataRows.map((row) => row.map(cellToString)),
    }
  }
  return parseCsv(await file.text())
}
