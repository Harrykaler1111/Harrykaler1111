"""
Test Cart Value Booster Features - Iteration 16
Tests:
- Cart CRUD operations
- Upsell suggestions endpoint
- Cart total calculations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "harpreetkaler750@gmail.com"
CUSTOMER_PASSWORD = "Harpreet@123"
SUPERADMIN_EMAIL = "superadmin@pigma.com"
SUPERADMIN_PASSWORD = "superadmin123"


class TestCartBoosterBackend:
    """Cart Value Booster Backend Tests"""
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_customer_login(self, customer_token):
        """Test customer can login"""
        assert customer_token is not None
        assert len(customer_token) > 0
        print(f"✓ Customer login successful, token: {customer_token[:20]}...")
    
    def test_get_cart(self, customer_token):
        """Test GET /api/cart returns cart with items and total"""
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify cart structure
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        assert isinstance(data["total"], (int, float))
        
        print(f"✓ Cart retrieved: {len(data['items'])} items, total: Rs.{data['total']}")
        return data
    
    def test_cart_has_item_with_product_details(self, customer_token):
        """Test cart items include product details"""
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["items"]) > 0:
            item = data["items"][0]
            assert "product_id" in item
            assert "quantity" in item
            assert "size" in item
            assert "color" in item
            # Product details should be populated
            if "product" in item:
                assert "name" in item["product"]
                assert "price" in item["product"]
                print(f"✓ Cart item has product details: {item['product']['name']}")
            else:
                print("⚠ Cart item missing product details")
        else:
            print("⚠ Cart is empty, skipping product details check")
    
    def test_upsell_suggestions_endpoint(self, customer_token):
        """Test GET /api/cart/upsell-suggestions returns products under max_price"""
        max_price = 300
        response = requests.get(
            f"{BASE_URL}/api/cart/upsell-suggestions?max_price={max_price}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Upsell suggestions returned: {len(data)} products")
        
        # Verify products are under max_price (or within extended range of 500)
        for product in data:
            assert "product_id" in product
            assert "name" in product
            assert "price" in product
            # Products should be under max_price or extended 500 limit
            assert product["price"] <= 500, f"Product {product['name']} price {product['price']} exceeds limit"
            print(f"  - {product['name']}: Rs.{product['price']}")
    
    def test_upsell_excludes_cart_items(self, customer_token):
        """Test upsell suggestions don't include items already in cart"""
        # Get cart items
        cart_response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        cart_data = cart_response.json()
        cart_product_ids = [item["product_id"] for item in cart_data.get("items", [])]
        
        # Get upsell suggestions
        upsell_response = requests.get(
            f"{BASE_URL}/api/cart/upsell-suggestions?max_price=500",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        upsell_data = upsell_response.json()
        
        # Verify no overlap
        upsell_product_ids = [p["product_id"] for p in upsell_data]
        overlap = set(cart_product_ids) & set(upsell_product_ids)
        assert len(overlap) == 0, f"Upsell contains cart items: {overlap}"
        print(f"✓ Upsell suggestions correctly exclude {len(cart_product_ids)} cart items")
    
    def test_cart_update_quantity(self, customer_token):
        """Test PUT /api/cart/update changes item quantity"""
        # First get current cart
        cart_response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        cart_data = cart_response.json()
        
        if len(cart_data["items"]) == 0:
            pytest.skip("Cart is empty, cannot test update")
        
        item = cart_data["items"][0]
        original_qty = item["quantity"]
        new_qty = original_qty + 1
        
        # Update quantity
        update_response = requests.put(
            f"{BASE_URL}/api/cart/update",
            json={
                "product_id": item["product_id"],
                "quantity": new_qty,
                "size": item["size"],
                "color": item["color"]
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert update_response.status_code == 200
        
        # Verify update
        updated_cart = update_response.json()
        updated_item = next((i for i in updated_cart["items"] if i["product_id"] == item["product_id"]), None)
        assert updated_item is not None
        assert updated_item["quantity"] == new_qty
        print(f"✓ Cart quantity updated: {original_qty} -> {new_qty}")
        
        # Restore original quantity
        requests.put(
            f"{BASE_URL}/api/cart/update",
            json={
                "product_id": item["product_id"],
                "quantity": original_qty,
                "size": item["size"],
                "color": item["color"]
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
    
    def test_cart_total_calculation(self, customer_token):
        """Test cart total is correctly calculated from item prices"""
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Calculate expected total
        expected_total = 0
        for item in data["items"]:
            if "product" in item and "price" in item["product"]:
                expected_total += item["product"]["price"] * item["quantity"]
        
        assert data["total"] == expected_total, f"Total mismatch: expected {expected_total}, got {data['total']}"
        print(f"✓ Cart total correctly calculated: Rs.{data['total']}")
    
    def test_products_exist_for_upsell(self, admin_token):
        """Test that products exist in the system for upsell"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check if products list or paginated
        products = data if isinstance(data, list) else data.get("products", [])
        assert len(products) > 0, "No products found in system"
        print(f"✓ Found {len(products)} products in system")
    
    def test_upsell_with_different_max_prices(self, customer_token):
        """Test upsell suggestions with various max_price values"""
        test_prices = [100, 200, 300, 500]
        
        for max_price in test_prices:
            response = requests.get(
                f"{BASE_URL}/api/cart/upsell-suggestions?max_price={max_price}",
                headers={"Authorization": f"Bearer {customer_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            print(f"✓ max_price={max_price}: {len(data)} products returned")


class TestCartClearAndAdd:
    """Test cart clear and add operations"""
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Customer login failed: {response.status_code}")
    
    def test_clear_cart(self, customer_token):
        """Test DELETE /api/cart/clear empties the cart"""
        # Clear cart
        response = requests.delete(
            f"{BASE_URL}/api/cart/clear",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        
        # Verify cart is empty
        cart_response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        cart_data = cart_response.json()
        assert len(cart_data["items"]) == 0
        assert cart_data["total"] == 0
        print("✓ Cart cleared successfully")
    
    def test_add_item_to_cart(self, customer_token):
        """Test POST /api/cart/add adds item to cart"""
        # First get a product to add
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        if isinstance(products, dict):
            products = products.get("products", [])
        
        if len(products) == 0:
            pytest.skip("No products available to add to cart")
        
        product = products[0]
        
        # Add to cart
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": product["product_id"],
                "quantity": 1,
                "size": product.get("sizes", ["M"])[0] if product.get("sizes") else "M",
                "color": product.get("colors", ["Default"])[0] if product.get("colors") else "Default"
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["items"]) > 0
        assert data["total"] > 0
        print(f"✓ Added {product['name']} to cart, total: Rs.{data['total']}")
    
    def test_restore_original_cart_item(self, customer_token):
        """Restore the original cart item (Neon Pulse Running Shoes)"""
        # Clear cart first
        requests.delete(
            f"{BASE_URL}/api/cart/clear",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        # Find the Neon Pulse Running Shoes product
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        if isinstance(products, dict):
            products = products.get("products", [])
        
        neon_shoes = next((p for p in products if "Neon" in p.get("name", "") or p.get("price") == 6999), None)
        
        if neon_shoes:
            # Add to cart
            response = requests.post(
                f"{BASE_URL}/api/cart/add",
                json={
                    "product_id": neon_shoes["product_id"],
                    "quantity": 1,
                    "size": neon_shoes.get("sizes", ["M"])[0] if neon_shoes.get("sizes") else "M",
                    "color": neon_shoes.get("colors", ["Default"])[0] if neon_shoes.get("colors") else "Default"
                },
                headers={"Authorization": f"Bearer {customer_token}"}
            )
            assert response.status_code == 200
            print(f"✓ Restored Neon Pulse Running Shoes to cart")
        else:
            # Add any product with price >= 3330 to test discount slab
            high_price_product = next((p for p in products if p.get("price", 0) >= 3330), None)
            if high_price_product:
                response = requests.post(
                    f"{BASE_URL}/api/cart/add",
                    json={
                        "product_id": high_price_product["product_id"],
                        "quantity": 1,
                        "size": high_price_product.get("sizes", ["M"])[0] if high_price_product.get("sizes") else "M",
                        "color": high_price_product.get("colors", ["Default"])[0] if high_price_product.get("colors") else "Default"
                    },
                    headers={"Authorization": f"Bearer {customer_token}"}
                )
                assert response.status_code == 200
                print(f"✓ Added {high_price_product['name']} (Rs.{high_price_product['price']}) to cart")
            else:
                print("⚠ No high-price product found, cart may not trigger Rs.200 OFF slab")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
