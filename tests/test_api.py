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

    def test_simulate_interventions_endpoint(self):
        sample_payload = {
            "shipment": {
                "station_code": "DBO1",
                "preferred_delivery_method": "Hand to Customer",
                "customer_delivery_preference": "Morning Only",
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

if __name__ == "__main__":
    unittest.main()
