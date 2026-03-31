import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Check, X, Trash2, Eye, Image, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

const StatusBadge = ({ status }) => {
  const styles = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    approved: "bg-green-500/10 text-green-400 border-green-500/30",
    rejected: "bg-red-500/10 text-red-400 border-red-500/30",
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
};

const ReviewRow = ({ review, token, onAction }) => {
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");
  const [lightboxImg, setLightboxImg] = useState(null);

  const handleAction = async (action) => {
    try {
      if (action === "delete") {
        await axios.delete(`${API}/reviews/admin/${review.review_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Review deleted");
      } else {
        await axios.put(`${API}/reviews/admin/${review.review_id}/status`, {
          status: action,
          reason: reason.trim() || null
        }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success(`Review ${action}`);
      }
      setReason("");
      setExpanded(false);
      onAction();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Action failed");
    }
  };

  const removeImage = async (imgUrl) => {
    try {
      await axios.put(`${API}/reviews/admin/${review.review_id}/remove-image`, {
        image_url: imgUrl
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Image removed");
      onAction();
    } catch {
      toast.error("Failed to remove image");
    }
  };

  const date = new Date(review.created_at).toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "numeric"
  });

  return (
    <div className="border border-neutral-700 rounded-lg p-4 bg-neutral-800/50" data-testid={`admin-review-${review.review_id}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3 flex-1 min-w-0">
          {review.product_image && (
            <img src={review.product_image} alt="" className="w-10 h-12 object-cover rounded flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate text-white">{review.product_name || "Product"}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-gold text-gold" : "fill-none text-neutral-600"}`} />
                ))}
              </div>
              <span className="text-xs text-neutral-400">by {review.user_name}</span>
              <span className="text-[10px] text-neutral-500">{date}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={review.status} />
          <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="h-7 w-7 p-0">
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-neutral-700 space-y-3">
              {review.title && <p className="text-sm font-medium text-white">{review.title}</p>}
              <p className="text-sm text-neutral-300">{review.comment}</p>

              {/* Images with remove buttons */}
              {review.images?.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {review.images.map((img, i) => (
                    <div key={i} className="relative group">
                      <button onClick={() => setLightboxImg(img)} className="w-16 h-16 rounded overflow-hidden border border-neutral-700 hover:border-gold transition-colors">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                      <button
                        onClick={() => removeImage(img)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`remove-review-img-${i}`}
                      >
                        <X className="h-2.5 w-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Admin reason input */}
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Admin note / reason (optional)"
                rows={2}
                className="text-sm resize-none bg-neutral-900 border-neutral-700 text-white"
              />

              {/* Action buttons */}
              <div className="flex gap-2">
                {review.status !== "approved" && (
                  <Button size="sm" onClick={() => handleAction("approved")}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs" data-testid="approve-review-btn">
                    <Check className="h-3 w-3 mr-1" /> Approve
                  </Button>
                )}
                {review.status !== "rejected" && (
                  <Button size="sm" onClick={() => handleAction("rejected")}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs" data-testid="reject-review-btn">
                    <X className="h-3 w-3 mr-1" /> Reject
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => handleAction("delete")}
                  className="text-xs" data-testid="delete-review-btn">
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center" onClick={() => setLightboxImg(null)}>
          <button onClick={() => setLightboxImg(null)} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="h-6 w-6" />
          </button>
          <img src={lightboxImg} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export const AdminReviewsPanel = () => {
  const token = localStorage.getItem("pigma_admin_token");
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const url = filter ? `${API}/reviews/admin/all?status=${filter}` : `${API}/reviews/admin/all`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setReviews(res.data.reviews || []);
      setCounts(res.data.counts || counts);
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [filter]);

  const tabs = [
    { key: "pending", label: "Pending", count: counts.pending, color: "text-amber-600" },
    { key: "approved", label: "Approved", count: counts.approved, color: "text-green-600" },
    { key: "rejected", label: "Rejected", count: counts.rejected, color: "text-red-600" },
    { key: "", label: "All", count: counts.total, color: "text-neutral-400" },
  ];

  return (
    <div className="space-y-4" data-testid="admin-reviews-panel">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Review Moderation</h2>
        <div className="flex items-center gap-1 text-xs">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-bold text-amber-400">{counts.pending}</span>
          <span className="text-neutral-400">pending</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-neutral-800 p-1 rounded-lg" data-testid="review-filter-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-colors ${
              filter === tab.key
                ? "bg-neutral-700 shadow-sm text-white"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
            data-testid={`review-tab-${tab.key || 'all'}`}
          >
            {tab.label} <span className={`ml-1 ${tab.color}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold mx-auto" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-sm">
          No {filter || ""} reviews found
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <ReviewRow key={review.review_id} review={review} token={token} onAction={fetchReviews} />
          ))}
        </div>
      )}
    </div>
  );
};
