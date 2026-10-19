"""
BRIDGE Phase 8 — Comprehensive SaaS B2B API & Dynamic Manifest Engine Test Suite
Tests:
- Valid CSV upload with 20% fleet capacity allocation and Linear SHAP attributions.
- Dry-run validation mode (?dry_run=true) ensuring zero state mutation.
- Target leakage quarantine verification.
- Missing coordinate rejection with structured 422 line-item detail.
- Multi-route manifest capacity partitioning.
- Template and export streaming endpoints.
- Reset to benchmark validation.
- X-API-Key authentication enforcement.
"""

import os
import sys
import io
import csv
import json
import unittest
import pandas as pd
from fastapi.testclient import TestClient

# Ensure src and app are on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from server import app, ENGINE, MANIFEST_STATE


class TestSaaSManifestAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        # Guarantee clean baseline benchmark state and champion model
        MANIFEST_STATE.reset_to_benchmark()
        ENGINE.set_active_model("Logistic Regression")
        if "BRIDGE_API_KEY" in os.environ:
            del os.environ["BRIDGE_API_KEY"]

    def tearDown(self):
        # Guaranteed reset to canonical benchmark after every test
        MANIFEST_STATE.reset_to_benchmark()
        ENGINE.set_active_model("Logistic Regression")
        if "BRIDGE_API_KEY" in os.environ:
            del os.environ["BRIDGE_API_KEY"]

    @classmethod
    def tearDownClass(cls):
        MANIFEST_STATE.reset_to_benchmark()
        ENGINE.set_active_model("Logistic Regression")
        if "BRIDGE_API_KEY" in os.environ:
            del os.environ["BRIDGE_API_KEY"]

    def test_valid_csv_upload_and_scoring(self):
        """
        Validates CSV upload with 20% fleet capacity allocation,
        calibrated probabilities, and Linear SHAP explainability attributions.
        """
        rows = []
        for i in range(10):
            rows.append({
                "route_id": "Route_Test_Alpha",
                "stop_id": f"Stop_{i+1:02d}",
                "package_id": f"PKG_TEST_{i+1:03d}",
                "station_code": "DBO1",
                "preferred_delivery_method": "Hand to Customer",
                "customer_delivery_preference": "Morning Only" if i % 2 == 0 else "Anytime",
                "location_type": "Apartment" if i % 2 == 0 else "Residential",
                "latitude": 34.0500 + (i * 0.005),
                "longitude": -118.2500 - (i * 0.005),
                "planned_service_time_seconds": 120.0,
                "departure_hour": 16 if i % 2 == 0 else 10,
                "customer_availability_rate": 0.25 if i < 3 else 0.85,
                "address_access_difficulty": 4 if i < 3 else 2,
                "signature_required": 1 if i < 4 else 0
            })

        df = pd.DataFrame(rows)
        csv_bytes = df.to_csv(index=False).encode("utf-8")

        response = self.client.post(
            "/api/manifest/upload",
            files={"file": ("test_dispatch.csv", csv_bytes, "text/csv")}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["status"], "success")
        self.assertEqual(data["total_packages"], 10)
        self.assertEqual(data["dry_run"], False)
        self.assertIn("Route_Test_Alpha", data["routes_detected"])

        # Capacity allocation check: exactly 20% of 10 = 2 approved packages
        summary = data["data_quality_summary"]
        self.assertEqual(summary["total_rows_received"], 10)
        self.assertEqual(summary["valid_rows"], 10)
        self.assertEqual(summary["fleet_capacity_approved_count"], 2)

        shipments = data["shipments"]
        self.assertEqual(len(shipments), 10)

        # Verify explainability metadata and Linear SHAP attribution contract
        first_pkg = shipments[0]
        self.assertIn("prediction", first_pkg)
        pred = first_pkg["prediction"]
        self.assertIn("failure_probability", pred)
        self.assertIn("risk_tier", pred)
        self.assertIn("capacity_approved", pred)
        self.assertIn("capacity_status", pred)
        self.assertIn("risk_factors", pred)
        self.assertIn("explainability_metadata", pred)
        self.assertEqual(pred["explainability_metadata"]["explainer_type"], "linear_exact")

        # Confirm active shipments in server were updated
        sample_res = self.client.get("/api/shipments/sample")
        self.assertEqual(sample_res.status_code, 200)
        self.assertEqual(sample_res.json()["count"], 10)

    def test_dry_run_mode_zero_state_mutation(self):
        """
        Validates dry-run mode (?dry_run=true):
        Returns full schema validation and scored predictions without mutating in-memory state.
        """
        initial_sample = self.client.get("/api/shipments/sample").json()
        initial_count = initial_sample["count"]
        self.assertEqual(initial_count, 60)  # Canonical benchmark

        rows = [
            {
                "package_id": f"DRY_PKG_{i}",
                "latitude": 34.05,
                "longitude": -118.25,
                "customer_availability_rate": 0.50
            }
            for i in range(5)
        ]
        df = pd.DataFrame(rows)
        csv_bytes = df.to_csv(index=False).encode("utf-8")

        response = self.client.post(
            "/api/manifest/upload?dry_run=true",
            files={"file": ("dry_run_manifest.csv", csv_bytes, "text/csv")}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertTrue(data["dry_run"])
        self.assertEqual(data["total_packages"], 5)
        self.assertEqual(len(data["shipments"]), 5)

        # Verify state in server remains completely unchanged
        post_dry_sample = self.client.get("/api/shipments/sample").json()
        self.assertEqual(post_dry_sample["count"], initial_count)
        self.assertEqual(post_dry_sample["shipments"][0]["package_id"], initial_sample["shipments"][0]["package_id"])

    def test_target_leakage_quarantine(self):
        """
        Validates that any target outcome columns (first_attempt_failed, scan_status)
        are quarantined, logged in data_quality_summary, and stripped from feature evaluation.
        """
        rows = [
            {
                "package_id": f"LEAK_PKG_{i}",
                "latitude": 34.05,
                "longitude": -118.25,
                "first_attempt_failed": 1,
                "scan_status": "FAILED",
                "delivery_outcome": "RETURN_TO_STATION",
                "customer_availability_rate": 0.65
            }
            for i in range(4)
        ]
        df = pd.DataFrame(rows)
        csv_bytes = df.to_csv(index=False).encode("utf-8")

        response = self.client.post(
            "/api/manifest/upload",
            files={"file": ("leaky_manifest.csv", csv_bytes, "text/csv")}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()

        summary = data["data_quality_summary"]
        self.assertIn("quarantined_leakage_columns", summary)
        quarantined = summary["quarantined_leakage_columns"]
        self.assertIn("first_attempt_failed", quarantined)
        self.assertIn("scan_status", quarantined)
        self.assertGreaterEqual(summary["quarantined_count"], 2)

        # Verify leakage columns are completely absent from evaluated shipment dictionaries
        for item in data["shipments"]:
            self.assertNotIn("first_attempt_failed", item)
            self.assertNotIn("scan_status", item)
            self.assertNotIn("delivery_outcome", item)

    def test_missing_coordinate_rejection_structured_422(self):
        """
        Validates that missing or unparseable coordinates trigger an immediate 422
        response with line-item detail indicating offending row numbers and missing fields.
        """
        csv_content = (
            "package_id,latitude,longitude,customer_availability_rate\n"
            "PKG_VALID_1,34.05,-118.25,0.70\n"
            "PKG_INVALID_2,, -118.25,0.70\n"  # missing latitude
            "PKG_INVALID_3,34.05,not_a_number,0.70\n"  # invalid longitude
            "PKG_INVALID_4,,,0.70\n"  # missing both
        )

        response = self.client.post(
            "/api/manifest/upload",
            files={"file": ("invalid_coords.csv", csv_content.encode("utf-8"), "text/csv")}
        )
        self.assertEqual(response.status_code, 422)
        err = response.json()["detail"]

        self.assertEqual(err["error"], "MissingCoordinateError")
        self.assertIn("invalid_rows", err)
        self.assertEqual(err["total_invalid_rows"], 3)

        invalid_rows = err["invalid_rows"]
        # Row 2: row_index 2, missing latitude
        self.assertEqual(invalid_rows[0]["row_index"], 2)
        self.assertIn("latitude", invalid_rows[0]["missing_fields"])

        # Row 3: row_index 3, missing longitude
        self.assertEqual(invalid_rows[1]["row_index"], 3)
        self.assertIn("longitude", invalid_rows[1]["missing_fields"])

        # Row 4: row_index 4, missing both
        self.assertEqual(invalid_rows[2]["row_index"], 4)
        self.assertIn("latitude", invalid_rows[2]["missing_fields"])
        self.assertIn("longitude", invalid_rows[2]["missing_fields"])

    def test_multi_route_capacity_partitioning(self):
        """
        Multi-Route Awareness Test:
        Ensures that when an uploaded CSV contains multiple distinct routes,
        the 20% fleet capacity ceiling is partitioned per route group so that
        high-risk packages in Route A do NOT starve Route B of its capacity.
        """
        rows = []
        # Route Alpha: 10 packages with severe failure risks
        for i in range(10):
            rows.append({
                "route_id": "Route_Alpha_HighRisk",
                "stop_id": f"Stop_A_{i+1}",
                "package_id": f"PKG_A_{i+1:02d}",
                "latitude": 34.05,
                "longitude": -118.25,
                "customer_availability_rate": 0.15,
                "signature_required": 1,
                "address_access_difficulty": 5,
                "departure_hour": 16,
                "customer_delivery_preference": "Morning Only"
            })

        # Route Beta: 10 packages with moderate failure risks
        for i in range(10):
            rows.append({
                "route_id": "Route_Beta_ModerateRisk",
                "stop_id": f"Stop_B_{i+1}",
                "package_id": f"PKG_B_{i+1:02d}",
                "latitude": 34.08,
                "longitude": -118.28,
                "customer_availability_rate": 0.45,
                "signature_required": 1 if i < 3 else 0,
                "address_access_difficulty": 3,
                "departure_hour": 11,
                "customer_delivery_preference": "Anytime"
            })

        df = pd.DataFrame(rows)
        csv_bytes = df.to_csv(index=False).encode("utf-8")

        response = self.client.post(
            "/api/manifest/upload",
            files={"file": ("multi_route.csv", csv_bytes, "text/csv")}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["total_packages"], 20)
        self.assertEqual(len(data["routes_detected"]), 2)
        self.assertIn("Route_Alpha_HighRisk", data["routes_detected"])
        self.assertIn("Route_Beta_ModerateRisk", data["routes_detected"])

        shipments = data["shipments"]
        alpha_pkgs = [s for s in shipments if s["route_id"] == "Route_Alpha_HighRisk"]
        beta_pkgs = [s for s in shipments if s["route_id"] == "Route_Beta_ModerateRisk"]

        self.assertEqual(len(alpha_pkgs), 10)
        self.assertEqual(len(beta_pkgs), 10)

        alpha_approved = sum(1 for s in alpha_pkgs if s["prediction"]["capacity_approved"] is True)
        beta_approved = sum(1 for s in beta_pkgs if s["prediction"]["capacity_approved"] is True)

        # Each route of 10 stops receives strictly floor(10 * 0.20) = 2 approved interventions
        self.assertEqual(alpha_approved, 2)
        self.assertEqual(beta_approved, 2)

    def test_template_and_export_streaming(self):
        """
        Validates:
        1. GET /api/manifest/template returns downloadable clean CSV with no target leakage.
        2. GET /api/manifest/export streams active scored manifest with predictions, capacity, and Top-3 SHAP drivers.
        """
        # 1. Template verification
        tpl_res = self.client.get("/api/manifest/template")
        self.assertEqual(tpl_res.status_code, 200)
        self.assertTrue(tpl_res.headers["content-type"].startswith("text/csv"))
        self.assertIn("bridge_manifest_template.csv", tpl_res.headers.get("content-disposition", ""))

        reader = csv.DictReader(io.StringIO(tpl_res.text))
        tpl_rows = list(reader)
        self.assertGreaterEqual(len(tpl_rows), 2)
        headers = reader.fieldnames or []
        self.assertIn("package_id", headers)
        self.assertIn("latitude", headers)
        self.assertIn("longitude", headers)
        self.assertNotIn("scan_status", headers)
        self.assertNotIn("first_attempt_failed", headers)

        # 2. Export verification
        exp_res = self.client.get("/api/manifest/export")
        self.assertEqual(exp_res.status_code, 200)
        self.assertTrue(exp_res.headers["content-type"].startswith("text/csv"))
        self.assertIn("bridge_manifest_export", exp_res.headers.get("content-disposition", ""))

        exp_reader = csv.DictReader(io.StringIO(exp_res.text))
        exp_rows = list(exp_reader)
        self.assertEqual(len(exp_rows), 60)  # Active benchmark
        exp_headers = exp_reader.fieldnames or []
        self.assertIn("failure_probability", exp_headers)
        self.assertIn("risk_tier", exp_headers)
        self.assertIn("capacity_approved", exp_headers)
        self.assertIn("capacity_status", exp_headers)
        self.assertIn("shap_top1_factor", exp_headers)
        self.assertIn("shap_top1_score", exp_headers)
        self.assertIn("top_risk_drivers_summary", exp_headers)

    def test_reset_to_benchmark(self):
        """
        Validates POST /api/manifest/reset and POST /api/manifest/clear:
        Restores in-memory manifest state back to canonical 30-stop benchmark.
        """
        # Upload small temporary manifest (5 packages)
        rows = [{"package_id": f"TEMP_{i}", "latitude": 34.0, "longitude": -118.0} for i in range(5)]
        df = pd.DataFrame(rows)
        upload_res = self.client.post(
            "/api/manifest/upload",
            files={"file": ("temp.csv", df.to_csv(index=False).encode("utf-8"), "text/csv")}
        )
        self.assertEqual(upload_res.status_code, 200)
        self.assertEqual(self.client.get("/api/shipments/sample").json()["count"], 5)

        # Call Reset
        reset_res = self.client.post("/api/manifest/reset")
        self.assertEqual(reset_res.status_code, 200)
        data = reset_res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["total_packages"], 60)

        # Verify sample endpoint and dashboard stats are restored
        sample_res = self.client.get("/api/shipments/sample")
        self.assertEqual(sample_res.json()["count"], 60)

        stats_res = self.client.get("/api/dashboard/stats")
        self.assertEqual(stats_res.json()["total_packages_evaluated"], 60)

    def test_x_api_key_authentication_enforcement(self):
        """
        Validates X-API-Key security dependency:
        - When BRIDGE_API_KEY is not configured: open access.
        - When BRIDGE_API_KEY is configured:
          * Missing key -> 401 Unauthorized.
          * Invalid key -> 401 Unauthorized.
          * demo-sandbox-key -> 200 OK.
          * Configured key -> 200 OK.
          * Same-origin browser request -> 200 OK.
        """
        # 1. Unconfigured mode: Open access
        self.assertNotIn("BRIDGE_API_KEY", os.environ)
        res_open = self.client.get("/api/manifest/export")
        self.assertEqual(res_open.status_code, 200)

        # 2. Configured mode
        os.environ["BRIDGE_API_KEY"] = "b2b_secret_key_888"
        try:
            # Missing key
            res_no_key = self.client.get("/api/manifest/export")
            self.assertEqual(res_no_key.status_code, 401)

            # Invalid key
            res_bad_key = self.client.get("/api/manifest/export", headers={"X-API-Key": "wrong_key"})
            self.assertEqual(res_bad_key.status_code, 401)

            # Public demo key
            res_demo_key = self.client.get("/api/manifest/export", headers={"X-API-Key": "demo-sandbox-key"})
            self.assertEqual(res_demo_key.status_code, 200)

            # Configured secret key
            res_valid_key = self.client.get("/api/manifest/export", headers={"X-API-Key": "b2b_secret_key_888"})
            self.assertEqual(res_valid_key.status_code, 200)

            # Same-origin browser request
            res_same_origin = self.client.get("/api/manifest/export", headers={"Sec-Fetch-Site": "same-origin"})
            self.assertEqual(res_same_origin.status_code, 200)

        finally:
            del os.environ["BRIDGE_API_KEY"]

        # Confirm restoration of open access
        res_restored = self.client.get("/api/manifest/export")
        self.assertEqual(res_restored.status_code, 200)
