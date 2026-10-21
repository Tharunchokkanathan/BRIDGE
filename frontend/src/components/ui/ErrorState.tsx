import React from 'react';
import { Button } from './Button';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

export interface ErrorStateProps {
  title?: string;
  error: string;
  requestId?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Data Retrieval Failure',
  error,
  requestId,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`p-6 rounded-[6px] border border-[var(--risk-high)]/30 bg-[var(--risk-high-bg)]/40 flex flex-col items-center justify-center text-center space-y-3 ${className}`}
    >
      <div className="p-2 rounded-full bg-[var(--risk-high-bg)] text-[var(--risk-high)] border border-[var(--risk-high)]/20">
        <IconAlertTriangle size={24} />
      </div>

      <div className="max-w-[420px] space-y-1">
        <h4 className="text-[14px] font-semibold text-[var(--ink)]">
          {title}
        </h4>
        <p className="text-[12px] text-[var(--ink-muted)] leading-relaxed">
          {error}
        </p>
        {requestId && (
          <div className="font-mono text-[10px] text-[var(--ink-faint)] pt-1">
            Request ID: {requestId}
          </div>
        )}
      </div>

      {onRetry && (
        <div className="pt-1">
          <Button
            variant="secondary"
            size="compact"
            onClick={onRetry}
            icon={<IconRefresh size={13} />}
          >
            Retry Request
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
