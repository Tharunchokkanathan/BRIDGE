import React from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const AuditDisclosures: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border)] pb-4">
        <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
          Audit & System Disclosures
        </h1>
        <p className="text-[13px] text-[var(--ink-muted)] mt-1">
          Permanent reference page documenting algorithmic constraints, assumptions, and audit guardrails.
        </p>
      </div>

      <div className="space-y-4">
        <Card title="Guardrail 1: Counterfactual Simulation Notice">
          <div className="space-y-2 text-[13px] text-[var(--ink-muted)]">
            <div className="flex items-center gap-2 mb-2">
              <Badge type="simulation" />
            </div>
            <p>
              Intervention availability shifts (e.g. customer delivery window shifts or re-routing notifications) reflect counterfactual simulation estimates derived from historical customer responsiveness. They do not constitute deterministic delivery guarantees.
            </p>
          </div>
        </Card>

        <Card title="Guardrail 2: Rule-Based Heuristic Attribution">
          <div className="space-y-2 text-[13px] text-[var(--ink-muted)]">
            <div className="flex items-center gap-2 mb-2">
              <Badge type="heuristic" />
            </div>
            <p>
              Hold-at-pickup actions, locker redirects, and address correction fallbacks operate on deterministic business logic rules rather than statistical model inferences.
            </p>
          </div>
        </Card>

        <Card title="Guardrail 3: Dry-Run Message Previews">
          <div className="space-y-2 text-[13px] text-[var(--ink-muted)]">
            <div className="flex items-center gap-2 mb-2">
              <Badge type="preview" />
            </div>
            <p>
              All customer communication previews (SMS, WhatsApp, and Email) are generated in preview-only simulation mode. Dispatchers must manually authorize automated outbound dispatch.
            </p>
          </div>
        </Card>

        <Card title="Guardrail 4: Circuity-Scaled Haversine Distances">
          <div className="space-y-2 text-[13px] text-[var(--ink-muted)]">
            <div className="flex items-center gap-2 mb-2">
              <Badge type="distance" />
            </div>
            <p>
              All distance calculations, savings estimates, and 2-Opt sequencing algorithms utilize great-circle Haversine distances scaled by an empirical urban circuity factor (κ = 1.35). They are pre-dispatch planning approximations, not turn-by-turn road navigation meters.
            </p>
          </div>
        </Card>

        <Card title="Guardrail 5: Grounded Model Gate Truthfulness">
          <div className="space-y-2 text-[13px] text-[var(--ink-muted)]">
            <p>
              BRIDGE operates under strict non-fabrication governance. Model quality metrics (Champion PR-AUC 0.1139, ROC-AUC 0.5611) reflect real test set performance without promotional exaggeration. Deployment gates that were not met remain explicitly flagged as FAILED.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AuditDisclosures;
