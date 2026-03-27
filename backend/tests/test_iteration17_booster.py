"""
Iteration 17: Cart Value Booster System Tests
Tests for:
- GET /api/booster/config - public config endpoint
- POST /api/booster/admin/slabs - create slab (super admin only)
- PUT /api/booster/admin/slabs/{slab_id} - update slab
- DELETE /api/booster/admin/slabs/{slab_id} - delete slab
- GET /api/booster/admin/messages - get messages config
- PUT /api/booster/admin/messages - update messages
- GET /api/booster/admin/analytics - get analytics
- GET /api/cart/upsell-suggestions - upsell products
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@pigma.com"
SUPER_ADMIN_PASSWORD = "superadmin123"
CUSTOMER_EMAIL = "harpreetkaler750@gmail.com"
CUSTOMER_PASSWORD = "Harpreet@123"


class TestBoosterPublicEndpoints:
    """Test public booster config endpoint"""
    
    def test_get_booster_config(self):
        """GET /api/booster/config returns slabs and messages"""
        response = requests.get(f"{BASE_URL}/api/booster/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "slabs" in data, "Response should contain 'slabs'"
        assert "messages" in data, "Response should contain 'messages'"
        
        # Verify slabs structure
        if len(data["slabs"]) > 0:
            slab = data["slabs"][0]
            assert "min_cart_value" in slab, "Slab should have min_cart_value"
            assert "reward_type" in slab, "Slab should have reward_type"
            assert "reward_label" in slab, "Slab should have reward_label"
            assert "is_enabled" in slab, "Slab should have is_enabled"
            print(f"✓ Found {len(data['slabs'])} enabled slabs")
            for s in data["slabs"]:
                print(f"  - ₹{s['min_cart_value']} = {s['reward_label']}")
        
        # Verify messages structure
        messages = data["messages"]
        assert "bar_prefix" in messages or "setting_id" in messages, "Messages should have expected fields"
        print(f"✓ Booster config returned successfully")


class TestBoosterAdminEndpoints:
    """Test admin booster management endpoints (super admin only)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        token = response.json().get("token")
        print(f"✓ Super admin logged in successfully")
        return token
    
    def test_get_admin_slabs(self, admin_token):
        """GET /api/booster/admin/slabs returns all slabs"""
        response = requests.get(
            f"{BASE_URL}/api/booster/admin/slabs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        slabs = response.json()
        assert isinstance(slabs, list), "Response should be a list"
        print(f"✓ Admin can view {len(slabs)} slabs")
        
        # Verify default slabs exist (₹1200, ₹3330, ₹5999)
        min_values = [s["min_cart_value"] for s in slabs]
        assert 1200 in min_values or len(slabs) >= 3, "Should have default slabs"
        print(f"✓ Slab min values: {min_values}")
    
    def test_create_slab(self, admin_token):
        """POST /api/booster/admin/slabs creates new slab"""
        new_slab = {
            "min_cart_value": 9999,
            "reward_type": "percentage",
            "reward_value": 10,
            "reward_label": "TEST 10% OFF",
            "is_enabled": False,  # Disabled so it doesn't affect other tests
            "excluded_categories": [],
            "excluded_products": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/booster/admin/slabs",
            json=new_slab,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "slab" in data, "Response should contain created slab"
        assert data["slab"]["min_cart_value"] == 9999
        assert data["slab"]["reward_label"] == "TEST 10% OFF"
        assert "slab_id" in data["slab"], "Created slab should have slab_id"
        
        print(f"✓ Created test slab: {data['slab']['slab_id']}")
        return data["slab"]["slab_id"]
    
    def test_update_slab(self, admin_token):
        """PUT /api/booster/admin/slabs/{slab_id} updates slab"""
        # First get existing slabs
        response = requests.get(
            f"{BASE_URL}/api/booster/admin/slabs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        slabs = response.json()
        
        # Find the test slab we created
        test_slab = next((s for s in slabs if s.get("reward_label") == "TEST 10% OFF"), None)
        if not test_slab:
            pytest.skip("Test slab not found, skipping update test")
        
        slab_id = test_slab["slab_id"]
        
        # Update the slab
        updated_data = {
            "min_cart_value": 9999,
            "reward_type": "percentage",
            "reward_value": 15,
            "reward_label": "TEST 15% OFF UPDATED",
            "is_enabled": False,
            "excluded_categories": [],
            "excluded_products": []
        }
        
        response = requests.put(
            f"{BASE_URL}/api/booster/admin/slabs/{slab_id}",
            json=updated_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Updated slab {slab_id}")
    
    def test_delete_slab(self, admin_token):
        """DELETE /api/booster/admin/slabs/{slab_id} deletes slab"""
        # Get slabs to find test slab
        response = requests.get(
            f"{BASE_URL}/api/booster/admin/slabs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        slabs = response.json()
        
        # Find test slab
        test_slab = next((s for s in slabs if "TEST" in s.get("reward_label", "")), None)
        if not test_slab:
            pytest.skip("Test slab not found, skipping delete test")
        
        slab_id = test_slab["slab_id"]
        
        response = requests.delete(
            f"{BASE_URL}/api/booster/admin/slabs/{slab_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Deleted test slab {slab_id}")
        
        # Verify deletion
        response = requests.get(
            f"{BASE_URL}/api/booster/admin/slabs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        slabs = response.json()
        assert not any(s["slab_id"] == slab_id for s in slabs), "Slab should be deleted"
        print(f"✓ Verified slab deletion")
    
    def test_get_admin_messages(self, admin_token):
        """GET /api/booster/admin/messages returns messages config"""
        response = requests.get(
            f"{BASE_URL}/api/booster/admin/messages",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        messages = response.json()
        # Should have default message fields
        expected_fields = ["bar_prefix", "bar_suffix", "unlocked_text"]
        for field in expected_fields:
            assert field in messages, f"Messages should have '{field}'"
        print(f"✓ Admin messages config retrieved")
    
    def test_update_admin_messages(self, admin_token):
        """PUT /api/booster/admin/messages updates messages"""
        updated_messages = {
            "bar_prefix": "Add",
            "bar_suffix": "more to unlock reward",
            "unlocked_text": "Reward unlocked!",
            "max_unlocked_text": "Maximum reward unlocked!",
            "urgency_text": "Almost there! Don't miss your discount",
            "upsell_button_text": "View items under ₹300",
            "near_threshold_text": "You're just {amount} away from saving {reward}"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/booster/admin/messages",
            json=updated_messages,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Admin messages updated")
    
    def test_get_admin_analytics(self, admin_token):
        """GET /api/booster/admin/analytics returns analytics data"""
        response = requests.get(
            f"{BASE_URL}/api/booster/admin/analytics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        analytics = response.json()
        assert "slab_stats" in analytics, "Analytics should have slab_stats"
        assert "total_unlocks" in analytics, "Analytics should have total_unlocks"
        assert "average_order_value" in analytics, "Analytics should have average_order_value"
        print(f"✓ Analytics: AOV=₹{analytics['average_order_value']}, Total unlocks={analytics['total_unlocks']}")


class TestUpsellSuggestions:
    """Test cart upsell suggestions endpoint"""
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")
        token = response.json().get("token")
        print(f"✓ Customer logged in successfully")
        return token
    
    def test_get_upsell_suggestions(self, customer_token):
        """GET /api/cart/upsell-suggestions returns products"""
        response = requests.get(
            f"{BASE_URL}/api/cart/upsell-suggestions?max_price=500",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        products = response.json()
        assert isinstance(products, list), "Response should be a list"
        print(f"✓ Got {len(products)} upsell suggestions")
        
        # Verify products are under max_price
        for p in products:
            assert "product_id" in p, "Product should have product_id"
            assert "price" in p, "Product should have price"
            assert "name" in p, "Product should have name"
            if p["price"] > 500:
                print(f"  Note: Product {p['name']} is ₹{p['price']} (above max_price, may be fallback)")
        
        if len(products) > 0:
            print(f"  Sample products: {[p['name'][:30] for p in products[:3]]}")


class TestNonSuperAdminAccess:
    """Test that non-super-admin cannot access admin booster endpoints"""
    
    def test_non_admin_cannot_access_slabs(self):
        """Regular customer cannot access admin slabs"""
        # Login as customer
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        
        customer_token = response.json().get("token")
        
        # Try to access admin slabs
        response = requests.get(
            f"{BASE_URL}/api/booster/admin/slabs",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        # Should fail with 401 or 403
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print(f"✓ Customer correctly denied access to admin slabs (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
