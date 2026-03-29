"""Sprint 3 Backend Tests: Support tickets, Feed hashtags/trending, Liveroom, Coach audio, Orders"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "admin@reversound.com"
ADMIN_PASS = "Admin123!"

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def admin_session(session):
    """Login as admin and return session with cookies"""
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return session

# ---- Support Tickets ----

def test_create_support_ticket(admin_session):
    """POST /api/support/tickets creates ticket with status=open"""
    r = admin_session.post(f"{BASE_URL}/api/support/tickets", json={
        "subject": "TEST_Sprint3 ticket",
        "category": "technical",
        "description": "Testing ticket creation for sprint 3"
    })
    assert r.status_code == 200, f"Failed: {r.text}"
    data = r.json()
    assert data["status"] == "open"
    assert data["subject"] == "TEST_Sprint3 ticket"
    assert "id" in data
    pytest.ticket_id = data["id"]

def test_list_support_tickets(admin_session):
    """GET /api/support/tickets returns list for admin"""
    r = admin_session.get(f"{BASE_URL}/api/support/tickets")
    assert r.status_code == 200, f"Failed: {r.text}"
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_reply_to_ticket(admin_session):
    """POST /api/support/tickets/{id}/reply adds message"""
    ticket_id = getattr(pytest, 'ticket_id', None)
    if not ticket_id:
        pytest.skip("No ticket_id from previous test")
    r = admin_session.post(f"{BASE_URL}/api/support/tickets/{ticket_id}/reply",
        json={"message": "Admin reply to test ticket"})
    assert r.status_code == 200, f"Failed: {r.text}"
    data = r.json()
    assert "new_status" in data

# ---- Feed Hashtags ----

def test_create_post_with_hashtag(admin_session):
    """POST /api/feed creates post with hashtag extracted"""
    r = admin_session.post(f"{BASE_URL}/api/feed", json={
        "content": "Testing hashtag system #MixingTips #ProducerLife"
    })
    assert r.status_code == 200, f"Failed: {r.text}"
    data = r.json()
    assert "hashtags" in data
    assert "mixingtips" in data["hashtags"]
    assert "producerlife" in data["hashtags"]
    pytest.post_id = data["id"]

def test_feed_trending_hashtags(admin_session):
    """GET /api/feed/trending returns hashtag counts"""
    r = admin_session.get(f"{BASE_URL}/api/feed/trending")
    assert r.status_code == 200, f"Failed: {r.text}"
    data = r.json()
    assert isinstance(data, list)
    # After creating post with hashtags above, should have results
    if len(data) > 0:
        assert "tag" in data[0]
        assert "count" in data[0]

def test_feed_hashtag_filter(admin_session):
    """GET /api/feed?hashtag=mixingtips returns only posts with that hashtag"""
    r = admin_session.get(f"{BASE_URL}/api/feed?hashtag=mixingtips")
    assert r.status_code == 200, f"Failed: {r.text}"
    data = r.json()
    assert "posts" in data
    # All returned posts should have the hashtag
    for post in data["posts"]:
        assert "mixingtips" in post.get("hashtags", [])

# ---- Liveroom HTTP endpoint ----

def test_liveroom_not_exists(admin_session):
    """GET /api/liverooms/test-room returns exists:false"""
    r = admin_session.get(f"{BASE_URL}/api/liverooms/test-room-xyz123")
    assert r.status_code == 200, f"Failed: {r.text}"
    data = r.json()
    assert data.get("exists") == False

# ---- Coach Audio Analyze ----

def test_coach_audio_analyze_endpoint_exists(admin_session):
    """POST /api/coach/analyze-audio exists (dummy data should fail gracefully)"""
    r = admin_session.post(f"{BASE_URL}/api/coach/analyze-audio", json={
        "storage_path": "invalid/path/test.mp3",
        "filename": "test.mp3",
        "file_size": 1024000,
        "question": "Analyze this file"
    })
    # Expected: 400 or 500 (invalid path) — but endpoint must exist (not 404)
    assert r.status_code != 404, f"Endpoint not found: {r.text}"
    print(f"Audio analyze response: {r.status_code} - {r.text[:200]}")

# ---- Orders: start endpoint with funded order ----

def test_order_start_requires_funded(admin_session):
    """POST /api/orders/{id}/start needs valid funded order - test with invalid ID gives 400/404"""
    r = admin_session.post(f"{BASE_URL}/api/orders/000000000000000000000001/start")
    assert r.status_code in (404, 400, 403), f"Expected 404/400/403, got: {r.status_code}"

# ---- Full order flow: create gig, order, start ----

def test_full_order_flow(admin_session):
    """Create a buyer user, fund an order, then start it as seller"""
    # Register buyer
    buyer = requests.Session()
    buyer.headers.update({"Content-Type": "application/json"})
    buy_r = buyer.post(f"{BASE_URL}/api/auth/register", json={
        "name": "TEST_Buyer Sprint3",
        "email": "TEST_buyer_sprint3@reversound.com",
        "password": "Test123!",
        "role": "buyer"
    })
    if buy_r.status_code not in (200, 201, 400):
        pytest.skip(f"Buyer register unexpected: {buy_r.status_code}")
    
    # Login buyer
    buy_login = buyer.post(f"{BASE_URL}/api/auth/login", json={
        "email": "TEST_buyer_sprint3@reversound.com",
        "password": "Test123!"
    })
    if buy_login.status_code != 200:
        pytest.skip("Buyer login failed")

    # Find an approved gig
    gigs_r = admin_session.get(f"{BASE_URL}/api/gigs?status=approved&limit=5")
    if gigs_r.status_code != 200:
        pytest.skip("No gigs endpoint")
    gigs = gigs_r.json()
    gig_list = gigs if isinstance(gigs, list) else gigs.get("gigs", [])
    approved = [g for g in gig_list if g.get("status") == "approved"]
    if not approved:
        pytest.skip("No approved gigs available")
    
    gig = approved[0]
    gig_id = gig["id"]
    seller_id = gig["seller_id"]
    tier = list(gig.get("tiers", {}).keys())[0] if gig.get("tiers") else "basic"
    price = float(gig.get("tiers", {}).get(tier, {}).get("price", 10))

    # Topup buyer wallet
    buyer.post(f"{BASE_URL}/api/wallet/topup", json={"amount": max(price * 2, 100)})
    
    # Create order
    order_r = buyer.post(f"{BASE_URL}/api/orders", json={
        "gig_id": gig_id,
        "tier": tier,
        "requirements": "TEST requirements"
    })
    if order_r.status_code != 200:
        pytest.skip(f"Order creation failed: {order_r.text}")
    
    order = order_r.json()
    order_id = order["id"]
    assert order["status"] == "funded"
    
    # Now test start as admin (admin is not seller, expect 403)
    start_r = admin_session.post(f"{BASE_URL}/api/orders/{order_id}/start")
    # admin is not the seller, should be 403
    assert start_r.status_code == 403
    print(f"Order start (non-seller): {start_r.status_code} - expected 403 ✓")
    
    # Cleanup: cancel order
    buyer.post(f"{BASE_URL}/api/orders/{order_id}/cancel")
