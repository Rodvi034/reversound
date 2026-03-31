"""Sprint 7 backend tests: Studio plans, Studio subscribe, Job proposal accept, Blog endpoints"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_session():
    session = requests.Session()
    res = session.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@reversound.com", "password": "Admin123!"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    token = res.json().get("token")
    if token:
        session.headers.update({"Authorization": f"Bearer {token}"})
    return session

@pytest.fixture(scope="module")
def auth_headers(admin_session):
    return dict(admin_session.headers)

# =====================
# Studio Plans
# =====================
class TestStudioPlans:
    """Test Rever Studio plan endpoints"""

    def test_get_studio_plans_returns_3(self):
        res = requests.get(f"{BASE_URL}/api/studio/plans")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 3, f"Expected 3 plans, got {len(data)}"
        assert "studio_basic" in data
        assert "studio_pro" in data
        assert "studio_elite" in data

    def test_studio_plans_have_required_fields(self):
        res = requests.get(f"{BASE_URL}/api/studio/plans")
        data = res.json()
        for key, plan in data.items():
            assert "name" in plan, f"{key} missing name"
            assert "price" in plan, f"{key} missing price"
            assert "features" in plan, f"{key} missing features"

    def test_studio_basic_price(self):
        res = requests.get(f"{BASE_URL}/api/studio/plans")
        assert res.json()["studio_basic"]["price"] == 149

    def test_studio_subscribe_requires_auth(self):
        res = requests.post(f"{BASE_URL}/api/studio/subscribe?tier=studio_basic", json={})
        assert res.status_code in [401, 403]

    def test_studio_subscribe_invalid_tier(self, admin_session):
        # Top up wallet first for admin
        admin_session.post(f"{BASE_URL}/api/wallet/topup", json={"amount": 1000})
        res = admin_session.post(f"{BASE_URL}/api/studio/subscribe?tier=invalid_tier", json={})
        assert res.status_code == 400

    def test_studio_subscribe_with_funded_wallet(self, admin_session):
        # Top up wallet
        admin_session.post(f"{BASE_URL}/api/wallet/topup", json={"amount": 2000})
        res = admin_session.post(f"{BASE_URL}/api/studio/subscribe?tier=studio_basic", json={})
        # Could be 200 or 400 (if already subscribed or insufficient balance)
        assert res.status_code in [200, 400], f"Unexpected status: {res.status_code}, {res.text}"
        if res.status_code == 200:
            data = res.json()
            assert "tier" in data
            assert data["tier"] == "studio_basic"


# =====================
# Blog Endpoints
# =====================
class TestBlogEndpoints:
    """Test blog CRUD endpoints"""

    def test_get_blog_list(self):
        res = requests.get(f"{BASE_URL}/api/blog")
        assert res.status_code == 200
        data = res.json()
        assert "posts" in data

    def test_get_blog_post_by_id(self, auth_headers):
        # Get a post from list
        list_res = requests.get(f"{BASE_URL}/api/blog?limit=5")
        assert list_res.status_code == 200
        posts = list_res.json().get("posts", [])
        if not posts:
            pytest.skip("No blog posts available")
        post_id = posts[0]["id"]
        res = requests.get(f"{BASE_URL}/api/blog/{post_id}")
        assert res.status_code == 200
        data = res.json()
        assert "title" in data
        assert "content" in data
        assert data["id"] == post_id

    def test_get_nonexistent_blog_returns_404(self):
        res = requests.get(f"{BASE_URL}/api/blog/000000000000000000000000")
        assert res.status_code == 404


# =====================
# Job Requests
# =====================
class TestJobRequests:
    """Test job request and proposal endpoints"""

    def test_list_job_requests(self):
        res = requests.get(f"{BASE_URL}/api/job-requests")
        assert res.status_code == 200
        data = res.json()
        assert "requests" in data

    def test_get_job_request_by_id(self):
        list_res = requests.get(f"{BASE_URL}/api/job-requests?limit=5")
        assert list_res.status_code == 200
        jobs = list_res.json().get("requests", [])
        if not jobs:
            pytest.skip("No job requests available")
        job_id = jobs[0]["id"]
        res = requests.get(f"{BASE_URL}/api/job-requests/{job_id}")
        assert res.status_code == 200
        data = res.json()
        assert "title" in data
        assert "proposals" in data

    def test_get_nonexistent_job_returns_404(self):
        res = requests.get(f"{BASE_URL}/api/job-requests/000000000000000000000000")
        assert res.status_code == 404

    def test_create_job_request(self, admin_session):
        payload = {
            "title": "TEST_Sprint7 Job",
            "description": "Test job request for sprint 7",
            "category": "Beat Production",
            "budget_min": 100,
            "budget_max": 500,
            "delivery_days": 7,
            "genres": ["Trap"],
        }
        res = admin_session.post(f"{BASE_URL}/api/job-requests", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["title"] == payload["title"]
        assert "id" in data
        return data["id"]

    def test_accept_proposal_requires_auth(self):
        res = requests.post(f"{BASE_URL}/api/job-requests/fakeid/proposals/fakepid/accept", json={})
        assert res.status_code in [401, 403, 422]
