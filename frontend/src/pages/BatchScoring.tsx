import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { api } from '../api/client';
import {
  ShipmentRecord,
  ManifestUploadResponse,
} from '../api/types';
import { toast } from 'sonner';
import {
  IconCheck,
  IconDownload,
  IconFileSpreadsheet,
  IconRefresh,
  IconRoute,
  IconShieldCheck,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';

export const BatchScoring: React.FC = () => {
  const [activeShipments, setActiveShipments] = useState<ShipmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Upload configuration
  const [dryRun, setDryRun] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<ManifestUploadResponse | null>(null);

  // Multi-route filter
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'high' | 'med' | 'low'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchActiveManifest = async () => {
    setLoading(true);
    try {
      const res = await api.getShipments();
      setActiveShipments(res.shipments || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch active manifest';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveManifest();
  }, []);

  // Multi-route partitioning analysis
  const routeStats = useMemo(() => {
    const map = new Map<string, { count: number; highRisk: number; approved: number }>();
    activeShipments.forEach((s) => {
      const rid = s.route_id || 'Route_Default';
      const isHigh = s.prediction?.risk_tier === 'HIGH';
      const isApproved = s.prediction?.capacity_approved ?? false;

      if (!map.has(rid)) {
        map.set(rid, { count: 1, highRisk: isHigh ? 1 : 0, approved: isApproved ? 1 : 0 });
      } else {
        const item = map.get(rid)!;
        item.count += 1;
        if (isHigh) item.highRisk += 1;
        if (isApproved) item.approved += 1;
      }
    });

    return Array.from(map.entries()).map(([routeId, stat]) => ({
      routeId,
      ...stat,
      capacityCeiling: Math.floor(stat.count * 0.2),
    }));
  }, [activeShipments]);

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return activeShipments.filter((s) => {
      const matchesRoute =
        selectedRouteId === 'all' || (s.route_id || 'Route_Default') === selectedRouteId;
      const prob = s.prediction?.failure_probability ?? 0;
      const matchesTier =
        tierFilter === 'all'
          ? true
          : tierFilter === 'high'
          ? prob > 0.14
          : tierFilter === 'med'
          ? prob >= 0.11 && prob <= 0.14
          : prob < 0.11;
      return matchesRoute && matchesTier;
    });
  }, [activeShipments, selectedRouteId, tierFilter]);

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv') || file.name.endsWith('.json')) {
        setSelectedFile(file);
      } else {
        toast.error('Only CSV and JSON manifest files are supported.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Upload Manifest
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a CSV or JSON manifest file first.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.uploadManifest(formData, dryRun);
      setUploadResult(res);

      if (dryRun) {
        toast.info(`Dry-run validation complete: ${res.total_packages} packages analyzed.`);
      } else {
        toast.success(
          `Manifest "${res.filename || selectedFile.name}" activated: ${res.total_packages} packages scored.`
        );
        if (res.shipments && res.shipments.length > 0) {
          setActiveShipments(res.shipments);
        } else {
          fetchActiveManifest();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Manifest upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  // Reset to Benchmark Manifest
  const handleResetBenchmark = async () => {
    setLoading(true);
    try {
      const res = await api.resetManifest();
      toast.success(res.message || 'Manifest reset to canonical 30-stop benchmark.');
      setUploadResult(null);
      setSelectedFile(null);
      fetchActiveManifest();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset manifest';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
              Batch Scoring & Dynamic Manifest SaaS Engine
            </h1>
            <Badge type="distance" />
            <Badge type="simulation" />
          </div>
          <p className="text-[13px] text-[var(--ink-muted)] mt-1">
            Pre-flight schema validation, target leakage quarantine, and multi-route capacity partitioning.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <a
            href="/api/manifest/template"
            download="bridge_manifest_template.csv"
            className="inline-flex items-center justify-center font-medium transition-colors rounded-[4px] border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-muted)] cursor-pointer h-8 px-3 text-[13px] leading-[18px] gap-2"
          >
            <IconDownload size={14} />
            CSV Template
          </a>

          <a
            href="/api/manifest/export"
            download="bridge_scored_manifest.csv"
            className="inline-flex items-center justify-center font-medium transition-colors rounded-[4px] border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-muted)] cursor-pointer h-8 px-3 text-[13px] leading-[18px] gap-2"
          >
            <IconFileSpreadsheet size={14} />
            Export Scored CSV
          </a>

          <Button
            variant="secondary"
            size="default"
            onClick={handleResetBenchmark}
            loading={loading}
            icon={<IconRefresh size={14} />}
          >
            Reset Benchmark
          </Button>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 border-2 border-dashed rounded-[6px] text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-[var(--accent)] bg-[var(--accent-subtle)]/50'
              : 'border-[var(--border-strong)] hover:border-[var(--accent)] bg-[var(--surface-sunken)]/40'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.json"
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shadow-xs">
              <IconUpload size={20} />
            </div>

            <div>
              <span className="text-[13px] font-semibold text-[var(--ink)] block">
                {selectedFile
                  ? `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
                  : 'Drop pre-dispatch CSV or JSON manifest here, or click to browse'}
              </span>
              <span className="text-[11px] text-[var(--ink-muted)]">
                Synchronous ceiling: up to 1,000 rows. Decodes utf-8-sig BOM headers automatically.
              </span>
            </div>
          </div>
        </div>

        {/* Upload Controls & Dry-Run Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              <span className="font-mono text-[11px] text-[var(--ink)]">
                Dry-Run Validation Only (do not mutate active dispatch state)
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            {selectedFile && (
              <Button
                variant="secondary"
                size="compact"
                onClick={() => setSelectedFile(null)}
                icon={<IconTrash size={12} />}
              >
                Clear File
              </Button>
            )}
            <Button
              variant="primary"
              size="default"
              onClick={handleUpload}
              loading={uploading}
              disabled={!selectedFile}
              icon={<IconUpload size={14} />}
            >
              {dryRun ? 'Validate Schema & Score (Dry Run)' : 'Upload & Activate Manifest'}
            </Button>
          </div>
        </div>
      </div>

      {/* Pre-Flight Data Quality & Leakage Quarantine Banner */}
      {uploadResult && uploadResult.data_quality_summary && (
        <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-[12px] font-mono">
            <div className="flex items-center gap-2">
              <IconShieldCheck size={16} className="text-[var(--risk-low)]" />
              <span className="font-semibold text-[var(--ink)]">
                Pre-Flight Schema Analysis & Leakage Quarantine
              </span>
            </div>
            <span className="text-[var(--accent)] font-semibold">
              Status: {uploadResult.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
            <div>
              <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Rows Received</span>
              <span className="font-bold text-[var(--ink)]">
                {uploadResult.data_quality_summary.valid_rows} / {uploadResult.data_quality_summary.total_rows_received} valid
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Quarantined Leakage</span>
              <span className="font-bold text-[var(--risk-low)]">
                {uploadResult.data_quality_summary.quarantined_leakage_columns?.length ?? 0} columns stripped
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Missing CRM Imputed</span>
              <span className="font-bold text-[var(--risk-med)]">
                {uploadResult.data_quality_summary.missing_crm_columns_imputed?.length ?? 0} domain priors
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Fleet Approved</span>
              <span className="font-bold text-[var(--ink)]">
                {uploadResult.data_quality_summary.fleet_capacity_approved_count ?? 0} packages
              </span>
            </div>
          </div>

          {/* Explicit Leakage Columns Log */}
          {uploadResult.data_quality_summary.quarantined_leakage_columns &&
            uploadResult.data_quality_summary.quarantined_leakage_columns.length > 0 && (
              <div className="p-2.5 rounded-[4px] bg-[var(--surface-sunken)] border border-[var(--border)] text-[11px] font-mono text-[var(--ink-muted)]">
                <span className="text-[var(--ink)] font-semibold">Zero Data Leakage Governance: </span>
                Stripped target outcome columns:{' '}
                <span className="text-[var(--risk-high)]">
                  {uploadResult.data_quality_summary.quarantined_leakage_columns.join(', ')}
                </span>
                . Evaluation performed exclusively on pre-dispatch operational features.
              </div>
            )}
        </div>
      )}

      {/* Multi-Route Capacity Partitioning Strip */}
      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] space-y-2">
        <div className="flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-2">
            <IconRoute size={14} className="text-[var(--accent)]" />
            <span className="font-semibold text-[var(--ink)]">
              Multi-Route Capacity Partitions
            </span>
            <span className="text-[11px] text-[var(--ink-muted)] font-mono">
              ({routeStats.length} routes detected)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[var(--ink-muted)] uppercase">Filter Route:</span>
            <div className="flex items-center rounded-[4px] border border-[var(--border)] p-0.5 bg-[var(--surface-sunken)] text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setSelectedRouteId('all')}
                className={`px-2 py-0.5 rounded-[2px] cursor-pointer transition-colors ${
                  selectedRouteId === 'all'
                    ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-xs'
                    : 'text-[var(--ink-muted)]'
                }`}
              >
                All ({activeShipments.length})
              </button>
              {routeStats.map((r) => (
                <button
                  key={r.routeId}
                  type="button"
                  onClick={() => setSelectedRouteId(r.routeId)}
                  className={`px-2 py-0.5 rounded-[2px] cursor-pointer transition-colors ${
                    selectedRouteId === r.routeId
                      ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-xs'
                      : 'text-[var(--ink-muted)]'
                  }`}
                >
                  {r.routeId.length > 12 ? `...${r.routeId.slice(-8)}` : r.routeId} ({r.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Route Partition Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
          {routeStats.map((r) => (
            <div
              key={r.routeId}
              className="p-2.5 rounded-[4px] bg-[var(--surface-sunken)] border border-[var(--border)] text-[11px] font-mono flex items-center justify-between"
            >
              <div>
                <span className="font-semibold text-[var(--ink)] block truncate max-w-[140px]">
                  {r.routeId}
                </span>
                <span className="text-[10px] text-[var(--ink-muted)]">
                  {r.count} stops · {r.highRisk} elevated risk
                </span>
              </div>
              <div className="text-right">
                <span className="font-bold text-[var(--accent)] block">
                  Cap: {r.capacityCeiling} stops
                </span>
                <span className="text-[10px] text-[var(--ink-muted)]">
                  20% partitioned
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Scored Manifest Data Table */}
      <Card
        title={`Active Scored Shipments (${filteredShipments.length} Deliveries)`}
        subtitle="Operational risk scoring and capacity status for all deliveries in the active manifest state"
        action={
          <div className="flex items-center gap-1 bg-[var(--surface-sunken)] p-0.5 rounded-[4px] border border-[var(--border)] text-[11px] font-mono">
            {(['all', 'high', 'med', 'low'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTierFilter(t)}
                className={`px-2 py-0.5 rounded-[2px] cursor-pointer capitalize transition-colors ${
                  tierFilter === t
                    ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-xs'
                    : 'text-[var(--ink-muted)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse font-mono">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px] text-[var(--ink-muted)] uppercase">
                <th className="py-2 px-3 font-medium">Package ID</th>
                <th className="py-2 px-3 font-medium">Route / Stop</th>
                <th className="py-2 px-3 font-medium">Coordinates</th>
                <th className="py-2 px-3 font-medium">Calibrated Risk</th>
                <th className="py-2 px-3 font-medium">Capacity Rank</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 px-3 font-medium">Top Risk Driver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center">
                    <Skeleton width="100%" height="120px" />
                  </td>
                </tr>
              ) : filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--ink-muted)]">
                    No shipments match the current route and risk tier filters.
                  </td>
                </tr>
              ) : (
                filteredShipments.map((s) => {
                  const prob = s.prediction?.failure_probability ?? 0;
                  const isApproved = s.prediction?.capacity_approved ?? false;
                  const topDriver = s.prediction?.risk_factors?.[0]?.factor ?? 'Standard Delivery Baseline';

                  return (
                    <tr
                      key={s.package_id}
                      className="hover:bg-[var(--surface-muted)] transition-colors"
                    >
                      <td className="py-2 px-3 font-semibold text-[var(--ink)]">
                        <span className="font-sans text-[12px] block">
                          {s.package_id.length > 20
                            ? `...${s.package_id.slice(-12)}`
                            : s.package_id}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[var(--ink)] block truncate max-w-[130px]">
                          {s.route_id ? s.route_id.slice(-10) : 'Route_01'}
                        </span>
                        <span className="text-[10px] text-[var(--ink-muted)]">
                          Stop: {s.stop_id ?? 'AG'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[11px] text-[var(--ink-muted)]">
                        {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          type={prob > 0.14 ? 'high' : prob >= 0.11 ? 'med' : 'low'}
                          score={prob}
                        />
                      </td>
                      <td className="py-2 px-3 text-[var(--ink-muted)]">
                        #{s.prediction?.capacity_rank ?? '-'}
                      </td>
                      <td className="py-2 px-3">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--risk-low)] bg-[var(--risk-low-bg)] px-2 py-0.5 rounded-[2px] border border-[var(--risk-low)]/30">
                            <IconCheck size={12} />
                            APPROVED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--risk-med)] bg-[var(--risk-med-bg)] px-2 py-0.5 rounded-[2px] border border-[var(--risk-med)]/30">
                            DEFERRED
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-sans text-[12px] text-[var(--ink-muted)] max-w-[200px] truncate">
                        {topDriver}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default BatchScoring;
