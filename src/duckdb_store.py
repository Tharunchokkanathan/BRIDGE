"""
BRIDGE — DuckDB Feature Store & Analytical Query Layer (Phase 3.1)
High-performance in-process analytical query engine for pre-dispatch feature data.

Key Responsibilities:
1. Fast SQL-based columnar projection and filtering on CSV/Parquet manifests.
2. Strict feature contract enforcement (authoritative 44 features).
3. Zero-leakage quarantine: guarantees outcome columns (scan_status, etc.)
   are never returned as model inputs.
4. Support for high-speed batch inference querying and analytical aggregation.
5. Seamless integration with data_pipeline.py for model training and validation.
"""

import os
import time
from typing import Dict, Any, List, Optional, Tuple, Union
import duckdb
import numpy as np
import pandas as pd

from feature_engineering import (
    ALL_FEATURE_COLS,
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    EXCLUDE_COLS,
    compute_engineered_features,
    verify_feature_integrity
)

DEFAULT_SAMPLE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "amazon_delivery_ml_features_sample.csv"
)
TARGET_COLUMN = "first_attempt_failed"


class DuckDBFeatureStore:
    """
    Reusable DuckDB query engine for BRIDGE feature stores and manifests.
    """

    def __init__(
        self,
        db_path: str = ":memory:",
        read_only: bool = False,
        threads: Optional[int] = None
    ):
        """
        Initialize DuckDB connection.
        :param db_path: Path to DuckDB database file, or ':memory:' for transient in-memory.
        :param read_only: Open connection in read-only mode if connecting to a file.
        :param threads: Number of worker threads (defaults to all CPU cores).
        """
        self.db_path = db_path
        self.con = duckdb.connect(database=db_path, read_only=read_only)
        if threads:
            self.con.execute(f"SET threads = {threads};")
        self._registered_tables: Dict[str, str] = {}

    def close(self):
        """Safely close DuckDB connection."""
        if self.con:
            self.con.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def register_table_from_source(
        self,
        table_name: str,
        source_path: str,
        as_view: bool = False
    ) -> int:
        """
        Registers a CSV or Parquet manifest as an in-memory table or view.
        :param table_name: Table name in DuckDB catalog.
        :param source_path: Path to .csv or .parquet file.
        :param as_view: If True, creates a zero-copy view; if False, ingests into an in-memory table.
        :return: Total row count in registered relation.
        """
        normalized_path = os.path.abspath(source_path).replace("\\", "/")
        if not os.path.exists(source_path):
            raise FileNotFoundError(f"Manifest source path does not exist: {source_path}")

        action = "VIEW" if as_view else "TABLE"
        sql = f"CREATE OR REPLACE {action} {table_name} AS SELECT * FROM '{normalized_path}'"
        self.con.execute(sql)
        self._registered_tables[table_name] = normalized_path

        count = self.con.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
        return count

    def query_df(self, sql: str, params: Optional[List[Any]] = None) -> pd.DataFrame:
        """
        Execute arbitrary SQL and return result as a pandas DataFrame.
        """
        if params:
            return self.con.execute(sql, params).df()
        return self.con.execute(sql).df()

    def get_feature_matrix(
        self,
        source: Optional[str] = None,
        table_name: Optional[str] = None,
        include_target: bool = False,
        include_route_id: bool = False,
        include_metadata: bool = False,
        where_clause: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> pd.DataFrame:
        """
        Extracts pre-dispatch feature records strictly conforming to the 44-feature contract.
        Guarantees zero-leakage by quarantining post-dispatch outcome tags.

        :param source: File path (CSV/Parquet) if querying file directly.
        :param table_name: Table name if querying a previously registered table.
        :param include_target: If True, includes target column 'first_attempt_failed'.
        :param include_route_id: If True, includes 'route_id' for grouping.
        :param include_metadata: If True, includes stop_id, package_id, delivery_date.
        :param where_clause: Optional SQL WHERE condition (e.g., "station_code = 'DBO1'").
        :param limit: Optional LIMIT for pagination/batch inference.
        :param offset: Optional OFFSET for pagination.
        :return: pandas DataFrame containing requested columns.
        """
        if table_name:
            from_target = table_name
        elif source:
            normalized_path = os.path.abspath(source).replace("\\", "/")
            from_target = f"'{normalized_path}'"
        elif "shipments" in self._registered_tables:
            from_target = "shipments"
        else:
            normalized_path = os.path.abspath(DEFAULT_SAMPLE_PATH).replace("\\", "/")
            from_target = f"'{normalized_path}'"

        # Determine projected columns strictly
        projected_cols = list(ALL_FEATURE_COLS)
        extra_cols = []

        if include_target:
            extra_cols.append(TARGET_COLUMN)
        if include_route_id:
            extra_cols.append("route_id")
        if include_metadata:
            for meta_col in ["stop_id", "package_id", "delivery_date"]:
                if meta_col not in extra_cols:
                    extra_cols.append(meta_col)

        full_cols_to_fetch = projected_cols + extra_cols
        cols_sql = ", ".join([f'"{c}"' for c in full_cols_to_fetch])

        query = f"SELECT {cols_sql} FROM {from_target}"
        if where_clause:
            query += f" WHERE {where_clause}"
        if limit is not None:
            query += f" LIMIT {limit}"
        if offset is not None:
            query += f" OFFSET {offset}"

        df = self.con.execute(query).df()

        # Strict Leakage Audit: features alone must NEVER contain forbidden columns
        feature_cols_present = [c for c in df.columns if c in ALL_FEATURE_COLS]
        verify_feature_integrity(feature_cols_present)

        return df

    def get_training_data(
        self,
        source_path: str = DEFAULT_SAMPLE_PATH
    ) -> Tuple[pd.DataFrame, np.ndarray, np.ndarray, pd.DataFrame]:
        """
        High-performance data loader for ML training pipeline.
        Extracts 44-feature matrix, target array, route group array, and metadata.

        :param source_path: Path to dataset manifest.
        :return: Tuple of (X_features_df, y_array, route_groups_array, meta_df).
        """
        df = self.get_feature_matrix(
            source=source_path,
            include_target=True,
            include_route_id=True,
            include_metadata=True
        )

        X = df[ALL_FEATURE_COLS].copy()
        y = df[TARGET_COLUMN].astype(int).values
        groups = df["route_id"].values
        meta = df[["route_id", "stop_id", "package_id", "delivery_date"]].copy()

        return X, y, groups, meta

    def get_batch_for_inference(
        self,
        source_path: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        station_code: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Extracts a clean, zero-leakage batch of features for batch model inference.
        """
        where = f"station_code = '{station_code}'" if station_code else None
        return self.get_feature_matrix(
            source=source_path,
            include_target=False,
            include_route_id=True,
            include_metadata=True,
            where_clause=where,
            limit=limit,
            offset=offset
        )

    def get_manifest_summary(
        self,
        source_path: Optional[str] = None,
        table_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes fast vectorized aggregation across the dataset to produce summary statistics.
        """
        if table_name:
            target = table_name
        elif source_path:
            norm = os.path.abspath(source_path).replace("\\", "/")
            target = f"'{norm}'"
        else:
            norm = os.path.abspath(DEFAULT_SAMPLE_PATH).replace("\\", "/")
            target = f"'{norm}'"

        agg_sql = f"""
            SELECT 
                COUNT(*) AS total_rows,
                COUNT(DISTINCT route_id) AS distinct_routes,
                COUNT(DISTINCT station_code) AS distinct_stations,
                AVG(first_attempt_failed) AS baseline_failure_rate,
                AVG(planned_service_time_seconds) AS avg_service_time_sec,
                AVG(package_volume_cm3) AS avg_package_volume_cm3
            FROM {target}
        """
        stats_row = self.con.execute(agg_sql).df().iloc[0].to_dict()

        # Station distribution
        stations_sql = f"""
            SELECT station_code, COUNT(*) AS count, ROUND(AVG(first_attempt_failed), 4) AS fail_rate
            FROM {target}
            GROUP BY station_code
            ORDER BY count DESC
        """
        stations_df = self.con.execute(stations_sql).df()

        return {
            "total_rows": int(stats_row["total_rows"]),
            "distinct_routes": int(stats_row["distinct_routes"]),
            "distinct_stations": int(stats_row["distinct_stations"]),
            "baseline_failure_rate": round(float(stats_row["baseline_failure_rate"]), 4),
            "avg_service_time_sec": round(float(stats_row["avg_service_time_sec"]), 2),
            "avg_package_volume_cm3": round(float(stats_row["avg_package_volume_cm3"]), 2),
            "station_distribution": stations_df.to_dict(orient="records")
        }


# Global store instance for convenience
store = DuckDBFeatureStore()
