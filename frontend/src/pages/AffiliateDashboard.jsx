import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Link2, TrendingUp, DollarSign, Copy, Globe,
  ArrowRight, Check, Clock, Search, ExternalLink,
  MousePointerClick, ShoppingCart, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const AffiliateDashboard = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [affiliate, setAffiliate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [links, setLinks] = useState([]);
  const [linksTotal, setLinksTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState("");
  const [copied, setCopied] = useState("");
  const [tab, setTab] = useState("links");

  const [formData, setFormData] = useState({
    company_name: "",
    website: "",
    marketing_channels: ""
  });

  useEffect(() => {
    if (!user || !token) { navigate("/auth?type=affiliate"); return; }
    fetchProfile();
  }, [user, token, navigate]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/affiliates/me`, { headers: { Authorization: `Bearer ${token}` } });
      setAffiliate(res.data);
      if (res.data.status === "approved") fetchLinks();
    } catch { /* not registered */ }
    finally { setLoading(false); }
  };

  const fetchLinks = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/affiliates/my-links?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      setLinks(res.data.links || []);
      setLinksTotal(res.data.total || 0);
    } catch { /* ignore */ }
  }, [token]);

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);
    try {
      const res = await axios.post(`${API}/affiliates/apply`, formData, { headers: { Authorization: `Bearer ${token}` } });
      setAffiliate(res.data);
      toast.success("Application submitted!");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setApplying(false); }
  };

  const searchProducts = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await axios.get(`${API}/products?search=${encodeURIComponent(searchQuery)}&limit=10`);
      setSearchResults(res.data || []);
    } catch { toast.error("Search failed"); }
    finally { setSearching(false); }
  };

  const generateLink = async (productId) => {
    setGenerating(productId);
    try {
      const res = await axios.post(`${API}/affiliates/generate-link`,
        { product_id: productId }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Link generated! Earn ₹${res.data.estimated_earning} per sale`);
      fetchLinks(); // Refresh link list
      // Update search result to show generated link
      setSearchResults(prev => prev.map(p =>
        p.product_id === productId ? { ...p, _generated: res.data.affiliate_link } : p
      ));
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setGenerating(""); }
  };

  const copyLink = (link, id) => {
    navigator.clipboard.writeText(link);
    setCopied(id);
    toast.success("Copied!");
    setTimeout(() => setCopied(""), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold" />
    </div>
  );

  // Application Form (not registered yet)
  if (!affiliate) return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="font-serif text-3xl font-bold text-gold mb-2">Join as Affiliate</h1>
        <p className="text-neutral-400 mb-8">Earn commission by promoting PIGMA products</p>
        <form onSubmit={handleApply} className="space-y-4">
          <Input value={formData.company_name} onChange={e => setFormData(p => ({ ...p, company_name: e.target.value }))}
            placeholder="Company / Brand name" required className="bg-neutral-900 border-neutral-700 text-white" data-testid="aff-company" />
          <Input value={formData.website} onChange={e => setFormData(p => ({ ...p, website: e.target.value }))}
            placeholder="Website or social profile URL" className="bg-neutral-900 border-neutral-700 text-white" data-testid="aff-website" />
          <Textarea value={formData.marketing_channels} onChange={e => setFormData(p => ({ ...p, marketing_channels: e.target.value }))}
            placeholder="How will you promote products?" rows={3} className="bg-neutral-900 border-neutral-700 text-white resize-none" data-testid="aff-channels" />
          <Button type="submit" disabled={applying} className="w-full bg-gold text-black hover:bg-gold/80" data-testid="aff-apply-btn">
            {applying ? "Submitting..." : "Apply Now"}
          </Button>
        </form>
      </div>
    </div>
  );

  // Pending state
  if (affiliate.status === "pending") return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <Clock className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Application Under Review</h2>
        <p className="text-neutral-400 text-sm">Your affiliate application is being reviewed. You'll be notified once approved.</p>
      </div>
    </div>
  );

  // Approved Dashboard
  return (
    <div className="min-h-screen bg-neutral-950 text-white" data-testid="affiliate-dashboard">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-xl font-bold text-gold tracking-wider">PIGMA</h1>
          <span className="text-neutral-500 text-sm">Affiliate Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{affiliate.commission_rate}% commission</Badge>
          <Link to="/" className="text-neutral-400 hover:text-white text-sm">Shop</Link>
          <button onClick={() => { localStorage.removeItem("pigma_token"); navigate("/"); }} className="text-red-400 hover:text-red-300">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Link2 className="h-5 w-5 text-blue-400" />, label: "Links Generated", value: linksTotal, bg: "bg-blue-500/10" },
            { icon: <MousePointerClick className="h-5 w-5 text-purple-400" />, label: "Total Clicks", value: affiliate.total_clicks || 0, bg: "bg-purple-500/10" },
            { icon: <ShoppingCart className="h-5 w-5 text-green-400" />, label: "Conversions", value: affiliate.total_conversions || 0, bg: "bg-green-500/10" },
            { icon: <DollarSign className="h-5 w-5 text-gold" />, label: "Earnings", value: `₹${(affiliate.total_earnings || 0).toLocaleString()}`, bg: "bg-gold/10" },
          ].map(s => (
            <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>{s.icon}</div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-neutral-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-neutral-800 pb-3">
          {[
            { id: "links", label: "My Links" },
            { id: "search", label: "Find Products" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? "bg-gold text-black" : "text-neutral-400 hover:bg-neutral-800"
              }`} data-testid={`aff-tab-${t.id}`}>{t.label}</button>
          ))}
        </div>

        {/* My Links */}
        {tab === "links" && (
          <div className="space-y-3" data-testid="affiliate-my-links">
            <p className="text-sm text-neutral-400">{linksTotal} product links generated</p>
            {links.length === 0 ? (
              <div className="text-center py-16 text-neutral-500">
                <Link2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No links generated yet</p>
                <p className="text-sm mt-1">Go to any product page or use Search to generate your first link</p>
              </div>
            ) : (
              <div className="space-y-2">
                {links.map(l => (
                  <div key={l.product_id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center gap-3" data-testid={`aff-link-${l.product_id}`}>
                    {l.product_image && <img src={l.product_image} alt="" className="w-12 h-12 rounded object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{l.product_name}</p>
                      <div className="flex items-center gap-3 text-xs text-neutral-400 mt-0.5">
                        <span>₹{l.product_price?.toLocaleString()}</span>
                        <span className="text-green-400">Earn ₹{l.estimated_earning}</span>
                        <span>{l.clicks || 0} clicks</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => copyLink(l.affiliate_link, l.product_id)}
                        className="p-2 rounded-lg hover:bg-neutral-800 transition-colors" data-testid={`copy-aff-${l.product_id}`}>
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
          <div className="space-y-4" data-testid="affiliate-search">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchProducts()}
                  placeholder="Search products to generate affiliate links..."
                  className="bg-neutral-900 border-neutral-700 text-white pl-10" data-testid="aff-search-input" />
              </div>
              <Button onClick={searchProducts} disabled={searching} className="bg-gold text-black hover:bg-gold/80" data-testid="aff-search-btn">
                {searching ? "..." : "Search"}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map(p => (
                  <div key={p.product_id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center gap-3" data-testid={`search-result-${p.product_id}`}>
                    {p.images?.[0] && <img src={p.images[0]} alt="" className="w-12 h-12 rounded object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.name}</p>
                      <p className="text-xs text-neutral-400">₹{p.price?.toLocaleString()} | {p.category}</p>
                    </div>
                    {p._generated ? (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => copyLink(p._generated, `s_${p.product_id}`)}
                          className="p-2 rounded-lg hover:bg-neutral-800">
                          {copied === `s_${p.product_id}` ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-blue-400" />}
                        </button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => generateLink(p.product_id)}
                        disabled={generating === p.product_id}
                        className="bg-blue-600 text-white text-xs h-8 shrink-0" data-testid={`gen-aff-${p.product_id}`}>
                        <Link2 className="h-3 w-3 mr-1" />
                        {generating === p.product_id ? "..." : "Generate Link"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
