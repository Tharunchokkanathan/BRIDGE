import React, { useEffect } from 'react';
import { IconX } from '@tabler/icons-react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'w-full max-w-[480px]',
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
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`h-full ${width} bg-[var(--surface)] border-l border-[var(--border)] shadow-[var(--shadow-modal)] flex flex-col font-sans text-[var(--ink)] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
          <div>
            <h3 id="drawer-title" className="text-[14px] font-semibold text-[var(--ink)] leading-snug">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[12px] text-[var(--ink-muted)] mt-0.5 leading-tight font-mono">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
            aria-label="Close drawer"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>

        {footer && (
          <div className="px-5 py-3 bg-[var(--surface-muted)] border-t border-[var(--border)] shrink-0 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Drawer;
