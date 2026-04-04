import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Tag, Star, Check, Loader2, ArrowRight, Gift, Package, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import axios from "axios";
import { normalizeImageUrl, handleImageError } from "@/utils/imageUtils";

// ========== COUNTDOWN TIMER ==========
const CountdownTimer = ({ endTime, variant = "default" }) => {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, expired: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true };
      return {
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        expired: false,
      };
    };
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  if (timeLeft.expired) {
    return <span className="text-neutral-500 text-xs font-medium">Sale ended</span>;
  }

  const pad = (n) => String(n).padStart(2, "0");

  if (variant === "compact") {
    return (
      <span className="text-red-400 text-[10px] font-bold tabular-nums" data-testid="countdown-compact">
        {timeLeft.h > 0 && `${timeLeft.h}h `}{pad(timeLeft.m)}m {pad(timeLeft.s)}s
      </span>
    );
  }

  // Default: digit boxes
  return (
    <div className="flex items-center gap-1.5" data-testid="countdown-timer">
      {[
        { val: pad(timeLeft.h), label: "HRS" },
        { val: pad(timeLeft.m), label: "MIN" },
        { val: pad(timeLeft.s), label: "SEC" },
      ].map((d, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="bg-red-600 text-white rounded-md px-2 py-1.5 text-center min-w-[36px]">
            <span className="text-sm font-bold tabular-nums block leading-none">{d.val}</span>
            <span className="text-[7px] uppercase tracking-wider opacity-70 block mt-0.5">{d.label}</span>
          </div>
          {i < 2 && <span className="text-red-400 font-bold text-xs">:</span>}
        </div>
      ))}
    </div>
  );
};

// ========== HOMEPAGE BUNDLE CAROUSEL ==========
export const BundleDealsSection = () => {
  const [bundles, setBundles] = useState([]);
  const [flashBundles, setFlashBundles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/bundles`).then(r => r.data).catch(() => []),
      axios.get(`${API}/bundles/flash-sales`).then(r => r.data).catch(() => []),
    ]).then(([all, flash]) => {
      setBundles(all);
      setFlashBundles(flash);
    }).finally(() => setLoading(false));
  }, []);

  if (loading || (bundles.length === 0 && flashBundles.length === 0)) return null;

  return (
    <section className="py-16 md:py-24 bg-black" data-testid="bundle-deals-section">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Flash Sale Banner (if any) */}
        {flashBundles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
            data-testid="flash-sale-banner"
          >
            <div className="bg-gradient-to-r from-red-600/10 via-red-500/5 to-red-600/10 border border-red-500/20 rounded-2xl p-5 md:p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                      Flash Sale
                      <span className="text-red-400 text-sm font-mono">LIVE</span>
                    </h3>
                    <p className="text-xs text-neutral-400">Limited time — grab these deals before they're gone</p>
                  </div>
                </div>
                <CountdownTimer endTime={flashBundles[0].flash_sale_end} />
              </div>

              {/* Flash bundles row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                {flashBundles.slice(0, 2).map(fb => (
                  <Link key={fb.bundle_id} to={`/bundle/${fb.bundle_id}`}
                    className="group flex items-center gap-4 bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-red-500/30 transition-all"
                    data-testid={`flash-bundle-${fb.bundle_id}`}
                  >
                    <div className="flex -space-x-2 shrink-0">
                      {fb.products?.slice(0, 3).map((p, i) => (
                        <div key={i} className="w-12 h-14 bg-neutral-800 rounded-lg overflow-hidden border-2 border-neutral-900">
                          <img src={normalizeImageUrl(p.images?.[0])} alt="" className="w-full h-full object-cover"
                            onError={handleImageError} />
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">{fb.name}</h4>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-lg font-bold text-red-400">Rs.{fb.bundle_price?.toLocaleString()}</span>
                        <span className="text-xs text-neutral-500 line-through">Rs.{fb.original_total?.toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-green-400 font-medium mt-0.5">
                        Save Rs.{fb.discount_amount?.toLocaleString()} (incl. flash bonus)
                      </p>
                    </div>
                    <div className="shrink-0">
                      <CountdownTimer endTime={fb.flash_sale_end} variant="compact" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Regular Bundles Header */}
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
                <div className={`bg-neutral-900 border rounded-2xl overflow-hidden transition-all duration-300 ${
                  bundle.flash_active ? "border-red-500/30 hover:border-red-500/60" : "border-neutral-800 hover:border-gold/30"
                }`}>
                  {/* Product Images Grid */}
                  <div className="relative">
                    <div className="grid grid-cols-3 gap-px bg-neutral-800">
                      {bundle.products?.slice(0, 3).map((p, idx) => (
                        <div key={idx} className="aspect-[3/4] bg-neutral-900 overflow-hidden">
                          <img
                            src={normalizeImageUrl(p.images?.[0])}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={handleImageError}
                          />
                        </div>
                      ))}
                    </div>
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      {bundle.flash_active && (
                        <div className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
                          <Zap className="h-3 w-3" /> FLASH SALE
                        </div>
                      )}
                      <div className={`${bundle.flash_active ? "bg-black/80" : "bg-gold"} text-${bundle.flash_active ? "white" : "black"} text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider`}>
                        {bundle.badge_text || "DEAL"}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className={`font-serif text-lg font-bold transition-colors ${
                      bundle.flash_active ? "text-white group-hover:text-red-400" : "text-white group-hover:text-gold"
                    }`}>
                      {bundle.name}
                    </h3>
                    {bundle.description && (
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{bundle.description}</p>
                    )}

                    {/* Pricing */}
                    <div className="flex items-baseline gap-3 mt-3">
                      <span className={`text-xl font-bold ${bundle.flash_active ? "text-red-400" : "text-gold"}`}>
                        Rs.{bundle.bundle_price?.toLocaleString()}
                      </span>
                      <span className="text-sm text-neutral-500 line-through">
                        Rs.{bundle.original_total?.toLocaleString()}
                      </span>
                    </div>

                    {/* Savings + Timer */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Save Rs.{bundle.discount_amount?.toLocaleString()}
                      </div>
                      {bundle.flash_active ? (
                        <div className="flex items-center gap-1 text-red-400">
                          <Clock className="h-3 w-3" />
                          <CountdownTimer endTime={bundle.flash_sale_end} variant="compact" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-500">{bundle.products?.length} items</span>
                      )}
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
        className={`block border rounded-xl p-3 transition-all group ${
          bundle.flash_active
            ? "bg-gradient-to-r from-red-500/5 to-red-500/10 border-red-500/20 hover:border-red-500/40"
            : "bg-gradient-to-r from-gold/5 to-gold/10 border-gold/20 hover:border-gold/40"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            bundle.flash_active ? "bg-red-500/20" : "bg-gold/20"
          }`}>
            {bundle.flash_active
              ? <Zap className="h-5 w-5 text-red-400" />
              : <Gift className="h-5 w-5 text-gold" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-800">
              {bundle.flash_active && <span className="text-red-500">FLASH SALE — </span>}
              Part of <span className={bundle.flash_active ? "text-red-500" : "text-gold"}>{bundle.name}</span>
            </p>
            <p className="text-xs text-neutral-500">
              Buy the bundle & save Rs.{bundle.discount_amount?.toLocaleString()} ({bundle.products?.length} items)
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {bundle.flash_active && (
              <CountdownTimer endTime={bundle.flash_sale_end} variant="compact" />
            )}
            <ArrowRight className={`h-4 w-4 shrink-0 group-hover:translate-x-1 transition-transform ${
              bundle.flash_active ? "text-red-400" : "text-gold"
            }`} />
          </div>
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

  const isFlash = bundle.flash_active;

  return (
    <div className="min-h-screen pt-24 md:pt-28 pb-16 bg-white" data-testid="bundle-detail-page">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Flash countdown bar */}
        {isFlash && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-600 text-white rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3"
            data-testid="flash-countdown-bar"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 animate-pulse" />
              <span className="font-bold text-sm">FLASH SALE — Hurry, offer ends soon!</span>
            </div>
            <CountdownTimer endTime={bundle.flash_sale_end} />
          </motion.div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <div className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 ${
            isFlash ? "bg-red-500/10 text-red-500" : "bg-gold/10 text-gold"
          }`}>
            {isFlash ? <Zap className="h-3.5 w-3.5" /> : <Gift className="h-3.5 w-3.5" />}
            {isFlash ? "Flash Sale" : (bundle.badge_text || "Bundle Deal")}
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
                      src={normalizeImageUrl(p.images?.[0])}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={handleImageError}
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
          <div className={`text-white rounded-2xl p-6 md:p-8 ${isFlash ? "bg-red-950" : "bg-neutral-950"}`} data-testid="bundle-cta">
            <div className="text-center">
              {isFlash && bundle.flash_extra_discount > 0 && (
                <p className="text-red-400 text-xs font-bold mb-2">
                  Includes extra Rs.{bundle.flash_extra_discount?.toLocaleString()} flash discount!
                </p>
              )}
              <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
                {bundle.products?.length} items bundle
              </p>
              <div className="flex items-baseline justify-center gap-3 mb-2">
                <span className={`text-3xl font-bold ${isFlash ? "text-red-400" : "text-gold"}`} data-testid="bundle-detail-price">
                  Rs.{bundle.bundle_price?.toLocaleString()}
                </span>
                <span className="text-lg text-neutral-500 line-through">
                  Rs.{bundle.original_total?.toLocaleString()}
                </span>
              </div>
              <div className={`inline-flex items-center gap-1.5 border text-sm font-bold px-4 py-1.5 rounded-full mb-6 ${
                isFlash
                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                  : "bg-green-500/10 border-green-500/20 text-green-400"
              }`}>
                <Tag className="h-4 w-4" />
                Save Rs.{bundle.discount_amount?.toLocaleString()}
              </div>

              {isFlash && (
                <div className="flex justify-center mb-4">
                  <CountdownTimer endTime={bundle.flash_sale_end} />
                </div>
              )}
            </div>

            <Button
              onClick={handleAddBundle}
              disabled={adding}
              className={`w-full font-bold py-6 text-base rounded-xl ${
                isFlash ? "bg-red-600 hover:bg-red-500 text-white" : "btn-gold"
              }`}
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
              {isFlash ? "Flash sale discount applied automatically" : "Bundle discount applied automatically at checkout"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
