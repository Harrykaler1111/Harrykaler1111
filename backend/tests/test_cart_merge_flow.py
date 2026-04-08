"""
Test Cart Merge Flow - Guest to Logged-in User
Tests the cart merge functionality when a guest user logs in during checkout.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://swipe-vendor-feed.preview.emergentagent.com')


class TestCartMergeFlow:
    """Tests for cart merge functionality when guest logs in"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_email = f"testcartmerge_{uuid.uuid4().hex[:8]}@test.com"
        self.test_password = "test123"
        self.test_name = "Cart Merge Test User"
        
    def get_products(self):
        """Get available products for testing"""
        response = requests.get(f"{BASE_URL}/api/products?limit=5")
        assert response.status_code == 200
        products = response.json()
        assert len(products) > 0, "No products available for testing"
        return products
    
    def register_user(self):
        """Register a new test user"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": self.test_name,
            "email": self.test_email,
            "password": self.test_password
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        return data["token"], data["user"]
    
    def login_user(self, email=None, password=None):
        """Login existing user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email or self.test_email,
            "password": password or self.test_password
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data["token"], data["user"]
    
    def test_auth_register_endpoint(self):
        """Test user registration endpoint works"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": f"Test User {uuid.uuid4().hex[:6]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@test.com",
            "password": "testpass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Registration endpoint works - user_id: {data['user']['user_id']}")
    
    def test_auth_login_endpoint(self):
        """Test user login endpoint works"""
        # First register
        email = f"logintest_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Login Test User",
            "email": email,
            "password": "testpass123"
        })
        assert reg_response.status_code == 200
        
        # Then login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "testpass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"✓ Login endpoint works")
    
    def test_cart_add_endpoint_requires_auth(self):
        """Test that cart add endpoint requires authentication"""
        products = self.get_products()
        product = products[0]
        
        # Try without auth
        response = requests.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": product["product_id"],
            "quantity": 1,
            "size": product.get("sizes", ["Free Size"])[0],
            "color": product.get("colors", ["Default"])[0]
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Cart add requires authentication")
    
    def test_cart_add_with_auth(self):
        """Test adding item to cart with authentication"""
        # Register and get token
        token, user = self.register_user()
        products = self.get_products()
        product = products[0]
        
        # Add to cart
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": product["product_id"],
                "quantity": 1,
                "size": product.get("sizes", ["Free Size"])[0],
                "color": product.get("colors", ["Default"])[0]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Add to cart failed: {response.text}"
        data = response.json()
        assert "items" in data
        assert len(data["items"]) > 0
        print(f"✓ Cart add with auth works - {len(data['items'])} items in cart")
    
    def test_cart_add_increments_quantity_for_duplicate(self):
        """Test that adding same product+size+color increments quantity"""
        # Register and get token
        token, user = self.register_user()
        products = self.get_products()
        product = products[0]
        
        size = product.get("sizes", ["Free Size"])[0]
        color = product.get("colors", ["Default"])[0]
        
        # Add first time
        response1 = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": product["product_id"],
                "quantity": 2,
                "size": size,
                "color": color
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 200
        data1 = response1.json()
        initial_qty = data1["items"][0]["quantity"]
        
        # Add same product again
        response2 = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": product["product_id"],
                "quantity": 3,
                "size": size,
                "color": color
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Should have same number of items but increased quantity
        assert len(data2["items"]) == 1, "Should still have 1 item, not duplicate"
        final_qty = data2["items"][0]["quantity"]
        assert final_qty == initial_qty + 3, f"Expected quantity {initial_qty + 3}, got {final_qty}"
        print(f"✓ Cart add increments quantity for duplicate: {initial_qty} -> {final_qty}")
    
    def test_cart_get_endpoint(self):
        """Test getting cart contents"""
        token, user = self.register_user()
        
        # Get empty cart
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        print(f"✓ Cart get endpoint works - {len(data['items'])} items, total: {data['total']}")
    
    def test_cart_clear_endpoint(self):
        """Test clearing cart"""
        token, user = self.register_user()
        products = self.get_products()
        product = products[0]
        
        # Add item
        requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": product["product_id"],
                "quantity": 1,
                "size": product.get("sizes", ["Free Size"])[0],
                "color": product.get("colors", ["Default"])[0]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Clear cart
        response = requests.delete(
            f"{BASE_URL}/api/cart/clear",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        # Verify empty
        cart_response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert cart_response.status_code == 200
        assert len(cart_response.json()["items"]) == 0
        print(f"✓ Cart clear endpoint works")
    
    def test_cart_merge_simulation(self):
        """
        Simulate the cart merge flow:
        1. User has items in guest cart (localStorage - simulated by adding after login)
        2. User logs in
        3. Guest cart items are merged into server cart via POST /api/cart/add
        4. Duplicate products should have quantities summed
        """
        # Register user
        token, user = self.register_user()
        products = self.get_products()
        
        # Ensure we have at least 2 products
        assert len(products) >= 2, "Need at least 2 products for merge test"
        
        product1 = products[0]
        product2 = products[1]
        
        size1 = product1.get("sizes", ["Free Size"])[0]
        color1 = product1.get("colors", ["Default"])[0]
        size2 = product2.get("sizes", ["Free Size"])[0]
        color2 = product2.get("colors", ["Default"])[0]
        
        # Step 1: Add product1 to server cart (simulating existing server cart)
        response1 = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": product1["product_id"],
                "quantity": 2,
                "size": size1,
                "color": color1
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 200
        
        # Step 2: Simulate guest cart merge - add same product1 (should increment qty)
        response2 = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": product1["product_id"],
                "quantity": 1,  # Guest had 1 of same product
                "size": size1,
                "color": color1
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == 200
        
        # Step 3: Simulate guest cart merge - add different product2
        response3 = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": product2["product_id"],
                "quantity": 3,  # Guest had 3 of different product
                "size": size2,
                "color": color2
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response3.status_code == 200
        
        # Step 4: Verify final cart state
        cart_response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert cart_response.status_code == 200
        cart = cart_response.json()
        
        # Should have 2 items
        assert len(cart["items"]) == 2, f"Expected 2 items, got {len(cart['items'])}"
        
        # Find product1 and verify quantity is 3 (2 + 1)
        product1_item = next((i for i in cart["items"] if i["product_id"] == product1["product_id"]), None)
        assert product1_item is not None, "Product1 not found in cart"
        assert product1_item["quantity"] == 3, f"Expected qty 3 for product1, got {product1_item['quantity']}"
        
        # Find product2 and verify quantity is 3
        product2_item = next((i for i in cart["items"] if i["product_id"] == product2["product_id"]), None)
        assert product2_item is not None, "Product2 not found in cart"
        assert product2_item["quantity"] == 3, f"Expected qty 3 for product2, got {product2_item['quantity']}"
        
        print(f"✓ Cart merge simulation successful:")
        print(f"  - Product1 qty: 2 (server) + 1 (guest) = {product1_item['quantity']}")
        print(f"  - Product2 qty: 0 (server) + 3 (guest) = {product2_item['quantity']}")
        print(f"  - Total items: {len(cart['items'])}")
        print(f"  - Cart total: Rs.{cart['total']}")


class TestCheckoutFlow:
    """Tests for checkout flow after cart merge"""
    
    def test_checkout_settings_endpoint(self):
        """Test checkout settings endpoint"""
        response = requests.get(f"{BASE_URL}/api/checkout/settings")
        assert response.status_code == 200
        data = response.json()
        # Should have checkout configuration
        print(f"✓ Checkout settings endpoint works")
        print(f"  - COD enabled: {data.get('cod_enabled', 'N/A')}")
        print(f"  - Free shipping threshold: {data.get('free_shipping_threshold', 'N/A')}")
    
    def test_checkout_requires_auth(self):
        """Test that checkout/order creation requires authentication"""
        response = requests.post(f"{BASE_URL}/api/orders", json={
            "shipping_address": {
                "name": "Test",
                "phone": "1234567890",
                "address": "Test Address",
                "city": "Test City",
                "state": "Test State",
                "pincode": "123456",
                "country": "India"
            },
            "payment_method": "cod"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Order creation requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
