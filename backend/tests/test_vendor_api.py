"""
Backend API Tests for Pigma Vendor Module
Testing: Vendor Registration, Login, KYC, Dashboard, Products, Wallet, Offers, Admin Vendor Management
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pigma-notify-demo.preview.emergentagent.com')

# Admin credentials
SUPER_ADMIN_EMAIL = "superadmin@pigma.com"
SUPER_ADMIN_PASSWORD = "superadmin123"

# Test vendor credentials
TEST_VENDOR_EMAIL = "testvendor@example.com"
TEST_VENDOR_PASSWORD = "vendor123"


def get_admin_token():
    """Helper to get super admin token"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    return None


class TestVendorRegistration:
    """Test Vendor Registration Endpoint"""
    
    def test_vendor_register_new(self):
        """Register a new vendor with unique email"""
        unique_email = f"TEST_vendor_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/vendors/register", json={
            "email": unique_email,
            "password": "testpassword123",
            "store_name": "Test Store",
            "owner_name": "Test Owner",
            "phone": "9876543210",
            "store_description": "Test store description for testing purposes",
            "gst_number": "22AAAAA0000A1Z5"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert "vendor" in data
        assert data["vendor"]["email"] == unique_email
        assert data["vendor"]["store_name"] == "Test Store"
        assert data["vendor"]["status"] == "pending"
        print(f"✅ Vendor registration passed: {unique_email}")
        return data
    
    def test_vendor_register_duplicate_email(self):
        """Registering with existing email should fail"""
        # First register a vendor
        unique_email = f"TEST_dup_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/vendors/register", json={
            "email": unique_email,
            "password": "test123",
            "store_name": "Test Store",
            "owner_name": "Owner",
            "phone": "1234567890",
            "store_description": "Test desc"
        })
        
        # Try to register again with same email
        response = requests.post(f"{BASE_URL}/api/vendors/register", json={
            "email": unique_email,
            "password": "test123",
            "store_name": "Another Store",
            "owner_name": "Another Owner",
            "phone": "1234567890",
            "store_description": "Test desc"
        })
        assert response.status_code == 400
        assert "already registered" in response.json().get("detail", "").lower()
        print("✅ Duplicate email registration correctly rejected")


class TestVendorLogin:
    """Test Vendor Login Endpoint"""
    
    def test_vendor_login_existing(self):
        """Login with existing vendor (testvendor@example.com)"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": TEST_VENDOR_EMAIL,
            "password": TEST_VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert "vendor" in data
        assert data["vendor"]["email"] == TEST_VENDOR_EMAIL
        print(f"✅ Vendor login passed: {TEST_VENDOR_EMAIL}")
        return data["token"]
    
    def test_vendor_login_invalid(self):
        """Invalid vendor credentials should be rejected"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": "nonexistent@vendor.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid vendor login correctly rejected")


class TestVendorProfile:
    """Test Vendor Profile Endpoint"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": TEST_VENDOR_EMAIL,
            "password": TEST_VENDOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Test vendor not available")
    
    def test_get_vendor_profile(self, vendor_token):
        """Vendor should be able to get their profile"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/me",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "vendor_id" in data
        assert "email" in data
        assert "store_name" in data
        assert "status" in data
        print(f"✅ Get vendor profile passed: {data['store_name']}")


class TestVendorKYC:
    """Test Vendor KYC Endpoints"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get a fresh vendor token for KYC tests"""
        # Register a new vendor for KYC testing
        unique_email = f"TEST_kyc_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/vendors/register", json={
            "email": unique_email,
            "password": "kyctest123",
            "store_name": "KYC Test Store",
            "owner_name": "KYC Owner",
            "phone": "9876543210",
            "store_description": "Store for KYC testing"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not create vendor for KYC test")
    
    def test_submit_kyc(self, vendor_token):
        """Vendor should be able to submit KYC details"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/kyc/submit",
            headers={"Authorization": f"Bearer {vendor_token}"},
            json={
                "pan_number": "ABCDE1234F",
                "aadhaar_number": "123456789012",
                "bank_account_name": "Test Account Holder",
                "bank_account_number": "12345678901234",
                "bank_ifsc": "SBIN0001234",
                "bank_name": "State Bank of India"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] == "submitted"
        print("✅ KYC submission passed")


class TestVendorDashboard:
    """Test Vendor Dashboard Endpoint"""
    
    @pytest.fixture
    def vendor_token(self):
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": TEST_VENDOR_EMAIL,
            "password": TEST_VENDOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Test vendor not available")
    
    def test_get_dashboard(self, vendor_token):
        """Vendor should be able to access dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/dashboard",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        stats = data["stats"]
        assert "total_products" in stats
        assert "total_orders" in stats
        assert "wallet_balance" in stats
        print(f"✅ Vendor dashboard passed: {stats['total_products']} products")


class TestVendorProductsUnapproved:
    """Test that unapproved vendor cannot create products"""
    
    @pytest.fixture
    def unapproved_vendor_token(self):
        """Register a new vendor that will be unapproved"""
        unique_email = f"TEST_unapp_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/vendors/register", json={
            "email": unique_email,
            "password": "test123",
            "store_name": "Unapproved Store",
            "owner_name": "Owner",
            "phone": "1234567890",
            "store_description": "Test store"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not create vendor")
    
    def test_unapproved_vendor_cannot_create_product(self, unapproved_vendor_token):
        """Unapproved vendor should not be able to create products"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/products",
            headers={"Authorization": f"Bearer {unapproved_vendor_token}"},
            json={
                "name": "Test Product",
                "description": "Test description",
                "price": 999,
                "category": "Test Category",
                "sizes": ["S", "M", "L"],
                "colors": ["Black"],
                "images": ["https://example.com/image.jpg"],
                "stock": 10
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        assert "approved" in response.json().get("detail", "").lower()
        print("✅ Unapproved vendor correctly blocked from creating products")


class TestVendorWallet:
    """Test Vendor Wallet Endpoints"""
    
    @pytest.fixture
    def vendor_token(self):
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": TEST_VENDOR_EMAIL,
            "password": TEST_VENDOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Test vendor not available")
    
    def test_get_wallet_balance(self, vendor_token):
        """Vendor should be able to get wallet balance"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/wallet/balance",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "wallet_balance" in data
        assert "total_sales" in data
        assert "available_balance" in data
        print(f"✅ Wallet balance retrieved: {data['wallet_balance']}")


class TestVendorInfluencerBrowse:
    """Test Vendor Browse Influencers Endpoint"""
    
    @pytest.fixture
    def vendor_token(self):
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": TEST_VENDOR_EMAIL,
            "password": TEST_VENDOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Test vendor not available")
    
    def test_browse_influencers(self, vendor_token):
        """Vendor should be able to browse influencers"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/influencers/browse",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Browse influencers passed: {len(data)} influencers found")


class TestAdminVendorManagement:
    """Test Admin Vendor Management Endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        token = get_admin_token()
        if not token:
            pytest.skip("Admin login failed")
        return token
    
    def test_admin_list_vendors(self, admin_token):
        """Admin should be able to list all vendors"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "vendor_id" in data[0]
            assert "email" in data[0]
            assert "status" in data[0]
        print(f"✅ Admin list vendors passed: {len(data)} vendors found")
    
    def test_admin_list_vendors_by_status(self, admin_token):
        """Admin should be able to filter vendors by status"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/admin/list?status=pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for vendor in data:
            assert vendor["status"] == "pending"
        print(f"✅ Admin list pending vendors: {len(data)} vendors")


class TestAdminVendorApproval:
    """Test Admin Vendor Approval Flow"""
    
    @pytest.fixture
    def admin_token(self):
        token = get_admin_token()
        if not token:
            pytest.skip("Admin login failed")
        return token
    
    @pytest.fixture
    def new_vendor_id(self, admin_token):
        """Create a new vendor and return its ID"""
        unique_email = f"TEST_approval_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/vendors/register", json={
            "email": unique_email,
            "password": "test123",
            "store_name": "Approval Test Store",
            "owner_name": "Owner",
            "phone": "1234567890",
            "store_description": "Test store for approval"
        })
        if response.status_code == 200:
            return response.json()["vendor"]["vendor_id"]
        pytest.skip("Could not create vendor")
    
    def test_admin_approve_vendor(self, admin_token, new_vendor_id):
        """Admin should be able to approve a vendor"""
        response = requests.put(
            f"{BASE_URL}/api/vendors/admin/{new_vendor_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "approved" in response.json().get("message", "").lower()
        print(f"✅ Admin approve vendor passed: {new_vendor_id}")


class TestAdminKYCApproval:
    """Test Admin KYC Approval Flow"""
    
    @pytest.fixture
    def admin_token(self):
        token = get_admin_token()
        if not token:
            pytest.skip("Admin login failed")
        return token
    
    @pytest.fixture
    def vendor_with_kyc(self, admin_token):
        """Create vendor and submit KYC"""
        unique_email = f"TEST_kycappr_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/vendors/register", json={
            "email": unique_email,
            "password": "test123",
            "store_name": "KYC Approval Store",
            "owner_name": "Owner",
            "phone": "1234567890",
            "store_description": "Test store"
        })
        if response.status_code != 200:
            pytest.skip("Could not create vendor")
        
        vendor_data = response.json()
        vendor_token = vendor_data["token"]
        vendor_id = vendor_data["vendor"]["vendor_id"]
        
        # Submit KYC
        requests.post(
            f"{BASE_URL}/api/vendors/kyc/submit",
            headers={"Authorization": f"Bearer {vendor_token}"},
            json={
                "pan_number": "ABCDE1234F",
                "aadhaar_number": "123456789012",
                "bank_account_name": "Test Holder",
                "bank_account_number": "12345678901234",
                "bank_ifsc": "SBIN0001234",
                "bank_name": "Test Bank"
            }
        )
        return vendor_id
    
    def test_admin_approve_kyc(self, admin_token, vendor_with_kyc):
        """Admin should be able to approve KYC"""
        response = requests.put(
            f"{BASE_URL}/api/vendors/admin/{vendor_with_kyc}/kyc/approve",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "approved" in response.json().get("message", "").lower()
        print(f"✅ Admin approve KYC passed: {vendor_with_kyc}")


class TestApprovedVendorProducts:
    """Test approved vendor can create products"""
    
    @pytest.fixture
    def approved_vendor_token(self):
        """Create and approve a vendor"""
        admin_token = get_admin_token()
        if not admin_token:
            pytest.skip("Admin login failed")
        
        # Register vendor
        unique_email = f"TEST_appr_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/vendors/register", json={
            "email": unique_email,
            "password": "test123",
            "store_name": "Approved Test Store",
            "owner_name": "Owner",
            "phone": "1234567890",
            "store_description": "Test store"
        })
        if response.status_code != 200:
            pytest.skip("Could not create vendor")
        
        vendor_data = response.json()
        vendor_token = vendor_data["token"]
        vendor_id = vendor_data["vendor"]["vendor_id"]
        
        # Admin approves vendor
        requests.put(
            f"{BASE_URL}/api/vendors/admin/{vendor_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        return vendor_token
    
    def test_approved_vendor_can_create_product(self, approved_vendor_token):
        """Approved vendor should be able to create products"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/products",
            headers={"Authorization": f"Bearer {approved_vendor_token}"},
            json={
                "name": "TEST Product Name",
                "description": "Test product description for testing",
                "price": 1999,
                "compare_price": 2499,
                "category": "Platform Boots",
                "sizes": ["36", "37", "38", "39"],
                "colors": ["Black", "Brown"],
                "images": ["https://example.com/product.jpg"],
                "stock": 50,
                "tags": ["test", "boots"],
                "is_limited_edition": False
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "product_id" in data
        assert data["name"] == "TEST Product Name"
        assert data["approval_status"] == "pending_approval"
        print(f"✅ Approved vendor created product: {data['product_id']}")
        return data["product_id"]


class TestAdminProductApproval:
    """Test Admin Product Approval Flow"""
    
    @pytest.fixture
    def admin_token(self):
        token = get_admin_token()
        if not token:
            pytest.skip("Admin login failed")
        return token
    
    def test_admin_get_pending_products(self, admin_token):
        """Admin should be able to list pending vendor products"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/admin/products/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for product in data:
            assert product["approval_status"] == "pending_approval"
        print(f"✅ Admin get pending products: {len(data)} pending")


class TestVendorOffers:
    """Test Vendor Offers Endpoints - requires approved vendor"""
    
    @pytest.fixture
    def approved_vendor_token(self):
        """Create and approve a vendor for offer tests"""
        admin_token = get_admin_token()
        if not admin_token:
            pytest.skip("Admin login failed")
        
        unique_email = f"TEST_offer_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/vendors/register", json={
            "email": unique_email,
            "password": "test123",
            "store_name": "Offer Test Store",
            "owner_name": "Owner",
            "phone": "1234567890",
            "store_description": "Test store"
        })
        if response.status_code != 200:
            pytest.skip("Could not create vendor")
        
        vendor_data = response.json()
        vendor_token = vendor_data["token"]
        vendor_id = vendor_data["vendor"]["vendor_id"]
        
        # Admin approves vendor
        requests.put(
            f"{BASE_URL}/api/vendors/admin/{vendor_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        return vendor_token
    
    def test_create_vendor_offer(self, approved_vendor_token):
        """Approved vendor should be able to create promotional offers"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/offers",
            headers={"Authorization": f"Bearer {approved_vendor_token}"},
            json={
                "title": "TEST Summer Sale",
                "offer_type": "percentage",
                "discount_value": 20,
                "coupon_code": f"TEST{uuid.uuid4().hex[:6].upper()}",
                "product_ids": [],
                "start_date": "2026-01-15",
                "end_date": "2026-02-15",
                "min_order_value": 500
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "offer_id" in data
        assert data["title"] == "TEST Summer Sale"
        assert data["is_active"] == True
        print(f"✅ Vendor created offer: {data['offer_id']}")
    
    def test_unapproved_vendor_cannot_create_offer(self):
        """Unapproved vendor should not be able to create offers"""
        # Register a new unapproved vendor
        unique_email = f"TEST_nooff_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/vendors/register", json={
            "email": unique_email,
            "password": "test123",
            "store_name": "No Offer Store",
            "owner_name": "Owner",
            "phone": "1234567890",
            "store_description": "Test store"
        })
        if response.status_code != 200:
            pytest.skip("Could not create vendor")
        
        vendor_token = response.json()["token"]
        
        # Try to create offer
        response = requests.post(
            f"{BASE_URL}/api/vendors/offers",
            headers={"Authorization": f"Bearer {vendor_token}"},
            json={
                "title": "Test Offer",
                "offer_type": "percentage",
                "discount_value": 10,
                "product_ids": [],
                "start_date": "2026-01-15",
                "end_date": "2026-02-15",
                "min_order_value": 0
            }
        )
        assert response.status_code == 403
        print("✅ Unapproved vendor correctly blocked from creating offers")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
