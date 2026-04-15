"""
Instagram / Facebook Graph API v19.0 Integration Tests
=======================================================
Tests for the complete rewrite of Instagram integration using Facebook Login for Business.

Endpoints tested:
1. GET /api/instagram/auth/login - OAuth URL generation (facebook.com/v19.0/dialog/oauth)
2. GET /api/instagram/auth/status - Connection status
3. POST /api/instagram/auth/disconnect - Disconnect account
4. GET /api/webhooks/instagram - Webhook verification (GET challenge)
5. POST /api/webhooks/instagram - Webhook event handling
6. GET /api/influencers/instagram/connect - Influencer OAuth URL
7. GET /api/admin/instagram/status - Admin connection status
8. GET /api/admin/instagram/dm-config - Get DM config
9. PUT /api/admin/instagram/dm-config - Update DM config
10. POST /api/webhooks/instagram/deauthorize - Deauthorization callback
"""

import pytest
import requests
import os
import json
from urllib.parse import urlparse, parse_qs

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "admin@pigma.com"
CUSTOMER_PASSWORD = "admin123"
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"

# Expected values
META_APP_ID = "1280214187553693"
WEBHOOK_VERIFY_TOKEN = "pigma_ig_verify_2024"
EXPECTED_SCOPES = [
    "instagram_basic",
    "instagram_manage_messages",
    "instagram_manage_comments",
    "pages_show_list",
    "pages_read_engagement",
    "business_management"
]


class TestInstagramOAuthLogin:
    """Test Instagram OAuth login endpoint - GET /api/instagram/auth/login"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")
    
    def test_instagram_login_returns_facebook_oauth_url(self, customer_token):
        """Verify OAuth URL contains facebook.com/v19.0/dialog/oauth"""
        response = requests.get(
            f"{BASE_URL}/api/instagram/auth/login",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "oauth_url" in data, "Response should contain oauth_url"
        assert "state" in data, "Response should contain state"
        
        oauth_url = data["oauth_url"]
        
        # Verify it's Facebook v19.0 OAuth URL (not old api.instagram.com)
        assert "facebook.com/v19.0/dialog/oauth" in oauth_url, \
            f"OAuth URL should contain 'facebook.com/v19.0/dialog/oauth', got: {oauth_url}"
        assert "api.instagram.com" not in oauth_url, \
            f"OAuth URL should NOT contain old 'api.instagram.com', got: {oauth_url}"
        
        print(f"✓ OAuth URL correctly uses Facebook v19.0: {oauth_url[:100]}...")
    
    def test_instagram_login_has_correct_client_id(self, customer_token):
        """Verify OAuth URL contains correct Meta App ID"""
        response = requests.get(
            f"{BASE_URL}/api/instagram/auth/login",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 200
        oauth_url = response.json()["oauth_url"]
        
        # Parse URL and check client_id
        parsed = urlparse(oauth_url)
        params = parse_qs(parsed.query)
        
        assert "client_id" in params, "OAuth URL should have client_id parameter"
        assert params["client_id"][0] == META_APP_ID, \
            f"client_id should be {META_APP_ID}, got: {params['client_id'][0]}"
        
        print(f"✓ OAuth URL has correct client_id: {META_APP_ID}")
    
    def test_instagram_login_has_correct_scopes(self, customer_token):
        """Verify OAuth URL contains all required scopes"""
        response = requests.get(
            f"{BASE_URL}/api/instagram/auth/login",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 200
        oauth_url = response.json()["oauth_url"]
        
        # Parse URL and check scopes
        parsed = urlparse(oauth_url)
        params = parse_qs(parsed.query)
        
        assert "scope" in params, "OAuth URL should have scope parameter"
        scope_str = params["scope"][0]
        
        for expected_scope in EXPECTED_SCOPES:
            assert expected_scope in scope_str, \
                f"Scope '{expected_scope}' should be in OAuth URL scopes: {scope_str}"
        
        print(f"✓ OAuth URL has all required scopes: {scope_str}")
    
    def test_instagram_login_requires_auth(self):
        """Verify endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/instagram/auth/login")
        
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        
        print("✓ Instagram login endpoint requires authentication")


class TestInstagramAuthStatus:
    """Test Instagram connection status endpoint - GET /api/instagram/auth/status"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Customer login failed: {response.status_code}")
    
    def test_instagram_status_returns_connection_info(self, customer_token):
        """Verify status endpoint returns connection status"""
        response = requests.get(
            f"{BASE_URL}/api/instagram/auth/status",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "connected" in data, "Response should contain 'connected' field"
        assert isinstance(data["connected"], bool), "'connected' should be boolean"
        
        print(f"✓ Instagram status returned: connected={data['connected']}")
    
    def test_instagram_status_requires_auth(self):
        """Verify endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/instagram/auth/status")
        
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        
        print("✓ Instagram status endpoint requires authentication")


class TestInstagramDisconnect:
    """Test Instagram disconnect endpoint - POST /api/instagram/auth/disconnect"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Customer login failed: {response.status_code}")
    
    def test_instagram_disconnect_endpoint_exists(self, customer_token):
        """Verify disconnect endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/instagram/auth/disconnect",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # Should return 200 with message (even if not connected)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message' field"
        
        print(f"✓ Instagram disconnect returned: {data['message']}")
    
    def test_instagram_disconnect_requires_auth(self):
        """Verify endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/instagram/auth/disconnect")
        
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        
        print("✓ Instagram disconnect endpoint requires authentication")


class TestWebhookVerification:
    """Test Instagram webhook verification - GET /api/webhooks/instagram"""
    
    def test_webhook_verification_success(self):
        """Verify webhook returns challenge with correct verify_token"""
        challenge = "test_challenge_123"
        
        response = requests.get(
            f"{BASE_URL}/api/webhooks/instagram",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": WEBHOOK_VERIFY_TOKEN,
                "hub.challenge": challenge
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Response should be plain text challenge
        assert response.text == challenge, \
            f"Response should be '{challenge}', got: '{response.text}'"
        
        print(f"✓ Webhook verification returned challenge: {challenge}")
    
    def test_webhook_verification_wrong_token_returns_403(self):
        """Verify webhook returns 403 with wrong verify_token"""
        response = requests.get(
            f"{BASE_URL}/api/webhooks/instagram",
            params={
                "hub.mode": "subscribe",
                "hub.verify_token": "wrong_token_12345",
                "hub.challenge": "test123"
            }
        )
        
        assert response.status_code == 403, \
            f"Expected 403 with wrong token, got {response.status_code}: {response.text}"
        
        print("✓ Webhook verification correctly rejects wrong verify_token with 403")
    
    def test_webhook_verification_missing_mode(self):
        """Verify webhook handles missing hub.mode"""
        response = requests.get(
            f"{BASE_URL}/api/webhooks/instagram",
            params={
                "hub.verify_token": WEBHOOK_VERIFY_TOKEN,
                "hub.challenge": "test123"
            }
        )
        
        # Should return 403 since mode != "subscribe"
        assert response.status_code == 403, \
            f"Expected 403 without hub.mode, got {response.status_code}"
        
        print("✓ Webhook verification correctly handles missing hub.mode")


class TestWebhookEventHandler:
    """Test Instagram webhook event handler - POST /api/webhooks/instagram"""
    
    def test_webhook_accepts_instagram_payload(self):
        """Verify webhook accepts valid Instagram payload"""
        payload = {
            "object": "instagram",
            "entry": [
                {
                    "id": "123456789",
                    "time": 1234567890,
                    "changes": []
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/webhooks/instagram",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok", f"Expected status='ok', got: {data}"
        
        print(f"✓ Webhook accepted Instagram payload: {data}")
    
    def test_webhook_ignores_non_instagram_payload(self):
        """Verify webhook ignores payload with object != 'instagram'"""
        payload = {
            "object": "other_platform",
            "entry": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/webhooks/instagram",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ignored", \
            f"Expected status='ignored' for non-instagram object, got: {data}"
        
        print(f"✓ Webhook correctly ignored non-instagram payload: {data}")
    
    def test_webhook_accepts_page_payload(self):
        """Verify webhook accepts 'page' object type (for messaging)"""
        payload = {
            "object": "page",
            "entry": [
                {
                    "id": "123456789",
                    "time": 1234567890,
                    "messaging": []
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/webhooks/instagram",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok", f"Expected status='ok' for page object, got: {data}"
        
        print(f"✓ Webhook accepted page payload: {data}")
    
    def test_webhook_rejects_invalid_json(self):
        """Verify webhook rejects invalid JSON"""
        response = requests.post(
            f"{BASE_URL}/api/webhooks/instagram",
            data="not valid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400, \
            f"Expected 400 for invalid JSON, got {response.status_code}"
        
        print("✓ Webhook correctly rejects invalid JSON with 400")


class TestInfluencerInstagramConnect:
    """Test Influencer Instagram connect - GET /api/influencers/instagram/connect"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Customer login failed: {response.status_code}")
    
    def test_influencer_connect_requires_auth(self):
        """Verify endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/influencers/instagram/connect")
        
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        
        print("✓ Influencer Instagram connect requires authentication")
    
    def test_influencer_connect_returns_facebook_oauth_url(self, customer_token):
        """Verify endpoint returns Facebook v19.0 OAuth URL (or 404 if not influencer)"""
        response = requests.get(
            f"{BASE_URL}/api/influencers/instagram/connect",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # May return 404 if user is not an approved influencer
        if response.status_code == 404:
            print("✓ Influencer connect returned 404 (user not an approved influencer) - expected behavior")
            return
        
        if response.status_code == 403:
            print("✓ Influencer connect returned 403 (influencer not approved) - expected behavior")
            return
        
        assert response.status_code == 200, f"Expected 200/404/403, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "oauth_url" in data, "Response should contain oauth_url"
        
        oauth_url = data["oauth_url"]
        
        # Verify it's Facebook v19.0 OAuth URL
        assert "facebook.com/v19.0/dialog/oauth" in oauth_url, \
            f"OAuth URL should contain 'facebook.com/v19.0/dialog/oauth', got: {oauth_url}"
        assert "api.instagram.com" not in oauth_url, \
            f"OAuth URL should NOT contain old 'api.instagram.com', got: {oauth_url}"
        
        print(f"✓ Influencer connect returned Facebook v19.0 OAuth URL")


class TestAdminInstagramStatus:
    """Test Admin Instagram status - GET /api/admin/instagram/status"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_admin_instagram_status_returns_info(self, admin_token):
        """Verify admin status endpoint returns connection info"""
        response = requests.get(
            f"{BASE_URL}/api/admin/instagram/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "brand_connected" in data, "Response should contain 'brand_connected'"
        assert "connections" in data, "Response should contain 'connections' list"
        assert "total" in data, "Response should contain 'total' count"
        
        print(f"✓ Admin Instagram status: brand_connected={data['brand_connected']}, total={data['total']}")
    
    def test_admin_instagram_status_requires_admin_auth(self):
        """Verify endpoint requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/instagram/status")
        
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        
        print("✓ Admin Instagram status requires admin authentication")


class TestAdminDMConfig:
    """Test Admin DM config endpoints - GET/PUT /api/admin/instagram/dm-config"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code}")
    
    def test_get_dm_config(self, admin_token):
        """Verify GET DM config returns configuration"""
        response = requests.get(
            f"{BASE_URL}/api/admin/instagram/dm-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have at least 'enabled' field
        assert "enabled" in data or "welcome_message" in data, \
            f"Response should contain DM config fields, got: {data}"
        
        print(f"✓ GET DM config returned: {data}")
    
    def test_update_dm_config(self, admin_token):
        """Verify PUT DM config updates configuration"""
        new_config = {
            "enabled": True,
            "welcome_message": "Test welcome message from pytest"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/instagram/dm-config",
            json=new_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        
        # Verify the update persisted
        get_response = requests.get(
            f"{BASE_URL}/api/admin/instagram/dm-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert get_response.status_code == 200
        updated_config = get_response.json()
        assert updated_config.get("enabled") == True, "enabled should be True after update"
        
        print(f"✓ PUT DM config updated successfully: {data}")
    
    def test_dm_config_requires_admin_for_update(self):
        """Verify PUT requires admin authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/instagram/dm-config",
            json={"enabled": False}
        )
        
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        
        print("✓ PUT DM config requires admin authentication")


class TestDeauthorizeCallback:
    """Test Instagram deauthorize callback - POST /api/webhooks/instagram/deauthorize"""
    
    def test_deauthorize_accepts_payload(self):
        """Verify deauthorize endpoint accepts and logs payload"""
        payload = {
            "user_id": "test_user_123",
            "signed_request": "test_signed_request"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/webhooks/instagram/deauthorize",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success", f"Expected status='success', got: {data}"
        
        print(f"✓ Deauthorize callback accepted payload: {data}")
    
    def test_deauthorize_handles_empty_payload(self):
        """Verify deauthorize handles empty payload gracefully"""
        response = requests.post(
            f"{BASE_URL}/api/webhooks/instagram/deauthorize",
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        # Should still return 200 (logs whatever is sent)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        print("✓ Deauthorize callback handles empty payload")


class TestCallbackErrorCases:
    """Test Instagram callback error handling - GET /api/instagram/auth/callback"""
    
    def test_callback_with_invalid_state(self):
        """Verify callback handles invalid state parameter"""
        response = requests.get(
            f"{BASE_URL}/api/instagram/auth/callback",
            params={
                "code": "test_code_123",
                "state": "invalid_state_xyz"
            },
            allow_redirects=False
        )
        
        # Should redirect with error (302/307) or return error
        # FastAPI RedirectResponse uses 307 by default
        assert response.status_code in [302, 307, 400, 401], \
            f"Expected redirect or error for invalid state, got {response.status_code}"
        
        if response.status_code == 302:
            location = response.headers.get("Location", "")
            assert "error" in location, f"Redirect should contain error param: {location}"
            print(f"✓ Callback redirects with error for invalid state: {location}")
        else:
            print(f"✓ Callback returns {response.status_code} for invalid state")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
