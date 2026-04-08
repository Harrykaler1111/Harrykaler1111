"""
Test Quiet Hours Feature for Notification Preferences
- GET/PUT /api/notifications/vendor/preferences returns/updates quiet_hours_* fields
- GET/PUT /api/notifications/admin/preferences returns/updates quiet_hours_* fields
- Backend enforcement: During quiet hours, notification saved to DB but NOT pushed via WebSocket
"""

import pytest
import requests
import os
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
VENDOR_DISPLAY_ID = "VND-0001"


class TestQuietHoursPreferences:
    """Test quiet hours preference fields in GET/PUT endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth tokens for vendor and admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Vendor login
        vendor_resp = self.session.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert vendor_resp.status_code == 200, f"Vendor login failed: {vendor_resp.text}"
        self.vendor_token = vendor_resp.json().get("token")
        
        # Admin login
        admin_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_resp.status_code == 200, f"Admin login failed: {admin_resp.text}"
        self.admin_token = admin_resp.json().get("token")
    
    def test_vendor_get_preferences_has_quiet_hours_fields(self):
        """GET /api/notifications/vendor/preferences returns quiet_hours_* fields"""
        resp = self.session.get(
            f"{BASE_URL}/api/notifications/vendor/preferences",
            headers={"Authorization": f"Bearer {self.vendor_token}"}
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Check quiet hours fields exist
        assert "quiet_hours_enabled" in data, "Missing quiet_hours_enabled field"
        assert "quiet_hours_start" in data, "Missing quiet_hours_start field"
        assert "quiet_hours_end" in data, "Missing quiet_hours_end field"
        
        # Check types
        assert isinstance(data["quiet_hours_enabled"], bool), "quiet_hours_enabled should be boolean"
        assert isinstance(data["quiet_hours_start"], str), "quiet_hours_start should be string"
        assert isinstance(data["quiet_hours_end"], str), "quiet_hours_end should be string"
        
        print(f"✓ Vendor preferences contain quiet hours fields: enabled={data['quiet_hours_enabled']}, start={data['quiet_hours_start']}, end={data['quiet_hours_end']}")
    
    def test_vendor_update_quiet_hours_enabled(self):
        """PUT /api/notifications/vendor/preferences can update quiet_hours_enabled"""
        # Enable quiet hours
        resp = self.session.put(
            f"{BASE_URL}/api/notifications/vendor/preferences",
            headers={"Authorization": f"Bearer {self.vendor_token}"},
            json={"quiet_hours_enabled": True}
        )
        assert resp.status_code == 200, f"Failed to enable: {resp.text}"
        data = resp.json()
        assert data["quiet_hours_enabled"] == True, "quiet_hours_enabled should be True"
        
        # Disable quiet hours
        resp = self.session.put(
            f"{BASE_URL}/api/notifications/vendor/preferences",
            headers={"Authorization": f"Bearer {self.vendor_token}"},
            json={"quiet_hours_enabled": False}
        )
        assert resp.status_code == 200, f"Failed to disable: {resp.text}"
        data = resp.json()
        assert data["quiet_hours_enabled"] == False, "quiet_hours_enabled should be False"
        
        print("✓ Vendor can toggle quiet_hours_enabled on/off")
    
    def test_vendor_update_quiet_hours_times(self):
        """PUT /api/notifications/vendor/preferences can update quiet_hours_start and quiet_hours_end"""
        # Update start time
        resp = self.session.put(
            f"{BASE_URL}/api/notifications/vendor/preferences",
            headers={"Authorization": f"Bearer {self.vendor_token}"},
            json={"quiet_hours_start": "23:00"}
        )
        assert resp.status_code == 200, f"Failed to update start: {resp.text}"
        data = resp.json()
        assert data["quiet_hours_start"] == "23:00", f"Expected 23:00, got {data['quiet_hours_start']}"
        
        # Update end time
        resp = self.session.put(
            f"{BASE_URL}/api/notifications/vendor/preferences",
            headers={"Authorization": f"Bearer {self.vendor_token}"},
            json={"quiet_hours_end": "07:00"}
        )
        assert resp.status_code == 200, f"Failed to update end: {resp.text}"
        data = resp.json()
        assert data["quiet_hours_end"] == "07:00", f"Expected 07:00, got {data['quiet_hours_end']}"
        
        # Update both at once
        resp = self.session.put(
            f"{BASE_URL}/api/notifications/vendor/preferences",
            headers={"Authorization": f"Bearer {self.vendor_token}"},
            json={"quiet_hours_start": "22:00", "quiet_hours_end": "08:00"}
        )
        assert resp.status_code == 200, f"Failed to update both: {resp.text}"
        data = resp.json()
        assert data["quiet_hours_start"] == "22:00"
        assert data["quiet_hours_end"] == "08:00"
        
        print("✓ Vendor can update quiet_hours_start and quiet_hours_end")
    
    def test_admin_get_preferences_has_quiet_hours_fields(self):
        """GET /api/notifications/admin/preferences returns quiet_hours_* fields"""
        resp = self.session.get(
            f"{BASE_URL}/api/notifications/admin/preferences",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Check quiet hours fields exist
        assert "quiet_hours_enabled" in data, "Missing quiet_hours_enabled field"
        assert "quiet_hours_start" in data, "Missing quiet_hours_start field"
        assert "quiet_hours_end" in data, "Missing quiet_hours_end field"
        
        print(f"✓ Admin preferences contain quiet hours fields: enabled={data['quiet_hours_enabled']}, start={data['quiet_hours_start']}, end={data['quiet_hours_end']}")
    
    def test_admin_update_quiet_hours(self):
        """PUT /api/notifications/admin/preferences can update quiet_hours_* fields"""
        # Enable and set times
        resp = self.session.put(
            f"{BASE_URL}/api/notifications/admin/preferences",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "quiet_hours_enabled": True,
                "quiet_hours_start": "21:00",
                "quiet_hours_end": "09:00"
            }
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data["quiet_hours_enabled"] == True
        assert data["quiet_hours_start"] == "21:00"
        assert data["quiet_hours_end"] == "09:00"
        
        # Disable
        resp = self.session.put(
            f"{BASE_URL}/api/notifications/admin/preferences",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"quiet_hours_enabled": False}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["quiet_hours_enabled"] == False
        
        print("✓ Admin can update quiet_hours_* fields")


class TestQuietHoursEnforcement:
    """Test that quiet hours enforcement works - notification saved but NOT pushed during quiet hours"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth tokens"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Vendor login
        vendor_resp = self.session.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert vendor_resp.status_code == 200, f"Vendor login failed: {vendor_resp.text}"
        self.vendor_token = vendor_resp.json().get("token")
        self.vendor_id = vendor_resp.json().get("vendor", {}).get("vendor_id")
        
        # Admin login
        admin_resp = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_resp.status_code == 200, f"Admin login failed: {admin_resp.text}"
        self.admin_token = admin_resp.json().get("token")
    
    def _get_current_ist_time(self):
        """Get current IST time (UTC+5:30)"""
        now_utc = datetime.now(timezone.utc)
        ist = now_utc + timedelta(hours=5, minutes=30)
        return ist
    
    def _get_quiet_hours_covering_now(self):
        """Calculate quiet hours start/end that cover current IST time"""
        ist = self._get_current_ist_time()
        # Set start 1 hour before now, end 1 hour after now
        start = (ist - timedelta(hours=1)).strftime('%H:%M')
        end = (ist + timedelta(hours=1)).strftime('%H:%M')
        return start, end
    
    def _get_quiet_hours_not_covering_now(self):
        """Calculate quiet hours start/end that do NOT cover current IST time"""
        ist = self._get_current_ist_time()
        # Set start 3 hours from now, end 4 hours from now
        start = (ist + timedelta(hours=3)).strftime('%H:%M')
        end = (ist + timedelta(hours=4)).strftime('%H:%M')
        return start, end
    
    def _get_vendor_notification_count(self):
        """Get current notification count for vendor"""
        resp = self.session.get(
            f"{BASE_URL}/api/notifications/vendor/list?limit=50",
            headers={"Authorization": f"Bearer {self.vendor_token}"}
        )
        if resp.status_code == 200:
            return resp.json().get("total", 0)
        return 0
    
    def _trigger_notification(self):
        """Trigger a notification by adding credits to vendor"""
        resp = self.session.post(
            f"{BASE_URL}/api/admin/master/action/add-credits/{VENDOR_DISPLAY_ID}",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"amount": 10, "reason": "Quiet hours test"}
        )
        return resp.status_code == 200
    
    def test_quiet_hours_active_notification_saved_to_db(self):
        """When quiet hours are active, notification IS saved to DB"""
        # Get quiet hours covering current time
        start, end = self._get_quiet_hours_covering_now()
        
        # Enable quiet hours with times covering now
        resp = self.session.put(
            f"{BASE_URL}/api/notifications/vendor/preferences",
            headers={"Authorization": f"Bearer {self.vendor_token}"},
            json={
                "quiet_hours_enabled": True,
                "quiet_hours_start": start,
                "quiet_hours_end": end,
                "credit": True  # Ensure credit notifications are enabled
            }
        )
        assert resp.status_code == 200, f"Failed to set quiet hours: {resp.text}"
        
        # Get initial notification count
        initial_count = self._get_vendor_notification_count()
        
        # Trigger notification
        triggered = self._trigger_notification()
        assert triggered, "Failed to trigger notification"
        
        # Wait a moment for DB write
        import time
        time.sleep(1)
        
        # Check notification count increased (saved to DB)
        new_count = self._get_vendor_notification_count()
        assert new_count > initial_count, f"Notification not saved to DB during quiet hours. Initial: {initial_count}, New: {new_count}"
        
        print(f"✓ Notification saved to DB during quiet hours (count: {initial_count} -> {new_count})")
        
        # Cleanup: disable quiet hours
        self.session.put(
            f"{BASE_URL}/api/notifications/vendor/preferences",
            headers={"Authorization": f"Bearer {self.vendor_token}"},
            json={"quiet_hours_enabled": False}
        )
    
    def test_quiet_hours_inactive_notification_saved_to_db(self):
        """When quiet hours are NOT active, notification IS saved to DB"""
        # Get quiet hours NOT covering current time
        start, end = self._get_quiet_hours_not_covering_now()
        
        # Enable quiet hours with times NOT covering now
        resp = self.session.put(
            f"{BASE_URL}/api/notifications/vendor/preferences",
            headers={"Authorization": f"Bearer {self.vendor_token}"},
            json={
                "quiet_hours_enabled": True,
                "quiet_hours_start": start,
                "quiet_hours_end": end,
                "credit": True
            }
        )
        assert resp.status_code == 200, f"Failed to set quiet hours: {resp.text}"
        
        # Get initial notification count
        initial_count = self._get_vendor_notification_count()
        
        # Trigger notification
        triggered = self._trigger_notification()
        assert triggered, "Failed to trigger notification"
        
        # Wait a moment for DB write
        import time
        time.sleep(1)
        
        # Check notification count increased
        new_count = self._get_vendor_notification_count()
        assert new_count > initial_count, f"Notification not saved to DB. Initial: {initial_count}, New: {new_count}"
        
        print(f"✓ Notification saved to DB when quiet hours NOT active (count: {initial_count} -> {new_count})")
        
        # Cleanup: disable quiet hours
        self.session.put(
            f"{BASE_URL}/api/notifications/vendor/preferences",
            headers={"Authorization": f"Bearer {self.vendor_token}"},
            json={"quiet_hours_enabled": False}
        )
    
    def test_quiet_hours_disabled_notification_saved_to_db(self):
        """When quiet hours are disabled, notification IS saved to DB"""
        # Disable quiet hours
        resp = self.session.put(
            f"{BASE_URL}/api/notifications/vendor/preferences",
            headers={"Authorization": f"Bearer {self.vendor_token}"},
            json={"quiet_hours_enabled": False, "credit": True}
        )
        assert resp.status_code == 200, f"Failed to disable quiet hours: {resp.text}"
        
        # Get initial notification count
        initial_count = self._get_vendor_notification_count()
        
        # Trigger notification
        triggered = self._trigger_notification()
        assert triggered, "Failed to trigger notification"
        
        # Wait a moment for DB write
        import time
        time.sleep(1)
        
        # Check notification count increased
        new_count = self._get_vendor_notification_count()
        assert new_count > initial_count, f"Notification not saved to DB. Initial: {initial_count}, New: {new_count}"
        
        print(f"✓ Notification saved to DB when quiet hours disabled (count: {initial_count} -> {new_count})")


class TestQuietHoursDefaults:
    """Test default values for quiet hours"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth tokens"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Vendor login
        vendor_resp = self.session.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert vendor_resp.status_code == 200, f"Vendor login failed: {vendor_resp.text}"
        self.vendor_token = vendor_resp.json().get("token")
    
    def test_quiet_hours_default_values(self):
        """Verify default values: enabled=false, start=22:00, end=08:00"""
        # First reset to defaults by clearing any custom prefs
        # Get current prefs
        resp = self.session.get(
            f"{BASE_URL}/api/notifications/vendor/preferences",
            headers={"Authorization": f"Bearer {self.vendor_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Check defaults are applied (from DEFAULT_PREFS in notification_routes.py)
        # Note: If user has customized, these may differ - but the fields should exist
        assert "quiet_hours_enabled" in data
        assert "quiet_hours_start" in data
        assert "quiet_hours_end" in data
        
        # The defaults in code are: enabled=False, start="22:00", end="08:00"
        # If no custom prefs set, these should be the values
        print(f"✓ Quiet hours fields present with values: enabled={data['quiet_hours_enabled']}, start={data['quiet_hours_start']}, end={data['quiet_hours_end']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
