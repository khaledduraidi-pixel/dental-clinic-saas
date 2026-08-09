import { useEffect, useState } from 'react'
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  decomposeE164,
  normalizePhoneToE164,
  type PhoneCountryCode,
} from '../../lib/phone'

interface PhoneInputProps {
  id?: string
  value: string
  onChange: (e164: string | null, rawLocal: string) => void
  required?: boolean
}

// Local format in, E.164 out. `value` is authoritative on mount/reset (e.g.
// opening the edit form for a different patient); after that the user's
// typing drives onChange, which reports null while the number is incomplete.
export default function PhoneInput({ id, value, onChange, required }: PhoneInputProps) {
  const decomposed = value ? decomposeE164(value) : null
  const [country, setCountry] = useState<PhoneCountryCode>(decomposed?.country ?? DEFAULT_PHONE_COUNTRY)
  const [local, setLocal] = useState(decomposed?.local ?? '')

  useEffect(() => {
    const next = value ? decomposeE164(value) : null
    setCountry(next?.country ?? DEFAULT_PHONE_COUNTRY)
    setLocal(next?.local ?? '')
    // Only re-sync when the external value changes, not on every local edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleLocalChange(rawLocal: string) {
    setLocal(rawLocal)
    onChange(normalizePhoneToE164(rawLocal, country), rawLocal)
  }

  function handleCountryChange(nextCountry: PhoneCountryCode) {
    setCountry(nextCountry)
    onChange(normalizePhoneToE164(local, nextCountry), local)
  }

  return (
    <div className="flex gap-2" dir="ltr">
      <select
        value={country}
        onChange={(e) => handleCountryChange(e.target.value as PhoneCountryCode)}
        dir="rtl"
        className="rounded-xl border border-border px-2 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {PHONE_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label} +{c.dialCode}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        required={required}
        dir="ltr"
        value={local}
        onChange={(e) => handleLocalChange(e.target.value)}
        placeholder="0599123456"
        className="block w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  )
}
