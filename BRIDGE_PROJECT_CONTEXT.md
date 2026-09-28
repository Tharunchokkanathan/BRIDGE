# BRIDGE — AI-Powered First Attempt Delivery Success Engine
## Portable Project Context / Handoff / Project History

> **Purpose:** This document is the single source of context for continuing the BRIDGE hackathon project in a new ChatGPT/Gemini/Claude/Antigravity chat without losing technical decisions, dataset history, completed work, assumptions, or next steps.
>
> **Current status:** Phase 1.7 is COMPLETE and VERIFIED. Do not redo or redesign Phase 1 unless a concrete defect is discovered.

---

# 1. PROJECT IDENTITY

**Project:** BRIDGE  
**Theme:** Theme 4 — **AI-Powered First Attempt Delivery Success Engine**

### Core problem

Predict the probability that a package will fail on its **first delivery attempt**, **before dispatch**, and use that risk prediction to trigger an appropriate customer/intervention flow.

The intended flow is:

```text
Historical + Current Delivery Data
              ↓
      Pre-Dispatch Features
              ↓
       ML Risk Prediction
              ↓
   Probability of First-Attempt
          Failure
              ↓
      Risk Assessment
       ↙     ↓      ↘
     Low   Medium   High
                      ↓
          Customer Notification
                      ↓
        Customer Preference Selection
                      ↓
      Better Delivery Arrangement
```

Potential customer options include:
- Access Point
- Hold for Pickup
- Another Day
- Other appropriate delivery preferences

The exact UI/intervention design can evolve later, but the central technical objective must remain:

> **Predict first-attempt delivery failure before dispatch using only information available before dispatch.**

---

# 2. TEAM / TIME / SKILL CONSTRAINTS

- Team has approximately **1 week** for the hackathon.
- Team members are primarily CSE / AI&ML students.
- Team does not have deep experience with complex ML, GenAI, or deployment stacks.
- Therefore the MVP should prioritize:
  - technically defensible ML
  - clear data pipeline
  - leakage prevention
  - explainable risk prediction
  - simple backend/frontend
  - demonstrable end-to-end flow
- Avoid unnecessary complexity.
- Do not introduce advanced architectures merely for appearance.
- The project should be explainable to hackathon judges.

---

# 3. AGREED TECHNICAL STRATEGY

The project uses:

1. A large Amazon delivery/package dataset as the real-data base.
2. Synthetic pre-dispatch customer/context features because the base dataset does not contain all information required by the problem statement.
3. A synthetic `first_attempt_failed` target because the base data does not provide a reliable first-attempt-failure label.
4. Feature engineering to create a leakage-safe ML dataset.
5. Logistic Regression and Random Forest as baseline/primary models.
6. Risk probabilities from the trained model.
7. A rule/decision layer that converts probability into risk/intervention behavior.
8. A lightweight FastAPI/backend + frontend for the hackathon MVP.

### Important synthetic-data caveat

The target is synthetic.

Therefore:

> Model performance demonstrates that the pipeline can learn the intentionally designed relationships in the synthetic dataset. It must NOT be presented as proof of real-world delivery-failure prediction accuracy.

This caveat should remain in technical documentation and should be explained honestly if judges ask.

---

# 4. CURRENT REPOSITORY / FRIEND'S STRUCTURE

The friend's implementation should follow approximately:

```text
BRIDGE/
├── data/
│   └── amazon_delivery_dataset.csv
├── feature_engine.py
├── train_risk_model.py
├── risk_engine.py
├── server.py
└── static/
```

For the data pipeline, the friend should use the **cleaned/final dataset**, not the original raw/master CSV.

Dataset generation code should NOT remain as part of the production pipeline.

---

# 5. DATASET HISTORY

## Phase 1.3 — Amazon Master Dataset

The project started from an Amazon delivery/package dataset containing approximately:

- **1,457,175 rows**
- originally **24 columns** after initial processing

The dataset provides real delivery/package/route information but does not provide all required customer-history and pre-dispatch behavioral variables.

Therefore the project intentionally augments it with synthetic variables.

---

# 6. PHASE 1.4 — CLEAN & VALIDATE AMAZON MASTER DATASET

### Input

```text
data/processed/amazon_master_delivery_dataset.parquet
data/processed/amazon_master_delivery_dataset.csv
```

### Output

```text
data/processed/amazon_master_delivery_dataset_clean.csv
data/processed/amazon_master_delivery_dataset_clean.parquet
phase_1_4_validation_results.json
phase_1_4_validation_report
```

### Results

Rows:

```text
Before: 1,457,175
After:  1,457,175
```

Columns:

```text
Before: 24
After:  23
```

Removed:

```text
time_window_duration
```

Kept:

```text
time_window_duration_hours
```

### Missing values

| Column | Missing | Percentage |
|---|---:|---:|
| zone_id | 10,901 | 0.75% |
| time_window_start | 1,343,182 | 92.18% |
| time_window_end | 1,343,182 | 92.18% |
| time_window_duration_hours | 1,343,182 | 92.18% |

All other 19 columns had no missing values.

### Validation findings

- Time-window start/end values were paired consistently.
- No unparseable timestamps were found.
- No invalid start > end cases.
- Coordinates were valid.
- Categorical values were validated.
- Duplicate full rows: **0**
- Duplicate route + stop + package combinations: **0**
- Duplicate `package_id` across routes/stops: **1,432**
  - retained because package IDs can appear across route/stop contexts.
- Outliers were reported, not automatically removed.
- `height_cm <= 0`: exactly **24 rows**
  - likely flat/envelope-like packages
  - preserved.
- Package volume formula was checked against dimensions.

### Critical leakage decision

`scan_status` contains post/outcome information.

Therefore:

> **`scan_status` must NEVER be used as an ML input feature.**

`planned_service_time_seconds` is treated as a candidate pre-dispatch feature only under the assumption that it is genuinely known before dispatch.

---

# 7. CLEAN DATASET COLUMNS

The cleaned source dataset contains:

```text
route_id
stop_id
package_id
scan_status
station_code
delivery_date
departure_time
latitude
longitude
zone_id
stop_type
time_window_start
time_window_end
planned_service_time_seconds
depth_cm
height_cm
width_cm
package_volume_cm3
departure_hour
day_of_week
is_weekend
month
time_window_duration_hours
```

---

# 8. PHASE 1.5 — FINALIZE ML SCHEMA

A schema report was created:

```text
phase_1_5_ml_schema_report.md
```

### Identifier columns

```text
route_id
stop_id
package_id
```

These are useful for traceability/grouping but should not be direct ML features.

### Leakage / outcome reference

```text
scan_status
```

This is isolated from the ML feature matrix.

### Existing pre-dispatch source features

Examples include:

```text
station_code
latitude
longitude
zone_id
planned_service_time_seconds
depth_cm
height_cm
width_cm
package_volume_cm3
departure_hour
day_of_week
is_weekend
month
time_window_start
time_window_end
time_window_duration_hours
```

### Synthetic features planned

```text
customer_availability_rate
customer_previous_delivery_attempts
customer_previous_failed_attempts
customer_previous_success_rate
address_access_difficulty
preferred_delivery_method
signature_required
customer_delivery_preference
historical_zone_failure_rate
historical_station_failure_rate
seasonal_failure_rate
traffic_risk_score
weather_risk_score
```

### Important schema decisions

1. `first_attempt_failed` must NOT be derived directly from `scan_status`.
2. `first_attempt_failed` must be generated synthetically from pre-dispatch factors.
3. Synthetic historical rates must be independent priors, not calculated from the target/outcome.
4. Do not use target encoding for `zone_id` in the MVP.
5. Frequency encoding is safer if zone information is used as a numerical feature.
6. `stop_type` is constant (`Dropoff`) and can be excluded from the model.
7. Synthetic features should have logical relationships, not completely independent random values.

---

# 9. PHASE 1.6 — SYNTHETIC PRE-DISPATCH FEATURES + TARGET

### Outputs

```text
data/processed/amazon_delivery_ml_dataset_v1.parquet
data/processed/amazon_delivery_ml_dataset_v1.csv
data/processed/phase_1_6_synthetic_data_report.md
phase_1_6_stats.json
```

### Final size

```text
Rows:    1,457,175
Columns: 37
```

This represents:

```text
23 clean source columns
+ 13 synthetic feature columns
+ 1 synthetic target
= 37 columns
```

### Synthetic target

```text
first_attempt_failed
```

Distribution:

```text
0: 1,323,927  (90.856%)
1:   133,248  (9.144%)
```

The target was generated using:

```text
pre-dispatch risk factors
        ↓
latent logit
        ↓
logistic probability
        ↓
Bernoulli sampling
        ↓
first_attempt_failed
```

It was NOT generated directly from `scan_status`.

### Important target caveat

Because the target was synthetically generated from known risk factors:

- strong model performance is expected
- performance is not real-world validation
- the project should describe the model as an MVP demonstration/prototype unless real labeled first-attempt data is later obtained.

---

# 10. SYNTHETIC FEATURE RANGES / RELATIONSHIPS

Synthetic features included:

### Customer availability

```text
customer_availability_rate
range approximately [0.1, 0.9999]
```

### Previous delivery history

```text
customer_previous_delivery_attempts
range: 0–50

customer_previous_failed_attempts
range: 0–20

customer_previous_success_rate
range: 0–1
```

Logical consistency was enforced:

```text
failed_attempts <= previous_attempts
```

Cold-start cases were handled.

### Address access

```text
address_access_difficulty
range: 1–5
```

### Delivery method

```text
preferred_delivery_method
```

7 synthetic delivery-method categories were used.

### Signature

```text
signature_required
```

Approximately 7.03% were positive.

### Customer preference

```text
customer_delivery_preference
```

5 categories were used.

### Historical priors

```text
historical_zone_failure_rate
historical_station_failure_rate
seasonal_failure_rate
```

These are independent synthetic priors.

They must NOT be calculated from `first_attempt_failed`.

### External/context risk

```text
traffic_risk_score
weather_risk_score
```

Ranges were approximately:

```text
traffic:  [0.2301, 0.98]
weather:  [0.0505, 0.8827]
```

---

# 11. SYNTHETIC RELATIONSHIP CHECKS

Observed synthetic relationships included:

```text
Hand to Customer failure: 10.32%
Locker failure:             8.09%

Signature required:        10.64%
No signature:               9.03%

Access difficulty 1:        8.18%
Access difficulty 5:       11.22%

Morning-only dispatched afternoon: 12.01%
```

These were used to verify that synthetic variables were not meaningless independent noise.

---

# 12. PHASE 1.7 — FEATURE ENGINEERING

### Status

# COMPLETE AND VERIFIED

Do not modify the Phase 1.7 dataset unless an actual defect is discovered.

### Outputs

```text
data/processed/amazon_delivery_ml_features_v1.parquet
data/processed/amazon_delivery_ml_features_v1.csv
data/processed/phase_1_7_feature_engineering_report.md
```

### Final size

```text
Rows: 1,457,175
Columns: 49
```

Breakdown:

```text
3 identifiers
1 target
3 categorical model features
34 numerical model features
8 metadata/non-model columns
```

Therefore:

```text
Candidate ML features = 37
```

---

# 13. PHASE 1.7 — COLUMNS EXCLUDED FROM ML

The following must not enter the feature matrix:

```text
route_id
stop_id
package_id

first_attempt_failed      # target, not X

scan_status               # post/outcome information
delivery_date             # metadata; can be used for splitting
departure_time            # metadata; transformed into hour
stop_type                 # constant Dropoff
time_window_start         # raw timestamp; transformed
time_window_end           # raw timestamp; transformed
zone_id                   # raw categorical; retained as metadata for now
```

`route_id` must remain available for route-group-aware validation.

`delivery_date` must remain available for possible temporal holdout.

---

# 14. PHASE 1.7 — TIME WINDOW ENGINEERING

Created:

```text
has_time_window
window_start_minutes
window_end_minutes
departure_to_window_start_minutes
departure_to_window_end_minutes
```

Kept:

```text
time_window_duration_hours
```

Important:

- Do NOT fabricate missing time-window values.
- Missing derived time-window values remain missing.
- Duration is validated.
- Raw timestamps are not used directly in the model.

---

# 15. PHASE 1.7 — CYCLICAL TIME FEATURES

Created:

```text
departure_hour_sin
departure_hour_cos
day_of_week_sin
day_of_week_cos
```

Also retained:

```text
departure_hour
is_weekend
```

Reason:

Cyclical encoding allows models to represent periodic behavior.

---

# 16. PHASE 1.7 — CUSTOMER FEATURES

Kept:

```text
customer_availability_rate
customer_previous_delivery_attempts
customer_previous_failed_attempts
customer_previous_success_rate
address_access_difficulty
preferred_delivery_method
signature_required
customer_delivery_preference
```

### Important decision

Do NOT create:

```text
customer_failure_history_rate
```

because it would be mathematically redundant with:

```text
customer_previous_success_rate
```

This avoids unnecessary exact complement/linear dependence.

---

# 17. PHASE 1.7 — LOG TRANSFORMATIONS

Created:

```text
log_package_volume
log_planned_service_time
```

Using conceptually:

```text
log1p(original_value)
```

Original values remain available:

```text
package_volume_cm3
planned_service_time_seconds
```

---

# 18. PHASE 1.7 — PREFERENCE MISMATCH FEATURE

Created:

```text
preference_departure_mismatch
```

Logic:

```text
Morning Only:
    mismatch if departure >= 12

Evening Only:
    mismatch if departure < 16

Weekday Only:
    mismatch if weekend

Anytime:
    0

Leave with Guard:
    0
```

This is deterministic and pre-dispatch.

---

# 19. PHASE 1.7 — ZONE HANDLING

Raw:

```text
zone_id
```

was retained as metadata/non-model information.

Target encoding was deliberately avoided.

If a frequency feature is introduced later, it MUST be calculated using the **training split only**.

Never compute frequency/target statistics using the full dataset before splitting.

---

# 20. PHASE 1.7 — FINAL CANDIDATE MODEL FEATURES

### Categorical

```text
station_code
preferred_delivery_method
customer_delivery_preference
```

### Numerical

```text
latitude
longitude
planned_service_time_seconds
depth_cm
height_cm
width_cm
package_volume_cm3
departure_hour
is_weekend
month
time_window_duration_hours
customer_availability_rate
customer_previous_delivery_attempts
customer_previous_failed_attempts
customer_previous_success_rate
address_access_difficulty
signature_required
historical_zone_failure_rate
historical_station_failure_rate
seasonal_failure_rate
traffic_risk_score
weather_risk_score
has_time_window
window_start_minutes
window_end_minutes
departure_to_window_start_minutes
departure_to_window_end_minutes
departure_hour_sin
departure_hour_cos
day_of_week_sin
day_of_week_cos
log_package_volume
log_planned_service_time
preference_departure_mismatch
```

Total:

```text
3 categorical
34 numerical
= 37 candidate ML features
```

---

# 21. PHASE 1.7 — METADATA / NON-MODEL COLUMNS

```text
delivery_date
departure_time
day_of_week
zone_id
stop_type
time_window_start
time_window_end
scan_status
```

These remain useful for traceability, validation, analysis, or future processing but are not part of the candidate feature matrix.

---

# 22. PHASE 1.7 — MISSING VALUES

The following have missing values:

```text
time_window_duration_hours
window_start_minutes
window_end_minutes
departure_to_window_start_minutes
departure_to_window_end_minutes
zone_id
time_window_start
time_window_end
```

Counts:

```text
time-window-related columns:
1,343,182 missing
(92.1771%)

zone_id:
10,901 missing
(0.7481%)
```

All other 41 columns have zero missing values.

The high time-window missingness is expected and must be handled by preprocessing rather than by fabricating data.

---

# 23. PHASE 1.7 — LEAKAGE AUDIT

The final candidate feature matrix was verified to contain NONE of:

```text
first_attempt_failed
scan_status
route_id
stop_id
package_id
delivery_date
departure_time
stop_type
time_window_start
time_window_end
zone_id
```

Additional checks confirmed:

- Feature-engineering code does not use `first_attempt_failed` to construct features.
- Feature-engineering code does not use `scan_status`.
- No target-derived zone statistics were created.
- Synthetic historical priors are independent of target/scan status.

### Leakage rule for all future work

Before every training experiment, explicitly assert that:

```text
target ∉ X
scan_status ∉ X
post-dispatch/outcome fields ∉ X
```

---

# 24. PHASE 1.7 — CORRELATION FINDINGS

Some expected correlations were observed:

```text
package_volume vs log_package_volume
r = +0.7802

planned_service_time vs log_planned_service_time
r = +0.7837

departure_hour vs departure_hour_sin
r = -0.9912
```

The strong cyclical correlation occurs because departure times occupy a relatively narrow 10–18 hour range.

Other relationships:

```text
previous_failed_attempts vs success_rate
r = -0.5699

previous_attempts vs previous_failed_attempts
r = +0.4933
```

These were NOT automatically removed.

Model-specific selection/regularization can be evaluated during Phase 2.

---

# 25. CURRENT VERIFIED DATASET

The main current ML dataset is:

```text
data/processed/amazon_delivery_ml_features_v1.csv
data/processed/amazon_delivery_ml_features_v1.parquet
```

It contains:

```text
1,457,175 rows
49 columns
37 candidate ML features
1 target
3 IDs
8 metadata/non-model columns
```

This is the current handoff point.

---

# 26. IMPORTANT FILES / REPORTS ALREADY CREATED

```text
phase_1_4_validation_results.json
phase_1_5_ml_schema_report.md
data/processed/phase_1_6_synthetic_data_report.md
phase_1_6_stats.json
data/processed/phase_1_7_feature_engineering_report.md
```

Current datasets:

```text
data/processed/amazon_master_delivery_dataset_clean.csv
data/processed/amazon_master_delivery_dataset_clean.parquet

data/processed/amazon_delivery_ml_dataset_v1.csv
data/processed/amazon_delivery_ml_dataset_v1.parquet

data/processed/amazon_delivery_ml_features_v1.csv
data/processed/amazon_delivery_ml_features_v1.parquet
```

---

# 27. WHAT MUST NOT BE CHANGED NOW

Unless an actual defect is found:

### Do not

- regenerate Phase 1.6 synthetic data
- regenerate Phase 1.7 features
- derive the target from `scan_status`
- use `scan_status` as a feature
- use route/stop/package IDs as direct model inputs
- calculate target statistics before splitting
- fit preprocessing on the entire dataset before splitting
- fabricate missing time windows
- add `customer_failure_history_rate`
- target-encode `zone_id`
- claim the synthetic model proves real-world accuracy
- randomly split packages without considering route grouping
- judge models using accuracy alone

### Keep

- synthetic target
- synthetic customer/context variables
- leakage-safe feature engineering
- route information for grouped validation
- delivery date for possible temporal validation
- raw identifiers for traceability
- missing-value handling in preprocessing

---

# 28. IMPORTANT ASSUMPTION

`planned_service_time_seconds` is currently treated as a pre-dispatch feature.

The original Phase 1.4 validation flagged that this is only valid if the value is genuinely known before dispatch.

Therefore the project documentation should state:

> `planned_service_time_seconds` is assumed to be available at the pre-dispatch decision point.

If later evidence shows that it is dynamically determined after dispatch, remove it from the model.

---

# 29. NEXT STEP — PHASE 2.1

## Leakage-safe train / validation / test split + preprocessing

This is the exact point where work should continue.

Do NOT jump directly into model training without designing the split and preprocessing.

Expected flow:

```text
FULL DATA
    ↓
TRAIN / VALIDATION / TEST SPLIT
    ↓
TRAIN ONLY
    ├── fit imputer
    ├── fit categorical encoder
    ├── fit scaler
    └── fit zone-frequency mapping if zone frequency is used
    ↓
Transform TRAIN
Transform VALIDATION
Transform TEST
    ↓
Train models
```

Never fit preprocessing on the full dataset.

---

# 30. PHASE 2.1 — SPLITTING REQUIREMENT

A simple random package-level split is not automatically appropriate because multiple packages can belong to the same route.

Packages within a route can share characteristics and create overly optimistic validation results.

Therefore investigate:

### Option A — Route-group-aware split

Use route as the grouping variable.

Examples:

```text
GroupShuffleSplit
GroupKFold
StratifiedGroupKFold
```

where supported and appropriate.

### Option B — Temporal holdout

Use `delivery_date` to create a realistic future-like test set.

### Preferred design to investigate

A robust combination of:

```text
temporal holdout
+
route-group awareness
```

If a perfect hybrid is impractical for the one-week MVP, choose the most defensible feasible split and document the limitation.

Do not make a split decision silently. Record the rationale in the Phase 2 report.

---

# 31. PHASE 2.1 — PREPROCESSING

### Numerical features

Potential preprocessing:

```text
Missing-value imputation
```

For example median imputation fit on training data only.

Scaling:

```text
Logistic Regression:
    scaling recommended

Random Forest:
    scaling not required
```

A shared preprocessing pipeline can still be designed cleanly, or separate pipelines can be used.

### Categorical features

Candidate columns:

```text
station_code
preferred_delivery_method
customer_delivery_preference
```

Use a leakage-safe encoder, most likely:

```text
OneHotEncoder(handle_unknown="ignore")
```

Fit on training data only.

### Zone frequency

If `zone_frequency` is added:

```text
fit frequency map on TRAIN ONLY
apply to validation/test
unknown/missing zones handled explicitly
```

Do not compute it from the full dataset.

---

# 32. CLASS IMBALANCE

Target distribution:

```text
Failure = 9.144%
Success = 90.856%
```

Therefore class imbalance matters.

Do not use accuracy as the primary metric.

Potential model settings:

```text
class_weight="balanced"
```

for Logistic Regression / Random Forest, followed by evaluation rather than assuming it is automatically better.

---

# 33. PHASE 2.2 — MODEL TRAINING

Planned models:

### Model 1

```text
Logistic Regression
```

Purpose:

- simple baseline
- interpretable
- probability output
- useful coefficient analysis

### Model 2

```text
Random Forest
```

Purpose:

- nonlinear relationships
- interactions
- robust baseline for tabular data
- feature importance

Do not add complex models unless there is a concrete reason.

---

# 34. MODEL EVALUATION

Because this is a failure-risk prediction problem with approximately 9% positives, do not rely on accuracy.

Evaluate at least:

```text
ROC-AUC
PR-AUC / Average Precision
Precision
Recall
F1
Confusion Matrix
```

Potentially also:

```text
Calibration / Brier score
```

because the downstream risk engine consumes a probability.

### Important

Do not declare a model “best” using an arbitrary single metric.

The project needs to consider:

- ability to identify failures
- false alarms
- probability quality
- operational usefulness
- simplicity/explainability

Any model selection should be documented factually.

---

# 35. RISK ENGINE

After the model is trained, the system should expose:

```text
failure_probability
```

Then a decision layer can classify risk.

Example conceptual structure:

```text
probability
    ↓
risk band
    ↓
intervention
```

The exact thresholds should be treated as configurable business rules rather than pretending they are universally correct.

Example only:

```text
Low
Medium
High
```

Thresholds should be chosen after looking at validation behavior and operational trade-offs.

---

# 36. EXPECTED APPLICATION FLOW

A simplified MVP flow:

```text
User / Dispatcher enters or selects order
              ↓
Feature preparation
              ↓
ML model
              ↓
Predicted first-attempt failure probability
              ↓
Risk engine
              ↓
Low / Medium / High risk
              ↓
If elevated risk:
    show reason/risk factors
    notify customer
    offer delivery alternatives
              ↓
Customer selects preferred option
              ↓
System displays updated recommended plan
```

The exact frontend can remain simple.

---

# 37. BACKEND DIRECTION

Current intended lightweight backend:

```text
FastAPI
```

Potential responsibilities:

```text
POST /predict
POST /intervention
GET /health
```

The exact API can be finalized during implementation.

The backend should load the trained model and preprocessing pipeline rather than retraining at request time.

---

# 38. PROJECT IMPLEMENTATION PRINCIPLES

### Principle 1 — No leakage

The model must simulate a real pre-dispatch decision.

### Principle 2 — Synthetic data must be disclosed

Do not imply that synthetic customer history is real Amazon customer history.

### Principle 3 — Simple but defensible

A smaller explainable system is preferable to unnecessary complexity during a one-week hackathon.

### Principle 4 — Reproducibility

Use:

```text
random_state
```

consistently wherever applicable.

### Principle 5 — Train-only fitting

Any learned transformation must be fit on training data only.

### Principle 6 — Preserve traceability

Keep:

```text
route_id
stop_id
package_id
```

available outside X for debugging and analysis.

### Principle 7 — Don't destroy useful raw data

Keep raw columns in the dataset where they are useful for metadata/auditing, but do not automatically feed them to the model.

---

# 39. KNOWN LIMITATIONS

1. `first_attempt_failed` is synthetic.
2. Customer history is synthetic.
3. Traffic/weather risk is synthetic.
4. Historical failure rates are synthetic priors.
5. The project does not currently establish real-world generalization.
6. Amazon dataset semantics may not exactly match the team's target operational environment.
7. `planned_service_time_seconds` relies on a pre-dispatch availability assumption.
8. Time-window data is highly missing.
9. Packages from the same route can be correlated.
10. Model performance should therefore be described as prototype/experimental rather than production-grade.

---

# 40. HOW A NEW AI SHOULD CONTINUE

When this document is provided to a new AI:

### First

Understand that:

```text
Phase 1.3 → completed
Phase 1.4 → completed
Phase 1.5 → completed
Phase 1.6 → completed
Phase 1.7 → completed and verified
```

### Do not

restart the dataset design.

### Continue from

```text
Phase 2.1
```

### Immediate task

Design and implement:

```text
leakage-safe train/validation/test splitting
+
training-only preprocessing
+
reproducible dataset preparation
```

### Then

```text
Phase 2.2
↓
Logistic Regression
+
Random Forest
↓
evaluation
↓
probability/calibration checks
↓
model selection based on documented operational criteria
```

### Then

```text
Phase 3
↓
risk engine
↓
FastAPI
↓
frontend
↓
demo flow
```

---

# 41. CONTINUATION CHECKLIST

Before doing anything else, the next AI should verify:

- [ ] Phase 1.7 CSV exists
- [ ] Phase 1.7 has 1,457,175 rows
- [ ] Phase 1.7 has 49 columns
- [ ] `first_attempt_failed` exists
- [ ] `scan_status` exists only as metadata
- [ ] 37 candidate model features are understood
- [ ] route IDs remain available for grouping
- [ ] delivery dates remain available for temporal splitting
- [ ] no target-derived features are introduced
- [ ] train/test split is defined before fitting preprocessing
- [ ] class imbalance is handled deliberately
- [ ] evaluation includes PR-AUC / Average Precision
- [ ] probability quality is considered
- [ ] synthetic-data limitations are documented

---

# 42. ONE-SCREEN PROJECT STATUS

```text
BRIDGE
│
├── Problem
│   └── Predict first-attempt delivery failure before dispatch
│
├── Base Data
│   └── Amazon delivery dataset
│
├── Synthetic Augmentation
│   ├── customer availability/history
│   ├── access difficulty
│   ├── preferences
│   ├── signature
│   ├── historical priors
│   ├── traffic
│   └── weather
│
├── Synthetic Target
│   └── first_attempt_failed
│
├── Phase 1.4
│   └── Clean + validate source data       [DONE]
│
├── Phase 1.5
│   └── ML schema                          [DONE]
│
├── Phase 1.6
│   └── Synthetic features + target        [DONE]
│
├── Phase 1.7
│   └── Leakage-safe feature engineering  [DONE + VERIFIED]
│
├── Current Dataset
│   └── amazon_delivery_ml_features_v1
│       ├── 1,457,175 rows
│       ├── 49 columns
│       └── 37 candidate ML features
│
├── NEXT
│   └── Phase 2.1
│       ├── split strategy
│       ├── route grouping
│       ├── temporal holdout analysis
│       ├── imputation
│       ├── encoding
│       ├── scaling
│       └── leakage assertions
│
├── THEN
│   └── Phase 2.2
│       ├── Logistic Regression
│       ├── Random Forest
│       ├── ROC-AUC
│       ├── PR-AUC
│       ├── Precision / Recall / F1
│       └── probability calibration
│
└── FINAL MVP
    ├── risk engine
    ├── FastAPI
    ├── frontend
    └── customer intervention flow
```

---

# 43. MASTER RULE FOR FUTURE AI ASSISTANTS

> **Do not optimize for doing more. Optimize for preserving the correctness of the existing pipeline and moving one verified phase forward at a time.**

If a proposed change affects:

```text
target generation
feature definitions
leakage boundaries
dataset columns
split strategy
synthetic-data assumptions
```

first explain the impact and verify whether the existing decision should actually be changed.

Do not silently overwrite completed work.

---

# 44. CURRENT HANDOFF POINT

## STOPPED HERE

**Phase 1.7 — Feature Engineering and Leakage-Safe ML Dataset: COMPLETE**

### Next conversation should begin with:

> **“Continue BRIDGE from Phase 2.1. Phase 1.7 is complete and verified. First design the leakage-safe train/validation/test split, considering both route-group correlation and temporal holdout, then implement training-only preprocessing.”**

