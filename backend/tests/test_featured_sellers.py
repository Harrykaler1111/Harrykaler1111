"""
Test Featured Sellers API endpoint
Tests the /api/vendor-credits/featured-sellers-with-products endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFeaturedSellersAPI:
    """Tests for Featured Sellers with Products endpoint"""
    
    def test_featured_sellers_default(self):
        """Test GET /api/vendor-credits/featured-sellers-with-products with default params"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/featured-sellers-with-products")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "sellers" in data
        assert isinstance(data["sellers"], list)
        
        # Verify we have sellers (based on test data)
        assert len(data["sellers"]) >= 1, "Expected at least 1 featured seller"
        
        # Verify seller structure
        for seller in data["sellers"]:
            assert "vendor_id" in seller
            assert "vendor_name" in seller
            assert "product_count" in seller
            assert "products" in seller
            assert isinstance(seller["products"], list)
            
            # Verify products have required fields
            for product in seller["products"]:
                assert "product_id" in product
                assert "name" in product
                assert "price" in product
                assert "images" in product
    
    def test_featured_sellers_with_products_limit(self):
        """Test products_per_vendor query parameter limits products correctly"""
        # Test with limit of 2
        response = requests.get(f"{BASE_URL}/api/vendor-credits/featured-sellers-with-products?products_per_vendor=2")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify each seller has at most 2 products
        for seller in data["sellers"]:
            assert len(seller["products"]) <= 2, f"Seller {seller['vendor_name']} has more than 2 products"
            assert seller["product_count"] <= 2
    
    def test_featured_sellers_with_products_limit_4(self):
        """Test products_per_vendor=4 (default used by frontend)"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/featured-sellers-with-products?products_per_vendor=4")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify each seller has at most 4 products
        for seller in data["sellers"]:
            assert len(seller["products"]) <= 4
    
    def test_featured_sellers_vendor_data(self):
        """Test that vendor data is correctly populated"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/featured-sellers-with-products")
        
        assert response.status_code == 200
        data = response.json()
        
        for seller in data["sellers"]:
            # vendor_id should be a non-empty string
            assert seller["vendor_id"]
            assert isinstance(seller["vendor_id"], str)
            
            # vendor_name should be a non-empty string
            assert seller["vendor_name"]
            assert isinstance(seller["vendor_name"], str)
            
            # product_count should match products length
            assert seller["product_count"] == len(seller["products"])
    
    def test_featured_sellers_product_images(self):
        """Test that products have valid image URLs"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/featured-sellers-with-products")
        
        assert response.status_code == 200
        data = response.json()
        
        for seller in data["sellers"]:
            for product in seller["products"]:
                # Products should have at least one image
                assert len(product.get("images", [])) > 0, f"Product {product['name']} has no images"
                
                # First image should be a valid URL
                first_image = product["images"][0]
                assert first_image.startswith("http") or first_image.startswith("/"), f"Invalid image URL: {first_image}"


class TestFeaturedVendorsAPI:
    """Tests for Featured Vendors endpoint (legacy)"""
    
    def test_featured_vendors_endpoint(self):
        """Test GET /api/vendor-credits/featured-vendors returns list"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/featured-vendors")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list (may be empty if no active featured vendors)
        assert isinstance(data, list)


class TestVendorCreditsPublicAPIs:
    """Tests for other public vendor credits endpoints"""
    
    def test_pricing_endpoint(self):
        """Test GET /api/vendor-credits/pricing returns pricing config"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/pricing")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required pricing fields
        assert "credit_rate_inr" in data
        assert "reel_boost_per_hour" in data
        assert "featured_vendor_week" in data
        assert "featured_vendor_month" in data
    
    def test_reels_feed_endpoint(self):
        """Test GET /api/vendor-credits/reels-feed returns products"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        assert "boosted_count" in data
        assert isinstance(data["products"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
