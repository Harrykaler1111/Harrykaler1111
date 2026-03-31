"""
Backend API Tests for Pigma E-commerce Platform
Testing: Health, Auth, Products, Admin Auth, Admin RBAC, Admin Dashboard
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://automated-recovery.preview.emergentagent.com')

# Test credentials from review_request
SUPER_ADMIN_EMAIL = "superadmin@pigma.com"
SUPER_ADMIN_PASSWORD = "superadmin123"
MARKETING_EMAIL = "marketing@pigma.com"
MARKETING_PASSWORD = "marketing123"
FINANCE_EMAIL = "finance@pigma.com"
FINANCE_PASSWORD = "finance123"
SUPPORT_EMAIL = "support@pigma.com"
SUPPORT_PASSWORD = "support123"


class TestHealthEndpoint:
    """Test Health Check Endpoint"""
    
    def test_health_check(self):
        """Health check should return status healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        print("✅ Health check passed")


class TestUserAuth:
    """Test User Authentication: Register and Login"""
    
    def test_user_register(self):
        """Test user registration with unique email"""
        unique_email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "Test User",
            "password": "testpass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        print(f"✅ User registration passed: {unique_email}")
    
    def test_user_login_valid(self):
        """Test login with valid credentials"""
        # First register a new user
        unique_email = f"TEST_login_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "name": "Test Login User",
            "password": "logintest123"
        })
        
        # Now login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "logintest123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        print(f"✅ User login passed: {unique_email}")
    
    def test_user_login_invalid(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid login correctly rejected")


class TestProductsAPI:
    """Test Products Endpoints"""
    
    def test_get_products(self):
        """Get products list"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "product_id" in data[0]
            assert "name" in data[0]
            assert "price" in data[0]
        print(f"✅ Get products passed: {len(data)} products found")
    
    def test_get_featured_products(self):
        """Get featured (limited edition) products"""
        response = requests.get(f"{BASE_URL}/api/products/featured")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Featured products should be limited edition
        for product in data:
            assert product.get("is_limited_edition") == True
        print(f"✅ Get featured products passed: {len(data)} featured products")


class TestAdminAuth:
    """Test Admin Authentication with all roles"""
    
    def test_superadmin_login(self):
        """Super admin should be able to login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "admin" in data
        assert data["admin"]["email"] == SUPER_ADMIN_EMAIL
        assert data["admin"]["role"] == "super_admin"
        assert "permissions" in data["admin"]
        print(f"✅ Super admin login passed: {data['admin']['name']}")
    
    def test_marketing_manager_login(self):
        """Marketing manager should be able to login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": MARKETING_EMAIL,
            "password": MARKETING_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["admin"]["role"] == "marketing_manager"
        print(f"✅ Marketing manager login passed")
    
    def test_finance_manager_login(self):
        """Finance manager should be able to login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": FINANCE_EMAIL,
            "password": FINANCE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["admin"]["role"] == "finance_manager"
        print(f"✅ Finance manager login passed")
    
    def test_support_manager_login(self):
        """Support manager should be able to login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPPORT_EMAIL,
            "password": SUPPORT_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["admin"]["role"] == "support_manager"
        print(f"✅ Support manager login passed")
    
    def test_admin_login_invalid(self):
        """Invalid admin credentials should be rejected"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "invalid@pigma.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid admin login correctly rejected")


class TestAdminRBAC:
    """Test Admin RBAC - Role-Based Access Control"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def marketing_token(self):
        """Get marketing manager token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": MARKETING_EMAIL,
            "password": MARKETING_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def finance_token(self):
        """Get finance manager token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": FINANCE_EMAIL,
            "password": FINANCE_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def support_token(self):
        """Get support manager token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPPORT_EMAIL,
            "password": SUPPORT_PASSWORD
        })
        return response.json()["token"]
    
    def test_super_admin_can_view_admin_users(self, super_admin_token):
        """Super admin should be able to view admin users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the seeded admin users
        assert len(data) >= 4
        print(f"✅ Super admin can view admin users: {len(data)} users found")
    
    def test_marketing_cannot_view_admin_users(self, marketing_token):
        """Marketing manager should NOT have permission to view admin users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {marketing_token}"}
        )
        assert response.status_code == 403
        assert "Permission denied" in response.json().get("detail", "")
        print("✅ Marketing manager correctly denied access to admin users")
    
    def test_finance_cannot_view_admin_users(self, finance_token):
        """Finance manager should NOT have permission to view admin users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {finance_token}"}
        )
        assert response.status_code == 403
        print("✅ Finance manager correctly denied access to admin users")
    
    def test_support_cannot_view_admin_users(self, support_token):
        """Support manager should NOT have permission to view admin users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {support_token}"}
        )
        assert response.status_code == 403
        print("✅ Support manager correctly denied access to admin users")
    
    def test_super_admin_can_create_admin_user(self, super_admin_token):
        """Super admin should be able to create new admin users"""
        unique_email = f"TEST_newadmin_{uuid.uuid4().hex[:8]}@pigma.com"
        response = requests.post(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {super_admin_token}"},
            json={
                "email": unique_email,
                "name": "Test New Admin",
                "password": "newadmin123",
                "role": "support_manager"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == unique_email
        assert data["role"] == "support_manager"
        assert data["is_active"] == True
        print(f"✅ Super admin created new admin user: {unique_email}")
        
        # Verify the new admin can login
        login_response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": unique_email,
            "password": "newadmin123"
        })
        assert login_response.status_code == 200
        print(f"✅ New admin user can login successfully")


class TestAdminDashboard:
    """Test Admin Dashboard Endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for dashboard tests"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_dashboard(self, admin_token):
        """Admin should be able to access dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        assert "recent_orders" in data
        assert "top_influencers" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_products" in stats
        assert "total_orders" in stats
        assert "total_customers" in stats
        assert "total_influencers" in stats
        assert "total_revenue" in stats
        print(f"✅ Admin dashboard loaded: {stats['total_products']} products, {stats['total_orders']} orders")


class TestAdminOrders:
    """Test Admin Orders Endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_orders(self, admin_token):
        """Admin should be able to view orders"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Admin can view orders: {len(data)} orders found")


class TestAdminCustomers:
    """Test Admin Customers Endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_customers(self, admin_token):
        """Admin should be able to view customers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/customers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Admin can view customers: {len(data)} customers found")


class TestAdminWithdrawals:
    """Test Admin Withdrawals Endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_withdrawals(self, admin_token):
        """Admin should be able to view withdrawals"""
        response = requests.get(
            f"{BASE_URL}/api/admin/withdrawals",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Admin can view withdrawals: {len(data)} withdrawals found")


class TestRBACPermissionMatrix:
    """Comprehensive RBAC permission matrix tests"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def marketing_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": MARKETING_EMAIL, "password": MARKETING_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def finance_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": FINANCE_EMAIL, "password": FINANCE_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def support_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPPORT_EMAIL, "password": SUPPORT_PASSWORD
        })
        return response.json()["token"]
    
    # Super Admin should have full access
    def test_super_admin_dashboard_access(self, super_admin_token):
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", 
            headers={"Authorization": f"Bearer {super_admin_token}"})
        assert response.status_code == 200
        print("✅ Super admin has dashboard access")
    
    def test_super_admin_orders_access(self, super_admin_token):
        response = requests.get(f"{BASE_URL}/api/admin/orders", 
            headers={"Authorization": f"Bearer {super_admin_token}"})
        assert response.status_code == 200
        print("✅ Super admin has orders access")
    
    def test_super_admin_customers_access(self, super_admin_token):
        response = requests.get(f"{BASE_URL}/api/admin/customers", 
            headers={"Authorization": f"Bearer {super_admin_token}"})
        assert response.status_code == 200
        print("✅ Super admin has customers access")
    
    # Marketing Manager - limited access
    def test_marketing_dashboard_access(self, marketing_token):
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", 
            headers={"Authorization": f"Bearer {marketing_token}"})
        assert response.status_code == 200
        print("✅ Marketing manager has dashboard access")
    
    def test_marketing_orders_access(self, marketing_token):
        response = requests.get(f"{BASE_URL}/api/admin/orders", 
            headers={"Authorization": f"Bearer {marketing_token}"})
        assert response.status_code == 200
        print("✅ Marketing manager has orders view access")
    
    # Finance Manager - finance focused access
    def test_finance_dashboard_access(self, finance_token):
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", 
            headers={"Authorization": f"Bearer {finance_token}"})
        assert response.status_code == 200
        print("✅ Finance manager has dashboard access")
    
    def test_finance_withdrawals_access(self, finance_token):
        response = requests.get(f"{BASE_URL}/api/admin/withdrawals", 
            headers={"Authorization": f"Bearer {finance_token}"})
        assert response.status_code == 200
        print("✅ Finance manager has withdrawals access")
    
    # Support Manager - customer focused
    def test_support_dashboard_access(self, support_token):
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", 
            headers={"Authorization": f"Bearer {support_token}"})
        assert response.status_code == 200
        print("✅ Support manager has dashboard access")
    
    def test_support_orders_access(self, support_token):
        response = requests.get(f"{BASE_URL}/api/admin/orders", 
            headers={"Authorization": f"Bearer {support_token}"})
        assert response.status_code == 200
        print("✅ Support manager has orders access")
    
    def test_support_customers_access(self, support_token):
        response = requests.get(f"{BASE_URL}/api/admin/customers", 
            headers={"Authorization": f"Bearer {support_token}"})
        assert response.status_code == 200
        print("✅ Support manager has customers access")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
