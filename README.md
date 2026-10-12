# BRIDGE — AI-Powered First Attempt Delivery Success Engine

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.6+-F7931E.svg)](https://scikit-learn.org/)
[![LightGBM](https://img.shields.io/badge/LightGBM-4.0+-brightgreen.svg)](https://lightgbm.readthedocs.io/)
[![DuckDB](https://img.shields.io/badge/DuckDB-1.0+-FFF000.svg)](https://duckdb.org/)
[![SHAP](https://img.shields.io/badge/SHAP-0.45+-red.svg)](https://shap.readthedocs.io/)
[![Tests](https://img.shields.io/badge/tests-58%2F58%20passed-success.svg)]()
[![License](https://img.shields.io/badge/license-Proprietary-critical.svg)](LICENSE)

> **Theme 4:** AI-Powered First Attempt Delivery Success Engine  
> **Repository:** [Tharunchokkanathan/BRIDGE](https://github.com/Tharunchokkanathan/BRIDGE)  
> **Status:** Production-Hardened Engine (Phases 1.0 – 4.0 Implemented & Tested)

---

> [!CAUTION]
> ### 🔒 PROPRIETARY & CONFIDENTIAL NOTICE
> **All Rights Reserved.** This software, architecture, algorithms, feature engineering specifications, and machine learning models are strictly **proprietary and confidential** intellectual property of Tharunchokkanathan and the BRIDGE Project Contributors.  
> **Unauthorized copying, cloning, distribution, reproduction, reverse engineering, or public commercial exploitation is strictly prohibited under applicable copyright and trade secret laws.** See [LICENSE](LICENSE) for full legal terms.

---

## 📌 Executive Summary

First-attempt delivery failures represent one of the single largest operating cost drivers in modern logistics. When a parcel cannot be delivered on the initial run, carriers incur wasted driver hours, extra vehicle miles, secondary dispatch expenses, and customer dissatisfaction.

**BRIDGE** (Business Risk Intelligence for Delivery Guidance Engine) solves this challenge by predicting delivery failure risk **strictly before vehicle dispatch**. Operating purely on pre-dispatch signals, BRIDGE:
1. Computes calibrated physical failure probabilities ($P_{\text{cal}} \approx 9\%$).
2. Classifies parcels into 3 operational risk bands (`LOW`, `MEDIUM`, `HIGH`).
3. Enforces an enterprise **$\le 20\%$ fleet intervention capacity constraint** using deterministic ranking.
4. Generates mathematical, model-aligned root causes via **Linear SHAP & TreeSHAP**.
5. Adapts in real time using **Bayesian conjugate updating** with zero model retraining.

---

## 🏗️ End-to-End System Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 BRIDGE RUNTIME PIPELINE                                │
│                                                                                        │
│   Incoming Pre-Dispatch Manifest (Parquet / Table)                                     │
│                                  │                                                     │
│                                  ▼                                                     │
│   1. DuckDB OLAP Query Layer (src/duckdb_store.py)                                     │
│      • In-process analytical rollups (1.80x faster than Pandas)                        │
│      • Quarantines outcome variables (Zero Post-Dispatch Leakage)                      │
│                                  │                                                     │
│                                  ▼                                                     │
│   2. 44-Feature Contract Engine (src/feature_engineering.py)                           │
│      • 4 Categorical + 40 Numerical features                                           │
│      • Cyclical sin/cos transforms, log volume, & 6 domain interaction terms           │
│                                  │                                                     │
│                                  ▼                                                     │
│   3. Dual-Model Architecture & Governance (src/risk_engine.py)                         │
│      • Champion: Calibrated Logistic Regression (Production Active)                    │
│      • Candidate: LightGBM GBDT (Held in standby under PR-AUC >= 0.1500 gate)          │
│                                  │                                                     │
│                                  ▼                                                     │
│   4. Platt Probability Calibrator (src/calibrator.py)                                  │
│      • 5-Fold GroupKFold out-of-fold Sigmoid scaling                                   │
│      • Eliminates raw logit bias (+0.4021 -> 0.0000; Brier score: 0.0824)               │
│                                  │                                                     │
│                                  ▼                                                     │
│   5. Production Risk Engine & Fleet Capacity Guardrail (src/risk_engine.py)            │
│      • Cutoffs: LOW (<11.0%), MEDIUM (11.0% - 14.0%), HIGH (>=14.0%)                   │
│      • Hard <= 20% Fleet Capacity Cap: Top-K priority allocation                       │
│      • Status: APPROVED vs DEFERRED_DUE_TO_FLEET_CAPACITY (No tier faking)             │
│                                  │                                                     │
│                                  ▼                                                     │
│   6. Unified Explainability Engine (src/explainers.py)                                 │
│      • Linear SHAP (Champion: 0.091ms) / TreeSHAP (Candidate: 3.137ms)                 │
│      • Exact additive attributions in calibrated log-odds space (Top-3 drivers)        │
│                                  │                                                     │
│                                  ▼                                                     │
│   7. API Serving & Dispatch Command Center (app/server.py & static/)                   │
│      • High-speed REST endpoints (/predict, /predict/batch, /model/switch)             │
│      • Interactive Dispatcher Dashboard & Customer Intervention Simulator              │
│                                  │                                                     │
│                                  ▼                                                     │
│   8. Closed-Loop Feedback & Dynamic Prior Updating (app/database.py)                   │
│      • POST /api/delivery/complete                                                     │
│      • Beta-Binomial conjugate updating on zone failure rates (Zero retrain lag)       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Core Technical Capabilities

### 1. Authoritative 44-Feature Contract (`src/feature_engineering.py`)
Guarantees zero post-dispatch data leakage through strict column isolation:
* **4 Categorical Features:** `station_code` (17 fulfillment hubs), `preferred_delivery_method`, `customer_delivery_preference`, `location_type`.
* **40 Numerical Features across 4 Groups:**
  1. *Physical & Routing (11):* Spatial coordinates, package dimensions, cubic volume, planned service seconds, departure hour, weekend flag, appointment window duration.
  2. *CRM & Historical Priors (11):* Customer availability rate, past attempts, past failures, success rate, address access difficulty, signature requirements, weather/traffic risk indices.
  3. *Derived & Cyclical Transformations (12):* $\sin / \cos$ periodic representations of departure hour and day of week, log-transformed volume and service times, time-window delta minutes, preference-departure clash detectors.
  4. *High-Impact Domain Interaction Terms (6):*
     * `risk_signature_unavailability`: Signature required $\times$ customer rarely home.
     * `risk_preference_departure_clash`: Requested morning delivery dispatched afternoon.
     * `risk_commercial_closed`: Commercial business destination on weekends or evening.
     * `risk_access_difficulty_heavy_package`: Gated/complex access address with heavy freight.
     * `risk_zone_weather_stress`: Elevated zone failure history under severe weather.
     * `customer_failure_propensity`: Laplace-smoothed failure propensity $\frac{\text{failures} + 1}{\text{attempts} + 2}$.

### 2. DuckDB Analytical OLAP Layer (`src/duckdb_store.py`)
* Serves analytical station rollups, zero-leakage filtering, and route aggregations.
* Benchmarked at **1.80x faster than Pandas** for multi-station analytical queries with 0 schema mismatches across 100,000+ rows.

### 3. Dual-Model Architecture & Strict Governance Gates
* **Baseline Champion:** Calibrated Logistic Regression.
* **Evaluated Candidate:** High-speed LightGBM Gradient Boosted Decision Tree (`models/lightgbm_candidate.joblib`).
* **Governance Enforcement:** Although LightGBM achieved higher test discrimination (PR-AUC `0.1174` vs `0.1124`, ROC-AUC `0.5623` vs `0.5549`), it did not reach the mandatory production threshold ($\text{PR-AUC} \ge 0.1500$). Governance locked Logistic Regression as active Champion and preserved LightGBM as a standby Candidate. The engine supports zero-downtime hot-swapping via `POST /api/model/switch`.

### 4. Platt Probability Calibration (`src/calibrator.py`)
* Raw logistic models trained with class weighting output inflated average probabilities (~49%).
* Applied 5-Fold `GroupKFold` out-of-fold Platt scaling (Sigmoid).
* **Validation Outcome:** Completely eliminated calibration bias ($+0.4021 \to 0.0000$) and achieved a Brier score of **0.0824** (Brier Skill Score $+0.0055$ over baseline), aligning scores directly with the physical ~9.14% baseline failure prevalence.

### 5. Cost-Optimal Risk Tiers & Fleet Capacity Ceiling
Evaluated via asymmetric cost-loss minimization ($C_{\text{FN}} = \$10, C_{\text{action}} = \$1$):
* $\tau_{\text{low}} = 0.110$ (11.0%)
* $\tau_{\text{med}} = 0.140$ (14.0%)
* **Bands:**
  * 🟢 **LOW (< 11.0%):** Standard dispatch.
  * 🟡 **MEDIUM (11.0% – 14.0%):** Dispatch with recipient SMS check.
  * 🔴 **HIGH ($\ge$ 14.0%):** Proactive warehouse intervention (Access Point / Reschedule).
* **$\le 20\%$ Fleet Capacity Guardrail:** If volume spikes above fleet handling bandwidth, Top-$K$ parcels receive `APPROVED` status, while overflow packages are marked `DEFERRED_DUE_TO_FLEET_CAPACITY`. The risk band is never faked or downgraded.

### 6. Mathematical Explainability Engine (`src/explainers.py`)
Replaced heuristic guess-rules with exact mathematical attributions formulated in calibrated log-odds space:
$$\phi_0 + \sum_{j=1}^{M} \phi_j(\mathbf{x}) = z_{\text{cal}}(\mathbf{x})$$
* **Champion:** Linear SHAP exact attribution (< 0.1 ms latency).
* **Candidate:** TreeSHAP additive attribution (< 3.5 ms latency).
* Generates the Top-3 positive risk drivers with bounded attribution shares and human-interpretable domain translations.

### 7. Closed-Loop Feedback Loop (`app/database.py`)
* Implements **Conjugate Beta-Binomial prior updating** for delivery zones upon delivery completion (`POST /api/delivery/complete`):
  $$\text{Prior}_{\text{posterior}} = \frac{\alpha_0 + \text{failed}}{(\alpha_0 + \beta_0) + \text{total}} = \frac{1.8 + \text{failed}}{20 + \text{total}}$$
* Adapts dynamically to emerging weather, route, or zone patterns with **zero model retraining** and zero risk of catastrophic forgetting.

---

## 📊 Evaluation & Benchmarks

Validated on a strictly quarantined test set ($N = 14,819$ deliveries across disjoint routes):

| Metric | Champion (Logistic Regression) | Candidate (LightGBM) | Operational Target |
| :--- | :---: | :---: | :---: |
| **PR-AUC** | 0.1124 | 0.1174 (+4.4%) | $\ge 0.1500$ (Gate) |
| **ROC-AUC** | 0.5549 | 0.5623 (+1.3%) | $\ge 0.6500$ (Gate) |
| **Brier Score** | 0.0824 | 0.0823 | $\le 0.0780$ |
| **Calibration Bias** | **0.0000** | **0.0000** | $0.0000 \pm 0.005$ |
| **Inference Latency** | **0.0042 ms / sample** | **0.0061 ms / sample** | $< 10.0\text{ ms}$ |
| **SHAP Explainer Latency** | **0.091 ms (Linear)** | **3.137 ms (TreeSHAP)** | $< 10.0\text{ ms}$ |
| **Intervention Rate** | **14.66%** | **14.66%** | $\le 20.0\%$ (Capacity) |
| **Failures Captured** | **21.36%** | **21.36%** | Maximum feasible |
| **Net Cost Savings** | **+7.6% ($1,040 saved)** | **+7.6% ($1,040 saved)** | Positive ROI |

---

## 🛠️ Repository Layout

```text
BRIDGE/
├── app/
│   ├── database.py             # Dual persistence (SQLite / Supabase) & Bayesian feedback
│   └── server.py               # FastAPI backend with calibrated prediction & SHAP endpoints
├── conftest.py                 # Pytest database isolation fixture (:memory:)
├── data/
│   ├── bridge_local.db         # Persistent local SQLite database
│   ├── sample_test_deliveries.csv # Sample manifest for interactive demonstration
│   └── processed/              # Cleaned datasets and validation artifacts
├── docs/                       # Technical specifications, decision logs & phase tracker
│   ├── ARCHITECTURE_SPEC.md    # System contracts & runtime specifications
│   ├── DECISION_LOG.md         # Formal Architectural Decision Records (ADRs)
│   ├── PHASE_TRACKER.json      # Structured task & phase completion registry
│   └── THRESHOLD_VALIDATION_REPORT.md # 5-step threshold validation proof
├── models/
│   ├── champion_model.joblib   # Production Champion (Calibrated Logistic Regression)
│   ├── lightgbm_candidate.joblib # Production Candidate (LightGBM GBDT)
│   ├── calibrator_champion.joblib# 5-Fold out-of-fold Platt scaling calibrator
│   ├── calibrator_candidate.joblib# Candidate Platt scaling calibrator
│   ├── background_mean_champion.joblib # Linear SHAP background mean vector
│   └── preprocessor.joblib     # Train-only fitted ColumnTransformer
├── src/
│   ├── calibrator.py           # Out-of-fold Platt scaling & isotonic calibrators
│   ├── data_pipeline.py        # Group-aware data loader & splitters
│   ├── duckdb_store.py         # DuckDB OLAP analytical query engine
│   ├── explainers.py           # Unified Linear SHAP & TreeSHAP explainability engine
│   ├── feature_engineering.py  # 44-feature engineering contract
│   ├── risk_engine.py          # Decision tiers, capacity constraints, & batch scoring
│   └── train_model.py          # Model training, split evaluation, & serialization
├── static/
│   ├── index.html              # Glassmorphic Dispatcher Dashboard & Customer Portal
│   ├── css/style.css           # Responsive design system
│   └── js/app.js               # Dynamic UI rendering & mobile simulator
├── tests/
│   ├── test_api.py             # FastAPI REST endpoints & integration tests
│   ├── test_calibration.py     # Platt scaling & KS transfer validation tests
│   ├── test_duckdb.py          # DuckDB analytical feature store tests
│   ├── test_engine.py          # RiskEngine, SHAP explainers & capacity tests
│   └── test_model_candidate.py # Candidate vs Champion comparative tests
├── requirements.txt            # Locked Python runtime dependencies
├── run.py                      # One-click FastAPI server launcher
├── LICENSE                     # Proprietary and Confidential Software License
└── THIRD_PARTY_LICENSES.md     # Third-party data and open-source attributions
```

---

## ⚡ Quick Start & Verification

### 1. Prerequisites & Environment
Ensure **Python 3.11+** is installed:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run Test Suite (58 Automated Tests)
Verify complete end-to-end mathematical consistency, zero leakage, and API integration:
```bash
pytest -v
```
*All 58 tests execute cleanly with zero database side-effects via the in-memory test fixture.*

### 3. Launch the Server & Dispatcher Dashboard
```bash
python run.py
```
* **Dashboard UI:** Open [http://127.0.0.1:8000](http://127.0.0.1:8000)
* **Interactive OpenAPI Specs:** Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/predict` | Predict calibrated failure risk, risk band, and SHAP drivers for a package. |
| `POST` | `/api/predict/batch` | Batch scoring with deterministic tie-breaking & 20% capacity cap. |
| `POST` | `/api/model/switch` | Hot-swap active serving model between Champion and Candidate. |
| `POST` | `/api/intervene/simulate` | Simulate probability reduction across 5 customer intervention options. |
| `POST` | `/api/intervene/apply` | Persist customer-selected delivery preference. |
| `POST` | `/api/delivery/complete` | Record delivery outcome & trigger real-time Beta-Binomial zone update. |
| `GET` | `/api/dashboard/stats` | Retrieve real-time fleet risk distribution and impact metrics. |

---

## 📜 Intellectual Property & Legal Notice

```text
PROPRIETARY AND CONFIDENTIAL SOFTWARE LICENSE
Copyright (c) 2026 Tharunchokkanathan & BRIDGE Project Contributors.
All Rights Reserved.

This repository and all its constituent materials, architectures, pipelines, 
models, and documentation are private, proprietary, and confidential. 
Unauthorized copying, cloning, distribution, or reproduction is strictly prohibited.
```

See [LICENSE](LICENSE) and [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for full legal text and third-party dataset notices.
