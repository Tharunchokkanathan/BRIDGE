/**
 * Audited metrics and benchmarks copied verbatim from docs/FINAL_RELEASE_REPORT.md.
 * Mandatory Governance: All numbers in this file represent the audited Phase 7 release freeze
 * captured on Windows 11 / Python 3.13.3.
 */

export const RELEASE_REPORT_V1_5_0 = {
  release_version: '1.5.0',
  release_date: 'October 12, 2026',
  hardware_arch: 'Windows 11 64-bit AMD64',
  python_version: '3.13.3',
  test_set_size: 14819,
  routes_count: 63,
  random_seed: 2026,

  // Model Evaluation & Governance Gates
  models: {
    champion: {
      name: 'Logistic Regression',
      pr_auc: 0.1139,
      roc_auc: 0.5611,
      brier_score: 0.0824,
      ks_statistic: 0.0105,
      ks_p_value: 0.42,
      forward_p95_ms: 0.223,
      shap_p95_ms: 0.253,
      is_champion: true,
      promotion_decision: 'Champion Retained (Promotion Gates Enforced)',
    },
    candidate: {
      name: 'LightGBM Booster',
      pr_auc: 0.1174,
      roc_auc: 0.5623,
      brier_score: 0.0823,
      ks_statistic: 0.0140,
      ks_p_value: 0.31,
      forward_p95_ms: 2.052,
      shap_p95_ms: 4.543,
      is_champion: false,
      promotion_decision: 'Promotion Gate Not Met (PR-AUC 0.1174 vs gate 0.1500)',
    },
    gates: {
      pr_auc_target: 0.1500,
      roc_auc_target: 0.6500,
      brier_score_target: 0.0780,
      ks_transfer_max: 0.05,
      forward_pass_target_ms: 5.0,
      shap_target_ms: 10.0,
    },
  },

  // Operations Research & 2-Opt Routing Comparisons
  routing: {
    circuity_factor: 1.35,
    benchmark_stop_count: 30,
    baselines: {
      raw_manifest_order: {
        label: 'Raw CSV Manifest Order',
        original_km: 27.55,
        optimized_km: 8.29,
        savings_km: 19.26,
        savings_pct: 69.9,
      },
      probability_sorted: {
        label: 'Probability-Sorted Order',
        original_km: 28.59,
        optimized_km: 8.89,
        savings_km: 19.70,
        savings_pct: 68.9,
      },
      closed_tour_depot: {
        label: 'Closed Tour (Depot Return)',
        original_km: 29.65,
        optimized_km: 9.45,
        savings_km: 20.20,
        savings_pct: 68.1,
      },
    },
    what_if_deferral: {
      description: 'Consolidation / deferral of 5 highest-risk residential stops (30 -> 25 stops)',
      stops_before: 30,
      stops_after: 25,
      distance_before_km: 9.06,
      distance_after_km: 7.92,
      savings_km: 1.14,
      savings_pct: 12.5,
    },
    benchmarks: {
      two_opt_p50_ms: 0.28,
      two_opt_p90_ms: 0.35,
      two_opt_p95_ms: 0.44,
      target_threshold_ms: 15.0,
    },
  },

  // Empirical Benchmarks
  latency_benchmarks: [
    { scope: 'Isolated Model Scoring (LR)', iterations: 500, p50: 0.0818, p90: 0.1743, p95: 0.2227, target: 5.0 },
    { scope: 'Isolated Model Scoring (LightGBM)', iterations: 500, p50: 1.2577, p90: 1.7454, p95: 2.0519, target: 5.0 },
    { scope: 'Linear SHAP Attribution', iterations: 500, p50: 0.1802, p90: 0.2312, p95: 0.2526, target: 1.0 },
    { scope: 'TreeSHAP Attribution', iterations: 200, p50: 3.9670, p90: 4.3986, p95: 4.5427, target: 10.0 },
    { scope: '2-Opt TSP Routing (30 Stops)', iterations: 200, p50: 0.2797, p90: 0.3547, p95: 0.4439, target: 15.0 },
    { scope: 'Batch Fleet Policy (30 Pkgs)', iterations: 50, p50: 377.94, p90: 465.18, p95: 502.95, target: 1000.0 },
    { scope: 'End-to-End Single LR Pipeline', iterations: 50, p50: 21.04, p90: 24.34, p95: 28.51, target: 100.0 },
  ],
};
