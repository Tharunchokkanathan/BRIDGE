// BRIDGE — Frontend Application Logic (Phase 6)
// Provides unified Dispatcher Command Center, Route Optimization,
// Prescriptive Interventions, and Customer Messaging Previews.

// Global state
let allShipments = [];
let filteredShipments = [];
let selectedShipment = null;
let activeFilter = 'ALL';
let modelMetadata = null;
let selectedOptionId = null;
let activeMessagingChannel = 'SMS';
let activeInterventionsData = [];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    setupTabNavigation();
    setupEventListeners();
    await loadModelMetadata();
    await loadDashboardStats();
    await loadDatabaseStatus();
    await loadShipments();
    await loadRouteOptimization();
}

async function loadDatabaseStatus() {
    try {
        const res = await fetch('/api/database/status');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const dbInfo = await res.json();
        const badge = document.getElementById('db-backend-name');
        if (badge) {
            badge.textContent = dbInfo.is_supabase_connected ? 'DB: Supabase Cloud' : 'DB: SQLite (Local)';
            badge.title = `${dbInfo.backend} | Shipments Stored: ${dbInfo.shipments_stored} | Interventions Logged: ${dbInfo.interventions_logged}`;
        }
    } catch (err) {
        console.error("Error loading database status:", err);
    }
}

function setupTabNavigation() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            const targetId = tab.dataset.target;
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }

            // Lazy load route view if selected
            if (targetId === 'route-view') {
                loadRouteOptimization();
            }
        });
    });
}

function setupEventListeners() {
    // Model switcher
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
        modelSelect.addEventListener('change', async (e) => {
            const newModel = e.target.value;
            try {
                const res = await fetch('/api/model/switch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model_name: newModel })
                });
                if (res.ok) {
                    await loadShipments();
                    await loadDashboardStats();
                }
            } catch (err) {
                console.error("Failed to switch model", err);
            }
        });
    }

    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.dataset.filter;
            applyFilters();
        });
    });

    // Search input
    const searchInput = document.getElementById('shipment-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            applyFilters();
        });
    }

    // Route Optimization controls
    const btnRunOpt = document.getElementById('btn-run-optimization');
    if (btnRunOpt) {
        btnRunOpt.addEventListener('click', () => {
            loadRouteOptimization();
        });
    }

    const toggleInterventions = document.getElementById('toggle-route-interventions');
    if (toggleInterventions) {
        toggleInterventions.addEventListener('change', () => {
            loadRouteOptimization();
        });
    }

    const toggleCircuit = document.getElementById('toggle-route-circuit');
    if (toggleCircuit) {
        toggleCircuit.addEventListener('change', () => {
            loadRouteOptimization();
        });
    }

    // Messaging preview channel chips
    document.querySelectorAll('.channel-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.channel-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeMessagingChannel = chip.dataset.channel;
            if (selectedShipment && selectedOptionId) {
                loadMessagingPreview(selectedShipment.package_id, selectedOptionId, activeMessagingChannel);
            }
        });
    });
}

async function loadModelMetadata() {
    try {
        const res = await fetch('/api/model/metadata');
        if (!res.ok) return;
        modelMetadata = await res.json();
        renderAuditTab(modelMetadata);
    } catch (err) {
        console.error("Error loading metadata:", err);
    }
}

async function loadDashboardStats() {
    try {
        const res = await fetch('/api/dashboard/stats');
        if (!res.ok) return;
        const stats = await res.json();

        document.getElementById('stat-success-rate').textContent = `${stats.optimized_success_rate}%`;
        document.getElementById('stat-success-sub').textContent = `+${stats.success_rate_improvement_points}% vs baseline (${stats.baseline_success_rate}%)`;

        document.getElementById('stat-failures-saved').textContent = `-${stats.failed_delivery_reduction_pct}%`;
        document.getElementById('stat-high-risk').textContent = `${stats.high_risk_count} Packages`;
        document.getElementById('stat-fuel-saved').textContent = `~${stats.estimated_fuel_savings_pct}%`;

        const aiStatus = document.getElementById('ai-engine-status');
        if (aiStatus) {
            aiStatus.textContent = `${stats.active_model} Live`;
        }
    } catch (err) {
        console.error("Error loading stats:", err);
    }
}

async function loadShipments() {
    try {
        const res = await fetch('/api/shipments/sample');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        allShipments = data.shipments || [];
        applyFilters();

        // Select first shipment by default
        if (allShipments.length > 0 && !selectedShipment) {
            selectShipment(allShipments[0]);
        }
    } catch (err) {
        console.error("Error loading shipments:", err);
    }
}

function applyFilters() {
    const search = (document.getElementById('shipment-search')?.value || '').toLowerCase();

    filteredShipments = allShipments.filter(item => {
        const pred = item.prediction || {};
        const matchesFilter = (activeFilter === 'ALL') || (pred.risk_tier === activeFilter);
        const matchesSearch = !search ||
            (item.package_id && item.package_id.toLowerCase().includes(search)) ||
            (item.route_id && item.route_id.toLowerCase().includes(search)) ||
            (item.station_code && item.station_code.toLowerCase().includes(search));
        return matchesFilter && matchesSearch;
    });

    renderShipmentsTable(filteredShipments);
}

function renderShipmentsTable(shipments) {
    const tbody = document.getElementById('shipments-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (shipments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="state-empty">No matching shipments found in active filter.</td></tr>`;
        return;
    }

    shipments.forEach(item => {
        const tr = document.createElement('tr');
        if (selectedShipment && selectedShipment.package_id === item.package_id) {
            tr.classList.add('selected-row');
        }

        const pred = item.prediction || {};
        const tier = item.final_risk_tier || pred.risk_tier || 'LOW';
        const prob = item.final_failure_probability !== undefined ?
            (item.final_failure_probability * 100).toFixed(1) :
            (pred.failure_percentage !== undefined ? pred.failure_percentage : (pred.failure_probability * 100).toFixed(1));

        const isIntervened = !!item.applied_intervention;
        const capStatus = pred.capacity_status || (pred.capacity_approved ? 'APPROVED' : 'NOT_ELIGIBLE');

        let capBadgeHtml = '';
        if (capStatus === 'APPROVED') {
            capBadgeHtml = `<span class="capacity-badge approved">APPROVED</span>`;
        } else if (capStatus === 'DEFERRED_DUE_TO_FLEET_CAPACITY') {
            capBadgeHtml = `<span class="capacity-badge deferred" title="Deferred due to 20% fleet capacity limit">DEFERRED (CAP)</span>`;
        } else {
            capBadgeHtml = `<span style="font-size: 11px; color: var(--text-muted);">STANDARD</span>`;
        }

        tr.innerHTML = `
            <td><strong>${item.package_id ? item.package_id.substring(0, 16) : 'PKG-DEMO'}</strong></td>
            <td>${item.station_code || 'DLA3'}</td>
            <td>${item.departure_hour ? item.departure_hour + ':00' : '12:00'}</td>
            <td>${item.customer_availability_rate ? Math.round(item.customer_availability_rate * 100) + '%' : 'N/A'}</td>
            <td>${capBadgeHtml}</td>
            <td>
                <span class="risk-badge ${tier}">
                    ${tier} (${prob}%)
                </span>
                ${isIntervened ? '<span style="font-size:10px; color:#34d399; margin-left:4px;">✓ Optimized</span>' : ''}
            </td>
            <td>
                <button class="btn-primary" style="padding: 4px 10px; font-size: 11px;" onclick="event.stopPropagation(); triggerIntervention('${item.package_id}')">
                    ${tier === 'HIGH' ? 'Intervene ⚡' : 'Inspect'}
                </button>
            </td>
        `;

        tr.addEventListener('click', () => {
            selectShipment(item);
        });

        tbody.appendChild(tr);
    });
}

function selectShipment(shipment) {
    selectedShipment = shipment;

    // Highlight active row
    const rows = document.querySelectorAll('#shipments-tbody tr');
    rows.forEach(r => r.classList.remove('selected-row'));

    // Update Inspector Card
    const pred = shipment.prediction || {};
    const tier = shipment.final_risk_tier || pred.risk_tier || 'LOW';
    const prob = shipment.final_failure_probability !== undefined ?
        (shipment.final_failure_probability * 100).toFixed(1) :
        (pred.failure_percentage !== undefined ? pred.failure_percentage : (pred.failure_probability * 100).toFixed(1));

    const gauge = document.getElementById('inspector-gauge');
    if (gauge) {
        gauge.className = `gauge-circle gauge-${tier.toLowerCase()}`;
        gauge.innerHTML = `${prob}% <span class="gauge-label">${tier}</span>`;
    }

    const pkgIdEl = document.getElementById('inspector-pkg-id');
    if (pkgIdEl) pkgIdEl.textContent = shipment.package_id || 'PKG-DEMO';

    const descEl = document.getElementById('inspector-status-desc');
    if (descEl) descEl.textContent = shipment.status || pred.recommended_action || "Standard delivery dispatch.";

    // Render Risk Factors & SHAP Attributions
    const factorsList = document.getElementById('inspector-factors');
    if (factorsList) {
        factorsList.innerHTML = '';
        if (pred.risk_factors && pred.risk_factors.length > 0) {
            pred.risk_factors.forEach(f => {
                const div = document.createElement('div');
                div.className = `factor-item severity-${f.severity || 'low'}`;
                const sharePct = f.risk_driver_share !== undefined ? ` • ${Math.round(f.risk_driver_share * 100)}% share` : '';
                const logitVal = f.shap_logit !== undefined ? f.shap_logit : f.attribution_delta_logit;
                const deltaLogit = logitVal !== undefined ? ` • &Delta;logit: +${logitVal.toFixed(3)}` : '';

                div.innerHTML = `
                    <div>
                        <div class="factor-title">${f.factor}</div>
                        <div class="factor-desc">${f.detail}</div>
                        <div style="font-size: 10px; color: #a5b4fc; font-family: monospace; margin-top: 2px;">
                            ${deltaLogit}${sharePct}
                        </div>
                    </div>
                `;
                factorsList.appendChild(div);
            });
        } else {
            factorsList.innerHTML = `<div style="color: #34d399; font-size: 12px; padding: 6px;">✓ No high-severity risk factors identified.</div>`;
        }
    }

    // Specifications
    const specCustPref = document.getElementById('spec-customer-pref');
    if (specCustPref) specCustPref.textContent = shipment.customer_delivery_preference || 'Anytime';

    const specSig = document.getElementById('spec-signature');
    if (specSig) specSig.textContent = shipment.signature_required === 1 ? 'Yes (Mandatory)' : 'No (Standard Dropoff)';

    const specAccess = document.getElementById('spec-access-diff');
    if (specAccess) specAccess.textContent = `Level ${shipment.address_access_difficulty || 1} / 5`;

    const specPrior = document.getElementById('spec-prior-fails');
    if (specPrior) specPrior.textContent = `${shipment.customer_previous_failed_attempts || 0} failed attempts`;

    const specCap = document.getElementById('spec-capacity-status');
    if (specCap) {
        specCap.textContent = pred.capacity_status || (pred.capacity_approved ? 'APPROVED' : 'STANDARD');
        specCap.style.color = pred.capacity_approved ? '#34d399' : '#fbbf24';
    }

    const specRank = document.getElementById('spec-priority-rank');
    if (specRank) specRank.textContent = pred.operational_priority_rank ? `#${pred.operational_priority_rank} in batch` : 'N/A';

    // Intervene button in inspector
    const btn = document.getElementById('inspector-intervene-btn');
    if (btn) {
        btn.onclick = () => triggerIntervention(shipment.package_id);
    }
}

async function triggerIntervention(packageId) {
    const shipment = allShipments.find(s => s.package_id === packageId) || selectedShipment;
    if (!shipment) return;

    selectShipment(shipment);

    // Switch to Customer tab
    document.querySelector('.tab-btn[data-target="customer-view"]').click();

    // Load simulated options
    const optionsContainer = document.getElementById('mobile-options-container');
    if (optionsContainer) {
        optionsContainer.innerHTML = '<div style="text-align:center; padding: 20px; color:#a1a1aa;"><div class="spinner"></div><div style="margin-top:8px;">Evaluating prescriptive guidance...</div></div>';
    }

    try {
        const res = await fetch('/api/intervene/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shipment: shipment })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        activeInterventionsData = data.intervention_options || [];
        renderCustomerMobilePortal(shipment, activeInterventionsData);

        // Preload messaging preview for top recommended option
        const recOpt = activeInterventionsData.find(o => o.recommended) || activeInterventionsData[0];
        if (recOpt) {
            selectedOptionId = recOpt.id;
            loadMessagingPreview(shipment.package_id, recOpt.id, activeMessagingChannel);
        }
    } catch (err) {
        console.error("Error simulating intervention:", err);
        if (optionsContainer) {
            optionsContainer.innerHTML = `<div style="color:#f87171; padding:12px; font-size:12px;">Failed to simulate interventions: ${err.message}</div>`;
        }
    }
}

function renderCustomerMobilePortal(shipment, options) {
    const container = document.getElementById('mobile-options-container');
    if (!container) return;
    container.innerHTML = '';
    selectedOptionId = null;

    const pkgTag = document.getElementById('mobile-pkg-tag');
    if (pkgTag) {
        pkgTag.textContent = `Order #${shipment.package_id ? shipment.package_id.substring(0, 12) : 'DELIVERY'}`;
    }

    options.forEach(opt => {
        const card = document.createElement('div');
        card.className = `option-card ${opt.recommended ? 'recommended' : ''}`;
        card.dataset.optionId = opt.id;

        // Rule-based badge for station hold vs simulation
        let ruleBadgeHtml = '';
        if (opt.id === 'hold_pickup') {
            ruleBadgeHtml = `<span class="disclosure-badge heuristic" style="margin-left: 6px;">Rule-Based (1.5%)</span>`;
        }

        const utilityPill = opt.utility_score !== undefined ?
            `<span style="font-size: 10px; color: #a5b4fc; background: rgba(99,102,241,0.15); padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Utility: ${opt.utility_score}</span>` : '';

        card.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <div style="display: flex; align-items: center;">
                    ${opt.recommended ? '<span class="option-badge-rec">Recommended</span>' : ''}
                    ${ruleBadgeHtml}
                </div>
                ${utilityPill}
            </div>
            <div class="option-title">${opt.title}</div>
            <div class="option-desc">${opt.description}</div>
            <div class="option-risk-drop">📉 Projected Risk: ${(opt.original_prob * 100).toFixed(1)}% ➔ ${(opt.new_prob * 100).toFixed(1)}% (${opt.risk_reduction_pct}% reduction)</div>
        `;

        card.addEventListener('click', () => {
            document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedOptionId = opt.id;
            loadMessagingPreview(shipment.package_id, opt.id, activeMessagingChannel);
        });

        // Auto select recommended option
        if (opt.recommended && !selectedOptionId) {
            card.classList.add('selected');
            selectedOptionId = opt.id;
        }

        container.appendChild(card);
    });

    const confirmBtn = document.getElementById('mobile-confirm-btn');
    if (confirmBtn) {
        confirmBtn.style.display = 'block';
        confirmBtn.onclick = async () => {
            if (!selectedOptionId) {
                alert('Please select one of the delivery preferences.');
                return;
            }
            await applyCustomerPreference(shipment.package_id, selectedOptionId);
        };
    }
}

async function loadMessagingPreview(packageId, interventionId, channel) {
    const bubble = document.getElementById('messaging-bubble');
    const subjContainer = document.getElementById('messaging-subject-container');
    const subjText = document.getElementById('messaging-subject-text');
    const charCountEl = document.getElementById('messaging-char-count');
    const channelBadge = document.getElementById('messaging-channel-badge');

    if (!bubble) return;
    bubble.innerHTML = '<div class="spinner"></div> Rendering preview...';

    try {
        const res = await fetch('/api/messaging/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                package_id: packageId || 'PKG-DEMO',
                intervention_id: interventionId || 'access_point',
                channel: channel || 'SMS'
            })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        bubble.textContent = data.content || 'Preview unavailable.';
        if (channelBadge) channelBadge.textContent = data.channel;
        if (charCountEl) charCountEl.textContent = data.char_count || 0;

        if (data.subject && subjContainer && subjText) {
            subjContainer.style.display = 'block';
            subjText.textContent = data.subject;
        } else if (subjContainer) {
            subjContainer.style.display = 'none';
        }
    } catch (err) {
        console.error("Error loading messaging preview:", err);
        bubble.textContent = `Preview error: ${err.message}`;
    }
}

async function applyCustomerPreference(packageId, interventionId) {
    try {
        const res = await fetch('/api/intervene/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ package_id: packageId, intervention_id: interventionId })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();

        // Show success screen in phone
        const contentDiv = document.getElementById('phone-main-content');
        if (contentDiv) {
            contentDiv.innerHTML = `
                <div class="phone-success">
                    <div class="phone-success-icon">✓</div>
                    <h3>Delivery Preference Confirmed!</h3>
                    <p style="margin-top: 10px;">${result.message}</p>
                    <div style="background: #18181b; padding: 14px; border-radius: 12px; margin: 16px 0; font-size: 12px; border: 1px solid rgba(255,255,255,0.08);">
                        <div style="color: #34d399; font-weight: 600; margin-bottom: 4px;">Optimized Dispatch Plan:</div>
                        <div>Failure probability lowered to <strong>${(result.updated_shipment.final_failure_probability * 100).toFixed(1)}%</strong></div>
                        <div style="color: #a1a1aa; margin-top: 4px;">Driver schedule updated automatically.</div>
                    </div>
                    <button class="btn-primary" style="width: 100%; justify-content: center;" onclick="resetCustomerPortal()">
                        Return to Dispatcher View
                    </button>
                </div>
            `;
        }

        // Refresh stats & table
        await loadDashboardStats();
        await loadShipments();
    } catch (err) {
        console.error("Failed to apply preference:", err);
        alert(`Failed to apply preference: ${err.message}`);
    }
}

function resetCustomerPortal() {
    const phoneContainer = document.getElementById('phone-main-content');
    if (phoneContainer) {
        phoneContainer.innerHTML = `
            <div class="phone-header">
                <div class="avatar">📦</div>
                <div>
                    <div style="font-weight: 600; font-size: 13px;">BRIDGE Delivery Assistant</div>
                    <div style="font-size: 10px; color: #a1a1aa;" id="mobile-pkg-tag">Order #PKG-DEMO</div>
                </div>
            </div>
            <div class="phone-content">
                <h3>Delivery Update Needed</h3>
                <p>Our pre-dispatch intelligence indicates potential delivery difficulty at your scheduled address. Please select your preference:</p>
                <div class="option-cards" id="mobile-options-container">
                    <!-- Dynamically rendered -->
                </div>
                <button class="phone-confirm-btn" id="mobile-confirm-btn">Confirm Delivery Choice</button>
            </div>
        `;
    }
    document.querySelector('.tab-btn[data-target="dispatcher-view"]').click();
}

// -----------------------------------------------------------------------------
// Route Optimization API Integration
// -----------------------------------------------------------------------------
async function loadRouteOptimization() {
    const routeSelect = document.getElementById('route-select');
    const routeId = routeSelect ? routeSelect.value : 'RouteID_00143bdd-0a6b-49ec-bb35-36593d303e77';
    const applyInt = document.getElementById('toggle-route-interventions')?.checked ?? true;
    const returnToDepot = document.getElementById('toggle-route-circuit')?.checked ?? true;

    const statusPill = document.getElementById('route-status-pill');
    if (statusPill) statusPill.textContent = 'OPTIMIZING...';

    try {
        const res = await fetch('/api/route/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                route_id: routeId,
                apply_interventions: applyInt,
                return_to_depot: returnToDepot
            })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        renderRouteOptimization(data);
    } catch (err) {
        console.error("Error optimizing route:", err);
        if (statusPill) statusPill.textContent = 'ERROR';
    }
}

function renderRouteOptimization(data) {
    if (!data) return;

    // Macro Sequence Savings Card
    const origKm = document.getElementById('route-orig-km');
    if (origKm) origKm.textContent = data.original_distance_km ? data.original_distance_km.toFixed(2) : '--';

    const optKm = document.getElementById('route-opt-km');
    if (optKm) optKm.textContent = data.optimized_distance_km ? data.optimized_distance_km.toFixed(2) : '--';

    const macroSavingsEl = document.getElementById('route-macro-savings-pct');
    if (macroSavingsEl) macroSavingsEl.textContent = `${data.distance_savings_pct}%`;

    // Metrics Breakdown Card
    const tourDistEl = document.getElementById('metric-tour-dist');
    if (tourDistEl) tourDistEl.textContent = `${data.optimized_distance_km.toFixed(2)} km`;

    const distSavedEl = document.getElementById('metric-dist-saved');
    if (distSavedEl) distSavedEl.textContent = `${data.distance_savings_km.toFixed(2)} km`;

    const stopsCountEl = document.getElementById('metric-stops-count');
    if (stopsCountEl) stopsCountEl.textContent = `${data.stops_count} Stops`;

    const tourDurationEl = document.getElementById('metric-tour-duration');
    if (tourDurationEl) tourDurationEl.textContent = `${data.estimated_duration_minutes} min`;

    const statusPill = document.getElementById('route-status-pill');
    if (statusPill) {
        statusPill.textContent = data.interventions_applied ? 'INTERVENTIONS APPLIED' : 'SPATIAL 2-OPT';
        statusPill.className = `capacity-badge ${data.savings_target_met ? 'approved' : 'deferred'}`;
    }

    const targetStatus = document.getElementById('metric-target-status');
    if (targetStatus) {
        targetStatus.textContent = data.savings_target_met ? "MET (≥ 12.0%)" : "Target Not Met";
        targetStatus.style.color = data.savings_target_met ? "#34d399" : "#fbbf24";
    }

    // Stop Sequence Table
    const seqTbody = document.getElementById('sequence-tbody');
    if (seqTbody && data.stops) {
        seqTbody.innerHTML = '';
        data.stops.forEach((s, idx) => {
            const tr = document.createElement('tr');
            const isLocker = s.stop_id === 'HUB_LOCKER_CONSOLIDATED';
            const stopType = isLocker ?
                '<span class="stop-locker-hub">HUB Smart Locker (PUDO)</span>' :
                'Standard Residential Dropoff';

            tr.innerHTML = `
                <td><span class="stop-step-pill">${idx + 1}</span></td>
                <td><strong>${s.stop_id}</strong></td>
                <td style="font-family: monospace; color: var(--text-muted);">${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}</td>
                <td>${s.package_count || (s.package_ids ? s.package_ids.length : 1)}</td>
                <td>${stopType}</td>
            `;
            seqTbody.appendChild(tr);
        });
    }
}

// -----------------------------------------------------------------------------
// Model Benchmark & Technical Audit Tab
// -----------------------------------------------------------------------------
function renderAuditTab(meta) {
    if (!meta) return;

    // Champion model
    const champEl = document.getElementById('audit-champion-name');
    if (champEl) champEl.textContent = meta.champion_model || 'Logistic Regression';

    const trainEl = document.getElementById('audit-train-samples');
    if (trainEl) trainEl.textContent = `${meta.train_rows ? meta.train_rows.toLocaleString() : '139,432'} rows`;

    const testEl = document.getElementById('audit-test-samples');
    if (testEl) testEl.textContent = `${meta.test_rows ? meta.test_rows.toLocaleString() : '30,469'} rows`;

    // Comparison metrics
    const results = meta.comparison_results;
    if (results) {
        const lrTest = results["Logistic Regression"]?.test_metrics;
        const rfTest = results["Random Forest"]?.test_metrics;

        if (lrTest) {
            const pr = document.getElementById('audit-lr-pr');
            if (pr) pr.textContent = `${lrTest.pr_auc} ★`;
            const roc = document.getElementById('audit-lr-roc');
            if (roc) roc.textContent = lrTest.roc_auc;
            const brier = document.getElementById('audit-lr-brier');
            if (brier) brier.textContent = lrTest.brier_score;
        }

        if (rfTest) {
            const pr = document.getElementById('audit-rf-pr');
            if (pr) pr.textContent = rfTest.pr_auc;
            const roc = document.getElementById('audit-rf-roc');
            if (roc) roc.textContent = rfTest.roc_auc;
            const brier = document.getElementById('audit-rf-brier');
            if (brier) brier.textContent = rfTest.brier_score;
        }
    }

    // Top feature importances
    const featureContainer = document.getElementById('feature-importance-bars');
    if (featureContainer && meta.top_features) {
        featureContainer.innerHTML = '';
        const top10 = Object.entries(meta.top_features).slice(0, 10);
        const maxVal = Math.max(...top10.map(([_, v]) => v)) || 1.0;

        top10.forEach(([feat, val]) => {
            const pct = Math.round((val / maxVal) * 100);
            const div = document.createElement('div');
            div.className = 'feature-bar-wrapper';
            div.innerHTML = `
                <div class="feature-bar-label">
                    <span>${feat}</span>
                    <span>${val}</span>
                </div>
                <div class="feature-bar-bg">
                    <div class="feature-bar-fill" style="width: ${pct}%"></div>
                </div>
            `;
            featureContainer.appendChild(div);
        });
    }
}
