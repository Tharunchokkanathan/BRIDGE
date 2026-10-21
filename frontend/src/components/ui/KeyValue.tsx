import React from 'react';

export interface KeyValueItem {
  key: string;
  label: string;
  value: React.ReactNode;
  detail?: string;
  isMono?: boolean;
}

export interface KeyValueProps {
  items: KeyValueItem[];
  className?: string;
}

export const KeyValue: React.FC<KeyValueProps> = ({ items, className = '' }) => {
  return (
    <div className={`divide-y divide-[var(--border)] border border-[var(--border)] rounded-[4px] bg-[var(--surface)] ${className}`}>
      {items.map((item) => (
        <div
          key={item.key}
          className="px-3.5 py-2.5 flex items-center justify-between text-[12px] gap-3"
        >
          <div className="min-w-0">
            <span className="text-[var(--ink-muted)] block truncate">{item.label}</span>
            {item.detail && (
              <span className="text-[10px] text-[var(--ink-faint)] font-mono block truncate">
                {item.detail}
              </span>
            )}
          </div>
          <div
            className={`text-right font-medium text-[var(--ink)] shrink-0 ${
              item.isMono ? 'font-mono tabular-nums' : ''
            }`}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KeyValue;
