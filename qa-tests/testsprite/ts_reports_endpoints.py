"""TestSprite backend: manager report endpoints.

Covers:
- POST /api/auth/login (manager)
- GET /api/reports/daily-sales
- GET /api/reports/agent-performance
- GET /api/reports/operator-distribution
- GET /api/reports/seller-performance
- GET /api/stats

The base URL is baked into the code (BASE_URL) per the TestSprite CLI contract.
"""
import os
import requests

BASE_URL = os.environ.get("BASE_URL", "https://yemen-telecom.onrender.com").rstrip("/")


def test_manager_reports_return_live_data():
    s = requests.Session()

    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "manager", "password": "Yt@12345"},
        headers={"X-Device-Id": "ts-device-reports-1", "X-Device-Name": "TestSprite-Reports"},
        timeout=30,
    )
    assert r.status_code == 200, f"manager login failed: {r.status_code} {r.text[:300]}"
    token = r.json().get("token")
    assert token
    auth = {"Authorization": f"Bearer {token}"}

    r = s.get(f"{BASE_URL}/api/reports/daily-sales", headers=auth, timeout=30)
    assert r.status_code == 200, f"daily-sales failed: {r.status_code} {r.text[:200]}"
    daily = r.json()
    assert isinstance(daily, list), f"daily-sales not a list: {str(daily)[:200]}"

    r = s.get(f"{BASE_URL}/api/reports/agent-performance", headers=auth, timeout=30)
    assert r.status_code == 200, f"agent-performance failed: {r.status_code} {r.text[:200]}"
    assert isinstance(r.json(), list)

    r = s.get(f"{BASE_URL}/api/reports/operator-distribution", headers=auth, timeout=30)
    assert r.status_code == 200, f"operator-distribution failed: {r.status_code} {r.text[:200]}"
    dist = r.json()
    assert isinstance(dist, dict) and "sims" in dist and "operations" in dist, \
        f"operator-distribution shape wrong: {str(dist)[:200]}"
    assert isinstance(dist["sims"], list) and isinstance(dist["operations"], list)

    r = s.get(f"{BASE_URL}/api/reports/seller-performance", headers=auth, timeout=30)
    assert r.status_code == 200, f"seller-performance failed: {r.status_code} {r.text[:200]}"
    assert isinstance(r.json(), list)

    r = s.get(f"{BASE_URL}/api/stats", headers=auth, timeout=30)
    assert r.status_code == 200, f"/stats failed: {r.status_code} {r.text[:200]}"
    stats = r.json()
    for key in ("total_sims", "active_sellers", "available_stock", "operators", "total_agents"):
        assert key in stats, f"/stats missing key {key!r}: {str(stats)[:200]}"
    assert isinstance(stats["operators"], list)
