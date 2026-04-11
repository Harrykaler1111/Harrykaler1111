import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Save, Eye, Image, Video, Type, MessageSquare, Link, Clock, RotateCcw, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export const AdminPopupManager = () => {
  const [config, setConfig] = useState({
    enabled: false,
    title: "",
    description: "",
    image: "",
    video: "",
    cta_text: "",
    cta_link: "",
    delay_seconds: 1,
    force_show: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem("pigma_admin_token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axios.get(`${API}/popup/admin/config`, { headers: getHeaders() });
        setConfig(prev => ({ ...prev, ...data }));
      } catch (_) {}
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/popup/admin/config`, config, { headers: getHeaders() });
      toast.success("Popup config saved!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    }
    setSaving(false);
  };

  const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

  if (loading) return <div className="text-neutral-400 p-8">Loading...</div>;

  return (
    <div className="space-y-6" data-testid="admin-popup-manager">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Site Popup</h2>
          <p className="text-sm text-neutral-400 mt-1">Full-screen popup shown to visitors on page load</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setPreview(!preview)} className="text-neutral-300 border-neutral-700" data-testid="popup-preview-btn">
            <Eye className="h-4 w-4 mr-2" /> {preview ? "Hide Preview" : "Preview"}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-gold hover:bg-gold-dark text-black font-bold" data-testid="popup-save-btn">
            <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config Panel */}
        <div className="space-y-5 bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
          {/* Enabled toggle */}
          <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Power className="h-5 w-5 text-gold" />
              <div>
                <p className="text-white font-semibold text-sm">Popup Active</p>
                <p className="text-neutral-500 text-xs">Show popup to visitors</p>
              </div>
            </div>
            <Switch checked={config.enabled} onCheckedChange={(v) => update("enabled", v)} data-testid="popup-enabled-toggle" />
          </div>

          {/* Title */}
          <div>
            <label className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
              <Type className="h-3.5 w-3.5" /> Title
            </label>
            <Input
              value={config.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Website Under Development"
              className="bg-neutral-800 border-neutral-700 text-white"
              data-testid="popup-title-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
              <MessageSquare className="h-3.5 w-3.5" /> Description
            </label>
            <textarea
              value={config.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Your message to visitors..."
              rows={3}
              className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gold"
              data-testid="popup-description-input"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
              <Image className="h-3.5 w-3.5" /> Image URL (optional)
            </label>
            <Input
              value={config.image}
              onChange={(e) => update("image", e.target.value)}
              placeholder="https://example.com/banner.jpg"
              className="bg-neutral-800 border-neutral-700 text-white"
              data-testid="popup-image-input"
            />
          </div>

          {/* Video URL */}
          <div>
            <label className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
              <Video className="h-3.5 w-3.5" /> Video URL (optional)
            </label>
            <Input
              value={config.video}
              onChange={(e) => update("video", e.target.value)}
              placeholder="https://example.com/promo.mp4"
              className="bg-neutral-800 border-neutral-700 text-white"
              data-testid="popup-video-input"
            />
          </div>

          {/* CTA Button */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                <Link className="h-3.5 w-3.5" /> CTA Button Text
              </label>
              <Input
                value={config.cta_text}
                onChange={(e) => update("cta_text", e.target.value)}
                placeholder="Shop Now"
                className="bg-neutral-800 border-neutral-700 text-white"
                data-testid="popup-cta-text-input"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-2 block">CTA Link</label>
              <Input
                value={config.cta_link}
                onChange={(e) => update("cta_link", e.target.value)}
                placeholder="/shop"
                className="bg-neutral-800 border-neutral-700 text-white"
                data-testid="popup-cta-link-input"
              />
            </div>
          </div>

          {/* Delay + Force */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                <Clock className="h-3.5 w-3.5" /> Delay (seconds)
              </label>
              <Input
                type="number"
                min={0}
                max={10}
                value={config.delay_seconds}
                onChange={(e) => update("delay_seconds", parseInt(e.target.value) || 0)}
                className="bg-neutral-800 border-neutral-700 text-white"
                data-testid="popup-delay-input"
              />
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center justify-between w-full p-3 bg-neutral-800/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-xs text-neutral-400">Force Show</span>
                </div>
                <Switch checked={config.force_show} onCheckedChange={(v) => update("force_show", v)} data-testid="popup-force-toggle" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        {preview && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-neutral-800/50 rounded-2xl border border-neutral-700 overflow-hidden flex items-center justify-center min-h-[400px] p-4"
          >
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
              {config.video ? (
                <div className="w-full aspect-video bg-black">
                  <video src={config.video} controls muted playsInline className="w-full h-full object-cover" />
                </div>
              ) : config.image ? (
                <div className="w-full h-[160px] bg-neutral-100 overflow-hidden">
                  <img src={config.image} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-[80px] bg-gradient-to-r from-neutral-100 to-neutral-200" />
              )}
              <div className="p-5 text-center">
                <h3 className="text-base font-bold text-neutral-900">{config.title || "Popup Title"}</h3>
                <p className="text-xs text-neutral-500 mt-2">{config.description || "Your description here..."}</p>
                {config.cta_text && (
                  <button className="mt-3 px-4 py-2 bg-black text-white text-xs font-semibold rounded-full">
                    {config.cta_text}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
