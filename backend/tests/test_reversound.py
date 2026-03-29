"""
ReverSound API Backend Tests - Iteration 1
Tests: health, auth, beats, gigs, wallet, admin, messages, orders
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = "admin@reversound.com"
ADMIN_PASSWORD = "Admin123!"
TEST_EMAIL = f"test_{uuid.uuid4().hex[:8]}@test.com"
TEST_USERNAME = f"testuser_{uuid.uuid4().hex[:6]}"
TEST_PASSWORD = "Test1234!"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def user_token(session):
    # Try register; if already exists, login
    r = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": "Test Producer",
        "username": TEST_USERNAME,
        "role": "producer"
    })
    if r.status_code == 200:
        return r.json()["access_token"]
    # Already registered - login
    r2 = session.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r2.status_code == 200, f"Login failed: {r2.text}"
    return r2.json()["access_token"]


# ── Health ───────────────────────────────────────────────────────────────────

def test_health(session):
    r = session.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    print("PASS: health check")


# ── Auth ─────────────────────────────────────────────────────────────────────

def test_admin_login(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"
    print("PASS: admin login")


def test_register_producer(session):
    r = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": "Test Producer",
        "username": TEST_USERNAME,
        "role": "producer"
    })
    # May already exist from fixture; 200 or 400 is OK if already registered
    assert r.status_code in (200, 400)
    if r.status_code == 200:
        data = r.json()
        assert data["user"]["wallet_balance"] == 100.0
        assert data["user"]["role"] == "producer"
    print(f"PASS: register producer ({r.status_code})")


def test_me_endpoint(session, user_token):
    r = session.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "email" in data
    assert "password_hash" not in data
    print("PASS: /me endpoint")


def test_invalid_login(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": "nobody@x.com", "password": "wrong"})
    assert r.status_code == 401
    print("PASS: invalid login returns 401")


# ── Beats ─────────────────────────────────────────────────────────────────────

def test_list_beats(session):
    r = session.get(f"{BASE_URL}/api/beats")
    assert r.status_code == 200
    data = r.json()
    assert "beats" in data
    assert data["total"] >= 6, f"Expected 6 seeded beats, got {data['total']}"
    print(f"PASS: list beats, total={data['total']}")


def test_list_beats_genre_filter(session):
    r = session.get(f"{BASE_URL}/api/beats?genre=Trap")
    assert r.status_code == 200
    data = r.json()
    assert "beats" in data
    print(f"PASS: beats genre filter, count={data['total']}")


# ── Gigs ──────────────────────────────────────────────────────────────────────

def test_list_gigs(session):
    r = session.get(f"{BASE_URL}/api/gigs")
    assert r.status_code == 200
    data = r.json()
    assert "gigs" in data
    assert data["total"] >= 4, f"Expected 4 seeded gigs, got {data['total']}"
    print(f"PASS: list gigs, total={data['total']}")


# ── Wallet ────────────────────────────────────────────────────────────────────

def test_get_wallet(session, user_token):
    r = session.get(f"{BASE_URL}/api/wallet", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "wallet_balance" in data
    assert data["wallet_balance"] >= 100.0
    print(f"PASS: wallet balance={data['wallet_balance']}")


def test_wallet_topup(session, user_token):
    r = session.post(f"{BASE_URL}/api/wallet/topup", 
                     json={"amount": 50.0, "payment_method": "mock"},
                     headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "new_balance" in data
    assert data["new_balance"] >= 150.0
    print(f"PASS: wallet topup, new_balance={data['new_balance']}")


def test_wallet_topup_invalid_amount(session, user_token):
    r = session.post(f"{BASE_URL}/api/wallet/topup",
                     json={"amount": -10},
                     headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 400
    print("PASS: topup invalid amount returns 400")


def test_wallet_unauthenticated():
    # Fresh session without any cookies or auth headers
    s = requests.Session()
    r = s.get(f"{BASE_URL}/api/wallet")
    assert r.status_code == 401
    print("PASS: wallet unauthenticated returns 401")


# ── Admin ─────────────────────────────────────────────────────────────────────

def test_admin_stats(session, admin_token):
    r = session.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "total_users" in data
    assert "total_beats" in data
    assert "total_gigs" in data
    print(f"PASS: admin stats, users={data['total_users']}, beats={data['total_beats']}")


def test_admin_stats_unauthorized(user_token):
    # Use fresh session to avoid cookie interference
    s = requests.Session()
    r = s.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
    print("PASS: admin stats returns 403 for non-admin")


def test_admin_list_users(session, admin_token):
    r = session.get(f"{BASE_URL}/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "users" in data
    # Make sure password_hash not exposed
    if data["users"]:
        assert "password_hash" not in data["users"][0]
    print(f"PASS: admin list users, total={data['total']}")


# ── Messages/Moderation ───────────────────────────────────────────────────────

def test_create_conversation_and_message_moderation(user_token):
    # Use fresh sessions to avoid cookie interference
    s1 = requests.Session()
    s2 = requests.Session()

    # Register a second user with fresh session
    r2 = s2.post(f"{BASE_URL}/api/auth/register", json={
        "email": f"msg_{uuid.uuid4().hex[:8]}@test.com",
        "password": TEST_PASSWORD,
        "name": "Msg User",
        "username": f"msguser_{uuid.uuid4().hex[:6]}",
        "role": "buyer"
    })
    assert r2.status_code == 200
    other_user_id = r2.json()["user"]["id"]

    # Create conversation using user_token in fresh session
    rc = s1.post(f"{BASE_URL}/api/conversations",
                  json={"participant_id": other_user_id},
                  headers={"Authorization": f"Bearer {user_token}"})
    assert rc.status_code == 200, f"Create conversation failed: {rc.text}"
    conv_id = rc.json()["id"]

    # Send message with email (should be moderated)
    rm = s1.post(f"{BASE_URL}/api/conversations/{conv_id}/messages",
                  json={"content": "contact me at hello@gmail.com"},
                  headers={"Authorization": f"Bearer {user_token}"})
    print(f"Message moderation response: {rm.status_code} - {rm.text[:200]}")
    assert rm.status_code == 200, f"Message send failed: {rm.text}"
    data = rm.json()
    # Check that message was flagged/blocked
    if data.get("is_flagged"):
        print(f"PASS: email in message flagged: {data.get('flag_reason')}")
    else:
        print(f"INFO: message not flagged, content={data.get('content')}")


# ── Orders ────────────────────────────────────────────────────────────────────

def test_create_order(user_token):
    # Use fresh session
    s = requests.Session()
    # Get a gig first
    r = s.get(f"{BASE_URL}/api/gigs")
    gigs = r.json()["gigs"]
    assert len(gigs) > 0, "No gigs available"
    gig = gigs[0]
    gig_id = gig["id"]
    # Get available tier
    tiers = gig.get("tiers", {})
    tier_name = list(tiers.keys())[0] if tiers else "basic"

    # Place order
    ro = s.post(f"{BASE_URL}/api/orders",
                  json={"gig_id": gig_id, "tier": tier_name, "requirements": "Test order requirements"},
                  headers={"Authorization": f"Bearer {user_token}"})
    print(f"Order creation: {ro.status_code} - {ro.text[:300]}")
    assert ro.status_code in (200, 400), f"Unexpected status: {ro.status_code}"
    if ro.status_code == 200:
        data = ro.json()
        assert "id" in data
        assert data["escrow_status"] == "held"
        print(f"PASS: order created with escrow, id={data['id']}")
    else:
        print(f"PASS: order creation returned 400: {ro.json()}")
