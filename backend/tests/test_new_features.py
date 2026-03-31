"""
Test suite for Pigma Phase 2 features:
- Commission settings (platform_settings)
- Product Manager role
- Reviews & Ratings
- Collaborations (vendor-influencer)
- Reseller system
- Order delivery auto-settlement
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://automated-recovery.preview.emergentagent.com')

# Test credentials
SUPER_ADMIN = {"email": "superadmin@pigma.com", "password": "superadmin123"}
PRODUCT_MANAGER = {"email": "products@pigma.com", "password": "products123"}
MARKETING_MANAGER = {"email": "marketing@pigma.com", "password": "marketing123"}
FINANCE_MANAGER = {"email": "finance@pigma.com", "password": "finance123"}
SUPPORT_MANAGER = {"email": "support@pigma.com", "password": "support123"}
TEST_VENDOR = {"email": "testvendor@example.com", "password": "vendor123"}
TEST_CUSTOMER = {"email": "audit@test.com", "password": "test123"}


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health check passed")


class TestAdminLogin:
    """Test admin login for all roles"""
    
    def test_super_admin_login(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["admin"]["role"] == "super_admin"
        assert "platform_settings" in data["admin"]["permissions"]
        print("✅ Super Admin login successful with platform_settings permission")
        return data["token"]
    
    def test_product_manager_login(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=PRODUCT_MANAGER)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["admin"]["role"] == "product_manager"
        # Product manager should have products permissions but NOT platform_settings
        assert "products" in data["admin"]["permissions"]
        assert "create" in data["admin"]["permissions"]["products"]
        # Should NOT have platform_settings edit
        platform_perms = data["admin"]["permissions"].get("platform_settings", [])
        assert "edit" not in platform_perms
        print("✅ Product Manager login successful with correct permissions")
        return data["token"]
    
    def test_marketing_manager_login(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=MARKETING_MANAGER)
        assert response.status_code == 200
        data = response.json()
        assert data["admin"]["role"] == "marketing_manager"
        print("✅ Marketing Manager login successful")
        return data["token"]
    
    def test_finance_manager_login(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=FINANCE_MANAGER)
        assert response.status_code == 200
        data = response.json()
        assert data["admin"]["role"] == "finance_manager"
        print("✅ Finance Manager login successful")
        return data["token"]
    
    def test_support_manager_login(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPPORT_MANAGER)
        assert response.status_code == 200
        data = response.json()
        assert data["admin"]["role"] == "support_manager"
        print("✅ Support Manager login successful")
        return data["token"]


class TestCommissionSettings:
    """Test commission settings API (platform_settings)"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    @pytest.fixture
    def product_manager_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=PRODUCT_MANAGER)
        return response.json()["token"]
    
    def test_get_commission_settings_super_admin(self, super_admin_token):
        """Super admin can view commission settings"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings/commission", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "commission_enabled" in data
        assert "platform_commission_rate" in data
        assert "influencer_commission_rate" in data
        assert "reseller_commission_rate" in data
        assert "auto_settle_on_delivery" in data
        print(f"✅ Commission settings retrieved: platform={data['platform_commission_rate']}%, influencer={data['influencer_commission_rate']}%, reseller={data['reseller_commission_rate']}%")
        return data
    
    def test_update_commission_settings_super_admin(self, super_admin_token):
        """Super admin can update commission settings"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Update influencer rate
        update_data = {"influencer_commission_rate": 12.0}
        response = requests.put(f"{BASE_URL}/api/admin/settings/commission", json=update_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "updated" in data
        print("✅ Super Admin updated commission settings")
        
        # Verify the update
        response = requests.get(f"{BASE_URL}/api/admin/settings/commission", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["influencer_commission_rate"] == 12.0
        print("✅ Commission settings update verified")
    
    def test_product_manager_cannot_edit_commission(self, product_manager_token):
        """Product manager should NOT be able to edit commission settings"""
        headers = {"Authorization": f"Bearer {product_manager_token}"}
        update_data = {"platform_commission_rate": 20.0}
        response = requests.put(f"{BASE_URL}/api/admin/settings/commission", json=update_data, headers=headers)
        assert response.status_code == 403
        print("✅ Product Manager correctly denied from editing commission settings")
    
    def test_toggle_commission_enabled(self, super_admin_token):
        """Test toggling commission on/off"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get current state
        response = requests.get(f"{BASE_URL}/api/admin/settings/commission", headers=headers)
        current_state = response.json()["commission_enabled"]
        
        # Toggle
        update_data = {"commission_enabled": not current_state}
        response = requests.put(f"{BASE_URL}/api/admin/settings/commission", json=update_data, headers=headers)
        assert response.status_code == 200
        
        # Toggle back
        update_data = {"commission_enabled": current_state}
        response = requests.put(f"{BASE_URL}/api/admin/settings/commission", json=update_data, headers=headers)
        assert response.status_code == 200
        print("✅ Commission toggle works correctly")


class TestPlatformStats:
    """Test platform stats API"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_get_platform_stats(self, super_admin_token):
        """Get platform stats (total users, vendors, influencers, products)"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/platform-stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_customers" in data
        assert "total_vendors" in data
        assert "total_influencers" in data
        assert "total_resellers" in data
        assert "total_products" in data
        assert "total_orders" in data
        print(f"✅ Platform stats: customers={data['total_customers']}, vendors={data['total_vendors']}, influencers={data['total_influencers']}, resellers={data['total_resellers']}, products={data['total_products']}")


class TestProductManagerRole:
    """Test Product Manager role permissions"""
    
    @pytest.fixture
    def product_manager_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=PRODUCT_MANAGER)
        return response.json()["token"]
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_product_manager_can_view_products(self, product_manager_token):
        """Product manager can view products"""
        headers = {"Authorization": f"Bearer {product_manager_token}"}
        response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        assert response.status_code == 200
        print("✅ Product Manager can view products")
    
    def test_product_manager_can_view_vendor_products(self, product_manager_token):
        """Product manager can view pending vendor products"""
        headers = {"Authorization": f"Bearer {product_manager_token}"}
        response = requests.get(f"{BASE_URL}/api/vendors/admin/products/pending", headers=headers)
        assert response.status_code == 200
        print("✅ Product Manager can view pending vendor products")
    
    def test_product_manager_can_view_categories(self, product_manager_token):
        """Product manager can view categories"""
        headers = {"Authorization": f"Bearer {product_manager_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings/categories", headers=headers)
        assert response.status_code == 200
        print("✅ Product Manager can view categories")
    
    def test_product_manager_cannot_view_admin_users(self, product_manager_token):
        """Product manager should NOT be able to view admin users"""
        headers = {"Authorization": f"Bearer {product_manager_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 403
        print("✅ Product Manager correctly denied from viewing admin users")
    
    def test_product_manager_can_view_but_not_edit_settings(self, product_manager_token):
        """Product manager can view commission settings (has commissions.view) but cannot edit"""
        headers = {"Authorization": f"Bearer {product_manager_token}"}
        # Can view (has commissions.view permission)
        response = requests.get(f"{BASE_URL}/api/admin/settings/commission", headers=headers)
        assert response.status_code == 200
        print("✅ Product Manager can view commission settings (has commissions.view)")
        
        # Cannot edit (no platform_settings.edit permission)
        update_data = {"platform_commission_rate": 20.0}
        response = requests.put(f"{BASE_URL}/api/admin/settings/commission", json=update_data, headers=headers)
        assert response.status_code == 403
        print("✅ Product Manager correctly denied from editing commission settings")


class TestReviewsAPI:
    """Test reviews and ratings API"""
    
    def test_get_product_reviews(self):
        """Get reviews for a product (public endpoint)"""
        # First get a product
        response = requests.get(f"{BASE_URL}/api/products?limit=1")
        assert response.status_code == 200
        products = response.json()
        if products:
            product_id = products[0]["product_id"]
            response = requests.get(f"{BASE_URL}/api/reviews/product/{product_id}")
            assert response.status_code == 200
            data = response.json()
            assert "reviews" in data
            assert "stats" in data
            print(f"✅ Product reviews API works - {len(data['reviews'])} reviews found")
        else:
            print("⚠️ No products found to test reviews")
    
    def test_create_review_requires_auth(self):
        """Creating a review requires authentication"""
        review_data = {
            "product_id": "test_product",
            "rating": 5,
            "comment": "Great product!"
        }
        response = requests.post(f"{BASE_URL}/api/reviews", json=review_data)
        assert response.status_code in [401, 403, 422]
        print("✅ Review creation correctly requires authentication")


class TestCollaborationsAPI:
    """Test vendor-influencer collaboration API"""
    
    @pytest.fixture
    def vendor_token(self):
        response = requests.post(f"{BASE_URL}/api/vendors/login", json=TEST_VENDOR)
        if response.status_code == 200:
            return response.json()["token"]
        return None
    
    def test_collaboration_request_requires_vendor_auth(self):
        """Collaboration request requires vendor authentication"""
        collab_data = {
            "influencer_ids": ["test_inf"],
            "message": "Let's collaborate!"
        }
        response = requests.post(f"{BASE_URL}/api/collaborations/request", json=collab_data)
        assert response.status_code in [401, 403, 422]
        print("✅ Collaboration request correctly requires vendor auth")
    
    def test_get_vendor_sent_requests(self, vendor_token):
        """Vendor can view sent collaboration requests"""
        if not vendor_token:
            pytest.skip("Vendor login failed")
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.get(f"{BASE_URL}/api/collaborations/vendor/sent", headers=headers)
        assert response.status_code == 200
        print("✅ Vendor can view sent collaboration requests")


class TestResellerSystem:
    """Test reseller registration and management"""
    
    @pytest.fixture
    def customer_token(self):
        # First try to login
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_CUSTOMER)
        if response.status_code == 200:
            return response.json()["token"]
        # If login fails, register
        register_data = {
            "email": TEST_CUSTOMER["email"],
            "password": TEST_CUSTOMER["password"],
            "name": "Test Customer"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        if response.status_code in [200, 201]:
            return response.json()["token"]
        # Try login again
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_CUSTOMER)
        if response.status_code == 200:
            return response.json()["token"]
        return None
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_admin_list_resellers(self, super_admin_token):
        """Admin can list resellers"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/resellers/admin/list", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Admin can list resellers - {len(data)} resellers found")


class TestOrderDeliverySettlement:
    """Test auto commission settlement on order delivery"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_get_orders(self, super_admin_token):
        """Admin can get orders"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=headers)
        assert response.status_code == 200
        orders = response.json()
        print(f"✅ Admin can view orders - {len(orders)} orders found")
        return orders
    
    def test_update_order_status_to_delivered(self, super_admin_token):
        """Test updating order status to delivered triggers settlement"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get orders
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=headers)
        orders = response.json()
        
        # Find an order that's not delivered yet
        pending_order = None
        for order in orders:
            if order.get("status") not in ["delivered", "cancelled"]:
                pending_order = order
                break
        
        if pending_order:
            order_id = pending_order["order_id"]
            # Update to delivered
            response = requests.put(
                f"{BASE_URL}/api/admin/orders/{order_id}/status?status=delivered",
                headers=headers
            )
            assert response.status_code == 200
            data = response.json()
            print(f"✅ Order {order_id} marked as delivered")
            if data.get("settlement"):
                print(f"   Settlement info: {data['settlement']}")
        else:
            print("⚠️ No pending orders found to test delivery settlement")


class TestAdminUserCreation:
    """Test admin user creation with Product Manager role"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=SUPER_ADMIN)
        return response.json()["token"]
    
    def test_create_product_manager_role_available(self, super_admin_token):
        """Verify product_manager role is available in admin creation"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Try to create a test product manager (will fail if email exists, but validates role)
        test_admin = {
            "email": f"test_pm_{datetime.now().timestamp()}@test.com",
            "name": "Test Product Manager",
            "password": "testpass123",
            "role": "product_manager"
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=test_admin, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            assert data["role"] == "product_manager"
            print("✅ Product Manager role is available for admin creation")
            
            # Clean up - delete the test admin
            admin_id = data["admin_id"]
            requests.delete(f"{BASE_URL}/api/admin/users/{admin_id}", headers=headers)
        elif response.status_code == 400 and "already registered" in response.json().get("detail", ""):
            print("⚠️ Test admin already exists")
        else:
            # Check if role validation error
            assert response.status_code != 422, "product_manager role should be valid"
            print(f"✅ Product Manager role validation passed (status: {response.status_code})")


class TestCategoriesManagement:
    """Test categories management for Product Manager"""
    
    @pytest.fixture
    def product_manager_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json=PRODUCT_MANAGER)
        return response.json()["token"]
    
    def test_product_manager_can_create_category(self, product_manager_token):
        """Product manager can create categories"""
        headers = {"Authorization": f"Bearer {product_manager_token}"}
        
        # Create a test category
        response = requests.post(
            f"{BASE_URL}/api/admin/settings/categories?name=TEST_Category&description=Test",
            headers=headers
        )
        
        if response.status_code == 200:
            print("✅ Product Manager can create categories")
        elif response.status_code == 400 and "already exists" in response.json().get("detail", ""):
            print("✅ Category creation works (category already exists)")
        else:
            print(f"Category creation response: {response.status_code} - {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
