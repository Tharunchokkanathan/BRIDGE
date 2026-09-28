import os
import sys
import unittest
import numpy as np
import pandas as pd

# Add src and app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from data_pipeline import ALL_FEATURE_COLS, EXCLUDE_COLS, verify_no_leakage
from risk_engine import RiskEngine, THRESHOLD_LOW, THRESHOLD_MEDIUM

class TestBridgeProductionEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = RiskEngine(model_dir=os.path.join(os.path.dirname(__file__), "..", "models"))
        cls.sample_record = {
            "station_code": "DBO1",
            "preferred_delivery_method": "Hand to Customer",
            "customer_delivery_preference": "Morning Only",
            "latitude": 42.36,
            "longitude": -71.05,
            "planned_service_time_seconds": 180,
            "depth_cm": 25.0,
            "height_cm": 15.0,
            "width_cm": 20.0,
            "package_volume_cm3": 7500.0,
            "departure_hour": 16, # Afternoon departure -> mismatch
            "is_weekend": 0,
            "month": 9,
            "time_window_duration_hours": 2.0,
            "customer_availability_rate": 0.35, # Low availability
            "customer_previous_delivery_attempts": 5,
            "customer_previous_failed_attempts": 2, # Prior fails
            "customer_previous_success_rate": 0.60,
            "address_access_difficulty": 4, # Difficult access
            "signature_required": 1,
            "historical_zone_failure_rate": 0.12,
            "historical_station_failure_rate": 0.10,
            "seasonal_failure_rate": 0.09,
            "traffic_risk_score": 0.75,
            "weather_risk_score": 0.60,
            "has_time_window": 1,
            "window_start_minutes": 540,
            "window_end_minutes": 660,
            "departure_to_window_start_minutes": -420,
            "departure_to_window_end_minutes": -300,
            "departure_hour_sin": float(np.sin(2 * np.pi * 16 / 24)),
            "departure_hour_cos": float(np.cos(2 * np.pi * 16 / 24)),
            "day_of_week_sin": 0.0,
            "day_of_week_cos": 1.0,
            "log_package_volume": float(np.log1p(7500.0)),
            "log_planned_service_time": float(np.log1p(180.0)),
            "preference_departure_mismatch": 1
        }

    def test_strict_leakage_prevention(self):
        """Verify forbidden columns (outcomes and post-dispatch states) never enter the feature set."""
        for col in ["scan_status", "first_attempt_failed"]:
            self.assertNotIn(col, ALL_FEATURE_COLS, f"Leakage detected: {col} in ALL_FEATURE_COLS")
            self.assertIn(col, EXCLUDE_COLS, f"{col} must be in EXCLUDE_COLS")
        verify_no_leakage(ALL_FEATURE_COLS)

    def test_risk_prediction_probability_bounds(self):
        """Verify failure probability is bounded in [0.0, 1.0] and properly calibrated."""
        res = self.engine.predict_risk(self.sample_record)
        prob = res["failure_probability"]
        self.assertGreaterEqual(prob, 0.0)
        self.assertLessEqual(prob, 1.0)
        self.assertIn(res["risk_tier"], ["LOW", "MEDIUM", "HIGH"])
        self.assertIsInstance(res["risk_factors"], list)

    def test_risk_factor_explainability(self):
        """Verify that high-risk inputs trigger domain-explainable risk factors."""
        res = self.engine.predict_risk(self.sample_record)
        factor_names = [f["factor"] for f in res["risk_factors"]]
        # Should flag availability and preference mismatch
        self.assertTrue(
            any("Availability" in f for f in factor_names),
            "Expected Customer Availability factor to be flagged"
        )
        self.assertTrue(
            any("Mismatch" in f for f in factor_names),
            "Expected Preference Mismatch factor to be flagged"
        )

    def test_customer_intervention_simulation(self):
        """Verify all 5 customer preferences are simulated and locker decreases risk."""
        sim = self.engine.simulate_interventions(self.sample_record)
        base_p = sim["baseline_assessment"]["failure_probability"]
        options = sim["intervention_options"]
        
        self.assertEqual(len(options), 5, "Must provide exactly 5 customer preference options")
        
        # Check locker option
        locker_opt = next(o for o in options if o["id"] == "access_point")
        self.assertLess(
            locker_opt["new_prob"],
            base_p,
            "Smart locker delivery must lower failure risk compared to base"
        )
        self.assertGreater(locker_opt["risk_reduction_pct"], 0.0)

    def test_model_switching(self):
        """Verify dynamic hot-swapping between Logistic Regression and Random Forest."""
        self.assertTrue(self.engine.set_active_model("Random Forest"))
        self.assertEqual(self.engine.active_model_name, "Random Forest")
        rf_res = self.engine.predict_risk(self.sample_record)
        self.assertIsNotNone(rf_res)

        self.assertTrue(self.engine.set_active_model("Logistic Regression"))
        self.assertEqual(self.engine.active_model_name, "Logistic Regression")
        lr_res = self.engine.predict_risk(self.sample_record)
        self.assertIsNotNone(lr_res)

if __name__ == "__main__":
    unittest.main()
