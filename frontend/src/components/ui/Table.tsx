import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  density?: 'compact' | 'default' | 'comfortable';
}

export const Table: React.FC<TableProps> = ({
  density = 'default',
  children,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full overflow-x-auto border border-[var(--border)] rounded-[6px]">
      <table
        className={`w-full border-collapse text-left text-[13px] ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <thead
    className={`bg-[var(--surface-muted)] border-b border-[var(--border)] text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] ${className}`}
    {...props}
  >
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <tbody className={`divide-y divide-[var(--border)] ${className}`} {...props}>
    {children}
  </tbody>
);

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({
  selected = false,
  children,
  className = '',
  ...props
}) => {
  const bgClass = selected
    ? 'bg-[var(--accent-subtle)]'
    : 'hover:bg-[var(--surface-muted)] transition-colors';

  return (
    <tr className={`${bgClass} ${className}`} {...props}>
      {children}
    </tr>
  );
};

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  alignRight?: boolean;
  isMono?: boolean;
  density?: 'compact' | 'default' | 'comfortable';
}

export const TableCell: React.FC<TableCellProps> = ({
  alignRight = false,
  isMono = false,
  density = 'default',
  children,
  className = '',
  ...props
}) => {
  const paddingClass = {
    compact: 'py-1.5 px-3',
    default: 'py-2.5 px-3',
    comfortable: 'py-3.5 px-4',
  }[density];

  const alignClass = alignRight ? 'text-right' : 'text-left';
  const monoClass = isMono ? 'font-mono tabular-nums' : '';

  return (
    <td
      className={`${paddingClass} ${alignClass} ${monoClass} text-[var(--ink)] align-middle ${className}`}
      {...props}
    >
      {children}
    </td>
  );
};

export const TableHeadCell: React.FC<TableCellProps> = ({
  alignRight = false,
  density = 'default',
  children,
  className = '',
  ...props
}) => {
  const paddingClass = {
    compact: 'py-1.5 px-3',
    default: 'py-2 px-3',
    comfortable: 'py-2.5 px-4',
  }[density];

  const alignClass = alignRight ? 'text-right' : 'text-left';

  return (
    <th
      className={`${paddingClass} ${alignClass} font-medium h-8 align-middle text-[var(--ink-muted)] select-none ${className}`}
      {...props}
    >
      {children}
    </th>
  );
};
