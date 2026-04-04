import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Link2, Wallet, TrendingUp, Copy, ExternalLink,
  LogOut, MousePointerClick, ShoppingCart, DollarSign, Clock,
  Search, Check, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import axios from "axios";
import { normalizeImageUrl, handleImageError } from "@/utils/imageUtils";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const getHeaders = () => {
  const token = localStorage.getItem("pigma_token");
  return { Authorization: `Bearer ${token}` };
};

export const ResellerDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState([]);
  const [linksTotal, setLinksTotal] = useState(0);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [generatingId, setGeneratingId] = useState("");
  const [margins, setMargins] = useState({});
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("pigma_token");
    if (!token) { navigate("/auth"); return; }
    fetchProfile();
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/resellers/me`, { headers: getHeaders() });
      setProfile(res.data);
    } catch {
      toast.error("Not registered as reseller");
      navigate("/reseller-register");
    } finally { setLoading(false); }
  };

  const fetchLinks = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/resellers/my-links?limit=50`, { headers: getHeaders() });
      setLinks(res.data.links || []);
      setLinksTotal(res.data.total || 0);
    } catch { /* ignore */ }
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const [balRes, txRes] = await Promise.all([
        axios.get(`${API}/resellers/wallet/balance`, { headers: getHeaders() }),
        axios.get(`${API}/resellers/wallet/transactions`, { headers: getHeaders() })
      ]);
      setWallet(balRes.data);
      setTransactions(txRes.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (profile?.status === "approved") {
      if (tab === "links" || tab === "search") fetchLinks();
      if (tab === "wallet") fetchWallet();
    }
  }, [tab, profile, fetchLinks, fetchWallet]);

  const searchProducts = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await axios.get(`${API}/products?search=${encodeURIComponent(searchQuery)}&limit=10`);
      setSearchResults(res.data || []);
    } catch { toast.error("Search failed"); }
    finally { setSearching(false); }
  };

  const generateLink = async (productId, price) => {
    const margin = margins[productId] || 0;
    setGeneratingId(productId);
    try {
      const res = await axios.post(`${API}/resellers/generate-link`,
        { product_id: productId, margin }, { headers: getHeaders() });
      toast.success(`Link generated! Selling at ₹${res.data.reseller_price}`);
      fetchLinks();
      setSearchResults(prev => prev.map(p =>
        p.product_id === productId ? { ...p, _generated: res.data.reseller_link, _price: res.data.reseller_price, _margin: margin } : p
      ));
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setGeneratingId(""); }
  };

  const copyLink = (link, id) => {
    navigator.clipboard.writeText(link);
    setCopied(id);
    toast.success("Copied!");
    setTimeout(() => setCopied(""), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem("pigma_token");
    localStorage.removeItem("pigma_user");
    toast.success("Logged out");
    navigate("/");
  };

  if (loading) return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold" />
    </div>
  );

  if (!profile) return null;

  const isPending = profile.status === "pending";
  const isSuspended = ["suspended", "disconnected", "discontinued"].includes(profile.status);
  const isApproved = profile.status === "approved";

  const tabs = [
    { id: "overview", icon: <LayoutDashboard className="h-4 w-4" />, label: "Overview" },
    { id: "links", icon: <Link2 className="h-4 w-4" />, label: "My Links" },
    { id: "search", icon: <Search className="h-4 w-4" />, label: "Find Products" },
    { id: "wallet", icon: <Wallet className="h-4 w-4" />, label: "Wallet" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white" data-testid="reseller-dashboard">
      {/* Top Bar */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-xl font-bold text-gold tracking-wider">PIGMA</h1>
          <span className="text-neutral-500 text-sm">Reseller Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-400">{profile.name}</span>
          <Badge variant="outline" className={`text-xs ${
            isApproved ? "border-green-500 text-green-400" :
            isPending ? "border-yellow-500 text-yellow-400" :
            "border-red-500 text-red-400"
          }`}>{profile.status}</Badge>
          <Link to="/" className="text-neutral-400 hover:text-white text-sm">Shop</Link>
          <Button variant="ghost" size="sm" className="text-red-400" onClick={handleLogout} data-testid="reseller-logout-btn">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Status Banners */}
        {isPending && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">Account Pending Approval</p>
              <p className="text-sm text-neutral-400">Your application is under review.</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-neutral-800 pb-4 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              disabled={t.id !== "overview" && !isApproved}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                tab === t.id ? "bg-gold text-black font-medium" :
                !isApproved && t.id !== "overview" ? "text-neutral-600 cursor-not-allowed" :
                "text-neutral-400 hover:bg-neutral-800"
              }`} data-testid={`reseller-tab-${t.id}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: <Link2 className="h-5 w-5 text-blue-400" />, label: "Links Generated", value: linksTotal || profile.total_clicks || 0, bg: "bg-blue-500/10" },
                { icon: <MousePointerClick className="h-5 w-5 text-purple-400" />, label: "Total Clicks", value: profile.total_clicks || 0, bg: "bg-purple-500/10" },
                { icon: <ShoppingCart className="h-5 w-5 text-green-400" />, label: "Conversions", value: profile.total_conversions || 0, bg: "bg-green-500/10" },
                { icon: <DollarSign className="h-5 w-5 text-gold" />, label: "Total Earnings", value: `₹${(profile.total_earnings || 0).toLocaleString()}`, bg: "bg-gold/10" },
              ].map(s => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>{s.icon}</div>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-neutral-500">{s.label}</p>
                </motion.div>
              ))}
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">Your Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-neutral-400">Name:</span> <span className="text-white ml-2">{profile.name}</span></div>
                <div><span className="text-neutral-400">Email:</span> <span className="text-white ml-2">{profile.email}</span></div>
                <div><span className="text-neutral-400">Referral Code:</span> <span className="text-gold ml-2 font-mono">{profile.referral_code}</span></div>
                <div><span className="text-neutral-400">Commission:</span> <span className="text-white ml-2">{profile.commission_rate}%</span></div>
                <div><span className="text-neutral-400">Joined:</span> <span className="text-white ml-2">{new Date(profile.created_at).toLocaleDateString()}</span></div>
              </div>
            </div>

            {isApproved && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 text-center">
                <p className="text-sm text-green-300">Browse any product page and click "Sell this Product" to generate your reseller link</p>
                <Link to="/" className="inline-flex items-center gap-1 mt-2 text-gold text-sm hover:underline">
                  Browse Products <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* My Links */}
        {tab === "links" && (
          <div className="space-y-3" data-testid="reseller-my-links">
            <p className="text-sm text-neutral-400">{linksTotal} product links generated</p>
            {links.length === 0 ? (
              <div className="text-center py-16 text-neutral-500">
                <Link2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No links generated yet</p>
                <p className="text-sm mt-1">Go to any product page or use Search to generate your first reseller link</p>
              </div>
            ) : (
              <div className="space-y-2">
                {links.map(l => (
                  <div key={l.product_id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center gap-3" data-testid={`res-link-${l.product_id}`}>
                    {l.product_image && <img src={l.product_image} alt="" className="w-12 h-12 rounded object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{l.product_name}</p>
                      <div className="flex items-center gap-3 text-xs mt-0.5">
                        <span className="text-neutral-400">Base: ₹{l.product_price?.toLocaleString()}</span>
                        <span className="text-gold">+₹{l.margin} margin</span>
                        <span className="text-green-400 font-medium">Sell: ₹{l.reseller_price?.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => copyLink(l.reseller_link, l.product_id)}
                        className="p-2 rounded-lg hover:bg-neutral-800 transition-colors" data-testid={`copy-res-${l.product_id}`}>
                        {copied === l.product_id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-neutral-400" />}
                      </button>
                      <Link to={`/product/${l.product_id}`} className="p-2 rounded-lg hover:bg-neutral-800 transition-colors">
                        <ExternalLink className="h-4 w-4 text-neutral-400" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Products */}
        {tab === "search" && (
          <div className="space-y-4" data-testid="reseller-search">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchProducts()}
                  placeholder="Search products to sell..."
                  className="bg-neutral-900 border-neutral-700 text-white pl-10" data-testid="res-search-input" />
              </div>
              <Button onClick={searchProducts} disabled={searching} className="bg-gold text-black hover:bg-gold/80" data-testid="res-search-btn">
                {searching ? "..." : "Search"}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map(p => (
                  <div key={p.product_id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3" data-testid={`res-search-${p.product_id}`}>
                    <div className="flex items-center gap-3">
                      {p.images?.[0] && <img src={normalizeImageUrl(p.images[0])} alt="" className="w-12 h-12 rounded object-cover shrink-0" onError={handleImageError} />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{p.name}</p>
                        <p className="text-xs text-neutral-400">₹{p.price?.toLocaleString()} | {p.category}</p>
                      </div>
                      {p._generated ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-green-400">₹{p._price}</span>
                          <button onClick={() => copyLink(p._generated, `s_${p.product_id}`)} className="p-2 rounded-lg hover:bg-neutral-800">
                            {copied === `s_${p.product_id}` ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-green-400" />}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-neutral-500">+₹</span>
                            <Input type="number" min="0" placeholder="0" value={margins[p.product_id] || ""}
                              onChange={e => setMargins(prev => ({ ...prev, [p.product_id]: parseFloat(e.target.value) || 0 }))}
                              className="bg-neutral-800 border-neutral-700 text-white h-7 w-16 text-xs" data-testid={`margin-${p.product_id}`} />
                          </div>
                          <Button size="sm" onClick={() => generateLink(p.product_id, p.price)}
                            disabled={generatingId === p.product_id}
                            className="bg-green-600 text-white text-xs h-7 shrink-0" data-testid={`gen-res-${p.product_id}`}>
                            <DollarSign className="h-3 w-3 mr-1" />
                            {generatingId === p.product_id ? "..." : "Sell"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Wallet Tab */}
        {tab === "wallet" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: <Wallet className="h-5 w-5 text-gold" />, label: "Balance", value: `₹${(wallet?.wallet_balance || 0).toLocaleString()}`, bg: "bg-gold/10" },
                { icon: <TrendingUp className="h-5 w-5 text-green-400" />, label: "Total Earnings", value: `₹${(wallet?.total_earnings || 0).toLocaleString()}`, bg: "bg-green-500/10" },
                { icon: <DollarSign className="h-5 w-5 text-blue-400" />, label: "Min Withdrawal", value: `₹${(wallet?.min_withdrawal_amount || 0).toLocaleString()}`, bg: "bg-blue-500/10" },
              ].map(s => (
                <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>{s.icon}</div>
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-neutral-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-neutral-800">
                <h3 className="font-semibold text-white">Transaction History</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-800">
                    <TableHead className="text-neutral-400">Date</TableHead>
                    <TableHead className="text-neutral-400">Type</TableHead>
                    <TableHead className="text-neutral-400">Amount</TableHead>
                    <TableHead className="text-neutral-400">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t, i) => (
                    <TableRow key={i} className="border-neutral-800">
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
