import React from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IconSearch, IconFilter, IconDownload } from '@tabler/icons-react';

export const RiskQueue: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
              Risk Queue
            </h1>
            <span className="font-mono text-[11px] text-[var(--ink-muted)] bg-[var(--surface-sunken)] px-2 py-0.5 rounded-[2px] border border-[var(--border)]">
              ACTIVE MANIFEST: 30 STOPS
            </span>
          </div>
          <p className="text-[13px] text-[var(--ink-muted)] mt-1">
            Sort, filter, and inspect calibrated shipment risk probabilities, SHAP drivers, and actionable interventions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" icon={<IconDownload size={14} />}>
            Export Scored CSV
          </Button>
          <Button variant="primary">
            Apply Top-Ranked
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-[6px] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-[320px]">
          <div className="relative w-full">
            <IconSearch size={14} className="absolute left-2.5 top-2.5 text-[var(--ink-faint)]" />
            <input
              type="text"
              placeholder="Search package ID, street, or zone..."
              className="w-full h-8 pl-8 pr-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--surface-sunken)] text-[12px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="compact" icon={<IconFilter size={13} />}>
            Filters (All Tiers)
          </Button>
          <Badge type="distance" />
        </div>
      </div>

      <Card title="Manifest Risk Table (Step 9.5 Deep Build Placeholder)">
        <p className="text-[13px] text-[var(--ink-muted)] leading-relaxed">
          The full virtualized data grid with live SHAP waterfall drawers and bulk actions will be built in Step 9.5.
        </p>
      </Card>
    </div>
  );
};

export default RiskQueue;
