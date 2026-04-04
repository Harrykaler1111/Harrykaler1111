import { useState, useEffect, useCallback } from "react";
import { Star, Plus, Trash2, Search, Edit2, Check, X, User } from "lucide-react";
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

const StarInput = ({ rating, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((s) => (
      <button key={s} type="button" onClick={() => onChange(s)} data-testid={`dummy-star-${s}`}>
        <Star className={`h-5 w-5 transition-colors ${s <= rating ? "fill-gold text-gold" : "fill-none text-neutral-600 hover:text-gold/50"}`} />
      </button>
    ))}
  </div>
);

export const AdminDummyReviewsPanel = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dummyReviews, setDummyReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    username: "",
    rating: 5,
    review_text: "",
    verified: true
  });

  // Fetch products for search
  const searchProducts = useCallback(async () => {
    if (!search.trim()) { setProducts([]); return; }
    try {
      const res = await axios.get(`${API}/products?search=${encodeURIComponent(search)}&limit=10`, {
        headers: getAdminHeaders()
      });
      const items = res.data?.products || res.data || [];
      setProducts(Array.isArray(items) ? items : []);
    } catch { setProducts([]); }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(searchProducts, 300);
    return () => clearTimeout(timer);
  }, [searchProducts]);

  // Fetch dummy reviews for selected product
  const fetchDummyReviews = useCallback(async () => {
    if (!selectedProduct) return;
    setLoadingReviews(true);
    try {
      const res = await axios.get(`${API}/admin/reviews/${selectedProduct.product_id}`, {
        headers: getAdminHeaders()
      });
      setDummyReviews(res.data || []);
    } catch { setDummyReviews([]); }
    finally { setLoadingReviews(false); }
  }, [selectedProduct]);

  useEffect(() => { fetchDummyReviews(); }, [fetchDummyReviews]);

  const handleSubmit = async () => {
    if (!form.username.trim()) { toast.error("Enter a username"); return; }
    if (!form.review_text.trim()) { toast.error("Enter review text"); return; }
    if (form.rating < 1 || form.rating > 5) { toast.error("Rating must be 1-5"); return; }

    try {
      if (editingId) {
        await axios.put(`${API}/admin/reviews/${editingId}`, {
          username: form.username,
          rating: form.rating,
          review_text: form.review_text,
          verified: form.verified
        }, { headers: getAdminHeaders() });
        toast.success("Review updated");
      } else {
        await axios.post(`${API}/admin/reviews`, {
          product_id: selectedProduct.product_id,
          username: form.username,
          rating: form.rating,
          review_text: form.review_text,
          verified: form.verified
        }, { headers: getAdminHeaders() });
        toast.success("Dummy review added");
      }
      resetForm();
      fetchDummyReviews();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const deleteReview = async (reviewId) => {
    if (!confirm("Delete this review?")) return;
    try {
      await axios.delete(`${API}/admin/reviews/${reviewId}`, { headers: getAdminHeaders() });
      toast.success("Review deleted");
      fetchDummyReviews();
    } catch { toast.error("Failed to delete"); }
  };

  const startEdit = (review) => {
    setEditingId(review.review_id);
    setForm({
      username: review.user_name,
      rating: review.rating,
      review_text: review.comment,
      verified: review.verified_purchase ?? true
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ username: "", rating: 5, review_text: "", verified: true });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6" data-testid="admin-dummy-reviews-panel">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Star className="h-5 w-5 text-gold" /> Dummy Reviews Manager
        </h2>
        <p className="text-sm text-neutral-400 mt-1">Add fake reviews to boost product trust & conversions</p>
      </div>

      {/* Product Search */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
        <label className="text-sm font-medium text-neutral-300 mb-2 block">Select Product</label>
        <div className="relative">
          <Search className="h-4 w-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name..."
            className="bg-neutral-900 border-neutral-700 text-white pl-10"
            data-testid="dummy-review-search"
          />
        </div>

        {/* Search results */}
        {products.length > 0 && !selectedProduct && (
          <div className="mt-2 bg-neutral-900 border border-neutral-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            {products.map((p) => (
              <button
                key={p.product_id}
                onClick={() => { setSelectedProduct(p); setSearch(p.name); setProducts([]); }}
                className="w-full text-left px-4 py-2.5 hover:bg-neutral-800 transition-colors flex items-center gap-3 border-b border-neutral-800 last:border-0"
                data-testid={`product-option-${p.product_id}`}
              >
                <div className="w-8 h-8 bg-neutral-700 rounded overflow-hidden flex-shrink-0">
                  {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{p.name}</p>
                  <p className="text-xs text-neutral-500">₹{p.price}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected product badge */}
        {selectedProduct && (
          <div className="mt-3 flex items-center gap-3 bg-neutral-900 border border-gold/30 rounded-lg px-4 py-2.5">
            <div className="w-10 h-10 bg-neutral-700 rounded overflow-hidden flex-shrink-0">
              {selectedProduct.images?.[0] && <img src={selectedProduct.images[0]} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{selectedProduct.name}</p>
              <p className="text-xs text-neutral-400">ID: {selectedProduct.product_id}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedProduct(null); setSearch(""); setDummyReviews([]); }}
              className="text-neutral-500 hover:text-white" data-testid="clear-product-btn">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Review Form */}
      {selectedProduct && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Reviews for {selectedProduct.name}
              <span className="text-neutral-500 text-sm ml-2">({dummyReviews.length} dummy)</span>
            </h3>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="bg-gold hover:bg-gold/90 text-black" data-testid="add-dummy-review-btn">
                <Plus className="h-4 w-4 mr-1" /> Add Dummy Review
              </Button>
            )}
          </div>

          {showForm && (
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5 space-y-4" data-testid="dummy-review-form">
              <h4 className="text-white font-medium">{editingId ? "Edit Review" : "New Dummy Review"}</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Username</label>
                  <div className="relative">
                    <User className="h-4 w-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={form.username}
                      onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="Reviewer name"
                      className="bg-neutral-900 border-neutral-700 text-white pl-10"
                      data-testid="dummy-review-username"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Rating</label>
                  <StarInput rating={form.rating} onChange={(r) => setForm(f => ({ ...f, rating: r }))} />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Review Text</label>
                <Textarea
                  value={form.review_text}
                  onChange={(e) => setForm(f => ({ ...f, review_text: e.target.value }))}
                  placeholder="Write the review..."
                  rows={3}
                  className="bg-neutral-900 border-neutral-700 text-white resize-none"
                  data-testid="dummy-review-text"
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={form.verified}
                  onCheckedChange={(v) => setForm(f => ({ ...f, verified: v }))}
                  data-testid="dummy-review-verified"
                />
                <span className="text-sm text-neutral-300">Show as "Verified Purchase"</span>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubmit} className="bg-gold hover:bg-gold/90 text-black" data-testid="submit-dummy-review-btn">
                  <Check className="h-4 w-4 mr-1" /> {editingId ? "Update" : "Add Review"}
                </Button>
                <Button variant="ghost" onClick={resetForm} className="text-neutral-400 hover:text-white">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing dummy reviews list */}
          {loadingReviews ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" />
            </div>
          ) : dummyReviews.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-sm bg-neutral-800/30 border border-neutral-700 rounded-xl">
              No dummy reviews for this product yet
            </div>
          ) : (
            <div className="space-y-3">
              {dummyReviews.map((review) => (
                <div
                  key={review.review_id}
                  className="bg-neutral-800/50 border border-neutral-700 rounded-lg px-5 py-4 flex items-start justify-between gap-4"
                  data-testid={`dummy-review-${review.review_id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-gold text-gold" : "fill-none text-neutral-600"}`} />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-white">{review.user_name}</span>
                      {review.verified_purchase && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">Verified</span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-300 mt-1">{review.comment}</p>
                    <p className="text-[10px] text-neutral-600 mt-2">
                      Created {new Date(review.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(review)}
                      className="text-neutral-500 hover:text-gold h-8 w-8 p-0" data-testid={`edit-dummy-${review.review_id}`}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteReview(review.review_id)}
                      className="text-neutral-500 hover:text-red-400 h-8 w-8 p-0" data-testid={`delete-dummy-${review.review_id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
