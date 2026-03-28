"""
Test Categories & Policies CRUD APIs
Phase A: Category & Sub-category CRUD system
Phase C: Admin-editable Policy pages
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@pigma.com"
ADMIN_PASSWORD = "superadmin123"
CUSTOMER_EMAIL = "timelinetest@test.com"
CUSTOMER_PASSWORD = "Test123!"


class TestCategoriesPublicAPI:
    """Test public category endpoints"""
    
    def test_get_categories_returns_list(self):
        """GET /api/categories returns list of category objects"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If categories exist, verify structure
        if len(data) > 0:
            cat = data[0]
            assert "name" in cat, "Category should have 'name'"
            assert "slug" in cat, "Category should have 'slug'"
            assert "show_in_nav" in cat, "Category should have 'show_in_nav'"
            assert "sub_categories" in cat, "Category should have 'sub_categories' array"
            assert isinstance(cat["sub_categories"], list), "sub_categories should be a list"
            print(f"✓ Found {len(data)} categories, first: {cat['name']}")
        else:
            print("✓ Categories endpoint works (empty list)")
    
    def test_get_single_category(self):
        """GET /api/categories/{category_id} returns single category"""
        # First get all categories
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        categories = response.json()
        
        if len(categories) > 0:
            cat_id = categories[0].get("category_id")
            if cat_id:
                response = requests.get(f"{BASE_URL}/api/categories/{cat_id}")
                assert response.status_code == 200
                cat = response.json()
                assert cat["category_id"] == cat_id
                print(f"✓ Single category fetch works: {cat['name']}")
        else:
            print("✓ Skipped single category test (no categories)")


class TestCategoriesAdminAPI:
    """Test admin category CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_admin_get_all_categories(self):
        """GET /api/categories/admin/all returns all categories including inactive"""
        response = requests.get(f"{BASE_URL}/api/categories/admin/all", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Admin can fetch all categories: {len(data)} found")
    
    def test_create_category(self):
        """POST /api/categories/admin creates new category"""
        test_name = f"TEST_Category_{int(time.time())}"
        response = requests.post(f"{BASE_URL}/api/categories/admin", 
            json={"name": test_name, "description": "Test category"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        cat = response.json()
        assert cat["name"] == test_name
        assert "category_id" in cat
        assert "slug" in cat
        assert cat["show_in_nav"] == True  # Default
        print(f"✓ Created category: {cat['name']} (ID: {cat['category_id']})")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/categories/admin/{cat['category_id']}", headers=self.headers)
    
    def test_create_category_duplicate_fails(self):
        """POST /api/categories/admin fails for duplicate name"""
        test_name = f"TEST_DupCat_{int(time.time())}"
        
        # Create first
        response = requests.post(f"{BASE_URL}/api/categories/admin", 
            json={"name": test_name},
            headers=self.headers
        )
        assert response.status_code == 200
        cat_id = response.json()["category_id"]
        
        # Try duplicate
        response = requests.post(f"{BASE_URL}/api/categories/admin", 
            json={"name": test_name},
            headers=self.headers
        )
        assert response.status_code == 400, "Duplicate should fail with 400"
        print("✓ Duplicate category creation correctly rejected")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/categories/admin/{cat_id}", headers=self.headers)
    
    def test_update_category(self):
        """PUT /api/categories/admin/{catId} updates category"""
        # Create test category
        test_name = f"TEST_UpdateCat_{int(time.time())}"
        response = requests.post(f"{BASE_URL}/api/categories/admin", 
            json={"name": test_name},
            headers=self.headers
        )
        assert response.status_code == 200
        cat_id = response.json()["category_id"]
        
        # Update
        new_name = f"TEST_Updated_{int(time.time())}"
        response = requests.put(f"{BASE_URL}/api/categories/admin/{cat_id}", 
            json={"name": new_name, "show_in_nav": False},
            headers=self.headers
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        updated = response.json()
        assert updated["name"] == new_name
        assert updated["show_in_nav"] == False
        print(f"✓ Category updated: {new_name}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/categories/admin/{cat_id}", headers=self.headers)
    
    def test_delete_category(self):
        """DELETE /api/categories/admin/{catId} removes category"""
        # Create test category
        test_name = f"TEST_DeleteCat_{int(time.time())}"
        response = requests.post(f"{BASE_URL}/api/categories/admin", 
            json={"name": test_name},
            headers=self.headers
        )
        assert response.status_code == 200
        cat_id = response.json()["category_id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/categories/admin/{cat_id}", headers=self.headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify deleted
        response = requests.get(f"{BASE_URL}/api/categories/{cat_id}")
        assert response.status_code == 404, "Deleted category should return 404"
        print("✓ Category deleted successfully")
    
    def test_create_sub_category(self):
        """POST /api/categories/admin/{catId}/sub creates sub-category"""
        # Create parent category
        parent_name = f"TEST_ParentCat_{int(time.time())}"
        response = requests.post(f"{BASE_URL}/api/categories/admin", 
            json={"name": parent_name},
            headers=self.headers
        )
        assert response.status_code == 200
        cat_id = response.json()["category_id"]
        
        # Create sub-category
        sub_name = f"TEST_SubCat_{int(time.time())}"
        response = requests.post(f"{BASE_URL}/api/categories/admin/{cat_id}/sub", 
            json={"name": sub_name, "description": "Test sub-category"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Sub-category creation failed: {response.text}"
        
        sub = response.json()
        assert sub["name"] == sub_name
        assert sub["category_id"] == cat_id
        assert "sub_category_id" in sub
        print(f"✓ Sub-category created: {sub_name} under {parent_name}")
        
        # Verify sub-category appears in parent
        response = requests.get(f"{BASE_URL}/api/categories/{cat_id}")
        assert response.status_code == 200
        parent = response.json()
        assert len(parent["sub_categories"]) > 0
        assert any(s["name"] == sub_name for s in parent["sub_categories"])
        print("✓ Sub-category appears in parent's sub_categories array")
        
        # Cleanup - delete parent (should cascade to sub)
        requests.delete(f"{BASE_URL}/api/categories/admin/{cat_id}", headers=self.headers)


class TestCategoriesAdminAuth:
    """Test that admin endpoints require authentication"""
    
    def test_admin_endpoints_require_auth(self):
        """Admin category endpoints should require authentication"""
        # No auth header
        response = requests.get(f"{BASE_URL}/api/categories/admin/all")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        response = requests.post(f"{BASE_URL}/api/categories/admin", json={"name": "Test"})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Admin endpoints correctly require authentication")
    
    def test_customer_cannot_access_admin_endpoints(self):
        """Customer should not access admin category endpoints"""
        # Login as customer
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer account not available")
        
        token = response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/categories/admin", 
            json={"name": "Test"},
            headers=headers
        )
        assert response.status_code in [401, 403], f"Customer should not create categories"
        print("✓ Customer correctly denied access to admin endpoints")


class TestPoliciesPublicAPI:
    """Test public policy endpoints"""
    
    def test_get_all_policies(self):
        """GET /api/policies returns published policies"""
        response = requests.get(f"{BASE_URL}/api/policies")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            policy = data[0]
            assert "title" in policy, "Policy should have 'title'"
            assert "slug" in policy, "Policy should have 'slug'"
            assert "content" in policy, "Policy should have 'content'"
            print(f"✓ Found {len(data)} policies, first: {policy['title']}")
        else:
            print("✓ Policies endpoint works (empty list)")
    
    def test_get_policy_by_slug(self):
        """GET /api/policies/{slug} returns single policy"""
        # First get all policies
        response = requests.get(f"{BASE_URL}/api/policies")
        assert response.status_code == 200
        policies = response.json()
        
        if len(policies) > 0:
            slug = policies[0].get("slug")
            response = requests.get(f"{BASE_URL}/api/policies/{slug}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            policy = response.json()
            assert policy["slug"] == slug
            print(f"✓ Single policy fetch works: {policy['title']}")
        else:
            print("✓ Skipped single policy test (no policies)")
    
    def test_nonexistent_policy_returns_404(self):
        """GET /api/policies/{slug} returns 404 for nonexistent"""
        response = requests.get(f"{BASE_URL}/api/policies/nonexistent-policy-xyz")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Nonexistent policy correctly returns 404")


class TestPoliciesAdminAPI:
    """Test admin policy CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_admin_get_all_policies(self):
        """GET /api/policies/admin/all returns all policies including unpublished"""
        response = requests.get(f"{BASE_URL}/api/policies/admin/all", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Admin can fetch all policies: {len(data)} found")
    
    def test_create_policy(self):
        """POST /api/policies/admin creates new policy"""
        test_title = f"TEST Policy {int(time.time())}"
        test_slug = f"test-policy-{int(time.time())}"
        
        response = requests.post(f"{BASE_URL}/api/policies/admin", 
            json={
                "title": test_title,
                "slug": test_slug,
                "content": "## Test Content\n\nThis is test policy content.",
                "is_published": True
            },
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        policy = response.json()
        assert policy["title"] == test_title
        assert policy["slug"] == test_slug
        assert "policy_id" in policy
        assert policy["is_published"] == True
        print(f"✓ Created policy: {policy['title']} (ID: {policy['policy_id']})")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/policies/admin/{policy['policy_id']}", headers=self.headers)
    
    def test_update_policy(self):
        """PUT /api/policies/admin/{policyId} updates policy content"""
        # Create test policy
        test_title = f"TEST UpdatePolicy {int(time.time())}"
        response = requests.post(f"{BASE_URL}/api/policies/admin", 
            json={"title": test_title, "content": "Original content"},
            headers=self.headers
        )
        assert response.status_code == 200
        policy_id = response.json()["policy_id"]
        
        # Update
        new_content = "## Updated Content\n\nThis content was updated."
        response = requests.put(f"{BASE_URL}/api/policies/admin/{policy_id}", 
            json={"content": new_content, "is_published": False},
            headers=self.headers
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        updated = response.json()
        assert updated["content"] == new_content
        assert updated["is_published"] == False
        print(f"✓ Policy updated successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/policies/admin/{policy_id}", headers=self.headers)
    
    def test_delete_policy(self):
        """DELETE /api/policies/admin/{policyId} removes policy"""
        # Create test policy
        test_title = f"TEST DeletePolicy {int(time.time())}"
        response = requests.post(f"{BASE_URL}/api/policies/admin", 
            json={"title": test_title, "content": "To be deleted"},
            headers=self.headers
        )
        assert response.status_code == 200
        policy_id = response.json()["policy_id"]
        slug = response.json()["slug"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/policies/admin/{policy_id}", headers=self.headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify deleted
        response = requests.get(f"{BASE_URL}/api/policies/{slug}")
        assert response.status_code == 404, "Deleted policy should return 404"
        print("✓ Policy deleted successfully")
    
    def test_unpublished_policy_not_visible_publicly(self):
        """Unpublished policies should not appear in public API"""
        # Create unpublished policy
        test_title = f"TEST UnpubPolicy {int(time.time())}"
        test_slug = f"test-unpub-{int(time.time())}"
        
        response = requests.post(f"{BASE_URL}/api/policies/admin", 
            json={"title": test_title, "slug": test_slug, "content": "Hidden", "is_published": False},
            headers=self.headers
        )
        assert response.status_code == 200
        policy_id = response.json()["policy_id"]
        
        # Try to access publicly
        response = requests.get(f"{BASE_URL}/api/policies/{test_slug}")
        assert response.status_code == 404, "Unpublished policy should not be accessible"
        print("✓ Unpublished policy correctly hidden from public")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/policies/admin/{policy_id}", headers=self.headers)


class TestPoliciesAdminAuth:
    """Test that admin policy endpoints require authentication"""
    
    def test_admin_endpoints_require_auth(self):
        """Admin policy endpoints should require authentication"""
        response = requests.get(f"{BASE_URL}/api/policies/admin/all")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        response = requests.post(f"{BASE_URL}/api/policies/admin", json={"title": "Test"})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Admin policy endpoints correctly require authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
