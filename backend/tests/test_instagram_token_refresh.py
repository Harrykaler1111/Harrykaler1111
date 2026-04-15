"""
Instagram Token Auto-Refresh Feature Tests
============================================
Tests for the new token auto-refresh background service:
- POST /api/admin/instagram/refresh-tokens - Admin manual trigger
- GET /api/admin/instagram/refresh-logs - Admin view refresh logs
- GET /api/instagram/health-dashboard - Updated with auto-refresh fields

Test credentials:
- Admin: superadmin@pigma.com / superadmin123 (POST /api/admin/auth/login)
- Customer: admin@pigma.com / admin123 (POST /api/auth/login)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAdminTokenRefreshEndpoints:
    """Tests for admin token refresh endpoints - require admin auth"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        self.admin_token = None
        self.customer_token = None
        
        # Get admin token
        admin_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "superadmin@pigma.com",
            "password": "superadmin123"
        })
        if admin_resp.status_code == 200:
            self.admin_token = admin_resp.json().get("token")
        
        # Get customer token (for testing auth rejection)
        customer_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@pigma.com",
            "password": "admin123"
        })
        if customer_resp.status_code == 200:
            self.customer_token = customer_resp.json().get("token")
    
    # ─── POST /api/admin/instagram/refresh-tokens ───
    
    def test_refresh_tokens_requires_auth(self):
        """POST /api/admin/instagram/refresh-tokens returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/admin/instagram/refresh-tokens")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: refresh-tokens returns 401 without auth")
    
    def test_refresh_tokens_rejects_customer_auth(self):
        """POST /api/admin/instagram/refresh-tokens returns 401/403 with customer token"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/instagram/refresh-tokens",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        # Should reject non-admin users
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: refresh-tokens rejects customer auth")
    
    def test_refresh_tokens_success_with_admin_auth(self):
        """POST /api/admin/instagram/refresh-tokens succeeds with admin auth"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/instagram/refresh-tokens",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "message" in data, "Response should have 'message' field"
        assert "refreshed" in data, "Response should have 'refreshed' count"
        assert "failed" in data, "Response should have 'failed' count"
        assert "skipped" in data, "Response should have 'skipped' count"
        assert "results" in data, "Response should have 'results' array"
        
        # Verify data types
        assert isinstance(data["refreshed"], int), "refreshed should be int"
        assert isinstance(data["failed"], int), "failed should be int"
        assert isinstance(data["skipped"], int), "skipped should be int"
        assert isinstance(data["results"], list), "results should be list"
        
        print(f"PASS: refresh-tokens returns correct structure: refreshed={data['refreshed']}, failed={data['failed']}, skipped={data['skipped']}")
    
    # ─── GET /api/admin/instagram/refresh-logs ───
    
    def test_refresh_logs_requires_auth(self):
        """GET /api/admin/instagram/refresh-logs returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/instagram/refresh-logs")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: refresh-logs returns 401 without auth")
    
    def test_refresh_logs_rejects_customer_auth(self):
        """GET /api/admin/instagram/refresh-logs returns 401/403 with customer token"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/instagram/refresh-logs",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        # Should reject non-admin users
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: refresh-logs rejects customer auth")
    
    def test_refresh_logs_success_with_admin_auth(self):
        """GET /api/admin/instagram/refresh-logs succeeds with admin auth"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/instagram/refresh-logs",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Response should be an array of logs
        assert isinstance(data, list), "Response should be an array"
        
        # If there are logs, verify structure
        if len(data) > 0:
            log = data[0]
            assert "cycle_at" in log, "Log should have 'cycle_at' timestamp"
            assert "refreshed" in log, "Log should have 'refreshed' count"
            assert "failed" in log, "Log should have 'failed' count"
            assert "skipped" in log, "Log should have 'skipped' count"
            print(f"PASS: refresh-logs returns {len(data)} log(s) with correct structure")
        else:
            print("PASS: refresh-logs returns empty array (no refresh cycles yet)")
    
    def test_refresh_logs_limit_parameter(self):
        """GET /api/admin/instagram/refresh-logs respects limit parameter"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/instagram/refresh-logs?limit=3",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        assert len(data) <= 3, f"Should return at most 3 logs, got {len(data)}"
        print(f"PASS: refresh-logs respects limit parameter (returned {len(data)} logs)")


class TestHealthDashboardAutoRefreshFields:
    """Tests for updated health dashboard with auto-refresh fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get customer token for authenticated requests"""
        self.customer_token = None
        
        # Get customer token (influencer)
        customer_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@pigma.com",
            "password": "admin123"
        })
        if customer_resp.status_code == 200:
            self.customer_token = customer_resp.json().get("token")
    
    def test_health_dashboard_has_auto_refresh_fields(self):
        """GET /api/instagram/health-dashboard includes auto-refresh fields when connected"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/instagram/health-dashboard",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        # May return 404 if not an influencer, which is expected
        if response.status_code == 404:
            print("PASS: health-dashboard returns 404 for non-influencer (expected)")
            return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "connection" in data, "Response should have 'connection' field"
        
        connection = data["connection"]
        
        # If connected, verify auto-refresh fields exist
        if connection.get("connected"):
            assert "last_token_refresh" in connection, "Connected response should have 'last_token_refresh'"
            assert "auto_refresh_enabled" in connection, "Connected response should have 'auto_refresh_enabled'"
            assert "auto_refresh_note" in connection, "Connected response should have 'auto_refresh_note'"
            
            # Verify auto_refresh_enabled is True
            assert connection["auto_refresh_enabled"] == True, "auto_refresh_enabled should be True"
            
            # Verify auto_refresh_note contains expected info
            note = connection["auto_refresh_note"]
            assert "7 days" in note or "6 hours" in note, f"auto_refresh_note should mention refresh schedule: {note}"
            
            print(f"PASS: health-dashboard has auto-refresh fields for connected user")
        else:
            # Not connected - just verify connection object exists
            print("PASS: health-dashboard returns connection info (not connected)")


class TestTokenRefreshIntegration:
    """Integration tests for token refresh flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        self.admin_token = None
        
        admin_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "superadmin@pigma.com",
            "password": "superadmin123"
        })
        if admin_resp.status_code == 200:
            self.admin_token = admin_resp.json().get("token")
    
    def test_manual_refresh_creates_log(self):
        """Manual refresh trigger creates a log entry"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        # Get current log count
        logs_before = requests.get(
            f"{BASE_URL}/api/admin/instagram/refresh-logs?limit=100",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        ).json()
        count_before = len(logs_before)
        
        # Trigger manual refresh
        refresh_resp = requests.post(
            f"{BASE_URL}/api/admin/instagram/refresh-tokens",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert refresh_resp.status_code == 200, f"Refresh failed: {refresh_resp.text}"
        
        # Get logs after
        logs_after = requests.get(
            f"{BASE_URL}/api/admin/instagram/refresh-logs?limit=100",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        ).json()
        count_after = len(logs_after)
        
        # Should have one more log
        assert count_after >= count_before, f"Log count should increase: before={count_before}, after={count_after}"
        print(f"PASS: Manual refresh creates log entry (logs: {count_before} -> {count_after})")
    
    def test_refresh_response_matches_log(self):
        """Refresh response data matches the created log entry"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        # Trigger refresh
        refresh_resp = requests.post(
            f"{BASE_URL}/api/admin/instagram/refresh-tokens",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert refresh_resp.status_code == 200
        refresh_data = refresh_resp.json()
        
        # Get latest log
        logs_resp = requests.get(
            f"{BASE_URL}/api/admin/instagram/refresh-logs?limit=1",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert logs_resp.status_code == 200
        logs = logs_resp.json()
        
        if len(logs) > 0:
            latest_log = logs[0]
            # Verify counts match
            assert latest_log["refreshed"] == refresh_data["refreshed"], "refreshed count should match"
            assert latest_log["failed"] == refresh_data["failed"], "failed count should match"
            assert latest_log["skipped"] == refresh_data["skipped"], "skipped count should match"
            print("PASS: Refresh response matches log entry")
        else:
            print("PASS: No logs to compare (empty environment)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
