"""
Test Header Categories API - Tests for /api/categories endpoint
Used by the new header mega menu to fetch categories dynamically
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCategoriesAPI:
    """Test categories endpoint for header mega menu"""
    
    def test_get_categories_returns_200(self):
        """GET /api/categories should return 200"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/categories returns 200")
    
    def test_categories_returns_list(self):
        """GET /api/categories should return a list"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ Categories returns list with {len(data)} items")
    
    def test_categories_have_required_fields(self):
        """Each category should have required fields for mega menu"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No categories found to test")
        
        required_fields = ['category_id', 'name', 'is_active', 'show_in_nav', 'sub_categories']
        for cat in data:
            for field in required_fields:
                assert field in cat, f"Missing field '{field}' in category {cat.get('name', 'unknown')}"
        print(f"✓ All {len(data)} categories have required fields")
    
    def test_categories_have_sub_categories_array(self):
        """Each category should have sub_categories as array"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No categories found to test")
        
        for cat in data:
            assert isinstance(cat.get('sub_categories'), list), \
                f"sub_categories should be list for {cat.get('name')}"
        print("✓ All categories have sub_categories as array")
    
    def test_categories_show_in_nav_filter(self):
        """Categories with show_in_nav=true should be returned"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        
        # Count categories with show_in_nav=true
        nav_cats = [c for c in data if c.get('show_in_nav') == True]
        print(f"✓ Found {len(nav_cats)} categories with show_in_nav=true")
    
    def test_categories_only_active_returned(self):
        """Only active categories should be returned"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        
        for cat in data:
            assert cat.get('is_active') == True, \
                f"Inactive category {cat.get('name')} should not be returned"
        print(f"✓ All {len(data)} returned categories are active")
    
    def test_get_single_category(self):
        """GET /api/categories/{id} should return single category"""
        # First get all categories
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No categories found to test")
        
        # Get first category by ID
        cat_id = data[0]['category_id']
        single_response = requests.get(f"{BASE_URL}/api/categories/{cat_id}")
        assert single_response.status_code == 200
        single_cat = single_response.json()
        assert single_cat['category_id'] == cat_id
        print(f"✓ GET /api/categories/{cat_id} returns correct category")
    
    def test_get_nonexistent_category_returns_404(self):
        """GET /api/categories/{invalid_id} should return 404"""
        response = requests.get(f"{BASE_URL}/api/categories/nonexistent_cat_id_12345")
        assert response.status_code == 404
        print("✓ GET /api/categories/invalid_id returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
