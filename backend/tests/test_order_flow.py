"""
Test E-commerce Order Flow System
- Customer Registration/Login
- Add to Cart
- Checkout flow with payment verification
- Admin Order Management (login, list, status updates, tracking)
- Customer Orders Page with tracking display
"""
import pytest
import requests
import os
import time
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
TEST_PRODUCT_ID = "prod_2636c2324d48"  # pigma 1 at Rs.2999

class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "admin" in data, "No admin data in response"
        assert data["admin"]["email"] == ADMIN_EMAIL
        print(f"Admin login successful: {data['admin']['name']}")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestCustomerAuth:
    """Customer authentication tests"""
    
    @pytest.fixture
    def test_user_data(self):
        """Generate unique test user data"""
        timestamp = int(time.time())
        return {
            "email": f"test_order_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}",
            "phone": f"98765{timestamp % 100000:05d}"
        }
    
    def test_customer_register(self, test_user_data):
        """Test customer registration"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json=test_user_data)
        # May return 200 or 400 if email exists
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            assert "user" in data
            print(f"Customer registered: {data['user']['email']}")
        else:
            print(f"Registration response: {response.status_code} - {response.text}")
    
    def test_customer_login(self):
        """Test customer login with existing user"""
        # First register a user
        timestamp = int(time.time())
        user_data = {
            "email": f"test_login_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Test Login User {timestamp}"
        }
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        
        if reg_response.status_code == 200:
            # Now login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": user_data["email"],
                "password": user_data["password"]
            })
            assert login_response.status_code == 200, f"Login failed: {login_response.text}"
            data = login_response.json()
            assert "token" in data
            print(f"Customer login successful: {data['user']['email']}")


class TestCartOperations:
    """Cart operations tests"""
    
    @pytest.fixture
    def customer_token(self):
        """Get a customer token for testing"""
        timestamp = int(time.time())
        user_data = {
            "email": f"test_cart_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Test Cart User {timestamp}"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code == 200:
            return response.json()["token"]
        # Try login if already exists
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": user_data["email"],
            "password": user_data["password"]
        })
        if login_response.status_code == 200:
            return login_response.json()["token"]
        pytest.skip("Could not get customer token")
    
    def test_add_to_cart(self, customer_token):
        """Test adding product to cart"""
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": TEST_PRODUCT_ID,
                "quantity": 1,
                "size": "M",
                "color": "Black"
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Add to cart failed: {response.text}"
        data = response.json()
        assert "items" in data or "cart" in data or "message" in data
        print(f"Add to cart response: {data}")
    
    def test_get_cart(self, customer_token):
        """Test getting cart contents"""
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Get cart failed: {response.text}"
        data = response.json()
        print(f"Cart contents: {data}")


class TestCheckoutFlow:
    """Complete checkout flow tests"""
    
    @pytest.fixture
    def customer_with_cart(self):
        """Create customer with item in cart"""
        timestamp = int(time.time())
        user_data = {
            "email": f"test_checkout_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Test Checkout User {timestamp}"
        }
        
        # Register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if reg_response.status_code != 200:
            pytest.skip(f"Could not register user: {reg_response.text}")
        
        token = reg_response.json()["token"]
        
        # Add to cart
        cart_response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": TEST_PRODUCT_ID,
                "quantity": 1,
                "size": "M",
                "color": "Black"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if cart_response.status_code != 200:
            pytest.skip(f"Could not add to cart: {cart_response.text}")
        
        return token
    
    def test_create_order(self, customer_with_cart):
        """Test order creation"""
        token = customer_with_cart
        
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "shipping_address": {
                    "name": "Test User",
                    "email": "test@test.com",
                    "phone": "9876543210",
                    "address": "123 Test Street",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pincode": "400001",
                    "country": "India"
                },
                "payment_method": "razorpay"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        data = response.json()
        assert "order_id" in data, "No order_id in response"
        assert data["status"] == "pending"
        print(f"Order created: {data['order_id']}")
        return data["order_id"], token
    
    def test_verify_payment(self, customer_with_cart):
        """Test payment verification (mocked)"""
        token = customer_with_cart
        
        # First create order
        order_response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "shipping_address": {
                    "name": "Test User",
                    "email": "test@test.com",
                    "phone": "9876543210",
                    "address": "123 Test Street",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pincode": "400001",
                    "country": "India"
                },
                "payment_method": "razorpay"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if order_response.status_code != 200:
            pytest.skip(f"Order creation failed: {order_response.text}")
        
        order_id = order_response.json()["order_id"]
        
        # Verify payment with demo payment ID
        verify_response = requests.post(
            f"{BASE_URL}/api/orders/{order_id}/payment/verify",
            params={
                "razorpay_payment_id": f"demo_{int(time.time())}",
                "razorpay_signature": "demo_sig"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert verify_response.status_code == 200, f"Payment verification failed: {verify_response.text}"
        data = verify_response.json()
        assert data.get("status") == "paid" or "message" in data
        print(f"Payment verified: {data}")
        return order_id, token


class TestCustomerOrders:
    """Customer orders page tests"""
    
    @pytest.fixture
    def customer_with_order(self):
        """Create customer with completed order"""
        timestamp = int(time.time())
        user_data = {
            "email": f"test_orders_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Test Orders User {timestamp}"
        }
        
        # Register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if reg_response.status_code != 200:
            pytest.skip(f"Could not register user: {reg_response.text}")
        
        token = reg_response.json()["token"]
        
        # Add to cart
        requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": TEST_PRODUCT_ID,
                "quantity": 1,
                "size": "M",
                "color": "Black"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Create order
        order_response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "shipping_address": {
                    "name": "Test User",
                    "email": "test@test.com",
                    "phone": "9876543210",
                    "address": "123 Test Street",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pincode": "400001",
                    "country": "India"
                },
                "payment_method": "razorpay"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if order_response.status_code != 200:
            pytest.skip(f"Order creation failed: {order_response.text}")
        
        order_id = order_response.json()["order_id"]
        
        # Verify payment
        requests.post(
            f"{BASE_URL}/api/orders/{order_id}/payment/verify",
            params={
                "razorpay_payment_id": f"demo_{int(time.time())}",
                "razorpay_signature": "demo_sig"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        return token, order_id
    
    def test_get_customer_orders(self, customer_with_order):
        """Test getting customer orders list"""
        token, order_id = customer_with_order
        
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Get orders failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Orders should be a list"
        assert len(data) > 0, "Should have at least one order"
        
        # Find our order
        our_order = next((o for o in data if o["order_id"] == order_id), None)
        assert our_order is not None, f"Order {order_id} not found in list"
        print(f"Customer orders: {len(data)} orders found")
    
    def test_get_single_order(self, customer_with_order):
        """Test getting single order details"""
        token, order_id = customer_with_order
        
        response = requests.get(
            f"{BASE_URL}/api/orders/{order_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Get order failed: {response.text}"
        data = response.json()
        assert data["order_id"] == order_id
        assert "items" in data
        assert "total" in data
        assert "status" in data
        print(f"Order details: {data['order_id']} - Status: {data['status']}")


class TestAdminOrderManagement:
    """Admin order management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["token"]
    
    @pytest.fixture
    def test_order(self, admin_token):
        """Create a test order for admin operations"""
        timestamp = int(time.time())
        user_data = {
            "email": f"test_admin_order_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Test Admin Order User {timestamp}"
        }
        
        # Register customer
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if reg_response.status_code != 200:
            pytest.skip(f"Could not register user: {reg_response.text}")
        
        customer_token = reg_response.json()["token"]
        
        # Add to cart
        requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": TEST_PRODUCT_ID,
                "quantity": 1,
                "size": "M",
                "color": "Black"
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # Create order
        order_response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "shipping_address": {
                    "name": "Admin Test User",
                    "email": "admintest@test.com",
                    "phone": "9876543210",
                    "address": "456 Admin Street",
                    "city": "Delhi",
                    "state": "Delhi",
                    "pincode": "110001",
                    "country": "India"
                },
                "payment_method": "razorpay"
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        if order_response.status_code != 200:
            pytest.skip(f"Order creation failed: {order_response.text}")
        
        order_id = order_response.json()["order_id"]
        
        # Verify payment
        requests.post(
            f"{BASE_URL}/api/orders/{order_id}/payment/verify",
            params={
                "razorpay_payment_id": f"demo_{int(time.time())}",
                "razorpay_signature": "demo_sig"
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        return order_id, customer_token
    
    def test_admin_get_orders(self, admin_token):
        """Test admin getting all orders"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Admin get orders failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Orders should be a list"
        print(f"Admin orders: {len(data)} orders found")
    
    def test_admin_get_orders_with_filter(self, admin_token):
        """Test admin getting orders with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders?status=confirmed",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Admin get filtered orders failed: {response.text}"
        data = response.json()
        # All returned orders should have confirmed status
        for order in data:
            assert order["status"] == "confirmed", f"Order {order['order_id']} has status {order['status']}"
        print(f"Admin filtered orders (confirmed): {len(data)} orders")
    
    def test_admin_new_order_count(self, admin_token):
        """Test admin new order count polling endpoint"""
        # Get count since a past timestamp
        since = "2020-01-01T00:00:00Z"
        response = requests.get(
            f"{BASE_URL}/api/admin/orders/new-count?since={since}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"New order count failed: {response.text}"
        data = response.json()
        assert "count" in data, "No count in response"
        assert "latest" in data, "No latest in response"
        assert isinstance(data["latest"], list), "Latest should be a list"
        print(f"New order count: {data['count']}, Latest: {len(data['latest'])} orders")
    
    def test_admin_update_order_status_to_confirmed(self, admin_token, test_order):
        """Test admin updating order status to confirmed"""
        order_id, _ = test_order
        
        # Order should already be confirmed after payment, let's try processing
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status?status=processing",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Update status failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Order status updated: {data}")
    
    def test_admin_add_tracking(self, admin_token, test_order):
        """Test admin adding tracking ID to order"""
        order_id, _ = test_order
        
        # First update to processing
        requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status?status=processing",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Add tracking
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/tracking",
            json={
                "tracking_id": f"TRACK{int(time.time())}",
                "courier_name": "BlueDart Express"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Add tracking failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Tracking added: {data}")
    
    def test_customer_sees_tracking(self, admin_token, test_order):
        """Test that customer can see tracking info after admin adds it"""
        order_id, customer_token = test_order
        
        # Admin adds tracking
        tracking_id = f"TRACK{int(time.time())}"
        requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/tracking",
            json={
                "tracking_id": tracking_id,
                "courier_name": "DTDC"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Customer fetches order
        response = requests.get(
            f"{BASE_URL}/api/orders/{order_id}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 200, f"Get order failed: {response.text}"
        data = response.json()
        assert data.get("tracking_id") == tracking_id, f"Tracking ID mismatch: {data.get('tracking_id')}"
        assert data.get("courier_name") == "DTDC", f"Courier name mismatch: {data.get('courier_name')}"
        assert data.get("status") == "shipped", f"Status should be shipped: {data.get('status')}"
        print(f"Customer sees tracking: {data['tracking_id']} via {data['courier_name']}")
    
    def test_admin_mark_delivered(self, admin_token, test_order):
        """Test admin marking order as delivered"""
        order_id, _ = test_order
        
        # First ship the order
        requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/tracking",
            json={
                "tracking_id": f"TRACK{int(time.time())}",
                "courier_name": "FedEx"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Mark as delivered
        response = requests.put(
            f"{BASE_URL}/api/admin/orders/{order_id}/status?status=delivered",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Mark delivered failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Order marked delivered: {data}")


class TestOrderDetail:
    """Admin order detail endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["token"]
    
    def test_admin_get_order_detail(self, admin_token):
        """Test admin getting order detail with customer info"""
        # First get list of orders
        list_response = requests.get(
            f"{BASE_URL}/api/admin/orders?limit=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if list_response.status_code != 200 or not list_response.json():
            pytest.skip("No orders available for detail test")
        
        order_id = list_response.json()[0]["order_id"]
        
        # Get detail
        response = requests.get(
            f"{BASE_URL}/api/admin/orders/{order_id}/detail",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Get order detail failed: {response.text}"
        data = response.json()
        assert "order_id" in data
        assert "customer" in data, "Customer info should be included"
        print(f"Order detail: {data['order_id']} - Customer: {data.get('customer', {})}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
