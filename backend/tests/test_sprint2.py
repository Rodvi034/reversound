"""Sprint 2 tests: Feed, Playlists, Beat type filter, Upload endpoint"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_session():
    session = requests.Session()
    resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@reversound.com", "password": "Admin123!"
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return session

# 1. Health check
def test_health():
    resp = requests.get(f"{BASE_URL}/api/health")
    assert resp.status_code == 200

# 2. Beat listing with item_type=beat returns seeded beats (>0)
def test_beats_type_filter_beat():
    resp = requests.get(f"{BASE_URL}/api/beats", params={"item_type": "beat"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] > 0, f"Expected >0 beats, got {data['total']}"
    print(f"Beats with item_type=beat: {data['total']}")

# 3. Beat listing with item_type=pack returns 0 (no packs seeded)
def test_beats_type_filter_pack():
    resp = requests.get(f"{BASE_URL}/api/beats", params={"item_type": "pack"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0, f"Expected 0 packs, got {data['total']}"

# 4. Feed GET returns posts array
def test_feed_get():
    resp = requests.get(f"{BASE_URL}/api/feed")
    assert resp.status_code == 200
    data = resp.json()
    assert "posts" in data
    print(f"Feed posts count: {data['total']}")

# 5. Feed POST creates post (admin)
def test_feed_create_post(admin_session):
    resp = admin_session.post(f"{BASE_URL}/api/feed",
        json={"content": "TEST_ Hello from admin, great beats today!"}
    )
    assert resp.status_code == 200, f"Create post failed: {resp.text}"
    data = resp.json()
    assert "id" in data
    assert data["content"] == "TEST_ Hello from admin, great beats today!"

# 6. Feed POST blocked by email moderation
def test_feed_moderation_email(admin_session):
    resp = admin_session.post(f"{BASE_URL}/api/feed",
        json={"content": "Contact me at test@email.com for beats"}
    )
    assert resp.status_code == 400, f"Expected 400 for email in post, got {resp.status_code}: {resp.text}"

# 7. Feed POST blocked by URL
def test_feed_moderation_url(admin_session):
    resp = admin_session.post(f"{BASE_URL}/api/feed",
        json={"content": "Check my beats at http://mysite.com"}
    )
    assert resp.status_code == 400, f"Expected 400 for URL in post, got {resp.status_code}"

# 8. Feed like endpoint works
def test_feed_like_post(admin_session):
    create_resp = admin_session.post(f"{BASE_URL}/api/feed",
        json={"content": "TEST_ Like this post!"}
    )
    assert create_resp.status_code == 200
    post_id = create_resp.json()["id"]
    
    like_resp = admin_session.post(f"{BASE_URL}/api/feed/{post_id}/like")
    assert like_resp.status_code == 200
    assert "liked" in like_resp.json()

# 9. Playlists GET returns array
def test_playlists_get():
    resp = requests.get(f"{BASE_URL}/api/playlists")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    print(f"Playlists count: {len(data)}")

# 10. Playlist submit track (authenticated)
def test_playlist_submit(admin_session):
    resp = admin_session.post(f"{BASE_URL}/api/playlists/submit",
        json={"title": "TEST_ My Track", "genre": "Hip Hop", "track_url": "https://example.com/track.mp3", "description": "Test submission"}
    )
    assert resp.status_code == 200, f"Submit failed: {resp.text}"
    data = resp.json()
    assert data["title"] == "TEST_ My Track"
    assert data["status"] == "pending"

# 11. Upload GET returns 404 (no GET route) - behavior test
def test_upload_get_returns_error():
    resp = requests.get(f"{BASE_URL}/api/upload")
    assert resp.status_code in [404, 405], f"Expected 404 or 405, got {resp.status_code}"

# 12. Feed delete post (admin)
def test_feed_delete_post(admin_session):
    create_resp = admin_session.post(f"{BASE_URL}/api/feed",
        json={"content": "TEST_ Delete me"}
    )
    assert create_resp.status_code == 200
    post_id = create_resp.json()["id"]
    
    del_resp = admin_session.delete(f"{BASE_URL}/api/feed/{post_id}")
    assert del_resp.status_code == 200

# 13. Feed comment system
def test_feed_comment(admin_session):
    create_resp = admin_session.post(f"{BASE_URL}/api/feed",
        json={"content": "TEST_ Comment on this"}
    )
    assert create_resp.status_code == 200
    post_id = create_resp.json()["id"]
    
    comment_resp = admin_session.post(f"{BASE_URL}/api/feed/{post_id}/comments",
        json={"content": "Great post!"}
    )
    assert comment_resp.status_code == 200
    data = comment_resp.json()
    assert data["content"] == "Great post!"
