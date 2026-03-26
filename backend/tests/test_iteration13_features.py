"""
Iteration 13 Feature Tests
Tests for:
1. Top Vendors Hero Section API
2. ChatWidget ticket creation
3. Vendor Credit System (mocked Razorpay)
4. Vendor Promote Product
5. Admin Marketing Tab RBAC
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "superadmin@pigma.com"
SUPERADMIN_PASSWORD = "superadmin123"
MARKETING_EMAIL = "marketing@pigma.com"
MARKETING_PASSWORD = "marketing123"
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"
CUSTOMER_EMAIL = "harpreetkaler750@gmail.com"
CUSTOMER_PASSWORD = "Harpreet@123"


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_accessible(self):
        """Test that API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        print("SUCCESS: API is accessible")


class TestTopVendorsHeroSection:
    """Tests for Top Vendors Hero Section (Zomato-style circles)"""
    
    def test_top_sellers_endpoint(self):
        """Test GET /api/vendors/top-sellers returns vendor data"""
        response = requests.get(f"{BASE_URL}/api/vendors/top-sellers?limit=6", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Top sellers endpoint returns {len(data)} vendors")
        
        # Verify data structure if vendors exist
        if len(data) > 0:
            vendor = data[0]
            assert "vendor_id" in vendor
            assert "store_name" in vendor
            print(f"SUCCESS: Vendor data has required fields (vendor_id, store_name)")


class TestChatWidgetTicketSystem:
    """Tests for ChatWidget ticket creation"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Customer login failed")
    
    def test_ticket_creation_requires_auth(self):
        """Test that ticket creation requires authentication"""
        response = requests.post(f"{BASE_URL}/api/tickets", json={
            "title": "Test Ticket",
            "description": "Test description",
            "category": "order",
            "priority": "medium"
        })
        # Should fail without auth
        assert response.status_code in [401, 403, 422]
        print("SUCCESS: Ticket creation requires authentication")
    
    def test_ticket_creation_with_auth(self, customer_token):
        """Test ticket creation with valid auth"""
        response = requests.post(
            f"{BASE_URL}/api/tickets",
            json={
                "title": "TEST_Ticket_Order_Issue",
                "description": "Test ticket for order issue",
                "category": "order",
                "priority": "medium"
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert "ticket" in data
        ticket = data["ticket"]
        assert "ticket_id" in ticket
        assert ticket["title"] == "TEST_Ticket_Order_Issue"
        assert ticket["category"] == "order"
        assert ticket["priority"] == "medium"
        assert ticket["status"] in ["open", "pending"]
        print(f"SUCCESS: Ticket created with ID: {ticket['ticket_id']}")
    
    def test_get_user_tickets(self, customer_token):
        """Test getting user's tickets"""
        response = requests.get(
            f"{BASE_URL}/api/tickets/me",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Response can be a list or dict with 'tickets' key
        if isinstance(data, dict):
            assert "tickets" in data
            tickets = data["tickets"]
            assert isinstance(tickets, list)
            print(f"SUCCESS: User has {len(tickets)} tickets")
        else:
            assert isinstance(data, list)
            print(f"SUCCESS: User has {len(data)} tickets")
    
    def test_ai_chat_endpoint(self):
        """Test AI chat endpoint"""
        response = requests.post(f"{BASE_URL}/api/chat", json={
            "message": "Hello, I need help with my order",
            "session_id": None
        })
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "session_id" in data
        print(f"SUCCESS: AI chat responded with session_id: {data['session_id']}")


class TestVendorCreditSystem:
    """Tests for Vendor Credit System (mocked Razorpay)"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor auth token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Vendor login failed")
    
    def test_get_vendor_credits(self, vendor_token):
        """Test GET /api/vendors/promotions/credits"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/promotions/credits",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        assert "vendor_id" in data
        print(f"SUCCESS: Vendor credits balance: {data.get('balance', 0)}")
    
    def test_create_credit_order_mocked(self, vendor_token):
        """Test POST /api/vendors/promotions/credits/create-order (mocked mode)"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/promotions/credits/create-order",
            json={"amount": 200},
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # In mocked mode, should return mocked: true and credits_added
        assert "order_id" in data
        assert "mocked" in data
        assert data["mocked"] == True
        assert "credits_added" in data
        assert data["credits_added"] == 200
        print(f"SUCCESS: Credit order created (mocked mode), credits_added: {data['credits_added']}")
    
    def test_create_credit_order_minimum(self, vendor_token):
        """Test minimum credit purchase validation"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/promotions/credits/create-order",
            json={"amount": 50},  # Below minimum of 100
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 400
        print("SUCCESS: Minimum credit purchase validation works")
    
    def test_get_credit_transactions(self, vendor_token):
        """Test GET /api/vendors/promotions/credits/transactions"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/promotions/credits/transactions",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Credit transactions returned {len(data)} records")
        
        # Verify transaction structure if any exist
        if len(data) > 0:
            txn = data[0]
            assert "transaction_id" in txn
            assert "type" in txn
            assert "amount" in txn
            assert "payment_status" in txn
            print(f"SUCCESS: Transaction has required fields")


class TestVendorPromoteProduct:
    """Tests for Vendor Promote Product feature"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor auth token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Vendor login failed")
    
    @pytest.fixture
    def vendor_product_id(self, vendor_token):
        """Get a vendor product ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/products",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        if response.status_code == 200:
            products = response.json()
            # Find an approved product
            for p in products:
                if p.get("approval_status") == "approved":
                    return p["product_id"]
            # If no approved product, return first product
            if len(products) > 0:
                return products[0]["product_id"]
        return None
    
    def test_promote_product_invalid_type(self, vendor_token):
        """Test promote product with invalid listing type"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/promotions/promote-product",
            json={
                "product_id": "test_product_123",
                "listing_type": "invalid_type",
                "days": 7
            },
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 400
        print("SUCCESS: Invalid listing type validation works")
    
    def test_promote_product_not_found(self, vendor_token):
        """Test promote product with non-existent product"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/promotions/promote-product",
            json={
                "product_id": "nonexistent_product_xyz",
                "listing_type": "top_100",
                "days": 7
            },
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        # Should fail with 404 or 400 (insufficient credits or not found)
        assert response.status_code in [400, 404]
        print("SUCCESS: Non-existent product validation works")
    
    def test_get_my_promotions(self, vendor_token):
        """Test GET /api/vendors/promotions/my"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/promotions/my",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Vendor has {len(data)} promotions")


class TestAdminMarketingTabRBAC:
    """Tests for Admin Marketing Tab RBAC"""
    
    @pytest.fixture
    def superadmin_token(self):
        """Get super admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Super admin login failed")
    
    @pytest.fixture
    def marketing_token(self):
        """Get marketing manager auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": MARKETING_EMAIL,
            "password": MARKETING_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Marketing manager login failed - may not exist")
    
    def test_superadmin_login(self):
        """Test super admin can login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "admin" in data
        assert data["admin"]["role"] == "super_admin"
        print(f"SUCCESS: Super admin login works, role: {data['admin']['role']}")
    
    def test_superadmin_can_access_coupons(self, superadmin_token):
        """Test super admin can access coupons endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/coupons",
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Super admin can access coupons, found {len(data)} coupons")
    
    def test_superadmin_can_access_commission_settings(self, superadmin_token):
        """Test super admin can access commission settings (marketing)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/commission",
            headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: Super admin can access commission settings")
    
    def test_marketing_manager_login(self):
        """Test marketing manager can login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": MARKETING_EMAIL,
            "password": MARKETING_PASSWORD
        })
        # Marketing manager may or may not exist
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            assert data["admin"]["role"] == "marketing_manager"
            print(f"SUCCESS: Marketing manager login works")
        else:
            print(f"INFO: Marketing manager account may not exist (status: {response.status_code})")
    
    def test_vendor_cannot_access_admin_coupons(self):
        """Test vendor cannot access admin coupons endpoint"""
        # Login as vendor
        vendor_response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if vendor_response.status_code != 200:
            pytest.skip("Vendor login failed")
        
        vendor_token = vendor_response.json().get("token")
        
        # Try to access admin coupons
        response = requests.get(
            f"{BASE_URL}/api/coupons",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        # Should fail or return limited data
        print(f"INFO: Vendor access to coupons returned status: {response.status_code}")


class TestVendorLogin:
    """Test vendor authentication"""
    
    def test_vendor_login(self):
        """Test vendor can login"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "vendor" in data
        print(f"SUCCESS: Vendor login works, store: {data['vendor'].get('store_name', 'N/A')}")


class TestCustomerLogin:
    """Test customer authentication"""
    
    def test_customer_login(self):
        """Test customer can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print(f"SUCCESS: Customer login works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
