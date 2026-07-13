import requests
import time

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

def test_list_customers():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/customers", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_create_customer():
    token = login()
    id_num = str(int(time.time()))
    r = requests.post(f"{TARGET_URL}/api/customers", json={"full_name": "عميل تجريبي", "id_number": id_num, "phone": "771234567"}, headers=csrf_headers(token), timeout=30)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"

def test_create_customer_upsert():
    token = login()
    id_num = f"UPSERT{int(time.time())}"
    requests.post(f"{TARGET_URL}/api/customers", json={"full_name": "A", "id_number": id_num}, headers=csrf_headers(token), timeout=30)
    r = requests.post(f"{TARGET_URL}/api/customers", json={"full_name": "B", "id_number": id_num}, headers=csrf_headers(token), timeout=30)
    assert r.status_code == 201, f"Expected 201 for upsert, got {r.status_code}"

def test_create_customer_missing_fields():
    token = login()
    r = requests.post(f"{TARGET_URL}/api/customers", json={"phone": "771234567"}, headers=csrf_headers(token), timeout=30)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

def test_search_customers():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/customers/search?q=test", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert isinstance(r.json(), list)

def test_search_customers_short_query():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/customers/search?q=a", headers=auth_only(token), timeout=30)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

test_list_customers()
test_create_customer()
test_create_customer_upsert()
test_create_customer_missing_fields()
test_search_customers()
test_search_customers_short_query()
