# BRIDGE — HACKATHON LIVE DEMONSTRATION SCRIPT & JUDGE PLAYBOOK

**Theme:** Theme 4 — AI-Powered First Attempt Delivery Success Engine  
**Project:** BRIDGE (Backend Risk Intelligence and Delivery Guidance Engine)  
**Target Duration:** 3–5 Minutes  
**Audience:** Hackathon Technical Judges, Logistics Operations Evaluators  

---

## 1. Demonstration Setup & Pre-Flight Checks

Before presenting to the judges, verify that the local application is running:

```bash
# Terminal launch
python run.py

# Verified Local URLs:
# Web Command Center: http://127.0.0.1:8000
# Interactive API Docs: http://127.0.0.1:8000/docs
# Healthcheck Endpoint: http://127.0.0.1:8000/api/health
```

Ensure your browser is open to `http://127.0.0.1:8000`.

---

## 2. 3-Minute Live Presentation Walkthrough

### Act I: The Logistics Problem & Pre-Dispatch Intelligence (0:00 – 0:45)
* **Visual:** Open **Dispatcher Command Center** tab (`#dispatcher-view`).
* **Narrative:**
  > "In urban parcel logistics, failed first delivery attempts cost carriers billions annually and account for up to 30% of wasted vehicle miles. Most systems only react after a driver marks 'Customer Not Available' at the door.
  >
  > BRIDGE changes the paradigm: we evaluate every package at the fulfillment center **before vehicle dispatch** using 44 pre-dispatch features.
  >
  > On screen, our Dispatcher Command Center displays a 30-package Los Angeles dispatch manifest. Notice the risk scores: every failure probability is **calibrated via Platt Scaling**, strictly bounded between 0% and 100%, and grouped into actionable operational tiers: Low, Medium, and High."

### Act II: Fleet Capacity Constraints & SHAP Explainability (0:45 – 1:30)
* **Visual:** Point to the **Fleet Capacity Cap** column and click a high-risk package (e.g., `PackageID_9d7fdd03`).
* **Narrative:**
  > "Predictive risk alone isn't enough in the real world—delivery fleets have limited intervention capacity. BRIDGE enforces a strict **20% vehicle capacity ceiling**.
  >
  > Notice the badges in the table: the highest-risk deliveries are marked **APPROVED** for active intervention, while excess volume receives a yellow **DEFERRED (CAP)** status with deterministic tie-breaking.
  >
  > Looking at the Inspector card on the right, our explainability layer uses **closed-form Linear SHAP** operating in the calibrated log-odds space. It computes exact Shapley attributions in under 0.3 milliseconds. Dispatchers see precisely why this parcel is at risk: for example, mandatory signature combined with low customer availability adds +0.36 to failure log-odds."

### Act III: Safe Model Switching & Governance Promotion Gates (1:30 – 2:00)
* **Visual:** Use the **Active Model dropdown** in the header to switch to `LightGBM Candidate`.
* **Narrative:**
  > "BRIDGE is built with production model governance. We support live, zero-downtime hot-swapping between our **Champion Logistic Regression** and our **LightGBM Candidate**.
  >
  > When I switch to LightGBM, the explainability engine instantly shifts from Linear SHAP to **TreeSHAP** in ~4.5 milliseconds without interrupting predictions.
  >
  > But here is our technical honesty: even though LightGBM achieved a higher PR-AUC (+3.1% relative gain), it failed our strict pre-registered promotion gate of PR-AUC $\ge 0.1500$. Under strict governance, we keep Logistic Regression locked as Champion and restore it automatically."
* **Action:** Switch back to `Logistic Regression`.

### Act IV: Customer Mobile Portal & Proactive Interventions (2:00 – 2:45)
* **Visual:** Click **"Intervene ⚡"** on a high-risk shipment to switch to the **Customer Mobile Portal** (`#customer-view`).
* **Narrative:**
  > "Instead of sending drivers into guaranteed delivery failures, BRIDGE triggers automated customer preference flows before the van leaves the depot.
  >
  > On our mobile simulator, the recipient receives 5 ranked prescriptive choices. Our multi-criteria utility score evaluates risk reduction, fulfillment cost, and disruption.
  >
  > *Transparency Note:* Notice the purple badge on Station Hold: **'Rule-Based (1.5%)'**. We explicitly disclose that this is a business rule heuristic, not an ML model output. Notice also our disclosure banner: post-intervention success rates are simulated counterfactual projections, not proven causal treatment effects."
* **Visual:** Click through SMS, WhatsApp, and Email chips in the **Customer Notification Preview** panel. Show dynamically rendered message tokens and character counters.

### Act V: Route Optimization & Dual-Level Savings (2:45 – 3:30)
* **Visual:** Click the **Route Optimization** tab (`#route-view`).
* **Narrative:**
  > "Finally, we untangle the delivery tour using a pure Python deterministic **Nearest-Neighbor + 2-Opt TSP heuristic** operating in sub-millisecond time ($P_{95} = 0.44\text{ ms}$).
  >
  > In the real world, route claims are often exaggerated. BRIDGE provides **Dual-Level Savings Decomposition**:
  > 1. **Macro Sequence Optimization (68.9%–69.9%):** Untangles the arbitrary, unsequenced delivery manifest into an optimal spatial tour.
  > 2. **Micro Prescriptive Intervention Savings (12.5%):** Demonstrates the Day 1 tour reduction when 5 high-risk stops are deferred to station holds or consolidated to PUDO smart lockers.
  >
  > We explicitly disclose that our distances use vectorized Haversine geometry scaled by urban circuity factor $\kappa = 1.35$ for Los Angeles street grids."

---

## 3. Judge Q&A Playbook (Anticipated Questions & Bulletproof Answers)

#### Q1: "Are these results based on real customer data or synthetic data?"
> **Answer:** "The spatial coordinates, station codes, and package dimensions are grounded in real Amazon delivery data from Los Angeles. However, pre-dispatch customer availability rates and the first-attempt failure label are synthetically generated because commercial delivery labels are proprietary. Our models prove the end-to-end mathematical validity of the pipeline, but we explicitly disclose in our documentation that synthetic results must not be presented as real-world operational accuracy."

#### Q2: "Can you prove that your interventions causally reduce delivery failures?"
> **Answer:** "No, and we are deliberate about stating that limitation in our UI. SHAP values establish feature sensitivities in the model's log-odds space, not physical causality. Our simulated post-intervention probabilities are counterfactual estimates based on customer availability assumptions. In a production rollout, causal treatment effects would be measured through randomized A/B holdout testing across delivery zones."

#### Q3: "Why did you keep Logistic Regression as Champion if LightGBM has higher PR-AUC?"
> **Answer:** "In enterprise ML, higher scores on a test set do not justify promotion if they fail pre-registered promotion gates. We set a minimum bar of PR-AUC $\ge 0.1500$ and ROC-AUC $\ge 0.6500$ to justify the operational complexity of gradient boosting. LightGBM reached 0.1174 (+3.1% over baseline), which failed the promotion criteria. Preserving Logistic Regression protects interpretability, delivers sub-millisecond inference, and enforces rigorous ML governance."

#### Q4: "If you defer 5 high-risk stops to achieve 12.5% route savings, don't you have to deliver them tomorrow?"
> **Answer:** "Exactly right. That is why our UI explicitly labels the 12.5% metric as 'Active Manifest Reduction (Day 1)'. Deferring delivery avoids a guaranteed failed attempt, customer frustration, and wasted driver service time today, but it does not represent net multi-day fuel elimination unless the customer chooses a pickup locker or cancels the package."

#### Q5: "Why did you choose a custom 2-Opt heuristic over Google OR-Tools?"
> **Answer:** "We evaluated both in Architectural Decision Gate D-16. Google OR-Tools introduces a 24MB C++ binary dependency with platform-specific compilation hurdles. Our pure Python/NumPy 2-Opt implementation runs in under 0.5 milliseconds for 30 stops, requires zero external C++ libraries, is 100% deterministic, and easily achieved the $\ge 12.0\%$ distance reduction target."
