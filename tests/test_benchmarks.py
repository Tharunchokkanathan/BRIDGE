"""
BRIDGE Phase 7 — Comprehensive Performance & Latency Benchmark Suite
Measures component-level, attribution-level, route-level, and end-to-end
execution latencies under controlled warm-up conditions.

Enforces clear separation between functional regression bounds and
empirical benchmarking telemetry to prevent timing jitter flakes.
"""

import os
import sys
import time
import tracemalloc
import unittest
import numpy as np
import pandas as pd

# Add src and app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from risk_engine import RiskEngine
from route_optimizer import RouteOptimizer


class TestPerformanceBenchmarks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model_dir = os.path.join(os.path.dirname(__file__), "..", "models")
        cls.engine = RiskEngine(model_dir=cls.model_dir)
        cls.optimizer = RouteOptimizer()

        sample_csv = os.path.join(os.path.dirname(__file__), "..", "data", "sample_test_deliveries.csv")
        cls.df = pd.read_csv(sample_csv)
        cls.records = cls.df.to_dict("records")
        cls.single_sample = cls.records[0]

        # Precompute transformed matrix for isolated scoring benchmarks
        cls.X_proc = cls.engine.preprocessor.transform(cls.df.iloc[[0]])

    def tearDown(self):
        # Mandatory invariant: guarantee Champion restoration after every test
        self.engine.set_active_model("Logistic Regression")

    def test_isolated_model_scoring_latency(self):
        """
        Measures pure model forward-pass scoring latency (predict_proba on X_proc).
        Target: P95 <= 5.0 ms for both Champion LR and Candidate LightGBM.
        """
        # 1. Champion Logistic Regression
        self.engine.set_active_model("Logistic Regression")
        for _ in range(50):
            self.engine.model.predict_proba(self.X_proc)

        times_lr = []
        for _ in range(300):
            t0 = time.perf_counter()
            self.engine.model.predict_proba(self.X_proc)
            times_lr.append((time.perf_counter() - t0) * 1000)

        p95_lr = float(np.percentile(times_lr, 95))
        p50_lr = float(np.percentile(times_lr, 50))
        self.assertLessEqual(p95_lr, 5.0, f"LR forward scoring P95 exceeded 5.0ms: {p95_lr:.3f}ms")

        # 2. Candidate LightGBM
        self.engine.set_active_model("LightGBM Candidate")
        for _ in range(50):
            self.engine.model.predict_proba(self.X_proc)

        times_lgb = []
        for _ in range(300):
            t0 = time.perf_counter()
            self.engine.model.predict_proba(self.X_proc)
            times_lgb.append((time.perf_counter() - t0) * 1000)

        p95_lgb = float(np.percentile(times_lgb, 95))
        p50_lgb = float(np.percentile(times_lgb, 50))
        self.assertLessEqual(p95_lgb, 5.0, f"LGB forward scoring P95 exceeded 5.0ms: {p95_lgb:.3f}ms")

    def test_linear_shap_attribution_latency(self):
        """
        Measures closed-form Linear SHAP calculation latency on calibrated margin.
        Target: P95 <= 1.0 ms.
        """
        self.engine.set_active_model("Logistic Regression")
        explainer = self.engine.active_explainer

        # Warmup
        for _ in range(50):
            explainer.explain(self.X_proc)

        times = []
        for _ in range(400):
            t0 = time.perf_counter()
            explainer.explain(self.X_proc)
            times.append((time.perf_counter() - t0) * 1000)

        p95 = float(np.percentile(times, 95))
        p50 = float(np.percentile(times, 50))
        self.assertLessEqual(p95, 1.0, f"Linear SHAP P95 exceeded 1.0ms target: {p95:.3f}ms")

    def test_tree_shap_attribution_latency(self):
        """
        Measures TreeSHAP explanation latency for Candidate LightGBM booster.
        Target: P95 <= 10.0 ms.
        """
        self.engine.set_active_model("LightGBM Candidate")
        explainer = self.engine.active_explainer

        # Warmup
        for _ in range(30):
            explainer.explain(self.X_proc)

        times = []
        for _ in range(150):
            t0 = time.perf_counter()
            explainer.explain(self.X_proc)
            times.append((time.perf_counter() - t0) * 1000)

        p95 = float(np.percentile(times, 95))
        p50 = float(np.percentile(times, 50))
        self.assertLessEqual(p95, 10.0, f"TreeSHAP P95 exceeded 10.0ms target: {p95:.3f}ms")

    def test_route_optimizer_2opt_latency(self):
        """
        Measures deterministic Nearest-Neighbor + 2-Opt execution latency on 30 stops.
        Target: P95 <= 15.0 ms.
        """
        stops_30 = self.records[:30]

        # Warmup
        for _ in range(30):
            self.optimizer.optimize_route_from_shipments(stops_30)

        times = []
        for _ in range(200):
            t0 = time.perf_counter()
            self.optimizer.optimize_route_from_shipments(stops_30)
            times.append((time.perf_counter() - t0) * 1000)

        p95 = float(np.percentile(times, 95))
        p50 = float(np.percentile(times, 50))
        self.assertLessEqual(p95, 15.0, f"2-Opt TSP P95 exceeded 15.0ms target: {p95:.3f}ms")

    def test_batch_fleet_scoring_latency(self):
        """
        Measures 30-package batch inference under 20% fleet capacity allocation.
        Target: functional completion without memory leaks or algorithmic regressions.
        """
        batch_30 = self.records[:30]

        # Warmup
        for _ in range(20):
            self.engine.apply_capacity_constrained_policy(batch_30)

        times = []
        for _ in range(50):
            t0 = time.perf_counter()
            self.engine.apply_capacity_constrained_policy(batch_30)
            times.append((time.perf_counter() - t0) * 1000)

        p95 = float(np.percentile(times, 95))
        p50 = float(np.percentile(times, 50))
        # Batch policy evaluates 30 end-to-end records including full preprocessing & ranking
        self.assertGreater(len(times), 0)
        self.assertLess(p50, 1000.0, f"Batch 30 scoring must execute within 1s: {p50:.1f}ms")

    def test_memory_footprint_leakage(self):
        """
        Measures peak RAM allocation during intensive repetitive scoring loops using tracemalloc.
        Ensures continuous inference does not exhibit runaway memory accumulation.
        """
        tracemalloc.start()
        snapshot_start = tracemalloc.take_snapshot()

        # Run 100 predictions and 20 route optimizations
        for _ in range(100):
            self.engine.predict_risk(self.single_sample)
        for _ in range(20):
            self.optimizer.optimize_route_from_shipments(self.records[:30])

        snapshot_end = tracemalloc.take_snapshot()
        stats = snapshot_end.compare_to(snapshot_start, "lineno")
        total_growth_kb = sum(stat.size_diff for stat in stats) / 1024.0
        tracemalloc.stop()

        # Net memory growth over 120 combined operations should remain bounded (< 15 MB)
        self.assertLess(total_growth_kb, 15360.0, f"Excessive memory growth detected: {total_growth_kb:.1f} KB")


if __name__ == "__main__":
    unittest.main()
