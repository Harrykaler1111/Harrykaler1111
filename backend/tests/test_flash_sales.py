"""
Test Flash Sales Feature for Bundle Deals
- GET /api/bundles/flash-sales returns only bundles with active flash timers (start <= now <= end)
- GET /api/bundles returns bundles with flash_active=true when flash sale is live
- Flash sale adds extra discount on top of base bundle discount
- PUT /api/bundles/admin/{id} can set flash_sale_start, flash_sale_end, flash_extra_discount_type, flash_extra_discount_value
- Bundle pricing includes flash_extra_discount in discount_amount when flash is active
- GET /api/bundles/{id} returns flash_active, flash_sale_end, flash_extra_discount fields
"""
import pytest
import requests
import os
import time
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"

# Known product IDs for testing
KNOWN_PRODUCT_IDS = [
    "prod_2636c2324d48",
    "prod_59a010226268",
    "prod_3970413af906",
    "prod_16e3afb4013d"
]

# Known flash sale bundle ID
FLASH_BUNDLE_ID = "bundle_f3330d7599cf"  # Accessory Essentials


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestFlashSalesPublicEndpoints:
    """Test public flash sales endpoints"""

    def test_flash_sales_endpoint_returns_200(self):
        """GET /api/bundles/flash-sales returns 200"""
        response = requests.get(f"{BASE_URL}/api/bundles/flash-sales")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} active flash sales")

    def test_flash_sales_returns_only_active_flash_bundles(self):
        """GET /api/bundles/flash-sales returns only bundles with active flash timers"""
        response = requests.get(f"{BASE_URL}/api/bundles/flash-sales")
        assert response.status_code == 200
        bundles = response.json()
        
        now = datetime.now(timezone.utc).isoformat()
        for bundle in bundles:
            assert bundle.get("flash_active") == True, \
                f"Bundle {bundle['bundle_id']} should have flash_active=True"
            
            flash_start = bundle.get("flash_sale_start")
            flash_end = bundle.get("flash_sale_end")
            
            assert flash_start is not None, f"Bundle {bundle['bundle_id']} missing flash_sale_start"
            assert flash_end is not None, f"Bundle {bundle['bundle_id']} missing flash_sale_end"
            assert flash_start <= now <= flash_end, \
                f"Bundle {bundle['bundle_id']} flash sale not currently active"
        
        print(f"All {len(bundles)} flash sales are currently active")

    def test_flash_sales_bundles_have_flash_fields(self):
        """Flash sale bundles have all required flash fields"""
        response = requests.get(f"{BASE_URL}/api/bundles/flash-sales")
        assert response.status_code == 200
        bundles = response.json()
        
        if len(bundles) == 0:
            pytest.skip("No active flash sales to test")
        
        bundle = bundles[0]
        flash_fields = ["flash_active", "flash_sale_start", "flash_sale_end", "flash_extra_discount"]
        for field in flash_fields:
            assert field in bundle, f"Missing flash field: {field}"
        
        print(f"Flash bundle '{bundle['name']}' has all required flash fields")

    def test_bundles_endpoint_shows_flash_active_status(self):
        """GET /api/bundles returns bundles with flash_active=true when flash sale is live"""
        response = requests.get(f"{BASE_URL}/api/bundles")
        assert response.status_code == 200
        bundles = response.json()
        
        flash_bundles = [b for b in bundles if b.get("flash_active") == True]
        non_flash_bundles = [b for b in bundles if b.get("flash_active") == False]
        
        print(f"Found {len(flash_bundles)} flash bundles and {len(non_flash_bundles)} regular bundles")
        
        # Verify flash bundles have flash fields
        for bundle in flash_bundles:
            assert bundle.get("flash_sale_end") is not None, \
                f"Flash bundle {bundle['bundle_id']} missing flash_sale_end"
            assert bundle.get("flash_extra_discount", 0) >= 0, \
                f"Flash bundle {bundle['bundle_id']} should have flash_extra_discount"

    def test_single_bundle_returns_flash_fields(self):
        """GET /api/bundles/{id} returns flash_active, flash_sale_end, flash_extra_discount fields"""
        response = requests.get(f"{BASE_URL}/api/bundles/{FLASH_BUNDLE_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        bundle = response.json()
        assert "flash_active" in bundle, "Missing flash_active field"
        assert "flash_sale_end" in bundle, "Missing flash_sale_end field"
        assert "flash_extra_discount" in bundle, "Missing flash_extra_discount field"
        
        print(f"Bundle '{bundle['name']}' flash_active={bundle['flash_active']}, "
              f"flash_extra_discount={bundle.get('flash_extra_discount')}")


class TestFlashSalesPricing:
    """Test flash sale pricing calculations"""

    def test_flash_sale_adds_extra_discount(self):
        """Flash sale adds extra discount on top of base bundle discount"""
        response = requests.get(f"{BASE_URL}/api/bundles/{FLASH_BUNDLE_ID}")
        assert response.status_code == 200
        bundle = response.json()
        
        if not bundle.get("flash_active"):
            pytest.skip("Flash sale not active on test bundle")
        
        base_discount = bundle.get("base_discount", 0)
        flash_extra = bundle.get("flash_extra_discount", 0)
        total_discount = bundle.get("discount_amount", 0)
        
        assert flash_extra > 0, "Flash bundle should have extra discount"
        assert total_discount == base_discount + flash_extra, \
            f"Total discount {total_discount} should equal base {base_discount} + flash {flash_extra}"
        
        print(f"Pricing: base_discount={base_discount}, flash_extra={flash_extra}, total={total_discount}")

    def test_flash_bundle_price_calculation(self):
        """Bundle pricing includes flash_extra_discount in discount_amount when flash is active"""
        response = requests.get(f"{BASE_URL}/api/bundles/{FLASH_BUNDLE_ID}")
        assert response.status_code == 200
        bundle = response.json()
        
        if not bundle.get("flash_active"):
            pytest.skip("Flash sale not active on test bundle")
        
        original_total = bundle.get("original_total", 0)
        discount_amount = bundle.get("discount_amount", 0)
        bundle_price = bundle.get("bundle_price", 0)
        
        expected_price = max(original_total - discount_amount, 0)
        assert abs(bundle_price - expected_price) < 0.01, \
            f"Bundle price {bundle_price} should equal {original_total} - {discount_amount} = {expected_price}"
        
        print(f"Flash bundle: Rs.{bundle_price} (was Rs.{original_total}, save Rs.{discount_amount})")

    def test_non_flash_bundle_has_zero_flash_discount(self):
        """Non-flash bundles have flash_extra_discount=0"""
        response = requests.get(f"{BASE_URL}/api/bundles")
        assert response.status_code == 200
        bundles = response.json()
        
        non_flash = [b for b in bundles if not b.get("flash_active")]
        if len(non_flash) == 0:
            pytest.skip("No non-flash bundles to test")
        
        bundle = non_flash[0]
        flash_extra = bundle.get("flash_extra_discount", 0)
        assert flash_extra == 0, f"Non-flash bundle should have flash_extra_discount=0, got {flash_extra}"
        
        print(f"Non-flash bundle '{bundle['name']}' correctly has flash_extra_discount=0")


class TestFlashSalesAdminEndpoints:
    """Test admin flash sale management"""

    def test_admin_can_set_flash_sale_fields(self, admin_headers):
        """PUT /api/bundles/admin/{id} can set flash_sale_start, flash_sale_end, flash_extra_discount fields"""
        # Create a test bundle
        test_name = f"TEST_Flash_Bundle_{int(time.time())}"
        create_response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={
                "name": test_name,
                "product_ids": KNOWN_PRODUCT_IDS[:2],
                "discount_type": "percentage",
                "discount_value": 10,
                "is_active": False
            }
        )
        assert create_response.status_code == 200
        bundle_id = create_response.json()["bundle_id"]
        
        try:
            # Set flash sale fields
            now = datetime.now(timezone.utc)
            flash_start = now.isoformat()
            flash_end = (now + timedelta(hours=6)).isoformat()
            
            update_response = requests.put(
                f"{BASE_URL}/api/bundles/admin/{bundle_id}",
                headers=admin_headers,
                json={
                    "flash_sale_start": flash_start,
                    "flash_sale_end": flash_end,
                    "flash_extra_discount_type": "flat",
                    "flash_extra_discount_value": 150
                }
            )
            assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
            
            data = update_response.json()
            assert data.get("flash_sale_start") is not None, "flash_sale_start not set"
            assert data.get("flash_sale_end") is not None, "flash_sale_end not set"
            assert data.get("flash_extra_discount_type") == "flat", "flash_extra_discount_type not set"
            assert data.get("flash_extra_discount_value") == 150, "flash_extra_discount_value not set"
            
            print(f"Successfully set flash sale fields on bundle {bundle_id}")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/bundles/admin/{bundle_id}", headers=admin_headers)

    def test_admin_can_create_bundle_with_flash_sale(self, admin_headers):
        """POST /api/bundles/admin can create bundle with flash sale fields"""
        now = datetime.now(timezone.utc)
        flash_start = now.isoformat()
        flash_end = (now + timedelta(hours=2)).isoformat()
        
        test_name = f"TEST_Flash_Create_{int(time.time())}"
        response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={
                "name": test_name,
                "product_ids": KNOWN_PRODUCT_IDS[:2],
                "discount_type": "percentage",
                "discount_value": 10,
                "flash_sale_start": flash_start,
                "flash_sale_end": flash_end,
                "flash_extra_discount_type": "percentage",
                "flash_extra_discount_value": 5,
                "is_active": False
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("flash_sale_start") is not None
        assert data.get("flash_sale_end") is not None
        assert data.get("flash_extra_discount_value") == 5
        
        print(f"Created bundle with flash sale: {data['bundle_id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/bundles/admin/{data['bundle_id']}", headers=admin_headers)

    def test_admin_can_clear_flash_sale(self, admin_headers):
        """PUT /api/bundles/admin/{id} can clear flash sale by setting null values"""
        # Create a test bundle with flash sale
        now = datetime.now(timezone.utc)
        test_name = f"TEST_Flash_Clear_{int(time.time())}"
        create_response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={
                "name": test_name,
                "product_ids": KNOWN_PRODUCT_IDS[:2],
                "discount_type": "percentage",
                "discount_value": 10,
                "flash_sale_start": now.isoformat(),
                "flash_sale_end": (now + timedelta(hours=2)).isoformat(),
                "flash_extra_discount_value": 100,
                "is_active": False
            }
        )
        assert create_response.status_code == 200
        bundle_id = create_response.json()["bundle_id"]
        
        try:
            # Clear flash sale
            update_response = requests.put(
                f"{BASE_URL}/api/bundles/admin/{bundle_id}",
                headers=admin_headers,
                json={
                    "flash_sale_start": None,
                    "flash_sale_end": None,
                    "flash_extra_discount_value": 0
                }
            )
            assert update_response.status_code == 200
            
            data = update_response.json()
            assert data.get("flash_sale_start") is None, "flash_sale_start should be cleared"
            assert data.get("flash_sale_end") is None, "flash_sale_end should be cleared"
            
            print(f"Successfully cleared flash sale from bundle {bundle_id}")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/bundles/admin/{bundle_id}", headers=admin_headers)

    def test_flash_sale_percentage_extra_discount(self, admin_headers):
        """Flash sale with percentage extra discount calculates correctly"""
        # Create bundle with percentage flash discount
        now = datetime.now(timezone.utc)
        test_name = f"TEST_Flash_Percent_{int(time.time())}"
        create_response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={
                "name": test_name,
                "product_ids": KNOWN_PRODUCT_IDS[:2],
                "discount_type": "percentage",
                "discount_value": 10,
                "flash_sale_start": now.isoformat(),
                "flash_sale_end": (now + timedelta(hours=2)).isoformat(),
                "flash_extra_discount_type": "percentage",
                "flash_extra_discount_value": 5,
                "is_active": True
            }
        )
        assert create_response.status_code == 200
        bundle_id = create_response.json()["bundle_id"]
        
        try:
            # Fetch the bundle to check pricing
            get_response = requests.get(f"{BASE_URL}/api/bundles/{bundle_id}")
            assert get_response.status_code == 200
            
            bundle = get_response.json()
            if bundle.get("flash_active"):
                original_total = bundle.get("original_total", 0)
                flash_extra = bundle.get("flash_extra_discount", 0)
                
                # 5% of original total
                expected_flash_extra = round(original_total * 5 / 100, 2)
                assert abs(flash_extra - expected_flash_extra) < 1, \
                    f"Flash extra {flash_extra} should be ~{expected_flash_extra} (5% of {original_total})"
                
                print(f"Percentage flash discount: {flash_extra} (5% of {original_total})")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/bundles/admin/{bundle_id}", headers=admin_headers)


class TestFlashSalesEdgeCases:
    """Test flash sales edge cases"""

    def test_expired_flash_sale_not_in_flash_sales_endpoint(self, admin_headers):
        """Expired flash sales are not returned by /api/bundles/flash-sales"""
        # Create bundle with expired flash sale
        now = datetime.now(timezone.utc)
        past_start = (now - timedelta(hours=4)).isoformat()
        past_end = (now - timedelta(hours=2)).isoformat()
        
        test_name = f"TEST_Expired_Flash_{int(time.time())}"
        create_response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={
                "name": test_name,
                "product_ids": KNOWN_PRODUCT_IDS[:2],
                "discount_type": "percentage",
                "discount_value": 10,
                "flash_sale_start": past_start,
                "flash_sale_end": past_end,
                "flash_extra_discount_value": 100,
                "is_active": True
            }
        )
        assert create_response.status_code == 200
        bundle_id = create_response.json()["bundle_id"]
        
        try:
            # Check flash-sales endpoint
            flash_response = requests.get(f"{BASE_URL}/api/bundles/flash-sales")
            assert flash_response.status_code == 200
            
            flash_bundles = flash_response.json()
            flash_ids = [b["bundle_id"] for b in flash_bundles]
            
            assert bundle_id not in flash_ids, \
                f"Expired flash bundle {bundle_id} should not be in flash-sales endpoint"
            
            # Check that bundle shows flash_active=false
            get_response = requests.get(f"{BASE_URL}/api/bundles/{bundle_id}")
            assert get_response.status_code == 200
            bundle = get_response.json()
            assert bundle.get("flash_active") == False, "Expired flash sale should have flash_active=False"
            
            print(f"Expired flash sale correctly excluded from flash-sales endpoint")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/bundles/admin/{bundle_id}", headers=admin_headers)

    def test_future_flash_sale_not_active(self, admin_headers):
        """Future flash sales are not active yet"""
        # Create bundle with future flash sale
        now = datetime.now(timezone.utc)
        future_start = (now + timedelta(hours=2)).isoformat()
        future_end = (now + timedelta(hours=4)).isoformat()
        
        test_name = f"TEST_Future_Flash_{int(time.time())}"
        create_response = requests.post(
            f"{BASE_URL}/api/bundles/admin",
            headers=admin_headers,
            json={
                "name": test_name,
                "product_ids": KNOWN_PRODUCT_IDS[:2],
                "discount_type": "percentage",
                "discount_value": 10,
                "flash_sale_start": future_start,
                "flash_sale_end": future_end,
                "flash_extra_discount_value": 100,
                "is_active": True
            }
        )
        assert create_response.status_code == 200
        bundle_id = create_response.json()["bundle_id"]
        
        try:
            # Check that bundle shows flash_active=false
            get_response = requests.get(f"{BASE_URL}/api/bundles/{bundle_id}")
            assert get_response.status_code == 200
            bundle = get_response.json()
            assert bundle.get("flash_active") == False, "Future flash sale should have flash_active=False"
            
            # Flash extra discount should be 0 since not active
            assert bundle.get("flash_extra_discount", 0) == 0, \
                "Future flash sale should have flash_extra_discount=0"
            
            print(f"Future flash sale correctly shows flash_active=False")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/bundles/admin/{bundle_id}", headers=admin_headers)
