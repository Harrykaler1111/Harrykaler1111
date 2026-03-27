"""
Iteration 18: Cart Drawer Popup Tests
Tests for the slide-in cart drawer functionality including:
- Cart CRUD operations (GET, ADD, UPDATE, DELETE)
- Upsell suggestions endpoint
- Coupon validation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "harpreetkaler750@gmail.com"
CUSTOMER_PASSWORD = "Harpreet@123"


class TestCartDrawerAPIs:
    """Test cart drawer related API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get token"""
        # Login as customer
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.user = data["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_cart(self):
        """Test GET /api/cart - retrieve cart contents"""
        response = requests.get(f"{BASE_URL}/api/cart", headers=self.headers)
        assert response.status_code == 200, f"Get cart failed: {response.text}"
        
        data = response.json()
        # Verify cart structure
        assert "cart_id" in data
        assert "user_id" in data
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        assert isinstance(data["total"], (int, float))
        print(f"Cart has {len(data['items'])} items, total: ₹{data['total']}")
    
    def test_add_to_cart(self):
        """Test POST /api/cart/add - add item to cart"""
        # First get a product to add
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        assert products_response.status_code == 200
        products = products_response.json()
        assert len(products) > 0, "No products available"
        
        product = products[0]
        product_id = product["product_id"]
        size = product.get("sizes", ["M"])[0]
        color = product.get("colors", ["Default"])[0]
        
        # Add to cart
        response = requests.post(f"{BASE_URL}/api/cart/add", 
            headers=self.headers,
            json={
                "product_id": product_id,
                "quantity": 1,
                "size": size,
                "color": color
            }
        )
        assert response.status_code == 200, f"Add to cart failed: {response.text}"
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        
        # Verify item was added
        item_found = any(
            item["product_id"] == product_id and 
            item["size"] == size and 
            item["color"] == color 
            for item in data["items"]
        )
        assert item_found, "Added item not found in cart"
        print(f"Added {product['name']} to cart, new total: ₹{data['total']}")
    
    def test_update_cart_quantity(self):
        """Test PUT /api/cart/update - update item quantity"""
        # Get current cart
        cart_response = requests.get(f"{BASE_URL}/api/cart", headers=self.headers)
        assert cart_response.status_code == 200
        cart = cart_response.json()
        
        if len(cart["items"]) == 0:
            pytest.skip("No items in cart to update")
        
        item = cart["items"][0]
        original_qty = item["quantity"]
        new_qty = original_qty + 1
        
        # Update quantity
        response = requests.put(f"{BASE_URL}/api/cart/update",
            headers=self.headers,
            json={
                "product_id": item["product_id"],
                "quantity": new_qty,
                "size": item["size"],
                "color": item["color"]
            }
        )
        assert response.status_code == 200, f"Update cart failed: {response.text}"
        
        data = response.json()
        # Verify quantity updated
        updated_item = next(
            (i for i in data["items"] 
             if i["product_id"] == item["product_id"] and 
                i["size"] == item["size"] and 
                i["color"] == item["color"]),
            None
        )
        assert updated_item is not None
        assert updated_item["quantity"] == new_qty, f"Quantity not updated: expected {new_qty}, got {updated_item['quantity']}"
        print(f"Updated quantity from {original_qty} to {new_qty}")
    
    def test_remove_from_cart(self):
        """Test DELETE /api/cart/item/{product_id} - remove item from cart"""
        # First add an item to remove
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        products = products_response.json()
        product = products[0]
        
        # Add item
        add_response = requests.post(f"{BASE_URL}/api/cart/add",
            headers=self.headers,
            json={
                "product_id": product["product_id"],
                "quantity": 1,
                "size": product.get("sizes", ["M"])[0],
                "color": product.get("colors", ["Default"])[0]
            }
        )
        assert add_response.status_code == 200
        
        # Get cart to find the item
        cart_response = requests.get(f"{BASE_URL}/api/cart", headers=self.headers)
        cart = cart_response.json()
        
        if len(cart["items"]) == 0:
            pytest.skip("No items in cart to remove")
        
        item = cart["items"][0]
        
        # Remove item
        response = requests.delete(
            f"{BASE_URL}/api/cart/item/{item['product_id']}?size={item['size']}&color={item['color']}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Remove from cart failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"Removed item: {data['message']}")
        
        # Verify item removed
        verify_response = requests.get(f"{BASE_URL}/api/cart", headers=self.headers)
        verify_cart = verify_response.json()
        item_still_exists = any(
            i["product_id"] == item["product_id"] and 
            i["size"] == item["size"] and 
            i["color"] == item["color"]
            for i in verify_cart["items"]
        )
        assert not item_still_exists, "Item still exists in cart after removal"
    
    def test_upsell_suggestions(self):
        """Test GET /api/cart/upsell-suggestions - get product recommendations"""
        response = requests.get(
            f"{BASE_URL}/api/cart/upsell-suggestions?max_price=5000",
            headers=self.headers
        )
        assert response.status_code == 200, f"Upsell suggestions failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            # Verify product structure
            product = data[0]
            assert "product_id" in product
            assert "name" in product
            assert "price" in product
            assert "images" in product
            print(f"Got {len(data)} upsell suggestions")
            
            # Verify products are under max_price or broader range
            for p in data:
                print(f"  - {p['name']}: ₹{p['price']}")
        else:
            print("No upsell suggestions returned (may be empty catalog)")
    
    def test_upsell_excludes_cart_items(self):
        """Test that upsell suggestions exclude items already in cart"""
        # Get cart
        cart_response = requests.get(f"{BASE_URL}/api/cart", headers=self.headers)
        cart = cart_response.json()
        cart_product_ids = [item["product_id"] for item in cart["items"]]
        
        # Get upsell suggestions
        response = requests.get(
            f"{BASE_URL}/api/cart/upsell-suggestions?max_price=5000",
            headers=self.headers
        )
        assert response.status_code == 200
        
        suggestions = response.json()
        suggestion_ids = [p["product_id"] for p in suggestions]
        
        # Verify no overlap
        overlap = set(cart_product_ids) & set(suggestion_ids)
        assert len(overlap) == 0, f"Upsell suggestions contain cart items: {overlap}"
        print(f"Verified: {len(suggestions)} suggestions, none overlap with {len(cart_product_ids)} cart items")
    
    def test_coupon_validation(self):
        """Test POST /api/coupons/validate - validate coupon code"""
        # Test with invalid coupon
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate?code=INVALIDCODE&subtotal=1000"
        )
        # Should return 404 or 400 for invalid coupon
        assert response.status_code in [400, 404], f"Expected error for invalid coupon, got {response.status_code}"
        print("Invalid coupon correctly rejected")
    
    def test_booster_config(self):
        """Test GET /api/booster/config - get cart booster slabs"""
        response = requests.get(f"{BASE_URL}/api/booster/config")
        assert response.status_code == 200, f"Booster config failed: {response.text}"
        
        data = response.json()
        assert "slabs" in data
        assert "messages" in data
        assert isinstance(data["slabs"], list)
        
        if len(data["slabs"]) > 0:
            slab = data["slabs"][0]
            assert "slab_id" in slab
            assert "min_cart_value" in slab
            assert "reward_type" in slab
            assert "reward_value" in slab
            print(f"Got {len(data['slabs'])} booster slabs")
            for s in data["slabs"]:
                print(f"  - ₹{s['min_cart_value']}: {s['reward_type']} {s['reward_value']}")
    
    def test_clear_cart(self):
        """Test DELETE /api/cart/clear - clear all cart items"""
        response = requests.delete(f"{BASE_URL}/api/cart/clear", headers=self.headers)
        assert response.status_code == 200, f"Clear cart failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"Clear cart: {data['message']}")
        
        # Verify cart is empty
        verify_response = requests.get(f"{BASE_URL}/api/cart", headers=self.headers)
        verify_cart = verify_response.json()
        assert len(verify_cart["items"]) == 0, "Cart not empty after clear"
        assert verify_cart["total"] == 0, "Cart total not zero after clear"


class TestCartDrawerEdgeCases:
    """Test edge cases for cart drawer"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_add_invalid_product(self):
        """Test adding non-existent product to cart"""
        response = requests.post(f"{BASE_URL}/api/cart/add",
            headers=self.headers,
            json={
                "product_id": "invalid_product_id_12345",
                "quantity": 1,
                "size": "M",
                "color": "Default"
            }
        )
        assert response.status_code == 404, f"Expected 404 for invalid product, got {response.status_code}"
        print("Invalid product correctly rejected with 404")
    
    def test_update_nonexistent_item(self):
        """Test updating item not in cart"""
        response = requests.put(f"{BASE_URL}/api/cart/update",
            headers=self.headers,
            json={
                "product_id": "nonexistent_product",
                "quantity": 5,
                "size": "XL",
                "color": "Purple"
            }
        )
        # Should succeed but not change anything (item not found)
        assert response.status_code == 200
        print("Update nonexistent item handled gracefully")
    
    def test_cart_without_auth(self):
        """Test cart endpoints without authentication"""
        response = requests.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Cart endpoint correctly requires authentication")
    
    def test_upsell_without_auth(self):
        """Test upsell suggestions without authentication"""
        response = requests.get(f"{BASE_URL}/api/cart/upsell-suggestions?max_price=5000")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Upsell endpoint correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
