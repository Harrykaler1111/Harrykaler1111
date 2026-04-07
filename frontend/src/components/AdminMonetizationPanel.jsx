import { useState, useEffect } from "react";
import { DollarSign, Save, RefreshCw, Zap, Store, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("pigma_admin_token")}` });

const FIELD_LABELS = {
  credit_rate_inr: { label: "Credit Rate (₹ per credit)", icon: <DollarSign className="h-4 w-4" />, hint: "How much ₹1 buys in credits" },
  reel_boost_per_hour: { label: "Reel Boost / Hour (credits)", icon: <Zap className="h-4 w-4" />, hint: "Credits charged per hour of reel boost" },
  reel_boost_per_day: { label: "Reel Boost / Day (credits)", icon: <Zap className="h-4 w-4" />, hint: "Credits charged per day" },
  reel_boost_per_week: { label: "Reel Boost / Week (credits)", icon: <Zap className="h-4 w-4" />, hint: "Credits charged per week" },
  reel_boost_per_month: { label: "Reel Boost / Month (credits)", icon: <Zap className="h-4 w-4" />, hint: "Credits charged per month" },
  cart_placement_credits: { label: "Cart Placement (credits)", icon: <CreditCard className="h-4 w-4" />, hint: "Credits per 'You may also like' placement" },
  featured_vendor_week: { label: "Featured Vendor / Week (₹)", icon: <Store className="h-4 w-4" />, hint: "INR cost for weekly featured slot" },
  featured_vendor_month: { label: "Featured Vendor / Month (₹)", icon: <Store className="h-4 w-4" />, hint: "INR cost for monthly featured slot" },
  free_vendor_reel_limit: { label: "Free Vendor Reel Limit", icon: <Store className="h-4 w-4" />, hint: "Max products free vendors can show in reels" },
};

export const AdminMonetizationPanel = () => {
  const [pricing, setPricing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [boosts, setBoosts] = useState([]);
  const [addCreditsForm, setAddCreditsForm] = useState({ vendor_id: "", credits: 100, reason: "Manual top-up" });

  const fetchPricing = async () => {
    try {
      const { data } = await axios.get(`${API}/vendor-credits/pricing`);
      setPricing(data);
      setForm(data);
    } catch { toast.error("Failed to load pricing"); }
  };

  const fetchBoosts = async () => {
    try {
      const { data } = await axios.get(`${API}/vendor-credits/admin/all-boosts`, { headers: getHeaders() });
      setBoosts(data);
    } catch {}
  };

  useEffect(() => { fetchPricing(); fetchBoosts(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {};
      for (const key of Object.keys(FIELD_LABELS)) {
        if (form[key] !== undefined && form[key] !== pricing[key]) {
          updates[key] = Number(form[key]);
        }
      }
      if (Object.keys(updates).length === 0) { toast.info("No changes to save"); setSaving(false); return; }
      const { data } = await axios.put(`${API}/vendor-credits/admin/pricing`, updates, { headers: getHeaders() });
      setPricing(data.pricing);
      setForm(data.pricing);
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
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  if (!pricing) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold" /></div>;

  const now = new Date().toISOString();

  return (
    <div className="space-y-8" data-testid="admin-monetization-panel">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Vendor Monetization</h2>
          <p className="text-neutral-400 text-sm mt-1">Set credit prices, boost rates, and featured vendor slots</p>
        </div>
        <Button onClick={fetchPricing} variant="outline" size="sm" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Pricing Grid */}
      <div className="bg-neutral-800/50 rounded-xl p-6 border border-neutral-700">
        <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5" /> Pricing Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(FIELD_LABELS).map(([key, { label, icon, hint }]) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">{icon} {label}</label>
              <Input
                type="number"
                value={form[key] ?? ""}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="bg-neutral-900 border-neutral-700 text-white h-9 text-sm"
                data-testid={`pricing-${key}`}
              />
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

      {/* Active Boosts */}
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
                    <td className="py-2 px-3"><span className={`text-[10px] px-2 py-0.5 rounded ${b.expires_at > now ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{b.expires_at > now ? "Active" : "Expired"}</span></td>
                    <td className="py-2 px-3 text-xs text-neutral-500">{new Date(b.expires_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
