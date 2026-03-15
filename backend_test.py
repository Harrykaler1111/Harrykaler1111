import requests
import sys
import time
from datetime import datetime
import json

class PigmaAPITester:
    def __init__(self, base_url="https://pigma-marketplace-v2.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, auth_required=False, admin_required=False):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = headers or {}
        
        if admin_required and self.admin_token:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'
        elif auth_required and self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
            
        if data:
            test_headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json().get('detail', 'No error detail')
                    self.log(f"   Error: {error_detail}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'endpoint': endpoint
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e),
                'endpoint': endpoint
            })
            return False, {}

    def test_health_check(self):
        """Test API health endpoints"""
        self.log("=== Testing Health Check ===")
        
        # Test root endpoint
        success1, _ = self.run_test("API Root", "GET", "", 200)
        
        # Test health endpoint
        success2, _ = self.run_test("Health Check", "GET", "health", 200)
        
        return success1 and success2

    def test_admin_login(self):
        """Test admin login"""
        self.log("=== Testing Admin Authentication ===")
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@pigma.com", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            # Keep admin token separate, don't override user token
            self.log(f"✅ Admin token acquired")
            return True
        else:
            self.log(f"❌ Failed to get admin token")
            return False

    def test_user_registration_login(self):
        """Test user registration and login"""
        self.log("=== Testing User Authentication ===")
        
        # Generate unique user
        timestamp = int(time.time())
        test_email = f"testuser{timestamp}@pigma.com"
        test_password = "TestPass123!"
        
        # Test user registration
        success1, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "name": f"Test User {timestamp}",
                "email": test_email,
                "password": test_password,
                "phone": "+919876543210"
            }
        )
        
        if success1 and 'token' in response:
            self.token = response['token']  # Set user token for subsequent tests
            
        # Test user login
        success2, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": test_email, "password": test_password}
        )
        
        if success2 and 'token' in response:
            self.token = response['token']  # Update user token
        
        return success1 and success2

    def test_products_api(self):
        """Test product-related endpoints"""
        self.log("=== Testing Products API ===")
        
        # Get all products
        success1, products_response = self.run_test("Get All Products", "GET", "products", 200)
        
        # Get featured products
        success2, _ = self.run_test("Get Featured Products", "GET", "products/featured", 200)
        
        # Get new arrivals
        success3, _ = self.run_test("Get New Arrivals", "GET", "products/new-arrivals", 200)
        
        # Get categories
        success4, _ = self.run_test("Get Categories", "GET", "categories", 200)
        
        # Test product filtering
        success5, _ = self.run_test("Filter Products by Category", "GET", "products?category=Platform%20Boots", 200)
        success6, _ = self.run_test("Filter Limited Edition", "GET", "products?is_limited_edition=true", 200)
        success7, _ = self.run_test("Search Products", "GET", "products?search=boots", 200)
        
        # Test specific product if available
        product_id = None
        if success1 and products_response and len(products_response) > 0:
            product_id = products_response[0].get('product_id')
            if product_id:
                success8, _ = self.run_test(f"Get Product Details", "GET", f"products/{product_id}", 200)
                return success1 and success2 and success3 and success4 and success5 and success6 and success7 and success8
        
        return success1 and success2 and success3 and success4 and success5 and success6 and success7

    def test_cart_functionality(self):
        """Test cart operations"""
        self.log("=== Testing Cart Functionality ===")
        
        if not self.token:
            self.log("❌ No auth token for cart tests")
            return False
            
        # Get empty cart
        success1, cart_response = self.run_test("Get Cart", "GET", "cart", 200, auth_required=True)
        
        # Get products to add to cart
        success_prod, products = self.run_test("Get Products for Cart", "GET", "products?limit=1", 200)
        
        if not success_prod or not products or len(products) == 0:
            self.log("❌ No products available for cart testing")
            return success1
            
        product = products[0]
        product_id = product.get('product_id')
        sizes = product.get('sizes', ['36'])
        colors = product.get('colors', ['Black'])
        
        # Add item to cart
        cart_item = {
            "product_id": product_id,
            "quantity": 1,
            "size": sizes[0] if sizes else "36",
            "color": colors[0] if colors else "Black"
        }
        
        success2, _ = self.run_test("Add to Cart", "POST", "cart/add", 200, data=cart_item, auth_required=True)
        
        # Update cart item
        cart_item["quantity"] = 2
        success3, _ = self.run_test("Update Cart", "PUT", "cart/update", 200, data=cart_item, auth_required=True)
        
        # Remove from cart
        success4, _ = self.run_test("Remove from Cart", "DELETE", f"cart/item/{product_id}?size={cart_item['size']}&color={cart_item['color']}", 200, auth_required=True)
        
        return success1 and success2 and success3 and success4

    def test_wishlist_functionality(self):
        """Test wishlist operations"""
        self.log("=== Testing Wishlist Functionality ===")
        
        if not self.token:
            self.log("❌ No auth token for wishlist tests")
            return False
            
        # Get empty wishlist
        success1, _ = self.run_test("Get Wishlist", "GET", "wishlist", 200, auth_required=True)
        
        # Get products to add to wishlist
        success_prod, products = self.run_test("Get Products for Wishlist", "GET", "products?limit=1", 200)
        
        if not success_prod or not products or len(products) == 0:
            self.log("❌ No products available for wishlist testing")
            return success1
            
        product_id = products[0].get('product_id')
        
        # Add to wishlist
        success2, _ = self.run_test("Add to Wishlist", "POST", "wishlist/add", 200, 
                                  data={"product_id": product_id}, auth_required=True)
        
        # Remove from wishlist
        success3, _ = self.run_test("Remove from Wishlist", "DELETE", f"wishlist/{product_id}", 200, auth_required=True)
        
        return success1 and success2 and success3

    def test_orders_functionality(self):
        """Test order creation and retrieval"""
        self.log("=== Testing Orders Functionality ===")
        
        if not self.token:
            self.log("❌ No auth token for order tests")
            return False
            
        # Get user's orders
        success1, _ = self.run_test("Get Orders", "GET", "orders", 200, auth_required=True)
        
        # For order creation, we need items in cart first
        # Get products and add to cart
        success_prod, products = self.run_test("Get Products for Order", "GET", "products?limit=1", 200)
        
        if success_prod and products and len(products) > 0:
            product = products[0]
            product_id = product.get('product_id')
            sizes = product.get('sizes', ['36'])
            colors = product.get('colors', ['Black'])
            
            # Add item to cart
            cart_item = {
                "product_id": product_id,
                "quantity": 1,
                "size": sizes[0] if sizes else "36",
                "color": colors[0] if colors else "Black"
            }
            
            add_success, _ = self.run_test("Add Item for Order", "POST", "cart/add", 200, data=cart_item, auth_required=True)
            
            if add_success:
                # Create order
                order_data = {
                    "shipping_address": {
                        "name": "Test User",
                        "address": "123 Test Street",
                        "city": "Mumbai",
                        "state": "Maharashtra",
                        "pincode": "400001",
                        "phone": "+919876543210"
                    },
                    "payment_method": "razorpay"
                }
                
                success2, order_response = self.run_test("Create Order", "POST", "orders", 200, 
                                                       data=order_data, auth_required=True)
                
                # Test payment verification (mocked) - fix: use query parameters
                if success2 and 'order_id' in order_response:
                    order_id = order_response['order_id']
                    payment_endpoint = f"orders/{order_id}/payment/verify?razorpay_payment_id=pay_mock123&razorpay_signature=mock_signature"
                    success3, _ = self.run_test("Verify Payment", "POST", payment_endpoint, 200, auth_required=True)
                    return success1 and success2 and success3
        
        return success1

    def test_influencer_functionality(self):
        """Test influencer program"""
        self.log("=== Testing Influencer Functionality ===")
        
        if not self.token:
            self.log("❌ No auth token for influencer tests")
            return False
            
        # Apply as influencer
        influencer_data = {
            "bio": "Fashion influencer and style blogger",
            "instagram_handle": "test_influencer",
            "youtube_channel": "TestChannel",
            "followers_count": 50000,
            "niche": ["fashion", "lifestyle"]
        }
        
        success1, _ = self.run_test("Apply as Influencer", "POST", "influencers/apply", 200, 
                                  data=influencer_data, auth_required=True)
        
        # Get influencer profile
        success2, _ = self.run_test("Get My Influencer Profile", "GET", "influencers/me", 200, auth_required=True)
        
        # Get leaderboard
        success3, _ = self.run_test("Get Influencer Leaderboard", "GET", "influencers/leaderboard", 200)
        
        return success1 and success2 and success3

    def test_affiliate_functionality(self):
        """Test affiliate program"""
        self.log("=== Testing Affiliate Functionality ===")
        
        if not self.token:
            self.log("❌ No auth token for affiliate tests")
            return False
            
        # Apply as affiliate
        affiliate_data = {
            "company_name": "Test Fashion Company",
            "website": "https://testfashion.com",
            "marketing_channels": ["social_media", "blog", "email"]
        }
        
        success1, _ = self.run_test("Apply as Affiliate", "POST", "affiliates/apply", 200, 
                                  data=affiliate_data, auth_required=True)
        
        # Get affiliate profile
        success2, _ = self.run_test("Get My Affiliate Profile", "GET", "affiliates/me", 200, auth_required=True)
        
        return success1 and success2

    def test_admin_functionality(self):
        """Test admin dashboard and management"""
        self.log("=== Testing Admin Functionality ===")
        
        if not self.admin_token:
            self.log("❌ No admin token for admin tests")
            return False
            
        # Get admin dashboard
        success1, _ = self.run_test("Admin Dashboard", "GET", "admin/dashboard", 200, admin_required=True)
        
        # Get all orders (admin)
        success2, _ = self.run_test("Admin - Get Orders", "GET", "admin/orders", 200, admin_required=True)
        
        # Get customers (admin)
        success3, _ = self.run_test("Admin - Get Customers", "GET", "admin/customers", 200, admin_required=True)
        
        # Get influencers (admin)
        success4, _ = self.run_test("Admin - Get Influencers", "GET", "influencers", 200, admin_required=True)
        
        # Get affiliates (admin)
        success5, _ = self.run_test("Admin - Get Affiliates", "GET", "affiliates", 200, admin_required=True)
        
        return success1 and success2 and success3 and success4 and success5

    def test_chatbot(self):
        """Test AI chatbot functionality (mocked)"""
        self.log("=== Testing AI Chatbot ===")
        
        # Test chat without auth
        success1, response1 = self.run_test("Chatbot - General Query", "POST", "chat", 200, 
                                          data={"message": "Hello, what is your return policy?"})
        
        # Test chat with shipping query
        success2, response2 = self.run_test("Chatbot - Shipping Query", "POST", "chat", 200, 
                                          data={"message": "Tell me about shipping options"})
        
        # Test with session_id
        if success1 and 'session_id' in response1:
            session_id = response1['session_id']
            success3, _ = self.run_test("Chatbot - Follow-up", "POST", "chat", 200, 
                                      data={"message": "What about payment options?", "session_id": session_id})
            return success1 and success2 and success3
        
        return success1 and success2

    def test_otp_functionality(self):
        """Test OTP authentication (mocked)"""
        self.log("=== Testing OTP Authentication ===")
        
        test_phone = "+919999999999"
        
        # Send OTP
        success1, otp_response = self.run_test("Send OTP", "POST", "auth/otp/send", 200, 
                                             data={"phone": test_phone})
        
        if success1 and 'demo_otp' in otp_response:
            demo_otp = otp_response['demo_otp']
            
            # Verify OTP
            success2, _ = self.run_test("Verify OTP", "POST", "auth/otp/verify", 200, 
                                      data={"phone": test_phone, "otp": demo_otp})
            return success1 and success2
        
        return success1

    def run_comprehensive_tests(self):
        """Run all tests"""
        self.log("🚀 Starting Pigma API Comprehensive Testing")
        self.log(f"📍 Testing against: {self.base_url}")
        
        # Test results tracking
        test_groups = []
        
        # Health check
        result = self.test_health_check()
        test_groups.append(("Health Check", result))
        
        # Authentication
        admin_result = self.test_admin_login()
        test_groups.append(("Admin Authentication", admin_result))
        
        user_auth_result = self.test_user_registration_login()
        test_groups.append(("User Authentication", user_auth_result))
        
        # Store the admin token and check admin functionality right after admin login
        if admin_result:
            # Admin functionality test with immediate admin token
            admin_func_result = self.test_admin_functionality()
            test_groups.append(("Admin Functionality", admin_func_result))
        
        # OTP Authentication
        otp_result = self.test_otp_functionality()
        test_groups.append(("OTP Authentication", otp_result))
        
        # Products
        products_result = self.test_products_api()
        test_groups.append(("Products API", products_result))
        
        # Cart functionality
        cart_result = self.test_cart_functionality()
        test_groups.append(("Cart Functionality", cart_result))
        
        # Wishlist functionality
        wishlist_result = self.test_wishlist_functionality()
        test_groups.append(("Wishlist Functionality", wishlist_result))
        
        # Orders
        orders_result = self.test_orders_functionality()
        test_groups.append(("Orders Functionality", orders_result))
        
        # Influencer program
        influencer_result = self.test_influencer_functionality()
        test_groups.append(("Influencer Program", influencer_result))
        
        # Affiliate program
        affiliate_result = self.test_affiliate_functionality()
        test_groups.append(("Affiliate Program", affiliate_result))
        
        # Admin functionality
        if not admin_result:
            admin_func_result = self.test_admin_functionality()
            test_groups.append(("Admin Functionality", admin_func_result))
        
        # Chatbot
        chatbot_result = self.test_chatbot()
        test_groups.append(("AI Chatbot", chatbot_result))
        
        # Print results
        self.log("\n" + "="*60)
        self.log("🏁 TEST RESULTS SUMMARY")
        self.log("="*60)
        
        passed_groups = 0
        for group_name, result in test_groups:
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{group_name:<25} {status}")
            if result:
                passed_groups += 1
        
        self.log(f"\n📊 Overall Statistics:")
        self.log(f"   Tests Run: {self.tests_run}")
        self.log(f"   Tests Passed: {self.tests_passed}")
        self.log(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        self.log(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        self.log(f"   Test Groups Passed: {passed_groups}/{len(test_groups)}")
        
        if self.failed_tests:
            self.log(f"\n❌ Failed Tests Details:")
            for i, failed in enumerate(self.failed_tests, 1):
                self.log(f"   {i}. {failed['name']}")
                if 'expected' in failed:
                    self.log(f"      Expected: {failed['expected']}, Got: {failed['actual']}")
                if 'error' in failed:
                    self.log(f"      Error: {failed['error']}")
                self.log(f"      Endpoint: {failed['endpoint']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = PigmaAPITester()
    
    try:
        success = tester.run_comprehensive_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        tester.log("\n⏹️  Testing interrupted by user")
        return 1
    except Exception as e:
        tester.log(f"\n💥 Testing failed with error: {str(e)}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)