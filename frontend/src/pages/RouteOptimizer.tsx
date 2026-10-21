import React from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IconPlayerPlay, IconRotateClockwise } from '@tabler/icons-react';

export const RouteOptimizer: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
              Route Optimizer
            </h1>
            <Badge type="distance" />
          </div>
          <p className="text-[13px] text-[var(--ink-muted)] mt-1">
            2-Opt TSP dispatch sequencing with circuity-scaled Haversine distances (κ = 1.35) and stop consolidation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" icon={<IconRotateClockwise size={14} />}>
            Reset Sequence
          </Button>
          <Button variant="primary" icon={<IconPlayerPlay size={14} />}>
            Run 2-Opt TSP
          </Button>
        </div>
      </div>

      <Card title="Interactive Map & Ordered Stop List (Step 9.6 Deep Build Placeholder)">
        <p className="text-[13px] text-[var(--ink-muted)] leading-relaxed">
          The MapLibre GL vector basemap with SVG fallback and ordered stop sequence will be fully assembled in Step 9.6.
        </p>
      </Card>
    </div>
  );
};

export default RouteOptimizer;
