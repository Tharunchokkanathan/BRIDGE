# BRIDGE — AI-Powered First Attempt Delivery Success Engine

[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/release/python-3110/)
[![Framework](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.9+-orange.svg)](https://scikit-learn.org/)
[![Status](https://img.shields.io/badge/Hackathon-Production--Ready%20MVP-brightgreen.svg)]()

> **Theme 4:** AI-Powered First Attempt Delivery Success Engine  
> **Repository:** [Tharunchokkanathan/BRIDGE](https://github.com/Tharunchokkanathan/BRIDGE)  
> **Source Base:** Forked & expanded from [TamilarasanHQ/bridge-first-attempt-delivery-engine](https://github.com/TamilarasanHQ/bridge-first-attempt-delivery-engine)

---

## 📌 Executive Summary

Last-mile delivery is one of the most expensive components of logistics. When a package fails on its first attempt, fuel is wasted, driver labor hours balloon, and redelivery doubles the network cost.

**BRIDGE** predicts the probability of first-attempt delivery failure **before package dispatch**, using historical customer delivery intelligence and environmental context. When elevated risk is detected, BRIDGE triggers an automated, proactive customer intervention workflow, enabling customers to choose smart alternatives (e.g. Access Point / Locker, Hold for Pickup, Another Day, or Neighbor Drop-off) to guarantee successful delivery.

```
Pre-Dispatch Intelligence          ML Risk Engine           Risk Assessment         Proactive Customer Flow
-------------------------          --------------           ---------------         -----------------------
Customer Delivery History  \                                / Low (<10%)    --->    Standard Dispatch
Time-Window & Preferences   --->  [ Logistic Regression ]  ---> Medium (10-20%) ---> Availability SMS Check
Access Difficulty & Sig.   /      [  & Random Forest    ]   \ High (>=20%)   --->    Smart Preference Portal
Route Traffic & Weather   /                                                         (Locker / Hold / Reschedule)
```

---

## 🚀 Key Features

* **Pre-Dispatch Risk Prediction:** Leakage-safe model trained on 200,000 deliveries across 800+ independent routes.
* **Leakage-Safe Data Pipeline:** Group-aware splitting (`GroupShuffleSplit` on `route_id`) ensures packages from the same route never leak into evaluation.
* **Explainable Risk Drivers:** Pinpoints exact failure drivers (e.g., departure time mismatch with customer preference, low historical availability, high access difficulty).
* **Smart Customer Intervention Portal:** Simulated mobile web interface with 5 interactive preference choices, achieving a **36% to 65% risk drop**.
* **Dispatcher Command Center:** Modern dark-mode dashboard for logistics managers to monitor and manage pre-dispatch queues in real time.
* **Business Impact:** Projected **+12.2% boost** in first-attempt success rate (from 82.4% to 94.6%) and **~18% fuel & labor savings**.

---

## 🛠️ Repository Structure

```
BRIDGE/
├── app/
│   └── server.py             # FastAPI backend REST API
├── data/
│   ├── sample_test_deliveries.csv  # Sample pre-dispatch deliveries for live demo
│   └── processed/            # Phase 1 validation reports & schema metadata
├── docs/                     # Full technical architecture & pipeline specs
├── models/
│   ├── champion_model.joblib # Calibrated Champion Model (Logistic Regression)
│   ├── random_forest.joblib  # Calibrated Random Forest (100 Trees)
│   ├── preprocessor.joblib   # Train-only fitted preprocessor
│   └── model_metadata.json   # Benchmark metrics & feature importances
├── notebooks/                # Exploratory Data Analysis & data inspection
├── src/
│   ├── data_pipeline.py      # Route-group-aware split & train-only preprocessor
│   ├── train_model.py        # Model training, calibration, and benchmark script
│   ├── risk_engine.py        # Risk scoring & customer intervention engine
│   ├── extract_sample.py     # High-speed data extraction utility
│   ├── clean_and_validate.py # Phase 1 data cleaning & integrity validation
│   └── feature_engineering.py# Phase 1 pre-dispatch feature engineering
├── static/
│   ├── index.html            # Dispatcher & Customer Intervention Dashboard
│   ├── css/style.css         # Glassmorphism dark mode design system
│   └── js/app.js             # Real-time UI logic & mobile simulator
├── requirements.txt          # Python dependencies
├── run.py                    # One-click application launcher
└── LICENSE                   # MIT License
```

---

## ⚡ Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/Tharunchokkanathan/BRIDGE.git
cd BRIDGE
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Launch the Application
```bash
python run.py
```
Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser!  
Interactive API docs are available at **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**.

---

## 📊 Model Benchmark (Evaluated on 30,469 Unseen Deliveries)

| Metric | Logistic Regression (Champion) | Random Forest (100 Trees) |
|---|:---:|:---:|
| **PR-AUC (Precision-Recall AUC)** | **0.1139 ★** | 0.1114 |
| **ROC-AUC** | **0.5611** | 0.5510 |
| **Brier Score (Calibration)** | 0.2464 | **0.2301** |
| **Training Time** | **1.60s** | 4.60s |
| **Validation Strategy** | Group-aware disjoint routes | Group-aware disjoint routes |

---

## 📜 License & Compliance

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
