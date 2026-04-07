"""
Test Vendor Monetization System - Iteration 56
Tests: Pricing API, Admin pricing update, Reels feed, Vendor strip, View tracking, Featured vendors
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVendorMonetizationPublicAPIs:
    """Public endpoints - no auth required"""
    
    def test_get_pricing(self):
        """GET /api/vendor-credits/pricing - returns all pricing fields"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/pricing")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify all 9 pricing fields exist
        required_fields = [
            "credit_rate_inr",
            "reel_boost_per_hour",
            "reel_boost_per_day",
            "reel_boost_per_week",
            "reel_boost_per_month",
            "cart_placement_credits",
            "featured_vendor_week",
            "featured_vendor_month",
            "free_vendor_reel_limit"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], (int, float)), f"Field {field} should be numeric"
        print(f"✓ Pricing API returns all 9 fields: {data}")
    
    def test_reels_feed(self):
        """GET /api/vendor-credits/reels-feed - returns products with boosted_count and is_boosted"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "products" in data, "Response should have 'products' key"
        assert "boosted_count" in data, "Response should have 'boosted_count' key"
        assert isinstance(data["boosted_count"], int), "boosted_count should be integer"
        
        # Check products have is_boosted flag
        for product in data["products"]:
            assert "is_boosted" in product, f"Product {product.get('product_id')} missing is_boosted flag"
            assert isinstance(product["is_boosted"], bool), "is_boosted should be boolean"
        
        print(f"✓ Reels feed returns {len(data['products'])} products, {data['boosted_count']} boosted")
    
    def test_vendor_reel_strip(self):
        """GET /api/vendor-credits/vendor-reel-strip/{vendor_id} - returns vendor products"""
        # First get a vendor_id from products
        products_resp = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_resp.status_code == 200:
            products_data = products_resp.json()
            products = products_data.get("products", products_data) if isinstance(products_data, dict) else products_data
            if products and len(products) > 0:
                vendor_id = products[0].get("vendor_id", "test_vendor")
            else:
                vendor_id = "test_vendor"
        else:
            vendor_id = "test_vendor"
        
        response = requests.get(f"{BASE_URL}/api/vendor-credits/vendor-reel-strip/{vendor_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "products" in data, "Response should have 'products' key"
        assert "is_paid" in data, "Response should have 'is_paid' key"
        assert "limit" in data, "Response should have 'limit' key"
        assert isinstance(data["is_paid"], bool), "is_paid should be boolean"
        assert isinstance(data["limit"], int), "limit should be integer"
        
        print(f"✓ Vendor strip for {vendor_id}: {len(data['products'])} products, is_paid={data['is_paid']}, limit={data['limit']}")
    
    def test_track_view(self):
        """POST /api/vendor-credits/track-view/{product_id} - tracks product view"""
        # Get a product_id first
        products_resp = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_resp.status_code == 200:
            products_data = products_resp.json()
            products = products_data.get("products", products_data) if isinstance(products_data, dict) else products_data
            if products and len(products) > 0:
                product_id = products[0].get("product_id", "test_product")
            else:
                product_id = "test_product"
        else:
            product_id = "test_product"
        
        response = requests.post(f"{BASE_URL}/api/vendor-credits/track-view/{product_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok:true"
        print(f"✓ Track view for {product_id}: ok={data.get('ok')}")
    
    def test_featured_vendors(self):
        """GET /api/vendor-credits/featured-vendors - returns featured vendors (empty array OK)"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/featured-vendors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Featured vendors: {len(data)} vendors")


class TestAdminPricingAPI:
    """Admin endpoints - require admin auth"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token by logging in"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "superadmin@pigma.com",
            "password": "superadmin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_admin_update_pricing(self, admin_token):
        """PUT /api/vendor-credits/admin/pricing - admin can update pricing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current pricing first
        current = requests.get(f"{BASE_URL}/api/vendor-credits/pricing").json()
        
        # Update one field
        new_value = current.get("free_vendor_reel_limit", 3) + 1
        response = requests.put(
            f"{BASE_URL}/api/vendor-credits/admin/pricing",
            json={"free_vendor_reel_limit": new_value},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "pricing" in data, "Response should have 'pricing' key"
        assert data["pricing"]["free_vendor_reel_limit"] == new_value, "Pricing should be updated"
        
        # Revert back
        requests.put(
            f"{BASE_URL}/api/vendor-credits/admin/pricing",
            json={"free_vendor_reel_limit": current.get("free_vendor_reel_limit", 3)},
            headers=headers
        )
        print(f"✓ Admin pricing update works: free_vendor_reel_limit updated to {new_value}")
    
    def test_admin_update_pricing_no_auth(self):
        """PUT /api/vendor-credits/admin/pricing - should fail without auth"""
        response = requests.put(
            f"{BASE_URL}/api/vendor-credits/admin/pricing",
            json={"free_vendor_reel_limit": 5}
        )
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print(f"✓ Admin pricing update correctly requires auth: {response.status_code}")
    
    def test_admin_add_credits(self, admin_token):
        """POST /api/vendor-credits/admin/add-credits - admin can add credits to vendor"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/vendor-credits/admin/add-credits",
            json={
                "vendor_id": "TEST_vendor_monetization",
                "credits": 100,
                "reason": "Test credit addition"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "credits_added" in data, "Response should have 'credits_added'"
        assert data["credits_added"] == 100, "Should add 100 credits"
        assert "new_balance" in data, "Response should have 'new_balance'"
        print(f"✓ Admin add credits works: added {data['credits_added']}, balance={data['new_balance']}")
    
    def test_admin_all_boosts(self, admin_token):
        """GET /api/vendor-credits/admin/all-boosts - admin can view all boosts"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/vendor-credits/admin/all-boosts",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Admin all boosts: {len(data)} boosts")


class TestRegressionAPIs:
    """Regression tests for existing functionality"""
    
    def test_products_endpoint(self):
        """GET /api/products - should still work"""
        response = requests.get(f"{BASE_URL}/api/products?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Products endpoint works")
    
    def test_cart_endpoint(self):
        """GET /api/cart - should still work (may return empty or require auth)"""
        response = requests.get(f"{BASE_URL}/api/cart")
        # Cart may require auth, so 401 is acceptable
        assert response.status_code in [200, 401], f"Expected 200/401, got {response.status_code}"
        print(f"✓ Cart endpoint responds: {response.status_code}")
    
    def test_homepage_loads(self):
        """GET / - homepage should load"""
        response = requests.get(BASE_URL)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Homepage loads")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
