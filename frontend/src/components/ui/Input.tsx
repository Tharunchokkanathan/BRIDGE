import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isMono?: boolean;
  sizeVariant?: 'compact' | 'default';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      isMono = false,
      sizeVariant = 'default',
      className = '',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const heightClass = sizeVariant === 'compact' ? 'h-7 text-[12px] px-2' : 'h-8 text-[13px] px-2.5';
    const fontClass = isMono ? 'font-mono' : 'font-sans';
    const stateClass = error
      ? 'border-[var(--risk-high)] focus:ring-[var(--risk-high)]'
      : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--focus-ring)]';

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[12px] font-medium text-[var(--ink-muted)] select-none"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          disabled={disabled}
          className={`w-full bg-[var(--surface)] text-[var(--ink)] rounded-[4px] border ${stateClass} ${heightClass} ${fontClass} placeholder:text-[var(--ink-faint)] focus:outline-none focus:ring-1 transition-colors disabled:bg-[var(--surface-sunken)] disabled:text-[var(--ink-faint)] disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {error ? (
          <span className="text-[11px] text-[var(--risk-high)] font-medium leading-tight">
            {error}
          </span>
        ) : helperText ? (
          <span className="text-[11px] text-[var(--ink-muted)] leading-tight">
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
