"""
Test suite for Frequently Bought Together (FBT) feature
Tests the GET /api/products/frequently-bought-together/{product_id} endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "upselltest@pigma.com"
CUSTOMER_PASSWORD = "test123"
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"

# Known product ID from context
TEST_PRODUCT_ID = "prod_2636c2324d48"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def customer_token(api_client):
    """Get customer authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Customer authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")


class TestFBTEndpointBasics:
    """Basic FBT endpoint tests"""

    def test_fbt_endpoint_returns_200_for_valid_product(self, api_client):
        """FBT endpoint returns 200 for existing product"""
        response = api_client.get(f"{BASE_URL}/api/products/frequently-bought-together/{TEST_PRODUCT_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"FBT endpoint returned {len(data)} products for {TEST_PRODUCT_ID}")

    def test_fbt_endpoint_returns_404_for_nonexistent_product(self, api_client):
        """FBT endpoint returns 404 for non-existent product"""
        response = api_client.get(f"{BASE_URL}/api/products/frequently-bought-together/nonexistent_product_xyz")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Error response should have detail field"
        print(f"Correctly returned 404 for non-existent product")

    def test_fbt_endpoint_returns_array(self, api_client):
        """FBT endpoint returns an array of products"""
        response = api_client.get(f"{BASE_URL}/api/products/frequently-bought-together/{TEST_PRODUCT_ID}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response must be a list/array"
        print(f"Response is correctly an array with {len(data)} items")


class TestFBTResponseStructure:
    """Tests for FBT response data structure"""

    def test_fbt_products_have_required_fields(self, api_client):
        """Each FBT product has required fields: product_id, name, price, images, sizes, colors, stock"""
        response = api_client.get(f"{BASE_URL}/api/products/frequently-bought-together/{TEST_PRODUCT_ID}")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No FBT products returned to validate structure")
        
        required_fields = ["product_id", "name", "price", "images", "sizes", "colors", "stock"]
        for product in data:
            for field in required_fields:
                assert field in product, f"Product missing required field: {field}"
            print(f"Product {product['product_id']}: {product['name']} - Rs.{product['price']}")
        
        print(f"All {len(data)} products have required fields")

    def test_fbt_products_have_compare_price_field(self, api_client):
        """FBT products include compare_price field (can be null)"""
        response = api_client.get(f"{BASE_URL}/api/products/frequently-bought-together/{TEST_PRODUCT_ID}")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No FBT products returned")
        
        for product in data:
            assert "compare_price" in product, "Product should have compare_price field"
        print("All products have compare_price field")

    def test_fbt_products_have_valid_price_values(self, api_client):
        """FBT products have valid numeric price values"""
        response = api_client.get(f"{BASE_URL}/api/products/frequently-bought-together/{TEST_PRODUCT_ID}")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No FBT products returned")
        
        for product in data:
            assert isinstance(product["price"], (int, float)), f"Price should be numeric, got {type(product['price'])}"
            assert product["price"] > 0, f"Price should be positive, got {product['price']}"
        print("All products have valid price values")


class TestFBTLimitParameter:
    """Tests for FBT limit query parameter"""

    def test_fbt_default_limit_is_4(self, api_client):
        """FBT endpoint returns up to 4 products by default"""
        response = api_client.get(f"{BASE_URL}/api/products/frequently-bought-together/{TEST_PRODUCT_ID}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 4, f"Default limit should be 4, got {len(data)} products"
        print(f"Default limit working: returned {len(data)} products (max 4)")

    def test_fbt_limit_parameter_works(self, api_client):
        """FBT endpoint respects limit=2 parameter"""
        response = api_client.get(f"{BASE_URL}/api/products/frequently-bought-together/{TEST_PRODUCT_ID}?limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 2, f"Limit=2 should return max 2 products, got {len(data)}"
        print(f"Limit parameter working: returned {len(data)} products (max 2)")

    def test_fbt_limit_parameter_3(self, api_client):
        """FBT endpoint respects limit=3 parameter"""
        response = api_client.get(f"{BASE_URL}/api/products/frequently-bought-together/{TEST_PRODUCT_ID}?limit=3")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 3, f"Limit=3 should return max 3 products, got {len(data)}"
        print(f"Limit=3 working: returned {len(data)} products")


class TestFBTExcludesSourceProduct:
    """Tests that FBT excludes the source product from results"""

    def test_fbt_excludes_source_product(self, api_client):
        """FBT results should not include the source product itself"""
        response = api_client.get(f"{BASE_URL}/api/products/frequently-bought-together/{TEST_PRODUCT_ID}")
        assert response.status_code == 200
        data = response.json()
        
        product_ids = [p["product_id"] for p in data]
        assert TEST_PRODUCT_ID not in product_ids, f"Source product {TEST_PRODUCT_ID} should not be in FBT results"
        print(f"Source product correctly excluded from {len(data)} FBT results")


class TestFBTFallbackBehavior:
    """Tests for FBT fallback behavior (same-category, popular products)"""

    def test_fbt_returns_products_even_without_copurchase_data(self, api_client):
        """FBT should return products via fallback even if no co-purchase data exists"""
        # Get any product first
        products_response = api_client.get(f"{BASE_URL}/api/products?limit=5")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products available")
        
        # Test FBT for each product - at least one should return results via fallback
        found_results = False
        for product in products:
            pid = product.get("product_id")
            if not pid:
                continue
            fbt_response = api_client.get(f"{BASE_URL}/api/products/frequently-bought-together/{pid}")
            if fbt_response.status_code == 200:
                fbt_data = fbt_response.json()
                if len(fbt_data) > 0:
                    found_results = True
                    print(f"Product {pid} has {len(fbt_data)} FBT suggestions")
                    break
        
        assert found_results, "At least one product should have FBT suggestions via fallback"


class TestFBTWithDifferentProducts:
    """Tests FBT with different product IDs"""

    def test_fbt_with_multiple_products(self, api_client):
        """Test FBT endpoint with multiple different products"""
        # Get list of products
        products_response = api_client.get(f"{BASE_URL}/api/products?limit=3")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products available")
        
        for product in products:
            pid = product.get("product_id")
            if not pid:
                continue
            
            fbt_response = api_client.get(f"{BASE_URL}/api/products/frequently-bought-together/{pid}")
            assert fbt_response.status_code == 200, f"FBT failed for product {pid}"
            fbt_data = fbt_response.json()
            assert isinstance(fbt_data, list), f"FBT for {pid} should return list"
            
            # Verify source product not in results
            fbt_ids = [p["product_id"] for p in fbt_data]
            assert pid not in fbt_ids, f"Source product {pid} should not be in its own FBT results"
            
            print(f"Product {pid}: {len(fbt_data)} FBT suggestions")


class TestProductEndpointExists:
    """Verify the main product endpoint works (prerequisite for FBT)"""

    def test_product_detail_endpoint(self, api_client):
        """GET /api/products/{product_id} returns product details"""
        response = api_client.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}")
        assert response.status_code == 200, f"Product detail failed: {response.status_code}"
        data = response.json()
        assert data.get("product_id") == TEST_PRODUCT_ID
        assert "name" in data
        assert "price" in data
        print(f"Product: {data['name']} - Rs.{data['price']}")

    def test_products_list_endpoint(self, api_client):
        """GET /api/products returns list of products"""
        response = api_client.get(f"{BASE_URL}/api/products?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Products list returned {len(data)} products")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
