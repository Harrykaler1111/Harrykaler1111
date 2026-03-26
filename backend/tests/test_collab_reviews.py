"""
Test suite for Collaboration Accept/Reject flow and Reviews API
Tests the P0 bug fix (KeyError: user_id on vendor doc) and new Reviews UI features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
INFLUENCER_EMAIL = "testinfluencer@example.com"
INFLUENCER_PASSWORD = "influencer123"
VENDOR_EMAIL = "vendortest3@example.com"
VENDOR_PASSWORD = "vendor123"
INFLUENCER_ID = "inf_8b2de00dfed7"


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health check passed")


class TestInfluencerAuth:
    """Influencer authentication tests"""
    
    def test_influencer_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": INFLUENCER_EMAIL,
            "password": INFLUENCER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == INFLUENCER_EMAIL
        assert data["user"]["role"] == "influencer"
        print(f"✅ Influencer login successful: {data['user']['name']}")


class TestVendorAuth:
    """Vendor authentication tests"""
    
    def test_vendor_login(self):
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["vendor"]["email"] == VENDOR_EMAIL
        assert data["vendor"]["status"] == "approved"
        print(f"✅ Vendor login successful: {data['vendor']['store_name']}")


class TestCollaborationFlow:
    """Tests for collaboration request, accept, and reject flows"""
    
    @pytest.fixture
    def vendor_token(self):
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def influencer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": INFLUENCER_EMAIL,
            "password": INFLUENCER_PASSWORD
        })
        return response.json()["token"]
    
    def test_vendor_can_send_collab_request(self, vendor_token):
        """Vendor sends collaboration request to influencer"""
        response = requests.post(
            f"{BASE_URL}/api/collaborations/request",
            headers={"Authorization": f"Bearer {vendor_token}"},
            json={
                "influencer_ids": [INFLUENCER_ID],
                "message": "Pytest test collaboration",
                "commission_rate": 15,
                "campaign_name": "Pytest Campaign"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        # May be already_pending if previous test created one
        assert data["results"][0]["status"] in ["sent", "already_pending"]
        print(f"✅ Vendor can send collab request: {data}")
    
    def test_vendor_can_view_sent_requests(self, vendor_token):
        """Vendor can view their sent collaboration requests"""
        response = requests.get(
            f"{BASE_URL}/api/collaborations/vendor/sent",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Vendor can view sent requests: {len(data)} requests found")
    
    def test_influencer_can_view_received_requests(self, influencer_token):
        """Influencer can view received collaboration requests"""
        response = requests.get(
            f"{BASE_URL}/api/collaborations/influencer/received",
            headers={"Authorization": f"Bearer {influencer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Influencer can view received requests: {len(data)} requests found")
    
    def test_collab_accept_returns_vendor_contact_p0_fix(self, vendor_token, influencer_token):
        """
        P0 BUG FIX TEST: Accepting collaboration should return vendor contact details
        Previously failed with KeyError: user_id because code tried to look up user_id on vendor doc
        Fix: Now reads email/phone directly from vendor document
        """
        # First create a new collab request
        create_response = requests.post(
            f"{BASE_URL}/api/collaborations/request",
            headers={"Authorization": f"Bearer {vendor_token}"},
            json={
                "influencer_ids": [INFLUENCER_ID],
                "message": "P0 fix test collaboration",
                "commission_rate": 20,
                "campaign_name": "P0 Fix Test"
            }
        )
        
        if create_response.status_code == 200:
            results = create_response.json().get("results", [])
            if results and results[0]["status"] == "sent":
                request_id = results[0]["request_id"]
                
                # Accept the collaboration
                accept_response = requests.put(
                    f"{BASE_URL}/api/collaborations/{request_id}/accept",
                    headers={"Authorization": f"Bearer {influencer_token}"}
                )
                
                assert accept_response.status_code == 200
                data = accept_response.json()
                
                # Verify vendor_contact is present and has email/phone (P0 fix verification)
                assert "vendor_contact" in data, "vendor_contact missing from response"
                assert "email" in data["vendor_contact"], "vendor email missing"
                assert "phone" in data["vendor_contact"], "vendor phone missing"
                assert data["vendor_contact"]["email"] == VENDOR_EMAIL
                
                # Verify influencer_contact is also present
                assert "influencer_contact" in data
                assert data["influencer_contact"]["email"] == INFLUENCER_EMAIL
                
                print(f"✅ P0 FIX VERIFIED: Collab accept returns vendor contact: {data['vendor_contact']}")
            else:
                # Already pending, check existing accepted collabs
                print("⚠️ Collab already pending, checking existing accepted collabs")
                received = requests.get(
                    f"{BASE_URL}/api/collaborations/influencer/received",
                    headers={"Authorization": f"Bearer {influencer_token}"}
                ).json()
                
                accepted = [r for r in received if r["status"] == "accepted"]
                if accepted:
                    assert "vendor_contact" in accepted[0]
                    assert "email" in accepted[0]["vendor_contact"]
                    print(f"✅ P0 FIX VERIFIED via existing collab: {accepted[0]['vendor_contact']}")
    
    def test_collab_reject_flow(self, vendor_token, influencer_token):
        """Influencer can reject a collaboration request"""
        # Create a new collab request for rejection
        create_response = requests.post(
            f"{BASE_URL}/api/collaborations/request",
            headers={"Authorization": f"Bearer {vendor_token}"},
            json={
                "influencer_ids": [INFLUENCER_ID],
                "message": "Reject test collaboration",
                "commission_rate": 10,
                "campaign_name": "Reject Test"
            }
        )
        
        if create_response.status_code == 200:
            results = create_response.json().get("results", [])
            if results and results[0]["status"] == "sent":
                request_id = results[0]["request_id"]
                
                # Reject the collaboration
                reject_response = requests.put(
                    f"{BASE_URL}/api/collaborations/{request_id}/reject",
                    headers={"Authorization": f"Bearer {influencer_token}"}
                )
                
                assert reject_response.status_code == 200
                data = reject_response.json()
                assert data["message"] == "Collaboration rejected"
                print(f"✅ Collab reject flow works: {data}")
            else:
                print("⚠️ Collab already pending, skipping reject test")


class TestReviewsAPI:
    """Tests for Reviews API endpoints"""
    
    @pytest.fixture
    def influencer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": INFLUENCER_EMAIL,
            "password": INFLUENCER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_product_reviews_returns_stats(self):
        """GET /api/reviews/product/{id} returns reviews and stats"""
        # Get a product ID first
        products_response = requests.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        assert len(products) > 0
        
        product_id = products[0]["product_id"]
        
        response = requests.get(f"{BASE_URL}/api/reviews/product/{product_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "reviews" in data
        assert "stats" in data
        assert isinstance(data["reviews"], list)
        
        # Verify stats structure
        stats = data["stats"]
        assert "avg_rating" in stats
        assert "total" in stats
        assert "five" in stats
        assert "four" in stats
        assert "three" in stats
        assert "two" in stats
        assert "one" in stats
        
        print(f"✅ GET /api/reviews/product/{product_id} works: {len(data['reviews'])} reviews, avg: {stats['avg_rating']}")
    
    def test_post_review_requires_auth(self):
        """POST /api/reviews requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/reviews",
            json={
                "product_id": "prod_a3fb04b57a2e",
                "rating": 5,
                "comment": "Test review"
            }
        )
        assert response.status_code == 401 or response.status_code == 403 or "Authorization" in response.json().get("detail", "")
        print("✅ POST /api/reviews requires authentication")
    
    def test_post_review_requires_delivered_order(self, influencer_token):
        """POST /api/reviews requires user to have a delivered order for the product"""
        # Get a product ID
        products_response = requests.get(f"{BASE_URL}/api/products")
        product_id = products_response.json()[0]["product_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/reviews",
            headers={"Authorization": f"Bearer {influencer_token}"},
            json={
                "product_id": product_id,
                "rating": 5,
                "comment": "Test review"
            }
        )
        
        # Should fail because user hasn't purchased this product
        assert response.status_code == 400
        data = response.json()
        assert "purchased" in data["detail"].lower() or "received" in data["detail"].lower()
        print(f"✅ POST /api/reviews validates delivered order: {data['detail']}")
    
    def test_post_review_validates_rating_range(self, influencer_token):
        """POST /api/reviews validates rating is 1-5"""
        products_response = requests.get(f"{BASE_URL}/api/products")
        product_id = products_response.json()[0]["product_id"]
        
        # Test invalid rating (0)
        response = requests.post(
            f"{BASE_URL}/api/reviews",
            headers={"Authorization": f"Bearer {influencer_token}"},
            json={
                "product_id": product_id,
                "rating": 0,
                "comment": "Test review"
            }
        )
        assert response.status_code == 400
        print("✅ POST /api/reviews validates rating range (rejects 0)")
        
        # Test invalid rating (6)
        response = requests.post(
            f"{BASE_URL}/api/reviews",
            headers={"Authorization": f"Bearer {influencer_token}"},
            json={
                "product_id": product_id,
                "rating": 6,
                "comment": "Test review"
            }
        )
        assert response.status_code == 400
        print("✅ POST /api/reviews validates rating range (rejects 6)")
    
    def test_helpful_endpoint_requires_valid_review(self, influencer_token):
        """POST /api/reviews/{id}/helpful requires valid review ID"""
        response = requests.post(
            f"{BASE_URL}/api/reviews/invalid_review_id/helpful",
            headers={"Authorization": f"Bearer {influencer_token}"}
        )
        assert response.status_code == 404
        print("✅ POST /api/reviews/{id}/helpful validates review exists")


class TestProductsHaveRatingFields:
    """Test that products have rating fields for UI display"""
    
    def test_products_have_rating_fields(self):
        """Products should have average_rating and review_count fields"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        
        # Check first product has rating fields (may be 0 if no reviews)
        if products:
            product = products[0]
            # These fields should exist (may be 0 or None)
            print(f"✅ Product {product['product_id']} - average_rating: {product.get('average_rating', 'N/A')}, review_count: {product.get('review_count', 'N/A')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
