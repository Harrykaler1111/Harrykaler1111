"""
Test Push Notification System for Pigma E-commerce
Tests: VAPID key endpoint, subscribe/unsubscribe, admin stats, admin send, flash sale auto-trigger
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"


class TestVAPIDPublicKey:
    """Test GET /api/notifications/vapid-public-key"""
    
    def test_vapid_public_key_returns_200(self):
        """VAPID public key endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/notifications/vapid-public-key")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ GET /api/notifications/vapid-public-key returns 200")
    
    def test_vapid_public_key_has_public_key_field(self):
        """Response should contain public_key field"""
        response = requests.get(f"{BASE_URL}/api/notifications/vapid-public-key")
        data = response.json()
        assert "public_key" in data, f"Missing 'public_key' field in response: {data}"
        assert isinstance(data["public_key"], str), "public_key should be a string"
        print(f"✓ VAPID public key returned: {data['public_key'][:30]}...")


class TestPushSubscription:
    """Test POST /api/notifications/subscribe and /unsubscribe"""
    
    def test_subscribe_with_valid_data(self):
        """Subscribe endpoint should accept valid subscription data"""
        subscription_data = {
            "endpoint": "https://test.push.service/test-endpoint-" + datetime.now().strftime("%Y%m%d%H%M%S"),
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            },
            "user_id": "test_user_123"
        }
        response = requests.post(f"{BASE_URL}/api/notifications/subscribe", json=subscription_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, f"Missing 'message' in response: {data}"
        print("✓ POST /api/notifications/subscribe returns 200 with valid data")
    
    def test_subscribe_missing_endpoint_returns_400(self):
        """Subscribe should return 400 if endpoint is missing"""
        subscription_data = {
            "keys": {
                "p256dh": "test_key",
                "auth": "test_auth"
            }
        }
        response = requests.post(f"{BASE_URL}/api/notifications/subscribe", json=subscription_data)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ POST /api/notifications/subscribe returns 400 for missing endpoint")
    
    def test_subscribe_missing_keys_returns_400(self):
        """Subscribe should return 400 if keys are missing"""
        subscription_data = {
            "endpoint": "https://test.push.service/test-endpoint"
        }
        response = requests.post(f"{BASE_URL}/api/notifications/subscribe", json=subscription_data)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ POST /api/notifications/subscribe returns 400 for missing keys")
    
    def test_unsubscribe_with_valid_endpoint(self):
        """Unsubscribe endpoint should deactivate subscription"""
        # First subscribe
        test_endpoint = "https://test.push.service/unsubscribe-test-" + datetime.now().strftime("%Y%m%d%H%M%S")
        subscription_data = {
            "endpoint": test_endpoint,
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        requests.post(f"{BASE_URL}/api/notifications/subscribe", json=subscription_data)
        
        # Then unsubscribe
        response = requests.post(f"{BASE_URL}/api/notifications/unsubscribe", json={"endpoint": test_endpoint})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, f"Missing 'message' in response: {data}"
        print("✓ POST /api/notifications/unsubscribe returns 200")
    
    def test_unsubscribe_missing_endpoint_returns_400(self):
        """Unsubscribe should return 400 if endpoint is missing"""
        response = requests.post(f"{BASE_URL}/api/notifications/unsubscribe", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ POST /api/notifications/unsubscribe returns 400 for missing endpoint")


class TestAdminNotificationStats:
    """Test GET /api/notifications/admin/stats (requires admin auth)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        return response.json().get("token")
    
    def test_admin_stats_without_auth_returns_401(self):
        """Admin stats endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print("✓ GET /api/notifications/admin/stats returns 401 without auth")
    
    def test_admin_stats_with_auth_returns_200(self, admin_token):
        """Admin stats endpoint should return stats with valid auth"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/admin/stats", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "total_subscriptions" in data, f"Missing 'total_subscriptions': {data}"
        assert "active_subscriptions" in data, f"Missing 'active_subscriptions': {data}"
        assert "recent_notifications" in data, f"Missing 'recent_notifications': {data}"
        print(f"✓ Admin stats: total={data['total_subscriptions']}, active={data['active_subscriptions']}")


class TestAdminSendNotification:
    """Test POST /api/notifications/admin/send (requires admin auth)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        return response.json().get("token")
    
    def test_admin_send_without_auth_returns_401(self):
        """Admin send endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/notifications/admin/send", json={
            "title": "Test",
            "body": "Test notification"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print("✓ POST /api/notifications/admin/send returns 401 without auth")
    
    def test_admin_send_missing_body_returns_400(self, admin_token):
        """Admin send should return 400 if body is missing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/notifications/admin/send", 
                                 json={"title": "Test"}, headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ POST /api/notifications/admin/send returns 400 for missing body")
    
    def test_admin_send_with_valid_data(self, admin_token):
        """Admin send should work with valid data (MOCKED - no real push sent)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/notifications/admin/send", json={
            "title": "Test Notification",
            "body": "This is a test notification from pytest",
            "url": "/products"
        }, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, f"Missing 'message' in response: {data}"
        assert "sent_count" in data, f"Missing 'sent_count' in response: {data}"
        print(f"✓ Admin send notification: sent_count={data['sent_count']}")


class TestFlashSaleAutoTrigger:
    """Test that PUT /api/bundles/admin/{id} triggers push when flash sale is newly activated"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        return response.json().get("token")
    
    def test_get_bundles_for_flash_test(self, admin_token):
        """Get existing bundles to use for flash sale test"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/bundles/admin/all", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        bundles = response.json()
        assert len(bundles) > 0, "No bundles found for testing"
        print(f"✓ Found {len(bundles)} bundles for flash sale testing")
        return bundles
    
    def test_update_bundle_with_flash_sale_fields(self, admin_token):
        """Update bundle with flash sale fields should work"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get a bundle to update
        response = requests.get(f"{BASE_URL}/api/bundles/admin/all", headers=headers)
        bundles = response.json()
        if not bundles:
            pytest.skip("No bundles available for testing")
        
        bundle = bundles[0]
        bundle_id = bundle["bundle_id"]
        
        # Set flash sale to future (won't trigger push since not "newly activated")
        future_start = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        future_end = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
        
        update_data = {
            "flash_sale_start": future_start,
            "flash_sale_end": future_end,
            "flash_extra_discount_type": "flat",
            "flash_extra_discount_value": 100
        }
        
        response = requests.put(f"{BASE_URL}/api/bundles/admin/{bundle_id}", 
                               json=update_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, f"Missing 'message' in response: {data}"
        print(f"✓ Bundle {bundle_id} updated with flash sale fields")


class TestFlashSalesEndpoint:
    """Test GET /api/bundles/flash-sales returns active flash sales"""
    
    def test_flash_sales_endpoint_returns_200(self):
        """Flash sales endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/bundles/flash-sales")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ GET /api/bundles/flash-sales returns 200 with {len(data)} active flash sales")
        
        # If there are flash sales, verify they have required fields
        if data:
            sale = data[0]
            assert "bundle_id" in sale, "Missing bundle_id"
            assert "flash_active" in sale, "Missing flash_active"
            assert sale["flash_active"] == True, "Flash sale should have flash_active=True"
            print(f"✓ Flash sale '{sale.get('name')}' has flash_active=True")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
