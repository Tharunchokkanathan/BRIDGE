import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Combobox } from '../components/ui/Combobox';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Tabs } from '../components/ui/Tabs';
import { Checkbox } from '../components/ui/Checkbox';
import { Switch } from '../components/ui/Switch';
import { Tooltip } from '../components/ui/Tooltip';
import { Popover } from '../components/ui/Popover';
import { Dialog } from '../components/ui/Dialog';
import { Drawer } from '../components/ui/Drawer';
import { Card } from '../components/ui/Card';
import { Stat } from '../components/ui/Stat';
import { Banner } from '../components/ui/Banner';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { KeyValue } from '../components/ui/KeyValue';
import { DeltaText } from '../components/ui/DeltaText';
import { DataTable } from '../components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import {
  IconSun,
  IconMoon,
  IconCheck,
  IconHelp,
  IconFilter,
} from '@tabler/icons-react';

interface ColorSwatch {
  token: string;
  lightHex: string;
  darkHex: string;
  role: string;
  lightContrast: string;
  darkContrast: string;
}

const COLOR_SWATCHES: ColorSwatch[] = [
  {
    token: '--canvas',
    lightHex: '#F3F5F7',
    darkHex: '#0E1215',
    role: 'Application backdrop canvas',
    lightContrast: '1.09:1',
    darkContrast: '1.09:1',
  },
  {
    token: '--surface',
    lightHex: '#FFFFFF',
    darkHex: '#151A1F',
    role: 'Primary panel & card surface',
    lightContrast: 'Base',
    darkContrast: 'Base',
  },
  {
    token: '--surface-muted',
    lightHex: '#F8F9FA',
    darkHex: '#1A2026',
    role: 'Table hover & secondary header',
    lightContrast: '1.04:1',
    darkContrast: '1.08:1',
  },
  {
    token: '--surface-sunken',
    lightHex: '#EDF0F3',
    darkHex: '#0A0D10',
    role: 'Input backgrounds & recessed wells',
    lightContrast: '1.14:1',
    darkContrast: '1.18:1',
  },
  {
    token: '--border',
    lightHex: '#D9DEE3',
    darkHex: '#2A323A',
    role: '1px hairline structural dividers',
    lightContrast: '1.35:1',
    darkContrast: '1.35:1',
  },
  {
    token: '--border-strong',
    lightHex: '#C3CAD1',
    darkHex: '#3A444E',
    role: 'Active borders & strong lines',
    lightContrast: '1.65:1',
    darkContrast: '1.76:1',
  },
  {
    token: '--ink',
    lightHex: '#14181C',
    darkHex: '#E6EAED',
    role: 'Primary body text & headings',
    lightContrast: '17.84:1 (PASS)',
    darkContrast: '14.47:1 (PASS)',
  },
  {
    token: '--ink-muted',
    lightHex: '#5B6670',
    darkHex: '#9AA5AF',
    role: 'Secondary labels & captions',
    lightContrast: '5.87:1 (PASS)',
    darkContrast: '6.98:1 (PASS)',
  },
  {
    token: '--ink-faint',
    lightHex: '#8A949E',
    darkHex: '#6E7A85',
    role: 'Disabled text & minor metadata',
    lightContrast: '3.08:1',
    darkContrast: '3.99:1',
  },
  {
    token: '--accent',
    lightHex: '#0B5E73',
    darkHex: '#4FB3C8',
    role: 'Slate Cyan (Action & Focus only)',
    lightContrast: '7.34:1 (PASS)',
    darkContrast: '7.18:1 (PASS)',
  },
  {
    token: '--risk-low',
    lightHex: '#2F7D57',
    darkHex: '#5BBF8A',
    role: 'Low failure risk semantic indicator',
    lightContrast: '5.01:1 (PASS)',
    darkContrast: '7.72:1 (PASS)',
  },
  {
    token: '--risk-med',
    lightHex: '#9A6700',
    darkHex: '#E0A33A',
    role: 'Medium failure risk semantic indicator',
    lightContrast: '4.87:1 (PASS)',
    darkContrast: '7.89:1 (PASS)',
  },
  {
    token: '--risk-high',
    lightHex: '#B42318',
    darkHex: '#F07167',
    role: 'High failure risk semantic indicator',
    lightContrast: '6.57:1 (PASS)',
    darkContrast: '6.06:1 (PASS)',
  },
  {
    token: '--info',
    lightHex: '#1F5FA8',
    darkHex: '#589BD6',
    role: 'Operational notices & system info',
    lightContrast: '6.44:1 (PASS)',
    darkContrast: '5.90:1 (PASS)',
  },
];

interface SamplePackage {
  id: string;
  address: string;
  riskTier: 'low' | 'med' | 'high';
  prob: number;
  distance: string;
}

const SAMPLE_DATA: SamplePackage[] = [
  { id: 'PKG-001', address: '1450 Market St, SF', riskTier: 'high', prob: 0.245, distance: '1.42 km' },
  { id: 'PKG-002', address: '525 4th St, SF', riskTier: 'med', prob: 0.128, distance: '2.85 km' },
  { id: 'PKG-003', address: '88 Colin P Kelly Jr St, SF', riskTier: 'low', prob: 0.038, distance: '0.65 km' },
  { id: 'PKG-004', address: '100 California St, SF', riskTier: 'low', prob: 0.052, distance: '3.10 km' },
];

export const Styleguide: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [comboboxVal, setComboboxVal] = useState('email');
  const [segVal, setSegVal] = useState('champion');
  const [activeTab, setActiveTab] = useState('metrics');
  const [checkboxVal, setCheckboxVal] = useState(true);
  const [switchVal, setSwitchVal] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const columns: ColumnDef<SamplePackage>[] = [
    {
      accessorKey: 'id',
      header: 'Package ID',
      cell: (info) => <span className="font-mono">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'address',
      header: 'Delivery Address',
    },
    {
      accessorKey: 'riskTier',
      header: 'Risk Tier',
      cell: (info) => {
        const row = info.row.original;
        return <Badge type={row.riskTier} score={row.prob} />;
      },
    },
    {
      accessorKey: 'prob',
      header: 'Probability',
      cell: (info) => (
        <span className="font-mono tabular-nums">
          {(info.getValue() as number).toFixed(4)}
        </span>
      ),
    },
    {
      accessorKey: 'distance',
      header: 'Distance',
      cell: (info) => <span className="font-mono">{info.getValue() as string}</span>,
    },
  ];

  return (
    <div className="space-y-10 font-sans pb-12">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
              Component Primitives & Design Tokens
            </h1>
            <span className="px-2 py-0.5 rounded-[2px] bg-[var(--accent-subtle)] text-[var(--accent)] font-mono text-[11px] font-medium border border-[var(--accent)]/30">
              SPEC 9.3
            </span>
          </div>
          <p className="text-[13px] text-[var(--ink-muted)] mt-1">
            Complete dispatcher-grade UI primitive catalog with verified states, WCAG AA compliance, and keyboard accessibility.
          </p>
        </div>

        <Button
          variant="secondary"
          size="default"
          onClick={toggleTheme}
          icon={theme === 'light' ? <IconMoon size={16} /> : <IconSun size={16} />}
          id="theme-toggle-btn"
        >
          Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
        </Button>
      </div>

      {/* Section 1: Color Tokens */}
      <section className="space-y-4">
        <div className="border-b border-[var(--border)] pb-2 flex items-baseline justify-between">
          <h2 className="text-[14px] font-semibold text-[var(--ink)] uppercase tracking-wider font-mono">
            01 / Color Tokens & WCAG AA Contrast Ratios
          </h2>
          <span className="text-[12px] font-mono text-[var(--risk-low)] flex items-center gap-1">
            <IconCheck size={14} /> All text ≥ 4.5:1
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {COLOR_SWATCHES.map((swatch) => {
            const activeHex = theme === 'light' ? swatch.lightHex : swatch.darkHex;
            const activeContrast = theme === 'light' ? swatch.lightContrast : swatch.darkContrast;

            return (
              <div
                key={swatch.token}
                className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-[4px] flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-[2px] border border-[var(--border)] shrink-0 shadow-xs"
                    style={{ backgroundColor: activeHex }}
                  />
                  <div className="min-w-0">
                    <div className="font-mono text-[12px] font-medium text-[var(--ink)] truncate">
                      {swatch.token}
                    </div>
                    <div className="font-mono text-[11px] text-[var(--ink-muted)]">
                      {activeHex}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[var(--border)] pt-2 flex items-center justify-between text-[11px]">
                  <span className="text-[var(--ink-muted)] truncate">{swatch.role}</span>
                  <span
                    className={`font-mono shrink-0 ml-2 ${
                      activeContrast.includes('PASS')
                        ? 'text-[var(--risk-low)] font-medium'
                        : 'text-[var(--ink-muted)]'
                    }`}
                  >
                    {activeContrast}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Interactive Controls & Form Inputs */}
      <section className="space-y-4">
        <div className="border-b border-[var(--border)] pb-2">
          <h2 className="text-[14px] font-semibold text-[var(--ink)] uppercase tracking-wider font-mono">
            02 / Action & Selection Controls (Button, Select, Combobox, Segmented, Tabs)
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buttons Matrix */}
          <Card title="Buttons (Variants & States)" subtitle="Interactive accent focus, standard decay, zero spring easing">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">High Risk Alert</Button>
                <Button variant="primary" loading>
                  Loading
                </Button>
                <Button variant="secondary" disabled>
                  Disabled
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[var(--border)]">
                <Button variant="primary" size="compact">Compact (28px)</Button>
                <Button variant="primary" size="default">Default (32px)</Button>
                <Button variant="primary" size="touch">Touch (40px)</Button>
                <Button variant="secondary" icon={<IconFilter size={14} />}>With Icon</Button>
              </div>
            </div>
          </Card>

          {/* Segmented & Tabs */}
          <Card title="Segmented Controls & Tab Lists" subtitle="Flat hairline tracks, no pill badges">
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-medium text-[var(--ink-muted)] block mb-1.5">
                  Inference Model Segmented Switch
                </label>
                <SegmentedControl
                  value={segVal}
                  onChange={setSegVal}
                  options={[
                    { value: 'champion', label: 'Champion (LR)' },
                    { value: 'candidate', label: 'Candidate (LightGBM)' },
                    { value: 'benchmark', label: 'Rule Heuristic' },
                  ]}
                />
              </div>

              <div className="pt-3 border-t border-[var(--border)]">
                <label className="text-[12px] font-medium text-[var(--ink-muted)] block mb-1.5">
                  Tabs Component
                </label>
                <Tabs
                  activeId={activeTab}
                  onChange={setActiveTab}
                  items={[
                    { id: 'metrics', label: 'Risk Metrics', badge: '30' },
                    { id: 'shap', label: 'SHAP Attributions' },
                    { id: 'actions', label: 'Actions Required', badge: '6' },
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Form Inputs & Selects */}
          <Card title="Form Inputs, Selects & Combobox" subtitle="4px radius, mono tracking fields, clear error handling">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Tracking Number" defaultValue="PKG-2026-9042" isMono />
              <Input
                label="Risk Threshold (τ)"
                defaultValue="0.140"
                isMono
                error="Exceeds 20% fleet limit"
              />
              <Select
                label="Intervention Channel"
                options={[
                  { value: 'email', label: 'Email Prompt' },
                  { value: 'whatsapp', label: 'WhatsApp Confirmation' },
                  { value: 'sms', label: 'SMS Notification' },
                  { value: 'hold', label: 'Hold at Pickup Locker' },
                ]}
              />
              <Combobox
                label="Searchable Customer Type"
                value={comboboxVal}
                onChange={setComboboxVal}
                options={[
                  { value: 'residential', label: 'Residential Single Family', detail: 'Doorstep access' },
                  { value: 'commercial', label: 'Commercial Office Tower', detail: 'Security desk required' },
                  { value: 'apartment', label: 'Multi-Tenant Apartment', detail: 'Keypad buzzer' },
                  { value: 'locker', label: 'Automated Hub Locker', detail: '24/7 self-service' },
                ]}
              />
            </div>
          </Card>

          {/* Toggle Switches & Checkboxes */}
          <Card title="Selection Switches & Overlays" subtitle="Tooltips, popovers, modals, and slide-over drawers">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-6">
                <Checkbox
                  checked={checkboxVal}
                  onChange={setCheckboxVal}
                  label="Enforce 20% capacity ceiling"
                />
                <Checkbox checked={false} onChange={() => {}} label="Disabled option" disabled />
                <Switch
                  checked={switchVal}
                  onChange={setSwitchVal}
                  label="2-Opt tour optimization"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--border)]">
                <Tooltip content="Circuity-scaled Haversine distance (kappa = 1.35)">
                  <Button variant="secondary" size="compact" icon={<IconHelp size={14} />}>
                    Hover for Tooltip
                  </Button>
                </Tooltip>

                <Popover
                  trigger={
                    <Button variant="secondary" size="compact">
                      Click for Popover
                    </Button>
                  }
                  content={
                    <div className="space-y-1.5">
                      <div className="font-semibold text-[13px]">Quick Filter</div>
                      <p className="text-[12px] text-[var(--ink-muted)]">
                        Showing stops with P(fail) &gt; 0.110.
                      </p>
                    </div>
                  }
                />

                <Button variant="secondary" size="compact" onClick={() => setDialogOpen(true)}>
                  Open Dialog
                </Button>

                <Button variant="primary" size="compact" onClick={() => setDrawerOpen(true)}>
                  Open Drawer
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Section 3: Semantic Badges & Disclosures */}
      <section className="space-y-4">
        <div className="border-b border-[var(--border)] pb-2">
          <h2 className="text-[14px] font-semibold text-[var(--ink)] uppercase tracking-wider font-mono">
            03 / Semantic Badges, Disclosures & Delta Values
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card
            title="Semantic Badges & Audit Guardrails"
            subtitle="Multi-sensory risk encoding (shape + text + mono score) and non-removable Phase 5.1/6 audit badges"
          >
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-mono text-[var(--ink-muted)] block mb-2 uppercase">
                  Multi-Sensory Risk Indicators
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge type="low" score={0.042} />
                  <Badge type="med" score={0.128} />
                  <Badge type="high" score={0.285} />
                  <Badge type="info" label="SCHEDULED" />
                  <Badge type="neutral" label="DEFERRED" />
                  <Badge type="accent" label="OPTIMIZED" />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)]">
                <span className="text-[11px] font-mono text-[var(--ink-muted)] block mb-2 uppercase">
                  Audit Guardrail Disclosures (Must remain visible)
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge type="heuristic" />
                  <Badge type="preview" />
                  <Badge type="simulation" />
                  <Badge type="distance" />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)]">
                <span className="text-[11px] font-mono text-[var(--ink-muted)] block mb-2 uppercase">
                  DeltaText (Plain colored text, no pill badges)
                </span>
                <div className="flex items-center gap-4 text-[12px]">
                  <span>Savings: <DeltaText value={69.9} unit="%" /></span>
                  <span>Distance: <DeltaText value={-19.26} unit="km" /></span>
                  <span>Risk Delta: <DeltaText value={0.042} inverse unit="log-odds" /></span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="System Banners & Disclosures" subtitle="Informational, warning, and remediation banners">
            <div className="space-y-3">
              <Banner variant="info" title="Benchmark Manifest Loaded">
                Standard 30-stop benchmark active. Model inferences reflect baseline calibration.
              </Banner>
              <Banner
                variant="warning"
                title="Capacity Ceiling Reached (20%)"
                actionText="Defer Stops"
                onAction={() => {}}
              >
                6 packages currently allocated to intervention queue. Additional packages must be deferred.
              </Banner>
              <Banner variant="error" title="Offline Mode">
                API unreachable. Running in local cache fallback mode.
              </Banner>
            </div>
          </Card>
        </div>
      </section>

      {/* Section 4: Telemetry Stats, KeyValue & Data Table */}
      <section className="space-y-4">
        <div className="border-b border-[var(--border)] pb-2">
          <h2 className="text-[14px] font-semibold text-[var(--ink)] uppercase tracking-wider font-mono">
            04 / Telemetry Stats, KeyValue Lists & TanStack Data Table
          </h2>
        </div>

        {/* Lead Stats Strip */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[6px] overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
            <Stat label="Total Shipments" value="30" subtitle="Canonical test route" />
            <Stat
              label="High Risk Parcels"
              value="6"
              subtitle="20% fleet limit reached"
              badge={<Badge type="high" score={0.245} />}
            />
            <Stat
              label="Expected Fails"
              value="4.82"
              subtitle="Calibrated probability sum"
            />
            <Stat
              label="Optimized Savings"
              value="-69.9%"
              subtitle="19.26 km reduction"
              badge={<Badge type="distance" />}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Card title="TanStack Data Table" subtitle="Sortable headers, global search, right-aligned mono cells" noPadding>
              <div className="p-4">
                <DataTable
                  data={SAMPLE_DATA}
                  columns={columns}
                  idAccessor={(row) => row.id}
                  selectedRowId="PKG-002"
                />
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card title="KeyValue Telemetry" subtitle="Hairline divider list">
              <KeyValue
                items={[
                  { key: 'model', label: 'Active Classifier', value: 'Logistic Regression' },
                  { key: 'cal', label: 'Calibration', value: 'Isotonic (Active)' },
                  { key: 'brier', label: 'Brier Score', value: '0.0824', isMono: true },
                  { key: 'latency', label: 'Inference P95', value: '0.44 ms', isMono: true },
                ]}
              />
            </Card>

            <Card title="Universal Loading & Empty States">
              <div className="space-y-3">
                <Skeleton height={20} className="w-3/4" />
                <Skeleton height={14} className="w-full" />
                <Skeleton height={14} className="w-1/2" />
              </div>
            </Card>
          </div>
        </div>

        {/* Empty and Error states showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EmptyState
            title="No Manifest Uploaded"
            description="Drag and drop a CSV manifest file or select a saved benchmark route to begin evaluation."
            actionText="Load Benchmark Manifest"
            onAction={() => {}}
          />

          <ErrorState
            title="Model Ingest Failure"
            error="Required column 'latitude' missing from row 14. Target leakage quarantined."
            requestId="REQ-2026-9812-401"
            onRetry={() => {}}
          />
        </div>
      </section>

      {/* Modal Dialog Sample */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Confirm Model Hot-Swap"
        description="Switching active classifier to LightGBM Candidate."
        footer={
          <>
            <Button variant="secondary" size="compact" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="compact" onClick={() => setDialogOpen(false)}>
              Confirm Hot-Swap
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-[var(--ink-muted)] leading-relaxed">
          The inference engine will immediately switch to the LightGBM Candidate model and rescore all 30 active manifest shipments in memory.
        </p>
      </Dialog>

      {/* Slide-over Drawer Sample */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Package Details: PKG-001"
        subtitle="RouteID: R-01 · 1450 Market St"
        footer={
          <div className="flex items-center justify-between w-full">
            <Badge type="high" score={0.245} />
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="compact" onClick={() => setDrawerOpen(false)}>
                Close
              </Button>
              <Button variant="primary" size="compact" onClick={() => setDrawerOpen(false)}>
                Apply Intervention
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-[var(--surface-muted)] rounded-[4px] border border-[var(--border)]">
            <div className="text-[12px] font-mono text-[var(--ink-muted)]">CALIBRATED RISK PROBABILITY</div>
            <div className="text-[24px] font-mono font-semibold text-[var(--risk-high)] mt-1">24.50%</div>
            <div className="text-[11px] text-[var(--ink-muted)] mt-1">Operational threshold τ = 0.140 exceeded.</div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[13px] font-semibold text-[var(--ink)]">Top SHAP Risk Drivers</h4>
            <div className="p-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--surface)] text-[12px] space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span>Signature Required</span>
                <span className="text-[var(--risk-high)]">+0.3211</span>
              </div>
              <div className="flex justify-between">
                <span>Low Availability (16:00)</span>
                <span className="text-[var(--risk-high)]">+0.1420</span>
              </div>
              <div className="flex justify-between">
                <span>Zone Failure Rate</span>
                <span className="text-[var(--risk-high)]">+0.0984</span>
              </div>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default Styleguide;
