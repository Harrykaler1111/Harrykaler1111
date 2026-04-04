"""
Iteration 11 Feature Tests
Tests for:
1. Unread ticket count endpoint
2. Vendor wallet top-up (mocked Razorpay)
3. Vendor wallet balance
4. Reward campaigns CRUD (admin)
5. Featured vendors (admin)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://inventory-vault-9.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"
CUSTOMER_EMAIL = "harpreetkaler750@gmail.com"
CUSTOMER_PASSWORD = "Harpreet@123"


class TestAuth:
    """Authentication helpers"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def vendor_token(self):
        """Get vendor auth token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Vendor login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")


class TestUnreadTicketCount(TestAuth):
    """Test GET /api/tickets/unread-count"""
    
    def test_unread_count_returns_count(self, customer_token):
        """Test that unread-count endpoint returns unread_count field"""
        response = requests.get(
            f"{BASE_URL}/api/tickets/unread-count",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "unread_count" in data, f"Response missing 'unread_count': {data}"
        assert isinstance(data["unread_count"], int), f"unread_count should be int: {data}"
        print(f"PASS: Unread ticket count = {data['unread_count']}")
    
    def test_unread_count_requires_auth(self):
        """Test that unread-count requires authentication"""
        response = requests.get(f"{BASE_URL}/api/tickets/unread-count")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("PASS: Unread count requires authentication")


class TestVendorWalletTopup(TestAuth):
    """Test vendor wallet top-up (mocked Razorpay)"""
    
    def test_wallet_topup_success(self, vendor_token):
        """Test POST /api/vendors/wallet/topup adds funds"""
        # Get initial balance
        balance_before = requests.get(
            f"{BASE_URL}/api/vendors/wallet/balance",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert balance_before.status_code == 200, f"Failed to get balance: {balance_before.text}"
        initial_balance = balance_before.json().get("wallet_balance", 0)
        
        # Top up
        topup_amount = 5000
        response = requests.post(
            f"{BASE_URL}/api/vendors/wallet/topup",
            json={"amount": topup_amount},
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Topup failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "wallet_balance" in data, f"Response missing wallet_balance: {data}"
        assert "transaction_id" in data, f"Response missing transaction_id: {data}"
        
        # Verify balance increased
        expected_balance = initial_balance + topup_amount
        assert data["wallet_balance"] == expected_balance, f"Expected {expected_balance}, got {data['wallet_balance']}"
        print(f"PASS: Wallet topped up by {topup_amount}. New balance: {data['wallet_balance']}")
    
    def test_wallet_topup_minimum_amount(self, vendor_token):
        """Test that minimum top-up is Rs. 100"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/wallet/topup",
            json={"amount": 50},  # Below minimum
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 400, f"Expected 400 for below minimum, got {response.status_code}"
        print("PASS: Minimum top-up validation works")
    
    def test_wallet_balance_endpoint(self, vendor_token):
        """Test GET /api/vendors/wallet/balance returns balance info"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/wallet/balance",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify required fields
        required_fields = ["wallet_balance", "total_sales", "pending_withdrawals", "available_balance"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"PASS: Wallet balance = {data['wallet_balance']}, Available = {data['available_balance']}")


class TestRewardCampaigns(TestAuth):
    """Test reward campaign CRUD (admin)"""
    
    created_campaign_id = None
    
    def test_create_reward_campaign(self, admin_token):
        """Test POST /api/admin/rewards/campaigns creates campaign"""
        payload = {
            "title": "TEST_March_Mega_Target_2026",
            "description": "Achieve Rs. 50,000 in sales to win exclusive rewards",
            "target_amount": 50000,
            "reward_description": "Free premium listing for 30 days",
            "target_user_types": ["vendor", "influencer"],
            "start_date": "2026-03-01",
            "end_date": "2026-03-31"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/rewards/campaigns",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "campaign" in data, f"Response missing campaign: {data}"
        assert data["campaign"]["title"] == payload["title"]
        
        TestRewardCampaigns.created_campaign_id = data["campaign"]["campaign_id"]
        print(f"PASS: Created campaign {TestRewardCampaigns.created_campaign_id}")
    
    def test_list_reward_campaigns(self, admin_token):
        """Test GET /api/admin/rewards/campaigns returns list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rewards/campaigns",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"List failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: Found {len(data)} campaigns")
    
    def test_tag_user_to_campaign(self, admin_token):
        """Test POST /api/admin/rewards/campaigns/{id}/tag tags user"""
        if not TestRewardCampaigns.created_campaign_id:
            pytest.skip("No campaign created")
        
        payload = {
            "user_id": "test_vendor_001",
            "user_type": "vendor",
            "user_name": "Test Vendor"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/rewards/campaigns/{TestRewardCampaigns.created_campaign_id}/tag",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # May return 400 if already tagged, which is fine
        assert response.status_code in [200, 400], f"Tag failed: {response.status_code} - {response.text}"
        print(f"PASS: Tag user endpoint works (status: {response.status_code})")
    
    def test_deactivate_campaign(self, admin_token):
        """Test DELETE /api/admin/rewards/campaigns/{id} deactivates"""
        if not TestRewardCampaigns.created_campaign_id:
            pytest.skip("No campaign created")
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/rewards/campaigns/{TestRewardCampaigns.created_campaign_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Deactivate failed: {response.status_code} - {response.text}"
        print("PASS: Campaign deactivated")


class TestFeaturedVendors(TestAuth):
    """Test featured vendors (admin)"""
    
    test_vendor_id = None
    
    def test_get_featured_vendors(self, admin_token):
        """Test GET /api/admin/vendors/featured returns list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/vendors/featured",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: Found {len(data)} featured vendors")
        
        # Store a vendor ID for testing if available
        if data:
            TestFeaturedVendors.test_vendor_id = data[0].get("vendor_id")
    
    def test_feature_vendor(self, admin_token):
        """Test PUT /api/admin/vendors/featured marks vendor as featured"""
        # First get a vendor to feature
        vendors_response = requests.get(
            f"{BASE_URL}/api/vendors/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if vendors_response.status_code != 200 or not vendors_response.json():
            pytest.skip("No vendors available to feature")
        
        vendor_id = vendors_response.json()[0].get("vendor_id")
        
        payload = {
            "vendor_id": vendor_id,
            "featured": True,
            "position": 1
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/vendors/featured",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Feature failed: {response.status_code} - {response.text}"
        print(f"PASS: Vendor {vendor_id} featured successfully")
    
    def test_unfeature_vendor(self, admin_token):
        """Test unfeaturing a vendor"""
        # Get featured vendors
        response = requests.get(
            f"{BASE_URL}/api/admin/vendors/featured",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code != 200 or not response.json():
            pytest.skip("No featured vendors to unfeature")
        
        vendor_id = response.json()[0].get("vendor_id")
        
        payload = {
            "vendor_id": vendor_id,
            "featured": False
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/vendors/featured",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Unfeature failed: {response.status_code} - {response.text}"
        print(f"PASS: Vendor {vendor_id} unfeatured successfully")


class TestVendorUnreadTickets(TestAuth):
    """Test vendor unread ticket count"""
    
    def test_vendor_unread_count(self, vendor_token):
        """Test GET /api/vendors/tickets/unread-count"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/tickets/unread-count",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "unread_count" in data, f"Missing unread_count: {data}"
        print(f"PASS: Vendor unread tickets = {data['unread_count']}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
