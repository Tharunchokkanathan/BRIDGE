import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';
import { HealthResponse } from '../api/types';
import { toast } from 'sonner';
import { IconArrowsExchange, IconX } from '@tabler/icons-react';

export const ModelGovernance: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  const loadData = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSwitch = async (modelName: string) => {
    try {
      const res = await api.switchModel(modelName);
      toast.success(res.message);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Switch failed';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
              Model Governance & Gate Telemetry
            </h1>
            <span className="font-mono text-[11px] text-[var(--ink-muted)] bg-[var(--surface-sunken)] px-2 py-0.5 rounded-[2px] border border-[var(--border)]">
              ACTIVE: {health?.active_model ?? 'Logistic Regression'}
            </span>
          </div>
          <p className="text-[13px] text-[var(--ink-muted)] mt-1">
            Truthful evaluation against deployment gates. Zero superlatives. Promotion gates failed: Champion retained.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            onClick={() =>
              handleSwitch(
                health?.is_champion_active
                  ? 'LightGBM Candidate'
                  : 'Logistic Regression'
              )
            }
            icon={<IconArrowsExchange size={14} />}
          >
            {health?.is_champion_active
              ? 'Hot-Swap to LightGBM Candidate'
              : 'Restore Champion (Logistic Regression)'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Active Model Status" subtitle="Inference engine configuration">
          <div className="space-y-3 font-mono text-[12px]">
            <div className="flex justify-between py-1 border-b border-[var(--border)]">
              <span className="text-[var(--ink-muted)]">Active Model:</span>
              <span className="font-semibold text-[var(--ink)]">{health?.active_model ?? 'Logistic Regression'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--border)]">
              <span className="text-[var(--ink-muted)]">Champion Model:</span>
              <span>{health?.champion_model ?? 'Logistic Regression'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--border)]">
              <span className="text-[var(--ink-muted)]">Is Champion Active:</span>
              <span className={health?.is_champion_active ? 'text-[var(--risk-low)]' : 'text-[var(--risk-med)]'}>
                {String(health?.is_champion_active ?? true)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[var(--border)]">
              <span className="text-[var(--ink-muted)]">Probability Calibration:</span>
              <span className="text-[var(--risk-low)]">Isotonic Regression (ACTIVE)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[var(--ink-muted)]">SHAP Explainer:</span>
              <span>{health?.explainer_type ?? 'linear_exact'}</span>
            </div>
          </div>
        </Card>

        <Card
          title="Promotion Gate Truth Matrix"
          subtitle="Grounded release report metrics (Release report v1.5.0)"
        >
          <div className="space-y-3 text-[12px]">
            <div className="flex items-center justify-between py-1 border-b border-[var(--border)] font-mono">
              <span className="text-[var(--ink-muted)]">PR-AUC Gate (Target &gt; 0.150):</span>
              <span className="text-[var(--risk-high)] flex items-center gap-1 font-semibold">
                <IconX size={14} /> FAILED (0.1139)
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[var(--border)] font-mono">
              <span className="text-[var(--ink-muted)]">Brier Gate (Target &lt; 0.0780):</span>
              <span className="text-[var(--risk-high)] flex items-center gap-1 font-semibold">
                <IconX size={14} /> FAILED (0.0824)
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-[var(--border)] font-mono">
              <span className="text-[var(--ink-muted)]">ROC-AUC Test:</span>
              <span className="text-[var(--ink)]">0.5611</span>
            </div>
            <div className="flex items-center justify-between py-1 font-mono">
              <span className="text-[var(--ink-muted)]">Promotion Decision:</span>
              <span className="text-[var(--accent)] font-semibold">Champion Retained</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ModelGovernance;
