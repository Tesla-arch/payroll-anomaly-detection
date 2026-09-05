export default function AuthInput({
  id,
  label,
  error,
  hint,
  className = '',
  ...props
}) {
  const inputId = id || props.name
  return (
    <div>
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
        className={`input mt-1 ${error ? 'input-error' : ''} ${className}`.trim()}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-rose-700">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}
