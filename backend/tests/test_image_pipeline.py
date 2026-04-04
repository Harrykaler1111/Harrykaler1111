"""
Test Image Upload and Rendering Pipeline
Tests: serve_file endpoint, image URL normalization, fallback behavior
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestImageServingEndpoint:
    """Tests for GET /api/uploads/files/{path} endpoint"""
    
    def test_serve_existing_image_from_storage(self):
        """Test that serve_file returns 200 for existing image in Object Storage"""
        # This is the pigma 1 product image path
        image_path = "pigma/images/admin/c65b7d06-6fea-48fa-8f44-97cae93adae9.jpg"
        response = requests.get(f"{BASE_URL}/api/uploads/files/{image_path}", timeout=30)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get('Content-Type', '').startswith('image/'), "Expected image content type"
        assert len(response.content) > 0, "Expected non-empty image content"
        print(f"✓ Image served successfully: {len(response.content)} bytes")
    
    def test_serve_nonexistent_image_returns_404(self):
        """Test that serve_file returns 404 for non-existent image"""
        response = requests.get(f"{BASE_URL}/api/uploads/files/pigma/images/nonexistent/fake-image.jpg", timeout=30)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent image correctly returns 404")
    
    def test_serve_file_has_cache_headers(self):
        """Test that served files have proper cache headers"""
        image_path = "pigma/images/admin/c65b7d06-6fea-48fa-8f44-97cae93adae9.jpg"
        response = requests.get(f"{BASE_URL}/api/uploads/files/{image_path}", timeout=30)
        
        assert response.status_code == 200
        cache_control = response.headers.get('Cache-Control', '')
        assert 'max-age' in cache_control, f"Expected Cache-Control with max-age, got: {cache_control}"
        print(f"✓ Cache headers present: {cache_control}")


class TestProductImagesAPI:
    """Tests for product images in API responses"""
    
    def test_products_endpoint_returns_images(self):
        """Test that products endpoint includes image URLs"""
        response = requests.get(f"{BASE_URL}/api/products?limit=10", timeout=30)
        
        assert response.status_code == 200
        products = response.json()
        assert len(products) > 0, "Expected at least one product"
        
        # Check that products have images field
        for product in products:
            assert 'images' in product, f"Product {product.get('product_id')} missing images field"
        
        print(f"✓ Products endpoint returns {len(products)} products with images field")
    
    def test_pigma1_product_has_old_domain_url(self):
        """Test that pigma 1 product has the old domain URL (to verify normalization is needed)"""
        response = requests.get(f"{BASE_URL}/api/products?limit=50", timeout=30)
        
        assert response.status_code == 200
        products = response.json()
        
        pigma1 = next((p for p in products if p.get('name') == 'pigma 1'), None)
        assert pigma1 is not None, "pigma 1 product not found"
        
        images = pigma1.get('images', [])
        assert len(images) > 0, "pigma 1 should have at least one image"
        
        # The image URL should contain the old domain (this is what frontend normalizes)
        first_image = images[0]
        assert 'pigma-approval-hub.preview' in first_image or '/api/uploads/files/' in first_image, \
            f"Expected old domain URL or relative path, got: {first_image}"
        
        print(f"✓ pigma 1 product image URL: {first_image}")
    
    def test_product_detail_endpoint_returns_images(self):
        """Test that product detail endpoint includes images"""
        # First get a product ID
        response = requests.get(f"{BASE_URL}/api/products?limit=1", timeout=30)
        assert response.status_code == 200
        products = response.json()
        assert len(products) > 0
        
        product_id = products[0]['product_id']
        
        # Get product detail
        detail_response = requests.get(f"{BASE_URL}/api/products/{product_id}", timeout=30)
        assert detail_response.status_code == 200
        
        product = detail_response.json()
        assert 'images' in product, "Product detail missing images field"
        
        print(f"✓ Product detail endpoint returns images for {product_id}")
    
    def test_best_sellers_endpoint_returns_images(self):
        """Test that best sellers endpoint includes images"""
        response = requests.get(f"{BASE_URL}/api/products/best-sellers?limit=10", timeout=30)
        
        assert response.status_code == 200
        products = response.json()
        
        for product in products:
            assert 'images' in product, f"Best seller {product.get('product_id')} missing images field"
        
        print(f"✓ Best sellers endpoint returns {len(products)} products with images")
    
    def test_featured_products_endpoint_returns_images(self):
        """Test that featured products endpoint includes images"""
        response = requests.get(f"{BASE_URL}/api/products/featured?limit=4", timeout=30)
        
        assert response.status_code == 200
        products = response.json()
        
        for product in products:
            assert 'images' in product, f"Featured product {product.get('product_id')} missing images field"
        
        print(f"✓ Featured products endpoint returns {len(products)} products with images")
    
    def test_new_arrivals_endpoint_returns_images(self):
        """Test that new arrivals endpoint includes images"""
        response = requests.get(f"{BASE_URL}/api/products/new-arrivals?limit=8", timeout=30)
        
        assert response.status_code == 200
        products = response.json()
        
        for product in products:
            assert 'images' in product, f"New arrival {product.get('product_id')} missing images field"
        
        print(f"✓ New arrivals endpoint returns {len(products)} products with images")


class TestExternalImageURLs:
    """Tests for external image URLs (unsplash, thepigma.com)"""
    
    def test_unsplash_images_accessible(self):
        """Test that unsplash images are accessible"""
        response = requests.get(
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80",
            timeout=30
        )
        assert response.status_code == 200, f"Unsplash image not accessible: {response.status_code}"
        print("✓ Unsplash images are accessible")
    
    def test_thepigma_images_accessible(self):
        """Test that thepigma.com images are accessible"""
        response = requests.get(
            "https://thepigma.com/uploads/products/gallery/1761819600_69033bd055c32.png",
            timeout=30
        )
        assert response.status_code == 200, f"thepigma.com image not accessible: {response.status_code}"
        print("✓ thepigma.com images are accessible")


class TestImageUploadEndpoint:
    """Tests for POST /api/uploads/image endpoint"""
    
    def test_upload_image_endpoint_exists(self):
        """Test that upload image endpoint exists (returns 422 without file)"""
        response = requests.post(f"{BASE_URL}/api/uploads/image", timeout=30)
        
        # Should return 422 (validation error) because no file was provided
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Upload image endpoint exists and validates input")
    
    def test_upload_image_rejects_invalid_type(self):
        """Test that upload rejects non-image files"""
        # Create a fake text file
        files = {'file': ('test.txt', b'This is not an image', 'text/plain')}
        response = requests.post(f"{BASE_URL}/api/uploads/image", files=files, timeout=30)
        
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
        print("✓ Upload endpoint rejects invalid file types")


class TestCartImagesAPI:
    """Tests for cart images in API responses"""
    
    def test_cart_endpoint_requires_auth(self):
        """Test that cart endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/cart", timeout=30)
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Cart endpoint requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
