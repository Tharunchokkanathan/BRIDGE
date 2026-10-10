import os
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure src and app are on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from server import app

class TestBridgeAPIServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("active_model", data)
        self.assertIn("database", data)

    def test_dashboard_stats_endpoint(self):
        response = self.client.get("/api/dashboard/stats")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_packages_evaluated", data)
        self.assertIn("baseline_success_rate", data)
        self.assertIn("optimized_success_rate", data)
        self.assertGreater(data["optimized_success_rate"], data["baseline_success_rate"])

    def test_sample_shipments_endpoint(self):
        response = self.client.get("/api/shipments/sample")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(data["count"], 0)
        self.assertIsInstance(data["shipments"], list)

    def test_predict_endpoint(self):
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
        self.assertIn("failure_probability", data)
        self.assertIn("risk_tier", data)
        self.assertIn("recommended_action", data)
        self.assertIsInstance(data["risk_factors"], list)

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
        self.assertIn("intervention_options", data)
        self.assertEqual(len(data["intervention_options"]), 5)

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
