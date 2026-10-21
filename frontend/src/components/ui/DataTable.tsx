import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { IconArrowsSort, IconSortAscending, IconSortDescending, IconSearch } from '@tabler/icons-react';

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  density?: 'compact' | 'default' | 'comfortable';
  onRowClick?: (row: TData) => void;
  selectedRowId?: string;
  idAccessor?: (row: TData) => string;
  enableSearch?: boolean;
  searchPlaceholder?: string;
}

export function DataTable<TData>({
  data,
  columns,
  density = 'default',
  onRowClick,
  selectedRowId,
  idAccessor,
  enableSearch = true,
  searchPlaceholder = 'Search table...',
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rowPaddingClass = {
    compact: 'py-1.5 px-3',
    default: 'py-2 px-3',
    comfortable: 'py-3 px-3.5',
  }[density];

  return (
    <div className="space-y-3">
      {enableSearch && (
        <div className="flex items-center gap-2 max-w-[280px]">
          <div className="relative w-full">
            <IconSearch size={14} className="absolute left-2.5 top-2.5 text-[var(--ink-faint)]" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-8 pl-8 pr-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--surface-sunken)] text-[12px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] font-sans"
            />
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto border border-[var(--border)] rounded-[6px] bg-[var(--surface)]">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-[var(--surface-muted)] border-b border-[var(--border)] sticky top-0 z-10 select-none">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={`h-8 px-3 text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] font-medium align-middle ${
                        canSort ? 'cursor-pointer hover:text-[var(--ink)]' : ''
                      }`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1.5">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {canSort && (
                          <span className="text-[var(--ink-faint)]">
                            {isSorted === 'asc' ? (
                              <IconSortAscending size={13} className="text-[var(--accent)]" />
                            ) : isSorted === 'desc' ? (
                              <IconSortDescending size={13} className="text-[var(--accent)]" />
                            ) : (
                              <IconArrowsSort size={13} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-[var(--border)] font-sans">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 text-center text-[12px] text-[var(--ink-muted)] font-mono"
                >
                  No matching records found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const rowId = idAccessor ? idAccessor(row.original) : row.id;
                const isSelected = selectedRowId === rowId;

                return (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick && onRowClick(row.original)}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-subtle)]'
                        : 'hover:bg-[var(--surface-muted)]'
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`${rowPaddingClass} align-middle text-[var(--ink)]`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
