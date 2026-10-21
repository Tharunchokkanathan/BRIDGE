import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';
import { DashboardStats } from '../api/types';
import {
  IconArrowRight,
  IconRefresh,
  IconAlertTriangle,
  IconRoute,
} from '@tabler/icons-react';

export const CommandCenter: React.FC<{ onNavigate?: (path: string) => void }> = ({
  onNavigate,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch telemetry';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
              Command Center
            </h1>
            <span className="font-mono text-[11px] text-[var(--ink-muted)] bg-[var(--surface-sunken)] px-2 py-0.5 rounded-[2px] border border-[var(--border)]">
              LIVE PRE-DISPATCH
            </span>
          </div>
          <p className="text-[13px] text-[var(--ink-muted)] mt-1">
            Pre-flight shipment risk intelligence, 20% capacity ceiling allocation, and route optimization metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="default"
            onClick={fetchStats}
            icon={<IconRefresh size={14} className={loading ? 'animate-spin' : ''} />}
          >
            Refresh Telemetry
          </Button>
          <Button
            variant="primary"
            size="default"
            onClick={() => onNavigate && onNavigate('/risk-queue')}
            icon={<IconArrowRight size={14} />}
          >
            Open Risk Queue
          </Button>
        </div>
      </div>

      {/* Error state if any */}
      {error && (
        <div className="p-3 bg-[var(--risk-high-bg)] border border-[var(--risk-high)]/30 rounded-[4px] text-[var(--risk-high)] text-[12px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconAlertTriangle size={16} />
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="compact" onClick={fetchStats}>
            Retry
          </Button>
        </div>
      )}

      {/* Lead KPIs: Flat Strip separated by hairlines (Anti-AI Tell: NOT four tinted cards) */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
          {/* KPI 1 */}
          <div className="p-4 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
              Packages Evaluated
            </span>
            <div className="my-2">
              <span className="text-[28px] font-semibold text-[var(--ink)] font-mono tabular-nums">
                {loading ? '—' : stats?.total_packages_evaluated ?? 30}
              </span>
            </div>
            <span className="text-[11px] text-[var(--ink-muted)]">
              Benchmark route manifest
            </span>
          </div>

          {/* KPI 2 */}
          <div className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                High-Risk / Capacity Ceiling
              </span>
              <span className="font-mono text-[10px] text-[var(--accent)] bg-[var(--accent-subtle)] px-1.5 py-0.2 rounded-[2px]">
                20% CAP
              </span>
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-[28px] font-semibold text-[var(--risk-high)] font-mono tabular-nums">
                {loading ? '—' : stats?.high_risk_count ?? 6}
              </span>
              <span className="text-[13px] font-mono text-[var(--ink-muted)]">
                / {stats?.fleet_capacity_limit ?? 6} approved
              </span>
            </div>
            <span className="text-[11px] text-[var(--ink-muted)]">
              {stats?.capacity_exhausted ? 'Ceiling reached (100%)' : 'Within fleet capacity'}
            </span>
          </div>

          {/* KPI 3 */}
          <div className="p-4 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
              Expected Fails (P_fail Sum)
            </span>
            <div className="my-2">
              <span className="text-[28px] font-semibold text-[var(--ink)] font-mono tabular-nums">
                {loading ? '—' : stats?.expected_first_attempt_failures?.toFixed(2) ?? '4.82'}
              </span>
            </div>
            <span className="text-[11px] text-[var(--risk-low)] font-medium">
              Preventable: {stats?.projected_failures_prevented?.toFixed(2) ?? '2.14'} pkgs
            </span>
          </div>

          {/* KPI 4 */}
          <div className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                Route Distance Savings
              </span>
              <Badge type="distance" />
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-[28px] font-semibold text-[var(--ink)] font-mono tabular-nums">
                {loading ? '—' : `-${stats?.potential_savings_pct?.toFixed(1) ?? '69.9'}%`}
              </span>
              <span className="text-[13px] font-mono text-[var(--ink-muted)]">
                ({stats?.potential_distance_savings_km?.toFixed(1) ?? '19.3'} km)
              </span>
            </div>
            <span className="text-[11px] text-[var(--ink-muted)]">
              2-Opt heuristic optimization
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Needs Action Table + Quick Route Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card
            title="High-Priority Action Required"
            subtitle="Shipments requiring proactive customer intervention prior to morning dispatch"
            action={
              <Button
                variant="ghost"
                size="compact"
                onClick={() => onNavigate && onNavigate('/risk-queue')}
                icon={<IconArrowRight size={13} />}
              >
                View all
              </Button>
            }
          >
            <div className="space-y-3">
              {[
                {
                  id: 'PKG-3b28f781',
                  addr: '1450 Market St, San Francisco, CA',
                  prob: 0.245,
                  tier: 'high' as const,
                  reason: 'Signature Required handoff (+0.32 SHAP)',
                },
                {
                  id: 'PKG-7a91c204',
                  addr: '525 4th St, San Francisco, CA',
                  prob: 0.185,
                  tier: 'high' as const,
                  reason: 'Customer availability low (0.34) in 16:00 window',
                },
                {
                  id: 'PKG-189f30bb',
                  addr: '88 Colin P Kelly Jr St, San Francisco, CA',
                  prob: 0.142,
                  tier: 'med' as const,
                  reason: 'Historical zone failure rate elevated (0.198)',
                },
              ].map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-3 border border-[var(--border)] rounded-[4px] bg-[var(--surface-muted)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-medium text-[var(--ink)]">
                        {pkg.id}
                      </span>
                      <Badge type={pkg.tier} score={pkg.prob} />
                    </div>
                    <div className="text-[12px] text-[var(--ink-muted)]">
                      {pkg.addr}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--ink-faint)]">
                      Driver: {pkg.reason}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="primary" size="compact">
                      Apply Action
                    </Button>
                    <Button variant="secondary" size="compact">
                      Defer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card
            title="Capacity Allocation Meter"
            subtitle="Strict 20% fleet intervention ceiling"
          >
            <div className="space-y-3">
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="text-[var(--ink-muted)]">Intervention Quota</span>
                <span className="font-mono font-medium text-[var(--ink)]">6 / 6 Allocated (100%)</span>
              </div>
              <div className="w-full h-2 rounded-[2px] bg-[var(--surface-sunken)] border border-[var(--border)] overflow-hidden">
                <div className="h-full bg-[var(--accent)] w-full" />
              </div>
              <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                Intervention capacity prevents driver overload. Additional parcels requiring attention must be deferred to next route.
              </p>
            </div>
          </Card>

          <Card
            title="Route Circuity Summary"
            subtitle="Pre-dispatch 2-Opt TSP evaluation"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--ink-muted)]">Manifest Distance:</span>
                <span className="font-mono text-[var(--ink)]">27.55 km</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--ink-muted)]">Optimized Tour:</span>
                <span className="font-mono text-[var(--risk-low)] font-medium">8.29 km</span>
              </div>
              <div className="pt-2 border-t border-[var(--border)] flex justify-end">
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={() => onNavigate && onNavigate('/route-optimizer')}
                  icon={<IconRoute size={14} />}
                >
                  Inspect Map & Stops
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;

