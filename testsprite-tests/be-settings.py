import requests

TARGET_URL = "https://yemen-telecom.onrender.com"

def login():
    csrf = requests.get(f"{TARGET_URL}/api/csrf-token", timeout=30).json()
    r = requests.post(f"{TARGET_URL}/api/auth/login", json={"username": "manager", "password": "Admin@123"},
        headers={"X-CSRF-Token": csrf["token"], "X-CSRF-Hash": csrf["hash"]}, timeout=30)
    return r.json()["token"]

def csrf_headers(token):
    csrf = requests.get(f"{TARGET_URL}/api/csrf-token", timeout=30).json()
    return {"Authorization": f"Bearer {token}", "X-CSRF-Token": csrf["token"], "X-CSRF-Hash": csrf["hash"]}

def auth_only(token):
    return {"Authorization": f"Bearer {token}"}

def test_get_settings():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/admin/settings", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert isinstance(r.json(), dict)

def test_update_settings():
    token = login()
    r = requests.put(f"{TARGET_URL}/api/admin/settings", json={"language": "ar"}, headers=csrf_headers(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_update_settings_no_fields():
    token = login()
    r = requests.put(f"{TARGET_URL}/api/admin/settings", json={"invalidField": "value"}, headers=csrf_headers(token), timeout=30)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

def test_get_transactions():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/admin/transactions", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_get_duplicate_identities():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/admin/duplicate-identities", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_get_audit_logs():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/admin/audit-logs", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_get_monitoring():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/admin/monitoring", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_lockdown_status():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/admin/system/lockdown/status", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert "locked" in r.json()

def test_toggle_lockdown():
    token = login()
    before = requests.get(f"{TARGET_URL}/api/admin/system/lockdown/status", headers=auth_only(token), timeout=30).json()
    r = requests.post(f"{TARGET_URL}/api/admin/system/lockdown", headers=csrf_headers(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    if r.json()["locked"] != before["locked"]:
        requests.post(f"{TARGET_URL}/api/admin/system/lockdown", headers=csrf_headers(token), timeout=30)

def test_reports_daily_sales():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/reports/daily-sales", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert isinstance(r.json(), list)

def test_reports_agent_performance():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/reports/agent-performance", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_reports_operator_distribution():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/reports/operator-distribution", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert "sims" in data and "operations" in data

def test_reports_seller_performance():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/reports/seller-performance", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

test_get_settings()
test_update_settings()
test_update_settings_no_fields()
test_get_transactions()
test_get_duplicate_identities()
test_get_audit_logs()
test_get_monitoring()
test_lockdown_status()
test_toggle_lockdown()
test_reports_daily_sales()
test_reports_agent_performance()
test_reports_operator_distribution()
test_reports_seller_performance()
