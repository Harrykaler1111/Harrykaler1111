"""
Test Suite: Vendor Promotion Request/Approval Workflow (Iteration 60)
Tests the admin-controlled vendor promotion and credit system:
- Vendor submits promotion request
- Admin views/approves/rejects requests
- Admin manually features vendors
- Credit deduction on approval
- Featured vendor management
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"


class TestVendorPromotionWorkflow:
    """Test vendor promotion request and admin approval workflow"""
    
    admin_token = None
    vendor_token = None
    vendor_id = None
    test_request_id = None
    test_featured_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin and vendor"""
        # Admin login
        admin_res = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_res.status_code == 200:
            self.__class__.admin_token = admin_res.json().get("token")
        
        # Vendor login
        vendor_res = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if vendor_res.status_code == 200:
            data = vendor_res.json()
            self.__class__.vendor_token = data.get("token")
            self.__class__.vendor_id = data.get("vendor", {}).get("vendor_id")
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}", "Content-Type": "application/json"}
    
    def get_vendor_headers(self):
        return {"Authorization": f"Bearer {self.vendor_token}", "Content-Type": "application/json"}
    
    # ─── PUBLIC PRICING API ───
    
    def test_01_get_public_pricing(self):
        """GET /api/vendor-credits/pricing - Public pricing endpoint"""
        res = requests.get(f"{BASE_URL}/api/vendor-credits/pricing")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        # Verify pricing fields exist
        assert "credit_rate_inr" in data
        assert "reel_boost_per_hour" in data
        assert "reel_boost_per_day" in data
        assert "reel_boost_per_week" in data
        assert "reel_boost_per_month" in data
        assert "featured_vendor_week" in data
        assert "featured_vendor_month" in data
        print(f"✓ Pricing: {data}")
    
    # ─── VENDOR WALLET ───
    
    def test_02_vendor_wallet(self):
        """GET /api/vendor-credits/wallet - Vendor wallet balance"""
        if not self.vendor_token:
            pytest.skip("Vendor login failed")
        
        res = requests.get(f"{BASE_URL}/api/vendor-credits/wallet", headers=self.get_vendor_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        assert "balance" in data
        assert "total_purchased" in data
        assert "total_spent" in data
        print(f"✓ Vendor wallet: balance={data.get('balance')}, spent={data.get('total_spent')}")
    
    # ─── VENDOR ANALYTICS ───
    
    def test_03_vendor_analytics(self):
        """GET /api/vendor-credits/analytics - Vendor performance stats"""
        if not self.vendor_token:
            pytest.skip("Vendor login failed")
        
        res = requests.get(f"{BASE_URL}/api/vendor-credits/analytics", headers=self.get_vendor_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        assert "total_views" in data
        assert "total_orders" in data
        assert "total_revenue" in data
        assert "credit_balance" in data
        print(f"✓ Analytics: views={data.get('total_views')}, orders={data.get('total_orders')}, revenue={data.get('total_revenue')}")
    
    # ─── VENDOR SUBMITS PROMOTION REQUEST ───
    
    def test_04_vendor_submit_promotion_request(self):
        """POST /api/vendor-credits/request-promotion - Vendor submits reel boost request"""
        if not self.vendor_token:
            pytest.skip("Vendor login failed")
        
        # First get vendor's products
        prod_res = requests.get(f"{BASE_URL}/api/vendors/products", headers=self.get_vendor_headers())
        products = prod_res.json() if prod_res.status_code == 200 else []
        
        # Find an approved product
        approved_products = [p for p in products if p.get("approval_status") == "approved"]
        if not approved_products:
            pytest.skip("No approved products for vendor")
        
        product_id = approved_products[0].get("product_id")
        
        # Submit promotion request
        res = requests.post(f"{BASE_URL}/api/vendor-credits/request-promotion", 
            json={
                "request_type": "reel_boost",
                "product_id": product_id,
                "preferred_duration": "day",
                "quantity": 2,
                "note": "Test promotion request from pytest"
            },
            headers=self.get_vendor_headers()
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        assert "request_id" in data
        assert data.get("status") == "pending"
        assert data.get("request_type") == "reel_boost"
        self.__class__.test_request_id = data.get("request_id")
        print(f"✓ Promotion request created: {data.get('request_id')}")
    
    def test_05_vendor_submit_featured_seller_request(self):
        """POST /api/vendor-credits/request-promotion - Vendor submits featured seller request"""
        if not self.vendor_token:
            pytest.skip("Vendor login failed")
        
        res = requests.post(f"{BASE_URL}/api/vendor-credits/request-promotion", 
            json={
                "request_type": "featured_seller",
                "preferred_duration": "week",
                "quantity": 1,
                "note": "Want to be featured on homepage"
            },
            headers=self.get_vendor_headers()
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        assert data.get("request_type") == "featured_seller"
        assert data.get("status") == "pending"
        print(f"✓ Featured seller request created: {data.get('request_id')}")
    
    # ─── VENDOR VIEWS OWN REQUESTS ───
    
    def test_06_vendor_my_requests(self):
        """GET /api/vendor-credits/my-requests - Vendor sees their requests"""
        if not self.vendor_token:
            pytest.skip("Vendor login failed")
        
        res = requests.get(f"{BASE_URL}/api/vendor-credits/my-requests", headers=self.get_vendor_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        assert isinstance(data, list)
        print(f"✓ Vendor has {len(data)} requests")
        
        # Verify request structure
        if data:
            req = data[0]
            assert "request_id" in req
            assert "request_type" in req
            assert "status" in req
            assert "estimated_cost" in req
    
    # ─── ADMIN: VENDOR LIST WITH BALANCES ───
    
    def test_07_admin_vendor_list(self):
        """GET /api/vendor-credits/admin/vendors - Admin sees all vendors with balances"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        res = requests.get(f"{BASE_URL}/api/vendor-credits/admin/vendors", headers=self.get_admin_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        assert isinstance(data, list)
        print(f"✓ Admin sees {len(data)} vendors")
        
        # Verify vendor structure
        if data:
            v = data[0]
            assert "vendor_id" in v
            assert "vendor_name" in v
            assert "credit_balance" in v
            assert "total_purchased" in v
            assert "total_spent" in v
            assert "is_paid" in v
    
    # ─── ADMIN: VIEW PROMOTION REQUESTS ───
    
    def test_08_admin_get_requests_all(self):
        """GET /api/vendor-credits/admin/requests?status=all - Admin sees all requests"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        res = requests.get(f"{BASE_URL}/api/vendor-credits/admin/requests?status=all", headers=self.get_admin_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        assert isinstance(data, list)
        print(f"✓ Admin sees {len(data)} total requests")
    
    def test_09_admin_get_requests_pending(self):
        """GET /api/vendor-credits/admin/requests?status=pending - Admin sees pending requests"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        res = requests.get(f"{BASE_URL}/api/vendor-credits/admin/requests?status=pending", headers=self.get_admin_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        assert isinstance(data, list)
        pending_count = len(data)
        print(f"✓ Admin sees {pending_count} pending requests")
        
        # All should be pending
        for req in data:
            assert req.get("status") == "pending"
    
    # ─── ADMIN: REJECT REQUEST ───
    
    def test_10_admin_reject_request(self):
        """POST /api/vendor-credits/admin/requests/{id}/action - Admin rejects a request"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Get a pending request to reject
        res = requests.get(f"{BASE_URL}/api/vendor-credits/admin/requests?status=pending", headers=self.get_admin_headers())
        pending = res.json() if res.status_code == 200 else []
        
        if not pending:
            pytest.skip("No pending requests to reject")
        
        # Find a featured_seller request to reject (keep reel_boost for approval test)
        featured_req = next((r for r in pending if r.get("request_type") == "featured_seller"), None)
        if not featured_req:
            pytest.skip("No featured_seller request to reject")
        
        req_id = featured_req.get("request_id")
        
        res = requests.post(f"{BASE_URL}/api/vendor-credits/admin/requests/{req_id}/action",
            json={"action": "reject", "admin_note": "Rejected by pytest"},
            headers=self.get_admin_headers()
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        assert "rejected" in data.get("message", "").lower()
        print(f"✓ Request {req_id} rejected")
    
    # ─── ADMIN: APPROVE REQUEST (DEDUCTS CREDITS) ───
    
    def test_11_admin_approve_request(self):
        """POST /api/vendor-credits/admin/requests/{id}/action - Admin approves a request"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Get a pending reel_boost request
        res = requests.get(f"{BASE_URL}/api/vendor-credits/admin/requests?status=pending", headers=self.get_admin_headers())
        pending = res.json() if res.status_code == 200 else []
        
        reel_req = next((r for r in pending if r.get("request_type") == "reel_boost"), None)
        if not reel_req:
            pytest.skip("No pending reel_boost request to approve")
        
        req_id = reel_req.get("request_id")
        vendor_id = reel_req.get("vendor_id")
        
        # Get vendor's balance before approval
        vendors_res = requests.get(f"{BASE_URL}/api/vendor-credits/admin/vendors", headers=self.get_admin_headers())
        vendors = vendors_res.json() if vendors_res.status_code == 200 else []
        vendor_before = next((v for v in vendors if v.get("vendor_id") == vendor_id), None)
        balance_before = vendor_before.get("credit_balance", 0) if vendor_before else 0
        
        # Approve the request
        res = requests.post(f"{BASE_URL}/api/vendor-credits/admin/requests/{req_id}/action",
            json={"action": "approve", "admin_note": "Approved by pytest"},
            headers=self.get_admin_headers()
        )
        
        # May fail if vendor has insufficient credits
        if res.status_code == 400 and "insufficient" in res.text.lower():
            print(f"⚠ Vendor has insufficient credits to approve request")
            pytest.skip("Vendor has insufficient credits")
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        assert "approved" in data.get("message", "").lower()
        credits_deducted = data.get("credits_deducted", 0)
        print(f"✓ Request {req_id} approved, {credits_deducted} credits deducted")
        
        # Verify credits were deducted
        if credits_deducted > 0:
            vendors_res = requests.get(f"{BASE_URL}/api/vendor-credits/admin/vendors", headers=self.get_admin_headers())
            vendors = vendors_res.json() if vendors_res.status_code == 200 else []
            vendor_after = next((v for v in vendors if v.get("vendor_id") == vendor_id), None)
            balance_after = vendor_after.get("credit_balance", 0) if vendor_after else 0
            
            assert balance_after == balance_before - credits_deducted, f"Expected balance {balance_before - credits_deducted}, got {balance_after}"
            print(f"✓ Credits deducted: {balance_before} -> {balance_after}")
    
    # ─── ADMIN: MANUALLY FEATURE VENDOR ───
    
    def test_12_admin_feature_vendor(self):
        """POST /api/vendor-credits/admin/feature-vendor - Admin manually features a vendor"""
        if not self.admin_token or not self.vendor_id:
            pytest.skip("Admin login or vendor_id missing")
        
        res = requests.post(f"{BASE_URL}/api/vendor-credits/admin/feature-vendor",
            json={"vendor_id": self.vendor_id, "duration": "week"},
            headers=self.get_admin_headers()
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        assert "featured" in data
        self.__class__.test_featured_id = data.get("featured", {}).get("featured_id")
        print(f"✓ Vendor {self.vendor_id} featured: {self.test_featured_id}")
    
    # ─── ADMIN: GET FEATURED VENDORS ───
    
    def test_13_admin_get_featured_vendors(self):
        """GET /api/vendor-credits/admin/featured-vendors - Admin sees featured vendors"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        res = requests.get(f"{BASE_URL}/api/vendor-credits/admin/featured-vendors", headers=self.get_admin_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        assert isinstance(data, list)
        print(f"✓ Admin sees {len(data)} featured vendors")
        
        # Verify structure
        if data:
            f = data[0]
            assert "featured_id" in f
            assert "vendor_id" in f
            assert "duration" in f
            assert "expires_at" in f
    
    # ─── ADMIN: REMOVE FEATURED VENDOR ───
    
    def test_14_admin_remove_featured(self):
        """DELETE /api/vendor-credits/admin/feature-vendor/{id} - Admin removes featured vendor"""
        if not self.admin_token or not self.test_featured_id:
            pytest.skip("Admin login or featured_id missing")
        
        res = requests.delete(f"{BASE_URL}/api/vendor-credits/admin/feature-vendor/{self.test_featured_id}", 
            headers=self.get_admin_headers()
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        assert "removed" in data.get("message", "").lower()
        print(f"✓ Featured vendor {self.test_featured_id} removed")
    
    # ─── ADMIN: GET ALL BOOSTS ───
    
    def test_15_admin_all_boosts(self):
        """GET /api/vendor-credits/admin/all-boosts - Admin sees all reel boosts"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        res = requests.get(f"{BASE_URL}/api/vendor-credits/admin/all-boosts", headers=self.get_admin_headers())
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        assert isinstance(data, list)
        print(f"✓ Admin sees {len(data)} boosts")
        
        # Verify boost structure
        if data:
            b = data[0]
            assert "boost_id" in b
            assert "vendor_id" in b
            assert "product_id" in b
            assert "credits_spent" in b
            assert "expires_at" in b
    
    # ─── ADMIN: UPDATE PRICING ───
    
    def test_16_admin_update_pricing(self):
        """PUT /api/vendor-credits/admin/pricing - Admin updates pricing"""
        if not self.admin_token:
            pytest.skip("Admin login failed")
        
        # Get current pricing
        current = requests.get(f"{BASE_URL}/api/vendor-credits/pricing").json()
        
        # Update one field
        new_rate = current.get("reel_boost_per_day", 30) + 1
        
        res = requests.put(f"{BASE_URL}/api/vendor-credits/admin/pricing",
            json={"reel_boost_per_day": new_rate},
            headers=self.get_admin_headers()
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        assert data.get("pricing", {}).get("reel_boost_per_day") == new_rate
        print(f"✓ Pricing updated: reel_boost_per_day = {new_rate}")
        
        # Revert
        requests.put(f"{BASE_URL}/api/vendor-credits/admin/pricing",
            json={"reel_boost_per_day": current.get("reel_boost_per_day", 30)},
            headers=self.get_admin_headers()
        )
    
    # ─── PUBLIC: FEATURED VENDORS ───
    
    def test_17_public_featured_vendors(self):
        """GET /api/vendor-credits/featured-vendors - Public featured vendors list"""
        res = requests.get(f"{BASE_URL}/api/vendor-credits/featured-vendors")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        assert isinstance(data, list)
        print(f"✓ Public sees {len(data)} featured vendors")
    
    # ─── PUBLIC: REELS FEED ───
    
    def test_18_public_reels_feed(self):
        """GET /api/vendor-credits/reels-feed - Public reels feed with boosted products"""
        res = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed?limit=20")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        
        assert "products" in data
        assert "boosted_count" in data
        print(f"✓ Reels feed: {len(data.get('products', []))} products, {data.get('boosted_count')} boosted")


class TestRegressionChecks:
    """Regression tests for homepage, products, reels"""
    
    def test_homepage_loads(self):
        """GET / - Homepage loads"""
        res = requests.get(f"{BASE_URL}/api/products?limit=10")
        assert res.status_code == 200
        print("✓ Products API working")
    
    def test_products_page(self):
        """GET /api/products - Products page loads"""
        res = requests.get(f"{BASE_URL}/api/products")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list) or "products" in data
        print(f"✓ Products page: {len(data) if isinstance(data, list) else len(data.get('products', []))} products")
    
    def test_reels_feed(self):
        """GET /api/vendor-credits/reels-feed - Reels feed"""
        res = requests.get(f"{BASE_URL}/api/vendor-credits/reels-feed")
        assert res.status_code == 200
        print("✓ Reels feed working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
