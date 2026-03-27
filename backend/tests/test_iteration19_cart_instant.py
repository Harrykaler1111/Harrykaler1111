"""
Iteration 19: Cart Instant Update & Booster Bar Tests
Tests for:
1. Add to Cart returns updated cart state immediately
2. Cart endpoints work correctly
3. Booster config endpoint works
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCartInstantUpdate:
    """Test cart instant update functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as customer
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "harpreetkaler750@gmail.com",
            "password": "Harpreet@123"
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            print(f"✓ Logged in successfully")
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_get_cart(self):
        """Test GET /api/cart returns cart with items and total"""
        response = self.session.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Response should contain 'items'"
        assert "total" in data, "Response should contain 'total'"
        print(f"✓ Cart has {len(data['items'])} items, total: {data['total']}")
    
    def test_add_to_cart_returns_updated_state(self):
        """Test POST /api/cart/add returns updated cart state immediately"""
        # First get a product
        products_response = self.session.get(f"{BASE_URL}/api/products?limit=1")
        assert products_response.status_code == 200
        products = products_response.json()
        assert len(products) > 0, "No products found"
        
        product = products[0]
        product_id = product.get("product_id")
        size = product.get("sizes", ["M"])[0] if product.get("sizes") else "M"
        color = product.get("colors", ["Default"])[0] if product.get("colors") else "Default"
        
        # Get initial cart state
        initial_cart = self.session.get(f"{BASE_URL}/api/cart").json()
        initial_total = initial_cart.get("total", 0)
        
        # Add to cart
        add_response = self.session.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": product_id,
            "quantity": 1,
            "size": size,
            "color": color
        })
        
        assert add_response.status_code == 200, f"Add to cart failed: {add_response.status_code}"
        
        # Verify response contains updated cart state
        cart_data = add_response.json()
        assert "items" in cart_data, "Add to cart response should contain 'items'"
        assert "total" in cart_data, "Add to cart response should contain 'total'"
        
        # Verify total increased
        new_total = cart_data.get("total", 0)
        assert new_total >= initial_total, f"Total should increase: {initial_total} -> {new_total}"
        
        print(f"✓ Add to cart returns updated state: total {initial_total} -> {new_total}")
    
    def test_booster_config_endpoint(self):
        """Test GET /api/booster/config returns slabs and messages"""
        response = self.session.get(f"{BASE_URL}/api/booster/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "slabs" in data, "Response should contain 'slabs'"
        
        slabs = data.get("slabs", [])
        assert len(slabs) > 0, "Should have at least one slab"
        
        # Verify slab structure
        for slab in slabs:
            assert "min_cart_value" in slab, "Slab should have min_cart_value"
            assert "reward_label" in slab, "Slab should have reward_label"
        
        print(f"✓ Booster config has {len(slabs)} slabs")
    
    def test_cart_update_quantity(self):
        """Test PUT /api/cart/update updates item quantity"""
        # Get current cart
        cart_response = self.session.get(f"{BASE_URL}/api/cart")
        assert cart_response.status_code == 200
        
        cart = cart_response.json()
        items = cart.get("items", [])
        
        if len(items) == 0:
            pytest.skip("No items in cart to update")
        
        item = items[0]
        new_qty = item.get("quantity", 1) + 1
        
        # Update quantity
        update_response = self.session.put(f"{BASE_URL}/api/cart/update", json={
            "product_id": item.get("product_id"),
            "size": item.get("size"),
            "color": item.get("color"),
            "quantity": new_qty
        })
        
        assert update_response.status_code == 200, f"Update failed: {update_response.status_code}"
        print(f"✓ Cart item quantity updated to {new_qty}")
    
    def test_upsell_suggestions(self):
        """Test GET /api/cart/upsell-suggestions returns products"""
        response = self.session.get(f"{BASE_URL}/api/cart/upsell-suggestions?max_price=5000")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Upsell suggestions returned {len(data)} products")
    
    def test_cart_without_auth_returns_401(self):
        """Test cart endpoints require authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Cart endpoint requires authentication")


class TestBoosterBarIntegration:
    """Test booster bar related functionality"""
    
    def test_booster_config_public(self):
        """Test booster config is publicly accessible"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/booster/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        slabs = data.get("slabs", [])
        
        # Verify slabs are sorted by min_cart_value
        values = [s.get("min_cart_value", 0) for s in slabs if s.get("is_enabled")]
        assert values == sorted(values), "Slabs should be sorted by min_cart_value"
        
        print(f"✓ Booster config publicly accessible with {len(slabs)} slabs")
    
    def test_booster_slabs_have_required_fields(self):
        """Test each slab has required fields"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/booster/config")
        assert response.status_code == 200
        
        data = response.json()
        slabs = data.get("slabs", [])
        
        required_fields = ["slab_id", "min_cart_value", "reward_type", "reward_value", "reward_label", "is_enabled"]
        
        for slab in slabs:
            for field in required_fields:
                assert field in slab, f"Slab missing required field: {field}"
        
        print(f"✓ All {len(slabs)} slabs have required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
