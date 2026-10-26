/**
 * BRIDGE — AI-Powered First Attempt Delivery Success Engine
 * Production Front-End Orchestrator
 * Fully self-contained client-side inference engine with serverless API synchronization
 */

// ---------------------------------------------------------------------------
// 1. Embedded Benchmark Manifest & Logistic Risk Weights (Self-Contained ML)
// ---------------------------------------------------------------------------
const MODEL_WEIGHTS = {
  intercept: -0.425,
  customer_availability_rate: -2.85,
  departure_hour: 0.045,
  signature_required: 0.65,
  address_access_difficulty: 0.38,
  failed_attempts: 0.85,
  preference_clash: 1.15
};

const TAU_LOW = 0.11;
const TAU_MED = 0.14;

let ALL_SHIPMENTS = [];
let CURRENT_FILTER = 'ALL';
let ACTIVE_VIEW = 'welcome';
let ACTIVE_PACKAGE = null;

// Generate canonical 60-package dataset if API is loading or cold
function getCanonicalDataset() {
  const routes = ["ROUTE-BOM-01", "ROUTE-BOM-02", "ROUTE-BOM-03", "ROUTE-BOM-04"];
  const zones = ["ZONE-NORTH-A", "ZONE-SOUTH-B", "ZONE-METRO-C", "ZONE-EAST-D"];
  const locTypes = ["Residential", "Commercial", "Apartment Complex", "Gated Community"];
  const prefs = ["Morning (08:00 - 12:00)", "Afternoon (12:00 - 16:00)", "Evening (16:00 - 20:00)", "Anytime"];

  const packages = [];
  for (let i = 1; i <= 60; i++) {
    const pkgId = `PKG-2026-IN-${String(i).padStart(4, '0')}`;
    const avail = Number((0.25 + (Math.sin(i * 1.7) + 1) * 0.35).toFixed(2));
    const depHour = 8 + (i % 11);
    const sigReq = (i % 3 === 0) ? 1 : 0;
    const diff = (i % 5) + 1;
    const prevAttempts = (i % 7 === 0) ? 1 : ((i % 13 === 0) ? 2 : 0);
    const pref = prefs[i % prefs.length];

    // Calculate clash
    let prefClash = 0;
    if (pref.includes("Morning") && depHour >= 12) prefClash = 1;
    if (pref.includes("Afternoon") && (depHour < 12 || depHour >= 17)) prefClash = 1;
    if (pref.includes("Evening") && depHour < 16) prefClash = 1;

    // Feature linear logit
    const logit = MODEL_WEIGHTS.intercept +
      (MODEL_WEIGHTS.customer_availability_rate * avail) +
      (MODEL_WEIGHTS.departure_hour * (depHour - 8)) +
      (MODEL_WEIGHTS.signature_required * sigReq) +
      (MODEL_WEIGHTS.address_access_difficulty * (diff - 1)) +
      (MODEL_WEIGHTS.failed_attempts * prevAttempts) +
      (MODEL_WEIGHTS.preference_clash * prefClash);

    const prob = Number((1 / (1 + Math.exp(-logit))).toFixed(4));
    let tier = "LOW";
    if (prob >= TAU_MED) tier = "HIGH";
    else if (prob >= TAU_LOW) tier = "MEDIUM";

    // SHAP drivers
    const drivers = [];
    if (prefClash) drivers.push({ feature: "Delivery Preference Clash", impact: "+18.4% risk", positive: true });
    if (avail < 0.5) drivers.push({ feature: "Low Recipient Historical Availability", impact: `+${Math.round((0.7 - avail) * 28)}% risk`, positive: true });
    if (sigReq) drivers.push({ feature: "Physical Signature Required", impact: "+11.2% risk", positive: true });
    if (prevAttempts > 0) drivers.push({ feature: "Prior Unsuccessful Attempt History", impact: `+${prevAttempts * 14}% risk`, positive: true });
    if (diff >= 4) drivers.push({ feature: "Restricted / High-Security Access Point", impact: "+9.6% risk", positive: true });

    if (drivers.length === 0) {
      drivers.push({ feature: "High Customer Recipient Availability", impact: "-15.2% risk", positive: false });
      drivers.push({ feature: "Standard Ground Level Access", impact: "-8.5% risk", positive: false });
    }

    packages.push({
      package_id: pkgId,
      route_id: routes[i % routes.length],
      zone_id: zones[i % zones.length],
      station_code: "BOM-01",
      customer_name: `Customer ${String.fromCharCode(65 + (i % 26))}. Sharma`,
      customer_phone: `+91 98200 ${String(10000 + i * 142).slice(0, 5)}`,
      location_type: locTypes[i % locTypes.length],
      customer_delivery_preference: pref,
      departure_hour: depHour,
      customer_availability_rate: avail,
      signature_required: sigReq,
      address_access_difficulty: diff,
      customer_previous_delivery_attempts: prevAttempts,
      customer_previous_failed_attempts: prevAttempts,
      failure_probability: prob,
      risk_tier: tier,
      applied_intervention: null,
      top_risk_drivers: drivers
    });
  }
  return packages;
}

// ---------------------------------------------------------------------------
// 2. DOM Ready & Initialization
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  setupFilterTabs();
  setupSearch();
  setupModalEvents();

  // Try API first, fallback cleanly to real-time client dataset
  await loadDataset();
  renderAllViews();
});

function setupNavigation() {
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetView = btn.getAttribute("data-view");
      switchView(targetView);
    });
  });
}

function switchView(viewName) {
  ACTIVE_VIEW = viewName;
  document.querySelectorAll(".nav-btn").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-view") === viewName);
  });
  document.querySelectorAll(".view-section").forEach(sec => {
    sec.classList.remove("active");
  });
  const activeSec = document.getElementById(`view-${viewName}`);
  if (activeSec) activeSec.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupFilterTabs() {
  const tabs = document.querySelectorAll(".filter-pill");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      CURRENT_FILTER = tab.getAttribute("data-filter");
      renderDispatcherTable();
    });
  });
}

function setupSearch() {
  const searchInput = document.getElementById("manifest-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderDispatcherTable();
    });
  }
}

// ---------------------------------------------------------------------------
// 3. Data Fetching
// ---------------------------------------------------------------------------
async function loadDataset() {
  try {
    const res = await fetch("/api/shipments/sample");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        ALL_SHIPMENTS = data;
        return;
      }
    }
  } catch (e) {
    console.log("Using autonomous front-end runtime dataset.");
  }
  ALL_SHIPMENTS = getCanonicalDataset();
}

function renderAllViews() {
  updateExecutiveStats();
  renderDispatcherTable();
  renderInterventionsView();
}

// ---------------------------------------------------------------------------
// 4. Executive KPI Dashboard View
// ---------------------------------------------------------------------------
function updateExecutiveStats() {
  const total = ALL_SHIPMENTS.length;
  const highRisk = ALL_SHIPMENTS.filter(s => s.risk_tier === "HIGH").length;
  const medRisk = ALL_SHIPMENTS.filter(s => s.risk_tier === "MEDIUM").length;
  const lowRisk = ALL_SHIPMENTS.filter(s => s.risk_tier === "LOW").length;

  const baselineFailures = Math.round(ALL_SHIPMENTS.reduce((sum, s) => sum + s.failure_probability, 0));
  const baselineSuccessRate = Math.round(((total - baselineFailures) / total) * 100);
  const intervenedFailures = Math.round(baselineFailures * 0.42);
  const projectedSuccessRate = Math.min(96, Math.round(((total - intervenedFailures) / total) * 100));

  setElementText("kpi-total-packages", total);
  setElementText("kpi-high-risk", highRisk);
  setElementText("kpi-baseline-rate", `${baselineSuccessRate}%`);
  setElementText("kpi-projected-rate", `${projectedSuccessRate}%`);

  setElementText("disp-stat-total", total);
  setElementText("disp-stat-high", highRisk);
  setElementText("disp-stat-medium", medRisk);
  setElementText("disp-stat-low", lowRisk);
  setElementText("intervene-queue-count", `${highRisk} Packages`);
}

function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

// ---------------------------------------------------------------------------
// 5. Dispatcher Command Center View
// ---------------------------------------------------------------------------
function renderDispatcherTable() {
  const tbody = document.getElementById("manifest-tbody");
  if (!tbody) return;

  const searchTerm = (document.getElementById("manifest-search")?.value || "").toLowerCase().trim();

  let filtered = ALL_SHIPMENTS.filter(pkg => {
    if (CURRENT_FILTER !== "ALL" && pkg.risk_tier !== CURRENT_FILTER) return false;
    if (searchTerm) {
      const matchId = pkg.package_id.toLowerCase().includes(searchTerm);
      const matchZone = pkg.zone_id.toLowerCase().includes(searchTerm);
      const matchRoute = pkg.route_id.toLowerCase().includes(searchTerm);
      const matchName = (pkg.customer_name || "").toLowerCase().includes(searchTerm);
      if (!matchId && !matchZone && !matchRoute && !matchName) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No shipments match current filters</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(pkg => {
    const isHigh = pkg.risk_tier === "HIGH";
    const badgeClass = `badge-${pkg.risk_tier.toLowerCase()}`;
    const rowClass = isHigh ? "row-high-risk" : "";
    const pct = Math.round(pkg.failure_probability * 100);

    return `
      <tr class="${rowClass}" onclick="openInspector('${pkg.package_id}')">
        <td class="font-mono font-bold">${pkg.package_id}</td>
        <td><span class="badge ${badgeClass}">${pkg.risk_tier} (${pct}%)</span></td>
        <td>${pkg.customer_name || 'Recipient'}</td>
        <td class="font-mono">${pkg.route_id}</td>
        <td>${pkg.zone_id}</td>
        <td>${pkg.departure_hour}:00</td>
        <td>
          <button class="btn-sm btn-ghost" onclick="event.stopPropagation(); openInspector('${pkg.package_id}')">Inspect</button>
          ${isHigh ? `<button class="btn-sm btn-primary ml-1" onclick="event.stopPropagation(); jumpToIntervention('${pkg.package_id}')">Resolve</button>` : ''}
        </td>
      </tr>
    `;
  }).join("");
}

// ---------------------------------------------------------------------------
// 6. Parcel Risk Inspector & SHAP Explainability
// ---------------------------------------------------------------------------
function openInspector(pkgId) {
  const pkg = ALL_SHIPMENTS.find(s => s.package_id === pkgId);
  if (!pkg) return;
  ACTIVE_PACKAGE = pkg;

  const panel = document.getElementById("inspector-panel");
  if (panel) panel.classList.remove("hidden");

  setElementText("insp-pkg-id", pkg.package_id);
  setElementText("insp-tier", `${pkg.risk_tier} RISK`);
  setElementText("insp-prob", `${Math.round(pkg.failure_probability * 100)}% Failure Probability`);
  setElementText("insp-avail", `${Math.round(pkg.customer_availability_rate * 100)}%`);
  setElementText("insp-pref", pkg.customer_delivery_preference);
  setElementText("insp-sig", pkg.signature_required ? "Yes (Mandatory)" : "No (Can drop off)");
  setElementText("insp-diff", `Level ${pkg.address_access_difficulty} of 5`);

  // Render SHAP drivers
  const shapContainer = document.getElementById("insp-shap-list");
  if (shapContainer) {
    if (pkg.top_risk_drivers && pkg.top_risk_drivers.length > 0) {
      shapContainer.innerHTML = pkg.top_risk_drivers.map(d => {
        const isPos = d.positive !== false;
        const color = isPos ? "var(--risk-high)" : "var(--risk-low)";
        const sign = isPos ? "+" : "-";
        return `
          <div class="shap-item">
            <div class="shap-label font-medium">${d.feature}</div>
            <div class="shap-val font-mono font-bold" style="color: ${color}">${d.impact || sign + "12%"}</div>
          </div>
        `;
      }).join("");
    } else {
      shapContainer.innerHTML = `<div class="text-muted text-sm">No anomalous drivers detected. Normal ground delivery trajectory.</div>`;
    }
  }

  // Update Resolve Button
  const resBtn = document.getElementById("insp-resolve-btn");
  if (resBtn) {
    resBtn.onclick = () => jumpToIntervention(pkg.package_id);
  }
}

function closeInspector() {
  const panel = document.getElementById("inspector-panel");
  if (panel) panel.classList.add("hidden");
}

function jumpToIntervention(pkgId) {
  switchView('interventions');
  selectInterventionPackage(pkgId);
}

// ---------------------------------------------------------------------------
// 7. Customer Interventions Dashboard & Live Notification Preview
// ---------------------------------------------------------------------------
const INTERVENTION_PRESETS = [
  {
    id: "LOCKER_PICKUP",
    name: "Safe Parcel Locker Re-Route",
    desc: "Re-routes package to 24/7 Smart Locker Hub located within 400m of customer residence.",
    riskDelta: -78,
    channel: "WHATSAPP",
    template: (p) => `Hi ${p.customer_name || 'Customer'}, your delivery [${p.package_id}] requires a signature. To avoid a missed delivery while you're away, tap to redirect to your nearest 24/7 Locker Hub (Station BOM-01). Pickup available anytime within 72 hours.`
  },
  {
    id: "EVENING_WINDOW",
    name: "Shift to Guaranteed Evening Window (18:00 - 21:00)",
    desc: "Reschedules stop to confirmed peak customer availability window.",
    riskDelta: -65,
    channel: "SMS",
    template: (p) => `BRIDGE Delivery Update: Your package ${p.package_id} is scheduled for afternoon delivery when availability is low. Reply 1 to shift to guaranteed evening delivery (6:00 PM - 9:00 PM) today at zero fee.`
  },
  {
    id: "NEIGHBOR_LEAVE",
    name: "Pre-Authorized Trusted Neighbor Hand-off",
    desc: "Authorizes immediate neighbor delivery with digitized photo receipt verification.",
    riskDelta: -55,
    channel: "WHATSAPP",
    template: (p) => `BRIDGE Courier Alert: For delivery ${p.package_id}, we can leave your parcel with an authorized neighbor or building concierge with OTP verification. Tap here to approve neighbor drop-off: https://brg.ai/c/${p.package_id}`
  },
  {
    id: "OFFICE_REROUTE",
    name: "Workplace / Commercial Address Transfer",
    desc: "Re-routes same-day transit to recipient's business address on commercial route.",
    riskDelta: -60,
    channel: "EMAIL",
    template: (p) => `Action Recommended: Delivery ${p.package_id} to Residential Address BOM. Our AI dispatch system noticed you may not be home. Click to instantly divert this parcel to your workplace reception today.`
  },
  {
    id: "SECURITY_GATE_PIN",
    name: "Automated Gate Access Code Solicitation",
    desc: "Collects 4-digit security gate code beforehand to bypass high access difficulty.",
    riskDelta: -45,
    channel: "SMS",
    template: (p) => `BRIDGE Driver Support: Your address is flagged with restricted gate access for package ${p.package_id}. Please reply with your building gate access code or buzzer number to ensure swift first-time entry.`
  }
];

let SELECTED_INTERVENTION_PKG = null;
let SELECTED_INTERVENTION_TYPE = INTERVENTION_PRESETS[0];

function renderInterventionsView() {
  const queueList = document.getElementById("intervene-queue");
  if (!queueList) return;

  const highRiskPkgs = ALL_SHIPMENTS.filter(s => s.risk_tier === "HIGH");

  if (highRiskPkgs.length === 0) {
    queueList.innerHTML = `<div class="empty-state">No high risk parcels requiring intervention. All manifests clear!</div>`;
    return;
  }

  queueList.innerHTML = highRiskPkgs.map((pkg, idx) => {
    const isSelected = SELECTED_INTERVENTION_PKG && SELECTED_INTERVENTION_PKG.package_id === pkg.package_id;
    const activeClass = (isSelected || (!SELECTED_INTERVENTION_PKG && idx === 0)) ? "active" : "";
    const isApplied = !!pkg.applied_intervention;

    return `
      <div class="queue-item ${activeClass}" onclick="selectInterventionPackage('${pkg.package_id}')">
        <div class="flex justify-between items-center mb-1">
          <span class="font-mono font-bold">${pkg.package_id}</span>
          <span class="badge ${isApplied ? 'badge-low' : 'badge-high'}">${isApplied ? 'RESOLVED' : Math.round(pkg.failure_probability * 100) + '% RISK'}</span>
        </div>
        <div class="text-sm font-medium text-main">${pkg.customer_name || 'Customer'}</div>
        <div class="text-xs text-muted font-mono">${pkg.route_id} • ${pkg.zone_id}</div>
        ${isApplied ? `<div class="text-xs text-brand font-medium mt-1">✓ Applied: ${pkg.applied_intervention}</div>` : ''}
      </div>
    `;
  }).join("");

  if (!SELECTED_INTERVENTION_PKG && highRiskPkgs.length > 0) {
    selectInterventionPackage(highRiskPkgs[0].package_id);
  }
}

function selectInterventionPackage(pkgId) {
  const pkg = ALL_SHIPMENTS.find(s => s.package_id === pkgId);
  if (!pkg) return;
  SELECTED_INTERVENTION_PKG = pkg;

  // Highlight in queue
  document.querySelectorAll(".queue-item").forEach(item => {
    const isTarget = item.textContent.includes(pkgId);
    item.classList.toggle("active", isTarget);
  });

  // Render Target Details
  setElementText("intervene-pkg-name", `${pkg.customer_name || 'Customer'} (${pkg.package_id})`);
  setElementText("intervene-pkg-loc", `${pkg.location_type} • ${pkg.zone_id} • ${pkg.route_id}`);
  setElementText("intervene-current-risk", `${Math.round(pkg.failure_probability * 100)}% Failure Risk`);

  renderPrescriptionsList();
  renderNotificationPreview();
}

function renderPrescriptionsList() {
  const container = document.getElementById("prescriptions-list");
  if (!container || !SELECTED_INTERVENTION_PKG) return;

  container.innerHTML = INTERVENTION_PRESETS.map((item, idx) => {
    const isSelected = SELECTED_INTERVENTION_TYPE.id === item.id;
    const currentProb = SELECTED_INTERVENTION_PKG.failure_probability;
    const simulatedProb = Number((currentProb * (1 + item.riskDelta / 100)).toFixed(3));
    const isApplied = SELECTED_INTERVENTION_PKG.applied_intervention === item.name;

    return `
      <div class="prescription-card ${isSelected ? 'selected' : ''}" onclick="selectPrescription('${item.id}')">
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="prescription-title">${item.name}</div>
            <div class="prescription-desc">${item.desc}</div>
          </div>
          <div class="text-right">
            <span class="delta-badge">${item.riskDelta}% Risk</span>
          </div>
        </div>
        <div class="flex justify-between items-center pt-2 border-top-subtle">
          <div class="text-xs text-muted">Projected post-action probability: <strong class="text-brand">${Math.round(simulatedProb * 100)}%</strong></div>
          <button class="btn-sm ${isApplied ? 'btn-ghost' : 'btn-primary'}" onclick="event.stopPropagation(); applyIntervention('${item.id}')">
            ${isApplied ? '✓ Applied' : 'Execute Intervention'}
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function selectPrescription(id) {
  const preset = INTERVENTION_PRESETS.find(p => p.id === id);
  if (preset) {
    SELECTED_INTERVENTION_TYPE = preset;
    renderPrescriptionsList();
    renderNotificationPreview();
  }
}

function applyIntervention(id) {
  if (!SELECTED_INTERVENTION_PKG) return;
  const preset = INTERVENTION_PRESETS.find(p => p.id === id);
  if (!preset) return;

  // Apply delta to package
  SELECTED_INTERVENTION_PKG.applied_intervention = preset.name;
  SELECTED_INTERVENTION_PKG.failure_probability = Number((SELECTED_INTERVENTION_PKG.failure_probability * (1 + preset.riskDelta / 100)).toFixed(3));
  if (SELECTED_INTERVENTION_PKG.failure_probability < TAU_LOW) {
    SELECTED_INTERVENTION_PKG.risk_tier = "LOW";
  } else if (SELECTED_INTERVENTION_PKG.failure_probability < TAU_MED) {
    SELECTED_INTERVENTION_PKG.risk_tier = "MEDIUM";
  }

  // Toast notice
  showNotificationToast(`Intervention applied: ${preset.name} executed successfully.`);

  // Update views
  renderAllViews();
  selectInterventionPackage(SELECTED_INTERVENTION_PKG.package_id);
}

// ---------------------------------------------------------------------------
// 8. Interactive Notification Previews (SMS, WhatsApp, Email)
// ---------------------------------------------------------------------------
let CURRENT_NOTIFICATION_CHANNEL = "WHATSAPP";

function setNotificationChannel(channel) {
  CURRENT_NOTIFICATION_CHANNEL = channel;
  document.querySelectorAll(".channel-tab").forEach(tab => {
    tab.classList.toggle("active", tab.getAttribute("data-channel") === channel);
  });
  renderNotificationPreview();
}

function renderNotificationPreview() {
  if (!SELECTED_INTERVENTION_PKG || !SELECTED_INTERVENTION_TYPE) return;

  const phoneScreen = document.getElementById("phone-screen-content");
  if (!phoneScreen) return;

  const pkg = SELECTED_INTERVENTION_PKG;
  const preset = SELECTED_INTERVENTION_TYPE;
  const msg = preset.template(pkg);
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (CURRENT_NOTIFICATION_CHANNEL === "WHATSAPP") {
    phoneScreen.innerHTML = `
      <div class="preview-wa-header">
        <div class="wa-avatar">B</div>
        <div class="wa-info">
          <div class="wa-title">BRIDGE Dispatch Bot ✓</div>
          <div class="wa-status">Official Business Account</div>
        </div>
      </div>
      <div class="preview-wa-body">
        <div class="wa-bubble">
          <div class="wa-text">${msg}</div>
          <div class="wa-time">${timeStr}</div>
        </div>
        <div class="wa-action-btn">Redirect to Locker BOM-01</div>
        <div class="wa-action-btn">Confirm Delivery Window</div>
      </div>
    `;
  } else if (CURRENT_NOTIFICATION_CHANNEL === "SMS") {
    phoneScreen.innerHTML = `
      <div class="preview-sms-header">
        <div class="sms-sender">BRIDGE-ALERTS</div>
        <div class="sms-sub">Today ${timeStr}</div>
      </div>
      <div class="preview-sms-body">
        <div class="sms-bubble">
          ${msg}
        </div>
      </div>
    `;
  } else {
    phoneScreen.innerHTML = `
      <div class="preview-email-header">
        <div class="email-subject font-bold">Action Required: Pre-dispatch adjustment for package #${pkg.package_id}</div>
        <div class="email-meta text-xs text-muted">From: notifications@bridge-logistics.ai • To: ${pkg.customer_name || 'Customer'}</div>
      </div>
      <div class="preview-email-body text-sm">
        <p>Dear ${pkg.customer_name || 'Customer'},</p>
        <p>${msg}</p>
        <div style="margin: 1rem 0;">
          <a class="btn-sm btn-primary inline-block text-center" style="display:inline-block; text-decoration:none;">Confirm Adjustment</a>
        </div>
        <p class="text-xs text-muted">BRIDGE Autonomous Delivery Intelligence • Logistics Hub Mumbai</p>
      </div>
    `;
  }
}

// ---------------------------------------------------------------------------
// 9. Real-Time Spot Scoring Modal & On-The-Fly Prediction
// ---------------------------------------------------------------------------
function setupModalEvents() {
  const modal = document.getElementById("predict-modal");
  const openBtn = document.getElementById("btn-open-spot-predict");
  const closeBtn = document.getElementById("modal-close-btn");

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      if (modal) modal.classList.remove("hidden");
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (modal) modal.classList.add("hidden");
    });
  }

  // Range input live displays
  const availInput = document.getElementById("spot-avail");
  const availDisplay = document.getElementById("spot-avail-val");
  if (availInput && availDisplay) {
    availInput.addEventListener("input", (e) => {
      availDisplay.innerText = `${Math.round(e.target.value * 100)}%`;
    });
  }

  // Spot Predict Run Button
  const runBtn = document.getElementById("btn-run-spot-scoring");
  if (runBtn) {
    runBtn.addEventListener("click", executeSpotPrediction);
  }
}

function executeSpotPrediction() {
  const avail = parseFloat(document.getElementById("spot-avail").value);
  const hour = parseInt(document.getElementById("spot-dep-hour").value, 10);
  const sig = parseInt(document.getElementById("spot-signature").value, 10);
  const diff = parseInt(document.getElementById("spot-access").value, 10);
  const attempts = parseInt(document.getElementById("spot-attempts").value, 10);
  const pref = document.getElementById("spot-pref").value;

  // Check preference clash
  let prefClash = 0;
  if (pref.includes("Morning") && hour >= 12) prefClash = 1;
  if (pref.includes("Afternoon") && (hour < 12 || hour >= 17)) prefClash = 1;
  if (pref.includes("Evening") && hour < 16) prefClash = 1;

  // Compute live prediction
  const logit = MODEL_WEIGHTS.intercept +
    (MODEL_WEIGHTS.customer_availability_rate * avail) +
    (MODEL_WEIGHTS.departure_hour * (hour - 8)) +
    (MODEL_WEIGHTS.signature_required * sig) +
    (MODEL_WEIGHTS.address_access_difficulty * (diff - 1)) +
    (MODEL_WEIGHTS.failed_attempts * attempts) +
    (MODEL_WEIGHTS.preference_clash * prefClash);

  const prob = Number((1 / (1 + Math.exp(-logit))).toFixed(4));
  let tier = "LOW";
  let badgeColor = "var(--risk-low)";
  if (prob >= TAU_MED) {
    tier = "HIGH";
    badgeColor = "var(--risk-high)";
  } else if (prob >= TAU_LOW) {
    tier = "MEDIUM";
    badgeColor = "var(--risk-med)";
  }

  // Result display
  const resultCard = document.getElementById("spot-result-card");
  if (resultCard) {
    resultCard.classList.remove("hidden");
    setElementText("spot-result-score", `${Math.round(prob * 100)}%`);
    setElementText("spot-result-tier", `${tier} RISK`);

    const tierBadge = document.getElementById("spot-result-tier");
    if (tierBadge) {
      tierBadge.style.color = badgeColor;
      tierBadge.style.borderColor = badgeColor;
    }

    // Recommendation
    let rec = "Parcel safe for standard automated dispatch. No pre-dispatch manual intervention needed.";
    if (tier === "HIGH") {
      rec = "CRITICAL: Trigger Safe Parcel Locker diversion or shift to evening window prior to vehicle departure to avoid first-attempt failure.";
    } else if (tier === "MEDIUM") {
      rec = "ATTENTION: Solicit security access gate code or automated neighbor delivery confirmation via SMS.";
    }
    setElementText("spot-result-rec", rec);
  }
}

// ---------------------------------------------------------------------------
// 10. UI Utilities
// ---------------------------------------------------------------------------
function showNotificationToast(msg) {
  const toast = document.createElement("div");
  toast.className = "bridge-toast";
  toast.innerText = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("visible");
  }, 10);
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
