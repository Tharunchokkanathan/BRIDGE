"""
Tests for Phase 5 Smart Interventions and Multi-Channel Messaging Engine
"""

import os
import sys
import unittest
import pandas as pd

# Add src and app to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "app"))

from risk_engine import RiskEngine
from messaging import MessageDispatcher, TEMPLATES


class TestSmartInterventions(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        model_dir = os.path.join(os.path.dirname(__file__), "..", "models")
        cls.engine = RiskEngine(model_dir=model_dir)
        cls.dispatcher = MessageDispatcher()

        cls.high_risk_sample = {
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

        cls.low_risk_sample = {
            "station_code": "DBO1",
            "preferred_delivery_method": "Front Door",
            "customer_delivery_preference": "Anytime",
            "location_type": "Residential",
            "latitude": 42.36,
            "longitude": -71.05,
            "planned_service_time_seconds": 60,
            "departure_hour": 10,
            "customer_availability_rate": 0.98,
            "address_access_difficulty": 1,
            "signature_required": 0
        }

    def test_contract_preservation(self):
        """Verify all 8 baseline keys and Phase 5 explainability fields are present."""
        sim = self.engine.simulate_interventions(self.high_risk_sample)
        self.assertIn("baseline_assessment", sim)
        self.assertIn("intervention_options", sim)
        options = sim["intervention_options"]
        self.assertEqual(len(options), 5)

        required_keys = [
            "id", "title", "description", "original_prob",
            "new_prob", "risk_reduction_pct", "new_risk_tier", "recommended"
        ]
        phase5_keys = ["utility_score", "estimated_cost_tier", "rationale", "triggering_risk_drivers"]

        for opt in options:
            for k in required_keys:
                self.assertIn(k, opt, f"Missing required baseline key: {k}")
            for k in phase5_keys:
                self.assertIn(k, opt, f"Missing Phase 5 explainability key: {k}")

    def test_monotonic_risk_reduction(self):
        """Verifies that no simulated intervention increases failure probability."""
        sim = self.engine.simulate_interventions(self.high_risk_sample)
        base_p = sim["baseline_assessment"]["failure_probability"]

        for opt in sim["intervention_options"]:
            self.assertLessEqual(
                opt["new_prob"],
                base_p,
                f"Intervention {opt['id']} resulted in higher risk than baseline"
            )
            self.assertGreaterEqual(opt["risk_reduction_pct"], 0.0)

    def test_low_risk_non_intervention_policy(self):
        """Verifies low-risk packages (base_p < tau_low) receive recommended=False across all options."""
        sim = self.engine.simulate_interventions(self.low_risk_sample)
        base_p = sim["baseline_assessment"]["failure_probability"]
        self.assertLess(base_p, self.engine.threshold_low, "Low sample must be strictly below tau_low")

        for opt in sim["intervention_options"]:
            self.assertFalse(
                opt["recommended"],
                f"Intervention {opt['id']} should NOT be recommended for a low-risk delivery"
            )

    def test_high_risk_intervention_recommended(self):
        """Verifies high-risk packages (base_p >= tau_low) have at least one viable recommended intervention."""
        sim = self.engine.simulate_interventions(self.high_risk_sample)
        base_p = sim["baseline_assessment"]["failure_probability"]
        self.assertGreaterEqual(base_p, self.engine.threshold_low)

        recommended_count = sum(1 for opt in sim["intervention_options"] if opt["recommended"] is True)
        self.assertGreaterEqual(recommended_count, 1, "At least one intervention must be recommended for high risk")

    def test_shap_root_cause_alignment(self):
        """Verifies that interventions aligned with root causes receive a utility bonus."""
        sim = self.engine.simulate_interventions(self.high_risk_sample)
        options = {opt["id"]: opt for opt in sim["intervention_options"]}

        # High risk sample has mismatch and high access difficulty
        # Locker option should have high utility score
        self.assertGreater(options["access_point"]["utility_score"], 0.3)
        self.assertTrue(options["access_point"]["recommended"])

    def test_messaging_dispatcher_all_channels_and_interventions(self):
        """Verifies MessageDispatcher generates previews for all 5 interventions across SMS, WhatsApp, Email."""
        channels = ["SMS", "WHATSAPP", "EMAIL"]
        intervention_ids = list(TEMPLATES.keys())

        self.assertEqual(len(intervention_ids), 5)

        for iid in intervention_ids:
            for ch in channels:
                preview = self.dispatcher.preview_message(
                    package_id="PKG-TEST-001",
                    intervention_id=iid,
                    channel=ch,
                    recipient_name="Alex Rider",
                    eta_window="10:00 - 12:00"
                )
                self.assertEqual(preview["package_id"], "PKG-TEST-001")
                self.assertEqual(preview["intervention_id"], iid)
                self.assertEqual(preview["channel"], ch)
                self.assertIn("PKG-TEST-001", preview["content"])
                self.assertIn("https://bridge.delivery/track", preview["cta_url"])
                self.assertGreater(preview["char_count"], 20)

                if ch == "EMAIL":
                    self.assertIsNotNone(preview["subject"])
                    self.assertIn("PKG-TEST-001", preview["subject"])

    def test_messaging_dispatcher_invalid_inputs(self):
        """Verifies ValueError for unsupported channel or invalid intervention type."""
        with self.assertRaises(ValueError):
            self.dispatcher.preview_message("PKG-01", "access_point", channel="CARRIER_PIGEON")

        with self.assertRaises(ValueError):
            self.dispatcher.preview_message("PKG-01", "invalid_intervention_id", channel="SMS")


if __name__ == "__main__":
    unittest.main()
