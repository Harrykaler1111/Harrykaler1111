"""
Iteration 14 Tests: Vendor Analytics Dashboard
Tests the new analytics endpoint and verifies previous features still work
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"
SUPERADMIN_EMAIL = "superadmin@pigma.com"
SUPERADMIN_PASSWORD = "superadmin123"


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")


class TestVendorAnalytics:
    """Tests for the new Vendor Analytics Dashboard endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as vendor before each test"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        data = response.json()
        self.vendor_token = data["token"]
        self.vendor = data["vendor"]
        self.headers = {
            "Authorization": f"Bearer {self.vendor_token}",
            "Content-Type": "application/json"
        }
        print(f"✓ Logged in as vendor: {self.vendor['store_name']}")
    
    def test_analytics_overview_endpoint_exists(self):
        """Test GET /api/vendors/analytics/overview returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/analytics/overview",
            headers=self.headers
        )
        assert response.status_code == 200, f"Analytics endpoint failed: {response.text}"
        print("✓ Analytics overview endpoint accessible")
    
    def test_analytics_overview_has_summary(self):
        """Test analytics response contains summary with all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/analytics/overview",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check summary exists
        assert "summary" in data, "Missing 'summary' in response"
        summary = data["summary"]
        
        # Check all required summary fields
        required_fields = [
            "total_revenue", "total_orders", "avg_order_value",
            "credit_balance", "total_credits_spent", "active_promotions",
            "total_promotions", "promoted_revenue", "promotion_roi"
        ]
        for field in required_fields:
            assert field in summary, f"Missing '{field}' in summary"
        
        print(f"✓ Summary contains all required fields: {list(summary.keys())}")
    
    def test_analytics_overview_has_sales_trend(self):
        """Test analytics response contains 30-day sales trend"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/analytics/overview",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check sales_trend exists and has 30 days
        assert "sales_trend" in data, "Missing 'sales_trend' in response"
        sales_trend = data["sales_trend"]
        assert len(sales_trend) == 30, f"Expected 30 days, got {len(sales_trend)}"
        
        # Check each day has required fields
        for day in sales_trend:
            assert "date" in day, "Missing 'date' in sales_trend item"
            assert "revenue" in day, "Missing 'revenue' in sales_trend item"
            assert "orders" in day, "Missing 'orders' in sales_trend item"
        
        print(f"✓ Sales trend has 30 days of data")
    
    def test_analytics_overview_has_top_products(self):
        """Test analytics response contains top_products array"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/analytics/overview",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check top_products exists (may be empty for new vendor)
        assert "top_products" in data, "Missing 'top_products' in response"
        assert isinstance(data["top_products"], list), "top_products should be a list"
        
        # If there are products, check structure
        if len(data["top_products"]) > 0:
            product = data["top_products"][0]
            assert "product_id" in product
            assert "name" in product
            assert "revenue" in product
            assert "orders" in product
            assert "units_sold" in product
        
        print(f"✓ Top products array present (count: {len(data['top_products'])})")
    
    def test_analytics_overview_has_credit_usage(self):
        """Test analytics response contains credit_usage breakdown"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/analytics/overview",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check credit_usage exists
        assert "credit_usage" in data, "Missing 'credit_usage' in response"
        assert isinstance(data["credit_usage"], list), "credit_usage should be a list"
        
        # If there are credit usages, check structure
        if len(data["credit_usage"]) > 0:
            usage = data["credit_usage"][0]
            assert "type" in usage
            assert "credits" in usage
            assert "count" in usage
        
        print(f"✓ Credit usage breakdown present (count: {len(data['credit_usage'])})")
    
    def test_analytics_overview_has_recent_transactions(self):
        """Test analytics response contains recent_credit_transactions"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/analytics/overview",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check recent_credit_transactions exists
        assert "recent_credit_transactions" in data, "Missing 'recent_credit_transactions' in response"
        assert isinstance(data["recent_credit_transactions"], list), "recent_credit_transactions should be a list"
        
        # If there are transactions, check structure
        if len(data["recent_credit_transactions"]) > 0:
            txn = data["recent_credit_transactions"][0]
            assert "transaction_id" in txn
            assert "type" in txn
            assert "amount" in txn
            assert "created_at" in txn
        
        print(f"✓ Recent credit transactions present (count: {len(data['recent_credit_transactions'])})")
    
    def test_analytics_requires_auth(self):
        """Test analytics endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/vendors/analytics/overview")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Analytics endpoint requires authentication")


class TestPreviousFeaturesStillWork:
    """Verify previous iteration features still work"""
    
    def test_vendor_login(self):
        """Test vendor login still works"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "vendor" in data
        print("✓ Vendor login works")
    
    def test_vendor_dashboard(self):
        """Test vendor dashboard endpoint still works"""
        # Login first
        login_res = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/vendors/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        print("✓ Vendor dashboard endpoint works")
    
    def test_vendor_credits_endpoint(self):
        """Test vendor credits endpoint still works"""
        # Login first
        login_res = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/vendors/promotions/credits", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        print(f"✓ Vendor credits endpoint works (balance: {data['balance']})")
    
    def test_top_sellers_endpoint(self):
        """Test top sellers endpoint still works (Zomato-style vendors)"""
        response = requests.get(f"{BASE_URL}/api/vendors/top-sellers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Top sellers endpoint works (count: {len(data)})")
    
    def test_chat_endpoint(self):
        """Test AI chat endpoint still works"""
        response = requests.post(f"{BASE_URL}/api/chat", json={
            "message": "Hello",
            "session_id": None
        })
        assert response.status_code == 200
        data = response.json()
        assert "response" in data or "message" in data
        print("✓ Chat endpoint works")
    
    def test_admin_login(self):
        """Test admin login still works"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "admin" in data
        print("✓ Admin login works")


class TestVendorPromotionsIntegration:
    """Test promotions and credits integration with analytics"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as vendor before each test"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.vendor_token = data["token"]
        self.headers = {
            "Authorization": f"Bearer {self.vendor_token}",
            "Content-Type": "application/json"
        }
    
    def test_credit_transactions_endpoint(self):
        """Test credit transactions endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/promotions/credits/transactions",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Credit transactions endpoint works (count: {len(data)})")
    
    def test_my_promotions_endpoint(self):
        """Test my promotions endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/promotions/my",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ My promotions endpoint works (count: {len(data)})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
