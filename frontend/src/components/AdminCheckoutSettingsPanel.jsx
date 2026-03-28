import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";
import {
  Settings, Save, ToggleLeft, ToggleRight, CreditCard, Banknote,
  Shield, AlertTriangle, Truck, Tag, Eye, Check, X, Phone, MapPin,
  ChevronDown, ChevronUp
} from "lucide-react";

const getAdminHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("pigma_admin_token")}` });

// ========== SETTINGS SECTION ==========
const SettingsCard = ({ title, icon: Icon, children, description }) => (
  <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
    <div className="p-4 border-b border-neutral-700">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gold" />
        <h3 className="font-semibold text-white text-sm">{title}</h3>
      </div>
      {description && <p className="text-xs text-neutral-400 mt-1">{description}</p>}
    </div>
    <div className="p-4 space-y-4">{children}</div>
  </div>
);

const ToggleField = ({ label, value, onChange, description }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-white">{label}</p>
      {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
    </div>
    <button onClick={() => onChange(!value)}>
      {value ? <ToggleRight className="h-6 w-6 text-green-400" /> : <ToggleLeft className="h-6 w-6 text-neutral-500" />}
    </button>
  </div>
);

const NumberField = ({ label, value, onChange, prefix = "Rs.", suffix, min = 0, description }) => (
  <div>
    <label className="text-xs text-neutral-400 block mb-1">{label}</label>
    {description && <p className="text-[10px] text-neutral-500 mb-1.5">{description}</p>}
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">{prefix}</span>}
      <Input
        type="number" min={min} value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className={`bg-neutral-900 border-neutral-700 text-white h-9 ${prefix ? "pl-10" : ""} ${suffix ? "pr-10" : ""}`}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">{suffix}</span>}
    </div>
  </div>
);

// ========== HIGH-RISK ORDERS ==========
const HighRiskOrdersSection = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/checkout/admin/high-risk-orders`, { headers: getAdminHeaders() });
      setOrders(res.data || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleAction = async (orderId, action, note = "") => {
    try {
      await axios.put(`${API}/checkout/admin/orders/${orderId}/risk-action`,
        { action, note }, { headers: getAdminHeaders() });
      toast.success(`Order ${action}d`);
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-gold" /></div>;

  return (
    <div className="space-y-3" data-testid="high-risk-orders">
      {orders.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          <Shield className="h-8 w-8 mx-auto mb-2 text-neutral-600" />
          <p className="text-sm">No high-risk orders right now</p>
        </div>
      ) : (
        orders.map(o => (
          <div key={o.order_id} className="bg-neutral-900 border border-neutral-700 rounded-lg p-3">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === o.order_id ? null : o.order_id)}>
              <div className="flex items-center gap-3">
                <Badge className={`text-[10px] ${o.risk_level === "high" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
                  {o.risk_level}
                </Badge>
                <div>
                  <p className="text-xs text-white font-medium">#{o.order_id?.slice(-6)}</p>
                  <p className="text-[10px] text-neutral-500">{o.customer?.name} | Rs.{o.total?.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-neutral-800 text-neutral-300 text-[10px]">{o.payment_method?.toUpperCase()}</Badge>
                {expanded === o.order_id ? <ChevronUp className="h-4 w-4 text-neutral-500" /> : <ChevronDown className="h-4 w-4 text-neutral-500" />}
              </div>
            </div>

            {expanded === o.order_id && (
              <div className="mt-3 pt-3 border-t border-neutral-800 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-neutral-500">Customer:</span> <span className="text-white">{o.customer?.name}</span></div>
                  <div><span className="text-neutral-500">Phone:</span> <span className="text-white">{o.customer?.phone || "N/A"}</span></div>
                  <div><span className="text-neutral-500">Email:</span> <span className="text-white">{o.customer?.email}</span></div>
                  <div><span className="text-neutral-500">Risk Factors:</span> <span className="text-amber-400">{o.risk_factors?.join(", ")}</span></div>
                </div>
                {!o.risk_reviewed && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => handleAction(o.order_id, "approve")}
                      className="h-7 bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs">
                      <Check className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" onClick={() => handleAction(o.order_id, "hold")}
                      className="h-7 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs">
                      <Eye className="h-3 w-3 mr-1" /> Hold
                    </Button>
                    <Button size="sm" onClick={() => handleAction(o.order_id, "cancel")}
                      className="h-7 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs">
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  </div>
                )}
                {o.risk_reviewed && (
                  <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">Reviewed: {o.risk_review_action}</Badge>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

// ========== MAIN PANEL ==========
export const AdminCheckoutSettingsPanel = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("settings");

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/checkout/admin/settings`, { headers: getAdminHeaders() });
      setSettings(res.data);
    } catch { toast.error("Failed to load checkout settings"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { setting_id, updated_at, updated_by, ...rest } = settings;
      await axios.put(`${API}/checkout/admin/settings`, rest, { headers: getAdminHeaders() });
      toast.success("Checkout settings saved!");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to save"); }
    finally { setSaving(false); }
  };

  const update = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  if (loading) return <div className="flex justify-center h-64 items-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" /></div>;

  return (
    <div className="space-y-6" data-testid="admin-checkout-settings">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-gold" /> Checkout & COD Settings
        </h2>
        <div className="flex gap-2">
          {[
            { key: "settings", label: "Configuration", icon: Settings },
            { key: "risk", label: "High-Risk Orders", icon: AlertTriangle },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm transition-colors ${
                tab === t.key ? "bg-gold text-black font-medium" : "text-neutral-400 hover:bg-neutral-800"
              }`} data-testid={`checkout-tab-${t.key}`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "settings" && settings && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* COD Settings */}
            <SettingsCard title="Cash on Delivery" icon={Banknote} description="Configure COD rules and charges">
              <ToggleField label="Enable COD" value={settings.cod_enabled} onChange={v => update("cod_enabled", v)}
                description="Allow customers to pay on delivery" />
              <NumberField label="COD Handling Fee" value={settings.cod_charge} onChange={v => update("cod_charge", v)}
                description="Extra charge added for COD orders" />
              <NumberField label="Max COD Order Value" value={settings.cod_max_order_value} onChange={v => update("cod_max_order_value", v)}
                description="Disable COD above this cart value" />
              <NumberField label="Max COD Orders Per User" value={settings.max_cod_per_user} onChange={v => update("max_cod_per_user", v)}
                prefix="" suffix="orders" description="Limit pending COD orders per customer" />
            </SettingsCard>

            {/* COD Advance Settings */}
            <SettingsCard title="COD Advance Payment" icon={Shield} description="Require partial advance to reduce fake orders">
              <ToggleField label="Require Advance" value={settings.cod_advance_enabled} onChange={v => update("cod_advance_enabled", v)}
                description="Collect partial payment before COD shipping" />
              <NumberField label="Advance Threshold" value={settings.cod_advance_threshold} onChange={v => update("cod_advance_threshold", v)}
                description="Cart value above which advance is required" />
              <NumberField label="Advance Amount" value={settings.cod_advance_amount} onChange={v => update("cod_advance_amount", v)}
                description="Fixed advance amount to collect" />
            </SettingsCard>

            {/* Prepaid Settings */}
            <SettingsCard title="Prepaid Incentive" icon={CreditCard} description="Encourage online payments with discounts">
              <ToggleField label="Enable Prepaid Discount" value={settings.prepaid_discount_enabled} onChange={v => update("prepaid_discount_enabled", v)}
                description="Offer a discount for online payment" />
              <NumberField label="Prepaid Discount" value={settings.prepaid_discount} onChange={v => update("prepaid_discount", v)}
                description="Flat discount for choosing online payment" />
            </SettingsCard>

            {/* Fraud Prevention */}
            <SettingsCard title="Fraud Prevention" icon={AlertTriangle} description="Auto-detect risky orders">
              <NumberField label="High-Risk Threshold" value={settings.high_risk_threshold} onChange={v => update("high_risk_threshold", v)}
                description="COD orders above this value are flagged" />
              <ToggleField label="Block Repeat Fake Users" value={settings.block_repeat_fake_users} onChange={v => update("block_repeat_fake_users", v)}
                description="Block COD for users with 3+ cancelled COD orders" />
            </SettingsCard>

            {/* Shipping Settings */}
            <SettingsCard title="Shipping" icon={Truck} description="Configure shipping charges">
              <NumberField label="Free Shipping Threshold" value={settings.free_shipping_threshold} onChange={v => update("free_shipping_threshold", v)}
                description="Orders above this get free shipping" />
              <NumberField label="Shipping Charge" value={settings.shipping_charge} onChange={v => update("shipping_charge", v)}
                description="Standard shipping fee for orders below threshold" />
            </SettingsCard>

            {/* Messages */}
            <SettingsCard title="Custom Messages" icon={Tag} description="Checkout messaging">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">COD Advance Message</label>
                <Input value={settings.cod_advance_message || ""} onChange={e => update("cod_advance_message", e.target.value)}
                  className="bg-neutral-900 border-neutral-700 text-white text-xs" placeholder="Use {advance} placeholder" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Prepaid Savings Message</label>
                <Input value={settings.prepaid_savings_message || ""} onChange={e => update("prepaid_savings_message", e.target.value)}
                  className="bg-neutral-900 border-neutral-700 text-white text-xs" placeholder="Use {discount} placeholder" />
              </div>
            </SettingsCard>
          </div>

          <Button onClick={saveSettings} disabled={saving} className="bg-gold text-black font-bold hover:bg-yellow-400" data-testid="save-checkout-settings">
            <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving..." : "Save All Settings"}
          </Button>
        </div>
      )}

      {tab === "risk" && <HighRiskOrdersSection />}
    </div>
  );
};
