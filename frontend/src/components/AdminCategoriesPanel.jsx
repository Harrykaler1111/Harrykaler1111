import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const AdminCategoriesPanel = ({ token }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [editingSub, setEditingSub] = useState(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubDesc, setNewSubDesc] = useState("");
  const [addingSubTo, setAddingSubTo] = useState(null);
  const headers = { Authorization: `Bearer ${token}` };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/categories/admin/all`, { headers });
      setCategories(res.data || []);
    } catch { toast.error("Failed to load categories"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await axios.post(`${API}/categories/admin`, { name: newCatName, description: newCatDesc }, { headers });
      toast.success("Category created");
      setNewCatName(""); setNewCatDesc("");
      fetchCategories();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to create"); }
  };

  const handleUpdateCategory = async (catId, data) => {
    try {
      await axios.put(`${API}/categories/admin/${catId}`, data, { headers });
      toast.success("Category updated");
      setEditingCat(null);
      fetchCategories();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to update"); }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm("Delete this category and all sub-categories?")) return;
    try {
      await axios.delete(`${API}/categories/admin/${catId}`, { headers });
      toast.success("Category deleted");
      fetchCategories();
    } catch { toast.error("Failed to delete"); }
  };

  const handleCreateSubCategory = async (catId) => {
    if (!newSubName.trim()) return;
    try {
      await axios.post(`${API}/categories/admin/${catId}/sub`, { name: newSubName, description: newSubDesc }, { headers });
      toast.success("Sub-category created");
      setNewSubName(""); setNewSubDesc(""); setAddingSubTo(null);
      fetchCategories();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to create"); }
  };

  const handleDeleteSubCategory = async (subId) => {
    if (!window.confirm("Delete this sub-category?")) return;
    try {
      await axios.delete(`${API}/categories/admin/sub/${subId}`, { headers });
      toast.success("Sub-category deleted");
      fetchCategories();
    } catch { toast.error("Failed to delete"); }
  };

  if (loading) return <div className="animate-pulse text-sm text-neutral-400">Loading categories...</div>;

  return (
    <div className="space-y-6" data-testid="admin-categories-panel">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Categories & Sub-Categories</h2>
        <Badge variant="outline">{categories.length} categories</Badge>
      </div>

      {/* Add new category */}
      <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Add New Category</p>
        <div className="flex gap-2">
          <Input
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            placeholder="Category name (e.g., Platform Boots)"
            className="flex-1"
            data-testid="new-category-name"
          />
          <Input
            value={newCatDesc}
            onChange={e => setNewCatDesc(e.target.value)}
            placeholder="Description (optional)"
            className="flex-1"
          />
          <Button onClick={handleCreateCategory} className="bg-black text-white" data-testid="create-category-btn">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.category_id} className="border rounded-lg overflow-hidden">
            {/* Category Row */}
            <div className="flex items-center gap-3 p-3 bg-white hover:bg-neutral-50 transition-colors">
              <button
                onClick={() => setExpandedCat(expandedCat === cat.category_id ? null : cat.category_id)}
                className="p-1"
              >
                {expandedCat === cat.category_id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              <div className="flex-1 min-w-0">
                {editingCat === cat.category_id ? (
                  <EditCategoryForm cat={cat} onSave={handleUpdateCategory} onCancel={() => setEditingCat(null)} />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{cat.name}</span>
                    {cat.description && <span className="text-xs text-neutral-400 truncate max-w-[200px]">{cat.description}</span>}
                    <Badge variant="outline" className="text-[10px]">{cat.product_count || 0} products</Badge>
                    {cat.sub_categories?.length > 0 && <Badge className="text-[10px] bg-blue-100 text-blue-700">{cat.sub_categories.length} subs</Badge>}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => handleUpdateCategory(cat.category_id, { show_in_nav: !cat.show_in_nav })}
                  title={cat.show_in_nav ? "Hide from nav" : "Show in nav"}
                >
                  {cat.show_in_nav ? <Eye className="h-3.5 w-3.5 text-green-500" /> : <EyeOff className="h-3.5 w-3.5 text-neutral-300" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCat(cat.category_id)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteCategory(cat.category_id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Sub-categories */}
            <AnimatePresence>
              {expandedCat === cat.category_id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t bg-neutral-50"
                >
                  <div className="p-3 pl-10 space-y-2">
                    {cat.sub_categories?.map(sub => (
                      <div key={sub.sub_category_id} className="flex items-center gap-2 py-1.5 px-3 bg-white rounded border">
                        <span className="text-sm flex-1">{sub.name}</span>
                        {sub.description && <span className="text-xs text-neutral-400 truncate max-w-[200px]">{sub.description}</span>}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteSubCategory(sub.sub_category_id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {addingSubTo === cat.category_id ? (
                      <div className="flex gap-2">
                        <Input value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Sub-category name" className="flex-1 h-8 text-sm" data-testid="new-sub-name" />
                        <Button onClick={() => handleCreateSubCategory(cat.category_id)} size="sm" className="bg-black text-white h-8">
                          Add
                        </Button>
                        <Button onClick={() => setAddingSubTo(null)} size="sm" variant="ghost" className="h-8">
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setAddingSubTo(cat.category_id)} data-testid={`add-sub-btn-${cat.category_id}`}>
                        <Plus className="h-3 w-3 mr-1" /> Add Sub-Category
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};

const EditCategoryForm = ({ cat, onSave, onCancel }) => {
  const [name, setName] = useState(cat.name);
  const [desc, setDesc] = useState(cat.description || "");
  return (
    <div className="flex gap-2 items-center">
      <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" />
      <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" className="h-8 text-sm" />
      <Button size="sm" className="h-8 bg-green-600 text-white" onClick={() => onSave(cat.category_id, { name, description: desc })}>Save</Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={onCancel}>Cancel</Button>
    </div>
  );
};
