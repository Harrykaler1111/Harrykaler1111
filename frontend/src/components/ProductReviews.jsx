import { useState, useEffect } from "react";
import { Star, ThumbsUp, MessageSquare, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

const StarRating = ({ rating, size = "sm", interactive = false, onChange }) => {
  const [hover, setHover] = useState(0);
  const sizeClass = size === "lg" ? "h-6 w-6" : size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <div className="flex gap-0.5" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
          data-testid={`star-${star}`}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              star <= (hover || rating)
                ? "fill-gold text-gold"
                : "fill-none text-neutral-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const RatingBar = ({ label, count, total }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-8 text-right text-neutral-500">{label}</span>
      <Star className="h-3 w-3 fill-gold text-gold" />
      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gold rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-neutral-400 text-xs">{count}</span>
    </div>
  );
};

const ReviewCard = ({ review, token }) => {
  const [helpfulClicked, setHelpfulClicked] = useState(false);

  const markHelpful = async () => {
    if (helpfulClicked) return;
    try {
      await axios.post(`${API}/reviews/${review.review_id}/helpful`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setHelpfulClicked(true);
    } catch {
      toast.error("Failed to mark as helpful");
    }
  };

  const date = new Date(review.created_at).toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "numeric"
  });

  return (
    <div className="py-6 border-b border-neutral-100 last:border-0" data-testid={`review-${review.review_id}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-3">
            <StarRating rating={review.rating} />
            {review.title && (
              <span className="font-medium text-sm">{review.title}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium text-neutral-700">{review.user_name}</span>
            {review.is_verified_purchase && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5">
                Verified Purchase
              </span>
            )}
            <span className="text-xs text-neutral-400">{date}</span>
          </div>
        </div>
      </div>
      <p className="text-neutral-600 text-sm leading-relaxed mt-3">{review.comment}</p>
      {review.images?.length > 0 && (
        <div className="flex gap-2 mt-3">
          {review.images.map((img, i) => (
            <img key={i} src={img} alt="" className="w-16 h-16 object-cover rounded border" />
          ))}
        </div>
      )}
      <button
        onClick={markHelpful}
        className={`flex items-center gap-1.5 mt-3 text-xs transition-colors ${
          helpfulClicked ? "text-gold" : "text-neutral-400 hover:text-neutral-600"
        }`}
        data-testid={`helpful-${review.review_id}`}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        Helpful ({(review.helpful_count || 0) + (helpfulClicked ? 1 : 0)})
      </button>
    </div>
  );
};

const WriteReviewForm = ({ productId, vendorId, token, onSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { toast.error("Please select a rating"); return; }
    if (!comment.trim()) { toast.error("Please write a comment"); return; }

    setSubmitting(true);
    try {
      await axios.post(`${API}/reviews`, {
        product_id: productId,
        vendor_id: vendorId || null,
        rating,
        title: title.trim() || null,
        comment: comment.trim(),
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Review submitted!");
      setRating(0); setTitle(""); setComment("");
      onSubmitted?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="write-review-form">
      <div>
        <label className="text-sm font-medium mb-2 block">Your Rating</label>
        <StarRating rating={rating} size="lg" interactive onChange={setRating} />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Title (optional)</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum it up in a few words"
          className="border-neutral-200 focus:border-gold focus:ring-gold/20"
          data-testid="review-title-input"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Your Review</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you like or dislike?"
          rows={4}
          className="border-neutral-200 focus:border-gold focus:ring-gold/20 resize-none"
          data-testid="review-comment-input"
        />
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="btn-gold"
        data-testid="submit-review-btn"
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
};

export const ProductReviews = ({ productId, vendorId }) => {
  const { user, token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API}/reviews/product/${productId}`);
      setReviews(res.data.reviews || []);
      setStats(res.data.stats || null);
    } catch { /* no reviews */ }
  };

  useEffect(() => { fetchReviews(); }, [productId]);

  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

  return (
    <div className="mt-16 pt-12 border-t" data-testid="product-reviews-section">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-2xl font-bold" data-testid="reviews-heading">
          Customer Reviews
        </h2>
        {user && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="border-neutral-300 hover:border-gold hover:text-gold"
            data-testid="toggle-review-form-btn"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Write a Review
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      {stats && stats.total > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 mb-8 p-6 bg-neutral-50 rounded-lg" data-testid="review-stats">
          <div className="text-center md:border-r md:pr-8">
            <div className="text-5xl font-bold text-black">{(stats.avg_rating || 0).toFixed(1)}</div>
            <StarRating rating={Math.round(stats.avg_rating || 0)} size="md" />
            <p className="text-sm text-neutral-500 mt-1">{stats.total} review{stats.total !== 1 ? "s" : ""}</p>
          </div>
          <div className="space-y-2 flex flex-col justify-center">
            <RatingBar label="5" count={stats.five || 0} total={stats.total} />
            <RatingBar label="4" count={stats.four || 0} total={stats.total} />
            <RatingBar label="3" count={stats.three || 0} total={stats.total} />
            <RatingBar label="2" count={stats.two || 0} total={stats.total} />
            <RatingBar label="1" count={stats.one || 0} total={stats.total} />
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-neutral-50 rounded-lg mb-8" data-testid="no-reviews">
          <Star className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-neutral-500">No reviews yet. Be the first to review this product!</p>
        </div>
      )}

      {/* Write Review Form */}
      {showForm && user && (
        <div className="mb-8 p-6 border border-neutral-200 rounded-lg bg-white" data-testid="review-form-container">
          <h3 className="font-serif text-lg font-semibold mb-4">Write Your Review</h3>
          <WriteReviewForm
            productId={productId}
            vendorId={vendorId}
            token={token}
            onSubmitted={() => { setShowForm(false); fetchReviews(); }}
          />
        </div>
      )}

      {/* Review List */}
      {reviews.length > 0 && (
        <div data-testid="reviews-list">
          {displayedReviews.map((review) => (
            <ReviewCard key={review.review_id} review={review} token={token} />
          ))}
          {reviews.length > 3 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="flex items-center gap-2 text-sm text-gold hover:text-gold/80 mt-4 transition-colors"
              data-testid="show-all-reviews-btn"
            >
              <ChevronDown className="h-4 w-4" />
              Show all {reviews.length} reviews
            </button>
          )}
        </div>
      )}
    </div>
  );
};
