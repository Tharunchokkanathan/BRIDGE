import React from 'react';

export type RiskLevel = 'low' | 'med' | 'high';
export type BadgeType = RiskLevel | 'info' | 'neutral' | 'accent' | 'heuristic' | 'preview' | 'simulation' | 'distance';

export interface BadgeProps {
  type?: BadgeType;
  score?: number;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  type = 'neutral',
  score,
  label,
  className = '',
  children,
}) => {
  // Guardrail presets
  if (type === 'heuristic') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[11px] font-mono leading-none border border-[var(--risk-med)]/30 bg-[var(--risk-med-bg)] text-[var(--risk-med)] uppercase tracking-wider font-semibold ${className}`}
        title="Rule-based heuristic fallback (Phase 5.1 guardrail)"
      >
        <span>Rule-based heuristic</span>
      </span>
    );
  }

  if (type === 'preview') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[11px] font-mono leading-none border border-[var(--info)]/30 bg-[var(--info-bg)] text-[var(--info)] uppercase tracking-wider font-medium ${className}`}
        title="Preview only - dry run delivery simulation"
      >
        <span>Preview only</span>
      </span>
    );
  }

  if (type === 'simulation') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[11px] font-mono leading-none border border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--ink-muted)] uppercase tracking-wider font-medium ${className}`}
        title="Counterfactual simulation notice"
      >
        <span>Counterfactual simulation</span>
      </span>
    );
  }

  if (type === 'distance') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[11px] font-mono leading-none border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink-muted)] ${className}`}
        title="Circuity-scaled Haversine distance (kappa = 1.35)"
      >
        <span>Haversine κ=1.35</span>
      </span>
    );
  }

  // Risk badges with multi-sensory encoding: Shape + Text + Score
  if (type === 'low' || type === 'med' || type === 'high') {
    const config = {
      low: {
        glyph: '●',
        defaultLabel: 'Low',
        classes:
          'bg-[var(--risk-low-bg)] text-[var(--risk-low)] border-[var(--risk-low)]/30',
      },
      med: {
        glyph: '▲',
        defaultLabel: 'Med',
        classes:
          'bg-[var(--risk-med-bg)] text-[var(--risk-med)] border-[var(--risk-med)]/30',
      },
      high: {
        glyph: '■',
        defaultLabel: 'High',
        classes:
          'bg-[var(--risk-high-bg)] text-[var(--risk-high)] border-[var(--risk-high)]/30',
      },
    }[type];

    const displayLabel = label || config.defaultLabel;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[11px] font-mono leading-tight border ${config.classes} font-medium ${className}`}
      >
        <span className="text-[10px] select-none" aria-hidden="true">
          {config.glyph}
        </span>
        <span className="uppercase tracking-wider">{displayLabel}</span>
        {score !== undefined && (
          <span className="tabular-nums font-mono pl-0.5 border-l border-current/30">
            {score.toFixed(3)}
          </span>
        )}
      </span>
    );
  }

  // Standard operational badges
  const variantStyles = {
    info: 'bg-[var(--info-bg)] text-[var(--info)] border-[var(--info)]/30',
    accent: 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/30',
    neutral: 'bg-[var(--surface-sunken)] text-[var(--ink-muted)] border-[var(--border)]',
  }[type];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[11px] font-mono leading-tight border ${variantStyles} ${className}`}
    >
      {children || label}
    </span>
  );
};
