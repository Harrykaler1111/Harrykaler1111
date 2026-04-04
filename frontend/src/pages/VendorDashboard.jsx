import { useState, useEffect, useCallback } from "react";
import { useNavigate, Routes, Route, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  LayoutDashboard, Package, ShoppingCart, Wallet, FileText, Tag, Users,
  LogOut, Plus, Trash2, Eye, ArrowUpRight, ArrowDownRight, Store,
  Upload, CheckCircle, XCircle, Clock, AlertCircle, AlertTriangle, IndianRupee,
  Megaphone, FolderOpen, Zap, Key, DollarSign, Check, Copy, LifeBuoy, Send, ArrowLeft,
  BarChart3, TrendingUp
} from "lucide-react";
import { MediaUploader } from "@/components/MediaUploader";
import { BulkUpload } from "@/components/BulkUpload";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getVendorHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("pigma_vendor_token")}`,
  "Content-Type": "application/json"
});

export const VendorDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("pigma_vendor_token");
    if (!token) { navigate("/vendor-login"); return; }
    const fetchVendor = async () => {
      try {
        const res = await axios.get(`${API}/vendors/me`, { headers: getVendorHeaders() });
        setVendor(res.data);
      } catch {
        localStorage.removeItem("pigma_vendor_token");
        localStorage.removeItem("pigma_vendor");
        navigate("/vendor-login");
      } finally { setLoading(false); }
    };
    fetchVendor();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("pigma_vendor_token");
    localStorage.removeItem("pigma_vendor");
    navigate("/");
  };

  if (loading) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold" /></div>;
  if (!vendor) return null;

  const navItems = [
    { path: "/vendor", icon: LayoutDashboard, label: "Overview" },
    { path: "/vendor/products", icon: Package, label: "Products" },
    { path: "/vendor/categories", icon: FolderOpen, label: "Categories" },
    { path: "/vendor/orders", icon: ShoppingCart, label: "Orders" },
    { path: "/vendor/wallet", icon: Wallet, label: "Wallet" },
    { path: "/vendor/offers", icon: Tag, label: "Offers" },
    { path: "/vendor/promotions", icon: Megaphone, label: "Promotions" },
    { path: "/vendor/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/vendor/influencers", icon: Users, label: "Influencers" },
    { path: "/vendor/support", icon: LifeBuoy, label: "Support" },
    { path: "/vendor/returns", icon: Package, label: "Returns" },
  ];

  if (vendor.kyc_status !== "approved") {
    navItems.splice(1, 0, { path: "/vendor/kyc", icon: FileText, label: "KYC" });
  }

  const isActive = (path) => location.pathname === path;
  const statusColor = { pending: "text-yellow-400", kyc_submitted: "text-blue-400", approved: "text-green-400", rejected: "text-red-400", suspended: "text-red-500" };

  return (
    <div className="min-h-screen bg-neutral-900 text-white" data-testid="vendor-dashboard">
      <div className="flex">
        <aside className="hidden md:flex flex-col w-64 min-h-screen bg-neutral-950 border-r border-neutral-800 p-4 fixed left-0 top-0 overflow-y-auto max-h-screen">
          <div className="mb-4 pb-3 border-b border-neutral-800">
            <h1 className="font-serif text-xl font-bold text-gold tracking-wider">PIGMA</h1>
            <p className="text-xs text-neutral-500">Vendor Portal</p>
          </div>
          <div className="mb-4 pb-3 border-b border-neutral-800">
            <p className="text-sm font-medium text-white truncate">{vendor.store_name}</p>
            <p className={`text-xs capitalize ${statusColor[vendor.status] || "text-neutral-400"}`}>{vendor.status.replace("_", " ")}</p>
          </div>
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive(item.path) ? "bg-gold/10 text-gold" : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"}`}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-neutral-400 hover:text-red-400 mt-auto" data-testid="vendor-logout-btn">
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </aside>

        <main className="flex-1 md:ml-64 p-6">
          {/* Status warning for suspended/disconnected vendors */}
          {vendor && ["suspended", "disconnected", "discontinued"].includes(vendor.status) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center gap-3" data-testid="vendor-status-warning">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-300">Account {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}</p>
                <p className="text-sm text-neutral-400">Your vendor account has been {vendor.status} by admin. Some features may be restricted. Contact support.</p>
              </div>
            </div>
          )}
          {vendor?.status === "rejected" && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-orange-300">Account Rejected</p>
                <p className="text-sm text-neutral-400">Your vendor application has been rejected. Please contact support.</p>
              </div>
            </div>
          )}
          <Routes>
            <Route index element={<VendorOverview vendor={vendor} />} />
            <Route path="kyc" element={<VendorKYC vendor={vendor} setVendor={setVendor} />} />
            <Route path="products" element={<VendorProducts vendor={vendor} />} />
            <Route path="categories" element={<VendorCategories vendor={vendor} />} />
            <Route path="orders" element={<VendorOrders vendor={vendor} />} />
            <Route path="wallet" element={<VendorWallet vendor={vendor} />} />
            <Route path="offers" element={<VendorOffers vendor={vendor} />} />
            <Route path="promotions" element={<VendorPromotions vendor={vendor} />} />
            <Route path="analytics" element={<VendorAnalytics vendor={vendor} />} />
            <Route path="influencers" element={<VendorInfluencers vendor={vendor} />} />
            <Route path="support" element={<VendorSupport vendor={vendor} />} />
            <Route path="returns" element={<VendorReturns vendor={vendor} />} />
            <Route path="*" element={<VendorOverview vendor={vendor} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// =============== OVERVIEW ===============
const VendorOverview = ({ vendor }) => {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    axios.get(`${API}/vendors/dashboard`, { headers: getVendorHeaders() })
      .then(res => setDashboard(res.data))
      .catch(() => toast.error("Failed to load dashboard"));
  }, []);

  const stats = dashboard?.stats || {};

  const statCards = [
    { label: "Total Products", value: stats.total_products || 0, icon: Package, color: "text-blue-400" },
    { label: "Approved", value: stats.approved_products || 0, icon: CheckCircle, color: "text-green-400" },
    { label: "Pending", value: stats.pending_products || 0, icon: Clock, color: "text-yellow-400" },
    { label: "Total Orders", value: stats.total_orders || 0, icon: ShoppingCart, color: "text-purple-400" },
    { label: "Total Sales", value: `${(stats.total_sales || 0).toLocaleString()}`, icon: IndianRupee, color: "text-gold" },
    { label: "Wallet Balance", value: `${(stats.wallet_balance || 0).toLocaleString()}`, icon: Wallet, color: "text-emerald-400" },
  ];

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-6">Dashboard Overview</h2>

      {vendor.status !== "approved" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <p className="text-yellow-300 text-sm">
              {vendor.status === "pending" && "Your vendor account is pending approval. Complete KYC to speed up the process."}
              {vendor.status === "kyc_submitted" && "Your KYC documents are under review. You'll be notified once approved."}
              {vendor.status === "rejected" && "Your vendor account was rejected. Please contact support."}
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-neutral-400">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {dashboard?.recent_orders?.length > 0 && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Recent Orders</h3>
          {dashboard.recent_orders.map((o) => (
            <div key={o.order_id} className="flex items-center justify-between py-2 border-b border-neutral-700/50 last:border-0">
              <div>
                <p className="text-sm text-white">{o.order_id}</p>
                <p className="text-xs text-neutral-400">{new Date(o.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gold">{o.total?.toLocaleString()}</p>
                <span className={`text-xs capitalize ${o.status === "delivered" ? "text-green-400" : o.status === "shipped" ? "text-blue-400" : "text-yellow-400"}`}>{o.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============== KYC ===============
const VendorKYC = ({ vendor, setVendor }) => {
  const [form, setForm] = useState({
    pan_number: "", aadhaar_number: "",
    bank_account_name: "", bank_account_number: "", bank_ifsc: "", bank_name: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/vendors/kyc/submit`, form, { headers: getVendorHeaders() });
      toast.success("KYC submitted successfully!");
      const res = await axios.get(`${API}/vendors/me`, { headers: getVendorHeaders() });
      setVendor(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit KYC");
    } finally { setSubmitting(false); }
  };

  if (vendor.kyc_status === "approved") {
    return (
      <div className="text-center py-20">
        <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">KYC Approved</h2>
        <p className="text-neutral-400">Your documents have been verified</p>
      </div>
    );
  }

  if (vendor.kyc_status === "submitted") {
    return (
      <div className="text-center py-20">
        <Clock className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">KYC Under Review</h2>
        <p className="text-neutral-400">Your documents are being verified. This usually takes 24-48 hours.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-6">KYC Verification</h2>
      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Identity Documents</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">PAN Number *</label>
              <Input value={form.pan_number} onChange={(e) => setForm({...form, pan_number: e.target.value.toUpperCase()})}
                className="bg-neutral-900 border-neutral-700 text-white" placeholder="ABCDE1234F" required maxLength={10} data-testid="kyc-pan" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Aadhaar Number *</label>
              <Input value={form.aadhaar_number} onChange={(e) => setForm({...form, aadhaar_number: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" placeholder="1234 5678 9012" required maxLength={12} data-testid="kyc-aadhaar" />
            </div>
          </div>
        </div>

        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Bank Account Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Account Holder Name *</label>
              <Input value={form.bank_account_name} onChange={(e) => setForm({...form, bank_account_name: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required data-testid="kyc-bank-name" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Bank Name *</label>
              <Input value={form.bank_name} onChange={(e) => setForm({...form, bank_name: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required data-testid="kyc-bank" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Account Number *</label>
              <Input value={form.bank_account_number} onChange={(e) => setForm({...form, bank_account_number: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required data-testid="kyc-account" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">IFSC Code *</label>
              <Input value={form.bank_ifsc} onChange={(e) => setForm({...form, bank_ifsc: e.target.value.toUpperCase()})}
                className="bg-neutral-900 border-neutral-700 text-white" required data-testid="kyc-ifsc" />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={submitting} className="bg-gold text-black hover:bg-gold/90 font-semibold" data-testid="kyc-submit-btn">
          {submitting ? "Submitting..." : "Submit KYC Documents"}
        </Button>
      </form>
    </div>
  );
};

// =============== PRODUCTS ===============
const VendorProducts = ({ vendor }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null);
  const [newStockVal, setNewStockVal] = useState("");
  const [newPriceVal, setNewPriceVal] = useState("");
  const [form, setForm] = useState({
    name: "", description: "", price: "", compare_price: "", category: "",
    sizes: "", colors: "", stock: "", tags: "", is_limited_edition: false
  });
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [creating, setCreating] = useState(false);

  const categories = ["Platform Boots", "Stiletto Heels", "Ankle Boots", "Wedge Heels", "Sneakers", "Sandals", "Loafers", "Other"];

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/vendors/products`, { headers: getVendorHeaders() });
      setProducts(res.data);
    } catch { toast.error("Failed to load products"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
        stock: parseInt(form.stock) || 0,
        sizes: form.sizes ? form.sizes.split(",").map(s => s.trim()) : [],
        colors: form.colors ? form.colors.split(",").map(s => s.trim()) : [],
        images: uploadedMedia.filter(m => m.type !== "video").map(m => m.url),
        videos: uploadedMedia.filter(m => m.type === "video").map(m => m.url),
        tags: form.tags ? form.tags.split(",").map(s => s.trim()) : [],
      };
      await axios.post(`${API}/vendors/products`, payload, { headers: getVendorHeaders() });
      toast.success("Product submitted for approval!");
      setShowForm(false);
      setForm({ name: "", description: "", price: "", compare_price: "", category: "", sizes: "", colors: "", stock: "", tags: "", is_limited_edition: false });
      setUploadedMedia([]);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create product");
    } finally { setCreating(false); }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm("Delist this product?")) return;
    try {
      await axios.delete(`${API}/vendors/products/${productId}`, { headers: getVendorHeaders() });
      toast.success("Product delisted");
      fetchProducts();
    } catch { toast.error("Failed to delist"); }
  };

  const handleUpdateStock = async (productId) => {
    try {
      await axios.put(`${API}/vendors/products/${productId}/stock?stock=${parseInt(newStockVal)}`, {}, { headers: getVendorHeaders() });
      toast.success("Stock updated");
      setEditingStock(null);
      fetchProducts();
    } catch { toast.error("Failed to update stock"); }
  };

  const handleUpdatePrice = async (productId) => {
    try {
      await axios.put(`${API}/vendors/products/${productId}/price?price=${parseFloat(newPriceVal)}`, {}, { headers: getVendorHeaders() });
      toast.success("Price updated");
      setEditingPrice(null);
      fetchProducts();
    } catch { toast.error("Failed to update price"); }
  };

  const statusBadge = (s) => {
    const map = { approved: "bg-green-500/20 text-green-400", pending_approval: "bg-yellow-500/20 text-yellow-400", rejected: "bg-red-500/20 text-red-400", draft: "bg-neutral-500/20 text-neutral-400", delisted: "bg-neutral-600/20 text-neutral-500" };
    return map[s] || map.draft;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="font-serif text-2xl font-bold text-white">My Products</h2>
        {vendor.status === "approved" && (
          <div className="flex gap-2">
            <Button variant="outline" className="border-neutral-600 text-neutral-300 hover:text-white bg-transparent"
              onClick={() => { setShowBulk(!showBulk); setShowForm(false); }} data-testid="vendor-bulk-upload-btn">
              <Upload className="h-4 w-4 mr-2" /> Bulk Upload
            </Button>
            <Button className="bg-gold text-black hover:bg-gold/90" onClick={() => { setShowForm(!showForm); setShowBulk(false); }} data-testid="add-product-btn">
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
        )}
      </div>

      {vendor.status !== "approved" && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-yellow-300 text-sm">Your vendor account must be approved to add products.</p>
        </div>
      )}

      {showBulk && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <BulkUpload mode="vendor" />
        </motion.div>
      )}


      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">New Product</h3>
            <Button variant="ghost" size="sm" className="text-neutral-400" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Product Name *</label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                placeholder="e.g. Classic Black Heels" className="bg-neutral-900 border-neutral-700 text-white" required data-testid="product-name" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Category *</label>
              <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}
                className="w-full h-10 px-3 bg-neutral-900 border border-neutral-700 text-white rounded-md text-sm" required data-testid="product-category">
                <option value="">Select category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Price (₹) *</label>
              <Input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})}
                placeholder="8999" className="bg-neutral-900 border-neutral-700 text-white" required data-testid="product-price" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Compare/MRP Price (₹)</label>
              <Input type="number" value={form.compare_price} onChange={(e) => setForm({...form, compare_price: e.target.value})}
                placeholder="12999" className="bg-neutral-900 border-neutral-700 text-white" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Stock Quantity *</label>
              <Input type="number" value={form.stock} onChange={(e) => setForm({...form, stock: e.target.value})}
                placeholder="50" className="bg-neutral-900 border-neutral-700 text-white" required data-testid="product-stock" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Sizes (comma separated)</label>
              <Input value={form.sizes} onChange={(e) => setForm({...form, sizes: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" placeholder="6, 7, 8, 9, 10" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Colors (comma separated)</label>
              <Input value={form.colors} onChange={(e) => setForm({...form, colors: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" placeholder="Black, Gold, Silver" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-neutral-400 mb-1 block">Product Images & Videos</label>
              <MediaUploader value={uploadedMedia} onChange={setUploadedMedia} maxFiles={8} userId={vendor.vendor_id} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-neutral-400 mb-1 block">Description *</label>
              <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-white rounded-md resize-none text-sm" rows={3} required data-testid="product-desc"
                placeholder="Describe your product..." />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Tags (comma separated)</label>
              <Input value={form.tags} onChange={(e) => setForm({...form, tags: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" placeholder="new arrival, trending" />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" checked={form.is_limited_edition}
                onChange={(e) => setForm({...form, is_limited_edition: e.target.checked})} id="v-limited" className="accent-gold" />
              <label htmlFor="v-limited" className="text-sm text-neutral-300">Limited Edition</label>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button type="submit" disabled={creating} className="bg-gold text-black hover:bg-gold/90 font-semibold" data-testid="submit-product-btn">
                {creating ? "Submitting..." : "Submit for Approval"}
              </Button>
              <Button type="button" variant="outline" className="border-neutral-600 text-neutral-300" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Inventory Summary */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{products.length}</p>
            <p className="text-xs text-neutral-400">Total Products</p>
          </div>
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{products.filter(p => p.approval_status === "approved").length}</p>
            <p className="text-xs text-neutral-400">Approved</p>
          </div>
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">{products.filter(p => p.approval_status === "pending_approval").length}</p>
            <p className="text-xs text-neutral-400">Pending</p>
          </div>
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-3 text-center">
            <p className={`text-2xl font-bold ${products.some(p => p.stock < 10) ? "text-red-400" : "text-neutral-300"}`}>
              {products.filter(p => p.stock < 10).length}
            </p>
            <p className="text-xs text-neutral-400">Low Stock</p>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead className="text-neutral-400">Product</TableHead>
              <TableHead className="text-neutral-400">Category</TableHead>
              <TableHead className="text-neutral-400">Price</TableHead>
              <TableHead className="text-neutral-400">Stock</TableHead>
              <TableHead className="text-neutral-400">Status</TableHead>
              <TableHead className="text-neutral-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.product_id} className="border-neutral-700">
                <TableCell className="text-white font-medium">{p.name}</TableCell>
                <TableCell className="text-neutral-300">{p.category}</TableCell>
                <TableCell>
                  {editingPrice === p.product_id ? (
                    <div className="flex items-center gap-1">
                      <Input type="number" value={newPriceVal} onChange={(e) => setNewPriceVal(e.target.value)}
                        className="w-24 h-7 text-xs bg-neutral-900 border-neutral-600 text-white" />
                      <Button size="sm" className="h-7 px-2 bg-green-600 text-white text-xs" onClick={() => handleUpdatePrice(p.product_id)}>OK</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-1 text-neutral-400 text-xs" onClick={() => setEditingPrice(null)}>X</Button>
                    </div>
                  ) : (
                    <span className="text-gold cursor-pointer hover:underline" onClick={() => { setEditingPrice(p.product_id); setNewPriceVal(String(p.price)); }}>
                      ₹{p.price?.toLocaleString()}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {editingStock === p.product_id ? (
                    <div className="flex items-center gap-1">
                      <Input type="number" value={newStockVal} onChange={(e) => setNewStockVal(e.target.value)}
                        className="w-20 h-7 text-xs bg-neutral-900 border-neutral-600 text-white" />
                      <Button size="sm" className="h-7 px-2 bg-green-600 text-white text-xs" onClick={() => handleUpdateStock(p.product_id)}>OK</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-1 text-neutral-400 text-xs" onClick={() => setEditingStock(null)}>X</Button>
                    </div>
                  ) : (
                    <span className={`cursor-pointer hover:underline ${p.stock < 10 ? "text-red-400 font-bold" : "text-neutral-300"}`}
                      onClick={() => { setEditingStock(p.product_id); setNewStockVal(String(p.stock)); }}>
                      {p.stock} {p.stock < 10 && "(Low)"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded capitalize ${statusBadge(p.approval_status)}`}>{p.approval_status?.replace("_", " ")}</span>
                  {p.rejection_reason && <p className="text-xs text-red-400 mt-1">{p.rejection_reason}</p>}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="text-red-400 h-7 px-2" onClick={() => deleteProduct(p.product_id)} data-testid={`delist-${p.product_id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
        {!loading && products.length === 0 && <div className="text-center py-12 text-neutral-500">No products yet. Click "Add Product" to create one!</div>}
      </div>
    </div>
  );
};

// =============== ORDERS ===============
const VendorOrders = ({ vendor }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/vendors/orders`, { headers: getVendorHeaders() })
      .then(res => setOrders(res.data))
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  const updateShipping = async (orderId, status) => {
    try {
      await axios.put(`${API}/vendors/orders/${orderId}/shipping?status=${status}`, {}, { headers: getVendorHeaders() });
      toast.success(`Order ${status}`);
      setOrders(orders.map(o => o.order_id === orderId ? { ...o, status } : o));
    } catch { toast.error("Failed to update"); }
  };

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-6">Orders</h2>
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead className="text-neutral-400">Order ID</TableHead>
              <TableHead className="text-neutral-400">Date</TableHead>
              <TableHead className="text-neutral-400">Total</TableHead>
              <TableHead className="text-neutral-400">Status</TableHead>
              <TableHead className="text-neutral-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.order_id} className="border-neutral-700">
                <TableCell className="text-white font-mono text-xs">{o.order_id}</TableCell>
                <TableCell className="text-neutral-300">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-gold">{o.total?.toLocaleString()}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded capitalize ${
                    o.status === "delivered" ? "bg-green-500/20 text-green-400" :
                    o.status === "shipped" ? "bg-blue-500/20 text-blue-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>{o.status}</span>
                </TableCell>
                <TableCell>
                  {o.status === "confirmed" && <Button size="sm" className="bg-blue-600 text-white text-xs" onClick={() => updateShipping(o.order_id, "processing")}>Process</Button>}
                  {o.status === "processing" && <Button size="sm" className="bg-blue-600 text-white text-xs" onClick={() => updateShipping(o.order_id, "shipped")}>Ship</Button>}
                  {o.status === "shipped" && <Button size="sm" className="bg-green-600 text-white text-xs" onClick={() => updateShipping(o.order_id, "delivered")}>Delivered</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
        {!loading && orders.length === 0 && <div className="text-center py-12 text-neutral-500">No orders yet</div>}
      </div>
    </div>
  );
};

// =============== WALLET ===============
const VendorWallet = ({ vendor }) => {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [topupAmount, setTopupAmount] = useState("");
  const [loading, setLoading] = useState(true);

  const refreshWallet = async () => {
    try {
      const [b, t, w] = await Promise.all([
        axios.get(`${API}/vendors/wallet/balance`, { headers: getVendorHeaders() }),
        axios.get(`${API}/vendors/wallet/transactions`, { headers: getVendorHeaders() }),
        axios.get(`${API}/vendors/withdrawals`, { headers: getVendorHeaders() })
      ]);
      setBalance(b.data);
      setTransactions(t.data);
      setWithdrawals(w.data);
    } catch { toast.error("Failed to load wallet"); }
  };

  useEffect(() => { refreshWallet().finally(() => setLoading(false)); }, []);

  const handleTopup = async () => {
    const amt = parseFloat(topupAmount);
    if (!amt || amt < 100) { toast.error("Minimum top-up is Rs. 100"); return; }
    try {
      await axios.post(`${API}/vendors/wallet/topup`, { amount: amt }, { headers: getVendorHeaders() });
      toast.success(`Rs. ${amt.toLocaleString()} added to wallet!`);
      setTopupAmount("");
      refreshWallet();
    } catch (err) { toast.error(err.response?.data?.detail || "Top-up failed"); }
  };

  const requestWithdrawal = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 1000) { toast.error("Minimum withdrawal is Rs. 1,000"); return; }
    try {
      await axios.post(`${API}/vendors/wallet/withdraw`, { amount: amt }, { headers: getVendorHeaders() });
      toast.success("Withdrawal request submitted!");
      setWithdrawAmount("");
      refreshWallet();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to request withdrawal"); }
  };

  if (loading) return <div className="text-center py-12 text-neutral-500">Loading...</div>;

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-6">Wallet</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
          <p className="text-sm text-neutral-400">Available Balance</p>
          <p className="text-3xl font-bold text-gold mt-1">{(balance?.wallet_balance || 0).toLocaleString()}</p>
        </div>
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
          <p className="text-sm text-neutral-400">Total Sales</p>
          <p className="text-3xl font-bold text-white mt-1">{(balance?.total_sales || 0).toLocaleString()}</p>
        </div>
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
          <p className="text-sm text-neutral-400">Pending Withdrawals</p>
          <p className="text-3xl font-bold text-yellow-400 mt-1">{(balance?.pending_withdrawals || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Wallet Top-Up */}
      <div className="bg-neutral-800/50 border border-green-500/20 rounded-xl p-5 mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Add Money to Wallet</h3>
        <p className="text-xs text-neutral-400 mb-3">Top up your wallet to pay for collaborations and promotions. Payment is via Razorpay (MOCKED).</p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm text-neutral-400 mb-1 block">Amount (Min Rs. 100)</label>
            <Input type="number" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)}
              className="bg-neutral-900 border-neutral-700 text-white" placeholder="1000" data-testid="topup-amount" />
          </div>
          <Button onClick={handleTopup} className="bg-green-600 text-white hover:bg-green-700" data-testid="topup-btn">
            <IndianRupee className="h-4 w-4 mr-1" /> Add Money
          </Button>
        </div>
        <div className="flex gap-2 mt-3">
          {[500, 1000, 5000, 10000].map(a => (
            <button key={a} onClick={() => setTopupAmount(String(a))}
              className="text-xs px-3 py-1 rounded-full border border-neutral-700 text-neutral-400 hover:border-green-500 hover:text-green-400 transition-colors">
              +{a.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {vendor.kyc_status === "approved" && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Request Withdrawal</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm text-neutral-400 mb-1 block">Amount (Min Rs. 1,000)</label>
              <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                className="bg-neutral-900 border-neutral-700 text-white" placeholder="1000" data-testid="withdraw-amount" />
            </div>
            <Button onClick={requestWithdrawal} className="bg-gold text-black hover:bg-gold/90" data-testid="withdraw-btn">
              Request Withdrawal
            </Button>
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Transactions</h3>
          {transactions.map((t) => (
            <div key={t.transaction_id} className="flex items-center justify-between py-2 border-b border-neutral-700/50 last:border-0">
              <div>
                <p className="text-sm text-white">{t.description}</p>
                <p className="text-xs text-neutral-400">{new Date(t.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${t.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                  {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500">Bal: {t.balance_after?.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {withdrawals.length > 0 && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-3">Withdrawal History</h3>
          {withdrawals.map((w) => (
            <div key={w.withdrawal_id} className="flex items-center justify-between py-2 border-b border-neutral-700/50 last:border-0">
              <div>
                <p className="text-sm text-white">{w.withdrawal_id}</p>
                <p className="text-xs text-neutral-400">{new Date(w.requested_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gold">{w.amount.toLocaleString()}</p>
                <span className={`text-xs capitalize ${
                  w.status === "completed" ? "text-green-400" :
                  w.status === "rejected" ? "text-red-400" : "text-yellow-400"
                }`}>{w.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============== OFFERS ===============
const VendorOffers = ({ vendor }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", offer_type: "percentage", discount_value: "", coupon_code: "",
    start_date: "", end_date: "", max_quantity: "", min_order_value: "0"
  });

  const fetchOffers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/vendors/offers`, { headers: getVendorHeaders() });
      setOffers(res.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const createOffer = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/vendors/offers`, {
        ...form,
        discount_value: parseFloat(form.discount_value),
        min_order_value: parseFloat(form.min_order_value) || 0,
        max_quantity: form.max_quantity ? parseInt(form.max_quantity) : null,
        product_ids: []
      }, { headers: getVendorHeaders() });
      toast.success("Offer created!");
      setShowForm(false);
      fetchOffers();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-2xl font-bold text-white">Promotional Offers</h2>
        <Button className="bg-gold text-black hover:bg-gold/90" onClick={() => setShowForm(!showForm)} data-testid="add-offer-btn">
          <Plus className="h-4 w-4 mr-2" /> Create Offer
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 mb-6">
          <form onSubmit={createOffer} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm text-neutral-400 mb-1 block">Offer Title *</label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required data-testid="offer-title" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Offer Type</label>
              <Select value={form.offer_type} onValueChange={(v) => setForm({...form, offer_type: v})}>
                <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Discount</SelectItem>
                  <SelectItem value="flat">Flat Discount</SelectItem>
                  <SelectItem value="coupon">Coupon Code</SelectItem>
                  <SelectItem value="flash_sale">Flash Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Discount Value *</label>
              <Input type="number" value={form.discount_value} onChange={(e) => setForm({...form, discount_value: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required />
            </div>
            {form.offer_type === "coupon" && (
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Coupon Code</label>
                <Input value={form.coupon_code} onChange={(e) => setForm({...form, coupon_code: e.target.value})}
                  className="bg-neutral-900 border-neutral-700 text-white" />
              </div>
            )}
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Start Date *</label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">End Date *</label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required />
            </div>
            <div className="col-span-2 flex gap-3">
              <Button type="submit" className="bg-gold text-black" data-testid="create-offer-submit">Create Offer</Button>
              <Button type="button" variant="outline" className="border-neutral-600 text-neutral-300" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-3">
        {offers.map((o) => (
          <div key={o.offer_id} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">{o.title}</h3>
              <p className="text-sm text-neutral-400">
                {o.offer_type === "percentage" ? `${o.discount_value}% off` : `Rs. ${o.discount_value} off`}
                {o.coupon_code && ` | Code: ${o.coupon_code}`}
              </p>
              <p className="text-xs text-neutral-500">{o.start_date} - {o.end_date}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${o.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              {o.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        ))}
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
        {!loading && offers.length === 0 && <div className="text-center py-12 text-neutral-500">No offers yet</div>}
      </div>
    </div>
  );
};

// =============== CATEGORIES ===============
const VendorCategories = ({ vendor }) => {
  const [categories, setCategories] = useState({ platform_categories: [], vendor_categories: [] });
  const [newCat, setNewCat] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/vendors/categories`, { headers: getVendorHeaders() });
      setCategories(res.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const createCategory = async () => {
    if (!newCat.trim()) return;
    try {
      await axios.post(`${API}/vendors/categories?name=${encodeURIComponent(newCat)}&description=${encodeURIComponent(newCatDesc)}`, {}, { headers: getVendorHeaders() });
      toast.success("Category created!");
      setNewCat(""); setNewCatDesc("");
      fetchCategories();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const deleteCategory = async (id) => {
    try {
      await axios.delete(`${API}/vendors/categories/${id}`, { headers: getVendorHeaders() });
      toast.success("Category deleted");
      fetchCategories();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" /></div>;

  return (
    <div className="space-y-8" data-testid="vendor-categories-page">
      <h2 className="text-2xl font-bold text-white">Categories</h2>

      <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Create Your Category</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Category name" className="bg-neutral-800 border-neutral-700 text-white flex-1" data-testid="new-category-input" />
          <Input value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} placeholder="Description (optional)" className="bg-neutral-800 border-neutral-700 text-white flex-1" />
          <Button onClick={createCategory} className="bg-gold hover:bg-gold/90 text-black" data-testid="create-category-btn">
            <Plus className="h-4 w-4 mr-1" /> Create
          </Button>
        </div>
      </div>

      {categories.vendor_categories.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Your Categories</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.vendor_categories.map((cat) => (
              <div key={cat.category_id} className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 flex items-center justify-between" data-testid={`vcat-${cat.category_id}`}>
                <div>
                  <p className="text-white font-medium">{cat.name}</p>
                  {cat.description && <p className="text-neutral-400 text-xs mt-1">{cat.description}</p>}
                </div>
                <button onClick={() => deleteCategory(cat.category_id)} className="text-red-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Platform Categories</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.platform_categories.map((cat) => (
            <div key={cat.category_id} className="bg-neutral-800/30 border border-neutral-700/50 rounded-lg p-3" data-testid={`pcat-${cat.category_id}`}>
              <p className="text-neutral-300 text-sm">{cat.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =============== PROMOTIONS ===============
const VendorPromotions = ({ vendor }) => {
  const [credits, setCredits] = useState({ balance: 0, total_spent: 0 });
  const [promotions, setPromotions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyAmount, setBuyAmount] = useState("500");
  const [buying, setBuying] = useState(false);
  const [promoForm, setPromoForm] = useState({ product_id: "", listing_type: "top_100", days: "7" });
  const [activeTab, setActiveTab] = useState("overview"); // overview | history

  const fetchData = useCallback(async () => {
    try {
      const [credRes, promoRes, prodRes, txnRes] = await Promise.all([
        axios.get(`${API}/vendors/promotions/credits`, { headers: getVendorHeaders() }),
        axios.get(`${API}/vendors/promotions/my`, { headers: getVendorHeaders() }),
        axios.get(`${API}/vendors/products`, { headers: getVendorHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API}/vendors/promotions/credits/transactions`, { headers: getVendorHeaders() }).catch(() => ({ data: [] }))
      ]);
      setCredits(credRes.data);
      setPromotions(promoRes.data);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.products || []);
      setTransactions(Array.isArray(txnRes.data) ? txnRes.data : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const buyCredits = async () => {
    const amount = parseInt(buyAmount);
    if (!amount || amount < 100) { toast.error("Minimum 100 credits"); return; }
    setBuying(true);
    try {
      const res = await axios.post(`${API}/vendors/promotions/credits/create-order`, { amount }, { headers: getVendorHeaders() });
      const data = res.data;

      if (data.mocked) {
        toast.success(data.message || `Added ${data.credits_added} credits (mock mode)`);
        fetchData();
        setBuying(false);
        return;
      }

      // Real Razorpay checkout
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: "Pigma",
        description: `Purchase ${amount} Promotion Credits`,
        handler: async (response) => {
          try {
            await axios.post(`${API}/vendors/promotions/credits/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }, { headers: getVendorHeaders() });
            toast.success(`Payment verified! Added ${amount} credits`);
            fetchData();
          } catch (err) {
            toast.error(err.response?.data?.detail || "Payment verification failed");
          }
          setBuying(false);
        },
        modal: { ondismiss: () => setBuying(false) },
        prefill: { email: vendor?.email || "" },
        theme: { color: "#C9A050" }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create order");
      setBuying(false);
    }
  };

  const promoteProduct = async () => {
    if (!promoForm.product_id) { toast.error("Select a product"); return; }
    try {
      await axios.post(`${API}/vendors/promotions/promote-product`, {
        product_id: promoForm.product_id,
        listing_type: promoForm.listing_type,
        days: parseInt(promoForm.days) || 7
      }, { headers: getVendorHeaders() });
      toast.success("Product promoted!");
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const costMap = { top_20: 50, top_100: 20, category_top: 30 };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" /></div>;

  return (
    <div className="space-y-8" data-testid="vendor-promotions-page">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Promotions</h2>
        <div className="flex gap-2">
          {["overview", "history"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-colors ${activeTab === t ? "bg-gold text-black font-medium" : "text-neutral-400 hover:bg-neutral-800"}`}
              data-testid={`promo-tab-${t}`}>
              {t === "overview" ? "Overview" : "Transaction History"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <>
          {/* Credits Balance */}
          <div className="bg-gradient-to-r from-gold/20 to-gold/5 border border-gold/30 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-gold text-xs font-mono uppercase tracking-wider mb-1">Credit Balance</p>
                <p className="text-4xl font-bold text-white" data-testid="credit-balance">{credits.balance || 0}</p>
                <p className="text-neutral-400 text-xs mt-1">Total spent: {credits.total_spent || 0} credits &bull; 1 credit = ₹1</p>
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} className="w-24 bg-neutral-800 border-neutral-700 text-white" min="100" data-testid="buy-credits-amount" />
                <Button onClick={buyCredits} disabled={buying} className="bg-gold hover:bg-gold/90 text-black" data-testid="buy-credits-btn">
                  <Zap className="h-4 w-4 mr-1" /> {buying ? "Processing..." : `Buy (₹${buyAmount})`}
                </Button>
              </div>
            </div>
          </div>

          {/* Promote Product */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Promote a Product</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Select value={promoForm.product_id} onValueChange={(v) => setPromoForm(f => ({ ...f, product_id: v }))}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white" data-testid="promo-product-select">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.filter(p => p.approval_status === "approved").map((p) => (
                    <SelectItem key={p.product_id} value={p.product_id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={promoForm.listing_type} onValueChange={(v) => setPromoForm(f => ({ ...f, listing_type: v }))}>
                <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white" data-testid="promo-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top_20">Top 20 (₹50/day)</SelectItem>
                  <SelectItem value="top_100">Top 100 (₹20/day)</SelectItem>
                  <SelectItem value="category_top">Category Top (₹30/day)</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" value={promoForm.days} onChange={(e) => setPromoForm(f => ({ ...f, days: e.target.value }))} placeholder="Days" className="bg-neutral-800 border-neutral-700 text-white" min="1" data-testid="promo-days-input" />
              <Button onClick={promoteProduct} className="bg-gold hover:bg-gold/90 text-black" data-testid="promote-btn">
                <Megaphone className="h-4 w-4 mr-1" /> Promote ({(costMap[promoForm.listing_type] || 20) * (parseInt(promoForm.days) || 1)} credits)
              </Button>
            </div>
          </div>

          {/* Active Promotions */}
          {promotions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Your Promotions</h3>
              <div className="space-y-3">
                {promotions.map((promo) => (
                  <div key={promo.promotion_id} className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 flex items-center justify-between" data-testid={`promo-${promo.promotion_id}`}>
                    <div>
                      <p className="text-white font-medium">{promo.product_name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                        <Badge variant={promo.is_active ? "default" : "secondary"} className={promo.is_active ? "bg-green-500/20 text-green-400" : ""}>
                          {promo.is_active ? "Active" : "Expired"}
                        </Badge>
                        <span>{promo.listing_type.replace("_", " ").toUpperCase()}</span>
                        <span>{promo.days} days</span>
                        <span>{promo.total_cost} credits</span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-500">Expires: {new Date(promo.expires_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Transaction History</h3>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">No transactions yet</div>
          ) : (
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-700">
                    <TableHead className="text-neutral-400">Date</TableHead>
                    <TableHead className="text-neutral-400">Type</TableHead>
                    <TableHead className="text-neutral-400">Amount</TableHead>
                    <TableHead className="text-neutral-400">Status</TableHead>
                    <TableHead className="text-neutral-400">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(txn => (
                    <TableRow key={txn.transaction_id} className="border-neutral-700" data-testid={`txn-${txn.transaction_id}`}>
                      <TableCell className="text-neutral-300 text-sm">{new Date(txn.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${txn.type === "purchase" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {txn.type === "purchase" ? "Purchase" : "Deduction"}
                        </span>
                      </TableCell>
                      <TableCell className={`font-medium ${txn.type === "purchase" ? "text-green-400" : "text-red-400"}`}>
                        {txn.type === "purchase" ? "+" : "-"}{txn.amount} credits
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded ${txn.payment_status === "completed" || txn.payment_status === "mocked" ? "bg-green-500/20 text-green-400" : txn.payment_status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                          {txn.payment_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-neutral-400 text-xs max-w-[200px] truncate">{txn.description || txn.razorpay_order_id || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// =============== ANALYTICS ===============
const VendorAnalytics = ({ vendor }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("overview"); // overview | products | credits

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/vendors/analytics/overview`, { headers: getVendorHeaders() });
      setData(res.data);
    } catch { toast.error("Failed to load analytics"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" /></div>;
  if (!data) return <div className="text-center py-12 text-neutral-500">No analytics data available</div>;

  const { summary, sales_trend, top_products, credit_usage, recent_credit_transactions } = data;
  const maxRevenue = Math.max(...sales_trend.map(d => d.revenue), 1);

  return (
    <div className="space-y-6" data-testid="vendor-analytics-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-gold" /> Analytics
        </h2>
        <div className="flex gap-2">
          {["overview", "products", "credits"].map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-colors ${activeView === v ? "bg-gold text-black font-medium" : "text-neutral-400 hover:bg-neutral-800"}`}
              data-testid={`analytics-tab-${v}`}>
              {v === "credits" ? "Credit Analytics" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `₹${summary.total_revenue.toLocaleString()}`, icon: IndianRupee, color: "text-gold", bg: "from-gold/20 to-gold/5" },
          { label: "Total Orders", value: summary.total_orders, icon: ShoppingCart, color: "text-blue-400", bg: "from-blue-500/20 to-blue-500/5" },
          { label: "Avg Order Value", value: `₹${summary.avg_order_value.toLocaleString()}`, icon: TrendingUp, color: "text-green-400", bg: "from-green-500/20 to-green-500/5" },
          { label: "Promotion ROI", value: `${summary.promotion_roi > 0 ? "+" : ""}${summary.promotion_roi}%`, icon: Megaphone, color: summary.promotion_roi >= 0 ? "text-green-400" : "text-red-400", bg: summary.promotion_roi >= 0 ? "from-green-500/20 to-green-500/5" : "from-red-500/20 to-red-500/5" }
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.bg} border border-neutral-700/50 rounded-xl p-4`} data-testid={`stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Credit Balance", value: summary.credit_balance, color: "text-gold" },
          { label: "Credits Spent", value: summary.total_credits_spent, color: "text-red-400" },
          { label: "Active Promotions", value: summary.active_promotions, color: "text-green-400" },
          { label: "Promoted Revenue", value: `₹${summary.promoted_revenue.toLocaleString()}`, color: "text-purple-400" }
        ].map(s => (
          <div key={s.label} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Overview Tab - Sales Chart */}
      {activeView === "overview" && (
        <div className="space-y-6">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6" data-testid="sales-chart">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend (30 Days)</h3>
            <div className="flex items-end gap-[2px] h-48 overflow-x-auto">
              {sales_trend.map((d, i) => {
                const height = maxRevenue > 0 ? Math.max((d.revenue / maxRevenue) * 100, 2) : 2;
                const isToday = i === sales_trend.length - 1;
                return (
                  <div key={d.date} className="group relative flex flex-col items-center flex-1 min-w-[8px]">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black border border-neutral-600 rounded px-2 py-1 text-[10px] text-white whitespace-nowrap hidden group-hover:block z-10">
                      {d.date}: ₹{d.revenue.toLocaleString()} ({d.orders} orders)
                    </div>
                    <div
                      className={`w-full rounded-t transition-colors ${isToday ? "bg-gold" : d.revenue > 0 ? "bg-gold/60 group-hover:bg-gold" : "bg-neutral-700 group-hover:bg-neutral-600"}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-neutral-500">
              <span>{sales_trend[0]?.date}</span>
              <span>{sales_trend[sales_trend.length - 1]?.date}</span>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeView === "products" && (
        <div className="space-y-6">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden" data-testid="top-products-table">
            <div className="p-4 border-b border-neutral-700">
              <h3 className="text-lg font-semibold text-white">Top Performing Products</h3>
            </div>
            {top_products.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">No product data yet. Start selling to see analytics!</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-700">
                    <TableHead className="text-neutral-400">#</TableHead>
                    <TableHead className="text-neutral-400">Product</TableHead>
                    <TableHead className="text-neutral-400 text-right">Revenue</TableHead>
                    <TableHead className="text-neutral-400 text-right">Orders</TableHead>
                    <TableHead className="text-neutral-400 text-right">Units Sold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top_products.map((p, i) => (
                    <TableRow key={p.product_id} className="border-neutral-700" data-testid={`top-product-${i}`}>
                      <TableCell className="text-gold font-bold">{i + 1}</TableCell>
                      <TableCell className="text-white font-medium max-w-[200px] truncate">{p.name}</TableCell>
                      <TableCell className="text-right text-green-400 font-medium">₹{p.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-neutral-300">{p.orders}</TableCell>
                      <TableCell className="text-right text-neutral-300">{p.units_sold}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* Credits Tab */}
      {activeView === "credits" && (
        <div className="space-y-6">
          {/* Credit Usage by Promotion Type */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6" data-testid="credit-usage-chart">
            <h3 className="text-lg font-semibold text-white mb-4">Credit Usage by Promotion Type</h3>
            {credit_usage.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">No promotions yet</div>
            ) : (
              <div className="space-y-3">
                {credit_usage.map(cu => {
                  const maxCredits = Math.max(...credit_usage.map(c => c.credits), 1);
                  const width = Math.max((cu.credits / maxCredits) * 100, 5);
                  const typeLabels = { top_20: "Top 20", top_100: "Top 100", category_top: "Category Top" };
                  return (
                    <div key={cu.type} className="flex items-center gap-3" data-testid={`credit-usage-${cu.type}`}>
                      <span className="text-sm text-neutral-300 w-28 shrink-0">{typeLabels[cu.type] || cu.type}</span>
                      <div className="flex-1 bg-neutral-700 rounded-full h-6 overflow-hidden">
                        <div className="bg-gold h-full rounded-full flex items-center px-2 text-[10px] font-bold text-black" style={{ width: `${width}%` }}>
                          {cu.credits}
                        </div>
                      </div>
                      <span className="text-xs text-neutral-400 w-20 text-right">{cu.count} promo{cu.count !== 1 ? "s" : ""}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Credit Transactions */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden" data-testid="credit-transactions">
            <div className="p-4 border-b border-neutral-700">
              <h3 className="text-lg font-semibold text-white">Recent Credit Transactions</h3>
            </div>
            {recent_credit_transactions.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">No transactions yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-700">
                    <TableHead className="text-neutral-400">Date</TableHead>
                    <TableHead className="text-neutral-400">Type</TableHead>
                    <TableHead className="text-neutral-400">Amount</TableHead>
                    <TableHead className="text-neutral-400">Status</TableHead>
                    <TableHead className="text-neutral-400">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent_credit_transactions.map(txn => (
                    <TableRow key={txn.transaction_id} className="border-neutral-700">
                      <TableCell className="text-neutral-300 text-sm">{new Date(txn.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${txn.type === "purchase" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {txn.type === "purchase" ? "Purchase" : "Deduction"}
                        </span>
                      </TableCell>
                      <TableCell className={`font-medium ${txn.type === "purchase" ? "text-green-400" : "text-red-400"}`}>
                        {txn.type === "purchase" ? "+" : "-"}{txn.amount}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded ${txn.payment_status === "completed" || txn.payment_status === "mocked" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                          {txn.payment_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-neutral-400 text-xs max-w-[200px] truncate">{txn.description || txn.razorpay_order_id || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


// =============== INFLUENCERS ===============
const VendorInfluencers = ({ vendor }) => {
  const [influencers, setInfluencers] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("browse");
  const [collabModal, setCollabModal] = useState(null);
  const [collabForm, setCollabForm] = useState({ message: "", commission_rate: "", campaign_name: "", fixed_payment: "" });
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [infRes, reqRes] = await Promise.all([
        axios.get(`${API}/vendors/influencers/browse`, { headers: getVendorHeaders() }),
        axios.get(`${API}/collaborations/vendor/sent`, { headers: getVendorHeaders() }).catch(() => ({ data: [] }))
      ]);
      setInfluencers(infRes.data);
      setSentRequests(reqRes.data);
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getCollabStatus = (infId) => {
    const req = sentRequests.find(r => r.influencer_id === infId);
    return req ? req.status : null;
  };

  const handleSendCollab = async (influencerIds) => {
    if (!collabForm.message.trim()) { toast.error("Please write a collaboration message"); return; }
    setSending(true);
    try {
      const payload = {
        influencer_ids: influencerIds,
        message: collabForm.message,
        commission_rate: collabForm.commission_rate ? parseFloat(collabForm.commission_rate) : null,
        fixed_payment: collabForm.fixed_payment ? parseFloat(collabForm.fixed_payment) : null,
        campaign_name: collabForm.campaign_name || null
      };
      const res = await axios.post(`${API}/collaborations/request`, payload, { headers: getVendorHeaders() });
      const sent = res.data.results?.filter(r => r.status === "sent").length || 0;
      toast.success(`Collaboration request sent to ${sent} influencer(s)!`);
      setCollabModal(null);
      setCollabForm({ message: "", commission_rate: "", campaign_name: "", fixed_payment: "" });
      setSelectedIds([]);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to send"); }
    finally { setSending(false); }
  };

  const toggleSelect = (infId) => {
    setSelectedIds(prev => prev.includes(infId) ? prev.filter(id => id !== infId) : [...prev, infId]);
  };

  const statusColor = { pending: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", accepted: "text-green-400 bg-green-500/10 border-green-500/30", rejected: "text-red-400 bg-red-500/10 border-red-500/30" };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="font-serif text-2xl font-bold text-white">Influencer Collaborations</h2>
        {selectedIds.length > 0 && (
          <Button className="bg-gold text-black hover:bg-gold/90" onClick={() => setCollabModal("bulk")} data-testid="bulk-collab-btn">
            <Users className="h-4 w-4 mr-2" /> Send to {selectedIds.length} Selected
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-800 pb-3">
        <button onClick={() => setTab("browse")}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === "browse" ? "bg-gold text-black font-medium" : "text-neutral-400 hover:bg-neutral-800"}`}
          data-testid="tab-browse">
          Browse Influencers
        </button>
        <button onClick={() => setTab("sent")}
          className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${tab === "sent" ? "bg-gold text-black font-medium" : "text-neutral-400 hover:bg-neutral-800"}`}
          data-testid="tab-sent">
          My Requests {sentRequests.length > 0 && <span className="bg-neutral-700 text-neutral-300 text-xs px-1.5 py-0.5 rounded-full">{sentRequests.length}</span>}
        </button>
      </div>

      {/* Browse Tab */}
      {tab === "browse" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {influencers.map((inf) => {
            const status = getCollabStatus(inf.influencer_id);
            const isSelected = selectedIds.includes(inf.influencer_id);
            return (
              <div key={inf.influencer_id} className={`bg-neutral-800/50 border rounded-xl p-5 transition-all ${isSelected ? "border-gold" : "border-neutral-700"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {!status && (
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(inf.influencer_id)}
                        className="accent-gold mt-1 flex-shrink-0" />
                    )}
                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{inf.name}</h3>
                      {inf.instagram_handle && <p className="text-xs text-neutral-400">@{inf.instagram_handle}</p>}
                    </div>
                  </div>
                  {status ? (
                    <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ${statusColor[status] || "text-neutral-400"}`}>
                      {status}
                    </span>
                  ) : (
                    <Button size="sm" className="bg-gold text-black hover:bg-gold/90 text-xs h-8"
                      onClick={() => { setCollabModal(inf.influencer_id); setCollabForm({ message: "", commission_rate: "", campaign_name: "" }); }}
                      data-testid={`collab-btn-${inf.influencer_id}`}>
                      Send Collab
                    </Button>
                  )}
                </div>
                <p className="text-sm text-neutral-300 mb-3 line-clamp-2">{inf.bio}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-neutral-900 rounded-lg p-2">
                    <p className="text-lg font-bold text-white">{(inf.followers_count || 0).toLocaleString()}</p>
                    <p className="text-xs text-neutral-500">Followers</p>
                  </div>
                  <div className="bg-neutral-900 rounded-lg p-2">
                    <p className="text-lg font-bold text-white">{inf.total_conversions || 0}</p>
                    <p className="text-xs text-neutral-500">Conversions</p>
                  </div>
                  <div className="bg-neutral-900 rounded-lg p-2">
                    <p className="text-lg font-bold text-gold">{inf.commission_rate}%</p>
                    <p className="text-xs text-neutral-500">Commission</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {inf.niche?.map((n) => (
                    <span key={n} className="text-xs px-2 py-0.5 bg-neutral-700 rounded-full text-neutral-300">{n}</span>
                  ))}
                </div>
              </div>
            );
          })}
          {loading && <div className="text-center py-8 text-neutral-500 col-span-2">Loading...</div>}
          {!loading && influencers.length === 0 && <div className="text-center py-12 text-neutral-500 col-span-2">No approved influencers available</div>}
        </div>
      )}

      {/* Sent Requests Tab */}
      {tab === "sent" && (
        <div className="space-y-3">
          {sentRequests.length === 0 && <div className="text-center py-12 text-neutral-500">No collaboration requests sent yet</div>}
          {sentRequests.map((req) => (
            <div key={req.request_id} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{req.influencer_name}</h4>
                    <p className="text-xs text-neutral-400">{req.campaign_name || "General Collaboration"}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ${statusColor[req.status] || "text-neutral-400"}`}>
                  {req.status}
                </span>
              </div>
              <p className="text-sm text-neutral-300 mb-2">{req.message}</p>
              <div className="flex flex-wrap gap-4 text-xs text-neutral-500 mb-4">
                {req.commission_rate && <span>Commission: {req.commission_rate}%</span>}
                {req.fixed_payment && <span className="text-green-400">Fixed: ₹{req.fixed_payment.toLocaleString()}</span>}
                {req.platform_collab_fee && <span>Platform fee: {req.platform_collab_fee}%</span>}
                <span>Sent: {new Date(req.created_at).toLocaleDateString()}</span>
                {req.responded_at && <span>Responded: {new Date(req.responded_at).toLocaleDateString()}</span>}
              </div>
              {req.referral_code && req.status === "accepted" && (
                <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gold text-xs font-mono uppercase tracking-wider">Referral Code</p>
                      <p className="text-white font-bold text-lg tracking-widest" data-testid={`ref-code-${req.request_id}`}>{req.referral_code}</p>
                    </div>
                    <div className="text-right text-xs text-neutral-400">
                      <p>Sales: <span className="text-white font-medium">{req.sales_count || 0}</span></p>
                      <p>Revenue: <span className="text-gold font-medium">₹{(req.sales_revenue || 0).toLocaleString()}</span></p>
                    </div>
                  </div>
                </div>
              )}
              {(req.status === "rejected" || req.status === "expired") && (
                <button
                  onClick={async () => {
                    try {
                      await axios.post(`${API}/collaborations/${req.request_id}/resend`, {}, { headers: getVendorHeaders() });
                      toast.success("Collaboration request resent!");
                      fetchData();
                    } catch (err) { toast.error(err.response?.data?.detail || "Failed to resend"); }
                  }}
                  className="text-sm text-gold hover:text-gold/80 font-medium transition-colors mb-3"
                  data-testid={`resend-${req.request_id}`}
                >
                  Resend Request
                </button>
              )}
              {req.status === "accepted" && req.influencer_contact && (
                <div className="bg-neutral-900/80 border border-green-500/20 rounded-lg p-4 space-y-3 mt-3">
                  <p className="text-green-400 font-semibold text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Collaboration Accepted — Influencer Contact
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 bg-neutral-800 rounded-lg p-3">
                      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-gold" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">Name</p>
                        <p className="text-white text-sm font-medium">{req.influencer_contact.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-neutral-800 rounded-lg p-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">Email</p>
                        <a href={`mailto:${req.influencer_contact.email}`} className="text-blue-400 text-sm hover:underline">{req.influencer_contact.email}</a>
                      </div>
                    </div>
                    {req.influencer_contact.phone && (
                      <div className="flex items-center gap-3 bg-neutral-800 rounded-lg p-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <IndianRupee className="h-4 w-4 text-green-400" />
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">Phone</p>
                          <a href={`tel:${req.influencer_contact.phone}`} className="text-green-400 text-sm hover:underline">{req.influencer_contact.phone}</a>
                        </div>
                      </div>
                    )}
                    {req.influencer_contact.instagram && (
                      <div className="flex items-center gap-3 bg-neutral-800 rounded-lg p-3">
                        <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                          <Eye className="h-4 w-4 text-pink-400" />
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500">Instagram</p>
                          <a href={`https://instagram.com/${req.influencer_contact.instagram}`} target="_blank" rel="noreferrer" className="text-pink-400 text-sm hover:underline">@{req.influencer_contact.instagram}</a>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 border-t border-neutral-700 pt-2 mt-1">
                    Pigma platform takes {req.platform_collab_fee || 5}% on every sale from this collaboration.
                  </p>
                </div>
              )}
              {req.status === "accepted" && !req.influencer_contact && (
                <p className="text-xs text-green-400 mt-2">Accepted on {new Date(req.responded_at).toLocaleDateString()}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Collab Request Modal */}
      {collabModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCollabModal(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">
              {collabModal === "bulk" ? `Send Collaboration to ${selectedIds.length} Influencers` : "Send Collaboration Request"}
            </h3>
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Campaign Name (optional)</label>
              <Input value={collabForm.campaign_name} onChange={(e) => setCollabForm(f => ({ ...f, campaign_name: e.target.value }))}
                placeholder="e.g. Summer Collection Launch" className="bg-neutral-800 border-neutral-700 text-white" data-testid="collab-campaign" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Your Message *</label>
              <textarea value={collabForm.message} onChange={(e) => setCollabForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Hi! We'd love to collaborate with you on promoting our new collection. We think your audience would love our products..."
                rows={4} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-md text-sm resize-none" data-testid="collab-message" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Offer Commission Rate % (optional)</label>
              <Input type="number" value={collabForm.commission_rate} onChange={(e) => setCollabForm(f => ({ ...f, commission_rate: e.target.value }))}
                placeholder="e.g. 15" className="bg-neutral-800 border-neutral-700 text-white" data-testid="collab-rate" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Fixed Payment ₹ (optional)</label>
              <Input type="number" value={collabForm.fixed_payment} onChange={(e) => setCollabForm(f => ({ ...f, fixed_payment: e.target.value }))}
                placeholder="e.g. 50000" className="bg-neutral-800 border-neutral-700 text-white" data-testid="collab-fixed-payment" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="bg-gold text-black hover:bg-gold/90 font-semibold flex-1" disabled={sending}
                onClick={() => handleSendCollab(collabModal === "bulk" ? selectedIds : [collabModal])} data-testid="send-collab-btn">
                {sending ? "Sending..." : "Send Request"}
              </Button>
              <Button variant="outline" className="border-neutral-600 text-neutral-300" onClick={() => setCollabModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ===== VENDOR SUPPORT =====
const VendorSupport = ({ vendor }) => {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [activeTicket, setActiveTicket] = useState(null);
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({ title: "", description: "", category: "", priority: "medium" });
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const headers = getVendorHeaders();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await axios.get(`${API}/vendors/tickets/me${params}`, { headers });
      setTickets(res.data.tickets || []);
      setTotal(res.data.total || 0);
    } catch { toast.error("Failed to load tickets"); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { axios.get(`${API}/tickets/categories`).then(r => setCategories(r.data)).catch(() => {}); }, []);

  const openTicket = async (id) => {
    try {
      const res = await axios.get(`${API}/vendors/tickets/${id}`, { headers });
      setActiveTicket(res.data);
      setView("detail");
    } catch { toast.error("Failed to load ticket"); }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category) { toast.error("Fill all required fields"); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/vendors/tickets`, {
        ...form, attachments: attachments.map(a => typeof a === "string" ? a : a.url)
      }, { headers });
      toast.success("Ticket created!");
      setForm({ title: "", description: "", category: "", priority: "medium" });
      setAttachments([]);
      setView("list");
      fetchTickets();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSubmitting(false); }
  };

  const sendReply = async () => {
    if (!reply.trim() || !activeTicket) return;
    setSending(true);
    try {
      await axios.post(`${API}/vendors/tickets/${activeTicket.ticket_id}/reply`, { message: reply, attachments: [] }, { headers });
      toast.success("Reply sent");
      setReply("");
      openTicket(activeTicket.ticket_id);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSending(false); }
  };

  const reopenTicket = async () => {
    if (!activeTicket) return;
    try {
      await axios.put(`${API}/vendors/tickets/${activeTicket.ticket_id}/reopen`, {}, { headers });
      toast.success("Ticket reopened");
      openTicket(activeTicket.ticket_id);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const sBadge = (s) => {
    const m = { open: "bg-blue-500/20 text-blue-400", assigned: "bg-purple-500/20 text-purple-400", in_progress: "bg-yellow-500/20 text-yellow-400", waiting_for_user: "bg-orange-500/20 text-orange-400", resolved: "bg-green-500/20 text-green-400", closed: "bg-neutral-500/20 text-neutral-400" };
    return m[s] || "";
  };
  const pBadge = (p) => {
    const m = { high: "bg-red-500/20 text-red-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-green-500/20 text-green-400" };
    return m[p] || "";
  };

  if (view === "detail" && activeTicket) {
    const slaOver = activeTicket.sla_deadline && new Date() > new Date(activeTicket.sla_deadline) && !["resolved", "closed"].includes(activeTicket.status);
    return (
      <div className="space-y-4" data-testid="vendor-ticket-detail">
        <button onClick={() => { setView("list"); setActiveTicket(null); }} className="text-gold text-sm hover:underline flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </button>
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-mono text-xs text-neutral-500">{activeTicket.ticket_id}</span>
              <h3 className="text-xl font-bold text-white mt-1">{activeTicket.title}</h3>
            </div>
            <div className="flex gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${pBadge(activeTicket.priority)}`}>{activeTicket.priority}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${sBadge(activeTicket.status)}`}>{activeTicket.status.replace(/_/g, " ")}</span>
            </div>
          </div>
          <p className="text-sm text-neutral-300 mt-3">{activeTicket.description}</p>
          <div className="flex gap-4 mt-2 text-xs text-neutral-500">
            <span>Category: {activeTicket.category.replace(/_/g, " ")}</span>
            <span>Created: {new Date(activeTicket.created_at).toLocaleString()}</span>
            {activeTicket.assigned_name && <span>Agent: {activeTicket.assigned_name}</span>}
            {slaOver && <span className="text-red-400 font-medium">SLA Overdue</span>}
          </div>
        </div>

        <div className="space-y-2">
          {activeTicket.replies?.map(r => (
            <div key={r.reply_id} className={`p-3 rounded-lg border ${r.sender_type === "support" ? "bg-gold/5 border-gold/20 ml-6" : "bg-neutral-800/50 border-neutral-700 mr-6"}`}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-white">{r.sender_name} <span className="text-neutral-500 text-xs">({r.sender_type})</span></span>
                <span className="text-xs text-neutral-500">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-neutral-300 whitespace-pre-wrap">{r.message}</p>
            </div>
          ))}
          {(!activeTicket.replies || activeTicket.replies.length === 0) && <p className="text-sm text-neutral-500 text-center py-4">No replies yet</p>}
        </div>

        {["resolved", "closed"].includes(activeTicket.status) ? (
          <div className="border border-neutral-700 rounded-xl p-4 text-center">
            <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-neutral-400 mb-3">Ticket {activeTicket.status}</p>
            <Button size="sm" variant="outline" onClick={reopenTicket} className="text-white border-neutral-600" data-testid="vendor-reopen-btn">Reopen</Button>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type reply..."
              rows={2} className="flex-1 bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm resize-none" data-testid="vendor-reply-input" />
            <Button onClick={sendReply} disabled={sending} className="bg-gold text-black" data-testid="vendor-reply-send">
              <Send className="h-4 w-4 mr-1" /> Send
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="space-y-4" data-testid="vendor-create-ticket">
        <button onClick={() => setView("list")} className="text-gold text-sm hover:underline flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="font-serif text-xl font-bold text-white">New Support Ticket</h2>
        <form onSubmit={createTicket} className="space-y-4">
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Title *</label>
            <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              className="bg-neutral-900 border-neutral-700 text-white" placeholder="Describe your issue" data-testid="vendor-ticket-title" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Category *</label>
              <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full h-10 px-3 bg-neutral-900 border border-neutral-700 text-white rounded-md text-sm" data-testid="vendor-ticket-category">
                <option value="">Select</option>
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Priority</label>
              <select value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full h-10 px-3 bg-neutral-900 border border-neutral-700 text-white rounded-md text-sm" data-testid="vendor-ticket-priority">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Description *</label>
            <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              rows={4} className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-md px-3 py-2 text-sm resize-none" data-testid="vendor-ticket-description" />
          </div>
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Attachments</label>
            <MediaUploader value={attachments} onChange={setAttachments} maxFiles={5} userId={vendor.vendor_id} />
          </div>
          <Button type="submit" disabled={submitting} className="bg-gold text-black" data-testid="vendor-submit-ticket">
            {submitting ? "Submitting..." : "Submit Ticket"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="vendor-support-page">
      <div className="flex justify-between items-center">
        <h2 className="font-serif text-xl font-bold text-white">Support Tickets</h2>
        <Button className="bg-gold text-black" size="sm" onClick={() => setView("create")} data-testid="vendor-new-ticket-btn">
          <Plus className="h-4 w-4 mr-1" /> New Ticket
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["", "open", "in_progress", "waiting_for_user", "resolved", "closed"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${statusFilter === s ? "bg-gold text-black border-gold" : "border-neutral-700 text-neutral-400 hover:border-neutral-500"}`}>
            {s ? s.replace(/_/g, " ") : "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold mx-auto" /></div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-700 rounded-xl">
          <LifeBuoy className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-400">No tickets yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <div key={t.ticket_id} onClick={() => openTicket(t.ticket_id)}
              className="border border-neutral-700 rounded-xl p-4 hover:border-neutral-500 cursor-pointer transition-colors"
              data-testid={`vendor-ticket-${t.ticket_id}`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs text-neutral-500">{t.ticket_id}</span>
                  <h4 className="text-white font-medium mt-0.5">{t.title}</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">{t.category.replace(/_/g, " ")} - {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${pBadge(t.priority)}`}>{t.priority}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${sBadge(t.status)}`}>{t.status.replace(/_/g, " ")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ===== VENDOR RETURNS =====
const VendorReturns = ({ vendor }) => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const headers = getVendorHeaders();

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus ? `?status=${filterStatus}` : "";
      const res = await axios.get(`${API}/vendors/returns${params}`, { headers });
      setReturns(res.data || []);
    } catch { toast.error("Failed to load returns"); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  const approveReturn = async (returnId) => {
    try {
      await axios.put(`${API}/vendors/returns/${returnId}/approve`, {}, { headers });
      toast.success("Return approved");
      fetchReturns();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const rejectReturn = async (returnId) => {
    try {
      await axios.put(`${API}/vendors/returns/${returnId}/reject`, {}, { headers });
      toast.success("Return rejected");
      fetchReturns();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const sendMessage = async (returnId) => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/vendors/returns/${returnId}/message`, { message: reply, attachments: [] }, { headers });
      toast.success("Message sent");
      setReply("");
      fetchReturns();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSending(false); }
  };

  const sBadge = (s) => {
    const m = { requested: "bg-blue-500/20 text-blue-400", vendor_approved: "bg-green-500/20 text-green-400", vendor_rejected: "bg-red-500/20 text-red-400", disputed: "bg-orange-500/20 text-orange-400", refunded: "bg-emerald-500/20 text-emerald-400", closed: "bg-neutral-500/20 text-neutral-400" };
    return m[s] || "bg-neutral-500/20 text-neutral-400";
  };

  if (selected) {
    return (
      <div className="space-y-4" data-testid="vendor-return-detail">
        <button onClick={() => setSelected(null)} className="text-gold text-sm hover:underline flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-mono text-xs text-neutral-500">{selected.return_id}</span>
              <h3 className="text-lg font-bold text-white mt-1">Order: {selected.order_id}</h3>
              <p className="text-sm text-neutral-400">Customer: {selected.user_name}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full uppercase ${sBadge(selected.status)}`}>{selected.status.replace(/_/g, " ")}</span>
          </div>
          <p className="text-sm text-neutral-300 mt-3">{selected.description}</p>
          <p className="text-xs text-neutral-500 mt-1">Reason: {selected.reason?.replace(/_/g, " ")} | Amount: Rs. {selected.refund_amount?.toLocaleString()}</p>
        </div>

        {selected.status === "requested" && (
          <div className="flex gap-3">
            <Button className="bg-green-600 text-white" onClick={() => approveReturn(selected.return_id)} data-testid="vendor-approve-return">
              <CheckCircle className="h-4 w-4 mr-1" /> Approve Return
            </Button>
            <Button variant="outline" className="text-red-400 border-red-500/30" onClick={() => rejectReturn(selected.return_id)} data-testid="vendor-reject-return">
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {selected.messages?.map((m, i) => (
            <div key={i} className={`p-3 rounded-lg border ${m.sender_type === "vendor" ? "bg-gold/5 border-gold/20 ml-6" : "bg-neutral-800/50 border-neutral-700 mr-6"}`}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-white">{m.sender_name} ({m.sender_type})</span>
                <span className="text-xs text-neutral-500">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-neutral-300">{m.message}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 items-end">
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Message customer..."
            rows={2} className="flex-1 bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm resize-none" data-testid="vendor-return-reply" />
          <Button onClick={() => sendMessage(selected.return_id)} disabled={sending} className="bg-gold text-black" data-testid="vendor-return-send">
            <Send className="h-4 w-4 mr-1" /> Send
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="vendor-returns-page">
      <h2 className="font-serif text-xl font-bold text-white">Return Requests</h2>

      <div className="flex gap-2 flex-wrap">
        {["", "requested", "vendor_approved", "vendor_rejected", "disputed"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterStatus === s ? "bg-gold text-black border-gold" : "border-neutral-700 text-neutral-400"}`}>
            {s ? s.replace(/_/g, " ") : "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold mx-auto" /></div>
      ) : returns.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-700 rounded-xl">
          <Package className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-400">No return requests</p>
        </div>
      ) : (
        <div className="space-y-2">
          {returns.map(r => (
            <div key={r.return_id} onClick={() => setSelected(r)}
              className={`border border-neutral-700 rounded-xl p-4 hover:border-neutral-500 cursor-pointer transition-colors ${r.status === "disputed" ? "border-orange-500/30" : ""}`}
              data-testid={`vendor-return-${r.return_id}`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs text-neutral-500">{r.return_id}</span>
                  <p className="text-white font-medium mt-0.5">Order: {r.order_id}</p>
                  <p className="text-xs text-neutral-500">{r.user_name} - {r.reason?.replace(/_/g, " ")}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${sBadge(r.status)}`}>{r.status.replace(/_/g, " ")}</span>
                  <span className="text-xs text-neutral-500">Rs. {r.refund_amount?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

