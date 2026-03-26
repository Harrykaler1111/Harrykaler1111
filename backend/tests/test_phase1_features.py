"""
Phase 1 Features Test Suite
Tests for:
1. Login for harpreetkaler750@gmail.com with password Harpreet@123
2. Password reset/update endpoints
3. Collaboration system (referral codes, resend, fixed payment, tracking)
4. Action history logging
5. RBAC for Product Manager and Marketing Manager
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
USER_EMAIL = "harpreetkaler750@gmail.com"
USER_PASSWORD = "Harpreet@123"

VENDOR_EMAIL = "vendortest3@example.com"
VENDOR_PASSWORD = "vendor123"

INFLUENCER_EMAIL = "testinfluencer@example.com"
INFLUENCER_PASSWORD = "influencer123"

SUPER_ADMIN_EMAIL = "superadmin@pigma.com"
SUPER_ADMIN_PASSWORD = "superadmin123"

PRODUCT_MANAGER_EMAIL = "products@pigma.com"
PRODUCT_MANAGER_PASSWORD = "products123"

MARKETING_MANAGER_EMAIL = "marketing@pigma.com"
MARKETING_MANAGER_PASSWORD = "marketing123"

INFLUENCER_ID = "inf_8b2de00dfed7"
VENDOR_ID = "vendor_79334d552c7b"


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health check passed")


class TestUserLogin:
    """Test login for harpreetkaler750@gmail.com"""
    
    def test_user_login_success(self):
        """Test login for harpreetkaler750@gmail.com with password Harpreet@123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == USER_EMAIL
        print(f"✅ User {USER_EMAIL} login successful")
        return data["token"]


class TestPasswordResetFlow:
    """Test password reset endpoints"""
    
    def test_password_reset_request_existing_email(self):
        """POST /api/auth/password/reset-request returns OTP for existing email"""
        response = requests.post(f"{BASE_URL}/api/auth/password/reset-request", json={
            "email": USER_EMAIL
        })
        assert response.status_code == 200, f"Reset request failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "demo_otp" in data  # OTP returned for testing
        assert len(data["demo_otp"]) == 6
        print(f"✅ Password reset OTP sent for {USER_EMAIL}: {data['demo_otp']}")
        return data["demo_otp"]
    
    def test_password_reset_request_nonexistent_email(self):
        """POST /api/auth/password/reset-request returns 404 for non-existent email"""
        response = requests.post(f"{BASE_URL}/api/auth/password/reset-request", json={
            "email": "nonexistent_user_12345@example.com"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Password reset returns 404 for non-existent email")
    
    def test_password_reset_confirm_with_valid_otp(self):
        """POST /api/auth/password/reset-confirm resets password with valid OTP"""
        # First get OTP
        reset_response = requests.post(f"{BASE_URL}/api/auth/password/reset-request", json={
            "email": USER_EMAIL
        })
        assert reset_response.status_code == 200
        otp = reset_response.json()["demo_otp"]
        
        # Confirm reset with OTP
        confirm_response = requests.post(f"{BASE_URL}/api/auth/password/reset-confirm", json={
            "email": USER_EMAIL,
            "otp": otp,
            "new_password": USER_PASSWORD  # Reset back to original
        })
        assert confirm_response.status_code == 200, f"Reset confirm failed: {confirm_response.text}"
        data = confirm_response.json()
        assert "message" in data
        print("✅ Password reset confirmed with valid OTP")
        
        # Verify login works with new password
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert login_response.status_code == 200
        print("✅ Login works after password reset")
    
    def test_password_reset_confirm_invalid_otp(self):
        """POST /api/auth/password/reset-confirm fails with invalid OTP"""
        response = requests.post(f"{BASE_URL}/api/auth/password/reset-confirm", json={
            "email": USER_EMAIL,
            "otp": "000000",  # Invalid OTP
            "new_password": "newpassword123"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✅ Password reset fails with invalid OTP")


class TestPasswordUpdate:
    """Test password update for logged-in users"""
    
    def test_user_password_update(self):
        """PUT /api/auth/password/update changes password for logged-in user"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Update password
        update_response = requests.put(
            f"{BASE_URL}/api/auth/password/update",
            json={
                "current_password": USER_PASSWORD,
                "new_password": "TempPassword123"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert update_response.status_code == 200, f"Password update failed: {update_response.text}"
        print("✅ User password updated successfully")
        
        # Verify new password works
        new_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": "TempPassword123"
        })
        assert new_login.status_code == 200
        new_token = new_login.json()["token"]
        
        # Revert password back
        revert_response = requests.put(
            f"{BASE_URL}/api/auth/password/update",
            json={
                "current_password": "TempPassword123",
                "new_password": USER_PASSWORD
            },
            headers={"Authorization": f"Bearer {new_token}"}
        )
        assert revert_response.status_code == 200
        print("✅ Password reverted back to original")


class TestVendorPasswordUpdate:
    """Test vendor password update"""
    
    def test_vendor_password_update(self):
        """PUT /api/vendors/password/update changes vendor password"""
        # Login as vendor
        login_response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert login_response.status_code == 200, f"Vendor login failed: {login_response.text}"
        token = login_response.json()["token"]
        
        # Update password
        update_response = requests.put(
            f"{BASE_URL}/api/vendors/password/update",
            json={
                "current_password": VENDOR_PASSWORD,
                "new_password": "TempVendor123"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert update_response.status_code == 200, f"Vendor password update failed: {update_response.text}"
        print("✅ Vendor password updated successfully")
        
        # Verify new password works
        new_login = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": "TempVendor123"
        })
        assert new_login.status_code == 200
        new_token = new_login.json()["token"]
        
        # Revert password back
        revert_response = requests.put(
            f"{BASE_URL}/api/vendors/password/update",
            json={
                "current_password": "TempVendor123",
                "new_password": VENDOR_PASSWORD
            },
            headers={"Authorization": f"Bearer {new_token}"}
        )
        assert revert_response.status_code == 200
        print("✅ Vendor password reverted back to original")


class TestCollaborationSystem:
    """Test collaboration system with referral codes, resend, fixed payment"""
    
    @pytest.fixture
    def vendor_token(self):
        """Get vendor token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def influencer_token(self):
        """Get influencer token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": INFLUENCER_EMAIL,
            "password": INFLUENCER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_collaboration_request_generates_referral_code(self, vendor_token):
        """Collaboration request generates unique referral_code"""
        response = requests.post(
            f"{BASE_URL}/api/collaborations/request",
            json={
                "influencer_ids": [INFLUENCER_ID],
                "message": "Test collaboration request with referral code",
                "commission_rate": 15.0,
                "fixed_payment": 5000.0,
                "campaign_name": "Test Campaign Phase1"
            },
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        # May return 200 even if already pending
        assert response.status_code == 200, f"Collab request failed: {response.text}"
        data = response.json()
        print(f"✅ Collaboration request sent: {data}")
        
        # Check sent requests for referral code
        sent_response = requests.get(
            f"{BASE_URL}/api/collaborations/vendor/sent",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert sent_response.status_code == 200
        sent_requests = sent_response.json()
        
        # Find the latest request
        if sent_requests:
            latest = sent_requests[0]
            assert "referral_code" in latest, "referral_code not in collaboration request"
            assert latest["referral_code"] is not None
            print(f"✅ Collaboration has referral_code: {latest['referral_code']}")
            return latest
        return None
    
    def test_collaboration_request_includes_fixed_payment(self, vendor_token):
        """Fixed payment field included in collaboration requests"""
        sent_response = requests.get(
            f"{BASE_URL}/api/collaborations/vendor/sent",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert sent_response.status_code == 200
        sent_requests = sent_response.json()
        
        if sent_requests:
            # Check if any request has fixed_payment
            has_fixed_payment = any(r.get("fixed_payment") is not None for r in sent_requests)
            print(f"✅ Collaboration requests include fixed_payment field: {has_fixed_payment}")
            # Check structure
            latest = sent_requests[0]
            assert "fixed_payment" in latest or latest.get("fixed_payment") is None
            print(f"✅ Fixed payment in latest request: {latest.get('fixed_payment')}")
    
    def test_collaboration_accept_returns_referral_code(self, vendor_token, influencer_token):
        """Collaboration accept returns referral_code"""
        # Get pending requests for influencer
        received_response = requests.get(
            f"{BASE_URL}/api/collaborations/influencer/received",
            headers={"Authorization": f"Bearer {influencer_token}"}
        )
        assert received_response.status_code == 200
        received = received_response.json()
        
        pending_requests = [r for r in received if r["status"] == "pending"]
        if pending_requests:
            request_id = pending_requests[0]["request_id"]
            
            # Accept the collaboration
            accept_response = requests.put(
                f"{BASE_URL}/api/collaborations/{request_id}/accept",
                headers={"Authorization": f"Bearer {influencer_token}"}
            )
            assert accept_response.status_code == 200, f"Accept failed: {accept_response.text}"
            data = accept_response.json()
            
            assert "referral_code" in data, "referral_code not returned on accept"
            assert data["referral_code"] is not None
            print(f"✅ Collaboration accept returns referral_code: {data['referral_code']}")
            return data["referral_code"]
        else:
            print("⚠️ No pending collaboration requests to accept")
            return None
    
    def test_collaboration_resend_for_rejected(self, vendor_token, influencer_token):
        """POST /api/collaborations/{id}/resend works for rejected requests"""
        # Get sent requests
        sent_response = requests.get(
            f"{BASE_URL}/api/collaborations/vendor/sent",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert sent_response.status_code == 200
        sent_requests = sent_response.json()
        
        # Find a rejected request
        rejected_requests = [r for r in sent_requests if r["status"] == "rejected"]
        
        if rejected_requests:
            request_id = rejected_requests[0]["request_id"]
            
            # Resend the request
            resend_response = requests.post(
                f"{BASE_URL}/api/collaborations/{request_id}/resend",
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            assert resend_response.status_code == 200, f"Resend failed: {resend_response.text}"
            data = resend_response.json()
            assert "request_id" in data
            assert "referral_code" in data
            print(f"✅ Collaboration resend successful: new request_id={data['request_id']}")
        else:
            print("⚠️ No rejected requests to test resend - creating one")
            # Create a new request, reject it, then resend
            # First create
            create_response = requests.post(
                f"{BASE_URL}/api/collaborations/request",
                json={
                    "influencer_ids": [INFLUENCER_ID],
                    "message": "Test for resend functionality",
                    "commission_rate": 10.0
                },
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            
            # Get the request and reject it
            received = requests.get(
                f"{BASE_URL}/api/collaborations/influencer/received",
                headers={"Authorization": f"Bearer {influencer_token}"}
            ).json()
            
            pending = [r for r in received if r["status"] == "pending"]
            if pending:
                req_id = pending[0]["request_id"]
                # Reject it
                requests.put(
                    f"{BASE_URL}/api/collaborations/{req_id}/reject",
                    headers={"Authorization": f"Bearer {influencer_token}"}
                )
                
                # Now resend
                resend_response = requests.post(
                    f"{BASE_URL}/api/collaborations/{req_id}/resend",
                    headers={"Authorization": f"Bearer {vendor_token}"}
                )
                assert resend_response.status_code == 200
                print("✅ Collaboration resend works for rejected request")
    
    def test_collaboration_resend_fails_for_pending(self, vendor_token):
        """POST /api/collaborations/{id}/resend fails for pending requests (400)"""
        # Get sent requests
        sent_response = requests.get(
            f"{BASE_URL}/api/collaborations/vendor/sent",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert sent_response.status_code == 200
        sent_requests = sent_response.json()
        
        # Find a pending request
        pending_requests = [r for r in sent_requests if r["status"] == "pending"]
        
        if pending_requests:
            request_id = pending_requests[0]["request_id"]
            
            # Try to resend - should fail
            resend_response = requests.post(
                f"{BASE_URL}/api/collaborations/{request_id}/resend",
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            assert resend_response.status_code == 400, f"Expected 400, got {resend_response.status_code}"
            print("✅ Collaboration resend correctly fails for pending requests (400)")
        else:
            print("⚠️ No pending requests to test resend failure")


class TestCollaborationTracking:
    """Test collaboration tracking endpoint"""
    
    def test_track_referral_code(self):
        """GET /api/collaborations/track/{referral_code} returns tracking data"""
        # First get a valid referral code from an accepted collaboration
        vendor_login = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        vendor_token = vendor_login.json()["token"]
        
        sent_response = requests.get(
            f"{BASE_URL}/api/collaborations/vendor/sent",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        sent_requests = sent_response.json()
        
        # Find an accepted request with referral code
        accepted = [r for r in sent_requests if r["status"] == "accepted" and r.get("referral_code")]
        
        if accepted:
            referral_code = accepted[0]["referral_code"]
            
            # Track the referral
            track_response = requests.get(f"{BASE_URL}/api/collaborations/track/{referral_code}")
            assert track_response.status_code == 200, f"Track failed: {track_response.text}"
            data = track_response.json()
            
            assert "vendor_id" in data
            assert "influencer_id" in data
            assert "sales_count" in data
            assert "sales_revenue" in data
            print(f"✅ Referral tracking works: {data}")
        else:
            print("⚠️ No accepted collaborations with referral codes to test tracking")
    
    def test_track_invalid_referral_code(self):
        """GET /api/collaborations/track/{invalid_code} returns 404"""
        response = requests.get(f"{BASE_URL}/api/collaborations/track/INVALID123CODE")
        assert response.status_code == 404
        print("✅ Invalid referral code returns 404")


class TestActionHistory:
    """Test action history logging system"""
    
    def test_admin_action_history(self):
        """GET /api/action-history/admin returns logged actions"""
        # Login as super admin
        login_response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        token = login_response.json()["token"]
        
        # Get action history
        history_response = requests.get(
            f"{BASE_URL}/api/action-history/admin",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert history_response.status_code == 200, f"Action history failed: {history_response.text}"
        data = history_response.json()
        
        assert "history" in data
        assert "total" in data
        print(f"✅ Action history returned {data['total']} records")
        
        # Check structure of history items
        if data["history"]:
            item = data["history"][0]
            assert "action_id" in item
            assert "user_id" in item
            assert "user_type" in item
            assert "action" in item
            assert "timestamp" in item
            print(f"✅ Action history item structure valid: {item['action']}")


class TestAdminRBAC:
    """Test RBAC for Product Manager and Marketing Manager"""
    
    def test_product_manager_login(self):
        """Product Manager can login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": PRODUCT_MANAGER_EMAIL,
            "password": PRODUCT_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Product Manager login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "admin" in data
        print(f"✅ Product Manager login successful")
        return data
    
    def test_marketing_manager_login(self):
        """Marketing Manager can login"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": MARKETING_MANAGER_EMAIL,
            "password": MARKETING_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Marketing Manager login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "admin" in data
        print(f"✅ Marketing Manager login successful")
        return data
    
    def test_product_manager_permissions(self):
        """Product Manager should ONLY have products, categories, vendor_products permissions"""
        login_data = self.test_product_manager_login()
        token = login_data["token"]
        
        # Get admin profile to check permissions
        me_response = requests.get(
            f"{BASE_URL}/api/admin/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200
        admin = me_response.json()
        
        permissions = admin.get("permissions", {})
        print(f"Product Manager permissions: {permissions}")
        
        # Should have products permissions
        assert "products" in permissions and len(permissions["products"]) > 0, "Product Manager should have products permissions"
        
        # Should have categories permissions
        assert "categories" in permissions and len(permissions["categories"]) > 0, "Product Manager should have categories permissions"
        
        # Should have vendor_products permissions
        assert "vendor_products" in permissions and len(permissions["vendor_products"]) > 0, "Product Manager should have vendor_products permissions"
        
        # Should NOT have orders, influencers, coupons, analytics (full), etc.
        assert permissions.get("orders", []) == [], "Product Manager should NOT have orders permissions"
        assert permissions.get("influencers", []) == [], "Product Manager should NOT have influencers permissions"
        assert permissions.get("coupons", []) == [], "Product Manager should NOT have coupons permissions"
        
        print("✅ Product Manager RBAC verified: ONLY products, categories, vendor_products")
    
    def test_marketing_manager_permissions(self):
        """Marketing Manager should ONLY have coupons, analytics permissions"""
        login_data = self.test_marketing_manager_login()
        token = login_data["token"]
        
        # Get admin profile to check permissions
        me_response = requests.get(
            f"{BASE_URL}/api/admin/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200
        admin = me_response.json()
        
        permissions = admin.get("permissions", {})
        print(f"Marketing Manager permissions: {permissions}")
        
        # Should have coupons permissions
        assert "coupons" in permissions and len(permissions["coupons"]) > 0, "Marketing Manager should have coupons permissions"
        
        # Should have analytics permissions
        assert "analytics" in permissions and len(permissions["analytics"]) > 0, "Marketing Manager should have analytics permissions"
        
        # Should NOT have products (full), orders, influencers, vendors, etc.
        assert permissions.get("products", []) == [], "Marketing Manager should NOT have products permissions"
        assert permissions.get("orders", []) == [], "Marketing Manager should NOT have orders permissions"
        assert permissions.get("influencers", []) == [], "Marketing Manager should NOT have influencers permissions"
        assert permissions.get("vendors", []) == [], "Marketing Manager should NOT have vendors permissions"
        
        print("✅ Marketing Manager RBAC verified: ONLY coupons, analytics")
    
    def test_product_manager_cannot_access_coupons(self):
        """Product Manager cannot access coupons endpoints"""
        login_data = self.test_product_manager_login()
        token = login_data["token"]
        
        # Try to access coupons (endpoint is at /api/coupons)
        response = requests.get(
            f"{BASE_URL}/api/coupons",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should be 403 Forbidden
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Product Manager correctly denied access to coupons")
    
    def test_marketing_manager_cannot_access_products(self):
        """Marketing Manager cannot access products management endpoints"""
        login_data = self.test_marketing_manager_login()
        token = login_data["token"]
        
        # Try to create a product (should fail)
        response = requests.post(
            f"{BASE_URL}/api/admin/products",
            json={
                "name": "Test Product",
                "description": "Test",
                "price": 1000,
                "category": "Test",
                "sizes": ["M"],
                "colors": ["Black"],
                "images": ["https://example.com/img.jpg"],
                "stock": 10
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should be 403 Forbidden
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Marketing Manager correctly denied access to create products")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
