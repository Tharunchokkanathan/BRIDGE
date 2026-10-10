import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# Import authoritative feature sets from feature_engineering
from feature_engineering import (
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    ALL_FEATURE_COLS,
    EXCLUDE_COLS,
    compute_engineered_features,
    verify_feature_integrity
)

TARGET_COL = "first_attempt_failed"


def verify_no_leakage(df_cols):
    """Explicitly audits feature names against leakage and outcome rules."""
    return verify_feature_integrity(df_cols)


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
    
    # Ensure all engineered features are present
    df = compute_engineered_features(df)
    
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
    print(f"Candidate Features count: {len(feature_cols)} ({len(CATEGORICAL_FEATURES)} Categorical + {len(NUMERICAL_FEATURES)} Numerical)")
    
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
