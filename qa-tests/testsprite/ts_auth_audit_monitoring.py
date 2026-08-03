"""TestSprite backend: auth, session audit trail, monitoring.

Covers:
- /api/health (public)
- POST /api/auth/login with valid manager credentials
- GET /api/auth/me with Bearer token
- GET /api/csrf-token with Bearer token
- GET /api/admin/audit-logs?page=1&limit=5 (session device/IP/MAC columns)
- GET /api/admin/monitoring
- POST /api/auth/logout

The base URL is baked into the code (BASE_URL) per the TestSprite CLI contract.
"""
import os
import requests

BASE_URL = os.environ.get("BASE_URL", "https://yemen-telecom.onrender.com").rstrip("/")


def test_health_and_manager_session_audit():
    s = requests.Session()

    r = s.get(f"{BASE_URL}/api/health", timeout=30)
    assert r.status_code == 200, f"health status={r.status_code} body={r.text[:200]}"
    body = r.json()
    assert body.get("status") in ("ok", "degraded")
    assert body.get("db") in ("connected", "disconnected")

    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "manager", "password": "Yt@12345"},
        headers={"X-Device-Id": "ts-device-audit-1", "X-Device-Name": "TestSprite-Audit"},
        timeout=30,
    )
    assert r.status_code == 200, f"manager login failed: {r.status_code} {r.text[:300]}"
    token = r.json().get("token")
    assert token, "login response has no token"

    auth = {"Authorization": f"Bearer {token}"}

    r = s.get(f"{BASE_URL}/api/auth/me", headers=auth, timeout=30)
    assert r.status_code == 200, f"/me failed: {r.status_code} {r.text[:200]}"
    assert r.json().get("username") == "manager", f"unexpected user: {r.text[:200]}"

    r = s.get(f"{BASE_URL}/api/csrf-token", headers=auth, timeout=30)
    assert r.status_code == 200, f"/csrf-token failed: {r.status_code} {r.text[:200]}"
    csrf = r.json()
    assert csrf.get("token") and csrf.get("hash"), "csrf-token response missing token/hash"
    csrf_headers = {**auth, "X-CSRF-Token": csrf["token"], "X-CSRF-Hash": csrf["hash"]}

    r = s.get(f"{BASE_URL}/api/admin/audit-logs?page=1&limit=5", headers=auth, timeout=30)
    assert r.status_code == 200, f"/audit-logs failed: {r.status_code} {r.text[:300]}"
    data = r.json()
    assert isinstance(data.get("logs"), list), f"audit-logs not paginated shape: {str(data)[:200]}"
    assert data.get("total", 0) >= 1, "audit log table appears empty"
    first = data["logs"][0]
    for col in ("id", "type", "title", "user", "deviceName", "ipAddress", "macAddress", "sessionStatus"):
        assert col in first, f"audit log row missing column {col!r}: {first}"
    assert any(row.get("type") == "login" for row in data["logs"]), "no login audit rows in latest page"

    r = s.get(f"{BASE_URL}/api/admin/monitoring", headers=auth, timeout=30)
    assert r.status_code == 200, f"/monitoring failed: {r.status_code} {r.text[:200]}"
    assert r.json().get("db") == "connected"

    r = s.post(f"{BASE_URL}/api/auth/logout", headers=csrf_headers, timeout=30)
    assert r.status_code == 200, f"logout failed: {r.status_code} {r.text[:200]}"
