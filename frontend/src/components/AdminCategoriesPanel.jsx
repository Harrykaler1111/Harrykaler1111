import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
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
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newSubName, setNewSubName] = useState("");
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
      await axios.post(`${API}/categories/admin/${catId}/sub`, { name: newSubName }, { headers });
      toast.success("Sub-category created");
      setNewSubName(""); setAddingSubTo(null);
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

  if (loading) return <div className="py-12 text-center text-neutral-400">Loading categories...</div>;

  return (
    <div className="space-y-6" data-testid="admin-categories-panel">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Categories & Sub-Categories</h2>
        <Badge variant="outline" className="border-neutral-600 text-neutral-300">{categories.length} total</Badge>
      </div>

      {/* Add new category */}
      <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Add New Category</p>
        <div className="flex gap-3">
          <Input
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            placeholder="Category name (e.g., Platform Boots)"
            className="flex-1 bg-neutral-900 border-neutral-600 text-white placeholder:text-neutral-500 focus:border-gold"
            data-testid="new-category-name"
          />
          <Input
            value={newCatDesc}
            onChange={e => setNewCatDesc(e.target.value)}
            placeholder="Description (optional)"
            className="flex-1 bg-neutral-900 border-neutral-600 text-white placeholder:text-neutral-500 focus:border-gold"
          />
          <Button onClick={handleCreateCategory} className="bg-gold text-black font-bold hover:bg-yellow-400 px-6" data-testid="create-category-btn">
            <Plus className="h-4 w-4 mr-1.5" /> Add
          </Button>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-2">
        {categories.map((cat, idx) => (
          <div key={cat.category_id} className="border border-neutral-700 rounded-xl overflow-hidden" data-testid={`cat-row-${cat.category_id}`}>
            {/* Category Row */}
            <div
              className={`flex items-center gap-4 px-4 py-3.5 transition-colors cursor-pointer ${
                idx % 2 === 0 ? "bg-neutral-800" : "bg-neutral-850"
              } hover:bg-neutral-700`}
              style={{ backgroundColor: idx % 2 === 0 ? "#262626" : "#1f1f1f" }}
              onClick={() => setExpandedCat(expandedCat === cat.category_id ? null : cat.category_id)}
            >
              {/* Expand Arrow */}
              <div className="flex-shrink-0">
                {expandedCat === cat.category_id
                  ? <ChevronDown className="h-4 w-4 text-gold" />
                  : <ChevronRight className="h-4 w-4 text-neutral-400" />}
              </div>

              {/* Category Info */}
              <div className="flex-1 min-w-0">
                {editingCat === cat.category_id ? (
                  <EditCategoryForm cat={cat} onSave={handleUpdateCategory} onCancel={() => setEditingCat(null)} />
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-sm text-white" style={{ color: "#ffffff" }}>
                      {cat.name}
                    </span>
                    {cat.description && (
                      <span className="text-xs text-neutral-400 truncate max-w-[250px]">
                        {cat.description}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className="text-[10px] font-semibold bg-neutral-700 text-neutral-200 border-0">
                  {cat.product_count || 0} products
                </Badge>
                {cat.sub_categories?.length > 0 && (
                  <Badge className="text-[10px] font-semibold bg-blue-900/50 text-blue-300 border-0">
                    {cat.sub_categories.length} sub{cat.sub_categories.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600"
                  onClick={() => handleUpdateCategory(cat.category_id, { show_in_nav: !cat.show_in_nav })}
                  title={cat.show_in_nav ? "Visible in nav — click to hide" : "Hidden from nav — click to show"}
                >
                  {cat.show_in_nav
                    ? <Eye className="h-4 w-4 text-green-400" />
                    : <EyeOff className="h-4 w-4 text-neutral-500" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-neutral-600" onClick={() => setEditingCat(cat.category_id)}>
                  <Pencil className="h-4 w-4 text-neutral-300 hover:text-gold" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-900/40" onClick={() => handleDeleteCategory(cat.category_id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>

            {/* Expanded: Sub-categories */}
            <AnimatePresence>
              {expandedCat === cat.category_id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-neutral-900 border-t border-neutral-700 p-4 pl-12 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-2">Sub-Categories</p>

                    {cat.sub_categories?.length === 0 && !addingSubTo && (
                      <p className="text-xs text-neutral-500 italic py-2">No sub-categories yet</p>
                    )}

                    {cat.sub_categories?.map(sub => (
                      <div
                        key={sub.sub_category_id}
                        className="flex items-center gap-3 py-2.5 px-4 bg-neutral-800 rounded-lg border border-neutral-700 hover:border-neutral-600 transition-colors"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                        <span className="text-sm font-medium text-white flex-1" style={{ color: "#e5e5e5" }}>
                          {sub.name}
                        </span>
                        {sub.description && (
                          <span className="text-xs text-neutral-400 truncate max-w-[200px]">{sub.description}</span>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-900/40" onClick={() => handleDeleteSubCategory(sub.sub_category_id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    ))}

                    {addingSubTo === cat.category_id ? (
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newSubName}
                          onChange={e => setNewSubName(e.target.value)}
                          placeholder="Sub-category name"
                          className="flex-1 h-9 text-sm bg-neutral-800 border-neutral-600 text-white placeholder:text-neutral-500"
                          data-testid="new-sub-name"
                          autoFocus
                        />
                        <Button onClick={() => handleCreateSubCategory(cat.category_id)} size="sm" className="h-9 bg-gold text-black font-bold hover:bg-yellow-400">
                          Add
                        </Button>
                        <Button onClick={() => { setAddingSubTo(null); setNewSubName(""); }} size="sm" variant="ghost" className="h-9 text-neutral-400 hover:text-white">
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs mt-1 border-dashed border-neutral-600 text-neutral-300 hover:text-gold hover:border-gold bg-transparent"
                        onClick={(e) => { e.stopPropagation(); setAddingSubTo(cat.category_id); }}
                        data-testid={`add-sub-btn-${cat.category_id}`}
                      >
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
    <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
      <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm bg-neutral-900 border-neutral-600 text-white" autoFocus />
      <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" className="h-8 text-sm bg-neutral-900 border-neutral-600 text-white placeholder:text-neutral-500" />
      <Button size="sm" className="h-8 bg-green-600 text-white font-bold hover:bg-green-500" onClick={() => onSave(cat.category_id, { name, description: desc })}>Save</Button>
      <Button size="sm" variant="ghost" className="h-8 text-neutral-400 hover:text-white" onClick={onCancel}>Cancel</Button>
    </div>
  );
};
