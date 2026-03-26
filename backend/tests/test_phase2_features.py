"""
Phase 2 Features Test Suite
Tests for:
1. Advanced Offer System (time-based, category-based coupons + validation)
2. Vendor Categories (platform + own categories)
3. Credit-based Promotion System
4. Promoted Products endpoint
5. Marketing Manager RBAC for coupons
"""
import pytest
import requests
import os
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
VENDOR_EMAIL = "vendortest3@example.com"
VENDOR_PASSWORD = "vendor123"
SUPER_ADMIN_EMAIL = "superadmin@pigma.com"
SUPER_ADMIN_PASSWORD = "superadmin123"
MARKETING_MANAGER_EMAIL = "marketing@pigma.com"
MARKETING_MANAGER_PASSWORD = "marketing123"
PRODUCT_MANAGER_EMAIL = "products@pigma.com"
PRODUCT_MANAGER_PASSWORD = "products123"


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ Health check passed")


class TestAdvancedCouponSystem:
    """Tests for advanced coupon creation with time-based, category-based fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as super admin for coupon creation
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        print("✅ Super Admin login successful")
    
    def test_create_coupon_with_time_and_category(self):
        """Test creating coupon with starts_at, expires_at, category, offer_type"""
        now = datetime.now(timezone.utc)
        starts_at = now.isoformat()
        expires_at = (now + timedelta(days=30)).isoformat()
        
        coupon_data = {
            "code": f"TEST_PHASE2_{datetime.now().strftime('%H%M%S')}",
            "discount_type": "percentage",
            "discount_value": 15,
            "min_order_value": 500,
            "max_uses": 50,
            "starts_at": starts_at,
            "expires_at": expires_at,
            "category": "Dresses",
            "offer_type": "seasonal_sale",
            "description": "Phase 2 test coupon with time and category"
        }
        
        response = requests.post(f"{BASE_URL}/api/coupons", json=coupon_data, headers=self.admin_headers)
        assert response.status_code == 200, f"Coupon creation failed: {response.text}"
        
        data = response.json()
        assert data["code"] == coupon_data["code"].upper()
        assert data["starts_at"] == starts_at
        assert data["expires_at"] == expires_at
        assert data["category"] == "Dresses"
        assert data["offer_type"] == "seasonal_sale"
        assert data["is_active"] == True
        print(f"✅ Created coupon with time/category: {data['code']}")
        
        # Store for cleanup
        self.test_coupon_id = data["coupon_id"]
    
    def test_get_active_offers_filters_by_time(self):
        """Test GET /api/coupons/active filters expired/not-started coupons"""
        response = requests.get(f"{BASE_URL}/api/coupons/active")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All returned coupons should be currently active (within time window)
        now = datetime.now(timezone.utc)
        for coupon in data:
            if coupon.get("starts_at"):
                starts_str = coupon["starts_at"]
                if starts_str.endswith('Z'):
                    starts_str = starts_str[:-1] + '+00:00'
                starts = datetime.fromisoformat(starts_str)
                if starts.tzinfo is None:
                    starts = starts.replace(tzinfo=timezone.utc)
                assert starts <= now, f"Coupon {coupon['code']} hasn't started yet"
            if coupon.get("expires_at"):
                expires_str = coupon["expires_at"]
                if expires_str.endswith('Z'):
                    expires_str = expires_str[:-1] + '+00:00'
                expires = datetime.fromisoformat(expires_str)
                if expires.tzinfo is None:
                    expires = expires.replace(tzinfo=timezone.utc)
                assert expires >= now, f"Coupon {coupon['code']} has expired"
        
        print(f"✅ Active offers endpoint returned {len(data)} valid coupons")
    
    def test_get_active_offers_filters_by_category(self):
        """Test GET /api/coupons/active?category=X filters by category"""
        response = requests.get(f"{BASE_URL}/api/coupons/active?category=Dresses")
        assert response.status_code == 200
        
        data = response.json()
        # All returned coupons should either have no category or match "Dresses"
        for coupon in data:
            if coupon.get("category"):
                assert coupon["category"] == "Dresses", f"Wrong category: {coupon['category']}"
        
        print(f"✅ Category filter works - returned {len(data)} coupons for 'Dresses'")
    
    def test_coupon_validation_with_time_checks(self):
        """Test POST /api/coupons/validate checks time-based validity"""
        # First create a currently valid coupon
        now = datetime.now(timezone.utc)
        valid_coupon = {
            "code": f"VALID_NOW_{datetime.now().strftime('%H%M%S')}",
            "discount_type": "percentage",
            "discount_value": 10,
            "min_order_value": 100,
            "max_uses": 100,
            "starts_at": (now - timedelta(hours=1)).isoformat(),
            "expires_at": (now + timedelta(days=7)).isoformat()
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/coupons", json=valid_coupon, headers=self.admin_headers)
        assert create_resp.status_code == 200
        
        # Validate the coupon
        validate_resp = requests.post(
            f"{BASE_URL}/api/coupons/validate?code={valid_coupon['code']}&subtotal=500"
        )
        assert validate_resp.status_code == 200
        
        data = validate_resp.json()
        assert data["valid"] == True
        assert data["discount"] == 50  # 10% of 500
        print(f"✅ Coupon validation with time checks works")
    
    def test_coupon_validation_fails_for_expired(self):
        """Test validation fails for expired coupon"""
        now = datetime.now(timezone.utc)
        expired_coupon = {
            "code": f"EXPIRED_{datetime.now().strftime('%H%M%S')}",
            "discount_type": "flat",
            "discount_value": 100,
            "min_order_value": 0,
            "max_uses": 100,
            "starts_at": (now - timedelta(days=30)).isoformat(),
            "expires_at": (now - timedelta(days=1)).isoformat()  # Expired yesterday
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/coupons", json=expired_coupon, headers=self.admin_headers)
        assert create_resp.status_code == 200
        
        # Try to validate - should fail
        validate_resp = requests.post(
            f"{BASE_URL}/api/coupons/validate?code={expired_coupon['code']}&subtotal=500"
        )
        assert validate_resp.status_code == 400
        assert "expired" in validate_resp.json()["detail"].lower()
        print("✅ Expired coupon validation correctly rejected")
    
    def test_coupon_validation_fails_for_not_started(self):
        """Test validation fails for coupon that hasn't started"""
        now = datetime.now(timezone.utc)
        future_coupon = {
            "code": f"FUTURE_{datetime.now().strftime('%H%M%S')}",
            "discount_type": "percentage",
            "discount_value": 20,
            "min_order_value": 0,
            "max_uses": 100,
            "starts_at": (now + timedelta(days=7)).isoformat(),  # Starts in 7 days
            "expires_at": (now + timedelta(days=30)).isoformat()
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/coupons", json=future_coupon, headers=self.admin_headers)
        assert create_resp.status_code == 200
        
        # Try to validate - should fail
        validate_resp = requests.post(
            f"{BASE_URL}/api/coupons/validate?code={future_coupon['code']}&subtotal=500"
        )
        assert validate_resp.status_code == 400
        assert "started" in validate_resp.json()["detail"].lower()
        print("✅ Not-started coupon validation correctly rejected")
    
    def test_coupon_validation_category_mismatch(self):
        """Test validation fails when category doesn't match"""
        now = datetime.now(timezone.utc)
        category_coupon = {
            "code": f"CATONLY_{datetime.now().strftime('%H%M%S')}",
            "discount_type": "percentage",
            "discount_value": 25,
            "min_order_value": 0,
            "max_uses": 100,
            "starts_at": (now - timedelta(hours=1)).isoformat(),
            "expires_at": (now + timedelta(days=7)).isoformat(),
            "category": "Dresses"
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/coupons", json=category_coupon, headers=self.admin_headers)
        assert create_resp.status_code == 200
        
        # Try to validate with wrong category
        validate_resp = requests.post(
            f"{BASE_URL}/api/coupons/validate?code={category_coupon['code']}&subtotal=500&category=Shoes"
        )
        assert validate_resp.status_code == 400
        assert "category" in validate_resp.json()["detail"].lower()
        print("✅ Category mismatch validation correctly rejected")


class TestVendorCategories:
    """Tests for vendor category management (platform + own categories)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as vendor
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        self.vendor_token = response.json()["token"]
        self.vendor_headers = {"Authorization": f"Bearer {self.vendor_token}"}
        print("✅ Vendor login successful")
    
    def test_get_vendor_categories_returns_both_types(self):
        """Test GET /api/vendors/categories returns platform + vendor categories"""
        response = requests.get(f"{BASE_URL}/api/vendors/categories", headers=self.vendor_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "platform_categories" in data
        assert "vendor_categories" in data
        assert isinstance(data["platform_categories"], list)
        assert isinstance(data["vendor_categories"], list)
        
        print(f"✅ Got {len(data['platform_categories'])} platform categories, {len(data['vendor_categories'])} vendor categories")
    
    def test_create_vendor_category(self):
        """Test POST /api/vendors/categories?name=X creates vendor's own category"""
        cat_name = f"TEST_VendorCat_{datetime.now().strftime('%H%M%S')}"
        
        response = requests.post(
            f"{BASE_URL}/api/vendors/categories?name={cat_name}&description=Test%20category",
            headers=self.vendor_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Category created"
        assert data["category"]["name"] == cat_name
        assert "category_id" in data["category"]
        
        self.created_cat_id = data["category"]["category_id"]
        print(f"✅ Created vendor category: {cat_name}")
        
        # Verify it appears in vendor categories
        get_resp = requests.get(f"{BASE_URL}/api/vendors/categories", headers=self.vendor_headers)
        vendor_cats = get_resp.json()["vendor_categories"]
        cat_names = [c["name"] for c in vendor_cats]
        assert cat_name in cat_names
        print("✅ Category appears in vendor's category list")
    
    def test_delete_vendor_category(self):
        """Test DELETE /api/vendors/categories/{id} deletes vendor's own category"""
        # First create a category to delete
        cat_name = f"DELETE_ME_{datetime.now().strftime('%H%M%S')}"
        create_resp = requests.post(
            f"{BASE_URL}/api/vendors/categories?name={cat_name}",
            headers=self.vendor_headers
        )
        assert create_resp.status_code == 200
        cat_id = create_resp.json()["category"]["category_id"]
        
        # Delete it
        delete_resp = requests.delete(
            f"{BASE_URL}/api/vendors/categories/{cat_id}",
            headers=self.vendor_headers
        )
        assert delete_resp.status_code == 200
        assert delete_resp.json()["message"] == "Category deleted"
        print(f"✅ Deleted vendor category: {cat_id}")
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/vendors/categories", headers=self.vendor_headers)
        vendor_cats = get_resp.json()["vendor_categories"]
        cat_ids = [c["category_id"] for c in vendor_cats]
        assert cat_id not in cat_ids
        print("✅ Category no longer in list after deletion")
    
    def test_cannot_delete_nonexistent_category(self):
        """Test DELETE fails for non-existent category"""
        response = requests.delete(
            f"{BASE_URL}/api/vendors/categories/nonexistent_cat_123",
            headers=self.vendor_headers
        )
        assert response.status_code == 404
        print("✅ 404 returned for non-existent category deletion")


class TestCreditBasedPromotions:
    """Tests for credit-based promotion system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as vendor
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        self.vendor_token = response.json()["token"]
        self.vendor_headers = {"Authorization": f"Bearer {self.vendor_token}"}
        print("✅ Vendor login successful")
    
    def test_get_vendor_credits(self):
        """Test GET /api/vendors/promotions/credits returns credit balance"""
        response = requests.get(f"{BASE_URL}/api/vendors/promotions/credits", headers=self.vendor_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "balance" in data
        assert "vendor_id" in data
        assert isinstance(data["balance"], (int, float))
        
        print(f"✅ Vendor credit balance: {data['balance']}")
    
    def test_buy_promotion_credits(self):
        """Test POST /api/vendors/promotions/buy-credits?amount=500 adds credits"""
        # Get initial balance
        initial_resp = requests.get(f"{BASE_URL}/api/vendors/promotions/credits", headers=self.vendor_headers)
        initial_balance = initial_resp.json().get("balance", 0)
        
        # Buy 500 credits
        buy_resp = requests.post(
            f"{BASE_URL}/api/vendors/promotions/buy-credits?amount=500",
            headers=self.vendor_headers
        )
        assert buy_resp.status_code == 200
        
        data = buy_resp.json()
        assert "Added 500 credits" in data["message"]
        assert data["payment_status"] == "mocked_success"
        print("✅ Bought 500 credits (MOCKED payment)")
        
        # Verify balance increased
        new_resp = requests.get(f"{BASE_URL}/api/vendors/promotions/credits", headers=self.vendor_headers)
        new_balance = new_resp.json()["balance"]
        assert new_balance >= initial_balance + 500
        print(f"✅ Balance increased from {initial_balance} to {new_balance}")
    
    def test_buy_credits_minimum_validation(self):
        """Test buying less than 100 credits fails"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/promotions/buy-credits?amount=50",
            headers=self.vendor_headers
        )
        assert response.status_code == 400
        assert "minimum" in response.json()["detail"].lower()
        print("✅ Minimum credit purchase validation works")
    
    def test_get_my_promotions(self):
        """Test GET /api/vendors/promotions/my returns vendor's promotions"""
        response = requests.get(f"{BASE_URL}/api/vendors/promotions/my", headers=self.vendor_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Got {len(data)} vendor promotions")


class TestPromotedProducts:
    """Tests for promoted products endpoint"""
    
    def test_get_promoted_products_top_20(self):
        """Test GET /api/products/promoted/top_20"""
        response = requests.get(f"{BASE_URL}/api/products/promoted/top_20")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # May be empty if no products are promoted
        print(f"✅ Top 20 promoted products: {len(data)} items")
    
    def test_get_promoted_products_top_100(self):
        """Test GET /api/products/promoted/top_100"""
        response = requests.get(f"{BASE_URL}/api/products/promoted/top_100")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Top 100 promoted products: {len(data)} items")
    
    def test_get_promoted_products_category_top(self):
        """Test GET /api/products/promoted/category_top"""
        response = requests.get(f"{BASE_URL}/api/products/promoted/category_top")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Category top promoted products: {len(data)} items")
    
    def test_invalid_listing_type_returns_400(self):
        """Test invalid listing type returns 400"""
        response = requests.get(f"{BASE_URL}/api/products/promoted/invalid_type")
        assert response.status_code == 400
        print("✅ Invalid listing type correctly returns 400")


class TestMarketingManagerRBAC:
    """Tests for Marketing Manager RBAC - should see coupons tab"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as marketing manager
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": MARKETING_MANAGER_EMAIL,
            "password": MARKETING_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Marketing Manager login failed: {response.text}"
        self.mm_token = response.json()["token"]
        self.mm_headers = {"Authorization": f"Bearer {self.mm_token}"}
        self.mm_data = response.json()
        print("✅ Marketing Manager login successful")
    
    def test_marketing_manager_has_coupons_permission(self):
        """Test Marketing Manager has coupons permission"""
        permissions = self.mm_data.get("admin", {}).get("permissions", {})
        assert "coupons" in permissions, f"Missing coupons permission. Has: {list(permissions.keys())}"
        assert "view" in permissions["coupons"]
        print(f"✅ Marketing Manager has coupons permissions: {permissions.get('coupons')}")
    
    def test_marketing_manager_can_view_coupons(self):
        """Test Marketing Manager can GET /api/coupons"""
        response = requests.get(f"{BASE_URL}/api/coupons", headers=self.mm_headers)
        assert response.status_code == 200, f"Marketing Manager cannot view coupons: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Marketing Manager can view coupons ({len(data)} coupons)")
    
    def test_marketing_manager_cannot_view_products(self):
        """Test Marketing Manager cannot access products admin endpoint"""
        # Try to create a product (should fail)
        product_data = {
            "name": "Test Product",
            "description": "Test",
            "price": 100,
            "category": "Test",
            "sizes": [],
            "colors": [],
            "images": [],
            "stock": 10
        }
        response = requests.post(f"{BASE_URL}/api/products", json=product_data, headers=self.mm_headers)
        assert response.status_code == 403, f"Marketing Manager should not create products: {response.status_code}"
        print("✅ Marketing Manager correctly denied product creation (403)")


class TestProductManagerRBAC:
    """Tests for Product Manager RBAC - should NOT see coupons"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as product manager
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": PRODUCT_MANAGER_EMAIL,
            "password": PRODUCT_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Product Manager login failed: {response.text}"
        self.pm_token = response.json()["token"]
        self.pm_headers = {"Authorization": f"Bearer {self.pm_token}"}
        self.pm_data = response.json()
        print("✅ Product Manager login successful")
    
    def test_product_manager_no_coupons_permission(self):
        """Test Product Manager does NOT have coupons permission (empty array)"""
        permissions = self.pm_data.get("admin", {}).get("permissions", {})
        coupons_perms = permissions.get("coupons", [])
        assert len(coupons_perms) == 0, f"Product Manager should have empty coupons permissions. Has: {coupons_perms}"
        print(f"✅ Product Manager correctly has empty coupons permissions")
    
    def test_product_manager_cannot_view_coupons(self):
        """Test Product Manager cannot GET /api/coupons"""
        response = requests.get(f"{BASE_URL}/api/coupons", headers=self.pm_headers)
        assert response.status_code == 403, f"Product Manager should not view coupons: {response.status_code}"
        print("✅ Product Manager correctly denied coupon access (403)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
