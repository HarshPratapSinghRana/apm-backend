"""Quick test for /api/stats and /api/search endpoints."""
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

print("Testing GET /api/stats ...")
r = client.get("/api/stats")
print(f"  Status: {r.status_code}")
print(f"  Body: {r.text[:300]}")

print("\nTesting POST /api/search ...")
r2 = client.post("/api/search", json={"query": "voice"})
print(f"  Status: {r2.status_code}")
print(f"  Body: {r2.text[:300]}")
