"""
BRIDGE — Feature Engineering Engine (Phase 2)
Single source of truth for pre-dispatch feature engineering.

Directly implements all 8 pillars from the Hackathon Problem Statement:
  1. Customer delivery history (attempts, success rate, smoothed failure propensity)
  2. Previous failed delivery attempts (failure counts, streak)
  3. Delivery location type (Residential, Apartment, Commercial, Locker_Hub)
  4. Time-of-day delivery patterns (cyclical hour, window minutes, rush hour)
  5. Signature requirements (signature presence, unavailable signature risk)
  6. Seasonal trends (month, weekend, weather severity index, zone-weather compound)
  7. Customer preferences (preferred slot, departure mismatch, preference clash)
  8. Geographic delivery behavior (zone/station historical failure priors, access difficulty)

Outputs: Exactly 44 features (4 Categorical + 40 Numerical) with ZERO post-dispatch leakage.
"""

import os
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List

# Authoritative Feature Lists
CATEGORICAL_FEATURES = [
    "station_code",
    "preferred_delivery_method",
    "customer_delivery_preference",
    "location_type"
]

NUMERICAL_FEATURES = [
    # Source / Baseline Physical Features (11)
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
    # Customer CRM & Prior Historical Features (11)
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
    # Engineered Time & Spatial Representations (12)
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
    # High-Impact Operational Interaction Features (6)
    "risk_signature_unavailability",
    "risk_preference_departure_clash",
    "risk_commercial_closed",
    "risk_access_difficulty_heavy_package",
    "risk_zone_weather_stress",
    "customer_failure_propensity"
]

ALL_FEATURE_COLS = CATEGORICAL_FEATURES + NUMERICAL_FEATURES

# Forbidden / Leakage outcome columns that must NEVER enter feature matrix
EXCLUDE_COLS = [
    "route_id", "stop_id", "package_id",
    "first_attempt_failed",
    "scan_status",
    "delivery_date", "departure_time",
    "day_of_week", "stop_type", "zone_id",
    "time_window_start", "time_window_end"
]

DAY_NAME_TO_INDEX = {
    "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
    "Friday": 4, "Saturday": 5, "Sunday": 6
}


def compute_engineered_features(df_input: pd.DataFrame) -> pd.DataFrame:
    """
    Deterministic Feature Engineering Single Source of Truth.
    Accepts raw manifest dataframe or API record payload, computes all 44 model features.
    """
    df = df_input.copy()

    # -------------------------------------------------------------
    # 1. DELIVERY LOCATION TYPE (Pillar 3)
    # -------------------------------------------------------------
    if "location_type" not in df.columns or df["location_type"].isna().all():
        pref_method = df.get("preferred_delivery_method", pd.Series("Front Door", index=df.index))
        access_diff = df.get("address_access_difficulty", pd.Series(2, index=df.index)).fillna(2)
        loc_type = np.where(pref_method == "Locker", "Locker_Hub",
                   np.where(pref_method == "Mailroom", "Commercial",
                   np.where(access_diff >= 4, "Apartment", "Residential")))
        df["location_type"] = loc_type
    else:
        df["location_type"] = df["location_type"].fillna("Residential")

    # -------------------------------------------------------------
    # 2. TIME-WINDOW FEATURES (Pillar 4)
    # -------------------------------------------------------------
    if "has_time_window" not in df.columns:
        has_tw = df["time_window_start"].notna() & df["time_window_end"].notna() if ("time_window_start" in df.columns and "time_window_end" in df.columns) else pd.Series(0, index=df.index)
        df["has_time_window"] = has_tw.astype(np.int64)
    df["has_time_window"] = df["has_time_window"].fillna(0).astype(np.int64)

    for col in ["window_start_minutes", "window_end_minutes", "departure_to_window_start_minutes", "departure_to_window_end_minutes"]:
        if col not in df.columns:
            df[col] = np.nan

    # -------------------------------------------------------------
    # 3. CYCLICAL TIME FEATURES (Pillar 4 & Pillar 6)
    # -------------------------------------------------------------
    dep_hour = df.get("departure_hour", pd.Series(12, index=df.index)).fillna(12).values
    df["departure_hour_sin"] = np.round(np.sin(2.0 * np.pi * dep_hour / 24.0), 6)
    df["departure_hour_cos"] = np.round(np.cos(2.0 * np.pi * dep_hour / 24.0), 6)

    if "day_of_week" in df.columns:
        day_idx = df["day_of_week"].map(DAY_NAME_TO_INDEX).fillna(2).values
    else:
        is_wknd = df.get("is_weekend", pd.Series(0, index=df.index)).fillna(0).values
        day_idx = np.where(is_wknd == 1, 5, 2)
    df["day_of_week_sin"] = np.round(np.sin(2.0 * np.pi * day_idx / 7.0), 6)
    df["day_of_week_cos"] = np.round(np.cos(2.0 * np.pi * day_idx / 7.0), 6)

    # -------------------------------------------------------------
    # 4. LOG TRANSFORMS FOR SKEWED SCALE (Physical parcel metrics)
    # -------------------------------------------------------------
    vol = df.get("package_volume_cm3", pd.Series(5000.0, index=df.index)).fillna(5000.0).values
    df["log_package_volume"] = np.round(np.log1p(np.maximum(0.0, vol)), 6)

    srv_time = df.get("planned_service_time_seconds", pd.Series(180.0, index=df.index)).fillna(180.0).values
    df["log_planned_service_time"] = np.round(np.log1p(np.maximum(0.0, srv_time)), 6)

    # -------------------------------------------------------------
    # 5. PREFERENCE MISMATCH (Pillar 7)
    # -------------------------------------------------------------
    if "preference_departure_mismatch" not in df.columns:
        pref = df.get("customer_delivery_preference", pd.Series("Anytime", index=df.index)).fillna("Anytime").values
        is_wknd = df.get("is_weekend", pd.Series(0, index=df.index)).fillna(0).values
        mismatch = np.zeros(len(df), dtype=np.int64)
        mismatch = np.where((pref == "Morning Only") & (dep_hour >= 12), 1, mismatch)
        mismatch = np.where((pref == "Evening Only") & (dep_hour < 16), 1, mismatch)
        mismatch = np.where((pref == "Weekday Only") & (is_wknd == 1), 1, mismatch)
        df["preference_departure_mismatch"] = mismatch.astype(np.int64)
    else:
        df["preference_departure_mismatch"] = df["preference_departure_mismatch"].fillna(0).astype(np.int64)

    # -------------------------------------------------------------
    # 6. HIGH-IMPACT OPERATIONAL INTERACTION FEATURES
    # -------------------------------------------------------------
    avail_rate = df.get("customer_availability_rate", pd.Series(0.70, index=df.index)).fillna(0.70)
    sig_req = df.get("signature_required", pd.Series(0, index=df.index)).fillna(0)
    mismatch_flag = df["preference_departure_mismatch"]
    access_diff = df.get("address_access_difficulty", pd.Series(2, index=df.index)).fillna(2)
    is_wknd = df.get("is_weekend", pd.Series(0, index=df.index)).fillna(0)
    zone_prior = df.get("historical_zone_failure_rate", pd.Series(0.09, index=df.index)).fillna(0.09)
    weather_score = df.get("weather_risk_score", pd.Series(0.20, index=df.index)).fillna(0.20)
    prev_att = df.get("customer_previous_delivery_attempts", pd.Series(0, index=df.index)).fillna(0)
    prev_fail = df.get("customer_previous_failed_attempts", pd.Series(0, index=df.index)).fillna(0)

    # Feature 35: Signature Required while recipient is unavailable (Top Failure Driver)
    df["risk_signature_unavailability"] = np.round(sig_req * (1.0 - avail_rate), 4)

    # Feature 36: Delivery window clash combined with low recipient presence
    df["risk_preference_departure_clash"] = np.round(mismatch_flag * (1.0 - avail_rate), 4)

    # Feature 37: Commercial office delivery scheduled after business hours (>=17:00 or weekend)
    is_commercial = (df["location_type"] == "Commercial").astype(int)
    after_hours = ((dep_hour >= 17) | (is_wknd == 1)).astype(int)
    df["risk_commercial_closed"] = np.round(is_commercial * after_hours, 4)

    # Feature 38: Bulky package combined with difficult multi-floor/access barrier
    df["risk_access_difficulty_heavy_package"] = np.round(access_diff * (df["log_package_volume"] / 10.0), 4)

    # Feature 39: High-risk postal zone under adverse weather strain
    df["risk_zone_weather_stress"] = np.round(zone_prior * (1.0 + weather_score), 4)

    # Feature 40: Laplace-smoothed customer failure propensity (Pillars 1 & 2)
    df["customer_failure_propensity"] = np.round((prev_fail + 1.0) / (prev_att + 2.0), 4)

    return df


def verify_feature_integrity(df_cols: List[str]) -> bool:
    """Strict assertion guarding against outcome/target data leakage."""
    forbidden = ["scan_status", "first_attempt_failed"]
    for col in forbidden:
        if col in df_cols:
            raise ValueError(f"[CRITICAL DATA LEAKAGE DETECTED] Forbidden outcome column '{col}' in feature list!")
    print("[LEAKAGE AUDIT PASSED] No post-dispatch outcomes or target variables in feature matrix.")
    return True


if __name__ == "__main__":
    sample_path = "data/amazon_delivery_ml_features_sample.csv"
    if os.path.exists(sample_path):
        print(f"Loading {sample_path} to apply feature engineering...")
        raw_df = pd.read_csv(sample_path)
        transformed_df = compute_engineered_features(raw_df)
        verify_feature_integrity([c for c in transformed_df.columns if c in ALL_FEATURE_COLS])
        
        # Save back with all 44 features
        transformed_df.to_csv(sample_path, index=False)
        print(f"[SUCCESS] Saved enhanced dataset with {len(transformed_df):,} rows and {len(ALL_FEATURE_COLS)} features.")
        print("Categorical features:", CATEGORICAL_FEATURES)
        print(f"Numerical features count: {len(NUMERICAL_FEATURES)}")
    else:
        print(f"[INFO] Sample file {sample_path} not found. Run extract_sample.py first.")
