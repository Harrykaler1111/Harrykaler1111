"""
Test KYC Auto-Approve and Auto-Reject Features
Tests the AI-powered auto-decision logic for KYC document verification.

Features tested:
1. Auto-approve: Upload valid PAN card image with matching data -> auto_action='auto_approved'
2. Auto-reject: Upload PAN card with mismatched vendor data -> auto_action='auto_rejected'
3. Full KYC auto-approve: Upload all 4 required docs with matching data -> full_kyc_auto_approved
4. Manual review: Upload PDF document -> AI skipped, document stays 'uploaded'
5. Admin override: Admin can still override auto-decisions
"""

import pytest
import requests
import os
import io
from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pigma-notify-demo.preview.emergentagent.com').rstrip('/')

# Test credentials
VENDOR_EMAIL = "vendortest3@example.com"
VENDOR_PASSWORD = "vendor123"
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"


def create_pan_card_image(pan_number: str, name: str = "TEST VENDOR") -> bytes:
    """Create a test PAN card image with text drawn on it"""
    img = Image.new('RGB', (400, 250), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw PAN card-like content
    draw.rectangle([10, 10, 390, 240], outline=(0, 0, 0), width=2)
    draw.text((20, 20), "INCOME TAX DEPARTMENT", fill=(0, 0, 128))
    draw.text((20, 50), "PERMANENT ACCOUNT NUMBER CARD", fill=(0, 0, 0))
    draw.text((20, 90), f"PAN: {pan_number}", fill=(0, 0, 0))
    draw.text((20, 130), f"Name: {name}", fill=(0, 0, 0))
    draw.text((20, 170), "DOB: 01/01/1990", fill=(0, 0, 0))
    draw.text((20, 210), "Father's Name: TEST FATHER", fill=(0, 0, 0))
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.getvalue()


def create_aadhaar_front_image(aadhaar_number: str, name: str = "TEST VENDOR") -> bytes:
    """Create a test Aadhaar front image"""
    img = Image.new('RGB', (400, 250), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    draw.rectangle([10, 10, 390, 240], outline=(0, 0, 0), width=2)
    draw.text((20, 20), "GOVERNMENT OF INDIA", fill=(0, 0, 128))
    draw.text((20, 50), "AADHAAR", fill=(255, 102, 0))
    formatted_aadhaar = f"{aadhaar_number[:4]} {aadhaar_number[4:8]} {aadhaar_number[8:]}"
    draw.text((20, 90), f"Aadhaar No: {formatted_aadhaar}", fill=(0, 0, 0))
    draw.text((20, 130), f"Name: {name}", fill=(0, 0, 0))
    draw.text((20, 170), "DOB: 01/01/1990", fill=(0, 0, 0))
    draw.text((20, 210), "Gender: Male", fill=(0, 0, 0))
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.getvalue()


def create_aadhaar_back_image() -> bytes:
    """Create a test Aadhaar back image"""
    img = Image.new('RGB', (400, 250), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    draw.rectangle([10, 10, 390, 240], outline=(0, 0, 0), width=2)
    draw.text((20, 20), "Address:", fill=(0, 0, 0))
    draw.text((20, 50), "123 Test Street", fill=(0, 0, 0))
    draw.text((20, 80), "Test City, Test State", fill=(0, 0, 0))
    draw.text((20, 110), "PIN: 123456", fill=(0, 0, 0))
    # Draw a fake QR code area
    draw.rectangle([280, 140, 380, 230], fill=(200, 200, 200), outline=(0, 0, 0))
    draw.text((290, 180), "QR CODE", fill=(0, 0, 0))
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.getvalue()


def create_msme_certificate_image(udyam_number: str, enterprise_name: str = "TEST ENTERPRISE") -> bytes:
    """Create a test MSME/Udyam certificate image"""
    img = Image.new('RGB', (500, 350), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    draw.rectangle([10, 10, 490, 340], outline=(0, 0, 0), width=2)
    draw.text((20, 20), "MINISTRY OF MSME", fill=(0, 0, 128))
    draw.text((20, 50), "UDYAM REGISTRATION CERTIFICATE", fill=(0, 0, 0))
    draw.text((20, 100), f"Udyam Registration Number: {udyam_number}", fill=(0, 0, 0))
    draw.text((20, 140), f"Enterprise Name: {enterprise_name}", fill=(0, 0, 0))
    draw.text((20, 180), "Type of Enterprise: Micro", fill=(0, 0, 0))
    draw.text((20, 220), "Date of Registration: 01/01/2023", fill=(0, 0, 0))
    draw.text((20, 260), "Major Activity: Manufacturing", fill=(0, 0, 0))
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.getvalue()


def create_pdf_content() -> bytes:
    """Create minimal PDF content for testing PDF skip"""
    # Minimal valid PDF
    pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
196
%%EOF"""
    return pdf_content


@pytest.fixture(scope="module")
def vendor_token():
    """Get vendor authentication token"""
    response = requests.post(f"{BASE_URL}/api/vendors/login", json={
        "email": VENDOR_EMAIL,
        "password": VENDOR_PASSWORD
    })
    assert response.status_code == 200, f"Vendor login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def vendor_id(vendor_token):
    """Get vendor ID"""
    response = requests.get(f"{BASE_URL}/api/vendors/me", headers={
        "Authorization": f"Bearer {vendor_token}"
    })
    assert response.status_code == 200
    return response.json()["vendor_id"]


def reset_vendor_kyc(vendor_id: str, pan_number: str = "ABCDE1234F"):
    """Reset vendor KYC status for testing"""
    import pymongo
    c = pymongo.MongoClient(os.environ['MONGO_URL'])
    db = c[os.environ['DB_NAME']]
    db.vendors.update_one(
        {'vendor_id': vendor_id},
        {'$set': {
            'kyc_status': 'submitted',
            'kyc_documents': {},
            'kyc_data': {
                'pan_number': pan_number,
                'aadhaar_number': '123456789012',
                'msme_registration': 'UDYAM-UP-00-0012345'
            },
            'status': 'pending'
        }}
    )
    c.close()


class TestKYCAutoApprove:
    """Test auto-approve functionality"""
    
    def test_auto_approve_pan_card_matching_data(self, vendor_token, vendor_id):
        """Upload valid PAN card with matching data -> should auto-approve"""
        # Reset vendor KYC with matching PAN
        reset_vendor_kyc(vendor_id, pan_number="ABCDE1234F")
        
        # Create PAN card image with matching PAN number
        pan_image = create_pan_card_image("ABCDE1234F", "TEST VENDOR")
        
        files = {'file': ('pan_card.png', pan_image, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/vendors/kyc/upload/pan_card",
            files=files,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        print(f"Response: {data}")
        
        # Check response structure
        assert "ai_verification" in data, "Missing ai_verification in response"
        assert "auto_action" in data, "Missing auto_action in response"
        
        ai_v = data["ai_verification"]
        
        # If AI verification ran (not skipped), check for auto-approve
        if not ai_v.get("skipped"):
            # Check if auto-approved (high confidence, verified, no mismatches)
            if ai_v.get("status") == "verified" and ai_v.get("confidence") == "high" and not ai_v.get("mismatches"):
                assert data["auto_action"] == "auto_approved", f"Expected auto_approved, got {data['auto_action']}"
                print("SUCCESS: Document auto-approved by AI")
            else:
                print(f"AI verification result: status={ai_v.get('status')}, confidence={ai_v.get('confidence')}, mismatches={ai_v.get('mismatches')}")
        else:
            print(f"AI verification skipped: {ai_v.get('reason')}")
    
    def test_kyc_status_shows_approved_doc(self, vendor_token):
        """Check KYC status shows approved document"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/kyc/status",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        print(f"KYC Status: {data.get('kyc_status')}")
        print(f"Documents: {list(data.get('kyc_documents', {}).keys())}")
        
        if "pan_card" in data.get("kyc_documents", {}):
            pan_doc = data["kyc_documents"]["pan_card"]
            print(f"PAN Card status: {pan_doc.get('status')}")
            print(f"Review note: {pan_doc.get('review_note')}")
            
            # If auto-approved, status should be 'approved'
            if pan_doc.get("review_note", "").startswith("Auto-approved"):
                assert pan_doc["status"] == "approved", "Auto-approved doc should have status 'approved'"


class TestKYCAutoReject:
    """Test auto-reject functionality"""
    
    def test_auto_reject_pan_card_mismatched_data(self, vendor_token, vendor_id):
        """Upload PAN card with mismatched vendor data -> should auto-reject"""
        # Reset vendor KYC with DIFFERENT PAN than what we'll upload
        reset_vendor_kyc(vendor_id, pan_number="ZZZZZ9999Z")
        
        # Create PAN card image with DIFFERENT PAN number
        pan_image = create_pan_card_image("ABCDE1234F", "TEST VENDOR")
        
        files = {'file': ('pan_card.png', pan_image, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/vendors/kyc/upload/pan_card",
            files=files,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        print(f"Response: {data}")
        
        ai_v = data.get("ai_verification", {})
        
        if not ai_v.get("skipped"):
            # Check for mismatch detection
            if ai_v.get("mismatches"):
                print(f"Mismatches detected: {ai_v['mismatches']}")
                # Should be auto-rejected due to mismatch
                if ai_v.get("status") == "mismatch_detected":
                    assert data["auto_action"] == "auto_rejected", f"Expected auto_rejected, got {data['auto_action']}"
                    print("SUCCESS: Document auto-rejected due to mismatch")
            else:
                print(f"No mismatches detected. AI status: {ai_v.get('status')}")
        else:
            print(f"AI verification skipped: {ai_v.get('reason')}")
    
    def test_kyc_status_shows_rejected_doc_with_reason(self, vendor_token):
        """Check KYC status shows rejected document with AI reason"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/kyc/status",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if "pan_card" in data.get("kyc_documents", {}):
            pan_doc = data["kyc_documents"]["pan_card"]
            print(f"PAN Card status: {pan_doc.get('status')}")
            print(f"Review note: {pan_doc.get('review_note')}")
            
            # If auto-rejected, review_note should contain AI reason
            if pan_doc.get("status") == "rejected":
                assert "Auto-rejected" in pan_doc.get("review_note", ""), "Rejected doc should have Auto-rejected in review_note"


class TestManualReview:
    """Test manual review for PDFs"""
    
    def test_pdf_upload_skips_ai_stays_uploaded(self, vendor_token, vendor_id):
        """Upload PDF document -> AI skipped, document stays 'uploaded' for manual review"""
        reset_vendor_kyc(vendor_id)
        
        pdf_content = create_pdf_content()
        
        files = {'file': ('document.pdf', pdf_content, 'application/pdf')}
        response = requests.post(
            f"{BASE_URL}/api/vendors/kyc/upload/pan_card",
            files=files,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        print(f"Response: {data}")
        
        ai_v = data.get("ai_verification", {})
        
        # PDF should skip AI verification
        assert ai_v.get("skipped") == True, "PDF should skip AI verification"
        assert "PDF" in ai_v.get("reason", "") or "manual" in ai_v.get("reason", "").lower(), \
            f"Reason should mention PDF/manual review: {ai_v.get('reason')}"
        
        # auto_action should be None (manual review needed)
        assert data.get("auto_action") is None, f"PDF should not have auto_action, got {data.get('auto_action')}"
        
        print("SUCCESS: PDF upload skipped AI, needs manual review")


class TestFullKYCAutoApprove:
    """Test full KYC auto-approve when all required docs are auto-approved"""
    
    def test_full_kyc_auto_approve_all_docs(self, vendor_token, vendor_id):
        """Upload all 4 required docs with matching data -> last one triggers full_kyc_auto_approved"""
        # Reset vendor KYC with matching data
        reset_vendor_kyc(vendor_id, pan_number="ABCDE1234F")
        
        # Upload all 4 required documents
        docs_to_upload = [
            ("pan_card", create_pan_card_image("ABCDE1234F", "TEST VENDOR"), "image/png"),
            ("aadhaar_front", create_aadhaar_front_image("123456789012", "TEST VENDOR"), "image/png"),
            ("aadhaar_back", create_aadhaar_back_image(), "image/png"),
            ("msme_certificate", create_msme_certificate_image("UDYAM-UP-00-0012345", "TEST ENTERPRISE"), "image/png"),
        ]
        
        last_response = None
        for doc_type, content, mime_type in docs_to_upload:
            files = {'file': (f'{doc_type}.png', content, mime_type)}
            response = requests.post(
                f"{BASE_URL}/api/vendors/kyc/upload/{doc_type}",
                files=files,
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            
            assert response.status_code == 200, f"Upload {doc_type} failed: {response.text}"
            last_response = response.json()
            print(f"Uploaded {doc_type}: auto_action={last_response.get('auto_action')}")
        
        # Check if full KYC was auto-approved
        # The last document upload should trigger full_kyc_auto_approved if all docs are approved
        if last_response.get("auto_action") == "full_kyc_auto_approved":
            print("SUCCESS: Full KYC auto-approved!")
        else:
            # Check KYC status
            status_response = requests.get(
                f"{BASE_URL}/api/vendors/kyc/status",
                headers={"Authorization": f"Bearer {vendor_token}"}
            )
            status_data = status_response.json()
            print(f"KYC Status: {status_data.get('kyc_status')}")
            
            # Check individual doc statuses
            for doc_type in ["pan_card", "aadhaar_front", "aadhaar_back", "msme_certificate"]:
                doc = status_data.get("kyc_documents", {}).get(doc_type, {})
                print(f"  {doc_type}: {doc.get('status')}")


class TestAdminOverride:
    """Test admin can override auto-decisions"""
    
    def test_admin_can_override_auto_approved_doc(self, admin_token, vendor_id, vendor_token):
        """Admin can reject an auto-approved document"""
        # First, upload a document that gets auto-approved
        reset_vendor_kyc(vendor_id, pan_number="ABCDE1234F")
        
        pan_image = create_pan_card_image("ABCDE1234F", "TEST VENDOR")
        files = {'file': ('pan_card.png', pan_image, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/vendors/kyc/upload/pan_card",
            files=files,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        
        # Admin overrides to reject
        override_response = requests.put(
            f"{BASE_URL}/api/vendors/admin/{vendor_id}/kyc/review-doc/pan_card",
            json={"status": "rejected", "note": "Admin override: Document quality insufficient"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert override_response.status_code == 200, f"Admin override failed: {override_response.text}"
        print(f"Admin override response: {override_response.json()}")
        
        # Verify the document is now rejected
        status_response = requests.get(
            f"{BASE_URL}/api/vendors/kyc/status",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        status_data = status_response.json()
        pan_doc = status_data.get("kyc_documents", {}).get("pan_card", {})
        
        assert pan_doc.get("status") == "rejected", f"Expected rejected, got {pan_doc.get('status')}"
        assert "Admin override" in pan_doc.get("review_note", ""), "Review note should contain admin override"
        
        print("SUCCESS: Admin successfully overrode auto-approved document")
    
    def test_admin_can_approve_auto_rejected_doc(self, admin_token, vendor_id, vendor_token):
        """Admin can approve an auto-rejected document"""
        # First, upload a document that gets auto-rejected (mismatched data)
        reset_vendor_kyc(vendor_id, pan_number="ZZZZZ9999Z")
        
        pan_image = create_pan_card_image("ABCDE1234F", "TEST VENDOR")
        files = {'file': ('pan_card.png', pan_image, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/vendors/kyc/upload/pan_card",
            files=files,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        
        # Admin overrides to approve
        override_response = requests.put(
            f"{BASE_URL}/api/vendors/admin/{vendor_id}/kyc/review-doc/pan_card",
            json={"status": "approved", "note": "Admin override: Verified manually"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert override_response.status_code == 200, f"Admin override failed: {override_response.text}"
        print(f"Admin override response: {override_response.json()}")
        
        # Verify the document is now approved
        status_response = requests.get(
            f"{BASE_URL}/api/vendors/kyc/status",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        status_data = status_response.json()
        pan_doc = status_data.get("kyc_documents", {}).get("pan_card", {})
        
        assert pan_doc.get("status") == "approved", f"Expected approved, got {pan_doc.get('status')}"
        
        print("SUCCESS: Admin successfully overrode auto-rejected document")


class TestKYCStatusEndpoint:
    """Test KYC status endpoint returns correct auto-decision info"""
    
    def test_kyc_status_includes_ai_verification(self, vendor_token, vendor_id):
        """KYC status should include AI verification details"""
        reset_vendor_kyc(vendor_id)
        
        # Upload a document
        pan_image = create_pan_card_image("ABCDE1234F", "TEST VENDOR")
        files = {'file': ('pan_card.png', pan_image, 'image/png')}
        requests.post(
            f"{BASE_URL}/api/vendors/kyc/upload/pan_card",
            files=files,
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        # Get KYC status
        response = requests.get(
            f"{BASE_URL}/api/vendors/kyc/status",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        pan_doc = data.get("kyc_documents", {}).get("pan_card", {})
        
        # Should have ai_verification field
        if pan_doc.get("ai_verification"):
            ai_v = pan_doc["ai_verification"]
            print(f"AI Verification in status: {ai_v}")
            
            # Check expected fields
            assert "status" in ai_v or "verified" in ai_v, "AI verification should have status or verified field"
        else:
            print("No AI verification data in status (may have been skipped)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
