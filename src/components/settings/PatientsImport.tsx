import { useMemo, useState, type ChangeEvent } from 'react'
import ar from '../../i18n/ar'
import Button from '../ui/Button'
import Select from '../ui/Select'
import { buildCsv, type ParsedRows } from '../../lib/csv'
import { parseSpreadsheetFile } from '../../lib/spreadsheet'
import { normalizePhoneToE164, DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, type PhoneCountryCode } from '../../lib/phone'
import { usePatients } from '../../hooks/usePatients'

const NAME_KEYWORDS = ['اسم', 'name']
const PHONE_KEYWORDS = ['هاتف', 'جوال', 'موبايل', 'phone', 'mobile', 'رقم']
const NOTES_KEYWORDS = ['ملاحظ', 'note']

function detectColumn(headers: string[], keywords: string[]): number | null {
  const idx = headers.findIndex((h) => keywords.some((k) => h.toLowerCase().includes(k)))
  return idx === -1 ? null : idx
}

interface ProcessedRow {
  name: string
  phoneRaw: string
  phoneNormalized: string | null
  notes: string | null
  status: 'new' | 'duplicate' | 'duplicateInFile' | 'invalid'
  invalidReason?: string
}

function processRows(
  parsed: ParsedRows,
  nameCol: number | null,
  phoneCol: number | null,
  notesCol: number | null,
  country: PhoneCountryCode,
  existingPhones: Set<string>,
): ProcessedRow[] {
  const seenInFile = new Set<string>()
  return parsed.rows.map((row) => {
    const name = (nameCol != null ? (row[nameCol] ?? '') : '').trim()
    const phoneRaw = (phoneCol != null ? (row[phoneCol] ?? '') : '').trim()
    const notes = notesCol != null ? (row[notesCol] ?? '').trim() || null : null
    const phoneNormalized = phoneRaw ? normalizePhoneToE164(phoneRaw, country) : null

    if (!name) return { name, phoneRaw, phoneNormalized, notes, status: 'invalid' as const, invalidReason: ar.import_invalidReasonName }
    if (!phoneNormalized) return { name, phoneRaw, phoneNormalized, notes, status: 'invalid' as const, invalidReason: ar.import_invalidReasonPhone }
    if (existingPhones.has(phoneNormalized)) return { name, phoneRaw, phoneNormalized, notes, status: 'duplicate' as const }
    if (seenInFile.has(phoneNormalized)) return { name, phoneRaw, phoneNormalized, notes, status: 'duplicateInFile' as const }
    seenInFile.add(phoneNormalized)
    return { name, phoneRaw, phoneNormalized, notes, status: 'new' as const }
  })
}

function downloadTemplate() {
  const csv = buildCsv(
    ['الاسم', 'رقم الهاتف', 'ملاحظات'],
    [
      ['سارة أحمد', '0599111222', 'مثال'],
      ['محمد خليل', '0599333444', ''],
    ],
  )
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'نموذج-استيراد-المرضى.csv'
  link.click()
  URL.revokeObjectURL(url)
}

const STATUS_STYLES: Record<ProcessedRow['status'], string> = {
  new: 'bg-success-soft text-success',
  duplicate: 'bg-border text-text-muted',
  duplicateInFile: 'bg-border text-text-muted',
  invalid: 'bg-error-soft text-error',
}

export default function PatientsImport() {
  const { patients, importPatients } = usePatients()
  const [parsed, setParsed] = useState<ParsedRows | null>(null)
  const [nameCol, setNameCol] = useState<number | null>(null)
  const [phoneCol, setPhoneCol] = useState<number | null>(null)
  const [notesCol, setNotesCol] = useState<number | null>(null)
  const [country, setCountry] = useState<PhoneCountryCode>(DEFAULT_PHONE_COUNTRY)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ inserted: number; duplicates: number; invalid: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const existingPhones = useMemo(() => new Set(patients.map((p) => p.phone)), [patients])

  const processed = useMemo(
    () => (parsed ? processRows(parsed, nameCol, phoneCol, notesCol, country, existingPhones) : []),
    [parsed, nameCol, phoneCol, notesCol, country, existingPhones],
  )

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setResult(null)

    let csv: ParsedRows
    try {
      csv = await parseSpreadsheetFile(file)
    } catch {
      setError(ar.import_parseError)
      setParsed(null)
      return
    }
    if (csv.headers.length === 0 || csv.rows.length === 0) {
      setError(ar.import_emptyFile)
      setParsed(null)
      return
    }
    setParsed(csv)
    setNameCol(detectColumn(csv.headers, NAME_KEYWORDS))
    setPhoneCol(detectColumn(csv.headers, PHONE_KEYWORDS))
    setNotesCol(detectColumn(csv.headers, NOTES_KEYWORDS))
  }

  async function handleImport() {
    const newRows = processed.filter((r) => r.status === 'new')
    setImporting(true)
    setError(null)
    const { error: importError, inserted } = await importPatients(
      newRows.map((r) => ({ name: r.name, phone: r.phoneNormalized!, notes: r.notes })),
    )
    setImporting(false)
    if (importError) {
      setError(importError)
      return
    }
    setResult({
      inserted,
      duplicates: processed.filter((r) => r.status === 'duplicate' || r.status === 'duplicateInFile').length,
      invalid: processed.filter((r) => r.status === 'invalid').length,
    })
    setParsed(null)
  }

  const newCount = processed.filter((r) => r.status === 'new').length

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-sm font-bold text-text">{ar.import_title}</h2>
      <p className="mt-1.5 text-sm text-text-muted">{ar.import_intro}</p>
      <p className="mt-1 text-xs text-text-muted">{ar.import_excelHint}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="h-11 cursor-pointer rounded-xl border border-primary/40 bg-surface px-4 text-sm font-medium leading-[2.75rem] text-primary-dark outline outline-2 outline-offset-2 outline-transparent transition-colors hover:bg-primary-soft has-[:focus-visible]:outline-focus">
          {parsed ? ar.import_changeFile : ar.import_chooseFile}
          <input
            type="file"
            accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFile}
            className="sr-only"
          />
        </label>
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded-md text-sm font-medium text-primary-dark outline outline-2 outline-offset-2 outline-transparent hover:underline focus-visible:outline-focus"
        >
          {ar.import_downloadTemplate}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-error-soft px-3 py-2.5 text-sm text-error">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-xl bg-success-soft p-4 text-sm text-success">
          <p className="font-medium">{ar.import_done}</p>
          <p className="mt-1 text-text-muted">
            {result.inserted} {ar.import_summaryNew}
            {result.duplicates > 0 && <> · {result.duplicates} {ar.import_summaryDuplicate}</>}
            {result.invalid > 0 && <> · {result.invalid} {ar.import_summaryInvalid}</>}
          </p>
        </div>
      )}

      {parsed && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label={ar.import_columnName}
              value={nameCol ?? ''}
              onChange={(e) => setNameCol(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">{ar.import_columnNone}</option>
              {parsed.headers.map((h, i) => (
                <option key={i} value={i}>
                  {h}
                </option>
              ))}
            </Select>
            <Select
              label={ar.import_columnPhone}
              value={phoneCol ?? ''}
              onChange={(e) => setPhoneCol(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">{ar.import_columnNone}</option>
              {parsed.headers.map((h, i) => (
                <option key={i} value={i}>
                  {h}
                </option>
              ))}
            </Select>
            <Select
              label={ar.import_columnNotes}
              value={notesCol ?? ''}
              onChange={(e) => setNotesCol(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">{ar.import_columnNone}</option>
              {parsed.headers.map((h, i) => (
                <option key={i} value={i}>
                  {h}
                </option>
              ))}
            </Select>
          </div>

          <Select
            label={ar.import_phoneCountry}
            className="max-w-xs"
            value={country}
            onChange={(e) => setCountry(e.target.value as PhoneCountryCode)}
          >
            {PHONE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} +{c.dialCode}
              </option>
            ))}
          </Select>

          <div>
            <p className="mb-2 text-xs font-medium text-text-muted">{ar.import_preview}</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg text-start text-xs text-text-muted">
                    <th className="px-3 py-2 text-start">{ar.patients_name}</th>
                    <th className="px-3 py-2 text-start">{ar.patients_phone}</th>
                    <th className="px-3 py-2 text-start">{ar.import_statusColumn}</th>
                  </tr>
                </thead>
                <tbody>
                  {processed.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{row.name || '—'}</td>
                      <td className="px-3 py-2 font-mono" dir="ltr">
                        {row.phoneNormalized ?? (row.phoneRaw || '—')}
                      </td>
                      <td className="px-3 py-2">
                        <span className={'rounded-full px-2 py-0.5 text-xs ' + STATUS_STYLES[row.status]}>
                          {row.status === 'new' && ar.import_statusNew}
                          {row.status === 'duplicate' && ar.import_statusDuplicate}
                          {row.status === 'duplicateInFile' && ar.import_statusDuplicateInFile}
                          {row.status === 'invalid' && `${ar.import_statusInvalid} — ${row.invalidReason}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-sm text-text-muted">
            {newCount} {ar.import_summaryNew}
            {processed.length - newCount > 0 && (
              <>
                {' '}
                · {processed.filter((r) => r.status === 'duplicate' || r.status === 'duplicateInFile').length} {ar.import_summaryDuplicate}
                {' '}
                · {processed.filter((r) => r.status === 'invalid').length} {ar.import_summaryInvalid}
              </>
            )}
          </p>

          <Button onClick={handleImport} loading={importing} disabled={newCount === 0}>
            {importing ? ar.import_importing : `${ar.import_submit} (${newCount})`}
          </Button>
        </div>
      )}
    </section>
  )
}
