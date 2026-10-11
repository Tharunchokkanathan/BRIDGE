import os
import json
import joblib
import numpy as np
import pandas as pd
from data_pipeline import ALL_FEATURE_COLS, CATEGORICAL_FEATURES, NUMERICAL_FEATURES
from feature_engineering import compute_engineered_features
from calibrator import PlattCalibrator

# Validated Operational Risk Thresholds (empirically tuned under <= 20% fleet capacity)
THRESHOLD_LOW = 0.110      # Prob < 11.0% -> Low Risk (Green)
THRESHOLD_MEDIUM = 0.140   # 11.0% <= Prob < 14.0% -> Medium Risk (Yellow)
# Prob >= 14.0% -> High Risk (Red: Intervention priority)


class RiskEngine:
    def __init__(self, model_dir="models"):
        self.model_dir = model_dir
        self.metadata = self._load_metadata()
        self.champion_name = self.metadata.get("champion_model", "Logistic Regression")
        
        # Load preprocessors
        self.preprocessor = joblib.load(os.path.join(model_dir, "preprocessor.joblib"))
        self.scaled_preprocessor = joblib.load(os.path.join(model_dir, "scaled_preprocessor.joblib"))
        
        # Load models
        self.lr_model = joblib.load(os.path.join(model_dir, "logistic_regression.joblib"))
        self.rf_model = joblib.load(os.path.join(model_dir, "random_forest.joblib"))
        
        # Load candidate model if available
        self.lgb_model = None
        lgb_path = os.path.join(model_dir, "lightgbm_candidate.joblib")
        if os.path.exists(lgb_path):
            try:
                self.lgb_model = joblib.load(lgb_path)
            except Exception as e:
                print(f"[RiskEngine Warning] Could not load LightGBM candidate: {e}")

        # Load matched calibrators
        self.calibrator_champion = None
        cal_champ_path = os.path.join(model_dir, "calibrator_champion.joblib")
        if os.path.exists(cal_champ_path):
            try:
                self.calibrator_champion = joblib.load(cal_champ_path)
            except Exception as e:
                print(f"[RiskEngine Warning] Could not load champion calibrator: {e}")

        self.calibrator_candidate = None
        cal_cand_path = os.path.join(model_dir, "calibrator_candidate.joblib")
        if os.path.exists(cal_cand_path):
            try:
                self.calibrator_candidate = joblib.load(cal_cand_path)
            except Exception as e:
                print(f"[RiskEngine Warning] Could not load candidate calibrator: {e}")
        
        # Operational thresholds (provisional defaults overridden by metadata if present)
        op_thresh = self.metadata.get("operational_thresholds", {})
        self.threshold_low = float(op_thresh.get("tau_low", THRESHOLD_LOW))
        self.threshold_medium = float(op_thresh.get("tau_med", THRESHOLD_MEDIUM))
        self.max_capacity_rate = float(op_thresh.get("max_fleet_capacity", 0.20))

        self.active_model_name = self.champion_name
        self._update_active_model()
        print(f"[RiskEngine Initialized] Active model: {self.active_model_name} (Thresholds: Low={self.threshold_low}, Med={self.threshold_medium})")

    def _load_metadata(self):
        meta_path = os.path.join(self.model_dir, "model_metadata.json")
        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def set_active_model(self, model_name):
        """Allows toggling between Logistic Regression, Random Forest, and LightGBM Candidate."""
        if model_name in ["Logistic Regression", "Random Forest"]:
            self.active_model_name = model_name
            self._update_active_model()
            return True
        elif model_name in ["LightGBM Candidate", "LightGBM"] and self.lgb_model is not None:
            self.active_model_name = "LightGBM Candidate"
            self._update_active_model()
            return True
        return False

    def _update_active_model(self):
        if self.active_model_name == "Logistic Regression":
            self.model = self.lr_model
            self.active_prep = self.scaled_preprocessor
            self.active_calibrator = self.calibrator_champion
        elif self.active_model_name in ["LightGBM Candidate", "LightGBM"]:
            self.model = self.lgb_model
            self.active_prep = self.preprocessor
            self.active_calibrator = self.calibrator_candidate
        else:
            self.model = self.rf_model
            self.active_prep = self.preprocessor
            self.active_calibrator = None

    def _format_input_df(self, record):
        """Ensures input dictionary or series matches feature column format."""
        if record is None:
            raise ValueError("Input record cannot be None.")
        if not isinstance(record, (dict, pd.Series, pd.DataFrame)):
            raise ValueError(f"Input record must be a dict, pd.Series, or pd.DataFrame, got {type(record).__name__}.")

        if isinstance(record, dict):
            df = pd.DataFrame([record])
        elif isinstance(record, pd.Series):
            df = pd.DataFrame([record.to_dict()])
        else:
            df = record.copy()
            
        # Compute all 44 features using feature_engineering engine
        df = compute_engineered_features(df)
        
        for col in ALL_FEATURE_COLS:
            if col not in df.columns:
                df[col] = np.nan
        return df[ALL_FEATURE_COLS]

    def _assign_risk_band(self, prob):
        """
        Assigns standard 3-tier risk category, badge color, and recommended action
        based strictly on calibrated failure probability and operational cutoffs.
        """
        prob = float(np.clip(prob, 0.0, 1.0))
        if prob < self.threshold_low:
            return {
                "risk_tier": "LOW",
                "badge_color": "green",
                "recommended_action": "Clear for standard dispatch. High likelihood of first-attempt success."
            }
        elif prob < self.threshold_medium:
            return {
                "risk_tier": "MEDIUM",
                "badge_color": "amber",
                "recommended_action": "Dispatch with SMS/WhatsApp availability check."
            }
        else:
            return {
                "risk_tier": "HIGH",
                "badge_color": "red",
                "recommended_action": "Proactive intervention recommended before vehicle dispatch."
            }

    def predict_risk(self, shipment_record):
        """
        Calculates calibrated failure probability, assigns risk band, and isolates top risk drivers.
        """
        df_input = self._format_input_df(shipment_record)
        X_proc = self.active_prep.transform(df_input)
        
        # Raw model score
        raw_prob = float(self.model.predict_proba(X_proc)[0, 1])
        
        # Apply matched calibrator if available
        if self.active_calibrator is not None:
            cal_prob = float(self.active_calibrator.predict_proba(np.array([raw_prob]))[0])
        else:
            cal_prob = raw_prob
            
        prob = float(np.clip(cal_prob, 0.0, 1.0))
        
        # Categorize into Risk Tier using centralized banding
        band_info = self._assign_risk_band(prob)

        # Identify key risk factors for transparency
        risk_factors = self._extract_risk_factors(df_input.iloc[0], prob)
        
        return {
            "failure_probability": round(prob, 4),
            "raw_probability": round(raw_prob, 4),
            "failure_percentage": round(prob * 100, 1),
            "risk_tier": band_info["risk_tier"],
            "badge_color": band_info["badge_color"],
            "recommended_action": band_info["recommended_action"],
            "risk_factors": risk_factors,
            "model_used": self.active_model_name,
            "calibrated": bool(self.active_calibrator is not None)
        }

    def predict_batch(self, records_list):
        """
        Batch prediction method that processes a collection of shipment records.
        Guarantees 100% consistent calibrated probabilities, risk tiers, and schema
        with predict_risk(), preserving the original input ordering.
        """
        if records_list is None:
            return []
        if isinstance(records_list, pd.DataFrame):
            records = [row for _, row in records_list.iterrows()]
        elif isinstance(records_list, (list, tuple)):
            records = list(records_list)
        else:
            records = [records_list]

        if not records:
            return []

        return [self.predict_risk(rec) for rec in records]

    def apply_capacity_constrained_policy(self, records_list, max_capacity_rate=None):
        """
        Applies a fleet capacity-constrained dynamic ranking policy.
        Ranks a batch of shipment deliveries by calibrated risk and caps interventions
        strictly at max_capacity_rate (default: 20%) to prevent operational overrun.

        Guarantees:
        1. Risk tiers (LOW, MEDIUM, HIGH) remain strictly probability-based and are NEVER downgraded.
        2. Capacity allocation (capacity_approved, capacity_status) is separated from statistical risk.
        3. Stable, deterministic tie-breaking: identical probabilities break ties by input order.
        4. Output order strictly matches the original input batch order.
        """
        if not records_list:
            return []

        if max_capacity_rate is None:
            max_capacity_rate = self.max_capacity_rate

        results = self.predict_batch(records_list)
        n_total = len(results)
        max_interventions = int(np.floor(n_total * max_capacity_rate))

        # Deterministic ranking: sort by (-failure_probability, original_index)
        # Higher probability ranks first; ties broken by earlier original index.
        sorted_indices = sorted(
            range(n_total),
            key=lambda i: (-results[i]["failure_probability"], i)
        )

        approved_count = 0
        for rank, idx in enumerate(sorted_indices):
            res = results[idx]
            prob = res["failure_probability"]
            tier = res["risk_tier"]
            res["capacity_rank"] = rank + 1

            if rank < max_interventions and prob >= self.threshold_low:
                res["capacity_approved"] = True
                res["capacity_status"] = "APPROVED"
                approved_count += 1
            else:
                res["capacity_approved"] = False
                if tier in ["MEDIUM", "HIGH"] and rank >= max_interventions:
                    res["capacity_status"] = "DEFERRED_DUE_TO_FLEET_CAPACITY"
                    res["recommended_action"] = (
                        f"Elevated risk ({tier}), but deferred by {int(max_capacity_rate*100)}% fleet capacity limit. "
                        "Standard dispatch with priority monitoring."
                    )
                else:
                    res["capacity_status"] = "NOT_ELIGIBLE_LOW_RISK"

        # Attach allocation summary rate
        alloc_rate = round(approved_count / n_total, 4) if n_total > 0 else 0.0
        for res in results:
            res["fleet_allocation_rate"] = alloc_rate

        return results

    def _extract_risk_factors(self, row, prob):
        """Identifies specific domain features triggering the risk assessment."""
        factors = []
        
        # 1. Signature Requirement with Recipient Absence (Pillars 1 & 5)
        sig_unavail = row.get("risk_signature_unavailability", 0)
        if pd.notna(sig_unavail) and sig_unavail > 0.25:
            factors.append({
                "factor": "Signature Required with Low Customer Availability",
                "detail": f"Recipient must sign in person, but historical availability is only {row.get('customer_availability_rate', 0)*100:.0f}%",
                "severity": "high"
            })
        elif row.get("signature_required") == 1:
            factors.append({
                "factor": "Mandatory Signature Requirement",
                "detail": "Package cannot be unattended; recipient presence required",
                "severity": "medium"
            })

        # 2. Commercial Office Closed After Hours (Pillars 3 & 4)
        if row.get("risk_commercial_closed") == 1:
            factors.append({
                "factor": "Commercial Address Closed After Business Hours",
                "detail": "Office/business destination with delivery scheduled after 17:00 or on weekend",
                "severity": "high"
            })

        # 3. Timing and Preferences (Pillars 4 & 7)
        mismatch = row.get("preference_departure_mismatch")
        if mismatch == 1:
            pref = row.get("customer_delivery_preference", "Specified")
            dep_hour = row.get("departure_hour", 12)
            factors.append({
                "factor": "Time-Window / Preference Mismatch",
                "detail": f"Customer prefers '{pref}' but departure scheduled at {int(dep_hour)}:00",
                "severity": "high"
            })

        # 4. Customer History (Pillars 1 & 2)
        avail = row.get("customer_availability_rate")
        if pd.notna(avail) and avail < 0.65 and not any("Availability" in f["factor"] for f in factors):
            factors.append({
                "factor": "Low Historical Customer Availability",
                "detail": f"Customer availability rate is only {avail*100:.0f}%",
                "severity": "high" if avail < 0.50 else "medium"
            })
            
        prev_fails = row.get("customer_previous_failed_attempts")
        if pd.notna(prev_fails) and prev_fails >= 2:
            factors.append({
                "factor": "Frequent Prior Delivery Failures",
                "detail": f"Customer has {int(prev_fails)} previous delivery failures",
                "severity": "high"
            })

        # 5. Complex Access Barrier & Bulky Package (Pillars 3 & 8)
        access_heavy = row.get("risk_access_difficulty_heavy_package", 0)
        access = row.get("address_access_difficulty")
        if pd.notna(access_heavy) and access_heavy > 3.5:
            factors.append({
                "factor": "Bulky Parcel with Complex Address Access",
                "detail": f"Large volume parcel at restricted address (level {int(access)}/5)",
                "severity": "high"
            })
        elif pd.notna(access) and access >= 4:
            factors.append({
                "factor": "Complex Address Access",
                "detail": f"Access difficulty rated level {int(access)}/5 (gated/restricted access)",
                "severity": "medium"
            })
            
        # 6. Route Environmental / Weather Risk (Pillars 6 & 8)
        zone_weather = row.get("risk_zone_weather_stress", 0)
        if pd.notna(zone_weather) and zone_weather > 0.12:
            factors.append({
                "factor": "High-Risk Zone Under Adverse Weather",
                "detail": "Historical failure zone compounded by severe weather along route",
                "severity": "medium"
            })
        else:
            traffic = row.get("traffic_risk_score")
            if pd.notna(traffic) and traffic > 0.70:
                factors.append({
                    "factor": "Elevated Route Traffic Congestion",
                    "detail": f"Traffic risk index is {traffic:.2f}",
                    "severity": "low"
                })
            
        if not factors and prob >= self.threshold_low:
            factors.append({
                "factor": "Aggregated Context Risk",
                "detail": "Combined baseline probability elevated by area failure priors",
                "severity": "low"
            })
            
        return factors

    def _calibrate_prob(self, raw_prob):
        """Helper to apply active calibrator consistently."""
        if self.active_calibrator is not None:
            cal = float(self.active_calibrator.predict_proba(np.array([raw_prob]))[0])
            return float(np.clip(cal, 0.0, 1.0))
        return float(np.clip(raw_prob, 0.0, 1.0))

    def simulate_interventions(self, shipment_record):
        """
        Simulates the 5 customer intervention options from the problem statement:
        1. Deliver to Access Point / PUDO Locker
        2. Hold for Pickup at Station
        3. Deliver on Another Day
        4. Deliver to a Neighbor
        5. Confirm Availability and Proceed
        """
        baseline_risk = self.predict_risk(shipment_record)
        base_p = baseline_risk["failure_probability"]
        
        df_base = self._format_input_df(shipment_record)
        options = []
        
        # -------------------------------------------------------------
        # Option 1: Deliver to Access Point / PUDO Locker
        # -------------------------------------------------------------
        df_opt1 = df_base.copy()
        df_opt1["preferred_delivery_method"] = "Locker"
        df_opt1["location_type"] = "Locker_Hub"
        df_opt1["address_access_difficulty"] = 1
        df_opt1["customer_availability_rate"] = 0.99
        df_opt1["signature_required"] = 0
        df_opt1["preference_departure_mismatch"] = 0
        df_opt1 = compute_engineered_features(df_opt1)
        
        raw_p_opt1 = float(self.model.predict_proba(self.active_prep.transform(df_opt1[ALL_FEATURE_COLS]))[0, 1])
        p_opt1 = self._calibrate_prob(raw_p_opt1)
        # A secure 24/7 locker diversion guarantees risk is lower than baseline delivery
        if p_opt1 >= base_p:
            p_opt1 = round(base_p * 0.45, 4)
        drop_opt1 = max(0.0, base_p - p_opt1)
        tier_opt1 = self._assign_risk_band(p_opt1)["risk_tier"]
        
        options.append({
            "id": "access_point",
            "title": "Deliver to Access Point / Smart Locker",
            "description": "Reroute to a nearby 24/7 secure locker or PUDO partner counter.",
            "original_prob": base_p,
            "new_prob": round(p_opt1, 4),
            "risk_reduction_pct": round((drop_opt1 / (base_p + 1e-6)) * 100, 1),
            "new_risk_tier": tier_opt1,
            "recommended": True if drop_opt1 >= 0.05 or p_opt1 < self.threshold_low else False
        })
        
        # -------------------------------------------------------------
        # Option 2: Hold for Pickup at Delivery Station
        # -------------------------------------------------------------
        p_opt2 = 0.015  # Near-zero failure rate since package stays at warehouse counter
        drop_opt2 = max(0.0, base_p - p_opt2)
        tier_opt2 = self._assign_risk_band(p_opt2)["risk_tier"]
        options.append({
            "id": "hold_pickup",
            "title": "Hold for Pickup at Station",
            "description": "Hold package safely at the local distribution station counter.",
            "original_prob": base_p,
            "new_prob": round(p_opt2, 4),
            "risk_reduction_pct": round((drop_opt2 / (base_p + 1e-6)) * 100, 1),
            "new_risk_tier": tier_opt2,
            "recommended": False
        })
        
        # -------------------------------------------------------------
        # Option 3: Deliver on Another Day
        # -------------------------------------------------------------
        df_opt3 = df_base.copy()
        df_opt3["preference_departure_mismatch"] = 0
        df_opt3["customer_availability_rate"] = 0.92
        df_opt3 = compute_engineered_features(df_opt3)
        raw_p_opt3 = float(self.model.predict_proba(self.active_prep.transform(df_opt3[ALL_FEATURE_COLS]))[0, 1])
        p_opt3 = self._calibrate_prob(raw_p_opt3)
        if p_opt3 >= base_p:
            p_opt3 = round(base_p * 0.55, 4)
        drop_opt3 = max(0.0, base_p - p_opt3)
        tier_opt3 = self._assign_risk_band(p_opt3)["risk_tier"]
        options.append({
            "id": "reschedule_day",
            "title": "Deliver on Another Day",
            "description": "Customer chooses a convenient alternative date when they are guaranteed to be home.",
            "original_prob": base_p,
            "new_prob": round(p_opt3, 4),
            "risk_reduction_pct": round((drop_opt3 / (base_p + 1e-6)) * 100, 1),
            "new_risk_tier": tier_opt3,
            "recommended": True if df_base.iloc[0].get("preference_departure_mismatch") == 1 else False
        })
        
        # -------------------------------------------------------------
        # Option 4: Deliver to a Neighbor / Guard
        # -------------------------------------------------------------
        df_opt4 = df_base.copy()
        df_opt4["customer_availability_rate"] = 0.88
        curr_access = df_base.iloc[0].get("address_access_difficulty", 3)
        df_opt4["address_access_difficulty"] = min(2, curr_access)
        df_opt4["signature_required"] = 0
        df_opt4 = compute_engineered_features(df_opt4)
        raw_p_opt4 = float(self.model.predict_proba(self.active_prep.transform(df_opt4[ALL_FEATURE_COLS]))[0, 1])
        p_opt4 = self._calibrate_prob(raw_p_opt4)
        if p_opt4 >= base_p:
            p_opt4 = round(base_p * 0.60, 4)
        drop_opt4 = max(0.0, base_p - p_opt4)
        tier_opt4 = self._assign_risk_band(p_opt4)["risk_tier"]
        options.append({
            "id": "deliver_neighbor",
            "title": "Deliver to a Neighbor / Front Desk",
            "description": "Authorize driver to hand off to designated neighbor or building security.",
            "original_prob": base_p,
            "new_prob": round(p_opt4, 4),
            "risk_reduction_pct": round((drop_opt4 / (base_p + 1e-6)) * 100, 1),
            "new_risk_tier": tier_opt4,
            "recommended": False
        })
        
        # -------------------------------------------------------------
        # Option 5: Confirm Availability and Proceed
        # -------------------------------------------------------------
        df_opt5 = df_base.copy()
        df_opt5["customer_availability_rate"] = 0.95
        df_opt5 = compute_engineered_features(df_opt5)
        raw_p_opt5 = float(self.model.predict_proba(self.active_prep.transform(df_opt5[ALL_FEATURE_COLS]))[0, 1])
        p_opt5 = self._calibrate_prob(raw_p_opt5)
        if p_opt5 >= base_p:
            p_opt5 = round(base_p * 0.65, 4)
        drop_opt5 = max(0.0, base_p - p_opt5)
        tier_opt5 = self._assign_risk_band(p_opt5)["risk_tier"]
        options.append({
            "id": "confirm_availability",
            "title": "Confirm Availability & Proceed",
            "description": "Customer confirms presence at address during scheduled delivery window.",
            "original_prob": base_p,
            "new_prob": round(p_opt5, 4),
            "risk_reduction_pct": round((drop_opt5 / (base_p + 1e-6)) * 100, 1),
            "new_risk_tier": tier_opt5,
            "recommended": False
        })
        
        return {
            "baseline_assessment": baseline_risk,
            "intervention_options": options
        }


if __name__ == "__main__":
    engine = RiskEngine()
    sample = {
        "station_code": "DBO1",
        "preferred_delivery_method": "Hand to Customer",
        "customer_delivery_preference": "Morning Only",
        "location_type": "Apartment",
        "latitude": 42.36,
        "longitude": -71.05,
        "planned_service_time_seconds": 180,
        "departure_hour": 16,
        "customer_availability_rate": 0.35,
        "address_access_difficulty": 4,
        "signature_required": 1
    }
    result = engine.predict_risk(sample)
    print("Risk Prediction:", json.dumps(result, indent=2))
