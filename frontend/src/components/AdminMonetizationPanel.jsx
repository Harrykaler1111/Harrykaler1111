import { useState, useEffect, useCallback } from "react";
import { DollarSign, CreditCard, Zap, Save, RefreshCw, Users, Clock, CheckCircle, XCircle, Crown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";

const getHeaders = () => {
  const token = localStorage.getItem("pigma_admin_token");
  return { Authorization: `Bearer ${token}` };
};

const FIELD_LABELS = {
  credit_rate_inr: { label: "Credit Rate (INR per credit)", icon: <DollarSign className="h-3 w-3" />, hint: "e.g. 1 = Rs.1/credit" },
  reel_boost_per_hour: { label: "Reel Boost / Hour", icon: <Zap className="h-3 w-3" />, hint: "Credits per hour of reel boost" },
  reel_boost_per_day: { label: "Reel Boost / Day", icon: <Zap className="h-3 w-3" />, hint: "Credits per day" },
  reel_boost_per_week: { label: "Reel Boost / Week", icon: <Zap className="h-3 w-3" />, hint: "Credits per week" },
  reel_boost_per_month: { label: "Reel Boost / Month", icon: <Zap className="h-3 w-3" />, hint: "Credits per month" },
  cart_placement_credits: { label: "Cart Placement Cost", icon: <CreditCard className="h-3 w-3" />, hint: "Credits per cart upsell" },
  featured_vendor_week: { label: "Featured Vendor / Week (INR)", icon: <Crown className="h-3 w-3" />, hint: "INR per week" },
  featured_vendor_month: { label: "Featured Vendor / Month (INR)", icon: <Crown className="h-3 w-3" />, hint: "INR per month" },
  free_vendor_reel_limit: { label: "Free Reel Limit", icon: <Users className="h-3 w-3" />, hint: "Products shown for free vendors" },
};

export const AdminMonetizationPanel = () => {
  const [pricing, setPricing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [addCreditsForm, setAddCreditsForm] = useState({ vendor_id: "", credits: 100, reason: "Manual top-up" });
  const [boosts, setBoosts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [featuredVendors, setFeaturedVendors] = useState([]);
  const [requestFilter, setRequestFilter] = useState("pending");
  const [featureForm, setFeatureForm] = useState({ vendor_id: "", duration: "week" });
  const [activeTab, setActiveTab] = useState("pricing");

  const fetchPricing = useCallback(async () => {
    try {
      const [pRes, bRes] = await Promise.all([
        axios.get(`${API}/vendor-credits/pricing`),
        axios.get(`${API}/vendor-credits/admin/all-boosts`, { headers: getHeaders() }).catch(() => ({ data: [] }))
      ]);
      setPricing(pRes.data);
      setForm(pRes.data);
      setBoosts(Array.isArray(bRes.data) ? bRes.data : []);
    } catch { toast.error("Failed to load pricing"); }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/vendor-credits/admin/vendors`, { headers: getHeaders() });
      setVendors(data);
    } catch {}
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/vendor-credits/admin/requests?status=${requestFilter}`, { headers: getHeaders() });
      setRequests(data);
    } catch {}
  }, [requestFilter]);

  const fetchFeatured = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/vendor-credits/admin/featured-vendors`, { headers: getHeaders() });
      setFeaturedVendors(data);
    } catch {}
  }, []);

  useEffect(() => { fetchPricing(); fetchVendors(); fetchRequests(); fetchFeatured(); }, [fetchPricing, fetchVendors, fetchRequests, fetchFeatured]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {};
      Object.keys(FIELD_LABELS).forEach(k => { if (form[k] !== undefined && form[k] !== "") updates[k] = parseFloat(form[k]); });
      await axios.put(`${API}/vendor-credits/admin/pricing`, updates, { headers: getHeaders() });
      toast.success("Pricing updated!");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to update"); }
    setSaving(false);
  };

  const handleAddCredits = async () => {
    if (!addCreditsForm.vendor_id || addCreditsForm.credits <= 0) { toast.error("Enter vendor ID and credits"); return; }
    try {
      const { data } = await axios.post(`${API}/vendor-credits/admin/add-credits`, addCreditsForm, { headers: getHeaders() });
      toast.success(`Added ${data.credits_added} credits. New balance: ${data.new_balance}`);
      setAddCreditsForm({ vendor_id: "", credits: 100, reason: "Manual top-up" });
      fetchVendors();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleRequestAction = async (requestId, action, adminNote = "") => {
    try {
      const { data } = await axios.post(`${API}/vendor-credits/admin/requests/${requestId}/action`, { action, admin_note: adminNote }, { headers: getHeaders() });
      toast.success(data.message);
      fetchRequests();
      fetchVendors();
      fetchFeatured();
    } catch (err) { toast.error(err.response?.data?.detail || "Action failed"); }
  };

  const handleFeatureVendor = async () => {
    if (!featureForm.vendor_id) { toast.error("Select a vendor"); return; }
    try {
      const { data } = await axios.post(`${API}/vendor-credits/admin/feature-vendor`, featureForm, { headers: getHeaders() });
      toast.success(data.message);
      setFeatureForm({ vendor_id: "", duration: "week" });
      fetchFeatured();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleRemoveFeatured = async (featuredId) => {
    try {
      await axios.delete(`${API}/vendor-credits/admin/feature-vendor/${featuredId}`, { headers: getHeaders() });
      toast.success("Vendor removed from featured");
      fetchFeatured();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  if (!pricing) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold" /></div>;

  const now = new Date().toISOString();
  const tabs = [
    { id: "pricing", label: "Pricing", icon: DollarSign },
    { id: "vendors", label: "Vendors", icon: Users },
    { id: "requests", label: "Requests", icon: Clock, badge: requests.filter(r => r.status === "pending").length },
    { id: "featured", label: "Featured", icon: Crown },
    { id: "boosts", label: "Boosts", icon: Zap },
  ];

  return (
    <div className="space-y-6" data-testid="admin-monetization-panel">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Vendor Monetization</h2>
          <p className="text-neutral-400 text-sm mt-1">Credits, promotions, featured vendors, and boosts</p>
        </div>
        <Button onClick={() => { fetchPricing(); fetchVendors(); fetchRequests(); fetchFeatured(); }} variant="outline" size="sm" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-800/50 p-1 rounded-lg overflow-x-auto" data-testid="monetization-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? "bg-gold/20 text-gold" : "text-neutral-400 hover:text-white"}`}
            data-testid={`tab-${t.id}`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.badge > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── PRICING TAB ── */}
      {activeTab === "pricing" && (
        <div className="space-y-6">
          <div className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5" /> Pricing Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(FIELD_LABELS).map(([key, { label, icon, hint }]) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">{icon} {label}</label>
                  <Input type="number" value={form[key] ?? ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm" data-testid={`pricing-${key}`} />
                  <p className="text-[10px] text-neutral-500">{hint}</p>
                </div>
              ))}
            </div>
            <Button onClick={handleSave} disabled={saving} className="mt-6 bg-gold text-black hover:bg-gold/90" data-testid="save-pricing-btn">
              {saving ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save Pricing
            </Button>
          </div>

          {/* Manual Credit Add */}
          <div className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2"><CreditCard className="h-5 w-5" /> Add Credits to Vendor</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-neutral-300">Vendor ID</label>
                <Input value={addCreditsForm.vendor_id} onChange={e => setAddCreditsForm(f => ({ ...f, vendor_id: e.target.value }))} placeholder="vendor_xxxxx" className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm mt-1" data-testid="add-credits-vendor-id" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-300">Credits</label>
                <Input type="number" value={addCreditsForm.credits} onChange={e => setAddCreditsForm(f => ({ ...f, credits: parseInt(e.target.value) || 0 }))} className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm mt-1" data-testid="add-credits-amount" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-300">Reason</label>
                <Input value={addCreditsForm.reason} onChange={e => setAddCreditsForm(f => ({ ...f, reason: e.target.value }))} className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm mt-1" />
              </div>
            </div>
            <Button onClick={handleAddCredits} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="add-credits-btn">
              <CreditCard className="h-4 w-4 mr-1" /> Add Credits
            </Button>
          </div>
        </div>
      )}

      {/* ── VENDORS TAB ── */}
      {activeTab === "vendors" && (
        <div className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
          <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2"><Users className="h-5 w-5" /> All Vendors ({vendors.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="vendor-list-table">
              <thead>
                <tr className="text-neutral-400 border-b border-neutral-700 text-xs">
                  <th className="text-left py-2 px-3">Vendor</th>
                  <th className="text-left py-2 px-3">Email</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Balance</th>
                  <th className="text-right py-2 px-3">Purchased</th>
                  <th className="text-right py-2 px-3">Spent</th>
                  <th className="text-center py-2 px-3">Paid</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.vendor_id} className="border-b border-neutral-800 text-neutral-300 hover:bg-neutral-800/50">
                    <td className="py-2 px-3">
                      <div className="text-xs font-medium">{v.vendor_name}</div>
                      <div className="text-[10px] text-neutral-500">{v.vendor_id}</div>
                    </td>
                    <td className="py-2 px-3 text-xs">{v.email}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-2 py-0.5 rounded ${v.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{v.status}</span></td>
                    <td className="py-2 px-3 text-right text-xs font-bold text-gold">{v.credit_balance}</td>
                    <td className="py-2 px-3 text-right text-xs">{v.total_purchased}</td>
                    <td className="py-2 px-3 text-right text-xs">{v.total_spent}</td>
                    <td className="py-2 px-3 text-center">{v.is_paid ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mx-auto" /> : <span className="text-neutral-600">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REQUESTS TAB ── */}
      {activeTab === "requests" && (
        <div className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gold flex items-center gap-2"><Clock className="h-5 w-5" /> Promotion Requests</h3>
            <div className="flex gap-1">
              {["pending", "approved", "rejected", "all"].map(f => (
                <button key={f} onClick={() => setRequestFilter(f)} className={`text-[10px] px-2.5 py-1 rounded-full font-medium uppercase tracking-wider ${requestFilter === f ? "bg-gold text-black" : "bg-neutral-700 text-neutral-300"}`} data-testid={`filter-${f}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          {requests.length === 0 ? (
            <p className="text-neutral-400 text-sm">No {requestFilter} requests</p>
          ) : (
            <div className="space-y-3" data-testid="requests-list">
              {requests.map(r => (
                <RequestCard key={r.request_id} request={r} onAction={handleRequestAction} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FEATURED TAB ── */}
      {activeTab === "featured" && (
        <div className="space-y-6">
          {/* Add featured vendor */}
          <div className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2"><Crown className="h-5 w-5" /> Feature a Vendor</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-neutral-300">Vendor</label>
                <select
                  value={featureForm.vendor_id}
                  onChange={e => setFeatureForm(f => ({ ...f, vendor_id: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-700 text-white h-9 text-sm mt-1 rounded-md px-2"
                  data-testid="feature-vendor-select"
                >
                  <option value="">Select vendor...</option>
                  {vendors.filter(v => v.status === "approved").map(v => (
                    <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-300">Duration</label>
                <select
                  value={featureForm.duration}
                  onChange={e => setFeatureForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-700 text-white h-9 text-sm mt-1 rounded-md px-2"
                  data-testid="feature-duration-select"
                >
                  <option value="week">1 Week</option>
                  <option value="month">1 Month</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleFeatureVendor} className="bg-gold text-black hover:bg-gold/90 w-full" data-testid="feature-vendor-btn">
                  <Crown className="h-4 w-4 mr-1" /> Feature Vendor
                </Button>
              </div>
            </div>
          </div>

          {/* Active featured */}
          <div className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold text-gold mb-4">Active Featured Vendors</h3>
            {featuredVendors.length === 0 ? (
              <p className="text-neutral-400 text-sm">No featured vendors</p>
            ) : (
              <div className="space-y-2" data-testid="featured-vendors-list">
                {featuredVendors.map(f => (
                  <div key={f.featured_id} className="flex items-center justify-between bg-neutral-900 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{f.vendor_name || f.vendor_id}</p>
                      <p className="text-[10px] text-neutral-500">
                        {f.duration} | Expires: {new Date(f.expires_at).toLocaleDateString()} | Source: {f.source || "vendor"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${f.expires_at > now ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                        {f.expires_at > now ? "Active" : "Expired"}
                      </span>
                      <button onClick={() => handleRemoveFeatured(f.featured_id)} className="text-red-400 hover:text-red-300" data-testid={`remove-featured-${f.featured_id}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BOOSTS TAB ── */}
      {activeTab === "boosts" && (
        <div className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
          <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2"><Zap className="h-5 w-5" /> Active Reel Boosts</h3>
          {boosts.length === 0 ? (
            <p className="text-neutral-400 text-sm">No boosts yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-neutral-400 border-b border-neutral-700 text-xs">
                    <th className="text-left py-2 px-3">Product</th>
                    <th className="text-left py-2 px-3">Vendor</th>
                    <th className="text-left py-2 px-3">Duration</th>
                    <th className="text-left py-2 px-3">Credits</th>
                    <th className="text-left py-2 px-3">Source</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {boosts.map(b => (
                    <tr key={b.boost_id} className="border-b border-neutral-800 text-neutral-300">
                      <td className="py-2 px-3 text-xs">{b.product_name || b.product_id}</td>
                      <td className="py-2 px-3 text-xs">{b.vendor_id}</td>
                      <td className="py-2 px-3 text-xs">{b.quantity} {b.duration}(s)</td>
                      <td className="py-2 px-3 text-xs">{b.credits_spent}</td>
                      <td className="py-2 px-3 text-xs">{b.source || "direct"}</td>
                      <td className="py-2 px-3"><span className={`text-[10px] px-2 py-0.5 rounded ${b.expires_at > now ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{b.expires_at > now ? "Active" : "Expired"}</span></td>
                      <td className="py-2 px-3 text-xs text-neutral-500">{new Date(b.expires_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Request Card Component ── */
const RequestCard = ({ request: r, onAction }) => {
  const [note, setNote] = useState("");
  const isPending = r.status === "pending";

  return (
    <div className={`bg-neutral-900 rounded-lg p-4 border ${isPending ? "border-amber-500/30" : "border-neutral-800"}`} data-testid={`request-${r.request_id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${r.request_type === "reel_boost" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
              {r.request_type === "reel_boost" ? "Reel Boost" : "Featured Seller"}
            </span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${r.status === "pending" ? "bg-amber-500/20 text-amber-400" : r.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
              {r.status}
            </span>
          </div>
          <p className="text-sm font-medium text-white">{r.vendor_name}</p>
          {r.product_name && <p className="text-xs text-neutral-400">Product: {r.product_name}</p>}
          <p className="text-xs text-neutral-500">
            Duration: {r.quantity} {r.preferred_duration}(s) | Est. Cost: {r.estimated_cost} {r.cost_unit}
          </p>
          {r.note && <p className="text-xs text-neutral-400 mt-1 italic">"{r.note}"</p>}
          {r.admin_note && <p className="text-xs text-gold mt-1">Admin: {r.admin_note}</p>}
          <p className="text-[10px] text-neutral-600 mt-1">{new Date(r.created_at).toLocaleString()}</p>
        </div>
        {isPending && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Admin note..."
              className="bg-neutral-800 border-neutral-700 text-white h-7 text-[10px] w-36"
            />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => onAction(r.request_id, "approve", note)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-[10px] flex-1" data-testid={`approve-${r.request_id}`}>
                <CheckCircle className="h-3 w-3 mr-0.5" /> Approve
              </Button>
              <Button size="sm" onClick={() => onAction(r.request_id, "reject", note)} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-7 text-[10px] flex-1" data-testid={`reject-${r.request_id}`}>
                <XCircle className="h-3 w-3 mr-0.5" /> Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
