import React from 'react';
import {
  IconSun,
  IconMoon,
  IconSearch,
  IconRoute,
  IconBaselineDensitySmall,
  IconBaselineDensityMedium,
  IconBaselineDensityLarge,
} from '@tabler/icons-react';

export type UiDensity = 'compact' | 'default' | 'comfortable';

export interface TopBarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  density: UiDensity;
  onChangeDensity: (density: UiDensity) => void;
  onOpenCommandPalette: () => void;
  onNavigate: (path: string) => void;
  activeModelName: string;
  isChampionActive: boolean;
  isApiHealthy: boolean;
  manifestId?: string;
  latencyMs?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  theme,
  onToggleTheme,
  density,
  onChangeDensity,
  onOpenCommandPalette,
  onNavigate,
  activeModelName,
  isChampionActive,
  isApiHealthy,
  manifestId = 'benchmark-canonical-manifest',
  latencyMs,
}) => {
  const cycleDensity = () => {
    if (density === 'compact') onChangeDensity('default');
    else if (density === 'default') onChangeDensity('comfortable');
    else onChangeDensity('compact');
  };

  const DensityIcon = {
    compact: IconBaselineDensitySmall,
    default: IconBaselineDensityMedium,
    comfortable: IconBaselineDensityLarge,
  }[density];

  return (
    <header className="h-12 bg-[var(--surface)] border-b border-[var(--border)] px-4 flex items-center justify-between gap-4 select-none shrink-0 z-20">
      {/* Left: Active Route & Manifest Context */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--ink-muted)]">
          <IconRoute size={16} className="text-[var(--accent)] shrink-0" />
          <span className="font-semibold text-[var(--ink)]">Active Route:</span>
          <span className="font-mono text-[11px] text-[var(--ink-muted)] bg-[var(--surface-sunken)] px-1.5 py-0.5 rounded-[2px] border border-[var(--border)]">
            Route_01 (30 stops)
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-1 text-[11px] text-[var(--ink-faint)] font-mono truncate">
          <span>·</span>
          <span>Manifest:</span>
          <span className="text-[var(--ink-muted)] truncate">{manifestId}</span>
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="flex-1 max-w-[380px] hidden md:block">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          id="cmd-palette-trigger"
          className="w-full h-8 px-2.5 rounded-[4px] bg-[var(--surface-sunken)] border border-[var(--border)] hover:border-[var(--border-strong)] text-[12px] text-[var(--ink-muted)] flex items-center justify-between gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)]"
        >
          <span className="flex items-center gap-2 truncate">
            <IconSearch size={14} className="text-[var(--ink-faint)]" />
            <span className="truncate">Search stops, actions, screens...</span>
          </span>
          <kbd className="font-mono text-[10px] bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded-[2px] text-[var(--ink-muted)] shrink-0">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Controls: Model Badge, API Health, Density, Theme, Version */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Model Status Badge (Links to /model-governance) */}
        <button
          type="button"
          onClick={() => onNavigate('/model-governance')}
          title={`Active Model: ${activeModelName} · Click to manage model governance`}
          className={`h-7 px-2 rounded-[2px] border text-[11px] font-mono font-medium flex items-center gap-1.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] ${
            isChampionActive
              ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/30 hover:border-[var(--accent)]'
              : 'bg-[var(--risk-med-bg)] text-[var(--risk-med)] border-[var(--risk-med)]/30 hover:border-[var(--risk-med)]'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isChampionActive ? 'bg-[var(--accent)]' : 'bg-[var(--risk-med)]'
            }`}
          />
          <span className="truncate max-w-[120px] sm:max-w-none">
            {isChampionActive ? 'Champion: LR' : 'Candidate: LightGBM'}
          </span>
        </button>

        {/* API Health Indicator */}
        <div
          className="h-7 px-2 rounded-[2px] bg-[var(--surface-muted)] border border-[var(--border)] text-[11px] font-mono flex items-center gap-1.5 text-[var(--ink-muted)]"
          title={
            isApiHealthy
              ? `API Engine Healthy${latencyMs ? ` · Latency: ${latencyMs}ms` : ''}`
              : 'API Engine Offline / Unreachable'
          }
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isApiHealthy ? 'bg-[var(--risk-low)]' : 'bg-[var(--risk-high)]'
            }`}
          />
          <span className="hidden sm:inline">
            {isApiHealthy ? 'API: ONLINE' : 'API: DOWN'}
          </span>
          {latencyMs !== undefined && isApiHealthy && (
            <span className="text-[10px] text-[var(--ink-faint)] hidden lg:inline">
              {latencyMs}ms
            </span>
          )}
        </div>

        {/* Density Toggle */}
        <button
          type="button"
          onClick={cycleDensity}
          className="w-8 h-8 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--ink-muted)] flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)]"
          title={`Density: ${density} (Click to toggle)`}
        >
          <DensityIcon size={16} />
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          id="global-theme-toggle"
          className="w-8 h-8 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--ink-muted)] flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)]"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <IconMoon size={16} /> : <IconSun size={16} />}
        </button>

        {/* Release Version Chip */}
        <span className="hidden xl:inline-block font-mono text-[10px] text-[var(--ink-faint)] bg-[var(--surface-sunken)] px-1.5 py-0.5 rounded-[2px] border border-[var(--border)]">
          v1.6.0
        </span>
      </div>
    </header>
  );
};
