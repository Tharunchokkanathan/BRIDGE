# BRIDGE — ARCHITECTURE SPECIFICATION & SYSTEM CONTRACTS
**Status:** PROPOSED ARCHITECTURE SPECIFICATION (REVISED FOR GOVERNANCE)  
**Author:** Lead ML Engineer, Software Architect & Technical Auditor  
**Date:** October 11, 2026  

---

## 1. TARGET ARCHITECTURE OVERVIEW

The target machine learning and operational decision architecture is:

$$\mathbf{X}_{\text{manifest}} \xrightarrow{\text{DuckDB}} \mathbf{X}_{44\text{-Features}} \xrightarrow{\text{Candidate LightGBM / Baseline}} \text{Margin} \xrightarrow{\text{Isotonic Calibration}} P_{\text{cal}}(\text{Failure}) \xrightarrow{\text{Risk Engine}} \text{Tier} \xrightarrow{\text{TreeSHAP}} \text{Top-3 Root Causes}$$

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 BRIDGE RUNTIME PIPELINE                                │
│                                                                                        │
│   Incoming Pre-Dispatch Manifest (Parquet / In-Memory Table)                           │
│                                  │                                                     │
│                                  ▼                                                     │
│   1. DuckDB OLAP Query Layer                                                           │
│      • Validates pre-dispatch schema (44 features strictly)                            │
│      • Enforces zero-leakage by quarantining post-dispatch outcome tags                │
│      • Fast analytical aggregation & batch query serving (1.80x speedup for aggregations)│
│                                  │                                                     │
│                                  ▼                                                     │
│   2. Feature Preprocessing (ColumnTransformer)                                         │
│      • Fitted strictly on Train split (Imputation + One-Hot Encoding)                  │
│                                  │                                                     │
│                                  ▼                                                     │
│   3. Model Inference (Candidate vs Baseline)                                           │
│      • Locked Baseline: Calibrated Logistic Regression (PR-AUC 0.1124)                 │
│      • Evaluated Candidate: LightGBM GBDT (Requires PR-AUC >= 0.1500 for promotion)    │
│                                  │                                                     │
│                                  ▼                                                     │
│   4. Isotonic Probability Calibrator                                                   │
│      • Calibrates raw margins into true empirical failure probabilities                │
│      • Evaluated against Brier score loss target (<= 0.0780) on Validation split       │
│                                  │                                                     │
│                                  ▼                                                     │
│   5. Risk Decision & Banding Engine                                                    │
│      • Categorizes P(fail) into provisional operational tiers validated via loss:      │
│        - LOW:    P < Tau_Low                                                           │
│        - MEDIUM: Tau_Low <= P < Tau_Med                                                │
│        - HIGH:   P >= Tau_Med (subject to fleet intervention capacity constraint)      │
│                                  │                                                     │
│                                  ▼                                                     │
│   6. TreeSHAP Attribution Engine                                                       │
│      • Exact Shapley attributions (phi_j) computed in < 10ms                           │
│      • Extracts Top-3 positive risk contributors (non-causal model attributions)       │
│                                  │                                                     │
│                                  ▼                                                     │
│   7. Smart Recommender & Customer Engagement Layer                                     │
│      • Maps root causes to prescriptive intervention options                           │
│      • Generates structured WhatsApp / SMS notification cards                          │
│                                  │                                                     │
│                                  ▼                                                     │
│   8. Dual-Backend Persistence & Closed-Loop Feedback                                   │
│      • Persists predictions, applied interventions, and delivery outcome scans         │
│      • SQLite local fallback + Supabase Cloud PostgreSQL                               │
│      • Dynamic conjugate Beta-Binomial prior updates on completed deliveries           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. STRICT SYSTEM CONTRACT DEFINITIONS

### 2.1 Feature Contract (44 Features)
The feature engineering engine (`src/feature_engineering.py`) is the single source of truth:
* **Total Model Input Count:** Exactly **44 features** (4 Categorical, 40 Numerical).
* **Categorical Columns (4):**
  * `station_code`: String, 17 fulfillment hubs.
  * `preferred_delivery_method`: String (`Front Door`, `Porch`, `Locker`, `Garage`, `Mailroom`, `Hand to Customer`, `Neighbor`).
  * `customer_delivery_preference`: String (`Anytime`, `Morning Only`, `Evening Only`, `Weekday Only`, `Leave with Guard`).
  * `location_type`: String (`Residential`, `Apartment`, `Commercial`, `Locker_Hub`).
* **Numerical Columns (40):**
  * Physical & Routing (11): `latitude`, `longitude`, `planned_service_time_seconds`, `depth_cm`, `height_cm`, `width_cm`, `package_volume_cm3`, `departure_hour`, `is_weekend`, `month`, `time_window_duration_hours`.
  * CRM & Priors (11): `customer_availability_rate`, `customer_previous_delivery_attempts`, `customer_previous_failed_attempts`, `customer_previous_success_rate`, `address_access_difficulty`, `signature_required`, `historical_zone_failure_rate`, `historical_station_failure_rate`, `seasonal_failure_rate`, `traffic_risk_score`, `weather_risk_score`.
  * Temporal & Volume Representations (12): `has_time_window`, `window_start_minutes`, `window_end_minutes`, `departure_to_window_start_minutes`, `departure_to_window_end_minutes`, `departure_hour_sin`, `departure_hour_cos`, `day_of_week_sin`, `day_of_week_cos`, `log_package_volume`, `log_planned_service_time`, `preference_departure_mismatch`.
  * High-Impact Interaction Terms (6): `risk_signature_unavailability`, `risk_preference_departure_clash`, `risk_commercial_closed`, `risk_access_difficulty_heavy_package`, `risk_zone_weather_stress`, `customer_failure_propensity`.
* **Prohibited Columns (Zero-Leakage Quarantine):**
  `first_attempt_failed`, `scan_status`, `route_id`, `stop_id`, `package_id`, `delivery_date`, `departure_time`, `day_of_week`, `stop_type`, `zone_id`, `time_window_start`, `time_window_end`.
* **Null Policy:**
  * Appointment window columns are validly missing for packages without scheduled delivery appointments. Retained as `NaN` and imputed with median during training-only preprocessing.
  * Categorical missing values imputed with `"UNKNOWN"`.

### 2.2 Model & Baseline Promotion Contract
* **Locked Baseline Champion:** Logistic Regression (`sklearn.linear_model.LogisticRegression`), 3-fold Calibrated.
* **Secondary Baseline:** Random Forest (`sklearn.ensemble.RandomForestClassifier`), 100 Trees.
* **Candidate Framework:** LightGBM Classifier (`lightgbm.LGBMClassifier`).
* **Input Representation:** Numeric matrix output by `ColumnTransformer` fitted exclusively on the `Train` split.
* **Output Semantics:**
  * Raw output: Uncalibrated margin $\in (-\infty, \infty)$.
  * Probability output: $P(\text{failure}) \in [0.0, 1.0]$.
* **Class Ordering:** Index 0 = Success (Class 0), Index 1 = First-Attempt Failure (Class 1).
* **Champion Promotion Gate:**
  LightGBM is strictly a candidate model. Promotion to production champion requires empirical proof evaluated on **identical route-group test splits**:
  * Test PR-AUC: $\ge 0.1500$ (Baseline: $0.1124$).
  * Test ROC-AUC: $\ge 0.6500$ (Baseline: $0.5549$).
  * Test Brier Score: $\le 0.0780$ (Baseline: $0.0825$).
  * Statistically significant improvement in Precision/Recall at operational cutoffs.

### 2.3 Calibration Contract
* **Method:** Isotonic Regression (`sklearn.calibration.CalibratedClassifierCV(method="isotonic")`).
* **Isolation Requirement:** Calibrator must be fitted on out-of-fold predictions from the `Validation` split. **Never fitted on the final Test partition**.
* **Output Semantics:** Monotonically calibrated probability $P_{\text{cal}} \in [0.0, 1.0]$.
* **Acceptance Metric:** Brier score reduction compared to uncalibrated output and verified monotonic alignment across decile reliability diagrams.

### 2.4 Risk-Engine & Provisional Threshold Contract
* **Input:** Calibrated probability $P_{\text{cal}} \in [0.0, 1.0]$.
* **Provisional Operational Tiers:**
  * **LOW:** $P_{\text{cal}} < \tau_{\text{low}}$ (Clear for standard van dispatch).
  * **MEDIUM:** $\tau_{\text{low}} \le P_{\text{cal}} < \tau_{\text{med}}$ (Dispatch with passive recipient reminder).
  * **HIGH:** $P_{\text{cal}} \ge \tau_{\text{med}}$ (Trigger proactive intervention before van departs).
* **Provisional Cutoffs:** $\tau_{\text{low}} = 0.10$ and $\tau_{\text{med}} = 0.20$ are strictly provisional.
* **Formal Validation Procedure:**
  Final operational cutoffs must be determined through:
  1. Calibration reliability assessment across deciles.
  2. Asymmetric loss minimization:
     $$\mathcal{L}(\tau) = C_{\text{FN}} \cdot \text{FN} + C_{\text{FP}} \cdot \text{FP} + C_{\text{action}} \cdot (\text{TP} + \text{FP})$$
  3. Fleet intervention capacity constraint:
     $$\frac{\text{Count}(P \ge \tau_{\text{med}})}{N_{\text{route}}} \le 15\% - 20\%$$
  4. Validation split sweep and out-of-fold Test verification.
* **Boundary Behavior:** Exact threshold equality resolves upward ($P = \tau_{\text{low}} \rightarrow \text{MEDIUM}$, $P = \tau_{\text{med}} \rightarrow \text{HIGH}$).

### 2.5 Explainability Contract (TreeSHAP)
* **Explainer Method:** `shap.TreeExplainer(model)`.
* **Interpretation:**
  $$\phi_0 + \sum_{j=1}^{M} \phi_j(\mathbf{x}) = f(\mathbf{x})$$
  Where $\phi_0$ is the base expected model margin and $\phi_j$ is the additive attribution of feature $j$.
* **Top-3 Selection Policy:**
  1. Rank features by magnitude of positive contribution toward failure ($\phi_j > 0$).
  2. Select top 3 positive contributors.
  3. Map each selected feature to human-readable domain explanations (e.g., `risk_commercial_closed` $\rightarrow$ *"Commercial office delivery planned after business hours"*).
* **Terminology Guardrail:** SHAP values report **feature attribution to model margin**, not physical causality or guaranteed intervention effects.

### 2.6 API & Database Contracts
* **Inference Endpoint:** `POST /api/predict`
  * Request: `{"shipment": {<features>}}`
  * Response:
    ```json
    {
      "failure_probability": 0.7842,
      "failure_percentage": 78.4,
      "risk_tier": "HIGH",
      "badge_color": "red",
      "recommended_action": "Proactive intervention recommended before vehicle dispatch.",
      "risk_factors": [
        {"factor": "Commercial Address Closed After Business Hours", "detail": "...", "severity": "high"}
      ],
      "model_used": "Logistic Regression (Baseline Champion)"
    }
    ```
* **Intervention Endpoint:** `POST /api/intervene/simulate`
  * Simulates 5 options: `access_point`, `hold_pickup`, `reschedule_day`, `deliver_neighbor`, `confirm_availability`.
* **Feedback Endpoint:** `POST /api/delivery/complete`
  * Request: `{"package_id": "...", "outcome": "DELIVERED"|"FAILED", "failure_reason": "...", "delivery_notes": "..."}`
  * Persists outcome to `delivery_outcomes` table.
  * Updates customer attempts/fails in `shipments`.
  * Recalculates postal zone failure rate via conjugate Beta-Binomial Bayesian update.

### 2.7 Test Fixture & Database Isolation Contract
* **Isolation Requirement:** Automated tests must never modify tracked repository files (`data/bridge_local.db`).
* **Test Database Architecture:** Pytest test runs must configure an isolated temporary SQLite database (via `:memory:` or temporary file in `tmp/`) using a pytest fixture in `conftest.py`.
* **Zero Git Pollution:** Running `pytest` must leave `git status` 100% clean.
