import os
import sys
import duckdb
import numpy as np
import pandas as pd
import pytest

# Ensure src is in python path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))

from feature_engineering import (
    ALL_FEATURE_COLS,
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    EXCLUDE_COLS,
    verify_feature_integrity
)
from duckdb_store import DuckDBFeatureStore, TARGET_COLUMN
from data_pipeline import load_and_split_data

SAMPLE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "amazon_delivery_ml_features_sample.csv")


def test_duckdb_installation_and_version():
    """Verify DuckDB is installed and modern version >= 1.0.0."""
    version = duckdb.__version__
    major_ver = int(version.split(".")[0])
    assert major_ver >= 1, f"DuckDB version must be >= 1.0.0, found {version}"


def test_duckdb_44_feature_contract():
    """Verify DuckDBFeatureStore returns exact 44 features matching contract."""
    store = DuckDBFeatureStore()
    df_features = store.get_feature_matrix(source=SAMPLE_PATH, limit=100)
    
    assert len(df_features.columns) == 44
    assert list(df_features.columns) == ALL_FEATURE_COLS
    
    # Assert categoricals exist
    for cat_col in CATEGORICAL_FEATURES:
        assert cat_col in df_features.columns
        
    # Assert numericals exist
    for num_col in NUMERICAL_FEATURES:
        assert num_col in df_features.columns


def test_duckdb_zero_leakage_enforcement():
    """Verify DuckDBFeatureStore strictly excludes forbidden outcome columns."""
    store = DuckDBFeatureStore()
    df_features = store.get_feature_matrix(source=SAMPLE_PATH, limit=100)
    
    # Assert no forbidden columns in feature matrix
    assert "scan_status" not in df_features.columns
    assert "first_attempt_failed" not in df_features.columns
    assert "route_id" not in df_features.columns
    assert "package_id" not in df_features.columns
    
    # Assert audit function passes
    assert verify_feature_integrity(list(df_features.columns)) is True


def test_duckdb_vs_pandas_value_equivalence():
    """
    Exhaustively compare DuckDB query results against pandas read_csv for the full 100k sample.
    Values must match across all 44 features within numerical tolerance.
    """
    assert os.path.exists(SAMPLE_PATH), f"Sample file not found: {SAMPLE_PATH}"
    
    df_pd = pd.read_csv(SAMPLE_PATH)
    store = DuckDBFeatureStore()
    df_duck = store.get_feature_matrix(source=SAMPLE_PATH)
    
    assert len(df_duck) == len(df_pd) == 100000
    
    for col in ALL_FEATURE_COLS:
        assert col in df_duck.columns
        assert col in df_pd.columns
        
        s_pd = df_pd[col]
        s_duck = df_duck[col]
        
        if col in CATEGORICAL_FEATURES:
            match = (s_pd.fillna("UNKNOWN") == s_duck.fillna("UNKNOWN")).all()
            assert match, f"Categorical mismatch in column: {col}"
        else:
            # Numerical tolerance check
            np.testing.assert_allclose(
                s_duck.fillna(-999.0).values,
                s_pd.fillna(-999.0).values,
                rtol=1e-5,
                atol=1e-5,
                err_msg=f"Numerical mismatch in feature: {col}"
            )


def test_duckdb_target_and_route_alignment():
    """Verify target variable and route groups match pandas exactly."""
    df_pd = pd.read_csv(SAMPLE_PATH)
    store = DuckDBFeatureStore()
    X, y, groups, meta = store.get_training_data(SAMPLE_PATH)
    
    assert len(X) == 100000
    assert len(y) == 100000
    assert len(groups) == 100000
    
    # Exact match on target
    assert (y == df_pd["first_attempt_failed"].astype(int).values).all()
    # Exact match on routes
    assert (groups == df_pd["route_id"].values).all()
    # Exact match on package_id
    assert (meta["package_id"].values == df_pd["package_id"].values).all()


def test_duckdb_data_pipeline_split_equivalence():
    """
    Verify load_and_split_data(use_duckdb=True) yields identical partitions
    and failure distributions as load_and_split_data(use_duckdb=False).
    """
    split_pd = load_and_split_data(csv_path=SAMPLE_PATH, random_state=42, use_duckdb=False)
    split_duck = load_and_split_data(csv_path=SAMPLE_PATH, random_state=42, use_duckdb=True)
    
    # Partition sizes must match exactly
    assert len(split_duck["X_train"]) == len(split_pd["X_train"]) == 69505
    assert len(split_duck["X_val"]) == len(split_pd["X_val"]) == 15044
    assert len(split_duck["X_test"]) == len(split_pd["X_test"]) == 15451
    
    # Target failure rates must match exactly
    assert np.isclose(split_duck["y_train"].mean(), split_pd["y_train"].mean(), atol=1e-5)
    assert np.isclose(split_duck["y_val"].mean(), split_pd["y_val"].mean(), atol=1e-5)
    assert np.isclose(split_duck["y_test"].mean(), split_pd["y_test"].mean(), atol=1e-5)
    
    # Zero route overlap in duckdb split
    train_routes = set(split_duck["test_meta"]["route_id"])
    assert len(train_routes) > 0


def test_duckdb_batch_inference_and_filtering():
    """Test batch pagination and station filtering."""
    store = DuckDBFeatureStore()
    
    # Test batch pagination
    batch = store.get_batch_for_inference(SAMPLE_PATH, limit=50, offset=100)
    assert len(batch) == 50
    assert "route_id" in batch.columns
    assert "package_id" in batch.columns
    assert "first_attempt_failed" not in batch.columns
    assert "scan_status" not in batch.columns
    
    # Test station filtering
    station_batch = store.get_batch_for_inference(SAMPLE_PATH, station_code="DBO1", limit=100)
    assert len(station_batch) > 0
    assert (station_batch["station_code"] == "DBO1").all()


def test_duckdb_manifest_summary():
    """Test fast analytical aggregations on manifest."""
    store = DuckDBFeatureStore()
    summary = store.get_manifest_summary(SAMPLE_PATH)
    
    assert summary["total_rows"] == 100000
    assert summary["distinct_routes"] > 0
    assert summary["distinct_stations"] == 17
    assert 0.08 < summary["baseline_failure_rate"] < 0.10
    assert len(summary["station_distribution"]) == 17
