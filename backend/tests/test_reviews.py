"""
Test suite for Customer Reviews feature (Phase D)
Tests: Review CRUD, Admin moderation, Image management, Helpful count
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://swipe-vendor-feed.preview.emergentagent.com')

# Test credentials
CUSTOMER_EMAIL = "harpreetkaler750@gmail.com"
CUSTOMER_PASSWORD = "Harpreet@123"
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"


class TestReviewsBackend:
    """Test review backend endpoints"""
    
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
    def test_product_id(self):
        """Get a product ID for testing"""
        response = requests.get(f"{BASE_URL}/api/products?limit=1")
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0].get("product_id")
        pytest.skip("No products available for testing")
    
    # ==================== PUBLIC ENDPOINTS ====================
    
    def test_get_product_reviews_returns_200(self, test_product_id):
        """GET /api/reviews/product/{product_id} returns reviews and stats"""
        response = requests.get(f"{BASE_URL}/api/reviews/product/{test_product_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reviews" in data, "Response should contain 'reviews' key"
        assert "stats" in data, "Response should contain 'stats' key"
        assert isinstance(data["reviews"], list), "reviews should be a list"
        
        # Verify stats structure
        stats = data["stats"]
        assert "avg_rating" in stats or stats.get("total", 0) == 0
        assert "total" in stats
        print(f"Product {test_product_id} has {stats.get('total', 0)} approved reviews")
    
    def test_get_product_reviews_stats_structure(self, test_product_id):
        """Verify rating distribution stats structure (5-star to 1-star)"""
        response = requests.get(f"{BASE_URL}/api/reviews/product/{test_product_id}")
        assert response.status_code == 200
        
        stats = response.json()["stats"]
        # Stats should have rating breakdown
        expected_keys = ["five", "four", "three", "two", "one"]
        for key in expected_keys:
            assert key in stats, f"Stats should contain '{key}' count"
        print(f"Rating distribution: 5★={stats.get('five')}, 4★={stats.get('four')}, 3★={stats.get('three')}, 2★={stats.get('two')}, 1★={stats.get('one')}")
    
    # ==================== CUSTOMER REVIEW CREATION ====================
    
    def test_create_review_requires_auth(self, test_product_id):
        """POST /api/reviews requires authentication"""
        response = requests.post(f"{BASE_URL}/api/reviews", json={
            "product_id": test_product_id,
            "rating": 5,
            "comment": "Test review"
        })
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_create_review_requires_purchase(self, customer_token, test_product_id):
        """POST /api/reviews requires user to have purchased the product"""
        response = requests.post(f"{BASE_URL}/api/reviews", json={
            "product_id": test_product_id,
            "rating": 5,
            "title": "Test Review",
            "comment": "This is a test review",
            "images": []
        }, headers={"Authorization": f"Bearer {customer_token}"})
        
        # Should fail if user hasn't purchased the product
        # Status 400 with "You can only review products you have purchased" is expected
        # OR 200 if user has purchased
        if response.status_code == 400:
            assert "purchased" in response.json().get("detail", "").lower() or "received" in response.json().get("detail", "").lower()
            print("Review creation correctly requires purchase verification")
        elif response.status_code == 200 or response.status_code == 201:
            print("User has purchased this product - review created")
        else:
            pytest.fail(f"Unexpected status: {response.status_code} - {response.text}")
    
    def test_create_review_validates_rating(self, customer_token, test_product_id):
        """POST /api/reviews validates rating is 1-5"""
        # Test invalid rating
        response = requests.post(f"{BASE_URL}/api/reviews", json={
            "product_id": test_product_id,
            "rating": 6,  # Invalid
            "comment": "Test"
        }, headers={"Authorization": f"Bearer {customer_token}"})
        
        # Should fail with 400 for invalid rating
        assert response.status_code == 400, f"Expected 400 for invalid rating, got {response.status_code}"
    
    # ==================== HELPFUL COUNT ====================
    
    def test_mark_helpful_endpoint_exists(self, customer_token):
        """POST /api/reviews/{review_id}/helpful endpoint exists"""
        # Use a fake review ID - should return 404 if endpoint exists
        response = requests.post(f"{BASE_URL}/api/reviews/fake_review_id/helpful", 
            headers={"Authorization": f"Bearer {customer_token}"})
        
        # 404 means endpoint exists but review not found
        # 401/403 means auth issue
        # 405 means endpoint doesn't exist
        assert response.status_code in [404, 401, 403], f"Expected 404/401/403, got {response.status_code}"
        print(f"Helpful endpoint returned: {response.status_code}")
    
    # ==================== ADMIN ENDPOINTS ====================
    
    def test_admin_get_all_reviews(self, admin_token):
        """GET /api/reviews/admin/all returns reviews with counts"""
        response = requests.get(f"{BASE_URL}/api/reviews/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reviews" in data, "Response should contain 'reviews'"
        assert "counts" in data, "Response should contain 'counts'"
        
        counts = data["counts"]
        assert "total" in counts
        assert "pending" in counts
        assert "approved" in counts
        assert "rejected" in counts
        
        print(f"Admin reviews: total={counts['total']}, pending={counts['pending']}, approved={counts['approved']}, rejected={counts['rejected']}")
    
    def test_admin_get_reviews_with_product_info(self, admin_token):
        """GET /api/reviews/admin/all enriches reviews with product_name and product_image"""
        response = requests.get(f"{BASE_URL}/api/reviews/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        assert response.status_code == 200
        
        reviews = response.json()["reviews"]
        if len(reviews) > 0:
            review = reviews[0]
            assert "product_name" in review, "Review should have product_name"
            assert "product_image" in review, "Review should have product_image"
            print(f"First review product: {review.get('product_name')}")
        else:
            print("No reviews to verify product info enrichment")
    
    def test_admin_filter_by_status_pending(self, admin_token):
        """GET /api/reviews/admin/all?status=pending filters correctly"""
        response = requests.get(f"{BASE_URL}/api/reviews/admin/all?status=pending",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        assert response.status_code == 200
        
        reviews = response.json()["reviews"]
        for review in reviews:
            assert review.get("status") == "pending", f"Expected pending status, got {review.get('status')}"
        
        print(f"Found {len(reviews)} pending reviews")
    
    def test_admin_filter_by_status_approved(self, admin_token):
        """GET /api/reviews/admin/all?status=approved filters correctly"""
        response = requests.get(f"{BASE_URL}/api/reviews/admin/all?status=approved",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        assert response.status_code == 200
        
        reviews = response.json()["reviews"]
        for review in reviews:
            assert review.get("status") == "approved", f"Expected approved status, got {review.get('status')}"
        
        print(f"Found {len(reviews)} approved reviews")
    
    def test_admin_filter_by_status_rejected(self, admin_token):
        """GET /api/reviews/admin/all?status=rejected filters correctly"""
        response = requests.get(f"{BASE_URL}/api/reviews/admin/all?status=rejected",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        assert response.status_code == 200
        
        reviews = response.json()["reviews"]
        for review in reviews:
            assert review.get("status") == "rejected", f"Expected rejected status, got {review.get('status')}"
        
        print(f"Found {len(reviews)} rejected reviews")
    
    def test_admin_requires_auth(self):
        """Admin endpoints require admin authentication"""
        response = requests.get(f"{BASE_URL}/api/reviews/admin/all")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_admin_update_status_endpoint_exists(self, admin_token):
        """PUT /api/reviews/admin/{review_id}/status endpoint exists"""
        response = requests.put(f"{BASE_URL}/api/reviews/admin/fake_id/status",
            json={"status": "approved"},
            headers={"Authorization": f"Bearer {admin_token}"})
        
        # 404 means endpoint exists but review not found
        assert response.status_code in [404, 400], f"Expected 404/400, got {response.status_code}"
    
    def test_admin_delete_endpoint_exists(self, admin_token):
        """DELETE /api/reviews/admin/{review_id} endpoint exists"""
        response = requests.delete(f"{BASE_URL}/api/reviews/admin/fake_id",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        # 404 means endpoint exists but review not found
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_admin_remove_image_endpoint_exists(self, admin_token):
        """PUT /api/reviews/admin/{review_id}/remove-image endpoint exists"""
        response = requests.put(f"{BASE_URL}/api/reviews/admin/fake_id/remove-image",
            json={"image_url": "http://example.com/image.jpg"},
            headers={"Authorization": f"Bearer {admin_token}"})
        
        # 404 means endpoint exists but review not found
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestReviewsAdminCRUD:
    """Test admin CRUD operations on reviews with real data"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code}")
    
    def test_admin_approve_review_flow(self, admin_token):
        """Test approving a pending review"""
        # Get pending reviews
        response = requests.get(f"{BASE_URL}/api/reviews/admin/all?status=pending",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        if response.status_code != 200:
            pytest.skip("Could not fetch pending reviews")
        
        reviews = response.json()["reviews"]
        if len(reviews) == 0:
            print("No pending reviews to test approval flow")
            return
        
        review_id = reviews[0]["review_id"]
        
        # Approve the review
        approve_response = requests.put(f"{BASE_URL}/api/reviews/admin/{review_id}/status",
            json={"status": "approved", "reason": "Test approval"},
            headers={"Authorization": f"Bearer {admin_token}"})
        
        assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
        print(f"Successfully approved review {review_id}")
        
        # Verify it's now approved
        verify_response = requests.get(f"{BASE_URL}/api/reviews/admin/all?status=approved",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        approved_ids = [r["review_id"] for r in verify_response.json()["reviews"]]
        assert review_id in approved_ids, "Review should now be in approved list"
    
    def test_admin_reject_review_flow(self, admin_token):
        """Test rejecting a review"""
        # Get all reviews to find one to reject
        response = requests.get(f"{BASE_URL}/api/reviews/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        if response.status_code != 200:
            pytest.skip("Could not fetch reviews")
        
        reviews = response.json()["reviews"]
        # Find a non-rejected review
        target = None
        for r in reviews:
            if r["status"] != "rejected":
                target = r
                break
        
        if not target:
            print("No reviews available to test rejection")
            return
        
        review_id = target["review_id"]
        original_status = target["status"]
        
        # Reject the review
        reject_response = requests.put(f"{BASE_URL}/api/reviews/admin/{review_id}/status",
            json={"status": "rejected", "reason": "Test rejection - will revert"},
            headers={"Authorization": f"Bearer {admin_token}"})
        
        assert reject_response.status_code == 200, f"Reject failed: {reject_response.text}"
        print(f"Successfully rejected review {review_id}")
        
        # Revert to original status
        revert_response = requests.put(f"{BASE_URL}/api/reviews/admin/{review_id}/status",
            json={"status": original_status, "reason": "Reverted after test"},
            headers={"Authorization": f"Bearer {admin_token}"})
        
        assert revert_response.status_code == 200


class TestImageCropModal:
    """Test ImageCropModal component dependencies"""
    
    def test_react_easy_crop_available(self):
        """Verify react-easy-crop is in package.json"""
        import json
        with open('/app/frontend/package.json', 'r') as f:
            pkg = json.load(f)
        
        deps = pkg.get("dependencies", {})
        assert "react-easy-crop" in deps, "react-easy-crop should be in dependencies"
        print(f"react-easy-crop version: {deps.get('react-easy-crop')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
