import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# Target variable
TARGET_COL = "first_attempt_failed"

# Explicit non-model / leakage columns to exclude from training
EXCLUDE_COLS = [
    "route_id",
    "stop_id",
    "package_id",
    "first_attempt_failed",
    "scan_status",
    "delivery_date",
    "departure_time",
    "day_of_week",
    "stop_type",
    "time_window_start",
    "time_window_end",
    "zone_id",
]

# Categorical features for OneHotEncoding
CATEGORICAL_FEATURES = [
    "station_code",
    "preferred_delivery_method",
    "customer_delivery_preference",
]

# 34 Numerical features
NUMERICAL_FEATURES = [
    "latitude",
    "longitude",
    "planned_service_time_seconds",
    "depth_cm",
    "height_cm",
    "width_cm",
    "package_volume_cm3",
    "departure_hour",
    "is_weekend",
    "month",
    "time_window_duration_hours",
    "customer_availability_rate",
    "customer_previous_delivery_attempts",
    "customer_previous_failed_attempts",
    "customer_previous_success_rate",
    "address_access_difficulty",
    "signature_required",
    "historical_zone_failure_rate",
    "historical_station_failure_rate",
    "seasonal_failure_rate",
    "traffic_risk_score",
    "weather_risk_score",
    "has_time_window",
    "window_start_minutes",
    "window_end_minutes",
    "departure_to_window_start_minutes",
    "departure_to_window_end_minutes",
    "departure_hour_sin",
    "departure_hour_cos",
    "day_of_week_sin",
    "day_of_week_cos",
    "log_package_volume",
    "log_planned_service_time",
    "preference_departure_mismatch",
]

ALL_FEATURE_COLS = CATEGORICAL_FEATURES + NUMERICAL_FEATURES

def verify_no_leakage(df_cols):
    """Explicitly audits feature names against leakage and outcome rules."""
    forbidden = ["scan_status", "first_attempt_failed"]
    for col in forbidden:
        assert col not in df_cols, f"[CRITICAL LEAKAGE DETECTED] {col} is in feature matrix!"
    print("[LEAKAGE AUDIT PASSED] No outcome or target variables in feature matrix.")

def load_and_split_data(csv_path="data/amazon_delivery_ml_features_sample.csv", test_size=0.15, val_size=0.15, random_state=42):
    """
    Loads dataset, isolates target & metadata, and performs route-group-aware split.
    Packages from the same route will not be split across train and test.
    """
    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df):,} rows and {len(df.columns)} columns.")
    
    # Verify target exists
    assert TARGET_COL in df.columns, f"{TARGET_COL} not found in columns!"
    
    # Feature columns
    feature_cols = [c for c in df.columns if c in ALL_FEATURE_COLS]
    verify_no_leakage(feature_cols)
    
    X = df[feature_cols].copy()
    y = df[TARGET_COL].astype(int).values
    groups = df["route_id"].values
    
    # Step 1: Split train+val vs test using GroupShuffleSplit on route_id
    gss_test = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
    train_val_idx, test_idx = next(gss_test.split(X, y, groups=groups))
    
    X_train_val, y_train_val = X.iloc[train_val_idx], y[train_val_idx]
    groups_train_val = groups[train_val_idx]
    
    X_test, y_test = X.iloc[test_idx], y[test_idx]
    test_meta = df.iloc[test_idx][["route_id", "stop_id", "package_id", "delivery_date"]]
    
    # Step 2: Split train vs val using GroupShuffleSplit
    val_ratio = val_size / (1.0 - test_size)
    gss_val = GroupShuffleSplit(n_splits=1, test_size=val_ratio, random_state=random_state)
    train_idx, val_idx = next(gss_val.split(X_train_val, y_train_val, groups=groups_train_val))
    
    X_train, y_train = X_train_val.iloc[train_idx], y_train_val[train_idx]
    X_val, y_val = X_train_val.iloc[val_idx], y_train_val[val_idx]
    
    print("\n--- Route-Group Split Summary ---")
    print(f"Train set: {len(X_train):,} rows ({len(np.unique(groups[train_val_idx][train_idx])):,} distinct routes) | Failure rate: {y_train.mean():.3%}")
    print(f"Val set:   {len(X_val):,} rows ({len(np.unique(groups[train_val_idx][val_idx])):,} distinct routes) | Failure rate: {y_val.mean():.3%}")
    print(f"Test set:  {len(X_test):,} rows ({len(np.unique(groups[test_idx])):,} distinct routes) | Failure rate: {y_test.mean():.3%}")
    
    return {
        "X_train": X_train, "y_train": y_train,
        "X_val": X_val, "y_val": y_val,
        "X_test": X_test, "y_test": y_test,
        "test_meta": test_meta,
        "feature_cols": feature_cols
    }

def build_preprocessor(cat_features=CATEGORICAL_FEATURES, num_features=NUMERICAL_FEATURES, scale_numeric=False):
    """
    Builds a leakage-safe ColumnTransformer.
    Must be fit ONLY on training data.
    """
    num_steps = [("imputer", SimpleImputer(strategy="median"))]
    if scale_numeric:
        num_steps.append(("scaler", StandardScaler()))
    
    num_pipeline = Pipeline(steps=num_steps)
    cat_pipeline = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="constant", fill_value="UNKNOWN")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_pipeline, num_features),
            ("cat", cat_pipeline, cat_features)
        ],
        remainder="drop"
    )
    return preprocessor

if __name__ == "__main__":
    if os.path.exists("data/amazon_delivery_ml_features_sample.csv"):
        data = load_and_split_data()
        prep = build_preprocessor()
        prep.fit(data["X_train"])
        print("[SUCCESS] Preprocessor successfully fit on training split only.")
    else:
        print("[INFO] Sample dataset not yet generated. Awaiting extraction.")
