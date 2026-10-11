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

    def test_44_feature_contract(self):
        """Verifies the 44-feature contract covering all 8 Problem Statement pillars."""
        self.assertEqual(len(ALL_FEATURE_COLS), 44, f"Expected exactly 44 features, got {len(ALL_FEATURE_COLS)}")
        expected_sample_features = [
            "location_type",
            "risk_signature_unavailability",
            "risk_commercial_closed",
            "risk_preference_departure_clash",
            "risk_access_difficulty_heavy_package",
            "customer_failure_propensity"
        ]
        for f in expected_sample_features:
            self.assertIn(f, ALL_FEATURE_COLS, f"Feature {f} missing from ALL_FEATURE_COLS")

    def test_operational_interaction_features(self):
        """Tests that commercial after-hours and signature absence interactions calculate correctly."""
        from feature_engineering import compute_engineered_features
        commercial_rec = {
            "preferred_delivery_method": "Mailroom",
            "location_type": "Commercial",
            "departure_hour": 18, # After 5 PM
            "is_weekend": 0,
            "signature_required": 1,
            "customer_availability_rate": 0.20
        }
        df = compute_engineered_features(pd.DataFrame([commercial_rec]))
        self.assertEqual(df.loc[0, "risk_commercial_closed"], 1.0, "Commercial address after 17:00 must flag risk_commercial_closed")
        self.assertAlmostEqual(df.loc[0, "risk_signature_unavailability"], 0.80, places=2)


class TestPhase34RiskEngineIntegrationAndBanding(unittest.TestCase):
    """
    Phase 3.4 Unit & Integration Tests:
    1. Threshold boundary transitions (LOW, MEDIUM, HIGH).
    2. Single vs batch prediction consistency.
    3. Strict separation of statistical risk bands from operational capacity constraints.
    4. Deterministic tie-breaking and input order preservation.
    5. Missing, empty, and invalid input resilience.
    6. Model switching and champion protection.
    """
    @classmethod
    def setUpClass(cls):
        cls.engine = RiskEngine(model_dir=os.path.join(os.path.dirname(__file__), "..", "models"))
        cls.base_record = {
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
            "departure_hour": 16,
            "is_weekend": 0,
            "month": 9,
            "time_window_duration_hours": 2.0,
            "customer_availability_rate": 0.35,
            "customer_previous_delivery_attempts": 5,
            "customer_previous_failed_attempts": 2,
            "customer_previous_success_rate": 0.60,
            "address_access_difficulty": 4,
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
            "preference_departure_mismatch": 1
        }
        cls.low_record = {
            "station_code": "DLA3",
            "preferred_delivery_method": "Front Door",
            "customer_delivery_preference": "Anytime",
            "location_type": "Residential",
            "latitude": 34.099,
            "longitude": -118.283,
            "planned_service_time_seconds": 60.0,
            "depth_cm": 25.4,
            "height_cm": 7.6,
            "width_cm": 17.8,
            "package_volume_cm3": 3436.0,
            "departure_hour": 10,
            "is_weekend": 0,
            "month": 7,
            "time_window_duration_hours": 4.0,
            "customer_availability_rate": 0.95,
            "customer_previous_delivery_attempts": 10,
            "customer_previous_failed_attempts": 0,
            "customer_previous_success_rate": 1.0,
            "address_access_difficulty": 1,
            "signature_required": 0,
            "historical_zone_failure_rate": 0.02,
            "historical_station_failure_rate": 0.02,
            "seasonal_failure_rate": 0.02,
            "traffic_risk_score": 0.20,
            "weather_risk_score": 0.10,
            "has_time_window": 0,
            "preference_departure_mismatch": 0
        }

    def test_threshold_boundary_transitions(self):
        """Verify exact boundary transitions: LOW (<0.11), MEDIUM (0.11-0.14), HIGH (>=0.14)."""
        # Exact lower boundaries
        band_0 = self.engine._assign_risk_band(0.0)
        self.assertEqual(band_0["risk_tier"], "LOW")
        self.assertEqual(band_0["badge_color"], "green")

        band_just_below_low = self.engine._assign_risk_band(0.1099)
        self.assertEqual(band_just_below_low["risk_tier"], "LOW")

        # Threshold low boundary (0.1100 -> MEDIUM)
        band_exact_low = self.engine._assign_risk_band(self.engine.threshold_low)
        self.assertEqual(band_exact_low["risk_tier"], "MEDIUM")
        self.assertEqual(band_exact_low["badge_color"], "amber")

        band_just_below_med = self.engine._assign_risk_band(0.1399)
        self.assertEqual(band_just_below_med["risk_tier"], "MEDIUM")

        # Threshold med boundary (0.1400 -> HIGH)
        band_exact_med = self.engine._assign_risk_band(self.engine.threshold_medium)
        self.assertEqual(band_exact_med["risk_tier"], "HIGH")
        self.assertEqual(band_exact_med["badge_color"], "red")

        band_1 = self.engine._assign_risk_band(1.0)
        self.assertEqual(band_1["risk_tier"], "HIGH")

    def test_batch_prediction_consistency_with_single(self):
        """Verify predict_batch() yields identical results to iterative predict_risk()."""
        rec_high = self.base_record.copy()
        rec_high["customer_availability_rate"] = 0.10
        rec_high["signature_required"] = 1
        rec_high["address_access_difficulty"] = 5

        batch = [self.low_record, self.base_record, rec_high]
        single_results = [self.engine.predict_risk(r) for r in batch]
        batch_results = self.engine.predict_batch(batch)

        self.assertEqual(len(batch_results), 3)
        for s_res, b_res in zip(single_results, batch_results):
            self.assertEqual(s_res["failure_probability"], b_res["failure_probability"])
            self.assertEqual(s_res["raw_probability"], b_res["raw_probability"])
            self.assertEqual(s_res["risk_tier"], b_res["risk_tier"])
            self.assertEqual(s_res["badge_color"], b_res["badge_color"])
            self.assertEqual(s_res["model_used"], b_res["model_used"])
            self.assertEqual(s_res["calibrated"], b_res["calibrated"])

    def test_batch_empty_and_dataframe_inputs(self):
        """Verify predict_batch handles empty lists, None, and DataFrame inputs gracefully."""
        self.assertEqual(self.engine.predict_batch([]), [])
        self.assertEqual(self.engine.predict_batch(None), [])

        df_input = pd.DataFrame([self.base_record, self.base_record])
        df_results = self.engine.predict_batch(df_input)
        self.assertEqual(len(df_results), 2)
        self.assertIn("failure_probability", df_results[0])

    def test_capacity_policy_preserves_input_order(self):
        """Verify apply_capacity_constrained_policy returns items in original input order."""
        rec_high = self.base_record.copy()
        rec_high["customer_availability_rate"] = 0.10
        rec_high["signature_required"] = 1
        rec_high["address_access_difficulty"] = 5

        # Arrange as: [High, Low, High, Low]
        batch = [rec_high, self.low_record, rec_high, self.low_record]
        results = self.engine.apply_capacity_constrained_policy(batch, max_capacity_rate=0.50)

        self.assertEqual(len(results), 4)
        # Check original positions correspond to input characteristics
        self.assertIn(results[0]["risk_tier"], ["MEDIUM", "HIGH"])
        self.assertEqual(results[1]["risk_tier"], "LOW")
        self.assertIn(results[2]["risk_tier"], ["MEDIUM", "HIGH"])
        self.assertEqual(results[3]["risk_tier"], "LOW")

    def test_capacity_policy_deterministic_tie_breaking(self):
        """Verify ties in predicted failure probability break deterministically by input index."""
        rec_high = self.base_record.copy()
        rec_high["customer_availability_rate"] = 0.10
        rec_high["signature_required"] = 1
        rec_high["address_access_difficulty"] = 5

        # 4 identical high risk records; max_capacity = 0.50 -> 2 approved
        batch = [rec_high.copy() for _ in range(4)]
        results = self.engine.apply_capacity_constrained_policy(batch, max_capacity_rate=0.50)

        self.assertEqual(len(results), 4)
        # Exactly 2 should be approved
        approved = [r for r in results if r["capacity_approved"]]
        self.assertEqual(len(approved), 2)
        # Earlier indices in batch get priority
        self.assertTrue(results[0]["capacity_approved"])
        self.assertEqual(results[0]["capacity_rank"], 1)
        self.assertTrue(results[1]["capacity_approved"])
        self.assertEqual(results[1]["capacity_rank"], 2)
        self.assertFalse(results[2]["capacity_approved"])
        self.assertEqual(results[2]["capacity_rank"], 3)
        self.assertFalse(results[3]["capacity_approved"])
        self.assertEqual(results[3]["capacity_rank"], 4)

    def test_capacity_policy_separation_of_risk_and_capacity(self):
        """Verify risk tier is NEVER modified when deferred by fleet capacity."""
        rec_high = self.base_record.copy()
        rec_high["customer_availability_rate"] = 0.10
        rec_high["signature_required"] = 1
        rec_high["address_access_difficulty"] = 5

        # 5 high risk + 1 low risk; capacity = 0.20 -> floor(6 * 0.20) = 1 approved
        batch = [rec_high.copy() for _ in range(5)] + [self.low_record]
        results = self.engine.apply_capacity_constrained_policy(batch, max_capacity_rate=0.20)

        # Deferred high-risk deliveries must still retain risk_tier == "HIGH"
        deferred = [r for r in results if r.get("capacity_status") == "DEFERRED_DUE_TO_FLEET_CAPACITY"]
        self.assertEqual(len(deferred), 4)
        for r in deferred:
            self.assertIn(r["risk_tier"], ["MEDIUM", "HIGH"], "Risk tier must not be downgraded when deferred")
            self.assertFalse(r["capacity_approved"])

        # Low-risk delivery must NEVER be approved even if capacity remains
        low_res = results[5]
        self.assertEqual(low_res["risk_tier"], "LOW")
        self.assertFalse(low_res["capacity_approved"])
        self.assertEqual(low_res["capacity_status"], "NOT_ELIGIBLE_LOW_RISK")

    def test_missing_and_empty_inputs_resilience(self):
        """Verify engine gracefully handles empty dict, missing fields, and rejects invalid types."""
        # Empty dict should impute medians and produce valid prediction
        empty_res = self.engine.predict_risk({})
        self.assertIsInstance(empty_res["failure_probability"], float)
        self.assertIn(empty_res["risk_tier"], ["LOW", "MEDIUM", "HIGH"])

        # None or non-dict should raise ValueError
        with self.assertRaises(ValueError):
            self.engine.predict_risk(None)

        with self.assertRaises(ValueError):
            self.engine.predict_risk("invalid_string_input")

        with self.assertRaises(ValueError):
            self.engine.predict_risk(12345)

    def test_model_switching_and_champion_protection(self):
        """Verify model switching behavior and that champion is protected."""
        # Baseline champion is Logistic Regression
        self.assertEqual(self.engine.champion_name, "Logistic Regression")

        # Invalid switch returns False and preserves current active model
        invalid_switch = self.engine.set_active_model("NonExistentModel")
        self.assertFalse(invalid_switch)
        self.assertEqual(self.engine.active_model_name, "Logistic Regression")

        # Switch to LightGBM Candidate
        switch_lgb = self.engine.set_active_model("LightGBM Candidate")
        self.assertTrue(switch_lgb)
        self.assertEqual(self.engine.active_model_name, "LightGBM Candidate")
        lgb_res = self.engine.predict_risk(self.base_record)
        self.assertEqual(lgb_res["model_used"], "LightGBM Candidate")

        # Revert to Logistic Regression
        revert = self.engine.set_active_model("Logistic Regression")
        self.assertTrue(revert)
        self.assertEqual(self.engine.active_model_name, "Logistic Regression")


if __name__ == "__main__":
    unittest.main()

