"""Sprint 11 backend tests: DLP masking, password validation, profile, gear routing"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@reversound.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code == 200:
        return r.json().get("access_token")
    pytest.skip(f"Admin login failed: {r.status_code} {r.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ── Password Validation ─────────────────────────────────────────────────────

class TestPasswordValidation:
    """Test strong password rules: 8+ chars, 1 uppercase, 1 number"""

    def test_weak_password_no_uppercase(self):
        """password='test123' should return 400"""
        r = requests.post(f"{API}/auth/register", json={
            "email": "TEST_weakpw1@test.com",
            "password": "test123",
            "name": "Test User",
            "username": "TEST_weakpw1user"
        })
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        data = r.json()
        assert "detail" in data

    def test_weak_password_too_short(self):
        """password='Ab1' should return 400 (too short)"""
        r = requests.post(f"{API}/auth/register", json={
            "email": "TEST_weakpw2@test.com",
            "password": "Ab1",
            "name": "Test User",
            "username": "TEST_weakpw2user"
        })
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"

    def test_weak_password_no_number(self):
        """password='Testing' no digit should return 400"""
        r = requests.post(f"{API}/auth/register", json={
            "email": "TEST_weakpw3@test.com",
            "password": "TestingABC",
            "name": "Test User",
            "username": "TEST_weakpw3user"
        })
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"

    def test_valid_password_succeeds(self):
        """password='Testing1' should succeed (201 or 200)"""
        import random
        suffix = random.randint(10000, 99999)
        r = requests.post(f"{API}/auth/register", json={
            "email": f"TEST_validpw{suffix}@test.com",
            "password": "Testing1",
            "name": "Test User",
            "username": f"TEST_validpw{suffix}"
        })
        assert r.status_code in [200, 201], f"Expected 200/201, got {r.status_code}: {r.text}"
        data = r.json()
        assert "user" in data or "access_token" in data


# ── DLP Masking ─────────────────────────────────────────────────────────────

class TestDLPMasking:
    """DLP: messages delivered but sensitive data replaced"""

    @pytest.fixture(scope="class")
    def test_user_token(self):
        """Register a fresh user and get token"""
        import random
        suffix = random.randint(10000, 99999)
        r = requests.post(f"{API}/auth/register", json={
            "email": f"TEST_dlp{suffix}@test.com",
            "password": "Testing1",
            "name": "DLP Tester",
            "username": f"TEST_dlp{suffix}"
        })
        if r.status_code not in [200, 201]:
            pytest.skip(f"User registration failed: {r.status_code}")
        return r.json().get("access_token")

    @pytest.fixture(scope="class")
    def conversation_id(self, admin_headers):
        """Use admin to create conversation with themselves (need 2 users)"""
        # Get admin user info
        me = requests.get(f"{API}/auth/me", headers=admin_headers)
        if me.status_code != 200:
            pytest.skip("Cannot get admin info")
        admin_id = me.json()["id"]

        # Register a second user
        import random
        suffix = random.randint(10000, 99999)
        r2 = requests.post(f"{API}/auth/register", json={
            "email": f"TEST_dlp2nd{suffix}@test.com",
            "password": "Testing1",
            "name": "DLP Second",
            "username": f"TEST_dlp2nd{suffix}"
        })
        if r2.status_code not in [200, 201]:
            pytest.skip("Second user registration failed")
        second_token = r2.json().get("access_token")
        second_id = r2.json()["user"]["id"]

        # Create conversation from admin to second user
        c = requests.post(f"{API}/conversations",
                          json={"participant_id": second_id},
                          headers=admin_headers)
        if c.status_code not in [200, 201]:
            pytest.skip(f"Could not create conversation: {c.status_code} {c.text}")
        return c.json()["id"], admin_headers

    def test_email_dlp_masked(self, conversation_id):
        """Email in message should be replaced with [E-POSTA GİZLENDİ]"""
        conv_id, headers = conversation_id
        r = requests.post(f"{API}/conversations/{conv_id}/messages",
                          json={"content": "Bana email at: test.user@gmail.com"},
                          headers=headers)
        assert r.status_code in [200, 201], f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        content = data.get("content", "")
        assert "[E-POSTA GİZLENDİ]" in content, f"Email not masked. Content: {content}"
        assert "gmail.com" not in content, f"Raw email leaked: {content}"

    def test_phone_dlp_masked(self, conversation_id):
        """Turkish phone in message should be replaced with [TELEFON GİZLENDİ]"""
        conv_id, headers = conversation_id
        r = requests.post(f"{API}/conversations/{conv_id}/messages",
                          json={"content": "Ara beni: 05321234567"},
                          headers=headers)
        assert r.status_code in [200, 201], f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        content = data.get("content", "")
        assert "[TELEFON GİZLENDİ]" in content, f"Phone not masked. Content: {content}"


# ── Gear API ─────────────────────────────────────────────────────────────────

class TestGearAPI:
    """Gear detail endpoint"""

    def test_gear_list(self):
        """GET /gear should return listings"""
        r = requests.get(f"{API}/gear")
        assert r.status_code == 200
        data = r.json()
        assert "listings" in data

    def test_gear_detail_exists(self):
        """GET /gear/{id} should work for valid gear item"""
        # First get a gear item from list
        r = requests.get(f"{API}/gear")
        assert r.status_code == 200
        listings = r.json().get("listings", [])
        if not listings:
            pytest.skip("No gear listings available")
        gear_id = listings[0]["id"]

        detail = requests.get(f"{API}/gear/{gear_id}")
        assert detail.status_code == 200, f"Got {detail.status_code}: {detail.text}"
        data = detail.json()
        assert "title" in data
        assert "price" in data
        assert "seller_name" in data

    def test_gear_detail_invalid_id(self):
        """GET /gear/invalid_id should return 404"""
        r = requests.get(f"{API}/gear/000000000000000000000000")
        assert r.status_code == 404


# ── Profile Update ────────────────────────────────────────────────────────────

class TestProfileUpdate:
    """PATCH /api/auth/profile"""

    def test_update_name_and_bio(self, admin_headers):
        """Profile update should persist changes"""
        r = requests.patch(f"{API}/auth/profile",
                           json={"name": "Updated Admin Name", "bio": "Test bio update"},
                           headers=admin_headers)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("name") == "Updated Admin Name"
        assert data.get("bio") == "Test bio update"

    def test_update_coach_profile(self, admin_headers):
        """Coach questionnaire answers should be saved"""
        coach_data = {
            "target_audience": "Underground/Niche Kitle",
            "musical_style": ["Trap / Drill", "Hip-Hop / Boom Bap"],
            "technical_level": "Profesyonel seviye"
        }
        r = requests.patch(f"{API}/auth/profile",
                           json={"coach_profile": coach_data},
                           headers=admin_headers)
        assert r.status_code == 200, f"Got {r.status_code}: {r.text}"
        data = r.json()
        assert "coach_profile" in data
        assert data["coach_profile"]["target_audience"] == "Underground/Niche Kitle"
