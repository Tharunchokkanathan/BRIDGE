import os
import sqlite3
import json
from datetime import datetime, timezone
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
    - Connects to Supabase Cloud if SUPABASE_URL and SUPABASE_KEY are provided.
    - Gracefully falls back to local SQLite database (data/bridge_local.db).
    - Manages live feedback loop: records completed delivery outcomes, updates customer histories,
      and recalculates dynamic Bayesian zone failure priors.
    """
    def __init__(self, db_path=None):
        self.db_path = db_path or os.getenv("BRIDGE_DB_PATH", "data/bridge_local.db")
        self.supabase_client = None
        self.is_supabase = bool(SUPABASE_URL and SUPABASE_KEY)
        
        if self.is_supabase:
            try:
                from supabase import create_client
                self.supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
                print(f"[DATABASE] Connected to Supabase Cloud: {SUPABASE_URL[:25]}...")
            except Exception as e:
                print(f"[DATABASE WARNING] Failed to connect to Supabase: {e}. Falling back to SQLite.")
                self.is_supabase = False

        self._init_sqlite()
        if not self.is_supabase:
            print(f"[DATABASE] Using SQLite backend at {self.db_path}")

    def _init_sqlite(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        
        # 1. Shipments Table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS shipments (
                package_id TEXT PRIMARY KEY,
                route_id TEXT,
                station_code TEXT,
                departure_hour INTEGER,
                customer_availability_rate REAL,
                customer_delivery_preference TEXT,
                location_type TEXT DEFAULT 'Residential',
                signature_required INTEGER,
                address_access_difficulty INTEGER,
                customer_previous_delivery_attempts INTEGER DEFAULT 0,
                customer_previous_failed_attempts INTEGER DEFAULT 0,
                customer_previous_success_rate REAL DEFAULT 1.0,
                zone_id TEXT,
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
        
        # Ensure newer columns exist if migrating an existing local db
        cur.execute("PRAGMA table_info(shipments)")
        existing_cols = [c[1] for c in cur.fetchall()]
        for col_name, col_type in [
            ("location_type", "TEXT DEFAULT 'Residential'"),
            ("customer_previous_delivery_attempts", "INTEGER DEFAULT 0"),
            ("customer_previous_failed_attempts", "INTEGER DEFAULT 0"),
            ("customer_previous_success_rate", "REAL DEFAULT 1.0"),
            ("zone_id", "TEXT")
        ]:
            if col_name not in existing_cols:
                cur.execute(f"ALTER TABLE shipments ADD COLUMN {col_name} {col_type}")

        # 2. Customer Interventions Table
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

        # 3. Delivery Outcomes (Feedback Loop) Table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS delivery_outcomes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                package_id TEXT,
                outcome TEXT,
                failure_reason TEXT,
                delivery_notes TEXT,
                completed_at TEXT,
                FOREIGN KEY (package_id) REFERENCES shipments(package_id)
            )
        ''')

        # 4. Zone Failure Priors Table (Dynamic Bayesian Smoothing)
        cur.execute('''
            CREATE TABLE IF NOT EXISTS zone_priors (
                zone_id TEXT PRIMARY KEY,
                prior_failure_rate REAL,
                total_deliveries INTEGER,
                failed_deliveries INTEGER,
                last_updated TEXT
            )
        ''')

        conn.commit()
        conn.close()

    def save_shipment(self, data: Dict[str, Any]):
        """Persists a pre-dispatch shipment record."""
        now = datetime.now(timezone.utc).isoformat()
        pred = data.get("prediction", {})
        
        record = {
            "package_id": data.get("package_id", "PKG-DEMO"),
            "route_id": data.get("route_id", "R-101"),
            "station_code": data.get("station_code", "DBO1"),
            "departure_hour": int(data.get("departure_hour", 12)),
            "customer_availability_rate": float(data.get("customer_availability_rate", 0.5)),
            "customer_delivery_preference": data.get("customer_delivery_preference", "Anytime"),
            "location_type": data.get("location_type", "Residential"),
            "signature_required": int(data.get("signature_required", 0)),
            "address_access_difficulty": int(data.get("address_access_difficulty", 1)),
            "customer_previous_delivery_attempts": int(data.get("customer_previous_delivery_attempts", 0)),
            "customer_previous_failed_attempts": int(data.get("customer_previous_failed_attempts", 0)),
            "customer_previous_success_rate": float(data.get("customer_previous_success_rate", 1.0)),
            "zone_id": data.get("zone_id", "A-1.2A"),
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
                customer_availability_rate, customer_delivery_preference, location_type,
                signature_required, address_access_difficulty, customer_previous_delivery_attempts,
                customer_previous_failed_attempts, customer_previous_success_rate, zone_id,
                failure_probability, risk_tier, applied_intervention,
                final_failure_probability, final_risk_tier, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(package_id) DO UPDATE SET
                applied_intervention=excluded.applied_intervention,
                final_failure_probability=excluded.final_failure_probability,
                final_risk_tier=excluded.final_risk_tier,
                customer_previous_delivery_attempts=excluded.customer_previous_delivery_attempts,
                customer_previous_failed_attempts=excluded.customer_previous_failed_attempts,
                customer_previous_success_rate=excluded.customer_previous_success_rate,
                status=excluded.status,
                updated_at=excluded.updated_at
        ''', (
            record["package_id"], record["route_id"], record["station_code"], record["departure_hour"],
            record["customer_availability_rate"], record["customer_delivery_preference"], record["location_type"],
            record["signature_required"], record["address_access_difficulty"],
            record["customer_previous_delivery_attempts"], record["customer_previous_failed_attempts"],
            record["customer_previous_success_rate"], record["zone_id"],
            record["failure_probability"], record["risk_tier"],
            record["applied_intervention"], record["final_failure_probability"], record["final_risk_tier"],
            record["status"], record["created_at"], record["updated_at"]
        ))
        conn.commit()
        conn.close()
        return True

    def record_intervention(self, package_id: str, intervention: Dict[str, Any]):
        """Persists a customer's selected delivery preference."""
        now = datetime.now(timezone.utc).isoformat()
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

    def complete_delivery(self, package_id: str, outcome: str, failure_reason: Optional[str] = "NONE", delivery_notes: Optional[str] = "") -> Dict[str, Any]:
        """
        Feedback Loop Engine:
        1. Logs the outcome of a delivery attempt.
        2. Dynamically updates customer history (attempts, fails, success rate).
        3. Dynamically updates Bayesian smoothed zone failure priors.
        """
        now = datetime.now(timezone.utc).isoformat()
        is_failed = outcome.upper() in ["FAILED", "FAIL", "FIRST_ATTEMPT_FAILED"]
        final_status = "FIRST_ATTEMPT_FAILED" if is_failed else "DELIVERED_SUCCESS"

        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        
        # 1. Lookup existing shipment
        cur.execute("SELECT package_id, zone_id, customer_previous_delivery_attempts, customer_previous_failed_attempts FROM shipments WHERE package_id = ?", (package_id,))
        row = cur.fetchone()
        
        zone_id = row[1] if row and row[1] else "A-1.2A"
        prev_attempts = (row[2] if row and row[2] is not None else 0) + 1
        prev_fails = (row[3] if row and row[3] is not None else 0) + (1 if is_failed else 0)
        new_success_rate = round(1.0 - (prev_fails / max(1, prev_attempts)), 4)

        # 2. Update shipment record
        cur.execute('''
            UPDATE shipments
            SET status = ?,
                customer_previous_delivery_attempts = ?,
                customer_previous_failed_attempts = ?,
                customer_previous_success_rate = ?,
                updated_at = ?
            WHERE package_id = ?
        ''', (final_status, prev_attempts, prev_fails, new_success_rate, now, package_id))

        # 3. Insert into delivery_outcomes
        cur.execute('''
            INSERT INTO delivery_outcomes (package_id, outcome, failure_reason, delivery_notes, completed_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (package_id, outcome, failure_reason, delivery_notes, now))

        # 4. Bayesian Conjugate Prior Update for the Zone
        cur.execute("SELECT prior_failure_rate, total_deliveries, failed_deliveries FROM zone_priors WHERE zone_id = ?", (zone_id,))
        zp_row = cur.fetchone()
        
        prior_base = 0.09
        prior_weight = 20 # Equivalent pseudo-observations
        alpha = prior_base * prior_weight
        beta = (1.0 - prior_base) * prior_weight

        if zp_row:
            tot = zp_row[1] + 1
            fls = zp_row[2] + (1 if is_failed else 0)
        else:
            tot = 1
            fls = 1 if is_failed else 0

        new_zone_prior = round((alpha + fls) / (alpha + beta + tot), 4)

        cur.execute('''
            INSERT INTO zone_priors (zone_id, prior_failure_rate, total_deliveries, failed_deliveries, last_updated)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(zone_id) DO UPDATE SET
                prior_failure_rate = excluded.prior_failure_rate,
                total_deliveries = excluded.total_deliveries,
                failed_deliveries = excluded.failed_deliveries,
                last_updated = excluded.last_updated
        ''', (zone_id, new_zone_prior, tot, fls, now))

        conn.commit()
        conn.close()

        # Sync to Supabase Cloud if available
        if self.is_supabase and self.supabase_client:
            try:
                self.supabase_client.table("delivery_outcomes").insert({
                    "package_id": package_id,
                    "outcome": outcome,
                    "failure_reason": failure_reason,
                    "delivery_notes": delivery_notes,
                    "completed_at": now
                }).execute()
            except Exception as e:
                print(f"[SUPABASE FEEDBACK WARNING] Failed to sync outcome: {e}")

        return {
            "status": "success",
            "package_id": package_id,
            "outcome": outcome,
            "failure_reason": failure_reason,
            "delivery_status": final_status,
            "updated_customer_history": {
                "previous_attempts": prev_attempts,
                "previous_fails": prev_fails,
                "new_success_rate": new_success_rate
            },
            "updated_zone_prior": {
                "zone_id": zone_id,
                "new_zone_failure_rate": new_zone_prior,
                "total_zone_deliveries": tot,
                "failed_zone_deliveries": fls
            },
            "completed_at": now
        }

    def get_status(self) -> Dict[str, Any]:
        """Returns database health, type, and table counts."""
        backend = "Supabase Cloud (PostgreSQL)" if self.is_supabase else "SQLite Local Fallback"
        
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM shipments")
        shipments_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM customer_interventions")
        interventions_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM delivery_outcomes")
        outcomes_count = cur.fetchone()[0]
        conn.close()

        return {
            "backend": backend,
            "is_supabase_connected": self.is_supabase,
            "shipments_stored": shipments_count,
            "interventions_logged": interventions_count,
            "delivery_outcomes_recorded": outcomes_count,
            "status": "ONLINE",
            "last_synced": datetime.now(timezone.utc).isoformat()
        }


# Singleton instance
db = DatabaseManager()
