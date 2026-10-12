# BRIDGE — MASTER PROJECT PLAN & GOVERNANCE SPECIFICATION
**Version:** 1.1.0  
**Role:** Lead ML Engineer, Software Architect, MLOps Engineer & Technical Auditor  
**Date of Governance Lock:** October 11, 2026  
**Repository Path:** `c:\Users\Ksari\OneDrive\Desktop\FDSE\FINAL PROJECT`  
**Git Branch:** `main` | **Commit:** `a9488e0`  

---

## 1. EXECUTIVE SUMMARY & GOVERNANCE MANDATE

### 1.1 What BRIDGE Currently Does
BRIDGE (Business Risk Intelligence for Delivery Guidance Engine) is an end-to-end decision-support system designed to predict first-attempt last-mile delivery failure before vehicle departure, assign operational risk tiers, explain key risk drivers, simulate customer interventions, and ingest real-time delivery outcome feedback to update customer and postal zone priors dynamically.

### 1.2 What is Genuinely Implemented & Verified
* **Authoritative 44-Feature Pre-Dispatch Engine:** Single source of truth in `src/feature_engineering.py` covering all 8 Hackathon pillars with strict zero-leakage assertions.
* **Leakage-Safe Route-Group Split:** `GroupShuffleSplit` on `route_id` with train-only `ColumnTransformer` preprocessing in `src/data_pipeline.py`.
* **Authoritative Baseline Models:** Calibrated Logistic Regression (Baseline Champion) and Random Forest (100 Trees, secondary baseline) serialized in `models/`.
* **FastAPI Inference Service:** 10 REST endpoints in `app/server.py` supporting single prediction, intervention simulation, model switching, and real-time delivery completion logging.
* **Dual-Backend Persistence:** `app/database.py` with automatic Supabase Cloud PostgreSQL connection and SQLite local fallback, implementing conjugate Beta-Binomial zone prior smoothing on delivery completion.
* **Functional Static Dashboard:** `static/index.html` mounted directly by FastAPI providing interactive package inspection, model toggling, intervention application, and live feedback demo hooks.
* **Passing Test Suite:** **13 automated tests** verified via `pytest tests/test_api.py tests/test_engine.py -v` (13 passed in 8.71s).

### 1.3 Critical Technical Findings & Constraints
1. **Authoritative Baseline Model Governance:**
   Logistic Regression (PR-AUC 0.1124, ROC-AUC 0.5549) is the **locked baseline**. LightGBM is strictly a **candidate model** and must NOT be assumed superior until evaluated on identical route-group splits using PR-AUC, ROC-AUC, Brier score, and threshold-level precision/recall.
2. **Provisional Operational Risk Cutoffs:**
   The thresholds $\tau_{\text{low}} = 0.10$ and $\tau_{\text{med}} = 0.20$ are **PROVISIONAL**. Final thresholds must NOT be set based solely on class prevalence (~9.1%) or arbitrary numbers. They must be validated using calibration reliability curves, fleet intervention capacity bounds, and an asymmetric business loss function.
3. **DuckDB Integration & Measured Benchmark:**
   DuckDB integration preserves the exact 44-feature contract (0 mismatches across 100k rows verified). Measured benchmarks confirm DuckDB is **1.80x faster for analytical aggregations** (9.95ms vs 17.93ms) but has conversion overhead on direct raw CSV reading (524ms Pandas vs 669ms DuckDB). DuckDB will be utilized specifically for analytical monitoring, SQL-native projection, zero-leakage filtering, and Parquet scaling without altering the core Pandas inference path.
4. **Test Suite Database Mutation Finding:**
   Running tests currently mutates `data/bridge_local.db` (a tracked repository file) because `app/server.py` seeds sample records on import and `test_delivery_complete_feedback_loop` writes to SQLite. Pytest must be updated to use an isolated temporary database to keep the Git working tree clean.

---

## 2. FORMAL THRESHOLD VALIDATION PROCEDURE

Risk tiers determine operational actions:
* **LOW Risk:** Clear for standard vehicle dispatch without driver alert.
* **MEDIUM Risk:** Passive notification (automated WhatsApp/SMS recipient check).
* **HIGH Risk:** Active intervention required (reroute to locker, reschedule, or hold) before departure.

Thresholds $\tau_{\text{low}}$ and $\tau_{\text{med}}$ must be derived via a structured 5-step optimization protocol:
1. **Calibration Quality Assessment:** Evaluate Brier score loss and compute expected calibration error (ECE). Plot reliability diagrams across validation probability deciles to ensure probabilities represent empirical event frequencies.
2. **Asymmetric Business Loss Function:**
   $$\mathcal{L}(\tau) = C_{\text{FN}} \cdot \text{FN}(\tau) + C_{\text{FP}} \cdot \text{FP}(\tau) + C_{\text{action}} \cdot (\text{TP}(\tau) + \text{FP}(\tau))$$
   Where $C_{\text{FN}}$ (missed delivery failure cost: driver dwell, secondary attempt fuel, return processing, customer dissatisfaction) is weighted at $5\times$ to $10\times$ $C_{\text{FP}}$ (cost of proactive communication).
3. **Fleet Operational Capacity Bounds:**
   Dispatch hubs cannot intervene on unlimited packages. Impose capacity constraint:
   $$\frac{\text{Count}(P \ge \tau_{\text{med}})}{N_{\text{route}}} \le \text{Capacity}_{\max} \quad (\approx 15\% - 20\%)$$
4. **Threshold Sweep on Validation Split:**
   Sweep candidate cutoffs $\tau \in [0.05, 0.40]$ at $0.01$ increments. Plot Precision-Recall-Cost curves to identify the optimal boundary minimizing total delivery risk.
5. **Out-of-Fold Test Set Verification:**
   Lock validated cutoffs and evaluate once on the held-out Test split to confirm stability.

---

## 3. CURRENT-STATE COMPONENT INVENTORY

| Component | Status | Supporting Evidence |
| :--- | :--- | :--- |
| **44-Feature Pipeline (`feature_engineering.py`)** | **VERIFIED IMPLEMENTATION** | 100% pass in `test_engine.py::test_44_feature_contract` and `test_operational_interaction_features`. |
| **Zero-Leakage Split (`data_pipeline.py`)** | **VERIFIED IMPLEMENTATION** | `GroupShuffleSplit` on `route_id`, verified in `test_engine.py::test_strict_leakage_prevention`. |
| **Logistic Regression Champion (`train_model.py`)** | **VERIFIED IMPLEMENTATION** | Locked baseline in `models/logistic_regression.joblib`, metadata in `model_metadata.json`. |
| **Random Forest Baseline (`train_model.py`)** | **VERIFIED IMPLEMENTATION** | Secondary baseline in `models/random_forest.joblib` (100 trees). |
| **FastAPI REST Server (`server.py`)** | **VERIFIED IMPLEMENTATION** | 10 endpoints verified via `TestClient` in `tests/test_api.py` (6 tests passed). |
| **Dual Database Manager (`database.py`)** | **VERIFIED IMPLEMENTATION** | SQLite fallback tested in `tests/test_api.py::test_delivery_complete_feedback_loop`. |
| **Beta-Binomial Dynamic Zone Prior (`database.py`)** | **VERIFIED IMPLEMENTATION** | Verified zone prior update after simulated delivery completion in `test_api.py`. |
| **Static Web Dashboard (`static/index.html`)** | **VERIFIED IMPLEMENTATION** | Functional dashboard mounted at `/`; interactive model toggle and intervention modals operational. |
| **DuckDB Analytical Query Layer** | **BENCHMARKED & DESIGNED** | Schema equivalence verified (0 mismatches); 1.80x aggregation speedup benchmarked. Ready for Phase 1. |
| **LightGBM Candidate Model** | **NOT IMPLEMENTED** | Candidate model awaiting Phase 2 evaluation against locked baseline. |
| **Isotonic Calibration Layer** | **NOT IMPLEMENTED** | Sigmoid CV calibration exists in baseline; standalone Isotonic regression on Val split scheduled for Phase 3. |
| **TreeSHAP Explainability** | **NOT IMPLEMENTED / BLOCKED** | Heuristic rules currently in `risk_engine.py`. Blocked until `shap` package is approved for installation. |
| **Smart Preference Recommender** | **PARTIALLY IMPLEMENTED** | Heuristic mutations operational in `risk_engine.py`; persona vector cosine ranking scheduled for Phase 7. |
| **Dynamic Route Optimizer (OR-Tools)** | **NOT IMPLEMENTED** | Dashboard displays hardcoded projections; route optimization scheduled for Phase 9. |
| **Vite/React Frontend (`frontend/`)** | **BOILERPLATE (DEFERRED)** | Default Vite template; deferred to preserve focus on core ML and routing engines. |

---

## 4. STRICT SYSTEM CONTRACT DEFINITIONS
*(Authoritative specification documented in [`docs/ARCHITECTURE_SPEC.md`](./ARCHITECTURE_SPEC.md))*

* **Feature Contract:** Exactly 44 features (4 categorical, 40 numerical). 12 quarantined columns strictly prohibited.
* **Model Contract:** Input: 73 encoded columns via Train-fitted `ColumnTransformer`. Output: Class 1 probability $P(\text{failure}) \in [0.0, 1.0]$.
* **Calibration Contract:** Isotonic Regression fitted strictly on out-of-fold Validation predictions, evaluated via Brier score and reliability curves.
* **Risk Engine Contract:** Input $P_{\text{cal}} \in [0.0, 1.0]$. Deterministic tier assignment based on validated provisional thresholds.
* **Explainability Contract:** Additive TreeSHAP attribution $\phi_j$. Top-3 positive drivers. Non-causal mathematical reporting.
* **API Contract:** Validated Pydantic request/response schemas with graceful error handling.

---

## 5. PHASED IMPLEMENTATION ROADMAP WITH GOVERNANCE GATES

```text
Phase 3.0 [Audit Lock] ──► Phase 3.1 [DuckDB Layer & Test Fixture] ──► Phase 3.2 [LightGBM Candidate]
                                                                                      │
Phase 3.5 [TreeSHAP] ◄──── Phase 3.4 [Risk Engine Sync] ◄────────── Phase 3.3 [Isotonic Calibration]
      │
      ▼
Phase 4 [API Integration] ──► Phase 5 [Interventions & Routing] ──► Phase 6 [Frontend Polish & E2E Release]
```

---

### Phase 3.0 — Audit and Architecture Lock [COMPLETED & VERIFIED]
* **Prerequisites:** Full repository access and clean Git state.
* **Existing Files to Reuse:** All existing documentation in `docs/`.
* **Deliverables:** `CURRENT_STATE_AUDIT.md`, `ARCHITECTURE_SPEC.md`, `DECISION_LOG.md`, `PHASE_TRACKER.json`, `MASTER_PROJECT_PLAN.md`.
* **Acceptance Criteria:** Full code inspection complete, baseline 13 tests passing, database mutation documented, planning docs synchronized.
* **Rollback Steps:** Revert any uncommitted docs using `git checkout`.
* **Approval Gate:** **Phase 3.0 audit locked. User authorization activates Phase 3.1.**

---

### Phase 3.1 — DuckDB Integration & Test Fixture Isolation [CURRENT ACTIVE PHASE]
* **Prerequisites:** Phase 3.0 audit approved by user.
* **Existing Files to Reuse:** `data/amazon_delivery_ml_features_sample.csv`, `src/data_pipeline.py`, `tests/test_api.py`.
* **Deliverables:**
  * `src/duckdb_store.py`: Production-grade `DuckDBFeatureStore`.
  * `tests/test_duckdb.py`: Dedicated unit tests for schema, equivalence, zero-leakage, and analytical summaries.
  * `conftest.py`: Pytest fixture configuring an isolated temporary SQLite database for testing, preventing mutation of `data/bridge_local.db`.
  * `src/data_pipeline.py`: Non-breaking optional `use_duckdb=False` parameter in `load_and_split_data()`.
  * `requirements.txt`: Add `duckdb>=1.0.0`.
* **Acceptance Criteria:**
  1. DuckDB queries 100k rows with 0 feature mismatches against pandas across all 44 features.
  2. All 8 tests in `test_duckdb.py` pass.
  3. All 13 baseline tests pass without mutating `data/bridge_local.db` (`git status` remains clean).
* **Rollback Steps:**
  1. Remove `src/duckdb_store.py`, `tests/test_duckdb.py`, `conftest.py`.
  2. Revert `src/data_pipeline.py` and `requirements.txt` via `git checkout`.
* **Approval Gate:** **User review of Phase 3.1 test suite and benchmark logs required before Phase 3.2.**

---

### Phase 3.2 — LightGBM Candidate Model & Baseline Comparison
* **Prerequisites:** Phase 3.1 approved by user.
* **Existing Files to Reuse:** `src/train_model.py`, `src/data_pipeline.py`, `models/model_metadata.json`.
* **Deliverables:**
  * `src/train_model.py`: Add `LGBMClassifier` candidate training pipeline with `scale_pos_weight` and GroupShuffleSplit on `route_id`.
  * `models/lightgbm_candidate.joblib`: Serialized candidate model.
  * `models/model_metadata.json`: Updated metadata recording side-by-side comparison between Logistic Regression, Random Forest, and LightGBM.
  * `tests/test_model_candidate.py`: Unit tests validating model artifact serialization and inference interface.
* **Acceptance Criteria:**
  1. Evaluated strictly on identical `GroupShuffleSplit` test partition (15,451 rows).
  2. LightGBM evaluated against baseline across PR-AUC, ROC-AUC, Brier score, Precision@0.10, Recall@0.10, Precision@0.15, Recall@0.15.
  3. **Champion Promotion Threshold:** LightGBM promoted to champion ONLY IF Test $\text{PR-AUC} \ge 0.1500$ (baseline: $0.1124$) AND $\text{ROC-AUC} \ge 0.6500$ (baseline: $0.5549$). Otherwise, Logistic Regression remains baseline champion.
* **Rollback Steps:**
  1. Remove `models/lightgbm_candidate.joblib` and `tests/test_model_candidate.py`.
  2. Revert `src/train_model.py` and `models/model_metadata.json` via `git checkout`.
* **Approval Gate:** **User approval of comparative model evaluation metrics required before Phase 3.3.**

---

### Phase 3.3 — Probability Calibration & Threshold Validation
* **Prerequisites:** Phase 3.2 approved by user.
* **Existing Files to Reuse:** `src/train_model.py`, `src/data_pipeline.py`, `models/`.
* **Deliverables:**
  * `models/isotonic_calibrator.joblib`: Monotonic calibrator fitted strictly on Validation split predictions.
  * `src/train_model.py`: Calibration pipeline and reliability curve generator.
  * `docs/THRESHOLD_VALIDATION_REPORT.md`: Comprehensive report executing the 5-step validation procedure (loss matrix, capacity constraint, cutoff sweep).
  * `models/model_metadata.json`: Logged calibration Brier score and validated provisional thresholds $(\tau_{\text{low}}, \tau_{\text{med}})$.
* **Acceptance Criteria:**
  1. Calibrated Brier score improves over uncalibrated model ($\le 0.078$).
  2. Reliability curve demonstrates monotonic empirical probability alignment.
  3. Operational thresholds $(\tau_{\text{low}}, \tau_{\text{med}})$ validated against cost loss function and capacity constraint.
* **Rollback Steps:**
  1. Remove `models/isotonic_calibrator.joblib` and `docs/THRESHOLD_VALIDATION_REPORT.md`.
  2. Revert `src/train_model.py` via `git checkout`.
* **Approval Gate:** **User approval of calibration curves and validated operational thresholds required before Phase 3.4.**

---

### Phase 3.4 — Risk Engine Integration & Banding Enforcement
* **Prerequisites:** Phase 3.3 approved by user.
* **Existing Files to Reuse:** `src/risk_engine.py`, `models/`, `tests/test_engine.py`.
* **Deliverables:**
  * `src/risk_engine.py`: Updated `RiskEngine` loading calibrated model and enforcing validated operational thresholds.
  * `tests/test_engine.py`: Updated unit tests verifying calibrated probability outputs and deterministic tier assignment.
* **Acceptance Criteria:**
  1. All 7 engine tests in `tests/test_engine.py` pass.
  2. Single package inference scoring executes in $\le 5.0\text{ ms}$.
  3. Zero probability clipping or out-of-bounds predictions.
* **Rollback Steps:**
  1. Revert `src/risk_engine.py` and `tests/test_engine.py` via `git checkout`.
* **Approval Gate:** **User review of RiskEngine scoring latency and tests required before Phase 3.5.**

---

### Phase 3.5 — Explainability Engine (Linear SHAP & TreeSHAP) [COMPLETED & TESTED]
* **Prerequisites:** Explicit user authorization to install `shap`; Phase 3.4 approved.
* **Deliverables:**
  * `requirements.txt`: Added `shap>=0.44.0` and `lightgbm>=4.0.0`.
  * `models/background_mean_champion.joblib`: Serialized 73-dimensional development feature expectations from 85,181 development rows.
  * `src/explainers.py`: Implemented `LinearExplainerChampion` (closed-form Linear SHAP in calibrated log-odds space) and `TreeExplainerCandidate` (TreeSHAP in calibrated log-odds space) with domain pillar mapping.
  * `src/risk_engine.py`: Integrated explainers into `predict_risk()` and `predict_batch()`, returning dual-compatible response schema (`factor`, `detail`, `severity` + mathematical SHAP fields) with explicit fallback status.
  * `tests/test_engine.py`: Implemented 12 mathematical and integration unit tests in `TestPhase35ExplainabilityEngine`.
* **Empirical Acceptance Results:**
  1. **Attribution-Only Latency:**
     * Champion (Linear SHAP): Median **0.091 ms** | P95 **0.174 ms** (Target $\le 0.5\text{ ms}$ — **EXCEEDED**).
     * Candidate (TreeSHAP): Median **3.137 ms** | P95 **3.549 ms** (Target $\le 10.0\text{ ms}$ — **EXCEEDED**).
  2. **Mathematical Invariants:** Additivity error $\le 10^{-10}$ for Champion and $\le 10^{-4}$ for Candidate; base value matches development expectation ($\text{base\_value} = -2.3276$).
  3. **Regression Suite:** Full regression suite passed **56/56 tests** cleanly in 22.86s.
  4. **Reporting Guardrails:** Signed log-odds attributions and `risk_driver_share` reported strictly as feature sensitivities without causal claims.
* **Rollback Steps:**
  1. Restore `.pre_3_5.bak` backups for `requirements.txt`, `src/risk_engine.py`, `tests/test_engine.py`.
  2. Remove `src/explainers.py` and `models/background_mean_champion.joblib`.
  3. Run `pip uninstall -y shap slicer`.
* **Approval Gate:** **User sign-off on Phase 3.5 explainability engine and benchmarks required before Phase 4.**

---

### Phase 4 — API & Model-Serving Integration [COMPLETED & VERIFIED]
* **Prerequisites:** Phase 3.5 approved by user.
* **Existing Files to Reuse:** `app/server.py`, `tests/test_api.py`.
* **Deliverables:**
  * `app/server.py`: Expose calibrated failure probability, validated risk tiers, and SHAP explainability across `/api/predict` and `/api/intervene/simulate`; batch fleet scoring with 20% capacity cap across `/api/predict/batch`; bidirectional model switching in `/api/model/switch`.
  * `tests/test_api.py`: Updated integration tests for Pydantic schema validation, capacity constraints, and model switching.
* **Acceptance Criteria:**
  1. All 8 API integration tests pass with status code 200.
  2. `/api/predict` response includes calibrated probability, badge color, SHAP attributions, and explainability metadata.
  3. `/api/predict/batch` enforces the 20% vehicle capacity limit and preserves shipment order.
  4. Safe model switching between Champion and Candidate verified with guaranteed Champion restoration.
* **Rollback Steps:**
  1. Revert `app/server.py` and `tests/test_api.py` via `git checkout`.
* **Approval Gate:** **Phase 4 implementation complete and verified (58/58 tests passing). User authorization activates Phase 5.**

---

### Phase 5 — Smart Interventions & Route Optimization [COMPLETED & VERIFIED]
* **Prerequisites:** Phase 4 approved by user.
* **Existing Files to Reuse:** `src/risk_engine.py`, `app/server.py`, `data/sample_test_deliveries.csv`.
* **Deliverables:**
  * `src/risk_engine.py`: Upgraded `simulate_interventions` with monotonic feature bounds, eliminated arbitrary clamp overrides, and enforced dual-threshold recommendation policy with multi-criteria utility ranking and SHAP risk driver alignment.
  * `src/messaging.py`: Multi-channel customer notification engine (SMS, WhatsApp, Email) customized for all 5 intervention types with token replacement and ASCII-safe console compatibility.
  * `src/route_optimizer.py`: Pure Python/NumPy deterministic Nearest-Neighbor + 2-Opt TSP route optimizer with Haversine distance and calibrated urban circuity factor ($\kappa = 1.35$), achieving 69.9% distance savings on the 30-stop Los Angeles benchmark manifest (`RouteID_00143bdd-0a6b-49ec-bb35-36593d303e77`).
  * `app/server.py`: Added `POST /api/route/optimize` and `POST /api/messaging/preview` endpoints while preserving all existing Phase 4 endpoints and response keys.
  * `tests/test_routes.py` & `tests/test_interventions.py`: Dedicated unit test suites (13 new tests).
* **Acceptance Criteria:**
  1. Prescriptive preferences natively reduce predicted failure rates monotonically without clamp hacks; low-risk deliveries receive `recommended=False` (**VERIFIED**).
  2. Route optimization computes $\ge 12\%$ reduction in route kilometers (Achieved **69.9%**, **VERIFIED**).
  3. All 74/74 tests pass across the entire repository suite (**VERIFIED**).
* **Rollback Steps:**
  1. Revert `src/risk_engine.py`, `app/server.py`; remove `src/messaging.py`, `src/route_optimizer.py`, `tests/test_routes.py`, `tests/test_interventions.py`.
* **Approval Gate:** **Phase 5 implementation complete and verified (74/74 tests passing). User authorization activates Phase 6.**

---

### Phase 6 — Frontend Dashboard Polish & End-to-End Release [COMPLETED & VERIFIED]
* **Prerequisites:** Phase 5 approved by user.
* **Existing Files to Reuse:** `static/index.html`, `static/css/style.css`, `static/js/app.js`, all backend modules.
* **Deliverables:**
  * `static/index.html`: Fully upgraded hackathon-grade Command Center UI featuring dedicated Route Optimization View, Dual-Level Savings Cards (Macro sequence 68.9%–69.9% vs Micro intervention 12.5%), Stop Timeline Table, Multi-Channel Customer Messaging Previews (SMS, WhatsApp, Email), Disclosures & Guardrail Banners, and Capacity Badges.
  * `static/css/style.css`: Responsive design enhancements, timeline tables, disclosure notice banners, capacity status pills, and channel preview bubbles.
  * `static/js/app.js`: Live REST client integrations for `POST /api/route/optimize`, `POST /api/messaging/preview`, and `POST /api/intervene/simulate`; transparent rendering of SHAP margin $\Delta\text{logit}$ / `shap_logit` and `risk_driver_share`; rule-based badge labeling for station holds ($P=0.015$).
  * `tests/test_frontend_contracts.py`: Comprehensive 9-test integration suite asserting contract schema adherence, field types, and value constraints for every API endpoint consumed by the frontend.
* **Acceptance Criteria:**
  1. 100% test pass rate across the full repository test suite (Achieved **83/83 tests passing**, **VERIFIED**).
  2. Guardrails transparently embedded: simulated proxy disclaimers, dual route savings breakdown, circuity Haversine distance model disclosure, heuristic hold badges, and demo preview badges (**VERIFIED**).
  3. Preserved backward compatibility: Zero modifications to model weights, thresholds ($\tau_{\text{low}}=0.110, \tau_{\text{med}}=0.140$), Platt calibrators, or API response schemas (**VERIFIED**).
### Phase 7 — Production Packaging, Container Hardening, Latency Profiling & Release Freeze [COMPLETED & VERIFIED]
* **Prerequisites:** Phase 6 approved by user.
* **Existing Files to Reuse:** `Dockerfile`, `docker-compose.yml`, `run.py`, all test suites.
* **Deliverables:**
  * `run.py`: Parameterized host and port binding supporting environment variables (`HOST=0.0.0.0` in container, safe default `127.0.0.1` locally).
  * `Dockerfile`: Multi-stage build with non-root security compliance (`bridgeuser`) and explicit runtime OpenMP support (`libgomp1`) for LightGBM.
  * `docker-compose.yml`: Production container orchestration with automated health check querying `/api/health`.
  * `tests/test_benchmarks.py`: Automated performance test suite measuring isolated model scoring, SHAP attribution, 2-Opt TSP routing, and heap memory stability.
  * `docs/FINAL_RELEASE_REPORT.md`: Comprehensive engineering release report with full empirical telemetry, audit findings, and mathematical proofs.
  * `docs/DEMO_SCRIPT.md`: Step-by-step judge demonstration playbook with presentation narrative and Q&A defense.
* **Acceptance Criteria:**
  1. 100% test pass rate across the full repository test suite (Achieved **89/89 tests passing**, **VERIFIED**).
  2. Sub-millisecond performance demonstrated across isolated scoring, Linear SHAP, and 2-Opt routing (**VERIFIED**).
  3. Zero database mutations or dirty working tree states (**VERIFIED**).
  4. Complete release documentation and demonstration assets generated (**VERIFIED**).
* **Rollback Steps:** Revert `run.py`, `Dockerfile`, `docker-compose.yml`; remove `tests/test_benchmarks.py`, `docs/FINAL_RELEASE_REPORT.md`, `docs/DEMO_SCRIPT.md`.
* **Approval Gate:** **Final Phase 7 release freeze complete and verified (89/89 passing tests). Ready for local Git commit.**

---

## 6. COMPARATIVE MODEL ACCEPTANCE CRITERIA

| Evaluation Dimension | Metric | Locked Baseline (Logistic Regression) | Mandatory Minimum Target (LightGBM Candidate) | Stretch / Monitoring Target |
| :--- | :--- | :---: | :---: | :---: |
| **Imbalanced Discrimination** | **PR-AUC (Precision-Recall)** | **0.1124** | **$\ge 0.1500$** ($\Delta \ge +0.0376$) | $\ge 0.2200$ |
| **Overall Discrimination** | **ROC-AUC** | **0.5549** | **$\ge 0.6500$** ($\Delta \ge +0.0951$) | $\ge 0.7200$ |
| **Probability Calibration** | **Brier Score Loss** | **0.0825** | **$\le 0.0780$** | $\le 0.0720$ |
| **Operational Precision** | **Precision @ Top 10% Risk** | 16.77% | $\ge 25.00\%$ | $\ge 35.00\%$ |
| **Operational Recall** | **Recall @ Top 10% Risk** | 3.98% | $\ge 15.00\%$ | $\ge 25.00\%$ |
| **Inference Latency** | **Single Package Scoring** | $\sim 2.1\text{ ms}$ | **$\le 5.0\text{ ms}$** | $\le 2.0\text{ ms}$ |
| **Explanation Latency** | **TreeSHAP Attribution** | N/A (Heuristic) | **$\le 10.0\text{ ms}$** | $\le 2.0\text{ ms}$ |

---

## 7. TESTING STRATEGY MATRIX

| Test Scope | Verification Method | Target File | Status |
| :--- | :--- | :--- | :--- |
| **Feature Contract Validation** | Unit test asserting 44 columns, correct types, no missing categoricals | `tests/test_engine.py` | **VERIFIED (PASSING)** |
| **Target & Post-Dispatch Leakage** | Assertion that `first_attempt_failed`, `scan_status` are excluded | `tests/test_engine.py` | **VERIFIED (PASSING)** |
| **Route Group Split Isolation** | Assert 0 route overlap between Train, Val, and Test sets | `tests/test_engine.py` | **VERIFIED (PASSING)** |
| **DuckDB 44-Feature Equivalence** | Assert SQL query returns 0 mismatches across all 44 features vs pandas | `tests/test_duckdb.py` | **VERIFIED (8/8 PASSING)** |
| **Isolated Test SQLite DB** | Pytest fixture using `:memory:` DB to prevent mutating `bridge_local.db` | `conftest.py` | **VERIFIED (PASSING)** |
| **Candidate Model Promotion** | Assert candidate model evaluated on identical splits; PR-AUC compared | `tests/test_model_candidate.py` | **VERIFIED (8/8 PASSING)** |
| **Calibration Reliability Curve**| Assert monotonic empirical probability calibration across deciles | `tests/test_calibration.py` | **VERIFIED (7/7 PASSING)** |
| **Probability Bounds** | Assert $0.0 \le P \le 1.0$ for all records | `tests/test_engine.py` | **VERIFIED (PASSING)** |
| **Provisional Risk Banding** | Assert exact band assignment at threshold boundaries | `tests/test_engine.py` | **VERIFIED (PASSING)** |
| **TreeSHAP Output Correctness** | Assert sum of Shapley attributions equals model margin | `tests/test_engine.py` | **VERIFIED (PASSING)** |
| **API Endpoints & Schemas** | FastAPI TestClient testing health, sample, predict, intervene, route, messaging | `tests/test_api.py` | **VERIFIED (11/11 PASSING)** |
| **Feedback Loop Prior Update** | Assert `POST /api/delivery/complete` updates Beta-Binomial prior | `tests/test_api.py` | **VERIFIED (PASSING)** |
| **Route Optimization Constraints**| Assert 2-Opt permutation validity, determinism, and >=12% route savings | `tests/test_routes.py` | **VERIFIED (6/6 PASSING)** |
| **Smart Prescriptive Interventions**| Assert monotonic risk reduction, utility ranking, low-risk filter, multi-channel templates | `tests/test_interventions.py` | **VERIFIED (7/7 PASSING)** |
| **Frontend API Contracts** | FastAPI TestClient testing all UI endpoints consumed by `app.js` | `tests/test_frontend_contracts.py` | **VERIFIED (9/9 PASSING)** |
| **Performance & Latency Benchmarks** | Pytest benchmark assertions for isolated scoring, SHAP, 2-Opt, and RAM | `tests/test_benchmarks.py` | **VERIFIED (6/6 PASSING)** |
| **End-to-End Regression Suite** | Full pytest suite passing in CI/CD container | `tests/` | **VERIFIED (89/89 PASSING)** |

---

## 8. NON-NEGOTIABLE GOVERNANCE RULES

1. **Inspect Before Modifying:** Never modify code before inspecting the relevant existing implementation.
2. **Preserve Baseline Baselines:** Logistic Regression and Random Forest remain the locked baselines. Never assume candidate superiority without comparative PR-AUC evidence.
3. **Provisional Cutoffs:** Never freeze risk thresholds based only on positive class prevalence.
4. **No Untested Claims:** Never claim a performance or latency improvement without empirical benchmark logs.
5. **Zero Target Leakage:** Never train on post-dispatch or post-outcome features (`scan_status`, terminal delivery notes).
6. **Strict Preprocessor Fit:** Never fit preprocessors on validation or test data.
7. **Separate Calibration Data:** Never calibrate or select thresholds using the final test set.
8. **Test Isolation:** Never permit automated test suites to dirty tracked repository files (`data/bridge_local.db`).
9. **Synthetic Data Honesty:** Never treat synthetic-data results as proof of real-world operational performance.
10. **Non-Causal Explanation:** Never claim that SHAP establishes physical causality or guarantees intervention outcomes.
11. **Truth in Testing:** Never report unexecuted tests as passing.
12. **No Hallucinated Artifacts:** Never invent files, metrics, endpoints, or capabilities.
13. **Contract Stability:** Never change the 44-feature contract silently.
14. **Git Safety:** Never push code, change branches, or alter Git history without explicit authorization.
15. **Credential Protection:** Never expose credentials, API keys, or secrets in code or commits.
16. **Explicit Approval Gates:** Every roadmap phase must report results, prove acceptance criteria, and obtain user sign-off before the next phase begins.
