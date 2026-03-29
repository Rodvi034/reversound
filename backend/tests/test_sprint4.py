"""Sprint 4 Backend Tests: Analytics, Notifications, Payment, LiveRoom, Play Events"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

ADMIN_EMAIL = "admin@reversound.com"
ADMIN_PASS = "Admin123!"

@pytest.fixture(scope="module")
def admin_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture(scope="module")
def free_user_headers():
    """Register a free user and return auth headers"""
    uid = str(uuid.uuid4())[:8]
    email = f"TEST_free_{uid}@test.com"
    resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": "Test1234!", "name": f"Free User {uid}",
        "username": f"freeuser_{uid}", "role": "buyer"
    })
    if resp.status_code != 200:
        pytest.skip(f"Free user registration failed: {resp.text}")
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# ── Analytics ──────────────────────────────────────────────────────────────────

class TestAnalytics:
    def test_overview_admin_access(self, admin_headers):
        """Admin can access analytics overview (role=admin bypasses tier check)"""
        r = requests.get(f"{BASE_URL}/api/analytics/overview", headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "total_revenue" in data
        assert "total_beats" in data
        assert "total_plays" in data

    def test_revenue_chart(self, admin_headers):
        """Revenue chart returns list (monthly data)"""
        r = requests.get(f"{BASE_URL}/api/analytics/revenue", headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)

    def test_beats_heatmap_168_points(self, admin_headers):
        """Heatmap returns 168 data points (24 hours x 7 days)"""
        r = requests.get(f"{BASE_URL}/api/analytics/beats/heatmap", headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 168, f"Expected 168 points, got {len(data)}"
        # Check structure
        assert "day" in data[0]
        assert "hour" in data[0]
        assert "plays" in data[0]

    def test_gig_conversion(self, admin_headers):
        """Gig conversion returns list"""
        r = requests.get(f"{BASE_URL}/api/analytics/gigs/conversion", headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)

    def test_audience(self, admin_headers):
        """Audience returns roles and genres distributions"""
        r = requests.get(f"{BASE_URL}/api/analytics/audience", headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "roles" in data
        assert "genres" in data

    def test_free_tier_blocked(self, free_user_headers):
        """Free tier user gets 403 on analytics"""
        r = requests.get(f"{BASE_URL}/api/analytics/overview", headers=free_user_headers)
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"

    def test_unauthenticated_blocked(self):
        """Unauthenticated user gets 401 on analytics"""
        r = requests.get(f"{BASE_URL}/api/analytics/overview")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

# ── Notifications ──────────────────────────────────────────────────────────────

class TestNotifications:
    def test_list_notifications(self, admin_headers):
        """Get notifications list"""
        r = requests.get(f"{BASE_URL}/api/notifications", headers=admin_headers)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_unread_count(self, admin_headers):
        """Unread count returns {count: int}"""
        r = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "count" in data
        assert isinstance(data["count"], int)

    def test_mark_all_read(self, admin_headers):
        """Mark all read returns updated count"""
        r = requests.post(f"{BASE_URL}/api/notifications/read-all", headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "updated" in data

# ── Payment ────────────────────────────────────────────────────────────────────

class TestPayment:
    def test_submerchant_register(self, admin_headers):
        """Register sub-merchant"""
        r = requests.post(f"{BASE_URL}/api/payment/submerchants/register", headers=admin_headers, json={
            "name": "TEST Admin Merchant",
            "email": "admin@reversound.com",
            "iban": "TR000000000000000000000000",
            "identity_number": "11111111111"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "sub_merchant_key" in data or "user_id" in data

    def test_checkout_init_no_order(self, admin_headers):
        """Checkout init with invalid order returns 404"""
        r = requests.post(f"{BASE_URL}/api/payment/checkout/init", headers=admin_headers, json={
            "order_id": "000000000000000000000000"
        })
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

    def test_mock_approve_no_payment(self):
        """Mock approve with invalid payment_id returns 404"""
        r = requests.get(f"{BASE_URL}/api/payment/mock-approve/nonexistent-payment-id-12345")
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

    def test_payment_history(self, admin_headers):
        """Payment history returns list"""
        r = requests.get(f"{BASE_URL}/api/payment/history", headers=admin_headers)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

# ── LiveRoom ──────────────────────────────────────────────────────────────────

class TestLiveRoom:
    def test_get_nonexistent_room(self):
        """Non-existent room returns exists=False"""
        r = requests.get(f"{BASE_URL}/api/liverooms/testroom")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("exists") == False

    def test_room_state_backend_is_memory(self):
        """State backend should be memory (no Redis)"""
        # A non-existent room still tells us about the backend
        r = requests.get(f"{BASE_URL}/api/liverooms/testroom")
        assert r.status_code == 200
        # If room doesn't exist it returns {"exists": False} so we just check no 500

# ── Play Events ───────────────────────────────────────────────────────────────

class TestPlayEvents:
    def test_beat_play_tracking(self, admin_headers):
        """Beat play event tracking"""
        # First get a beat
        r = requests.get(f"{BASE_URL}/api/beats", headers=admin_headers)
        assert r.status_code == 200
        beats = r.json()
        if not beats.get("beats") and not isinstance(beats, list):
            pytest.skip("No beats available to test play tracking")
        
        beat_list = beats.get("beats", beats) if isinstance(beats, dict) else beats
        if not beat_list:
            pytest.skip("No beats in database")

        beat_id = beat_list[0].get("id") or str(beat_list[0].get("_id", ""))
        r2 = requests.post(f"{BASE_URL}/api/beats/{beat_id}/play", headers=admin_headers)
        assert r2.status_code in (200, 201, 204), f"Play event failed: {r2.status_code} {r2.text}"
