import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Eye, EyeOff, FileText, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const AdminPoliciesPanel = ({ token }) => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [creating, setCreating] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };

  const fetchPolicies = async () => {
    try {
      const res = await axios.get(`${API}/policies/admin/all`, { headers });
      setPolicies(res.data || []);
    } catch { toast.error("Failed to load policies"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPolicies(); }, []);

  const handleSave = async (policyId, data) => {
    try {
      if (policyId) {
        await axios.put(`${API}/policies/admin/${policyId}`, data, { headers });
        toast.success("Policy updated");
      } else {
        await axios.post(`${API}/policies/admin`, data, { headers });
        toast.success("Policy created");
      }
      setEditingPolicy(null);
      setCreating(false);
      fetchPolicies();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to save"); }
  };

  const handleDelete = async (policyId) => {
    if (!window.confirm("Delete this policy page permanently?")) return;
    try {
      await axios.delete(`${API}/policies/admin/${policyId}`, { headers });
      toast.success("Policy deleted");
      fetchPolicies();
    } catch { toast.error("Failed to delete"); }
  };

  const handleTogglePublish = async (policy) => {
    try {
      await axios.put(`${API}/policies/admin/${policy.policy_id}`, { is_published: !policy.is_published }, { headers });
      toast.success(policy.is_published ? "Policy unpublished" : "Policy published");
      fetchPolicies();
    } catch { toast.error("Failed to update"); }
  };

  if (loading) return <div className="py-12 text-center text-neutral-400">Loading policies...</div>;

  return (
    <div className="space-y-6" data-testid="admin-policies-panel">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Policy Pages</h2>
        <Button onClick={() => { setCreating(true); setEditingPolicy(null); }} className="bg-gold text-black font-bold hover:bg-yellow-400" data-testid="create-policy-btn">
          <Plus className="h-4 w-4 mr-1.5" /> New Policy
        </Button>
      </div>

      <p className="text-xs text-neutral-400">
        Edit your store's policies. Changes are visible to customers immediately. Use Markdown-style formatting (## for headings, ** for bold, - for bullets).
      </p>

      {/* Create / Edit Form */}
      {(creating || editingPolicy) && (
        <PolicyEditor
          policy={editingPolicy}
          onSave={handleSave}
          onCancel={() => { setEditingPolicy(null); setCreating(false); }}
        />
      )}

      {/* Policies List */}
      <div className="space-y-2">
        {policies.map((p, idx) => (
          <div
            key={p.policy_id}
            className="border border-neutral-700 rounded-xl p-4 hover:border-neutral-600 transition-all"
            style={{ backgroundColor: idx % 2 === 0 ? "#262626" : "#1f1f1f" }}
            data-testid={`policy-row-${p.slug}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-gold flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-white">{p.title}</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    /policy/{p.slug} | Updated {new Date(p.updated_at).toLocaleDateString()} by {p.last_updated_by}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge className={`text-[10px] font-semibold border-0 ${p.is_published ? "bg-green-900/50 text-green-300" : "bg-neutral-700 text-neutral-400"}`}>
                  {p.is_published ? "Published" : "Draft"}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600" onClick={() => handleTogglePublish(p)}>
                  {p.is_published ? <Eye className="h-4 w-4 text-green-400" /> : <EyeOff className="h-4 w-4 text-neutral-500" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600" onClick={() => { setEditingPolicy(p); setCreating(false); }} data-testid={`edit-policy-${p.slug}`}>
                  <Pencil className="h-4 w-4 text-neutral-300 hover:text-gold" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-900/40" onClick={() => handleDelete(p.policy_id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PolicyEditor = ({ policy, onSave, onCancel }) => {
  const [title, setTitle] = useState(policy?.title || "");
  const [slug, setSlug] = useState(policy?.slug || "");
  const [content, setContent] = useState(policy?.content || "");
  const [isPublished, setIsPublished] = useState(policy?.is_published ?? true);

  useEffect(() => {
    if (!policy && title && !slug) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [title, policy, slug]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-neutral-700 rounded-xl p-5 bg-neutral-800/50 space-y-4"
      data-testid="policy-editor"
    >
      <h3 className="font-bold text-sm text-gold">{policy ? "Edit Policy" : "New Policy"}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1 block">Title</label>
          <Input value={title} onChange={e => { setTitle(e.target.value); if (!policy) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")); }}
            placeholder="Return Policy" className="bg-neutral-900 border-neutral-600 text-white placeholder:text-neutral-500" data-testid="policy-title-input" />
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1 block">Slug (URL path)</label>
          <Input value={slug} onChange={e => setSlug(e.target.value)}
            placeholder="return-policy" className="bg-neutral-900 border-neutral-600 text-white placeholder:text-neutral-500" data-testid="policy-slug-input" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1 block">Content (Markdown-style)</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="## Heading&#10;&#10;**Bold Section**&#10;- Bullet point&#10;- Another point"
          className="w-full h-64 bg-neutral-900 border border-neutral-600 text-white rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:border-gold placeholder:text-neutral-500"
          data-testid="policy-content-textarea"
        />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is-published" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="accent-gold w-4 h-4" />
        <label htmlFor="is-published" className="text-sm text-neutral-300">Publish immediately</label>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave(policy?.policy_id, { title, slug, content, is_published: isPublished })} className="bg-gold text-black font-bold hover:bg-yellow-400" data-testid="save-policy-btn">
          <Save className="h-4 w-4 mr-1.5" /> Save
        </Button>
        <Button variant="outline" className="border-neutral-600 text-neutral-300 hover:text-white" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
      </div>
    </motion.div>
  );
};
