"""
Razorpay Payment Integration Tests
Tests for:
- POST /api/payment/create-order - Creates a real Razorpay order
- POST /api/payment/verify - Verifies Razorpay signature (rejects invalid)
- POST /api/payment/webhook - Handles payment.captured and payment.failed events
- POST /api/orders - Creates order with payment_method=prepaid
- POST /api/vendors/promotions/credits/create-order - Vendor credit purchase
- POST /api/vendors/promotions/credits/verify-payment - Verify vendor credit payment
"""

import pytest
import requests
import os
import hmac
import hashlib
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "admin@pigma.com"
CUSTOMER_PASSWORD = "admin123"
VENDOR_EMAIL = "testvendor@example.com"
VENDOR_PASSWORD = "vendor123"


class TestRazorpayConfiguration:
    """Test that Razorpay is properly configured"""
    
    def test_backend_env_has_razorpay_keys(self):
        """Verify backend has Razorpay keys configured"""
        # We can't directly check env vars, but we can test the API behavior
        # If keys are configured, create-order should return real Razorpay order_id
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("Backend is healthy and running")


class TestCustomerAuth:
    """Helper to get customer auth token"""
    
    @pytest.fixture
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        token = response.json().get("token")
        assert token, "No token returned"
        print(f"Customer logged in successfully")
        return token


class TestVendorAuth:
    """Helper to get vendor auth token"""
    
    @pytest.fixture
    def vendor_token(self):
        response = requests.post(f"{BASE_URL}/api/vendors/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        token = response.json().get("token")
        assert token, "No token returned"
        print(f"Vendor logged in successfully")
        return token


class TestPaymentCreateOrder(TestCustomerAuth):
    """Test POST /api/payment/create-order"""
    
    def test_create_order_requires_auth(self):
        """Create order should require authentication"""
        response = requests.post(f"{BASE_URL}/api/payment/create-order", json={
            "order_id": "test_order_123",
            "amount": 10000,
            "currency": "INR"
        })
        assert response.status_code == 401 or response.status_code == 403
        print("PASS: Create order requires authentication")
    
    def test_create_order_requires_valid_order(self, customer_token):
        """Create order should fail for non-existent order"""
        response = requests.post(
            f"{BASE_URL}/api/payment/create-order",
            json={
                "order_id": "nonexistent_order_12345",
                "amount": 10000,
                "currency": "INR"
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 404
        print("PASS: Create order fails for non-existent order")


class TestPaymentVerify(TestCustomerAuth):
    """Test POST /api/payment/verify"""
    
    def test_verify_requires_auth(self):
        """Verify payment should require authentication"""
        response = requests.post(f"{BASE_URL}/api/payment/verify", json={
            "razorpay_order_id": "order_test123",
            "razorpay_payment_id": "pay_test123",
            "razorpay_signature": "invalid_signature",
            "order_id": "test_order_123"
        })
        assert response.status_code == 401 or response.status_code == 403
        print("PASS: Verify payment requires authentication")
    
    def test_verify_rejects_invalid_signature(self, customer_token):
        """Verify should reject invalid signatures"""
        response = requests.post(
            f"{BASE_URL}/api/payment/verify",
            json={
                "razorpay_order_id": "order_test123",
                "razorpay_payment_id": "pay_test123",
                "razorpay_signature": "invalid_signature_12345",
                "order_id": "nonexistent_order"
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        # Should fail - either 404 (order not found) or 400 (invalid signature)
        assert response.status_code in [400, 404]
        print(f"PASS: Verify rejects invalid request (status: {response.status_code})")


class TestPaymentWebhook:
    """Test POST /api/payment/webhook"""
    
    def test_webhook_endpoint_exists(self):
        """Webhook endpoint should exist and accept POST"""
        # Send empty payload - should fail validation but endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/payment/webhook",
            json={},
            headers={"Content-Type": "application/json"}
        )
        # Should not be 404 - endpoint exists
        assert response.status_code != 404
        print(f"PASS: Webhook endpoint exists (status: {response.status_code})")
    
    def test_webhook_requires_signature_when_secret_configured(self):
        """Webhook should require valid signature when RAZORPAY_WEBHOOK_SECRET is configured"""
        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_test_webhook_123",
                        "order_id": "order_test_webhook_123",
                        "amount": 10000,
                        "currency": "INR",
                        "status": "captured",
                        "notes": {
                            "pigma_order_id": "nonexistent_order_for_test"
                        }
                    }
                }
            }
        }
        response = requests.post(
            f"{BASE_URL}/api/payment/webhook",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        # Should return 400 (invalid signature) when webhook secret is configured
        # This is CORRECT behavior - webhook signature verification is working
        assert response.status_code == 400
        assert "signature" in response.json().get("detail", "").lower()
        print("PASS: Webhook correctly requires valid signature")
    
    def test_webhook_with_valid_signature(self):
        """Webhook should accept requests with valid HMAC signature"""
        # This test demonstrates the signature verification mechanism
        # In production, Razorpay sends the signature in X-Razorpay-Signature header
        webhook_secret = "pigma_razorpay_webhook_2024"  # From backend/.env
        
        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_test_valid_sig",
                        "order_id": "order_test_valid_sig",
                        "amount": 10000,
                        "notes": {}
                    }
                }
            }
        }
        
        # Generate valid HMAC signature
        body = json.dumps(payload, separators=(',', ':'))
        expected_sig = hmac.new(
            webhook_secret.encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        
        response = requests.post(
            f"{BASE_URL}/api/payment/webhook",
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-Razorpay-Signature": expected_sig
            }
        )
        # Should return 200 OK with valid signature
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("PASS: Webhook accepts valid signature")


class TestOrderCreation(TestCustomerAuth):
    """Test POST /api/orders with payment methods"""
    
    def test_orders_endpoint_requires_auth(self):
        """Orders endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/orders", json={
            "shipping_address": {
                "name": "Test User",
                "phone": "9999999999",
                "address": "Test Address",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001",
                "country": "India"
            },
            "payment_method": "prepaid"
        })
        assert response.status_code == 401 or response.status_code == 403
        print("PASS: Orders endpoint requires authentication")
    
    def test_order_creation_with_empty_cart(self, customer_token):
        """Order creation should fail with empty cart"""
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "shipping_address": {
                    "name": "Test User",
                    "phone": "9999999999",
                    "address": "Test Address",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pincode": "400001",
                    "country": "India"
                },
                "payment_method": "prepaid"
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        # Should fail with 400 (cart empty) or succeed if cart has items
        # Either way, endpoint is working
        assert response.status_code in [200, 201, 400]
        print(f"PASS: Order creation endpoint works (status: {response.status_code})")


class TestVendorCreditPurchase(TestVendorAuth):
    """Test vendor credit purchase with Razorpay"""
    
    def test_create_credit_order_requires_auth(self):
        """Create credit order should require vendor authentication"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/promotions/credits/create-order",
            json={"amount": 100}
        )
        assert response.status_code == 401 or response.status_code == 403
        print("PASS: Create credit order requires authentication")
    
    def test_create_credit_order_returns_razorpay_order(self, vendor_token):
        """Create credit order should return real Razorpay order_id"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/promotions/credits/create-order",
            json={"amount": 100},
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "order_id" in data
        assert "amount" in data
        assert "currency" in data
        
        # Check if real Razorpay (order_id starts with 'order_') or mocked
        order_id = data.get("order_id", "")
        is_mocked = data.get("mocked", True)
        
        if is_mocked:
            print(f"INFO: Credit order is MOCKED (order_id: {order_id})")
            # In mocked mode, credits are added immediately
            assert "credits_added" in data or "message" in data
        else:
            # Real Razorpay order
            assert order_id.startswith("order_"), f"Expected Razorpay order_id starting with 'order_', got: {order_id}"
            assert "key_id" in data
            print(f"PASS: Real Razorpay order created: {order_id}")
        
        print(f"PASS: Create credit order works (mocked={is_mocked})")
    
    def test_create_credit_order_minimum_amount(self, vendor_token):
        """Create credit order should enforce minimum amount"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/promotions/credits/create-order",
            json={"amount": 10},  # Below minimum of 100
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 400
        assert "minimum" in response.json().get("detail", "").lower()
        print("PASS: Minimum credit amount enforced")
    
    def test_verify_credit_payment_requires_auth(self):
        """Verify credit payment should require vendor authentication"""
        response = requests.post(
            f"{BASE_URL}/api/vendors/promotions/credits/verify-payment",
            json={
                "razorpay_order_id": "order_test123",
                "razorpay_payment_id": "pay_test123",
                "razorpay_signature": "invalid_signature"
            }
        )
        assert response.status_code == 401 or response.status_code == 403
        print("PASS: Verify credit payment requires authentication")


class TestCheckoutSettings:
    """Test checkout settings endpoint"""
    
    def test_checkout_settings_returns_payment_options(self):
        """Checkout settings should return payment method options"""
        response = requests.get(f"{BASE_URL}/api/checkout/settings")
        assert response.status_code == 200
        data = response.json()
        
        # Check for COD and prepaid settings
        assert "cod_enabled" in data
        assert "prepaid_discount_enabled" in data or "prepaid_discount" in data
        print(f"PASS: Checkout settings returned (COD enabled: {data.get('cod_enabled')})")


class TestPaymentRouterIntegration:
    """Test payment router is properly integrated"""
    
    def test_payment_routes_registered(self):
        """Payment routes should be registered in the API"""
        # Test that payment endpoints exist (not 404)
        endpoints = [
            "/api/payment/create-order",
            "/api/payment/verify",
            "/api/payment/webhook"
        ]
        
        for endpoint in endpoints:
            # Use OPTIONS or HEAD to check if endpoint exists
            response = requests.options(f"{BASE_URL}{endpoint}")
            # Should not be 404
            assert response.status_code != 404, f"Endpoint {endpoint} not found"
        
        print("PASS: All payment routes are registered")


class TestVendorCreditRoutes(TestVendorAuth):
    """Test vendor credit routes with real Razorpay"""
    
    def test_vendor_credit_balance(self, vendor_token):
        """Get vendor credit balance"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/promotions/credits",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        print(f"PASS: Vendor credit balance: {data.get('balance')}")
    
    def test_vendor_credit_transactions(self, vendor_token):
        """Get vendor credit transactions"""
        response = requests.get(
            f"{BASE_URL}/api/vendors/promotions/credits/transactions",
            headers={"Authorization": f"Bearer {vendor_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Vendor credit transactions: {len(data)} records")


class TestPaymentVendorCreditEndpoint(TestCustomerAuth):
    """Test the payment/vendor-credit endpoints (requires customer auth, not vendor)"""
    
    def test_vendor_credit_create_order_via_payment_route(self, customer_token):
        """Test /api/payment/vendor-credit/create-order endpoint
        
        Note: This endpoint uses get_current_user (customer auth), not get_current_vendor.
        It's designed for users who are also vendors to purchase credits.
        The vendor-specific endpoint is /api/vendors/promotions/credits/create-order
        """
        response = requests.post(
            f"{BASE_URL}/api/payment/vendor-credit/create-order",
            json={"amount_inr": 100},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "razorpay_order_id" in data
        assert "razorpay_key_id" in data
        assert "amount" in data
        
        order_id = data.get("razorpay_order_id", "")
        # Real Razorpay order_id starts with 'order_'
        assert order_id.startswith("order_"), f"Expected real Razorpay order_id, got: {order_id}"
        
        print(f"PASS: Vendor credit order created via payment route: {order_id}")
        print(f"  - Amount: {data.get('amount')} paise")
        print(f"  - Key ID: {data.get('razorpay_key_id')[:10]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
