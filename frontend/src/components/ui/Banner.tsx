import React from 'react';
import { Button } from './Button';
import {
  IconInfoCircle,
  IconAlertTriangle,
  IconAlertCircle,
  IconCheck,
} from '@tabler/icons-react';

export type BannerVariant = 'info' | 'warning' | 'error' | 'success';

export interface BannerProps {
  variant?: BannerVariant;
  title?: string;
  children: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const Banner: React.FC<BannerProps> = ({
  variant = 'info',
  title,
  children,
  actionText,
  onAction,
  className = '',
}) => {
  const config = {
    info: {
      icon: <IconInfoCircle size={16} className="text-[var(--info)] shrink-0 mt-0.5" />,
      classes: 'bg-[var(--info-bg)] border-[var(--info)]/30 text-[var(--ink)]',
    },
    warning: {
      icon: <IconAlertTriangle size={16} className="text-[var(--risk-med)] shrink-0 mt-0.5" />,
      classes: 'bg-[var(--risk-med-bg)] border-[var(--risk-med)]/30 text-[var(--ink)]',
    },
    error: {
      icon: <IconAlertCircle size={16} className="text-[var(--risk-high)] shrink-0 mt-0.5" />,
      classes: 'bg-[var(--risk-high-bg)] border-[var(--risk-high)]/30 text-[var(--ink)]',
    },
    success: {
      icon: <IconCheck size={16} className="text-[var(--risk-low)] shrink-0 mt-0.5" />,
      classes: 'bg-[var(--risk-low-bg)] border-[var(--risk-low)]/30 text-[var(--ink)]',
    },
  }[variant];

  return (
    <div
      role="alert"
      className={`p-3.5 rounded-[4px] border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12px] ${config.classes} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        {config.icon}
        <div className="space-y-0.5">
          {title && <span className="font-semibold block">{title}</span>}
          <div className="leading-relaxed opacity-95">{children}</div>
        </div>
      </div>

      {actionText && onAction && (
        <div className="shrink-0 self-end sm:self-center">
          <Button variant="secondary" size="compact" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Banner;
