import os
import sys
import json
import unittest
import joblib
import numpy as np
import pandas as pd

# Add src and app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from calibrator import PlattCalibrator, compute_calibration_metrics
from risk_engine import RiskEngine

class TestCalibrationAndThresholdValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        cls.models_dir = os.path.join(cls.project_dir, "models")
        cls.cal_champ_path = os.path.join(cls.models_dir, "calibrator_champion.joblib")
        cls.cal_cand_path = os.path.join(cls.models_dir, "calibrator_candidate.joblib")
        cls.metadata_path = os.path.join(cls.models_dir, "model_metadata.json")

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
            "departure_hour_sin": float(np.sin(2 * np.pi * 16 / 24)),
            "departure_hour_cos": float(np.cos(2 * np.pi * 16 / 24)),
            "day_of_week_sin": 0.0,
            "day_of_week_cos": 1.0,
            "log_package_volume": float(np.log1p(7500.0)),
            "log_planned_service_time": float(np.log1p(180.0)),
            "preference_departure_mismatch": 1
        }

    def test_calibrator_artifacts_exist_and_load(self):
        """Verify calibrators for both champion and candidate exist and load as PlattCalibrator."""
        self.assertTrue(os.path.exists(self.cal_champ_path), f"Missing {self.cal_champ_path}")
        self.assertTrue(os.path.exists(self.cal_cand_path), f"Missing {self.cal_cand_path}")

        cal_champ = joblib.load(self.cal_champ_path)
        cal_cand = joblib.load(self.cal_cand_path)

        self.assertIsInstance(cal_champ, PlattCalibrator)
        self.assertIsInstance(cal_cand, PlattCalibrator)

    def test_calibrated_probabilities_strictly_bounded(self):
        """Verify calibrated probabilities remain strictly within [0.0, 1.0]."""
        cal_champ = joblib.load(self.cal_champ_path)
        test_inputs = np.linspace(0.001, 0.999, 100)
        cal_outputs = cal_champ.predict_proba(test_inputs)

        self.assertTrue(np.all(cal_outputs >= 0.0), "Calibrated probabilities must be >= 0.0")
        self.assertTrue(np.all(cal_outputs <= 1.0), "Calibrated probabilities must be <= 1.0")
        self.assertFalse(np.any(np.isnan(cal_outputs)), "No NaNs permitted in calibrated probabilities")
        self.assertFalse(np.any(np.isinf(cal_outputs)), "No Infs permitted in calibrated probabilities")

    def test_monotonicity_preservation(self):
        """Verify Platt scaling preserves strict rank monotonicity."""
        cal_champ = joblib.load(self.cal_champ_path)
        test_inputs = np.linspace(0.01, 0.99, 50)
        cal_outputs = cal_champ.predict_proba(test_inputs)

        diffs = np.diff(cal_outputs)
        self.assertTrue(np.all(diffs >= 0.0), "Platt calibrator must be strictly monotonic non-decreasing")

    def test_calibration_transfer_validity(self):
        """Verify calibration transfer validity: KS drift between OOF and full-dev model is small (< 0.05)."""
        self.assertTrue(os.path.exists(self.metadata_path))
        with open(self.metadata_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        self.assertIn("calibration_transfer_validity", meta)
        transfer = meta["calibration_transfer_validity"]

        self.assertTrue(transfer["verified"], "Calibration transfer validity must be verified")
        self.assertLess(transfer["lr_ks_statistic"], 0.05, "LR KS statistic exceeds transfer threshold")
        self.assertLess(transfer["lgb_ks_statistic"], 0.05, "LGB KS statistic exceeds transfer threshold")

    def test_risk_engine_calibrator_wiring(self):
        """Verify RiskEngine correctly applies matched calibrators and reports calibrated status."""
        engine = RiskEngine(model_dir=self.models_dir)
        self.assertIsNotNone(engine.calibrator_champion)
        self.assertIsNotNone(engine.calibrator_candidate)

        # Champion test
        res_lr = engine.predict_risk(self.sample_record)
        self.assertTrue(res_lr["calibrated"])
        self.assertIn("raw_probability", res_lr)
        self.assertIn("failure_probability", res_lr)
        self.assertGreaterEqual(res_lr["failure_probability"], 0.0)
        self.assertLessEqual(res_lr["failure_probability"], 1.0)

        # Candidate test
        engine.set_active_model("LightGBM Candidate")
        res_lgb = engine.predict_risk(self.sample_record)
        self.assertTrue(res_lgb["calibrated"])
        self.assertEqual(res_lgb["model_used"], "LightGBM Candidate")

        # Revert
        engine.set_active_model("Logistic Regression")
        self.assertEqual(engine.active_model_name, "Logistic Regression")

    def test_operational_capacity_constrained_policy(self):
        """Verify that dynamic capacity-constrained policy caps approved interventions at <= 20%."""
        engine = RiskEngine(model_dir=self.models_dir)

        # Create a batch of 20 sample records
        batch = [self.sample_record.copy() for _ in range(20)]
        # Vary customer availability to create diverse risk scores
        for i, rec in enumerate(batch):
            rec["customer_availability_rate"] = 0.10 + (i * 0.04)

        results = engine.apply_capacity_constrained_policy(batch, max_capacity_rate=0.20)
        self.assertEqual(len(results), 20)

        approved_count = sum(1 for r in results if r.get("capacity_approved", False))
        max_allowed = int(np.floor(20 * 0.20)) # 4 deliveries
        self.assertLessEqual(approved_count, max_allowed, f"Approved interventions ({approved_count}) exceeded 20% cap ({max_allowed})")

    def test_brier_skill_score_against_prevalence_baseline(self):
        """Verify Brier score is measured against constant-prevalence baseline in metadata."""
        with open(self.metadata_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        comp = meta["comparison_results"]
        for model_name in ["Logistic Regression", "LightGBM Candidate"]:
            rec = comp[model_name]
            q_metrics = rec["quarantined_test_metrics"]
            self.assertIn("brier_baseline", q_metrics)
            self.assertIn("brier_skill_score", q_metrics)
            self.assertGreater(q_metrics["brier_baseline"], 0.080)
            self.assertLess(q_metrics["brier_baseline"], 0.086)

if __name__ == "__main__":
    unittest.main()
