import React from 'react';
import { Button } from '../ui/Button';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

export interface ApiDownBannerProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export const ApiDownBanner: React.FC<ApiDownBannerProps> = ({
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div
      role="alert"
      className="bg-[var(--risk-med-bg)] border-b border-[var(--risk-med)]/30 text-[var(--risk-med)] px-4 py-2 flex items-center justify-between gap-3 text-[12px] font-medium select-none z-30"
    >
      <div className="flex items-center gap-2">
        <IconAlertTriangle size={16} className="shrink-0" />
        <span>
          BRIDGE Risk Intelligence API is unreachable. Running in offline/read-only mode.
        </span>
      </div>

      <Button
        variant="secondary"
        size="compact"
        onClick={onRetry}
        disabled={isRetrying}
        icon={<IconRefresh size={13} className={isRetrying ? 'animate-spin' : ''} />}
      >
        {isRetrying ? 'Checking...' : 'Retry Connection'}
      </Button>
    </div>
  );
};
