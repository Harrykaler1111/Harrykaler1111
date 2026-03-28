"""
Test Bundle Deals Feature
- Public endpoints: GET /api/bundles, GET /api/bundles/{bundle_id}, GET /api/bundles/for-product/{product_id}
- Admin endpoints: GET /api/bundles/admin/all, POST /api/bundles/admin, PUT /api/bundles/admin/{bundle_id}, DELETE /api/bundles/admin/{bundle_id}
- Validation: min 2 products, name required, percentage discount max 50%
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review_request
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
CUSTOMER_EMAIL = "upselltest@pigma.com"
CUSTOMER_PASSWORD = "test123"

# Known product IDs from existing bundles
KNOWN_PRODUCT_IDS = [
    "prod_2636c2324d48",
    "prod_59a010226268",
    "prod_3970413af906",
    "prod_16e3afb4013d"
]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestPublicBundleEndpoints:
    """Test public bundle endpoints (no auth required)"""

    def test_get_active_bundles_returns_200(self):
        """GET /api/bundles returns 200 with active bundles"""
        response = requests.get(f"{BASE_URL}/api/bundles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} active bundles")

    def test_active_bundles_have_required_fields(self):
        """Active bundles have all required fields"""
        response = requests.get(f"{BASE_URL}/api/bundles")
        assert response.status_code == 200
        bundles = response.json()
        
        if len(bundles) == 0:
            pytest.skip("No active bundles to test")
        
        bundle = bundles[0]
        required_fields = ["bundle_id", "name", "product_ids", "discount_type", "discount_value", "is_active"]
        for field in required_fields:
            assert field in bundle, f"Missing field: {field}"
        
        # Check calculated pricing fields
        assert "products" in bundle, "Missing populated products"
        assert "original_total" in bundle, "Missing original_total"
        assert "discount_amount" in bundle, "Missing discount_amount"
        assert "bundle_price" in bundle, "Missing bundle_price"
        print(f"Bundle '{bundle['name']}' has all required fields")

    def test_active_bundles_have_populated_products(self):
        """Active bundles have populated product data"""
        response = requests.get(f"{BASE_URL}/api/bundles")
        assert response.status_code == 200
        bundles = response.json()
        
        if len(bundles) == 0:
            pytest.skip("No active bundles to test")
        
        bundle = bundles[0]
        products = bundle.get("products", [])
        assert len(products) >= 2, f"Bundle should have at least 2 products, got {len(products)}"
        
        # Check product fields
        product = products[0]
        product_fields = ["product_id", "name", "price", "images"]
        for field in product_fields:
            assert field in product, f"Product missing field: {field}"
        print(f"Bundle has {len(products)} populated products")

    def test_bundle_pricing_calculation(self):
        """Bundle pricing is calculated correctly"""
        response = requests.get(f"{BASE_URL}/api/bundles")
        assert response.status_code == 200
        bundles = response.json()
        
        if len(bundles) == 0:
            pytest.skip("No active bundles to test")
        
        bundle = bundles[0]
        original_total = bundle.get("original_total", 0)
        discount_amount = bundle.get("discount_amount", 0)
        bundle_price = bundle.get("bundle_price", 0)
        
        assert original_total > 0, "Original total should be positive"
        assert discount_amount >= 0, "Discount amount should be non-negative"
        assert bundle_price >= 0, "Bundle price should be non-negative"
        assert bundle_price <= original_total, "Bundle price should not exceed original total"
        
        # Verify calculation
        expected_price = max(original_total - discount_amount, 0)
        assert abs(bundle_price - expected_price) < 0.01, f"Price mismatch: {bundle_price} != {expected_price}"
        print(f"Bundle pricing: Rs.{bundle_price} (was Rs.{original_total}, save Rs.{discount_amount})")

    def test_get_single_bundle_returns_200(self):
        """GET /api/bundles/{bundle_id} returns 200 for existing bundle"""
        # First get a bundle ID
        response = requests.get(f"{BASE_URL}/api/bundles")
        assert response.status_code == 200
        bundles = response.json()
        
        if len(bundles) == 0:
            pytest.skip("No bundles to test")
        
        bundle_id = bundles[0]["bundle_id"]
        response = requests.get(f"{BASE_URL}/api/bundles/{bundle_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        bundle = response.json()
        assert bundle["bundle_id"] == bundle_id
        print(f"Successfully fetched bundle: {bundle['name']}")

    def test_get_single_bundle_returns_404_for_nonexistent(self):
        """GET /api/bundles/{bundle_id} returns 404 for non-existent bundle"""
        response = requests.get(f"{BASE_URL}/api/bundles/nonexistent_bundle_12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    def test_get_bundles_for_product_returns_200(self):
        """GET /api/bundles/for-product/{product_id} returns 200"""
        # Use a known product ID from existing bundles
        product_id = KNOWN_PRODUCT_IDS[0]
        response = requests.get(f"{BASE_URL}/api/bundles/for-product/{product_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        bundles = response.json()
        assert isinstance(bundles, list), "Response should be a list"
        print(f"Found {len(bundles)} bundles containing product {product_id}")

    def test_bundles_for_product_contain_product(self):
        """Bundles returned for product actually contain that product"""
        product_id = KNOWN_PRODUCT_IDS[0]
        response = requests.get(f"{BASE_URL}/api/bundles/for-product/{product_id}")
        assert response.status_code == 200
        
        bundles = response.json()
        for bundle in bundles:
            assert product_id in bundle.get("product_ids", []), \
                f"Bundle {bundle['bundle_id']} should contain product {product_id}"
        print(f"All {len(bundles)} bundles correctly contain product {product_id}")


class TestAdminBundleEndpoints:
    """Test admin bundle endpoints (requires admin auth)"""

    def test_admin_get_all_bundles_requires_auth(self):
        """GET /api/bundles/admin/all requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/bundles/admin/all")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_admin_get_all_bundles_with_auth(self, admin_headers):
        """GET /api/bundles/admin/all returns all bundles with admin auth"""
        response = requests.get(f"{BASE_URL}/api/bundles/admin/all", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        bundles = response.json()
        assert isinstance(bundles, list), "Response should be a list"
        print(f"Admin can see {len(bundles)} total bundles (including inactive)")

    def test_admin_create_bundle_requires_auth(self):
        """POST /api/bundles/admin requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            json={"name": "Test Bundle", "product_ids": KNOWN_PRODUCT_IDS[:2]}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_admin_create_bundle_fails_without_name(self, admin_headers):
        """POST /api/bundles/admin fails without name"""
        response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={"product_ids": KNOWN_PRODUCT_IDS[:2], "discount_type": "percentage", "discount_value": 10}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "name" in response.text.lower(), "Error should mention name"

    def test_admin_create_bundle_fails_with_less_than_2_products(self, admin_headers):
        """POST /api/bundles/admin fails with less than 2 products"""
        response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={"name": "Test Bundle", "product_ids": [KNOWN_PRODUCT_IDS[0]], "discount_type": "percentage", "discount_value": 10}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "2" in response.text, "Error should mention minimum 2 products"

    def test_admin_create_bundle_fails_with_percentage_over_50(self, admin_headers):
        """POST /api/bundles/admin fails with percentage discount over 50%"""
        response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={
                "name": "Test Bundle High Discount",
                "product_ids": KNOWN_PRODUCT_IDS[:2],
                "discount_type": "percentage",
                "discount_value": 60
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "50" in response.text, "Error should mention 50% limit"

    def test_admin_create_bundle_success(self, admin_headers):
        """POST /api/bundles/admin creates bundle successfully"""
        test_name = f"TEST_Bundle_{int(time.time())}"
        response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={
                "name": test_name,
                "description": "Test bundle for automated testing",
                "product_ids": KNOWN_PRODUCT_IDS[:2],
                "discount_type": "percentage",
                "discount_value": 15,
                "badge_text": "TEST",
                "is_active": False  # Create as inactive to not affect public endpoints
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "bundle_id" in data, "Response should contain bundle_id"
        assert data["name"] == test_name
        print(f"Created test bundle: {data['bundle_id']}")
        
        # Cleanup - delete the test bundle
        bundle_id = data["bundle_id"]
        requests.delete(f"{BASE_URL}/api/bundles/admin/{bundle_id}", headers=admin_headers)

    def test_admin_create_bundle_with_flat_discount(self, admin_headers):
        """POST /api/bundles/admin creates bundle with flat discount"""
        test_name = f"TEST_Flat_Bundle_{int(time.time())}"
        response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={
                "name": test_name,
                "product_ids": KNOWN_PRODUCT_IDS[:2],
                "discount_type": "flat",
                "discount_value": 500,
                "is_active": False
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["discount_type"] == "flat"
        assert data["discount_value"] == 500
        print(f"Created flat discount bundle: Rs.500 off")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/bundles/admin/{data['bundle_id']}", headers=admin_headers)

    def test_admin_update_bundle_requires_auth(self):
        """PUT /api/bundles/admin/{bundle_id} requires admin authentication"""
        response = requests.put(
            f"{BASE_URL}/api/bundles/admin/some_bundle_id",
            json={"name": "Updated Name"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_admin_update_bundle_success(self, admin_headers):
        """PUT /api/bundles/admin/{bundle_id} updates bundle successfully"""
        # First create a test bundle
        test_name = f"TEST_Update_Bundle_{int(time.time())}"
        create_response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={
                "name": test_name,
                "product_ids": KNOWN_PRODUCT_IDS[:2],
                "discount_type": "percentage",
                "discount_value": 10,
                "is_active": False
            }
        )
        assert create_response.status_code == 200
        bundle_id = create_response.json()["bundle_id"]
        
        # Update the bundle
        new_name = f"TEST_Updated_{int(time.time())}"
        update_response = requests.put(
            f"{BASE_URL}/api/bundles/admin/{bundle_id}",
            headers=admin_headers,
            json={"name": new_name, "discount_value": 20}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        data = update_response.json()
        assert data["name"] == new_name
        assert data["discount_value"] == 20
        print(f"Updated bundle name and discount")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/bundles/admin/{bundle_id}", headers=admin_headers)

    def test_admin_toggle_bundle_active_status(self, admin_headers):
        """PUT /api/bundles/admin/{bundle_id} can toggle is_active"""
        # Create test bundle
        create_response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={
                "name": f"TEST_Toggle_{int(time.time())}",
                "product_ids": KNOWN_PRODUCT_IDS[:2],
                "discount_type": "percentage",
                "discount_value": 10,
                "is_active": False
            }
        )
        assert create_response.status_code == 200
        bundle_id = create_response.json()["bundle_id"]
        
        # Toggle to active
        update_response = requests.put(
            f"{BASE_URL}/api/bundles/admin/{bundle_id}",
            headers=admin_headers,
            json={"is_active": True}
        )
        assert update_response.status_code == 200
        assert update_response.json()["is_active"] == True
        
        # Toggle back to inactive
        update_response = requests.put(
            f"{BASE_URL}/api/bundles/admin/{bundle_id}",
            headers=admin_headers,
            json={"is_active": False}
        )
        assert update_response.status_code == 200
        assert update_response.json()["is_active"] == False
        print("Successfully toggled bundle active status")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/bundles/admin/{bundle_id}", headers=admin_headers)

    def test_admin_delete_bundle_requires_auth(self):
        """DELETE /api/bundles/admin/{bundle_id} requires admin authentication"""
        response = requests.delete(f"{BASE_URL}/api/bundles/admin/some_bundle_id")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_admin_delete_bundle_success(self, admin_headers):
        """DELETE /api/bundles/admin/{bundle_id} deletes bundle successfully"""
        # Create test bundle
        create_response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={
                "name": f"TEST_Delete_{int(time.time())}",
                "product_ids": KNOWN_PRODUCT_IDS[:2],
                "discount_type": "percentage",
                "discount_value": 10,
                "is_active": False
            }
        )
        assert create_response.status_code == 200
        bundle_id = create_response.json()["bundle_id"]
        
        # Delete the bundle
        delete_response = requests.delete(
            f"{BASE_URL}/api/bundles/admin/{bundle_id}",
            headers=admin_headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/bundles/{bundle_id}")
        assert get_response.status_code == 404, "Deleted bundle should return 404"
        print("Successfully deleted bundle")

    def test_admin_delete_nonexistent_bundle_returns_404(self, admin_headers):
        """DELETE /api/bundles/admin/{bundle_id} returns 404 for non-existent bundle"""
        response = requests.delete(
            f"{BASE_URL}/api/bundles/admin/nonexistent_bundle_12345",
            headers=admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestBundleDataIntegrity:
    """Test bundle data integrity and edge cases"""

    def test_existing_bundles_have_valid_products(self):
        """Existing bundles reference valid products"""
        response = requests.get(f"{BASE_URL}/api/bundles")
        assert response.status_code == 200
        bundles = response.json()
        
        for bundle in bundles:
            products = bundle.get("products", [])
            product_ids = bundle.get("product_ids", [])
            
            # All product_ids should have corresponding product data
            # (some might be inactive, so products <= product_ids)
            assert len(products) <= len(product_ids), \
                f"Bundle {bundle['bundle_id']} has more products than product_ids"
            
            # Each product should have valid price
            for product in products:
                assert product.get("price", 0) > 0, \
                    f"Product {product.get('product_id')} has invalid price"
        
        print(f"All {len(bundles)} bundles have valid product references")

    def test_bundle_discount_types_are_valid(self):
        """All bundles have valid discount types"""
        response = requests.get(f"{BASE_URL}/api/bundles")
        assert response.status_code == 200
        bundles = response.json()
        
        valid_types = ["percentage", "flat"]
        for bundle in bundles:
            discount_type = bundle.get("discount_type")
            assert discount_type in valid_types, \
                f"Bundle {bundle['bundle_id']} has invalid discount_type: {discount_type}"
        
        print(f"All bundles have valid discount types")

    def test_percentage_discounts_within_limit(self):
        """Percentage discounts are within 50% limit"""
        response = requests.get(f"{BASE_URL}/api/bundles")
        assert response.status_code == 200
        bundles = response.json()
        
        for bundle in bundles:
            if bundle.get("discount_type") == "percentage":
                discount_value = bundle.get("discount_value", 0)
                assert discount_value <= 50, \
                    f"Bundle {bundle['bundle_id']} has percentage discount {discount_value}% > 50%"
        
        print("All percentage discounts are within 50% limit")
