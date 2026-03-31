import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Link2, Wallet, TrendingUp, Copy, ExternalLink,
  LogOut, MousePointerClick, ShoppingCart, DollarSign, Clock,
  Package, Share2, Edit3, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const getHeaders = () => {
  const token = localStorage.getItem("pigma_token");
  return { Authorization: `Bearer ${token}` };
};

const StatCard = ({ icon, label, value, bg }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
    <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>{icon}</div>
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-sm text-neutral-400">{label}</p>
  </motion.div>
);

// Product card for reseller with margin control + share link
const ResellerProductCard = ({ product, onMarginSave }) => {
  const [editing, setEditing] = useState(false);
  const [margin, setMargin] = useState(product.margin || 0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onMarginSave(product.product_id, margin);
    setSaving(false);
    setEditing(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(product.share_link);
    toast.success("Link copied!");
  };

  return (
    <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden" data-testid={`reseller-product-${product.product_id}`}>
      <div className="aspect-square bg-neutral-900 relative overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            <Package className="h-10 w-10" />
          </div>
        )}
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-red-400 font-bold text-sm">Out of Stock</span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <p className="text-sm font-medium text-white truncate">{product.name}</p>
        <p className="text-xs text-neutral-500">{product.category}</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-400">Base Price</p>
            <p className="text-sm font-bold text-white">₹{product.price?.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-400">Your Price</p>
            <p className="text-sm font-bold text-green-400">₹{product.reseller_price?.toLocaleString()}</p>
          </div>
        </div>

        {/* Margin Control */}
        <div className="bg-neutral-900 rounded-lg p-2">
          {editing ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 whitespace-nowrap">Margin ₹</span>
              <Input type="number" min="0" value={margin} onChange={e => setMargin(parseFloat(e.target.value) || 0)}
                className="bg-neutral-800 border-neutral-600 text-white h-7 text-xs" data-testid="margin-input" />
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-green-600 text-white h-7 px-2 text-xs" data-testid="margin-save">
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">Margin: <span className="text-gold font-medium">₹{product.margin || 0}</span></span>
              <button onClick={() => setEditing(true)} className="text-neutral-500 hover:text-gold transition-colors" data-testid="margin-edit">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Share Link */}
        <div className="flex gap-1.5">
          <Button size="sm" className="flex-1 bg-gold/10 text-gold hover:bg-gold/20 h-8 text-xs" onClick={copyLink} data-testid="copy-product-link">
            <Copy className="h-3 w-3 mr-1" /> Copy Link
          </Button>
          <a href={product.share_link} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost" className="text-neutral-400 h-8 px-2"><ExternalLink className="h-3 w-3" /></Button>
          </a>
        </div>
      </div>
    </div>
  );
};

export const ResellerDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState([]);
  const [products, setProducts] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("pigma_token");
    if (!token) { navigate("/auth"); return; }
    fetchProfile();
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/resellers/me`, { headers: getHeaders() });
      setProfile(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error("You are not registered as a reseller");
        navigate("/reseller-register");
      } else {
        toast.error("Failed to load profile");
      }
    } finally { setLoading(false); }
  };

  const fetchLinks = async () => {
    try {
      const res = await axios.get(`${API}/resellers/referral-links`, { headers: getHeaders() });
      setLinks(res.data);
    } catch { toast.error("Failed to load referral links"); }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/resellers/products`, { headers: getHeaders() });
      setProducts(res.data);
    } catch { toast.error("Failed to load products"); }
  };

  const fetchWallet = async () => {
    try {
      const [balRes, txRes] = await Promise.all([
        axios.get(`${API}/resellers/wallet/balance`, { headers: getHeaders() }),
        axios.get(`${API}/resellers/wallet/transactions`, { headers: getHeaders() })
      ]);
      setWallet(balRes.data);
      setTransactions(txRes.data);
    } catch { toast.error("Failed to load wallet"); }
  };

  useEffect(() => {
    if (profile?.status === "approved") {
      if (tab === "links") fetchLinks();
      if (tab === "products") fetchProducts();
      if (tab === "wallet") fetchWallet();
    }
  }, [tab, profile]);

  const handleMarginSave = async (productId, margin) => {
    try {
      const res = await axios.put(`${API}/resellers/product-margin`, { product_id: productId, margin }, { headers: getHeaders() });
      toast.success(`Margin set to ₹${margin}. Your price: ₹${res.data.reseller_price}`);
      setProducts(prev => prev.map(p => p.product_id === productId ? { ...p, margin, reseller_price: res.data.reseller_price } : p));
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to update margin"); }
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copied!");
  };

  const handleLogout = () => {
    localStorage.removeItem("pigma_token");
    localStorage.removeItem("pigma_user");
    toast.success("Logged out");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!profile) return null;

  const tabs = [
    { id: "overview", icon: <LayoutDashboard className="h-4 w-4" />, label: "Overview" },
    { id: "products", icon: <Package className="h-4 w-4" />, label: "Products" },
    { id: "links", icon: <Link2 className="h-4 w-4" />, label: "Referral Links" },
    { id: "wallet", icon: <Wallet className="h-4 w-4" />, label: "Wallet" },
  ];

  const isPending = profile.status === "pending";
  const isSuspended = ["suspended", "disconnected", "discontinued"].includes(profile.status);

  return (
    <div className="min-h-screen bg-neutral-900 text-white" data-testid="reseller-dashboard">
      {/* Top Bar */}
      <div className="bg-neutral-950 border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-xl font-bold text-gold tracking-wider">PIGMA</h1>
          <span className="text-neutral-500 text-sm">Reseller Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-400">{profile.name}</span>
          <Badge variant="outline" className={`text-xs ${
            profile.status === "approved" ? "border-green-500 text-green-400" :
            isPending ? "border-yellow-500 text-yellow-400" :
            "border-red-500 text-red-400"
          }`}>{profile.status}</Badge>
          <Button variant="ghost" size="sm" className="text-red-400" onClick={handleLogout} data-testid="reseller-logout-btn">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Status Banners */}
        {isPending && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">Account Pending Approval</p>
              <p className="text-sm text-neutral-400">Your reseller application is under review. You'll be notified once approved.</p>
            </div>
          </div>
        )}
        {isSuspended && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-red-400" />
            <div>
              <p className="font-medium text-red-300">Account {profile.status}</p>
              <p className="text-sm text-neutral-400">Your reseller account has been {profile.status}. Please contact support.</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-neutral-800 pb-4 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              disabled={t.id !== "overview" && (isPending || isSuspended)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                tab === t.id ? "bg-gold text-black font-medium" :
                (isPending || isSuspended) && t.id !== "overview"
                  ? "text-neutral-600 cursor-not-allowed"
                  : "text-neutral-400 hover:bg-neutral-800"
              }`} data-testid={`reseller-tab-${t.id}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<MousePointerClick className="h-5 w-5 text-blue-400" />} label="Total Clicks" value={profile.total_clicks || 0} bg="bg-blue-500/10" />
              <StatCard icon={<ShoppingCart className="h-5 w-5 text-green-400" />} label="Conversions" value={profile.total_conversions || 0} bg="bg-green-500/10" />
              <StatCard icon={<DollarSign className="h-5 w-5 text-gold" />} label="Total Earnings" value={`₹${(profile.total_earnings || 0).toLocaleString()}`} bg="bg-gold/10" />
              <StatCard icon={<Wallet className="h-5 w-5 text-purple-400" />} label="Wallet Balance" value={`₹${(profile.wallet_balance || 0).toLocaleString()}`} bg="bg-purple-500/10" />
            </div>

            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">Your Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-neutral-400">Name:</span> <span className="text-white ml-2">{profile.name}</span></div>
                <div><span className="text-neutral-400">Email:</span> <span className="text-white ml-2">{profile.email}</span></div>
                <div><span className="text-neutral-400">Referral Code:</span> <span className="text-gold ml-2 font-mono">{profile.referral_code}</span></div>
                <div><span className="text-neutral-400">Commission Rate:</span> <span className="text-white ml-2">{profile.commission_rate}%</span></div>
                <div><span className="text-neutral-400">Bio:</span> <span className="text-white ml-2">{profile.bio || "Not set"}</span></div>
                <div><span className="text-neutral-400">Joined:</span> <span className="text-white ml-2">{new Date(profile.created_at).toLocaleDateString()}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab (Meesho-style) */}
        {tab === "products" && (
          <div className="space-y-4" data-testid="reseller-products-tab">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold text-white">Sell Products</h2>
              <p className="text-xs text-neutral-400">{products.length} products available</p>
            </div>
            <p className="text-sm text-neutral-400">Set your margin on each product. Share your unique link and earn on every sale.</p>
            {products.length === 0 ? (
              <p className="text-neutral-500 text-center py-12">No products available</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(p => (
                  <ResellerProductCard key={p.product_id} product={p} onMarginSave={handleMarginSave} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Referral Links Tab */}
        {tab === "links" && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-white mb-6">Your Referral Links</h2>
            <div className="space-y-3">
              {links.map((l, i) => (
                <div key={i} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="text-white font-medium">{l.product_name}</p>
                    <p className="text-xs text-neutral-400 font-mono truncate">{l.link}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="border-gold text-gold" onClick={() => copyLink(l.link)} data-testid={`copy-link-${i}`}>
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                    <a href={l.link} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost" className="text-neutral-400"><ExternalLink className="h-3 w-3" /></Button>
                    </a>
                  </div>
                </div>
              ))}
              {links.length === 0 && <p className="text-neutral-500 text-center py-8">No referral links available</p>}
            </div>
          </div>
        )}

        {/* Wallet Tab */}
        {tab === "wallet" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard icon={<Wallet className="h-5 w-5 text-gold" />} label="Wallet Balance" value={`₹${(wallet?.wallet_balance || 0).toLocaleString()}`} bg="bg-gold/10" />
              <StatCard icon={<TrendingUp className="h-5 w-5 text-green-400" />} label="Total Earnings" value={`₹${(wallet?.total_earnings || 0).toLocaleString()}`} bg="bg-green-500/10" />
              <StatCard icon={<DollarSign className="h-5 w-5 text-blue-400" />} label="Min Withdrawal" value={`₹${(wallet?.min_withdrawal_amount || 0).toLocaleString()}`} bg="bg-blue-500/10" />
            </div>

            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-neutral-700">
                <h3 className="font-semibold text-white">Transaction History</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-700">
                    <TableHead className="text-neutral-400">Date</TableHead>
                    <TableHead className="text-neutral-400">Type</TableHead>
                    <TableHead className="text-neutral-400">Amount</TableHead>
                    <TableHead className="text-neutral-400">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t, i) => (
                    <TableRow key={i} className="border-neutral-700">
                      <TableCell className="text-neutral-400 text-sm">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><span className="capitalize text-neutral-300 text-sm">{t.type}</span></TableCell>
                      <TableCell className={t.type === "credit" || t.type === "commission" ? "text-green-400" : "text-red-400"}>
                        {t.type === "credit" || t.type === "commission" ? "+" : "-"}₹{t.amount?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-neutral-400 text-sm">{t.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {transactions.length === 0 && <p className="text-neutral-500 text-center py-8">No transactions yet</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
