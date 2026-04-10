import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingBag, Share2, Plus, Volume2, VolumeX, ArrowLeft, Store, Zap } from "lucide-react";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import axios from "axios";
import { normalizeImageUrl, handleImageError, FALLBACK_IMAGE } from "@/utils/imageUtils";

/* ─────────────────────────────────────────────────
   Kuaishou-style Side Panel (thin ~15% thumbnails)
   ───────────────────────────────────────────────── */
const VendorThumbnailPanel = ({ products, activeProductId, onSelect, totalCount }) => (
  <div className="h-full flex flex-col bg-black" data-testid="vendor-side-panel">
    {/* Works count badge */}
    <div className="flex justify-end px-1 pt-2 pb-1">
      <div className="bg-white/90 text-black text-[8px] font-bold px-1.5 py-0.5 rounded leading-tight text-center" data-testid="vendor-works-count">
        <div className="text-[7px] font-medium leading-none">Works</div>
        <div className="text-[10px] leading-none">{totalCount}</div>
      </div>
    </div>

    {/* Scrollable thumbnail list */}
    <div className="flex-1 overflow-y-auto scrollbar-hide px-[3px] pb-2">
      <div className="flex flex-col gap-[3px]">
        {products.map((p) => {
          const isCurrent = p.product_id === activeProductId;
          return (
            <div
              key={p.product_id}
              onClick={() => onSelect(p.product_id)}
              className={`relative rounded-[4px] overflow-hidden cursor-pointer flex-shrink-0 transition-all duration-200 ${isCurrent ? "ring-[2px] ring-white opacity-100" : "opacity-70 hover:opacity-100"}`}
              data-testid={`vendor-thumb-${p.product_id}`}
            >
              <div className="aspect-[4/3]">
                <img
                  src={normalizeImageUrl(p.images?.[0]) || FALLBACK_IMAGE}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={handleImageError}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────
   Single Reel Card (used in both global & vendor feeds)
   ───────────────────────────────────────────────── */
const ReelCard = ({ product, isActive, isVendorMode, onStoreClick }) => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { addToCart } = useCart();
  const [imgIdx, setImgIdx] = useState(0);
  const [liked, setLiked] = useState(() => {
    const stored = JSON.parse(localStorage.getItem("pigma_reel_likes") || "[]");
    return stored.includes(product.product_id);
  });
  const [adding, setAdding] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);

  const sellerLabel = product.vendor_name || product.brand || product.category || "Pigma";
  const images = (product.images || []).filter(Boolean);
  const hasVideo = !!product.video_url;
  const totalSlides = hasVideo ? images.length + 1 : images.length;

  useEffect(() => {
    if (isActive) {
      axios.post(`${API}/vendor-credits/track-view/${product.product_id}`).catch(() => {});
    }
  }, [isActive, product.product_id]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && imgIdx === 0 && hasVideo) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
  }, [isActive, imgIdx, hasVideo]);

  const cycleSlide = useCallback((dir) => {
    if (totalSlides <= 1) return;
    setImgIdx(i => dir > 0 ? (i + 1) % totalSlides : (i - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const handleLike = async (e) => {
    e.stopPropagation();
    const newLiked = !liked;
    setLiked(newLiked);
    const stored = JSON.parse(localStorage.getItem("pigma_reel_likes") || "[]");
    if (newLiked) { if (!stored.includes(product.product_id)) stored.push(product.product_id); }
    else { const idx = stored.indexOf(product.product_id); if (idx > -1) stored.splice(idx, 1); }
    localStorage.setItem("pigma_reel_likes", JSON.stringify(stored));
    if (user && token) {
      try {
        if (newLiked) await axios.post(`${API}/wishlist/add`, { product_id: product.product_id }, { headers: { Authorization: `Bearer ${token}` } });
        else await axios.delete(`${API}/wishlist/remove/${product.product_id}`, { headers: { Authorization: `Bearer ${token}` } });
      } catch {}
    }
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (product.stock <= 0) { toast.error("Out of stock"); return; }
    setAdding(true);
    const ok = await addToCart(product.product_id, 1, product.sizes?.[0] || "M", product.colors?.[0] || "Default", product, { silent: true });
    setAdding(false);
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/product/${product.product_id}`;
    if (navigator.share) { try { await navigator.share({ title: product.name, url }); } catch {} }
    else { navigator.clipboard.writeText(url); toast.success("Link copied!"); }
  };

  const goToProduct = () => navigate(`/product/${product.product_id}`);
  const discount = product.compare_price ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0;

  const renderSlide = () => {
    if (hasVideo && imgIdx === 0) {
      return (
        <div className="relative w-full h-full bg-black">
          <video ref={videoRef} src={product.video_url} className="w-full h-full object-cover" loop muted={muted} playsInline />
          <button onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }} className="absolute top-24 right-4 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white" data-testid="reel-mute-toggle">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      );
    }
    const src = normalizeImageUrl(images[hasVideo ? imgIdx - 1 : imgIdx]) || FALLBACK_IMAGE;
    return <img src={src} alt={product.name} className="w-full h-full object-cover" loading="lazy" onError={handleImageError} />;
  };

  return (
    <div className={`relative w-full h-full snap-start snap-always flex-shrink-0 bg-black overflow-hidden ${isVendorMode ? "rounded-2xl" : ""}`} data-testid={`reel-card-${product.product_id}`}>
      <div className="absolute inset-0" onClick={goToProduct}>
        {renderSlide()}
        <div className="absolute bottom-0 left-0 right-0 h-64 sm:h-52 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Boost badge */}
      {product.is_boosted && (
        <div className="absolute top-24 left-3 z-10 flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" data-testid="boosted-badge">
          <Zap className="h-2.5 w-2.5" /> Promoted
        </div>
      )}

      {/* Carousel dots */}
      {totalSlides > 1 && (
        <div className="absolute top-12 left-0 right-0 flex justify-center gap-1 z-10">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div key={i} className={`h-[3px] rounded-full transition-all duration-300 ${i === imgIdx ? "w-5 bg-white" : "w-2 bg-white/40"}`} />
          ))}
        </div>
      )}

      {/* Tap zones for image carousel */}
      {totalSlides > 1 && (
        <>
          <div className="absolute left-0 top-0 w-1/4 h-3/4 z-[5]" onClick={(e) => { e.stopPropagation(); cycleSlide(-1); }} />
          <div className="absolute right-0 top-0 w-1/4 h-3/4 z-[5]" onClick={(e) => { e.stopPropagation(); cycleSlide(1); }} />
        </>
      )}

      {/* Right side action buttons */}
      <div className="absolute right-3 bottom-44 sm:bottom-28 flex flex-col items-center gap-4 z-10">
        {/* Store / Seller button */}
        {onStoreClick && (
          <button onClick={(e) => { e.stopPropagation(); onStoreClick(e); }} className="flex flex-col items-center gap-0.5 relative" data-testid={`reel-vendor-${product.product_id}`}>
            <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border-2 border-white/40">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <Plus className="h-2.5 w-2.5 text-white" />
            </div>
          </button>
        )}

        <button onClick={handleLike} className="flex flex-col items-center gap-0.5" data-testid={`reel-like-${product.product_id}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${liked ? "bg-red-500" : "bg-white/15 backdrop-blur-sm"}`}>
            <Heart className={`h-5 w-5 ${liked ? "fill-white text-white" : "text-white"}`} />
          </div>
          <span className="text-[9px] text-white/70">Like</span>
        </button>

        <button onClick={handleAddToCart} disabled={adding || product.stock <= 0} className="flex flex-col items-center gap-0.5 disabled:opacity-40" data-testid={`reel-cart-${product.product_id}`}>
          <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center">
            {adding ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" /> : <ShoppingBag className="h-5 w-5 text-white" />}
          </div>
          <span className="text-[9px] text-white/70">Cart</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-0.5" data-testid={`reel-share-${product.product_id}`}>
          <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Share2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-[9px] text-white/70">Share</span>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-10 sm:bottom-4 left-4 right-16 z-10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} onClick={goToProduct}>
        {sellerLabel && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-white text-[11px] font-semibold">@{sellerLabel}</span>
          </div>
        )}
        <h3 className="text-white text-base font-medium leading-tight line-clamp-2 mb-1">{product.name}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-white text-lg font-bold">Rs.{product.price?.toLocaleString()}</span>
          {product.compare_price && <span className="text-white/50 text-sm line-through">Rs.{product.compare_price?.toLocaleString()}</span>}
          {discount > 0 && <span className="text-emerald-400 text-xs font-semibold">{discount}% off</span>}
        </div>
        {product.stock > 0 && product.stock < 10 && (
          <span className="inline-block mt-1 text-[9px] font-semibold uppercase tracking-wider bg-red-500/80 text-white px-2 py-0.5 rounded">Low Stock</span>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────
   MAIN REELS PAGE — Kuaishou nested feed system
   ───────────────────────────────────────────────── */
export default function ReelsPage() {
  const navigate = useNavigate();

  // Global feed
  const [globalProducts, setGlobalProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalActiveIdx, setGlobalActiveIdx] = useState(0);
  const globalContainerRef = useRef(null);

  // Vendor (nested) feed
  const [feedMode, setFeedMode] = useState("global"); // "global" | "vendor"
  const [vendorProducts, setVendorProducts] = useState([]);
  const [vendorActiveIdx, setVendorActiveIdx] = useState(0);
  const [vendorLabel, setVendorLabel] = useState("");
  const [vendorLoading, setVendorLoading] = useState(false);
  const vendorContainerRef = useRef(null);

  // Touch tracking for horizontal swipe (mode switching)
  const touchRef = useRef({ startX: 0, startY: 0, startTime: 0 });

  // ── Load global feed ──
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/vendor-credits/reels-feed?limit=50`);
        setGlobalProducts(data.products || []);
      } catch {
        try {
          const { data } = await axios.get(`${API}/products?limit=50`);
          setGlobalProducts((data.products || data || []).filter(p => p.images?.length > 0));
        } catch { toast.error("Failed to load"); }
      }
      setLoading(false);
    })();
  }, []);

  // ── IntersectionObserver for global feed ──
  useEffect(() => {
    if (!globalContainerRef.current || feedMode !== "global") return;
    const container = globalContainerRef.current;
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach(e => { if (e.isIntersecting) { const idx = Number(e.target.dataset.reelIndex); if (!isNaN(idx)) setGlobalActiveIdx(idx); } }); },
      { root: container, threshold: 0.6 }
    );
    container.querySelectorAll("[data-reel-index]").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [globalProducts, feedMode]);

  // ── IntersectionObserver for vendor feed ──
  useEffect(() => {
    if (!vendorContainerRef.current || feedMode !== "vendor") return;
    const container = vendorContainerRef.current;
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach(e => { if (e.isIntersecting) { const idx = Number(e.target.dataset.reelIndex); if (!isNaN(idx)) setVendorActiveIdx(idx); } }); },
      { root: container, threshold: 0.6 }
    );
    container.querySelectorAll("[data-reel-index]").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [vendorProducts, feedMode]);

  // ── Enter vendor mode ──
  const enterVendorMode = useCallback(async (product) => {
    const groupKey = product.vendor_id ? "vendor_id" : "category";
    const groupValue = product.vendor_id || product.category;
    if (!groupValue) return;

    setVendorLoading(true);
    setFeedMode("vendor");
    try {
      const { data } = await axios.get(`${API}/vendor-credits/group-products?group_key=${groupKey}&group_value=${encodeURIComponent(groupValue)}`);
      const prods = data.products || [];
      setVendorProducts(prods);
      setVendorLabel(data.group_label || groupValue);
      // Find current product index in vendor feed
      const currentIdx = prods.findIndex(p => p.product_id === product.product_id);
      setVendorActiveIdx(currentIdx >= 0 ? currentIdx : 0);
      // Scroll to the current product after render
      setTimeout(() => {
        if (vendorContainerRef.current && currentIdx > 0) {
          const target = vendorContainerRef.current.querySelector(`[data-reel-index="${currentIdx}"]`);
          if (target) target.scrollIntoView({ behavior: "auto" });
        }
      }, 50);
    } catch {
      setFeedMode("global");
      toast.error("Could not load seller products");
    }
    setVendorLoading(false);
  }, []);

  // ── Exit vendor mode ──
  const exitVendorMode = useCallback(() => {
    setFeedMode("global");
    setVendorProducts([]);
    setVendorLabel("");
  }, []);

  // ── Select thumbnail in vendor panel ──
  const handleThumbSelect = useCallback((productId) => {
    const idx = vendorProducts.findIndex(p => p.product_id === productId);
    if (idx < 0 || !vendorContainerRef.current) return;
    const target = vendorContainerRef.current.querySelector(`[data-reel-index="${idx}"]`);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  }, [vendorProducts]);

  // ── Touch handlers for horizontal swipe (mode switching) ──
  const onTouchStart = useCallback((e) => {
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startTime: Date.now()
    };
  }, []);

  const onTouchEnd = useCallback((e) => {
    const { startX, startY, startTime } = touchRef.current;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    const dt = Date.now() - startTime;

    // Only handle horizontal swipes (ignore vertical scroll)
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 60 && dt < 400) {
      if (dx < 0 && feedMode === "global") {
        // Swipe LEFT → Enter vendor mode
        const activeProduct = globalProducts[globalActiveIdx];
        if (activeProduct) enterVendorMode(activeProduct);
      } else if (dx > 0 && feedMode === "vendor") {
        // Swipe RIGHT → Exit vendor mode
        exitVendorMode();
      }
    }
  }, [feedMode, globalProducts, globalActiveIdx, enterVendorMode, exitVendorMode]);

  // ── Desktop: click Store button to enter vendor mode ──
  const handleStoreClick = useCallback((e, product) => {
    e.stopPropagation();
    if (feedMode === "global") {
      enterVendorMode(product);
    } else {
      exitVendorMode();
    }
  }, [feedMode, enterVendorMode, exitVendorMode]);

  // ── Render ──
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (globalProducts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 text-white">
        <p className="text-lg mb-4">No products to explore</p>
        <button onClick={() => navigate("/products")} className="text-sm text-gold underline" data-testid="browse-products-link">Browse Products</button>
      </div>
    );
  }

  const activeGlobalProduct = globalProducts[globalActiveIdx];
  const activeVendorProduct = vendorProducts[vendorActiveIdx];
  const isVendorMode = feedMode === "vendor";

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center" data-testid="reels-page">
      {/* Centered container — mobile-like on desktop */}
      <div className="relative w-full h-full max-w-[480px] mx-auto">
        {/* Back button */}
        <button
          onClick={() => isVendorMode ? exitVendorMode() : navigate(-1)}
          className="absolute top-3 left-3 z-20 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50"
          data-testid="reels-back-btn"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="absolute top-3 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <span className="text-white text-sm font-semibold tracking-[0.15em] uppercase">
            {isVendorMode ? vendorLabel : "Explore"}
          </span>
        </div>

      {/* ════════ LAYOUT: Main + Side Panel ════════ */}
      <div className="w-full h-full flex" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

        {/* ─── Main Content Area ─── */}
        <div
          className={`h-full flex-1 min-w-0 transition-all duration-300 ease-out ${isVendorMode ? "py-6 px-1" : ""}`}
        >
          {/* GLOBAL FEED */}
          <div
            ref={globalContainerRef}
            className={`w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide ${isVendorMode ? "hidden" : ""}`}
            style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
            data-testid="global-feed"
          >
            {globalProducts.map((product, idx) => (
              <div key={product.product_id} data-reel-index={idx} className="w-full h-screen flex-shrink-0 relative" style={{ scrollSnapAlign: "start" }}>
                <ReelCard
                  product={product}
                  isActive={idx === globalActiveIdx}
                  isVendorMode={false}
                  onStoreClick={(product.vendor_id || product.category) ? ((e) => handleStoreClick(e, product)) : undefined}
                />
              </div>
            ))}
          </div>

          {/* VENDOR FEED */}
          {isVendorMode && (
            <div
              ref={vendorContainerRef}
              className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide rounded-2xl"
              style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
              data-testid="vendor-feed"
            >
              {vendorLoading ? (
                <div className="w-full h-screen flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white" />
                </div>
              ) : vendorProducts.length === 0 ? (
                <div className="w-full h-screen flex flex-col items-center justify-center text-white">
                  <p className="text-sm text-white/50">No products from this seller</p>
                </div>
              ) : (
                vendorProducts.map((product, idx) => (
                  <div key={product.product_id} data-reel-index={idx} className="w-full h-full flex-shrink-0 relative" style={{ scrollSnapAlign: "start" }}>
                    <ReelCard product={product} isActive={idx === vendorActiveIdx} isVendorMode={true} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ─── Side Thumbnail Panel (Kuaishou-style) ─── */}
        <AnimatePresence>
          {isVendorMode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "14%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full overflow-hidden flex-shrink-0 max-w-[68px] md:max-w-[120px]"
            >
              <VendorThumbnailPanel
                products={vendorProducts}
                activeProductId={activeVendorProduct?.product_id}
                onSelect={handleThumbSelect}
                totalCount={vendorProducts.length}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Swipe hints */}
      <AnimatePresence>
        {!isVendorMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-8 sm:bottom-2 left-0 right-0 z-10 flex justify-center pointer-events-none"
          >
            <span className="text-white/25 text-[9px] tracking-wider">Swipe left for more from seller</span>
          </motion.div>
        )}
        {isVendorMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-8 sm:bottom-2 left-0 z-10 flex justify-center pointer-events-none"
            style={{ width: "82%" }}
          >
            <span className="text-white/25 text-[9px] tracking-wider">Swipe right to go back</span>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
