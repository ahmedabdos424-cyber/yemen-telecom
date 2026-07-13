import requests

TARGET_URL = "https://yemen-telecom.onrender.com"

def test_login_valid_manager():
    csrf = requests.get(f"{TARGET_URL}/api/csrf-token", timeout=30).json()
    r = requests.post(f"{TARGET_URL}/api/auth/login", json={"username": "manager", "password": "Admin@123"},
        headers={"X-CSRF-Token": csrf["token"], "X-CSRF-Hash": csrf["hash"]}, timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "token" in data
    assert data["user"]["role"] == "manager"
    return data["token"]

def test_login_wrong_password():
    csrf = requests.get(f"{TARGET_URL}/api/csrf-token", timeout=30).json()
    r = requests.post(f"{TARGET_URL}/api/auth/login", json={"username": "manager", "password": "Wrong123!"},
        headers={"X-CSRF-Token": csrf["token"], "X-CSRF-Hash": csrf["hash"]}, timeout=30)
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"

def test_me_without_token():
    r = requests.get(f"{TARGET_URL}/api/auth/me", timeout=30)
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"

def test_refresh_missing_token():
    r = requests.post(f"{TARGET_URL}/api/auth/refresh", json={}, timeout=30)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

def test_refresh_invalid_token():
    r = requests.post(f"{TARGET_URL}/api/auth/refresh", json={"refreshToken": "invalid"}, timeout=30)
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"

def test_logout_without_token():
    r = requests.post(f"{TARGET_URL}/api/auth/logout", timeout=30)
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"

test_login_valid_manager()
test_login_wrong_password()
test_me_without_token()
test_refresh_missing_token()
test_refresh_invalid_token()
test_logout_without_token()
