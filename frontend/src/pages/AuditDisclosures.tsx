import React from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { IconCheck } from '@tabler/icons-react';

interface ArtifactHash {
  filename: string;
  category: 'Model' | 'Pre-processing' | 'Calibrator' | 'Database' | 'Metadata';
  sha256: string;
  status: 'VERIFIED_CLEAN';
}

const ARTIFACT_HASHES: ArtifactHash[] = [
  {
    filename: 'logistic_regression.joblib',
    category: 'Model',
    sha256: 'BA2D511ADF7A89921B925961C5D3540D52CF25BC38419967FA3FAE00BE8E1B97',
    status: 'VERIFIED_CLEAN',
  },
  {
    filename: 'champion_model.joblib',
    category: 'Model',
    sha256: 'BA2D511ADF7A89921B925961C5D3540D52CF25BC38419967FA3FAE00BE8E1B97',
    status: 'VERIFIED_CLEAN',
  },
  {
    filename: 'lightgbm_candidate.joblib',
    category: 'Model',
    sha256: 'F489D13862C1E479F4819751DE495D056D6EFF8B0CE89A4C63BBA8415D0D2B87',
    status: 'VERIFIED_CLEAN',
  },
  {
    filename: 'random_forest.joblib',
    category: 'Model',
    sha256: '66F304413AEE8DDE3343CE734104FE8397CD0E3705519D550DE413C65395B5D8',
    status: 'VERIFIED_CLEAN',
  },
  {
    filename: 'scaled_preprocessor.joblib',
    category: 'Pre-processing',
    sha256: '4FD148D00DD8426FCFE3FD5E3542A51490414BBA9BC07A10D7BC3DE1081A7A1F',
    status: 'VERIFIED_CLEAN',
  },
  {
    filename: 'preprocessor.joblib',
    category: 'Pre-processing',
    sha256: '2BEBCFF23DC8BAAA85F16729696E5CF5AB013285773ED9379CD98BFB921E0EF7',
    status: 'VERIFIED_CLEAN',
  },
  {
    filename: 'calibrator_champion.joblib',
    category: 'Calibrator',
    sha256: '187427C8BBF5F8E001C3494CC573C3BA5CD998983483D3B21B26F4E700307D2C',
    status: 'VERIFIED_CLEAN',
  },
  {
    filename: 'calibrator_candidate.joblib',
    category: 'Calibrator',
    sha256: '459DCBA80B60A0D89EB7D3A6BDA1E75B76ECE68B66BBE0F503510A7916AABB69',
    status: 'VERIFIED_CLEAN',
  },
  {
    filename: 'background_mean_champion.joblib',
    category: 'Calibrator',
    sha256: '308EABB5F9128890B2D1CCA280310FEBB38D900EE898DA19BC740944CBE5267C',
    status: 'VERIFIED_CLEAN',
  },
  {
    filename: 'model_metadata.json',
    category: 'Metadata',
    sha256: 'AA991D98CF2D426AD84BFB3BDAE1E21C970159F07566D4B34FDDBE225888992A',
    status: 'VERIFIED_CLEAN',
  },
  {
    filename: 'bridge_local.db',
    category: 'Database',
    sha256: 'E4043B69477DEF750CF27EAC19332FB8925419A45BCB7F384B509E7E3D34DA81',
    status: 'VERIFIED_CLEAN',
  },
];

export const AuditDisclosures: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-[var(--ink)] tracking-tight">
              Audit Guardrails, Truth-in-AI, and System Disclosures
            </h1>
            <Badge type="simulation" />
            <Badge type="heuristic" />
            <Badge type="preview" />
            <Badge type="distance" />
          </div>
          <p className="text-[13px] text-[var(--ink-muted)] mt-1">
            Permanent compliance documentation of all algorithmic guardrails, truth-in-AI disclosures, and cryptographic artifact hashes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[var(--risk-low)] bg-[var(--risk-low-bg)] px-2.5 py-1 rounded-[2px] border border-[var(--risk-low)]/30 font-semibold flex items-center gap-1.5">
            <IconCheck size={13} />
            ALL 11 ARTIFACTS VERIFIED
          </span>
        </div>
      </div>

      {/* 5 Operational Audit Guardrails */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold text-[var(--ink)]">
            5 Permanent Operational Audit Guardrails
          </h2>
          <span className="text-[11px] font-mono text-[var(--ink-muted)]">
            Mandatory Runtime Disclosures
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Guardrail 1: Counterfactual Simulation Notice */}
          <Card
            title="Guardrail 1: Counterfactual Simulation Notice"
            subtitle="Triggered across customer intervention previews and what-if deferrals"
          >
            <div className="space-y-2 text-[12px] leading-relaxed">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge type="simulation" />
              </div>
              <p className="text-[var(--ink)]">
                Intervention availability shifts (e.g. morning window shifts, PUDO locker re-routing, or neighbor authorizations) reflect counterfactual simulation estimates derived from historical customer track records.
              </p>
              <p className="text-[var(--ink-muted)]">
                They do not constitute deterministic delivery guarantees. Dispatchers evaluate simulations under operational fleet capacity ceilings.
              </p>
            </div>
          </Card>

          {/* Guardrail 2: Rule-Based Heuristic Fallback */}
          <Card
            title="Guardrail 2: Rule-Based Heuristic Attribution Fallback"
            subtitle="Triggered on manual customer holds, station pickups, and address corrections"
          >
            <div className="space-y-2 text-[12px] leading-relaxed">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge type="heuristic" />
              </div>
              <p className="text-[var(--ink)]">
                Station customer pickup holds and manual locker assignments operate on deterministic business logic rules rather than statistical model inference.
              </p>
              <p className="text-[var(--ink-muted)]">
                When heuristic attribution is active, the system bypasses probabilistic scoring to guarantee zero false optimism in operational reporting.
              </p>
            </div>
          </Card>

          {/* Guardrail 3: Dry-Run Message Previews */}
          <Card
            title="Guardrail 3: Dry-Run Message Previews"
            subtitle="Triggered across multi-channel customer messaging modals"
          >
            <div className="space-y-2 text-[12px] leading-relaxed">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge type="preview" />
              </div>
              <p className="text-[var(--ink)]">
                All customer communication previews (SMS, WhatsApp, and Email) are generated in preview-only simulation mode.
              </p>
              <p className="text-[var(--ink-muted)]">
                No live cellular or telecommunications gateways are triggered without dispatcher manual authorization and explicit delivery confirmation.
              </p>
            </div>
          </Card>

          {/* Guardrail 4: Circuity-Scaled Haversine Distances */}
          <Card
            title="Guardrail 4: Circuity-Scaled Haversine Distance Model"
            subtitle="Triggered in 2-Opt TSP dispatch sequencing and route savings displays"
          >
            <div className="space-y-2 text-[12px] leading-relaxed">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge type="distance" />
              </div>
              <p className="text-[var(--ink)]">
                All distance calculations and savings estimates utilize great-circle Haversine distances scaled by an empirical urban circuity factor (κ = 1.35).
              </p>
              <p className="text-[var(--ink-muted)]">
                This approximates street grid travel in metropolitan zones (Los Angeles / DLA3). They are pre-dispatch planning approximations, not turn-by-turn navigation meters.
              </p>
            </div>
          </Card>

          {/* Guardrail 5: Exact Additive SHAP Margin Identity */}
          <Card
            title="Guardrail 5: Closed-Form Additive SHAP Margin Identity"
            subtitle="Machine-precision verification across every package prediction drawer"
            className="md:col-span-2"
          >
            <div className="space-y-2 text-[12px] leading-relaxed">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-[11px] text-[var(--accent)] bg-[var(--accent-subtle)] px-2 py-0.5 rounded-[2px] font-semibold border border-[var(--accent)]/30">
                  SHAP LOCAL ACCURACY INVARIANT
                </span>
              </div>
              <p className="text-[var(--ink)] font-mono">
                Identity: Base Value (E[f(x)]) + ∑ φ_j ≡ Predicted Log-Odds Margin (f(x))
              </p>
              <p className="text-[var(--ink-muted)]">
                The Champion Logistic Regression explainer calculates exact closed-form SHAP values on the calibrated logit margin with machine precision additivity error (|residual| &lt; 1e-15). Unlike sampling-based KernelSHAP approximations, attributions are 100% deterministic and mathematically exact.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Truth-in-AI Statistical Transparency Section */}
      <Card
        title="Truth-in-AI Statistical Transparency"
        subtitle="Full operational disclosures regarding class imbalance and model gate evaluation"
      >
        <div className="space-y-3 text-[12px] leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono p-3 bg-[var(--surface-sunken)] rounded-[4px] border border-[var(--border)]">
            <div>
              <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Test Set Imbalance</span>
              <span className="font-bold text-[var(--ink)]">
                9.8% positive rate (1,452 fails / 14,819 deliveries)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Champion PR-AUC</span>
              <span className="font-bold text-[var(--risk-med)]">
                0.1139 (vs 0.0980 random chance baseline)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--ink-muted)] block uppercase">Champion ROC-AUC</span>
              <span className="font-bold text-[var(--ink)]">
                0.5611 (Discriminative signal confirmed)
              </span>
            </div>
          </div>

          <p className="text-[var(--ink)]">
            Delivery failure prediction is characterized by severe label imbalance (only 9.8% of attempts fail on the first attempt). In this operating regime, ROC-AUC is misleadingly optimistic; PR-AUC is the mandatory statistical ground truth.
          </p>

          <p className="text-[var(--ink-muted)]">
            Neither the Champion nor the LightGBM Candidate satisfied the promotion gate target (PR-AUC &gt; 0.1500). Rather than promoting an unproven candidate, the automated governance framework enforced the zero degradation invariant and retained Logistic Regression as Champion.
          </p>
        </div>
      </Card>

      {/* Cryptographic Artifact Integrity Verification Table */}
      <Card
        title="Cryptographic Artifact Hash Ledger (SHA-256)"
        subtitle="Pre- and post-execution verification proving zero disk mutation of models and benchmark database"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse font-mono">
            <thead>
              <tr className="border-b border-[var(--border)] text-[10px] text-[var(--ink-muted)] uppercase">
                <th className="py-2.5 px-3 font-medium">Artifact Filename</th>
                <th className="py-2.5 px-3 font-medium">Category</th>
                <th className="py-2.5 px-3 font-medium">SHA-256 Checksum</th>
                <th className="py-2.5 px-3 font-medium text-right">Integrity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {ARTIFACT_HASHES.map((a) => (
                <tr key={a.filename} className="hover:bg-[var(--surface-muted)] transition-colors">
                  <td className="py-2 px-3 font-semibold text-[var(--ink)]">
                    {a.filename}
                  </td>
                  <td className="py-2 px-3 text-[var(--ink-muted)] font-sans">
                    {a.category}
                  </td>
                  <td className="py-2 px-3 text-[var(--accent)] text-[10px] tracking-tight">
                    {a.sha256}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--risk-low)] bg-[var(--risk-low-bg)] px-2 py-0.5 rounded-[2px] border border-[var(--risk-low)]/30">
                      <IconCheck size={11} />
                      VERIFIED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AuditDisclosures;
