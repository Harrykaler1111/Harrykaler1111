"""
Test Suite for Unified ID-based Tracking and Master Search System
Tests:
- Display ID generation and migration
- Master Search API endpoints
- Autocomplete functionality
- Vendor dashboard display_id
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"


class TestMasterSearchBackend:
    """Test Master Search API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            self.admin_token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_01_admin_login_success(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✓ Admin login successful")
    
    def test_02_master_search_vnd_0001(self):
        """Test Master Search for VND-0001 returns full user data"""
        response = self.session.get(f"{BASE_URL}/api/admin/master/search/VND-0001")
        assert response.status_code == 200, f"Master search failed: {response.text}"
        
        data = response.json()
        assert data.get("type") == "user", "Expected type 'user'"
        assert "profile" in data, "Missing profile in response"
        assert "products" in data, "Missing products in response"
        assert "promotions" in data, "Missing promotions in response"
        assert "credit_transactions" in data, "Missing credit_transactions in response"
        assert "issues" in data, "Missing issues in response"
        assert "activity" in data, "Missing activity in response"
        assert "orders" in data, "Missing orders in response"
        assert "summary" in data, "Missing summary in response"
        
        profile = data["profile"]
        assert profile.get("display_id") == "VND-0001", f"Expected VND-0001, got {profile.get('display_id')}"
        assert profile.get("user_role") == "vendor", f"Expected vendor role, got {profile.get('user_role')}"
        
        # Verify summary stats structure
        summary = data["summary"]
        assert "total_products" in summary
        assert "total_promotions" in summary
        assert "total_issues" in summary
        assert "total_orders" in summary
        assert "credit_balance" in summary
        
        print(f"✓ Master search VND-0001 returned full data with {summary.get('total_products')} products")
    
    def test_03_master_search_autocomplete(self):
        """Test autocomplete returns matching users"""
        response = self.session.get(f"{BASE_URL}/api/admin/master/search-autocomplete?q=test")
        assert response.status_code == 200, f"Autocomplete failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        if len(data) > 0:
            first_result = data[0]
            assert "display_id" in first_result, "Missing display_id in autocomplete result"
            assert "name" in first_result, "Missing name in autocomplete result"
            assert "email" in first_result, "Missing email in autocomplete result"
            assert "role" in first_result, "Missing role in autocomplete result"
            print(f"✓ Autocomplete returned {len(data)} results for 'test'")
        else:
            print("✓ Autocomplete returned empty list (no matches)")
    
    def test_04_master_search_autocomplete_by_display_id(self):
        """Test autocomplete by display_id prefix"""
        response = self.session.get(f"{BASE_URL}/api/admin/master/search-autocomplete?q=VND")
        assert response.status_code == 200, f"Autocomplete failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        
        # Should find vendors with VND prefix
        vendor_results = [r for r in data if r.get("display_id", "").startswith("VND")]
        print(f"✓ Autocomplete for 'VND' returned {len(vendor_results)} vendor results")
    
    def test_05_run_migration_endpoint(self):
        """Test migration endpoint returns stats"""
        response = self.session.post(f"{BASE_URL}/api/admin/master/run-migration")
        assert response.status_code == 200, f"Migration failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message in response"
        assert "migrated" in data, "Missing migrated stats in response"
        
        migrated = data["migrated"]
        print(f"✓ Migration complete: {migrated}")
    
    def test_06_master_search_not_found(self):
        """Test Master Search returns 404 for non-existent ID"""
        response = self.session.get(f"{BASE_URL}/api/admin/master/search/VND-9999")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Master search returns 404 for non-existent ID")
    
    def test_07_master_search_case_insensitive(self):
        """Test Master Search is case insensitive"""
        response = self.session.get(f"{BASE_URL}/api/admin/master/search/vnd-0001")
        assert response.status_code == 200, f"Case insensitive search failed: {response.text}"
        
        data = response.json()
        assert data.get("profile", {}).get("display_id") == "VND-0001"
        print("✓ Master search is case insensitive")


class TestVendorDisplayId:
    """Test vendor display_id in dashboard"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup vendor token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as vendor
        login_response = self.session.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if login_response.status_code == 200:
            self.vendor_token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.vendor_token}"})
        else:
            pytest.skip(f"Vendor login failed: {login_response.status_code}")
    
    def test_01_vendor_login_success(self):
        """Test vendor login works"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print("✓ Vendor login successful")
    
    def test_02_vendor_me_has_display_id(self):
        """Test vendor /me endpoint returns display_id"""
        response = self.session.get(f"{BASE_URL}/api/vendors/me")
        assert response.status_code == 200, f"Vendor me failed: {response.text}"
        
        data = response.json()
        assert "display_id" in data, "Missing display_id in vendor profile"
        assert data["display_id"].startswith("VND-"), f"Expected VND- prefix, got {data['display_id']}"
        
        print(f"✓ Vendor profile has display_id: {data['display_id']}")


class TestDisplayIdFormats:
    """Test display_id formats for different user types"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            self.admin_token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_01_search_reseller_format(self):
        """Test RSL-XXXX format for resellers"""
        response = self.session.get(f"{BASE_URL}/api/admin/master/search-autocomplete?q=RSL")
        assert response.status_code == 200
        
        data = response.json()
        reseller_results = [r for r in data if r.get("display_id", "").startswith("RSL-")]
        if reseller_results:
            assert reseller_results[0]["role"] == "reseller"
            print(f"✓ Found {len(reseller_results)} resellers with RSL- format")
        else:
            print("✓ No resellers found (may not exist in test data)")
    
    def test_02_search_affiliate_format(self):
        """Test AFF-XXXX format for affiliates"""
        response = self.session.get(f"{BASE_URL}/api/admin/master/search-autocomplete?q=AFF")
        assert response.status_code == 200
        
        data = response.json()
        affiliate_results = [r for r in data if r.get("display_id", "").startswith("AFF-")]
        if affiliate_results:
            assert affiliate_results[0]["role"] == "affiliate"
            print(f"✓ Found {len(affiliate_results)} affiliates with AFF- format")
        else:
            print("✓ No affiliates found (may not exist in test data)")
    
    def test_03_search_admin_format(self):
        """Test ADM-XXX format for admins"""
        response = self.session.get(f"{BASE_URL}/api/admin/master/search-autocomplete?q=ADM")
        assert response.status_code == 200
        
        data = response.json()
        admin_results = [r for r in data if r.get("display_id", "").startswith("ADM-")]
        if admin_results:
            assert admin_results[0]["role"] == "admin"
            # Admin uses 3-digit padding
            assert len(admin_results[0]["display_id"]) == 7  # ADM-XXX
            print(f"✓ Found {len(admin_results)} admins with ADM-XXX format")
        else:
            print("✓ No admins with display_id found")


class TestRegressionChecks:
    """Regression tests to ensure existing functionality still works"""
    
    def test_01_homepage_loads(self):
        """Test homepage API still works"""
        response = requests.get(f"{BASE_URL}/api/products?limit=10")
        assert response.status_code == 200, f"Products API failed: {response.text}"
        print("✓ Products API working")
    
    def test_02_reels_api_works(self):
        """Test reels API still works"""
        response = requests.get(f"{BASE_URL}/api/reels?limit=10")
        assert response.status_code == 200, f"Reels API failed: {response.text}"
        print("✓ Reels API working")
    
    def test_03_admin_dashboard_works(self):
        """Test admin dashboard API still works"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        
        token = login_response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = session.get(f"{BASE_URL}/api/admin/dashboard")
        assert response.status_code == 200, f"Admin dashboard failed: {response.text}"
        print("✓ Admin dashboard API working")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
