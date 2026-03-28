"""
Test suite for Checkout & COD Features (Iteration 27)
Tests: Checkout settings, PIN code validation, COD eligibility, order creation with COD/prepaid, risk scoring, admin high-risk orders
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
CUSTOMER_EMAIL = "upselltest@pigma.com"
CUSTOMER_PASSWORD = "test123"

# Product for testing
TEST_PRODUCT_ID = "prod_2636c2324d48"


class TestCheckoutSettings:
    """Test public and admin checkout settings endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_get_public_checkout_settings(self):
        """GET /api/checkout/settings returns public config"""
        response = self.session.get(f"{BASE_URL}/api/checkout/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required public fields
        assert "cod_enabled" in data
        assert "cod_charge" in data
        assert "prepaid_discount" in data
        assert "cod_advance_enabled" in data
        assert "cod_advance_threshold" in data
        assert "cod_advance_amount" in data
        assert "cod_max_order_value" in data
        assert "free_shipping_threshold" in data
        assert "shipping_charge" in data
        print(f"Public checkout settings: cod_enabled={data['cod_enabled']}, cod_charge={data['cod_charge']}, prepaid_discount={data['prepaid_discount']}")
    
    def test_get_admin_checkout_settings_requires_auth(self):
        """GET /api/checkout/admin/settings requires admin auth"""
        response = self.session.get(f"{BASE_URL}/api/checkout/admin/settings")
        assert response.status_code == 401 or response.status_code == 403
        print("Admin settings endpoint correctly requires authentication")
    
    def test_get_admin_checkout_settings_with_auth(self):
        """GET /api/checkout/admin/settings returns full settings with admin auth"""
        # Login as admin
        login_res = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        admin_token = login_res.json().get("token")
        
        # Get admin settings
        response = self.session.get(
            f"{BASE_URL}/api/checkout/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Admin settings should have additional fields
        assert "high_risk_threshold" in data
        assert "block_repeat_fake_users" in data
        assert "max_cod_per_user" in data
        print(f"Admin settings: high_risk_threshold={data['high_risk_threshold']}, max_cod_per_user={data['max_cod_per_user']}")
    
    def test_update_checkout_settings_requires_admin(self):
        """PUT /api/checkout/admin/settings requires admin auth"""
        response = self.session.put(f"{BASE_URL}/api/checkout/admin/settings", json={"cod_charge": 50})
        assert response.status_code == 401 or response.status_code == 403
        print("Update settings endpoint correctly requires admin authentication")
    
    def test_update_checkout_settings_with_admin(self):
        """PUT /api/checkout/admin/settings updates settings"""
        # Login as admin
        login_res = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        admin_token = login_res.json().get("token")
        
        # Get current settings
        current = self.session.get(
            f"{BASE_URL}/api/checkout/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        original_charge = current.get("cod_charge", 49)
        
        # Update settings
        response = self.session.put(
            f"{BASE_URL}/api/checkout/admin/settings",
            json={"cod_charge": 55},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify update
        updated = self.session.get(
            f"{BASE_URL}/api/checkout/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        assert updated["cod_charge"] == 55
        
        # Restore original
        self.session.put(
            f"{BASE_URL}/api/checkout/admin/settings",
            json={"cod_charge": original_charge},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Settings update verified: cod_charge changed to 55 and restored to {original_charge}")


class TestPincodeValidation:
    """Test PIN code validation endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
    
    def test_validate_pincode_delhi(self):
        """GET /api/checkout/validate-pincode/110001 returns Delhi"""
        response = self.session.get(f"{BASE_URL}/api/checkout/validate-pincode/110001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["valid"] == True
        assert data["city"] == "New Delhi"
        assert data["state"] == "Delhi"
        print(f"PIN 110001: {data['city']}, {data['state']}")
    
    def test_validate_pincode_jaipur(self):
        """GET /api/checkout/validate-pincode/302001 returns Jaipur"""
        response = self.session.get(f"{BASE_URL}/api/checkout/validate-pincode/302001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["valid"] == True
        assert data["city"] == "Jaipur"
        assert data["state"] == "Rajasthan"
        print(f"PIN 302001: {data['city']}, {data['state']}")
    
    def test_validate_pincode_mumbai(self):
        """GET /api/checkout/validate-pincode/400001 returns Mumbai"""
        response = self.session.get(f"{BASE_URL}/api/checkout/validate-pincode/400001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["valid"] == True
        assert data["city"] == "Mumbai"
        assert data["state"] == "Maharashtra"
        print(f"PIN 400001: {data['city']}, {data['state']}")
    
    def test_validate_pincode_invalid_000001(self):
        """GET /api/checkout/validate-pincode/000001 returns 400 error"""
        response = self.session.get(f"{BASE_URL}/api/checkout/validate-pincode/000001")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Invalid PIN 000001 correctly rejected")
    
    def test_validate_pincode_invalid_alpha(self):
        """GET /api/checkout/validate-pincode/abc123 returns 400 error"""
        response = self.session.get(f"{BASE_URL}/api/checkout/validate-pincode/abc123")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Invalid PIN abc123 correctly rejected")
    
    def test_validate_pincode_short(self):
        """GET /api/checkout/validate-pincode/12345 returns 400 error (too short)"""
        response = self.session.get(f"{BASE_URL}/api/checkout/validate-pincode/12345")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Short PIN 12345 correctly rejected")


class TestCODEligibility:
    """Test COD eligibility check endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_cod_eligibility_requires_auth(self):
        """GET /api/checkout/cod-eligibility requires customer auth"""
        response = self.session.get(f"{BASE_URL}/api/checkout/cod-eligibility")
        assert response.status_code == 401 or response.status_code == 403
        print("COD eligibility endpoint correctly requires authentication")
    
    def test_cod_eligibility_with_customer_auth(self):
        """GET /api/checkout/cod-eligibility returns eligibility status"""
        # Login as customer
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        assert login_res.status_code == 200, f"Customer login failed: {login_res.text}"
        customer_token = login_res.json().get("token")
        
        # Check eligibility
        response = self.session.get(
            f"{BASE_URL}/api/checkout/cod-eligibility",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "eligible" in data
        print(f"COD eligibility: eligible={data.get('eligible')}, reason={data.get('reason', 'N/A')}")


class TestOrderCreation:
    """Test order creation with COD and prepaid payment methods"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as customer
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        assert login_res.status_code == 200, f"Customer login failed: {login_res.text}"
        self.customer_token = login_res.json().get("token")
        self.auth_headers = {"Authorization": f"Bearer {self.customer_token}"}
    
    def _add_to_cart(self, product_id=TEST_PRODUCT_ID, quantity=1):
        """Helper to add item to cart"""
        response = self.session.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": quantity, "size": "M", "color": "BLACK"},
            headers=self.auth_headers
        )
        return response
    
    def _clear_cart(self):
        """Helper to clear cart"""
        cart = self.session.get(f"{BASE_URL}/api/cart", headers=self.auth_headers).json()
        for item in cart.get("items", []):
            self.session.delete(
                f"{BASE_URL}/api/cart/remove/{item['product_id']}?size={item['size']}&color={item['color']}",
                headers=self.auth_headers
            )
    
    def test_create_prepaid_order(self):
        """POST /api/orders with payment_method='prepaid' applies prepaid discount"""
        # Clear and add to cart
        self._clear_cart()
        add_res = self._add_to_cart()
        assert add_res.status_code == 200, f"Add to cart failed: {add_res.text}"
        
        # Create prepaid order
        response = self.session.post(
            f"{BASE_URL}/api/orders",
            json={
                "shipping_address": {
                    "name": "Test User", "phone": "9876543210",
                    "address": "123 Test St", "city": "Mumbai",
                    "state": "Maharashtra", "pincode": "400001", "country": "India"
                },
                "payment_method": "prepaid"
            },
            headers=self.auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["payment_method"] == "prepaid"
        assert data["cod_charge"] == 0
        assert data["prepaid_discount"] >= 0  # Should have prepaid discount if enabled
        assert data["status"] == "pending"
        print(f"Prepaid order created: {data['order_id']}, prepaid_discount={data['prepaid_discount']}, total={data['total']}")
    
    def test_create_cod_order_with_advance(self):
        """POST /api/orders with payment_method='cod' adds cod_charge and calculates advance"""
        # Clear and add to cart
        self._clear_cart()
        add_res = self._add_to_cart()
        assert add_res.status_code == 200, f"Add to cart failed: {add_res.text}"
        
        # Get cart to check subtotal
        cart = self.session.get(f"{BASE_URL}/api/cart", headers=self.auth_headers).json()
        subtotal = cart.get("total", 0)
        
        # Create COD order
        response = self.session.post(
            f"{BASE_URL}/api/orders",
            json={
                "shipping_address": {
                    "name": "Test User", "phone": "9876543210",
                    "address": "123 Test St", "city": "Mumbai",
                    "state": "Maharashtra", "pincode": "400001", "country": "India"
                },
                "payment_method": "cod"
            },
            headers=self.auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["payment_method"] == "cod"
        assert data["cod_charge"] == 49  # Default COD charge
        assert data["prepaid_discount"] == 0  # No prepaid discount for COD
        
        # If subtotal >= 1000, should have advance
        if subtotal >= 1000:
            assert data["cod_advance_amount"] == 500
            assert data["status"] == "pending_advance"
            print(f"COD order with advance: {data['order_id']}, advance={data['cod_advance_amount']}, remaining={data['cod_remaining']}")
        else:
            assert data["status"] == "cod_confirmed"
            print(f"COD order without advance: {data['order_id']}, total={data['total']}")


class TestRiskScoring:
    """Test risk scoring for COD orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as customer
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        assert login_res.status_code == 200
        self.customer_token = login_res.json().get("token")
        self.auth_headers = {"Authorization": f"Bearer {self.customer_token}"}
        
        # Login as admin
        admin_login = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        assert admin_login.status_code == 200
        self.admin_token = admin_login.json().get("token")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_high_risk_orders_endpoint(self):
        """GET /api/checkout/admin/high-risk-orders returns flagged orders"""
        response = self.session.get(
            f"{BASE_URL}/api/checkout/admin/high-risk-orders",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"High-risk orders count: {len(data)}")
        
        # Check structure if orders exist
        if len(data) > 0:
            order = data[0]
            assert "order_id" in order
            assert "risk_level" in order
            assert order["risk_level"] in ["high", "medium"]
            print(f"Sample high-risk order: {order['order_id']}, risk_level={order['risk_level']}")
    
    def test_high_risk_orders_requires_admin(self):
        """GET /api/checkout/admin/high-risk-orders requires admin auth"""
        response = self.session.get(f"{BASE_URL}/api/checkout/admin/high-risk-orders")
        assert response.status_code == 401 or response.status_code == 403
        print("High-risk orders endpoint correctly requires admin authentication")


class TestRiskActions:
    """Test admin risk action endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        admin_login = self.session.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        assert admin_login.status_code == 200
        self.admin_token = admin_login.json().get("token")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_risk_action_invalid_action(self):
        """PUT /api/checkout/admin/orders/{id}/risk-action with invalid action returns 400"""
        response = self.session.put(
            f"{BASE_URL}/api/checkout/admin/orders/fake_order_id/risk-action",
            json={"action": "invalid_action"},
            headers=self.admin_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Invalid risk action correctly rejected")
    
    def test_risk_action_order_not_found(self):
        """PUT /api/checkout/admin/orders/{id}/risk-action with non-existent order returns 404"""
        response = self.session.put(
            f"{BASE_URL}/api/checkout/admin/orders/nonexistent_order_123/risk-action",
            json={"action": "approve"},
            headers=self.admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Non-existent order correctly returns 404")
    
    def test_risk_action_requires_admin(self):
        """PUT /api/checkout/admin/orders/{id}/risk-action requires admin auth"""
        response = self.session.put(
            f"{BASE_URL}/api/checkout/admin/orders/fake_order_id/risk-action",
            json={"action": "approve"}
        )
        assert response.status_code == 401 or response.status_code == 403
        print("Risk action endpoint correctly requires admin authentication")


class TestCODMaxOrderValue:
    """Test COD max order value restriction"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_cod_max_order_value_in_settings(self):
        """Verify cod_max_order_value is present in public settings"""
        response = self.session.get(f"{BASE_URL}/api/checkout/settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "cod_max_order_value" in data
        assert data["cod_max_order_value"] > 0
        print(f"COD max order value: Rs.{data['cod_max_order_value']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
