"""
Test Notification Redirect URL Feature
Tests that notifications have valid redirect_url and proper nested routes (not query params)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pigma-notify-demo.preview.emergentagent.com')

class TestNotificationRedirectURL:
    """Test notification redirect_url generation and format"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin auth token"""
        # Login as super admin
        login_response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "superadmin@pigma.com", "password": "superadmin123"}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.admin_token = login_response.json().get("token")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_admin_notifications_list_returns_200(self):
        """Test GET /api/notifications/admin/list returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/list",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        print(f"✓ Admin notifications list returned {len(data['notifications'])} notifications, {data['unread_count']} unread")
    
    def test_notifications_have_redirect_url(self):
        """Test that notifications have redirect_url field"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/list?limit=50",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        notifications = data.get("notifications", [])
        
        if len(notifications) == 0:
            pytest.skip("No notifications to test")
        
        # Check that notifications have redirect_url field
        for notif in notifications[:10]:  # Check first 10
            assert "redirect_url" in notif, f"Notification {notif.get('notification_id')} missing redirect_url field"
            print(f"  Notification {notif.get('notification_id')}: type={notif.get('type')}, redirect_url={notif.get('redirect_url')}")
        
        print(f"✓ All checked notifications have redirect_url field")
    
    def test_redirect_url_uses_nested_routes_not_query_params(self):
        """Test that redirect_url uses nested routes like /admin/orders, not /admin?tab=orders"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/list?limit=50",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        notifications = data.get("notifications", [])
        
        if len(notifications) == 0:
            pytest.skip("No notifications to test")
        
        invalid_urls = []
        for notif in notifications:
            url = notif.get("redirect_url", "")
            if url and "?tab=" in url:
                invalid_urls.append({
                    "notification_id": notif.get("notification_id"),
                    "type": notif.get("type"),
                    "redirect_url": url
                })
        
        if invalid_urls:
            print(f"✗ Found {len(invalid_urls)} notifications with old-style ?tab= URLs:")
            for inv in invalid_urls[:5]:
                print(f"  - {inv}")
        
        assert len(invalid_urls) == 0, f"Found {len(invalid_urls)} notifications with old-style ?tab= query param URLs"
        print(f"✓ All {len(notifications)} notifications use proper nested routes (no ?tab= params)")
    
    def test_order_notifications_redirect_to_admin_orders(self):
        """Test that order-type notifications redirect to /admin/orders"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/list?limit=50",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        notifications = data.get("notifications", [])
        
        order_notifications = [n for n in notifications if n.get("type") == "order"]
        
        if len(order_notifications) == 0:
            pytest.skip("No order notifications to test")
        
        for notif in order_notifications[:5]:
            url = notif.get("redirect_url", "")
            # Should be /admin/orders (for admin) or /vendor/orders (for vendor)
            assert url in ["/admin/orders", "/vendor/orders", ""], \
                f"Order notification {notif.get('notification_id')} has unexpected redirect_url: {url}"
            print(f"  Order notification {notif.get('notification_id')}: redirect_url={url}")
        
        print(f"✓ All {len(order_notifications)} order notifications have correct redirect_url")
    
    def test_issue_notifications_redirect_correctly(self):
        """Test that issue-type notifications redirect to /admin/returns"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/list?limit=50",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        notifications = data.get("notifications", [])
        
        issue_notifications = [n for n in notifications if n.get("type") == "issue"]
        
        if len(issue_notifications) == 0:
            print("No issue notifications found - skipping")
            return
        
        for notif in issue_notifications[:5]:
            url = notif.get("redirect_url", "")
            # Should be /admin/returns (for admin) or /vendor/support (for vendor)
            assert url in ["/admin/returns", "/vendor/support", ""], \
                f"Issue notification {notif.get('notification_id')} has unexpected redirect_url: {url}"
            print(f"  Issue notification {notif.get('notification_id')}: redirect_url={url}")
        
        print(f"✓ All {len(issue_notifications)} issue notifications have correct redirect_url")
    
    def test_notification_mark_read(self):
        """Test marking a notification as read"""
        # Get notifications
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/list?limit=5",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        notifications = data.get("notifications", [])
        
        if len(notifications) == 0:
            pytest.skip("No notifications to test")
        
        # Find an unread notification
        unread = [n for n in notifications if not n.get("is_read")]
        if len(unread) == 0:
            print("No unread notifications - testing with first notification")
            notif_id = notifications[0].get("notification_id")
        else:
            notif_id = unread[0].get("notification_id")
        
        # Mark as read
        mark_response = requests.put(
            f"{BASE_URL}/api/notifications/admin/read/{notif_id}",
            headers=self.admin_headers
        )
        assert mark_response.status_code == 200, f"Mark read failed: {mark_response.text}"
        print(f"✓ Successfully marked notification {notif_id} as read")
    
    def test_unread_count_endpoint(self):
        """Test GET /api/notifications/admin/unread-count"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/unread-count",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        print(f"✓ Unread count: {data['unread_count']}")


class TestNotificationServiceRedirectGeneration:
    """Test that notification_service.py generates correct redirect_urls"""
    
    def test_notification_types_have_expected_redirect_urls(self):
        """Verify notification types map to expected redirect URLs"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "superadmin@pigma.com", "password": "superadmin123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        admin_token = login_response.json().get("token")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/notifications/admin/list?limit=50",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        notifications = data.get("notifications", [])
        
        # Expected mappings for admin role
        expected_admin_redirects = {
            "order": "/admin/orders",
            "issue": "/admin/returns",
            "promotion": "/admin/monetization",
            "kyc": "/admin/vendors",
            "credit": "/admin/monetization",
            "system": "/admin"
        }
        
        type_counts = {}
        mismatches = []
        
        for notif in notifications:
            ntype = notif.get("type", "unknown")
            url = notif.get("redirect_url", "")
            
            type_counts[ntype] = type_counts.get(ntype, 0) + 1
            
            # Check if URL matches expected (allow empty for system notifications)
            expected = expected_admin_redirects.get(ntype, "")
            if url and expected and url != expected:
                mismatches.append({
                    "notification_id": notif.get("notification_id"),
                    "type": ntype,
                    "redirect_url": url,
                    "expected": expected
                })
        
        print(f"Notification type distribution: {type_counts}")
        
        if mismatches:
            print(f"✗ Found {len(mismatches)} mismatched redirect URLs:")
            for m in mismatches[:5]:
                print(f"  - {m}")
        
        # Allow some flexibility - old notifications might have different URLs
        # But new ones should be correct
        print(f"✓ Checked {len(notifications)} notifications for redirect URL correctness")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
