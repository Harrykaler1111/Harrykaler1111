import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Grid, List, SlidersHorizontal, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ProductCard } from "@/components/ProductCard";
import axios from "axios";
import { API } from "@/App";

export const ProductsPage = () => {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedCategory, setSelectedCategory] = useState(category || searchParams.get("category") || "");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [isLimited, setIsLimited] = useState(searchParams.get("limited") === "true");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API}/categories`);
        setCategories((response.data || []).map(c => c.name || c));
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Sync URL params to state
  useEffect(() => {
    const urlCat = searchParams.get("category");
    if (urlCat && urlCat !== selectedCategory) {
      setSelectedCategory(urlCat);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category) params.append("category", category);
        if (selectedCategory && !category) params.append("category", selectedCategory);
        if (searchQuery) params.append("search", searchQuery);
        if (isLimited) params.append("is_limited_edition", "true");
        if (priceRange.min) params.append("min_price", priceRange.min);
        if (priceRange.max) params.append("max_price", priceRange.max);
        params.append("sort_by", sortBy);
        params.append("sort_order", sortOrder);
        params.append("limit", "50");

        const response = await axios.get(`${API}/products?${params.toString()}`);
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [category, selectedCategory, searchQuery, sortBy, sortOrder, isLimited, priceRange]);

  const clearFilters = () => {
    setSelectedCategory("");
    setSearchQuery("");
    setIsLimited(false);
    setPriceRange({ min: "", max: "" });
    setSortBy("created_at");
    setSortOrder("desc");
    navigate("/products");
  };

  const activeFiltersCount = [
    selectedCategory,
    searchQuery,
    isLimited,
    priceRange.min,
    priceRange.max
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen pt-24 md:pt-[100px]" data-testid="products-page">
      {/* Header */}
      <div className="bg-black text-white py-6 md:py-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold mb-2">
              {isLimited ? "Exclusive Collection" : "Shop"}
            </p>
            <h1 className="font-serif text-2xl md:text-4xl font-bold">
              {category || (isLimited ? "Limited Drops" : "All Products")}
            </h1>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center mb-6 pb-6 border-b">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="pl-10 border-neutral-300 focus:border-black"
              data-testid="search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-neutral-400 hover:text-black" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto justify-between md:justify-end">
            {/* Mobile Filters */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden" data-testid="mobile-filters-btn">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="ml-2 bg-black text-white text-xs px-2 py-0.5 rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select value={selectedCategory || "all"} onValueChange={(val) => setSelectedCategory(val === "all" ? "" : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Price Range</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="limited-mobile"
                      checked={isLimited}
                      onChange={(e) => setIsLimited(e.target.checked)}
                      className="rounded border-neutral-300"
                    />
                    <label htmlFor="limited-mobile" className="text-sm">Limited Edition Only</label>
                  </div>
                  <Button onClick={clearFilters} variant="outline" className="w-full">
                    Clear Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-3">
              <Select value={selectedCategory || "all"} onValueChange={(val) => setSelectedCategory(val === "all" ? "" : val)}>
                <SelectTrigger className="w-40" data-testid="category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={isLimited ? "default" : "outline"}
                onClick={() => setIsLimited(!isLimited)}
                className={isLimited ? "bg-gold text-black hover:bg-gold-dark" : ""}
                data-testid="limited-filter"
              >
                Limited Edition
              </Button>

              {activeFiltersCount > 0 && (
                <Button variant="ghost" onClick={clearFilters} className="text-neutral-500">
                  Clear All
                </Button>
              )}
            </div>

            {/* Sort */}
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [by, order] = value.split("-");
                setSortBy(by);
                setSortOrder(order);
              }}
            >
              <SelectTrigger className="w-40" data-testid="sort-select">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="name-asc">Name: A-Z</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="hidden md:flex border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-neutral-100" : ""}
                data-testid="grid-view-btn"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-neutral-100" : ""}
                data-testid="list-view-btn"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-neutral-500 mb-4">
          {products.length} product{products.length !== 1 ? "s" : ""} found
        </p>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[4/5] bg-neutral-100 rounded-lg animate-pulse" />
                <div className="h-3 bg-neutral-100 rounded animate-pulse" />
                <div className="h-3 bg-neutral-100 rounded w-2/3 animate-pulse" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"
                : "space-y-4"
            }
          >
            {products.map((product, index) => (
              <motion.div
                key={product.product_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <h3 className="font-serif text-2xl font-bold mb-4">No products found</h3>
            <p className="text-neutral-500 mb-6">Try adjusting your filters or search query</p>
            <Button onClick={clearFilters} className="bg-black text-white hover:bg-neutral-800">
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
