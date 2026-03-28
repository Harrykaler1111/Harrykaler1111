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

  if (loading) return <div className="animate-pulse text-sm text-neutral-400">Loading policies...</div>;

  return (
    <div className="space-y-6" data-testid="admin-policies-panel">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Policy Pages</h2>
        <Button onClick={() => { setCreating(true); setEditingPolicy(null); }} className="bg-black text-white" data-testid="create-policy-btn">
          <Plus className="h-4 w-4 mr-1" /> New Policy
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
        {policies.map(p => (
          <div key={p.policy_id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow" data-testid={`policy-row-${p.slug}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-neutral-400" />
                <div>
                  <h3 className="font-medium text-sm">{p.title}</h3>
                  <p className="text-[10px] text-neutral-400">
                    /policy/{p.slug} | Updated {new Date(p.updated_at).toLocaleDateString()} by {p.last_updated_by}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={p.is_published ? "default" : "outline"} className={`text-[10px] ${p.is_published ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                  {p.is_published ? "Published" : "Draft"}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleTogglePublish(p)}>
                  {p.is_published ? <Eye className="h-3.5 w-3.5 text-green-500" /> : <EyeOff className="h-3.5 w-3.5 text-neutral-300" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPolicy(p); setCreating(false); }} data-testid={`edit-policy-${p.slug}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(p.policy_id)}>
                  <Trash2 className="h-3.5 w-3.5" />
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
      className="border rounded-lg p-5 bg-neutral-50 space-y-4"
      data-testid="policy-editor"
    >
      <h3 className="font-bold text-sm">{policy ? "Edit Policy" : "New Policy"}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Title</label>
          <Input value={title} onChange={e => { setTitle(e.target.value); if (!policy) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")); }} placeholder="Return Policy" data-testid="policy-title-input" />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Slug (URL path)</label>
          <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="return-policy" data-testid="policy-slug-input" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">Content (Markdown-style)</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="## Heading&#10;&#10;**Bold Section**&#10;- Bullet point&#10;- Another point"
          className="w-full h-64 border rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-black"
          data-testid="policy-content-textarea"
        />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is-published" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="rounded" />
        <label htmlFor="is-published" className="text-sm">Publish immediately</label>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave(policy?.policy_id, { title, slug, content, is_published: isPublished })} className="bg-black text-white" data-testid="save-policy-btn">
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
      </div>
    </motion.div>
  );
};
