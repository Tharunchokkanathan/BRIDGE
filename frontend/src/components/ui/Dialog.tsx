import React, { useEffect } from 'react';
import { Button } from './Button';
import { IconX } from '@tabler/icons-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-[480px]',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`w-full ${maxWidth} bg-[var(--surface)] border border-[var(--border)] rounded-[8px] overflow-hidden shadow-[var(--shadow-modal)] text-[var(--ink)] font-sans`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
          <div>
            <h3 id="dialog-title" className="text-[14px] font-semibold text-[var(--ink)] leading-snug">
              {title}
            </h3>
            {description && (
              <p className="text-[12px] text-[var(--ink-muted)] mt-0.5 leading-tight">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer focus-visible:outline-none"
            aria-label="Close dialog"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="p-5 text-[13px] text-[var(--ink)] space-y-3">{children}</div>

        {footer ? (
          <div className="px-5 py-3 bg-[var(--surface-muted)] border-t border-[var(--border)] flex items-center justify-end gap-2.5">
            {footer}
          </div>
        ) : (
          <div className="px-5 py-3 bg-[var(--surface-muted)] border-t border-[var(--border)] flex justify-end">
            <Button variant="secondary" size="compact" onClick={onClose}>
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dialog;
