import requests

TARGET_URL = "https://yemen-telecom.onrender.com"

def get_csrf():
    r = requests.get(f"{TARGET_URL}/api/csrf-token", timeout=30)
    return r.json()

def test_health_returns_200():
    r = requests.get(f"{TARGET_URL}/api/health", timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert "db" in data or "status" in data, f"Expected db or status field, got {list(data.keys())}"

def test_csrf_token_returns_token_and_hash():
    r = requests.get(f"{TARGET_URL}/api/csrf-token", timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert "token" in data, f"Expected token field, got {list(data.keys())}"
    assert "hash" in data, f"Expected hash field, got {list(data.keys())}"

def test_unknown_route_returns_404():
    r = requests.get(f"{TARGET_URL}/api/nonexistent-endpoint-xyz", timeout=30)
    assert r.status_code in (404, 401), f"Expected 404 or 401, got {r.status_code}"

test_health_returns_200()
test_csrf_token_returns_token_and_hash()
test_unknown_route_returns_404()
