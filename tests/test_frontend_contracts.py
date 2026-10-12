"""
BRIDGE Phase 6 — Frontend API Contract Integration Tests
Verifies that all API endpoints consumed by static/js/app.js return
the exact schemas, field types, and values expected by the user interface.
"""

import os
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure src and app are on import path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from server import app, ENGINE


class TestFrontendContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.sample_shipment = {
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

    def tearDown(self):
        # Mandatory invariant: restore Logistic Regression champion
        ENGINE.set_active_model("Logistic Regression")

    def test_contract_database_status(self):
        """Validates GET /api/database/status contract consumed by loadDatabaseStatus()."""
        res = self.client.get("/api/database/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("is_supabase_connected", data)
        self.assertIsInstance(data["is_supabase_connected"], bool)
        self.assertIn("backend", data)
        self.assertIsInstance(data["backend"], str)
        self.assertIn("shipments_stored", data)
        self.assertIsInstance(data["shipments_stored"], int)
        self.assertIn("interventions_logged", data)
        self.assertIsInstance(data["interventions_logged"], int)

    def test_contract_model_metadata(self):
        """Validates GET /api/model/metadata contract consumed by loadModelMetadata() and renderAuditTab()."""
        res = self.client.get("/api/model/metadata")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("champion_model", data)
        self.assertEqual(data["champion_model"], "Logistic Regression")
        self.assertIn("partitions", data)
        self.assertIn("comparison_results", data)
        self.assertIn("top_features", data)
        self.assertIsInstance(data["top_features"], dict)

        # Check model comparison metrics rendered in audit table
        comp = data["comparison_results"]
        self.assertIn("Logistic Regression", comp)
        self.assertIn("Random Forest", comp)
        for model_name in ["Logistic Regression", "Random Forest"]:
            self.assertIn("test_metrics", comp[model_name])
            metrics = comp[model_name]["test_metrics"]
            self.assertIn("pr_auc", metrics)
            self.assertIn("roc_auc", metrics)
            self.assertIn("brier_score", metrics)

    def test_contract_dashboard_stats(self):
        """Validates GET /api/dashboard/stats contract consumed by loadDashboardStats()."""
        res = self.client.get("/api/dashboard/stats")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        required_stats = [
            "optimized_success_rate",
            "success_rate_improvement_points",
            "baseline_success_rate",
            "failed_delivery_reduction_pct",
            "high_risk_count",
            "estimated_fuel_savings_pct",
            "active_model",
            "capacity_approved_count",
            "capacity_deferred_count"
        ]
        for key in required_stats:
            self.assertIn(key, data, f"Missing dashboard stat key: {key}")

        self.assertGreater(data["optimized_success_rate"], data["baseline_success_rate"])
        self.assertGreater(data["success_rate_improvement_points"], 0)
        self.assertGreater(data["failed_delivery_reduction_pct"], 0)

    def test_contract_shipments_sample(self):
        """Validates GET /api/shipments/sample contract consumed by loadShipments() and renderShipmentsTable()."""
        res = self.client.get("/api/shipments/sample")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("count", data)
        self.assertIn("shipments", data)
        self.assertGreater(data["count"], 0)
        self.assertIsInstance(data["shipments"], list)

        first_shipment = data["shipments"][0]
        # Top-level shipment fields
        for field in [
            "package_id", "station_code", "departure_hour",
            "customer_availability_rate", "prediction"
        ]:
            self.assertIn(field, first_shipment, f"Missing shipment field: {field}")

        # Prediction and explainability contract
        pred = first_shipment["prediction"]
        for pred_field in [
            "risk_tier", "failure_probability", "failure_percentage",
            "capacity_status", "capacity_approved", "risk_factors",
            "explainability_metadata"
        ]:
            self.assertIn(pred_field, pred, f"Missing prediction field: {pred_field}")

        self.assertIn(pred["risk_tier"], ["LOW", "MEDIUM", "HIGH"])
        self.assertIsInstance(pred["failure_probability"], float)
        self.assertTrue(0.0 <= pred["failure_probability"] <= 1.0)

        # Risk factors contract
        factors = pred["risk_factors"]
        self.assertIsInstance(factors, list)
        if factors:
            factor = factors[0]
            self.assertIn("factor", factor)
            self.assertIn("detail", factor)
            self.assertIn("risk_driver_share", factor)
            self.assertTrue("shap_logit" in factor or "attribution_score" in factor)

    def test_contract_model_switch(self):
        """Validates POST /api/model/switch contract consumed by setupEventListeners()."""
        # Switch to LightGBM Candidate
        res = self.client.post("/api/model/switch", json={"model_name": "LightGBM Candidate"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["active_model"], "LightGBM Candidate")
        self.assertEqual(data["champion_model"], "Logistic Regression")
        self.assertFalse(data["is_champion_active"])
        self.assertTrue(data["calibrated"])
        self.assertEqual(data["explainer_type"], "tree_shap")

        # Switch back to Logistic Regression
        res_back = self.client.post("/api/model/switch", json={"model_name": "Logistic Regression"})
        self.assertEqual(res_back.status_code, 200)
        data_back = res_back.json()
        self.assertEqual(data_back["active_model"], "Logistic Regression")
        self.assertTrue(data_back["is_champion_active"])
        self.assertEqual(data_back["explainer_type"], "linear_exact")

    def test_contract_intervene_simulate(self):
        """Validates POST /api/intervene/simulate contract consumed by triggerIntervention()."""
        payload = {"shipment": self.sample_shipment}
        res = self.client.post("/api/intervene/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("baseline_assessment", data)
        self.assertIn("intervention_options", data)
        options = data["intervention_options"]
        self.assertIsInstance(options, list)
        self.assertGreater(len(options), 0)

        option_keys = [
            "id", "title", "description", "original_prob", "new_prob",
            "risk_reduction_pct", "new_risk_tier", "recommended", "utility_score"
        ]
        for opt in options:
            for k in option_keys:
                self.assertIn(k, opt, f"Option missing contract key: {k}")
            self.assertLessEqual(opt["new_prob"], opt["original_prob"])

        # Validate rule-based station hold heuristic is present
        hold_opt = next((o for o in options if o["id"] == "hold_pickup"), None)
        self.assertIsNotNone(hold_opt, "hold_pickup option must be present in simulation")
        self.assertEqual(hold_opt["new_prob"], 0.015)

    def test_contract_intervene_apply(self):
        """Validates POST /api/intervene/apply contract consumed by applyCustomerPreference()."""
        # Fetch a sample package ID
        samples = self.client.get("/api/shipments/sample").json()["shipments"]
        target_pkg = samples[0]["package_id"]

        payload = {
            "package_id": target_pkg,
            "intervention_id": "access_point"
        }
        res = self.client.post("/api/intervene/apply", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["status"], "success")
        self.assertIn("message", data)
        self.assertIn("updated_shipment", data)
        updated = data["updated_shipment"]
        self.assertIn("applied_intervention", updated)
        self.assertIn("final_failure_probability", updated)
        self.assertIn("final_risk_tier", updated)

    def test_contract_messaging_preview(self):
        """Validates POST /api/messaging/preview contract consumed by loadMessagingPreview()."""
        for channel in ["SMS", "WhatsApp", "Email"]:
            payload = {
                "package_id": "PKG-CONTRACT-TEST",
                "intervention_id": "access_point",
                "channel": channel,
                "recipient_name": "Test Customer"
            }
            res = self.client.post("/api/messaging/preview", json=payload)
            self.assertEqual(res.status_code, 200)
            data = res.json()

            self.assertEqual(data["package_id"], "PKG-CONTRACT-TEST")
            self.assertEqual(data["intervention_id"], "access_point")
            self.assertIn("channel", data)
            self.assertIn("content", data)
            self.assertIn("char_count", data)
            self.assertGreater(data["char_count"], 0)

            if channel == "Email":
                self.assertIn("subject", data)
                self.assertIsNotNone(data["subject"])

    def test_contract_route_optimize(self):
        """Validates POST /api/route/optimize contract consumed by loadRouteOptimization() & renderRouteOptimization()."""
        payload = {
            "route_id": "RouteID_00143bdd-0a6b-49ec-bb35-36593d303e77",
            "apply_interventions": True,
            "return_to_depot": True
        }
        res = self.client.post("/api/route/optimize", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        required_keys = [
            "original_distance_km",
            "optimized_distance_km",
            "distance_savings_km",
            "distance_savings_pct",
            "stops",
            "stops_count",
            "estimated_duration_minutes",
            "interventions_applied",
            "savings_target_met"
        ]
        for key in required_keys:
            self.assertIn(key, data, f"Missing route optimize key: {key}")

        self.assertGreater(data["distance_savings_pct"], 12.0)
        self.assertTrue(data["savings_target_met"])
        self.assertTrue(data["interventions_applied"])
        self.assertIsInstance(data["stops"], list)
        self.assertGreater(len(data["stops"]), 0)

        first_stop = data["stops"][0]
        self.assertIn("stop_id", first_stop)
        self.assertIn("latitude", first_stop)
        self.assertIn("longitude", first_stop)


if __name__ == "__main__":
    unittest.main()
