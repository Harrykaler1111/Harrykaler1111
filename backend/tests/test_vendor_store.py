"""
Test Vendor Store Page API - Iteration 6
Tests the new public vendor store endpoint: GET /api/vendors/store/{vendor_id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from context
VENDOR_ID = "vendor_79334d552c7b"
VENDOR_EMAIL = "vendortest3@example.com"
VENDOR_PASSWORD = "vendor123"

# Sensitive fields that should NOT be exposed in public store API
SENSITIVE_FIELDS = ["password", "kyc_data", "kyc_documents", "bank_details", "wallet_balance"]


class TestVendorStoreAPI:
    """Tests for public vendor store endpoint"""
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("✅ Health check passed")
    
    def test_store_endpoint_returns_200_for_approved_vendor(self):
        """GET /api/vendors/store/{vendor_id} returns 200 for approved vendor"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify required fields exist
        assert "store_name" in data, "Missing store_name"
        assert "store_description" in data, "Missing store_description"
        assert "vendor_id" in data, "Missing vendor_id"
        assert "products" in data, "Missing products array"
        assert "review_stats" in data, "Missing review_stats"
        assert "recent_reviews" in data, "Missing recent_reviews"
        
        print(f"✅ Store endpoint returns 200 with store_name: {data['store_name']}")
    
    def test_store_endpoint_returns_correct_vendor_id(self):
        """Verify vendor_id in response matches requested vendor"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data["vendor_id"] == VENDOR_ID, f"Expected {VENDOR_ID}, got {data['vendor_id']}"
        print(f"✅ Vendor ID matches: {data['vendor_id']}")
    
    def test_store_endpoint_returns_404_for_nonexistent_vendor(self):
        """GET /api/vendors/store/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/vendor_nonexistent_12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Returns 404 for non-existent vendor")
    
    def test_store_endpoint_returns_404_for_non_approved_vendor(self):
        """Store endpoint should return 404 for vendors that are not approved"""
        # First, let's try to find a pending vendor or use a fake one
        # Since we don't have a pending vendor ID, we test with non-existent
        response = requests.get(f"{BASE_URL}/api/vendors/store/vendor_pending_test")
        assert response.status_code == 404, f"Expected 404 for non-approved vendor, got {response.status_code}"
        print("✅ Returns 404 for non-approved/non-existent vendor")
    
    def test_store_does_not_expose_password(self):
        """SECURITY: Store API must NOT expose password field"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level response
        assert "password" not in data, "SECURITY ISSUE: password exposed in store response"
        
        # Check if there's any nested vendor object
        if "vendor" in data:
            assert "password" not in data["vendor"], "SECURITY ISSUE: password exposed in vendor object"
        
        print("✅ Password NOT exposed in store response")
    
    def test_store_does_not_expose_kyc_data(self):
        """SECURITY: Store API must NOT expose kyc_data field"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "kyc_data" not in data, "SECURITY ISSUE: kyc_data exposed in store response"
        if "vendor" in data:
            assert "kyc_data" not in data["vendor"], "SECURITY ISSUE: kyc_data exposed in vendor object"
        
        print("✅ KYC data NOT exposed in store response")
    
    def test_store_does_not_expose_kyc_documents(self):
        """SECURITY: Store API must NOT expose kyc_documents field"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "kyc_documents" not in data, "SECURITY ISSUE: kyc_documents exposed in store response"
        if "vendor" in data:
            assert "kyc_documents" not in data["vendor"], "SECURITY ISSUE: kyc_documents exposed in vendor object"
        
        print("✅ KYC documents NOT exposed in store response")
    
    def test_store_does_not_expose_bank_details(self):
        """SECURITY: Store API must NOT expose bank_details field"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "bank_details" not in data, "SECURITY ISSUE: bank_details exposed in store response"
        if "vendor" in data:
            assert "bank_details" not in data["vendor"], "SECURITY ISSUE: bank_details exposed in vendor object"
        
        print("✅ Bank details NOT exposed in store response")
    
    def test_store_does_not_expose_wallet_balance(self):
        """SECURITY: Store API must NOT expose wallet_balance field"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "wallet_balance" not in data, "SECURITY ISSUE: wallet_balance exposed in store response"
        if "vendor" in data:
            assert "wallet_balance" not in data["vendor"], "SECURITY ISSUE: wallet_balance exposed in vendor object"
        
        print("✅ Wallet balance NOT exposed in store response")
    
    def test_store_returns_products_array(self):
        """Store API returns products array (may be empty)"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data, "Missing products field"
        assert isinstance(data["products"], list), "products should be a list"
        
        # Per context: vendor has 0 approved products, so expect empty array
        print(f"✅ Products array returned with {len(data['products'])} items")
    
    def test_store_returns_review_stats(self):
        """Store API returns review_stats object"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "review_stats" in data, "Missing review_stats field"
        stats = data["review_stats"]
        
        # Verify review stats structure
        expected_keys = ["avg_rating", "total", "five", "four", "three", "two", "one"]
        for key in expected_keys:
            assert key in stats, f"Missing {key} in review_stats"
        
        print(f"✅ Review stats returned: avg={stats.get('avg_rating', 0)}, total={stats.get('total', 0)}")
    
    def test_store_returns_recent_reviews(self):
        """Store API returns recent_reviews array"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "recent_reviews" in data, "Missing recent_reviews field"
        assert isinstance(data["recent_reviews"], list), "recent_reviews should be a list"
        
        print(f"✅ Recent reviews array returned with {len(data['recent_reviews'])} items")
    
    def test_store_returns_member_since(self):
        """Store API returns member_since field"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "member_since" in data, "Missing member_since field"
        print(f"✅ Member since: {data['member_since']}")
    
    def test_store_returns_total_products_count(self):
        """Store API returns total_products count"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_products" in data, "Missing total_products field"
        assert isinstance(data["total_products"], int), "total_products should be integer"
        
        # Verify total_products matches products array length
        assert data["total_products"] == len(data["products"]), "total_products should match products array length"
        
        print(f"✅ Total products: {data['total_products']}")
    
    def test_store_no_auth_required(self):
        """Store endpoint is public - no auth required"""
        # Make request without any auth headers
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200, f"Public endpoint should not require auth, got {response.status_code}"
        print("✅ Store endpoint is public (no auth required)")


class TestVendorStoreProductsFiltering:
    """Tests for product filtering in store endpoint"""
    
    def test_store_only_returns_approved_products(self):
        """Store should only return products with approval_status=approved"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # All products in response should be approved
        for product in data["products"]:
            if "approval_status" in product:
                assert product["approval_status"] == "approved", f"Non-approved product in store: {product.get('product_id')}"
        
        print(f"✅ All {len(data['products'])} products are approved (or empty)")
    
    def test_store_only_returns_active_products(self):
        """Store should only return products with is_active=True"""
        response = requests.get(f"{BASE_URL}/api/vendors/store/{VENDOR_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # All products in response should be active
        for product in data["products"]:
            if "is_active" in product:
                assert product["is_active"] == True, f"Inactive product in store: {product.get('product_id')}"
        
        print(f"✅ All {len(data['products'])} products are active (or empty)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
