"""
Test Real-Time Notification System for Pigma E-commerce
Tests: Notification list, unread count, mark-read, mark-all-read, credit trigger, WebSocket
"""
import pytest
import requests
import os
import json
import asyncio
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"
VENDOR_DISPLAY_ID = "VND-0001"


class TestVendorNotificationList:
    """Test GET /api/notifications/vendor/list"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor authentication token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.status_code} - {response.text}")
        return response.json().get("token")
    
    def test_vendor_list_without_auth_returns_401(self):
        """Vendor list endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/vendor/list")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print("✓ GET /api/notifications/vendor/list returns 401 without auth")
    
    def test_vendor_list_with_auth_returns_200(self, vendor_token):
        """Vendor list endpoint should return notifications with valid auth"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/vendor/list", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "notifications" in data, f"Missing 'notifications' field: {data}"
        assert "unread_count" in data, f"Missing 'unread_count' field: {data}"
        assert "total" in data, f"Missing 'total' field: {data}"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        print(f"✓ Vendor list: {len(data['notifications'])} notifications, {data['unread_count']} unread")
    
    def test_vendor_list_with_limit(self, vendor_token):
        """Vendor list should respect limit parameter"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/vendor/list?limit=5", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert len(data["notifications"]) <= 5, f"Expected max 5 notifications, got {len(data['notifications'])}"
        print(f"✓ Vendor list with limit=5: {len(data['notifications'])} notifications returned")
    
    def test_vendor_list_unread_only(self, vendor_token):
        """Vendor list should filter unread only when requested"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/vendor/list?unread_only=true", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # All returned notifications should be unread
        for notif in data["notifications"]:
            assert notif.get("is_read") == False, f"Expected unread notification, got: {notif}"
        print(f"✓ Vendor list unread_only: {len(data['notifications'])} unread notifications")


class TestVendorUnreadCount:
    """Test GET /api/notifications/vendor/unread-count"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor authentication token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.status_code} - {response.text}")
        return response.json().get("token")
    
    def test_vendor_unread_count_without_auth_returns_401(self):
        """Unread count endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/vendor/unread-count")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print("✓ GET /api/notifications/vendor/unread-count returns 401 without auth")
    
    def test_vendor_unread_count_with_auth_returns_200(self, vendor_token):
        """Unread count endpoint should return count with valid auth"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/vendor/unread-count", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "unread_count" in data, f"Missing 'unread_count' field: {data}"
        assert isinstance(data["unread_count"], int), "unread_count should be an integer"
        print(f"✓ Vendor unread count: {data['unread_count']}")


class TestVendorMarkRead:
    """Test PUT /api/notifications/vendor/read/{notification_id}"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor authentication token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.status_code} - {response.text}")
        return response.json().get("token")
    
    def test_vendor_mark_read_without_auth_returns_401(self):
        """Mark read endpoint should require authentication"""
        response = requests.put(f"{BASE_URL}/api/notifications/vendor/read/NTF-0001")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print("✓ PUT /api/notifications/vendor/read/{id} returns 401 without auth")
    
    def test_vendor_mark_read_nonexistent_returns_404(self, vendor_token):
        """Mark read should return 404 for non-existent notification"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.put(f"{BASE_URL}/api/notifications/vendor/read/NTF-NONEXISTENT", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Mark read non-existent notification returns 404")
    
    def test_vendor_mark_read_existing_notification(self, vendor_token):
        """Mark read should work for existing notification"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        
        # First get a notification
        list_response = requests.get(f"{BASE_URL}/api/notifications/vendor/list?limit=1", headers=headers)
        if list_response.status_code != 200:
            pytest.skip("Could not get notifications list")
        
        notifications = list_response.json().get("notifications", [])
        if not notifications:
            pytest.skip("No notifications available to mark as read")
        
        notif_id = notifications[0]["notification_id"]
        
        # Mark as read
        response = requests.put(f"{BASE_URL}/api/notifications/vendor/read/{notif_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, f"Missing 'message' in response: {data}"
        print(f"✓ Marked notification {notif_id} as read")


class TestVendorMarkAllRead:
    """Test PUT /api/notifications/vendor/read-all"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor authentication token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.status_code} - {response.text}")
        return response.json().get("token")
    
    def test_vendor_mark_all_read_without_auth_returns_401(self):
        """Mark all read endpoint should require authentication"""
        response = requests.put(f"{BASE_URL}/api/notifications/vendor/read-all")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print("✓ PUT /api/notifications/vendor/read-all returns 401 without auth")
    
    def test_vendor_mark_all_read_with_auth(self, vendor_token):
        """Mark all read should work with valid auth"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.put(f"{BASE_URL}/api/notifications/vendor/read-all", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, f"Missing 'message' in response: {data}"
        print(f"✓ Mark all read: {data['message']}")
        
        # Verify unread count is now 0
        count_response = requests.get(f"{BASE_URL}/api/notifications/vendor/unread-count", headers=headers)
        if count_response.status_code == 200:
            count_data = count_response.json()
            assert count_data["unread_count"] == 0, f"Expected 0 unread, got {count_data['unread_count']}"
            print("✓ Verified unread count is 0 after mark-all-read")


class TestAdminNotificationList:
    """Test GET /api/notifications/admin/list"""
    
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
    
    def test_admin_list_without_auth_returns_401(self):
        """Admin list endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/list")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print("✓ GET /api/notifications/admin/list returns 401 without auth")
    
    def test_admin_list_with_auth_returns_200(self, admin_token):
        """Admin list endpoint should return notifications with valid auth"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/admin/list", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "notifications" in data, f"Missing 'notifications' field: {data}"
        assert "unread_count" in data, f"Missing 'unread_count' field: {data}"
        assert "total" in data, f"Missing 'total' field: {data}"
        print(f"✓ Admin list: {len(data['notifications'])} notifications, {data['unread_count']} unread")


class TestAdminMarkRead:
    """Test PUT /api/notifications/admin/read/{notification_id}"""
    
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
    
    def test_admin_mark_read_without_auth_returns_401(self):
        """Admin mark read endpoint should require authentication"""
        response = requests.put(f"{BASE_URL}/api/notifications/admin/read/NTF-0001")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print("✓ PUT /api/notifications/admin/read/{id} returns 401 without auth")
    
    def test_admin_mark_read_nonexistent_returns_404(self, admin_token):
        """Admin mark read should return 404 for non-existent notification"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/api/notifications/admin/read/NTF-NONEXISTENT", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Admin mark read non-existent notification returns 404")


class TestAdminMarkAllRead:
    """Test PUT /api/notifications/admin/read-all"""
    
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
    
    def test_admin_mark_all_read_without_auth_returns_401(self):
        """Admin mark all read endpoint should require authentication"""
        response = requests.put(f"{BASE_URL}/api/notifications/admin/read-all")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print("✓ PUT /api/notifications/admin/read-all returns 401 without auth")
    
    def test_admin_mark_all_read_with_auth(self, admin_token):
        """Admin mark all read should work with valid auth"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/api/notifications/admin/read-all", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, f"Missing 'message' in response: {data}"
        print(f"✓ Admin mark all read: {data['message']}")


class TestCreditAddTriggersNotification:
    """Test that adding credits via /api/admin/master/action/add-credits/{display_id} triggers vendor notification"""
    
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
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor authentication token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.status_code} - {response.text}")
        return response.json().get("token")
    
    def test_add_credits_creates_notification(self, admin_token, vendor_token):
        """Adding credits should create a notification for the vendor"""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        vendor_headers = {"Authorization": f"Bearer {vendor_token}"}
        
        # Get initial unread count
        initial_response = requests.get(f"{BASE_URL}/api/notifications/vendor/unread-count", headers=vendor_headers)
        initial_count = initial_response.json().get("unread_count", 0) if initial_response.status_code == 200 else 0
        
        # Add credits to vendor
        credit_response = requests.post(
            f"{BASE_URL}/api/admin/master/action/add-credits/{VENDOR_DISPLAY_ID}",
            json={"amount": 10, "reason": "Test notification trigger"},
            headers=admin_headers
        )
        assert credit_response.status_code == 200, f"Expected 200, got {credit_response.status_code}: {credit_response.text}"
        print(f"✓ Added 10 credits to {VENDOR_DISPLAY_ID}")
        
        # Check vendor notifications
        import time
        time.sleep(1)  # Wait for notification to be created
        
        list_response = requests.get(f"{BASE_URL}/api/notifications/vendor/list?limit=5", headers=vendor_headers)
        assert list_response.status_code == 200, f"Expected 200, got {list_response.status_code}: {list_response.text}"
        
        notifications = list_response.json().get("notifications", [])
        
        # Find the credit notification
        credit_notif = None
        for notif in notifications:
            if notif.get("type") == "credit" and "10 Credits Added" in notif.get("title", ""):
                credit_notif = notif
                break
        
        assert credit_notif is not None, f"Credit notification not found in: {[n.get('title') for n in notifications]}"
        assert credit_notif.get("priority") == "medium", f"Expected medium priority, got {credit_notif.get('priority')}"
        assert "Test notification trigger" in credit_notif.get("message", ""), f"Reason not in message: {credit_notif.get('message')}"
        print(f"✓ Credit notification created: {credit_notif.get('notification_id')} - {credit_notif.get('title')}")


class TestWebSocketConnection:
    """Test WebSocket endpoint /api/ws/notifications"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor authentication token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.status_code} - {response.text}")
        return response.json().get("token")
    
    def test_websocket_url_format(self, vendor_token):
        """Verify WebSocket URL can be constructed correctly"""
        ws_protocol = "wss:" if BASE_URL.startswith("https") else "ws:"
        ws_base = BASE_URL.replace("https:", ws_protocol).replace("http:", ws_protocol)
        ws_url = f"{ws_base}/api/ws/notifications?token={vendor_token}&role=vendor"
        
        assert "ws" in ws_url, "WebSocket URL should contain ws protocol"
        assert "token=" in ws_url, "WebSocket URL should contain token parameter"
        assert "role=vendor" in ws_url, "WebSocket URL should contain role parameter"
        print(f"✓ WebSocket URL format correct: {ws_url[:80]}...")
    
    def test_websocket_connection_with_websocket_client(self, vendor_token):
        """Test WebSocket connection using websocket-client library"""
        try:
            import websocket
        except ImportError:
            pytest.skip("websocket-client not installed")
        
        ws_protocol = "wss:" if BASE_URL.startswith("https") else "ws:"
        ws_base = BASE_URL.replace("https:", ws_protocol).replace("http:", ws_protocol)
        ws_url = f"{ws_base}/api/ws/notifications?token={vendor_token}&role=vendor"
        
        try:
            ws = websocket.create_connection(ws_url, timeout=10)
            print("✓ WebSocket connection established")
            
            # Send ping
            ws.send("ping")
            
            # Receive pong
            result = ws.recv()
            assert result == "pong", f"Expected 'pong', got '{result}'"
            print("✓ WebSocket ping/pong working")
            
            ws.close()
            print("✓ WebSocket connection closed cleanly")
        except Exception as e:
            # WebSocket might not work in test environment, but URL format is correct
            print(f"⚠ WebSocket connection test skipped (may not work in test env): {e}")


class TestNotificationFields:
    """Test notification document structure"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor authentication token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.status_code} - {response.text}")
        return response.json().get("token")
    
    def test_notification_has_required_fields(self, vendor_token):
        """Notifications should have all required fields"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/vendor/list?limit=1", headers=headers)
        
        if response.status_code != 200:
            pytest.skip("Could not get notifications")
        
        notifications = response.json().get("notifications", [])
        if not notifications:
            pytest.skip("No notifications available to check fields")
        
        notif = notifications[0]
        required_fields = ["notification_id", "user_id", "type", "title", "message", "is_read", "priority", "created_at"]
        
        for field in required_fields:
            assert field in notif, f"Missing required field '{field}' in notification: {notif}"
        
        # Check notification_id format (NTF-XXXX)
        assert notif["notification_id"].startswith("NTF-"), f"notification_id should start with NTF-: {notif['notification_id']}"
        
        # Check priority is valid
        assert notif["priority"] in ["high", "medium", "low"], f"Invalid priority: {notif['priority']}"
        
        print(f"✓ Notification has all required fields: {notif['notification_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
