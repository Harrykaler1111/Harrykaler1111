import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";
import {
  Zap, Plus, Trash2, Edit2, Check, X, BarChart3,
  MessageSquare, Save, ToggleLeft, ToggleRight, Calendar, Gift
} from "lucide-react";

const getAdminHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("pigma_admin_token")}` });

export const AdminBoosterPanel = () => {
  const [slabs, setSlabs] = useState([]);
  const [messages, setMessages] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("slabs"); // slabs | messages | analytics
  const [editSlab, setEditSlab] = useState(null);
  const [newSlab, setNewSlab] = useState({
    min_cart_value: "", reward_type: "fixed", reward_value: "", reward_label: "",
    is_enabled: true, start_date: "", end_date: "",
    excluded_categories: [], excluded_products: []
  });

  const fetchData = useCallback(async () => {
    try {
      const [slabRes, msgRes, anRes] = await Promise.all([
        axios.get(`${API}/booster/admin/slabs`, { headers: getAdminHeaders() }),
        axios.get(`${API}/booster/admin/messages`, { headers: getAdminHeaders() }),
        axios.get(`${API}/booster/admin/analytics`, { headers: getAdminHeaders() }).catch(() => ({ data: null }))
      ]);
      setSlabs(slabRes.data || []);
      setMessages(msgRes.data || {});
      setAnalytics(anRes.data);
    } catch { toast.error("Failed to load booster config"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createSlab = async () => {
    if (!newSlab.min_cart_value || !newSlab.reward_value) { toast.error("Fill required fields"); return; }
    try {
      await axios.post(`${API}/booster/admin/slabs`, {
        ...newSlab,
        min_cart_value: parseFloat(newSlab.min_cart_value),
        reward_value: parseFloat(newSlab.reward_value),
        reward_label: newSlab.reward_label || (newSlab.reward_type === "percentage" ? `${newSlab.reward_value}% OFF` : `₹${newSlab.reward_value} OFF`),
        start_date: newSlab.start_date || null,
        end_date: newSlab.end_date || null,
      }, { headers: getAdminHeaders() });
      toast.success("Slab created!");
      setNewSlab({ min_cart_value: "", reward_type: "fixed", reward_value: "", reward_label: "", is_enabled: true, start_date: "", end_date: "", excluded_categories: [], excluded_products: [] });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const updateSlab = async (slab) => {
    try {
      await axios.put(`${API}/booster/admin/slabs/${slab.slab_id}`, slab, { headers: getAdminHeaders() });
      toast.success("Slab updated!");
      setEditSlab(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const deleteSlab = async (slabId) => {
    try {
      await axios.delete(`${API}/booster/admin/slabs/${slabId}`, { headers: getAdminHeaders() });
      toast.success("Slab deleted");
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const toggleSlab = async (slab) => {
    await updateSlab({ ...slab, is_enabled: !slab.is_enabled });
  };

  const saveMessages = async () => {
    try {
      const { setting_id, ...rest } = messages;
      await axios.put(`${API}/booster/admin/messages`, rest, { headers: getAdminHeaders() });
      toast.success("Messages saved!");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" /></div>;

  return (
    <div className="space-y-6" data-testid="admin-booster-panel">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="h-6 w-6 text-gold" /> Cart Value Booster
        </h2>
        <div className="flex gap-2">
          {[
            { key: "slabs", label: "Slab Manager", icon: Gift },
            { key: "messages", label: "Messages", icon: MessageSquare },
            { key: "analytics", label: "Analytics", icon: BarChart3 }
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm transition-colors ${tab === t.key ? "bg-gold text-black font-medium" : "text-neutral-400 hover:bg-neutral-800"}`}
              data-testid={`booster-tab-${t.key}`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* SLABS TAB */}
      {tab === "slabs" && (
        <div className="space-y-6">
          {/* Existing Slabs */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-700">
                  <TableHead className="text-neutral-400">Min Cart Value</TableHead>
                  <TableHead className="text-neutral-400">Reward Type</TableHead>
                  <TableHead className="text-neutral-400">Reward</TableHead>
                  <TableHead className="text-neutral-400">Label</TableHead>
                  <TableHead className="text-neutral-400">Time-Based</TableHead>
                  <TableHead className="text-neutral-400">Status</TableHead>
                  <TableHead className="text-neutral-400 w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slabs.map(slab => (
                  <TableRow key={slab.slab_id} className="border-neutral-700" data-testid={`slab-row-${slab.slab_id}`}>
                    {editSlab?.slab_id === slab.slab_id ? (
                      <>
                        <TableCell><Input type="number" value={editSlab.min_cart_value} onChange={e => setEditSlab({ ...editSlab, min_cart_value: parseFloat(e.target.value) })} className="w-24 bg-neutral-900 border-neutral-700 text-white" /></TableCell>
                        <TableCell>
                          <Select value={editSlab.reward_type} onValueChange={v => setEditSlab({ ...editSlab, reward_type: v })}>
                            <SelectTrigger className="w-28 bg-neutral-900 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed (₹)</SelectItem>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="free_item">Free Item</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input type="number" value={editSlab.reward_value} onChange={e => setEditSlab({ ...editSlab, reward_value: parseFloat(e.target.value) })} className="w-20 bg-neutral-900 border-neutral-700 text-white" /></TableCell>
                        <TableCell><Input value={editSlab.reward_label} onChange={e => setEditSlab({ ...editSlab, reward_label: e.target.value })} className="w-28 bg-neutral-900 border-neutral-700 text-white" /></TableCell>
                        <TableCell className="text-neutral-500 text-xs">-</TableCell>
                        <TableCell>
                          <button onClick={() => setEditSlab({ ...editSlab, is_enabled: !editSlab.is_enabled })}>
                            {editSlab.is_enabled ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5 text-neutral-500" />}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <button onClick={() => updateSlab(editSlab)} className="text-green-400 hover:text-green-300 p-1"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setEditSlab(null)} className="text-red-400 hover:text-red-300 p-1"><X className="h-4 w-4" /></button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-white font-medium">₹{slab.min_cart_value.toLocaleString()}</TableCell>
                        <TableCell><Badge className="bg-neutral-700 text-neutral-300">{slab.reward_type}</Badge></TableCell>
                        <TableCell className="text-gold font-bold">{slab.reward_type === "percentage" ? `${slab.reward_value}%` : `₹${slab.reward_value}`}</TableCell>
                        <TableCell className="text-neutral-300">{slab.reward_label}</TableCell>
                        <TableCell className="text-xs text-neutral-500">
                          {slab.start_date || slab.end_date ? (
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {slab.start_date?.slice(0, 10) || "?"} → {slab.end_date?.slice(0, 10) || "∞"}</span>
                          ) : "Always"}
                        </TableCell>
                        <TableCell>
                          <button onClick={() => toggleSlab(slab)} data-testid={`toggle-slab-${slab.slab_id}`}>
                            {slab.is_enabled ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5 text-neutral-500" />}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <button onClick={() => setEditSlab({ ...slab })} className="text-blue-400 hover:text-blue-300 p-1"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => deleteSlab(slab.slab_id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Add New Slab */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-gold" /> Add New Slab</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Min Cart Value (₹) *</label>
                <Input type="number" value={newSlab.min_cart_value} onChange={e => setNewSlab(s => ({ ...s, min_cart_value: e.target.value }))}
                  className="bg-neutral-900 border-neutral-700 text-white" data-testid="new-slab-value" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Reward Type *</label>
                <Select value={newSlab.reward_type} onValueChange={v => setNewSlab(s => ({ ...s, reward_type: v }))}>
                  <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white" data-testid="new-slab-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed (₹)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="free_item">Free Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Reward Value *</label>
                <Input type="number" value={newSlab.reward_value} onChange={e => setNewSlab(s => ({ ...s, reward_value: e.target.value }))}
                  className="bg-neutral-900 border-neutral-700 text-white" data-testid="new-slab-reward" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Label (e.g. ₹100 OFF)</label>
                <Input value={newSlab.reward_label} onChange={e => setNewSlab(s => ({ ...s, reward_label: e.target.value }))}
                  className="bg-neutral-900 border-neutral-700 text-white" data-testid="new-slab-label" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Start Date (optional)</label>
                <Input type="datetime-local" value={newSlab.start_date} onChange={e => setNewSlab(s => ({ ...s, start_date: e.target.value }))}
                  className="bg-neutral-900 border-neutral-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">End Date (optional)</label>
                <Input type="datetime-local" value={newSlab.end_date} onChange={e => setNewSlab(s => ({ ...s, end_date: e.target.value }))}
                  className="bg-neutral-900 border-neutral-700 text-white" />
              </div>
            </div>
            <Button onClick={createSlab} className="bg-gold text-black" data-testid="create-slab-btn">
              <Plus className="h-4 w-4 mr-1" /> Create Slab
            </Button>
          </div>
        </div>
      )}

      {/* MESSAGES TAB */}
      {tab === "messages" && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5 space-y-4">
          <h3 className="text-white font-semibold mb-2">Custom Booster Messages</h3>
          <p className="text-xs text-neutral-400 mb-4">Use {"{amount}"} for remaining amount and {"{reward}"} for reward label.</p>
          {[
            { key: "bar_prefix", label: "Bar Prefix", placeholder: "Add" },
            { key: "bar_suffix", label: "Bar Suffix", placeholder: "more to unlock reward" },
            { key: "unlocked_text", label: "Reward Unlocked", placeholder: "Reward unlocked!" },
            { key: "max_unlocked_text", label: "Max Reward Unlocked", placeholder: "Maximum reward unlocked!" },
            { key: "urgency_text", label: "Urgency Text", placeholder: "Almost there! Don't miss your discount" },
            { key: "upsell_button_text", label: "Upsell Button", placeholder: "View items under ₹300" },
            { key: "near_threshold_text", label: "Near Threshold", placeholder: "You're just {amount} away from saving {reward}" },
          ].map(field => (
            <div key={field.key}>
              <label className="text-xs text-neutral-400 block mb-1">{field.label}</label>
              <Input value={messages[field.key] || ""} onChange={e => setMessages(m => ({ ...m, [field.key]: e.target.value }))}
                placeholder={field.placeholder} className="bg-neutral-900 border-neutral-700 text-white" data-testid={`msg-${field.key}`} />
            </div>
          ))}
          <Button onClick={saveMessages} className="bg-gold text-black" data-testid="save-messages-btn">
            <Save className="h-4 w-4 mr-1" /> Save Messages
          </Button>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {tab === "analytics" && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Slab Unlocks", value: analytics.total_unlocks, color: "text-gold" },
              { label: "Avg Order Value", value: `₹${analytics.average_order_value.toLocaleString()}`, color: "text-green-400" },
              { label: "Recent Orders", value: analytics.total_recent_orders, color: "text-blue-400" },
              { label: "Boosted Orders", value: analytics.boosted_orders, color: "text-purple-400" },
            ].map(s => (
              <div key={s.label} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 text-center" data-testid={`analytics-${s.label.toLowerCase().replace(/ /g, "-")}`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-neutral-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {analytics.slab_stats.length > 0 && (
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-neutral-700"><h3 className="text-white font-semibold">Slab Unlock Breakdown</h3></div>
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-700">
                    <TableHead className="text-neutral-400">Slab ID</TableHead>
                    <TableHead className="text-neutral-400">Total Unlocks</TableHead>
                    <TableHead className="text-neutral-400">Unique Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.slab_stats.map(s => (
                    <TableRow key={s.slab_id} className="border-neutral-700">
                      <TableCell className="text-neutral-300 font-mono text-xs">{s.slab_id}</TableCell>
                      <TableCell className="text-gold font-bold">{s.unlock_count}</TableCell>
                      <TableCell className="text-white">{s.unique_users}</TableCell>
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
