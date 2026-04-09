"""
Test Order Notification and Tracking System
Tests: Advanced search, time filters, status filters, email logs, order creation with notifications
"""

import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@pigma.com"
SUPER_ADMIN_PASSWORD = "superadmin123"
CUSTOMER_EMAIL = "admin@pigma.com"
CUSTOMER_PASSWORD = "admin123"


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "admin" in data, "No admin data in response"
        print(f"✓ Admin login successful - Role: {data['admin'].get('role')}")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials rejected correctly")


class TestOrderSearch:
    """Advanced order search tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin authentication failed")
    
    def test_search_orders_basic(self):
        """Test basic order search endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/orders/search", headers=self.headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert "orders" in data, "No orders field in response"
        assert "total" in data, "No total field in response"
        assert "total_value" in data, "No total_value field in response"
        print(f"✓ Basic search returned {data['total']} orders, total value: Rs.{data['total_value']}")
    
    def test_search_orders_time_filter_today(self):
        """Test order search with today time filter"""
        response = requests.get(f"{BASE_URL}/api/admin/orders/search?time_range=today", headers=self.headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert "orders" in data
        assert data.get("query_applied", {}).get("time_range") == "today"
        print(f"✓ Today filter returned {data['total']} orders")
    
    def test_search_orders_time_filter_7d(self):
        """Test order search with 7 days time filter"""
        response = requests.get(f"{BASE_URL}/api/admin/orders/search?time_range=7d", headers=self.headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert "orders" in data
        assert data.get("query_applied", {}).get("time_range") == "7d"
        print(f"✓ 7 days filter returned {data['total']} orders")
    
    def test_search_orders_time_filter_30d(self):
        """Test order search with 30 days time filter"""
        response = requests.get(f"{BASE_URL}/api/admin/orders/search?time_range=30d", headers=self.headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert "orders" in data
        print(f"✓ 30 days filter returned {data['total']} orders")
    
    def test_search_orders_status_filter(self):
        """Test order search with status filter"""
        for status in ["pending", "confirmed", "shipped", "delivered", "cancelled"]:
            response = requests.get(f"{BASE_URL}/api/admin/orders/search?status={status}", headers=self.headers)
            assert response.status_code == 200, f"Search failed for status {status}: {response.text}"
            data = response.json()
            assert data.get("query_applied", {}).get("status") == status
            print(f"✓ Status filter '{status}' returned {data['total']} orders")
    
    def test_search_orders_payment_status_filter(self):
        """Test order search with payment status filter"""
        for pay_status in ["paid", "pending", "cod", "failed"]:
            response = requests.get(f"{BASE_URL}/api/admin/orders/search?payment_status={pay_status}", headers=self.headers)
            assert response.status_code == 200, f"Search failed for payment_status {pay_status}: {response.text}"
            data = response.json()
            print(f"✓ Payment status filter '{pay_status}' returned {data['total']} orders")
    
    def test_search_orders_text_query(self):
        """Test order search with text query"""
        response = requests.get(f"{BASE_URL}/api/admin/orders/search?q=test", headers=self.headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert data.get("query_applied", {}).get("search") == "test"
        print(f"✓ Text search 'test' returned {data['total']} orders")
    
    def test_search_orders_combined_filters(self):
        """Test order search with multiple filters combined"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders/search?time_range=30d&status=pending&payment_status=pending",
            headers=self.headers
        )
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        query = data.get("query_applied", {})
        assert query.get("time_range") == "30d"
        assert query.get("status") == "pending"
        assert query.get("payment_status") == "pending"
        print(f"✓ Combined filters returned {data['total']} orders")
    
    def test_search_orders_requires_auth(self):
        """Test that order search requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/orders/search")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Order search requires authentication")


class TestEmailLogs:
    """Email log viewing tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin authentication failed")
    
    def test_get_email_logs(self):
        """Test getting email logs with summary"""
        response = requests.get(f"{BASE_URL}/api/email-logs", headers=self.headers)
        assert response.status_code == 200, f"Email logs failed: {response.text}"
        data = response.json()
        assert "logs" in data, "No logs field in response"
        assert "total" in data, "No total field in response"
        assert "summary" in data, "No summary field in response"
        print(f"✓ Email logs returned {data['total']} entries, summary: {data['summary']}")
    
    def test_get_email_logs_by_status(self):
        """Test filtering email logs by status"""
        for status in ["sent", "skipped", "failed", "pending"]:
            response = requests.get(f"{BASE_URL}/api/email-logs?status={status}", headers=self.headers)
            assert response.status_code == 200, f"Email logs failed for status {status}: {response.text}"
            data = response.json()
            print(f"✓ Email logs with status '{status}' returned {data['total']} entries")
    
    def test_get_email_logs_by_recipient_type(self):
        """Test filtering email logs by recipient type"""
        for rtype in ["admin", "vendor", "reseller", "influencer"]:
            response = requests.get(f"{BASE_URL}/api/email-logs?recipient_type={rtype}", headers=self.headers)
            assert response.status_code == 200, f"Email logs failed for type {rtype}: {response.text}"
            data = response.json()
            print(f"✓ Email logs for '{rtype}' returned {data['total']} entries")
    
    def test_get_email_logs_for_order(self):
        """Test getting email logs for a specific order"""
        # First get an order ID
        orders_response = requests.get(f"{BASE_URL}/api/admin/orders/search?limit=1", headers=self.headers)
        if orders_response.status_code == 200 and orders_response.json().get("orders"):
            order_id = orders_response.json()["orders"][0]["order_id"]
            response = requests.get(f"{BASE_URL}/api/email-logs/order/{order_id}", headers=self.headers)
            assert response.status_code == 200, f"Email logs for order failed: {response.text}"
            data = response.json()
            assert "logs" in data
            assert data.get("order_id") == order_id
            print(f"✓ Email logs for order {order_id} returned {len(data['logs'])} entries")
        else:
            print("⚠ No orders found to test email logs for specific order")
    
    def test_email_logs_requires_auth(self):
        """Test that email logs require authentication"""
        response = requests.get(f"{BASE_URL}/api/email-logs")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Email logs require authentication")


class TestNewOrderCount:
    """New order count polling endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin authentication failed")
    
    def test_get_new_order_count(self):
        """Test getting new order count for polling"""
        response = requests.get(f"{BASE_URL}/api/admin/orders/new-count", headers=self.headers)
        assert response.status_code == 200, f"New order count failed: {response.text}"
        data = response.json()
        assert "count" in data, "No count field in response"
        assert "latest" in data, "No latest field in response"
        print(f"✓ New order count: {data['count']}, latest: {len(data['latest'])} orders")
    
    def test_get_new_order_count_since_timestamp(self):
        """Test getting new order count since a specific timestamp"""
        since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        response = requests.get(f"{BASE_URL}/api/admin/orders/new-count?since={since}", headers=self.headers)
        assert response.status_code == 200, f"New order count failed: {response.text}"
        data = response.json()
        assert "count" in data
        print(f"✓ New orders since 1 hour ago: {data['count']}")


class TestOrderTimeline:
    """Order timeline tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin authentication failed")
    
    def test_get_order_timeline(self):
        """Test getting order timeline"""
        # First get an order ID
        orders_response = requests.get(f"{BASE_URL}/api/admin/orders/search?limit=1", headers=self.headers)
        if orders_response.status_code == 200 and orders_response.json().get("orders"):
            order_id = orders_response.json()["orders"][0]["order_id"]
            response = requests.get(f"{BASE_URL}/api/admin/orders/{order_id}/timeline", headers=self.headers)
            assert response.status_code == 200, f"Timeline failed: {response.text}"
            data = response.json()
            assert isinstance(data, list), "Timeline should be a list"
            print(f"✓ Order timeline for {order_id} has {len(data)} events")
        else:
            print("⚠ No orders found to test timeline")


class TestOrderDetail:
    """Order detail tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin authentication failed")
    
    def test_get_order_detail(self):
        """Test getting order detail with customer info"""
        # First get an order ID
        orders_response = requests.get(f"{BASE_URL}/api/admin/orders/search?limit=1", headers=self.headers)
        if orders_response.status_code == 200 and orders_response.json().get("orders"):
            order_id = orders_response.json()["orders"][0]["order_id"]
            response = requests.get(f"{BASE_URL}/api/admin/orders/{order_id}/detail", headers=self.headers)
            assert response.status_code == 200, f"Order detail failed: {response.text}"
            data = response.json()
            assert "order_id" in data, "No order_id in response"
            assert "customer" in data, "No customer info in response"
            print(f"✓ Order detail for {order_id} retrieved successfully")
        else:
            print("⚠ No orders found to test detail")
    
    def test_get_order_detail_not_found(self):
        """Test getting non-existent order detail"""
        response = requests.get(f"{BASE_URL}/api/admin/orders/nonexistent_order/detail", headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent order returns 404")


class TestOrderStatusUpdate:
    """Order status update tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin authentication failed")
    
    def test_update_order_status_invalid(self):
        """Test updating order with invalid status"""
        # First get an order ID
        orders_response = requests.get(f"{BASE_URL}/api/admin/orders/search?limit=1", headers=self.headers)
        if orders_response.status_code == 200 and orders_response.json().get("orders"):
            order_id = orders_response.json()["orders"][0]["order_id"]
            response = requests.put(
                f"{BASE_URL}/api/admin/orders/{order_id}/status?status=invalid_status",
                headers=self.headers
            )
            assert response.status_code == 400, f"Expected 400, got {response.status_code}"
            print("✓ Invalid status rejected correctly")
        else:
            print("⚠ No orders found to test status update")
    
    def test_update_order_status_not_found(self):
        """Test updating non-existent order status"""
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/nonexistent_order/status?status=confirmed",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent order returns 404")


class TestOrderTracking:
    """Order tracking update tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin authentication failed")
    
    def test_update_tracking_not_found(self):
        """Test updating tracking for non-existent order"""
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/nonexistent_order/tracking",
            json={"tracking_id": "TEST123", "courier_name": "Test Courier"},
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent order tracking returns 404")


class TestCODOrderCreation:
    """COD order creation tests (triggers email notifications)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get customer token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Customer authentication failed")
    
    def test_order_creation_requires_auth(self):
        """Test that order creation requires authentication"""
        response = requests.post(f"{BASE_URL}/api/orders", json={
            "payment_method": "cod",
            "shipping_address": {
                "name": "Test User",
                "phone": "9876543210",
                "address": "123 Test St",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001"
            }
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Order creation requires authentication")
    
    def test_order_creation_empty_cart(self):
        """Test order creation with empty cart"""
        response = requests.post(f"{BASE_URL}/api/orders", json={
            "payment_method": "cod",
            "shipping_address": {
                "name": "Test User",
                "phone": "9876543210",
                "address": "123 Test St",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001"
            }
        }, headers=self.headers)
        # Should fail with empty cart
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✓ Empty cart order rejected correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
