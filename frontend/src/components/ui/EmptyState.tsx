import React from 'react';
import { Button } from './Button';
import { IconInbox } from '@tabler/icons-react';

export interface EmptyStateProps {
  title?: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon = <IconInbox size={32} className="text-[var(--ink-faint)]" />,
  className = '',
}) => {
  return (
    <div
      className={`p-8 rounded-[6px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/50 flex flex-col items-center justify-center text-center space-y-3 ${className}`}
    >
      <div className="p-2.5 rounded-full bg-[var(--surface-sunken)] border border-[var(--border)]">
        {icon}
      </div>

      <div className="max-w-[360px] space-y-1">
        {title && (
          <h4 className="text-[14px] font-semibold text-[var(--ink)]">
            {title}
          </h4>
        )}
        <p className="text-[13px] text-[var(--ink-muted)] leading-relaxed">
          {description}
        </p>
      </div>

      {actionText && onAction && (
        <div className="pt-1">
          <Button variant="secondary" size="default" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
