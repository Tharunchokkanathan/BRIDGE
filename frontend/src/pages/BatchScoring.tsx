import React from 'react';
import { Card } from '../components/ui/Card';

export const BatchScoring: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border)] pb-4">
        <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
          Batch Scoring & Dynamic Manifests
        </h1>
        <p className="text-[13px] text-[var(--ink-muted)] mt-1">
          CSV pre-flight schema analysis, target leakage quarantine, and multi-route capacity partitioning.
        </p>
      </div>

      <Card title="Batch Upload Engine (Phase 8 API Integration Placeholder)">
        <p className="text-[13px] text-[var(--ink-muted)]">
          The drag-and-drop CSV uploader wired to POST /api/manifest/upload will be integrated in Step 9.8.
        </p>
      </Card>
    </div>
  );
};

export default BatchScoring;
