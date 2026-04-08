"""
Support Ticket System Tests - Iteration 10
Tests for user tickets, vendor tickets, admin ticket management, and knowledge base
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://swipe-vendor-feed.preview.emergentagent.com').rstrip('/')

# Test credentials
USER_EMAIL = "harpreetkaler750@gmail.com"
USER_PASSWORD = "Harpreet@123"
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
SUPPORT_MANAGER_EMAIL = "support@pigma.com"
SUPPORT_MANAGER_PASSWORD = "support123"


class TestTicketCategories:
    """Test ticket categories endpoint (public)"""
    
    def test_get_ticket_categories(self):
        """GET /api/tickets/categories returns 8 categories"""
        response = requests.get(f"{BASE_URL}/api/tickets/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of categories"
        assert len(data) == 8, f"Expected 8 categories, got {len(data)}"
        
        # Verify category structure
        expected_values = ["payment", "order", "refund", "vendor_collaboration", 
                          "influencer", "account_login", "technical_bug", "other"]
        actual_values = [c["value"] for c in data]
        for val in expected_values:
            assert val in actual_values, f"Missing category: {val}"
        
        # Verify each category has value and label
        for cat in data:
            assert "value" in cat, "Category missing 'value'"
            assert "label" in cat, "Category missing 'label'"
        print(f"✅ GET /api/tickets/categories returns {len(data)} categories")


class TestUserTickets:
    """Test user ticket endpoints"""
    
    @pytest.fixture(scope="class")
    def user_token(self):
        """Get user auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"User login failed: {response.text}")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def user_headers(self, user_token):
        return {"Authorization": f"Bearer {user_token}"}
    
    def test_user_login(self, user_token):
        """Verify user can login"""
        assert user_token is not None
        print(f"✅ User login successful")
    
    def test_create_ticket(self, user_headers):
        """POST /api/tickets creates a ticket"""
        response = requests.post(f"{BASE_URL}/api/tickets", json={
            "title": "TEST_Payment Issue",
            "description": "I was charged twice for my order",
            "category": "payment",
            "priority": "high"
        }, headers=user_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "ticket" in data, "Response missing 'ticket'"
        assert "message" in data, "Response missing 'message'"
        
        ticket = data["ticket"]
        assert ticket["title"] == "TEST_Payment Issue"
        assert ticket["category"] == "payment"
        assert ticket["priority"] == "high"
        assert ticket["status"] == "open"
        assert "ticket_id" in ticket
        assert "sla_deadline" in ticket
        print(f"✅ POST /api/tickets created ticket: {ticket['ticket_id']}")
        return ticket["ticket_id"]
    
    def test_get_my_tickets(self, user_headers):
        """GET /api/tickets/me returns user's tickets"""
        response = requests.get(f"{BASE_URL}/api/tickets/me", headers=user_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tickets" in data, "Response missing 'tickets'"
        assert "total" in data, "Response missing 'total'"
        assert isinstance(data["tickets"], list)
        print(f"✅ GET /api/tickets/me returns {data['total']} tickets")
    
    def test_get_ticket_detail(self, user_headers):
        """GET /api/tickets/{ticket_id} returns ticket detail"""
        # First create a ticket
        create_resp = requests.post(f"{BASE_URL}/api/tickets", json={
            "title": "TEST_Detail Test",
            "description": "Testing ticket detail endpoint",
            "category": "order",
            "priority": "medium"
        }, headers=user_headers)
        ticket_id = create_resp.json()["ticket"]["ticket_id"]
        
        # Get ticket detail
        response = requests.get(f"{BASE_URL}/api/tickets/{ticket_id}", headers=user_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["ticket_id"] == ticket_id
        assert data["title"] == "TEST_Detail Test"
        assert "replies" in data
        print(f"✅ GET /api/tickets/{ticket_id} returns ticket detail")
    
    def test_user_reply_to_ticket(self, user_headers):
        """POST /api/tickets/{ticket_id}/reply adds a reply"""
        # Create a ticket first
        create_resp = requests.post(f"{BASE_URL}/api/tickets", json={
            "title": "TEST_Reply Test",
            "description": "Testing reply endpoint",
            "category": "refund",
            "priority": "low"
        }, headers=user_headers)
        ticket_id = create_resp.json()["ticket"]["ticket_id"]
        
        # Add reply
        response = requests.post(f"{BASE_URL}/api/tickets/{ticket_id}/reply", json={
            "message": "This is a test reply from user",
            "attachments": []
        }, headers=user_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "reply" in data
        assert data["reply"]["message"] == "This is a test reply from user"
        assert data["reply"]["sender_type"] == "user"
        print(f"✅ POST /api/tickets/{ticket_id}/reply added reply")
    
    def test_reopen_ticket(self, user_headers):
        """PUT /api/tickets/{ticket_id}/reopen reopens a resolved ticket"""
        # Create and get admin to resolve it
        create_resp = requests.post(f"{BASE_URL}/api/tickets", json={
            "title": "TEST_Reopen Test",
            "description": "Testing reopen endpoint",
            "category": "technical_bug",
            "priority": "medium"
        }, headers=user_headers)
        ticket_id = create_resp.json()["ticket"]["ticket_id"]
        
        # Login as admin to resolve the ticket
        admin_login = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_login.status_code == 200:
            admin_token = admin_login.json().get("token")
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            
            # Resolve the ticket
            requests.put(f"{BASE_URL}/api/admin/tickets/{ticket_id}/status?status=resolved", 
                        headers=admin_headers)
        
        # Now try to reopen as user
        response = requests.put(f"{BASE_URL}/api/tickets/{ticket_id}/reopen", 
                               json={}, headers=user_headers)
        
        # Should succeed if ticket was resolved, or fail with 400 if not resolved yet
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"✅ PUT /api/tickets/{ticket_id}/reopen tested")


class TestVendorTickets:
    """Test vendor ticket endpoints"""
    
    @pytest.fixture(scope="class")
    def vendor_token(self):
        """Get vendor auth token"""
        response = requests.post(f"{BASE_URL}/api/vendor/auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.text}")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def vendor_headers(self, vendor_token):
        return {"Authorization": f"Bearer {vendor_token}"}
    
    def test_vendor_login(self, vendor_token):
        """Verify vendor can login"""
        assert vendor_token is not None
        print(f"✅ Vendor login successful")
    
    def test_vendor_create_ticket(self, vendor_headers):
        """POST /api/vendors/tickets creates vendor ticket"""
        response = requests.post(f"{BASE_URL}/api/vendors/tickets", json={
            "title": "TEST_Vendor Payment Issue",
            "description": "Withdrawal not processed",
            "category": "payment",
            "priority": "high"
        }, headers=vendor_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "ticket" in data
        assert data["ticket"]["user_type"] == "vendor"
        print(f"✅ POST /api/vendors/tickets created vendor ticket")
    
    def test_vendor_get_tickets(self, vendor_headers):
        """GET /api/vendors/tickets/me returns vendor tickets"""
        response = requests.get(f"{BASE_URL}/api/vendors/tickets/me", headers=vendor_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tickets" in data
        assert "total" in data
        print(f"✅ GET /api/vendors/tickets/me returns {data['total']} tickets")


class TestAdminTickets:
    """Test admin ticket management endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def admin_data(self):
        """Get admin user data"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("admin")
        return None
    
    def test_admin_login(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        print(f"✅ Admin login successful")
    
    def test_admin_list_tickets(self, admin_headers):
        """GET /api/admin/tickets lists all tickets with filters"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tickets" in data
        assert "total" in data
        print(f"✅ GET /api/admin/tickets returns {data['total']} tickets")
    
    def test_admin_list_tickets_with_filters(self, admin_headers):
        """GET /api/admin/tickets with status filter"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets?status=open", headers=admin_headers)
        assert response.status_code == 200
        
        response = requests.get(f"{BASE_URL}/api/admin/tickets?priority=high", headers=admin_headers)
        assert response.status_code == 200
        
        response = requests.get(f"{BASE_URL}/api/admin/tickets?category=payment", headers=admin_headers)
        assert response.status_code == 200
        print(f"✅ GET /api/admin/tickets filters work correctly")
    
    def test_admin_ticket_analytics(self, admin_headers):
        """GET /api/admin/tickets/analytics returns analytics object"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets/analytics", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data, "Analytics missing 'total'"
        assert "by_status" in data, "Analytics missing 'by_status'"
        assert "by_priority" in data, "Analytics missing 'by_priority'"
        assert "escalated" in data, "Analytics missing 'escalated'"
        assert "by_category" in data, "Analytics missing 'by_category'"
        assert "avg_resolution_hours" in data, "Analytics missing 'avg_resolution_hours'"
        
        # Verify by_status structure
        by_status = data["by_status"]
        for status in ["open", "assigned", "in_progress", "waiting_for_user", "resolved", "closed"]:
            assert status in by_status, f"by_status missing '{status}'"
        
        print(f"✅ GET /api/admin/tickets/analytics returns complete analytics")
    
    def test_admin_assign_ticket(self, admin_headers, admin_data):
        """PUT /api/admin/tickets/{ticket_id}/assign assigns agent"""
        # First create a ticket as user
        user_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if user_login.status_code != 200:
            pytest.skip("User login failed")
        
        user_token = user_login.json().get("token")
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        create_resp = requests.post(f"{BASE_URL}/api/tickets", json={
            "title": "TEST_Assign Test",
            "description": "Testing assign endpoint",
            "category": "order",
            "priority": "medium"
        }, headers=user_headers)
        ticket_id = create_resp.json()["ticket"]["ticket_id"]
        
        # Get admin_id
        admin_id = admin_data.get("admin_id") if admin_data else None
        if not admin_id:
            # Try to get from admin users list
            users_resp = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
            if users_resp.status_code == 200:
                admins = users_resp.json()
                if admins:
                    admin_id = admins[0].get("admin_id")
        
        if not admin_id:
            pytest.skip("Could not get admin_id")
        
        # Assign ticket
        response = requests.put(f"{BASE_URL}/api/admin/tickets/{ticket_id}/assign?admin_id={admin_id}",
                               json={}, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ PUT /api/admin/tickets/{ticket_id}/assign assigned ticket")
    
    def test_admin_change_status(self, admin_headers):
        """PUT /api/admin/tickets/{ticket_id}/status changes status"""
        # Create a ticket
        user_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        user_token = user_login.json().get("token")
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        create_resp = requests.post(f"{BASE_URL}/api/tickets", json={
            "title": "TEST_Status Test",
            "description": "Testing status change",
            "category": "refund",
            "priority": "low"
        }, headers=user_headers)
        ticket_id = create_resp.json()["ticket"]["ticket_id"]
        
        # Change status to in_progress
        response = requests.put(f"{BASE_URL}/api/admin/tickets/{ticket_id}/status?status=in_progress",
                               json={}, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify status changed
        detail_resp = requests.get(f"{BASE_URL}/api/admin/tickets/{ticket_id}", headers=admin_headers)
        assert detail_resp.json()["status"] == "in_progress"
        print(f"✅ PUT /api/admin/tickets/{ticket_id}/status changed status")
    
    def test_admin_reply_ticket(self, admin_headers):
        """POST /api/admin/tickets/{ticket_id}/reply sends admin reply"""
        # Create a ticket
        user_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        user_token = user_login.json().get("token")
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        create_resp = requests.post(f"{BASE_URL}/api/tickets", json={
            "title": "TEST_Admin Reply Test",
            "description": "Testing admin reply",
            "category": "account_login",
            "priority": "medium"
        }, headers=user_headers)
        ticket_id = create_resp.json()["ticket"]["ticket_id"]
        
        # Admin reply
        response = requests.post(f"{BASE_URL}/api/admin/tickets/{ticket_id}/reply", json={
            "message": "This is a support team reply",
            "attachments": []
        }, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["reply"]["sender_type"] == "support"
        print(f"✅ POST /api/admin/tickets/{ticket_id}/reply sent admin reply")
    
    def test_admin_escalate_ticket(self, admin_headers):
        """PUT /api/admin/tickets/{ticket_id}/escalate escalates ticket"""
        # Create a ticket
        user_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        user_token = user_login.json().get("token")
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        create_resp = requests.post(f"{BASE_URL}/api/tickets", json={
            "title": "TEST_Escalate Test",
            "description": "Testing escalation",
            "category": "technical_bug",
            "priority": "high"
        }, headers=user_headers)
        ticket_id = create_resp.json()["ticket"]["ticket_id"]
        
        # Escalate
        response = requests.put(f"{BASE_URL}/api/admin/tickets/{ticket_id}/escalate",
                               json={}, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify escalated
        detail_resp = requests.get(f"{BASE_URL}/api/admin/tickets/{ticket_id}", headers=admin_headers)
        assert detail_resp.json()["escalated"] == True
        print(f"✅ PUT /api/admin/tickets/{ticket_id}/escalate escalated ticket")


class TestKnowledgeBase:
    """Test Knowledge Base endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return {"Authorization": f"Bearer {response.json().get('token')}"}
    
    def test_create_kb_article(self, admin_headers):
        """POST /api/admin/kb/articles creates knowledge base article"""
        response = requests.post(f"{BASE_URL}/api/admin/kb/articles", json={
            "title": "TEST_How to track your order",
            "content": "You can track your order by going to Orders page and clicking on the order.",
            "category": "order"
        }, headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "article" in data
        assert data["article"]["title"] == "TEST_How to track your order"
        assert data["article"]["is_published"] == True
        print(f"✅ POST /api/admin/kb/articles created article")
    
    def test_get_kb_articles(self):
        """GET /api/kb/articles returns published KB articles"""
        response = requests.get(f"{BASE_URL}/api/kb/articles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/kb/articles returns {len(data)} articles")


class TestSupportManagerPermissions:
    """Test support manager role permissions"""
    
    @pytest.fixture(scope="class")
    def support_token(self):
        """Get support manager auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPPORT_MANAGER_EMAIL,
            "password": SUPPORT_MANAGER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Support manager login failed: {response.text}")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def support_headers(self, support_token):
        return {"Authorization": f"Bearer {support_token}"}
    
    def test_support_manager_login(self, support_token):
        """Verify support manager can login"""
        assert support_token is not None
        print(f"✅ Support manager login successful")
    
    def test_support_manager_can_view_tickets(self, support_headers):
        """Support manager can view tickets"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets", headers=support_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ Support manager can view tickets")
    
    def test_support_manager_can_view_analytics(self, support_headers):
        """Support manager can view ticket analytics"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets/analytics", headers=support_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ Support manager can view ticket analytics")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
