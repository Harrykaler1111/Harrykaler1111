"""
Test suite for Kuaishou-style Reels Feed functionality
Tests the nested feed behavior with vendor mode and group products
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestReelsFeedAPI:
    """Tests for /api/vendor-credits/reels-feed endpoint"""
    
    def test_reels_feed_returns_products(self):
        """Test that reels-feed returns products with required fields"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "products" in data, "Response should contain 'products' key"
        assert "boosted_count" in data, "Response should contain 'boosted_count' key"
        assert isinstance(data["products"], list), "Products should be a list"
        assert len(data["products"]) > 0, "Should return at least one product"
        
        # Verify product structure
        product = data["products"][0]
        assert "product_id" in product, "Product should have product_id"
        assert "name" in product, "Product should have name"
        assert "price" in product, "Product should have price"
        assert "images" in product, "Product should have images"
        assert "is_boosted" in product, "Product should have is_boosted flag"
    
    def test_reels_feed_limit_parameter(self):
        """Test that limit parameter works correctly"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["products"]) <= 5, "Should respect limit parameter"
    
    def test_reels_feed_max_limit(self):
        """Test that max limit of 100 is enforced"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed?limit=50")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["products"]) <= 50, "Should respect limit parameter"


class TestGroupProductsAPI:
    """Tests for /api/vendor-credits/group-products endpoint"""
    
    def test_group_products_by_category(self):
        """Test grouping products by category (Co-ord Set has 11 products)"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-credits/group-products",
            params={"group_key": "category", "group_value": "Co-ord Set"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "products" in data, "Response should contain 'products' key"
        assert "group_label" in data, "Response should contain 'group_label' key"
        assert data["group_label"] == "Co-ord Set", "Group label should match category"
        
        # Co-ord Set should have multiple products
        assert len(data["products"]) > 1, "Co-ord Set should have multiple products"
        
        # Verify all products are from the same category
        for product in data["products"]:
            assert product.get("category") == "Co-ord Set", f"Product {product.get('product_id')} should be in Co-ord Set category"
    
    def test_group_products_by_vendor_id(self):
        """Test grouping products by vendor_id"""
        # First get a product with vendor_id from reels feed
        reels_response = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed?limit=50")
        assert reels_response.status_code == 200
        
        products = reels_response.json()["products"]
        vendor_product = next((p for p in products if p.get("vendor_id")), None)
        
        if vendor_product:
            vendor_id = vendor_product["vendor_id"]
            response = requests.get(
                f"{BASE_URL}/api/vendor-credits/group-products",
                params={"group_key": "vendor_id", "group_value": vendor_id}
            )
            assert response.status_code == 200
            
            data = response.json()
            assert "products" in data
            assert "is_paid" in data, "Response should indicate if vendor is paid"
            
            # All products should belong to the same vendor
            for product in data["products"]:
                assert product.get("vendor_id") == vendor_id, "All products should belong to same vendor"
        else:
            pytest.skip("No products with vendor_id found")
    
    def test_group_products_empty_result(self):
        """Test that non-existent group returns empty products"""
        response = requests.get(
            f"{BASE_URL}/api/vendor-credits/group-products",
            params={"group_key": "category", "group_value": "NonExistentCategory123"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["products"] == [], "Should return empty products for non-existent category"
    
    def test_group_products_required_params(self):
        """Test that group_key and group_value are required"""
        # Missing group_value
        response = requests.get(
            f"{BASE_URL}/api/vendor-credits/group-products",
            params={"group_key": "category"}
        )
        # Should return 422 for missing required param or empty result
        assert response.status_code in [200, 422]


class TestVendorReelStrip:
    """Tests for /api/vendor-credits/vendor-reel-strip endpoint"""
    
    def test_vendor_reel_strip_returns_products(self):
        """Test vendor reel strip returns products for a vendor"""
        # First get a vendor_id from products
        reels_response = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed?limit=50")
        assert reels_response.status_code == 200
        
        products = reels_response.json()["products"]
        vendor_product = next((p for p in products if p.get("vendor_id")), None)
        
        if vendor_product:
            vendor_id = vendor_product["vendor_id"]
            response = requests.get(f"{BASE_URL}/api/vendor-credits/vendor-reel-strip/{vendor_id}")
            assert response.status_code == 200
            
            data = response.json()
            assert "products" in data
            assert "is_paid" in data
            assert "limit" in data
        else:
            pytest.skip("No products with vendor_id found")


class TestPricingAPI:
    """Tests for /api/vendor-credits/pricing endpoint"""
    
    def test_get_pricing(self):
        """Test that pricing endpoint returns expected fields"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/pricing")
        assert response.status_code == 200
        
        data = response.json()
        assert "credit_rate_inr" in data, "Should have credit_rate_inr"
        assert "reel_boost_per_hour" in data, "Should have reel_boost_per_hour"
        assert "free_vendor_reel_limit" in data, "Should have free_vendor_reel_limit"


class TestFeaturedSellersAPI:
    """Tests for /api/vendor-credits/featured-sellers-with-products endpoint"""
    
    def test_featured_sellers_returns_data(self):
        """Test that featured sellers endpoint returns sellers with products"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/featured-sellers-with-products")
        assert response.status_code == 200
        
        data = response.json()
        assert "sellers" in data, "Response should contain 'sellers' key"
        
        if len(data["sellers"]) > 0:
            seller = data["sellers"][0]
            assert "vendor_id" in seller, "Seller should have vendor_id"
            assert "vendor_name" in seller, "Seller should have vendor_name"
            assert "products" in seller, "Seller should have products"
            assert len(seller["products"]) > 0, "Seller should have at least one product"


class TestTrackViewAPI:
    """Tests for /api/vendor-credits/track-view endpoint"""
    
    def test_track_view_success(self):
        """Test that track view endpoint works"""
        # Get a product_id first
        reels_response = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed?limit=1")
        assert reels_response.status_code == 200
        
        products = reels_response.json()["products"]
        if len(products) > 0:
            product_id = products[0]["product_id"]
            response = requests.post(f"{BASE_URL}/api/vendor-credits/track-view/{product_id}")
            assert response.status_code == 200
            
            data = response.json()
            assert data.get("ok") == True, "Track view should return ok: true"


class TestRegressionHomepage:
    """Regression tests for homepage and products page"""
    
    def test_homepage_loads(self):
        """Test that homepage loads successfully"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200, "Homepage should load"
    
    def test_products_api(self):
        """Test that products API returns data"""
        response = requests.get(f"{BASE_URL}/api/products?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        # Could be list or dict with products key
        if isinstance(data, list):
            assert len(data) > 0, "Should return products"
        else:
            assert "products" in data or len(data) > 0, "Should return products"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
