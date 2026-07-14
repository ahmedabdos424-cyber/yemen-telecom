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

def test_list_agents():
    r = requests.get(f"{TARGET_URL}/api/agents", headers=ah(), timeout=30)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"

def test_create_and_delete_agent():
    name = f"TS Agent {int(time.time())}"
    r = requests.post(f"{TARGET_URL}/api/agents", json={"name": name}, headers=ch(), timeout=30)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    agent_id = r.json()["agent"]["id"]
    r2 = requests.delete(f"{TARGET_URL}/api/agents/{agent_id}", headers=ch(), timeout=30)
    assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"

def test_agent_not_found():
    r = requests.get(f"{TARGET_URL}/api/agents/999999", headers=ah(), timeout=30)
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"

def test_create_agent_validation():
    r = requests.post(f"{TARGET_URL}/api/agents", json={"region": "r"}, headers=ch(), timeout=30)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

test_list_agents()
test_create_and_delete_agent()
test_agent_not_found()
test_create_agent_validation()
