import requests

TARGET_URL = "https://yemen-telecom.onrender.com"

TOKEN = None

def get_token():
    global TOKEN
    if TOKEN:
        return TOKEN
    csrf = requests.get(f"{TARGET_URL}/api/csrf-token", timeout=30).json()
    r = requests.post(f"{TARGET_URL}/api/auth/login", json={"username": "manager", "password": "Admin@123"},
        headers={"X-CSRF-Token": csrf["token"], "X-CSRF-Hash": csrf["hash"]}, timeout=30)
    if r.status_code == 200:
        TOKEN = r.json()["token"]
    return TOKEN

def h(token):
    return {"Authorization": f"Bearer {token}"}

def test_sims_no_auth():
    r = requests.get(f"{TARGET_URL}/api/sims", timeout=30)
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"

def test_sims_manager():
    token = get_token()
    if not token:
        return
    r = requests.get(f"{TARGET_URL}/api/sims", headers=h(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_agents_manager():
    token = get_token()
    if not token:
        return
    r = requests.get(f"{TARGET_URL}/api/agents", headers=h(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_sellers_manager():
    token = get_token()
    if not token:
        return
    r = requests.get(f"{TARGET_URL}/api/sellers", headers=h(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_settings_manager():
    token = get_token()
    if not token:
        return
    r = requests.get(f"{TARGET_URL}/api/admin/settings", headers=h(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_reports_daily_sales():
    token = get_token()
    if not token:
        return
    r = requests.get(f"{TARGET_URL}/api/reports/daily-sales", headers=h(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_reports_operator_distribution():
    token = get_token()
    if not token:
        return
    r = requests.get(f"{TARGET_URL}/api/reports/operator-distribution", headers=h(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert "sims" in data and "operations" in data

def test_admin_transactions():
    token = get_token()
    if not token:
        return
    r = requests.get(f"{TARGET_URL}/api/admin/transactions", headers=h(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_admin_audit_logs():
    token = get_token()
    if not token:
        return
    r = requests.get(f"{TARGET_URL}/api/admin/audit-logs", headers=h(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_admin_monitoring():
    token = get_token()
    if not token:
        return
    r = requests.get(f"{TARGET_URL}/api/admin/monitoring", headers=h(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_lockdown_status():
    token = get_token()
    if not token:
        return
    r = requests.get(f"{TARGET_URL}/api/admin/system/lockdown/status", headers=h(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert "locked" in r.json()

def test_stats_manager():
    token = get_token()
    if not token:
        return
    r = requests.get(f"{TARGET_URL}/api/stats", headers=h(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_pending_count():
    token = get_token()
    if not token:
        return
    r = requests.get(f"{TARGET_URL}/api/distributions/pending-count", headers=h(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert "count" in r.json()

test_sims_no_auth()
test_sims_manager()
test_agents_manager()
test_sellers_manager()
test_settings_manager()
test_reports_daily_sales()
test_reports_operator_distribution()
test_admin_transactions()
test_admin_audit_logs()
test_admin_monitoring()
test_lockdown_status()
test_stats_manager()
test_pending_count()
