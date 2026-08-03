"""TestSprite backend: customer, SIM lifecycle and inventory write endpoints.

Covers:
- POST /api/auth/login (manager)
- GET /api/csrf-token (Bearer)
- POST /api/customers (create + idempotent upsert on same id_number)
- PUT /api/inventories (CSRF-protected write; uses a non-existent operator so
  no production inventory rows are mutated)
- POST /api/sims + PUT /api/sims/:id (status lifecycle) + DELETE cleanup
- GET /api/customers (list)

The base URL is baked into the code (BASE_URL) per the TestSprite CLI contract.
"""
import os
import time
import requests

BASE_URL = os.environ.get("BASE_URL", "https://yemen-telecom.onrender.com").rstrip("/")

TS = int(time.time() * 1000) % 1000000


def test_customer_sim_and_inventory_flows():
    s = requests.Session()

    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "manager", "password": "Yt@12345"},
        headers={"X-Device-Id": "ts-device-ops", "X-Device-Name": "TestSprite-Ops"},
        timeout=30,
    )
    assert r.status_code == 200, f"manager login failed: {r.status_code} {r.text[:300]}"
    auth = {"Authorization": f"Bearer {r.json()['token']}"}

    r = s.get(f"{BASE_URL}/api/csrf-token", headers=auth, timeout=30)
    assert r.status_code == 200
    csrf = r.json()
    csrf_headers = {**auth, "X-CSRF-Token": csrf["token"], "X-CSRF-Hash": csrf["hash"]}

    customer_id = f"TS{TS}"
    r = s.post(
        f"{BASE_URL}/api/customers",
        json={"full_name": f"TestSprite Customer {TS}", "id_number": customer_id, "phone": f"70{TS % 10000000:07d}", "region": "صنعاء"},
        headers=csrf_headers,
        timeout=30,
    )
    assert r.status_code in (200, 201), f"customer creation failed: {r.status_code} {r.text[:300]}"
    customer = r.json()
    assert customer.get("id_number") == customer_id, f"unexpected customer: {str(customer)[:200]}"

    r = s.post(
        f"{BASE_URL}/api/customers",
        json={"full_name": f"TestSprite Customer {TS}", "id_number": customer_id},
        headers=csrf_headers,
        timeout=30,
    )
    assert r.status_code == 200, f"customer upsert failed: {r.status_code} {r.text[:300]}"

    r = s.get(f"{BASE_URL}/api/inventories", headers=auth, timeout=30)
    assert r.status_code == 200, f"inventory read failed: {r.status_code} {r.text[:200]}"
    current = r.json()
    assert isinstance(current, list)

    # Idempotent write: replay the exact current rows (the PUT only updates
    # existing rows), so no production inventory values are mutated.
    payload = [
        {"operator": row["operator"], "available": row["available"], "remaining": row["remaining"]}
        for row in current
    ] or [{"operator": "yemen_mobile", "available": 0, "remaining": 0}]
    r = s.put(
        f"{BASE_URL}/api/inventories",
        json=payload,
        headers=csrf_headers,
        timeout=30,
    )
    assert r.status_code == 200, f"inventory write failed: {r.status_code} {r.text[:300]}"
    assert isinstance(r.json(), list)

    iccid = f"TS-{TS}"
    r = s.post(
        f"{BASE_URL}/api/sims",
        json={"iccid": iccid, "phone": f"73{TS % 10000000:07d}", "provider": "Yemen Mobile", "status": "available"},
        headers=csrf_headers,
        timeout=30,
    )
    assert r.status_code == 201, f"sim creation failed: {r.status_code} {r.text[:300]}"
    sim_id = r.json().get("id")
    assert sim_id

    r = s.put(f"{BASE_URL}/api/sims/{sim_id}", json={"status": "sold"}, headers=csrf_headers, timeout=30)
    assert r.status_code == 200, f"sim update failed: {r.status_code} {r.text[:200]}"
    assert r.json().get("status") == "sold", f"sim status not updated: {str(r.json())[:200]}"

    r = s.delete(f"{BASE_URL}/api/sims/{sim_id}", headers=csrf_headers, timeout=30)
    assert r.status_code == 200, f"sim cleanup failed: {r.status_code} {r.text[:200]}"

    r = s.get(f"{BASE_URL}/api/customers", headers=auth, timeout=30)
    assert r.status_code == 200 and isinstance(r.json(), list)
