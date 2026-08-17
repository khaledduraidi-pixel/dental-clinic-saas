import { useId, type TextareaHTMLAttributes } from 'react'
import { controlClasses, errorClasses, helperClasses, labelClasses } from './fieldStyles'

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id?: string
  label?: string
  optionalHint?: string
  error?: string
  helperText?: string
}

export default function Textarea({
  id,
  label,
  optionalHint,
  error,
  helperText,
  required,
  className = '',
  ...rest
}: TextareaProps) {
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
      <textarea
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={hasMessage ? `${fieldId}-desc` : undefined}
        className={`min-h-28 resize-y py-3 ${controlClasses(Boolean(error))} ${className}`}
        {...rest}
      />
      {hasMessage && (
        <p id={`${fieldId}-desc`} role={error ? 'alert' : undefined} className={error ? errorClasses : helperClasses}>
          {error ?? helperText}
        </p>
      )}
    </div>
  )
}
