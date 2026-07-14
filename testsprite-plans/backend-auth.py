import requests

TARGET_URL = f"{requests.environ.get('TARGET_URL', 'https://yemen-telecom-api.onrender.com')}"

def test_health_endpoint():
    r = requests.get(f"{TARGET_URL}/api/health", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok" or data.get("status") == "healthy"

def test_login_with_valid_credentials():
    r = requests.post(f"{TARGET_URL}/api/auth/login", json={
        "username": "manager",
        "password": "Admin@123"
    }, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "token" in data or "accessToken" in data

def test_login_with_invalid_password():
    r = requests.post(f"{TARGET_URL}/api/auth/login", json={
        "username": "manager",
        "password": "wrongpassword"
    }, timeout=10)
    assert r.status_code == 401

def test_login_with_missing_fields():
    r = requests.post(f"{TARGET_URL}/api/auth/login", json={}, timeout=10)
    assert r.status_code == 400

def test_refresh_token_flow():
    login = requests.post(f"{TARGET_URL}/api/auth/login", json={
        "username": "manager",
        "password": "Admin@123"
    }, timeout=10)
    if login.status_code == 200:
        data = login.json()
        refresh_token = data.get("refreshToken")
        if refresh_token:
            r = requests.post(f"{TARGET_URL}/api/auth/refresh", json={
                "refreshToken": refresh_token
            }, timeout=10)
            assert r.status_code == 200
            assert "token" in r.json() or "accessToken" in r.json()

test_health_endpoint()
test_login_with_valid_credentials()
test_login_with_invalid_password()
test_login_with_missing_fields()
test_refresh_token_flow()
