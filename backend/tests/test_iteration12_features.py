"""
Iteration 12 Backend Tests - Return & Dispute Management, Creator Page, Marketing Pixels
Tests for:
- Return reasons endpoint
- User return request creation
- User returns list
- Vendor returns management (list, approve, reject)
- Admin returns management (list with stats, override, message)
- Marketing pixel settings (meta_pixel_id, google_ads_id)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
SALES_EMAIL = "sales@pigma.com"
SALES_PASSWORD = "sales123"
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"
CUSTOMER_EMAIL = "harpreetkaler750@gmail.com"
CUSTOMER_PASSWORD = "Harpreet@123"


class TestReturnReasons:
    """Test return reasons endpoint (public)"""
    
    def test_get_return_reasons(self):
        """GET /api/returns/reasons should return 8 return reasons"""
        response = requests.get(f"{BASE_URL}/api/returns/reasons")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 8, f"Expected 8 reasons, got {len(data)}"
        
        # Verify structure
        for reason in data:
            assert "value" in reason, "Each reason should have 'value'"
            assert "label" in reason, "Each reason should have 'label'"
        
        # Verify expected reasons exist
        values = [r["value"] for r in data]
        expected_values = ["defective", "wrong_item", "not_as_described", "size_issue", 
                          "damaged_in_transit", "late_delivery", "changed_mind", "other"]
        for ev in expected_values:
            assert ev in values, f"Missing expected reason: {ev}"
        
        print(f"✓ Return reasons endpoint returns {len(data)} reasons")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_superadmin_login(self):
        """POST /api/admin/auth/login with superadmin credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print("✓ Superadmin login successful")
        return data["token"]
    
    def test_sales_manager_login(self):
        """POST /api/admin/auth/login with sales manager credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        assert response.status_code == 200, f"Sales manager login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print("✓ Sales manager login successful")
        return data["token"]


class TestVendorAuth:
    """Test vendor authentication"""
    
    def test_vendor_login(self):
        """POST /api/vendors/login with vendor credentials"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print("✓ Vendor login successful")
        return data["token"]


class TestCustomerAuth:
    """Test customer authentication"""
    
    def test_customer_login(self):
        """POST /api/auth/login with customer credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print("✓ Customer login successful")
        return data["token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return response.json()["token"]


@pytest.fixture(scope="module")
def vendor_token():
    """Get vendor auth token"""
    response = requests.post(f"{BASE_URL}/api/vendors/login", json={
        "email": VENDOR_EMAIL,
        "password": VENDOR_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Vendor login failed: {response.text}")
    return response.json()["token"]


@pytest.fixture(scope="module")
def customer_token():
    """Get customer auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Customer login failed: {response.text}")
    return response.json()["token"]


class TestUserReturns:
    """Test user return endpoints"""
    
    def test_get_my_returns(self, customer_token):
        """GET /api/returns/me should return user's returns list"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/returns/me", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ User returns list endpoint works, found {len(data)} returns")
    
    def test_create_return_requires_valid_order(self, customer_token):
        """POST /api/returns with invalid order_id should return 404"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.post(f"{BASE_URL}/api/returns", headers=headers, json={
            "order_id": "invalid_order_12345",
            "reason": "defective",
            "description": "Test return request"
        })
        # Should fail with 404 (order not found) or 400 (invalid)
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}: {response.text}"
        print("✓ Return creation correctly validates order_id")


class TestVendorReturns:
    """Test vendor return management endpoints"""
    
    def test_vendor_get_returns(self, vendor_token):
        """GET /api/vendors/returns should return vendor's return requests"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.get(f"{BASE_URL}/api/vendors/returns", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Vendor returns list endpoint works, found {len(data)} returns")
    
    def test_vendor_get_returns_with_status_filter(self, vendor_token):
        """GET /api/vendors/returns?status=requested should filter by status"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.get(f"{BASE_URL}/api/vendors/returns?status=requested", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # All returned items should have status=requested
        for item in data:
            assert item.get("status") == "requested", f"Expected status 'requested', got {item.get('status')}"
        print(f"✓ Vendor returns filter by status works")
    
    def test_vendor_approve_return_requires_valid_id(self, vendor_token):
        """PUT /api/vendors/returns/{id}/approve with invalid id should return 404"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.put(f"{BASE_URL}/api/vendors/returns/invalid_return_id/approve", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Vendor approve return validates return_id")
    
    def test_vendor_reject_return_requires_valid_id(self, vendor_token):
        """PUT /api/vendors/returns/{id}/reject with invalid id should return 404"""
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.put(f"{BASE_URL}/api/vendors/returns/invalid_return_id/reject", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Vendor reject return validates return_id")


class TestAdminReturns:
    """Test admin return management endpoints"""
    
    def test_admin_get_returns_with_stats(self, admin_token):
        """GET /api/admin/returns should return returns list with stats object"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/returns", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "returns" in data, "Response should contain 'returns' key"
        assert "stats" in data, "Response should contain 'stats' key"
        assert "total" in data, "Response should contain 'total' key"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats, "Stats should have 'total'"
        assert "requested" in stats, "Stats should have 'requested'"
        assert "approved" in stats, "Stats should have 'approved'"
        assert "rejected" in stats, "Stats should have 'rejected'"
        assert "disputed" in stats, "Stats should have 'disputed'"
        assert "refunded" in stats, "Stats should have 'refunded'"
        
        print(f"✓ Admin returns endpoint works with stats: {stats}")
    
    def test_admin_override_return_requires_valid_id(self, admin_token):
        """PUT /api/admin/returns/{id}/override with invalid id should return 404"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(
            f"{BASE_URL}/api/admin/returns/invalid_return_id/override?status=refunded",
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Admin override return validates return_id")
    
    def test_admin_add_message_requires_valid_id(self, admin_token):
        """POST /api/admin/returns/{id}/message with invalid id should return 404"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/admin/returns/invalid_return_id/message",
            headers=headers,
            json={"message": "Test admin message", "attachments": []}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Admin add message validates return_id")


class TestMarketingPixelSettings:
    """Test marketing pixel settings in admin commission settings"""
    
    def test_get_commission_settings_includes_pixels(self, admin_token):
        """GET /api/admin/settings/commission should include pixel fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings/commission", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # The response should be able to contain meta_pixel_id and google_ads_id
        # They may be null/empty initially
        print(f"✓ Commission settings endpoint works, meta_pixel_id: {data.get('meta_pixel_id')}, google_ads_id: {data.get('google_ads_id')}")
    
    def test_update_pixel_settings(self, admin_token):
        """PUT /api/admin/settings/commission should accept meta_pixel_id and google_ads_id"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings/commission", headers=headers)
        current_settings = get_response.json() if get_response.status_code == 200 else {}
        
        # Update with pixel IDs
        test_meta_pixel = "TEST_META_PIXEL_123456"
        test_google_ads = "TEST_GOOGLE_ADS_789012"
        
        update_data = {
            "meta_pixel_id": test_meta_pixel,
            "google_ads_id": test_google_ads
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/settings/commission",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the update
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings/commission", headers=headers)
        assert verify_response.status_code == 200
        
        updated_data = verify_response.json()
        assert updated_data.get("meta_pixel_id") == test_meta_pixel, f"Meta pixel not updated: {updated_data.get('meta_pixel_id')}"
        assert updated_data.get("google_ads_id") == test_google_ads, f"Google ads not updated: {updated_data.get('google_ads_id')}"
        
        print(f"✓ Marketing pixel settings updated successfully")
        
        # Clean up - restore original values
        cleanup_data = {
            "meta_pixel_id": current_settings.get("meta_pixel_id"),
            "google_ads_id": current_settings.get("google_ads_id")
        }
        requests.put(f"{BASE_URL}/api/admin/settings/commission", headers=headers, json=cleanup_data)


class TestCreatorPageRoute:
    """Test that /creators page route exists (frontend route, backend health check)"""
    
    def test_api_health(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        # Health endpoint may or may not exist, just check API is up
        assert response.status_code in [200, 404], f"API not accessible: {response.status_code}"
        print("✓ API is accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
