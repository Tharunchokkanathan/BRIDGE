import React from 'react';
import { IconCheck } from '@tabler/icons-react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  className = '',
}) => {
  const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <label
      htmlFor={checkboxId}
      className={`inline-flex items-center gap-2 select-none cursor-pointer ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      } ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className={`w-4 h-4 rounded-[2px] border transition-colors flex items-center justify-center ${
            checked
              ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
              : 'bg-[var(--surface)] border-[var(--border-strong)] hover:border-[var(--accent)]'
          } peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--focus-ring)] peer-focus-visible:ring-offset-1`}
        >
          {checked && <IconCheck size={12} strokeWidth={3} />}
        </div>
      </div>
      {label && <span className="text-[13px] text-[var(--ink)]">{label}</span>}
    </label>
  );
};

export default Checkbox;
