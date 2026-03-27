"""
Iteration 15 - Site Settings Features Tests
Tests for:
1. Hero Video Management (GET/PUT/POST upload)
2. Tiered Referral Commission (GET/PUT/report)
3. Instagram Auto DM System (MOCKED - config, rules, test-dm)
4. WhatsApp Cart Reminder System (MOCKED - config, connect, test-reminder)
5. Tracking Pixels (Meta Pixel & Google Ads)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@pigma.com"
SUPER_ADMIN_PASSWORD = "superadmin123"


class TestHealthCheck:
    """Basic health check to ensure API is accessible"""
    
    def test_api_health(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("✓ API health check passed")


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "admin" in data, "No admin data in response"
        assert data["admin"]["role"] == "super_admin", "Not super admin"
        print(f"✓ Admin login successful - role: {data['admin']['role']}")
        return data["token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return response.json()["token"]


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


# ============== HERO VIDEO MANAGEMENT TESTS ==============

class TestHeroVideoManagement:
    """Tests for Hero Video Management feature"""
    
    def test_get_hero_video_public(self):
        """GET /api/admin/site/hero-video - Public endpoint returns video config"""
        response = requests.get(f"{BASE_URL}/api/admin/site/hero-video")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "video_url" in data, "Missing video_url"
        assert "poster_url" in data, "Missing poster_url"
        print(f"✓ Hero video GET - video_url: {data['video_url'][:50]}...")
    
    def test_update_hero_video_url(self, admin_headers):
        """PUT /api/admin/site/hero-video - Update video URL"""
        test_url = "https://test-video.example.com/video.mp4"
        test_poster = "https://test-poster.example.com/poster.jpg"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/site/hero-video",
            json={"video_url": test_url, "poster_url": test_poster},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("message") == "Hero video updated", f"Unexpected response: {data}"
        
        # Verify the update persisted
        verify_response = requests.get(f"{BASE_URL}/api/admin/site/hero-video")
        verify_data = verify_response.json()
        assert verify_data["video_url"] == test_url, "Video URL not persisted"
        assert verify_data["poster_url"] == test_poster, "Poster URL not persisted"
        print("✓ Hero video URL update and persistence verified")
    
    def test_update_hero_video_requires_auth(self):
        """PUT /api/admin/site/hero-video - Requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/site/hero-video",
            json={"video_url": "https://test.com/video.mp4"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Hero video update requires authentication")


# ============== TIERED REFERRAL COMMISSION TESTS ==============

class TestReferralTiers:
    """Tests for Tiered Referral Commission feature"""
    
    def test_get_referral_tiers(self, admin_headers):
        """GET /api/admin/site/referral-tiers - Returns tier configuration"""
        response = requests.get(
            f"{BASE_URL}/api/admin/site/referral-tiers",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "tiers" in data, "Missing tiers"
        assert "is_enabled" in data, "Missing is_enabled"
        assert isinstance(data["tiers"], list), "Tiers should be a list"
        
        # Verify default tiers structure
        if len(data["tiers"]) > 0:
            tier = data["tiers"][0]
            assert "min_referrals" in tier, "Tier missing min_referrals"
            assert "max_referrals" in tier, "Tier missing max_referrals"
            assert "rate" in tier, "Tier missing rate"
        print(f"✓ Referral tiers GET - {len(data['tiers'])} tiers configured")
    
    def test_update_referral_tiers(self, admin_headers):
        """PUT /api/admin/site/referral-tiers - Update tier configuration"""
        custom_tiers = {
            "tiers": [
                {"min_referrals": 1, "max_referrals": 5, "rate": 0.5},
                {"min_referrals": 6, "max_referrals": 20, "rate": 1.0},
                {"min_referrals": 21, "max_referrals": -1, "rate": 2.5}
            ],
            "is_enabled": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/site/referral-tiers",
            json=custom_tiers,
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message"
        assert "tiers" in data, "Missing tiers in response"
        
        # Verify persistence
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/site/referral-tiers",
            headers=admin_headers
        )
        verify_data = verify_response.json()
        assert len(verify_data["tiers"]) == 3, "Tiers not persisted correctly"
        print("✓ Referral tiers update and persistence verified")
    
    def test_get_referral_tiers_report(self, admin_headers):
        """GET /api/admin/site/referral-tiers/report - Returns tracking report"""
        response = requests.get(
            f"{BASE_URL}/api/admin/site/referral-tiers/report",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "report" in data, "Missing report"
        assert "tiers" in data, "Missing tiers"
        assert isinstance(data["report"], list), "Report should be a list"
        print(f"✓ Referral tiers report - {len(data['report'])} referrers found")
    
    def test_referral_tiers_requires_auth(self):
        """GET /api/admin/site/referral-tiers - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/site/referral-tiers")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Referral tiers requires authentication")


# ============== INSTAGRAM AUTO DM TESTS (MOCKED) ==============

class TestInstagramDM:
    """Tests for Instagram Auto DM System (MOCKED)"""
    
    def test_get_instagram_config(self, admin_headers):
        """GET /api/admin/site/instagram/config - Returns IG DM config"""
        response = requests.get(
            f"{BASE_URL}/api/admin/site/instagram/config",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # is_connected may not be present if config was partially updated
        assert "setting_id" in data or "rules" in data, "Missing expected fields"
        rules = data.get("rules", [])
        print(f"✓ Instagram config GET - connected: {data.get('is_connected', 'N/A')}, rules: {len(rules)}")
    
    def test_add_dm_rule(self, admin_headers):
        """POST /api/admin/site/instagram/rules - Add DM rule"""
        rule = {
            "trigger_keyword": "TEST_discount",
            "dm_message": "Thanks for your interest! Here's a 10% discount code: TEST10",
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/site/instagram/rules",
            json=rule,
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "rule" in data, "Missing rule in response"
        assert data["rule"]["trigger_keyword"] == "TEST_discount", "Keyword mismatch"
        assert "rule_id" in data["rule"], "Missing rule_id"
        print(f"✓ Instagram DM rule added - rule_id: {data['rule']['rule_id']}")
        return data["rule"]["rule_id"]
    
    def test_test_dm_send(self, admin_headers):
        """POST /api/admin/site/instagram/test-dm - Send test DM (MOCKED)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/site/instagram/test-dm?rule_id=&username=test_iteration15",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message"
        assert "MOCK" in data["message"], "Should indicate MOCK"
        assert "dm" in data, "Missing dm log"
        assert data["dm"]["status"] == "sent_mock", "Status should be sent_mock"
        print(f"✓ Instagram test DM sent (MOCKED) - dm_id: {data['dm']['dm_id']}")
    
    def test_delete_dm_rule(self, admin_headers):
        """DELETE /api/admin/site/instagram/rules/{rule_id} - Delete rule"""
        # First add a rule to delete
        rule = {
            "trigger_keyword": "TEST_delete_me",
            "dm_message": "This rule will be deleted",
            "is_active": True
        }
        add_response = requests.post(
            f"{BASE_URL}/api/admin/site/instagram/rules",
            json=rule,
            headers=admin_headers
        )
        rule_id = add_response.json()["rule"]["rule_id"]
        
        # Delete the rule
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/site/instagram/rules/{rule_id}",
            headers=admin_headers
        )
        assert delete_response.status_code == 200, f"Failed: {delete_response.text}"
        
        # Verify deletion
        config_response = requests.get(
            f"{BASE_URL}/api/admin/site/instagram/config",
            headers=admin_headers
        )
        rules = config_response.json().get("rules", [])
        rule_ids = [r["rule_id"] for r in rules]
        assert rule_id not in rule_ids, "Rule was not deleted"
        print(f"✓ Instagram DM rule deleted - rule_id: {rule_id}")
    
    def test_instagram_config_requires_auth(self):
        """GET /api/admin/site/instagram/config - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/site/instagram/config")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Instagram config requires authentication")


# ============== WHATSAPP CART REMINDER TESTS (MOCKED) ==============

class TestWhatsAppReminders:
    """Tests for WhatsApp Cart Reminder System (MOCKED)"""
    
    def test_get_whatsapp_config(self, admin_headers):
        """GET /api/admin/site/whatsapp/config - Returns WA config"""
        response = requests.get(
            f"{BASE_URL}/api/admin/site/whatsapp/config",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Fields may not all be present if config was partially updated
        assert "setting_id" in data, "Missing setting_id"
        print(f"✓ WhatsApp config GET - enabled: {data.get('is_enabled', 'N/A')}, connected: {data.get('is_connected', 'N/A')}")
    
    def test_update_whatsapp_config(self, admin_headers):
        """PUT /api/admin/site/whatsapp/config - Update WA settings"""
        config = {
            "is_enabled": True,
            "reminder_delay_hours": 12,
            "message_template": "Hi {name}! TEST: Your cart is waiting at {cart_link}"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/site/whatsapp/config",
            json=config,
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify persistence
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/site/whatsapp/config",
            headers=admin_headers
        )
        verify_data = verify_response.json()
        assert verify_data["is_enabled"] == True, "is_enabled not persisted"
        assert verify_data["reminder_delay_hours"] == 12, "delay_hours not persisted"
        print("✓ WhatsApp config update and persistence verified")
    
    def test_connect_whatsapp(self, admin_headers):
        """POST /api/admin/site/whatsapp/connect - Connect WA (MOCKED)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/site/whatsapp/connect?phone_number=+911234567890&api_key=test_mock_key",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "is_connected" in data, "Missing is_connected"
        assert data["is_connected"] == True, "Should be connected"
        print("✓ WhatsApp connected (MOCKED)")
    
    def test_test_cart_reminder(self, admin_headers):
        """POST /api/admin/site/whatsapp/test-reminder - Send test reminder (MOCKED)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/site/whatsapp/test-reminder?user_phone=+919876543210&user_name=TestUser",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message"
        assert "MOCK" in data["message"], "Should indicate MOCK"
        assert "reminder" in data, "Missing reminder log"
        assert data["reminder"]["status"] == "sent_mock", "Status should be sent_mock"
        print(f"✓ WhatsApp test reminder sent (MOCKED) - reminder_id: {data['reminder']['reminder_id']}")
    
    def test_whatsapp_config_requires_auth(self):
        """GET /api/admin/site/whatsapp/config - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/site/whatsapp/config")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ WhatsApp config requires authentication")


# ============== TRACKING PIXELS TESTS ==============

class TestTrackingPixels:
    """Tests for Meta Pixel & Google Ads Pixel feature"""
    
    def test_get_tracking_pixels_public(self):
        """GET /api/admin/site/tracking-pixels - Public endpoint returns pixel IDs"""
        response = requests.get(f"{BASE_URL}/api/admin/site/tracking-pixels")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "meta_pixel_id" in data, "Missing meta_pixel_id"
        assert "google_ads_id" in data, "Missing google_ads_id"
        print(f"✓ Tracking pixels GET - meta: {data.get('meta_pixel_id')}, google: {data.get('google_ads_id')}")


# ============== CLEANUP ==============

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_rules(self, admin_headers):
        """Remove TEST_ prefixed rules"""
        config_response = requests.get(
            f"{BASE_URL}/api/admin/site/instagram/config",
            headers=admin_headers
        )
        rules = config_response.json().get("rules", [])
        
        deleted_count = 0
        for rule in rules:
            if rule.get("trigger_keyword", "").startswith("TEST_"):
                requests.delete(
                    f"{BASE_URL}/api/admin/site/instagram/rules/{rule['rule_id']}",
                    headers=admin_headers
                )
                deleted_count += 1
        
        print(f"✓ Cleanup: Deleted {deleted_count} TEST_ prefixed rules")
    
    def test_restore_default_hero_video(self, admin_headers):
        """Restore default hero video URL"""
        default_url = "https://assets.mixkit.co/videos/52278/52278-720.mp4"
        default_poster = "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1920&q=80"
        
        requests.put(
            f"{BASE_URL}/api/admin/site/hero-video",
            json={"video_url": default_url, "poster_url": default_poster},
            headers=admin_headers
        )
        print("✓ Cleanup: Restored default hero video")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
