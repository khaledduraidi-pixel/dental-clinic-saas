import { useId, type InputHTMLAttributes } from 'react'
import { controlClasses, errorClasses, helperClasses, labelClasses } from './fieldStyles'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id?: string
  label?: string
  optionalHint?: string
  error?: string
  helperText?: string
  loading?: boolean
}

// The base control height (44px = h-11) matches Button, so a form row never
// feels mismatched. Right-edge slot is reserved for the loading spinner /
// error glyph so their appearance never reflows the field.
export default function Input({
  id,
  label,
  optionalHint,
  error,
  helperText,
  loading,
  required,
  className = '',
  ...rest
}: InputProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hasMessage = Boolean(error || helperText)

  return (
    <div>
      {label && (
        <label htmlFor={fieldId} className={labelClasses}>
          {label}
          {required && (
            <span aria-hidden="true" className="text-error">
              *
            </span>
          )}
          {optionalHint && <span className="text-label-sm font-normal text-on-surface-variant">({optionalHint})</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? `${fieldId}-desc` : undefined}
          className={`h-14 ${controlClasses(Boolean(error))} ${loading || error ? 'pe-9' : ''} ${className}`}
          {...rest}
        />
        {loading && (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 end-3 flex items-center"
          >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          </span>
        )}
        {!loading && error && (
          <span aria-hidden="true" className="absolute inset-y-0 end-3 flex items-center text-error">
            ⚠
          </span>
        )}
      </div>
      {hasMessage && (
        <p id={`${fieldId}-desc`} role={error ? 'alert' : undefined} className={error ? errorClasses : helperClasses}>
          {error ?? helperText}
        </p>
      )}
    </div>
  )
}
