// Global state
let allShipments = [];
let filteredShipments = [];
let selectedShipment = null;
let activeFilter = 'ALL';
let modelMetadata = null;
let selectedOptionId = null;

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
}

async function loadDatabaseStatus() {
    try {
        const res = await fetch('/api/database/status');
        const dbInfo = await res.json();
        const badge = document.getElementById('db-backend-name');
        if (badge) {
            badge.textContent = dbInfo.is_supabase_connected ? 'DB: Supabase Cloud' : 'DB: SQLite / Supabase Ready';
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
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const targetId = tab.dataset.target;
            document.getElementById(targetId).classList.add('active');
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
}

async function loadModelMetadata() {
    try {
        const res = await fetch('/api/model/metadata');
        modelMetadata = await res.json();
        renderAuditTab(modelMetadata);
    } catch (err) {
        console.error("Error loading metadata:", err);
    }
}

async function loadDashboardStats() {
    try {
        const res = await fetch('/api/dashboard/stats');
        const stats = await res.json();
        
        document.getElementById('stat-success-rate').textContent = `${stats.optimized_success_rate}%`;
        document.getElementById('stat-success-sub').textContent = `+${stats.success_rate_improvement_points}% vs baseline (${stats.baseline_success_rate}%)`;
        
        document.getElementById('stat-failures-saved').textContent = `-${stats.failed_delivery_reduction_pct}%`;
        document.getElementById('stat-high-risk').textContent = `${stats.high_risk_count} Packages`;
        document.getElementById('stat-fuel-saved').textContent = `~${stats.estimated_fuel_savings_pct}%`;
    } catch (err) {
        console.error("Error loading stats:", err);
    }
}

async function loadShipments() {
    try {
        const res = await fetch('/api/shipments/sample');
        const data = await res.json();
        allShipments = data.shipments;
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
        const matchesFilter = (activeFilter === 'ALL') || (item.prediction.risk_tier === activeFilter);
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
    tbody.innerHTML = '';

    if (shipments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-muted);">No matching shipments found.</td></tr>`;
        return;
    }

    shipments.forEach(item => {
        const tr = document.createElement('tr');
        if (selectedShipment && selectedShipment.package_id === item.package_id) {
            tr.classList.add('selected-row');
        }

        const pred = item.prediction;
        const tier = item.final_risk_tier || pred.risk_tier;
        const prob = item.final_failure_probability !== undefined ? 
            (item.final_failure_probability * 100).toFixed(1) : 
            pred.failure_percentage;

        const isIntervened = !!item.applied_intervention;

        tr.innerHTML = `
            <td><strong>${item.package_id ? item.package_id.substring(0, 16) : 'PKG-DEMO'}</strong></td>
            <td>${item.station_code || 'DBO1'}</td>
            <td>${item.departure_hour ? item.departure_hour + ':00' : '12:00'}</td>
            <td>${item.customer_availability_rate ? Math.round(item.customer_availability_rate * 100) + '%' : 'N/A'}</td>
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
    
    // Highlight table row
    document.querySelectorAll('#shipments-tbody tr').forEach(r => r.classList.remove('selected-row'));
    renderShipmentsTable(filteredShipments);

    // Update Inspector Card
    const pred = shipment.prediction;
    const tier = shipment.final_risk_tier || pred.risk_tier;
    const prob = shipment.final_failure_probability !== undefined ? 
        (shipment.final_failure_probability * 100).toFixed(1) : 
        pred.failure_percentage;

    const gauge = document.getElementById('inspector-gauge');
    gauge.className = `gauge-circle gauge-${tier.toLowerCase()}`;
    gauge.innerHTML = `${prob}% <span class="gauge-label">${tier}</span>`;

    document.getElementById('inspector-pkg-id').textContent = shipment.package_id || 'PKG-DEMO';
    document.getElementById('inspector-status-desc').textContent = shipment.status || pred.recommended_action;

    // Render Risk Factors
    const factorsList = document.getElementById('inspector-factors');
    factorsList.innerHTML = '';
    
    if (pred.risk_factors && pred.risk_factors.length > 0) {
        pred.risk_factors.forEach(f => {
            const div = document.createElement('div');
            div.className = `factor-item severity-${f.severity}`;
            div.innerHTML = `
                <div>
                    <div class="factor-title">${f.factor}</div>
                    <div class="factor-desc">${f.detail}</div>
                </div>
            `;
            factorsList.appendChild(div);
        });
    } else {
        factorsList.innerHTML = `<div style="color: #34d399; font-size: 12px;">✓ No high-severity risk factors identified.</div>`;
    }

    // Specifications
    document.getElementById('spec-customer-pref').textContent = shipment.customer_delivery_preference || 'Anytime';
    document.getElementById('spec-signature').textContent = shipment.signature_required === 1 ? 'Yes (Mandatory)' : 'No (Standard Dropoff)';
    document.getElementById('spec-access-diff').textContent = `Level ${shipment.address_access_difficulty || 1} / 5`;
    document.getElementById('spec-prior-fails').textContent = `${shipment.customer_previous_failed_attempts || 0} failed attempts`;

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
    optionsContainer.innerHTML = '<div style="text-align:center; padding: 20px; color:#a1a1aa;">Calculating smart delivery alternatives...</div>';

    try {
        const res = await fetch('/api/intervene/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shipment: shipment })
        });
        const data = await res.json();
        renderCustomerMobilePortal(shipment, data.intervention_options);
    } catch (err) {
        console.error("Error simulating intervention:", err);
    }
}

function renderCustomerMobilePortal(shipment, options) {
    const container = document.getElementById('mobile-options-container');
    container.innerHTML = '';
    selectedOptionId = null;

    document.getElementById('mobile-pkg-tag').textContent = `Order #${shipment.package_id ? shipment.package_id.substring(0, 12) : 'DELIVERY'}`;

    options.forEach(opt => {
        const card = document.createElement('div');
        card.className = `option-card ${opt.recommended ? 'recommended' : ''}`;
        card.dataset.optionId = opt.id;

        card.innerHTML = `
            ${opt.recommended ? '<span class="option-badge-rec">Recommended</span>' : ''}
            <div class="option-title">${opt.title}</div>
            <div class="option-desc">${opt.description}</div>
            <div class="option-risk-drop">📉 Risk Drop: ${(opt.original_prob*100).toFixed(1)}% ➔ ${(opt.new_prob*100).toFixed(1)}% (${opt.risk_reduction_pct}% reduction)</div>
        `;

        card.addEventListener('click', () => {
            document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedOptionId = opt.id;
        });

        // Auto select recommended
        if (opt.recommended && !selectedOptionId) {
            card.classList.add('selected');
            selectedOptionId = opt.id;
        }

        container.appendChild(card);
    });

    const confirmBtn = document.getElementById('mobile-confirm-btn');
    confirmBtn.style.display = 'block';
    confirmBtn.onclick = async () => {
        if (!selectedOptionId) {
            alert('Please select one of the delivery preferences.');
            return;
        }
        await applyCustomerPreference(shipment.package_id, selectedOptionId);
    };
}

async function applyCustomerPreference(packageId, interventionId) {
    try {
        const res = await fetch('/api/intervene/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ package_id: packageId, intervention_id: interventionId })
        });
        const result = await res.json();
        
        // Show success screen in phone
        const contentDiv = document.getElementById('phone-main-content');
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

        // Refresh stats & table
        await loadDashboardStats();
        await loadShipments();
    } catch (err) {
        console.error("Failed to apply preference:", err);
    }
}

function resetCustomerPortal() {
    // Reset phone content
    const phoneContainer = document.getElementById('phone-main-content');
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
    document.querySelector('.tab-btn[data-target="dispatcher-view"]').click();
}

function renderAuditTab(meta) {
    if (!meta) return;

    // Champion model
    document.getElementById('audit-champion-name').textContent = meta.champion_model || 'Logistic Regression';
    document.getElementById('audit-train-samples').textContent = `${meta.train_rows ? meta.train_rows.toLocaleString() : '139,432'} rows`;
    document.getElementById('audit-test-samples').textContent = `${meta.test_rows ? meta.test_rows.toLocaleString() : '30,469'} rows`;
    document.getElementById('audit-features-count').textContent = `${meta.feature_count || 63} encoded features`;

    // Comparison results
    const results = meta.comparison_results;
    if (results) {
        const lrTest = results["Logistic Regression"]?.test_metrics;
        const rfTest = results["Random Forest"]?.test_metrics;

        if (lrTest) {
            document.getElementById('audit-lr-pr').textContent = lrTest.pr_auc;
            document.getElementById('audit-lr-roc').textContent = lrTest.roc_auc;
            document.getElementById('audit-lr-brier').textContent = lrTest.brier_score;
        }

        if (rfTest) {
            document.getElementById('audit-rf-pr').textContent = rfTest.pr_auc;
            document.getElementById('audit-rf-roc').textContent = rfTest.roc_auc;
            document.getElementById('audit-rf-brier').textContent = rfTest.brier_score;
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
