// Every phone number in the app is stored as E.164. This is the one place
// that converts between that and the local format a receptionist actually types.

export type PhoneCountryCode = 'PS' | 'JO' | 'SA' | 'AE'

interface PhoneCountry {
  code: PhoneCountryCode
  label: string
  dialCode: string
  // significant-digit length of the local mobile number, after stripping
  // the trunk '0' and/or the dial code — identical across all four for now.
  nsnLength: number
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'PS', label: 'فلسطين', dialCode: '970', nsnLength: 9 },
  { code: 'JO', label: 'الأردن', dialCode: '962', nsnLength: 9 },
  { code: 'SA', label: 'السعودية', dialCode: '966', nsnLength: 9 },
  { code: 'AE', label: 'الإمارات', dialCode: '971', nsnLength: 9 },
]

export const DEFAULT_PHONE_COUNTRY: PhoneCountryCode = 'PS'

function digitsOnly(input: string): string {
  return input.replace(/\D/g, '')
}

function countryByCode(code: PhoneCountryCode): PhoneCountry {
  const found = PHONE_COUNTRIES.find((c) => c.code === code)
  if (!found) throw new Error(`Unknown phone country: ${code}`)
  return found
}

// Accepts local format ("0599123456"), with or without a leading dial code,
// and normalizes it to E.164. Returns null if it doesn't match the expected
// length for the chosen country.
export function normalizePhoneToE164(rawInput: string, country: PhoneCountryCode): string | null {
  const def = countryByCode(country)
  let digits = digitsOnly(rawInput)

  if (digits.startsWith(def.dialCode)) {
    digits = digits.slice(def.dialCode.length)
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  if (digits.length !== def.nsnLength) return null
  return `+${def.dialCode}${digits}`
}

// Splits a stored E.164 number back into {country, local} for editing.
export function decomposeE164(e164: string): { country: PhoneCountryCode; local: string } | null {
  for (const def of PHONE_COUNTRIES) {
    const prefix = `+${def.dialCode}`
    if (e164.startsWith(prefix)) {
      const local = e164.slice(prefix.length)
      if (local.length === def.nsnLength) {
        return { country: def.code, local: `0${local}` }
      }
    }
  }
  return null
}

export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value)
}
