import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Plus, Trash2, Settings, MapPin, Power, Clock, MessageSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

const getAdminHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("pigma_admin_token")}`
});

export const AdminFomoPanel = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMsg, setNewMsg] = useState({ product_name: "", city: "", custom_text: "" });
  const [addingMsg, setAddingMsg] = useState(false);
  const [testNotif, setTestNotif] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/fomo/settings`, { headers: getAdminHeaders() });
      setSettings(res.data);
    } catch { toast.error("Failed to load FOMO settings"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSettings = async (updates) => {
    setSaving(true);
    try {
      await axios.put(`${API}/fomo/settings`, updates, { headers: getAdminHeaders() });
      toast.success("Settings updated");
      fetchSettings();
    } catch { toast.error("Failed to update settings"); }
    finally { setSaving(false); }
  };

  const addMessage = async () => {
    if (!newMsg.product_name && !newMsg.custom_text) {
      toast.error("Enter a product name or custom text");
      return;
    }
    setAddingMsg(true);
    try {
      await axios.post(`${API}/fomo/messages`, newMsg, { headers: getAdminHeaders() });
      toast.success("Message added");
      setNewMsg({ product_name: "", city: "", custom_text: "" });
      fetchSettings();
    } catch { toast.error("Failed to add message"); }
    finally { setAddingMsg(false); }
  };

  const deleteMessage = async (messageId) => {
    try {
      await axios.delete(`${API}/fomo/messages/${messageId}`, { headers: getAdminHeaders() });
      toast.success("Message deleted");
      fetchSettings();
    } catch { toast.error("Failed to delete"); }
  };

  const testFomo = async () => {
    try {
      const res = await axios.get(`${API}/fomo/notification`);
      setTestNotif(res.data);
      setTimeout(() => setTestNotif(null), 5000);
    } catch { toast.error("Failed to fetch test notification"); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" />
    </div>
  );

  const msgs = settings?.custom_messages || [];

  return (
    <div className="space-y-6" data-testid="admin-fomo-panel">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-gold" /> FOMO Notifications
          </h2>
          <p className="text-sm text-neutral-400 mt-1">Live purchase popups to create urgency</p>
        </div>
        <Button onClick={testFomo} variant="outline" size="sm"
          className="border-neutral-700 text-neutral-300 hover:text-white hover:border-gold"
          data-testid="fomo-test-btn">
          <Zap className="h-4 w-4 mr-1" /> Test Popup
        </Button>
      </div>

      {/* Test Notification Preview */}
      <AnimatePresence>
        {testNotif && testNotif.show && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="bg-white shadow-xl rounded-xl p-4 border border-neutral-200 flex items-start gap-3 max-w-sm"
            data-testid="fomo-test-preview"
          >
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-800">{testNotif.text}</p>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3 text-neutral-400" />
                <span className="text-xs text-neutral-400">{testNotif.city}</span>
                <span className="text-xs text-neutral-300 ml-1">just now</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle & Frequency */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Power className="h-5 w-5 text-neutral-400" />
            <div>
              <p className="text-white font-medium">Enable FOMO Notifications</p>
              <p className="text-xs text-neutral-500">Show purchase popups to visitors</p>
            </div>
          </div>
          <Switch
            checked={settings?.enabled ?? true}
            onCheckedChange={(v) => updateSettings({ enabled: v })}
            data-testid="fomo-toggle"
          />
        </div>

        <div className="border-t border-neutral-700 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-neutral-400" />
            <p className="text-sm font-medium text-white">Display Frequency (seconds)</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Minimum interval</label>
              <Input
                type="number"
                value={settings?.frequency_min ?? 300}
                onChange={(e) => setSettings(s => ({ ...s, frequency_min: parseInt(e.target.value) || 0 }))}
                onBlur={() => updateSettings({ frequency_min: settings.frequency_min })}
                className="bg-neutral-900 border-neutral-700 text-white"
                data-testid="fomo-freq-min"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Maximum interval</label>
              <Input
                type="number"
                value={settings?.frequency_max ?? 600}
                onChange={(e) => setSettings(s => ({ ...s, frequency_max: parseInt(e.target.value) || 0 }))}
                onBlur={() => updateSettings({ frequency_max: settings.frequency_max })}
                className="bg-neutral-900 border-neutral-700 text-white"
                data-testid="fomo-freq-max"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Custom Messages */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-5 w-5 text-gold" />
          <h3 className="text-lg font-semibold text-white">Custom Messages</h3>
        </div>
        <p className="text-xs text-neutral-500">
          Add custom FOMO messages. Leave fields empty for auto-generation from recent orders.
        </p>

        {/* Add new message form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            value={newMsg.product_name}
            onChange={(e) => setNewMsg(m => ({ ...m, product_name: e.target.value }))}
            placeholder="Product name"
            className="bg-neutral-900 border-neutral-700 text-white"
            data-testid="fomo-msg-product"
          />
          <Input
            value={newMsg.city}
            onChange={(e) => setNewMsg(m => ({ ...m, city: e.target.value }))}
            placeholder="City (optional)"
            className="bg-neutral-900 border-neutral-700 text-white"
            data-testid="fomo-msg-city"
          />
          <div className="flex gap-2">
            <Input
              value={newMsg.custom_text}
              onChange={(e) => setNewMsg(m => ({ ...m, custom_text: e.target.value }))}
              placeholder="Custom text (optional)"
              className="bg-neutral-900 border-neutral-700 text-white flex-1"
              data-testid="fomo-msg-text"
            />
            <Button onClick={addMessage} disabled={addingMsg}
              className="bg-gold hover:bg-gold/90 text-black flex-shrink-0"
              data-testid="fomo-add-msg-btn">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages list */}
        {msgs.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            No custom messages. Notifications auto-generate from recent orders.
          </div>
        ) : (
          <div className="space-y-2">
            {msgs.map((msg) => (
              <div
                key={msg.message_id}
                className="flex items-center justify-between bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3"
                data-testid={`fomo-msg-${msg.message_id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {msg.custom_text || `Someone from ${msg.city || "a city"} just bought ${msg.product_name || "a product"}`}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                    {msg.product_name && <span>Product: {msg.product_name}</span>}
                    {msg.city && <span>City: {msg.city}</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMessage(msg.message_id)}
                  className="text-neutral-500 hover:text-red-400 flex-shrink-0"
                  data-testid={`fomo-delete-msg-${msg.message_id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
