import React from 'react';
import { Button } from '../ui/Button';
import { IconKeyboard, IconX } from '@tabler/icons-react';

export interface ShortcutSheetProps {
  open: boolean;
  onClose: () => void;
}

export const ShortcutSheet: React.FC<ShortcutSheetProps> = ({ open, onClose }) => {
  if (!open) return null;

  const SHORTCUTS = [
    { key: 'Ctrl + K', desc: 'Open global command palette and search' },
    { key: '[', desc: 'Toggle navigation sidebar collapse/expand' },
    { key: '?', desc: 'Open this keyboard shortcuts reference sheet' },
    { key: 'Esc', desc: 'Close any active dialog, drawer, or palette' },
    { key: 'Alt + 1', desc: 'Jump to Command Center' },
    { key: 'Alt + 2', desc: 'Jump to Risk Queue' },
    { key: 'Alt + 3', desc: 'Jump to Route Optimizer' },
    { key: 'Alt + 7', desc: 'Jump to Model Governance' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-[var(--surface)] border border-[var(--border)] rounded-[8px] overflow-hidden shadow-[var(--shadow-modal)] text-[var(--ink)] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <IconKeyboard size={18} className="text-[var(--accent)]" />
            <h3 className="text-[14px] font-semibold">Dispatcher Keyboard Shortcuts</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between text-[13px] py-1 border-b border-[var(--border)]/50 last:border-0"
            >
              <span className="text-[var(--ink-muted)]">{s.desc}</span>
              <kbd className="font-mono text-[11px] bg-[var(--surface-sunken)] border border-[var(--border)] px-2 py-0.5 rounded-[3px] text-[var(--ink)] font-medium">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-4 py-2.5 bg-[var(--surface-muted)] border-t border-[var(--border)] flex justify-end">
          <Button variant="secondary" size="compact" onClick={onClose}>
            Close (Esc)
          </Button>
        </div>
      </div>
    </div>
  );
};
