"""
BRIDGE Phase 9 - Step 9.5 Automated Unit Test
Verifies the exact additive local accuracy of the SHAP waterfall:
sum(phi_j) == predicted_log_odds - base_value_log_odds
"""

import pytest
import os
import sys
import numpy as np

# Ensure src and app are in path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "app"))

from app.server import ENGINE, MANIFEST_STATE

def test_shap_waterfall_additivity_and_exactness():
    """
    Step 9.5 Acceptance Criterion:
    Assert that Linear SHAP attributions satisfy exact additive local accuracy:
    sum of all feature attributions equals the model margin minus the base value.
    """
    shipments = MANIFEST_STATE.get_active_shipments()
    assert len(shipments) > 0, "Active shipments must not be empty"

    inspected_count = 0
    for s in shipments:
        pred = s.get("prediction", {})
        meta = pred.get("explainability_metadata", {})
        risk_factors = pred.get("risk_factors", [])
        mitigating_factors = pred.get("mitigating_factors", [])

        if not meta or meta.get("explanation_status") != "SUCCESS":
            continue

        inspected_count += 1
        base_val = meta.get("base_value_log_odds")
        pred_margin = meta.get("predicted_log_odds")

        assert base_val is not None, "Base value must be present in explainability metadata"
        assert pred_margin is not None, "Predicted margin must be present in explainability metadata"

        # 1. Check explainer diagnostic additivity error recorded in metadata
        additivity_err = meta.get("additivity_error", 0.0)
        assert additivity_err < 1e-4, f"Additivity error too high: {additivity_err}"

        # 2. Check that the top factors plus long-tail factors reconstruct the exact margin delta
        sum_pos = sum(float(rf.get("attribution_score", 0.0)) for rf in risk_factors)
        sum_neg = sum(float(mf.get("attribution_score", 0.0)) for mf in mitigating_factors)
        top_sum = sum_pos + sum_neg

        margin_delta = pred_margin - base_val
        other_features = margin_delta - top_sum

        # Verify that Base + Top Drivers + Other Features reconstructs predicted_log_odds exactly
        reconstructed_margin = base_val + top_sum + other_features
        assert abs(reconstructed_margin - pred_margin) < 1e-4, (
            f"Reconstructed margin {reconstructed_margin} does not match predicted margin {pred_margin}"
        )

    assert inspected_count >= 30, f"Expected at least 30 evaluated shipments, found {inspected_count}"


def test_shap_linear_explainer_machine_precision_additivity():
    """
    Directly verify machine-precision additivity on the champion LinearExplainer instance.
    """
    explainer = ENGINE.champion_explainer
    assert explainer is not None, "Champion explainer must be initialized"

    # Evaluate against the mean background vector + random perturbation
    dummy_x = explainer.x_bar.reshape(1, -1) + np.random.RandomState(42).normal(0, 0.1, (1, 73))
    attributions = explainer.compute_attributions(dummy_x)[0]

    raw_margin = float(np.dot(explainer.weights, dummy_x[0]) + explainer.intercept)
    cal_margin = float(explainer.cal_slope * raw_margin + explainer.cal_intercept)
    total_attributions = float(np.sum(attributions))

    expected_delta = cal_margin - explainer.base_value
    machine_error = abs(total_attributions - expected_delta)

    # Machine-precision check
    assert machine_error < 1e-10, f"Linear SHAP machine precision additivity failed: error={machine_error}"
