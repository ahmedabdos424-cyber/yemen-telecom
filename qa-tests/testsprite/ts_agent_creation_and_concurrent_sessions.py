"""TestSprite backend: agent creation with credentials + concurrent sessions.

Covers:
- POST /api/auth/login (manager)
- GET /api/csrf-token (Bearer)
- POST /api/agents {name, region, phone, username, password} (CSRF-protected)
- Login of the newly created (non-seed) agent on TWO devices at the same time:
  both sessions must stay valid (agent role is session-exempt by design).
- GET /api/agents reflects the new agent
- PUT /api/agents/:id (CSRF-protected)
- DELETE /api/agents/:id cleanup (CSRF-protected)

The base URL is baked into the code (BASE_URL) per the TestSprite CLI contract.
"""
import os
import time
import requests

BASE_URL = os.environ.get("BASE_URL", "https://yemen-telecom.onrender.com").rstrip("/")

TS = int(time.time() * 1000) % 1000000


def _login(s, username, password, device_id):
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": username, "password": password},
        headers={"X-Device-Id": device_id, "X-Device-Name": f"TestSprite-{device_id}"},
        timeout=30,
    )
    assert r.status_code == 200, f"login {username} failed: {r.status_code} {r.text[:300]}"
    return r.json().get("token")


def _csrf(s, auth):
    r = s.get(f"{BASE_URL}/api/csrf-token", headers=auth, timeout=30)
    assert r.status_code == 200, f"csrf-token failed: {r.status_code} {r.text[:200]}"
    return r.json()


def test_agent_creation_with_credentials_and_concurrent_sessions():
    # Each actor gets its own Session so cookie-based auth can never
    # leak between users (the API prefers the token cookie over the
    # Authorization header).
    s_mgr = requests.Session()

    manager_token = _login(s_mgr, "manager", "Yt@12345", "ts-device-mgr")
    auth = {"Authorization": f"Bearer {manager_token}"}
    csrf = _csrf(s_mgr, auth)
    csrf_headers = {**auth, "X-CSRF-Token": csrf["token"], "X-CSRF-Hash": csrf["hash"]}

    agent_username = f"tsagent{TS}"
    agent_name = f"TestSprite Agent {TS}"
    r = s_mgr.post(
        f"{BASE_URL}/api/agents",
        json={
            "name": agent_name,
            "region": "صنعاء",
            "phone": f"77{TS % 10000000:07d}",
            "username": agent_username,
            "password": "Ts@12345x",
        },
        headers=csrf_headers,
        timeout=30,
    )
    assert r.status_code in (200, 201), f"agent creation failed: {r.status_code} {r.text[:300]}"
    agent = r.json()
    agent_payload = agent.get("agent") if isinstance(agent, dict) and "agent" in agent else agent
    agent_id = agent_payload.get("id") if isinstance(agent_payload, dict) else None
    assert agent_id, f"agent response has no id: {str(agent)[:200]}"

    token_a = _login(requests.Session(), agent_username, "Ts@12345x", "ts-device-agent-a")
    token_b = _login(requests.Session(), agent_username, "Ts@12345x", "ts-device-agent-b")
    assert token_a and token_b, "concurrent logins must both return tokens"

    r_a = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token_a}"}, timeout=30)
    assert r_a.status_code == 200, f"first device session invalidated by second login: {r_a.status_code} {r_a.text[:200]}"
    assert r_a.json().get("username") == agent_username

    r = s_mgr.get(f"{BASE_URL}/api/agents", headers=auth, timeout=30)
    assert r.status_code == 200
    names = [row.get("name") for row in r.json() if isinstance(row, dict)]
    assert agent_name in names, f"created agent not listed: {names[-10:]}"

    r = s_mgr.put(
        f"{BASE_URL}/api/agents/{agent_id}",
        json={"name": f"{agent_name} (updated)"},
        headers=csrf_headers,
        timeout=30,
    )
    assert r.status_code == 200, f"agent update failed: {r.status_code} {r.text[:200]}"

    r = s_mgr.delete(f"{BASE_URL}/api/agents/{agent_id}", headers=csrf_headers, timeout=30)
    assert r.status_code == 200, f"agent cleanup failed: {r.status_code} {r.text[:200]}"
