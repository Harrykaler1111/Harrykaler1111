"""
Test Cart API endpoints for UI features testing
- Cart add, update, remove operations
- Upsell suggestions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCartEndpoints:
    """Test cart API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@pigma.com",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")  # API returns "token" not "access_token"
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Login failed - skipping cart tests")
    
    def test_get_cart(self):
        """Test GET /api/cart - should return cart data"""
        response = self.session.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        print(f"Cart has {len(data['items'])} items, total: {data['total']}")
    
    def test_add_to_cart(self):
        """Test POST /api/cart/add - should add item to cart"""
        # First get a product
        products_response = self.session.get(f"{BASE_URL}/api/products?limit=1")
        assert products_response.status_code == 200
        products = products_response.json()
        assert len(products) > 0
        
        product = products[0]
        product_id = product.get("product_id")
        
        # Add to cart
        add_response = self.session.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": product_id,
            "quantity": 1,
            "size": product.get("sizes", ["M"])[0] if product.get("sizes") else "M",
            "color": product.get("colors", ["Default"])[0] if product.get("colors") else "Default"
        })
        assert add_response.status_code == 200
        cart_data = add_response.json()
        assert "items" in cart_data
        assert "total" in cart_data
        print(f"Added product {product_id} to cart")
    
    def test_update_cart_item(self):
        """Test PUT /api/cart/update - should update item quantity"""
        # First get cart
        cart_response = self.session.get(f"{BASE_URL}/api/cart")
        assert cart_response.status_code == 200
        cart = cart_response.json()
        
        if len(cart.get("items", [])) == 0:
            pytest.skip("Cart is empty - skipping update test")
        
        item = cart["items"][0]
        new_qty = item["quantity"] + 1
        
        # Update quantity
        update_response = self.session.put(f"{BASE_URL}/api/cart/update", json={
            "product_id": item["product_id"],
            "quantity": new_qty,
            "size": item.get("size", "M"),
            "color": item.get("color", "Default")
        })
        assert update_response.status_code == 200
        updated_cart = update_response.json()
        
        # Verify quantity updated
        updated_item = next((i for i in updated_cart["items"] if i["product_id"] == item["product_id"]), None)
        if updated_item:
            assert updated_item["quantity"] == new_qty
            print(f"Updated quantity to {new_qty}")
    
    def test_remove_cart_item(self):
        """Test DELETE /api/cart/item/{product_id} - should remove item"""
        # First add an item
        products_response = self.session.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json()
        product = products[0]
        product_id = product.get("product_id")
        size = product.get("sizes", ["M"])[0] if product.get("sizes") else "M"
        color = product.get("colors", ["Default"])[0] if product.get("colors") else "Default"
        
        # Add to cart
        self.session.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": product_id,
            "quantity": 1,
            "size": size,
            "color": color
        })
        
        # Remove from cart
        remove_response = self.session.delete(
            f"{BASE_URL}/api/cart/item/{product_id}?size={size}&color={color}"
        )
        assert remove_response.status_code == 200
        print(f"Removed product {product_id} from cart")
    
    def test_upsell_suggestions(self):
        """Test GET /api/cart/upsell-suggestions - should return product recommendations"""
        response = self.session.get(f"{BASE_URL}/api/cart/upsell-suggestions?max_price=5000")
        assert response.status_code == 200
        suggestions = response.json()
        assert isinstance(suggestions, list)
        print(f"Got {len(suggestions)} upsell suggestions")
        
        # Verify suggestion structure
        if len(suggestions) > 0:
            suggestion = suggestions[0]
            assert "product_id" in suggestion
            assert "name" in suggestion
            assert "price" in suggestion


class TestBoosterConfig:
    """Test booster configuration endpoint"""
    
    def test_get_booster_config(self):
        """Test GET /api/booster/config - should return booster slabs"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/booster/config")
        assert response.status_code == 200
        data = response.json()
        assert "slabs" in data
        assert "messages" in data
        print(f"Booster config has {len(data['slabs'])} slabs")


class TestProductsGrid:
    """Test products endpoint for grid display"""
    
    def test_get_products(self):
        """Test GET /api/products - should return products list"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/products?limit=50")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        assert len(products) > 0
        print(f"Got {len(products)} products")
        
        # Verify product structure
        product = products[0]
        assert "product_id" in product
        assert "name" in product
        assert "price" in product
        assert "images" in product
    
    def test_get_featured_products(self):
        """Test GET /api/products/featured - should return featured products"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/products/featured?limit=4")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"Got {len(products)} featured products")
    
    def test_get_new_arrivals(self):
        """Test GET /api/products/new-arrivals - should return new arrivals"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/products/new-arrivals?limit=8")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        print(f"Got {len(products)} new arrivals")
