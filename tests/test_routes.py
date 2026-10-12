"""
Tests for Phase 5 Route Optimization Engine (Deterministic Nearest-Neighbor + 2-Opt)
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd

# Add src and app to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "app"))

from route_optimizer import (
    RouteOptimizer,
    haversine_distance,
    compute_distance_matrix,
    solve_tsp_nearest_neighbor,
    solve_tsp_2opt,
    calculate_tour_distance,
    DEFAULT_CIRCUITY_FACTOR
)


class TestRouteOptimizer(unittest.TestCase):

    def setUp(self):
        self.optimizer = RouteOptimizer()
        self.sample_csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "sample_test_deliveries.csv")

    def test_haversine_distance_calculation(self):
        """Verifies Haversine distance with and without circuity factor."""
        # Los Angeles (City Hall: 34.0537, -118.2427) to Santa Monica Pier (34.0099, -118.4965)
        # Great-circle straight-line distance is approx 24.1 km
        d_straight = haversine_distance(34.0537, -118.2427, 34.0099, -118.4965, circuity=1.0)
        self.assertAlmostEqual(d_straight, 24.1, delta=0.5)

        # Scaled by urban circuity factor (1.35)
        d_circuity = haversine_distance(34.0537, -118.2427, 34.0099, -118.4965, circuity=1.35)
        self.assertAlmostEqual(d_circuity, d_straight * 1.35, places=4)

    def test_distance_matrix_properties(self):
        """Verifies distance matrix is symmetric with zero diagonal."""
        coords = np.array([
            [34.099611, -118.283062],
            [34.101587, -118.291125],
            [34.089727, -118.285530],
            [34.096132, -118.292869]
        ])
        dist_mat = compute_distance_matrix(coords, circuity=1.35)

        self.assertEqual(dist_mat.shape, (4, 4))
        # Zero diagonal
        for i in range(4):
            self.assertAlmostEqual(dist_mat[i, i], 0.0, places=6)
        # Symmetry
        for i in range(4):
            for j in range(4):
                self.assertAlmostEqual(dist_mat[i, j], dist_mat[j, i], places=6)

    def test_tsp_permutation_and_monotonicity(self):
        """Verifies 2-Opt outputs a valid permutation and strictly improves or preserves distance."""
        np.random.seed(42)
        # Synthetic 10-stop delivery cluster
        coords = 34.0 + np.random.uniform(0.01, 0.09, (10, 2))
        coords[:, 1] = -118.0 - coords[:, 1]

        dist_mat = compute_distance_matrix(coords, circuity=1.35)
        nn_tour = solve_tsp_nearest_neighbor(dist_mat, start_idx=0)
        opt_tour = solve_tsp_2opt(dist_mat, initial_tour=nn_tour, return_to_depot=False)

        # Must be valid permutation of all 10 nodes
        self.assertEqual(sorted(opt_tour), list(range(10)))

        d_nn = calculate_tour_distance(nn_tour, dist_mat, return_to_depot=False)
        d_opt = calculate_tour_distance(opt_tour, dist_mat, return_to_depot=False)

        # 2-Opt must not increase distance
        self.assertLessEqual(d_opt, d_nn + 1e-6)

    def test_optimizer_on_sample_manifest(self):
        """Verifies optimization on the 30-stop Los Angeles test route meets >=12% savings target."""
        if not os.path.exists(self.sample_csv_path):
            self.skipTest("sample_test_deliveries.csv not found")

        df = pd.read_csv(self.sample_csv_path)
        records = df.to_dict("records")

        result = self.optimizer.optimize_route_from_shipments(records, apply_interventions=False)

        self.assertEqual(result["stops_count"], 30)
        self.assertGreater(result["original_distance_km"], result["optimized_distance_km"])
        self.assertGreater(result["distance_savings_pct"], 12.0, "Must exceed the 12.0% route reduction benchmark")
        self.assertTrue(result["savings_target_met"])
        self.assertEqual(len(result["original_stop_sequence"]), 30)
        self.assertEqual(len(result["optimized_stop_sequence"]), 30)
        self.assertEqual(sorted(result["optimized_stop_sequence"]), sorted(result["original_stop_sequence"]))

    def test_optimizer_determinism(self):
        """Verifies that running optimization multiple times produces 100% identical sequences."""
        if not os.path.exists(self.sample_csv_path):
            self.skipTest("sample_test_deliveries.csv not found")

        df = pd.read_csv(self.sample_csv_path)
        records = df.to_dict("records")

        res1 = self.optimizer.optimize_route_from_shipments(records)
        res2 = self.optimizer.optimize_route_from_shipments(records)

        self.assertEqual(res1["optimized_stop_sequence"], res2["optimized_stop_sequence"])
        self.assertEqual(res1["optimized_distance_km"], res2["optimized_distance_km"])

    def test_intervention_consolidation(self):
        """Verifies smart locker redirection consolidates stops and skips station-held packages."""
        if not os.path.exists(self.sample_csv_path):
            self.skipTest("sample_test_deliveries.csv not found")

        df = pd.read_csv(self.sample_csv_path)
        records = df.to_dict("records")

        # Simulate interventions on select shipments
        for i in range(4):
            records[i]["applied_intervention"] = {"id": "access_point"}
        records[10]["applied_intervention"] = {"id": "hold_pickup"}

        res_int = self.optimizer.optimize_route_from_shipments(records, apply_interventions=True)
        self.assertTrue(res_int["interventions_applied"])
        self.assertIn("HUB_LOCKER_CONSOLIDATED", res_int["optimized_stop_sequence"])
        self.assertTrue(res_int["savings_target_met"])


if __name__ == "__main__":
    unittest.main()
