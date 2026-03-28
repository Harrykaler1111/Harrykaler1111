import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Tag, Star, Check, Loader2, ArrowRight, Gift, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import axios from "axios";

// ========== HOMEPAGE BUNDLE CAROUSEL ==========
export const BundleDealsSection = () => {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/bundles`)
      .then(r => setBundles(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || bundles.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-black" data-testid="bundle-deals-section">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold mb-2">
              Curated Collections
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-white">
              Bundle Deals
            </h2>
            <p className="text-neutral-400 text-sm mt-2">
              Save more when you shop bundles curated by our stylists
            </p>
          </div>
          <Link to="/bundles" className="hidden md:flex items-center gap-1 text-gold text-sm hover:underline">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Bundle Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bundles.slice(0, 3).map((bundle, i) => (
            <motion.div
              key={bundle.bundle_id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={`/bundle/${bundle.bundle_id}`}
                className="block group"
                data-testid={`bundle-card-${bundle.bundle_id}`}
              >
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden hover:border-gold/30 transition-all duration-300">
                  {/* Product Images Grid */}
                  <div className="relative">
                    <div className="grid grid-cols-3 gap-px bg-neutral-800">
                      {bundle.products?.slice(0, 3).map((p, idx) => (
                        <div key={idx} className="aspect-[3/4] bg-neutral-900 overflow-hidden">
                          <img
                            src={p.images?.[0] || ""}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={e => { e.target.style.display = "none"; }}
                          />
                        </div>
                      ))}
                    </div>
                    {/* Badge */}
                    <div className="absolute top-3 left-3 bg-gold text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {bundle.badge_text || "DEAL"}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className="font-serif text-lg font-bold text-white group-hover:text-gold transition-colors">
                      {bundle.name}
                    </h3>
                    {bundle.description && (
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{bundle.description}</p>
                    )}

                    {/* Pricing */}
                    <div className="flex items-baseline gap-3 mt-3">
                      <span className="text-xl font-bold text-gold">
                        Rs.{bundle.bundle_price?.toLocaleString()}
                      </span>
                      <span className="text-sm text-neutral-500 line-through">
                        Rs.{bundle.original_total?.toLocaleString()}
                      </span>
                    </div>

                    {/* Savings badge */}
                    <div className="flex items-center gap-2 mt-3">
                      <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Save Rs.{bundle.discount_amount?.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-neutral-500">
                        {bundle.products?.length} items
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Mobile "View All" */}
        <div className="md:hidden text-center mt-6">
          <Link to="/bundles" className="text-gold text-sm hover:underline inline-flex items-center gap-1">
            View All Bundles <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};

// ========== PDP BUNDLE BANNER ==========
export const ProductBundleBanner = ({ productId }) => {
  const [bundles, setBundles] = useState([]);

  useEffect(() => {
    if (!productId) return;
    axios.get(`${API}/bundles/for-product/${productId}`)
      .then(r => setBundles(r.data || []))
      .catch(() => {});
  }, [productId]);

  if (bundles.length === 0) return null;

  const bundle = bundles[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="product-bundle-banner"
    >
      <Link
        to={`/bundle/${bundle.bundle_id}`}
        className="block bg-gradient-to-r from-gold/5 to-gold/10 border border-gold/20 rounded-xl p-3 hover:border-gold/40 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center shrink-0">
            <Gift className="h-5 w-5 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-800">
              Part of <span className="text-gold">{bundle.name}</span>
            </p>
            <p className="text-xs text-neutral-500">
              Buy the bundle & save Rs.{bundle.discount_amount?.toLocaleString()} ({bundle.products?.length} items)
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-gold shrink-0 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>
    </motion.div>
  );
};

// ========== BUNDLE DETAIL PAGE ==========
export const BundleDetailPage = () => {
  const { bundleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, openCart } = useCart();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    axios.get(`${API}/bundles/${bundleId}`)
      .then(r => setBundle(r.data))
      .catch(() => { toast.error("Bundle not found"); navigate("/"); })
      .finally(() => setLoading(false));
  }, [bundleId, navigate]);

  const handleAddBundle = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    setAdding(true);
    let added = 0;
    try {
      for (const p of (bundle.products || [])) {
        const ok = await addToCart(p.product_id, 1, p.sizes?.[0] || "M", p.colors?.[0] || "Default");
        if (ok) added++;
      }
      if (added > 0) {
        toast.success(`${added} item${added > 1 ? "s" : ""} added to cart!`);
        openCart();
      }
    } catch { toast.error("Failed to add"); }
    finally { setAdding(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-gold" />
      </div>
    );
  }

  if (!bundle) return null;

  return (
    <div className="min-h-screen pt-24 md:pt-28 pb-16 bg-white" data-testid="bundle-detail-page">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gold/10 text-gold text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">
            <Gift className="h-3.5 w-3.5" /> {bundle.badge_text || "Bundle Deal"}
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2" data-testid="bundle-title">
            {bundle.name}
          </h1>
          {bundle.description && (
            <p className="text-neutral-500 text-sm max-w-xl mx-auto">{bundle.description}</p>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {bundle.products?.map((p) => {
            const discount = p.compare_price
              ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100)
              : 0;

            return (
              <Link
                key={p.product_id}
                to={`/product/${p.product_id}`}
                className="group"
                data-testid={`bundle-product-${p.product_id}`}
              >
                <div className="bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100 hover:border-gold/30 hover:shadow-lg transition-all duration-300">
                  <div className="aspect-[3/4] bg-neutral-100 overflow-hidden relative">
                    <img
                      src={p.images?.[0] || ""}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={e => { e.target.style.display = "none"; }}
                    />
                    {discount > 0 && (
                      <span className="absolute top-2 right-2 bg-black text-white text-[9px] font-bold px-2 py-0.5 rounded-sm">
                        -{discount}%
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">{p.category}</p>
                    <h3 className="text-sm font-medium text-neutral-800 group-hover:text-gold transition-colors line-clamp-2">
                      {p.name}
                    </h3>
                    {p.average_rating > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-gold text-gold" />
                        <span className="text-[10px] text-neutral-400">{p.average_rating.toFixed(1)}</span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-sm font-bold">Rs.{p.price?.toLocaleString()}</span>
                      {p.compare_price && (
                        <span className="text-[10px] text-neutral-400 line-through">
                          Rs.{p.compare_price?.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bundle Summary + CTA */}
        <div className="max-w-lg mx-auto">
          <div className="bg-neutral-950 text-white rounded-2xl p-6 md:p-8" data-testid="bundle-cta">
            <div className="text-center">
              <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
                {bundle.products?.length} items bundle
              </p>
              <div className="flex items-baseline justify-center gap-3 mb-2">
                <span className="text-3xl font-bold text-gold" data-testid="bundle-detail-price">
                  Rs.{bundle.bundle_price?.toLocaleString()}
                </span>
                <span className="text-lg text-neutral-500 line-through">
                  Rs.{bundle.original_total?.toLocaleString()}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold px-4 py-1.5 rounded-full mb-6">
                <Tag className="h-4 w-4" />
                Save Rs.{bundle.discount_amount?.toLocaleString()}
              </div>
            </div>

            <Button
              onClick={handleAddBundle}
              disabled={adding}
              className="w-full btn-gold font-bold py-6 text-base rounded-xl"
              data-testid="add-bundle-to-cart-btn"
            >
              {adding ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Add Entire Bundle to Cart
                </>
              )}
            </Button>

            <p className="text-center text-[10px] text-neutral-500 mt-3">
              Bundle discount applied automatically at checkout
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
