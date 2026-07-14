import requests

TARGET_URL = f"{requests.environ.get('TARGET_URL', 'https://yemen-telecom-api.onrender.com')}"

def get_token():
    r = requests.post(f"{TARGET_URL}/api/auth/login", json={
        "username": "manager",
        "password": "Admin@123"
    }, timeout=10)
    if r.status_code == 200:
        data = r.json()
        return data.get("token") or data.get("accessToken")
    return None

def test_customers_requires_auth():
    r = requests.get(f"{TARGET_URL}/api/customers", timeout=10)
    assert r.status_code == 401

def test_customers_with_auth():
    token = get_token()
    if token:
        r = requests.get(f"{TARGET_URL}/api/customers", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        assert r.status_code == 200

def test_operations_requires_auth():
    r = requests.get(f"{TARGET_URL}/api/operations", timeout=10)
    assert r.status_code == 401

def test_operations_with_auth():
    token = get_token()
    if token:
        r = requests.get(f"{TARGET_URL}/api/operations", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        assert r.status_code == 200

def test_reports_requires_auth():
    r = requests.get(f"{TARGET_URL}/api/reports", timeout=10)
    assert r.status_code == 401

def test_reports_with_auth():
    token = get_token()
    if token:
        r = requests.get(f"{TARGET_URL}/api/reports/daily-sales", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        assert r.status_code == 200

test_customers_requires_auth()
test_customers_with_auth()
test_operations_requires_auth()
test_operations_with_auth()
test_reports_requires_auth()
test_reports_with_auth()
