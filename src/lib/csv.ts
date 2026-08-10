// A small hand-written CSV parser. Used instead of a library deliberately —
// the popular `xlsx` package has known, unpatched high-severity
// vulnerabilities (prototype pollution, ReDoS), and this feature's whole job
// is parsing files uploaded by a clinic user, exactly the kind of
// less-trusted input those bugs target. CSV is simple enough to parse
// correctly by hand. (.xlsx is handled separately, by the actively
// maintained `read-excel-file` — see spreadsheet.ts.)
export interface ParsedRows {
  headers: string[]
  rows: string[][]
}

// RFC 4180-style parsing: handles quoted fields, embedded commas/newlines
// inside quotes, and "" as an escaped quote. Strips a leading UTF-8 BOM,
// which Excel commonly adds when saving CSV on Windows.
export function parseCsv(text: string): ParsedRows {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  function pushField() {
    row.push(field)
    field = ''
  }
  function pushRow() {
    pushField()
    rows.push(row)
    row = []
  }

  while (i < clean.length) {
    const char = clean[i]

    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += char
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = true
      i += 1
    } else if (char === ',') {
      pushField()
      i += 1
    } else if (char === '\r') {
      i += 1 // normalize CRLF -> LF by just skipping the CR
    } else if (char === '\n') {
      pushRow()
      i += 1
    } else {
      field += char
      i += 1
    }
  }
  // Final field/row, if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) pushRow()

  const nonEmpty = rows.filter((r) => !(r.length === 1 && r[0] === ''))
  const [headerRow, ...dataRows] = nonEmpty
  return { headers: (headerRow ?? []).map((h) => h.trim()), rows: dataRows }
}

export function buildCsv(headers: string[], rows: string[][]): string {
  function escapeField(value: string): string {
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  }
  const lines = [headers, ...rows].map((r) => r.map(escapeField).join(','))
  return lines.join('\r\n')
}
