import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Pencil, Package, Tag, Search, Filter,
  Save, X, ChevronDown, ChevronRight, Eye, EyeOff, ExternalLink, Upload
} from "lucide-react";
import { BulkUpload } from "@/components/BulkUpload";
import { normalizeImageUrl, handleImageError, FALLBACK_IMAGE } from "@/utils/imageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { API } from "@/App";
import { toast } from "sonner";
import axios from "axios";
import { MediaUploader } from "@/components/MediaUploader";

const getAdminHeaders = () => {
  const token = localStorage.getItem("pigma_admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const hasPermission = (resource, action) => {
  try {
    const admin = JSON.parse(localStorage.getItem("pigma_admin") || "null");
    if (!admin?.permissions) return false;
    const perms = admin.permissions[resource] || [];
    return perms.includes(action);
  } catch { return false; }
};

// ==================== MAIN HUB ====================
export const AdminProductsHub = () => {
  const [activeTab, setActiveTab] = useState("products");
  const [editingProduct, setEditingProduct] = useState(null);

  const tabs = [
    { key: "products", label: "All Products", icon: Package },
    { key: "add", label: "Add Product", icon: Plus },
    { key: "bulk", label: "Bulk Upload", icon: Upload },
    { key: "categories", label: "Categories", icon: Tag },
  ];

  return (
    <div className="space-y-6" data-testid="admin-products-hub">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-neutral-800/50 border border-neutral-700 rounded-xl p-1.5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setEditingProduct(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? "bg-gold text-black shadow-md"
                : "text-neutral-400 hover:text-white hover:bg-neutral-700"
            }`}
            data-testid={`tab-${t.key}`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "products" && (
          <motion.div key="products" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ProductsTable
              onEdit={(p) => { setEditingProduct(p); setActiveTab("edit"); }}
              onAddInCategory={(catName) => { setActiveTab("add"); }}
            />
          </motion.div>
        )}
        {activeTab === "add" && (
          <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ProductForm onDone={() => setActiveTab("products")} />
          </motion.div>
        )}
        {activeTab === "edit" && editingProduct && (
          <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ProductForm product={editingProduct} onDone={() => { setEditingProduct(null); setActiveTab("products"); }} />
          </motion.div>
        )}
        {activeTab === "bulk" && (
          <motion.div key="bulk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BulkUpload mode="admin" />
          </motion.div>
        )}
        {activeTab === "categories" && (
          <motion.div key="categories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CategoriesManager
              onViewProducts={(catName) => { setActiveTab("products"); }}
              onAddProduct={(catName) => { setActiveTab("add"); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==================== PRODUCTS TABLE ====================
const ProductsTable = ({ onEdit, onAddInCategory }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const canEdit = hasPermission("products", "edit");
  const canDelete = hasPermission("products", "delete");

  const fetchData = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        axios.get(`${API}/products?limit=200`),
        axios.get(`${API}/categories`)
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data || []);
    } catch { toast.error("Failed to load products"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const deleteProduct = async (productId) => {
    if (!window.confirm("Delete this product permanently?")) return;
    try {
      await axios.delete(`${API}/products/${productId}`, { headers: getAdminHeaders() });
      toast.success("Product deleted");
      setProducts(prev => prev.filter(p => p.product_id !== productId));
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to delete"); }
  };

  const filtered = products.filter(p => {
    const matchSearch = !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = filterCategory === "all" || p.category === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-serif text-xl font-bold text-white">All Products</h2>
        <Badge variant="outline" className="border-neutral-600 text-neutral-300">
          {filtered.length} of {products.length}
        </Badge>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search products..."
            className="pl-10 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
            data-testid="product-search"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px] bg-neutral-800 border-neutral-700 text-white" data-testid="product-filter-category">
            <Filter className="h-3.5 w-3.5 mr-2 text-neutral-400" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.category_id || c} value={c.name || c}>{c.name || c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700 hover:bg-transparent">
              <TableHead className="text-neutral-400 font-semibold">Product</TableHead>
              <TableHead className="text-neutral-400 font-semibold">Category</TableHead>
              <TableHead className="text-neutral-400 font-semibold">Price</TableHead>
              <TableHead className="text-neutral-400 font-semibold">Stock</TableHead>
              <TableHead className="text-neutral-400 font-semibold">Tags</TableHead>
              <TableHead className="text-neutral-400 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.product_id} className="border-neutral-700 hover:bg-neutral-700/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    {p.images?.[0] && (
                      <img src={normalizeImageUrl(p.images[0])} alt="" className="w-10 h-10 rounded object-cover border border-neutral-700" onError={handleImageError} />
                    )}
                    <div>
                      <p className="font-semibold text-sm text-white">{p.name}</p>
                      {p.sub_category && <p className="text-[10px] text-neutral-500">{p.sub_category}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-neutral-600 text-neutral-300 text-xs">{p.category || "—"}</Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <span className="text-gold font-semibold">Rs.{p.price?.toLocaleString()}</span>
                    {p.compare_price && (
                      <span className="text-xs text-neutral-500 line-through ml-1.5">Rs.{p.compare_price?.toLocaleString()}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`font-medium ${p.stock < 10 ? "text-red-400" : p.stock < 30 ? "text-amber-400" : "text-green-400"}`}>
                    {p.stock}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {p.is_limited_edition && <Badge className="text-[9px] bg-gold/20 text-gold border-0">Limited</Badge>}
                    {p.tags?.slice(0, 2).map(t => (
                      <Badge key={t} variant="outline" className="text-[9px] border-neutral-600 text-neutral-400">{t}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    {canEdit && (
                      <Button size="sm" variant="ghost" className="h-8 px-2.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        onClick={() => onEdit(p)} data-testid={`edit-prod-${p.product_id}`}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={() => deleteProduct(p.product_id)} data-testid={`delete-prod-${p.product_id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-neutral-500">No products found.</div>
        )}
      </div>
    </div>
  );
};

// ==================== PRODUCT FORM (ADD / EDIT) ====================
const ProductForm = ({ product, onDone }) => {
  const isEditing = !!product;
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price ? String(product.price) : "",
    compare_price: product?.compare_price ? String(product.compare_price) : "",
    category: product?.category || "",
    sub_category: product?.sub_category || "",
    sizes: product?.sizes?.join(", ") || "",
    colors: product?.colors?.join(", ") || "",
    stock: product?.stock ? String(product.stock) : "",
    is_limited_edition: product?.is_limited_edition || false,
    tags: product?.tags?.join(", ") || "",
  });
  const [media, setMedia] = useState(
    product ? [
      ...(product.images || []).map(url => ({ url: normalizeImageUrl(url), type: "image" })),
      ...(product.videos || []).map(url => ({ url, type: "video" }))
    ] : []
  );

  useEffect(() => {
    axios.get(`${API}/categories`).then(r => {
      setCategories(r.data || []);
      if (form.category) {
        const cat = (r.data || []).find(c => c.name === form.category);
        setSubCategories(cat?.sub_categories || []);
      }
    }).catch(() => {});
  }, []);

  const handleCategoryChange = (val) => {
    setForm(f => ({ ...f, category: val, sub_category: "" }));
    const cat = categories.find(c => c.name === val);
    setSubCategories(cat?.sub_categories || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) { toast.error("Name and price are required"); return; }
    setSubmitting(true);

    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
      category: form.category,
      sub_category: form.sub_category,
      sizes: form.sizes ? form.sizes.split(",").map(s => s.trim()).filter(Boolean) : [],
      colors: form.colors ? form.colors.split(",").map(s => s.trim()).filter(Boolean) : [],
      stock: parseInt(form.stock) || 0,
      images: media.filter(m => m.type !== "video").map(m => m.url),
      videos: media.filter(m => m.type === "video").map(m => m.url),
      is_limited_edition: form.is_limited_edition,
      tags: form.tags ? form.tags.split(",").map(s => s.trim()).filter(Boolean) : [],
    };

    try {
      if (isEditing) {
        await axios.put(`${API}/admin/products/${product.product_id}`, payload, { headers: getAdminHeaders() });
        toast.success("Product updated!");
      } else {
        await axios.post(`${API}/admin/products`, payload, { headers: getAdminHeaders() });
        toast.success("Product created!");
      }
      onDone();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to save"); }
    finally { setSubmitting(false); }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid={isEditing ? "edit-product-form" : "add-product-form"}>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-white">
          {isEditing ? `Edit: ${product.name}` : "Add New Product"}
        </h2>
        <Button type="button" variant="ghost" className="text-neutral-400 hover:text-white" onClick={onDone}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
      </div>

      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-5">
        {/* Row 1: Name + Category + Sub-category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Product Name *</label>
            <Input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Midnight Platform Boots"
              className="bg-neutral-900 border-neutral-600 text-white placeholder:text-neutral-500"
              data-testid="prod-name" />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Category *</label>
            <Select value={form.category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="bg-neutral-900 border-neutral-600 text-white" data-testid="prod-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.category_id || c.name} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Sub-Category</label>
            <Select value={form.sub_category} onValueChange={v => set("sub_category", v)} disabled={!subCategories.length}>
              <SelectTrigger className="bg-neutral-900 border-neutral-600 text-white" data-testid="prod-sub-category">
                <SelectValue placeholder={subCategories.length ? "Select sub-category" : "No sub-categories"} />
              </SelectTrigger>
              <SelectContent>
                {subCategories.map(s => <SelectItem key={s.sub_category_id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Price + Compare + Stock */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Price (Rs.) *</label>
            <Input type="number" value={form.price} onChange={e => set("price", e.target.value)}
              placeholder="8999" className="bg-neutral-900 border-neutral-600 text-white" data-testid="prod-price" />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">MRP / Compare Price</label>
            <Input type="number" value={form.compare_price} onChange={e => set("compare_price", e.target.value)}
              placeholder="12999" className="bg-neutral-900 border-neutral-600 text-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Stock *</label>
            <Input type="number" value={form.stock} onChange={e => set("stock", e.target.value)}
              placeholder="50" className="bg-neutral-900 border-neutral-600 text-white" data-testid="prod-stock" />
          </div>
        </div>

        {/* Row 3: Sizes + Colors + Tags */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Sizes (comma-separated)</label>
            <Input value={form.sizes} onChange={e => set("sizes", e.target.value)}
              placeholder="6, 7, 8, 9, 10" className="bg-neutral-900 border-neutral-600 text-white" data-testid="prod-sizes" />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Colors (comma-separated)</label>
            <Input value={form.colors} onChange={e => set("colors", e.target.value)}
              placeholder="Black, Gold, Silver" className="bg-neutral-900 border-neutral-600 text-white" data-testid="prod-colors" />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Tags (comma-separated)</label>
            <Input value={form.tags} onChange={e => set("tags", e.target.value)}
              placeholder="new arrival, trending, bestseller" className="bg-neutral-900 border-neutral-600 text-white" data-testid="prod-tags" />
          </div>
        </div>

        {/* Media Upload */}
        <div>
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
            Product Images & Videos (drag to reorder)
          </label>
          <MediaUploader value={media} onChange={setMedia} maxFiles={8} userId="admin" />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">Description</label>
          <textarea
            value={form.description} onChange={e => set("description", e.target.value)}
            placeholder="Product description. Use bullet points with - for product details like:&#10;- Heel height: 4 inches&#10;- Material: Premium leather&#10;- Usage: Party, casual, festive"
            rows={4}
            className="w-full bg-neutral-900 border border-neutral-600 text-white rounded-lg px-3 py-2.5 text-sm resize-y placeholder:text-neutral-500 focus:outline-none focus:border-gold"
            data-testid="prod-description"
          />
        </div>

        {/* Limited Edition Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox" checked={form.is_limited_edition}
            onChange={e => set("is_limited_edition", e.target.checked)}
            id="limited-ed" className="accent-gold w-4 h-4"
          />
          <label htmlFor="limited-ed" className="text-sm text-neutral-300 font-medium">Limited Edition</label>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" className="bg-gold text-black font-bold hover:bg-yellow-400 px-8" disabled={submitting} data-testid="save-product-btn">
          <Save className="h-4 w-4 mr-2" /> {submitting ? "Saving..." : isEditing ? "Update Product" : "Create Product"}
        </Button>
        <Button type="button" variant="outline" className="border-neutral-600 text-neutral-300 hover:text-white" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

// ==================== CATEGORIES MANAGER ====================
const CategoriesManager = ({ onViewProducts, onAddProduct }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [addingSubTo, setAddingSubTo] = useState(null);
  const headers = getAdminHeaders();

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/categories/admin/all`, { headers });
      setCategories(res.data || []);
    } catch { toast.error("Failed to load categories"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await axios.post(`${API}/categories/admin`, { name: newCatName, description: newCatDesc }, { headers });
      toast.success("Category created");
      setNewCatName(""); setNewCatDesc("");
      fetchCategories();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to create"); }
  };

  const handleUpdateCategory = async (catId, data) => {
    try {
      await axios.put(`${API}/categories/admin/${catId}`, data, { headers });
      toast.success("Updated");
      setEditingCat(null);
      fetchCategories();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm("Delete this category and all sub-categories?")) return;
    try {
      await axios.delete(`${API}/categories/admin/${catId}`, { headers });
      toast.success("Deleted");
      fetchCategories();
    } catch { toast.error("Failed"); }
  };

  const handleCreateSub = async (catId) => {
    if (!newSubName.trim()) return;
    try {
      await axios.post(`${API}/categories/admin/${catId}/sub`, { name: newSubName }, { headers });
      toast.success("Sub-category created");
      setNewSubName(""); setAddingSubTo(null);
      fetchCategories();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleDeleteSub = async (subId) => {
    if (!window.confirm("Delete?")) return;
    try {
      await axios.delete(`${API}/categories/admin/sub/${subId}`, { headers });
      toast.success("Deleted");
      fetchCategories();
    } catch { toast.error("Failed"); }
  };

  if (loading) return <div className="py-12 text-center text-neutral-400">Loading categories...</div>;

  return (
    <div className="space-y-6" data-testid="categories-manager">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-white">Categories & Sub-Categories</h2>
        <Badge variant="outline" className="border-neutral-600 text-neutral-300">{categories.length} total</Badge>
      </div>

      {/* Add Category */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Add New Category</p>
        <div className="flex gap-3">
          <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category name"
            className="flex-1 bg-neutral-900 border-neutral-600 text-white placeholder:text-neutral-500" data-testid="new-category-name" />
          <Input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} placeholder="Description (optional)"
            className="flex-1 bg-neutral-900 border-neutral-600 text-white placeholder:text-neutral-500" />
          <Button onClick={handleCreateCategory} className="bg-gold text-black font-bold hover:bg-yellow-400 px-6" data-testid="create-category-btn">
            <Plus className="h-4 w-4 mr-1.5" /> Add
          </Button>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-2">
        {categories.map((cat, idx) => (
          <div key={cat.category_id} className="border border-neutral-700 rounded-xl overflow-hidden" data-testid={`cat-row-${cat.category_id}`}>
            <div
              className="flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-neutral-700/50 transition-colors"
              style={{ backgroundColor: idx % 2 === 0 ? "#262626" : "#1f1f1f" }}
              onClick={() => setExpandedCat(expandedCat === cat.category_id ? null : cat.category_id)}
            >
              <div className="flex-shrink-0">
                {expandedCat === cat.category_id
                  ? <ChevronDown className="h-4 w-4 text-gold" />
                  : <ChevronRight className="h-4 w-4 text-neutral-400" />}
              </div>

              <div className="flex-1 min-w-0">
                {editingCat === cat.category_id ? (
                  <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
                    <Input id="edit-cat-name" defaultValue={cat.name} className="h-8 text-sm bg-neutral-900 border-neutral-600 text-white" autoFocus />
                    <Input id="edit-cat-desc" defaultValue={cat.description} placeholder="Description" className="h-8 text-sm bg-neutral-900 border-neutral-600 text-white placeholder:text-neutral-500" />
                    <Button size="sm" className="h-8 bg-green-600 text-white font-bold" onClick={() => {
                      const name = document.getElementById("edit-cat-name").value;
                      const desc = document.getElementById("edit-cat-desc").value;
                      handleUpdateCategory(cat.category_id, { name, description: desc });
                    }}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-neutral-400" onClick={() => setEditingCat(null)}>Cancel</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-sm text-white">{cat.name}</span>
                    {cat.description && <span className="text-xs text-neutral-400 truncate max-w-[250px]">{cat.description}</span>}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className="text-[10px] font-semibold bg-neutral-700 text-neutral-200 border-0">{cat.product_count || 0} products</Badge>
                {cat.sub_categories?.length > 0 && (
                  <Badge className="text-[10px] font-semibold bg-blue-900/50 text-blue-300 border-0">{cat.sub_categories.length} subs</Badge>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600"
                  onClick={() => handleUpdateCategory(cat.category_id, { show_in_nav: !cat.show_in_nav })}
                  title={cat.show_in_nav ? "Visible in nav" : "Hidden from nav"}>
                  {cat.show_in_nav ? <Eye className="h-4 w-4 text-green-400" /> : <EyeOff className="h-4 w-4 text-neutral-500" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600" onClick={() => setEditingCat(cat.category_id)}>
                  <Pencil className="h-4 w-4 text-neutral-300" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-900/40" onClick={() => handleDeleteCategory(cat.category_id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>

            <AnimatePresence>
              {expandedCat === cat.category_id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="bg-neutral-900 border-t border-neutral-700 p-4 pl-12 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Sub-Categories</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-400 hover:text-blue-300"
                          onClick={() => onViewProducts(cat.name)}>
                          <ExternalLink className="h-3 w-3 mr-1" /> View Products
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-green-400 hover:text-green-300"
                          onClick={() => onAddProduct(cat.name)}>
                          <Plus className="h-3 w-3 mr-1" /> Add Product
                        </Button>
                      </div>
                    </div>

                    {cat.sub_categories?.length === 0 && !addingSubTo && (
                      <p className="text-xs text-neutral-500 italic py-2">No sub-categories yet</p>
                    )}

                    {cat.sub_categories?.map(sub => (
                      <div key={sub.sub_category_id} className="flex items-center gap-3 py-2.5 px-4 bg-neutral-800 rounded-lg border border-neutral-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                        <span className="text-sm font-medium text-neutral-200 flex-1">{sub.name}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-900/40" onClick={() => handleDeleteSub(sub.sub_category_id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    ))}

                    {addingSubTo === cat.category_id ? (
                      <div className="flex gap-2 mt-2">
                        <Input value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Sub-category name"
                          className="flex-1 h-9 text-sm bg-neutral-800 border-neutral-600 text-white placeholder:text-neutral-500" autoFocus data-testid="new-sub-name" />
                        <Button onClick={() => handleCreateSub(cat.category_id)} size="sm" className="h-9 bg-gold text-black font-bold">Add</Button>
                        <Button onClick={() => { setAddingSubTo(null); setNewSubName(""); }} size="sm" variant="ghost" className="h-9 text-neutral-400">Cancel</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm"
                        className="text-xs mt-1 border-dashed border-neutral-600 text-neutral-300 hover:text-gold hover:border-gold bg-transparent"
                        onClick={e => { e.stopPropagation(); setAddingSubTo(cat.category_id); }} data-testid={`add-sub-btn-${cat.category_id}`}>
                        <Plus className="h-3 w-3 mr-1" /> Add Sub-Category
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};
