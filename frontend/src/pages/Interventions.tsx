import React from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const Interventions: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
            Interventions & Deferral Ledger
          </h1>
          <Badge type="simulation" />
        </div>
        <p className="text-[13px] text-[var(--ink-muted)] mt-1">
          Pre-dispatch contact actions, simulated customer availability shifts, and multi-day deferral accounting.
        </p>
      </div>

      <Card title="Interventions Catalog & Ledger (Step 9.7 Deep Build Placeholder)">
        <p className="text-[13px] text-[var(--ink-muted)]">
          The 20% capacity meter, rule-based heuristic tags, and multi-day ledger will be implemented in Step 9.7.
        </p>
      </Card>
    </div>
  );
};

export default Interventions;
