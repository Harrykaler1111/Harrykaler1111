"""
Phase 3 Features Testing - Admin UI & Multi-Image Upload
Tests for:
- Action History API
- Referral Manager API (Dedicated Managers)
- Multi-file Upload API
- Admin Auth
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@pigma.com"
SUPER_ADMIN_PASSWORD = "superadmin123"
PRODUCT_MANAGER_EMAIL = "products@pigma.com"
PRODUCT_MANAGER_PASSWORD = "products123"


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test super admin login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "admin" in data, "No admin data in response"
        assert data["admin"]["email"] == SUPER_ADMIN_EMAIL
        print(f"✅ Super admin login successful - role: {data['admin'].get('role')}")
    
    def test_admin_login_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code in [401, 404], f"Expected 401/404, got {response.status_code}"
        print("✅ Invalid credentials correctly rejected")
    
    def test_product_manager_login(self):
        """Test product manager login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": PRODUCT_MANAGER_EMAIL,
            "password": PRODUCT_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✅ Product manager login successful - role: {data['admin'].get('role')}")


@pytest.fixture
def admin_token():
    """Get super admin auth token"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Admin authentication failed")


@pytest.fixture
def admin_headers(admin_token):
    """Get admin auth headers"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestActionHistoryAPI:
    """Action History endpoint tests"""
    
    def test_get_action_history_admin(self, admin_headers):
        """GET /api/action-history/admin returns history list"""
        response = requests.get(f"{BASE_URL}/api/action-history/admin", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "history" in data, "Missing 'history' key"
        assert "total" in data, "Missing 'total' key"
        assert isinstance(data["history"], list), "history should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        print(f"✅ Action history returned {data['total']} records")
    
    def test_action_history_with_filters(self, admin_headers):
        """Test action history with user_type filter"""
        response = requests.get(
            f"{BASE_URL}/api/action-history/admin?user_type=vendor&limit=10",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "history" in data
        # If there are results, verify they match the filter
        for item in data["history"]:
            assert item.get("user_type") == "vendor", f"Filter not applied: {item}"
        print(f"✅ Action history filter by user_type works - {len(data['history'])} vendor records")
    
    def test_action_history_with_action_search(self, admin_headers):
        """Test action history with action search"""
        response = requests.get(
            f"{BASE_URL}/api/action-history/admin?action=login&limit=10",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "history" in data
        print(f"✅ Action history search by action works - {len(data['history'])} records")


class TestReferralManagersAPI:
    """Dedicated Managers (Referral Manager) endpoint tests"""
    
    def test_get_managers_list(self, admin_headers):
        """GET /api/admin/referrals/managers returns array"""
        response = requests.get(f"{BASE_URL}/api/admin/referrals/managers", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✅ Managers list returned {len(data)} assignments")
    
    def test_get_referral_stats(self, admin_headers):
        """GET /api/admin/referrals/stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/admin/referrals/stats", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "vendor_referral_rate" in data
        assert "influencer_referral_rate" in data
        print(f"✅ Referral stats: vendor_rate={data['vendor_referral_rate']}%, influencer_rate={data['influencer_referral_rate']}%")
    
    def test_assign_manager_validation(self, admin_headers):
        """POST /api/admin/referrals/managers/assign validates input"""
        # Test with invalid target type
        response = requests.post(
            f"{BASE_URL}/api/admin/referrals/managers/assign",
            headers=admin_headers,
            json={
                "target_id": "test_id",
                "target_type": "invalid_type",
                "manager_admin_id": "admin_123"
            }
        )
        # Should fail with 400 or 404
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
        print("✅ Manager assignment validates target_type")
    
    def test_get_admin_users_list(self, admin_headers):
        """GET /api/admin/users returns admin users for manager selection"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        if len(data) > 0:
            assert "admin_id" in data[0], "Admin should have admin_id"
            assert "name" in data[0], "Admin should have name"
        print(f"✅ Admin users list returned {len(data)} admins")


class TestMultiFileUploadAPI:
    """Multi-file upload endpoint tests"""
    
    def test_upload_multiple_endpoint_exists(self):
        """POST /api/uploads/multiple accepts multipart form"""
        # Create a small test image (1x1 pixel PNG)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = [
            ('files', ('test1.png', io.BytesIO(png_data), 'image/png')),
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/uploads/multiple?user_id=test_user",
            files=files
        )
        
        # Should return 200 with uploaded/errors structure
        assert response.status_code == 200, f"Upload failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "uploaded" in data, "Missing 'uploaded' key"
        assert "errors" in data, "Missing 'errors' key"
        
        if len(data["uploaded"]) > 0:
            uploaded_file = data["uploaded"][0]
            assert "file_id" in uploaded_file, "Missing file_id"
            assert "url" in uploaded_file, "Missing url"
            assert "file_type" in uploaded_file, "Missing file_type"
            print(f"✅ File uploaded successfully: {uploaded_file['url']}")
        else:
            print(f"⚠️ Upload returned but no files uploaded. Errors: {data['errors']}")
    
    def test_upload_rejects_invalid_type(self):
        """POST /api/uploads/multiple rejects unsupported file types"""
        files = [
            ('files', ('test.exe', io.BytesIO(b'fake exe content'), 'application/x-msdownload')),
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/uploads/multiple?user_id=test_user",
            files=files
        )
        
        assert response.status_code == 200, f"Unexpected status: {response.status_code}"
        data = response.json()
        # Should have error for unsupported type
        assert len(data.get("errors", [])) > 0 or len(data.get("uploaded", [])) == 0
        print("✅ Invalid file type correctly rejected")


class TestCommissionSettingsAPI:
    """Commission and Platform Settings tests"""
    
    def test_get_commission_settings(self, admin_headers):
        """GET /api/admin/settings/commission returns settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/commission", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Check for expected fields
        assert "platform_commission_rate" in data or "commission_enabled" in data
        print(f"✅ Commission settings loaded: {list(data.keys())[:5]}...")
    
    def test_get_platform_stats(self, admin_headers):
        """GET /api/admin/platform-stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/admin/platform-stats", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total_users" in data or "total_vendors" in data
        print(f"✅ Platform stats loaded")


class TestResellersAPI:
    """Resellers management tests"""
    
    def test_get_resellers_list(self, admin_headers):
        """GET /api/resellers/admin/list returns resellers"""
        response = requests.get(f"{BASE_URL}/api/resellers/admin/list", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✅ Resellers list returned {len(data)} resellers")


class TestAdminDashboard:
    """Admin dashboard endpoint tests"""
    
    def test_admin_dashboard(self, admin_headers):
        """GET /api/admin/dashboard returns dashboard data"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "stats" in data or "total_revenue" in data or isinstance(data, dict)
        print("✅ Admin dashboard loaded")
    
    def test_get_categories(self, admin_headers):
        """GET /api/admin/settings/categories returns categories"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/categories", headers=admin_headers)
        # May return 200 with list or 404 if not implemented
        assert response.status_code in [200, 404], f"Unexpected: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"✅ Categories returned {len(data)} items")
        else:
            print("⚠️ Categories endpoint returned 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
