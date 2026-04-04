"""
Test Reseller Price Override Feature
=====================================
Tests the reseller price override functionality:
1. Product API returns reseller price when valid reseller_id + price params
2. Product API returns normal price when no params or invalid params
3. Validate-price endpoint validates legitimate vs fake prices
4. Cart add validates reseller override before accepting
5. URL manipulation prevention (fake reseller_id or fake price rejected)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test data from context
TEST_PRODUCT_ID = "prod_2636c2324d48"
TEST_RESELLER_USER_ID = "user_86f038f82a6a"
TEST_RESELLER_PRICE = 3199  # Reseller price from reseller_links
TEST_BASE_PRICE = 2999  # Base product price
TEST_COMPARE_PRICE = 3999  # Original compare price for discount display

# Customer credentials
CUSTOMER_EMAIL = "admin@pigma.com"
CUSTOMER_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get customer authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestProductAPIResellerOverride:
    """Test GET /api/products/{id} with reseller params"""

    def test_product_normal_view_returns_base_price_and_compare_price(self, api_client):
        """Normal product view (no params) returns base price with compare_price for discount"""
        response = api_client.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["product_id"] == TEST_PRODUCT_ID
        assert data["price"] == TEST_BASE_PRICE, f"Expected base price {TEST_BASE_PRICE}, got {data['price']}"
        assert data.get("compare_price") == TEST_COMPARE_PRICE, f"Expected compare_price {TEST_COMPARE_PRICE}, got {data.get('compare_price')}"
        # reseller_view should not be set or be False
        assert data.get("reseller_view") is not True
        print(f"✓ Normal view: price={data['price']}, compare_price={data.get('compare_price')}")

    def test_product_reseller_view_returns_reseller_price_no_compare(self, api_client):
        """Reseller link view returns reseller price with compare_price=null (base price hidden)"""
        response = api_client.get(
            f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}",
            params={"reseller_id": TEST_RESELLER_USER_ID, "price": TEST_RESELLER_PRICE}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["product_id"] == TEST_PRODUCT_ID
        assert data["price"] == TEST_RESELLER_PRICE, f"Expected reseller price {TEST_RESELLER_PRICE}, got {data['price']}"
        assert data.get("compare_price") is None, f"Expected compare_price=null, got {data.get('compare_price')}"
        # Note: reseller_view is set in backend but stripped by ProductResponse schema (extra="ignore")
        # Frontend determines isResellerView from URL params, not API response
        print(f"✓ Reseller view: price={data['price']}, compare_price={data.get('compare_price')}")

    def test_product_fake_price_returns_base_price(self, api_client):
        """URL manipulation with fake price returns normal base price (security check)"""
        fake_price = 100  # Trying to get product for Rs.100
        response = api_client.get(
            f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}",
            params={"reseller_id": TEST_RESELLER_USER_ID, "price": fake_price}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should return base price, not the fake price
        assert data["price"] == TEST_BASE_PRICE, f"Expected base price {TEST_BASE_PRICE} (fake price rejected), got {data['price']}"
        assert data.get("compare_price") == TEST_COMPARE_PRICE, "compare_price should be present for normal view"
        assert data.get("reseller_view") is not True, "reseller_view should not be True for fake price"
        print(f"✓ Fake price rejected: returned base price {data['price']}")

    def test_product_fake_reseller_returns_base_price(self, api_client):
        """URL manipulation with fake reseller_id returns normal base price"""
        fake_reseller = "fake_reseller_123"
        response = api_client.get(
            f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}",
            params={"reseller_id": fake_reseller, "price": TEST_RESELLER_PRICE}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should return base price, not the reseller price
        assert data["price"] == TEST_BASE_PRICE, f"Expected base price {TEST_BASE_PRICE} (fake reseller rejected), got {data['price']}"
        assert data.get("reseller_view") is not True, "reseller_view should not be True for fake reseller"
        print(f"✓ Fake reseller rejected: returned base price {data['price']}")

    def test_product_price_below_base_rejected(self, api_client):
        """Reseller price below base price is rejected (security: price >= base_price required)"""
        below_base_price = TEST_BASE_PRICE - 500  # 2499, below base 2999
        response = api_client.get(
            f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}",
            params={"reseller_id": TEST_RESELLER_USER_ID, "price": below_base_price}
        )
        
        assert response.status_code == 200
        data = response.json()
        # Should return base price since price < base_price
        assert data["price"] == TEST_BASE_PRICE, f"Expected base price (below-base rejected), got {data['price']}"
        print(f"✓ Below-base price rejected: returned base price {data['price']}")


class TestResellerValidatePriceEndpoint:
    """Test GET /api/resellers/validate-price/{product_id}"""

    def test_validate_legitimate_reseller_price(self, api_client):
        """Validate-price returns valid=true for legitimate reseller price"""
        response = api_client.get(
            f"{BASE_URL}/api/resellers/validate-price/{TEST_PRODUCT_ID}",
            params={"reseller_id": TEST_RESELLER_USER_ID, "price": TEST_RESELLER_PRICE}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["valid"] is True, f"Expected valid=True, got {data}"
        assert data.get("reseller_price") == TEST_RESELLER_PRICE
        assert data.get("base_price") == TEST_BASE_PRICE
        print(f"✓ Legitimate price validated: {data}")

    def test_validate_fake_price_returns_invalid(self, api_client):
        """Validate-price returns valid=false for fake/manipulated price"""
        fake_price = 100
        response = api_client.get(
            f"{BASE_URL}/api/resellers/validate-price/{TEST_PRODUCT_ID}",
            params={"reseller_id": TEST_RESELLER_USER_ID, "price": fake_price}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False, f"Expected valid=False for fake price, got {data}"
        print(f"✓ Fake price invalidated: {data}")

    def test_validate_fake_reseller_returns_invalid(self, api_client):
        """Validate-price returns valid=false for fake reseller_id"""
        response = api_client.get(
            f"{BASE_URL}/api/resellers/validate-price/{TEST_PRODUCT_ID}",
            params={"reseller_id": "fake_reseller_xyz", "price": TEST_RESELLER_PRICE}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False, f"Expected valid=False for fake reseller, got {data}"
        print(f"✓ Fake reseller invalidated: {data}")


class TestCartResellerPriceOverride:
    """Test POST /api/cart/add with reseller price override"""

    def test_cart_add_with_valid_reseller_override(self, authenticated_client):
        """Cart add with valid reseller_id and price_override stores the override"""
        # First clear cart
        authenticated_client.delete(f"{BASE_URL}/api/cart/clear")
        
        # Add item with reseller override
        response = authenticated_client.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": TEST_PRODUCT_ID,
            "quantity": 1,
            "size": "M",
            "color": "Black",
            "reseller_id": TEST_RESELLER_USER_ID,
            "price_override": TEST_RESELLER_PRICE
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Find the item in cart
        item = next((i for i in data.get("items", []) if i["product_id"] == TEST_PRODUCT_ID), None)
        assert item is not None, "Item not found in cart"
        assert item.get("price_override") == TEST_RESELLER_PRICE, f"Expected price_override={TEST_RESELLER_PRICE}, got {item.get('price_override')}"
        assert item.get("reseller_id") == TEST_RESELLER_USER_ID, f"Expected reseller_id={TEST_RESELLER_USER_ID}, got {item.get('reseller_id')}"
        
        # Verify total uses reseller price
        expected_total = TEST_RESELLER_PRICE * 1
        assert data["total"] == expected_total, f"Expected total={expected_total}, got {data['total']}"
        print(f"✓ Cart add with valid reseller override: price_override={item.get('price_override')}, total={data['total']}")

    def test_cart_add_with_fake_reseller_ignores_override(self, authenticated_client):
        """Cart add with fake reseller_id ignores the override, uses base price"""
        # Clear cart
        authenticated_client.delete(f"{BASE_URL}/api/cart/clear")
        
        # Add item with fake reseller
        response = authenticated_client.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": TEST_PRODUCT_ID,
            "quantity": 1,
            "size": "M",
            "color": "Black",
            "reseller_id": "fake_reseller_abc",
            "price_override": 100  # Trying to get it for Rs.100
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        item = next((i for i in data.get("items", []) if i["product_id"] == TEST_PRODUCT_ID), None)
        assert item is not None, "Item not found in cart"
        
        # Override should NOT be stored (fake reseller rejected)
        assert item.get("price_override") is None, f"Expected price_override=None (fake rejected), got {item.get('price_override')}"
        assert item.get("reseller_id") is None, f"Expected reseller_id=None (fake rejected), got {item.get('reseller_id')}"
        
        # Total should use base price
        expected_total = TEST_BASE_PRICE * 1
        assert data["total"] == expected_total, f"Expected total={expected_total} (base price), got {data['total']}"
        print(f"✓ Fake reseller rejected: total uses base price {data['total']}")

    def test_cart_add_with_fake_price_ignores_override(self, authenticated_client):
        """Cart add with valid reseller but fake price ignores the override"""
        # Clear cart
        authenticated_client.delete(f"{BASE_URL}/api/cart/clear")
        
        # Add item with valid reseller but wrong price
        response = authenticated_client.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": TEST_PRODUCT_ID,
            "quantity": 1,
            "size": "M",
            "color": "Black",
            "reseller_id": TEST_RESELLER_USER_ID,
            "price_override": 500  # Wrong price, not matching reseller_links
        })
        
        assert response.status_code == 200
        data = response.json()
        item = next((i for i in data.get("items", []) if i["product_id"] == TEST_PRODUCT_ID), None)
        assert item is not None
        
        # Override should NOT be stored (price doesn't match reseller_links)
        assert item.get("price_override") is None, f"Expected price_override=None (wrong price rejected), got {item.get('price_override')}"
        
        # Total should use base price
        assert data["total"] == TEST_BASE_PRICE, f"Expected base price total, got {data['total']}"
        print(f"✓ Wrong price rejected: total uses base price {data['total']}")

    def test_cart_get_uses_price_override_for_total(self, authenticated_client):
        """GET /api/cart uses price_override for total calculation"""
        # Clear and add with valid override
        authenticated_client.delete(f"{BASE_URL}/api/cart/clear")
        authenticated_client.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": TEST_PRODUCT_ID,
            "quantity": 2,
            "size": "M",
            "color": "Black",
            "reseller_id": TEST_RESELLER_USER_ID,
            "price_override": TEST_RESELLER_PRICE
        })
        
        # Get cart
        response = authenticated_client.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 200
        
        data = response.json()
        expected_total = TEST_RESELLER_PRICE * 2
        assert data["total"] == expected_total, f"Expected total={expected_total}, got {data['total']}"
        print(f"✓ Cart GET uses price_override: total={data['total']} (2 x {TEST_RESELLER_PRICE})")


class TestCartCleanup:
    """Cleanup test data after tests"""

    def test_cleanup_cart(self, authenticated_client):
        """Clear cart after tests"""
        response = authenticated_client.delete(f"{BASE_URL}/api/cart/clear")
        assert response.status_code == 200
        print("✓ Cart cleared after tests")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
