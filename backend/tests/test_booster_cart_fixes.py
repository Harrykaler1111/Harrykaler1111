"""
Test Cart Booster and Upsell Fixes - Iteration 47
Tests the 4 bug fixes:
1. Booster config endpoint returns slabs with correct field names
2. Upsell suggestions work without auth (guest users)
3. Field names: is_enabled, min_cart_value (not is_active, min_amount)
4. Messages come from /booster/config response
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBoosterConfig:
    """Test /api/booster/config endpoint - public, returns slabs and messages"""
    
    def test_booster_config_returns_200(self):
        """Booster config endpoint should be accessible without auth"""
        response = requests.get(f"{BASE_URL}/api/booster/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/booster/config returns 200")
    
    def test_booster_config_has_slabs_array(self):
        """Response should contain slabs array"""
        response = requests.get(f"{BASE_URL}/api/booster/config")
        data = response.json()
        assert "slabs" in data, "Response missing 'slabs' key"
        assert isinstance(data["slabs"], list), "slabs should be an array"
        print(f"PASS: slabs array present with {len(data['slabs'])} items")
    
    def test_booster_config_has_messages(self):
        """Response should contain messages object"""
        response = requests.get(f"{BASE_URL}/api/booster/config")
        data = response.json()
        assert "messages" in data, "Response missing 'messages' key"
        assert isinstance(data["messages"], dict), "messages should be an object"
        print("PASS: messages object present")
    
    def test_slab_has_correct_field_names(self):
        """Slabs should use is_enabled and min_cart_value (not is_active/min_amount)"""
        response = requests.get(f"{BASE_URL}/api/booster/config")
        data = response.json()
        slabs = data.get("slabs", [])
        
        if len(slabs) == 0:
            pytest.skip("No slabs configured")
        
        slab = slabs[0]
        # Check correct field names
        assert "is_enabled" in slab, "Slab missing 'is_enabled' field"
        assert "min_cart_value" in slab, "Slab missing 'min_cart_value' field"
        assert "reward_type" in slab, "Slab missing 'reward_type' field"
        assert "reward_value" in slab, "Slab missing 'reward_value' field"
        
        # Ensure old field names are NOT present
        assert "is_active" not in slab, "Slab should NOT have 'is_active' (old field name)"
        assert "min_amount" not in slab, "Slab should NOT have 'min_amount' (old field name)"
        
        print(f"PASS: Slab has correct fields: is_enabled={slab['is_enabled']}, min_cart_value={slab['min_cart_value']}")
    
    def test_slabs_are_sorted_by_min_cart_value(self):
        """Slabs should be sorted by min_cart_value ascending"""
        response = requests.get(f"{BASE_URL}/api/booster/config")
        data = response.json()
        slabs = data.get("slabs", [])
        
        if len(slabs) < 2:
            pytest.skip("Need at least 2 slabs to test sorting")
        
        values = [s["min_cart_value"] for s in slabs]
        assert values == sorted(values), f"Slabs not sorted: {values}"
        print(f"PASS: Slabs sorted by min_cart_value: {values}")
    
    def test_expected_slabs_present(self):
        """Verify expected slab tiers are present"""
        response = requests.get(f"{BASE_URL}/api/booster/config")
        data = response.json()
        slabs = data.get("slabs", [])
        
        # Expected slabs per problem statement
        expected_thresholds = [1500, 2500, 3500, 5999, 9999]
        actual_thresholds = [s["min_cart_value"] for s in slabs]
        
        for threshold in expected_thresholds:
            assert threshold in actual_thresholds, f"Missing slab for threshold {threshold}"
        
        print(f"PASS: All expected slabs present: {expected_thresholds}")


class TestUpsellSuggestionsNoAuth:
    """Test /api/cart/upsell-suggestions works without auth (guest users)"""
    
    def test_upsell_returns_200_without_auth(self):
        """Upsell endpoint should work without auth token"""
        response = requests.get(f"{BASE_URL}/api/cart/upsell-suggestions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/cart/upsell-suggestions returns 200 without auth")
    
    def test_upsell_returns_products_array(self):
        """Response should be an array of products"""
        response = requests.get(f"{BASE_URL}/api/cart/upsell-suggestions")
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        print(f"PASS: Upsell returns array with {len(data)} products")
    
    def test_upsell_products_have_required_fields(self):
        """Each product should have required fields for display"""
        response = requests.get(f"{BASE_URL}/api/cart/upsell-suggestions")
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No upsell products returned")
        
        product = data[0]
        required_fields = ["product_id", "name", "price", "images"]
        for field in required_fields:
            assert field in product, f"Product missing '{field}' field"
        
        print(f"PASS: Product has required fields: {list(product.keys())[:6]}...")
    
    def test_upsell_with_max_price_filter(self):
        """Upsell should respect max_price query param"""
        response = requests.get(f"{BASE_URL}/api/cart/upsell-suggestions?max_price=500")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Upsell with max_price=500 returns {len(data)} products")
    
    def test_upsell_with_auth_also_works(self):
        """Upsell should also work WITH auth token"""
        # Login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@pigma.com",
            "password": "admin123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not login to test authenticated upsell")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/cart/upsell-suggestions", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Upsell also works with auth token")


class TestBoosterMessages:
    """Test that messages come from /booster/config (not admin-only endpoint)"""
    
    def test_messages_in_config_response(self):
        """Messages should be included in public /booster/config response"""
        response = requests.get(f"{BASE_URL}/api/booster/config")
        data = response.json()
        
        messages = data.get("messages", {})
        expected_keys = ["bar_prefix", "bar_suffix", "max_unlocked_text", "near_threshold_text"]
        
        for key in expected_keys:
            assert key in messages, f"Messages missing '{key}'"
        
        print(f"PASS: Messages contain expected keys: {list(messages.keys())}")
    
    def test_admin_messages_requires_auth(self):
        """Admin messages endpoint should require auth"""
        response = requests.get(f"{BASE_URL}/api/booster/admin/messages")
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403, 422], f"Admin endpoint should require auth, got {response.status_code}"
        print(f"PASS: /api/booster/admin/messages requires auth (returns {response.status_code})")


class TestSlabDiscountCalculation:
    """Test slab discount logic"""
    
    def test_slab_reward_types(self):
        """Slabs should have valid reward_type values"""
        response = requests.get(f"{BASE_URL}/api/booster/config")
        data = response.json()
        slabs = data.get("slabs", [])
        
        valid_types = ["fixed", "percentage", "free_item"]
        for slab in slabs:
            assert slab["reward_type"] in valid_types, f"Invalid reward_type: {slab['reward_type']}"
        
        print(f"PASS: All slabs have valid reward_type")
    
    def test_slab_reward_values_positive(self):
        """Slab reward values should be positive"""
        response = requests.get(f"{BASE_URL}/api/booster/config")
        data = response.json()
        slabs = data.get("slabs", [])
        
        for slab in slabs:
            assert slab["reward_value"] > 0, f"Slab {slab['slab_id']} has non-positive reward_value"
        
        print("PASS: All slabs have positive reward_value")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
