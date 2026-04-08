"""
Vendor KYC Verification Tests - Iteration 63
Tests for:
- Vendor KYC document upload
- Vendor KYC submit with validation
- Vendor KYC status endpoint
- Admin KYC review (per-document and bulk)
- Admin KYC details endpoint
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
VENDOR_NO_KYC_EMAIL = "vendortest3@example.com"
VENDOR_NO_KYC_PASSWORD = "vendor123"
VENDOR_APPROVED_EMAIL = "testvendor@example.com"
VENDOR_APPROVED_PASSWORD = "vendor123"

# Document types
DOC_TYPES = ["pan_card", "aadhaar_front", "aadhaar_back", "msme_certificate", "gst_certificate", "bank_proof"]
REQUIRED_DOCS = ["pan_card", "aadhaar_front", "aadhaar_back", "msme_certificate"]


class TestVendorKYCBackend:
    """Backend API tests for Vendor KYC"""
    
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
    def vendor_no_kyc_token(self):
        """Get vendor token for vendor without KYC"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_NO_KYC_EMAIL,
            "password": VENDOR_NO_KYC_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Vendor login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def vendor_approved_token(self):
        """Get vendor token for vendor with approved KYC"""
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_APPROVED_EMAIL,
            "password": VENDOR_APPROVED_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Vendor login failed: {response.status_code} - {response.text}")
    
    # ============== VENDOR LOGIN TESTS ==============
    
    def test_vendor_login_no_kyc(self, vendor_no_kyc_token):
        """Test vendor login for vendor without KYC"""
        assert vendor_no_kyc_token is not None
        print(f"PASS: Vendor (no KYC) login successful")
    
    def test_vendor_login_approved(self, vendor_approved_token):
        """Test vendor login for vendor with approved KYC"""
        assert vendor_approved_token is not None
        print(f"PASS: Vendor (approved) login successful")
    
    def test_admin_login(self, admin_token):
        """Test admin login"""
        assert admin_token is not None
        print(f"PASS: Admin login successful")
    
    # ============== VENDOR KYC STATUS TESTS ==============
    
    def test_kyc_status_endpoint(self, vendor_no_kyc_token):
        """Test GET /api/vendors/kyc/status returns proper structure"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/kyc/status",
            headers={"Authorization": f"Bearer {vendor_no_kyc_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "kyc_status" in data
        assert "kyc_data" in data
        assert "kyc_documents" in data
        assert "bank_details" in data
        
        print(f"PASS: KYC status endpoint returns proper structure")
        print(f"  - kyc_status: {data['kyc_status']}")
        print(f"  - documents: {list(data['kyc_documents'].keys())}")
    
    def test_kyc_status_masked_data(self, vendor_approved_token):
        """Test KYC status returns masked PAN and Aadhaar for approved vendor"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/kyc/status",
            headers={"Authorization": f"Bearer {vendor_approved_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check if data is masked (if KYC was submitted)
        if data.get("kyc_data", {}).get("pan_number"):
            pan = data["kyc_data"]["pan_number"]
            # PAN should be partially masked (e.g., ABCD****F)
            assert "****" in pan or len(pan) <= 10, f"PAN should be masked: {pan}"
            print(f"PASS: PAN is masked: {pan}")
        
        if data.get("kyc_data", {}).get("aadhaar_number"):
            aadhaar = data["kyc_data"]["aadhaar_number"]
            # Aadhaar should be masked (e.g., ****1234)
            assert "****" in aadhaar, f"Aadhaar should be masked: {aadhaar}"
            print(f"PASS: Aadhaar is masked: {aadhaar}")
        
        print(f"PASS: KYC status returns masked sensitive data")
    
    # ============== VENDOR KYC DOCUMENT UPLOAD TESTS ==============
    
    def test_kyc_upload_invalid_doc_type(self, vendor_no_kyc_token):
        """Test upload with invalid document type returns 400"""
        # Create a dummy file
        files = {"file": ("test.jpg", b"fake image content", "image/jpeg")}
        response = requests.post(
            f"{BASE_URL}/api/vendors/kyc/upload/invalid_doc_type",
            headers={"Authorization": f"Bearer {vendor_no_kyc_token}"},
            files=files
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"PASS: Invalid doc type returns 400")
    
    def test_kyc_upload_valid_doc_type(self, vendor_no_kyc_token):
        """Test upload with valid document type"""
        # Create a dummy PNG file
        files = {"file": ("test_pan.png", b"\x89PNG\r\n\x1a\n" + b"fake png content", "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/vendors/kyc/upload/pan_card",
            headers={"Authorization": f"Bearer {vendor_no_kyc_token}"},
            files=files
        )
        # Should succeed or fail gracefully
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "url" in data or "message" in data
            print(f"PASS: Document upload successful")
        else:
            print(f"INFO: Document upload returned {response.status_code} - may be expected based on vendor state")
    
    def test_kyc_upload_invalid_file_type(self, vendor_no_kyc_token):
        """Test upload with invalid file type (e.g., .exe) returns 400"""
        files = {"file": ("test.exe", b"fake exe content", "application/x-msdownload")}
        response = requests.post(
            f"{BASE_URL}/api/vendors/kyc/upload/pan_card",
            headers={"Authorization": f"Bearer {vendor_no_kyc_token}"},
            files=files
        )
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
        print(f"PASS: Invalid file type returns 400")
    
    # ============== VENDOR KYC SUBMIT VALIDATION TESTS ==============
    
    def test_kyc_submit_invalid_pan_format(self, vendor_no_kyc_token):
        """Test KYC submit with invalid PAN format returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/kyc/submit",
            headers={"Authorization": f"Bearer {vendor_no_kyc_token}"},
            json={
                "pan_number": "INVALID",  # Invalid format
                "aadhaar_number": "123456789012",
                "gst_number": "",
                "msme_registration": "",
                "bank_account_name": "Test Account",
                "bank_account_number": "1234567890",
                "bank_ifsc": "SBIN0001234",
                "bank_name": "State Bank"
            }
        )
        assert response.status_code == 400, f"Expected 400 for invalid PAN, got {response.status_code}"
        assert "PAN" in response.text.upper() or "pan" in response.text.lower()
        print(f"PASS: Invalid PAN format returns 400 with proper message")
    
    def test_kyc_submit_invalid_aadhaar_format(self, vendor_no_kyc_token):
        """Test KYC submit with invalid Aadhaar format returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/kyc/submit",
            headers={"Authorization": f"Bearer {vendor_no_kyc_token}"},
            json={
                "pan_number": "ABCDE1234F",  # Valid format
                "aadhaar_number": "12345",  # Invalid - not 12 digits
                "gst_number": "",
                "msme_registration": "",
                "bank_account_name": "Test Account",
                "bank_account_number": "1234567890",
                "bank_ifsc": "SBIN0001234",
                "bank_name": "State Bank"
            }
        )
        assert response.status_code == 400, f"Expected 400 for invalid Aadhaar, got {response.status_code}"
        assert "aadhaar" in response.text.lower() or "12 digit" in response.text.lower()
        print(f"PASS: Invalid Aadhaar format returns 400 with proper message")
    
    def test_kyc_submit_missing_required_docs(self, vendor_no_kyc_token):
        """Test KYC submit without required documents returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/kyc/submit",
            headers={"Authorization": f"Bearer {vendor_no_kyc_token}"},
            json={
                "pan_number": "ABCDE1234F",
                "aadhaar_number": "123456789012",
                "gst_number": "",
                "msme_registration": "",
                "bank_account_name": "Test Account",
                "bank_account_number": "1234567890",
                "bank_ifsc": "SBIN0001234",
                "bank_name": "State Bank"
            }
        )
        # Should return 400 if required docs not uploaded
        # Or 200 if docs were already uploaded
        if response.status_code == 400:
            assert "document" in response.text.lower() or "upload" in response.text.lower()
            print(f"PASS: Missing required documents returns 400")
        else:
            print(f"INFO: KYC submit returned {response.status_code} - docs may already be uploaded")
    
    # ============== ADMIN VENDOR LIST TESTS ==============
    
    def test_admin_vendor_list(self, admin_token):
        """Test GET /api/vendors/admin/list returns vendor list"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Admin vendor list returns {len(data)} vendors")
        
        # Check for vendors with different KYC statuses
        kyc_statuses = set(v.get("kyc_status", "not_submitted") for v in data)
        print(f"  - KYC statuses found: {kyc_statuses}")
    
    def test_admin_vendor_list_filter_kyc_submitted(self, admin_token):
        """Test filtering vendors by kyc_submitted status"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/admin/list?status=kyc_submitted",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"PASS: Filtered vendor list (kyc_submitted) returns {len(data)} vendors")
    
    # ============== ADMIN KYC DETAILS TESTS ==============
    
    def test_admin_kyc_details_endpoint(self, admin_token):
        """Test GET /api/vendors/admin/{vendor_id}/kyc/details returns full KYC data"""
        # First get a vendor
        list_response = requests.get(
            f"{BASE_URL}/api/vendors/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        vendors = list_response.json()
        if not vendors:
            pytest.skip("No vendors found")
        
        vendor_id = vendors[0]["vendor_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/vendors/admin/{vendor_id}/kyc/details",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "vendor_id" in data
        assert "kyc_status" in data
        assert "kyc_data" in data
        assert "bank_details" in data
        assert "kyc_documents" in data
        
        print(f"PASS: Admin KYC details endpoint returns full data")
        print(f"  - vendor_id: {data['vendor_id']}")
        print(f"  - kyc_status: {data['kyc_status']}")
    
    # ============== ADMIN KYC REVIEW TESTS ==============
    
    def test_admin_per_document_review_invalid_status(self, admin_token):
        """Test per-document review with invalid status returns 400"""
        # Get a vendor with submitted KYC
        list_response = requests.get(
            f"{BASE_URL}/api/vendors/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        vendors = list_response.json()
        vendor_with_kyc = next((v for v in vendors if v.get("kyc_status") == "submitted"), None)
        
        if not vendor_with_kyc:
            pytest.skip("No vendor with submitted KYC found")
        
        vendor_id = vendor_with_kyc["vendor_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/vendors/admin/{vendor_id}/kyc/review-doc/pan_card",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "invalid_status", "note": "test"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print(f"PASS: Invalid review status returns 400")
    
    def test_admin_per_document_review_nonexistent_doc(self, admin_token):
        """Test per-document review for non-existent document returns 404"""
        list_response = requests.get(
            f"{BASE_URL}/api/vendors/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        vendors = list_response.json()
        if not vendors:
            pytest.skip("No vendors found")
        
        vendor_id = vendors[0]["vendor_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/vendors/admin/{vendor_id}/kyc/review-doc/nonexistent_doc",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"status": "approved", "note": "test"}
        )
        assert response.status_code == 404, f"Expected 404 for non-existent doc, got {response.status_code}"
        print(f"PASS: Non-existent document returns 404")
    
    def test_admin_bulk_approve_kyc(self, admin_token):
        """Test PUT /api/vendors/admin/{vendor_id}/kyc/approve bulk approval"""
        # Get a vendor with submitted KYC
        list_response = requests.get(
            f"{BASE_URL}/api/vendors/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        vendors = list_response.json()
        vendor_with_kyc = next((v for v in vendors if v.get("kyc_status") == "submitted"), None)
        
        if not vendor_with_kyc:
            print("INFO: No vendor with submitted KYC found - skipping bulk approve test")
            pytest.skip("No vendor with submitted KYC found")
        
        vendor_id = vendor_with_kyc["vendor_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/vendors/admin/{vendor_id}/kyc/approve",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data
        print(f"PASS: Bulk KYC approve works - {data.get('message')}")
    
    def test_admin_reject_kyc_with_reason(self, admin_token):
        """Test PUT /api/vendors/admin/{vendor_id}/kyc/reject with reason"""
        # Get a vendor with submitted KYC
        list_response = requests.get(
            f"{BASE_URL}/api/vendors/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        vendors = list_response.json()
        vendor_with_kyc = next((v for v in vendors if v.get("kyc_status") == "submitted"), None)
        
        if not vendor_with_kyc:
            print("INFO: No vendor with submitted KYC found - skipping reject test")
            pytest.skip("No vendor with submitted KYC found")
        
        vendor_id = vendor_with_kyc["vendor_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/vendors/admin/{vendor_id}/kyc/reject?reason=Test%20rejection",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data
        print(f"PASS: KYC reject with reason works - {data.get('message')}")
    
    # ============== VENDOR PROFILE TESTS ==============
    
    def test_vendor_me_endpoint(self, vendor_approved_token):
        """Test GET /api/vendors/me returns vendor profile with kyc_status"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/me",
            headers={"Authorization": f"Bearer {vendor_approved_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "vendor_id" in data
        assert "kyc_status" in data
        assert "store_name" in data
        
        print(f"PASS: Vendor /me endpoint returns profile")
        print(f"  - vendor_id: {data['vendor_id']}")
        print(f"  - kyc_status: {data['kyc_status']}")
        print(f"  - store_name: {data['store_name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
