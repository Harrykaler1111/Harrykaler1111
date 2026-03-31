"""
Test suite for On-Demand Affiliate & Reseller Link Generation System
Tests the new scalable system that generates links per-product on-demand
instead of bulk loading all products.

Features tested:
- POST /api/affiliates/generate-link - Generate affiliate link for single product
- GET /api/affiliates/my-links - Paginated history of generated affiliate links
- GET /api/affiliates/check-product/{product_id} - Check if affiliate has link for product
- POST /api/resellers/generate-link - Generate reseller link with custom margin
- GET /api/resellers/my-links - Paginated history of generated reseller links
- GET /api/resellers/check-product/{product_id} - Check if reseller has link for product
- Link structure verification (aff_id, reseller_id, price params)
- Old bulk endpoints removed (404 expected)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
CUSTOMER_EMAIL = "admin@pigma.com"
CUSTOMER_PASSWORD = "admin123"


class TestAffiliateOnDemandLinks:
    """Tests for on-demand affiliate link generation system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as customer/affiliate
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        self.token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get a product to test with
        products_res = self.session.get(f"{BASE_URL}/api/products?limit=5")
        assert products_res.status_code == 200
        products = products_res.json()
        assert len(products) > 0, "No products found for testing"
        self.test_product = products[0]
        self.test_product_id = self.test_product["product_id"]
    
    def test_affiliate_me_endpoint(self):
        """Test GET /api/affiliates/me returns affiliate profile"""
        res = self.session.get(f"{BASE_URL}/api/affiliates/me")
        assert res.status_code == 200, f"Failed to get affiliate profile: {res.text}"
        
        data = res.json()
        assert "affiliate_id" in data
        assert "user_id" in data
        assert "status" in data
        assert "commission_rate" in data
        assert data["status"] == "approved", "Test user should be approved affiliate"
        print(f"✓ Affiliate profile: {data['name']}, status={data['status']}, commission={data['commission_rate']}%")
    
    def test_generate_affiliate_link(self):
        """Test POST /api/affiliates/generate-link creates link on-demand"""
        res = self.session.post(f"{BASE_URL}/api/affiliates/generate-link", json={
            "product_id": self.test_product_id
        })
        assert res.status_code == 200, f"Failed to generate affiliate link: {res.text}"
        
        data = res.json()
        assert "affiliate_link" in data
        assert "product_id" in data
        assert "product_name" in data
        assert "estimated_earning" in data
        assert "commission_rate" in data
        
        # Verify link structure: ?aff_id=USER_ID
        assert "?aff_id=" in data["affiliate_link"], f"Link missing aff_id param: {data['affiliate_link']}"
        assert data["product_id"] == self.test_product_id
        assert data["estimated_earning"] > 0
        
        print(f"✓ Generated affiliate link: {data['affiliate_link']}")
        print(f"  Estimated earning: ₹{data['estimated_earning']}")
    
    def test_affiliate_my_links_paginated(self):
        """Test GET /api/affiliates/my-links returns paginated link history"""
        res = self.session.get(f"{BASE_URL}/api/affiliates/my-links?skip=0&limit=10")
        assert res.status_code == 200, f"Failed to get my links: {res.text}"
        
        data = res.json()
        assert "links" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        assert isinstance(data["links"], list)
        
        # Verify link structure in response
        if len(data["links"]) > 0:
            link = data["links"][0]
            assert "product_id" in link
            assert "product_name" in link
            assert "affiliate_link" in link
            assert "commission_rate" in link
            assert "estimated_earning" in link
            assert "?aff_id=" in link["affiliate_link"]
        
        print(f"✓ My Links: {data['total']} total, returned {len(data['links'])} links")
    
    def test_check_affiliate_product_link(self):
        """Test GET /api/affiliates/check-product/{product_id} returns link status"""
        # First generate a link to ensure one exists
        self.session.post(f"{BASE_URL}/api/affiliates/generate-link", json={
            "product_id": self.test_product_id
        })
        
        # Now check if link exists
        res = self.session.get(f"{BASE_URL}/api/affiliates/check-product/{self.test_product_id}")
        assert res.status_code == 200, f"Failed to check product link: {res.text}"
        
        data = res.json()
        assert "is_affiliate" in data
        assert "has_link" in data
        assert "commission_rate" in data
        
        assert data["is_affiliate"] == True
        assert data["has_link"] == True
        assert data["affiliate_link"] is not None
        assert "?aff_id=" in data["affiliate_link"]
        
        print(f"✓ Check product link: has_link={data['has_link']}, commission={data['commission_rate']}%")
    
    def test_check_product_without_link(self):
        """Test check-product for a product without generated link"""
        # Use a product ID that likely doesn't have a link
        fake_product_id = "prod_nonexistent_test_12345"
        res = self.session.get(f"{BASE_URL}/api/affiliates/check-product/{fake_product_id}")
        assert res.status_code == 200
        
        data = res.json()
        assert data["is_affiliate"] == True
        assert data["has_link"] == False
        assert data["affiliate_link"] is None
        
        print(f"✓ Check non-linked product: has_link={data['has_link']}")
    
    def test_old_bulk_endpoint_removed(self):
        """Test that old /api/affiliates/product-links bulk endpoint is removed"""
        res = self.session.get(f"{BASE_URL}/api/affiliates/product-links")
        # Should return 404 or 405 (not found or method not allowed)
        assert res.status_code in [404, 405, 422], f"Old bulk endpoint should be removed, got {res.status_code}"
        print(f"✓ Old bulk endpoint /api/affiliates/product-links removed (status={res.status_code})")


class TestResellerOnDemandLinks:
    """Tests for on-demand reseller link generation system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as customer/reseller
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        self.token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get a product to test with
        products_res = self.session.get(f"{BASE_URL}/api/products?limit=5")
        assert products_res.status_code == 200
        products = products_res.json()
        assert len(products) > 0, "No products found for testing"
        self.test_product = products[0]
        self.test_product_id = self.test_product["product_id"]
        self.test_product_price = self.test_product.get("price", 1000)
    
    def test_reseller_me_endpoint(self):
        """Test GET /api/resellers/me returns reseller profile"""
        res = self.session.get(f"{BASE_URL}/api/resellers/me")
        assert res.status_code == 200, f"Failed to get reseller profile: {res.text}"
        
        data = res.json()
        assert "reseller_id" in data
        assert "user_id" in data
        assert "status" in data
        assert "commission_rate" in data
        assert data["status"] == "approved", "Test user should be approved reseller"
        print(f"✓ Reseller profile: {data['name']}, status={data['status']}")
    
    def test_generate_reseller_link_with_margin(self):
        """Test POST /api/resellers/generate-link creates link with custom margin"""
        test_margin = 150.0
        
        res = self.session.post(f"{BASE_URL}/api/resellers/generate-link", json={
            "product_id": self.test_product_id,
            "margin": test_margin
        })
        assert res.status_code == 200, f"Failed to generate reseller link: {res.text}"
        
        data = res.json()
        assert "reseller_link" in data
        assert "product_id" in data
        assert "product_name" in data
        assert "base_price" in data
        assert "margin" in data
        assert "reseller_price" in data
        
        # Verify link structure: ?reseller_id=USER_ID&price=CUSTOM_PRICE
        assert "?reseller_id=" in data["reseller_link"], f"Link missing reseller_id: {data['reseller_link']}"
        assert "&price=" in data["reseller_link"], f"Link missing price param: {data['reseller_link']}"
        
        # Verify price calculation
        expected_price = data["base_price"] + test_margin
        assert data["reseller_price"] == expected_price, f"Price mismatch: {data['reseller_price']} != {expected_price}"
        assert data["margin"] == test_margin
        
        print(f"✓ Generated reseller link: {data['reseller_link']}")
        print(f"  Base: ₹{data['base_price']}, Margin: ₹{data['margin']}, Selling: ₹{data['reseller_price']}")
    
    def test_generate_reseller_link_zero_margin(self):
        """Test generating reseller link with zero margin"""
        res = self.session.post(f"{BASE_URL}/api/resellers/generate-link", json={
            "product_id": self.test_product_id,
            "margin": 0
        })
        assert res.status_code == 200, f"Failed with zero margin: {res.text}"
        
        data = res.json()
        assert data["margin"] == 0
        assert data["reseller_price"] == data["base_price"]
        print(f"✓ Zero margin link: selling at base price ₹{data['reseller_price']}")
    
    def test_generate_reseller_link_negative_margin_rejected(self):
        """Test that negative margin is rejected"""
        res = self.session.post(f"{BASE_URL}/api/resellers/generate-link", json={
            "product_id": self.test_product_id,
            "margin": -50
        })
        assert res.status_code == 400, f"Negative margin should be rejected, got {res.status_code}"
        print(f"✓ Negative margin correctly rejected")
    
    def test_reseller_my_links_paginated(self):
        """Test GET /api/resellers/my-links returns paginated link history"""
        res = self.session.get(f"{BASE_URL}/api/resellers/my-links?skip=0&limit=10")
        assert res.status_code == 200, f"Failed to get my links: {res.text}"
        
        data = res.json()
        assert "links" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        assert isinstance(data["links"], list)
        
        # Verify link structure in response
        if len(data["links"]) > 0:
            link = data["links"][0]
            assert "product_id" in link
            assert "product_name" in link
            assert "reseller_link" in link
            assert "margin" in link
            assert "reseller_price" in link
            assert "?reseller_id=" in link["reseller_link"]
            assert "&price=" in link["reseller_link"]
        
        print(f"✓ My Links: {data['total']} total, returned {len(data['links'])} links")
    
    def test_check_reseller_product_link(self):
        """Test GET /api/resellers/check-product/{product_id} returns link status"""
        # First generate a link to ensure one exists
        self.session.post(f"{BASE_URL}/api/resellers/generate-link", json={
            "product_id": self.test_product_id,
            "margin": 100
        })
        
        # Now check if link exists
        res = self.session.get(f"{BASE_URL}/api/resellers/check-product/{self.test_product_id}")
        assert res.status_code == 200, f"Failed to check product link: {res.text}"
        
        data = res.json()
        assert "is_reseller" in data
        assert "has_link" in data
        assert "margin" in data
        assert "reseller_price" in data
        
        assert data["is_reseller"] == True
        assert data["has_link"] == True
        assert data["reseller_link"] is not None
        assert "?reseller_id=" in data["reseller_link"]
        
        print(f"✓ Check product link: has_link={data['has_link']}, margin=₹{data['margin']}")
    
    def test_old_bulk_endpoint_removed(self):
        """Test that old /api/resellers/products bulk endpoint is removed"""
        res = self.session.get(f"{BASE_URL}/api/resellers/products")
        # Should return 404 or 405 (not found or method not allowed)
        assert res.status_code in [404, 405, 422], f"Old bulk endpoint should be removed, got {res.status_code}"
        print(f"✓ Old bulk endpoint /api/resellers/products removed (status={res.status_code})")


class TestProductSearchForPartners:
    """Tests for product search functionality used by affiliates/resellers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_product_search_endpoint(self):
        """Test GET /api/products?search= returns filtered products"""
        # Search for a common term
        res = self.session.get(f"{BASE_URL}/api/products?search=shirt&limit=10")
        assert res.status_code == 200, f"Product search failed: {res.text}"
        
        products = res.json()
        assert isinstance(products, list)
        print(f"✓ Product search 'shirt': found {len(products)} products")
    
    def test_product_search_empty_query(self):
        """Test product search with empty query returns products"""
        res = self.session.get(f"{BASE_URL}/api/products?limit=5")
        assert res.status_code == 200
        
        products = res.json()
        assert isinstance(products, list)
        assert len(products) > 0
        
        # Verify product structure
        product = products[0]
        assert "product_id" in product
        assert "name" in product
        assert "price" in product
        
        print(f"✓ Products endpoint returns {len(products)} products")


class TestLinkStructureVerification:
    """Verify link URL structures match requirements"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and setup"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert login_res.status_code == 200
        self.token = login_res.json().get("token")
        self.user_id = login_res.json().get("user", {}).get("user_id")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get a product
        products_res = self.session.get(f"{BASE_URL}/api/products?limit=1")
        self.test_product_id = products_res.json()[0]["product_id"]
    
    def test_affiliate_link_structure(self):
        """Verify affiliate link format: ?aff_id=USER_ID"""
        res = self.session.post(f"{BASE_URL}/api/affiliates/generate-link", json={
            "product_id": self.test_product_id
        })
        assert res.status_code == 200
        
        link = res.json()["affiliate_link"]
        
        # Parse and verify structure
        assert f"/product/{self.test_product_id}" in link
        assert "?aff_id=" in link
        
        # Extract aff_id from link
        import urllib.parse
        parsed = urllib.parse.urlparse(link)
        params = urllib.parse.parse_qs(parsed.query)
        
        assert "aff_id" in params
        assert len(params["aff_id"]) == 1
        assert params["aff_id"][0] != ""  # Should have a user ID
        
        print(f"✓ Affiliate link structure verified: {link}")
    
    def test_reseller_link_structure(self):
        """Verify reseller link format: ?reseller_id=USER_ID&price=CUSTOM_PRICE"""
        test_margin = 200
        res = self.session.post(f"{BASE_URL}/api/resellers/generate-link", json={
            "product_id": self.test_product_id,
            "margin": test_margin
        })
        assert res.status_code == 200
        
        data = res.json()
        link = data["reseller_link"]
        
        # Parse and verify structure
        assert f"/product/{self.test_product_id}" in link
        assert "?reseller_id=" in link
        assert "&price=" in link
        
        # Extract params from link
        import urllib.parse
        parsed = urllib.parse.urlparse(link)
        params = urllib.parse.parse_qs(parsed.query)
        
        assert "reseller_id" in params
        assert "price" in params
        assert len(params["reseller_id"]) == 1
        assert len(params["price"]) == 1
        
        # Verify price in URL matches reseller_price
        url_price = float(params["price"][0])
        assert url_price == data["reseller_price"], f"URL price {url_price} != response price {data['reseller_price']}"
        
        print(f"✓ Reseller link structure verified: {link}")
        print(f"  reseller_id={params['reseller_id'][0]}, price={params['price'][0]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
