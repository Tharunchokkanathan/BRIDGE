import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import {
  IconDashboard,
  IconListDetails,
  IconRoute,
  IconShieldCheck,
  IconChartBar,
  IconFileSpreadsheet,
  IconCpu,
  IconFileText,
  IconSettings,
  IconPalette,
  IconSun,
  IconMoon,
  IconArrowsExchange,
  IconRotateClockwise,
  IconSearch,
} from '@tabler/icons-react';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (path: string) => void;
  onToggleTheme: () => void;
  onSwitchModel?: () => void;
  onResetManifest?: () => void;
  activeModelName?: string;
  theme?: 'light' | 'dark';
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  onNavigate,
  onToggleTheme,
  onSwitchModel,
  onResetManifest,
  activeModelName = 'Logistic Regression',
  theme = 'light',
}) => {
  // Listen for Ctrl+K / Cmd+K and Escape
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onOpenChange(false);
        return;
      }

      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-100 cursor-pointer"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-[560px] bg-[var(--surface)] border border-[var(--border)] rounded-[8px] overflow-hidden shadow-[var(--shadow-modal)] text-[var(--ink)] font-sans cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Global Command Palette">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[var(--border)]">
            <IconSearch size={16} className="text-[var(--ink-muted)] shrink-0" />
            <Command.Input
              placeholder="Type a screen, command, or shortcut..."
              className="w-full bg-transparent text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none"
              autoFocus
            />
            <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[var(--surface-sunken)] border border-[var(--border)] font-mono text-[10px] text-[var(--ink-muted)]">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[340px] overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-6 text-center text-[12px] text-[var(--ink-muted)] font-mono">
              No matching screens or actions found.
            </Command.Empty>

            <Command.Group
              heading="Operational Screens"
              className="text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] px-2 pt-2 pb-1 select-none"
            >
              {[
                { name: 'Command Center', path: '/command-center', icon: <IconDashboard size={15} /> },
                { name: 'Risk Queue', path: '/risk-queue', icon: <IconListDetails size={15} /> },
                { name: 'Route Optimizer', path: '/route-optimizer', icon: <IconRoute size={15} /> },
                { name: 'Interventions', path: '/interventions', icon: <IconShieldCheck size={15} /> },
                { name: 'Zone Priors', path: '/zone-priors', icon: <IconChartBar size={15} /> },
                { name: 'Batch Scoring', path: '/batch-scoring', icon: <IconFileSpreadsheet size={15} /> },
                { name: 'Model Governance', path: '/model-governance', icon: <IconCpu size={15} /> },
                { name: 'Audit & Disclosures', path: '/audit', icon: <IconFileText size={15} /> },
                { name: 'Settings', path: '/settings', icon: <IconSettings size={15} /> },
                { name: 'Design Styleguide', path: '/styleguide', icon: <IconPalette size={15} /> },
              ].map((item) => (
                <Command.Item
                  key={item.path}
                  value={item.name}
                  onSelect={() => {
                    onNavigate(item.path);
                    onOpenChange(false);
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--ink)] hover:bg-[var(--surface-muted)] cursor-pointer select-none aria-selected:bg-[var(--accent-subtle)] aria-selected:text-[var(--accent)]"
                >
                  <span className="text-[var(--ink-muted)] shrink-0">{item.icon}</span>
                  <span className="flex-1">{item.name}</span>
                  <span className="font-mono text-[11px] text-[var(--ink-faint)]">
                    {item.path}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="h-px bg-[var(--border)] my-1" />

            <Command.Group
              heading="Quick Operational Actions"
              className="text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] px-2 pt-2 pb-1 select-none"
            >
              <Command.Item
                value="Switch Inference Model"
                onSelect={() => {
                  if (onSwitchModel) onSwitchModel();
                  onOpenChange(false);
                }}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--ink)] hover:bg-[var(--surface-muted)] cursor-pointer select-none aria-selected:bg-[var(--accent-subtle)] aria-selected:text-[var(--accent)]"
              >
                <IconArrowsExchange size={15} className="text-[var(--ink-muted)]" />
                <span className="flex-1">
                  Toggle Model (Currently: {activeModelName})
                </span>
                <span className="font-mono text-[10px] text-[var(--accent)]">
                  HOT-SWAP
                </span>
              </Command.Item>

              <Command.Item
                value="Reset Active Manifest to Benchmark"
                onSelect={() => {
                  if (onResetManifest) onResetManifest();
                  onOpenChange(false);
                }}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--ink)] hover:bg-[var(--surface-muted)] cursor-pointer select-none aria-selected:bg-[var(--accent-subtle)] aria-selected:text-[var(--accent)]"
              >
                <IconRotateClockwise size={15} className="text-[var(--ink-muted)]" />
                <span className="flex-1">Reset to Canonical 30-Stop Benchmark</span>
              </Command.Item>

              <Command.Item
                value="Toggle Color Theme"
                onSelect={() => {
                  onToggleTheme();
                  onOpenChange(false);
                }}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--ink)] hover:bg-[var(--surface-muted)] cursor-pointer select-none aria-selected:bg-[var(--accent-subtle)] aria-selected:text-[var(--accent)]"
              >
                {theme === 'light' ? (
                  <IconMoon size={15} className="text-[var(--ink-muted)]" />
                ) : (
                  <IconSun size={15} className="text-[var(--ink-muted)]" />
                )}
                <span className="flex-1">
                  Switch to {theme === 'light' ? 'Dark' : 'Light'} Theme
                </span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="px-3 py-2 bg-[var(--surface-muted)] border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--ink-muted)] font-mono">
            <span>Use ↑ ↓ to navigate · Enter to select</span>
            <span>BRIDGE v1.6.0</span>
          </div>
        </Command>
      </div>
    </div>
  );
};
