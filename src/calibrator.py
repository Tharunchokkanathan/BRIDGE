import numpy as np
from scipy.special import logit, expit
from sklearn.base import BaseEstimator, ClassifierMixin
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss

class PlattCalibrator(BaseEstimator, ClassifierMixin):
    """
    Sigmoid / Platt Scaling Calibrator.
    Maps uncalibrated model probability predictions p into calibrated probabilities
    using a monotonic logistic regression transformation on the logit scale.
    Preserves exact ranking (ROC-AUC / PR-AUC) while eliminating calibration bias.
    """
    def __init__(self, C=1.0, clip_eps=1e-6):
        self.C = C
        self.clip_eps = clip_eps
        self.lr_ = LogisticRegression(C=self.C, solver="lbfgs")

    def fit(self, probs, y):
        """
        Fits Platt scaling on raw probability predictions and binary labels.
        :param probs: 1D array of uncalibrated probabilities in [0, 1].
        :param y: 1D array of binary ground-truth labels in {0, 1}.
        """
        probs = np.asarray(probs).ravel()
        y = np.asarray(y).ravel()
        p_clipped = np.clip(probs, self.clip_eps, 1.0 - self.clip_eps)
        logits = logit(p_clipped).reshape(-1, 1)
        self.lr_.fit(logits, y)
        return self

    def predict_proba(self, probs):
        """
        Predicts calibrated probabilities for given input raw probabilities.
        :param probs: 1D or 2D array of raw probabilities.
        :return: 1D array of calibrated class-1 probabilities.
        """
        probs = np.asarray(probs)
        if probs.ndim == 2:
            probs = probs[:, 1]
        probs = probs.ravel()
        p_clipped = np.clip(probs, self.clip_eps, 1.0 - self.clip_eps)
        logits = logit(p_clipped).reshape(-1, 1)
        return self.lr_.predict_proba(logits)[:, 1]

    def predict(self, probs, threshold=0.5):
        """Predicts binary class labels at a given threshold."""
        return (self.predict_proba(probs) >= threshold).astype(int)


def compute_calibration_metrics(y_true, probs, baseline_prevalence=None):
    """
    Computes comprehensive probability calibration and quality metrics:
    - Brier score
    - Log loss
    - Brier Skill Score (against constant-prevalence baseline)
    - Expected Calibration Error (ECE, 10 equal-frequency quantile bins)
    - Calibration Bias (Mean Predicted Prob - Observed Prevalence)
    """
    y_true = np.asarray(y_true).ravel()
    probs = np.asarray(probs).ravel()
    p_clipped = np.clip(probs, 1e-6, 1.0 - 1e-6)

    obs_prev = float(y_true.mean())
    if baseline_prevalence is None:
        baseline_prevalence = obs_prev
    brier_baseline = baseline_prevalence * (1.0 - baseline_prevalence)

    brier = float(brier_score_loss(y_true, probs))
    ll = float(log_loss(y_true, p_clipped))
    bss = float(1.0 - (brier / brier_baseline)) if brier_baseline > 0 else 0.0
    mean_p = float(probs.mean())
    bias = mean_p - obs_prev

    # Expected Calibration Error (ECE) with 10 quantile bins
    bins = np.quantile(probs, np.linspace(0, 1, 11))
    bins[0] = 0.0
    bins[-1] = 1.0
    bin_idx = np.digitize(probs, bins) - 1
    ece = 0.0
    for b in range(10):
        mask = (bin_idx == b)
        if mask.sum() > 0:
            bin_acc = y_true[mask].mean()
            bin_conf = probs[mask].mean()
            ece += (mask.sum() / len(y_true)) * abs(bin_conf - bin_acc)

    return {
        "brier_score": round(brier, 4),
        "brier_baseline": round(brier_baseline, 4),
        "brier_skill_score": round(bss, 4),
        "log_loss": round(ll, 4),
        "ece": round(float(ece), 4),
        "mean_predicted_prob": round(mean_p, 4),
        "observed_prevalence": round(obs_prev, 4),
        "calibration_bias": round(bias, 4),
    }
