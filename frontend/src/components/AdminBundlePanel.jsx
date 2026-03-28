import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";
import {
  Package, Plus, Trash2, Save, Search, ToggleLeft, ToggleRight,
  Percent, DollarSign, X, Edit2, ChevronDown, ChevronUp, Tag, Gift,
  Zap, Clock, Timer, Calendar
} from "lucide-react";

const getAdminHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("pigma_admin_token")}` });

// ========== PRODUCT PICKER ==========
const ProductPicker = ({ selectedIds, onAdd, onRemove }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(async () => {
    if (!search.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await axios.get(`${API}/products?search=${encodeURIComponent(search)}&limit=8`);
      setResults((res.data || []).filter(p => !selectedIds.includes(p.product_id)));
    } catch {}
    finally { setSearching(false); }
  }, [search, selectedIds]);

  useEffect(() => {
    const t = setTimeout(doSearch, 300);
    return () => clearTimeout(t);
  }, [doSearch]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products to add..."
          className="pl-9 bg-neutral-900 border-neutral-700 text-white text-xs h-9"
          data-testid="bundle-product-search"
        />
      </div>
      {results.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg max-h-48 overflow-y-auto">
          {results.map(p => (
            <button key={p.product_id}
              onClick={() => { onAdd(p.product_id); setSearch(""); setResults([]); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-neutral-800 transition-colors text-left"
              data-testid={`picker-product-${p.product_id}`}
            >
              <div className="w-8 h-10 bg-neutral-800 rounded overflow-hidden shrink-0">
                {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{p.name}</p>
                <p className="text-[10px] text-neutral-500">Rs.{p.price?.toLocaleString()}</p>
              </div>
              <Plus className="h-3.5 w-3.5 text-gold shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ========== BUNDLE FORM ==========
const BundleForm = ({ bundle, onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: bundle?.name || "",
    description: bundle?.description || "",
    product_ids: bundle?.product_ids || [],
    discount_type: bundle?.discount_type || "percentage",
    discount_value: bundle?.discount_value || 10,
    badge_text: bundle?.badge_text || "DEAL",
    is_active: bundle?.is_active !== false,
    // Flash sale
    flash_sale_start: bundle?.flash_sale_start ? bundle.flash_sale_start.slice(0, 16) : "",
    flash_sale_end: bundle?.flash_sale_end ? bundle.flash_sale_end.slice(0, 16) : "",
    flash_extra_discount_type: bundle?.flash_extra_discount_type || "percentage",
    flash_extra_discount_value: bundle?.flash_extra_discount_value || 0,
  });
  const [showFlash, setShowFlash] = useState(!!(bundle?.flash_sale_start));
  const [productDetails, setProductDetails] = useState([]);
  const [saving, setSaving] = useState(false);

  // Fetch product details for selected IDs
  useEffect(() => {
    const fetchProducts = async () => {
      if (!form.product_ids.length) { setProductDetails([]); return; }
      try {
        const all = await Promise.all(
          form.product_ids.map(id =>
            axios.get(`${API}/products/${id}`).then(r => r.data).catch(() => null)
          )
        );
        setProductDetails(all.filter(Boolean));
      } catch {}
    };
    fetchProducts();
  }, [form.product_ids]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Bundle name required"); return; }
    if (form.product_ids.length < 2) { toast.error("Add at least 2 products"); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      // Convert local datetime to ISO if flash sale is enabled
      if (showFlash && payload.flash_sale_start && payload.flash_sale_end) {
        payload.flash_sale_start = new Date(payload.flash_sale_start).toISOString();
        payload.flash_sale_end = new Date(payload.flash_sale_end).toISOString();
      } else {
        payload.flash_sale_start = null;
        payload.flash_sale_end = null;
        payload.flash_extra_discount_value = 0;
      }
      await onSave(payload);
    } finally { setSaving(false); }
  };

  const removeProduct = (pid) => {
    setForm(f => ({ ...f, product_ids: f.product_ids.filter(id => id !== pid) }));
  };

  const originalTotal = productDetails.reduce((s, p) => s + (p?.price || 0), 0);
  const discountAmount = form.discount_type === "percentage"
    ? Math.round(originalTotal * form.discount_value / 100)
    : form.discount_value;
  const bundlePrice = Math.max(originalTotal - discountAmount, 0);

  return (
    <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5 space-y-5" data-testid="bundle-form">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">{bundle ? "Edit Bundle" : "Create New Bundle"}</h3>
        <button onClick={onCancel} className="text-neutral-500 hover:text-white"><X className="h-4 w-4" /></button>
      </div>

      {/* Name & Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-neutral-400 block mb-1">Bundle Name *</label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="bg-neutral-900 border-neutral-700 text-white h-9" placeholder="e.g. Complete Look Bundle"
            data-testid="bundle-name-input" />
        </div>
        <div>
          <label className="text-xs text-neutral-400 block mb-1">Badge Text</label>
          <Input value={form.badge_text} onChange={e => setForm(f => ({ ...f, badge_text: e.target.value }))}
            className="bg-neutral-900 border-neutral-700 text-white h-9" placeholder="e.g. SAVE 15%"
            data-testid="bundle-badge-input" />
        </div>
      </div>
      <div>
        <label className="text-xs text-neutral-400 block mb-1">Description</label>
        <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="bg-neutral-900 border-neutral-700 text-white h-9" placeholder="Short description of the bundle"
          data-testid="bundle-desc-input" />
      </div>

      {/* Product Picker */}
      <div>
        <label className="text-xs text-neutral-400 block mb-2">Products ({form.product_ids.length}/6) *</label>
        <ProductPicker
          selectedIds={form.product_ids}
          onAdd={pid => setForm(f => ({ ...f, product_ids: [...f.product_ids, pid] }))}
          onRemove={removeProduct}
        />
        {/* Selected products list */}
        <div className="space-y-1.5 mt-3">
          {productDetails.map((p, i) => (
            <div key={p.product_id} className="flex items-center gap-2 bg-neutral-900 rounded-lg px-3 py-2">
              <span className="text-[10px] text-neutral-500 w-4">{i + 1}.</span>
              <div className="w-7 h-8 bg-neutral-800 rounded overflow-hidden shrink-0">
                {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <span className="text-xs text-white flex-1 truncate">{p.name}</span>
              <span className="text-xs text-gold font-medium">Rs.{p.price?.toLocaleString()}</span>
              <button onClick={() => removeProduct(p.product_id)} className="text-neutral-500 hover:text-red-400 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Discount Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-neutral-400 block mb-1">Discount Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setForm(f => ({ ...f, discount_type: "percentage" }))}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                form.discount_type === "percentage" ? "bg-gold text-black" : "bg-neutral-800 text-neutral-400"
              }`} data-testid="discount-type-percentage">
              <Percent className="h-3 w-3" /> Percentage
            </button>
            <button
              onClick={() => setForm(f => ({ ...f, discount_type: "flat" }))}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                form.discount_type === "flat" ? "bg-gold text-black" : "bg-neutral-800 text-neutral-400"
              }`} data-testid="discount-type-flat">
              <Tag className="h-3 w-3" /> Flat
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-neutral-400 block mb-1">Discount Value</label>
          <Input
            type="number" min={1}
            value={form.discount_value}
            onChange={e => setForm(f => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))}
            className="bg-neutral-900 border-neutral-700 text-white h-9"
            data-testid="bundle-discount-input"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-400 block mb-1">Status</label>
          <button
            onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
            className="flex items-center gap-2 mt-1"
          >
            {form.is_active
              ? <ToggleRight className="h-6 w-6 text-green-400" />
              : <ToggleLeft className="h-6 w-6 text-neutral-500" />}
            <span className={`text-xs ${form.is_active ? "text-green-400" : "text-neutral-500"}`}>
              {form.is_active ? "Active" : "Inactive"}
            </span>
          </button>
        </div>
      </div>

      {/* Flash Sale */}
      <div className="border-t border-neutral-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-red-400" />
            <h4 className="text-sm font-semibold text-white">Flash Sale Timer</h4>
          </div>
          <button onClick={() => setShowFlash(!showFlash)}>
            {showFlash
              ? <ToggleRight className="h-6 w-6 text-red-400" />
              : <ToggleLeft className="h-6 w-6 text-neutral-500" />}
          </button>
        </div>

        {showFlash && (
          <div className="space-y-4 bg-red-500/5 border border-red-500/20 rounded-lg p-4">
            {/* Quick presets */}
            <div>
              <label className="text-xs text-neutral-400 block mb-2">Quick Start (from now)</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "2h", hours: 2 },
                  { label: "6h", hours: 6 },
                  { label: "12h", hours: 12 },
                  { label: "24h", hours: 24 },
                  { label: "48h", hours: 48 },
                ].map(p => {
                  const setPreset = () => {
                    const now = new Date();
                    const end = new Date(now.getTime() + p.hours * 60 * 60 * 1000);
                    const fmt = (d) => d.toISOString().slice(0, 16);
                    setForm(f => ({ ...f, flash_sale_start: fmt(now), flash_sale_end: fmt(end) }));
                  };
                  return (
                    <button key={p.hours} onClick={setPreset}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/30 transition-colors"
                      data-testid={`flash-preset-${p.hours}h`}>
                      <Timer className="h-3 w-3 inline mr-1" />{p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual date pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Sale Starts</label>
                <Input type="datetime-local"
                  value={form.flash_sale_start}
                  onChange={e => setForm(f => ({ ...f, flash_sale_start: e.target.value }))}
                  className="bg-neutral-900 border-neutral-700 text-white h-9 text-xs"
                  data-testid="flash-start-input" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Sale Ends</label>
                <Input type="datetime-local"
                  value={form.flash_sale_end}
                  onChange={e => setForm(f => ({ ...f, flash_sale_end: e.target.value }))}
                  className="bg-neutral-900 border-neutral-700 text-white h-9 text-xs"
                  data-testid="flash-end-input" />
              </div>
            </div>

            {/* Extra flash discount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Extra Flash Discount Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setForm(f => ({ ...f, flash_extra_discount_type: "percentage" }))}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      form.flash_extra_discount_type === "percentage" ? "bg-red-500 text-white" : "bg-neutral-800 text-neutral-400"
                    }`}>
                    <Percent className="h-3 w-3" /> %
                  </button>
                  <button
                    onClick={() => setForm(f => ({ ...f, flash_extra_discount_type: "flat" }))}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      form.flash_extra_discount_type === "flat" ? "bg-red-500 text-white" : "bg-neutral-800 text-neutral-400"
                    }`}>
                    <Tag className="h-3 w-3" /> Flat
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Extra Discount Value</label>
                <Input type="number" min={0}
                  value={form.flash_extra_discount_value}
                  onChange={e => setForm(f => ({ ...f, flash_extra_discount_value: parseFloat(e.target.value) || 0 }))}
                  className="bg-neutral-900 border-neutral-700 text-white h-9 text-xs"
                  data-testid="flash-extra-discount-input" />
              </div>
            </div>

            {form.flash_sale_start && form.flash_sale_end && (
              <div className="bg-neutral-900 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-red-400 font-medium">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Flash sale: {new Date(form.flash_sale_start).toLocaleString()} — {new Date(form.flash_sale_end).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      {productDetails.length >= 2 && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Bundle Price Preview</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-bold text-gold">Rs.{bundlePrice.toLocaleString()}</span>
              <span className="text-xs text-neutral-500 line-through">Rs.{originalTotal.toLocaleString()}</span>
              <span className="text-xs text-green-400 font-medium">Save Rs.{discountAmount.toLocaleString()}</span>
            </div>
          </div>
          <Badge className="bg-gold/20 text-gold text-xs">{form.badge_text}</Badge>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="bg-gold text-black font-bold hover:bg-yellow-400" data-testid="save-bundle-btn">
        <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving..." : bundle ? "Update Bundle" : "Create Bundle"}
      </Button>
    </div>
  );
};

// ========== MAIN PANEL ==========
export const AdminBundlePanel = () => {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);

  const fetchBundles = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/bundles/admin/all`, { headers: getAdminHeaders() });
      setBundles(res.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBundles(); }, [fetchBundles]);

  const handleCreate = async (form) => {
    try {
      await axios.post(`${API}/bundles/admin`, form, { headers: getAdminHeaders() });
      toast.success("Bundle created!");
      setShowForm(false);
      fetchBundles();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleUpdate = async (form) => {
    try {
      await axios.put(`${API}/bundles/admin/${editingBundle.bundle_id}`, form, { headers: getAdminHeaders() });
      toast.success("Bundle updated!");
      setEditingBundle(null);
      fetchBundles();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleDelete = async (bundleId) => {
    if (!window.confirm("Delete this bundle?")) return;
    try {
      await axios.delete(`${API}/bundles/admin/${bundleId}`, { headers: getAdminHeaders() });
      toast.success("Bundle deleted");
      fetchBundles();
    } catch { toast.error("Failed to delete"); }
  };

  const toggleActive = async (bundle) => {
    try {
      await axios.put(`${API}/bundles/admin/${bundle.bundle_id}`,
        { is_active: !bundle.is_active }, { headers: getAdminHeaders() });
      toast.success(bundle.is_active ? "Bundle deactivated" : "Bundle activated");
      fetchBundles();
    } catch { toast.error("Failed"); }
  };

  if (loading) return <div className="flex justify-center h-64 items-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" /></div>;

  return (
    <div className="space-y-6" data-testid="admin-bundle-panel">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gift className="h-6 w-6 text-gold" /> Bundle Deals
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">{bundles.length} bundle{bundles.length !== 1 ? "s" : ""} created</p>
        </div>
        {!showForm && !editingBundle && (
          <Button onClick={() => setShowForm(true)} className="bg-gold text-black font-bold hover:bg-yellow-400" data-testid="create-bundle-btn">
            <Plus className="h-4 w-4 mr-1.5" /> Create Bundle
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <BundleForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {/* Edit Form */}
      {editingBundle && (
        <BundleForm bundle={editingBundle} onSave={handleUpdate} onCancel={() => setEditingBundle(null)} />
      )}

      {/* Bundle List */}
      <div className="space-y-3">
        {bundles.length === 0 && !showForm ? (
          <div className="text-center py-12 text-neutral-500">
            <Package className="h-10 w-10 mx-auto mb-3 text-neutral-600" />
            <p className="text-sm">No bundles yet. Create your first bundle deal!</p>
          </div>
        ) : (
          bundles.map(b => (
            <div key={b.bundle_id}
              className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4"
              data-testid={`bundle-item-${b.bundle_id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white text-sm">{b.name}</h3>
                    <Badge className={`text-[10px] ${b.is_active ? "bg-green-500/20 text-green-400" : "bg-neutral-700 text-neutral-400"}`}>
                      {b.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge className="bg-gold/20 text-gold text-[10px]">{b.badge_text}</Badge>
                    {b.flash_active && (
                      <Badge className="bg-red-500/20 text-red-400 text-[10px] animate-pulse">
                        <Zap className="h-2.5 w-2.5 mr-0.5" /> FLASH SALE LIVE
                      </Badge>
                    )}
                    {b.flash_sale_end && !b.flash_active && new Date(b.flash_sale_start) > new Date() && (
                      <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">
                        <Clock className="h-2.5 w-2.5 mr-0.5" /> Scheduled
                      </Badge>
                    )}
                  </div>
                  {b.description && <p className="text-xs text-neutral-500 mt-1">{b.description}</p>}

                  {/* Product thumbnails */}
                  <div className="flex items-center gap-1.5 mt-3">
                    {b.products?.map((p, i) => (
                      <div key={i} className="flex items-center gap-1">
                        {i > 0 && <Plus className="h-3 w-3 text-neutral-600" />}
                        <div className="w-10 h-12 bg-neutral-900 rounded overflow-hidden" title={p.name}>
                          {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-sm font-bold text-gold">Rs.{b.bundle_price?.toLocaleString()}</span>
                    <span className="text-xs text-neutral-500 line-through">Rs.{b.original_total?.toLocaleString()}</span>
                    <span className="text-xs text-green-400 font-medium">
                      {b.discount_type === "percentage" ? `${b.discount_value}% OFF` : `Rs.${b.discount_value} OFF`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleActive(b)}
                    className="p-1.5 rounded-lg hover:bg-neutral-700 transition-colors" title={b.is_active ? "Deactivate" : "Activate"}>
                    {b.is_active
                      ? <ToggleRight className="h-5 w-5 text-green-400" />
                      : <ToggleLeft className="h-5 w-5 text-neutral-500" />}
                  </button>
                  <button onClick={() => setEditingBundle(b)}
                    className="p-1.5 rounded-lg hover:bg-neutral-700 transition-colors text-neutral-400 hover:text-white">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(b.bundle_id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-neutral-400 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
