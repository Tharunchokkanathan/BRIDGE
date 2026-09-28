import os
import json
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    brier_score_loss
)

from data_pipeline import (
    load_and_split_data,
    build_preprocessor,
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    TARGET_COL
)

def evaluate_model(model, X, y, dataset_name="Test"):
    """Evaluates probability predictions on imbalanced delivery failure data."""
    probs = model.predict_proba(X)[:, 1]
    
    roc_auc = roc_auc_score(y, probs)
    pr_auc = average_precision_score(y, probs)
    brier = brier_score_loss(y, probs)
    
    # Evaluate at operational risk thresholds:
    # High risk alert threshold at 0.15 (since base rate is ~9%)
    preds_015 = (probs >= 0.15).astype(int)
    preds_010 = (probs >= 0.10).astype(int)
    
    metrics = {
        "dataset": dataset_name,
        "roc_auc": round(float(roc_auc), 4),
        "pr_auc": round(float(pr_auc), 4),
        "brier_score": round(float(brier), 4),
        "mean_predicted_prob": round(float(probs.mean()), 4),
        "precision_at_015": round(float(precision_score(y, preds_015, zero_division=0)), 4),
        "recall_at_015": round(float(recall_score(y, preds_015, zero_division=0)), 4),
        "f1_at_015": round(float(f1_score(y, preds_015, zero_division=0)), 4),
        "precision_at_010": round(float(precision_score(y, preds_010, zero_division=0)), 4),
        "recall_at_010": round(float(recall_score(y, preds_010, zero_division=0)), 4),
        "f1_at_010": round(float(f1_score(y, preds_010, zero_division=0)), 4),
        "confusion_matrix_015": confusion_matrix(y, preds_015).tolist(),
    }
    return metrics, probs

def train_and_evaluate():
    os.makedirs("models", exist_ok=True)
    t_start = time.time()
    
    # 1. Load data with route-group split
    data = load_and_split_data("data/amazon_delivery_ml_features_sample.csv")
    X_train, y_train = data["X_train"], data["y_train"]
    X_val, y_val = data["X_val"], data["y_val"]
    X_test, y_test = data["X_test"], data["y_test"]
    
    # 2. Build and fit preprocessors on TRAIN ONLY
    print("\n[PREPROCESSING] Fitting preprocessor on training split only...")
    preprocessor = build_preprocessor()
    X_train_proc = preprocessor.fit_transform(X_train)
    X_val_proc = preprocessor.transform(X_val)
    X_test_proc = preprocessor.transform(X_test)
    
    # Extract feature names after one-hot encoding
    cat_encoder = preprocessor.named_transformers_["cat"].named_steps["encoder"]
    encoded_cat_names = cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES).tolist()
    all_feature_names = NUMERICAL_FEATURES + encoded_cat_names
    
    # Scaled preprocessor for Logistic Regression
    scaled_preprocessor = build_preprocessor(scale_numeric=True)
    X_train_scaled = scaled_preprocessor.fit_transform(X_train)
    X_val_scaled = scaled_preprocessor.transform(X_val)
    X_test_scaled = scaled_preprocessor.transform(X_test)
    
    # Save preprocessors
    joblib.dump(preprocessor, "models/preprocessor.joblib")
    joblib.dump(scaled_preprocessor, "models/scaled_preprocessor.joblib")
    
    results = {}
    
    # ==========================================
    # Model 1: Calibrated Logistic Regression
    # ==========================================
    print("\nTraining Model 1: Calibrated Logistic Regression (3-fold CV)...")
    t0 = time.time()
    base_lr = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42)
    cal_lr = CalibratedClassifierCV(estimator=base_lr, method="sigmoid", cv=3)
    cal_lr.fit(X_train_scaled, y_train)
    lr_train_time = time.time() - t0
    
    lr_val_metrics, _ = evaluate_model(cal_lr, X_val_scaled, y_val, "Validation")
    lr_test_metrics, lr_test_probs = evaluate_model(cal_lr, X_test_scaled, y_test, "Test")
    joblib.dump(cal_lr, "models/logistic_regression.joblib")
    
    results["Logistic Regression"] = {
        "training_time_sec": round(lr_train_time, 2),
        "validation_metrics": lr_val_metrics,
        "test_metrics": lr_test_metrics,
    }
    print(f"LR Test PR-AUC: {lr_test_metrics['pr_auc']} | ROC-AUC: {lr_test_metrics['roc_auc']} | Mean Prob: {lr_test_metrics['mean_predicted_prob']}")
    
    # ==========================================
    # Model 2: Calibrated Random Forest Classifier
    # ==========================================
    print("\nTraining Model 2: Calibrated Random Forest Classifier (100 Trees, 3-fold CV)...")
    t0 = time.time()
    base_rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=20,
        class_weight="balanced",
        n_jobs=-1,
        random_state=42
    )
    base_rf.fit(X_train_proc, y_train)
    
    cal_rf = CalibratedClassifierCV(estimator=base_rf, method="sigmoid", cv=3)
    cal_rf.fit(X_train_proc, y_train)
    rf_train_time = time.time() - t0
    
    rf_val_metrics, _ = evaluate_model(cal_rf, X_val_proc, y_val, "Validation")
    rf_test_metrics, rf_test_probs = evaluate_model(cal_rf, X_test_proc, y_test, "Test")
    joblib.dump(cal_rf, "models/random_forest.joblib")
    
    results["Random Forest"] = {
        "training_time_sec": round(rf_train_time, 2),
        "validation_metrics": rf_val_metrics,
        "test_metrics": rf_test_metrics,
    }
    print(f"RF Test PR-AUC: {rf_test_metrics['pr_auc']} | ROC-AUC: {rf_test_metrics['roc_auc']} | Mean Prob: {rf_test_metrics['mean_predicted_prob']}")
    
    # Feature importances from base Random Forest
    rf_importances = base_rf.feature_importances_
    rf_feature_importance_dict = {
        name: round(float(imp), 4)
        for name, imp in sorted(zip(all_feature_names, rf_importances), key=lambda x: x[1], reverse=True)[:20]
    }
    
    # Champion Selection
    lr_pr = lr_test_metrics["pr_auc"]
    rf_pr = rf_test_metrics["pr_auc"]
    
    if rf_pr >= lr_pr:
        champion_name = "Random Forest"
        champion_model = cal_rf
        active_prep = preprocessor
    else:
        champion_name = "Logistic Regression"
        champion_model = cal_lr
        active_prep = scaled_preprocessor
        
    print(f"\n[CHAMPION SELECTED] {champion_name} (Test PR-AUC: {max(rf_pr, lr_pr):.4f})")
    joblib.dump(champion_model, "models/champion_model.joblib")
    
    metadata = {
        "champion_model": champion_name,
        "selection_metric": "PR-AUC (Precision-Recall AUC)",
        "train_rows": len(X_train),
        "val_rows": len(X_val),
        "test_rows": len(X_test),
        "feature_count": len(all_feature_names),
        "feature_names": all_feature_names,
        "top_features": rf_feature_importance_dict,
        "comparison_results": results,
        "calibrated": True,
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    with open("models/model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
        
    # Save a realistic test batch of 50 sample deliveries for the dashboard
    df_raw = pd.read_csv("data/amazon_delivery_ml_features_sample.csv")
    test_sample_df = df_raw.iloc[data["test_meta"].index[:60]].copy()
    test_sample_df.to_csv("data/sample_test_deliveries.csv", index=False)
    print("Saved 60 sample test deliveries to data/sample_test_deliveries.csv for instant dashboard demos.")
    
    total_elapsed = time.time() - t_start
    print(f"\n[PHASE 2 COMPLETE] Pipeline and calibrations finished in {total_elapsed:.2f}s.")
    return metadata

if __name__ == "__main__":
    train_and_evaluate()
