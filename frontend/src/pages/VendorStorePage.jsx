import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Package, Calendar, ShieldCheck, MessageSquare, ThumbsUp, ChevronDown, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

const StarRating = ({ rating, size = "sm" }) => {
  const sizeClass = size === "lg" ? "h-6 w-6" : size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${sizeClass} ${s <= Math.round(rating) ? "fill-gold text-gold" : "fill-none text-neutral-300"}`} />
      ))}
    </div>
  );
};

const RatingBar = ({ label, count, total }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-6 text-right text-neutral-500">{label}</span>
      <Star className="h-3 w-3 fill-gold text-gold" />
      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
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
    } catch { /* ignore */ }
  };
  const date = new Date(review.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="py-5 border-b border-neutral-100 last:border-0" data-testid={`vendor-review-${review.review_id}`}>
      <div className="flex items-center gap-3 mb-1">
        <StarRating rating={review.rating} />
        {review.title && <span className="font-medium text-sm">{review.title}</span>}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-neutral-700">{review.user_name}</span>
        {review.is_verified_purchase && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5">Verified</span>
        )}
        <span className="text-xs text-neutral-400">{date}</span>
      </div>
      <p className="text-neutral-600 text-sm leading-relaxed">{review.comment}</p>
      <button
        onClick={markHelpful}
        className={`flex items-center gap-1.5 mt-2 text-xs transition-colors ${helpfulClicked ? "text-gold" : "text-neutral-400 hover:text-neutral-600"}`}
        data-testid={`helpful-vendor-${review.review_id}`}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        Helpful ({(review.helpful_count || 0) + (helpfulClicked ? 1 : 0)})
      </button>
    </div>
  );
};

export const VendorStorePage = () => {
  const { vendorId } = useParams();
  const { token } = useAuth();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await axios.get(`${API}/vendors/store/${vendorId}`);
        setStore(res.data);
      } catch {
        toast.error("Store not found");
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, [vendorId]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center gap-4">
        <Store className="h-16 w-16 text-neutral-300" />
        <h2 className="font-serif text-2xl">Store Not Found</h2>
        <Link to="/products" className="text-gold hover:underline">Browse all products</Link>
      </div>
    );
  }

  const memberDate = store.member_since ? new Date(store.member_since).toLocaleDateString("en-IN", { year: "numeric", month: "long" }) : "";
  const stats = store.review_stats || {};
  const reviews = store.recent_reviews || [];
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 5);

  return (
    <div className="min-h-screen pt-20 md:pt-24" data-testid="vendor-store-page">
      {/* Store Header */}
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-gold font-mono text-xs uppercase tracking-[0.2em] mb-3">Official Store</p>
            <h1 className="font-serif text-3xl md:text-5xl font-bold mb-3" data-testid="store-name">
              {store.store_name}
            </h1>
            <p className="text-neutral-400 max-w-2xl leading-relaxed mb-6" data-testid="store-description">
              {store.store_description}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-sm">
              {store.rating > 0 && (
                <div className="flex items-center gap-2" data-testid="store-rating">
                  <StarRating rating={store.rating} />
                  <span className="text-neutral-300">{store.rating.toFixed(1)} ({store.review_count} reviews)</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-neutral-400">
                <Package className="h-4 w-4 text-gold" />
                <span>{store.total_products} product{store.total_products !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400">
                <ShieldCheck className="h-4 w-4 text-gold" />
                <span>Verified Seller</span>
              </div>
              {memberDate && (
                <div className="flex items-center gap-2 text-neutral-400">
                  <Calendar className="h-4 w-4 text-gold" />
                  <span>Member since {memberDate}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16">
        {/* Products Grid */}
        {store.products?.length > 0 ? (
          <section className="mb-16" data-testid="store-products-section">
            <h2 className="font-serif text-2xl font-bold mb-8">Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {store.products.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          </section>
        ) : (
          <section className="mb-16 text-center py-12 bg-neutral-50 rounded-lg">
            <Package className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500">This store hasn't listed any products yet.</p>
          </section>
        )}

        {/* Reviews Section */}
        <section data-testid="store-reviews-section">
          <h2 className="font-serif text-2xl font-bold mb-8">Customer Reviews</h2>

          {stats.total > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 mb-8 p-6 bg-neutral-50 rounded-lg" data-testid="vendor-review-stats">
              <div className="text-center md:border-r md:pr-8">
                <div className="text-5xl font-bold">{(stats.avg_rating || 0).toFixed(1)}</div>
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
            <div className="text-center py-8 bg-neutral-50 rounded-lg mb-8" data-testid="no-vendor-reviews">
              <Star className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-neutral-500">No reviews yet for this store.</p>
            </div>
          )}

          {reviews.length > 0 && (
            <div data-testid="vendor-reviews-list">
              {displayedReviews.map((review) => (
                <ReviewCard key={review.review_id} review={review} token={token} />
              ))}
              {reviews.length > 5 && !showAllReviews && (
                <button
                  onClick={() => setShowAllReviews(true)}
                  className="flex items-center gap-2 text-sm text-gold hover:text-gold/80 mt-4 transition-colors"
                  data-testid="show-all-vendor-reviews-btn"
                >
                  <ChevronDown className="h-4 w-4" />
                  Show all {reviews.length} reviews
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default VendorStorePage;
