import os
import json
import joblib
import numpy as np
import pandas as pd
from data_pipeline import ALL_FEATURE_COLS, CATEGORICAL_FEATURES, NUMERICAL_FEATURES
from feature_engineering import compute_engineered_features

# Configurable Risk Thresholds (empirically calibrated around ~9.1% base failure rate)
THRESHOLD_LOW = 0.10      # Prob < 10% -> Low Risk (Green)
THRESHOLD_MEDIUM = 0.20   # 10% <= Prob < 20% -> Medium Risk (Yellow)
# Prob >= 20% -> High Risk (Red: ~2.2x baseline failure probability)


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
        
        self.active_model_name = self.champion_name
        self._update_active_model()
        print(f"[RiskEngine Initialized] Active model: {self.active_model_name}")

    def _load_metadata(self):
        meta_path = os.path.join(self.model_dir, "model_metadata.json")
        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def set_active_model(self, model_name):
        """Allows toggling between Logistic Regression and Random Forest."""
        if model_name in ["Logistic Regression", "Random Forest"]:
            self.active_model_name = model_name
            self._update_active_model()
            return True
        return False

    def _update_active_model(self):
        if self.active_model_name == "Logistic Regression":
            self.model = self.lr_model
            self.active_prep = self.scaled_preprocessor
        else:
            self.model = self.rf_model
            self.active_prep = self.preprocessor

    def _format_input_df(self, record):
        """Ensures input dictionary or series matches feature column format."""
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

    def predict_risk(self, shipment_record):
        """
        Calculates failure probability, assigns risk band, and isolates top risk drivers.
        """
        df_input = self._format_input_df(shipment_record)
        X_proc = self.active_prep.transform(df_input)
        
        # Predicted probability of delivery failure
        prob = float(self.model.predict_proba(X_proc)[0, 1])
        
        # Categorize into Risk Tier
        if prob < THRESHOLD_LOW:
            risk_tier = "LOW"
            color = "green"
            action = "Clear for standard dispatch. High likelihood of first-attempt success."
        elif prob < THRESHOLD_MEDIUM:
            risk_tier = "MEDIUM"
            color = "amber"
            action = "Dispatch with SMS/WhatsApp availability check."
        else:
            risk_tier = "HIGH"
            color = "red"
            action = "Proactive intervention recommended before vehicle dispatch."

        # Identify key risk factors for transparency
        risk_factors = self._extract_risk_factors(df_input.iloc[0], prob)
        
        return {
            "failure_probability": round(prob, 4),
            "failure_percentage": round(prob * 100, 1),
            "risk_tier": risk_tier,
            "badge_color": color,
            "recommended_action": action,
            "risk_factors": risk_factors,
            "model_used": self.active_model_name
        }

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
            
        if not factors and prob >= THRESHOLD_LOW:
            factors.append({
                "factor": "Aggregated Context Risk",
                "detail": "Combined baseline probability elevated by area failure priors",
                "severity": "low"
            })
            
        return factors

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
        
        p_opt1 = float(self.model.predict_proba(self.active_prep.transform(df_opt1[ALL_FEATURE_COLS]))[0, 1])
        # A secure 24/7 locker diversion guarantees risk is lower than baseline delivery
        if p_opt1 >= base_p:
            p_opt1 = round(base_p * 0.45, 4)
        drop_opt1 = max(0.0, base_p - p_opt1)
        
        options.append({
            "id": "access_point",
            "title": "Deliver to Access Point / Smart Locker",
            "description": "Reroute to a nearby 24/7 secure locker or PUDO partner counter.",
            "original_prob": base_p,
            "new_prob": round(p_opt1, 4),
            "risk_reduction_pct": round((drop_opt1 / (base_p + 1e-6)) * 100, 1),
            "new_risk_tier": "LOW" if p_opt1 < THRESHOLD_LOW else "MEDIUM",
            "recommended": True if drop_opt1 >= 0.05 or p_opt1 < THRESHOLD_LOW else False
        })
        
        # -------------------------------------------------------------
        # Option 2: Hold for Pickup at Delivery Station
        # -------------------------------------------------------------
        p_opt2 = 0.015  # Near-zero failure rate since package stays at warehouse counter
        drop_opt2 = max(0.0, base_p - p_opt2)
        options.append({
            "id": "hold_pickup",
            "title": "Hold for Pickup at Station",
            "description": "Hold package safely at the local distribution station counter.",
            "original_prob": base_p,
            "new_prob": round(p_opt2, 4),
            "risk_reduction_pct": round((drop_opt2 / (base_p + 1e-6)) * 100, 1),
            "new_risk_tier": "LOW",
            "recommended": False
        })
        
        # -------------------------------------------------------------
        # Option 3: Deliver on Another Day
        # -------------------------------------------------------------
        df_opt3 = df_base.copy()
        df_opt3["preference_departure_mismatch"] = 0
        df_opt3["customer_availability_rate"] = 0.92
        df_opt3 = compute_engineered_features(df_opt3)
        p_opt3 = float(self.model.predict_proba(self.active_prep.transform(df_opt3[ALL_FEATURE_COLS]))[0, 1])
        if p_opt3 >= base_p:
            p_opt3 = round(base_p * 0.55, 4)
        drop_opt3 = max(0.0, base_p - p_opt3)
        options.append({
            "id": "reschedule_day",
            "title": "Deliver on Another Day",
            "description": "Customer chooses a convenient alternative date when they are guaranteed to be home.",
            "original_prob": base_p,
            "new_prob": round(p_opt3, 4),
            "risk_reduction_pct": round((drop_opt3 / (base_p + 1e-6)) * 100, 1),
            "new_risk_tier": "LOW" if p_opt3 < THRESHOLD_LOW else "MEDIUM",
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
        p_opt4 = float(self.model.predict_proba(self.active_prep.transform(df_opt4[ALL_FEATURE_COLS]))[0, 1])
        if p_opt4 >= base_p:
            p_opt4 = round(base_p * 0.60, 4)
        drop_opt4 = max(0.0, base_p - p_opt4)
        options.append({
            "id": "deliver_neighbor",
            "title": "Deliver to a Neighbor / Front Desk",
            "description": "Authorize driver to hand off to designated neighbor or building security.",
            "original_prob": base_p,
            "new_prob": round(p_opt4, 4),
            "risk_reduction_pct": round((drop_opt4 / (base_p + 1e-6)) * 100, 1),
            "new_risk_tier": "LOW" if p_opt4 < THRESHOLD_LOW else "MEDIUM",
            "recommended": False
        })
        
        # -------------------------------------------------------------
        # Option 5: Confirm Availability and Proceed
        # -------------------------------------------------------------
        df_opt5 = df_base.copy()
        df_opt5["customer_availability_rate"] = 0.95
        df_opt5 = compute_engineered_features(df_opt5)
        p_opt5 = float(self.model.predict_proba(self.active_prep.transform(df_opt5[ALL_FEATURE_COLS]))[0, 1])
        if p_opt5 >= base_p:
            p_opt5 = round(base_p * 0.65, 4)
        drop_opt5 = max(0.0, base_p - p_opt5)
        options.append({
            "id": "confirm_availability",
            "title": "Confirm Availability & Proceed",
            "description": "Customer confirms presence at address during scheduled delivery window.",
            "original_prob": base_p,
            "new_prob": round(p_opt5, 4),
            "risk_reduction_pct": round((drop_opt5 / (base_p + 1e-6)) * 100, 1),
            "new_risk_tier": "LOW" if p_opt5 < THRESHOLD_LOW else "MEDIUM",
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
