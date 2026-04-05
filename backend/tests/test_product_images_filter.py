"""
Test: Product Image Filtering
Verifies that all customer-facing product endpoints filter out products with empty images.
Products with empty images array should NOT appear in API responses.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProductImageFiltering:
    """Test that products with empty images are filtered from all customer-facing endpoints"""
    
    def test_get_products_filters_empty_images(self):
        """GET /api/products should only return products with at least one image"""
        response = requests.get(f"{BASE_URL}/api/products", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        products = response.json()
        assert isinstance(products, list), "Response should be a list"
        
        # Verify all returned products have images
        for product in products:
            images = product.get("images", [])
            assert len(images) > 0, f"Product {product.get('name', 'unknown')} has no images but was returned"
            # Also verify images are not just empty strings
            valid_images = [img for img in images if img and img.strip()]
            assert len(valid_images) > 0, f"Product {product.get('name', 'unknown')} has only empty image strings"
        
        print(f"PASS: GET /api/products returned {len(products)} products, all with images")
    
    def test_get_featured_products_filters_empty_images(self):
        """GET /api/products/featured should only return products with images"""
        response = requests.get(f"{BASE_URL}/api/products/featured", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        products = response.json()
        assert isinstance(products, list), "Response should be a list"
        
        for product in products:
            images = product.get("images", [])
            assert len(images) > 0, f"Featured product {product.get('name', 'unknown')} has no images"
        
        print(f"PASS: GET /api/products/featured returned {len(products)} products, all with images")
    
    def test_get_new_arrivals_filters_empty_images(self):
        """GET /api/products/new-arrivals should only return products with images"""
        response = requests.get(f"{BASE_URL}/api/products/new-arrivals", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        products = response.json()
        assert isinstance(products, list), "Response should be a list"
        
        for product in products:
            images = product.get("images", [])
            assert len(images) > 0, f"New arrival {product.get('name', 'unknown')} has no images"
        
        print(f"PASS: GET /api/products/new-arrivals returned {len(products)} products, all with images")
    
    def test_get_best_sellers_filters_empty_images(self):
        """GET /api/products/best-sellers should only return products with images"""
        response = requests.get(f"{BASE_URL}/api/products/best-sellers", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        products = response.json()
        assert isinstance(products, list), "Response should be a list"
        
        for product in products:
            images = product.get("images", [])
            assert len(images) > 0, f"Best seller {product.get('name', 'unknown')} has no images"
        
        print(f"PASS: GET /api/products/best-sellers returned {len(products)} products, all with images")
    
    def test_upsell_suggestions_filters_empty_images(self):
        """GET /api/cart/upsell-suggestions should only return products with images"""
        response = requests.get(f"{BASE_URL}/api/cart/upsell-suggestions", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        products = response.json()
        assert isinstance(products, list), "Response should be a list"
        
        for product in products:
            images = product.get("images", [])
            assert len(images) > 0, f"Upsell product {product.get('name', 'unknown')} has no images"
        
        print(f"PASS: GET /api/cart/upsell-suggestions returned {len(products)} products, all with images")
    
    def test_no_example_com_urls_in_products(self):
        """Verify no products have example.com URLs in their images"""
        response = requests.get(f"{BASE_URL}/api/products?limit=50", timeout=10)
        assert response.status_code == 200
        
        products = response.json()
        for product in products:
            images = product.get("images", [])
            for img_url in images:
                assert "example.com" not in img_url.lower(), \
                    f"Product {product.get('name')} has invalid example.com URL: {img_url}"
        
        print(f"PASS: No example.com URLs found in {len(products)} products")
    
    def test_products_have_valid_image_urls(self):
        """Verify returned products have valid-looking image URLs"""
        response = requests.get(f"{BASE_URL}/api/products?limit=20", timeout=10)
        assert response.status_code == 200
        
        products = response.json()
        for product in products:
            images = product.get("images", [])
            for img_url in images:
                # Should be a valid URL (starts with http or /api)
                is_valid = (
                    img_url.startswith("http://") or 
                    img_url.startswith("https://") or 
                    img_url.startswith("/api/")
                )
                assert is_valid, f"Invalid image URL format: {img_url}"
        
        print(f"PASS: All image URLs in {len(products)} products have valid format")


class TestKnownBadProductsFiltered:
    """Test that specific known bad products are filtered out"""
    
    def test_valid_product_not_in_listing(self):
        """'Valid Product' with empty images should not appear in listings"""
        response = requests.get(f"{BASE_URL}/api/products?search=Valid%20Product", timeout=10)
        assert response.status_code == 200
        
        products = response.json()
        for product in products:
            if product.get("name") == "Valid Product":
                images = product.get("images", [])
                assert len(images) > 0, "Product 'Valid Product' with empty images should be filtered"
        
        print("PASS: 'Valid Product' with empty images is filtered from search results")
    
    def test_test_products_not_in_listing(self):
        """Test products with empty images should not appear"""
        test_names = ["Double Publish Test", "Publish Test Product", "Test Heel", "Test Boot", "Test Gold Stilettos"]
        
        response = requests.get(f"{BASE_URL}/api/products?limit=100", timeout=10)
        assert response.status_code == 200
        
        products = response.json()
        product_names = [p.get("name") for p in products]
        
        for test_name in test_names:
            if test_name in product_names:
                # If found, verify it has images
                for p in products:
                    if p.get("name") == test_name:
                        assert len(p.get("images", [])) > 0, \
                            f"Test product '{test_name}' with empty images should be filtered"
        
        print(f"PASS: Test products with empty images are filtered from listings")


class TestFrequentlyBoughtTogether:
    """Test frequently bought together endpoint filters empty images"""
    
    def test_fbt_filters_empty_images(self):
        """GET /api/products/frequently-bought-together/{id} should filter empty images"""
        # First get a valid product ID
        response = requests.get(f"{BASE_URL}/api/products?limit=1", timeout=10)
        assert response.status_code == 200
        
        products = response.json()
        if not products:
            pytest.skip("No products available to test FBT")
        
        product_id = products[0].get("product_id")
        
        # Get FBT products
        fbt_response = requests.get(
            f"{BASE_URL}/api/products/frequently-bought-together/{product_id}", 
            timeout=10
        )
        assert fbt_response.status_code == 200
        
        fbt_products = fbt_response.json()
        for product in fbt_products:
            images = product.get("images", [])
            assert len(images) > 0, f"FBT product {product.get('name', 'unknown')} has no images"
        
        print(f"PASS: FBT endpoint returned {len(fbt_products)} products, all with images")


class TestPromotedProducts:
    """Test promoted products endpoint filters empty images"""
    
    def test_promoted_top_20_filters_empty_images(self):
        """GET /api/products/promoted/top_20 should filter empty images"""
        response = requests.get(f"{BASE_URL}/api/products/promoted/top_20", timeout=10)
        assert response.status_code == 200
        
        products = response.json()
        for product in products:
            images = product.get("images", [])
            assert len(images) > 0, f"Promoted product {product.get('name', 'unknown')} has no images"
        
        print(f"PASS: Promoted top_20 returned {len(products)} products, all with images")
    
    def test_promoted_top_100_filters_empty_images(self):
        """GET /api/products/promoted/top_100 should filter empty images"""
        response = requests.get(f"{BASE_URL}/api/products/promoted/top_100", timeout=10)
        assert response.status_code == 200
        
        products = response.json()
        for product in products:
            images = product.get("images", [])
            assert len(images) > 0, f"Promoted product {product.get('name', 'unknown')} has no images"
        
        print(f"PASS: Promoted top_100 returned {len(products)} products, all with images")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
