import React from 'react';

export interface StatProps {
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  isMono?: boolean;
  className?: string;
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  subtitle,
  badge,
  isMono = true,
  className = '',
}) => {
  return (
    <div className={`p-4 flex flex-col justify-between bg-[var(--surface)] ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] truncate">
          {label}
        </span>
        {badge && <span className="shrink-0">{badge}</span>}
      </div>

      <div className="my-2">
        <span
          className={`text-[28px] font-semibold text-[var(--ink)] leading-none ${
            isMono ? 'font-mono tabular-nums' : 'font-sans'
          }`}
        >
          {value}
        </span>
      </div>

      {subtitle && (
        <div className="text-[11px] text-[var(--ink-muted)] leading-tight truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default Stat;
