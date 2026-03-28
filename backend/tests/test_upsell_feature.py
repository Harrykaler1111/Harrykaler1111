"""
Test Cart Booster Upsell Feature - Iteration 26
Tests admin upsell product management and customer upsell suggestions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
CUSTOMER_EMAIL = "upselltest@pigma.com"
CUSTOMER_PASSWORD = "test123"


class TestUpsellBackendAPIs:
    """Test upsell-related backend APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin auth failed: {response.status_code}")
        
    def get_customer_token(self):
        """Get customer authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Customer auth failed: {response.status_code}")
    
    # ============== ADMIN UPSELL PRODUCTS TESTS ==============
    
    def test_admin_get_upsell_products(self):
        """GET /api/cart/admin/upsell-products returns curated list (requires admin auth)"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/cart/admin/upsell-products",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Verify structure if products exist
        if len(data) > 0:
            product = data[0]
            assert "product_id" in product, "Product should have product_id"
            assert "name" in product, "Product should have name"
            assert "price" in product, "Product should have price"
            assert "upsell_id" in product, "Product should have upsell_id"
            print(f"Found {len(data)} upsell products configured")
    
    def test_admin_get_upsell_products_requires_auth(self):
        """GET /api/cart/admin/upsell-products requires admin authentication"""
        response = self.session.get(f"{BASE_URL}/api/cart/admin/upsell-products")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_admin_get_upsell_products_customer_forbidden(self):
        """GET /api/cart/admin/upsell-products forbidden for customers"""
        token = self.get_customer_token()
        response = self.session.get(
            f"{BASE_URL}/api/cart/admin/upsell-products",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 for customer, got {response.status_code}"
    
    def test_admin_add_upsell_product(self):
        """POST /api/cart/admin/upsell-products adds a product to upsell list"""
        token = self.get_admin_token()
        
        # First get a product that's not already in upsell list
        products_response = self.session.get(f"{BASE_URL}/api/products?limit=20")
        assert products_response.status_code == 200
        products = products_response.json()
        
        # Get current upsell products
        upsell_response = self.session.get(
            f"{BASE_URL}/api/cart/admin/upsell-products",
            headers={"Authorization": f"Bearer {token}"}
        )
        upsell_ids = [u["product_id"] for u in upsell_response.json()]
        
        # Find a product not in upsell list
        test_product = None
        for p in products:
            if p["product_id"] not in upsell_ids and p.get("stock", 0) > 0:
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No available products to add to upsell list")
        
        # Add to upsell
        response = self.session.post(
            f"{BASE_URL}/api/cart/admin/upsell-products",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_id": test_product["product_id"]}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "upsell_id" in data, "Response should contain upsell_id"
        assert "message" in data, "Response should contain message"
        print(f"Added product '{test_product['name']}' to upsell list")
        
        # Store for cleanup
        self.test_upsell_id = data["upsell_id"]
        
        # Cleanup - remove the product we just added
        self.session.delete(
            f"{BASE_URL}/api/cart/admin/upsell-products/{data['upsell_id']}",
            headers={"Authorization": f"Bearer {token}"}
        )
    
    def test_admin_add_duplicate_upsell_product_fails(self):
        """POST /api/cart/admin/upsell-products fails for duplicate product"""
        token = self.get_admin_token()
        
        # Get existing upsell products
        upsell_response = self.session.get(
            f"{BASE_URL}/api/cart/admin/upsell-products",
            headers={"Authorization": f"Bearer {token}"}
        )
        upsell_products = upsell_response.json()
        
        if len(upsell_products) == 0:
            pytest.skip("No existing upsell products to test duplicate")
        
        # Try to add existing product again
        existing_product_id = upsell_products[0]["product_id"]
        response = self.session.post(
            f"{BASE_URL}/api/cart/admin/upsell-products",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_id": existing_product_id}
        )
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        assert "already" in response.json().get("detail", "").lower()
    
    def test_admin_add_upsell_product_requires_auth(self):
        """POST /api/cart/admin/upsell-products requires admin authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/cart/admin/upsell-products",
            json={"product_id": "prod_test123"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_admin_add_invalid_product_fails(self):
        """POST /api/cart/admin/upsell-products fails for non-existent product"""
        token = self.get_admin_token()
        response = self.session.post(
            f"{BASE_URL}/api/cart/admin/upsell-products",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_id": "prod_nonexistent_12345"}
        )
        assert response.status_code == 404, f"Expected 404 for invalid product, got {response.status_code}"
    
    def test_admin_delete_upsell_product(self):
        """DELETE /api/cart/admin/upsell-products/{upsell_id} removes from list"""
        token = self.get_admin_token()
        
        # First add a product to delete
        products_response = self.session.get(f"{BASE_URL}/api/products?limit=20")
        products = products_response.json()
        
        upsell_response = self.session.get(
            f"{BASE_URL}/api/cart/admin/upsell-products",
            headers={"Authorization": f"Bearer {token}"}
        )
        upsell_ids = [u["product_id"] for u in upsell_response.json()]
        
        test_product = None
        for p in products:
            if p["product_id"] not in upsell_ids and p.get("stock", 0) > 0:
                test_product = p
                break
        
        if not test_product:
            pytest.skip("No available products to test delete")
        
        # Add product
        add_response = self.session.post(
            f"{BASE_URL}/api/cart/admin/upsell-products",
            headers={"Authorization": f"Bearer {token}"},
            json={"product_id": test_product["product_id"]}
        )
        assert add_response.status_code == 200
        upsell_id = add_response.json()["upsell_id"]
        
        # Delete product
        delete_response = self.session.delete(
            f"{BASE_URL}/api/cart/admin/upsell-products/{upsell_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        assert "message" in delete_response.json()
        
        # Verify deletion
        verify_response = self.session.get(
            f"{BASE_URL}/api/cart/admin/upsell-products",
            headers={"Authorization": f"Bearer {token}"}
        )
        verify_ids = [u["upsell_id"] for u in verify_response.json()]
        assert upsell_id not in verify_ids, "Deleted upsell should not be in list"
    
    def test_admin_delete_nonexistent_upsell_fails(self):
        """DELETE /api/cart/admin/upsell-products/{upsell_id} fails for non-existent"""
        token = self.get_admin_token()
        response = self.session.delete(
            f"{BASE_URL}/api/cart/admin/upsell-products/ups_nonexistent_12345",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # ============== CUSTOMER UPSELL SUGGESTIONS TESTS ==============
    
    def test_customer_get_upsell_suggestions(self):
        """GET /api/cart/upsell-suggestions returns products (requires customer auth)"""
        token = self.get_customer_token()
        response = self.session.get(
            f"{BASE_URL}/api/cart/upsell-suggestions?max_price=500",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Verify structure if products exist
        if len(data) > 0:
            product = data[0]
            assert "product_id" in product, "Product should have product_id"
            assert "name" in product, "Product should have name"
            assert "price" in product, "Product should have price"
            assert "stock" in product, "Product should have stock"
            print(f"Got {len(data)} upsell suggestions")
    
    def test_customer_upsell_suggestions_requires_auth(self):
        """GET /api/cart/upsell-suggestions requires customer authentication"""
        response = self.session.get(f"{BASE_URL}/api/cart/upsell-suggestions")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_customer_upsell_excludes_cart_items(self):
        """GET /api/cart/upsell-suggestions excludes items already in cart"""
        token = self.get_customer_token()
        
        # Get a product to add to cart
        products_response = self.session.get(f"{BASE_URL}/api/products?limit=5")
        products = products_response.json()
        if len(products) == 0:
            pytest.skip("No products available")
        
        test_product = products[0]
        
        # Add to cart
        add_response = self.session.post(
            f"{BASE_URL}/api/cart/add",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "product_id": test_product["product_id"],
                "quantity": 1,
                "size": test_product.get("sizes", ["M"])[0],
                "color": test_product.get("colors", ["Default"])[0]
            }
        )
        
        # Get upsell suggestions
        upsell_response = self.session.get(
            f"{BASE_URL}/api/cart/upsell-suggestions",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert upsell_response.status_code == 200
        upsell_products = upsell_response.json()
        
        # Verify cart item is not in suggestions
        upsell_product_ids = [p["product_id"] for p in upsell_products]
        assert test_product["product_id"] not in upsell_product_ids, \
            "Cart items should be excluded from upsell suggestions"
        
        # Cleanup - clear cart
        self.session.delete(
            f"{BASE_URL}/api/cart/clear",
            headers={"Authorization": f"Bearer {token}"}
        )
    
    def test_customer_upsell_prioritizes_admin_picks(self):
        """GET /api/cart/upsell-suggestions prioritizes admin-curated products"""
        token = self.get_customer_token()
        admin_token = self.get_admin_token()
        
        # Get admin upsell products
        admin_upsell_response = self.session.get(
            f"{BASE_URL}/api/cart/admin/upsell-products",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        admin_upsell_ids = [u["product_id"] for u in admin_upsell_response.json()]
        
        if len(admin_upsell_ids) == 0:
            pytest.skip("No admin upsell products configured")
        
        # Get customer suggestions
        customer_response = self.session.get(
            f"{BASE_URL}/api/cart/upsell-suggestions",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert customer_response.status_code == 200
        suggestions = customer_response.json()
        
        if len(suggestions) > 0:
            # First suggestions should be from admin picks
            first_suggestion_id = suggestions[0]["product_id"]
            assert first_suggestion_id in admin_upsell_ids, \
                "First suggestion should be from admin-curated list"
            print(f"Admin picks correctly prioritized in suggestions")
    
    # ============== BOOSTER SLABS TESTS (for BoosterBar context) ==============
    
    def test_booster_slabs_exist(self):
        """Verify booster slabs are configured (required for BoosterBar to show)"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/booster/admin/slabs",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        slabs = response.json()
        assert isinstance(slabs, list), "Response should be a list"
        
        enabled_slabs = [s for s in slabs if s.get("is_enabled", False)]
        print(f"Found {len(enabled_slabs)} enabled booster slabs")
        
        if len(enabled_slabs) == 0:
            print("WARNING: No enabled booster slabs - BoosterBar will not show!")
    
    def test_public_booster_config(self):
        """GET /api/booster/config returns public slab info"""
        response = self.session.get(f"{BASE_URL}/api/booster/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "slabs" in data, "Response should contain slabs"
        assert isinstance(data["slabs"], list), "Slabs should be a list"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
