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

def test_list_sims_requires_auth():
    r = requests.get(f"{TARGET_URL}/api/sims", timeout=10)
    assert r.status_code == 401

def test_list_sims_with_auth():
    token = get_token()
    if token:
        r = requests.get(f"{TARGET_URL}/api/sims", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, (list, dict))

def test_create_sim_validation():
    token = get_token()
    if token:
        r = requests.post(f"{TARGET_URL}/api/sims", json={}, headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        assert r.status_code in [400, 422]

test_list_sims_requires_auth()
test_list_sims_with_auth()
test_create_sim_validation()
