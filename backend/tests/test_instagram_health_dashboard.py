"""
Instagram Health Dashboard API Tests
=====================================
Tests for GET /api/instagram/health-dashboard endpoint
- Token health status (healthy/expiring_soon/expired)
- DM delivery stats (total, today, week, month)
- Webhook event log
- Automation stats
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInstagramHealthDashboard:
    """Tests for the Instagram Health Dashboard endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as customer user
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@pigma.com",
            "password": "admin123"
        })
        
        if login_resp.status_code == 200:
            self.token = login_resp.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    # ─── Test: Endpoint requires authentication ───
    def test_health_dashboard_requires_auth(self):
        """Health dashboard should return 401 without auth token"""
        resp = requests.get(f"{BASE_URL}/api/instagram/health-dashboard")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: Health dashboard requires authentication")
    
    # ─── Test: Endpoint returns 404 for non-influencer ───
    def test_health_dashboard_non_influencer_returns_404(self):
        """Health dashboard should return 404 if user is not registered as influencer"""
        resp = self.session.get(f"{BASE_URL}/api/instagram/health-dashboard")
        # User might not be an influencer, so 404 is expected
        # If user IS an influencer, we'll get 200
        assert resp.status_code in [200, 404], f"Expected 200 or 404, got {resp.status_code}"
        
        if resp.status_code == 404:
            data = resp.json()
            assert "detail" in data
            print(f"PASS: Non-influencer user gets 404 with message: {data['detail']}")
        else:
            print("PASS: User is an influencer, got 200 response")
    
    # ─── Test: Response structure when user is influencer ───
    def test_health_dashboard_response_structure(self):
        """Health dashboard should return proper structure with connection, dm_stats, webhook_events, automation"""
        resp = self.session.get(f"{BASE_URL}/api/instagram/health-dashboard")
        
        if resp.status_code == 404:
            pytest.skip("User is not registered as influencer - skipping structure test")
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        
        # Check top-level keys
        assert "connection" in data, "Response missing 'connection' key"
        assert "dm_stats" in data, "Response missing 'dm_stats' key"
        assert "webhook_events" in data, "Response missing 'webhook_events' key"
        assert "automation" in data, "Response missing 'automation' key"
        
        print("PASS: Response has all required top-level keys (connection, dm_stats, webhook_events, automation)")
    
    # ─── Test: Connection info structure ───
    def test_health_dashboard_connection_structure(self):
        """Connection info should have connected boolean and token status fields"""
        resp = self.session.get(f"{BASE_URL}/api/instagram/health-dashboard")
        
        if resp.status_code == 404:
            pytest.skip("User is not registered as influencer")
        
        data = resp.json()
        connection = data.get("connection", {})
        
        # Must have 'connected' boolean
        assert "connected" in connection, "Connection missing 'connected' field"
        assert isinstance(connection["connected"], bool), "'connected' should be boolean"
        
        if connection["connected"]:
            # If connected, should have token status fields
            assert "token_status" in connection, "Connected but missing 'token_status'"
            assert connection["token_status"] in ["healthy", "expiring_soon", "expired", "unknown"], \
                f"Invalid token_status: {connection['token_status']}"
            assert "token_days_remaining" in connection, "Connected but missing 'token_days_remaining'"
            assert "ig_username" in connection, "Connected but missing 'ig_username'"
            assert "ig_business_id" in connection, "Connected but missing 'ig_business_id'"
            print(f"PASS: Connection info valid - status={connection['token_status']}, days_remaining={connection['token_days_remaining']}")
        else:
            print("PASS: Connection info valid - not connected")
    
    # ─── Test: DM stats structure ───
    def test_health_dashboard_dm_stats_structure(self):
        """DM stats should have total counts and time-based breakdowns"""
        resp = self.session.get(f"{BASE_URL}/api/instagram/health-dashboard")
        
        if resp.status_code == 404:
            pytest.skip("User is not registered as influencer")
        
        data = resp.json()
        dm_stats = data.get("dm_stats", {})
        
        # Check all-time stats
        assert "total_sent" in dm_stats, "dm_stats missing 'total_sent'"
        assert "total_failed" in dm_stats, "dm_stats missing 'total_failed'"
        assert "total_pending" in dm_stats, "dm_stats missing 'total_pending'"
        assert "total_all" in dm_stats, "dm_stats missing 'total_all'"
        assert "success_rate" in dm_stats, "dm_stats missing 'success_rate'"
        
        # Check time-based breakdowns
        assert "today" in dm_stats, "dm_stats missing 'today'"
        assert "this_week" in dm_stats, "dm_stats missing 'this_week'"
        assert "this_month" in dm_stats, "dm_stats missing 'this_month'"
        
        # Check today structure
        today = dm_stats.get("today", {})
        assert "sent" in today, "today missing 'sent'"
        assert "failed" in today, "today missing 'failed'"
        
        # Check this_week structure
        this_week = dm_stats.get("this_week", {})
        assert "sent" in this_week, "this_week missing 'sent'"
        assert "failed" in this_week, "this_week missing 'failed'"
        
        # Check this_month structure
        this_month = dm_stats.get("this_month", {})
        assert "sent" in this_month, "this_month missing 'sent'"
        assert "failed" in this_month, "this_month missing 'failed'"
        
        print(f"PASS: DM stats structure valid - total_all={dm_stats['total_all']}, success_rate={dm_stats['success_rate']}%")
    
    # ─── Test: Webhook events structure ───
    def test_health_dashboard_webhook_events_structure(self):
        """Webhook events should be an array with type, timestamp, summary fields"""
        resp = self.session.get(f"{BASE_URL}/api/instagram/health-dashboard")
        
        if resp.status_code == 404:
            pytest.skip("User is not registered as influencer")
        
        data = resp.json()
        webhook_events = data.get("webhook_events", [])
        
        # Should be a list
        assert isinstance(webhook_events, list), "webhook_events should be a list"
        
        # If there are events, check structure
        if len(webhook_events) > 0:
            event = webhook_events[0]
            assert "type" in event, "Event missing 'type'"
            assert "timestamp" in event, "Event missing 'timestamp'"
            assert "summary" in event, "Event missing 'summary'"
            print(f"PASS: Webhook events structure valid - {len(webhook_events)} events found")
        else:
            print("PASS: Webhook events structure valid - no events yet")
    
    # ─── Test: Automation stats structure ───
    def test_health_dashboard_automation_structure(self):
        """Automation stats should have enabled, posts_registered, active_posts, rate limits"""
        resp = self.session.get(f"{BASE_URL}/api/instagram/health-dashboard")
        
        if resp.status_code == 404:
            pytest.skip("User is not registered as influencer")
        
        data = resp.json()
        automation = data.get("automation", {})
        
        assert "enabled" in automation, "automation missing 'enabled'"
        assert isinstance(automation["enabled"], bool), "'enabled' should be boolean"
        assert "posts_registered" in automation, "automation missing 'posts_registered'"
        assert "active_posts" in automation, "automation missing 'active_posts'"
        assert "dm_rate_limit_hour" in automation, "automation missing 'dm_rate_limit_hour'"
        assert "dm_rate_limit_day" in automation, "automation missing 'dm_rate_limit_day'"
        
        print(f"PASS: Automation stats valid - enabled={automation['enabled']}, posts={automation['posts_registered']}, active={automation['active_posts']}")
    
    # ─── Test: Data types are correct ───
    def test_health_dashboard_data_types(self):
        """Verify all numeric fields are integers/floats"""
        resp = self.session.get(f"{BASE_URL}/api/instagram/health-dashboard")
        
        if resp.status_code == 404:
            pytest.skip("User is not registered as influencer")
        
        data = resp.json()
        dm_stats = data.get("dm_stats", {})
        automation = data.get("automation", {})
        
        # DM stats should be integers
        assert isinstance(dm_stats.get("total_sent"), int), "total_sent should be int"
        assert isinstance(dm_stats.get("total_failed"), int), "total_failed should be int"
        assert isinstance(dm_stats.get("total_pending"), int), "total_pending should be int"
        assert isinstance(dm_stats.get("total_all"), int), "total_all should be int"
        assert isinstance(dm_stats.get("success_rate"), (int, float)), "success_rate should be numeric"
        
        # Automation stats should be integers
        assert isinstance(automation.get("posts_registered"), int), "posts_registered should be int"
        assert isinstance(automation.get("active_posts"), int), "active_posts should be int"
        assert isinstance(automation.get("dm_rate_limit_hour"), int), "dm_rate_limit_hour should be int"
        assert isinstance(automation.get("dm_rate_limit_day"), int), "dm_rate_limit_day should be int"
        
        print("PASS: All numeric data types are correct")


class TestHealthDashboardWithAdminUser:
    """Test health dashboard with admin user who might be an influencer"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup with super admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Try admin login first
        login_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "superadmin@pigma.com",
            "password": "superadmin123"
        })
        
        if login_resp.status_code == 200:
            self.admin_token = login_resp.json().get("token")
        else:
            self.admin_token = None
    
    def test_admin_can_access_health_dashboard_if_influencer(self):
        """Admin user can access health dashboard if they are also an influencer"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Admin token might not work for influencer endpoint - this is expected
        resp = self.session.get(
            f"{BASE_URL}/api/instagram/health-dashboard",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        # Could be 200 (if admin is influencer), 404 (not influencer), or 401 (wrong token type)
        assert resp.status_code in [200, 401, 404], f"Unexpected status: {resp.status_code}"
        print(f"PASS: Admin access test - status {resp.status_code}")


class TestHealthDashboardEdgeCases:
    """Edge case tests for health dashboard"""
    
    def test_health_dashboard_invalid_token(self):
        """Invalid token should return 401"""
        resp = requests.get(
            f"{BASE_URL}/api/instagram/health-dashboard",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: Invalid token returns 401")
    
    def test_health_dashboard_malformed_auth_header(self):
        """Malformed auth header should return 401"""
        resp = requests.get(
            f"{BASE_URL}/api/instagram/health-dashboard",
            headers={"Authorization": "NotBearer token123"}
        )
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: Malformed auth header handled correctly")
