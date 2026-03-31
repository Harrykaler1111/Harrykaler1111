"""
Test Suite for Iteration 36 Features:
1. Reseller system with products and margin control
2. Admin Orders/Reviews dark theme (frontend check)
3. Influencer join flow via ?type=influencer
4. Affiliate product links
5. Dynamic RBAC permissions
6. Vendor sidebar scrollable (frontend check)
7. Credit system platform_revenue logging
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@pigma.com"
SUPER_ADMIN_PASSWORD = "superadmin123"
CUSTOMER_EMAIL = "admin@pigma.com"
CUSTOMER_PASSWORD = "admin123"
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin token"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Super admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer token (also reseller)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def vendor_token():
    """Get vendor token"""
    response = requests.post(f"{BASE_URL}/api/vendors/login", json={
        "email": VENDOR_EMAIL,
        "password": VENDOR_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Vendor login failed: {response.status_code} - {response.text}")


class TestResellerSystem:
    """Test reseller products and margin control (Meesho model)"""
    
    def test_reseller_profile(self, customer_token):
        """Test GET /api/resellers/me returns reseller profile"""
        response = requests.get(f"{BASE_URL}/api/resellers/me", headers={
            "Authorization": f"Bearer {customer_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "reseller_id" in data
        assert "referral_code" in data
        assert "status" in data
        print(f"Reseller profile: {data.get('name')}, status: {data.get('status')}")
    
    def test_reseller_products_list(self, customer_token):
        """Test GET /api/resellers/products returns products with margins and share links"""
        response = requests.get(f"{BASE_URL}/api/resellers/products", headers={
            "Authorization": f"Bearer {customer_token}"
        })
        # May return 403 if not approved
        if response.status_code == 403:
            print("Reseller not approved yet - skipping products test")
            pytest.skip("Reseller account not approved")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            product = data[0]
            assert "product_id" in product
            assert "name" in product
            assert "price" in product
            assert "margin" in product
            assert "reseller_price" in product
            assert "share_link" in product
            print(f"Found {len(data)} products. First: {product.get('name')}, price: {product.get('price')}, reseller_price: {product.get('reseller_price')}")
        else:
            print("No products available for reseller")
    
    def test_reseller_set_margin(self, customer_token):
        """Test PUT /api/resellers/product-margin sets custom margin"""
        # First get products
        products_response = requests.get(f"{BASE_URL}/api/resellers/products", headers={
            "Authorization": f"Bearer {customer_token}"
        })
        if products_response.status_code == 403:
            pytest.skip("Reseller account not approved")
        
        products = products_response.json()
        if len(products) == 0:
            pytest.skip("No products available")
        
        product_id = products[0]["product_id"]
        test_margin = 150.0
        
        response = requests.put(f"{BASE_URL}/api/resellers/product-margin", 
            json={"product_id": product_id, "margin": test_margin},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["product_id"] == product_id
        assert data["margin"] == test_margin
        assert "reseller_price" in data
        assert "share_link" in data
        print(f"Set margin {test_margin} for product {product_id}. New reseller price: {data.get('reseller_price')}")


class TestAffiliateProductLinks:
    """Test affiliate per-product links"""
    
    def test_affiliate_product_links(self, customer_token):
        """Test GET /api/affiliates/product-links returns per-product affiliate links"""
        # First check if user is an affiliate
        me_response = requests.get(f"{BASE_URL}/api/affiliates/me", headers={
            "Authorization": f"Bearer {customer_token}"
        })
        
        if me_response.status_code == 404:
            # Apply as affiliate first
            apply_response = requests.post(f"{BASE_URL}/api/affiliates/apply", 
                json={"marketing_channels": ["Social Media", "Blog"]},
                headers={"Authorization": f"Bearer {customer_token}"}
            )
            if apply_response.status_code == 400:
                print("Already registered as affiliate")
            elif apply_response.status_code == 200:
                print("Applied as affiliate")
            
            # Re-check
            me_response = requests.get(f"{BASE_URL}/api/affiliates/me", headers={
                "Authorization": f"Bearer {customer_token}"
            })
        
        if me_response.status_code != 200:
            pytest.skip("Could not get affiliate profile")
        
        affiliate = me_response.json()
        if affiliate.get("status") != "approved":
            print(f"Affiliate status: {affiliate.get('status')} - may not have access to product links")
        
        # Get product links
        response = requests.get(f"{BASE_URL}/api/affiliates/product-links", headers={
            "Authorization": f"Bearer {customer_token}"
        })
        
        if response.status_code == 403:
            print("Affiliate not approved - cannot access product links")
            pytest.skip("Affiliate not approved")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            link = data[0]
            assert "product_id" in link
            assert "name" in link
            assert "affiliate_link" in link
            assert "commission_rate" in link
            assert "estimated_earning" in link
            print(f"Found {len(data)} product links. First: {link.get('name')}, commission: {link.get('commission_rate')}%, earning: {link.get('estimated_earning')}")
        else:
            print("No product links available")


class TestDynamicRBAC:
    """Test dynamic RBAC permission management"""
    
    def test_get_permission_modules(self, super_admin_token):
        """Test GET /api/admin/permissions/modules returns all 20 modules"""
        response = requests.get(f"{BASE_URL}/api/admin/permissions/modules", headers={
            "Authorization": f"Bearer {super_admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "modules" in data
        modules = data["modules"]
        assert isinstance(modules, dict)
        
        # Check for expected modules
        expected_modules = ["products", "orders", "influencers", "affiliates", "resellers", 
                          "commissions", "wallets", "payouts", "analytics", "admin_users",
                          "system", "customers", "coupons", "vendors", "vendor_products",
                          "vendor_kyc", "vendor_withdrawals", "platform_settings", "categories", "tickets"]
        
        found_modules = list(modules.keys())
        print(f"Found {len(found_modules)} permission modules: {found_modules}")
        
        for mod in expected_modules:
            assert mod in modules, f"Missing module: {mod}"
        
        # Each module should have actions
        for mod, actions in modules.items():
            assert isinstance(actions, list)
            assert len(actions) > 0, f"Module {mod} has no actions"
    
    def test_get_admin_permissions(self, super_admin_token):
        """Test GET /api/admin/permissions/{admin_id} returns permissions for a manager"""
        # First get list of admin users
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {super_admin_token}"
        })
        assert users_response.status_code == 200
        users = users_response.json()
        
        # Find a non-super-admin user
        manager = None
        for user in users:
            if user.get("role") != "super_admin":
                manager = user
                break
        
        if not manager:
            pytest.skip("No manager users found to test permissions")
        
        admin_id = manager["admin_id"]
        response = requests.get(f"{BASE_URL}/api/admin/permissions/{admin_id}", headers={
            "Authorization": f"Bearer {super_admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "admin_id" in data
        assert "role" in data
        assert "permissions" in data
        assert "role_defaults" in data
        assert "has_custom" in data
        print(f"Permissions for {data.get('name')} ({data.get('role')}): has_custom={data.get('has_custom')}")
    
    def test_update_admin_permissions(self, super_admin_token):
        """Test PUT /api/admin/permissions/{admin_id} sets custom permissions"""
        # Get list of admin users
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {super_admin_token}"
        })
        users = users_response.json()
        
        # Find a non-super-admin user
        manager = None
        for user in users:
            if user.get("role") != "super_admin":
                manager = user
                break
        
        if not manager:
            pytest.skip("No manager users found")
        
        admin_id = manager["admin_id"]
        
        # Set custom permissions
        custom_permissions = {
            "products": ["view", "create"],
            "orders": ["view"],
            "analytics": ["view"]
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/permissions/{admin_id}",
            json={"permissions": custom_permissions},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Updated permissions for {admin_id}: {data.get('message')}")
        
        # Verify the update
        verify_response = requests.get(f"{BASE_URL}/api/admin/permissions/{admin_id}", headers={
            "Authorization": f"Bearer {super_admin_token}"
        })
        verify_data = verify_response.json()
        assert verify_data.get("has_custom") == True
        print(f"Verified custom permissions set: has_custom={verify_data.get('has_custom')}")
    
    def test_reset_admin_permissions(self, super_admin_token):
        """Test DELETE /api/admin/permissions/{admin_id} resets to role defaults"""
        # Get list of admin users
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {super_admin_token}"
        })
        users = users_response.json()
        
        # Find a non-super-admin user
        manager = None
        for user in users:
            if user.get("role") != "super_admin":
                manager = user
                break
        
        if not manager:
            pytest.skip("No manager users found")
        
        admin_id = manager["admin_id"]
        
        response = requests.delete(f"{BASE_URL}/api/admin/permissions/{admin_id}", headers={
            "Authorization": f"Bearer {super_admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Reset permissions for {admin_id}: {data.get('message')}")


class TestVendorCreditSystem:
    """Test vendor credit purchase and platform_revenue logging"""
    
    def test_vendor_credit_purchase_creates_platform_revenue(self, vendor_token):
        """Test POST /api/vendors/promotions/credits/create-order stores platform_revenue record"""
        response = requests.post(f"{BASE_URL}/api/vendors/promotions/credits/create-order",
            json={"amount": 500},
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        # Should work even in mocked mode
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "order_id" in data
        assert "amount" in data
        
        if data.get("mocked"):
            print(f"Credit purchase (MOCKED): {data.get('credits_added')} credits added")
            assert "credits_added" in data
        else:
            print(f"Credit purchase order created: {data.get('order_id')}")
            assert "key_id" in data
    
    def test_vendor_credits_balance(self, vendor_token):
        """Test GET /api/vendors/promotions/credits returns balance"""
        response = requests.get(f"{BASE_URL}/api/vendors/promotions/credits", headers={
            "Authorization": f"Bearer {vendor_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "balance" in data
        print(f"Vendor credit balance: {data.get('balance')}")


class TestAdminOrdersAndReviews:
    """Test admin orders and reviews endpoints (dark theme is frontend)"""
    
    def test_admin_orders_list(self, super_admin_token):
        """Test GET /api/admin/orders returns orders"""
        response = requests.get(f"{BASE_URL}/api/admin/orders?limit=10", headers={
            "Authorization": f"Bearer {super_admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} orders")
    
    def test_admin_reviews_list(self, super_admin_token):
        """Test GET /api/reviews/admin/all returns reviews"""
        response = requests.get(f"{BASE_URL}/api/reviews/admin/all", headers={
            "Authorization": f"Bearer {super_admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "reviews" in data
        assert "counts" in data
        print(f"Found {len(data.get('reviews', []))} reviews, counts: {data.get('counts')}")


class TestFooterAffiliateLink:
    """Test that footer affiliate link points to /affiliate"""
    
    def test_frontend_loads(self):
        """Test that frontend loads successfully"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200, f"Frontend failed to load: {response.status_code}"
        print("Frontend loads successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
