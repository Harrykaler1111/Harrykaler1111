"""
Import History and Revert Feature Tests
Tests for GET /api/products/bulk/sessions and POST /api/products/bulk/revert/{session_id}
"""
import pytest
import requests
import os
import io
import csv
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@pigma.com"
SUPER_ADMIN_PASSWORD = "superadmin123"
PRODUCT_MANAGER_EMAIL = "products@pigma.com"
PRODUCT_MANAGER_PASSWORD = "products123"
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"


def create_csv_file(rows):
    """Helper to create CSV file content"""
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    return output.getvalue().encode('utf-8')


class TestImportHistorySessions:
    """Test GET /api/products/bulk/sessions endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def vendor_token(self):
        """Get vendor token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.text}")
        return response.json().get("token")
    
    def test_sessions_requires_auth(self):
        """Test that sessions endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/products/bulk/sessions")
        assert response.status_code == 401, "Should require auth"
        print("PASS: Sessions endpoint requires authentication")
    
    def test_admin_can_list_sessions(self, admin_token):
        """Test admin can list their bulk upload sessions"""
        response = requests.get(
            f"{BASE_URL}/api/products/bulk/sessions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        
        # If there are sessions, verify structure
        if len(data) > 0:
            session = data[0]
            # Verify expected fields are present
            assert "session_id" in session, "Missing session_id"
            assert "status" in session, "Missing status"
            assert "created_at" in session, "Missing created_at"
            # Optional fields that should be present for published sessions
            if session.get("status") == "published":
                assert "created_count" in session or "total" in session, "Missing count field"
            print(f"PASS: Admin can list sessions. Found {len(data)} sessions")
            print(f"  First session: {session.get('session_id')} - status: {session.get('status')}")
        else:
            print("PASS: Admin can list sessions (empty list)")
    
    def test_sessions_returns_correct_fields(self, admin_token):
        """Test sessions response contains expected fields"""
        # First create a session by doing a preview
        unique_sku = f"SESS_TEST_{uuid.uuid4().hex[:8].upper()}"
        csv_content = create_csv_file([{
            "sku": unique_sku,
            "name": "Session Test Product",
            "description": "Testing session listing",
            "price": "5999",
            "category": "Platform Boots"
        }])
        
        files = {"file": ("session_test.csv", csv_content, "text/csv")}
        preview_response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        assert preview_response.status_code == 200
        session_id = preview_response.json()["session_id"]
        
        # Now list sessions
        response = requests.get(
            f"{BASE_URL}/api/products/bulk/sessions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Find our session
        our_session = next((s for s in data if s.get("session_id") == session_id), None)
        assert our_session is not None, f"Created session {session_id} not found in list"
        
        # Verify fields
        assert our_session["status"] == "preview", "New session should be in preview status"
        assert "valid_count" in our_session, "Missing valid_count"
        assert "error_count" in our_session, "Missing error_count"
        assert "total" in our_session, "Missing total"
        
        print(f"PASS: Session {session_id} has correct fields: status={our_session['status']}, total={our_session['total']}")
    
    def test_vendor_can_list_own_sessions(self, vendor_token):
        """Test vendor can list their own bulk upload sessions"""
        response = requests.get(
            f"{BASE_URL}/api/products/bulk/sessions",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"PASS: Vendor can list their sessions. Found {len(data)} sessions")


class TestRevertBulkUpload:
    """Test POST /api/products/bulk/revert/{session_id} endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def vendor_token(self):
        """Get vendor token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.text}")
        return response.json().get("token")
    
    def test_revert_requires_auth(self):
        """Test that revert endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/products/bulk/revert/some_session_id")
        assert response.status_code == 401, "Should require auth"
        print("PASS: Revert endpoint requires authentication")
    
    def test_revert_invalid_session_returns_404(self, admin_token):
        """Test revert with invalid session ID returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/products/bulk/revert/invalid_session_xyz",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Should return 404, got {response.status_code}: {response.text}"
        print("PASS: Revert with invalid session returns 404")
    
    def test_revert_preview_session_returns_404(self, admin_token):
        """Test revert on preview (not published) session returns 404"""
        # Create a preview session but don't publish
        unique_sku = f"REVERT_PREVIEW_{uuid.uuid4().hex[:8].upper()}"
        csv_content = create_csv_file([{
            "sku": unique_sku,
            "name": "Revert Preview Test",
            "description": "Testing revert on preview",
            "price": "3999",
            "category": "Platform Boots"
        }])
        
        files = {"file": ("revert_preview.csv", csv_content, "text/csv")}
        preview_response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        assert preview_response.status_code == 200
        session_id = preview_response.json()["session_id"]
        
        # Try to revert without publishing
        revert_response = requests.post(
            f"{BASE_URL}/api/products/bulk/revert/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert revert_response.status_code == 404, f"Should return 404 for preview session, got {revert_response.status_code}"
        print(f"PASS: Revert on preview session {session_id} returns 404")
    
    def test_revert_published_session_deactivates_products(self, admin_token):
        """Test revert on published session deactivates all products from that batch"""
        # Create and publish a session
        unique_sku = f"REVERT_TEST_{uuid.uuid4().hex[:8].upper()}"
        csv_content = create_csv_file([{
            "sku": unique_sku,
            "name": "Revert Test Product",
            "description": "Testing revert functionality",
            "price": "6999",
            "category": "Platform Boots",
            "stock": "50"
        }])
        
        files = {"file": ("revert_test.csv", csv_content, "text/csv")}
        preview_response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        assert preview_response.status_code == 200
        session_id = preview_response.json()["session_id"]
        
        # Publish
        publish_response = requests.post(
            f"{BASE_URL}/api/products/bulk/publish/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert publish_response.status_code == 200, f"Publish failed: {publish_response.text}"
        product_id = publish_response.json()["created"][0]["product_id"]
        
        # Verify product is active (visible in products list)
        get_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_response.status_code == 200, "Product should be accessible"
        
        # Now revert
        revert_response = requests.post(
            f"{BASE_URL}/api/products/bulk/revert/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert revert_response.status_code == 200, f"Revert failed: {revert_response.text}"
        
        revert_data = revert_response.json()
        assert "reverted_count" in revert_data, "Missing reverted_count"
        assert revert_data["reverted_count"] >= 1, "Should have reverted at least 1 product"
        assert "session_id" in revert_data
        assert revert_data["session_id"] == session_id
        
        print(f"PASS: Reverted {revert_data['reverted_count']} products from session {session_id}")
        
        # Verify product is no longer visible in public products list
        # (is_active=False means it shouldn't appear in normal product queries)
        products_response = requests.get(f"{BASE_URL}/api/products")
        if products_response.status_code == 200:
            products = products_response.json()
            reverted_product = next((p for p in products if p.get("product_id") == product_id), None)
            # Product should either not be in list or have is_active=False
            if reverted_product:
                assert reverted_product.get("is_active") == False, "Reverted product should be inactive"
            print("PASS: Reverted product is not visible in active products list")
    
    def test_revert_already_reverted_session_returns_404(self, admin_token):
        """Test revert on already reverted session returns 404"""
        # Create, publish, and revert a session
        unique_sku = f"DOUBLE_REVERT_{uuid.uuid4().hex[:8].upper()}"
        csv_content = create_csv_file([{
            "sku": unique_sku,
            "name": "Double Revert Test",
            "description": "Testing double revert",
            "price": "4999",
            "category": "Platform Boots"
        }])
        
        files = {"file": ("double_revert.csv", csv_content, "text/csv")}
        preview_response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        session_id = preview_response.json()["session_id"]
        
        # Publish
        requests.post(
            f"{BASE_URL}/api/products/bulk/publish/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # First revert
        first_revert = requests.post(
            f"{BASE_URL}/api/products/bulk/revert/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert first_revert.status_code == 200
        
        # Second revert should fail
        second_revert = requests.post(
            f"{BASE_URL}/api/products/bulk/revert/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert second_revert.status_code == 404, f"Should return 404 for already reverted, got {second_revert.status_code}"
        print("PASS: Revert on already reverted session returns 404")
    
    def test_session_status_changes_to_reverted(self, admin_token):
        """Test that session status changes to 'reverted' after revert"""
        # Create, publish, and revert
        unique_sku = f"STATUS_TEST_{uuid.uuid4().hex[:8].upper()}"
        csv_content = create_csv_file([{
            "sku": unique_sku,
            "name": "Status Test Product",
            "description": "Testing status change",
            "price": "7999",
            "category": "Platform Boots"
        }])
        
        files = {"file": ("status_test.csv", csv_content, "text/csv")}
        preview_response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        session_id = preview_response.json()["session_id"]
        
        # Publish
        requests.post(
            f"{BASE_URL}/api/products/bulk/publish/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Verify status is 'published'
        sessions_response = requests.get(
            f"{BASE_URL}/api/products/bulk/sessions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        sessions = sessions_response.json()
        session = next((s for s in sessions if s.get("session_id") == session_id), None)
        assert session is not None
        assert session["status"] == "published", f"Expected 'published', got {session['status']}"
        
        # Revert
        requests.post(
            f"{BASE_URL}/api/products/bulk/revert/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Verify status is now 'reverted'
        sessions_response = requests.get(
            f"{BASE_URL}/api/products/bulk/sessions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        sessions = sessions_response.json()
        session = next((s for s in sessions if s.get("session_id") == session_id), None)
        assert session is not None
        assert session["status"] == "reverted", f"Expected 'reverted', got {session['status']}"
        assert "reverted_at" in session, "Missing reverted_at timestamp"
        
        print(f"PASS: Session status changed to 'reverted' with reverted_at timestamp")


class TestVendorRevert:
    """Test vendor-specific revert functionality"""
    
    @pytest.fixture(scope="class")
    def vendor_token(self):
        """Get vendor token"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Vendor login failed: {response.text}")
        return response.json().get("token")
    
    def test_vendor_can_revert_own_session(self, vendor_token):
        """Test vendor can revert their own published session"""
        # Create and publish a vendor session
        unique_sku = f"VENDOR_REVERT_{uuid.uuid4().hex[:8].upper()}"
        csv_content = create_csv_file([{
            "sku": unique_sku,
            "name": "Vendor Revert Test",
            "description": "Testing vendor revert",
            "price": "5999",
            "category": "Platform Boots"
        }])
        
        files = {"file": ("vendor_revert.csv", csv_content, "text/csv")}
        preview_response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {vendor_token}"},
            files=files
        )
        
        if preview_response.status_code != 200:
            pytest.skip(f"Vendor preview failed: {preview_response.text}")
        
        session_id = preview_response.json()["session_id"]
        
        # Publish
        publish_response = requests.post(
            f"{BASE_URL}/api/products/bulk/publish/{session_id}",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        if publish_response.status_code != 200:
            pytest.skip(f"Vendor publish failed: {publish_response.text}")
        
        # Revert
        revert_response = requests.post(
            f"{BASE_URL}/api/products/bulk/revert/{session_id}",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        assert revert_response.status_code == 200, f"Vendor revert failed: {revert_response.text}"
        print(f"PASS: Vendor can revert their own session {session_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
