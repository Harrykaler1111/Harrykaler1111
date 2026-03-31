"""
WhatsApp/Interakt Integration Tests
Tests for: settings, stats, messages, test message, webhook, abandoned carts, campaigns
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
TEST_PHONE = "+919625992057"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestWhatsAppSettings:
    """WhatsApp settings endpoint tests"""
    
    def test_get_settings_returns_200(self, admin_headers):
        """GET /api/whatsapp/settings returns settings with all toggle flags"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/settings", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify all expected fields exist
        expected_fields = [
            "order_placed_enabled", "order_confirmed_enabled", 
            "order_shipped_enabled", "order_delivered_enabled",
            "cod_confirmation_enabled", "abandoned_cart_enabled",
            "abandoned_cart_delay_minutes"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"Settings retrieved: {data}")
    
    def test_update_settings_toggle(self, admin_headers):
        """PUT /api/whatsapp/settings updates toggle flags"""
        # First get current settings
        get_resp = requests.get(f"{BASE_URL}/api/whatsapp/settings", headers=admin_headers)
        current = get_resp.json()
        
        # Toggle order_placed_enabled
        new_value = not current.get("order_placed_enabled", True)
        response = requests.put(f"{BASE_URL}/api/whatsapp/settings", 
            json={"order_placed_enabled": new_value}, 
            headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["order_placed_enabled"] == new_value, "Toggle did not update"
        print(f"Toggled order_placed_enabled to {new_value}")
        
        # Toggle back
        requests.put(f"{BASE_URL}/api/whatsapp/settings", 
            json={"order_placed_enabled": not new_value}, 
            headers=admin_headers)
    
    def test_update_abandoned_cart_delay(self, admin_headers):
        """PUT /api/whatsapp/settings updates delay minutes"""
        response = requests.put(f"{BASE_URL}/api/whatsapp/settings", 
            json={"abandoned_cart_delay_minutes": 45}, 
            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["abandoned_cart_delay_minutes"] == 45
        print("Delay updated to 45 minutes")
        
        # Reset to default
        requests.put(f"{BASE_URL}/api/whatsapp/settings", 
            json={"abandoned_cart_delay_minutes": 30}, 
            headers=admin_headers)


class TestWhatsAppStats:
    """WhatsApp stats endpoint tests"""
    
    def test_get_stats_returns_200(self, admin_headers):
        """GET /api/whatsapp/stats returns message statistics"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/stats", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected stat fields
        expected_fields = ["total_sent", "total_delivered", "total_read", "total_failed", "delivery_rate"]
        for field in expected_fields:
            assert field in data, f"Missing stat field: {field}"
        
        print(f"Stats: sent={data['total_sent']}, delivered={data['total_delivered']}, rate={data['delivery_rate']}%")


class TestWhatsAppMessages:
    """WhatsApp message log endpoint tests"""
    
    def test_get_messages_returns_200(self, admin_headers):
        """GET /api/whatsapp/messages returns paginated message log"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/messages", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "messages" in data, "Missing 'messages' field"
        assert "total" in data, "Missing 'total' field"
        assert isinstance(data["messages"], list), "messages should be a list"
        print(f"Messages: {data['total']} total, {len(data['messages'])} returned")
    
    def test_get_messages_with_pagination(self, admin_headers):
        """GET /api/whatsapp/messages supports skip/limit"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/messages?skip=0&limit=10", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["messages"]) <= 10, "Limit not respected"
    
    def test_get_messages_with_type_filter(self, admin_headers):
        """GET /api/whatsapp/messages supports msg_type filter"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/messages?msg_type=test", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        # All returned messages should be of type 'test' (if any)
        for msg in data["messages"]:
            assert msg.get("message_type") == "test", f"Wrong type: {msg.get('message_type')}"


class TestWhatsAppTestMessage:
    """WhatsApp test message endpoint tests"""
    
    def test_send_test_message_success(self, admin_headers):
        """POST /api/whatsapp/test sends test event via Interakt"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/test", 
            json={
                "phone": TEST_PHONE,
                "event_name": "test_message"
            }, 
            headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data, "Missing 'success' field"
        assert "result" in data, "Missing 'result' field"
        
        # Interakt should accept the event (success=True means API call worked)
        print(f"Test message result: success={data['success']}, result={data['result']}")
    
    def test_send_test_message_invalid_phone(self, admin_headers):
        """POST /api/whatsapp/test rejects invalid phone number"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/test", 
            json={
                "phone": "12345",  # Invalid
                "event_name": "test_message"
            }, 
            headers=admin_headers)
        
        assert response.status_code == 400, f"Expected 400 for invalid phone, got {response.status_code}"
        print("Invalid phone correctly rejected")
    
    def test_send_test_message_with_template(self, admin_headers):
        """POST /api/whatsapp/test with template_name uses send_template_message"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/test", 
            json={
                "phone": TEST_PHONE,
                "template_name": "test_template",  # May not exist in Interakt
                "body_values": ["Test Value"]
            }, 
            headers=admin_headers)
        
        # Should return 200 even if template doesn't exist (API call is made)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"Template test result: {data}")


class TestWhatsAppWebhook:
    """WhatsApp webhook endpoint tests"""
    
    def test_webhook_receives_payload(self):
        """POST /api/whatsapp/webhook accepts Interakt callbacks"""
        # Simulate an Interakt webhook payload
        payload = {
            "type": "message_api_delivered",
            "data": {
                "customer": {
                    "channel_phone_number": "919625992057"
                },
                "message": {
                    "id": "test_msg_123"
                }
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/whatsapp/webhook", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "received", f"Expected status=received, got {data}"
        print("Webhook received successfully")
    
    def test_webhook_handles_message_received(self):
        """POST /api/whatsapp/webhook handles customer reply"""
        payload = {
            "type": "message_received",
            "data": {
                "customer": {
                    "channel_phone_number": "919625992057"
                },
                "message": {
                    "id": "reply_123",
                    "message": "yes"
                }
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/whatsapp/webhook", json=payload)
        assert response.status_code == 200
        print("Customer reply webhook handled")
    
    def test_webhook_rejects_invalid_json(self):
        """POST /api/whatsapp/webhook rejects invalid JSON"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/webhook", 
            data="not json",
            headers={"Content-Type": "application/json"})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestWhatsAppAbandonedCarts:
    """Abandoned cart recovery endpoint tests"""
    
    def test_trigger_abandoned_cart_check(self, admin_headers):
        """POST /api/whatsapp/check-abandoned-carts triggers recovery check"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/check-abandoned-carts", 
            json={}, 
            headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Missing 'message' field"
        print(f"Abandoned cart check: {data['message']}")


class TestWhatsAppCampaigns:
    """WhatsApp broadcast campaign endpoint tests"""
    
    def test_get_campaigns_returns_200(self, admin_headers):
        """GET /api/whatsapp/campaigns returns campaign history"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/campaigns", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "campaigns" in data, "Missing 'campaigns' field"
        assert "total" in data, "Missing 'total' field"
        assert isinstance(data["campaigns"], list), "campaigns should be a list"
        print(f"Campaigns: {data['total']} total")
    
    def test_broadcast_no_recipients(self, admin_headers):
        """POST /api/whatsapp/broadcast returns 400 if no recipients"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/broadcast", 
            json={
                "template_name": "test_broadcast",
                "target_segment": "cart_abandoners"  # Likely empty
            }, 
            headers=admin_headers)
        
        # Should return 400 if no recipients found
        # Or 200 if there are recipients
        if response.status_code == 400:
            print("No recipients found (expected for empty segment)")
        else:
            assert response.status_code == 200
            print(f"Broadcast started: {response.json()}")
    
    def test_broadcast_with_custom_phones(self, admin_headers):
        """POST /api/whatsapp/broadcast with custom phone numbers"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/broadcast", 
            json={
                "template_name": "test_broadcast",
                "target_segment": "all",
                "phone_numbers": [TEST_PHONE]  # Custom list
            }, 
            headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "campaign_id" in data, "Missing campaign_id"
        assert data["total_recipients"] == 1, f"Expected 1 recipient, got {data['total_recipients']}"
        print(f"Broadcast campaign created: {data['campaign_id']}")


class TestWhatsAppAuthRequired:
    """Test that endpoints require admin authentication"""
    
    def test_settings_requires_auth(self):
        """GET /api/whatsapp/settings requires auth"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/settings")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_stats_requires_auth(self):
        """GET /api/whatsapp/stats requires auth"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_messages_requires_auth(self):
        """GET /api/whatsapp/messages requires auth"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/messages")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_test_message_requires_auth(self):
        """POST /api/whatsapp/test requires auth"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/test", json={"phone": TEST_PHONE})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_campaigns_requires_auth(self):
        """GET /api/whatsapp/campaigns requires auth"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/campaigns")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_abandoned_carts_requires_auth(self):
        """POST /api/whatsapp/check-abandoned-carts requires auth"""
        response = requests.post(f"{BASE_URL}/api/whatsapp/check-abandoned-carts", json={})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestInteraktServiceFunctions:
    """Test Interakt service helper functions via API"""
    
    def test_phone_validation_formats(self, admin_headers):
        """Test various phone number formats"""
        valid_phones = [
            "+919625992057",
            "919625992057",
            "9625992057"
        ]
        
        for phone in valid_phones:
            response = requests.post(f"{BASE_URL}/api/whatsapp/test", 
                json={"phone": phone, "event_name": "test_message"}, 
                headers=admin_headers)
            assert response.status_code == 200, f"Phone {phone} should be valid, got {response.status_code}"
            print(f"Phone format {phone} accepted")
    
    def test_invalid_phone_formats(self, admin_headers):
        """Test invalid phone number formats are rejected"""
        invalid_phones = [
            "12345",
            "0000000000",
            "+1234567890",  # Non-Indian
            "abc"
        ]
        
        for phone in invalid_phones:
            response = requests.post(f"{BASE_URL}/api/whatsapp/test", 
                json={"phone": phone, "event_name": "test_message"}, 
                headers=admin_headers)
            assert response.status_code == 400, f"Phone {phone} should be invalid, got {response.status_code}"
            print(f"Phone format {phone} correctly rejected")
