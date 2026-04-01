"""Sprint 9 Backend Tests: Email verification, Gear, Studios, AI Tools, Payment"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@reversound.com", "password": "Admin123!"
    })
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json().get("access_token") or r.json().get("token") or r.cookies.get("access_token")

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    if admin_token:
        return {"Authorization": f"Bearer {admin_token}"}
    return {}

# --- Page title & badge (frontend) ---
def test_index_html_title():
    r = requests.get(f"{BASE_URL}/")
    assert "ReverSound" in r.text, "Title should contain ReverSound"

def test_index_html_badge_hidden():
    r = requests.get(f"{BASE_URL}/")
    assert "emergent-badge" in r.text and "display: none" in r.text or "display:none" in r.text, \
        "emergent-badge should be hidden"

# --- Auth: admin login ---
def test_admin_login():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@reversound.com", "password": "Admin123!"
    })
    assert r.status_code == 200
    data = r.json()
    assert data.get("user", {}).get("role") == "admin"

# --- Email verification flow ---
def test_register_new_user_returns_requires_verification():
    import uuid
    email = f"test_ev_{uuid.uuid4().hex[:8]}@test.com"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "Test1234!",
        "name": "Test EV User",
        "username": f"testev{uuid.uuid4().hex[:6]}",
        "role": "producer"
    })
    assert r.status_code == 200, f"Register failed: {r.text}"
    data = r.json()
    assert data.get("requires_verification") is True, f"Expected requires_verification: {data}"

def test_verify_email_invalid_token():
    r = requests.get(f"{BASE_URL}/api/auth/verify-email?token=invalidtoken123")
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

def test_resend_verification_email():
    import uuid
    # Register a user first
    email = f"test_resend_{uuid.uuid4().hex[:8]}@test.com"
    requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "Test1234!", "name": "Resend User",
        "username": f"resend{uuid.uuid4().hex[:6]}", "role": "producer"
    })
    r = requests.post(f"{BASE_URL}/api/auth/resend-verification", json={"email": email})
    assert r.status_code == 200, f"Resend failed: {r.text}"

def test_login_blocked_unverified_user():
    import uuid
    email = f"test_blocked_{uuid.uuid4().hex[:8]}@test.com"
    requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "Test1234!", "name": "Blocked User",
        "username": f"blocked{uuid.uuid4().hex[:6]}", "role": "producer"
    })
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "Test1234!"})
    assert r.status_code in [401, 403], f"Unverified user should be blocked, got {r.status_code}: {r.text}"
    data = r.json()
    detail = str(data.get("detail", "")).upper()
    assert "VERIF" in detail or "EMAIL" in detail, f"Expected email verification error: {data}"

# --- Gear API ---
def test_gear_list():
    r = requests.get(f"{BASE_URL}/api/gear")
    assert r.status_code == 200
    data = r.json()
    assert "listings" in data

def test_gear_create(admin_headers):
    r = requests.post(f"{BASE_URL}/api/gear", json={
        "title": "TEST_Guitar Pro",
        "description": "Test listing for sprint 9",
        "price": 1500.0,
        "category": "guitars",
        "brand": "Fender",
        "condition": "İyi",
        "city": "Istanbul"
    }, headers=admin_headers)
    assert r.status_code == 200, f"Create gear failed: {r.text}"
    data = r.json()
    assert data.get("title") == "TEST_Guitar Pro"

def test_gear_categories():
    r = requests.get(f"{BASE_URL}/api/gear/categories")
    assert r.status_code == 200
    data = r.json()
    assert "guitars" in data

# --- Studios API ---
def test_studios_list():
    r = requests.get(f"{BASE_URL}/api/studios")
    assert r.status_code == 200

def test_studios_map():
    r = requests.get(f"{BASE_URL}/api/studios/map")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list), f"Expected list, got: {type(data)}"

# --- Payment API ---
def test_payment_status():
    r = requests.get(f"{BASE_URL}/api/payment/status")
    assert r.status_code == 200
    data = r.json()
    assert data.get("mode") == "sandbox", f"Expected sandbox mode: {data}"
    assert data.get("provider") == "iyzico"

def test_payment_checkout_init(admin_headers):
    r = requests.post(f"{BASE_URL}/api/payment/checkout/init", 
                      json={"amount": 100, "currency": "TRY"},
                      headers=admin_headers)
    assert r.status_code == 200, f"Checkout init failed: {r.text}"
    data = r.json()
    assert "checkout_form_content" in data
    assert data.get("sandbox_mode") is True

# --- AI Tools ---
def test_bpm_key_endpoint_exists(admin_headers):
    """Test BPM endpoint reachable (without actual audio file - just check auth/routing)"""
    r = requests.post(f"{BASE_URL}/api/studio-tools/bpm-key", headers=admin_headers)
    # Should get 422 (missing file) not 404
    assert r.status_code == 422, f"Expected 422 for missing file, got {r.status_code}"

def test_stem_split_endpoint_exists(admin_headers):
    r = requests.post(f"{BASE_URL}/api/studio-tools/stem-split", headers=admin_headers)
    assert r.status_code == 422, f"Expected 422, got {r.status_code}"

def test_master_endpoint_exists(admin_headers):
    r = requests.post(f"{BASE_URL}/api/studio-tools/master", headers=admin_headers)
    assert r.status_code == 422, f"Expected 422, got {r.status_code}"
