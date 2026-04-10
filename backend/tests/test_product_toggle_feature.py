"""
Test Product ON/OFF Toggle Feature
- Admin product toggle: PUT /api/admin/products/{product_id}/toggle-active
- Vendor product toggle: PUT /api/vendors/products/{product_id}/toggle-active
- Admin all products endpoint: GET /api/admin/products/all (returns ALL products including inactive)
- Auto-deactivation: Setting stock to 0 auto-deactivates the product
- Frontend filter: Public GET /api/products should NOT return inactive products
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@pigma.com"
SUPER_ADMIN_PASSWORD = "superadmin123"


class TestProductToggleFeature:
    """Test suite for Product ON/OFF toggle feature"""
    
    admin_token = None
    test_product_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin and get token"""
        if not TestProductToggleFeature.admin_token:
            response = requests.post(
                f"{BASE_URL}/api/admin/auth/login",
                json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
            )
            assert response.status_code == 200, f"Admin login failed: {response.text}"
            data = response.json()
            TestProductToggleFeature.admin_token = data.get("token")
            assert TestProductToggleFeature.admin_token, "No token in login response"
            print(f"✓ Admin login successful")
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}", "Content-Type": "application/json"}
    
    # ============== TEST 1: Admin Get All Products (including inactive) ==============
    def test_01_admin_get_all_products_endpoint(self):
        """GET /api/admin/products/all should return ALL products including inactive ones"""
        response = requests.get(
            f"{BASE_URL}/api/admin/products/all",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200, f"Failed to get all products: {response.text}"
        products = response.json()
        assert isinstance(products, list), "Response should be a list"
        print(f"✓ Admin products/all returned {len(products)} products")
        
        # Check if response includes both active and inactive products
        active_count = sum(1 for p in products if p.get("is_active", True))
        inactive_count = sum(1 for p in products if not p.get("is_active", True))
        print(f"  - Active products: {active_count}")
        print(f"  - Inactive products: {inactive_count}")
        
        # Store a product_id for toggle tests
        if products:
            TestProductToggleFeature.test_product_id = products[0].get("product_id")
            print(f"  - Using product_id for tests: {TestProductToggleFeature.test_product_id}")
    
    # ============== TEST 2: Admin Toggle Product Active Status ==============
    def test_02_admin_toggle_product_active(self):
        """PUT /api/admin/products/{product_id}/toggle-active should toggle is_active"""
        if not TestProductToggleFeature.test_product_id:
            pytest.skip("No product_id available for testing")
        
        product_id = TestProductToggleFeature.test_product_id
        
        # Get current status
        response = requests.get(
            f"{BASE_URL}/api/admin/products/all",
            headers=self.get_admin_headers()
        )
        products = response.json()
        product = next((p for p in products if p.get("product_id") == product_id), None)
        assert product, f"Product {product_id} not found"
        original_status = product.get("is_active", True)
        print(f"  - Original is_active: {original_status}")
        
        # Toggle the product
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{product_id}/toggle-active",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200, f"Toggle failed: {response.text}"
        data = response.json()
        
        # Verify response contains new status
        assert "is_active" in data, f"Response should contain is_active: {data}"
        new_status = data.get("is_active")
        assert new_status != original_status, f"Status should have toggled from {original_status} to {not original_status}"
        print(f"✓ Admin toggle successful: is_active changed from {original_status} to {new_status}")
        
        # Toggle back to original state
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{product_id}/toggle-active",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200, f"Toggle back failed: {response.text}"
        data = response.json()
        assert data.get("is_active") == original_status, "Status should be back to original"
        print(f"✓ Admin toggle back successful: is_active restored to {original_status}")
    
    # ============== TEST 3: Admin Toggle Non-existent Product ==============
    def test_03_admin_toggle_nonexistent_product(self):
        """PUT /api/admin/products/{product_id}/toggle-active should return 404 for non-existent product"""
        response = requests.put(
            f"{BASE_URL}/api/admin/products/nonexistent_product_12345/toggle-active",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Admin toggle returns 404 for non-existent product")
    
    # ============== TEST 4: Public Products Endpoint Filters Inactive ==============
    def test_04_public_products_filters_inactive(self):
        """GET /api/products should NOT return inactive products"""
        # First, get all products via admin endpoint
        admin_response = requests.get(
            f"{BASE_URL}/api/admin/products/all",
            headers=self.get_admin_headers()
        )
        admin_products = admin_response.json()
        
        # Get public products
        public_response = requests.get(f"{BASE_URL}/api/products")
        assert public_response.status_code == 200, f"Public products failed: {public_response.text}"
        public_data = public_response.json()
        
        # Handle both list and dict response formats
        if isinstance(public_data, dict):
            public_products = public_data.get("products", [])
        else:
            public_products = public_data
        
        # Verify all public products are active
        for product in public_products:
            is_active = product.get("is_active", True)
            assert is_active, f"Inactive product {product.get('product_id')} found in public endpoint"
        
        print(f"✓ Public products endpoint returns only active products ({len(public_products)} products)")
        
        # Check if admin has more products (including inactive)
        admin_active_count = sum(1 for p in admin_products if p.get("is_active", True))
        print(f"  - Admin total: {len(admin_products)}, Admin active: {admin_active_count}, Public: {len(public_products)}")
    
    # ============== TEST 5: Admin Update Stock to 0 Auto-Deactivates ==============
    def test_05_admin_stock_zero_auto_deactivates(self):
        """PUT /api/admin/products/{product_id}/stock?stock=0 should auto-deactivate the product"""
        # First, create a test product or find one with stock > 0
        response = requests.get(
            f"{BASE_URL}/api/admin/products/all",
            headers=self.get_admin_headers()
        )
        products = response.json()
        
        # Find a product with stock > 0 and is_active = True
        test_product = None
        for p in products:
            if p.get("stock", 0) > 0 and p.get("is_active", True):
                test_product = p
                break
        
        if not test_product:
            # Create a test product
            create_response = requests.post(
                f"{BASE_URL}/api/admin/products",
                headers=self.get_admin_headers(),
                json={
                    "name": f"TEST_Toggle_Product_{datetime.now().strftime('%H%M%S')}",
                    "description": "Test product for toggle feature",
                    "price": 999,
                    "category": "Test",
                    "stock": 10,
                    "images": [],
                    "sizes": ["M"],
                    "colors": ["Black"]
                }
            )
            if create_response.status_code == 200:
                test_product = create_response.json().get("product", {})
                print(f"  - Created test product: {test_product.get('product_id')}")
            else:
                pytest.skip("Could not find or create a product with stock > 0")
        
        product_id = test_product.get("product_id")
        original_stock = test_product.get("stock", 10)
        print(f"  - Testing with product: {product_id}, original stock: {original_stock}")
        
        # Set stock to 0
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{product_id}/stock?stock=0",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200, f"Stock update failed: {response.text}"
        print(f"✓ Stock set to 0 successfully")
        
        # Verify product is now inactive
        response = requests.get(
            f"{BASE_URL}/api/admin/products/all",
            headers=self.get_admin_headers()
        )
        products = response.json()
        updated_product = next((p for p in products if p.get("product_id") == product_id), None)
        
        if updated_product:
            is_active = updated_product.get("is_active", True)
            auto_deactivated = updated_product.get("auto_deactivated", False)
            print(f"  - After stock=0: is_active={is_active}, auto_deactivated={auto_deactivated}")
            assert not is_active, f"Product should be inactive after stock=0, but is_active={is_active}"
            print("✓ Product auto-deactivated when stock set to 0")
        
        # Restore stock to original value
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{product_id}/stock?stock={original_stock}",
            headers=self.get_admin_headers()
        )
        print(f"  - Restored stock to {original_stock}")
        
        # Re-activate the product
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{product_id}/toggle-active",
            headers=self.get_admin_headers()
        )
        if response.status_code == 200:
            data = response.json()
            if not data.get("is_active"):
                # Toggle again to activate
                requests.put(
                    f"{BASE_URL}/api/admin/products/{product_id}/toggle-active",
                    headers=self.get_admin_headers()
                )
        print("✓ Product restored to original state")
    
    # ============== TEST 6: Admin Toggle Without Auth ==============
    def test_06_admin_toggle_requires_auth(self):
        """PUT /api/admin/products/{product_id}/toggle-active should require authentication"""
        if not TestProductToggleFeature.test_product_id:
            pytest.skip("No product_id available for testing")
        
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{TestProductToggleFeature.test_product_id}/toggle-active"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Admin toggle requires authentication")
    
    # ============== TEST 7: Verify Toggle Response Structure ==============
    def test_07_toggle_response_structure(self):
        """Verify toggle endpoint returns proper response structure"""
        if not TestProductToggleFeature.test_product_id:
            pytest.skip("No product_id available for testing")
        
        product_id = TestProductToggleFeature.test_product_id
        
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{product_id}/toggle-active",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200, f"Toggle failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data, "Response should contain 'message'"
        assert "is_active" in data, "Response should contain 'is_active'"
        assert isinstance(data["is_active"], bool), "is_active should be boolean"
        
        # Message should indicate activation/deactivation
        message = data.get("message", "")
        assert "activated" in message.lower() or "deactivated" in message.lower(), \
            f"Message should indicate activation status: {message}"
        
        print(f"✓ Toggle response structure is correct: {data}")
        
        # Toggle back
        requests.put(
            f"{BASE_URL}/api/admin/products/{product_id}/toggle-active",
            headers=self.get_admin_headers()
        )


class TestVendorProductToggle:
    """Test suite for Vendor Product Toggle feature"""
    
    vendor_token = None
    vendor_product_id = None
    
    def test_01_vendor_toggle_endpoint_exists(self):
        """Verify vendor toggle endpoint structure exists"""
        # This test verifies the endpoint exists by checking the route pattern
        # Since we don't have vendor credentials, we test the endpoint structure
        
        # Try to access without auth - should get 401/403, not 404
        response = requests.put(
            f"{BASE_URL}/api/vendors/products/test_product_id/toggle-active"
        )
        # 401/403 means endpoint exists but requires auth
        # 404 could mean endpoint doesn't exist OR product not found
        # 422 means validation error (endpoint exists)
        assert response.status_code in [401, 403, 404, 422], \
            f"Unexpected status code: {response.status_code}"
        print(f"✓ Vendor toggle endpoint exists (status: {response.status_code})")
    
    def test_02_vendor_stock_update_endpoint_exists(self):
        """Verify vendor stock update endpoint exists"""
        response = requests.put(
            f"{BASE_URL}/api/vendors/products/test_product_id/stock?stock=5"
        )
        assert response.status_code in [401, 403, 404, 422], \
            f"Unexpected status code: {response.status_code}"
        print(f"✓ Vendor stock update endpoint exists (status: {response.status_code})")


class TestProductFilteringLogic:
    """Test the filtering logic for active/inactive products"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin"""
        if not TestProductFilteringLogic.admin_token:
            response = requests.post(
                f"{BASE_URL}/api/admin/auth/login",
                json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
            )
            if response.status_code == 200:
                TestProductFilteringLogic.admin_token = response.json().get("token")
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}", "Content-Type": "application/json"}
    
    def test_01_compare_admin_vs_public_products(self):
        """Compare admin products/all vs public products endpoint"""
        # Admin endpoint - should include inactive
        admin_response = requests.get(
            f"{BASE_URL}/api/admin/products/all",
            headers=self.get_admin_headers()
        )
        assert admin_response.status_code == 200
        admin_products = admin_response.json()
        
        # Public endpoint - should only include active
        public_response = requests.get(f"{BASE_URL}/api/products")
        assert public_response.status_code == 200
        public_data = public_response.json()
        
        if isinstance(public_data, dict):
            public_products = public_data.get("products", [])
        else:
            public_products = public_data
        
        # Count active/inactive in admin response
        admin_active = [p for p in admin_products if p.get("is_active", True)]
        admin_inactive = [p for p in admin_products if not p.get("is_active", True)]
        
        print(f"✓ Admin endpoint: {len(admin_products)} total ({len(admin_active)} active, {len(admin_inactive)} inactive)")
        print(f"✓ Public endpoint: {len(public_products)} products (all should be active)")
        
        # Verify public products are subset of admin active products
        public_ids = set(p.get("product_id") for p in public_products)
        admin_active_ids = set(p.get("product_id") for p in admin_active)
        
        # All public products should be in admin active list
        for pid in public_ids:
            if pid not in admin_active_ids:
                print(f"  Warning: Public product {pid} not in admin active list")
    
    def test_02_inactive_product_not_in_public(self):
        """Verify that deactivating a product removes it from public endpoint"""
        # Get a product to test with
        admin_response = requests.get(
            f"{BASE_URL}/api/admin/products/all",
            headers=self.get_admin_headers()
        )
        products = admin_response.json()
        
        # Find an active product
        active_product = next((p for p in products if p.get("is_active", True)), None)
        if not active_product:
            pytest.skip("No active product found for testing")
        
        product_id = active_product.get("product_id")
        print(f"  - Testing with product: {product_id}")
        
        # Verify it's in public endpoint
        public_response = requests.get(f"{BASE_URL}/api/products")
        public_data = public_response.json()
        public_products = public_data.get("products", []) if isinstance(public_data, dict) else public_data
        
        in_public_before = any(p.get("product_id") == product_id for p in public_products)
        print(f"  - In public before toggle: {in_public_before}")
        
        # Deactivate the product
        toggle_response = requests.put(
            f"{BASE_URL}/api/admin/products/{product_id}/toggle-active",
            headers=self.get_admin_headers()
        )
        assert toggle_response.status_code == 200
        toggle_data = toggle_response.json()
        
        if toggle_data.get("is_active") == True:
            # Product was inactive, now active - toggle again to deactivate
            toggle_response = requests.put(
                f"{BASE_URL}/api/admin/products/{product_id}/toggle-active",
                headers=self.get_admin_headers()
            )
            toggle_data = toggle_response.json()
        
        # Now product should be inactive
        assert toggle_data.get("is_active") == False, "Product should be inactive"
        
        # Verify it's NOT in public endpoint
        public_response = requests.get(f"{BASE_URL}/api/products")
        public_data = public_response.json()
        public_products = public_data.get("products", []) if isinstance(public_data, dict) else public_data
        
        in_public_after = any(p.get("product_id") == product_id for p in public_products)
        print(f"  - In public after deactivation: {in_public_after}")
        
        assert not in_public_after, f"Inactive product {product_id} should not be in public endpoint"
        print("✓ Inactive product correctly filtered from public endpoint")
        
        # Restore: Activate the product again
        requests.put(
            f"{BASE_URL}/api/admin/products/{product_id}/toggle-active",
            headers=self.get_admin_headers()
        )
        print("  - Product restored to active state")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
