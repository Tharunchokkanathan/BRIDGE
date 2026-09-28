import os
import sqlite3
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

# Load .env file automatically
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

class DatabaseManager:
    """
    Production Dual-Backend Manager:
    - Automatically connects to Supabase Cloud if SUPABASE_URL and SUPABASE_KEY are provided.
    - Gracefully falls back to local SQLite database (data/bridge_local.db) if offline or credentials not set.
    """
    def __init__(self, db_path="data/bridge_local.db"):
        self.db_path = db_path
        self.is_supabase = bool(SUPABASE_URL and SUPABASE_KEY)
        self.supabase_client = None
        
        if self.is_supabase:
            try:
                from supabase import create_client
                self.supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
                print(f"[DATABASE] Connected to Supabase Cloud: {SUPABASE_URL[:25]}...")
            except Exception as e:
                print(f"[DATABASE WARNING] Failed to connect to Supabase: {e}. Falling back to SQLite.")
                self.is_supabase = False

        if not self.is_supabase:
            self._init_sqlite()
            print(f"[DATABASE] Using SQLite backend at {self.db_path}")

    def _init_sqlite(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        
        # Shipments table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS shipments (
                package_id TEXT PRIMARY KEY,
                route_id TEXT,
                station_code TEXT,
                departure_hour INTEGER,
                customer_availability_rate REAL,
                customer_delivery_preference TEXT,
                signature_required INTEGER,
                address_access_difficulty INTEGER,
                failure_probability REAL,
                risk_tier TEXT,
                applied_intervention TEXT,
                final_failure_probability REAL,
                final_risk_tier TEXT,
                status TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        # Customer Interventions table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS customer_interventions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                package_id TEXT,
                intervention_id TEXT,
                intervention_title TEXT,
                original_failure_prob REAL,
                new_failure_prob REAL,
                risk_reduction_pct REAL,
                customer_response_channel TEXT,
                selected_at TEXT,
                FOREIGN KEY (package_id) REFERENCES shipments(package_id)
            )
        ''')
        conn.commit()
        conn.close()

    def save_shipment(self, data: Dict[str, Any]):
        """Persists a pre-dispatch shipment record."""
        now = datetime.utcnow().isoformat()
        pred = data.get("prediction", {})
        
        record = {
            "package_id": data.get("package_id", "PKG-DEMO"),
            "route_id": data.get("route_id", "R-101"),
            "station_code": data.get("station_code", "DBO1"),
            "departure_hour": int(data.get("departure_hour", 12)),
            "customer_availability_rate": float(data.get("customer_availability_rate", 0.5)),
            "customer_delivery_preference": data.get("customer_delivery_preference", "Anytime"),
            "signature_required": int(data.get("signature_required", 0)),
            "address_access_difficulty": int(data.get("address_access_difficulty", 1)),
            "failure_probability": float(pred.get("failure_probability", 0.1)),
            "risk_tier": pred.get("risk_tier", "LOW"),
            "applied_intervention": json.dumps(data.get("applied_intervention")) if data.get("applied_intervention") else None,
            "final_failure_probability": float(data.get("final_failure_probability")) if data.get("final_failure_probability") is not None else None,
            "final_risk_tier": data.get("final_risk_tier"),
            "status": data.get("status", "QUEUED_FOR_DISPATCH"),
            "created_at": now,
            "updated_at": now
        }

        if self.is_supabase and self.supabase_client:
            try:
                self.supabase_client.table("shipments").upsert(record).execute()
                return True
            except Exception as e:
                print(f"[SUPABASE ERROR] upsert failed: {e}")

        # Local SQLite
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO shipments (
                package_id, route_id, station_code, departure_hour,
                customer_availability_rate, customer_delivery_preference, signature_required,
                address_access_difficulty, failure_probability, risk_tier, applied_intervention,
                final_failure_probability, final_risk_tier, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(package_id) DO UPDATE SET
                applied_intervention=excluded.applied_intervention,
                final_failure_probability=excluded.final_failure_probability,
                final_risk_tier=excluded.final_risk_tier,
                status=excluded.status,
                updated_at=excluded.updated_at
        ''', (
            record["package_id"], record["route_id"], record["station_code"], record["departure_hour"],
            record["customer_availability_rate"], record["customer_delivery_preference"], record["signature_required"],
            record["address_access_difficulty"], record["failure_probability"], record["risk_tier"],
            record["applied_intervention"], record["final_failure_probability"], record["final_risk_tier"],
            record["status"], record["created_at"], record["updated_at"]
        ))
        conn.commit()
        conn.close()
        return True

    def record_intervention(self, package_id: str, intervention: Dict[str, Any]):
        """Persists a customer's selected delivery preference."""
        now = datetime.utcnow().isoformat()
        interv_rec = {
            "package_id": package_id,
            "intervention_id": intervention.get("id", "custom"),
            "intervention_title": intervention.get("title", ""),
            "original_failure_prob": float(intervention.get("original_prob", 0.0)),
            "new_failure_prob": float(intervention.get("new_prob", 0.0)),
            "risk_reduction_pct": float(intervention.get("risk_reduction_pct", 0.0)),
            "customer_response_channel": "CUSTOMER_MOBILE_PORTAL",
            "selected_at": now
        }

        if self.is_supabase and self.supabase_client:
            try:
                self.supabase_client.table("customer_interventions").insert(interv_rec).execute()
                return True
            except Exception as e:
                print(f"[SUPABASE ERROR] insert intervention failed: {e}")

        # Local SQLite
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO customer_interventions (
                package_id, intervention_id, intervention_title,
                original_failure_prob, new_failure_prob, risk_reduction_pct,
                customer_response_channel, selected_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            interv_rec["package_id"], interv_rec["intervention_id"], interv_rec["intervention_title"],
            interv_rec["original_failure_prob"], interv_rec["new_failure_prob"], interv_rec["risk_reduction_pct"],
            interv_rec["customer_response_channel"], interv_rec["selected_at"]
        ))
        conn.commit()
        conn.close()
        return True

    def get_status(self) -> Dict[str, Any]:
        """Returns database health, type, and table counts."""
        backend = "Supabase Cloud (PostgreSQL)" if self.is_supabase else "SQLite Local Fallback"
        
        # Count records
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM shipments")
        shipments_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM customer_interventions")
        interventions_count = cur.fetchone()[0]
        conn.close()

        return {
            "backend": backend,
            "is_supabase_connected": self.is_supabase,
            "shipments_stored": shipments_count,
            "interventions_logged": interventions_count,
            "status": "ONLINE",
            "last_synced": datetime.utcnow().isoformat()
        }

# Singleton instance
db = DatabaseManager()
