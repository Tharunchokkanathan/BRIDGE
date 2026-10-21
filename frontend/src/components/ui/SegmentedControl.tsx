import React from 'react';

export interface SegmentedOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'compact' | 'default';
  className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  size = 'default',
  className = '',
}) => {
  const heightClass = size === 'compact' ? 'h-7 p-0.5 text-[11px]' : 'h-8 p-0.5 text-[12px]';

  return (
    <div
      role="group"
      className={`inline-flex items-center rounded-[4px] bg-[var(--surface-sunken)] border border-[var(--border)] select-none ${heightClass} ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`h-full px-2.5 rounded-[2px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] ${
              isActive
                ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs border border-[var(--border-strong)]/40 font-semibold'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
