# BRIDGE Phase 9 — API Gaps & Graceful Degradation Log

**Document Version:** 1.0.0  
**Audit Date:** October 21, 2026  
**Governance Mandate:** The backend API contracts are frozen. Do NOT invent new endpoints. Every gap identified below must degrade gracefully in the Dispatch Desk UI.

---

## 1. Identified API Gaps & UI Degradation Strategies

### GAP-01: No Dedicated Bulk Intervention Apply Endpoint
* **Identified Need:** The Risk Queue allows multi-selecting packages to apply recommended interventions in bulk.
* **Current API Capability:** `POST /api/intervene/apply` operates strictly on a single package (`package_id`, `intervention_id`).
* **Graceful Degradation:**
  The frontend UI client will orchestrate sequential asynchronous requests to `POST /api/intervene/apply` across selected packages with a progress indicator and consolidated success toast, updating the in-memory manifest state per package without requiring a new backend route.

### GAP-02: No Dedicated `GET /api/database/zones` List Endpoint
* **Identified Need:** The Zone Priors screen requires a table of postal zones, Beta prior parameters ($\alpha, \beta$), and posterior failure rates.
* **Current API Capability:**
  - `GET /api/database/status` returns aggregate counts (`dynamic_zone_priors_active`).
  - `POST /api/delivery/complete` returns dynamic updates for the specific zone updated (`zone_prior_update: { zone_id, alpha, beta, updated_prior_rate }`).
* **Graceful Degradation:**
  The frontend populates the initial Zone Priors table from the active manifest records (extracting unique `zone_id`, `historical_zone_failure_rate`, and sample package counts). When a delivery attempt is recorded via `POST /api/delivery/complete`, the exact posterior $\alpha$, $\beta$, and mean failure rate returned in `zone_prior_update` dynamically updates the corresponding row in the UI table.

### GAP-03: Single-Route Optimization per Request
* **Identified Need:** Multi-route manifests contain multiple `route_id`s that dispatchers want to optimize.
* **Current API Capability:** `POST /api/route/optimize` accepts an optional `route_id` and optimizes that single route against its stops.
* **Graceful Degradation:**
  The Route Optimizer view provides a route selector dropdown (populating all distinct `routes_detected` from manifest metadata). Selecting a route optimizes and visualizes that specific vehicle route. Fleet-wide macro savings are computed by aggregating individual route optimization outputs.

### GAP-04: Static Model Training Metrics vs Dynamic Endpoint
* **Identified Need:** The Model Governance screen requires deep latency telemetry (P50, P90, P95) and training split details.
* **Current API Capability:** `GET /api/model/metadata` returns test metrics (PR-AUC, ROC-AUC, Brier score, KS statistic) and feature importance, but does not provide dynamic forward-pass microsecond benchmark arrays.
* **Graceful Degradation:**
  Static latency telemetry is populated strictly from the audited Phase 7 release report (`frontend/src/data/release_report_v1_5_0.ts`), explicitly labeled in the UI as **"Release report v1.5.0 benchmarks (Windows 11 / Python 3.13.3)"**, with zero invented or randomized values.

---

## 2. Compliance Checklist
- [x] Zero backend endpoints modified or created.
- [x] Zero request/response schemas altered.
- [x] All 89 baseline automated tests preserved in 100% green state.
- [x] Every gap explicitly documented with its exact degradation path.
