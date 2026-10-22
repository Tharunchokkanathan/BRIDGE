import React from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  footer,
  children,
  className = '',
  noPadding = false,
}) => {
  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-[6px] flex flex-col overflow-hidden ${className}`}
    >
      {(title || action) && (
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3 bg-[var(--surface)]">
          <div>
            {title && (
              <h3 className="text-[14px] font-semibold text-[var(--ink)] leading-snug">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[12px] text-[var(--ink-muted)] leading-tight mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}

      <div className={`flex-1 ${noPadding ? '' : 'p-4'}`}>{children}</div>

      {footer && (
        <div className="px-4 py-2.5 bg-[var(--surface-muted)] border-t border-[var(--border)] text-[12px] text-[var(--ink-muted)] flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};
