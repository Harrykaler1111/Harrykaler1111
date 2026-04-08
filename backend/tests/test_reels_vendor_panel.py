"""
Test suite for Reels Page and Vendor Side Panel features
- /api/vendor-credits/reels-feed endpoint
- /api/vendor-credits/group-products endpoint (for vendor side panel)
- /api/vendor-credits/pricing endpoint
- Track view endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestReelsFeedAPI:
    """Tests for /api/vendor-credits/reels-feed endpoint"""
    
    def test_reels_feed_returns_products(self):
        """Reels feed should return products with images"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "boosted_count" in data
        assert isinstance(data["products"], list)
        
        # Verify products have required fields
        if len(data["products"]) > 0:
            product = data["products"][0]
            assert "product_id" in product
            assert "name" in product
            assert "price" in product
            assert "images" in product
            assert "is_boosted" in product
            print(f"PASS: Reels feed returned {len(data['products'])} products")
    
    def test_reels_feed_limit_parameter(self):
        """Reels feed should respect limit parameter"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["products"]) <= 5
        print(f"PASS: Reels feed limit works, returned {len(data['products'])} products")
    
    def test_reels_feed_products_have_images(self):
        """All products in reels feed should have at least one image"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed?limit=20")
        assert response.status_code == 200
        
        data = response.json()
        for product in data["products"]:
            assert "images" in product
            assert len(product["images"]) > 0, f"Product {product['product_id']} has no images"
        print(f"PASS: All {len(data['products'])} products have images")


class TestGroupProductsAPI:
    """Tests for /api/vendor-credits/group-products endpoint (Vendor Side Panel)"""
    
    def test_group_products_by_category(self):
        """Group products by category should return products"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/group-products?group_key=category&group_value=Jackets")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "is_paid" in data
        assert "group_label" in data
        assert data["group_label"] == "Jackets"
        print(f"PASS: Group products by category returned {len(data['products'])} products")
    
    def test_group_products_by_vendor_id(self):
        """Group products by vendor_id should return products (may be empty if no vendor products)"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/group-products?group_key=vendor_id&group_value=test_vendor")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "is_paid" in data
        print(f"PASS: Group products by vendor_id returned {len(data['products'])} products")
    
    def test_group_products_empty_value(self):
        """Group products with empty value should return empty list"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/group-products?group_key=category&group_value=")
        assert response.status_code == 200
        
        data = response.json()
        assert data["products"] == []
        print("PASS: Group products with empty value returns empty list")
    
    def test_group_products_different_categories(self):
        """Test group products with different categories"""
        categories = ["Bags", "Pants", "Ankle Boots", "Co-ord Set"]
        
        for category in categories:
            response = requests.get(f"{BASE_URL}/api/vendor-credits/group-products?group_key=category&group_value={category}")
            assert response.status_code == 200
            data = response.json()
            assert "products" in data
            print(f"PASS: Category '{category}' returned {len(data['products'])} products")


class TestPricingAPI:
    """Tests for /api/vendor-credits/pricing endpoint"""
    
    def test_pricing_returns_all_fields(self):
        """Pricing endpoint should return all required fields"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/pricing")
        assert response.status_code == 200
        
        data = response.json()
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
        
        print(f"PASS: Pricing endpoint returned all {len(required_fields)} required fields")
    
    def test_pricing_values_are_numeric(self):
        """All pricing values should be numeric"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/pricing")
        assert response.status_code == 200
        
        data = response.json()
        for key, value in data.items():
            assert isinstance(value, (int, float)), f"Field {key} is not numeric: {value}"
        
        print("PASS: All pricing values are numeric")


class TestTrackViewAPI:
    """Tests for /api/vendor-credits/track-view endpoint"""
    
    def test_track_view_success(self):
        """Track view should return ok: true"""
        # First get a product ID from reels feed
        feed_response = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed?limit=1")
        assert feed_response.status_code == 200
        
        products = feed_response.json().get("products", [])
        if len(products) > 0:
            product_id = products[0]["product_id"]
            
            response = requests.post(f"{BASE_URL}/api/vendor-credits/track-view/{product_id}")
            assert response.status_code == 200
            
            data = response.json()
            assert data.get("ok") == True
            print(f"PASS: Track view for product {product_id} returned ok: true")
        else:
            pytest.skip("No products available for track view test")
    
    def test_track_view_nonexistent_product(self):
        """Track view for non-existent product should still return ok"""
        response = requests.post(f"{BASE_URL}/api/vendor-credits/track-view/nonexistent_product_123")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        print("PASS: Track view for non-existent product returns ok: true")


class TestFeaturedVendorsAPI:
    """Tests for /api/vendor-credits/featured-vendors endpoint"""
    
    def test_featured_vendors_returns_list(self):
        """Featured vendors should return a list (may be empty)"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/featured-vendors")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Featured vendors returned {len(data)} vendors")


class TestRegressionEndpoints:
    """Regression tests for existing endpoints"""
    
    def test_products_endpoint(self):
        """Products endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/products?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        # Could be list or dict with products key
        if isinstance(data, list):
            products = data
        else:
            products = data.get("products", data)
        
        assert len(products) > 0
        print(f"PASS: Products endpoint returned {len(products)} products")
    
    def test_booster_config_endpoint(self):
        """Booster config endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/booster/config")
        assert response.status_code == 200
        
        data = response.json()
        assert "slabs" in data or "messages" in data
        print("PASS: Booster config endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
