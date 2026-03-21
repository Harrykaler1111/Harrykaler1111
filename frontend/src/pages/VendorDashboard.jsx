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
  Upload, CheckCircle, XCircle, Clock, AlertCircle, AlertTriangle, IndianRupee
} from "lucide-react";

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
    navigate("/vendor-login");
  };

  if (loading) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold" /></div>;
  if (!vendor) return null;

  const navItems = [
    { path: "/vendor", icon: LayoutDashboard, label: "Overview" },
    { path: "/vendor/products", icon: Package, label: "Products" },
    { path: "/vendor/orders", icon: ShoppingCart, label: "Orders" },
    { path: "/vendor/wallet", icon: Wallet, label: "Wallet" },
    { path: "/vendor/offers", icon: Tag, label: "Offers" },
    { path: "/vendor/influencers", icon: Users, label: "Influencers" },
  ];

  if (vendor.kyc_status !== "approved") {
    navItems.splice(1, 0, { path: "/vendor/kyc", icon: FileText, label: "KYC" });
  }

  const isActive = (path) => location.pathname === path;
  const statusColor = { pending: "text-yellow-400", kyc_submitted: "text-blue-400", approved: "text-green-400", rejected: "text-red-400", suspended: "text-red-500" };

  return (
    <div className="min-h-screen bg-neutral-900 text-white" data-testid="vendor-dashboard">
      <div className="flex">
        <aside className="hidden md:flex flex-col w-64 min-h-screen bg-neutral-950 border-r border-neutral-800 p-4 fixed left-0 top-0">
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
            <Route path="orders" element={<VendorOrders vendor={vendor} />} />
            <Route path="wallet" element={<VendorWallet vendor={vendor} />} />
            <Route path="offers" element={<VendorOffers vendor={vendor} />} />
            <Route path="influencers" element={<VendorInfluencers vendor={vendor} />} />
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
  const [form, setForm] = useState({
    name: "", description: "", price: "", compare_price: "", category: "",
    sizes: "", colors: "", images: "", stock: "", tags: "", is_limited_edition: false
  });
  const [creating, setCreating] = useState(false);

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
        images: form.images ? form.images.split(",").map(s => s.trim()) : [],
        tags: form.tags ? form.tags.split(",").map(s => s.trim()) : [],
      };
      await axios.post(`${API}/vendors/products`, payload, { headers: getVendorHeaders() });
      toast.success("Product submitted for approval!");
      setShowForm(false);
      setForm({ name: "", description: "", price: "", compare_price: "", category: "", sizes: "", colors: "", images: "", stock: "", tags: "", is_limited_edition: false });
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

  const statusBadge = (s) => {
    const map = { approved: "bg-green-500/20 text-green-400", pending_approval: "bg-yellow-500/20 text-yellow-400", rejected: "bg-red-500/20 text-red-400", draft: "bg-neutral-500/20 text-neutral-400", delisted: "bg-neutral-600/20 text-neutral-500" };
    return map[s] || map.draft;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-2xl font-bold text-white">My Products</h2>
        {vendor.status === "approved" && (
          <Button className="bg-gold text-black hover:bg-gold/90" onClick={() => setShowForm(!showForm)} data-testid="add-product-btn">
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        )}
      </div>

      {vendor.status !== "approved" && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
          <p className="text-yellow-300 text-sm">Your vendor account must be approved to add products.</p>
        </div>
      )}

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Product</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm text-neutral-400 mb-1 block">Product Name *</label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required data-testid="product-name" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-neutral-400 mb-1 block">Description *</label>
              <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 text-white rounded-md resize-none" rows={2} required data-testid="product-desc" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Price *</label>
              <Input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required data-testid="product-price" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Compare Price</label>
              <Input type="number" value={form.compare_price} onChange={(e) => setForm({...form, compare_price: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Category *</label>
              <Input value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required data-testid="product-category" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Stock *</label>
              <Input type="number" value={form.stock} onChange={(e) => setForm({...form, stock: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required data-testid="product-stock" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Sizes (comma separated)</label>
              <Input value={form.sizes} onChange={(e) => setForm({...form, sizes: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" placeholder="S, M, L, XL" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Colors (comma separated)</label>
              <Input value={form.colors} onChange={(e) => setForm({...form, colors: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" placeholder="Black, White" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-neutral-400 mb-1 block">Image URLs (comma separated)</label>
              <Input value={form.images} onChange={(e) => setForm({...form, images: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" placeholder="https://..." />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button type="submit" disabled={creating} className="bg-gold text-black hover:bg-gold/90" data-testid="submit-product-btn">
                {creating ? "Submitting..." : "Submit for Approval"}
              </Button>
              <Button type="button" variant="outline" className="border-neutral-600 text-neutral-300" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </motion.div>
      )}

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
                <TableCell className="text-white">{p.name}</TableCell>
                <TableCell className="text-neutral-300">{p.category}</TableCell>
                <TableCell className="text-gold">{p.price?.toLocaleString()}</TableCell>
                <TableCell className={p.stock < 10 ? "text-red-400" : "text-neutral-300"}>{p.stock}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded capitalize ${statusBadge(p.approval_status)}`}>{p.approval_status?.replace("_", " ")}</span>
                  {p.rejection_reason && <p className="text-xs text-red-400 mt-1">{p.rejection_reason}</p>}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteProduct(p.product_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
        {!loading && products.length === 0 && <div className="text-center py-12 text-neutral-500">No products yet. Add your first product!</div>}
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/vendors/wallet/balance`, { headers: getVendorHeaders() }),
      axios.get(`${API}/vendors/wallet/transactions`, { headers: getVendorHeaders() }),
      axios.get(`${API}/vendors/withdrawals`, { headers: getVendorHeaders() })
    ]).then(([b, t, w]) => {
      setBalance(b.data);
      setTransactions(t.data);
      setWithdrawals(w.data);
    }).catch(() => toast.error("Failed to load wallet"))
      .finally(() => setLoading(false));
  }, []);

  const requestWithdrawal = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 1000) { toast.error("Minimum withdrawal is Rs. 1,000"); return; }
    try {
      await axios.post(`${API}/vendors/wallet/withdraw`, { amount: amt }, { headers: getVendorHeaders() });
      toast.success("Withdrawal request submitted!");
      setWithdrawAmount("");
      const [b, w] = await Promise.all([
        axios.get(`${API}/vendors/wallet/balance`, { headers: getVendorHeaders() }),
        axios.get(`${API}/vendors/withdrawals`, { headers: getVendorHeaders() })
      ]);
      setBalance(b.data);
      setWithdrawals(w.data);
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

// =============== INFLUENCERS ===============
const VendorInfluencers = ({ vendor }) => {
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/vendors/influencers/browse`, { headers: getVendorHeaders() })
      .then(res => setInfluencers(res.data))
      .catch(() => toast.error("Failed to load influencers"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-6">Browse Influencers</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {influencers.map((inf) => (
          <div key={inf.influencer_id} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-gold" />
              </div>
              <div>
                <h3 className="text-white font-medium">{inf.name}</h3>
                {inf.instagram_handle && <p className="text-xs text-neutral-400">@{inf.instagram_handle}</p>}
              </div>
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
        ))}
      </div>
      {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
      {!loading && influencers.length === 0 && <div className="text-center py-12 text-neutral-500">No approved influencers available</div>}
    </div>
  );
};
