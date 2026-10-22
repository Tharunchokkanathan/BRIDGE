import React, { useState, useRef, useEffect } from 'react';
import { IconChevronDown, IconCheck, IconSearch } from '@tabler/icons-react';

export interface ComboboxOption {
  value: string;
  label: string;
  detail?: string;
}

export interface ComboboxProps {
  label?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const Combobox: React.FC<ComboboxProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      (o.detail && o.detail.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`flex flex-col gap-1 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[12px] font-medium text-[var(--ink-muted)] select-none">
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="h-8 px-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-[13px] flex items-center justify-between gap-2 hover:border-[var(--border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] disabled:bg-[var(--surface-sunken)] disabled:text-[var(--ink-faint)] disabled:cursor-not-allowed cursor-pointer"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <IconChevronDown size={14} className="text-[var(--ink-muted)] shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-[4px] shadow-[var(--shadow-menu)] overflow-hidden">
          <div className="p-1.5 border-b border-[var(--border)] flex items-center gap-1.5 bg-[var(--surface-sunken)]">
            <IconSearch size={13} className="text-[var(--ink-muted)] shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter options..."
              className="w-full bg-transparent text-[12px] text-[var(--ink)] focus:outline-none placeholder:text-[var(--ink-faint)]"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="py-3 text-center text-[12px] text-[var(--ink-muted)] font-mono">
                No matching options
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-[2px] text-[12px] text-left cursor-pointer transition-colors ${
                    opt.value === value
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                      : 'text-[var(--ink)] hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  <div className="truncate">
                    <div>{opt.label}</div>
                    {opt.detail && (
                      <div className="text-[11px] font-mono text-[var(--ink-muted)] truncate">
                        {opt.detail}
                      </div>
                    )}
                  </div>
                  {opt.value === value && (
                    <IconCheck size={14} className="text-[var(--accent)] shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Combobox;
