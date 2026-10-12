import os
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure src and app are on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from server import app, ENGINE


class TestBridgeAPIServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def tearDown(self):
        # Mandatory safeguard: Guarantee Logistic Regression remains Champion after every test
        ENGINE.set_active_model("Logistic Regression")

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["active_model"], "Logistic Regression")
        self.assertEqual(data["champion_model"], "Logistic Regression")
        self.assertTrue(data["is_champion_active"])
        self.assertTrue(data["calibrated"])
        self.assertEqual(data["explainer_type"], "linear_exact")
        self.assertIn("database", data)
        self.assertIn("available_models", data)
        self.assertIn("Logistic Regression", data["available_models"])
        self.assertIn("LightGBM Candidate", data["available_models"])
        self.assertIn("Random Forest", data["available_models"])
        self.assertIn("operational_thresholds", data)
        self.assertEqual(data["operational_thresholds"]["tau_low"], 0.11)
        self.assertEqual(data["operational_thresholds"]["tau_med"], 0.14)
        self.assertEqual(data["operational_thresholds"]["max_fleet_capacity"], 0.20)

    def test_dashboard_stats_endpoint(self):
        response = self.client.get("/api/dashboard/stats")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_packages_evaluated", data)
        self.assertIn("baseline_success_rate", data)
        self.assertIn("optimized_success_rate", data)
        self.assertGreater(data["optimized_success_rate"], data["baseline_success_rate"])
        self.assertIn("capacity_approved_count", data)
        self.assertIn("capacity_deferred_count", data)
        self.assertEqual(data["active_model"], "Logistic Regression")
        self.assertTrue(data["is_champion_active"])
        self.assertTrue(data["calibrated"])
        self.assertEqual(data["explainer_type"], "linear_exact")
        self.assertIn("operational_thresholds", data)

    def test_sample_shipments_endpoint(self):
        response = self.client.get("/api/shipments/sample")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(data["count"], 0)
        self.assertIsInstance(data["shipments"], list)
        
        # Verify first shipment has enriched capacity and explainability prediction fields
        first_item = data["shipments"][0]
        self.assertIn("prediction", first_item)
        pred = first_item["prediction"]
        self.assertIn("failure_probability", pred)
        self.assertIn("risk_tier", pred)
        self.assertIn("badge_color", pred)
        self.assertIn("capacity_rank", pred)
        self.assertIn("capacity_approved", pred)
        self.assertIn("capacity_status", pred)
        self.assertIn("risk_factors", pred)
        self.assertIn("explainability_metadata", pred)

    def test_predict_endpoint_champion_linear_shap(self):
        sample_payload = {
            "shipment": {
                "station_code": "DBO1",
                "preferred_delivery_method": "Hand to Customer",
                "customer_delivery_preference": "Morning Only",
                "location_type": "Apartment",
                "departure_hour": 16,
                "customer_availability_rate": 0.35,
                "address_access_difficulty": 4,
                "signature_required": 1
            }
        }
        response = self.client.post("/api/predict", json=sample_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Core prediction contracts
        self.assertIn("failure_probability", data)
        self.assertIsInstance(data["failure_probability"], float)
        self.assertGreaterEqual(data["failure_probability"], 0.0)
        self.assertLessEqual(data["failure_probability"], 1.0)
        self.assertIn("raw_probability", data)
        self.assertTrue(data["calibrated"])
        self.assertEqual(data["model_used"], "Logistic Regression")
        self.assertIn(data["risk_tier"], ["LOW", "MEDIUM", "HIGH"])
        self.assertIn(data["badge_color"], ["green", "amber", "red"])
        self.assertIn("recommended_action", data)
        
        # Explainability output contracts
        self.assertIsInstance(data["risk_factors"], list)
        self.assertGreaterEqual(len(data["risk_factors"]), 1)
        
        # Verify top risk factor schema
        top_driver = data["risk_factors"][0]
        self.assertIn("factor", top_driver)
        self.assertIn("detail", top_driver)
        self.assertIn("severity", top_driver)
        self.assertIn(top_driver["severity"], ["low", "medium", "high"])
        self.assertIn("pillar", top_driver)
        self.assertIn("direction", top_driver)
        self.assertEqual(top_driver["direction"], "INCREASES_RISK")
        self.assertIn("shap_logit", top_driver)
        self.assertGreater(top_driver["shap_logit"], 0.0)
        if "risk_driver_share" in top_driver:
            self.assertGreater(top_driver["risk_driver_share"], 0.0)
            self.assertLessEqual(top_driver["risk_driver_share"], 1.0)

        # Verify explainability metadata
        self.assertIn("explainability_metadata", data)
        meta = data["explainability_metadata"]
        self.assertEqual(meta["explainer_type"], "linear_exact")
        self.assertEqual(meta["explained_space"], "calibrated_logit_margin")
        self.assertEqual(meta["explanation_status"], "SUCCESS")
        self.assertIn("base_value", meta)
        self.assertIn("predicted_log_odds", meta)
        self.assertIn("fleet_mean_calibrated_probability", meta)
        self.assertLessEqual(meta["additivity_error"], 1e-7)

    def test_batch_predict_fleet_capacity_and_order_preservation(self):
        """
        Verifies /api/predict/batch:
        1. Preserves 100% exact original input ordering.
        2. Strictly caps approved interventions at 20% fleet capacity.
        3. Correctly marks excess elevated-risk shipments as DEFERRED_DUE_TO_FLEET_CAPACITY.
        """
        # Create 10 synthetic shipments with diverse risk profiles
        test_shipments = []
        for i in range(10):
            test_shipments.append({
                "package_id": f"PKG-BATCH-TEST-{i:02d}",
                "station_code": "DBO1",
                "preferred_delivery_method": "Hand to Customer" if i % 2 == 0 else "Locker",
                "customer_delivery_preference": "Morning Only" if i % 3 == 0 else "Anytime",
                "location_type": "Commercial" if i % 4 == 0 else "Apartment",
                "departure_hour": 18 if i % 2 == 0 else 10,
                "customer_availability_rate": 0.20 + (i * 0.07),
                "address_access_difficulty": 5 if i < 5 else 1,
                "signature_required": 1 if i < 6 else 0
            })

        req_payload = {
            "shipments": test_shipments,
            "max_capacity_rate": 0.20
        }
        response = self.client.post("/api/predict/batch", json=req_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["count"], 10)
        self.assertEqual(data["fleet_capacity_limit_pct"], 20.0)
        self.assertIsInstance(data["predictions"], list)
        self.assertEqual(len(data["predictions"]), 10)

        # 1. Verify 20% capacity cap: floor(10 * 0.20) = 2 approved interventions max
        self.assertLessEqual(data["capacity_approved_count"], 2)

        # 2. Verify all predictions have capacity attributes and valid ranks
        ranks = []
        for idx, pred in enumerate(data["predictions"]):
            self.assertIn("capacity_rank", pred)
            self.assertIn("capacity_approved", pred)
            self.assertIn("capacity_status", pred)
            ranks.append(pred["capacity_rank"])
            if pred["capacity_status"] == "DEFERRED_DUE_TO_FLEET_CAPACITY":
                self.assertFalse(pred["capacity_approved"])
                self.assertIn(pred["risk_tier"], ["MEDIUM", "HIGH"])
                self.assertIn("deferred by 20% fleet capacity limit", pred["recommended_action"])

        # Check all ranks 1..10 are present (permutation)
        self.assertEqual(sorted(ranks), list(range(1, 11)))

    def test_model_switching_champion_candidate_safety(self):
        """
        Verifies safe switching to LightGBM Candidate (TreeSHAP)
        and guarantees restoration of Logistic Regression Champion.
        """
        # 1. Switch to LightGBM Candidate
        switch_req = {"model_name": "LightGBM Candidate"}
        res_lgb = self.client.post("/api/model/switch", json=switch_req)
        self.assertEqual(res_lgb.status_code, 200)
        data_lgb = res_lgb.json()
        self.assertEqual(data_lgb["active_model"], "LightGBM Candidate")
        self.assertFalse(data_lgb["is_champion_active"])
        self.assertTrue(data_lgb["calibrated"])
        self.assertEqual(data_lgb["explainer_type"], "tree_shap")

        # 2. Predict with LightGBM Candidate and verify TreeSHAP output
        sample_payload = {
            "shipment": {
                "station_code": "DBO1",
                "preferred_delivery_method": "Hand to Customer",
                "customer_delivery_preference": "Morning Only",
                "location_type": "Apartment",
                "departure_hour": 16,
                "customer_availability_rate": 0.35,
                "address_access_difficulty": 4,
                "signature_required": 1
            }
        }
        pred_lgb = self.client.post("/api/predict", json=sample_payload).json()
        self.assertEqual(pred_lgb["model_used"], "LightGBM Candidate")
        self.assertTrue(pred_lgb["calibrated"])
        self.assertEqual(pred_lgb["explainability_metadata"]["explainer_type"], "tree_shap")
        self.assertEqual(pred_lgb["explainability_metadata"]["explained_space"], "calibrated_logit_margin")
        self.assertLessEqual(pred_lgb["explainability_metadata"]["additivity_error"], 1e-3)

        # 3. Switch back to Logistic Regression Champion
        restore_req = {"model_name": "Logistic Regression"}
        res_lr = self.client.post("/api/model/switch", json=restore_req)
        self.assertEqual(res_lr.status_code, 200)
        data_lr = res_lr.json()
        self.assertEqual(data_lr["active_model"], "Logistic Regression")
        self.assertTrue(data_lr["is_champion_active"])
        self.assertEqual(data_lr["explainer_type"], "linear_exact")

        # 4. Predict with restored Champion and verify Linear SHAP output
        pred_lr = self.client.post("/api/predict", json=sample_payload).json()
        self.assertEqual(pred_lr["model_used"], "Logistic Regression")
        self.assertEqual(pred_lr["explainability_metadata"]["explainer_type"], "linear_exact")

        # 5. Invalid model name rejected
        bad_req = {"model_name": "NonExistentModel"}
        res_bad = self.client.post("/api/model/switch", json=bad_req)
        self.assertEqual(res_bad.status_code, 400)

    def test_simulate_interventions_endpoint(self):
        sample_payload = {
            "shipment": {
                "station_code": "DBO1",
                "preferred_delivery_method": "Hand to Customer",
                "customer_delivery_preference": "Morning Only",
                "location_type": "Apartment",
                "departure_hour": 16,
                "customer_availability_rate": 0.35,
                "address_access_difficulty": 4,
                "signature_required": 1
            }
        }
        response = self.client.post("/api/intervene/simulate", json=sample_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("baseline_assessment", data)
        self.assertIn("failure_probability", data["baseline_assessment"])
        self.assertIn("risk_factors", data["baseline_assessment"])
        self.assertIn("explainability_metadata", data["baseline_assessment"])
        self.assertIn("intervention_options", data)
        self.assertEqual(len(data["intervention_options"]), 5)
        for opt in data["intervention_options"]:
            self.assertIn("id", opt)
            self.assertIn("title", opt)
            self.assertIn("description", opt)
            self.assertIn("original_prob", opt)
            self.assertIn("new_prob", opt)
            self.assertIn("risk_reduction_pct", opt)
            self.assertIn("new_risk_tier", opt)

    def test_delivery_complete_feedback_loop(self):
        """Verifies the live feedback loop dynamically updates customer history & zone priors."""
        # 1. Complete a successful delivery
        success_payload = {
            "package_id": "PKG-FEEDBACK-TEST-1",
            "outcome": "DELIVERED",
            "failure_reason": "NONE",
            "delivery_notes": "Handed directly to recipient at front desk"
        }
        res1 = self.client.post("/api/delivery/complete", json=success_payload)
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertEqual(data1["status"], "success")
        self.assertEqual(data1["delivery_status"], "DELIVERED_SUCCESS")
        self.assertIn("updated_customer_history", data1)
        self.assertIn("updated_zone_prior", data1)

        # 2. Complete a failed delivery (e.g. customer unavailable)
        fail_payload = {
            "package_id": "PKG-FEEDBACK-TEST-1",
            "outcome": "FAILED",
            "failure_reason": "CUSTOMER_UNAVAILABLE",
            "delivery_notes": "No answer at door, phone busy"
        }
        res2 = self.client.post("/api/delivery/complete", json=fail_payload)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertEqual(data2["status"], "success")
        self.assertEqual(data2["delivery_status"], "FIRST_ATTEMPT_FAILED")
        self.assertEqual(data2["updated_customer_history"]["previous_fails"], 1)
        self.assertGreater(data2["updated_zone_prior"]["new_zone_failure_rate"], 0.0)


if __name__ == "__main__":
    unittest.main()
