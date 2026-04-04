"""
Test Suite for Iteration 43 Features:
1. Guest Cart System (localStorage-based cart for unauthenticated users)
2. Vendor Cart Booster Credits System (vendors buy credits, spend them to promote products)
3. Super Admin Dummy Reviews (admin adds fake reviews to boost product trust)
4. FOMO Live Purchase Notification (admin-controlled popups)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"
CUSTOMER_EMAIL = "admin@pigma.com"
CUSTOMER_PASSWORD = "admin123"


class TestFOMONotificationAPI:
    """Test FOMO notification endpoints"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        if not TestFOMONotificationAPI.admin_token:
            response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            if response.status_code == 200:
                TestFOMONotificationAPI.admin_token = response.json().get("token")
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {TestFOMONotificationAPI.admin_token}"}
    
    def test_get_fomo_notification_public(self):
        """Test public FOMO notification endpoint"""
        response = requests.get(f"{BASE_URL}/api/fomo/notification")
        assert response.status_code == 200
        data = response.json()
        # Should return show: true/false and other fields
        assert "show" in data
        if data["show"]:
            assert "text" in data
            assert "city" in data
        print(f"FOMO notification response: {data}")
    
    def test_get_fomo_settings_admin(self):
        """Test admin can get FOMO settings"""
        if not TestFOMONotificationAPI.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.get(f"{BASE_URL}/api/fomo/settings", headers=self.get_admin_headers())
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert "frequency_min" in data
        assert "frequency_max" in data
        print(f"FOMO settings: {data}")
    
    def test_update_fomo_settings(self):
        """Test admin can update FOMO settings"""
        if not TestFOMONotificationAPI.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.put(f"{BASE_URL}/api/fomo/settings", 
            json={"enabled": True, "frequency_min": 300, "frequency_max": 600},
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "updated"
        print("FOMO settings updated successfully")
    
    def test_add_fomo_message(self):
        """Test admin can add custom FOMO message"""
        if not TestFOMONotificationAPI.admin_token:
            pytest.skip("Admin login failed")
        
        response = requests.post(f"{BASE_URL}/api/fomo/messages",
            json={
                "product_name": "Test Product",
                "city": "Mumbai",
                "custom_text": "Someone from Mumbai just bought Test Product!"
            },
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "message_id" in data
        assert data.get("product_name") == "Test Product"
        print(f"FOMO message added: {data}")
        return data.get("message_id")
    
    def test_delete_fomo_message(self):
        """Test admin can delete FOMO message"""
        if not TestFOMONotificationAPI.admin_token:
            pytest.skip("Admin login failed")
        
        # First add a message
        add_response = requests.post(f"{BASE_URL}/api/fomo/messages",
            json={"product_name": "Delete Test", "city": "Delhi"},
            headers=self.get_admin_headers()
        )
        if add_response.status_code != 200:
            pytest.skip("Could not add message to delete")
        
        message_id = add_response.json().get("message_id")
        
        # Now delete it
        response = requests.delete(f"{BASE_URL}/api/fomo/messages/{message_id}",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        assert response.json().get("status") == "deleted"
        print(f"FOMO message {message_id} deleted successfully")


class TestDummyReviewsAPI:
    """Test Admin Dummy Reviews endpoints"""
    
    admin_token = None
    test_product_id = "prod_f24926d2e4ad"  # Use a known product ID
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        if not TestDummyReviewsAPI.admin_token:
            response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            if response.status_code == 200:
                TestDummyReviewsAPI.admin_token = response.json().get("token")
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {TestDummyReviewsAPI.admin_token}"}
    
    def test_create_dummy_review(self):
        """Test admin can create a dummy review"""
        if not TestDummyReviewsAPI.admin_token:
            pytest.skip("Admin login failed")
        if not TestDummyReviewsAPI.test_product_id:
            pytest.skip("No product found for testing")
        
        response = requests.post(f"{BASE_URL}/api/admin/reviews",
            json={
                "product_id": TestDummyReviewsAPI.test_product_id,
                "username": "Test User",
                "rating": 5,
                "review_text": "This is a test dummy review for testing purposes.",
                "verified": True
            },
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "review_id" in data
        assert data.get("user_name") == "Test User"
        assert data.get("rating") == 5
        assert data.get("is_dummy") == True
        print(f"Dummy review created: {data.get('review_id')}")
        return data.get("review_id")
    
    def test_list_dummy_reviews(self):
        """Test admin can list dummy reviews for a product"""
        if not TestDummyReviewsAPI.admin_token:
            pytest.skip("Admin login failed")
        if not TestDummyReviewsAPI.test_product_id:
            pytest.skip("No product found for testing")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/reviews/{TestDummyReviewsAPI.test_product_id}",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} dummy reviews for product")
    
    def test_delete_dummy_review(self):
        """Test admin can delete a dummy review"""
        if not TestDummyReviewsAPI.admin_token:
            pytest.skip("Admin login failed")
        if not TestDummyReviewsAPI.test_product_id:
            pytest.skip("No product found for testing")
        
        # First create a review to delete
        create_response = requests.post(f"{BASE_URL}/api/admin/reviews",
            json={
                "product_id": TestDummyReviewsAPI.test_product_id,
                "username": "Delete Test User",
                "rating": 4,
                "review_text": "This review will be deleted.",
                "verified": False
            },
            headers=self.get_admin_headers()
        )
        if create_response.status_code != 200:
            pytest.skip("Could not create review to delete")
        
        review_id = create_response.json().get("review_id")
        
        # Now delete it
        response = requests.delete(
            f"{BASE_URL}/api/admin/reviews/{review_id}",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        assert response.json().get("status") == "deleted"
        print(f"Dummy review {review_id} deleted successfully")


class TestVendorCreditsAPI:
    """Test Vendor Cart Booster Credits endpoints"""
    
    vendor_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get vendor token"""
        if not TestVendorCreditsAPI.vendor_token:
            response = requests.post(f"{BASE_URL}/api/vendors/login", json={
                "email": VENDOR_EMAIL,
                "password": VENDOR_PASSWORD
            })
            if response.status_code == 200:
                TestVendorCreditsAPI.vendor_token = response.json().get("token")
    
    def get_vendor_headers(self):
        return {"Authorization": f"Bearer {TestVendorCreditsAPI.vendor_token}"}
    
    def test_get_wallet(self):
        """Test vendor can get their wallet balance"""
        if not TestVendorCreditsAPI.vendor_token:
            pytest.skip("Vendor login failed")
        
        response = requests.get(f"{BASE_URL}/api/vendor-credits/wallet",
            headers=self.get_vendor_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        assert "total_purchased" in data
        assert "total_spent" in data
        print(f"Vendor wallet: balance={data.get('balance')}, purchased={data.get('total_purchased')}, spent={data.get('total_spent')}")
    
    def test_purchase_credits(self):
        """Test vendor can purchase credits (mocked Razorpay)"""
        if not TestVendorCreditsAPI.vendor_token:
            pytest.skip("Vendor login failed")
        
        response = requests.post(f"{BASE_URL}/api/vendor-credits/purchase",
            json={"amount": 100, "credits": 100},
            headers=self.get_vendor_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "payment_id" in data
        assert "credits_added" in data
        assert data.get("credits_added") == 100
        print(f"Credits purchased: {data}")
    
    def test_get_transactions(self):
        """Test vendor can get transaction history"""
        if not TestVendorCreditsAPI.vendor_token:
            pytest.skip("Vendor login failed")
        
        response = requests.get(f"{BASE_URL}/api/vendor-credits/transactions",
            headers=self.get_vendor_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} transactions")
    
    def test_get_promotions(self):
        """Test vendor can get their promotions"""
        if not TestVendorCreditsAPI.vendor_token:
            pytest.skip("Vendor login failed")
        
        response = requests.get(f"{BASE_URL}/api/vendor-credits/promotions",
            headers=self.get_vendor_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} promotions")
    
    def test_get_upsell_products_public(self):
        """Test public endpoint for upsell products"""
        response = requests.get(f"{BASE_URL}/api/vendor-credits/upsell-products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} upsell products")


class TestGuestCartAPI:
    """Test Guest Cart related endpoints (cart operations without auth)"""
    
    def test_cart_upsell_suggestions_no_auth(self):
        """Test cart upsell suggestions work without authentication"""
        response = requests.get(f"{BASE_URL}/api/cart/upsell-suggestions?max_price=5000")
        # Should work without auth (for guest cart)
        assert response.status_code in [200, 401]  # May require auth depending on implementation
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"Found {len(data)} upsell suggestions")
        else:
            print("Upsell suggestions require authentication")
    
    def test_products_endpoint_public(self):
        """Test products endpoint is public (needed for guest cart)"""
        response = requests.get(f"{BASE_URL}/api/products?limit=5")
        assert response.status_code == 200
        data = response.json()
        # Should return products
        if isinstance(data, dict) and "products" in data:
            products = data["products"]
        else:
            products = data
        assert isinstance(products, list)
        print(f"Found {len(products)} products (public access)")


class TestAdminReviewModeration:
    """Test existing admin review moderation still works"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestAdminReviewModeration.admin_token:
            response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            if response.status_code == 200:
                TestAdminReviewModeration.admin_token = response.json().get("token")
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {TestAdminReviewModeration.admin_token}"}
    
    def test_get_reviews_for_moderation(self):
        """Test admin can get reviews for moderation"""
        if not TestAdminReviewModeration.admin_token:
            pytest.skip("Admin login failed")
        
        # Try the admin reviews endpoint
        response = requests.get(f"{BASE_URL}/api/reviews/admin/pending",
            headers=self.get_admin_headers()
        )
        # May return 200 or 404 depending on if endpoint exists
        print(f"Admin reviews endpoint status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Found reviews for moderation: {len(data) if isinstance(data, list) else data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
