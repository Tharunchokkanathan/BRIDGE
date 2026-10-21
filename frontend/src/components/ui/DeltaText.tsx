import React from 'react';

export interface DeltaTextProps {
  value: number;
  format?: (v: number) => string;
  inverse?: boolean; // If true, positive is bad (e.g. risk delta), negative is good
  unit?: string;
  className?: string;
}

export const DeltaText: React.FC<DeltaTextProps> = ({
  value,
  format,
  inverse = false,
  unit = '',
  className = '',
}) => {
  const isZero = Math.abs(value) < 0.0001;
  const isPositive = value > 0;

  // By default: positive is good (+savings), negative is bad (-drop).
  // If inverse: positive is bad (+risk), negative is good (-risk reduction).
  let colorClass = 'text-[var(--ink-muted)]';
  if (!isZero) {
    if (inverse) {
      colorClass = isPositive ? 'text-[var(--risk-high)]' : 'text-[var(--risk-low)]';
    } else {
      colorClass = isPositive ? 'text-[var(--risk-low)]' : 'text-[var(--risk-high)]';
    }
  }

  const sign = isPositive ? '+' : '';
  const formatted = format ? format(value) : `${sign}${value.toFixed(2)}`;

  return (
    <span className={`font-mono text-[11px] tabular-nums font-medium ${colorClass} ${className}`}>
      {formatted}
      {unit && <span className="opacity-80 ml-0.5">{unit}</span>}
    </span>
  );
};

export default DeltaText;
