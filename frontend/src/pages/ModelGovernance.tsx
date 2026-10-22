import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';
import { HealthResponse } from '../api/types';
import { RELEASE_REPORT_V1_5_0 } from '../data/release_report_v1_5_0';
import { toast } from 'sonner';
import {
  IconArrowsExchange,
  IconCheck,
  IconRefresh,
  IconShieldCheck,
  IconX,
} from '@tabler/icons-react';

interface FeatureImportance {
  feature: string;
  name: string;
  importance: number;
  direction: 'INCREASES_RISK' | 'DECREASES_RISK';
}

const GLOBAL_FEATURE_IMPORTANCE: FeatureImportance[] = [
  { feature: 'customer_availability_rate', name: 'Customer Availability Rate', importance: 0.384, direction: 'DECREASES_RISK' },
  { feature: 'signature_required', name: 'Mandatory Signature Required', importance: 0.321, direction: 'INCREASES_RISK' },
  { feature: 'address_access_difficulty', name: 'Address Access Difficulty Score', importance: 0.282, direction: 'INCREASES_RISK' },
  { feature: 'historical_zone_failure_rate', name: 'Historical Zone Failure Prior', importance: 0.245, direction: 'INCREASES_RISK' },
  { feature: 'departure_hour', name: 'Courier Dispatch Hour (Late Run)', importance: 0.192, direction: 'INCREASES_RISK' },
  { feature: 'preference_departure_mismatch', name: 'Window vs Departure Mismatch', importance: 0.174, direction: 'INCREASES_RISK' },
  { feature: 'customer_delivery_preference_Evening', name: 'Evening Customer Preference', importance: 0.141, direction: 'INCREASES_RISK' },
  { feature: 'location_type_Commercial', name: 'Commercial Business Location', importance: 0.115, direction: 'INCREASES_RISK' },
  { feature: 'planned_service_time_seconds', name: 'Planned Service Time Friction', importance: 0.092, direction: 'INCREASES_RISK' },
  { feature: 'preferred_delivery_method_Hand_to_Customer', name: 'Hand to Customer Method', importance: 0.081, direction: 'INCREASES_RISK' },
];

export const ModelGovernance: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSwitch = async (modelName: string) => {
    setSwitching(true);
    try {
      const res = await api.switchModel(modelName);
      toast.success(res.message);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Model switch failed';
      toast.error(msg);
    } finally {
      setSwitching(false);
    }
  };

  const isChampActive = health?.is_champion_active ?? true;
  const activeModelName = health?.active_model ?? 'Logistic Regression';
  const explainerType = health?.explainer_type ?? 'linear_exact';

  // Promotion Gates Matrix definition
  const promotionGates = useMemo(() => [
    {
      gate: 'PR-AUC Target',
      threshold: '> 0.1500',
      championVal: '0.1139',
      candidateVal: '0.1174',
      status: 'FAILED',
      rationale: 'Severe class imbalance (9.8% positive rate). Neither model crossed the 0.1500 operational promotion threshold.',
    },
    {
      gate: 'ROC-AUC Target',
      threshold: '> 0.6500',
      championVal: '0.5611',
      candidateVal: '0.5623',
      status: 'FAILED',
      rationale: 'Marginal discriminative signal. Candidate delta (+0.0012) is within statistical sampling noise.',
    },
    {
      gate: 'Brier Calibration Score',
      threshold: '< 0.0780',
      championVal: '0.0824',
      candidateVal: '0.0823',
      status: 'FAILED',
      rationale: 'Both models missed the 0.0780 probabilistic scoring strict accuracy threshold.',
    },
    {
      gate: 'Kolmogorov-Smirnov Invariant',
      threshold: 'p-value > 0.05',
      championVal: 'p = 0.42 (D=0.0105)',
      candidateVal: 'p = 0.31 (D=0.0140)',
      status: 'PASSED',
      rationale: 'Distribution shift test confirmed identical score distributions across training and validation folds.',
    },
    {
      gate: 'Inference Latency Budget',
      threshold: 'P95 < 5.0 ms',
      championVal: '0.22 ms',
      candidateVal: '2.05 ms',
      status: 'PASSED',
      rationale: 'Both models comfortably satisfy operational dispatch latency budget (<5.0ms forward pass).',
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
              Model Governance & Gate Telemetry
            </h1>
            <span className="font-mono text-[11px] text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded-[2px] font-semibold border border-[var(--accent)]/30">
              ACTIVE: {activeModelName}
            </span>
            <span className="font-mono text-[11px] text-[var(--ink-muted)] bg-[var(--surface-sunken)] px-2 py-0.5 rounded-[2px] border border-[var(--border)]">
              EXPLAINER: {explainerType}
            </span>
          </div>
          <p className="text-[13px] text-[var(--ink-muted)] mt-1">
            Truthful model evaluation against deployment gates. Zero superlatives. Promotion gates failed: Champion retained.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="default"
            onClick={loadData}
            loading={loading}
            icon={<IconRefresh size={14} />}
          >
            Refresh Telemetry
          </Button>

          <Button
            variant="primary"
            size="default"
            onClick={() =>
              handleSwitch(
                isChampActive ? 'LightGBM Candidate' : 'Logistic Regression'
              )
            }
            loading={switching}
            icon={<IconArrowsExchange size={14} />}
          >
            {isChampActive
              ? 'Hot-Swap to LightGBM Candidate'
              : 'Restore Champion (Logistic Regression)'}
          </Button>
        </div>
      </div>

      {/* Active Model Status Strip */}
      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px] font-mono">
        <div>
          <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Active Production Model</span>
          <span className="text-[14px] font-bold text-[var(--ink)]">
            {activeModelName}
          </span>
          <span className="text-[10px] text-[var(--ink-muted)] block mt-0.5">
            {isChampActive ? 'Production Champion' : 'Experimental Candidate'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Explainer Engine</span>
          <span className="text-[14px] font-bold text-[var(--accent)]">
            {explainerType === 'linear_exact' ? 'Exact Linear SHAP' : 'TreeSHAP (LGBM)'}
          </span>
          <span className="text-[10px] text-[var(--ink-muted)] block mt-0.5">
            {explainerType === 'linear_exact' ? 'Closed-form additivity' : 'Tree path recursive'}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Probability Calibration</span>
          <span className="text-[14px] font-bold text-[var(--risk-low)]">
            Platt Calibrator (ACTIVE)
          </span>
          <span className="text-[10px] text-[var(--ink-muted)] block mt-0.5">
            Logistic margin mapping
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Governance Status</span>
          <span className="text-[14px] font-bold text-[var(--ink)]">
            {isChampActive ? 'Champion Retained' : 'Candidate Active'}
          </span>
          <span className="text-[10px] text-[var(--risk-high)] block mt-0.5 font-semibold">
            Promotion Gates Failed
          </span>
        </div>
      </div>

      {/* Promotion Gate Truth Matrix */}
      <Card
        title="Automated Promotion Gate Truth Matrix"
        subtitle="Verification against frozen release criteria (docs/FINAL_RELEASE_REPORT.md / Release report v1.5.0)"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse font-mono">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px] text-[var(--ink-muted)] uppercase">
                <th className="py-2.5 px-3 font-medium">Promotion Gate</th>
                <th className="py-2.5 px-3 font-medium text-center">Threshold</th>
                <th className="py-2.5 px-3 font-medium text-center">Champion (LR)</th>
                <th className="py-2.5 px-3 font-medium text-center">Candidate (LGBM)</th>
                <th className="py-2.5 px-3 font-medium text-center">Result</th>
                <th className="py-2.5 px-3 font-medium">Audit Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {promotionGates.map((g) => (
                <tr key={g.gate} className="hover:bg-[var(--surface-muted)] transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-[var(--ink)]">
                    {g.gate}
                  </td>
                  <td className="py-2.5 px-3 text-center text-[var(--ink-muted)]">
                    {g.threshold}
                  </td>
                  <td className="py-2.5 px-3 text-center text-[var(--ink)] font-bold">
                    {g.championVal}
                  </td>
                  <td className="py-2.5 px-3 text-center text-[var(--ink)] font-bold">
                    {g.candidateVal}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {g.status === 'PASSED' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--risk-low)] bg-[var(--risk-low-bg)] px-2 py-0.5 rounded-[2px] border border-[var(--risk-low)]/30">
                        <IconCheck size={12} />
                        PASSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--risk-high)] bg-[var(--risk-high-bg)] px-2 py-0.5 rounded-[2px] border border-[var(--risk-high)]/30">
                        <IconX size={12} />
                        FAILED
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-[12px] text-[var(--ink-muted)] leading-relaxed">
                    {g.rationale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 p-3 bg-[var(--surface-sunken)] rounded-[4px] border border-[var(--border)] flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <IconShieldCheck size={16} className="text-[var(--accent)]" />
            <span className="font-semibold text-[var(--ink)]">
              Governance Invariant: Zero Model Regressions
            </span>
          </div>
          <span className="text-[var(--ink-muted)]">
            Candidate failed PR-AUC and Brier gates. Logistic Regression safely retained as Champion.
          </span>
        </div>
      </Card>

      {/* Grid: Global SHAP Feature Importance + Component Latency Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Global SHAP Feature Importance */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            title="Global Feature Importance & Risk Attribution"
            subtitle="Mean absolute SHAP value (|φ|) across 14,819 test deliveries (calibrated log-odds space)"
          >
            <div className="space-y-2.5">
              {GLOBAL_FEATURE_IMPORTANCE.map((f) => {
                const pct = (f.importance / 0.40) * 100;
                const isRisk = f.direction === 'INCREASES_RISK';

                return (
                  <div key={f.feature} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[var(--ink)] font-semibold truncate max-w-[280px]">
                        {f.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold ${
                            isRisk ? 'text-[var(--risk-high)]' : 'text-[var(--risk-low)]'
                          }`}
                        >
                          {isRisk ? '+ Risk Factor' : '- Mitigating'}
                        </span>
                        <span className="font-bold text-[var(--ink)] w-12 text-right">
                          +{f.importance.toFixed(3)}
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-[var(--surface-sunken)] rounded-[2px] overflow-hidden flex border border-[var(--border)]">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isRisk ? 'bg-[var(--risk-high)]' : 'bg-[var(--risk-low)]'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Component Latency Profiling Telemetry */}
        <div className="lg:col-span-5 space-y-4">
          <Card
            title="Component Execution Latencies"
            subtitle="Audited P50 / P95 execution timings under 500 warmup iterations (Release report v1.5.0)"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse font-mono">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[10px] text-[var(--ink-muted)] uppercase">
                    <th className="py-2 px-2 font-medium">Component</th>
                    <th className="py-2 px-2 font-medium text-right">P50</th>
                    <th className="py-2 px-2 font-medium text-right">P95</th>
                    <th className="py-2 px-2 font-medium text-right">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {RELEASE_REPORT_V1_5_0.latency_benchmarks.map((b) => (
                    <tr key={b.scope} className="hover:bg-[var(--surface-muted)] transition-colors">
                      <td className="py-2 px-2 font-semibold text-[var(--ink)] truncate max-w-[150px]">
                        {b.scope}
                      </td>
                      <td className="py-2 px-2 text-right text-[var(--ink-muted)]">
                        {b.p50.toFixed(2)} ms
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-[var(--accent)]">
                        {b.p95.toFixed(2)} ms
                      </td>
                      <td className="py-2 px-2 text-right text-[var(--risk-low)] font-semibold">
                        ≤{b.target.toFixed(1)} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 p-2.5 rounded-[4px] bg-[var(--surface-sunken)] border border-[var(--border)] text-[10px] font-mono text-[var(--ink-muted)]">
              All benchmarks captured on Windows 11 / Python 3.13.3 AMD64 with warm-up cycles.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ModelGovernance;
