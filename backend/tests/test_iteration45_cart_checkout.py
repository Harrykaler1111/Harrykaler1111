"""
Iteration 45: Cart and Checkout Flow Tests
Tests for:
- Guest cart functionality (localStorage)
- Add to Cart popup
- Cart Page with trust badges
- CheckoutAuthModal (WhatsApp OTP + Email login)
- OTP send/verify endpoints
- Email login via modal
- Checkout page with GPS and trust elements
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOTPEndpoints:
    """Test WhatsApp OTP send and verify endpoints"""
    
    def test_otp_send_success(self):
        """POST /api/auth/otp/send should return 200 with demo_otp"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": "9876543210"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "demo_otp" in data, "Response should contain demo_otp field"
        assert "message" in data, "Response should contain message field"
        assert len(data["demo_otp"]) == 6, "OTP should be 6 digits"
        print(f"OTP send success: demo_otp={data['demo_otp']}")
    
    def test_otp_send_invalid_phone(self):
        """POST /api/auth/otp/send with empty phone should still work (backend accepts any phone)"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": ""
        })
        # Backend may accept empty phone or return error
        assert response.status_code in [200, 400, 422], f"Unexpected status: {response.status_code}"
    
    def test_otp_verify_success(self):
        """POST /api/auth/otp/verify with correct OTP should return token and user"""
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": "9876543211"
        })
        assert send_response.status_code == 200
        demo_otp = send_response.json()["demo_otp"]
        
        # Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": "9876543211",
            "otp": demo_otp
        })
        assert verify_response.status_code == 200, f"Expected 200, got {verify_response.status_code}: {verify_response.text}"
        data = verify_response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user data"
        assert data["user"]["phone"] == "9876543211", "User phone should match"
        print(f"OTP verify success: user_id={data['user']['user_id']}")
    
    def test_otp_verify_invalid(self):
        """POST /api/auth/otp/verify with wrong OTP should return 400"""
        # First send OTP
        requests.post(f"{BASE_URL}/api/auth/otp/send", json={"phone": "9876543212"})
        
        # Verify with wrong OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": "9876543212",
            "otp": "000000"
        })
        assert verify_response.status_code == 400, f"Expected 400, got {verify_response.status_code}"


class TestEmailLogin:
    """Test email login endpoint"""
    
    def test_email_login_success(self):
        """POST /api/auth/login with valid credentials should return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@pigma.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == "admin@pigma.com"
        print(f"Email login success: user_id={data['user']['user_id']}")
        return data["token"]
    
    def test_email_login_invalid(self):
        """POST /api/auth/login with invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@pigma.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestCartEndpoints:
    """Test cart API endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for cart operations"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@pigma.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get auth token")
    
    def test_get_cart_authenticated(self, auth_token):
        """GET /api/cart should return cart for authenticated user"""
        response = requests.get(f"{BASE_URL}/api/cart", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "items" in data, "Cart should have items array"
        print(f"Cart has {len(data['items'])} items")
    
    def test_get_cart_unauthenticated(self):
        """GET /api/cart without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestProductsEndpoint:
    """Test products endpoint for guest browsing"""
    
    def test_get_products_no_auth(self):
        """GET /api/products should work without authentication (guest browsing)"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "products" in data or isinstance(data, list), "Should return products"
        products = data.get("products", data) if isinstance(data, dict) else data
        print(f"Found {len(products)} products for guest browsing")
        return products
    
    def test_get_product_detail_no_auth(self):
        """GET /api/products/{id} should work without authentication"""
        # First get a product ID
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        products_list = products.get("products", products) if isinstance(products, dict) else products
        
        if not products_list:
            pytest.skip("No products available")
        
        product_id = products_list[0].get("product_id")
        response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "product_id" in data, "Product should have product_id"
        assert "name" in data, "Product should have name"
        assert "price" in data, "Product should have price"
        print(f"Product detail: {data['name']} - Rs.{data['price']}")


class TestCheckoutSettings:
    """Test checkout settings endpoint"""
    
    def test_get_checkout_settings(self):
        """GET /api/checkout/settings should return checkout configuration"""
        response = requests.get(f"{BASE_URL}/api/checkout/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Check for expected fields
        print(f"Checkout settings: {data}")


class TestCartBoosterSlabs:
    """Test cart booster slabs endpoint"""
    
    def test_get_slabs(self):
        """GET /api/cart-booster/slabs should return discount slabs"""
        response = requests.get(f"{BASE_URL}/api/cart-booster/slabs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Should return list of slabs"
        print(f"Found {len(data)} cart booster slabs")


class TestCouponValidation:
    """Test coupon validation endpoint"""
    
    def test_validate_coupon_invalid(self):
        """POST /api/coupons/validate with invalid code should return error"""
        response = requests.post(f"{BASE_URL}/api/coupons/validate?code=INVALIDCODE&subtotal=1000")
        # Should return 400 or 404 for invalid coupon
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"


class TestUserRegistration:
    """Test user registration (signup) endpoint"""
    
    def test_register_new_user(self):
        """POST /api/auth/register should create new user"""
        import uuid
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": unique_email,
            "password": "testpass123",
            "phone": "9999999999"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == unique_email
        print(f"Registration success: {unique_email}")
    
    def test_register_duplicate_email(self):
        """POST /api/auth/register with existing email should return 400"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": "admin@pigma.com",  # Existing email
            "password": "testpass123"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
