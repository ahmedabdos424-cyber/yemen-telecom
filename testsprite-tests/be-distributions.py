import requests

TARGET_URL = "https://yemen-telecom.onrender.com"

def get_manager_token():
    r = requests.post(f"{TARGET_URL}/api/auth/login", json={"username": "manager", "password": "Admin@123"}, timeout=30)
    return r.json()["token"]

def auth_header(token):
    return {"Authorization": f"Bearer {token}"}

def test_list_distributions():
    token = get_manager_token()
    r = requests.get(f"{TARGET_URL}/api/distributions", headers=auth_header(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_pending_count():
    token = get_manager_token()
    r = requests.get(f"{TARGET_URL}/api/distributions/pending-count", headers=auth_header(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert "count" in r.json()

def test_create_distribution_as_manager_forbidden():
    token = get_manager_token()
    r = requests.post(f"{TARGET_URL}/api/distributions", json={"operator": "Yemen Mobile", "count": 10}, headers=auth_header(token), timeout=30)
    assert r.status_code == 403, f"Expected 403, got {r.status_code}"

test_list_distributions()
test_pending_count()
test_create_distribution_as_manager_forbidden()
