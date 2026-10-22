import React from 'react';
import { IconChevronDown } from '@tabler/icons-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  sizeVariant?: 'compact' | 'default';
  isMono?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      sizeVariant = 'default',
      isMono = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const heightClass = sizeVariant === 'compact' ? 'h-7 text-[12px] pl-2 pr-7' : 'h-8 text-[13px] pl-2.5 pr-8';
    const fontClass = isMono ? 'font-mono' : 'font-sans';
    const stateClass = error
      ? 'border-[var(--risk-high)] focus:ring-[var(--risk-high)]'
      : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--focus-ring)]';

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="text-[12px] font-medium text-[var(--ink-muted)] select-none"
          >
            {label}
          </label>
        )}
        <div className="relative w-full">
          <select
            id={selectId}
            ref={ref}
            className={`w-full appearance-none bg-[var(--surface)] text-[var(--ink)] rounded-[4px] border ${stateClass} ${heightClass} ${fontClass} focus:outline-none focus:ring-1 transition-colors disabled:bg-[var(--surface-sunken)] disabled:text-[var(--ink-faint)] disabled:cursor-not-allowed cursor-pointer ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--ink-muted)]">
            <IconChevronDown size={14} />
          </div>
        </div>
        {error && (
          <span className="text-[11px] text-[var(--risk-high)] font-medium leading-tight">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
