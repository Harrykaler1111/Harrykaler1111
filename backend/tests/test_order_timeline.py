"""
Order Timeline/Activity Log Feature Tests
Tests for the order timeline endpoints and event logging functionality.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
TEST_CUSTOMER_EMAIL = f"timeline_test_{uuid.uuid4().hex[:8]}@test.com"
TEST_CUSTOMER_PASSWORD = "Test123!"


class TestOrderTimelineBackend:
    """Tests for Order Timeline/Activity Log feature"""
    
    admin_token = None
    customer_token = None
    test_order_id = None
    test_user_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens for tests"""
        # Get admin token
        if not TestOrderTimelineBackend.admin_token:
            response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            if response.status_code == 200:
                TestOrderTimelineBackend.admin_token = response.json().get("token")
                print(f"Admin login successful")
            else:
                pytest.skip(f"Admin login failed: {response.status_code}")
        
        # Register and login test customer
        if not TestOrderTimelineBackend.customer_token:
            # Register
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_CUSTOMER_EMAIL,
                "password": TEST_CUSTOMER_PASSWORD,
                "name": "Timeline Test User"
            })
            if reg_response.status_code in [200, 201]:
                print(f"Customer registered: {TEST_CUSTOMER_EMAIL}")
            
            # Login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_CUSTOMER_EMAIL,
                "password": TEST_CUSTOMER_PASSWORD
            })
            if login_response.status_code == 200:
                data = login_response.json()
                TestOrderTimelineBackend.customer_token = data.get("token")
                TestOrderTimelineBackend.test_user_id = data.get("user", {}).get("user_id")
                print(f"Customer login successful")
            else:
                pytest.skip(f"Customer login failed: {login_response.status_code}")
    
    # ============== FEATURE 1: POST /api/orders creates order and logs 'order_placed' event ==============
    
    def test_01_create_order_logs_order_placed_event(self):
        """Test that creating an order logs 'order_placed' event to order_events collection"""
        # First add a product to cart
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        assert products_response.status_code == 200, f"Failed to get products: {products_response.text}"
        products = products_response.json()
        assert len(products) > 0, "No products available for testing"
        
        product = products[0]
        product_id = product.get("product_id")
        
        # Add to cart
        cart_response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={
                "product_id": product_id,
                "quantity": 1,
                "size": product.get("sizes", ["M"])[0] if product.get("sizes") else "M",
                "color": product.get("colors", ["Black"])[0] if product.get("colors") else "Black"
            },
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.customer_token}"}
        )
        assert cart_response.status_code == 200, f"Failed to add to cart: {cart_response.text}"
        
        # Create order
        order_response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "shipping_address": {
                    "name": "Timeline Test User",
                    "phone": "9876543210",
                    "address": "123 Test Street",
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "pincode": "400001"
                },
                "payment_method": "razorpay"
            },
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.customer_token}"}
        )
        assert order_response.status_code == 200, f"Failed to create order: {order_response.text}"
        
        order_data = order_response.json()
        TestOrderTimelineBackend.test_order_id = order_data.get("order_id")
        print(f"Created order: {TestOrderTimelineBackend.test_order_id}")
        
        # Verify order_placed event was logged by checking customer timeline
        timeline_response = requests.get(
            f"{BASE_URL}/api/orders/{TestOrderTimelineBackend.test_order_id}/timeline",
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.customer_token}"}
        )
        assert timeline_response.status_code == 200, f"Failed to get timeline: {timeline_response.text}"
        
        events = timeline_response.json()
        assert len(events) > 0, "No events found in timeline"
        
        # Check for order_placed event
        order_placed_events = [e for e in events if e.get("event_type") == "order_placed"]
        assert len(order_placed_events) > 0, "order_placed event not found in timeline"
        
        event = order_placed_events[0]
        assert event.get("title") == "Order Placed", f"Unexpected title: {event.get('title')}"
        assert "Order #" in event.get("description", ""), f"Description missing order ID: {event.get('description')}"
        print(f"PASSED: order_placed event logged correctly")
    
    # ============== FEATURE 2: POST /api/orders/{id}/payment/verify logs payment events ==============
    
    def test_02_payment_verify_logs_events(self):
        """Test that payment verification logs 'payment_verified' and 'status_change' (confirmed) events"""
        if not TestOrderTimelineBackend.test_order_id:
            pytest.skip("No test order available")
        
        # Verify payment with mocked Razorpay IDs
        verify_response = requests.post(
            f"{BASE_URL}/api/orders/{TestOrderTimelineBackend.test_order_id}/payment/verify",
            params={
                "razorpay_payment_id": f"demo_pay_{uuid.uuid4().hex[:12]}",
                "razorpay_signature": f"demo_sig_{uuid.uuid4().hex[:12]}"
            },
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.customer_token}"}
        )
        assert verify_response.status_code == 200, f"Payment verify failed: {verify_response.text}"
        
        # Check timeline for payment events
        timeline_response = requests.get(
            f"{BASE_URL}/api/orders/{TestOrderTimelineBackend.test_order_id}/timeline",
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.customer_token}"}
        )
        assert timeline_response.status_code == 200
        
        events = timeline_response.json()
        event_types = [e.get("event_type") for e in events]
        
        # Verify payment_verified event exists
        assert "payment_verified" in event_types, f"payment_verified event not found. Events: {event_types}"
        
        # Verify status_change event for confirmed status exists
        status_change_events = [e for e in events if e.get("event_type") == "status_change"]
        assert len(status_change_events) > 0, "No status_change events found"
        
        # Check that one of the status_change events is for 'confirmed'
        confirmed_event = [e for e in status_change_events if "confirmed" in e.get("title", "").lower() or "confirmed" in e.get("description", "").lower()]
        assert len(confirmed_event) > 0, f"No confirmed status_change event found. Events: {[e.get('title') for e in status_change_events]}"
        
        print(f"PASSED: payment_verified and status_change (confirmed) events logged")
    
    # ============== FEATURE 3: PUT /api/admin/orders/{id}/status logs 'status_change' event ==============
    
    def test_03_admin_status_update_logs_event(self):
        """Test that admin status update logs 'status_change' event with admin actor details"""
        if not TestOrderTimelineBackend.test_order_id:
            pytest.skip("No test order available")
        
        # Admin updates status to processing
        status_response = requests.put(
            f"{BASE_URL}/api/admin/orders/{TestOrderTimelineBackend.test_order_id}/status",
            params={"status": "processing"},
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.admin_token}"}
        )
        assert status_response.status_code == 200, f"Status update failed: {status_response.text}"
        
        # Check admin timeline for the event with actor details
        admin_timeline_response = requests.get(
            f"{BASE_URL}/api/admin/orders/{TestOrderTimelineBackend.test_order_id}/timeline",
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.admin_token}"}
        )
        assert admin_timeline_response.status_code == 200
        
        events = admin_timeline_response.json()
        
        # Find the processing status_change event
        processing_events = [e for e in events if e.get("event_type") == "status_change" and "processing" in e.get("title", "").lower()]
        assert len(processing_events) > 0, f"Processing status_change event not found"
        
        event = processing_events[0]
        # Admin timeline should have actor details
        assert event.get("actor_type") == "admin", f"Expected actor_type 'admin', got: {event.get('actor_type')}"
        assert event.get("actor_name") is not None, "actor_name should be present in admin timeline"
        
        print(f"PASSED: Admin status update logged with actor details")
    
    # ============== FEATURE 4: PUT /api/admin/orders/{id}/tracking logs tracking events ==============
    
    def test_04_admin_tracking_update_logs_events(self):
        """Test that adding tracking logs 'tracking_added' and 'status_change' (shipped) events"""
        if not TestOrderTimelineBackend.test_order_id:
            pytest.skip("No test order available")
        
        # Admin adds tracking
        tracking_response = requests.put(
            f"{BASE_URL}/api/admin/orders/{TestOrderTimelineBackend.test_order_id}/tracking",
            json={
                "tracking_id": f"TRACK_{uuid.uuid4().hex[:8].upper()}",
                "courier_name": "Test Courier"
            },
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.admin_token}"}
        )
        assert tracking_response.status_code == 200, f"Tracking update failed: {tracking_response.text}"
        
        # Check admin timeline
        admin_timeline_response = requests.get(
            f"{BASE_URL}/api/admin/orders/{TestOrderTimelineBackend.test_order_id}/timeline",
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.admin_token}"}
        )
        assert admin_timeline_response.status_code == 200
        
        events = admin_timeline_response.json()
        event_types = [e.get("event_type") for e in events]
        
        # Verify tracking_added event
        assert "tracking_added" in event_types, f"tracking_added event not found. Events: {event_types}"
        
        # Verify shipped status_change event
        shipped_events = [e for e in events if e.get("event_type") == "status_change" and "shipped" in e.get("title", "").lower()]
        assert len(shipped_events) > 0, f"Shipped status_change event not found"
        
        print(f"PASSED: tracking_added and status_change (shipped) events logged")
    
    # ============== FEATURE 5: GET /api/orders/{id}/timeline - Customer view (no admin names) ==============
    
    def test_05_customer_timeline_hides_admin_names(self):
        """Test that customer timeline endpoint strips admin names and shows actor_type as 'system' or 'customer'"""
        if not TestOrderTimelineBackend.test_order_id:
            pytest.skip("No test order available")
        
        # Get customer timeline
        customer_timeline_response = requests.get(
            f"{BASE_URL}/api/orders/{TestOrderTimelineBackend.test_order_id}/timeline",
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.customer_token}"}
        )
        assert customer_timeline_response.status_code == 200
        
        events = customer_timeline_response.json()
        assert len(events) > 0, "No events in customer timeline"
        
        for event in events:
            # Customer should NOT see admin actor names
            assert event.get("actor_name") is None, f"actor_name should be hidden from customer: {event}"
            assert event.get("actor_id") is None, f"actor_id should be hidden from customer: {event}"
            
            # actor_type should be 'system' or 'customer', never 'admin'
            actor_type = event.get("actor_type")
            assert actor_type in ["system", "customer", None], f"Unexpected actor_type for customer: {actor_type}"
        
        print(f"PASSED: Customer timeline correctly hides admin details")
    
    # ============== FEATURE 6: GET /api/admin/orders/{id}/timeline - Admin view (full details) ==============
    
    def test_06_admin_timeline_shows_full_details(self):
        """Test that admin timeline endpoint returns events with full admin actor details"""
        if not TestOrderTimelineBackend.test_order_id:
            pytest.skip("No test order available")
        
        # Get admin timeline
        admin_timeline_response = requests.get(
            f"{BASE_URL}/api/admin/orders/{TestOrderTimelineBackend.test_order_id}/timeline",
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.admin_token}"}
        )
        assert admin_timeline_response.status_code == 200
        
        events = admin_timeline_response.json()
        assert len(events) > 0, "No events in admin timeline"
        
        # Find admin-initiated events
        admin_events = [e for e in events if e.get("actor_type") == "admin"]
        assert len(admin_events) > 0, "No admin-initiated events found"
        
        for event in admin_events:
            # Admin should see actor_name and actor_id
            assert event.get("actor_name") is not None, f"actor_name missing in admin event: {event}"
            assert event.get("actor_id") is not None, f"actor_id missing in admin event: {event}"
        
        print(f"PASSED: Admin timeline shows full actor details")
    
    # ============== FEATURE 7: Test timeline event structure ==============
    
    def test_07_timeline_event_structure(self):
        """Test that timeline events have correct structure with all required fields"""
        if not TestOrderTimelineBackend.test_order_id:
            pytest.skip("No test order available")
        
        # Get admin timeline (has full details)
        admin_timeline_response = requests.get(
            f"{BASE_URL}/api/admin/orders/{TestOrderTimelineBackend.test_order_id}/timeline",
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.admin_token}"}
        )
        assert admin_timeline_response.status_code == 200
        
        events = admin_timeline_response.json()
        assert len(events) > 0
        
        required_fields = ["event_id", "order_id", "event_type", "title", "created_at"]
        
        for event in events:
            for field in required_fields:
                assert field in event, f"Missing required field '{field}' in event: {event}"
            
            # Verify event_id format
            assert event["event_id"].startswith("evt_"), f"Invalid event_id format: {event['event_id']}"
            
            # Verify order_id matches
            assert event["order_id"] == TestOrderTimelineBackend.test_order_id
            
            # Verify event_type is valid
            valid_types = ["order_placed", "payment_verified", "status_change", "tracking_added"]
            assert event["event_type"] in valid_types, f"Invalid event_type: {event['event_type']}"
        
        print(f"PASSED: Timeline events have correct structure")
    
    # ============== FEATURE 8: Test timeline chronological order ==============
    
    def test_08_timeline_chronological_order(self):
        """Test that timeline events are returned in chronological order"""
        if not TestOrderTimelineBackend.test_order_id:
            pytest.skip("No test order available")
        
        admin_timeline_response = requests.get(
            f"{BASE_URL}/api/admin/orders/{TestOrderTimelineBackend.test_order_id}/timeline",
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.admin_token}"}
        )
        assert admin_timeline_response.status_code == 200
        
        events = admin_timeline_response.json()
        assert len(events) >= 2, "Need at least 2 events to verify order"
        
        # Verify chronological order (oldest first)
        for i in range(len(events) - 1):
            current_time = events[i].get("created_at", "")
            next_time = events[i + 1].get("created_at", "")
            assert current_time <= next_time, f"Events not in chronological order: {current_time} > {next_time}"
        
        print(f"PASSED: Timeline events in chronological order")
    
    # ============== FEATURE 9: Test existing order has backfilled events ==============
    
    def test_09_existing_order_has_events(self):
        """Test that existing orders have backfilled timeline events (not empty)"""
        # Get list of orders from admin
        orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders?limit=5",
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.admin_token}"}
        )
        assert orders_response.status_code == 200
        
        orders = orders_response.json()
        if len(orders) == 0:
            pytest.skip("No orders available to test backfill")
        
        # Check timeline for first order
        order_id = orders[0].get("order_id")
        timeline_response = requests.get(
            f"{BASE_URL}/api/admin/orders/{order_id}/timeline",
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.admin_token}"}
        )
        assert timeline_response.status_code == 200
        
        events = timeline_response.json()
        # Existing orders should have at least one event (backfilled or real)
        assert len(events) >= 1, f"Order {order_id} has no timeline events - backfill may be missing"
        
        print(f"PASSED: Existing order {order_id} has {len(events)} timeline events")
    
    # ============== FEATURE 10: Test unauthorized access ==============
    
    def test_10_customer_cannot_access_admin_timeline(self):
        """Test that customer cannot access admin timeline endpoint"""
        if not TestOrderTimelineBackend.test_order_id:
            pytest.skip("No test order available")
        
        # Customer tries to access admin timeline
        response = requests.get(
            f"{BASE_URL}/api/admin/orders/{TestOrderTimelineBackend.test_order_id}/timeline",
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.customer_token}"}
        )
        
        # Should be 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403, got: {response.status_code}"
        print(f"PASSED: Customer correctly denied access to admin timeline")
    
    def test_11_customer_cannot_access_other_order_timeline(self):
        """Test that customer cannot access timeline of another customer's order"""
        # Get an order that doesn't belong to test customer
        orders_response = requests.get(
            f"{BASE_URL}/api/admin/orders?limit=10",
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.admin_token}"}
        )
        assert orders_response.status_code == 200
        
        orders = orders_response.json()
        other_order = None
        for order in orders:
            if order.get("user_id") != TestOrderTimelineBackend.test_user_id:
                other_order = order
                break
        
        if not other_order:
            pytest.skip("No other customer's order available to test")
        
        # Customer tries to access other customer's timeline
        response = requests.get(
            f"{BASE_URL}/api/orders/{other_order['order_id']}/timeline",
            headers={"Authorization": f"Bearer {TestOrderTimelineBackend.customer_token}"}
        )
        
        # Should be 404 (order not found for this user)
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        print(f"PASSED: Customer correctly denied access to other customer's timeline")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
