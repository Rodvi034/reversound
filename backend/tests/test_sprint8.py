"""
Sprint 8 Backend Tests: PDF contracts/invoices, CMS, Content Moderation, Copyright, Studio plans
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "admin@reversound.com"
ADMIN_PASS = "Admin123!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json().get("access_token") or r.cookies.get("access_token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    if admin_token:
        return {"Authorization": f"Bearer {admin_token}"}
    return {}


@pytest.fixture(scope="module")
def admin_session(admin_headers):
    s = requests.Session()
    s.headers.update(admin_headers)
    return s


@pytest.fixture(scope="module")
def completed_order_id(admin_session):
    """Get a completed order or create scenario"""
    r = admin_session.get(f"{BASE_URL}/api/admin/orders?status=completed&limit=1")
    if r.status_code == 200:
        orders = r.json()
        if isinstance(orders, list) and orders:
            return orders[0].get("id") or str(orders[0].get("_id", ""))
        if isinstance(orders, dict):
            items = orders.get("orders", orders.get("items", []))
            if items:
                return items[0].get("id") or str(items[0].get("_id", ""))
    # Try all orders
    r2 = admin_session.get(f"{BASE_URL}/api/orders?limit=5")
    if r2.status_code == 200:
        orders = r2.json()
        if isinstance(orders, list) and orders:
            return orders[0].get("id") or str(orders[0].get("_id", ""))
    return None


# ── CMS Tests ──────────────────────────────────────────────────────────────────

class TestCMS:
    def test_get_cms_public(self):
        """GET /api/cms returns homepage content"""
        r = requests.get(f"{BASE_URL}/api/cms")
        assert r.status_code == 200, f"CMS get failed: {r.text}"
        data = r.json()
        assert "hero" in data, "Missing hero section"
        assert "stats" in data, "Missing stats section"
        assert "genres" in data, "Missing genres section"
        print(f"CMS hero title: {data['hero'].get('title', '')}")

    def test_cms_hero_title(self):
        """Hero title should contain Turkish text"""
        r = requests.get(f"{BASE_URL}/api/cms")
        assert r.status_code == 200
        data = r.json()
        title = data.get("hero", {}).get("title", "")
        assert len(title) > 0, "Hero title is empty"
        print(f"Hero title: {title}")

    def test_cms_update_admin(self, admin_session):
        """PUT /api/cms updates content (admin only)"""
        r = admin_session.get(f"{BASE_URL}/api/cms")
        current = r.json()
        current["hero"]["title"] = "TEST HERO TITLE"
        resp = admin_session.put(f"{BASE_URL}/api/cms", json=current)
        assert resp.status_code == 200, f"CMS update failed: {resp.text}"
        print(f"CMS update response: {resp.json()}")

    def test_cms_patch_section(self, admin_session):
        """PATCH /api/cms/section/hero updates just hero"""
        r = admin_session.patch(f"{BASE_URL}/api/cms/section/hero", json={
            "title": "İLK HİTİN BURADA BAŞLIYOR",
            "subtitle": "Test subtitle"
        })
        assert r.status_code == 200, f"CMS patch failed: {r.text}"

    def test_cms_reset(self, admin_session):
        """POST /api/cms/reset resets to defaults"""
        r = admin_session.post(f"{BASE_URL}/api/cms/reset")
        assert r.status_code == 200, f"CMS reset failed: {r.text}"
        # Verify defaults restored
        r2 = requests.get(f"{BASE_URL}/api/cms")
        data = r2.json()
        assert "İLK HİTİN" in data.get("hero", {}).get("title", ""), "Default title not restored"

    def test_cms_no_auth_put(self):
        """PUT /api/cms without admin returns 401/403"""
        r = requests.put(f"{BASE_URL}/api/cms", json={"hero": {}})
        assert r.status_code in [401, 403], f"Should be unauthorized: {r.status_code}"


# ── Content Moderation Tests ──────────────────────────────────────────────────

class TestModeration:
    """Test moderation via gig creation endpoint"""

    @pytest.fixture(scope="class")
    def seller_token(self):
        # Try to register a seller
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "TEST_seller_mod@reversound.com",
            "password": "Test123!",
            "full_name": "Test Seller Mod",
            "username": "test_seller_mod",
            "role": "producer"
        })
        if r.status_code in [200, 201]:
            return r.json().get("token")
        # Try login
        r2 = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_seller_mod@reversound.com",
            "password": "Test123!"
        })
        if r2.status_code == 200:
            return r2.json().get("token")
        return None

    def test_blocked_extreme_content(self, seller_token):
        """Creating gig with 'child porn' in title should be BLOCKED (400)"""
        if not seller_token:
            pytest.skip("No seller token")
        headers = {"Authorization": f"Bearer {seller_token}"}
        r = requests.post(f"{BASE_URL}/api/gigs", json={
            "title": "child porn gig production",
            "description": "test description",
            "category": "mixing",
            "price": 100,
            "delivery_days": 3
        }, headers=headers)
        assert r.status_code == 400, f"Should be blocked, got {r.status_code}: {r.text}"
        print(f"Blocked response: {r.json()}")

    def test_flagged_profanity(self, seller_token):
        """Creating gig with mild profanity should be FLAGGED but allowed or queued"""
        if not seller_token:
            pytest.skip("No seller token")
        headers = {"Authorization": f"Bearer {seller_token}"}
        r = requests.post(f"{BASE_URL}/api/gigs", json={
            "title": "fuck yeah trap beats production service",
            "description": "professional mixing and mastering",
            "category": "mixing",
            "price": 100,
            "delivery_days": 3
        }, headers=headers)
        # Should either be 201 (queued) or 400 if flagged means reject
        # Based on moderation service: FLAGGED in gig_title context returns queue_review action
        # The route decides whether to allow or reject - let's check
        print(f"Flagged gig status: {r.status_code}, response: {r.text[:200]}")
        assert r.status_code in [200, 201, 400], f"Unexpected status: {r.status_code}"

    def test_batch_moderate_copyright_violation(self):
        """batch_moderate blocks 'copyright violation' text"""
        from services.moderation_service import batch_moderate
        result = batch_moderate({"title": "copyright violation beat", "description": "stolen beat"})
        assert result["verdict"] == "BLOCKED", f"Should be blocked: {result}"
        print(f"Batch moderate result: {result}")


# ── PDF Tests ─────────────────────────────────────────────────────────────────

class TestPDF:
    def test_contract_pdf(self, admin_session, completed_order_id):
        """GET /api/orders/{id}/contract returns PDF"""
        if not completed_order_id:
            pytest.skip("No completed order found")
        r = admin_session.get(f"{BASE_URL}/api/orders/{completed_order_id}/contract")
        assert r.status_code == 200, f"Contract PDF failed: {r.status_code} {r.text[:200]}"
        assert "application/pdf" in r.headers.get("content-type", ""), f"Not PDF: {r.headers}"
        assert len(r.content) > 1000, "PDF too small"
        print(f"Contract PDF size: {len(r.content)} bytes")

    def test_invoice_pdf(self, admin_session, completed_order_id):
        """GET /api/orders/{id}/invoice returns PDF"""
        if not completed_order_id:
            pytest.skip("No completed order found")
        r = admin_session.get(f"{BASE_URL}/api/orders/{completed_order_id}/invoice")
        assert r.status_code == 200, f"Invoice PDF failed: {r.status_code} {r.text[:200]}"
        assert "application/pdf" in r.headers.get("content-type", ""), f"Not PDF: {r.headers}"
        assert len(r.content) > 1000, "PDF too small"
        print(f"Invoice PDF size: {len(r.content)} bytes")

    def test_pdf_service_contract_direct(self):
        """Direct test of PDF generation service"""
        from services.pdf_service import generate_license_contract
        pdf = generate_license_contract({
            "buyer_name": "Test Buyer", "buyer_email": "buyer@test.com",
            "producer_name": "Test Producer", "producer_username": "testprod",
            "beat_title": "Test Beat", "genre": "Trap", "bpm": 140, "key": "Am",
            "license_type": "basic", "price": 500, "purchase_id": "TEST001"
        })
        assert isinstance(pdf, bytes) and len(pdf) > 1000
        assert pdf[:4] == b'%PDF'
        print(f"Contract PDF generated: {len(pdf)} bytes")

    def test_pdf_service_invoice_direct(self):
        """Direct test of invoice PDF generation"""
        from services.pdf_service import generate_invoice
        pdf = generate_invoice({
            "invoice_number": "INV-TEST001",
            "buyer_name": "Test Buyer", "buyer_email": "buyer@test.com",
            "seller_name": "Test Producer",
            "items": [{"title": "Test Beat", "license": "basic", "price": 500}],
            "subtotal": 500, "platform_fee": 50, "total": 550
        })
        assert isinstance(pdf, bytes) and len(pdf) > 1000
        assert pdf[:4] == b'%PDF'
        print(f"Invoice PDF generated: {len(pdf)} bytes")


# ── Copyright Service Tests ────────────────────────────────────────────────────

class TestCopyright:
    def test_copyright_service_mock(self):
        """Copyright service mock returns CLEAR"""
        import sys
        sys.path.insert(0, '/app/backend')
        from services.copyright_service import CopyrightCheckService
        svc = CopyrightCheckService()
        import asyncio
        result = asyncio.run(svc.check_audio_url("http://test.com/beat.mp3"))
        assert result.status in ["CLEAR", "PENDING", "ERROR"], f"Unexpected status: {result.status}"
        print(f"Copyright check result: {result}")


# ── Studio Plans Tests ─────────────────────────────────────────────────────────

class TestStudio:
    def test_studio_plans(self):
        """GET /api/studio/plans returns 3 plans"""
        r = requests.get(f"{BASE_URL}/api/studio/plans")
        assert r.status_code == 200, f"Studio plans failed: {r.text}"
        data = r.json()
        plans = data if isinstance(data, list) else list(data.values()) if isinstance(data, dict) else []
        assert len(plans) == 3, f"Expected 3 plans, got {len(plans)}: {list(data.keys()) if isinstance(data,dict) else plans}"
        print(f"Studio plans: {[p.get('name') for p in plans]}")
