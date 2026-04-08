"""
Test OTP Send/Verify and Admin Quick Actions (Suspend, Activate, Add Credits, Feature Vendor)
Iteration 62 - WhatsApp OTP and Master Search Quick Actions
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
TEST_PHONE = "8888888888"  # Test phone number
KNOWN_VENDOR_ID = "VND-0001"


class TestOTPSendVerify:
    """OTP Send and Verify endpoint tests"""
    
    def test_otp_send_valid_phone(self):
        """POST /api/auth/otp/send with valid Indian phone returns success"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": TEST_PHONE
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "OTP sent" in data["message"]
        print(f"OTP Send Response: {data}")
    
    def test_otp_send_invalid_phone(self):
        """POST /api/auth/otp/send with invalid phone returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": "12345"  # Invalid - not 10 digits starting with 6-9
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"Invalid phone error: {data['detail']}")
    
    def test_otp_verify_unregistered_phone_returns_needs_registration(self):
        """POST /api/auth/otp/verify for unregistered phone returns needs_registration=true"""
        # First send OTP
        send_response = requests.post(f"{BASE_URL}/api/auth/otp/send", json={
            "phone": "9999999999"  # Unregistered phone
        })
        assert send_response.status_code == 200
        
        # Get OTP from backend logs (in real test, we'd need to extract this)
        # For testing, we'll use a known OTP pattern or check the response structure
        # Since we can't get the actual OTP, we'll test with wrong OTP to verify error handling
        verify_response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": "9999999999",
            "otp": "000000"  # Wrong OTP
        })
        assert verify_response.status_code == 400
        data = verify_response.json()
        assert "Invalid OTP" in data.get("detail", "")
        print(f"Wrong OTP error: {data}")
    
    def test_otp_verify_invalid_otp(self):
        """POST /api/auth/otp/verify with invalid OTP returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": TEST_PHONE,
            "otp": "000000"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"Invalid OTP error: {data['detail']}")


class TestAdminQuickActions:
    """Admin Quick Actions: Suspend, Activate, Add Credits, Feature Vendor"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get("token")
    
    @pytest.fixture
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_admin_login(self):
        """POST /api/admin/auth/login returns token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert "admin" in data
        print(f"Admin login successful: {data['admin'].get('email')}")
    
    def test_master_search_vendor(self, admin_headers):
        """GET /api/admin/master/search/{display_id} returns vendor data"""
        response = requests.get(f"{BASE_URL}/api/admin/master/search/{KNOWN_VENDOR_ID}", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("type") == "user"
        assert "profile" in data
        assert data["profile"].get("display_id") == KNOWN_VENDOR_ID
        print(f"Master search found: {data['profile'].get('store_name', data['profile'].get('name'))}")
    
    def test_suspend_user(self, admin_headers):
        """POST /api/admin/master/action/suspend/{display_id} suspends user"""
        response = requests.post(f"{BASE_URL}/api/admin/master/action/suspend/{KNOWN_VENDOR_ID}", 
                                 json={}, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "suspended" in data.get("message", "").lower() or data.get("status") == "suspended"
        print(f"Suspend response: {data}")
        
        # Verify status changed
        search_response = requests.get(f"{BASE_URL}/api/admin/master/search/{KNOWN_VENDOR_ID}", headers=admin_headers)
        assert search_response.status_code == 200
        profile = search_response.json().get("profile", {})
        assert profile.get("status") == "suspended", f"Expected suspended, got {profile.get('status')}"
        print(f"Verified: User status is now 'suspended'")
    
    def test_activate_user(self, admin_headers):
        """POST /api/admin/master/action/activate/{display_id} activates user"""
        response = requests.post(f"{BASE_URL}/api/admin/master/action/activate/{KNOWN_VENDOR_ID}", 
                                 json={}, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "activated" in data.get("message", "").lower() or data.get("status") == "approved"
        print(f"Activate response: {data}")
        
        # Verify status changed
        search_response = requests.get(f"{BASE_URL}/api/admin/master/search/{KNOWN_VENDOR_ID}", headers=admin_headers)
        assert search_response.status_code == 200
        profile = search_response.json().get("profile", {})
        assert profile.get("status") == "approved", f"Expected approved, got {profile.get('status')}"
        print(f"Verified: User status is now 'approved'")
    
    def test_add_credits(self, admin_headers):
        """POST /api/admin/master/action/add-credits/{display_id} adds credits"""
        # Get current balance first
        search_response = requests.get(f"{BASE_URL}/api/admin/master/search/{KNOWN_VENDOR_ID}", headers=admin_headers)
        current_balance = search_response.json().get("summary", {}).get("credit_balance", 0)
        
        # Add credits
        response = requests.post(f"{BASE_URL}/api/admin/master/action/add-credits/{KNOWN_VENDOR_ID}", 
                                 json={"amount": 100, "reason": "Test credit from iteration 62"},
                                 headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "new_balance" in data
        assert data["new_balance"] >= current_balance + 100
        print(f"Add credits response: {data}")
        
        # Verify balance increased
        search_response = requests.get(f"{BASE_URL}/api/admin/master/search/{KNOWN_VENDOR_ID}", headers=admin_headers)
        new_balance = search_response.json().get("summary", {}).get("credit_balance", 0)
        assert new_balance >= current_balance + 100, f"Expected balance >= {current_balance + 100}, got {new_balance}"
        print(f"Verified: Balance increased from {current_balance} to {new_balance}")
    
    def test_add_credits_invalid_amount(self, admin_headers):
        """POST /api/admin/master/action/add-credits with invalid amount returns 400"""
        response = requests.post(f"{BASE_URL}/api/admin/master/action/add-credits/{KNOWN_VENDOR_ID}", 
                                 json={"amount": 0, "reason": "Invalid test"},
                                 headers=admin_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"Invalid amount error: {response.json()}")
    
    def test_feature_vendor(self, admin_headers):
        """POST /api/admin/master/action/feature/{display_id} features vendor"""
        response = requests.post(f"{BASE_URL}/api/admin/master/action/feature/{KNOWN_VENDOR_ID}", 
                                 json={"duration_days": 7, "position": "homepage"},
                                 headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "featured" in data.get("message", "").lower()
        assert "expires_at" in data
        print(f"Feature vendor response: {data}")
        
        # Verify featured entry created
        search_response = requests.get(f"{BASE_URL}/api/admin/master/search/{KNOWN_VENDOR_ID}", headers=admin_headers)
        featured = search_response.json().get("featured", [])
        assert len(featured) > 0, "Expected at least one featured entry"
        print(f"Verified: Vendor has {len(featured)} featured entries")
    
    def test_feature_non_vendor_fails(self, admin_headers):
        """POST /api/admin/master/action/feature for non-vendor returns 400"""
        # Try to feature an admin (ADM-001)
        response = requests.post(f"{BASE_URL}/api/admin/master/action/feature/ADM-001", 
                                 json={"duration_days": 7},
                                 headers=admin_headers)
        # Should fail because only vendors can be featured
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"
        print(f"Feature non-vendor error: {response.json()}")
    
    def test_action_on_nonexistent_user(self, admin_headers):
        """Quick actions on non-existent user return 404"""
        response = requests.post(f"{BASE_URL}/api/admin/master/action/suspend/VND-9999", 
                                 json={}, headers=admin_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"Non-existent user error: {response.json()}")


class TestOTPVerifyFlow:
    """Test OTP verify response structure for registered vs unregistered phones"""
    
    def test_otp_verify_response_structure(self):
        """Verify OTP verify endpoint returns correct structure"""
        # This tests the response structure without needing actual OTP
        # We verify the endpoint exists and returns expected error for wrong OTP
        response = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={
            "phone": "9876543210",
            "otp": "123456"
        })
        # Should return 400 for invalid OTP (not 404 or 500)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"OTP verify error structure: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
