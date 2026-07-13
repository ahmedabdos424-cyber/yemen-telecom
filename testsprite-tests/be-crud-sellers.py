import requests
import time

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

def ch():
    token = get_token()
    csrf = requests.get(f"{TARGET_URL}/api/csrf-token", timeout=30).json()
    return {"Authorization": f"Bearer {token}", "X-CSRF-Token": csrf["token"], "X-CSRF-Hash": csrf["hash"]}

def ah():
    return {"Authorization": f"Bearer {get_token()}"}

def test_list_sellers():
    r = requests.get(f"{TARGET_URL}/api/sellers", headers=ah(), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_create_and_delete_seller():
    name = f"TS Seller {int(time.time())}"
    r = requests.post(f"{TARGET_URL}/api/sellers", json={"name": name}, headers=ch(), timeout=30)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    seller_id = r.json()["seller"]["id"]
    r2 = requests.delete(f"{TARGET_URL}/api/sellers/{seller_id}", headers=ch(), timeout=30)
    assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"

def test_update_seller_balance():
    name = f"Bal {int(time.time())}"
    create = requests.post(f"{TARGET_URL}/api/sellers", json={"name": name}, headers=ch(), timeout=30)
    if create.status_code == 201:
        sid = create.json()["seller"]["id"]
        r = requests.put(f"{TARGET_URL}/api/sellers/{sid}/balance", json={"amount": 100}, headers=ch(), timeout=30)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        requests.delete(f"{TARGET_URL}/api/sellers/{sid}", headers=ch(), timeout=30)

test_list_sellers()
test_create_and_delete_seller()
test_update_seller_balance()
