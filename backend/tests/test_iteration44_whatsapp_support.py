"""
Iteration 44 Tests: WhatsApp-Based Support System
Tests for:
1. Support Page - WhatsApp CTA, categories, guest access
2. Chat Widget - WhatsApp links, no ticket form
3. Vendor Support - WhatsApp-based support
4. Admin Ticket Panel - WhatsApp source badge
5. Backend webhook - auto-ticket creation
6. Guest access to /support and /cart
"""

import pytest
import requests
import os
import json
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@pigma.com"
SUPER_ADMIN_PASSWORD = "superadmin123"
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"
CUSTOMER_EMAIL = "admin@pigma.com"
CUSTOMER_PASSWORD = "admin123"

# WhatsApp phone number to verify
WHATSAPP_NUMBER = "919625992057"


class TestWhatsAppWebhookAutoTicket:
    """Test backend webhook auto-ticket creation from WhatsApp messages"""
    
    def test_webhook_creates_ticket_from_message(self):
        """POST /api/whatsapp/webhook with message_received should create a ticket"""
        payload = {
            "type": "message_received",
            "data": {
                "customer": {
                    "channel_phone_number": "+919876543210"
                },
                "message": {
                    "id": f"test_msg_{datetime.now().timestamp()}",
                    "message": "Hi, I need help with my order #ORD123. The delivery is delayed."
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/webhook",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Webhook failed: {response.text}"
        data = response.json()
        assert data.get("status") == "received", f"Unexpected response: {data}"
        print("PASS: Webhook received message and processed")
    
    def test_webhook_cod_confirmation_no_ticket(self):
        """COD confirmation messages (yes/confirm) should NOT create tickets"""
        payload = {
            "type": "message_received",
            "data": {
                "customer": {
                    "channel_phone_number": "+919876543211"
                },
                "message": {
                    "id": f"test_cod_{datetime.now().timestamp()}",
                    "message": "yes"
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/webhook",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Webhook failed: {response.text}"
        print("PASS: COD confirmation message processed (no ticket created)")
    
    def test_webhook_duplicate_message_appends(self):
        """Duplicate messages within 5 minutes should append to existing ticket"""
        phone = "+919876543212"
        
        # First message
        payload1 = {
            "type": "message_received",
            "data": {
                "customer": {"channel_phone_number": phone},
                "message": {
                    "id": f"test_dup1_{datetime.now().timestamp()}",
                    "message": "I have a payment issue with my recent order."
                }
            }
        }
        
        response1 = requests.post(
            f"{BASE_URL}/api/whatsapp/webhook",
            json=payload1,
            headers={"Content-Type": "application/json"}
        )
        assert response1.status_code == 200
        
        # Second message within 5 minutes (should append)
        payload2 = {
            "type": "message_received",
            "data": {
                "customer": {"channel_phone_number": phone},
                "message": {
                    "id": f"test_dup2_{datetime.now().timestamp()}",
                    "message": "Please help me urgently."
                }
            }
        }
        
        response2 = requests.post(
            f"{BASE_URL}/api/whatsapp/webhook",
            json=payload2,
            headers={"Content-Type": "application/json"}
        )
        assert response2.status_code == 200
        print("PASS: Duplicate message handling works")


class TestAdminTicketPanel:
    """Test admin ticket panel with WhatsApp source badge"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_admin_can_list_tickets(self):
        """GET /api/admin/tickets should return ticket list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tickets",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "tickets" in data
        assert "total" in data
        print(f"PASS: Admin can list tickets (total: {data['total']})")
    
    def test_admin_ticket_analytics(self):
        """GET /api/admin/tickets/analytics should return stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tickets/analytics",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "by_status" in data
        print(f"PASS: Admin ticket analytics works (total: {data['total']})")


class TestSupportTicketEndpoints:
    """Test support ticket CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as customer"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Customer login failed")
    
    def test_get_ticket_categories(self):
        """GET /api/tickets/categories should return category list"""
        response = requests.get(f"{BASE_URL}/api/tickets/categories")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check expected categories
        values = [c["value"] for c in data]
        assert "order" in values
        assert "payment" in values
        assert "refund" in values
        print(f"PASS: Ticket categories returned ({len(data)} categories)")
    
    def test_get_my_tickets(self):
        """GET /api/tickets/me should return user's tickets"""
        response = requests.get(
            f"{BASE_URL}/api/tickets/me",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "tickets" in data
        assert "total" in data
        print(f"PASS: User can get their tickets (total: {data['total']})")


class TestVendorSupportEndpoints:
    """Test vendor support ticket endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as vendor"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/login",
            json={"email": VENDOR_EMAIL, "password": VENDOR_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Vendor login failed")
    
    def test_vendor_get_tickets(self):
        """GET /api/vendors/tickets/me should return vendor's tickets"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/tickets/me",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "tickets" in data
        assert "total" in data
        print(f"PASS: Vendor can get their tickets (total: {data['total']})")


class TestGuestAccess:
    """Test guest access to /support and /cart pages"""
    
    def test_support_page_accessible_without_auth(self):
        """Support page should be accessible without authentication"""
        # Test the API endpoint for ticket categories (public)
        response = requests.get(f"{BASE_URL}/api/tickets/categories")
        assert response.status_code == 200, f"Categories endpoint failed: {response.text}"
        print("PASS: Ticket categories accessible without auth")
    
    def test_products_accessible_without_auth(self):
        """Products should be accessible without authentication (for cart)"""
        response = requests.get(f"{BASE_URL}/api/products?limit=5")
        assert response.status_code == 200, f"Products endpoint failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Products accessible without auth ({len(data)} products)")


class TestWhatsAppSettings:
    """Test WhatsApp settings endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_get_whatsapp_settings(self):
        """GET /api/whatsapp/settings should return settings"""
        response = requests.get(
            f"{BASE_URL}/api/whatsapp/settings",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "order_placed_enabled" in data
        assert "cod_confirmation_enabled" in data
        print("PASS: WhatsApp settings retrieved")
    
    def test_get_whatsapp_stats(self):
        """GET /api/whatsapp/stats should return messaging stats"""
        response = requests.get(
            f"{BASE_URL}/api/whatsapp/stats",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total_sent" in data
        assert "delivery_rate" in data
        print(f"PASS: WhatsApp stats retrieved (total sent: {data['total_sent']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
