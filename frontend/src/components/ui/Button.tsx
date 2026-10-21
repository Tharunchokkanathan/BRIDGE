import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'compact' | 'default' | 'touch';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'default',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-colors select-none rounded-[4px] border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const sizeClasses = {
    compact: 'h-7 px-2.5 text-[12px] leading-4 gap-1.5',
    default: 'h-8 px-3 text-[13px] leading-[18px] gap-2',
    touch: 'h-10 px-4 text-[13px] leading-[18px] gap-2',
  }[size];

  const variantClasses = {
    primary:
      'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border-[var(--accent)]',
    secondary:
      'bg-[var(--surface)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--surface-muted)] hover:border-[var(--border-strong)]',
    outline:
      'bg-transparent text-[var(--ink)] border-[var(--border-strong)] hover:bg-[var(--surface-muted)]',
    ghost:
      'bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-muted)]',
    danger:
      'bg-[var(--risk-high)] text-white hover:bg-[#991B1B] border-[var(--risk-high)]',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
