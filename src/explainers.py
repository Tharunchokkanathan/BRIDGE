"""
BRIDGE — Explainability Engine (Phase 3.5)
Unified explainability layer for delivery failure risk intelligence.

Supports:
1. LinearExplainerChampion: Closed-form Linear SHAP for active champion Logistic Regression
   operating in the calibrated log-odds margin space.
2. TreeExplainerCandidate: TreeSHAP for candidate LightGBM booster operating in the
   calibrated log-odds margin space.

Guarantees:
- Exact local accuracy (additivity): sum(phi_j) == model_score - base_value
- Preserves legacy risk_factors response schema (factor, detail, severity)
- Separates positive risk drivers from mitigating factors
- Zero side-effects on predicted failure probabilities or risk tiers
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple

# Mapping of the 73 transformed features to the 8 Hackathon Delivery Pillars
PILLAR_MAPPING = {
    # Pillar 1: Customer delivery history
    "customer_availability_rate": ("Customer Delivery History", "Customer Availability Rate", "Historical availability is below fleet baseline, adding to failure log-odds"),
    "customer_previous_delivery_attempts": ("Customer Delivery History", "Customer Delivery Attempt History", "High prior delivery attempt frequency"),
    "customer_previous_success_rate": ("Customer Delivery History", "Customer Historical Delivery Success Rate", "Lower prior delivery completion track record"),
    "customer_failure_propensity": ("Customer Delivery History", "Customer Failure Propensity Score", "Smoothed prior delivery failure propensity index"),

    # Pillar 2: Previous failed delivery attempts
    "customer_previous_failed_attempts": ("Previous Failed Attempts", "Frequent Prior Delivery Failures", "Multiple prior unsuccessful delivery attempts recorded"),

    # Pillar 3: Delivery location type
    "address_access_difficulty": ("Delivery Location Type", "Complex Address Access Difficulty", "High access difficulty rating (restricted/gated entrance)"),
    "risk_commercial_closed": ("Delivery Location Type", "Commercial Address Closed After Business Hours", "Commercial destination scheduled outside operating business hours"),
    "location_type_Apartment": ("Delivery Location Type", "Apartment Multi-Unit Complex", "Multi-unit apartment building with complex internal access"),
    "location_type_Commercial": ("Delivery Location Type", "Commercial Business Location", "Commercial facility delivery window constraints"),
    "location_type_Locker_Hub": ("Delivery Location Type", "Locker Hub Terminal", "Locker hub terminal access"),
    "location_type_Residential": ("Delivery Location Type", "Residential Single-Family Property", "Standard residential delivery location"),

    # Pillar 4: Time-of-day delivery patterns
    "departure_hour": ("Time-of-Day Delivery Patterns", "Dispatch Timing Pattern", "Scheduled departure hour impacts delivery window feasibility"),
    "departure_hour_sin": ("Time-of-Day Delivery Patterns", "Cyclical Departure Hour Pattern", "Cyclical diurnal delivery timing effect"),
    "departure_hour_cos": ("Time-of-Day Delivery Patterns", "Diurnal Dispatch Schedule", "Departure window diurnal pattern"),
    "time_window_duration_hours": ("Time-of-Day Delivery Patterns", "Tight Delivery Time Window", "Restricted customer delivery window duration"),
    "has_time_window": ("Time-of-Day Delivery Patterns", "Time Window Constraint Presence", "Delivery has strict time-window constraint"),
    "window_start_minutes": ("Time-of-Day Delivery Patterns", "Time Window Start Boundary", "Window opening time alignment"),
    "window_end_minutes": ("Time-of-Day Delivery Patterns", "Time Window Deadline Constraint", "Approaching customer window expiration deadline"),
    "departure_to_window_start_minutes": ("Time-of-Day Delivery Patterns", "Departure-to-Window Lead Time", "Tight lead time before delivery window opens"),
    "departure_to_window_end_minutes": ("Time-of-Day Delivery Patterns", "Departure-to-Window Slack Margin", "Limited slack time before customer delivery window closes"),

    # Pillar 5: Signature requirements
    "signature_required": ("Signature Requirements", "Mandatory Signature Requirement", "Package requires in-person signature handoff"),
    "risk_signature_unavailability": ("Signature Requirements", "Signature Required with Low Customer Availability", "Mandatory recipient signature compounded by low availability"),

    # Pillar 6: Seasonal trends and weather
    "is_weekend": ("Seasonal Trends & Weather", "Weekend Dispatch Pattern", "Weekend delivery operational patterns"),
    "month": ("Seasonal Trends & Weather", "Seasonal Monthly Delivery Trend", "Monthly seasonal demand and failure distribution"),
    "day_of_week_sin": ("Seasonal Trends & Weather", "Day-of-Week Dispatch Cycle", "Weekly operational demand periodicity"),
    "day_of_week_cos": ("Seasonal Trends & Weather", "Day-of-Week Operational Cycle", "Weekly operational dispatch cycle"),
    "seasonal_failure_rate": ("Seasonal Trends & Weather", "Elevated Seasonal Failure Rate", "Higher seasonal failure rate across delivery calendar"),
    "weather_risk_score": ("Seasonal Trends & Weather", "Adverse Weather Severity Index", "Precipitation or extreme temperature stress along route"),
    "risk_zone_weather_stress": ("Seasonal Trends & Weather", "High-Risk Zone Weather Stress", "Route failure zone compounded by severe weather conditions"),

    # Pillar 7: Customer preferences
    "preference_departure_mismatch": ("Customer Preferences", "Time-Window / Preference Mismatch", "Customer preference clashes with scheduled departure window"),
    "risk_preference_departure_clash": ("Customer Preferences", "Preference-Window Clash Severity", "Severe time clash between customer preference and route timing"),
    "preferred_delivery_method_Front Door": ("Customer Preferences", "Preferred Method: Front Door", "Unattended front door delivery preference"),
    "preferred_delivery_method_Garage": ("Customer Preferences", "Preferred Method: Garage", "Garage access delivery preference"),
    "preferred_delivery_method_Hand to Customer": ("Customer Preferences", "Preferred Method: Hand to Customer", "Direct in-person handoff requirement"),
    "preferred_delivery_method_Locker": ("Customer Preferences", "Preferred Method: Smart Locker", "Automated smart locker redirection"),
    "preferred_delivery_method_Mailroom": ("Customer Preferences", "Preferred Method: Mailroom", "Mailroom access delivery preference"),
    "preferred_delivery_method_Neighbor": ("Customer Preferences", "Preferred Method: Neighbor", "Neighbor drop-off delivery preference"),
    "preferred_delivery_method_Porch": ("Customer Preferences", "Preferred Method: Porch", "Unattended porch delivery preference"),
    "customer_delivery_preference_Anytime": ("Customer Preferences", "Customer Preference: Anytime", "Flexible delivery time preference"),
    "customer_delivery_preference_Evening Only": ("Customer Preferences", "Customer Preference: Evening Only", "Customer prefers evening delivery window"),
    "customer_delivery_preference_Leave with Guard": ("Customer Preferences", "Customer Preference: Leave with Guard", "Gate/guard handoff preference"),
    "customer_delivery_preference_Morning Only": ("Customer Preferences", "Customer Preference: Morning Only", "Customer prefers morning delivery window"),
    "customer_delivery_preference_Weekday Only": ("Customer Preferences", "Customer Preference: Weekday Only", "Weekday-only delivery constraint"),

    # Pillar 8: Geographic & Route delivery behavior
    "latitude": ("Geographic & Route Behavior", "Geographic Latitude Coordinate", "Spatial service area delivery prior"),
    "longitude": ("Geographic & Route Behavior", "Geographic Longitude Coordinate", "Spatial service area delivery prior"),
    "planned_service_time_seconds": ("Geographic & Route Behavior", "Planned Service Time at Stop", "High required dwell time at delivery stop"),
    "log_planned_service_time": ("Geographic & Route Behavior", "Service Dwell Time Index", "Stop service duration complexity"),
    "depth_cm": ("Geographic & Route Behavior", "Package Depth Dimension", "Parcel physical dimensions impact handling"),
    "height_cm": ("Geographic & Route Behavior", "Package Height Dimension", "Parcel physical height impacts van loading and handling"),
    "width_cm": ("Geographic & Route Behavior", "Package Width Dimension", "Parcel physical width impacts handoff difficulty"),
    "package_volume_cm3": ("Geographic & Route Behavior", "Large Package Volume", "Bulky parcel volume creates delivery handling overhead"),
    "log_package_volume": ("Geographic & Route Behavior", "Package Volume Index", "Parcel size complexity scale"),
    "historical_zone_failure_rate": ("Geographic & Route Behavior", "Historical Delivery Zone Failure Prior", "Elevated historical first-attempt failure rate in delivery zone"),
    "historical_station_failure_rate": ("Geographic & Route Behavior", "Distribution Station Failure Prior", "Historical station dispatch failure baseline"),
    "traffic_risk_score": ("Geographic & Route Behavior", "Elevated Route Traffic Congestion", "High traffic congestion score on transit segments"),
    "risk_access_difficulty_heavy_package": ("Geographic & Route Behavior", "Bulky Parcel with Complex Address Access", "Bulky parcel combined with difficult address accessibility"),
}

# Fill station code features into Pillar 8
for i in range(1, 20):
    for prefix in ["DAU", "DBO", "DCH", "DLA", "DSE"]:
        st = f"station_code_{prefix}{i}"
        PILLAR_MAPPING[st] = ("Geographic & Route Behavior", f"Dispatch Station {prefix}{i}", f"Originating distribution station {prefix}{i} historical baseline")


class BaseExplainer:
    """Abstract interface for BRIDGE model explainers."""
    def explain(self, X_proc: np.ndarray, top_k: int = 3) -> List[Dict[str, Any]]:
        raise NotImplementedError

    def get_base_value(self) -> float:
        raise NotImplementedError

    def get_explained_space(self) -> str:
        return "calibrated_logit_margin"


class LinearExplainerChampion(BaseExplainer):
    """
    Closed-form Linear SHAP explainer for Champion Logistic Regression.
    Evaluates exact Shapley values in the calibrated log-odds space:
        phi_j = A * w_j * (x_j - x_bar_j)
        base_value = A * (w^T * x_bar + b_0) + B
    Guarantees exact machine-precision local accuracy:
        sum(phi_j) == calibrated_log_odds - base_value
    """
    def __init__(self, lr_model, background_payload: Dict[str, Any], calibrator=None):
        self.lr_model = lr_model
        self.weights = np.asarray(lr_model.coef_[0], dtype=np.float64)
        self.intercept = float(lr_model.intercept_[0])
        
        self.x_bar = np.asarray(background_payload["mean_vector"], dtype=np.float64)
        self.feature_names = list(background_payload["feature_names"])
        
        # Verify dimension alignment
        assert len(self.weights) == len(self.x_bar) == len(self.feature_names) == 73, (
            f"Dimension mismatch: weights={len(self.weights)}, x_bar={len(self.x_bar)}, names={len(self.feature_names)}"
        )
        
        # Platt calibration affine scaling parameters
        if calibrator is not None and hasattr(calibrator, "lr_"):
            self.cal_slope = float(calibrator.lr_.coef_[0, 0])
            self.cal_intercept = float(calibrator.lr_.intercept_[0])
        else:
            self.cal_slope = 1.0
            self.cal_intercept = 0.0

        # Precompute base value in calibrated log-odds space
        # base_value = A * (w^T * x_bar + b_0) + B
        self.base_value = float(self.cal_slope * (np.dot(self.weights, self.x_bar) + self.intercept) + self.cal_intercept)
        # Precompute effective calibrated weights: w_cal = A * w
        self.cal_weights = self.cal_slope * self.weights

    def get_base_value(self) -> float:
        return self.base_value

    def compute_attributions(self, X_proc: np.ndarray) -> np.ndarray:
        """
        Computes exact calibrated log-odds Shapley values for input matrix X_proc (N, 73).
        Returns ndarray of shape (N, 73).
        """
        X_proc = np.asarray(X_proc, dtype=np.float64)
        if X_proc.ndim == 1:
            X_proc = X_proc.reshape(1, -1)
        # Vectorized Linear SHAP: phi = (X - x_bar) * cal_weights
        diff = X_proc - self.x_bar
        return diff * self.cal_weights

    def explain(self, X_proc: np.ndarray, top_k: int = 3) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
        """
        Explains a single transformed row.
        Returns:
            - risk_factors: list of Top-K positive risk drivers (phi > 0)
            - mitigating_factors: list of top mitigating factors (phi < 0)
            - metadata: diagnostic explainability metadata
        """
        attributions = self.compute_attributions(X_proc)[0] # shape (73,)
        
        # Exact local accuracy check
        raw_margin = float(np.dot(self.weights, X_proc[0]) + self.intercept)
        cal_margin = float(self.cal_slope * raw_margin + self.cal_intercept)
        total_attributions = float(np.sum(attributions))
        additivity_error = abs(total_attributions - (cal_margin - self.base_value))
        
        positive_indices = [i for i in range(len(attributions)) if attributions[i] > 1e-6]
        negative_indices = [i for i in range(len(attributions)) if attributions[i] < -1e-6]
        
        # Sort positive drivers descending by attribution score
        # Deterministic tie-breaking: by (-score, feature_name)
        positive_indices.sort(key=lambda i: (-attributions[i], self.feature_names[i]))
        negative_indices.sort(key=lambda i: (attributions[i], self.feature_names[i]))
        
        total_positive_mass = float(sum(attributions[i] for i in positive_indices))
        
        # Select positive drivers: all drivers with attribution >= 0.10 up to max_k=7,
        # ensuring at least min(top_k, len(positive_indices)) are returned.
        selected_indices = [idx for idx in positive_indices if attributions[idx] >= 0.10][:7]
        if len(selected_indices) < min(top_k, len(positive_indices)):
            selected_indices = positive_indices[:min(top_k, len(positive_indices))]
            
        # Top positive risk drivers
        risk_factors = []
        for rank, idx in enumerate(selected_indices):
            score = float(attributions[idx])
            name = self.feature_names[idx]
            mapping = PILLAR_MAPPING.get(name, ("Operational Risk", name.replace("_", " ").title(), f"Elevated {name} contributes to failure log-odds"))
            pillar, factor_title, default_detail = mapping
            
            # Risk driver share strictly among positive attribution mass
            share = round(score / total_positive_mass, 3) if total_positive_mass > 0 else None
            severity = "high" if score >= 0.25 else ("medium" if score >= 0.10 else "low")
            
            detail = f"{default_detail} (+{score:.2f} log-odds)"
            risk_factors.append({
                "factor": factor_title,
                "detail": detail,
                "severity": severity,
                "feature_name": name,
                "pillar": pillar,
                "attribution_score": round(score, 4),
                "risk_driver_share": share,
                "direction": "INCREASES_RISK",
                "explained_space": self.get_explained_space()
            })
            
        # Top mitigating factors
        mitigating_factors = []
        for idx in negative_indices[:3]:
            score = float(attributions[idx])
            name = self.feature_names[idx]
            mapping = PILLAR_MAPPING.get(name, ("Operational Safeguard", name.replace("_", " ").title(), "Protective factor reduces failure log-odds"))
            pillar, factor_title, default_detail = mapping
            mitigating_factors.append({
                "factor": factor_title,
                "detail": f"{default_detail} ({score:.2f} log-odds)",
                "feature_name": name,
                "pillar": pillar,
                "attribution_score": round(score, 4),
                "direction": "DECREASES_RISK",
                "explained_space": self.get_explained_space()
            })
            
        status = "SUCCESS" if risk_factors else "NO_POSITIVE_DRIVERS"
        
        metadata = {
            "explainer_type": "linear_exact",
            "explained_space": self.get_explained_space(),
            "base_value_log_odds": round(self.base_value, 4),
            "baseline_probability": round(float(1.0 / (1.0 + np.exp(-self.base_value))), 4),
            "total_positive_attribution_mass": round(total_positive_mass, 4),
            "local_accuracy_error": round(additivity_error, 12),
            "explanation_status": status
        }
        
        return risk_factors, mitigating_factors, metadata


class TreeExplainerCandidate(BaseExplainer):
    """
    TreeSHAP explainer for candidate LightGBM booster.
    Evaluates Shapley values in the calibrated log-odds margin space:
        phi_j^cal = A_cand * phi_j^raw
        base_value_cal = A_cand * base_value_raw + B_cand
    """
    def __init__(self, lgb_model, feature_names: List[str], calibrator=None):
        import shap
        self.lgb_model = lgb_model
        self.feature_names = list(feature_names)
        self.explainer = shap.TreeExplainer(lgb_model, model_output="raw")
        
        # Raw base value from TreeExplainer
        raw_expected = self.explainer.expected_value
        if hasattr(raw_expected, "__len__"):
            self.raw_base_value = float(raw_expected[0])
        else:
            self.raw_base_value = float(raw_expected)
            
        if calibrator is not None and hasattr(calibrator, "lr_"):
            self.cal_slope = float(calibrator.lr_.coef_[0, 0])
            self.cal_intercept = float(calibrator.lr_.intercept_[0])
        else:
            self.cal_slope = 1.0
            self.cal_intercept = 0.0
            
        self.base_value = float(self.cal_slope * self.raw_base_value + self.cal_intercept)

    def get_base_value(self) -> float:
        return self.base_value

    def compute_attributions(self, X_proc: np.ndarray) -> np.ndarray:
        X_proc = np.asarray(X_proc, dtype=np.float64)
        if X_proc.ndim == 1:
            X_proc = X_proc.reshape(1, -1)
        raw_shaps = self.explainer.shap_values(X_proc)
        if isinstance(raw_shaps, list):
            raw_shaps = raw_shaps[1] if len(raw_shaps) > 1 else raw_shaps[0]
        return np.asarray(raw_shaps, dtype=np.float64) * self.cal_slope

    def explain(self, X_proc: np.ndarray, top_k: int = 3) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
        attributions = self.compute_attributions(X_proc)[0] # shape (73,)
        
        raw_margin = float(self.lgb_model.booster_.predict(X_proc, raw_score=True)[0])
        cal_margin = float(self.cal_slope * raw_margin + self.cal_intercept)
        total_attributions = float(np.sum(attributions))
        additivity_error = abs(total_attributions - (cal_margin - self.base_value))
        
        positive_indices = [i for i in range(len(attributions)) if attributions[i] > 1e-6]
        negative_indices = [i for i in range(len(attributions)) if attributions[i] < -1e-6]
        
        positive_indices.sort(key=lambda i: (-attributions[i], self.feature_names[i]))
        negative_indices.sort(key=lambda i: (attributions[i], self.feature_names[i]))
        
        total_positive_mass = float(sum(attributions[i] for i in positive_indices))
        
        # Select positive drivers: all drivers with attribution >= 0.10 up to max_k=7,
        # ensuring at least min(top_k, len(positive_indices)) are returned.
        selected_indices = [idx for idx in positive_indices if attributions[idx] >= 0.10][:7]
        if len(selected_indices) < min(top_k, len(positive_indices)):
            selected_indices = positive_indices[:min(top_k, len(positive_indices))]
            
        risk_factors = []
        for rank, idx in enumerate(selected_indices):
            score = float(attributions[idx])
            name = self.feature_names[idx]
            mapping = PILLAR_MAPPING.get(name, ("Operational Risk", name.replace("_", " ").title(), f"Elevated {name} contributes to failure log-odds"))
            pillar, factor_title, default_detail = mapping
            
            share = round(score / total_positive_mass, 3) if total_positive_mass > 0 else None
            severity = "high" if score >= 0.25 else ("medium" if score >= 0.10 else "low")
            
            detail = f"{default_detail} (+{score:.2f} log-odds)"
            risk_factors.append({
                "factor": factor_title,
                "detail": detail,
                "severity": severity,
                "feature_name": name,
                "pillar": pillar,
                "attribution_score": round(score, 4),
                "risk_driver_share": share,
                "direction": "INCREASES_RISK",
                "explained_space": self.get_explained_space()
            })
            
        mitigating_factors = []
        for idx in negative_indices[:3]:
            score = float(attributions[idx])
            name = self.feature_names[idx]
            mapping = PILLAR_MAPPING.get(name, ("Operational Safeguard", name.replace("_", " ").title(), "Protective factor reduces failure log-odds"))
            pillar, factor_title, default_detail = mapping
            mitigating_factors.append({
                "factor": factor_title,
                "detail": f"{default_detail} ({score:.2f} log-odds)",
                "feature_name": name,
                "pillar": pillar,
                "attribution_score": round(score, 4),
                "direction": "DECREASES_RISK",
                "explained_space": self.get_explained_space()
            })
            
        status = "SUCCESS" if risk_factors else "NO_POSITIVE_DRIVERS"
        
        metadata = {
            "explainer_type": "tree_shap",
            "explained_space": self.get_explained_space(),
            "base_value_log_odds": round(self.base_value, 4),
            "baseline_probability": round(float(1.0 / (1.0 + np.exp(-self.base_value))), 4),
            "total_positive_attribution_mass": round(total_positive_mass, 4),
            "local_accuracy_error": round(additivity_error, 8),
            "explanation_status": status
        }
        
        return risk_factors, mitigating_factors, metadata
