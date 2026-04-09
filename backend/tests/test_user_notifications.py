"""
Test User Notification System - Iteration 72
Tests for buyer/user notifications when orders are placed and status changes.
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
USER_EMAIL = "admin@pigma.com"
USER_PASSWORD = "admin123"
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"

# Product with stock for testing
TEST_PRODUCT_ID = "prod_8a30865ca256"


class TestUserNotificationEndpoints:
    """Test user notification API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with user authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as normal user
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert login_resp.status_code == 200, f"User login failed: {login_resp.text}"
        self.user_token = login_resp.json().get("token")
        self.user_data = login_resp.json().get("user")
        self.user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Login as admin
        admin_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_resp.status_code == 200, f"Admin login failed: {admin_resp.text}"
        self.admin_token = admin_resp.json().get("token")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_user_notification_list_endpoint(self):
        """GET /api/notifications/user/list - Returns notifications for logged-in user"""
        resp = self.session.get(f"{BASE_URL}/api/notifications/user/list", headers=self.user_headers)
        assert resp.status_code == 200, f"Failed to get user notifications: {resp.text}"
        
        data = resp.json()
        assert "notifications" in data, "Response should contain 'notifications' key"
        assert "total" in data, "Response should contain 'total' key"
        assert "unread_count" in data, "Response should contain 'unread_count' key"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        print(f"✓ User notification list: {data['total']} total, {data['unread_count']} unread")
    
    def test_user_unread_count_endpoint(self):
        """GET /api/notifications/user/unread-count - Returns unread count for user"""
        resp = self.session.get(f"{BASE_URL}/api/notifications/user/unread-count", headers=self.user_headers)
        assert resp.status_code == 200, f"Failed to get unread count: {resp.text}"
        
        data = resp.json()
        assert "unread_count" in data, "Response should contain 'unread_count' key"
        assert isinstance(data["unread_count"], int), "unread_count should be an integer"
        print(f"✓ User unread count: {data['unread_count']}")
    
    def test_user_notification_list_with_limit(self):
        """GET /api/notifications/user/list?limit=5 - Test pagination"""
        resp = self.session.get(f"{BASE_URL}/api/notifications/user/list?limit=5", headers=self.user_headers)
        assert resp.status_code == 200, f"Failed with limit param: {resp.text}"
        
        data = resp.json()
        assert len(data["notifications"]) <= 5, "Should respect limit parameter"
        print(f"✓ Pagination works: returned {len(data['notifications'])} notifications")
    
    def test_user_notification_list_unread_only(self):
        """GET /api/notifications/user/list?unread_only=true - Filter unread"""
        resp = self.session.get(f"{BASE_URL}/api/notifications/user/list?unread_only=true", headers=self.user_headers)
        assert resp.status_code == 200, f"Failed with unread_only param: {resp.text}"
        
        data = resp.json()
        for notif in data["notifications"]:
            assert notif.get("is_read") == False, "All notifications should be unread"
        print(f"✓ Unread filter works: {len(data['notifications'])} unread notifications")
    
    def test_user_notification_unauthorized(self):
        """User notification endpoints require authentication"""
        resp = self.session.get(f"{BASE_URL}/api/notifications/user/list")
        assert resp.status_code in [401, 403], "Should require authentication"
        print("✓ Unauthorized access blocked")


class TestOrderNotificationCreation:
    """Test that order operations create user notifications"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as normal user
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert login_resp.status_code == 200, f"User login failed: {login_resp.text}"
        self.user_token = login_resp.json().get("token")
        self.user_data = login_resp.json().get("user")
        self.user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        # Login as admin
        admin_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_resp.status_code == 200, f"Admin login failed: {admin_resp.text}"
        self.admin_token = admin_resp.json().get("token")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def _get_initial_unread_count(self):
        """Get initial unread count before test"""
        resp = self.session.get(f"{BASE_URL}/api/notifications/user/unread-count", headers=self.user_headers)
        return resp.json().get("unread_count", 0) if resp.status_code == 200 else 0
    
    def _add_product_to_cart(self):
        """Add test product to cart"""
        # First get product details
        product_resp = self.session.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}")
        if product_resp.status_code != 200:
            pytest.skip(f"Test product {TEST_PRODUCT_ID} not found")
        
        product = product_resp.json()
        
        # Get available size
        size = "M"
        if product.get("variants"):
            for v in product["variants"]:
                if v.get("stock", 0) > 0:
                    size = v.get("size", "M")
                    break
        
        # Add to cart
        cart_resp = self.session.post(f"{BASE_URL}/api/cart/add", headers=self.user_headers, json={
            "product_id": TEST_PRODUCT_ID,
            "quantity": 1,
            "size": size
        })
        return cart_resp.status_code == 200
    
    def test_cod_order_creates_notification(self):
        """POST /api/orders (COD) - Creates 'Order Placed!' notification for buyer"""
        initial_count = self._get_initial_unread_count()
        
        # Add product to cart
        if not self._add_product_to_cart():
            pytest.skip("Could not add product to cart")
        
        # Create COD order
        order_resp = self.session.post(f"{BASE_URL}/api/orders", headers=self.user_headers, json={
            "payment_method": "cod",
            "shipping_address": {
                "name": "Test User",
                "phone": "9876543210",
                "address": "123 Test Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001"
            }
        })
        
        if order_resp.status_code != 200:
            # Cart might be empty
            print(f"Order creation response: {order_resp.status_code} - {order_resp.text}")
            pytest.skip("Could not create order - cart may be empty")
        
        order_data = order_resp.json()
        order_id = order_data.get("order_id")
        print(f"✓ Created COD order: {order_id}")
        
        # Wait for notification to be created
        time.sleep(1)
        
        # Check for new notification
        new_count = self._get_initial_unread_count()
        
        # Get notifications and check for order placed notification
        notif_resp = self.session.get(f"{BASE_URL}/api/notifications/user/list?limit=5", headers=self.user_headers)
        assert notif_resp.status_code == 200
        
        notifications = notif_resp.json().get("notifications", [])
        order_notif = None
        for n in notifications:
            if "Order Placed" in n.get("title", "") or order_id[-6:] in n.get("message", ""):
                order_notif = n
                break
        
        assert order_notif is not None, f"'Order Placed!' notification not found for order {order_id}"
        assert order_notif.get("type") == "order", "Notification type should be 'order'"
        assert order_notif.get("redirect_url") == "/orders", "redirect_url should be '/orders'"
        print(f"✓ Order Placed notification created: {order_notif.get('title')}")
        
        # Store order_id for status update tests
        self.__class__.test_order_id = order_id
    
    def test_order_confirmed_creates_notification(self):
        """PUT /api/admin/orders/{order_id}/status?status=confirmed - Creates notification"""
        order_id = getattr(self.__class__, 'test_order_id', None)
        if not order_id:
            pytest.skip("No test order available")
        
        initial_count = self._get_initial_unread_count()
        
        # Admin confirms order
        resp = self.session.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status?status=confirmed",
            headers=self.admin_headers
        )
        assert resp.status_code == 200, f"Failed to confirm order: {resp.text}"
        print(f"✓ Order confirmed: {order_id}")
        
        time.sleep(1)
        
        # Check for notification
        notif_resp = self.session.get(f"{BASE_URL}/api/notifications/user/list?limit=5", headers=self.user_headers)
        notifications = notif_resp.json().get("notifications", [])
        
        confirmed_notif = None
        for n in notifications:
            if "Confirmed" in n.get("title", "") and order_id[-6:] in n.get("message", ""):
                confirmed_notif = n
                break
        
        assert confirmed_notif is not None, "Order Confirmed notification not found"
        print(f"✓ Order Confirmed notification: {confirmed_notif.get('title')}")
    
    def test_order_shipped_creates_notification(self):
        """PUT /api/admin/orders/{order_id}/status?status=shipped - Creates notification"""
        order_id = getattr(self.__class__, 'test_order_id', None)
        if not order_id:
            pytest.skip("No test order available")
        
        # Admin ships order
        resp = self.session.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status?status=shipped",
            headers=self.admin_headers
        )
        assert resp.status_code == 200, f"Failed to ship order: {resp.text}"
        print(f"✓ Order shipped: {order_id}")
        
        time.sleep(1)
        
        # Check for notification
        notif_resp = self.session.get(f"{BASE_URL}/api/notifications/user/list?limit=5", headers=self.user_headers)
        notifications = notif_resp.json().get("notifications", [])
        
        shipped_notif = None
        for n in notifications:
            if "Shipped" in n.get("title", "") and order_id[-6:] in n.get("message", ""):
                shipped_notif = n
                break
        
        assert shipped_notif is not None, "Order Shipped notification not found"
        print(f"✓ Order Shipped notification: {shipped_notif.get('title')}")
    
    def test_order_cancelled_creates_notification(self):
        """PUT /api/admin/orders/{order_id}/status?status=cancelled - Creates notification"""
        # Create a new order for cancellation test
        if not self._add_product_to_cart():
            pytest.skip("Could not add product to cart")
        
        order_resp = self.session.post(f"{BASE_URL}/api/orders", headers=self.user_headers, json={
            "payment_method": "cod",
            "shipping_address": {
                "name": "Test User",
                "phone": "9876543210",
                "address": "123 Test Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001"
            }
        })
        
        if order_resp.status_code != 200:
            pytest.skip("Could not create order for cancellation test")
        
        order_id = order_resp.json().get("order_id")
        
        # Admin cancels order
        resp = self.session.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status?status=cancelled",
            headers=self.admin_headers
        )
        assert resp.status_code == 200, f"Failed to cancel order: {resp.text}"
        print(f"✓ Order cancelled: {order_id}")
        
        time.sleep(1)
        
        # Check for notification
        notif_resp = self.session.get(f"{BASE_URL}/api/notifications/user/list?limit=5", headers=self.user_headers)
        notifications = notif_resp.json().get("notifications", [])
        
        cancelled_notif = None
        for n in notifications:
            if "Cancelled" in n.get("title", "") and order_id[-6:] in n.get("message", ""):
                cancelled_notif = n
                break
        
        assert cancelled_notif is not None, "Order Cancelled notification not found"
        print(f"✓ Order Cancelled notification: {cancelled_notif.get('title')}")


class TestMarkNotificationRead:
    """Test marking notifications as read"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as normal user
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert login_resp.status_code == 200
        self.user_token = login_resp.json().get("token")
        self.user_headers = {"Authorization": f"Bearer {self.user_token}"}
    
    def test_mark_single_notification_read(self):
        """PUT /api/notifications/user/read/{notification_id} - Marks notification as read"""
        # Get an unread notification
        resp = self.session.get(f"{BASE_URL}/api/notifications/user/list?unread_only=true&limit=1", headers=self.user_headers)
        assert resp.status_code == 200
        
        notifications = resp.json().get("notifications", [])
        if not notifications:
            pytest.skip("No unread notifications to test")
        
        notif_id = notifications[0].get("notification_id")
        
        # Mark as read
        mark_resp = self.session.put(f"{BASE_URL}/api/notifications/user/read/{notif_id}", headers=self.user_headers)
        assert mark_resp.status_code == 200, f"Failed to mark as read: {mark_resp.text}"
        
        # Verify it's marked as read
        verify_resp = self.session.get(f"{BASE_URL}/api/notifications/user/list?limit=20", headers=self.user_headers)
        notifications = verify_resp.json().get("notifications", [])
        
        marked_notif = next((n for n in notifications if n.get("notification_id") == notif_id), None)
        if marked_notif:
            assert marked_notif.get("is_read") == True, "Notification should be marked as read"
        
        print(f"✓ Marked notification {notif_id} as read")
    
    def test_mark_all_notifications_read(self):
        """PUT /api/notifications/user/read-all - Marks all user notifications as read"""
        # Mark all as read
        resp = self.session.put(f"{BASE_URL}/api/notifications/user/read-all", headers=self.user_headers)
        assert resp.status_code == 200, f"Failed to mark all as read: {resp.text}"
        
        # Verify unread count is 0
        count_resp = self.session.get(f"{BASE_URL}/api/notifications/user/unread-count", headers=self.user_headers)
        assert count_resp.status_code == 200
        assert count_resp.json().get("unread_count") == 0, "Unread count should be 0 after marking all read"
        
        print("✓ Marked all notifications as read")
    
    def test_mark_nonexistent_notification_read(self):
        """PUT /api/notifications/user/read/{invalid_id} - Returns 404"""
        resp = self.session.put(f"{BASE_URL}/api/notifications/user/read/invalid_notif_id", headers=self.user_headers)
        assert resp.status_code == 404, "Should return 404 for non-existent notification"
        print("✓ 404 returned for non-existent notification")


class TestNotificationDataStructure:
    """Test notification data structure and fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert login_resp.status_code == 200
        self.user_token = login_resp.json().get("token")
        self.user_headers = {"Authorization": f"Bearer {self.user_token}"}
    
    def test_notification_has_required_fields(self):
        """Notifications should have all required fields"""
        resp = self.session.get(f"{BASE_URL}/api/notifications/user/list?limit=5", headers=self.user_headers)
        assert resp.status_code == 200
        
        notifications = resp.json().get("notifications", [])
        if not notifications:
            pytest.skip("No notifications to verify structure")
        
        required_fields = ["notification_id", "type", "title", "message", "is_read", "created_at"]
        
        for notif in notifications:
            for field in required_fields:
                assert field in notif, f"Notification missing required field: {field}"
        
        print(f"✓ All {len(notifications)} notifications have required fields")
    
    def test_order_notification_has_redirect_url(self):
        """Order notifications should have redirect_url to /orders"""
        resp = self.session.get(f"{BASE_URL}/api/notifications/user/list?limit=20", headers=self.user_headers)
        assert resp.status_code == 200
        
        notifications = resp.json().get("notifications", [])
        order_notifs = [n for n in notifications if n.get("type") == "order"]
        
        if not order_notifs:
            pytest.skip("No order notifications to verify")
        
        for notif in order_notifs:
            assert notif.get("redirect_url") == "/orders", f"Order notification should redirect to /orders, got: {notif.get('redirect_url')}"
        
        print(f"✓ All {len(order_notifs)} order notifications have correct redirect_url")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
