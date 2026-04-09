"""
Test Notification Bell APIs - Admin and User notification endpoints
Tests: list, mark-read, mark-all-read, unread-count
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
USER_EMAIL = "admin@pigma.com"
USER_PASSWORD = "admin123"


class TestAdminNotificationBell:
    """Admin notification bell API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.token = data.get("token") or data.get("access_token")
        self.admin_id = data.get("admin", {}).get("admin_id") or data.get("admin_id")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_admin_notification_list(self):
        """GET /api/notifications/admin/list - Returns notifications with unread_count"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/list", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "notifications" in data, "Missing 'notifications' field"
        assert "unread_count" in data, "Missing 'unread_count' field"
        assert "total" in data, "Missing 'total' field"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        assert isinstance(data["unread_count"], int), "unread_count should be int"
        print(f"✓ Admin has {len(data['notifications'])} notifications, {data['unread_count']} unread")
        
    def test_admin_unread_count(self):
        """GET /api/notifications/admin/unread-count - Returns unread count"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/unread-count", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "unread_count" in data, "Missing 'unread_count' field"
        assert isinstance(data["unread_count"], int), "unread_count should be int"
        print(f"✓ Admin unread count: {data['unread_count']}")
        
    def test_admin_mark_single_notification_read(self):
        """PUT /api/notifications/admin/read/{notification_id} - Marks notification as read"""
        # First get list to find an unread notification
        list_response = requests.get(f"{BASE_URL}/api/notifications/admin/list", headers=self.headers)
        assert list_response.status_code == 200
        notifications = list_response.json().get("notifications", [])
        
        # Find an unread notification or use any notification
        unread = [n for n in notifications if not n.get("is_read")]
        if unread:
            notif_id = unread[0]["notification_id"]
            response = requests.put(f"{BASE_URL}/api/notifications/admin/read/{notif_id}", headers=self.headers)
            assert response.status_code == 200, f"Failed to mark as read: {response.text}"
            data = response.json()
            assert "message" in data, "Missing 'message' field"
            print(f"✓ Marked notification {notif_id} as read")
            
            # Verify it's now read
            verify_response = requests.get(f"{BASE_URL}/api/notifications/admin/list", headers=self.headers)
            verify_notifs = verify_response.json().get("notifications", [])
            marked_notif = next((n for n in verify_notifs if n["notification_id"] == notif_id), None)
            if marked_notif:
                assert marked_notif["is_read"] == True, "Notification should be marked as read"
                print(f"✓ Verified notification is now read")
        else:
            print("⚠ No unread notifications to test mark-read")
            pytest.skip("No unread notifications available")
            
    def test_admin_mark_all_read(self):
        """PUT /api/notifications/admin/read-all - Marks all notifications as read"""
        response = requests.put(f"{BASE_URL}/api/notifications/admin/read-all", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing 'message' field"
        print(f"✓ Mark all read response: {data['message']}")
        
        # Verify unread count is now 0
        count_response = requests.get(f"{BASE_URL}/api/notifications/admin/unread-count", headers=self.headers)
        assert count_response.status_code == 200
        assert count_response.json()["unread_count"] == 0, "Unread count should be 0 after mark-all-read"
        print(f"✓ Verified unread count is now 0")
        
    def test_admin_mark_nonexistent_notification(self):
        """PUT /api/notifications/admin/read/{notification_id} - Returns 404 for non-existent"""
        fake_id = f"FAKE-{uuid.uuid4()}"
        response = requests.put(f"{BASE_URL}/api/notifications/admin/read/{fake_id}", headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Correctly returns 404 for non-existent notification")


class TestUserNotificationBell:
    """User (buyer) notification bell API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as user and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert response.status_code == 200, f"User login failed: {response.text}"
        data = response.json()
        self.token = data.get("token") or data.get("access_token")
        self.user_id = data.get("user", {}).get("user_id") or data.get("user_id")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_user_notification_list(self):
        """GET /api/notifications/user/list - Returns user notifications with unread_count"""
        response = requests.get(f"{BASE_URL}/api/notifications/user/list", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "notifications" in data, "Missing 'notifications' field"
        assert "unread_count" in data, "Missing 'unread_count' field"
        assert "total" in data, "Missing 'total' field"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        assert isinstance(data["unread_count"], int), "unread_count should be int"
        print(f"✓ User has {len(data['notifications'])} notifications, {data['unread_count']} unread")
        
    def test_user_unread_count(self):
        """GET /api/notifications/user/unread-count - Returns unread count"""
        response = requests.get(f"{BASE_URL}/api/notifications/user/unread-count", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "unread_count" in data, "Missing 'unread_count' field"
        assert isinstance(data["unread_count"], int), "unread_count should be int"
        print(f"✓ User unread count: {data['unread_count']}")
        
    def test_user_mark_single_notification_read(self):
        """PUT /api/notifications/user/read/{notification_id} - Marks notification as read"""
        # First get list to find an unread notification
        list_response = requests.get(f"{BASE_URL}/api/notifications/user/list", headers=self.headers)
        assert list_response.status_code == 200
        notifications = list_response.json().get("notifications", [])
        
        # Find an unread notification
        unread = [n for n in notifications if not n.get("is_read")]
        if unread:
            notif_id = unread[0]["notification_id"]
            response = requests.put(f"{BASE_URL}/api/notifications/user/read/{notif_id}", headers=self.headers)
            assert response.status_code == 200, f"Failed to mark as read: {response.text}"
            data = response.json()
            assert "message" in data, "Missing 'message' field"
            print(f"✓ Marked user notification {notif_id} as read")
            
            # Verify it's now read
            verify_response = requests.get(f"{BASE_URL}/api/notifications/user/list", headers=self.headers)
            verify_notifs = verify_response.json().get("notifications", [])
            marked_notif = next((n for n in verify_notifs if n["notification_id"] == notif_id), None)
            if marked_notif:
                assert marked_notif["is_read"] == True, "Notification should be marked as read"
                print(f"✓ Verified user notification is now read")
        else:
            print("⚠ No unread user notifications to test mark-read")
            pytest.skip("No unread user notifications available")
            
    def test_user_mark_all_read(self):
        """PUT /api/notifications/user/read-all - Marks all user notifications as read"""
        response = requests.put(f"{BASE_URL}/api/notifications/user/read-all", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing 'message' field"
        print(f"✓ User mark all read response: {data['message']}")
        
        # Verify unread count is now 0
        count_response = requests.get(f"{BASE_URL}/api/notifications/user/unread-count", headers=self.headers)
        assert count_response.status_code == 200
        assert count_response.json()["unread_count"] == 0, "Unread count should be 0 after mark-all-read"
        print(f"✓ Verified user unread count is now 0")
        
    def test_user_mark_nonexistent_notification(self):
        """PUT /api/notifications/user/read/{notification_id} - Returns 404 for non-existent"""
        fake_id = f"FAKE-{uuid.uuid4()}"
        response = requests.put(f"{BASE_URL}/api/notifications/user/read/{fake_id}", headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Correctly returns 404 for non-existent user notification")


class TestNotificationAuthentication:
    """Test that notification endpoints require authentication"""
    
    def test_admin_list_requires_auth(self):
        """GET /api/notifications/admin/list - Requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/notifications/admin/list")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Admin list requires authentication")
        
    def test_user_list_requires_auth(self):
        """GET /api/notifications/user/list - Requires user auth"""
        response = requests.get(f"{BASE_URL}/api/notifications/user/list")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ User list requires authentication")
        
    def test_admin_mark_read_requires_auth(self):
        """PUT /api/notifications/admin/read-all - Requires admin auth"""
        response = requests.put(f"{BASE_URL}/api/notifications/admin/read-all")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Admin mark-all-read requires authentication")
        
    def test_user_mark_read_requires_auth(self):
        """PUT /api/notifications/user/read-all - Requires user auth"""
        response = requests.put(f"{BASE_URL}/api/notifications/user/read-all")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ User mark-all-read requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
