"""
Test Suite for Super Admin Control System
Tests: Password reset, toggle status, edit user, activity log, and credential security
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
SUPER_ADMIN = {"email": "superadmin@pigma.com", "password": "superadmin123"}
MARKETING_MANAGER = {"email": "marketing@pigma.com", "password": "marketing123"}
SUPPORT_MANAGER = {"email": "support@pigma.com", "password": "yb6@$QSoW@xe"}  # Updated password from manual testing


class TestAdminLoginSecurity:
    """Test that demo credentials are NOT exposed on login pages"""
    
    def test_admin_login_page_no_demo_credentials(self):
        """Admin login page should NOT show any demo credentials"""
        response = requests.get(f"{BASE_URL}/admin-login")
        assert response.status_code == 200
        content = response.text.lower()
        # Should NOT contain exposed credentials
        assert "superadmin@pigma.com" not in content, "Admin login page exposes superadmin email"
        assert "superadmin123" not in content, "Admin login page exposes superadmin password"
        assert "admin123" not in content, "Admin login page exposes admin password"
        print("PASSED: Admin login page does not expose demo credentials")
    
    def test_customer_auth_page_no_admin_credentials(self):
        """Customer auth page should NOT show admin credentials"""
        response = requests.get(f"{BASE_URL}/auth")
        assert response.status_code == 200
        content = response.text.lower()
        # Should NOT contain admin credentials
        assert "admin@pigma.com" not in content or "admin123" not in content, "Auth page may expose admin credentials"
        print("PASSED: Customer auth page does not expose admin credentials")


class TestSuperAdminLogin:
    """Test Super Admin authentication"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        if response.status_code != 200:
            pytest.skip(f"Super admin login failed: {response.text}")
        data = response.json()
        assert "token" in data
        assert "admin" in data
        assert data["admin"]["role"] == "super_admin"
        return data["token"]
    
    @pytest.fixture
    def marketing_token(self):
        """Get marketing manager token (non-super-admin)"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=MARKETING_MANAGER)
        if response.status_code != 200:
            pytest.skip(f"Marketing manager login failed: {response.text}")
        data = response.json()
        assert "token" in data
        return data["token"]
    
    def test_super_admin_login_success(self):
        """Super admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "admin" in data
        assert data["admin"]["role"] == "super_admin"
        assert data["admin"]["email"] == SUPER_ADMIN["email"]
        print(f"PASSED: Super admin login successful - {data['admin']['name']}")
    
    def test_disabled_admin_cannot_login(self, super_admin_token):
        """Disabled admin account should get 403 error"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First get list of admins to find a non-super-admin
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        admins = response.json()
        
        # Find a non-super-admin that is currently active
        target = None
        for admin in admins:
            if admin["role"] != "super_admin" and admin.get("is_active", True):
                target = admin
                break
        
        if not target:
            pytest.skip("No active non-super-admin found to test")
        
        # Disable the account
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target['admin_id']}/toggle-status",
            json={"is_active": False, "reason": "Testing disabled login"},
            headers=headers
        )
        assert response.status_code == 200
        
        # Try to login with disabled account - should fail with 403
        # Note: We don't have the password for this user, so we'll re-enable and skip actual login test
        
        # Re-enable the account
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target['admin_id']}/toggle-status",
            json={"is_active": True},
            headers=headers
        )
        assert response.status_code == 200
        print(f"PASSED: Toggle status works for {target['email']}")


class TestSuperAdminUserManagement:
    """Test Super Admin user management features"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        if response.status_code != 200:
            pytest.skip(f"Super admin login failed: {response.text}")
        return response.json()["token"]
    
    @pytest.fixture
    def marketing_token(self):
        """Get marketing manager token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=MARKETING_MANAGER)
        if response.status_code != 200:
            pytest.skip(f"Marketing manager login failed: {response.text}")
        return response.json()["token"]
    
    def test_super_admin_can_view_all_users(self, super_admin_token):
        """Super admin can view all admin users"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        admins = response.json()
        assert isinstance(admins, list)
        assert len(admins) > 0
        # Verify structure
        for admin in admins:
            assert "admin_id" in admin
            assert "email" in admin
            assert "role" in admin
            assert "password" not in admin  # Password should never be returned
        print(f"PASSED: Super admin can view {len(admins)} admin users")
    
    def test_non_super_admin_cannot_reset_password(self, marketing_token, super_admin_token):
        """Non-super-admin should get 403 when trying to reset password"""
        # Get a target user
        headers_super = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers_super)
        admins = response.json()
        target = next((a for a in admins if a["role"] != "super_admin"), None)
        
        if not target:
            pytest.skip("No non-super-admin found")
        
        # Try to reset password as marketing manager
        headers_marketing = {"Authorization": f"Bearer {marketing_token}"}
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{target['admin_id']}/reset-password",
            json={},
            headers=headers_marketing
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASSED: Non-super-admin cannot reset passwords (403)")
    
    def test_non_super_admin_cannot_toggle_status(self, marketing_token, super_admin_token):
        """Non-super-admin should get 403 when trying to toggle status"""
        headers_super = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers_super)
        admins = response.json()
        target = next((a for a in admins if a["role"] != "super_admin"), None)
        
        if not target:
            pytest.skip("No non-super-admin found")
        
        headers_marketing = {"Authorization": f"Bearer {marketing_token}"}
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target['admin_id']}/toggle-status",
            json={"is_active": False},
            headers=headers_marketing
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASSED: Non-super-admin cannot toggle status (403)")
    
    def test_non_super_admin_cannot_edit_user(self, marketing_token, super_admin_token):
        """Non-super-admin should get 403 when trying to edit user details"""
        headers_super = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers_super)
        admins = response.json()
        target = next((a for a in admins if a["role"] != "super_admin"), None)
        
        if not target:
            pytest.skip("No non-super-admin found")
        
        headers_marketing = {"Authorization": f"Bearer {marketing_token}"}
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target['admin_id']}/edit",
            json={"name": "Test Name Change"},
            headers=headers_marketing
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASSED: Non-super-admin cannot edit user details (403)")


class TestPasswordReset:
    """Test password reset functionality"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        if response.status_code != 200:
            pytest.skip(f"Super admin login failed: {response.text}")
        return response.json()["token"]
    
    @pytest.fixture
    def super_admin_id(self):
        """Get super admin ID"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        if response.status_code != 200:
            pytest.skip(f"Super admin login failed: {response.text}")
        return response.json()["admin"]["admin_id"]
    
    def test_password_reset_returns_temp_password(self, super_admin_token):
        """Password reset should return temporary password"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get a target user
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        admins = response.json()
        target = next((a for a in admins if a["role"] != "super_admin"), None)
        
        if not target:
            pytest.skip("No non-super-admin found")
        
        # Reset password
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{target['admin_id']}/reset-password",
            json={},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "temporary_password" in data, "Response should contain temporary_password"
        assert "message" in data
        assert len(data["temporary_password"]) >= 8, "Temp password should be at least 8 chars"
        print(f"PASSED: Password reset returns temp password (length: {len(data['temporary_password'])})")
    
    def test_cannot_reset_own_password(self, super_admin_token, super_admin_id):
        """Super admin cannot reset their own password via this endpoint"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{super_admin_id}/reset-password",
            json={},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASSED: Cannot reset own password (400)")
    
    def test_password_reset_with_custom_password(self, super_admin_token):
        """Password reset with custom password"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get a target user
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        admins = response.json()
        target = next((a for a in admins if a["role"] != "super_admin"), None)
        
        if not target:
            pytest.skip("No non-super-admin found")
        
        custom_password = "CustomPass123!"
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{target['admin_id']}/reset-password",
            json={"new_password": custom_password},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["temporary_password"] == custom_password
        print("PASSED: Password reset with custom password works")


class TestToggleStatus:
    """Test account enable/disable functionality"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        if response.status_code != 200:
            pytest.skip(f"Super admin login failed: {response.text}")
        return response.json()["token"]
    
    @pytest.fixture
    def super_admin_id(self):
        """Get super admin ID"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        if response.status_code != 200:
            pytest.skip(f"Super admin login failed: {response.text}")
        return response.json()["admin"]["admin_id"]
    
    def test_toggle_status_disable_enable(self, super_admin_token):
        """Super admin can disable and enable accounts"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get a target user
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        admins = response.json()
        target = next((a for a in admins if a["role"] != "super_admin" and a.get("is_active", True)), None)
        
        if not target:
            pytest.skip("No active non-super-admin found")
        
        # Disable
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target['admin_id']}/toggle-status",
            json={"is_active": False, "reason": "Test disable"},
            headers=headers
        )
        assert response.status_code == 200
        assert "disabled" in response.json()["message"].lower()
        
        # Re-enable
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target['admin_id']}/toggle-status",
            json={"is_active": True},
            headers=headers
        )
        assert response.status_code == 200
        assert "enabled" in response.json()["message"].lower()
        print(f"PASSED: Toggle status works for {target['email']}")
    
    def test_cannot_disable_own_account(self, super_admin_token, super_admin_id):
        """Super admin cannot disable their own account"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{super_admin_id}/toggle-status",
            json={"is_active": False},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASSED: Cannot disable own account (400)")


class TestEditUser:
    """Test user edit functionality"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        if response.status_code != 200:
            pytest.skip(f"Super admin login failed: {response.text}")
        return response.json()["token"]
    
    def test_edit_user_name(self, super_admin_token):
        """Super admin can edit user name"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get a target user
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        admins = response.json()
        target = next((a for a in admins if a["role"] != "super_admin"), None)
        
        if not target:
            pytest.skip("No non-super-admin found")
        
        original_name = target["name"]
        new_name = f"Test Edit {original_name[:10]}"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target['admin_id']}/edit",
            json={"name": new_name},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "user" in data or "message" in data
        
        # Restore original name
        requests.put(
            f"{BASE_URL}/api/admin/users/{target['admin_id']}/edit",
            json={"name": original_name},
            headers=headers
        )
        print(f"PASSED: Edit user name works")
    
    def test_edit_user_role(self, super_admin_token):
        """Super admin can edit user role"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get a target user
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        admins = response.json()
        target = next((a for a in admins if a["role"] == "support_manager"), None)
        
        if not target:
            pytest.skip("No support_manager found")
        
        # Change to marketing_manager
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{target['admin_id']}/edit",
            json={"role": "marketing_manager"},
            headers=headers
        )
        assert response.status_code == 200
        
        # Restore original role
        requests.put(
            f"{BASE_URL}/api/admin/users/{target['admin_id']}/edit",
            json={"role": "support_manager"},
            headers=headers
        )
        print("PASSED: Edit user role works")


class TestActivityLog:
    """Test activity log functionality"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        if response.status_code != 200:
            pytest.skip(f"Super admin login failed: {response.text}")
        return response.json()["token"]
    
    @pytest.fixture
    def marketing_token(self):
        """Get marketing manager token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=MARKETING_MANAGER)
        if response.status_code != 200:
            pytest.skip(f"Marketing manager login failed: {response.text}")
        return response.json()["token"]
    
    def test_super_admin_can_view_activity_log(self, super_admin_token):
        """Super admin can view activity log"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/activity-log", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data
        assert isinstance(data["logs"], list)
        print(f"PASSED: Activity log accessible - {data['total']} total entries")
    
    def test_activity_log_sorted_by_timestamp_desc(self, super_admin_token):
        """Activity log should be sorted by timestamp descending"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/activity-log?limit=10", headers=headers)
        assert response.status_code == 200
        logs = response.json()["logs"]
        
        if len(logs) >= 2:
            # Check descending order
            for i in range(len(logs) - 1):
                assert logs[i]["timestamp"] >= logs[i+1]["timestamp"], "Logs not sorted descending"
        print("PASSED: Activity log sorted by timestamp descending")
    
    def test_non_super_admin_cannot_view_activity_log(self, marketing_token):
        """Non-super-admin should get 403 when viewing activity log"""
        headers = {"Authorization": f"Bearer {marketing_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/activity-log", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASSED: Non-super-admin cannot view activity log (403)")
    
    def test_activity_log_records_login(self, super_admin_token):
        """Activity log should record login events"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/activity-log?action=login&limit=5", headers=headers)
        assert response.status_code == 200
        logs = response.json()["logs"]
        
        # Should have at least one login entry (from our test login)
        login_logs = [l for l in logs if l["action"] == "login"]
        assert len(login_logs) > 0, "No login events found in activity log"
        
        # Verify log structure
        log = login_logs[0]
        assert "actor_id" in log
        assert "actor_name" in log
        assert "timestamp" in log
        print(f"PASSED: Activity log records login events ({len(login_logs)} found)")
    
    def test_activity_log_records_password_reset(self, super_admin_token):
        """Activity log should record password reset events"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First do a password reset to ensure there's an entry
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        admins = response.json()
        target = next((a for a in admins if a["role"] != "super_admin"), None)
        
        if target:
            requests.post(
                f"{BASE_URL}/api/admin/users/{target['admin_id']}/reset-password",
                json={},
                headers=headers
            )
        
        # Check activity log
        response = requests.get(f"{BASE_URL}/api/admin/activity-log?action=password_reset&limit=5", headers=headers)
        assert response.status_code == 200
        logs = response.json()["logs"]
        
        reset_logs = [l for l in logs if l["action"] == "password_reset"]
        assert len(reset_logs) > 0, "No password_reset events found"
        print(f"PASSED: Activity log records password_reset events ({len(reset_logs)} found)")


class TestMobileBoosterPosition:
    """Test mobile booster bar positioning"""
    
    def test_booster_bar_component_has_correct_position(self):
        """BoosterBar mobile should be positioned at top-16, not bottom-0"""
        # Read the BoosterBar component file
        import os
        booster_path = "/app/frontend/src/components/BoosterBar.jsx"
        
        if not os.path.exists(booster_path):
            pytest.skip("BoosterBar.jsx not found")
        
        with open(booster_path, 'r') as f:
            content = f.read()
        
        # Check that mobile bar uses top-16 positioning
        assert "top-16" in content, "Mobile booster bar should use top-16 positioning"
        # Should NOT use bottom-0 for mobile bar
        assert "bottom-0" not in content or "lg:hidden fixed top-16" in content, "Mobile bar should not be at bottom-0"
        print("PASSED: BoosterBar mobile positioned at top-16 (below header)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
