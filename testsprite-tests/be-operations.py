import requests
import time
import random

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

def test_list_operations():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/operations", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_create_operation_activate():
    token = login()
    target = f"77{random.randint(10000000,99999999)}"
    r = requests.post(f"{TARGET_URL}/api/operations", json={"type": "activate", "target": target, "operator": "Yemen Mobile"}, headers=csrf_headers(token), timeout=30)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    assert r.json()["type"] == "activate"

def test_create_operation_missing_target():
    token = login()
    r = requests.post(f"{TARGET_URL}/api/operations", json={"type": "activate"}, headers=csrf_headers(token), timeout=30)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

def test_create_operation_invalid_type():
    token = login()
    r = requests.post(f"{TARGET_URL}/api/operations", json={"type": "invalid", "target": "771234567"}, headers=csrf_headers(token), timeout=30)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

def test_list_inventories():
    token = login()
    r = requests.get(f"{TARGET_URL}/api/inventories", headers=auth_only(token), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert isinstance(r.json(), list)

def test_update_inventories():
    token = login()
    get = requests.get(f"{TARGET_URL}/api/inventories", headers=auth_only(token), timeout=30)
    inventories = [{"operator": inv["operator"], "available": inv.get("available", 0), "remaining": inv.get("remaining", 0)} for inv in get.json()]
    if inventories:
        r = requests.put(f"{TARGET_URL}/api/inventories", json=inventories, headers=csrf_headers(token), timeout=30)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_update_inventories_empty():
    token = login()
    r = requests.put(f"{TARGET_URL}/api/inventories", json=[], headers=csrf_headers(token), timeout=30)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

test_list_operations()
test_create_operation_activate()
test_create_operation_missing_target()
test_create_operation_invalid_type()
test_list_inventories()
test_update_inventories()
test_update_inventories_empty()
