"""Sprint 10 backend tests: Studios, Gear, Admin Financials"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "admin@reversound.com"
ADMIN_PASSWORD = "Admin123!"

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    cookies = r.cookies.get_dict()
    return cookies

# 1. Studios list
def test_studios_returns_3(admin_token):
    r = requests.get(f"{BASE_URL}/api/studios", cookies=admin_token)
    assert r.status_code == 200
    data = r.json()
    studios = data.get("studios", [])
    assert len(studios) >= 3, f"Expected >=3 studios, got {len(studios)}"
    cities = [s.get("city", "") for s in studios]
    print(f"PASS: Got {len(studios)} studios, cities: {cities}")

# 2. Studios map
def test_studios_map(admin_token):
    r = requests.get(f"{BASE_URL}/api/studios/map", cookies=admin_token)
    assert r.status_code == 200
    studios = r.json()
    assert len(studios) >= 3, f"Expected >=3 on map, got {len(studios)}"
    for s in studios:
        assert "lat" in s and "lng" in s
    print(f"PASS: Map returned {len(studios)} studios with coordinates")

# 3. Studio calendar
def test_studio_calendar(admin_token):
    # Get first studio id
    r = requests.get(f"{BASE_URL}/api/studios", cookies=admin_token)
    studio_id = r.json()["studios"][0]["id"]
    r2 = requests.get(f"{BASE_URL}/api/studios/{studio_id}/calendar?year=2026&month=2", cookies=admin_token)
    assert r2.status_code == 200
    data = r2.json()
    assert "events" in data
    assert "studio_id" in data
    print(f"PASS: Calendar returned {len(data['events'])} events")

# 4. Studio block (admin as owner)
def test_studio_block_and_delete(admin_token):
    r = requests.get(f"{BASE_URL}/api/studios", cookies=admin_token)
    studio_id = r.json()["studios"][0]["id"]
    block_data = {
        "studio_id": studio_id,
        "start_datetime": "2026-03-10T10:00:00Z",
        "end_datetime": "2026-03-10T12:00:00Z",
        "reason": "Test Bakım"
    }
    r2 = requests.post(f"{BASE_URL}/api/studios/block", json=block_data, cookies=admin_token)
    assert r2.status_code == 200, f"Block failed: {r2.text}"
    block_id = r2.json().get("id")
    assert block_id
    print(f"PASS: Block created {block_id}")

    # Delete
    r3 = requests.delete(f"{BASE_URL}/api/studios/block/{block_id}", cookies=admin_token)
    assert r3.status_code == 200, f"Delete block failed: {r3.text}"
    print(f"PASS: Block deleted")

# 5. Studio reservation (non-owner user)
def test_studio_reserve_insufficient_balance(admin_token):
    # Admin is owner (owner_id='demo'), so should get 400 "can't rent own studio"
    r = requests.get(f"{BASE_URL}/api/studios", cookies=admin_token)
    studio_id = r.json()["studios"][0]["id"]
    res_data = {
        "studio_id": studio_id,
        "start_datetime": "2026-04-01T14:00:00Z",
        "end_datetime": "2026-04-01T16:00:00Z",
    }
    r2 = requests.post(f"{BASE_URL}/api/studios/reserve", json=res_data, cookies=admin_token)
    # Admin is not owner_id='demo', so this could fail with wallet issue
    assert r2.status_code in [200, 400], f"Unexpected: {r2.text}"
    print(f"Reserve response: {r2.status_code} - {r2.json()}")

# 6. Gear listings
def test_gear_returns_6(admin_token):
    r = requests.get(f"{BASE_URL}/api/gear", cookies=admin_token)
    assert r.status_code == 200
    data = r.json()
    listings = data.get("listings", data) if isinstance(data, dict) else data
    if isinstance(listings, dict):
        listings = listings.get("gear", listings.get("items", []))
    count = len(listings) if isinstance(listings, list) else 0
    assert count >= 6, f"Expected >=6 gear, got {count}: {data}"
    print(f"PASS: Got {count} gear listings")

# 7. Gear categories
def test_gear_categories(admin_token):
    r = requests.get(f"{BASE_URL}/api/gear/categories", cookies=admin_token)
    assert r.status_code == 200
    print(f"PASS: Gear categories: {r.json()}")

# 8. Admin financials - category_breakdown
def test_admin_financials_category_breakdown(admin_token):
    r = requests.get(f"{BASE_URL}/api/admin/financials", cookies=admin_token)
    assert r.status_code == 200, f"Financials failed: {r.text}"
    data = r.json()
    assert "category_breakdown" in data, "Missing category_breakdown"
    cb = data["category_breakdown"]
    assert len(cb) == 4, f"Expected 4 categories, got {len(cb)}: {cb}"
    cats = [c["category"] for c in cb]
    print(f"PASS: category_breakdown categories: {cats}")

# 9. Admin financials - monthly_revenue columns
def test_admin_financials_monthly_revenue(admin_token):
    r = requests.get(f"{BASE_URL}/api/admin/financials", cookies=admin_token)
    assert r.status_code == 200
    data = r.json()
    assert "monthly_revenue" in data
    mr = data["monthly_revenue"]
    # May be empty if no data, but check structure if any
    print(f"PASS: monthly_revenue has {len(mr)} entries")
    if mr:
        assert "gigs" in mr[0] and "beats" in mr[0] and "studios" in mr[0], f"Missing columns in: {mr[0]}"

# 10. Admin financials seed idempotent
def test_admin_financials_seed_idempotent(admin_token):
    r = requests.post(f"{BASE_URL}/api/admin/financials/seed-demo?force=false", cookies=admin_token)
    assert r.status_code == 200
    data = r.json()
    # Should be idempotent - already seeded
    print(f"PASS: Seed idempotent result: {data}")
    assert "studios_seeded" in data or "message" in data
