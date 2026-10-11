# BRIDGE — CURRENT STATE AUDIT & TECHNICAL VERIFICATION REPORT
**Date of Audit:** October 11, 2026  
**Auditor Role:** Lead ML Engineer, Software Architect, MLOps Engineer & Technical Auditor  
**Repository Path:** `c:\Users\Ksari\OneDrive\Desktop\FDSE\FINAL PROJECT`  
**Git Commit:** `a9488e0` (Branch: `main`)  
**Audit Standard:** Strict evidence-based evaluation. All claims categorized into **[OBSERVED FACT]**, **[VERIFIED RESULT]**, **[HISTORICAL CLAIM]**, **[ENGINEERING RECOMMENDATION]**, or **[UNRESOLVED QUESTION]**.

---

## 1. REPOSITORY & ENVIRONMENT INVENTORY (AUDIT A)

### 1.1 Git Status & Source Control
* **[OBSERVED FACT]** Git Repository root is located at `c:\Users\Ksari\OneDrive\Desktop\FDSE\FINAL PROJECT`.
* **[OBSERVED FACT]** Current Branch: `main`, Tracking Remote: `origin/main` (`https://github.com/Tharunchokkanathan/BRIDGE.git`), secondary remote: `tamilarasan` (`https://github.com/TamilarasanHQ/bridge-first-attempt-delivery-engine.git`).
* **[OBSERVED FACT]** Head Commit: `a9488e0 feat(features): implement 44-feature engineering engine for 8 pillars and dynamic prior feedback loop`.
* **[OBSERVED FACT]** Working Tree Status: Working tree is verified clean against `origin/main` commit `a9488e0`. No application code, dependencies, or model artifacts have been modified.

### 1.2 Python Runtime & Installed Packages
* **[OBSERVED FACT]** Python Runtime: `Python 3.13.3` (Windows AMD64).
* **[OBSERVED FACT]** Installed relevant packages:
  * `duckdb 1.5.6` (Installed)
  * `lightgbm 4.7.0` (Installed)
  * `autogluon.tabular 1.3.1` (Installed)
  * `scikit-learn 1.6.1` (Installed)
  * `fastapi 0.141.1` (Installed)
  * `uvicorn 0.52.4` (Installed)
  * `pytest 9.1.1` (Installed)
  * `pandas 2.2.3`, `numpy 2.2.6`, `pyarrow 25.0.1`, `fastparquet 2026.9.0` (Installed)
* **[OBSERVED FACT]** Critical Missing Dependency:
  * `shap` is **NOT INSTALLED** (`pip show shap` returned exit code 1: Package not found). TreeSHAP cannot be executed until `shap` is installed in the virtual environment.

### 1.3 Codebase Structure & Component Inventory
* `src/feature_engineering.py`: Authoritative 44-feature computation engine and leakage audit assertions.
* `src/data_pipeline.py`: Route-group dataset loader (`GroupShuffleSplit` on `route_id`) and `ColumnTransformer` builder.
* `src/train_model.py`: Model training script (Calibrated Logistic Regression & Random Forest baselines).
* `src/risk_engine.py`: Inference service, provisional risk band assignment, heuristic rule-based explanations, and 5-option intervention simulator.
* `app/server.py`: FastAPI server serving REST endpoints and mounting static frontend.
* `app/database.py`: Dual-backend manager (Supabase Cloud PostgreSQL + SQLite local fallback) with `complete_delivery` feedback loop.
* `static/index.html`: Working single-page web dashboard connected to FastAPI.
* `frontend/`: Standalone Vite + React 19 boilerplate. **[OBSERVED FACT]** `frontend/src/App.jsx` contains unedited Vite template code and is not connected to the BRIDGE API.
* `models/`: Contains serialized model artifacts (`champion_model.joblib`, `logistic_regression.joblib`, `random_forest.joblib`, `preprocessor.joblib`, `scaled_preprocessor.joblib`, `model_metadata.json`).
* `tests/`: 2 test modules (`test_api.py`, `test_engine.py`).

---

## 2. DATA & FEATURE ENGINEERING AUDIT (AUDIT B)

### 2.1 Dataset Inventory on Disk
* **[OBSERVED FACT]** `data/amazon_delivery_ml_features_sample.csv`:
  * File Size: 40,051,068 bytes (~40.05 MB).
  * Records: Exactly 100,000 rows, 56 columns.
  * Target Variable: `first_attempt_failed` with mean = `0.09134` (9.134% positive class).
* **[OBSERVED FACT]** `data/sample_test_deliveries.csv`:
  * Records: 60 sample shipments (used for UI test demonstrations).
* **[OBSERVED FACT]** Full 1.45M Parquet dataset (`amazon_delivery_ml_dataset_v1.parquet`) is **NOT present** in the local repository directory. Only the 100,000-row sample CSV is currently available.

### 2.2 The Authoritative 44-Feature Schema Contract
* **[VERIFIED RESULT]** The authoritative contract in `src/feature_engineering.py` specifies exactly **44 features** (4 Categorical + 40 Numerical):

| # | Feature Name | Source | Computation / Formula | Pre-Dispatch Available? | Leakage Risk | Used in Training? | Used in Inference? |
| :- | :--- | :--- | :--- | :-: | :-: | :-: | :-: |
| 1 | `station_code` | Manifest | Fulfillment hub code (`DBO1`, `DLA3`, etc.) | YES | None | YES | YES |
| 2 | `preferred_delivery_method` | CRM | Preferred drop (`Front Door`, `Locker`, etc.) | YES | None | YES | YES |
| 3 | `customer_delivery_preference` | CRM | Time preference (`Morning Only`, `Anytime`, etc.) | YES | None | YES | YES |
| 4 | `location_type` | Derived / Order | `Locker_Hub`, `Commercial`, `Apartment`, `Residential` | YES | None | YES | YES |
| 5 | `latitude` | Route GPS | Delivery stop latitude | YES | None | YES | YES |
| 6 | `longitude` | Route GPS | Delivery stop longitude | YES | None | YES | YES |
| 7 | `planned_service_time_seconds` | Routing Engine | Algorithmic estimated dwell time | YES | Low* | YES | YES |
| 8 | `depth_cm` | Package Scan | Parcel depth dimension | YES | None | YES | YES |
| 9 | `height_cm` | Package Scan | Parcel height dimension | YES | None | YES | YES |
| 10 | `width_cm` | Package Scan | Parcel width dimension | YES | None | YES | YES |
| 11 | `package_volume_cm3` | Computed | $d \times h \times w$ | YES | None | YES | YES |
| 12 | `departure_hour` | Dispatch Schedule | Van departure hour (10–18) | YES | None | YES | YES |
| 13 | `is_weekend` | Dispatch Date | Binary weekend flag | YES | None | YES | YES |
| 14 | `month` | Dispatch Date | Calendar month (7, 8, 9) | YES | None | YES | YES |
| 15 | `time_window_duration_hours` | Appointment | Duration of delivery window | YES | None | YES | YES |
| 16 | `customer_availability_rate` | CRM Prior | Rolling historical presence rate | YES | None | YES | YES |
| 17 | `customer_previous_delivery_attempts` | CRM Log | Lifetime order attempt count | YES | None | YES | YES |
| 18 | `customer_previous_failed_attempts` | CRM Log | Lifetime delivery failure count | YES | None | YES | YES |
| 19 | `customer_previous_success_rate` | Computed CRM | $1.0 - (\text{failed} / \text{attempts})$ | YES | None | YES | YES |
| 20 | `address_access_difficulty` | Driver Notes / CRM | Premises friction rating (1–5) | YES | None | YES | YES |
| 21 | `signature_required` | Order Security | Security protocol flag (0 or 1) | YES | None | YES | YES |
| 22 | `historical_zone_failure_rate` | Geographic Prior | Rolling postal zone prior failure rate | YES | None | YES | YES |
| 23 | `historical_station_failure_rate` | Hub Prior | Fulfillment station prior failure rate | YES | None | YES | YES |
| 24 | `seasonal_failure_rate` | Logistics Calendar | Seasonal failure adjustment factor | YES | None | YES | YES |
| 25 | `traffic_risk_score` | Weather/Traffic API | Pre-dispatch road congestion index | YES | None | YES | YES |
| 26 | `weather_risk_score` | Weather API | Pre-dispatch weather severity score | YES | None | YES | YES |
| 27 | `has_time_window` | Derived | Binary flag: window assigned (0 or 1) | YES | None | YES | YES |
| 28 | `window_start_minutes` | Appointment | Minutes from midnight to window start | YES | None | YES | YES |
| 29 | `window_end_minutes` | Appointment | Minutes from midnight to window end | YES | None | YES | YES |
| 30 | `departure_to_window_start_minutes` | Computed | Lead minutes from departure to start | YES | None | YES | YES |
| 31 | `departure_to_window_end_minutes` | Computed | Available minutes on route to end | YES | None | YES | YES |
| 32 | `departure_hour_sin` | Cyclical Transform | $\sin(2\pi \cdot \text{hour} / 24)$ | YES | None | YES | YES |
| 33 | `departure_hour_cos` | Cyclical Transform | $\cos(2\pi \cdot \text{hour} / 24)$ | YES | None | YES | YES |
| 34 | `day_of_week_sin` | Cyclical Transform | $\sin(2\pi \cdot \text{day} / 7)$ | YES | None | YES | YES |
| 35 | `day_of_week_cos` | Cyclical Transform | $\cos(2\pi \cdot \text{day} / 7)$ | YES | None | YES | YES |
| 36 | `log_package_volume` | Scale Transform | $\ln(1 + \text{volume})$ | YES | None | YES | YES |
| 37 | `log_planned_service_time` | Scale Transform | $\ln(1 + \text{service\_time})$ | YES | Low* | YES | YES |
| 38 | `preference_departure_mismatch` | Derived Rule | Flag: time preference vs departure clash | YES | None | YES | YES |
| 39 | `risk_signature_unavailability` | Interaction | $\text{sig\_req} \times (1.0 - \text{avail\_rate})$ | YES | None | YES | YES |
| 40 | `risk_preference_departure_clash` | Interaction | $\text{mismatch} \times (1.0 - \text{avail\_rate})$ | YES | None | YES | YES |
| 41 | `risk_commercial_closed` | Interaction | $\mathbb{I}(\text{Commercial}) \times \mathbb{I}(\text{hour} \ge 17 \lor \text{weekend})$ | YES | None | YES | YES |
| 42 | `risk_access_difficulty_heavy_package`| Interaction | $\text{access\_diff} \times (\text{log\_vol} / 10.0)$ | YES | None | YES | YES |
| 43 | `risk_zone_weather_stress` | Interaction | $\text{zone\_prior} \times (1.0 + \text{weather\_score})$ | YES | None | YES | YES |
| 44 | `customer_failure_propensity` | Bayesian Laplace | $(\text{fails} + 1.0) / (\text{attempts} + 2.0)$ | YES | None | YES | YES |

*\*Note on `planned_service_time_seconds`: Assumed pre-dispatch algorithmic expectation. If updated mid-route by driver execution telemetry, it would constitute leakage.*

### 2.3 Excluded / Quarantined Columns
* **[VERIFIED RESULT]** The following 12 columns are strictly quarantined in `EXCLUDE_COLS` and never passed to the preprocessor:
  `route_id`, `stop_id`, `package_id`, `first_attempt_failed` (target), `scan_status` (terminal outcome), `delivery_date`, `departure_time`, `day_of_week`, `stop_type`, `zone_id`, `time_window_start`, `time_window_end`.
* **[VERIFIED RESULT]** Target leakage assertion `verify_feature_integrity()` is executed in both data pipeline and test suite (`tests/test_engine.py`).

---

## 3. SPLIT STRATEGY & EVALUATION AUDIT (AUDIT C)

### 3.1 Split Integrity
* **[VERIFIED RESULT]** `src/data_pipeline.py` uses `GroupShuffleSplit` grouped strictly by `route_id`:
  * Split proportions: Train 70%, Validation 15%, Test 15%.
  * Train set: 69,505 rows (distinct routes). Failure rate: 9.13%.
  * Validation set: 15,044 rows (distinct routes). Failure rate: 9.07%.
  * Test set: 15,451 rows (distinct routes). Failure rate: 9.11%.
* **[VERIFIED RESULT]** Zero route overlap exists between Train, Validation, and Test partitions.
* **[VERIFIED RESULT]** Preprocessors (`ColumnTransformer`) are fitted **strictly on the Train split** (`X_train`) and transformed out-of-fold on Validation and Test splits.

---

## 4. BASELINE MODELS & EVALUATION AUDIT (AUDIT D & E)

### 4.1 Actual Stored Model Metadata (`models/model_metadata.json`)
* **[OBSERVED FACT]** Current Baseline Champion: **Logistic Regression** (Calibrated with 3-fold sigmoid calibration).
* **[OBSERVED FACT]** Secondary Baseline: **Random Forest** (100 Trees, max_depth=12).
* **[OBSERVED FACT]** Actual recorded evaluation metrics on Test partition (15,451 rows, positive prevalence = 9.11%):

| Model | Test ROC-AUC | Test PR-AUC | Test Brier Score | Precision @ 0.15 | Recall @ 0.15 | F1 @ 0.15 | Precision @ 0.10 | Recall @ 0.10 | F1 @ 0.10 | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression (Champion)** | **0.5549** | **0.1124** | **0.0825** | 0.1677 | 0.0398 | 0.0643 | 0.1106 | 0.3547 | 0.1686 | **LOCKED BASELINE** |
| **Random Forest (100 Trees)** | **0.5484** | **0.1108** | **0.0826** | 0.0000 | 0.0000 | 0.0000 | 0.1215 | 0.2239 | 0.1575 | **BASELINE ALTERNATIVE** |

### 4.2 Candidate Model Evaluation & Promotion Rules
* **[VERIFIED RESULT]** The random baseline PR-AUC (prevalence) is **0.0911**.
* **[VERIFIED RESULT]** The baseline champion's PR-AUC is **0.1124**, which is only **0.0213** above random chance. ROC-AUC is **0.5549**.
* **[ENGINEERING GOVERNANCE RULE]** The existing Logistic Regression and Random Forest models are the **authoritative baselines**.
* **[ENGINEERING GOVERNANCE RULE]** Do NOT assume LightGBM will automatically outperform the baseline. LightGBM is strictly a **candidate model**.
* **[PROMOTION CRITERIA]** LightGBM will ONLY be promoted to champion if evaluated on **identical route-group splits** and demonstrates statistically significant superiority across:
  1. **PR-AUC (Precision-Recall AUC):** Primary metric for imbalanced fraud/failure detection ($\Delta \text{PR-AUC} \ge +0.04$).
  2. **ROC-AUC:** Overall rank discrimination ($\text{ROC-AUC} \ge 0.65$).
  3. **Brier Score Loss:** Probability accuracy ($\le 0.080$).
  4. **Precision and Recall at operational cutoffs.**

### 4.3 Provisional Risk Thresholds & Formal Validation Procedure (AUDIT E)
* **[OBSERVED FACT]** Code Thresholds in `src/risk_engine.py`:
  * `THRESHOLD_LOW = 0.10` ($P < 10\% \rightarrow \text{LOW}$)
  * `THRESHOLD_MEDIUM = 0.20` ($10\% \le P < 20\% \rightarrow \text{MEDIUM}$)
  * $P \ge 20\% \rightarrow \text{HIGH}$
* **[GOVERNANCE MANDATE]** The thresholds $0.10$ and $0.20$ (as well as the previously suggested $0.30$ and $0.60$) are **PROVISIONAL**.
* **[CRITICAL FINDING]** Operational risk thresholds must NOT be finalized based solely on positive class prevalence (~9.1%).
* **[FORMAL THRESHOLD VALIDATION PROCEDURE]** Final risk cutoffs $\tau_{\text{low}}$ and $\tau_{\text{med}}$ must be determined through a structured 5-step validation protocol:
  1. **Calibration Curve Verification:** Plot empirical reliability diagrams on the Validation split. Confirm that predicted probabilities align monotonically with observed empirical failure frequencies across deciles.
  2. **Cost-Utility Objective Function:** Define an asymmetric business loss function:
     $$\mathcal{L}(\tau) = C_{\text{FN}} \cdot \text{FN}(\tau) + C_{\text{FP}} \cdot \text{FP}(\tau) + C_{\text{action}} \cdot (\text{TP}(\tau) + \text{FP}(\tau))$$
     where $C_{\text{FN}}$ (missed delivery failure: driver dwell, reverse logistics, package return, customer churn) is weighted at $5\times$ to $10\times$ the cost of $C_{\text{FP}}$ (unnecessary proactive SMS/call).
  3. **Dispatcher & Operational Capacity Bounds:** Constrain the volume of shipments assigned to the HIGH risk tier to match fleet operational capacity (e.g., maximum 12% to 20% of route manifest can receive intensive proactive intervention without delaying van dispatch).
  4. **Validation Cutoff Sweep:** Sweep thresholds $\tau \in [0.05, 0.40]$ across the Validation split to compute Precision, Recall, F1, and Expected Operational Cost, identifying the Pareto-optimal frontier.
  5. **Out-of-Fold Test Verification:** Apply selected $(\tau_{\text{low}}, \tau_{\text{med}})$ to the held-out Test split to verify stable operational metrics before production freezing.

---

## 5. DUCKDB BENCHMARK & EQUIVALENCE AUDIT (AUDIT F)

### 5.1 44-Feature Contract Preservation & Equivalence
* **[VERIFIED RESULT]** Feature equivalence between DuckDB query layer and pandas CSV loading was exhaustively verified across all 100,000 rows and 56 columns:
  * **Categorical Features (4):** Exactly 0 mismatches across all records.
  * **Numerical Features (40):** 0 mismatches within floating-point tolerance ($10^{-5}$).
  * **Target Variable (`first_attempt_failed`):** Exact 100% row-level match.
  * **Route Group Key (`route_id`):** Exact 100% row-level match.

### 5.2 Measured Query Performance Benchmark (5 Trials per Workload)
* **[VERIFIED RESULT]** Empirical benchmark results measured via `benchmark_queries.py`:
  1. **Analytical Aggregation (GROUP BY 17 stations, count, fail rate, avg volume):**
     * DuckDB in-memory SQL: **9.95 ms** ($\pm 0.61\text{ ms}$)
     * Pandas `.groupby().agg()`: **17.93 ms** ($\pm 0.66\text{ ms}$)
     * **Speedup: 1.80x Faster (DuckDB win)** — Vectorized C++ columnar execution outperforms Pandas.
  2. **Full Dataset Read & 46-Column Projection (100k rows from SSD):**
     * Pandas `read_csv(usecols=46)`: **524.47 ms** ($\pm 29.40\text{ ms}$)
     * DuckDB direct CSV scan: **669.16 ms** ($\pm 93.88\text{ ms}$)
     * **Speedup: 0.78x (Pandas faster)** — Converting DuckDB C++ relations to Pandas DataFrames incurs ~140ms serialization overhead.
  3. **Filtered Single-Station Slice ('DBO1', 1,024 rows):**
     * Pandas in-memory boolean mask: **8.13 ms** ($\pm 1.50\text{ ms}$)
     * DuckDB in-memory SQL: **14.44 ms** ($\pm 0.48\text{ ms}$)
  4. **In-Memory Table Ingestion (100k rows):**
     * DuckDB `CREATE TABLE`: **897.85 ms** ($\pm 67.06\text{ ms}$)
* **[ARCHITECTURAL GUIDANCE]** Do NOT replace fast Pandas indexing for single-row inference. Use DuckDB specifically for analytical aggregations, station-level monitoring, SQL-native zero-leakage filtering, and scale-up to large Parquet files.

---

## 6. EXPLAINABILITY AUDIT (AUDIT G)

* **[OBSERVED FACT]** Current implementation in `src/risk_engine.py` (`_extract_risk_factors()` lines 110–205) uses **hardcoded heuristic domain rules** (e.g., `if row.get("risk_commercial_closed") == 1`, `if avail < 0.65`).
* **[OBSERVED FACT]** Current implementation **DOES NOT use SHAP or TreeSHAP**.
* **[OBSERVED FACT]** The `shap` package is currently **not installed** in the virtual environment.
* **[ENGINEERING RECOMMENDATION]** In Phase 5, TreeSHAP must be installed, integrated via `shap.TreeExplainer`, and aligned with the candidate tree ensemble to replace heuristic rules with true mathematical Shapley attributions.

---

## 7. API, DATABASE & FEEDBACK LOOP AUDIT (AUDIT H & I)

### 7.1 FastAPI Endpoints (`app/server.py`)
* `GET /api/health` — Verified. Returns health, active model, sample count, database status.
* `GET /api/database/status` — Verified. Returns active backend and table counts.
* `GET /api/model/metadata` — Verified. Returns metadata JSON.
* `POST /api/model/switch` — Verified. Switches active model between Logistic Regression and Random Forest.
* `GET /api/shipments/sample` — Verified. Returns sorted sample shipments.
* `POST /api/predict` — Verified. Predicts failure probability and assigns risk tier.
* `POST /api/intervene/simulate` — Verified. Simulates 5 proactive customer options.
* `POST /api/intervene/apply` — Verified. Persists customer preference and updates delivery plan.
* `POST /api/delivery/complete` — Verified. Dynamic feedback loop updating customer track record and Bayesian zone prior.
* `GET /api/dashboard/stats` — Verified. Returns dashboard summary cards.

### 7.2 Database Backend (`app/database.py`)
* **[VERIFIED RESULT]** Dual-backend manager successfully defaults to local SQLite (`data/bridge_local.db`) when Supabase credentials are absent.
* **[VERIFIED RESULT]** Tables initialized: `shipments`, `customer_interventions`, `delivery_outcomes`, `zone_priors`.
* **[VERIFIED RESULT]** `complete_delivery` updates customer attempts/failures and recalculates Beta-Binomial conjugate prior for postal zones ($\alpha = 1.8, \beta = 18.2$).

---

## 8. TEST SUITE VERIFICATION & MUTATION AUDIT (AUDIT J)

### 8.1 Exact Test Execution Evidence
* **[VERIFIED RESULT]** Execution Command:
  ```bash
  pytest tests/test_api.py tests/test_engine.py -v
  ```
* **[VERIFIED RESULT]** Execution Outcome:
  * **13 passed in 8.71s** (0 failed, 0 skipped).
  * 6 API integration tests in `tests/test_api.py` passed:
    - `test_health_endpoint`: PASSED
    - `test_sample_shipments_endpoint`: PASSED
    - `test_predict_endpoint`: PASSED
    - `test_simulate_interventions_endpoint`: PASSED
    - `test_delivery_complete_feedback_loop`: PASSED
    - `test_dashboard_stats_endpoint`: PASSED
  * 7 Engine unit tests in `tests/test_engine.py` passed:
    - `test_44_feature_contract`: PASSED
    - `test_strict_leakage_prevention`: PASSED
    - `test_operational_interaction_features`: PASSED
    - `test_risk_prediction_probability_bounds`: PASSED
    - `test_risk_factor_explainability`: PASSED
    - `test_customer_intervention_simulation`: PASSED
    - `test_model_switching`: PASSED

### 8.2 Tracked File Mutation Inspection (CRITICAL FINDING)
* **[OBSERVED FACT]** Running `pytest tests/test_api.py tests/test_engine.py` **modifies the tracked repository file `data/bridge_local.db`**.
* **[ROOT CAUSE ANALYSIS]**
  1. `app/server.py` at import time executes:
     ```python
     for idx, row in raw_df.iterrows():
         ...
         db.save_shipment(clean_rec)
     ```
     This seeds shipments into the SQLite database.
  2. `tests/test_api.py::test_delivery_complete_feedback_loop` sends `POST /api/delivery/complete`, which writes records to `delivery_outcomes` and recalculates `zone_priors` in SQLite.
  3. Because `data/bridge_local.db` is tracked in Git, test execution leaves an uncommitted binary modification in `git status`.
* **[ENGINEERING MITIGATION FOR PHASE 1]**
  1. Pytest must configure an isolated temporary SQLite database (e.g. `:memory:` or a temporary file in `tmp/` via pytest fixture) during test runs.
  2. Production database paths must remain decoupled from automated test execution to keep the Git working tree clean.
