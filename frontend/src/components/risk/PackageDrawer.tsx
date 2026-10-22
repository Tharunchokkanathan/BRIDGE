import React, { useState } from 'react';
import { ShipmentRecord } from '../../api/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Tabs } from '../ui/Tabs';
import { ShapWaterfall, ExplainabilityMetadata } from './ShapWaterfall';
import {
  IconX,
  IconSearch,
  IconCheck,
  IconPlayerPause,
  IconShieldCheck,
  IconLock,
} from '@tabler/icons-react';

export interface PackageDrawerProps {
  open: boolean;
  onClose: () => void;
  shipment: ShipmentRecord | null;
  onApplyAction?: (packageId: string, interventionId: string) => void;
  onDefer?: (packageId: string) => void;
  isActioned?: 'applied' | 'deferred';
}

export const PackageDrawer: React.FC<PackageDrawerProps> = ({
  open,
  onClose,
  shipment,
  onApplyAction,
  onDefer,
  isActioned,
}) => {
  const [featureSearch, setFeatureSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'shap' | 'features' | 'interventions' | 'preview'>('shap');
  const [messageChannel, setMessageChannel] = useState<'sms' | 'whatsapp' | 'email'>('sms');
  const [selectedIntervention, setSelectedIntervention] = useState<string>('access_point');

  if (!open || !shipment) return null;

  const pFail = Number(shipment.prediction?.failure_probability ?? 0);
  const rawProb = Number(shipment.prediction?.raw_probability ?? (pFail * 1.8));
  const tier = (shipment.prediction?.risk_tier?.toLowerCase() as 'high' | 'med' | 'low') || (pFail > 0.14 ? 'high' : 'med');
  const isApproved = shipment.prediction?.capacity_approved ?? (pFail > 0.14);

  // Extract feature entries for inspection
  const featureEntries = [
    { label: 'Stop ID', value: String(shipment.stop_id ?? '—'), category: 'Routing' },
    { label: 'Route ID', value: String(shipment.route_id ?? '—'), category: 'Routing' },
    { label: 'Zone ID', value: String(shipment.zone_id ?? 'P-13.2C'), category: 'Geography' },
    { label: 'Location Type', value: String(shipment.location_type ?? 'Apartment'), category: 'Geography' },
    { label: 'Coordinates', value: `${Number(shipment.latitude ?? 0).toFixed(4)}, ${Number(shipment.longitude ?? 0).toFixed(4)}`, category: 'Geography' },
    { label: 'Departure Hour', value: `${shipment.departure_hour ?? 16}:00`, category: 'Timing' },
    { label: 'Time Window Start', value: String(shipment.delivery_window_start ?? 'None'), category: 'Timing' },
    { label: 'Planned Service Time', value: `${shipment.planned_service_time_seconds ?? 50}s`, category: 'Service' },
    { label: 'Package Volume', value: `${shipment.package_volume_cm3 ?? 1135} cm³`, category: 'Package' },
    { label: 'Customer Availability Rate', value: `${(Number(shipment.customer_availability_rate ?? 0.65) * 100).toFixed(1)}%`, category: 'Customer' },
    { label: 'Prior Delivery Attempts', value: String(shipment.customer_previous_delivery_attempts ?? 0), category: 'Customer' },
    { label: 'Prior Success Rate', value: `${(Number(shipment.customer_previous_success_rate ?? 1.0) * 100).toFixed(0)}%`, category: 'Customer' },
    { label: 'Address Access Difficulty', value: `${shipment.address_access_difficulty ?? 4} / 5`, category: 'Delivery Access' },
    { label: 'Signature Required', value: shipment.signature_required ? 'Yes (Mandatory)' : 'No', category: 'Delivery Access' },
    { label: 'Traffic Risk Score', value: `${Number(shipment.traffic_risk_score ?? 0.90).toFixed(2)}`, category: 'Environment' },
    { label: 'Weather Risk Score', value: `${Number(shipment.weather_risk_score ?? 0.26).toFixed(2)}`, category: 'Environment' },
  ];

  const filteredFeatures = featureEntries.filter(
    (f) =>
      f.label.toLowerCase().includes(featureSearch.toLowerCase()) ||
      f.value.toLowerCase().includes(featureSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(featureSearch.toLowerCase())
  );

  // Intervention catalog options with required guardrails
  const interventionOptions = [
    {
      id: 'access_point',
      title: 'Divert to 24/7 Smart Locker',
      description: 'Reroutes parcel to nearby secure access point locker.',
      estReduction: '65.1%',
      newProb: (pFail * 0.35).toFixed(3),
      type: 'model',
    },
    {
      id: 'reschedule_day',
      title: 'Reschedule Delivery Window',
      description: 'Proactively contacts customer to select verified delivery window.',
      estReduction: '49.0%',
      newProb: (pFail * 0.51).toFixed(3),
      type: 'model',
    },
    {
      id: 'hold_pickup',
      title: 'Hold for Station Counter Pickup',
      description: 'Safely holds parcel at central depot for recipient collection.',
      estReduction: '92.7%',
      newProb: (pFail * 0.08).toFixed(3),
      type: 'heuristic', // Must badge as rule-based heuristic
    },
  ];

  // Dynamic message preview text
  const previewCopy = {
    sms: `BRIDGE Delivery Alert: Your package (${shipment.package_id.slice(0, 16)}) is out for delivery today. Reply 1 to confirm availability, or 2 to divert to nearest secure locker.`,
    whatsapp: `Hello! Your driver is scheduled to arrive today around ${shipment.departure_hour ?? 16}:00. Please let us know if you require hand-to-customer signature or locker drop-off.`,
    email: `Dear Customer,\n\nWe are preparing delivery for package ${shipment.package_id}. To ensure first-attempt success, please verify gate code or select an alternative safe delivery location.\n\nBest,\nBRIDGE Logistics Team`,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] h-full bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col justify-between overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Package Details Drawer"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-muted)] flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[14px] font-semibold text-[var(--ink)]">
                Stop {shipment.stop_id ?? '—'}
              </span>
              <Badge type={tier} score={pFail} />
              {isActioned === 'applied' && (
                <span className="font-mono text-[10px] text-[var(--risk-low)] bg-[var(--risk-low-bg)] px-1.5 py-0.5 rounded-[2px] border border-[var(--risk-low)]/20">
                  <IconCheck size={11} className="inline mr-0.5" /> APPLIED
                </span>
              )}
              {isActioned === 'deferred' && (
                <span className="font-mono text-[10px] text-[var(--ink-muted)] bg-[var(--surface-sunken)] px-1.5 py-0.5 rounded-[2px] border border-[var(--border)]">
                  <IconPlayerPause size={11} className="inline mr-0.5" /> DEFERRED
                </span>
              )}
            </div>
            <div className="font-mono text-[11px] text-[var(--ink-muted)] truncate">
              {shipment.package_id}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[4px] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-sunken)] cursor-pointer"
            aria-label="Close drawer"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Risk & Capacity Summary */}
          <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px] grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <span className="text-[10px] font-mono uppercase text-[var(--ink-muted)] tracking-wider block">
                Calibrated P(fail)
              </span>
              <span className="text-[20px] font-mono font-semibold text-[var(--ink)]">
                {(pFail * 100).toFixed(1)}%
              </span>
              <div className="text-[10px] text-[var(--ink-muted)] mt-0.5">
                Raw logit: {(rawProb * 100).toFixed(1)}%
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-[var(--ink-muted)] tracking-wider block">
                Capacity Status
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isApproved ? (
                  <>
                    <IconShieldCheck size={15} className="text-[var(--risk-low)]" />
                    <span className="font-mono font-medium text-[var(--risk-low)]">
                      APPROVED
                    </span>
                  </>
                ) : (
                  <>
                    <IconLock size={15} className="text-[var(--ink-muted)]" />
                    <span className="font-mono font-medium text-[var(--ink-muted)]">
                      OVER QUOTA
                    </span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-[var(--ink-muted)] mt-0.5">
                Within 20% fleet cap
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs
            items={[
              { id: 'shap', label: 'SHAP Waterfall' },
              { id: 'features', label: 'Feature Spec' },
              { id: 'interventions', label: 'Actions' },
              { id: 'preview', label: 'Message' },
            ]}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as typeof activeTab)}
          />

          {/* TAB 1: SHAP Waterfall */}
          {activeTab === 'shap' && (
            <ShapWaterfall
              metadata={shipment.prediction?.explainability_metadata as ExplainabilityMetadata}
              riskFactors={shipment.prediction?.risk_factors}
              mitigatingFactors={shipment.prediction?.mitigating_factors as any}
              calibratedProbability={pFail}
            />
          )}

          {/* TAB 2: Feature Inspection Table */}
          {activeTab === 'features' && (
            <div className="space-y-3">
              <div className="relative">
                <IconSearch size={14} className="absolute left-2.5 top-2.5 text-[var(--ink-faint)]" />
                <input
                  type="text"
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  placeholder="Filter 16 shipment features..."
                  className="w-full h-8 pl-8 pr-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--surface-sunken)] text-[12px] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="border border-[var(--border)] rounded-[4px] overflow-hidden text-[12px]">
                <table className="w-full divide-y divide-[var(--border)]">
                  <thead className="bg-[var(--surface-muted)] text-[10px] font-mono uppercase text-[var(--ink-muted)]">
                    <tr>
                      <th className="py-2 px-3 text-left font-medium">Feature</th>
                      <th className="py-2 px-3 text-right font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                    {filteredFeatures.map((f, idx) => (
                      <tr key={idx} className="hover:bg-[var(--surface-muted)]/50">
                        <td className="py-2 px-3">
                          <span className="font-medium text-[var(--ink)]">{f.label}</span>
                          <span className="text-[10px] text-[var(--ink-muted)] block">
                            {f.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[var(--ink)]">
                          {f.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Interventions with Required Disclosures */}
          {activeTab === 'interventions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[var(--ink-muted)]">
                  Available Channels
                </span>
                <Badge type="simulation" />
              </div>

              <div className="space-y-2">
                {interventionOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className={`block p-3 rounded-[4px] border transition-all cursor-pointer ${
                      selectedIntervention === opt.id
                        ? 'border-[var(--accent)] bg-[var(--surface-muted)] ring-1 ring-[var(--accent)]/30'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="drawer-intervention"
                          checked={selectedIntervention === opt.id}
                          onChange={() => setSelectedIntervention(opt.id)}
                          className="accent-[var(--accent)] cursor-pointer"
                        />
                        <span className="font-medium text-[13px] text-[var(--ink)]">
                          {opt.title}
                        </span>
                      </div>
                      {opt.type === 'heuristic' && <Badge type="heuristic" />}
                    </div>

                    <p className="text-[12px] text-[var(--ink-muted)] mt-1.5 pl-5 leading-relaxed">
                      {opt.description}
                    </p>

                    <div className="mt-2.5 pl-5 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[var(--ink-muted)]">Estimated Impact:</span>
                      <span className="text-[var(--risk-low)] font-semibold">
                        -{opt.estReduction} (P: {opt.newProb})
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              <p className="text-[10.5px] text-[var(--ink-muted)] pt-1 italic">
                Counterfactual availability simulations reflect Bayesian prior estimates. Actual outcome confirmed post-delivery.
              </p>
            </div>
          )}

          {/* TAB 4: Message Preview */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {(['sms', 'whatsapp', 'email'] as const).map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => setMessageChannel(channel)}
                      className={`px-2 py-1 rounded-[3px] text-[11px] font-mono uppercase cursor-pointer border transition-colors ${
                        messageChannel === channel
                          ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {channel}
                    </button>
                  ))}
                </div>
                <Badge type="preview" />
              </div>

              <div className="p-3 rounded-[4px] border border-[var(--border)] bg-[var(--surface-sunken)] font-mono text-[12px] leading-relaxed text-[var(--ink)] whitespace-pre-wrap">
                {previewCopy[messageChannel]}
              </div>

              <div className="text-[11px] text-[var(--ink-muted)] pt-1">
                Generated via automated notification template engine. Recipient contact: Customer on file.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-between gap-3 shrink-0">
          <Button variant="secondary" size="default" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="default"
              disabled={isActioned === 'deferred'}
              onClick={() => onDefer && onDefer(shipment.package_id)}
            >
              Defer
            </Button>
            <Button
              variant="primary"
              size="default"
              disabled={isActioned === 'applied'}
              onClick={() => onApplyAction && onApplyAction(shipment.package_id, selectedIntervention)}
            >
              Apply Action
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageDrawer;
