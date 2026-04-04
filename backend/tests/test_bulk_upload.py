"""
Bulk Product Upload API Tests
Tests for CSV/Excel upload, preview, validation, and publish endpoints
"""
import pytest
import requests
import os
import io
import csv

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@pigma.com"
SUPER_ADMIN_PASSWORD = "superadmin123"
PRODUCT_MANAGER_EMAIL = "products@pigma.com"
PRODUCT_MANAGER_PASSWORD = "products123"
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"


class TestBulkUploadAuth:
    """Test authentication for bulk upload endpoints"""
    
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
    def product_manager_token(self):
        """Get product manager token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": PRODUCT_MANAGER_EMAIL,
            "password": PRODUCT_MANAGER_PASSWORD
        })
        assert response.status_code == 200, f"Product manager login failed: {response.text}"
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
    
    def test_sample_csv_requires_auth(self):
        """Test that sample-csv endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/products/bulk/sample-csv")
        assert response.status_code == 401, "Should require auth"
    
    def test_preview_requires_auth(self):
        """Test that preview endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/products/bulk/preview")
        assert response.status_code in [401, 422], "Should require auth or file"
    
    def test_admin_can_access_sample_csv(self, admin_token):
        """Test super admin can download sample CSV"""
        response = requests.get(
            f"{BASE_URL}/api/products/bulk/sample-csv",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        assert "text/csv" in response.headers.get("content-type", "")
        # Verify CSV content has required columns
        content = response.text
        assert "sku" in content.lower()
        assert "name" in content.lower()
        assert "description" in content.lower()
        assert "price" in content.lower()
        assert "category" in content.lower()
        print("PASS: Admin can download sample CSV with all required columns")
    
    def test_product_manager_can_access_sample_csv(self, product_manager_token):
        """Test product manager can download sample CSV"""
        response = requests.get(
            f"{BASE_URL}/api/products/bulk/sample-csv",
            headers={"Authorization": f"Bearer {product_manager_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print("PASS: Product manager can download sample CSV")
    
    def test_vendor_can_access_sample_csv(self, vendor_token):
        """Test vendor can download sample CSV"""
        response = requests.get(
            f"{BASE_URL}/api/products/bulk/sample-csv",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print("PASS: Vendor can download sample CSV")


class TestBulkUploadPreview:
    """Test CSV/Excel preview and validation"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    def create_csv_file(self, rows):
        """Helper to create CSV file content"""
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        return output.getvalue().encode('utf-8')
    
    def test_preview_valid_csv(self, admin_token):
        """Test preview with valid CSV file"""
        csv_content = self.create_csv_file([
            {
                "sku": "TEST_BULK_001",
                "name": "Test Bulk Product 1",
                "description": "Test description for bulk upload",
                "price": "9999",
                "compare_price": "12999",
                "category": "Platform Boots",
                "sizes": "36,37,38,39",
                "colors": "Black,White",
                "stock": "50",
                "tags": "test,bulk",
                "is_limited_edition": "false",
                "variants": "Black:36:10;Black:37:15;White:38:20"
            },
            {
                "sku": "TEST_BULK_002",
                "name": "Test Bulk Product 2",
                "description": "Another test product",
                "price": "7999",
                "compare_price": "",
                "category": "Stiletto Heels",
                "sizes": "35,36,37",
                "colors": "Red,Gold",
                "stock": "30",
                "tags": "test",
                "is_limited_edition": "true",
                "variants": ""
            }
        ])
        
        files = {"file": ("test_products.csv", csv_content, "text/csv")}
        response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        
        assert response.status_code == 200, f"Preview failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "session_id" in data
        assert "total" in data
        assert "valid_count" in data
        assert "error_count" in data
        assert "products" in data
        
        # Verify counts
        assert data["total"] == 2
        assert data["valid_count"] == 2
        assert data["error_count"] == 0
        
        # Verify product data
        products = data["products"]
        assert len(products) == 2
        
        # Check first product
        p1 = products[0]
        assert p1["sku"] == "TEST_BULK_001"
        assert p1["name"] == "Test Bulk Product 1"
        assert p1["price"] == 9999.0
        assert p1["compare_price"] == 12999.0
        assert p1["valid"] == True
        assert len(p1["variants"]) == 3  # 3 variants parsed
        
        # Check variants parsing
        assert p1["variants"][0]["color"] == "Black"
        assert p1["variants"][0]["size"] == "36"
        assert p1["variants"][0]["quantity"] == 10
        
        print(f"PASS: Preview returned session_id={data['session_id']}, {data['valid_count']} valid products")
        return data["session_id"]
    
    def test_preview_missing_required_columns(self, admin_token):
        """Test preview rejects CSV missing required columns"""
        # Missing 'sku' column
        csv_content = b"name,description,price\nTest,Desc,999"
        
        files = {"file": ("bad.csv", csv_content, "text/csv")}
        response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        
        assert response.status_code == 400, f"Should reject: {response.text}"
        assert "missing" in response.json().get("detail", "").lower() or "required" in response.json().get("detail", "").lower()
        print("PASS: Preview rejects CSV with missing required columns")
    
    def test_preview_empty_file(self, admin_token):
        """Test preview rejects empty file"""
        files = {"file": ("empty.csv", b"", "text/csv")}
        response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        
        assert response.status_code == 400, f"Should reject empty: {response.text}"
        print("PASS: Preview rejects empty file")
    
    def test_preview_validates_required_fields(self, admin_token):
        """Test preview validates required fields per row"""
        csv_content = self.create_csv_file([
            {
                "sku": "",  # Missing SKU
                "name": "Product Without SKU",
                "description": "Test",
                "price": "999",
                "category": "Platform Boots"
            },
            {
                "sku": "TEST_VALID",
                "name": "",  # Missing name
                "description": "Test",
                "price": "999",
                "category": "Platform Boots"
            },
            {
                "sku": "TEST_VALID_2",
                "name": "Valid Product",
                "description": "Test",
                "price": "",  # Missing price
                "category": "Platform Boots"
            }
        ])
        
        files = {"file": ("validation_test.csv", csv_content, "text/csv")}
        response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        
        assert response.status_code == 200, f"Preview should succeed: {response.text}"
        data = response.json()
        
        # All 3 should have errors
        assert data["error_count"] == 3
        assert data["valid_count"] == 0
        
        # Check error messages
        assert len(data["errors"]) >= 3
        print(f"PASS: Preview validates required fields, found {data['error_count']} errors")
    
    def test_preview_detects_duplicate_skus(self, admin_token):
        """Test preview detects duplicate SKUs in same file"""
        csv_content = self.create_csv_file([
            {
                "sku": "DUPLICATE_SKU",
                "name": "First Product",
                "description": "Test",
                "price": "999",
                "category": "Platform Boots"
            },
            {
                "sku": "DUPLICATE_SKU",  # Same SKU
                "name": "Second Product",
                "description": "Test",
                "price": "1999",
                "category": "Stiletto Heels"
            }
        ])
        
        files = {"file": ("duplicate_test.csv", csv_content, "text/csv")}
        response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Second row should have duplicate error
        assert data["error_count"] >= 1
        errors_text = " ".join(data.get("errors", []))
        assert "duplicate" in errors_text.lower()
        print("PASS: Preview detects duplicate SKUs")
    
    def test_preview_parses_variants_correctly(self, admin_token):
        """Test variants format parsing: Color:Size:Qty;..."""
        csv_content = self.create_csv_file([
            {
                "sku": "VARIANT_TEST",
                "name": "Variant Test Product",
                "description": "Testing variant parsing",
                "price": "5999",
                "category": "Platform Boots",
                "sizes": "",
                "colors": "",
                "stock": "0",
                "variants": "Black:36:20;Red:M:30;Blue:L:15"
            }
        ])
        
        files = {"file": ("variant_test.csv", csv_content, "text/csv")}
        response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        
        product = data["products"][0]
        variants = product["variants"]
        
        assert len(variants) == 3
        assert variants[0] == {"color": "Black", "size": "36", "quantity": 20}
        assert variants[1] == {"color": "Red", "size": "M", "quantity": 30}
        assert variants[2] == {"color": "Blue", "size": "L", "quantity": 15}
        print("PASS: Variants parsed correctly")


class TestBulkUploadPublish:
    """Test bulk publish functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    def create_csv_file(self, rows):
        """Helper to create CSV file content"""
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        return output.getvalue().encode('utf-8')
    
    def test_publish_creates_products(self, admin_token):
        """Test publish creates products in database"""
        # First create a preview session
        import uuid
        unique_sku = f"PUBLISH_TEST_{uuid.uuid4().hex[:8].upper()}"
        
        csv_content = self.create_csv_file([
            {
                "sku": unique_sku,
                "name": "Publish Test Product",
                "description": "Testing bulk publish",
                "price": "8999",
                "compare_price": "10999",
                "category": "Platform Boots",
                "sizes": "36,37,38",
                "colors": "Black,Gold",
                "stock": "25",
                "tags": "test,publish",
                "is_limited_edition": "true",
                "variants": "Black:36:10;Gold:37:15"
            }
        ])
        
        files = {"file": ("publish_test.csv", csv_content, "text/csv")}
        preview_response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        
        assert preview_response.status_code == 200
        session_id = preview_response.json()["session_id"]
        
        # Now publish
        publish_response = requests.post(
            f"{BASE_URL}/api/products/bulk/publish/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert publish_response.status_code == 200, f"Publish failed: {publish_response.text}"
        data = publish_response.json()
        
        assert data["total_created"] == 1
        assert data["total_failed"] == 0
        assert len(data["created"]) == 1
        
        created_product = data["created"][0]
        assert created_product["sku"] == unique_sku
        assert "product_id" in created_product
        
        print(f"PASS: Published product {created_product['product_id']} with SKU {unique_sku}")
        
        # Verify product exists in database via GET
        product_id = created_product["product_id"]
        get_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert get_response.status_code == 200
        
        product = get_response.json()
        assert product["sku"] == unique_sku
        assert product["name"] == "Publish Test Product"
        assert product["price"] == 8999
        assert product["compare_price"] == 10999
        assert len(product["variants"]) == 2
        
        # Verify stock is calculated from variants
        assert product["stock"] == 25  # 10 + 15 from variants
        
        print(f"PASS: Product verified in database with correct data")
    
    def test_publish_invalid_session_returns_404(self, admin_token):
        """Test publish with invalid session ID returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/products/bulk/publish/invalid_session_12345",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404
        print("PASS: Invalid session returns 404")
    
    def test_publish_already_published_session_returns_404(self, admin_token):
        """Test publishing same session twice returns 404"""
        import uuid
        unique_sku = f"DOUBLE_PUB_{uuid.uuid4().hex[:8].upper()}"
        
        csv_content = self.create_csv_file([
            {
                "sku": unique_sku,
                "name": "Double Publish Test",
                "description": "Test",
                "price": "999",
                "category": "Platform Boots"
            }
        ])
        
        files = {"file": ("double_pub.csv", csv_content, "text/csv")}
        preview_response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        
        session_id = preview_response.json()["session_id"]
        
        # First publish
        first_publish = requests.post(
            f"{BASE_URL}/api/products/bulk/publish/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert first_publish.status_code == 200
        
        # Second publish should fail
        second_publish = requests.post(
            f"{BASE_URL}/api/products/bulk/publish/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert second_publish.status_code == 404
        print("PASS: Already published session returns 404")
    
    def test_publish_skips_invalid_rows(self, admin_token):
        """Test publish skips rows with validation errors"""
        import uuid
        valid_sku = f"VALID_{uuid.uuid4().hex[:8].upper()}"
        
        csv_content = self.create_csv_file([
            {
                "sku": valid_sku,
                "name": "Valid Product",
                "description": "This should be created",
                "price": "5999",
                "category": "Platform Boots"
            },
            {
                "sku": "",  # Invalid - missing SKU
                "name": "Invalid Product",
                "description": "This should be skipped",
                "price": "999",
                "category": "Platform Boots"
            }
        ])
        
        files = {"file": ("mixed_validity.csv", csv_content, "text/csv")}
        preview_response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        
        data = preview_response.json()
        assert data["valid_count"] == 1
        assert data["error_count"] == 1
        
        session_id = data["session_id"]
        
        # Publish
        publish_response = requests.post(
            f"{BASE_URL}/api/products/bulk/publish/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert publish_response.status_code == 200
        result = publish_response.json()
        
        assert result["total_created"] == 1
        assert result["total_failed"] == 1
        assert len(result["failed"]) == 1
        assert "validation" in result["failed"][0]["reason"].lower() or "error" in result["failed"][0]["reason"].lower()
        
        print("PASS: Publish skips invalid rows and reports them as failed")


class TestVendorBulkUpload:
    """Test vendor-specific bulk upload functionality"""
    
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
    
    def create_csv_file(self, rows):
        """Helper to create CSV file content"""
        output = io.StringIO()
        if rows:
            writer = csv.DictWriter(output, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        return output.getvalue().encode('utf-8')
    
    def test_vendor_can_preview(self, vendor_token):
        """Test vendor can use preview endpoint"""
        csv_content = self.create_csv_file([
            {
                "sku": "VENDOR_BULK_001",
                "name": "Vendor Bulk Product",
                "description": "Vendor test product",
                "price": "4999",
                "category": "Platform Boots"
            }
        ])
        
        files = {"file": ("vendor_test.csv", csv_content, "text/csv")}
        response = requests.post(
            f"{BASE_URL}/api/products/bulk/preview",
            headers={"Authorization": f"Bearer {vendor_token}"},
            files=files
        )
        
        assert response.status_code == 200, f"Vendor preview failed: {response.text}"
        data = response.json()
        assert data["valid_count"] == 1
        print("PASS: Vendor can use bulk preview endpoint")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
