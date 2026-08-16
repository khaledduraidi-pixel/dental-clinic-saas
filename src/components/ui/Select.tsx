import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import { controlClasses, errorClasses, helperClasses, labelClasses } from './fieldStyles'

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id?: string
  label?: string
  optionalHint?: string
  error?: string
  helperText?: string
  children: ReactNode
}

export default function Select({
  id,
  label,
  optionalHint,
  error,
  helperText,
  required,
  className = '',
  children,
  ...rest
}: SelectProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hasMessage = Boolean(error || helperText)

  return (
    <div>
      {label && (
        <label htmlFor={fieldId} className={labelClasses}>
          {label}
          {required && (
            <span aria-hidden="true" className="text-accent">
              *
            </span>
          )}
          {optionalHint && <span className="text-xs font-normal text-text-muted">({optionalHint})</span>}
        </label>
      )}
      <select
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={hasMessage ? `${fieldId}-desc` : undefined}
        className={`h-11 ${controlClasses(Boolean(error))} ${className}`}
        {...rest}
      >
        {children}
      </select>
      {hasMessage && (
        <p id={`${fieldId}-desc`} role={error ? 'alert' : undefined} className={error ? errorClasses : helperClasses}>
          {error ?? helperText}
        </p>
      )}
    </div>
  )
}
