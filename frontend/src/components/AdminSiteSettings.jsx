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
  Video, Upload, Trash2, Plus, Play, Send, MessageCircle,
  Instagram, Phone, AlertCircle, Zap, TrendingUp, Settings,
  Check, X, Eye, TestTube
} from "lucide-react";

const getAdminHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("pigma_admin_token")}` });

// ============== HERO VIDEO MANAGEMENT ==============
export const HeroVideoManagement = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState("");
  const [posterInput, setPosterInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/site/hero-video`, { headers: getAdminHeaders() });
      setConfig(res.data);
      setUrlInput(res.data.video_url || "");
      setPosterInput(res.data.poster_url || "");
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const saveUrl = async () => {
    try {
      await axios.put(`${API}/admin/site/hero-video`, {
        video_url: urlInput || null,
        poster_url: posterInput || null,
      }, { headers: getAdminHeaders() });
      toast.success("Hero video updated!");
      fetchConfig();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const uploadVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["video/mp4", "video/webm"].includes(file.type)) { toast.error("Only MP4 and WebM allowed"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("Video must be under 50MB"); return; }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/admin/site/hero-video/upload`, formData, {
        headers: { ...getAdminHeaders(), "Content-Type": "multipart/form-data" }
      });
      toast.success("Video uploaded successfully!");
      setUrlInput(res.data.video_url);
      fetchConfig();
    } catch (err) { toast.error(err.response?.data?.detail || "Upload failed"); }
    finally { setUploading(false); }
  };

  if (loading) return <div className="animate-pulse h-40 bg-neutral-800 rounded-xl" />;

  return (
    <div className="space-y-6" data-testid="hero-video-management">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Video className="h-5 w-5 text-gold" /> Hero Video Management
        </h3>
      </div>

      {/* Current Preview */}
      {config?.video_url && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
          <p className="text-xs text-neutral-400 mb-2">Current Hero Video</p>
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-48">
            <video src={config.video_url.startsWith("/") ? `${process.env.REACT_APP_BACKEND_URL}${config.video_url}` : config.video_url}
              controls muted className="w-full h-full object-cover" data-testid="hero-video-preview" />
          </div>
          <p className="text-[10px] text-neutral-500 mt-2 truncate">URL: {config.video_url}</p>
        </div>
      )}

      {/* Upload New Video */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 space-y-4">
        <p className="text-sm font-medium text-white">Upload New Video</p>
        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-neutral-600 rounded-lg cursor-pointer hover:border-gold transition-colors">
          <Upload className={`h-8 w-8 ${uploading ? "text-gold animate-pulse" : "text-neutral-500"}`} />
          <span className="text-xs text-neutral-400 mt-2">{uploading ? "Uploading..." : "Click to upload MP4/WebM (max 50MB)"}</span>
          <input type="file" accept="video/mp4,video/webm" onChange={uploadVideo} className="hidden" disabled={uploading} data-testid="hero-video-upload-input" />
        </label>
      </div>

      {/* Or Paste URL */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-white">Or Set Video URL</p>
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Video URL</label>
          <Input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://example.com/video.mp4"
            className="bg-neutral-900 border-neutral-700 text-white" data-testid="hero-video-url-input" />
        </div>
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Poster Image URL (fallback)</label>
          <Input value={posterInput} onChange={e => setPosterInput(e.target.value)} placeholder="https://example.com/poster.jpg"
            className="bg-neutral-900 border-neutral-700 text-white" data-testid="hero-poster-url-input" />
        </div>
        <Button onClick={saveUrl} className="bg-gold text-black" data-testid="save-hero-video-btn">
          <Check className="h-4 w-4 mr-1" /> Save Video Settings
        </Button>
      </div>
    </div>
  );
};


// ============== TIERED REFERRAL COMMISSION ==============
export const ReferralTiersManagement = () => {
  const [tiers, setTiers] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("config"); // config | report
  const [newTier, setNewTier] = useState({ min_referrals: "", max_referrals: "", rate: "" });

  const fetchData = useCallback(async () => {
    try {
      const [tierRes, reportRes] = await Promise.all([
        axios.get(`${API}/admin/site/referral-tiers`, { headers: getAdminHeaders() }),
        axios.get(`${API}/admin/site/referral-tiers/report`, { headers: getAdminHeaders() }).catch(() => ({ data: { report: [] } }))
      ]);
      setTiers(tierRes.data.tiers || []);
      setIsEnabled(tierRes.data.is_enabled !== false);
      setReport(reportRes.data.report || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addTier = () => {
    const min = parseInt(newTier.min_referrals);
    const max = parseInt(newTier.max_referrals) || -1;
    const rate = parseFloat(newTier.rate);
    if (isNaN(min) || isNaN(rate)) { toast.error("Fill all fields"); return; }
    setTiers([...tiers, { min_referrals: min, max_referrals: max, rate }]);
    setNewTier({ min_referrals: "", max_referrals: "", rate: "" });
  };

  const removeTier = (index) => setTiers(tiers.filter((_, i) => i !== index));

  const saveTiers = async () => {
    try {
      await axios.put(`${API}/admin/site/referral-tiers`, { tiers, is_enabled: isEnabled }, { headers: getAdminHeaders() });
      toast.success("Referral tiers saved!");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  if (loading) return <div className="animate-pulse h-40 bg-neutral-800 rounded-xl" />;

  return (
    <div className="space-y-6" data-testid="referral-tiers-management">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gold" /> Tiered Referral Commissions
        </h3>
        <div className="flex gap-2">
          {["config", "report"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-colors ${tab === t ? "bg-gold text-black font-medium" : "text-neutral-400 hover:bg-neutral-800"}`}
              data-testid={`tier-tab-${t}`}>
              {t === "config" ? "Configuration" : "Tracking Report"}
            </button>
          ))}
        </div>
      </div>

      {tab === "config" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
            <button onClick={() => setIsEnabled(!isEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${isEnabled ? "bg-green-500" : "bg-neutral-600"} relative`}
              data-testid="tier-toggle">
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
            <span className="text-sm text-white">Tiered commissions {isEnabled ? "enabled" : "disabled"}</span>
          </div>

          {/* Current Tiers */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-700">
                  <TableHead className="text-neutral-400">Min Referrals</TableHead>
                  <TableHead className="text-neutral-400">Max Referrals</TableHead>
                  <TableHead className="text-neutral-400">Commission Rate</TableHead>
                  <TableHead className="text-neutral-400 w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((t, i) => (
                  <TableRow key={i} className="border-neutral-700" data-testid={`tier-row-${i}`}>
                    <TableCell className="text-white">{t.min_referrals}</TableCell>
                    <TableCell className="text-white">{t.max_referrals === -1 ? "Unlimited" : t.max_referrals}</TableCell>
                    <TableCell className="text-gold font-bold">{t.rate}%</TableCell>
                    <TableCell>
                      <button onClick={() => removeTier(i)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Add new tier row */}
                <TableRow className="border-neutral-700">
                  <TableCell><Input type="number" value={newTier.min_referrals} onChange={e => setNewTier(n => ({ ...n, min_referrals: e.target.value }))} placeholder="1" className="bg-neutral-900 border-neutral-700 text-white w-20" /></TableCell>
                  <TableCell><Input type="number" value={newTier.max_referrals} onChange={e => setNewTier(n => ({ ...n, max_referrals: e.target.value }))} placeholder="-1 = ∞" className="bg-neutral-900 border-neutral-700 text-white w-20" /></TableCell>
                  <TableCell><Input type="number" step="0.1" value={newTier.rate} onChange={e => setNewTier(n => ({ ...n, rate: e.target.value }))} placeholder="1.5" className="bg-neutral-900 border-neutral-700 text-white w-20" /></TableCell>
                  <TableCell>
                    <button onClick={addTier} className="text-green-400 hover:text-green-300" data-testid="add-tier-btn">
                      <Plus className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <Button onClick={saveTiers} className="bg-gold text-black" data-testid="save-tiers-btn">
            <Check className="h-4 w-4 mr-1" /> Save Tier Configuration
          </Button>
        </div>
      )}

      {tab === "report" && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
          {report.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">No referral data yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-700">
                  <TableHead className="text-neutral-400">Name</TableHead>
                  <TableHead className="text-neutral-400">Type</TableHead>
                  <TableHead className="text-neutral-400">Referrals</TableHead>
                  <TableHead className="text-neutral-400">Current Rate</TableHead>
                  <TableHead className="text-neutral-400">Tier</TableHead>
                  <TableHead className="text-neutral-400">Total Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.map((r, i) => (
                  <TableRow key={i} className="border-neutral-700">
                    <TableCell className="text-white font-medium">{r.name || "N/A"}</TableCell>
                    <TableCell><Badge className={r.type === "influencer" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}>{r.type}</Badge></TableCell>
                    <TableCell className="text-white">{r.referral_count}</TableCell>
                    <TableCell className="text-gold font-bold">{r.current_rate}%</TableCell>
                    <TableCell className="text-neutral-400">{r.tier_range}</TableCell>
                    <TableCell className="text-green-400">₹{r.total_earned.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
};


// ============== INSTAGRAM AUTO DM ==============
export const InstagramDMManagement = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState("");
  const [token, setToken] = useState("");
  const [newRule, setNewRule] = useState({ trigger_keyword: "", dm_message: "" });
  const [testUser, setTestUser] = useState("");

  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/site/instagram/config`, { headers: getAdminHeaders() });
      setConfig(res.data);
      setHandle(res.data.instagram_handle || "");
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const connectIG = async () => {
    try {
      await axios.put(`${API}/admin/site/instagram/config?instagram_handle=${handle}&access_token=${token || "mock_token"}`, {}, { headers: getAdminHeaders() });
      toast.success("Instagram connected (MOCK)");
      fetchConfig();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const addRule = async () => {
    if (!newRule.trigger_keyword || !newRule.dm_message) { toast.error("Fill all fields"); return; }
    try {
      await axios.post(`${API}/admin/site/instagram/rules`, newRule, { headers: getAdminHeaders() });
      toast.success("Rule added!");
      setNewRule({ trigger_keyword: "", dm_message: "" });
      fetchConfig();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const deleteRule = async (ruleId) => {
    try {
      await axios.delete(`${API}/admin/site/instagram/rules/${ruleId}`, { headers: getAdminHeaders() });
      toast.success("Rule deleted");
      fetchConfig();
    } catch { /* ignore */ }
  };

  const testDM = async (ruleId) => {
    try {
      const res = await axios.post(`${API}/admin/site/instagram/test-dm?rule_id=${ruleId}&username=${testUser || "test_user"}`, {}, { headers: getAdminHeaders() });
      toast.success(res.data.message);
      fetchConfig();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  if (loading) return <div className="animate-pulse h-40 bg-neutral-800 rounded-xl" />;

  return (
    <div className="space-y-6" data-testid="instagram-dm-management">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Instagram className="h-5 w-5 text-pink-400" /> Instagram Auto DM
        </h3>
        <Badge className={config?.is_connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
          {config?.is_connected ? "Connected (MOCK)" : "Not Connected"}
        </Badge>
      </div>

      {/* Connection */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-white">Instagram Connection</p>
        <p className="text-xs text-yellow-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Currently using MOCKED API. Connect real Meta credentials to go live.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Instagram Handle</label>
            <Input value={handle} onChange={e => setHandle(e.target.value)} placeholder="@your_brand"
              className="bg-neutral-900 border-neutral-700 text-white" data-testid="ig-handle-input" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Access Token</label>
            <Input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="Meta Graph API token"
              className="bg-neutral-900 border-neutral-700 text-white" data-testid="ig-token-input" />
          </div>
        </div>
        <Button onClick={connectIG} className="bg-gradient-to-r from-purple-600 to-pink-500 text-white" data-testid="ig-connect-btn">
          <Instagram className="h-4 w-4 mr-1" /> {config?.is_connected ? "Update Connection" : "Connect Instagram"}
        </Button>
      </div>

      {/* DM Rules */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 space-y-4">
        <p className="text-sm font-medium text-white">Auto-DM Rules</p>
        <p className="text-xs text-neutral-400">When a user comments a trigger keyword on your post, they automatically receive a DM.</p>

        {(config?.rules || []).map(rule => (
          <div key={rule.rule_id} className="flex items-center gap-3 bg-neutral-900 rounded-lg p-3" data-testid={`ig-rule-${rule.rule_id}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-pink-500/20 text-pink-400 text-xs">#{rule.trigger_keyword}</Badge>
                <Badge className={rule.is_active ? "bg-green-500/20 text-green-400" : "bg-neutral-600 text-neutral-400"}>{rule.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="text-xs text-neutral-300 mt-1 truncate">{rule.dm_message}</p>
            </div>
            <button onClick={() => testDM(rule.rule_id)} className="text-gold hover:text-gold/80 p-1" title="Test DM">
              <Send className="h-4 w-4" />
            </button>
            <button onClick={() => deleteRule(rule.rule_id)} className="text-red-400 hover:text-red-300 p-1">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Add new rule */}
        <div className="border-t border-neutral-700 pt-3 space-y-2">
          <Input value={newRule.trigger_keyword} onChange={e => setNewRule(n => ({ ...n, trigger_keyword: e.target.value }))}
            placeholder="Trigger keyword (e.g. 'price', 'link')" className="bg-neutral-900 border-neutral-700 text-white" data-testid="ig-keyword-input" />
          <Input value={newRule.dm_message} onChange={e => setNewRule(n => ({ ...n, dm_message: e.target.value }))}
            placeholder="DM message to send" className="bg-neutral-900 border-neutral-700 text-white" data-testid="ig-message-input" />
          <Button onClick={addRule} size="sm" className="bg-gold text-black" data-testid="ig-add-rule-btn">
            <Plus className="h-4 w-4 mr-1" /> Add Rule
          </Button>
        </div>
      </div>

      {/* Test DM */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-white">Test DM Sending</p>
        <div className="flex gap-2">
          <Input value={testUser} onChange={e => setTestUser(e.target.value)} placeholder="@username"
            className="bg-neutral-900 border-neutral-700 text-white flex-1" data-testid="ig-test-user" />
          <Button onClick={() => testDM("")} className="bg-pink-500 text-white" data-testid="ig-test-send-btn">
            <Send className="h-4 w-4 mr-1" /> Test Send
          </Button>
        </div>
      </div>

      {/* DM History */}
      {(config?.dm_history || []).length > 0 && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
          <p className="text-sm font-medium text-white mb-3">Recent DM History</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(config?.dm_history || []).reverse().slice(0, 20).map(dm => (
              <div key={dm.dm_id} className="flex items-center justify-between text-xs bg-neutral-900 rounded p-2">
                <div>
                  <span className="text-white font-medium">@{dm.username}</span>
                  <span className="text-neutral-500 ml-2">{dm.message.slice(0, 50)}...</span>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-400">{dm.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// ============== WHATSAPP CART REMINDERS ==============
export const WhatsAppRemindersManagement = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [testEvent, setTestEvent] = useState("test_message");
  const [sending, setSending] = useState(false);
  const [broadcastTemplate, setBroadcastTemplate] = useState("");
  const [broadcastSegment, setBroadcastSegment] = useState("all");
  const [broadcastPhones, setBroadcastPhones] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  const h = getAdminHeaders();

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, stRes, mRes, cRes] = await Promise.all([
        axios.get(`${API}/whatsapp/settings`, { headers: h }),
        axios.get(`${API}/whatsapp/stats`, { headers: h }),
        axios.get(`${API}/whatsapp/messages?limit=30`, { headers: h }),
        axios.get(`${API}/whatsapp/campaigns`, { headers: h }),
      ]);
      setSettings(sRes.data);
      setStats(stRes.data);
      setMessages(mRes.data.messages || []);
      setCampaigns(cRes.data.campaigns || []);
    } catch { /* ignore initial load error */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleSetting = async (key) => {
    try {
      const val = !settings[key];
      await axios.put(`${API}/whatsapp/settings`, { [key]: val }, { headers: h });
      setSettings(prev => ({ ...prev, [key]: val }));
      toast.success(`${key.replace(/_/g, " ")} ${val ? "enabled" : "disabled"}`);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const updateDelay = async (val) => {
    try {
      await axios.put(`${API}/whatsapp/settings`, { abandoned_cart_delay_minutes: val }, { headers: h });
      setSettings(prev => ({ ...prev, abandoned_cart_delay_minutes: val }));
      toast.success("Delay updated");
    } catch (err) { toast.error("Failed"); }
  };

  const sendTest = async () => {
    if (!testPhone) { toast.error("Enter a phone number"); return; }
    setSending(true);
    try {
      const res = await axios.post(`${API}/whatsapp/test`, { phone: testPhone, event_name: testEvent }, { headers: h });
      if (res.data.success) toast.success("Test message sent!");
      else toast.error(`Failed: ${JSON.stringify(res.data.result?.data?.message || "Unknown error")}`);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSending(false); }
  };

  const sendBroadcast = async () => {
    if (!broadcastTemplate) { toast.error("Enter template name"); return; }
    setBroadcasting(true);
    try {
      const body = {
        template_name: broadcastTemplate,
        target_segment: broadcastSegment,
        body_values: broadcastBody ? broadcastBody.split(",").map(s => s.trim()) : null,
        phone_numbers: broadcastSegment === "custom" && broadcastPhones ? broadcastPhones.split(",").map(s => s.trim()) : null,
      };
      const res = await axios.post(`${API}/whatsapp/broadcast`, body, { headers: h });
      toast.success(`Broadcast started: ${res.data.total_recipients} recipients`);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "No recipients found"); }
    finally { setBroadcasting(false); }
  };

  const triggerAbandonedCart = async () => {
    try {
      await axios.post(`${API}/whatsapp/check-abandoned-carts`, {}, { headers: h });
      toast.success("Abandoned cart check triggered");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const Toggle = ({ enabled, onToggle, label }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-neutral-300">{label}</span>
      <button onClick={onToggle}
        className={`w-10 h-5 rounded-full transition-colors ${enabled ? "bg-green-500" : "bg-neutral-600"} relative`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );

  const statusColor = (s) => {
    if (s === "delivered") return "bg-green-500/20 text-green-400";
    if (s === "read") return "bg-blue-500/20 text-blue-400";
    if (s === "failed") return "bg-red-500/20 text-red-400";
    return "bg-yellow-500/20 text-yellow-400";
  };

  if (loading) return <div className="animate-pulse h-40 bg-neutral-800 rounded-xl" />;

  return (
    <div className="space-y-6" data-testid="whatsapp-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Phone className="h-5 w-5 text-green-400" /> WhatsApp Business (Interakt)
        </h3>
        <Badge className="bg-green-500/20 text-green-400" data-testid="wa-connection-status">
          Connected via Interakt
        </Badge>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 flex-wrap" data-testid="wa-section-tabs">
        {[
          { key: "dashboard", label: "Dashboard" },
          { key: "settings", label: "Settings" },
          { key: "broadcast", label: "Broadcast" },
          { key: "messages", label: "Messages" },
          { key: "test", label: "Test" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveSection(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeSection === tab.key ? "bg-green-600 text-white" : "bg-neutral-800 text-neutral-400 hover:text-white"}`}
            data-testid={`wa-tab-${tab.key}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {activeSection === "dashboard" && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 text-center" data-testid="wa-stat-sent">
              <p className="text-2xl font-bold text-white">{stats.total_sent}</p>
              <p className="text-xs text-neutral-400">Total Sent</p>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 text-center" data-testid="wa-stat-delivered">
              <p className="text-2xl font-bold text-green-400">{stats.total_delivered}</p>
              <p className="text-xs text-neutral-400">Delivered</p>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 text-center" data-testid="wa-stat-read">
              <p className="text-2xl font-bold text-blue-400">{stats.total_read}</p>
              <p className="text-xs text-neutral-400">Read</p>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 text-center" data-testid="wa-stat-failed">
              <p className="text-2xl font-bold text-red-400">{stats.total_failed}</p>
              <p className="text-xs text-neutral-400">Failed</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{stats.delivery_rate}%</p>
              <p className="text-xs text-neutral-400">Delivery Rate</p>
            </div>
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.last_7_days}</p>
              <p className="text-xs text-neutral-400">Last 7 Days</p>
            </div>
          </div>

          {/* Recent Campaigns */}
          {campaigns.length > 0 && (
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-3">Recent Campaigns</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {campaigns.slice(0, 5).map(c => (
                  <div key={c.campaign_id} className="flex items-center justify-between text-xs bg-neutral-900 rounded p-2">
                    <div>
                      <span className="text-white font-medium">{c.template_name}</span>
                      <span className="text-neutral-500 ml-2">{c.target_segment}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">{c.sent_count} sent</span>
                      {c.failed_count > 0 && <span className="text-red-400">{c.failed_count} failed</span>}
                      <Badge className={c.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>{c.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      {activeSection === "settings" && settings && (
        <div className="space-y-4">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 space-y-1" data-testid="wa-notification-settings">
            <p className="text-sm font-medium text-white mb-3">Order Notifications</p>
            <Toggle enabled={settings.order_placed_enabled} onToggle={() => toggleSetting("order_placed_enabled")} label="Order Placed" />
            <Toggle enabled={settings.order_confirmed_enabled} onToggle={() => toggleSetting("order_confirmed_enabled")} label="Order Confirmed" />
            <Toggle enabled={settings.order_shipped_enabled} onToggle={() => toggleSetting("order_shipped_enabled")} label="Order Shipped" />
            <Toggle enabled={settings.order_delivered_enabled} onToggle={() => toggleSetting("order_delivered_enabled")} label="Order Delivered" />
          </div>

          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 space-y-1" data-testid="wa-cod-settings">
            <p className="text-sm font-medium text-white mb-3">COD & Recovery</p>
            <Toggle enabled={settings.cod_confirmation_enabled} onToggle={() => toggleSetting("cod_confirmation_enabled")} label="COD Confirmation via WhatsApp" />
            <Toggle enabled={settings.abandoned_cart_enabled} onToggle={() => toggleSetting("abandoned_cart_enabled")} label="Abandoned Cart Recovery" />
            <div className="flex items-center gap-3 mt-3">
              <label className="text-xs text-neutral-400">Cart abandonment delay (min)</label>
              <Input type="number" value={settings.abandoned_cart_delay_minutes} onChange={e => updateDelay(parseInt(e.target.value) || 30)}
                className="bg-neutral-900 border-neutral-700 text-white w-20 h-8 text-xs" data-testid="wa-delay-input" />
            </div>
            <div className="mt-3">
              <Button onClick={triggerAbandonedCart} size="sm" variant="outline" className="border-green-500 text-green-400 hover:bg-green-500/10 text-xs" data-testid="wa-trigger-abandoned">
                <Zap className="h-3 w-3 mr-1" /> Run Abandoned Cart Check Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast */}
      {activeSection === "broadcast" && (
        <div className="space-y-4">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 space-y-3" data-testid="wa-broadcast-panel">
            <p className="text-sm font-medium text-white">Send Broadcast Campaign</p>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Template Name (must be approved in Interakt)</label>
              <Input value={broadcastTemplate} onChange={e => setBroadcastTemplate(e.target.value)}
                placeholder="e.g. sale_announcement"
                className="bg-neutral-900 border-neutral-700 text-white" data-testid="wa-broadcast-template" />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Body Values (comma separated)</label>
              <Input value={broadcastBody} onChange={e => setBroadcastBody(e.target.value)}
                placeholder="e.g. 50% OFF, FLASH50"
                className="bg-neutral-900 border-neutral-700 text-white" data-testid="wa-broadcast-body" />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Target Segment</label>
              <select value={broadcastSegment} onChange={e => setBroadcastSegment(e.target.value)}
                className="w-full text-sm bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-white" data-testid="wa-broadcast-segment">
                <option value="all">All Customers</option>
                <option value="recent_buyers">Recent Buyers (30 days)</option>
                <option value="cod_customers">COD Customers</option>
                <option value="custom">Custom Phone Numbers</option>
              </select>
            </div>
            {broadcastSegment === "custom" && (
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Phone Numbers (comma separated, with +91)</label>
                <textarea value={broadcastPhones} onChange={e => setBroadcastPhones(e.target.value)} rows={2}
                  className="w-full text-sm border border-neutral-700 bg-neutral-900 rounded-md px-3 py-2 text-white resize-none"
                  placeholder="+919625992057, +919876543210" data-testid="wa-broadcast-phones" />
              </div>
            )}
            <Button onClick={sendBroadcast} disabled={broadcasting} className="bg-green-600 text-white hover:bg-green-700" data-testid="wa-send-broadcast">
              <Send className="h-4 w-4 mr-1" /> {broadcasting ? "Sending..." : "Send Broadcast"}
            </Button>
          </div>

          {/* Campaign History */}
          {campaigns.length > 0 && (
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-3">Campaign History</p>
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-700">
                    <TableHead className="text-neutral-400">Template</TableHead>
                    <TableHead className="text-neutral-400">Segment</TableHead>
                    <TableHead className="text-neutral-400">Sent</TableHead>
                    <TableHead className="text-neutral-400">Failed</TableHead>
                    <TableHead className="text-neutral-400">Status</TableHead>
                    <TableHead className="text-neutral-400">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map(c => (
                    <TableRow key={c.campaign_id} className="border-neutral-700">
                      <TableCell className="text-white text-xs">{c.template_name}</TableCell>
                      <TableCell className="text-neutral-400 text-xs">{c.target_segment}</TableCell>
                      <TableCell className="text-green-400 text-xs">{c.sent_count}</TableCell>
                      <TableCell className="text-red-400 text-xs">{c.failed_count}</TableCell>
                      <TableCell><Badge className={c.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>{c.status}</Badge></TableCell>
                      <TableCell className="text-neutral-500 text-xs">{new Date(c.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Messages Log */}
      {activeSection === "messages" && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4" data-testid="wa-messages-log">
          <p className="text-sm font-medium text-white mb-3">Message Log ({messages.length})</p>
          {messages.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-4">No messages sent yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {messages.map(m => (
                <div key={m.message_id} className="flex items-center justify-between text-xs bg-neutral-900 rounded p-2.5">
                  <div className="flex items-center gap-3">
                    <Phone className="h-3.5 w-3.5 text-green-400 shrink-0" />
                    <div>
                      <span className="text-white font-medium">{m.phone}</span>
                      <span className="text-neutral-500 ml-2">{m.message_type}</span>
                      {m.order_id && <span className="text-neutral-600 ml-1">#{m.order_id?.slice(-6)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColor(m.delivery_status)}>{m.delivery_status}</Badge>
                    <span className="text-neutral-600 text-[10px]">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Test */}
      {activeSection === "test" && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 space-y-3" data-testid="wa-test-panel">
          <p className="text-sm font-medium text-white">Send Test Message</p>
          <p className="text-xs text-neutral-400">Send a test event to verify your Interakt connection.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Phone Number</label>
              <Input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="+919625992057"
                className="bg-neutral-900 border-neutral-700 text-white" data-testid="wa-test-phone" />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Event Name</label>
              <select value={testEvent} onChange={e => setTestEvent(e.target.value)}
                className="w-full text-sm bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-white" data-testid="wa-test-event">
                <option value="test_message">Test Message</option>
                <option value="order_placed">Order Placed</option>
                <option value="order_confirmed">Order Confirmed</option>
                <option value="order_shipped">Order Shipped</option>
                <option value="order_delivered">Order Delivered</option>
                <option value="cod_confirmation_required">COD Confirmation</option>
                <option value="cart_abandoned">Cart Abandoned</option>
              </select>
            </div>
          </div>
          <Button onClick={sendTest} disabled={sending} className="bg-green-600 text-white hover:bg-green-700" data-testid="wa-send-test">
            <Send className="h-4 w-4 mr-1" /> {sending ? "Sending..." : "Send Test"}
          </Button>
        </div>
      )}
    </div>
  );
};
