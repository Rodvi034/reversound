"""Sprint 6 backend tests: Favorites, Job Requests, Blog, Custom Offers, Health"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

ADMIN_EMAIL = "admin@reversound.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.cookies


@pytest.fixture(scope="module")
def admin_session(admin_token):
    s = requests.Session()
    s.cookies.update(admin_token)
    return s


# 1. Health check
def test_health_v6():
    r = requests.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200
    data = r.json()
    assert "v6" in data.get("service", ""), f"Expected v6.0 in health: {data}"
    print(f"Health: {data}")


# 2. Favorites: toggle beat favorite (authenticated)
def test_favorites_toggle_beat(admin_session):
    # Get a beat id first
    r = admin_session.get(f"{BASE_URL}/api/beats?limit=1")
    assert r.status_code == 200
    beats = r.json()
    beat_list = beats if isinstance(beats, list) else beats.get("beats", [])
    if not beat_list:
        pytest.skip("No beats available")
    beat_id = beat_list[0]["id"]

    r = admin_session.post(f"{BASE_URL}/api/favorites/beat/{beat_id}")
    assert r.status_code == 200
    data = r.json()
    assert "favorited" in data
    print(f"Toggle favorite: {data}")

    # Toggle back
    r2 = admin_session.post(f"{BASE_URL}/api/favorites/beat/{beat_id}")
    assert r2.status_code == 200
    assert r2.json()["favorited"] != data["favorited"]


# 3. Favorites: GET /api/favorites returns enriched list
def test_get_favorites(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/favorites")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    print(f"Favorites count: {len(data)}")


# 4. Favorites: GET /api/favorites/ids
def test_get_favorite_ids(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/favorites/ids")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    # Each item should have id and type
    for item in data:
        assert "id" in item
        assert "type" in item
    print(f"Favorite IDs: {data[:3]}")


# 5. Job Requests: GET /api/job-requests returns open requests
def test_list_job_requests():
    r = requests.get(f"{BASE_URL}/api/job-requests")
    assert r.status_code == 200
    data = r.json()
    assert "requests" in data
    assert "total" in data
    print(f"Job requests total: {data['total']}")


# 6. Job Requests: POST /api/job-requests creates a new request
def test_create_job_request(admin_session):
    payload = {
        "title": "TEST_Sprint6 Beat Production Needed",
        "description": "Looking for a trap beat in 808 style",
        "category": "Beat Production",
        "budget_min": 50.0,
        "budget_max": 200.0,
        "delivery_days": 7,
        "genres": ["Trap"],
        "attachments": []
    }
    r = admin_session.post(f"{BASE_URL}/api/job-requests", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == payload["title"]
    assert data["status"] == "open"
    print(f"Created job request: {data['id']}")
    return data["id"]


# 7. Blog: GET /api/blog returns published posts
def test_list_blog_posts():
    r = requests.get(f"{BASE_URL}/api/blog")
    assert r.status_code == 200
    data = r.json()
    assert "posts" in data
    assert "total" in data
    print(f"Blog posts total: {data['total']}")


# 8. Blog: POST /api/blog creates a post (admin)
def test_create_blog_post(admin_session):
    payload = {
        "title": "TEST_Sprint6 Blog Post",
        "content": "This is a test blog post content for Sprint 6 testing.",
        "category": "Announcements",
        "cover_image": "",
        "tags": ["test", "sprint6"],
        "published": True
    }
    r = admin_session.post(f"{BASE_URL}/api/blog", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == payload["title"]
    assert data["published"] == True
    print(f"Created blog post: {data['id']}")

    # Verify it appears in the public list
    r2 = requests.get(f"{BASE_URL}/api/blog")
    posts = r2.json()["posts"]
    ids = [p["id"] for p in posts]
    assert data["id"] in ids, "Created post not visible in public list"


# 9. Custom Offer: POST /api/conversations/{id}/offer
def test_custom_offer(admin_session):
    # Get or create a conversation
    r = admin_session.get(f"{BASE_URL}/api/conversations")
    assert r.status_code == 200
    convs = r.json()
    if not convs:
        pytest.skip("No conversations available to test custom offer")
    conv_id = convs[0]["id"]

    payload = {
        "price": 150.0,
        "delivery_days": 5,
        "description": "Custom offer: 2 exclusive beats"
    }
    r = admin_session.post(f"{BASE_URL}/api/conversations/{conv_id}/offer", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data.get("message_type") == "custom_offer"
    assert data.get("offer_price") == 150.0
    print(f"Custom offer created: {data['id']}")


# Unauthenticated favorites should 401
def test_favorites_requires_auth():
    r = requests.get(f"{BASE_URL}/api/favorites")
    assert r.status_code == 401
    print("Favorites correctly requires auth")


# Invalid item_type for toggle
def test_favorites_invalid_type(admin_session):
    r = admin_session.post(f"{BASE_URL}/api/favorites/song/fake_id")
    assert r.status_code == 400
    print("Invalid item type correctly rejected")
