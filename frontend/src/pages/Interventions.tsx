import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { api } from '../api/client';
import {
  ShipmentRecord,
  DashboardStats,
  InterventionOption,
  MessagePreviewResponse,
} from '../api/types';
import { toast } from 'sonner';
import {
  IconCheck,
  IconClock,
  IconDeviceMobile,
  IconLock,
  IconMapPin,
  IconPlayerPlay,
  IconRefresh,
  IconUserCheck,
  IconUsers,
} from '@tabler/icons-react';

type ChannelType = 'SMS' | 'WHATSAPP' | 'EMAIL';

interface CatalogItem {
  id: string;
  title: string;
  description: string;
  costTier: 'Low' | 'Medium' | 'High';
  effort: 'Automated' | 'Dispatcher' | 'Driver';
  expectedReductionPts: number;
  simulatedAvailability: number;
  isHeuristic?: boolean;
}

const INTERVENTION_CATALOG: CatalogItem[] = [
  {
    id: 'access_point_locker',
    title: 'Reroute to Secure 24/7 Access Locker Hub',
    description: 'Directs courier to a local PUDO partner or locker bank, eliminating residential access friction and signature requirements.',
    costTier: 'Low',
    effort: 'Automated',
    expectedReductionPts: 13.3,
    simulatedAvailability: 0.96,
  },
  {
    id: 'reschedule_day',
    title: 'Reschedule Delivery Window (Morning Slot)',
    description: 'Proactively offers customer a morning delivery window when residential occupancy rates are empirically higher.',
    costTier: 'Low',
    effort: 'Automated',
    expectedReductionPts: 8.5,
    simulatedAvailability: 0.88,
  },
  {
    id: 'hold_pickup',
    title: 'Hold for Station Customer Pickup',
    description: 'Stages package at delivery station customer collection desk. 100% first-attempt failure prevention via direct counter handoff.',
    costTier: 'Medium',
    effort: 'Dispatcher',
    expectedReductionPts: 20.0,
    simulatedAvailability: 1.0,
    isHeuristic: true,
  },
  {
    id: 'deliver_neighbor',
    title: 'Authorize Neighbor / Front-Desk Dropoff',
    description: 'Collects pre-authorization for building management, concierge, or immediate neighbor release with digital receipt.',
    costTier: 'Low',
    effort: 'Automated',
    expectedReductionPts: 7.2,
    simulatedAvailability: 0.85,
  },
  {
    id: 'confirm_availability',
    title: 'Proactive Customer Availability Check',
    description: 'Sends automated verification prompt requesting 1-click confirmation of presence during courier arrival window.',
    costTier: 'Low',
    effort: 'Automated',
    expectedReductionPts: 5.4,
    simulatedAvailability: 0.82,
  },
];

export const Interventions: React.FC = () => {
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'approved' | 'deferred'>('all');

  // Interactive Simulation Modal State
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [activePackage, setActivePackage] = useState<ShipmentRecord | null>(null);
  const [simOptions, setSimOptions] = useState<InterventionOption[]>([]);
  const [simLoading, setSimLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Message Preview Modal State
  const [messageOpen, setMessageOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('SMS');
  const [recipientName, setRecipientName] = useState('Alex Mercer');
  const [etaWindow, setEtaWindow] = useState('14:00 - 16:00');
  const [messagePreview, setMessagePreview] = useState<MessagePreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeInterventionId, setActiveInterventionId] = useState('access_point_locker');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [shipRes, statsRes] = await Promise.all([
        api.getShipments(),
        api.getDashboardStats(),
      ]);
      setShipments(shipRes.shipments || []);
      setStats(statsRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load intervention data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute capacity statistics
  const totalEvaluated = shipments.length;
  const capacityLimitPct = stats?.operational_thresholds?.max_fleet_capacity
    ? stats.operational_thresholds.max_fleet_capacity * 100
    : 20;
  const approvedBudgetCount = Math.floor(totalEvaluated * (capacityLimitPct / 100));

  const approvedList = useMemo(() => {
    return shipments.filter((s) => s.prediction?.capacity_status === 'APPROVED');
  }, [shipments]);

  const deferredList = useMemo(() => {
    return shipments.filter(
      (s) =>
        s.prediction?.capacity_status === 'DEFERRED_DUE_TO_FLEET_CAPACITY' ||
        ((s.prediction?.failure_probability ?? 0) >= 0.11 && !s.prediction?.capacity_approved)
    );
  }, [shipments]);

  const appliedInterventionsList = useMemo(() => {
    return shipments.filter((s) => Boolean(s.applied_intervention));
  }, [shipments]);

  const filteredShipments = useMemo(() => {
    if (ledgerFilter === 'approved') return approvedList;
    if (ledgerFilter === 'deferred') return deferredList;
    return shipments.filter(
      (s) =>
        (s.prediction?.failure_probability ?? 0) >= 0.11 ||
        s.prediction?.risk_tier === 'HIGH' ||
        s.prediction?.risk_tier === 'MEDIUM'
    );
  }, [shipments, ledgerFilter, approvedList, deferredList]);

  // Open Simulation Modal
  const handleOpenSimulate = async (pkg: ShipmentRecord) => {
    setActivePackage(pkg);
    setSimulateOpen(true);
    setSimLoading(true);
    try {
      const res = await api.simulateInterventions(pkg);
      setSimOptions(res.intervention_options || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Simulation failed';
      toast.error(msg);
    } finally {
      setSimLoading(false);
    }
  };

  // Apply Intervention
  const handleApplyIntervention = async (pkgId: string, interventionId: string) => {
    setApplyingId(interventionId);
    try {
      const res = await api.applyIntervention(pkgId, interventionId);
      toast.success(res.message || 'Intervention successfully applied');
      setSimulateOpen(false);
      fetchData(); // Refresh manifest data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply intervention';
      toast.error(msg);
    } finally {
      setApplyingId(null);
    }
  };

  // Open Messaging Preview Modal
  const handleOpenMessagePreview = async (pkg: ShipmentRecord, interventionId: string = 'access_point_locker') => {
    setActivePackage(pkg);
    setActiveInterventionId(interventionId);
    setMessageOpen(true);
    fetchMessagePreview(pkg.package_id, interventionId, selectedChannel, recipientName, etaWindow);
  };

  const fetchMessagePreview = async (
    pkgId: string,
    interventionId: string,
    channel: ChannelType,
    name: string,
    eta: string
  ) => {
    setPreviewLoading(true);
    try {
      const backendInterventionId = interventionId === 'access_point_locker' ? 'access_point' : interventionId;
      const res = await api.previewMessaging({
        package_id: pkgId,
        intervention_id: backendInterventionId,
        channel,
        recipient_name: name,
        eta_window: eta,
      });
      setMessagePreview(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to render message preview';
      toast.error(msg);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (error && !shipments.length) {
    return <ErrorState title="Failed to Load Interventions" error={error} onRetry={fetchData} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
              Interventions & Deferral Ledger
            </h1>
            <Badge type="simulation" />
            <Badge type="heuristic" />
          </div>
          <p className="text-[13px] text-[var(--ink-muted)] mt-1">
            Pre-dispatch customer contact actions, simulated availability shifts, and fleet capacity deferral accounting.
          </p>
        </div>

        <Button
          variant="secondary"
          size="default"
          onClick={fetchData}
          loading={loading}
          icon={<IconRefresh size={14} />}
        >
          Refresh Ledger
        </Button>
      </div>

      {/* 20% Fleet Capacity Ceiling Meter Strip */}
      <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[var(--ink)]">
                Fleet Capacity Budget Controller
              </span>
              <span className="font-mono text-[11px] text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded-[2px] font-medium">
                {capacityLimitPct.toFixed(0)}% FLEET CEILING
              </span>
            </div>
            <p className="text-[12px] text-[var(--ink-muted)] mt-0.5">
              Maximum allowable pre-dispatch interventions per route to avoid driver schedule overburden.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[12px] font-mono">
            <div>
              <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Approved Budget</span>
              <span className="font-semibold text-[var(--ink)]">
                {approvedList.length} / {approvedBudgetCount} packages
              </span>
            </div>
            <div className="border-l border-[var(--border)] pl-4">
              <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Deferred Due to Cap</span>
              <span className="font-semibold text-[var(--risk-med)]">
                {deferredList.length} packages
              </span>
            </div>
            <div className="border-l border-[var(--border)] pl-4">
              <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Applied In Session</span>
              <span className="font-semibold text-[var(--risk-low)]">
                {appliedInterventionsList.length} packages
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress Meter */}
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-[var(--surface-sunken)] rounded-[3px] overflow-hidden flex border border-[var(--border)]">
            <div
              className="bg-[var(--accent)] transition-all duration-300"
              style={{
                width: `${Math.min(100, (approvedList.length / (approvedBudgetCount || 1)) * 100)}%`,
              }}
              title={`Approved: ${approvedList.length} packages`}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-[var(--ink-muted)]">
            <span>0% (0)</span>
            <span className="text-[var(--accent)] font-semibold">
              Ceiling: {capacityLimitPct}% ({approvedBudgetCount} stops max)
            </span>
            <span>100% ({totalEvaluated})</span>
          </div>
        </div>
      </div>

      {/* Intervention Catalog Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-[var(--ink)]">
            Available Smart Interventions Catalog
          </h2>
          <span className="text-[11px] font-mono text-[var(--ink-muted)]">
            5 Monotonic Action Models
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {INTERVENTION_CATALOG.map((item) => (
            <div
              key={item.id}
              className="p-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] flex flex-col justify-between hover:border-[var(--border-strong)] transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-[3px] bg-[var(--surface-sunken)] border border-[var(--border)] flex items-center justify-center text-[var(--ink-muted)]">
                      {item.id === 'access_point_locker' && <IconLock size={14} />}
                      {item.id === 'reschedule_day' && <IconClock size={14} />}
                      {item.id === 'hold_pickup' && <IconMapPin size={14} />}
                      {item.id === 'deliver_neighbor' && <IconUsers size={14} />}
                      {item.id === 'confirm_availability' && <IconUserCheck size={14} />}
                    </div>
                    <span className="text-[13px] font-semibold text-[var(--ink)] leading-tight">
                      {item.title}
                    </span>
                  </div>
                </div>

                <p className="text-[12px] text-[var(--ink-muted)] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--ink-muted)]">Δ Failure:</span>
                  <span className="font-semibold text-[var(--risk-low)]">
                    -{item.expectedReductionPts.toFixed(1)} pts
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.isHeuristic && <Badge type="heuristic" />}
                  <span className="px-1.5 py-0.5 rounded-[2px] bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--ink-muted)]">
                    {item.effort}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deferral & Capacity Ledger Table */}
      <Card
        title="Fleet Capacity & Deferral Accounting Ledger"
        subtitle="Ranked queue of elevated-risk shipments evaluated against operational fleet capacity constraints"
        action={
          <div className="flex items-center gap-1 bg-[var(--surface-sunken)] p-0.5 rounded-[4px] border border-[var(--border)] text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setLedgerFilter('all')}
              className={`px-2 py-0.5 rounded-[2px] cursor-pointer transition-colors ${
                ledgerFilter === 'all'
                  ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-xs'
                  : 'text-[var(--ink-muted)]'
              }`}
            >
              All Elevated ({shipments.filter((s) => (s.prediction?.failure_probability ?? 0) >= 0.11).length})
            </button>
            <button
              type="button"
              onClick={() => setLedgerFilter('approved')}
              className={`px-2 py-0.5 rounded-[2px] cursor-pointer transition-colors ${
                ledgerFilter === 'approved'
                  ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-xs'
                  : 'text-[var(--ink-muted)]'
              }`}
            >
              Approved ({approvedList.length})
            </button>
            <button
              type="button"
              onClick={() => setLedgerFilter('deferred')}
              className={`px-2 py-0.5 rounded-[2px] cursor-pointer transition-colors ${
                ledgerFilter === 'deferred'
                  ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-xs'
                  : 'text-[var(--ink-muted)]'
              }`}
            >
              Deferred Due to Cap ({deferredList.length})
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px] font-mono text-[var(--ink-muted)] uppercase">
                <th className="py-2 px-3 font-medium">Rank</th>
                <th className="py-2 px-3 font-medium">Package ID</th>
                <th className="py-2 px-3 font-medium">Zone / Method</th>
                <th className="py-2 px-3 font-medium">Calibrated Risk</th>
                <th className="py-2 px-3 font-medium">Capacity Status</th>
                <th className="py-2 px-3 font-medium">Intervention Applied</th>
                <th className="py-2 px-3 font-medium text-right">Actions</th>
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
                    No shipments found matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredShipments.map((s) => {
                  const prob = s.prediction?.failure_probability ?? 0;
                  const rank = s.prediction?.capacity_rank ?? '-';
                  const isApproved = s.prediction?.capacity_approved ?? false;
                  const hasIntervention = Boolean(s.applied_intervention);

                  return (
                    <tr
                      key={s.package_id}
                      className="hover:bg-[var(--surface-muted)] transition-colors font-mono"
                    >
                      <td className="py-2 px-3 text-[var(--ink-muted)]">
                        #{rank}
                      </td>
                      <td className="py-2 px-3 font-semibold text-[var(--ink)]">
                        <span className="font-sans text-[12px] block">
                          {s.package_id.length > 20
                            ? `...${s.package_id.slice(-12)}`
                            : s.package_id}
                        </span>
                        <span className="text-[10px] text-[var(--ink-muted)] font-mono">
                          Stop: {s.stop_id ?? 'AG'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <div className="text-[12px] text-[var(--ink)]">
                          {s.preferred_delivery_method || 'Standard'}
                        </div>
                        <div className="text-[10px] text-[var(--ink-muted)] font-mono">
                          Zone: {s.zone_id || 'A-2.1A'}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          type={prob > 0.14 ? 'high' : prob >= 0.11 ? 'med' : 'low'}
                          score={prob}
                        />
                      </td>
                      <td className="py-2 px-3">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--risk-low)] bg-[var(--risk-low-bg)] px-2 py-0.5 rounded-[2px] border border-[var(--risk-low)]/30">
                            <IconCheck size={12} />
                            APPROVED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--risk-med)] bg-[var(--risk-med-bg)] px-2 py-0.5 rounded-[2px] border border-[var(--risk-med)]/30">
                            DEFERRED (CAP EXCEEDED)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        {hasIntervention ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--ink)] bg-[var(--surface-sunken)] px-2 py-0.5 rounded-[2px] border border-[var(--border)] font-medium">
                            <IconLock size={12} className="text-[var(--accent)]" />
                            {typeof s.applied_intervention === 'object' && s.applied_intervention !== null
                              ? (s.applied_intervention as any).title || 'Custom Intervention'
                              : String(s.applied_intervention)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--ink-muted)] italic font-sans">
                            None applied
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-sans">
                          <Button
                            variant="secondary"
                            size="compact"
                            onClick={() => handleOpenSimulate(s)}
                            icon={<IconPlayerPlay size={12} />}
                          >
                            Simulate
                          </Button>
                          <Button
                            variant="secondary"
                            size="compact"
                            onClick={() => handleOpenMessagePreview(s)}
                            icon={<IconDeviceMobile size={12} />}
                          >
                            Message
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Simulation Dialog */}
      <Dialog
        open={simulateOpen}
        onClose={() => setSimulateOpen(false)}
        title="Counterfactual Smart Intervention Simulator"
        maxWidth="max-w-[620px]"
      >
        <div className="space-y-4">
          <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px] flex items-center justify-between text-[12px] font-mono">
            <div>
              <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Target Package</span>
              <span className="font-semibold text-[var(--ink)]">
                {activePackage?.package_id}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Baseline Failure Probability</span>
              <span className="font-bold text-[var(--risk-high)]">
                {((activePackage?.prediction?.failure_probability ?? 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge type="simulation" />
            <span className="text-[11px] text-[var(--ink-muted)]">
              Simulates monotonic parameter shifts on calibrated logistic log-odds margin.
            </span>
          </div>

          {/* Options List */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {simLoading ? (
              <Skeleton width="100%" height="200px" />
            ) : simOptions.length === 0 ? (
              <p className="text-[12px] text-[var(--ink-muted)] py-4 text-center">
                No simulated options generated for this package.
              </p>
            ) : (
              simOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-[4px] space-y-2 hover:border-[var(--accent)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[var(--ink)]">
                          {opt.title}
                        </span>
                        {opt.is_rule_based_heuristic && <Badge type="heuristic" />}
                      </div>
                      <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                        {opt.simulation_disclaimer || 'Monotonic shift applied to customer availability and location accessibility.'}
                      </p>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-[13px] font-bold text-[var(--risk-low)] block">
                        {((opt.new_prob ?? 0) * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-[var(--risk-low)] font-semibold">
                        -{((opt.risk_reduction_points ?? 0)).toFixed(1)} pts
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[var(--ink-muted)]">
                      New Risk Tier: <span className="font-semibold uppercase">{opt.new_risk_tier ?? 'LOW'}</span>
                    </span>

                    <Button
                      variant="primary"
                      size="compact"
                      onClick={() => handleApplyIntervention(activePackage!.package_id, opt.id)}
                      loading={applyingId === opt.id}
                    >
                      Apply & Persist
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Dialog>

      {/* Multi-Channel Messaging Preview Dialog */}
      <Dialog
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        title="Customer Messaging Engagement Preview"
        maxWidth="max-w-[580px]"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-mono text-[var(--ink-muted)]">CHANNEL:</span>
              <div className="flex items-center rounded-[4px] border border-[var(--border)] p-0.5 bg-[var(--surface-sunken)]">
                {(['SMS', 'WHATSAPP', 'EMAIL'] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setSelectedChannel(ch);
                      if (activePackage) {
                        fetchMessagePreview(activePackage.package_id, activeInterventionId, ch, recipientName, etaWindow);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono cursor-pointer transition-colors ${
                      selectedChannel === ch
                        ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-xs'
                        : 'text-[var(--ink-muted)]'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <Badge type="preview" />
          </div>

          {/* Recipient & ETA Configuration */}
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <label className="block text-[11px] font-mono text-[var(--ink-muted)] mb-1">
                Recipient Name:
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-[12px] font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[var(--ink-muted)] mb-1">
                Estimated Delivery Window:
              </label>
              <input
                type="text"
                value={etaWindow}
                onChange={(e) => setEtaWindow(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-[12px] font-mono"
              />
            </div>
          </div>

          {/* Rendered Preview Box */}
          <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ink-muted)] border-b border-[var(--border)] pb-1.5">
              <span>PREVIEW RENDERING ({selectedChannel})</span>
              {selectedChannel === 'SMS' && messagePreview && (
                <span>{messagePreview.body.length} / 160 GSM-7 chars</span>
              )}
            </div>

            {previewLoading ? (
              <Skeleton width="100%" height="90px" />
            ) : messagePreview ? (
              <div className="space-y-2">
                {messagePreview.headline && (
                  <div className="text-[12px] font-semibold text-[var(--ink)]">
                    {messagePreview.headline}
                  </div>
                )}
                {messagePreview.subject && (
                  <div className="text-[12px] font-mono text-[var(--ink-muted)]">
                    Subject: {messagePreview.subject}
                  </div>
                )}
                <div className="text-[12px] text-[var(--ink)] whitespace-pre-wrap font-sans leading-relaxed">
                  {messagePreview.body}
                </div>
                {messagePreview.cta_text && (
                  <div className="pt-2">
                    <span className="inline-block px-3 py-1 rounded-[3px] bg-[var(--accent)] text-white text-[11px] font-medium font-sans">
                      {messagePreview.cta_text}
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ink-muted)] pt-2 border-t border-[var(--border)]">
            <span>Live telecommunications dispatch disabled in demonstration mode</span>
            <Button variant="secondary" size="compact" onClick={() => setMessageOpen(false)}>
              Close Preview
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default Interventions;
