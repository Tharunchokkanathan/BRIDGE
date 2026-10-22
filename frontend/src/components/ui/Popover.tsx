import React, { useState, useRef, useEffect } from 'react';

export interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  content,
  align = 'left',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          className={`absolute top-full z-50 mt-1 min-w-[200px] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] shadow-[var(--shadow-menu)] p-3 text-[13px] text-[var(--ink)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Popover;
