// BRIDGE — Enterprise UI Logic
// Directly integrates with backend endpoints:
// - GET /api/shipments/sample
// - GET /api/dashboard/stats
// - POST /api/predict
// - POST /api/intervene/simulate
// - POST /api/intervene/apply
// - POST /api/messaging/preview

let shipments = [];
let selectedShipment = null;
let currentFilter = 'ALL';
let currentChannel = 'SMS';
let currentSimulatedOptions = [];
let selectedOption = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadData();
});

function setupTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const targetId = `view-${tab.dataset.tab}`;
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add('active');
    });
  });
}

function switchTab(tabName) {
  const tab = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
  if (tab) tab.click();
}

// ---------------------------------------------------------------------------
// DATA LOADING
// ---------------------------------------------------------------------------
async function loadData() {
  try {
    const [statsRes, shipRes] = await Promise.all([
      fetch('/api/dashboard/stats'),
      fetch('/api/shipments/sample')
    ]);

    if (statsRes.ok) {
      const stats = await statsRes.json();
      renderStats(stats);
    }

    if (shipRes.ok) {
      const data = await shipRes.json();
      shipments = data.shipments || [];
      renderShipmentsTable(shipments);
      renderInterventionsSidebar(shipments);
      if (shipments.length > 0) {
        selectShipment(shipments[0]);
      }
    }
  } catch (err) {
    console.error("Failed to load live data:", err);
  }
}

function renderStats(stats) {
  const highRisk = stats.high_risk_count ?? 6;
  const total = stats.total_packages_evaluated ?? 60;
  const approved = stats.capacity_approved_count ?? 6;
  const lowCount = stats.low_risk_count ?? 45;
  const medCount = stats.med_risk_count ?? 9;

  document.getElementById('kpi-total-parcels').textContent = total;
  document.getElementById('kpi-high-risk-val').textContent = highRisk;
  document.getElementById('high-risk-badge').textContent = `${highRisk} HIGH`;
  
  document.getElementById('d-total-count').textContent = total;
  document.getElementById('d-high-risk-count').textContent = highRisk;
  document.getElementById('d-med-risk-count').textContent = medCount;
  document.getElementById('d-low-risk-count').textContent = lowCount;
  document.getElementById('d-approved-cap-count').textContent = approved;
}

// ---------------------------------------------------------------------------
// DISPATCHER TABLE & INSPECTOR
// ---------------------------------------------------------------------------
function renderShipmentsTable(items) {
  const tbody = document.getElementById('shipments-tbody');
  tbody.innerHTML = '';

  const filtered = items.filter(s => {
    if (currentFilter === 'ALL') return true;
    return (s.prediction?.risk_tier || 'LOW') === currentFilter;
  });

  filtered.forEach(s => {
    const tr = document.createElement('tr');
    const pred = s.prediction || {};
    const riskTier = pred.risk_tier || 'LOW';
    const prob = (pred.failure_probability != null) ? (pred.failure_probability * 100).toFixed(1) : '--';
    const isApproved = pred.capacity_approved;

    if (selectedShipment && selectedShipment.package_id === s.package_id) {
      tr.classList.add('selected');
    }

    tr.innerHTML = `
      <td><span class="pkg-code">${s.package_id ? s.package_id.substring(0, 16) : 'PKG-DEFAULT'}</span></td>
      <td><strong>${s.station_code || 'DLA3'}</strong></td>
      <td>${s.customer_delivery_preference || 'Anytime'}</td>
      <td>${((s.customer_availability_rate || 0.8) * 100).toFixed(0)}%</td>
      <td>${s.signature_required ? '<span style="color:#F87171;font-weight:700">Req (1)</span>' : 'No (0)'}</td>
      <td>${s.address_access_difficulty || 1}/5</td>
      <td><span class="risk-badge ${riskTier}">${prob}% (${riskTier})</span></td>
      <td><span class="policy-badge ${isApproved ? 'approved' : 'deferred'}">${pred.capacity_status || 'STANDARD'}</span></td>
      <td>
        <button class="filter-btn" onclick="event.stopPropagation(); inspectAndJump('${s.package_id}')">
          Intervene &rarr;
        </button>
      </td>
    `;

    tr.addEventListener('click', () => {
      document.querySelectorAll('#shipments-tbody tr').forEach(r => r.classList.remove('selected'));
      tr.classList.add('selected');
      selectShipment(s);
    });

    tbody.appendChild(tr);
  });
}

function setRiskFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderShipmentsTable(shipments);
}

function selectShipment(s) {
  selectedShipment = s;
  const inspector = document.getElementById('inspector-content');
  const pkgBadge = document.getElementById('inspector-pkg-id');
  if (pkgBadge) pkgBadge.textContent = s.package_id || 'Active Parcel';

  const pred = s.prediction || {};
  const prob = (pred.failure_probability != null) ? (pred.failure_probability * 100).toFixed(1) : '--';
  const tier = pred.risk_tier || 'LOW';

  const factorsHtml = (pred.risk_factors && pred.risk_factors.length > 0)
    ? pred.risk_factors.map(f => `
        <div class="factor-item">
          <div>
            <div class="factor-name">${f.factor}</div>
            <div class="factor-desc">${f.detail || f.pillar}</div>
          </div>
          <div class="factor-impact">+${(f.attribution_score != null ? f.attribution_score : f.shap_logit || 0).toFixed(2)} log-odds</div>
        </div>
      `).join('')
    : '<div style="color:var(--text-muted);font-size:0.8rem;">No high friction factors detected. Package is clear for standard departure.</div>';

  inspector.className = 'inspector-body';
  inspector.innerHTML = `
    <div class="inspector-hero">
      <div>
        <span style="font-size:0.75rem;text-transform:uppercase;color:var(--text-muted);font-weight:700;">Calculated Failure Risk</span>
        <div class="score-display">
          <span class="score-big ${tier}">${prob}%</span>
          <span class="risk-badge ${tier}">${tier} RISK</span>
        </div>
      </div>
      <div style="text-align:right;">
        <span style="font-size:0.72rem;color:var(--text-muted);">Capacity Policy:</span>
        <div style="font-weight:700;color:${pred.capacity_approved ? '#60A5FA' : '#F59E0B'}">${pred.capacity_status || 'APPROVED'}</div>
      </div>
    </div>

    <div class="factors-title">SHAP Mathematical Root Causes (Top Attributions)</div>
    <div class="factors-list">
      ${factorsHtml}
    </div>

    <div class="inspector-cta">
      <button class="btn-primary full-width" onclick="inspectAndJump('${s.package_id}')">
        ⚡ Open Customer Interventions for ${s.package_id ? s.package_id.substring(0, 14) : 'Parcel'} &rarr;
      </button>
    </div>
  `;
}

function inspectAndJump(pkgId) {
  const found = shipments.find(s => s.package_id === pkgId);
  if (found) {
    selectedShipment = found;
    switchTab('interventions');
    highlightInterventionPackage(pkgId);
    simulateOptionsForShipment(found);
  }
}

// ---------------------------------------------------------------------------
// VIEW 3: CUSTOMER INTERVENTIONS & MESSAGING
// ---------------------------------------------------------------------------
function renderInterventionsSidebar(items) {
  const list = document.getElementById('interventions-pkg-list');
  list.innerHTML = '';

  const priorityItems = items.filter(s => {
    const tier = s.prediction?.risk_tier;
    return tier === 'HIGH' || tier === 'MEDIUM';
  });

  priorityItems.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = `int-pkg-card ${idx === 0 ? 'active' : ''}`;
    card.dataset.id = s.package_id;
    const prob = ((s.prediction?.failure_probability || 0) * 100).toFixed(1);
    const tier = s.prediction?.risk_tier || 'HIGH';

    card.innerHTML = `
      <div class="int-pkg-head">
        <strong style="font-family:var(--font-mono);font-size:0.8rem;color:#93C5FD;">${s.package_id ? s.package_id.substring(0, 16) : 'PKG'}</strong>
        <span class="risk-badge ${tier}">${prob}%</span>
      </div>
      <div style="font-size:0.72rem;color:var(--text-muted);display:flex;justify-content:space-between;">
        <span>${s.location_type || 'Apartment'}</span>
        <span>Dwell: ${s.planned_service_time_seconds || 180}s</span>
      </div>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.int-pkg-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedShipment = s;
      simulateOptionsForShipment(s);
    });

    list.appendChild(card);
  });

  if (priorityItems.length > 0) {
    selectedShipment = priorityItems[0];
    simulateOptionsForShipment(priorityItems[0]);
  }
}

function highlightInterventionPackage(pkgId) {
  document.querySelectorAll('.int-pkg-card').forEach(c => {
    if (c.dataset.id === pkgId) c.classList.add('active');
    else c.classList.remove('active');
  });
}

async function simulateOptionsForShipment(s) {
  if (!s) return;
  const badge = document.getElementById('int-pkg-badge');
  const prob = ((s.prediction?.failure_probability || 0.15) * 100).toFixed(1);
  if (badge) {
    badge.textContent = `Baseline Risk: ${prob}%`;
    badge.className = `badge-risk-${s.prediction?.risk_tier || 'HIGH'}`;
  }

  try {
    const res = await fetch('/api/intervene/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipment: s })
    });

    if (res.ok) {
      const data = await res.json();
      currentSimulatedOptions = data.intervention_options || [];
      renderInterventionCards(currentSimulatedOptions);
      if (currentSimulatedOptions.length > 0) {
        selectOption(currentSimulatedOptions[0]);
      }
    }
  } catch (err) {
    console.error("Simulation request failed:", err);
  }
}

function renderInterventionCards(options) {
  const container = document.getElementById('intervention-options-container');
  container.innerHTML = '';

  options.forEach((opt, idx) => {
    const div = document.createElement('div');
    div.className = `option-card ${idx === 0 ? 'selected' : ''}`;
    div.dataset.id = opt.id;

    div.innerHTML = `
      <div class="option-left">
        <div class="option-title">${opt.title}</div>
        <div class="option-desc">${opt.description}</div>
      </div>
      <div class="option-stats">
        <div class="option-new-prob">${(opt.new_prob * 100).toFixed(1)}%</div>
        <div class="option-drop">&darr; ${opt.risk_reduction_pct}% Risk Drop</div>
      </div>
    `;

    div.addEventListener('click', () => {
      document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
      div.classList.add('selected');
      selectOption(opt);
    });

    container.appendChild(div);
  });
}

function selectOption(opt) {
  selectedOption = opt;
  document.getElementById('selected-int-title').textContent = opt.title;
  document.getElementById('selected-int-reduction').textContent = `${opt.risk_reduction_pct}% Failure Reduction`;
  document.getElementById('btn-apply-intervention').disabled = false;
  
  updateMessagePreview(opt);
}

function setChannel(channel, btn) {
  currentChannel = channel;
  document.querySelectorAll('.channel-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (selectedOption) {
    updateMessagePreview(selectedOption);
  }
}

async function updateMessagePreview(opt) {
  if (!selectedShipment || !opt) return;

  try {
    const res = await fetch('/api/messaging/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        package_id: selectedShipment.package_id || 'PKG-DEMO',
        intervention_id: opt.id,
        channel: currentChannel,
        recipient_name: "Customer"
      })
    });

    if (res.ok) {
      const data = await res.json();
      document.getElementById('phone-message-body').textContent = data.content || '';
      document.getElementById('preview-cta-title').textContent = opt.title;
      document.getElementById('char-count-info').textContent = `Length: ${data.char_count || 0} chars`;
    }
  } catch (err) {
    console.error("Preview fetch failed:", err);
  }
}

async function applyCurrentIntervention() {
  if (!selectedShipment || !selectedOption) return;
  const btn = document.getElementById('btn-apply-intervention');
  btn.textContent = "Updating Delivery Plan...";
  btn.disabled = true;

  try {
    const res = await fetch('/api/intervene/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        package_id: selectedShipment.package_id,
        intervention_id: selectedOption.id
      })
    });

    if (res.ok) {
      btn.textContent = "✓ Intervention Confirmed!";
      setTimeout(() => {
        btn.textContent = "Confirm & Re-route Shipment";
        btn.disabled = false;
        loadData();
      }, 2000);
    }
  } catch (err) {
    btn.textContent = "Error applying";
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// REAL-TIME SPOT SCORING MODAL
// ---------------------------------------------------------------------------
function openRealtimeModal() {
  document.getElementById('realtime-modal').classList.add('active');
}
function closeRealtimeModal() {
  document.getElementById('realtime-modal').classList.remove('active');
}

async function computeRealtimeScore() {
  const payload = {
    station_code: document.getElementById('rt-station').value,
    location_type: document.getElementById('rt-loctype').value,
    customer_availability_rate: parseFloat(document.getElementById('rt-avail').value),
    address_access_difficulty: parseInt(document.getElementById('rt-access').value),
    signature_required: parseInt(document.getElementById('rt-sig').value),
    customer_delivery_preference: document.getElementById('rt-pref').value,
    departure_hour: parseInt(document.getElementById('rt-departure').value),
    planned_service_time_seconds: parseFloat(document.getElementById('rt-service').value),
    latitude: 34.05,
    longitude: -118.25
  };

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipment: payload })
    });

    if (res.ok) {
      const data = await res.json();
      const prob = (data.failure_probability * 100).toFixed(1);
      const tier = data.risk_tier || 'LOW';

      document.getElementById('rt-result-pct').textContent = `${prob}%`;
      const tierElem = document.getElementById('rt-result-tier');
      tierElem.textContent = `${tier} RISK LEVEL`;
      tierElem.style.background = tier === 'HIGH' ? 'var(--danger-bg)' : (tier === 'MEDIUM' ? 'var(--warning-bg)' : 'var(--success-bg)');
      tierElem.style.color = tier === 'HIGH' ? '#F87171' : (tier === 'MEDIUM' ? '#FBBF24' : '#34D399');

      document.getElementById('rt-result-recommendation').textContent = data.recommended_action || '';

      const list = document.getElementById('rt-factors-list');
      if (data.risk_factors && data.risk_factors.length > 0) {
        list.innerHTML = data.risk_factors.map(f => `
          <div class="rt-factor-pill">
            <span><strong>${f.factor}</strong> (${f.detail})</span>
            <span style="color:#F87171;font-weight:700;">+${(f.attribution_score || 0).toFixed(2)}</span>
          </div>
        `).join('');
      } else {
        list.innerHTML = '<div style="color:var(--text-muted);font-size:0.75rem;">Clear for standard departure (No severe risk drivers).</div>';
      }
    }
  } catch (err) {
    console.error("Realtime scoring failed:", err);
  }
}
