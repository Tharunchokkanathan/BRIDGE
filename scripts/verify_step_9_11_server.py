import os
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from fastapi.testclient import TestClient
from server import app

def test_spa_serving():
    client = TestClient(app)

    print("1. Testing GET / (Root SPA entry)...")
    res = client.get("/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "<!doctype html>" in res.text.lower() or "<html" in res.text.lower()
    print("   ✓ Root serves HTML successfully")

    print("\n2. Testing GET /risk-queue (Client SPA route fallback)...")
    res = client.get("/risk-queue")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "<!doctype html>" in res.text.lower() or "<html" in res.text.lower()
    print("   ✓ /risk-queue falls back to index.html for SPA router")

    print("\n3. Testing GET /route-optimizer (Client SPA route fallback)...")
    res = client.get("/route-optimizer")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "<!doctype html>" in res.text.lower() or "<html" in res.text.lower()
    print("   ✓ /route-optimizer falls back to index.html for SPA router")

    print("\n4. Testing GET /api/health (API routes remain strictly undisturbed)...")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["status"] == "healthy"
    print(f"   ✓ API health intact: status={data['status']}, active_model={data['active_model']}")

    print("\n5. Testing GET /api/dashboard/stats...")
    res = client.get("/api/dashboard/stats")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    stats = res.json()
    assert "high_risk_count" in stats
    print(f"   ✓ Dashboard stats: high_risk={stats['high_risk_count']}, active_model={stats['active_model']}")

    print("\n=======================================================")
    print("All Step 9.11 FastAPI Static & SPA Mounting Tests PASSED!")
    print("=======================================================")

if __name__ == "__main__":
    test_spa_serving()
