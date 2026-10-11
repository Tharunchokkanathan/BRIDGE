import os
import sys
import json
import time
import unittest
import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier

# Add src and app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from data_pipeline import ALL_FEATURE_COLS, EXCLUDE_COLS, verify_no_leakage
from risk_engine import RiskEngine

class TestLightGBMCandidateModel(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        cls.models_dir = os.path.join(cls.project_dir, "models")
        cls.candidate_path = os.path.join(cls.models_dir, "lightgbm_candidate.joblib")
        cls.metadata_path = os.path.join(cls.models_dir, "model_metadata.json")
        cls.preprocessor_path = os.path.join(cls.models_dir, "preprocessor.joblib")

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

    def test_candidate_artifact_exists_and_loads(self):
        """Verify LightGBM candidate model artifact is serialized and loads as LGBMClassifier."""
        self.assertTrue(
            os.path.exists(self.candidate_path),
            f"Candidate model artifact missing at {self.candidate_path}"
        )
        model = joblib.load(self.candidate_path)
        self.assertIsInstance(
            model,
            LGBMClassifier,
            f"Expected LGBMClassifier instance, got {type(model)}"
        )
        self.assertTrue(hasattr(model, "predict_proba"), "Candidate must support predict_proba")

    def test_feature_contract_and_input_shape(self):
        """Verify model accepts exactly 73 encoded features from preprocessor."""
        self.assertTrue(os.path.exists(self.preprocessor_path))
        preprocessor = joblib.load(self.preprocessor_path)
        model = joblib.load(self.candidate_path)

        from feature_engineering import compute_engineered_features
        df = compute_engineered_features(pd.DataFrame([self.sample_record]))
        for col in ALL_FEATURE_COLS:
            if col not in df.columns:
                df[col] = np.nan
        df_contract = df[ALL_FEATURE_COLS]

        X_proc = preprocessor.transform(df_contract)
        self.assertEqual(X_proc.shape[1], 73, f"Expected 73 encoded features, got {X_proc.shape[1]}")

        probs = model.predict_proba(X_proc)
        self.assertEqual(probs.shape, (1, 2), "Prediction output shape must be (1, 2)")

    def test_prediction_probability_bounds(self):
        """Verify candidate probabilities are strictly in [0.0, 1.0] without NaN or Inf."""
        preprocessor = joblib.load(self.preprocessor_path)
        model = joblib.load(self.candidate_path)

        from feature_engineering import compute_engineered_features
        df = compute_engineered_features(pd.DataFrame([self.sample_record]))
        for col in ALL_FEATURE_COLS:
            if col not in df.columns:
                df[col] = np.nan
        X_proc = preprocessor.transform(df[ALL_FEATURE_COLS])

        probs = model.predict_proba(X_proc)[0]
        self.assertGreaterEqual(probs[1], 0.0)
        self.assertLessEqual(probs[1], 1.0)
        self.assertFalse(np.isnan(probs[1]), "Probability must not be NaN")
        self.assertFalse(np.isinf(probs[1]), "Probability must not be Inf")
        self.assertAlmostEqual(probs[0] + probs[1], 1.0, places=5)

    def test_single_sample_inference_latency(self):
        """Verify candidate inference latency satisfies the <= 5.0 ms SLA."""
        preprocessor = joblib.load(self.preprocessor_path)
        model = joblib.load(self.candidate_path)

        from feature_engineering import compute_engineered_features
        df = compute_engineered_features(pd.DataFrame([self.sample_record]))
        for col in ALL_FEATURE_COLS:
            if col not in df.columns:
                df[col] = np.nan
        X_proc = preprocessor.transform(df[ALL_FEATURE_COLS])

        # Warm up
        for _ in range(5):
            _ = model.predict_proba(X_proc)

        # Benchmark 50 runs
        latencies = []
        for _ in range(50):
            t0 = time.perf_counter()
            _ = model.predict_proba(X_proc)
            latencies.append((time.perf_counter() - t0) * 1000.0)

        mean_latency = float(np.mean(latencies))
        p95_latency = float(np.percentile(latencies, 95))
        self.assertLess(
            mean_latency,
            5.0,
            f"Mean inference latency {mean_latency:.3f} ms exceeds SLA of 5.0 ms"
        )
        self.assertLess(
            p95_latency,
            10.0,
            f"P95 inference latency {p95_latency:.3f} ms exceeds 10.0 ms limit"
        )

    def test_model_metadata_comparative_structure(self):
        """Verify model_metadata.json contains complete side-by-side comparison for all 3 models."""
        self.assertTrue(os.path.exists(self.metadata_path))
        with open(self.metadata_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        self.assertIn("comparison_results", meta)
        comp = meta["comparison_results"]

        for expected_model in ["Logistic Regression", "Random Forest", "LightGBM Candidate"]:
            self.assertIn(expected_model, comp, f"Missing {expected_model} in comparison_results")
            record = comp[expected_model]
            self.assertIn("test_metrics", record)
            test_m = record["test_metrics"]
            self.assertIn("pr_auc", test_m)
            self.assertIn("roc_auc", test_m)
            self.assertIn("brier_score", test_m)
            self.assertIn("precision_at_top10pct", test_m)
            self.assertIn("recall_at_top10pct", test_m)
            self.assertIn("latency_ms_per_sample", test_m)

    def test_promotion_gate_enforcement(self):
        """Verify promotion gate was enforced: champion remains baseline until candidate meets thresholds."""
        with open(self.metadata_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        self.assertIn("promotion_gate", meta)
        gate = meta["promotion_gate"]
        self.assertIn("status", gate)
        self.assertIn("rationale", gate)
        self.assertIn("pr_auc_threshold", gate)
        self.assertIn("roc_auc_threshold", gate)

        # Gate targets
        self.assertEqual(gate["pr_auc_threshold"], 0.1500)
        self.assertEqual(gate["roc_auc_threshold"], 0.6500)

        # Verification: since candidate PR-AUC < 0.1500, champion must NOT be prematurely promoted
        candidate_pr = gate.get("candidate_pr_auc", 0.0)
        candidate_roc = gate.get("candidate_roc_auc", 0.0)

        if candidate_pr < 0.1500 or candidate_roc < 0.6500:
            self.assertEqual(gate["status"], "REJECTED_BELOW_GATE")
            self.assertEqual(meta["champion_model"], "Logistic Regression")

    def test_zero_target_leakage_in_features(self):
        """Verify feature names in metadata contain 0 target or post-dispatch variables."""
        with open(self.metadata_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        features = meta.get("feature_names", [])
        for feat in features:
            for forbidden in ["scan_status", "first_attempt_failed", "route_id", "package_id"]:
                self.assertNotEqual(feat, forbidden, f"Forbidden column {forbidden} found in metadata feature names")

    def test_risk_engine_candidate_integration(self):
        """Verify RiskEngine can dynamically activate LightGBM candidate and score deliveries."""
        engine = RiskEngine(model_dir=self.models_dir)
        self.assertIsNotNone(engine.lgb_model, "RiskEngine should discover and load lightgbm_candidate.joblib")

        success = engine.set_active_model("LightGBM Candidate")
        self.assertTrue(success, "RiskEngine must allow setting active model to LightGBM Candidate")
        self.assertEqual(engine.active_model_name, "LightGBM Candidate")

        res = engine.predict_risk(self.sample_record)
        self.assertIn("failure_probability", res)
        self.assertGreaterEqual(res["failure_probability"], 0.0)
        self.assertLessEqual(res["failure_probability"], 1.0)
        self.assertIn(res["risk_tier"], ["LOW", "MEDIUM", "HIGH"])
        self.assertEqual(res["model_used"], "LightGBM Candidate")

        # Revert to champion
        engine.set_active_model("Logistic Regression")
        self.assertEqual(engine.active_model_name, "Logistic Regression")

if __name__ == "__main__":
    unittest.main()
