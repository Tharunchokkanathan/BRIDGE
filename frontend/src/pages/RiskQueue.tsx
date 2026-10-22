import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { Popover } from '../components/ui/Popover';
import { PackageDrawer } from '../components/risk/PackageDrawer';
import { api } from '../api/client';
import { ShipmentRecord } from '../api/types';
import { toast } from 'sonner';
import {
  IconSearch,
  IconDownload,
  IconColumns,
  IconSortAscending,
  IconSortDescending,
  IconCheck,
  IconPlayerPause,
  IconExternalLink,
  IconX,
  IconRefresh,
} from '@tabler/icons-react';

type RiskBandFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';
type StatusFilter = 'ALL' | 'PENDING' | 'INTERVENED' | 'DEFERRED';
type Density = 'compact' | 'default' | 'comfortable';

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export const RiskQueue: React.FC = () => {
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected package for slide-over drawer
  const [drawerShipment, setDrawerShipment] = useState<ShipmentRecord | null>(null);

  // Multi-select state (keyed by package_id so selection survives sorting)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Local intervention action tracking
  const [actionedMap, setActionedMap] = useState<Record<string, 'applied' | 'deferred'>>({});

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [bandFilter, setBandFilter] = useState<RiskBandFilter>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [addressFilter, setAddressFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [density, setDensity] = useState<Density>('default');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'failure_probability',
    direction: 'desc',
  });

  // Active keyboard focused row index
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    stop: true,
    packageId: true,
    zone: true,
    addressType: true,
    window: true,
    prob: true,
    band: true,
    drivers: true,
    action: true,
    status: true,
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getShipments();
      setShipments(res.shipments || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve shipments';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  // Global Keyboard shortcuts: '/' to focus search, Esc to close/clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // '/' to focus search (if not already focused in an input)
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Esc to close drawer or clear selection
      if (e.key === 'Escape') {
        if (drawerShipment) {
          setDrawerShipment(null);
        } else if (selectedIds.size > 0) {
          setSelectedIds(new Set());
        }
        return;
      }

      // Arrow navigation across rows
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.min(prev + 1, processedRows.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && focusedRowIndex >= 0 && focusedRowIndex < processedRows.length) {
        e.preventDefault();
        setDrawerShipment(processedRows[focusedRowIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Extract unique zones & address types for filter dropdowns
  const detectedZones = useMemo(() => {
    const set = new Set<string>();
    shipments.forEach((s) => {
      if (s.zone_id) set.add(String(s.zone_id));
    });
    return Array.from(set).sort();
  }, [shipments]);

  const detectedAddressTypes = useMemo(() => {
    const set = new Set<string>();
    shipments.forEach((s) => {
      if (s.location_type) set.add(String(s.location_type));
    });
    return Array.from(set).sort();
  }, [shipments]);

  // Process rows: Filter -> Sort
  const processedRows = useMemo(() => {
    let result = [...shipments];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => {
        return (
          s.package_id?.toLowerCase().includes(q) ||
          s.stop_id?.toLowerCase().includes(q) ||
          String(s.zone_id || '').toLowerCase().includes(q) ||
          String(s.location_type || '').toLowerCase().includes(q) ||
          s.prediction?.risk_factors?.[0]?.factor.toLowerCase().includes(q)
        );
      });
    }

    // Risk Band filter
    if (bandFilter !== 'ALL') {
      result = result.filter((s) => {
        const tier = s.prediction?.risk_tier?.toUpperCase();
        return tier === bandFilter;
      });
    }

    // Zone filter
    if (zoneFilter !== 'ALL') {
      result = result.filter((s) => String(s.zone_id) === zoneFilter);
    }

    // Address Type filter
    if (addressFilter !== 'ALL') {
      result = result.filter((s) => String(s.location_type) === addressFilter);
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((s) => {
        const status = actionedMap[s.package_id] || 'pending';
        return status.toUpperCase() === statusFilter;
      });
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = 0;
      let bVal: any = 0;

      if (sortConfig.key === 'failure_probability') {
        aVal = a.prediction?.failure_probability ?? 0;
        bVal = b.prediction?.failure_probability ?? 0;
      } else if (sortConfig.key === 'stop_id') {
        aVal = a.stop_id ?? '';
        bVal = b.stop_id ?? '';
      } else if (sortConfig.key === 'package_id') {
        aVal = a.package_id ?? '';
        bVal = b.package_id ?? '';
      } else if (sortConfig.key === 'zone_id') {
        aVal = a.zone_id ?? '';
        bVal = b.zone_id ?? '';
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [shipments, searchQuery, bandFilter, zoneFilter, addressFilter, statusFilter, sortConfig, actionedMap]);

  // Sorting handler
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === processedRows.length && processedRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedRows.map((r) => r.package_id)));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk Actions
  const handleBulkApply = () => {
    const ids = Array.from(selectedIds);
    const updated = { ...actionedMap };
    ids.forEach((id) => {
      updated[id] = 'applied';
    });
    setActionedMap(updated);
    toast.success(`Applied proactive intervention to ${ids.length} selected parcel(s)`);
    setSelectedIds(new Set());
  };

  const handleBulkDefer = () => {
    const ids = Array.from(selectedIds);
    const updated = { ...actionedMap };
    ids.forEach((id) => {
      updated[id] = 'deferred';
    });
    setActionedMap(updated);
    toast.info(`Deferred ${ids.length} selected parcel(s) to standard delivery`);
    setSelectedIds(new Set());
  };

  // CSV Export
  const handleExportCSV = (rowsToExport: ShipmentRecord[] = processedRows) => {
    if (!rowsToExport.length) return;
    const headers = [
      'Stop_ID',
      'Package_ID',
      'Zone_ID',
      'Location_Type',
      'Latitude',
      'Longitude',
      'Departure_Hour',
      'Failure_Probability',
      'Risk_Tier',
      'Capacity_Status',
      'Top_Driver',
      'Driver_Attribution_LogOdds',
      'Status',
    ];

    const lines = rowsToExport.map((s) => {
      const p = s.prediction;
      const topFactor = p?.risk_factors?.[0];
      const status = actionedMap[s.package_id] || 'PENDING';
      return [
        `"${s.stop_id ?? ''}"`,
        `"${s.package_id}"`,
        `"${s.zone_id ?? ''}"`,
        `"${s.location_type ?? ''}"`,
        s.latitude,
        s.longitude,
        s.departure_hour ?? '',
        p?.failure_probability ?? '',
        `"${p?.risk_tier ?? ''}"`,
        `"${p?.capacity_status ?? ''}"`,
        `"${topFactor?.factor ?? ''}"`,
        topFactor?.attribution_score ?? '',
        `"${status}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bridge_risk_queue_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rowsToExport.length} parcels to CSV`);
  };

  // Drawer handlers
  const handleApplyDrawerAction = (pkgId: string, _interventionId: string) => {
    setActionedMap((prev) => ({ ...prev, [pkgId]: 'applied' }));
    toast.success(`Intervention confirmed for package ${pkgId.slice(0, 16)}`);
    setDrawerShipment(null);
  };

  const handleDeferDrawerAction = (pkgId: string) => {
    setActionedMap((prev) => ({ ...prev, [pkgId]: 'deferred' }));
    toast.info(`Package ${pkgId.slice(0, 16)} deferred to standard route`);
    setDrawerShipment(null);
  };

  // Density styles
  const densityRowClass = {
    compact: 'h-8 text-[11px]',
    default: 'h-10 text-[12px]',
    comfortable: 'h-12 text-[13px]',
  }[density];

  if (error && shipments.length === 0) {
    return (
      <div className="py-12">
        <ErrorState
          title="Failed to Load Risk Queue"
          error={error}
          onRetry={fetchShipments}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
              Risk Queue
            </h1>
            <span className="font-mono text-[11px] text-[var(--ink-muted)] bg-[var(--surface-sunken)] px-2 py-0.5 rounded-[2px] border border-[var(--border)]">
              ACTIVE MANIFEST: {shipments.length} STOPS
            </span>
          </div>
          <p className="text-[13px] text-[var(--ink-muted)] mt-1">
            Sort, filter, and inspect calibrated shipment risk probabilities, SHAP drivers, and actionable interventions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="default"
            onClick={fetchShipments}
            icon={<IconRefresh size={14} className={loading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="default"
            onClick={() => handleExportCSV()}
            icon={<IconDownload size={14} />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input with '/' hotkey hint */}
          <div className="relative flex-1 max-w-[360px]">
            <IconSearch size={14} className="absolute left-2.5 top-2.5 text-[var(--ink-faint)]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search package ID, stop, zone, or driver..."
              aria-label="Search manifest packages, stops, zones, or drivers"
              className="w-full h-8 pl-8 pr-8 rounded-[4px] border border-[var(--border)] bg-[var(--surface-sunken)] text-[12px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
            <span className="absolute right-2.5 top-2 text-[10px] font-mono text-[var(--ink-faint)] bg-[var(--surface)] px-1 rounded-[2px] border border-[var(--border)] pointer-events-none">
              /
            </span>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Risk Band Select */}
            <select
              value={bandFilter}
              onChange={(e) => setBandFilter(e.target.value as RiskBandFilter)}
              aria-label="Filter by Risk Band"
              className="h-8 px-2 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="ALL">All Risk Bands</option>
              <option value="HIGH">▲ High Risk (&gt;0.14)</option>
              <option value="MEDIUM">◆ Medium (0.11-0.14)</option>
              <option value="LOW">■ Low Risk (≤0.11)</option>
            </select>

            {/* Zone Filter */}
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              aria-label="Filter by Postal Zone"
              className="h-8 px-2 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="ALL">All Zones</option>
              {detectedZones.map((z) => (
                <option key={z} value={z}>
                  Zone {z}
                </option>
              ))}
            </select>

            {/* Address Type Filter */}
            <select
              value={addressFilter}
              onChange={(e) => setAddressFilter(e.target.value)}
              aria-label="Filter by Address Type"
              className="h-8 px-2 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="ALL">All Address Types</option>
              {detectedAddressTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filter by Dispatch Status"
              className="h-8 px-2 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="INTERVENED">Intervened</option>
              <option value="DEFERRED">Deferred</option>
            </select>

            {/* Density Selector */}
            <div className="flex items-center rounded-[4px] border border-[var(--border)] p-0.5 bg-[var(--surface-sunken)]">
              {(['compact', 'default', 'comfortable'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDensity(d)}
                  className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono uppercase cursor-pointer ${
                    density === d
                      ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {d[0]}
                </button>
              ))}
            </div>

            {/* Column Chooser Popover */}
            <Popover
              trigger={
                <Button variant="secondary" size="compact" icon={<IconColumns size={13} />}>
                  Cols
                </Button>
              }
              content={
                <div className="space-y-1.5 text-[11px] min-w-[160px]">
                  <div className="font-semibold text-[var(--ink)] mb-1 pb-1 border-b border-[var(--border)]">
                    Toggle Columns
                  </div>
                  {Object.entries(visibleColumns).map(([key, val]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={() =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [key]: !prev[key as keyof typeof prev],
                          }))
                        }
                        className="accent-[var(--accent)]"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              }
            />
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when rows selected) */}
      {selectedIds.size > 0 && (
        <div className="p-2.5 px-4 bg-[var(--accent-subtle)] border border-[var(--accent)]/40 rounded-[6px] flex flex-wrap items-center justify-between gap-3 animate-fade-in text-[12px]">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-[var(--accent)]">
              {selectedIds.size} parcel{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <span className="text-[var(--ink-muted)] text-[11px]">
              (Esc to clear)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="compact"
              onClick={handleBulkApply}
              icon={<IconCheck size={12} />}
            >
              Apply Recommended
            </Button>
            <Button
              variant="secondary"
              size="compact"
              onClick={handleBulkDefer}
              icon={<IconPlayerPause size={12} />}
            >
              Defer Selected
            </Button>
            <Button
              variant="secondary"
              size="compact"
              onClick={() => {
                const selectedRows = shipments.filter((s) => selectedIds.has(s.package_id));
                handleExportCSV(selectedRows);
              }}
              icon={<IconDownload size={12} />}
            >
              Export Selected
            </Button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
              title="Clear selection"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Working Table */}
      <div className="border border-[var(--border)] rounded-[6px] bg-[var(--surface)] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)] sticky top-0 z-10">
              <tr>
                {/* Select All Checkbox */}
                <th className="py-2.5 px-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === processedRows.length && processedRows.length > 0}
                    onChange={toggleSelectAll}
                    className="accent-[var(--accent)] cursor-pointer"
                    aria-label="Select all rows"
                  />
                </th>

                {visibleColumns.stop && (
                  <th
                    className="py-2.5 px-3 text-left font-medium cursor-pointer hover:text-[var(--ink)]"
                    onClick={() => handleSort('stop_id')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Stop</span>
                      {sortConfig.key === 'stop_id' && (
                        sortConfig.direction === 'asc' ? <IconSortAscending size={12} /> : <IconSortDescending size={12} />
                      )}
                    </div>
                  </th>
                )}

                {visibleColumns.packageId && (
                  <th
                    className="py-2.5 px-3 text-left font-medium cursor-pointer hover:text-[var(--ink)]"
                    onClick={() => handleSort('package_id')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Package ID</span>
                      {sortConfig.key === 'package_id' && (
                        sortConfig.direction === 'asc' ? <IconSortAscending size={12} /> : <IconSortDescending size={12} />
                      )}
                    </div>
                  </th>
                )}

                {visibleColumns.zone && (
                  <th
                    className="py-2.5 px-3 text-left font-medium cursor-pointer hover:text-[var(--ink)]"
                    onClick={() => handleSort('zone_id')}
                  >
                    <span>Zone</span>
                  </th>
                )}

                {visibleColumns.addressType && (
                  <th className="py-2.5 px-3 text-left font-medium">Type</th>
                )}

                {visibleColumns.window && (
                  <th className="py-2.5 px-3 text-left font-medium">Window</th>
                )}

                {visibleColumns.prob && (
                  <th
                    className="py-2.5 px-3 text-right font-medium cursor-pointer hover:text-[var(--ink)]"
                    onClick={() => handleSort('failure_probability')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>P(fail)</span>
                      {sortConfig.key === 'failure_probability' && (
                        sortConfig.direction === 'asc' ? <IconSortAscending size={12} /> : <IconSortDescending size={12} />
                      )}
                    </div>
                  </th>
                )}

                {visibleColumns.band && (
                  <th className="py-2.5 px-3 text-left font-medium">Band</th>
                )}

                {visibleColumns.drivers && (
                  <th className="py-2.5 px-3 text-left font-medium">Top 3 SHAP Drivers</th>
                )}

                {visibleColumns.action && (
                  <th className="py-2.5 px-3 text-left font-medium">Recommended Action</th>
                )}

                {visibleColumns.status && (
                  <th className="py-2.5 px-3 text-center font-medium">Status</th>
                )}

                <th className="py-2.5 px-3 text-right font-medium w-16">Open</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="h-10">
                    <td colSpan={12} className="px-3">
                      <Skeleton width="100%" height={24} />
                    </td>
                  </tr>
                ))
              ) : processedRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-[var(--ink-muted)] text-[13px]">
                    No packages match the active search and filter criteria.
                  </td>
                </tr>
              ) : (
                processedRows.map((row, idx) => {
                  const pFail = row.prediction?.failure_probability ?? 0;
                  const tier = (row.prediction?.risk_tier?.toLowerCase() as 'high' | 'med' | 'low') || (pFail > 0.14 ? 'high' : 'med');
                  const topDrivers = (row.prediction?.risk_factors ?? []).slice(0, 3);
                  const isSelected = selectedIds.has(row.package_id);
                  const actionStatus = actionedMap[row.package_id] || 'pending';
                  const isFocused = focusedRowIndex === idx;

                  return (
                    <tr
                      key={row.package_id}
                      onClick={() => setDrawerShipment(row)}
                      className={`cursor-pointer transition-colors ${densityRowClass} ${
                        isSelected
                          ? 'bg-[var(--accent-subtle)]/40 hover:bg-[var(--accent-subtle)]/60'
                          : isFocused
                          ? 'bg-[var(--surface-sunken)]'
                          : 'hover:bg-[var(--surface-muted)]/60'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2 px-3" onClick={(e) => toggleSelectOne(row.package_id, e)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by td onClick
                          aria-label={`Select parcel ${row.package_id}`}
                          className="accent-[var(--accent)] cursor-pointer"
                        />
                      </td>

                      {/* Stop ID */}
                      {visibleColumns.stop && (
                        <td className="py-2 px-3 font-mono font-medium text-[var(--ink)]">
                          {row.stop_id ?? '—'}
                        </td>
                      )}

                      {/* Package ID */}
                      {visibleColumns.packageId && (
                        <td className="py-2 px-3 font-mono text-[var(--ink)] truncate max-w-[140px]" title={row.package_id}>
                          {row.package_id.replace('PackageID_', '')}
                        </td>
                      )}

                      {/* Zone */}
                      {visibleColumns.zone && (
                        <td className="py-2 px-3 text-[var(--ink-muted)] font-mono text-[11px]">
                          {String(row.zone_id ?? 'P-13.2C')}
                        </td>
                      )}

                      {/* Address Type */}
                      {visibleColumns.addressType && (
                        <td className="py-2 px-3 text-[var(--ink)]">
                          {String(row.location_type ?? 'Apartment')}
                        </td>
                      )}

                      {/* Time Window */}
                      {visibleColumns.window && (
                        <td className="py-2 px-3 font-mono text-[11px] text-[var(--ink-muted)]">
                          {row.departure_hour ? `${row.departure_hour}:00` : '—'}
                        </td>
                      )}

                      {/* P(fail) with inline horizontal meter */}
                      {visibleColumns.prob && (
                        <td className="py-2 px-3 text-right font-mono">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="font-semibold text-[var(--ink)] tabular-nums">
                              {(pFail * 100).toFixed(1)}%
                            </span>
                            <div className="w-12 h-1.5 bg-[var(--surface-sunken)] rounded-[1px] overflow-hidden hidden sm:block">
                              <div
                                className={`h-full ${
                                  tier === 'high'
                                    ? 'bg-[var(--risk-high)]'
                                    : tier === 'med'
                                    ? 'bg-[var(--risk-med)]'
                                    : 'bg-[var(--risk-low)]'
                                }`}
                                style={{ width: `${Math.min(100, (pFail / 0.3) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Risk Band Badge */}
                      {visibleColumns.band && (
                        <td className="py-2 px-3">
                          <Badge type={tier} score={pFail} />
                        </td>
                      )}

                      {/* Top 3 SHAP Drivers with Diverging Mini-Bars */}
                      {visibleColumns.drivers && (
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1 max-w-[200px]" title={topDrivers.map((d) => `${d.factor} (+${(d.attribution_score ?? 0).toFixed(2)})`).join(', ')}>
                            {topDrivers.map((d, dIdx) => {
                              const score = d.attribution_score ?? 0;
                              const isPositive = score >= 0;
                              return (
                                <span
                                  key={dIdx}
                                  className={`inline-block px-1 py-0.2 rounded-[1px] text-[10px] font-mono truncate max-w-[65px] ${
                                    isPositive
                                      ? 'bg-[var(--risk-high-bg)] text-[var(--risk-high)] border border-[var(--risk-high)]/20'
                                      : 'bg-[var(--risk-low-bg)] text-[var(--risk-low)] border border-[var(--risk-low)]/20'
                                  }`}
                                >
                                  {d.factor.split(' ')[0]}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      )}

                      {/* Recommended Action */}
                      {visibleColumns.action && (
                        <td className="py-2 px-3 text-[var(--ink-muted)] text-[11px] truncate max-w-[180px]">
                          {pFail > 0.14 ? 'Locker / SMS Verification' : 'Standard Delivery'}
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-2 px-3 text-center">
                          {actionStatus === 'applied' ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--risk-low)] bg-[var(--risk-low-bg)] px-1.5 py-0.5 rounded-[2px] border border-[var(--risk-low)]/20">
                              <IconCheck size={10} /> INTERVENED
                            </span>
                          ) : actionStatus === 'deferred' ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--ink-muted)] bg-[var(--surface-sunken)] px-1.5 py-0.5 rounded-[2px] border border-[var(--border)]">
                              <IconPlayerPause size={10} /> DEFERRED
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                              PENDING
                            </span>
                          )}
                        </td>
                      )}

                      {/* Open Action */}
                      <td className="py-2 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="compact"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerShipment(row);
                          }}
                          icon={<IconExternalLink size={12} />}
                          title="Inspect SHAP Waterfall & Details"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-[var(--surface-muted)] border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[var(--ink-muted)]">
          <div className="flex items-center gap-4">
            <span>
              Showing {processedRows.length} of {shipments.length} parcels
            </span>
            <span className="hidden sm:inline">
              High: {shipments.filter((s) => (s.prediction?.failure_probability ?? 0) > 0.14).length} · Med:{' '}
              {shipments.filter((s) => {
                const p = s.prediction?.failure_probability ?? 0;
                return p > 0.11 && p <= 0.14;
              }).length}{' '}
              · Low: {shipments.filter((s) => (s.prediction?.failure_probability ?? 0) <= 0.11).length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px]">Shortcuts: [/] Search · [↑/↓] Navigate · [Enter] Inspect · [Esc] Dismiss</span>
          </div>
        </div>
      </div>

      {/* Package Detail Slide-Over Drawer */}
      <PackageDrawer
        open={Boolean(drawerShipment)}
        onClose={() => setDrawerShipment(null)}
        shipment={drawerShipment}
        onApplyAction={handleApplyDrawerAction}
        onDefer={handleDeferDrawerAction}
        isActioned={drawerShipment ? actionedMap[drawerShipment.package_id] : undefined}
      />
    </div>
  );
};

export default RiskQueue;
