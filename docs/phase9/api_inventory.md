# BRIDGE Phase 9 — API Endpoint Inventory

**Audit Date:** October 21, 2026  
**Source of Truth:** Live OpenAPI Specification (`/openapi.json`) and `app/server.py`  
**API Status:** 18 Active Endpoints (Frozen Contract)

---

## 1. System Health & Infrastructure

### `GET /api/health`
* **Summary:** Returns operational status of risk engine, database, and operational thresholds.
* **Request:** None
* **Response Sample (200 OK):**
```json
{
  "status": "healthy",
  "active_model": "Logistic Regression",
  "champion_model": "Logistic Regression",
  "is_champion_active": true,
  "sample_count": 60,
  "manifest_id": "benchmark-canonical-manifest",
  "database": {
    "is_supabase_connected": false,
    "backend": "SQLite (Local Fallback)",
    "shipments_stored": 60,
    "interventions_logged": 0,
    "completed_deliveries": 0,
    "dynamic_zone_priors_active": 0
  },
  "available_models": ["Logistic Regression", "Random Forest", "LightGBM Candidate"],
  "calibrated": true,
  "explainer_type": "linear_exact",
  "operational_thresholds": {
    "tau_low": 0.11,
    "tau_med": 0.14,
    "max_fleet_capacity": 0.20
  }
}
```

### `GET /api/database/status`
* **Summary:** Real-time dual-backend persistence status (Supabase Cloud PostgreSQL vs SQLite fallback).
* **Request:** None
* **Response Sample (200 OK):**
```json
{
  "is_supabase_connected": false,
  "backend": "SQLite (Local Fallback)",
  "shipments_stored": 60,
  "interventions_logged": 0,
  "completed_deliveries": 0,
  "dynamic_zone_priors_active": 0
}
```

---

## 2. Dispatcher Telemetry & Dashboard

### `GET /api/dashboard/stats`
* **Summary:** Dispatcher KPI metrics, risk counts, fleet capacity usage, and projected savings.
* **Request:** None
* **Response Sample (200 OK):**
```json
{
  "total_packages_evaluated": 60,
  "high_risk_count": 12,
  "medium_risk_count": 8,
  "low_risk_count": 40,
  "capacity_approved_count": 12,
  "capacity_deferred_count": 0,
  "baseline_success_rate": 82.4,
  "optimized_success_rate": 94.6,
  "success_rate_improvement_points": 12.2,
  "failed_delivery_reduction_pct": 21.8,
  "estimated_fuel_savings_pct": 18.2,
  "driver_labor_hours_saved_pct": 15.5,
  "customer_satisfaction_boost_pct": 24.0,
  "active_model": "Logistic Regression",
  "champion_model": "Logistic Regression",
  "is_champion_active": true,
  "calibrated": true,
  "explainer_type": "linear_exact",
  "operational_thresholds": {
    "tau_low": 0.11,
    "tau_med": 0.14,
    "max_fleet_capacity": 0.2
  },
  "database_status": {
    "is_supabase_connected": false,
    "backend": "SQLite (Local Fallback)"
  }
}
```

### `GET /api/shipments/sample`
* **Summary:** Active pre-dispatch deliveries scored under the fleet capacity policy.
* **Request:** None
* **Response Sample (200 OK):**
```json
{
  "count": 60,
  "shipments": [
    {
      "package_id": "PackageID_3b28f781-242e-416e-9575-84c7188b8208",
      "route_id": "RouteID_00143bdd-0a6b-49ec-bb35-36593d303e77",
      "stop_id": "AG",
      "station_code": "DLA3",
      "preferred_delivery_method": "Hand to Customer",
      "customer_delivery_preference": "Anytime",
      "latitude": 34.089727,
      "longitude": -118.28553,
      "planned_service_time_seconds": 45.0,
      "departure_hour": 16,
      "customer_availability_rate": 0.6288,
      "address_access_difficulty": 3,
      "signature_required": 1,
      "prediction": {
        "failure_probability": 0.1852,
        "raw_probability": 0.421,
        "failure_percentage": 18.5,
        "risk_tier": "HIGH",
        "badge_color": "red",
        "recommended_action": "Proactive intervention required...",
        "capacity_rank": 1,
        "capacity_approved": true,
        "capacity_status": "APPROVED",
        "fleet_allocation_rate": 0.2,
        "risk_factors": [
          {
            "factor": "Mandatory Signature Requirement",
            "detail": "Package requires in-person signature handoff (+0.32 log-odds)",
            "severity": "high",
            "feature_name": "signature_required",
            "attribution_score": 0.3211,
            "shap_logit": 0.3211
          }
        ],
        "explainability_metadata": {
          "explainer_type": "linear_exact",
          "explained_space": "calibrated_log_odds_margin",
          "explanation_status": "EXACT_SHAP_CLOSED_FORM"
        }
      }
    }
  ]
}
```

---

## 3. Risk Inference & Explainability

### `POST /api/predict`
* **Summary:** Evaluates single pre-dispatch shipment; applies calibration and closed-form SHAP.
* **Request Body:**
```json
{
  "shipment": {
    "station_code": "DBO1",
    "preferred_delivery_method": "Hand to Customer",
    "customer_delivery_preference": "Morning Only",
    "location_type": "Apartment",
    "latitude": 34.05,
    "longitude": -118.25,
    "planned_service_time_seconds": 180,
    "departure_hour": 16,
    "customer_availability_rate": 0.35,
    "address_access_difficulty": 4,
    "signature_required": 1
  }
}
```
* **Response Sample (200 OK):**
```json
{
  "failure_probability": 0.2145,
  "raw_probability": 0.465,
  "failure_percentage": 21.5,
  "risk_tier": "HIGH",
  "badge_color": "red",
  "recommended_action": "Proactive intervention required...",
  "risk_factors": [...],
  "mitigating_factors": [...],
  "explainability_metadata": {
    "explainer_type": "linear_exact",
    "explained_space": "calibrated_log_odds_margin"
  },
  "model_used": "Logistic Regression",
  "calibrated": true
}
```

### `POST /api/predict/batch`
* **Summary:** Batch scoring with deterministic 20% fleet capacity allocation and original input order preservation.
* **Request Body:**
```json
{
  "shipments": [ { ... } ],
  "max_capacity_rate": 0.20
}
```
* **Response Sample (200 OK):**
```json
{
  "count": 10,
  "capacity_approved_count": 2,
  "capacity_deferred_count": 1,
  "fleet_capacity_limit_pct": 20.0,
  "predictions": [ ... ]
}
```

---

## 4. Prescriptive Customer Interventions & Messaging

### `POST /api/intervene/simulate`
* **Summary:** Simulates counterfactual customer preferences; recomputes failure probabilities monotonically.
* **Request Body:** `{"shipment": { ... }}`
* **Response Sample (200 OK):**
```json
{
  "original_failure_prob": 0.2145,
  "original_risk_tier": "HIGH",
  "intervention_options": [
    {
      "id": "access_point_locker",
      "title": "Reroute to Secure 24/7 Access Locker Hub",
      "new_prob": 0.0821,
      "new_risk_tier": "LOW",
      "risk_reduction_points": 13.3,
      "simulated_availability": 0.96,
      "is_rule_based_heuristic": false,
      "simulation_disclaimer": "Simulated counterfactual availability..."
    },
    {
      "id": "hold_pickup",
      "title": "Hold for Station Customer Pickup",
      "new_prob": 0.015,
      "new_risk_tier": "LOW",
      "risk_reduction_points": 20.0,
      "is_rule_based_heuristic": true
    }
  ]
}
```

### `POST /api/intervene/apply`
* **Summary:** Confirms and persists customer preference choice to database and active manifest state.
* **Request Body:**
```json
{
  "package_id": "PackageID_3b28f781-242e-416e-9575-84c7188b8208",
  "intervention_id": "access_point_locker"
}
```
* **Response Sample (200 OK):**
```json
{
  "status": "success",
  "message": "Successfully applied 'Reroute to Secure 24/7 Access Locker Hub'",
  "persisted_to_db": true,
  "database_backend": "SQLite (Local Fallback)",
  "updated_shipment": { ... }
}
```

### `POST /api/messaging/preview`
* **Summary:** Generates multi-channel engagement preview (SMS, WhatsApp, Email).
* **Request Body:**
```json
{
  "package_id": "PKG_1001",
  "intervention_id": "access_point_locker",
  "channel": "SMS",
  "recipient_name": "Alex Mercer",
  "eta_window": "14:00 - 16:00"
}
```
* **Response Sample (200 OK):**
```json
{
  "package_id": "PKG_1001",
  "channel": "SMS",
  "recipient_name": "Alex Mercer",
  "headline": "Delivery Update for Package PKG_1001",
  "body": "Hi Alex, BRIDGE detected potential delivery friction...",
  "cta_text": "Confirm Locker Pickup",
  "preview_disclaimer": "Preview demonstration template only; no live telecommunications dispatch."
}
```

---

## 5. Operations Research & 2-Opt Route Optimization

### `POST /api/route/optimize`
* **Summary:** Solves deterministic Nearest-Neighbor + 2-Opt TSP with Haversine distance, urban circuity ($\kappa=1.35$), and locker stop consolidation.
* **Request Body:**
```json
{
  "route_id": "RouteID_00143bdd-0a6b-49ec-bb35-36593d303e77",
  "apply_interventions": false,
  "return_to_depot": false
}
```
* **Response Sample (200 OK):**
```json
{
  "route_id": "RouteID_00143bdd-0a6b-49ec-bb35-36593d303e77",
  "original_distance_km": 27.55,
  "optimized_distance_km": 8.29,
  "distance_saved_km": 19.26,
  "reduction_pct": 69.9,
  "original_stops_count": 30,
  "optimized_stops_count": 30,
  "stops_consolidated": 0,
  "circuity_factor": 1.35,
  "optimization_latency_ms": 0.44,
  "stops_sequence": [ ... ]
}
```

---

## 6. Feedback Loop & Model Governance

### `POST /api/delivery/complete`
* **Summary:** Logs completed delivery attempt; recalculates customer history and conjugate Beta-Binomial zone priors.
* **Request Body:**
```json
{
  "package_id": "PackageID_3b28f781-242e-416e-9575-84c7188b8208",
  "outcome": "DELIVERED",
  "failure_reason": "NONE",
  "delivery_notes": "Left on front porch"
}
```
* **Response Sample (200 OK):**
```json
{
  "status": "success",
  "outcome_recorded": "DELIVERED",
  "updated_customer_history": {
    "previous_attempts": 34,
    "previous_fails": 3,
    "new_success_rate": 0.912
  },
  "zone_prior_update": {
    "zone_id": "A-2.1A",
    "alpha": 3.0,
    "beta": 28.0,
    "updated_prior_rate": 0.0968
  }
}
```

### `GET /api/model/metadata`
* **Summary:** Returns model audit metrics, promotion gates, feature importance, and comparison data.
* **Request:** None
* **Response Sample (200 OK):**
```json
{
  "champion_model": "Logistic Regression",
  "active_model": "Logistic Regression",
  "promotion_decision": "Logistic Regression retained as Champion...",
  "comparison_results": {
    "Logistic Regression": {
      "test_metrics": {
        "pr_auc": 0.1139,
        "roc_auc": 0.5611,
        "brier_score": 0.0824,
        "ks_statistic": 0.0105
      }
    },
    "LightGBM Candidate": {
      "test_metrics": {
        "pr_auc": 0.1174,
        "roc_auc": 0.5623,
        "brier_score": 0.0823,
        "ks_statistic": 0.014
      }
    }
  }
}
```

### `POST /api/model/switch`
* **Summary:** Switches active model between Champion and Candidate; triggers immediate active manifest rescoring.
* **Request Body:**
```json
{
  "model_name": "LightGBM Candidate"
}
```
* **Response Sample (200 OK):**
```json
{
  "message": "Active model changed to LightGBM Candidate",
  "active_model": "LightGBM Candidate",
  "champion_model": "Logistic Regression",
  "is_champion_active": false,
  "calibrated": true,
  "explainer_type": "tree_shap"
}
```

---

## 7. Dynamic SaaS Manifest Engine (Phase 8)

### `POST /api/manifest/upload`
* **Summary:** Multipart CSV/JSON ingest with pre-flight schema analysis, leakage quarantine, and multi-route capacity partitioning. Supports `?dry_run=true`.
* **Request Query:** `?dry_run=false`
* **Request:** Multipart form file or JSON payload.
* **Response Sample (200 OK):**
```json
{
  "status": "success",
  "manifest_id": "manifest_8f3ab201",
  "filename": "dispatch_la_west.csv",
  "total_packages": 30,
  "routes_detected": ["Route_01"],
  "data_quality_summary": {
    "total_rows_received": 30,
    "valid_rows": 30,
    "quarantined_leakage_columns": ["first_attempt_failed", "scan_status"],
    "missing_crm_columns_imputed": ["historical_zone_failure_rate"],
    "fleet_capacity_approved_count": 6
  },
  "shipments": [ ... ]
}
```

### `POST /api/manifest/reset` & `POST /api/manifest/clear`
* **Summary:** Restores in-memory manifest state back to canonical 30-stop benchmark.
* **Request:** None
* **Response Sample (200 OK):**
```json
{
  "status": "success",
  "message": "Manifest successfully reset to canonical 30-stop benchmark.",
  "manifest_id": "benchmark-canonical-manifest",
  "total_packages": 60,
  "routes_detected": ["RouteID_00143bdd-0a6b-49ec-bb35-36593d303e77"]
}
```

### `GET /api/manifest/template`
* **Summary:** Streams clean pre-dispatch CSV template (no outcome leakage columns).
* **Response:** Downloadable CSV file (`text/csv`).

### `GET /api/manifest/export`
* **Summary:** Streams active scored manifest as enriched CSV (with probabilities, risk tiers, capacity status, Top-3 SHAP drivers).
* **Response:** Downloadable CSV file (`text/csv`).
