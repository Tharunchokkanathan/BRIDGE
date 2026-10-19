"""
BRIDGE — Phase 8: Manifest State Manager & Pre-Flight Parser Engine
Multi-tenant, dynamic B2B SaaS Manifest Engine for pre-flight schema analysis,
leakage quarantine, domain prior imputation, and multi-route capacity partitioning.
"""

import os
import io
import csv
import json
import copy
import threading
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from fastapi import HTTPException


MAX_SYNC_ROWS = 1000

# Canonical Column Alias Normalization Map
COLUMN_ALIAS_MAP = {
    # Coordinates
    "lat": "latitude",
    "latitude_deg": "latitude",
    "y": "latitude",
    "lon": "longitude",
    "lng": "longitude",
    "long": "longitude",
    "longitude_deg": "longitude",
    "x": "longitude",
    # Package Identifiers
    "tracking_id": "package_id",
    "id": "package_id",
    "tracking_number": "package_id",
    "package": "package_id",
    "pkg_id": "package_id",
    # CRM & Recipient Availability
    "cust_avail": "customer_availability_rate",
    "customer_availability": "customer_availability_rate",
    "availability_rate": "customer_availability_rate",
    "availability": "customer_availability_rate",
    # Route & Stop Identifiers
    "route": "route_id",
    "routeid": "route_id",
    "stop": "stop_id",
    "stopid": "stop_id",
    # Depot / Station
    "station": "station_code",
    "depot": "station_code",
    "station_id": "station_code",
    # Delivery Preferences
    "delivery_method": "preferred_delivery_method",
    "method": "preferred_delivery_method",
    "delivery_preference": "customer_delivery_preference",
    "preference": "customer_delivery_preference",
    "loc_type": "location_type",
    # Timing & Departure
    "dept_hour": "departure_hour",
    "dep_hour": "departure_hour",
    "departure": "departure_hour",
    # Physical / Access / Signature
    "access_difficulty": "address_access_difficulty",
    "difficulty": "address_access_difficulty",
    "service_time": "planned_service_time_seconds",
    "planned_service_time": "planned_service_time_seconds",
    "service_seconds": "planned_service_time_seconds",
    "signature": "signature_required",
    "is_signature_required": "signature_required",
    # Historical CRM Track Record
    "prev_attempts": "customer_previous_delivery_attempts",
    "previous_attempts": "customer_previous_delivery_attempts",
    "prev_failed_attempts": "customer_previous_failed_attempts",
    "failed_attempts": "customer_previous_failed_attempts",
    "previous_failed": "customer_previous_failed_attempts",
    "success_rate": "customer_previous_success_rate",
    "prev_success_rate": "customer_previous_success_rate",
    "zone_failure_rate": "historical_zone_failure_rate",
    "station_failure_rate": "historical_station_failure_rate"
}

# Forbidden / Target Leakage Columns: strictly stripped before feature evaluation
LEAKAGE_COLUMNS = {
    "first_attempt_failed",
    "scan_status",
    "outcome",
    "delivery_outcome",
    "is_failed",
    "actual_outcome",
    "delivery_status",
    "final_delivery_status"
}

# Domain-Safe Defaults for CRM & Physical Features
DOMAIN_SAFE_PRIORS = {
    "customer_availability_rate": 0.70,
    "customer_previous_delivery_attempts": 0,
    "customer_previous_failed_attempts": 0,
    "customer_previous_success_rate": 1.0,
    "address_access_difficulty": 2,
    "signature_required": 0,
    "historical_zone_failure_rate": 0.09,
    "historical_station_failure_rate": 0.04,
    "seasonal_failure_rate": 0.05,
    "traffic_risk_score": 0.20,
    "weather_risk_score": 0.20,
    "station_code": "DBO1",
    "preferred_delivery_method": "Front Door",
    "customer_delivery_preference": "Anytime",
    "location_type": "Residential",
    "planned_service_time_seconds": 60.0,
    "depth_cm": 25.0,
    "height_cm": 10.0,
    "width_cm": 18.0,
    "package_volume_cm3": 4500.0,
    "departure_hour": 12,
    "is_weekend": 0,
    "month": 7
}


def score_manifest_records(engine, records: List[Dict[str, Any]], max_capacity_rate: Optional[float] = None) -> List[Dict[str, Any]]:
    """
    Evaluates risk predictions and applies fleet capacity constrained policy.
    Multi-Route Awareness: If records contain multiple distinct route_ids,
    partitions the 20% capacity allocation per route group so routes are not cross-contaminated.
    Preserves exact original input ordering.
    """
    if not records:
        return []

    # Clean records: remove any prediction keys from prior scoring
    clean_records = [{k: v for k, v in rec.items() if k != "prediction"} for rec in records]
    
    # Detect distinct route IDs
    distinct_routes = set()
    for rec in clean_records:
        rid = rec.get("route_id")
        if rid is not None and str(rid).strip():
            distinct_routes.add(str(rid).strip())

    if len(distinct_routes) > 1:
        # Multi-route partitioning
        route_groups: Dict[str, List[int]] = {}
        for idx, rec in enumerate(clean_records):
            rid = str(rec.get("route_id", "ROUTE_DEFAULT")).strip() or "ROUTE_DEFAULT"
            route_groups.setdefault(rid, []).append(idx)

        predictions: List[Optional[Dict[str, Any]]] = [None] * len(clean_records)
        for rid, indices in route_groups.items():
            group_records = [clean_records[i] for i in indices]
            group_preds = engine.apply_capacity_constrained_policy(
                group_records,
                max_capacity_rate=max_capacity_rate
            )
            for orig_idx, pred in zip(indices, group_preds):
                predictions[orig_idx] = pred

        return predictions
    else:
        # Single route or default: global evaluation
        return engine.apply_capacity_constrained_policy(
            clean_records,
            max_capacity_rate=max_capacity_rate
        )


class ManifestParser:
    """
    Pre-flight Manifest Parser and Schema Analysis Engine.
    - Decodes UTF-8 / UTF-8-SIG (Excel BOM).
    - Enforces synchronous row ceiling (MAX_SYNC_ROWS = 1000).
    - Normalizes common column aliases.
    - Validates mandatory geospatial coordinates (descriptive 422 line-item responses).
    - Strictly quarantines and strips target leakage columns.
    - Imputes domain-safe priors for missing CRM columns, logging explicit warnings.
    """

    @staticmethod
    def parse_content(
        content: Union[str, bytes, List[Dict[str, Any]], Dict[str, Any]],
        filename: str = "manifest.csv"
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Parses raw manifest content into normalized records and quality summary.
        Raises HTTPException(400) on malformed format or ceiling violations.
        Raises HTTPException(422) on missing coordinates with line-item detail.
        """
        raw_rows: List[Dict[str, Any]] = []

        if isinstance(content, (list, tuple)):
            raw_rows = [dict(r) for r in content]
        elif isinstance(content, dict):
            if "shipments" in content and isinstance(content["shipments"], list):
                raw_rows = [dict(r) for r in content["shipments"]]
            elif "data" in content and isinstance(content["data"], list):
                raw_rows = [dict(r) for r in content["data"]]
            else:
                raw_rows = [dict(content)]
        elif isinstance(content, (bytes, str)):
            if isinstance(content, bytes):
                # Excel BOM & UTF-8 decoding
                try:
                    text = content.decode("utf-8-sig")
                except UnicodeDecodeError:
                    text = content.decode("latin-1")
            else:
                text = content

            # Check if JSON string
            stripped_text = text.strip()
            if stripped_text.startswith(("{", "[")):
                try:
                    parsed_json = json.loads(stripped_text)
                    if isinstance(parsed_json, list):
                        raw_rows = [dict(r) for r in parsed_json]
                    elif isinstance(parsed_json, dict):
                        if "shipments" in parsed_json and isinstance(parsed_json["shipments"], list):
                            raw_rows = [dict(r) for r in parsed_json["shipments"]]
                        else:
                            raw_rows = [dict(parsed_json)]
                except json.JSONDecodeError:
                    raw_rows = []

            # If not parsed as JSON, parse as CSV
            if not raw_rows:
                try:
                    df = pd.read_csv(io.StringIO(text))
                    # Convert NaN values to None
                    raw_rows = df.where(pd.notna(df), None).to_dict("records")
                except Exception as e:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unable to parse manifest file '{filename}'. Format must be valid CSV or JSON. Error: {str(e)}"
                    )

        # 1. Enforce Synchronous Row Ceiling
        total_rows = len(raw_rows)
        if total_rows == 0:
            raise HTTPException(
                status_code=400,
                detail=f"Manifest file '{filename}' contains 0 delivery records."
            )

        if total_rows > MAX_SYNC_ROWS:
            raise HTTPException(
                status_code=400,
                detail=f"Manifest row count ({total_rows}) exceeds maximum synchronous limit of {MAX_SYNC_ROWS} rows. Please split the dispatch manifest into smaller batches."
            )

        # 2. Normalize Column Aliases & Quarantine Leakage Columns
        normalized_records: List[Dict[str, Any]] = []
        quarantined_columns: set = set()
        detected_columns: set = set()

        for idx, row in enumerate(raw_rows):
            clean_row: Dict[str, Any] = {}
            for k, v in row.items():
                if k is None:
                    continue
                k_clean = str(k).strip()
                k_lower = k_clean.lower()
                detected_columns.add(k_clean)

                # Check leakage columns first
                if k_lower in LEAKAGE_COLUMNS or k_clean in LEAKAGE_COLUMNS:
                    quarantined_columns.add(k_clean)
                    continue

                # Map column alias
                norm_key = COLUMN_ALIAS_MAP.get(k_lower, k_clean)
                
                # Check again if normalized key is a leakage column
                if norm_key.lower() in LEAKAGE_COLUMNS:
                    quarantined_columns.add(k_clean)
                    continue

                # Clean NaN / null values
                if v is not None and (pd.isna(v) or str(v).lower() in ("nan", "null", "none")):
                    clean_row[norm_key] = None
                else:
                    clean_row[norm_key] = v

            # Default package_id if missing
            if not clean_row.get("package_id"):
                clean_row["package_id"] = f"PKG_{idx+1:04d}"

            # Default stop_id if missing
            if not clean_row.get("stop_id"):
                clean_row["stop_id"] = f"STOP_{idx+1:03d}"

            # Default route_id if missing
            if not clean_row.get("route_id"):
                clean_row["route_id"] = "ROUTE_DEFAULT"

            normalized_records.append(clean_row)

        # 3. Validate Geospatial Coordinate Presence (descriptive 422 error response)
        invalid_coordinate_rows = []
        for idx, rec in enumerate(normalized_records):
            missing_fields = []
            
            # Check latitude
            lat = rec.get("latitude")
            if lat is None or lat == "":
                missing_fields.append("latitude")
            else:
                try:
                    f_lat = float(lat)
                    if np.isnan(f_lat) or not (-90.0 <= f_lat <= 90.0):
                        missing_fields.append("latitude")
                    else:
                        rec["latitude"] = f_lat
                except (ValueError, TypeError):
                    missing_fields.append("latitude")

            # Check longitude
            lon = rec.get("longitude")
            if lon is None or lon == "":
                missing_fields.append("longitude")
            else:
                try:
                    f_lon = float(lon)
                    if np.isnan(f_lon) or not (-180.0 <= f_lon <= 180.0):
                        missing_fields.append("longitude")
                    else:
                        rec["longitude"] = f_lon
                except (ValueError, TypeError):
                    missing_fields.append("longitude")

            if missing_fields:
                invalid_coordinate_rows.append({
                    "row_index": idx + 1,
                    "package_id": rec.get("package_id"),
                    "missing_fields": missing_fields,
                    "reason": f"Missing or invalid coordinate values for: {', '.join(missing_fields)}"
                })

        if invalid_coordinate_rows:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "MissingCoordinateError",
                    "message": f"Pre-flight schema validation failed: {len(invalid_coordinate_rows)} row(s) missing mandatory coordinates (latitude, longitude).",
                    "invalid_rows": invalid_coordinate_rows,
                    "total_invalid_rows": len(invalid_coordinate_rows),
                    "total_rows": total_rows
                }
            )

        # 4. Impute Domain-Safe Priors for Missing CRM Columns
        missing_crm_counts: Dict[str, int] = {}
        imputation_warnings: List[str] = []

        for rec in normalized_records:
            for crm_field, default_val in DOMAIN_SAFE_PRIORS.items():
                val = rec.get(crm_field)
                if val is None or val == "":
                    missing_crm_counts[crm_field] = missing_crm_counts.get(crm_field, 0) + 1
                    rec[crm_field] = default_val
                else:
                    # Cast types where applicable
                    if isinstance(default_val, float):
                        try:
                            rec[crm_field] = float(val)
                        except (ValueError, TypeError):
                            rec[crm_field] = default_val
                    elif isinstance(default_val, int):
                        try:
                            rec[crm_field] = int(val)
                        except (ValueError, TypeError):
                            rec[crm_field] = default_val

        for crm_col, affected_count in missing_crm_counts.items():
            imputation_warnings.append(
                f"Imputed domain-safe prior '{DOMAIN_SAFE_PRIORS[crm_col]}' for missing column '{crm_col}' ({affected_count}/{total_rows} rows affected)."
            )

        # Build Data Quality Summary
        detected_routes = sorted(list(set(str(r.get("route_id", "ROUTE_DEFAULT")) for r in normalized_records)))
        detected_stops = sorted(list(set(str(r.get("stop_id", "STOP_DEFAULT")) for r in normalized_records)))

        data_quality_summary = {
            "total_rows_received": total_rows,
            "valid_rows": len(normalized_records),
            "columns_detected": sorted(list(detected_columns)),
            "quarantined_leakage_columns": sorted(list(quarantined_columns)),
            "quarantined_count": len(quarantined_columns),
            "missing_crm_columns_imputed": sorted(list(missing_crm_counts.keys())),
            "imputation_warnings": imputation_warnings,
            "routes_detected": detected_routes,
            "total_routes": len(detected_routes),
            "stops_count": len(detected_stops),
            "schema_status": "PASSED_WITH_IMPUTATION" if imputation_warnings else "PASSED_CLEAN"
        }

        return normalized_records, data_quality_summary

    @staticmethod
    def generate_template_csv() -> str:
        """
        Generates downloadable CSV template with clean pre-dispatch headers and 3 sample rows.
        Guarantees zero target leakage outcome columns.
        """
        output = io.StringIO()
        fieldnames = [
            "route_id",
            "stop_id",
            "package_id",
            "station_code",
            "preferred_delivery_method",
            "customer_delivery_preference",
            "location_type",
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
            "weather_risk_score"
        ]

        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        sample_rows = [
            {
                "route_id": "Route_North_01",
                "stop_id": "Stop_01",
                "package_id": "PKG_9001",
                "station_code": "DBO1",
                "preferred_delivery_method": "Hand to Customer",
                "customer_delivery_preference": "Morning Only",
                "location_type": "Apartment",
                "latitude": 34.0996,
                "longitude": -118.2831,
                "planned_service_time_seconds": 180.0,
                "depth_cm": 25.4,
                "height_cm": 12.7,
                "width_cm": 17.8,
                "package_volume_cm3": 5742.0,
                "departure_hour": 16,
                "is_weekend": 0,
                "month": 7,
                "time_window_duration_hours": 2.0,
                "customer_availability_rate": 0.35,
                "customer_previous_delivery_attempts": 4,
                "customer_previous_failed_attempts": 2,
                "customer_previous_success_rate": 0.50,
                "address_access_difficulty": 4,
                "signature_required": 1,
                "historical_zone_failure_rate": 0.08,
                "historical_station_failure_rate": 0.03,
                "seasonal_failure_rate": 0.05,
                "traffic_risk_score": 0.45,
                "weather_risk_score": 0.20
            },
            {
                "route_id": "Route_North_01",
                "stop_id": "Stop_02",
                "package_id": "PKG_9002",
                "station_code": "DBO1",
                "preferred_delivery_method": "Front Door",
                "customer_delivery_preference": "Anytime",
                "location_type": "Residential",
                "latitude": 34.1015,
                "longitude": -118.2911,
                "planned_service_time_seconds": 60.0,
                "depth_cm": 20.0,
                "height_cm": 8.0,
                "width_cm": 15.0,
                "package_volume_cm3": 2400.0,
                "departure_hour": 10,
                "is_weekend": 0,
                "month": 7,
                "time_window_duration_hours": 8.0,
                "customer_availability_rate": 0.85,
                "customer_previous_delivery_attempts": 6,
                "customer_previous_failed_attempts": 0,
                "customer_previous_success_rate": 1.0,
                "address_access_difficulty": 1,
                "signature_required": 0,
                "historical_zone_failure_rate": 0.03,
                "historical_station_failure_rate": 0.03,
                "seasonal_failure_rate": 0.03,
                "traffic_risk_score": 0.20,
                "weather_risk_score": 0.10
            },
            {
                "route_id": "Route_South_02",
                "stop_id": "Stop_03",
                "package_id": "PKG_9003",
                "station_code": "DBO1",
                "preferred_delivery_method": "Garage",
                "customer_delivery_preference": "Evening Only",
                "location_type": "Commercial",
                "latitude": 34.0897,
                "longitude": -118.2855,
                "planned_service_time_seconds": 120.0,
                "depth_cm": 35.0,
                "height_cm": 15.0,
                "width_cm": 25.0,
                "package_volume_cm3": 13125.0,
                "departure_hour": 17,
                "is_weekend": 0,
                "month": 7,
                "time_window_duration_hours": 4.0,
                "customer_availability_rate": 0.60,
                "customer_previous_delivery_attempts": 8,
                "customer_previous_failed_attempts": 1,
                "customer_previous_success_rate": 0.875,
                "address_access_difficulty": 3,
                "signature_required": 1,
                "historical_zone_failure_rate": 0.06,
                "historical_station_failure_rate": 0.03,
                "seasonal_failure_rate": 0.04,
                "traffic_risk_score": 0.60,
                "weather_risk_score": 0.25
            }
        ]

        for row in sample_rows:
            writer.writerow(row)

        return output.getvalue()

    @staticmethod
    def export_shipments_to_csv(shipments: List[Dict[str, Any]]) -> str:
        """
        Serializes active shipments into an enriched CSV format containing:
        - Core identifiers and geospatial locations
        - Model predictions and calibrated failure probabilities
        - Risk tiers and capacity allocation status
        - Top-3 SHAP attribution drivers
        - Customer intervention status and outcomes
        """
        output = io.StringIO()
        fieldnames = [
            "package_id",
            "route_id",
            "stop_id",
            "station_code",
            "location_type",
            "latitude",
            "longitude",
            "preferred_delivery_method",
            "customer_delivery_preference",
            "customer_availability_rate",
            "signature_required",
            "address_access_difficulty",
            "failure_probability",
            "raw_probability",
            "risk_tier",
            "badge_color",
            "recommended_action",
            "capacity_rank",
            "capacity_approved",
            "capacity_status",
            "fleet_allocation_rate",
            "shap_top1_factor",
            "shap_top1_score",
            "shap_top2_factor",
            "shap_top2_score",
            "shap_top3_factor",
            "shap_top3_score",
            "top_risk_drivers_summary",
            "status",
            "applied_intervention_title",
            "final_failure_probability",
            "final_risk_tier"
        ]

        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for s in shipments:
            pred = s.get("prediction", {})
            risk_factors = pred.get("risk_factors", [])
            
            top1_factor = risk_factors[0].get("factor", "") if len(risk_factors) > 0 else ""
            top1_score = risk_factors[0].get("attribution_score", risk_factors[0].get("shap_logit", "")) if len(risk_factors) > 0 else ""
            top2_factor = risk_factors[1].get("factor", "") if len(risk_factors) > 1 else ""
            top2_score = risk_factors[1].get("attribution_score", risk_factors[1].get("shap_logit", "")) if len(risk_factors) > 1 else ""
            top3_factor = risk_factors[2].get("factor", "") if len(risk_factors) > 2 else ""
            top3_score = risk_factors[2].get("attribution_score", risk_factors[2].get("shap_logit", "")) if len(risk_factors) > 2 else ""

            summary_drivers = "; ".join([
                f"{rf.get('factor')}: +{rf.get('attribution_score', rf.get('shap_logit', ''))}"
                for rf in risk_factors[:3] if rf.get("factor")
            ])

            applied = s.get("applied_intervention")
            applied_title = applied.get("title", "") if isinstance(applied, dict) else (str(applied) if applied else "")

            row_dict = {
                "package_id": s.get("package_id", ""),
                "route_id": s.get("route_id", ""),
                "stop_id": s.get("stop_id", ""),
                "station_code": s.get("station_code", ""),
                "location_type": s.get("location_type", ""),
                "latitude": s.get("latitude", ""),
                "longitude": s.get("longitude", ""),
                "preferred_delivery_method": s.get("preferred_delivery_method", ""),
                "customer_delivery_preference": s.get("customer_delivery_preference", ""),
                "customer_availability_rate": s.get("customer_availability_rate", ""),
                "signature_required": s.get("signature_required", ""),
                "address_access_difficulty": s.get("address_access_difficulty", ""),
                "failure_probability": pred.get("failure_probability", ""),
                "raw_probability": pred.get("raw_probability", ""),
                "risk_tier": pred.get("risk_tier", ""),
                "badge_color": pred.get("badge_color", ""),
                "recommended_action": pred.get("recommended_action", ""),
                "capacity_rank": pred.get("capacity_rank", ""),
                "capacity_approved": pred.get("capacity_approved", ""),
                "capacity_status": pred.get("capacity_status", ""),
                "fleet_allocation_rate": pred.get("fleet_allocation_rate", ""),
                "shap_top1_factor": top1_factor,
                "shap_top1_score": top1_score,
                "shap_top2_factor": top2_factor,
                "shap_top2_score": top2_score,
                "shap_top3_factor": top3_factor,
                "shap_top3_score": top3_score,
                "top_risk_drivers_summary": summary_drivers,
                "status": s.get("status", "PRE_DISPATCH"),
                "applied_intervention_title": applied_title,
                "final_failure_probability": s.get("final_failure_probability", ""),
                "final_risk_tier": s.get("final_risk_tier", "")
            }
            writer.writerow(row_dict)

        return output.getvalue()


class ManifestStateManager:
    """
    Thread-safe in-memory state manager for the active manifest and canonical benchmark.
    """

    def __init__(self, sample_file: str, engine: Any, db: Optional[Any] = None):
        self._lock = threading.RLock()
        self._engine = engine
        self._db = db
        self._sample_file = sample_file
        self._benchmark_shipments: List[Dict[str, Any]] = []
        self._benchmark_metadata: Dict[str, Any] = {}
        self._active_shipments: List[Dict[str, Any]] = []
        self._active_metadata: Dict[str, Any] = {}

        self._load_canonical_benchmark()

    def _load_canonical_benchmark(self):
        """Loads and pre-scores the canonical 30-stop benchmark from disk."""
        with self._lock:
            if os.path.exists(self._sample_file):
                raw_df = pd.read_csv(self._sample_file)
                raw_records = []
                for _, row in raw_df.iterrows():
                    rec = row.to_dict()
                    clean_rec = {k: (None if pd.isna(v) else v) for k, v in rec.items()}
                    raw_records.append(clean_rec)

                # Strip any leakage columns from benchmark
                for rec in raw_records:
                    for leak in LEAKAGE_COLUMNS:
                        rec.pop(leak, None)

                # Score benchmark using capacity constrained policy
                predictions = score_manifest_records(self._engine, raw_records)
                for idx, clean_rec in enumerate(raw_records):
                    clean_rec["prediction"] = predictions[idx]
                    self._benchmark_shipments.append(clean_rec)
                    if self._db is not None:
                        self._db.save_shipment(clean_rec)

                # Sort by failure probability descending
                self._benchmark_shipments.sort(
                    key=lambda x: x["prediction"]["failure_probability"],
                    reverse=True
                )

                routes = sorted(list(set(str(r.get("route_id", "ROUTE_DEFAULT")) for r in self._benchmark_shipments)))
                self._benchmark_metadata = {
                    "manifest_id": "benchmark-canonical-manifest",
                    "filename": os.path.basename(self._sample_file),
                    "uploaded_at": datetime.now(timezone.utc).isoformat(),
                    "total_packages": len(self._benchmark_shipments),
                    "routes_detected": routes,
                    "is_benchmark": True
                }

                # Set active manifest initially to benchmark
                self._active_shipments = copy.deepcopy(self._benchmark_shipments)
                self._active_metadata = copy.deepcopy(self._benchmark_metadata)
            else:
                self._benchmark_shipments = []
                self._benchmark_metadata = {
                    "manifest_id": "empty-benchmark",
                    "filename": "none",
                    "uploaded_at": datetime.now(timezone.utc).isoformat(),
                    "total_packages": 0,
                    "routes_detected": [],
                    "is_benchmark": True
                }
                self._active_shipments = []
                self._active_metadata = copy.deepcopy(self._benchmark_metadata)

    def get_active_shipments(self) -> List[Dict[str, Any]]:
        """Returns the active scored shipment records."""
        with self._lock:
            return copy.deepcopy(self._active_shipments)

    def get_metadata(self) -> Dict[str, Any]:
        """Returns the active manifest metadata."""
        with self._lock:
            return copy.deepcopy(self._active_metadata)

    def set_active_manifest(self, shipments: List[Dict[str, Any]], metadata: Dict[str, Any]):
        """Sets new active shipments and manifest metadata in a thread-safe manner."""
        with self._lock:
            self._active_shipments = copy.deepcopy(shipments)
            self._active_metadata = copy.deepcopy(metadata)

    def reset_to_benchmark(self):
        """Resets active manifest state back to the canonical benchmark."""
        with self._lock:
            self._active_shipments = copy.deepcopy(self._benchmark_shipments)
            self._active_metadata = copy.deepcopy(self._benchmark_metadata)

    def update_shipment(self, package_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates a specific shipment in the active manifest by package_id."""
        with self._lock:
            for item in self._active_shipments:
                if item.get("package_id") == package_id:
                    item.update(updates)
                    return copy.deepcopy(item)
            return None

    def rescore_with_model(self, engine: Any):
        """Re-scores active shipments when the active model is switched."""
        with self._lock:
            if not self._active_shipments:
                return
            
            raw_records = [{k: v for k, v in item.items() if k != "prediction"} for item in self._active_shipments]
            batch_predictions = score_manifest_records(engine, raw_records)
            for idx, item in enumerate(self._active_shipments):
                item["prediction"] = batch_predictions[idx]

            self._active_shipments.sort(
                key=lambda x: x["prediction"]["failure_probability"],
                reverse=True
            )
