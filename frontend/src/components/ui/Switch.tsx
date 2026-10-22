import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  className = '',
}) => {
  const switchId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <label
      htmlFor={switchId}
      className={`inline-flex items-center gap-2.5 select-none cursor-pointer ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      } ${className}`}
    >
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          id={switchId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className={`w-8 h-4 rounded-full transition-colors border ${
            checked
              ? 'bg-[var(--accent)] border-[var(--accent)]'
              : 'bg-[var(--surface-sunken)] border-[var(--border-strong)]'
          } peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--focus-ring)] peer-focus-visible:ring-offset-1`}
        />
        <div
          className={`absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
      {label && <span className="text-[13px] text-[var(--ink)]">{label}</span>}
    </label>
  );
};

export default Switch;
