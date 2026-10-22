import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border)] pb-4">
        <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
          Dispatcher Preferences & Settings
        </h1>
        <p className="text-[13px] text-[var(--ink-muted)] mt-1">
          Configure interface density, typography settings, units, and system preferences. Persisted locally.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Interface & Theme" subtitle="Appearance customization">
          <div className="space-y-4 text-[13px]">
            <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
              <div>
                <div className="font-medium text-[var(--ink)]">Color Theme</div>
                <div className="text-[12px] text-[var(--ink-muted)]">Light (default) or Dark mode</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="compact" onClick={() => document.documentElement.classList.remove('dark')}>
                  Light
                </Button>
                <Button variant="secondary" size="compact" onClick={() => document.documentElement.classList.add('dark')}>
                  Dark
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
              <div>
                <div className="font-medium text-[var(--ink)]">Distance Units</div>
                <div className="text-[12px] text-[var(--ink-muted)]">Metric kilometers or Imperial miles</div>
              </div>
              <span className="font-mono text-[11px] text-[var(--ink-muted)] bg-[var(--surface-sunken)] px-2 py-0.5 rounded-[2px] border border-[var(--border)]">
                KILOMETERS (KM)
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium text-[var(--ink)]">Circuity Factor (κ)</div>
                <div className="text-[12px] text-[var(--ink-muted)]">Urban road network multiplier</div>
              </div>
              <span className="font-mono text-[11px] text-[var(--ink-muted)] bg-[var(--surface-sunken)] px-2 py-0.5 rounded-[2px] border border-[var(--border)]">
                1.35 (FROZEN)
              </span>
            </div>
          </div>
        </Card>

        <Card title="API Configuration" subtitle="B2B API authentication">
          <div className="space-y-4 text-[13px]">
            <div>
              <label className="text-[12px] font-medium text-[var(--ink-muted)] block mb-1">
                Custom X-API-Key (Optional)
              </label>
              <input
                type="password"
                placeholder="demo-sandbox-key"
                className="w-full h-8 px-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] text-[12px] text-[var(--ink)] font-mono"
              />
              <span className="text-[11px] text-[var(--ink-muted)] mt-1 block">
                Leave blank for open hackathon / demo sandbox mode.
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
