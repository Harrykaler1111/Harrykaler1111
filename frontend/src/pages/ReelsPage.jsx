import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingBag, Share2, ChevronLeft, ChevronRight, Plus, Minus, Volume2, VolumeX, ArrowLeft, X, Store, Zap } from "lucide-react";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import axios from "axios";
import { normalizeImageUrl, handleImageError, FALLBACK_IMAGE } from "@/utils/imageUtils";

/* ─── Vendor Strip (swipe-left overlay) ─── */
const VendorStrip = ({ vendorId, onClose, currentProductId }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (!vendorId) return;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/vendor-credits/vendor-reel-strip/${vendorId}`);
        setProducts((data.products || []).filter(p => p.product_id !== currentProductId));
        setIsPaid(data.is_paid);
      } catch {}
      setLoading(false);
    })();
  }, [vendorId, currentProductId]);

  const handleAdd = async (e, p) => {
    e.stopPropagation();
    await addToCart(p.product_id, 1, p.sizes?.[0] || "M", p.colors?.[0] || "Default", p);
    toast.success("Added to cart");
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
      data-testid="vendor-strip"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-gold" />
          <span className="text-white text-sm font-semibold">More from this seller</span>
          {!isPaid && <span className="text-[9px] text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">Free tier</span>}
        </div>
        <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center" data-testid="vendor-strip-close">
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white" /></div>
        ) : products.length === 0 ? (
          <p className="text-neutral-400 text-sm text-center mt-10">No other products from this seller</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => (
              <div key={p.product_id} onClick={() => { onClose(); navigate(`/product/${p.product_id}`); }} className="cursor-pointer" data-testid={`vendor-strip-product-${p.product_id}`}>
                <div className="aspect-[4/5] rounded-lg overflow-hidden bg-neutral-800 relative">
                  <img src={normalizeImageUrl(p.images?.[0]) || FALLBACK_IMAGE} alt={p.name} className="w-full h-full object-cover" loading="lazy" onError={handleImageError} />
                  <button onClick={(e) => handleAdd(e, p)} className="absolute bottom-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md" data-testid={`vendor-strip-add-${p.product_id}`}>
                    <Plus className="h-3.5 w-3.5 text-neutral-900" />
                  </button>
                </div>
                <p className="text-white text-[11px] mt-1.5 line-clamp-1">{p.name}</p>
                <p className="text-white text-xs font-semibold">Rs.{p.price?.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ─── Single Reel Card ─── */
const ReelCard = ({ product, isActive, onSwipeLeft }) => {
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
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const images = (product.images || []).filter(Boolean);
  const hasVideo = !!product.video_url;
  const totalSlides = hasVideo ? images.length + 1 : images.length;

  // Track view
  useEffect(() => {
    if (isActive) {
      axios.post(`${API}/vendor-credits/track-view/${product.product_id}`).catch(() => {});
    }
  }, [isActive, product.product_id]);

  // Auto-play / pause video
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && imgIdx === 0 && hasVideo) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, imgIdx, hasVideo]);

  const nextSlide = useCallback((e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setImgIdx(i => (i + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback((e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setImgIdx(i => (i - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx < 0) {
        // Swipe LEFT → vendor strip
        if (product.vendor_id) onSwipeLeft(product.vendor_id);
      } else {
        prevSlide();
      }
    }
  };

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
    const ok = await addToCart(product.product_id, 1, product.sizes?.[0] || "M", product.colors?.[0] || "Default", product);
    if (ok) toast.success("Added to cart");
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
          <button onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }} className="absolute top-4 right-4 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white" data-testid="reel-mute-toggle">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      );
    }
    const src = normalizeImageUrl(images[hasVideo ? imgIdx - 1 : imgIdx]) || FALLBACK_IMAGE;
    return <img src={src} alt={product.name} className="w-full h-full object-cover" loading="lazy" onError={handleImageError} />;
  };

  return (
    <div className="relative w-full h-full snap-start snap-always flex-shrink-0 bg-black" data-testid={`reel-card-${product.product_id}`}>
      <div className="absolute inset-0" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={goToProduct}>
        {renderSlide()}
        <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Boost badge */}
      {product.is_boosted && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" data-testid="boosted-badge">
          <Zap className="h-2.5 w-2.5" /> Promoted
        </div>
      )}

      {/* Carousel dots */}
      {totalSlides > 1 && (
        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 z-10">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div key={i} className={`h-[3px] rounded-full transition-all duration-300 ${i === imgIdx ? "w-5 bg-white" : "w-2 bg-white/40"}`} />
          ))}
        </div>
      )}

      {/* Carousel arrows (desktop) */}
      {totalSlides > 1 && (
        <>
          <button onClick={prevSlide} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full items-center justify-center text-white/80 hover:text-white hidden md:flex z-10"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={nextSlide} className="absolute right-14 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full items-center justify-center text-white/80 hover:text-white hidden md:flex z-10"><ChevronRight className="h-4 w-4" /></button>
        </>
      )}

      {/* Right side actions */}
      <div className="absolute right-3 bottom-36 flex flex-col items-center gap-5 z-10">
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

        {/* Vendor strip hint */}
        {product.vendor_id && (
          <button onClick={(e) => { e.stopPropagation(); onSwipeLeft(product.vendor_id); }} className="flex flex-col items-center gap-0.5" data-testid={`reel-vendor-${product.product_id}`}>
            <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="text-[9px] text-white/70">Seller</span>
          </button>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-6 left-4 right-16 z-10" onClick={goToProduct}>
        <h3 className="text-white text-base font-medium leading-tight line-clamp-2 mb-1">{product.name}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-white text-lg font-bold">Rs.{product.price?.toLocaleString()}</span>
          {product.compare_price && <span className="text-white/50 text-sm line-through">Rs.{product.compare_price?.toLocaleString()}</span>}
          {discount > 0 && <span className="text-emerald-400 text-xs font-semibold">{discount}% off</span>}
        </div>
        {product.stock > 0 && product.stock < 10 && (
          <span className="inline-block mt-1.5 text-[9px] font-semibold uppercase tracking-wider bg-red-500/80 text-white px-2 py-0.5 rounded">Low Stock</span>
        )}
      </div>
    </div>
  );
};

/* ─── Reels Page ─── */
export default function ReelsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [vendorStripId, setVendorStripId] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/vendor-credits/reels-feed?limit=50`);
        setProducts(data.products || []);
      } catch {
        // Fallback to regular products
        try {
          const { data } = await axios.get(`${API}/products?limit=50`);
          setProducts((data.products || data || []).filter(p => p.images?.length > 0));
        } catch { toast.error("Failed to load"); }
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach(e => { if (e.isIntersecting) { const idx = Number(e.target.dataset.reelIndex); if (!isNaN(idx)) setActiveIdx(idx); } }); },
      { root: container, threshold: 0.6 }
    );
    container.querySelectorAll("[data-reel-index]").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [products]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 text-white">
        <p className="text-lg mb-4">No products to explore</p>
        <button onClick={() => navigate("/products")} className="text-sm text-gold underline">Browse Products</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50" data-testid="reels-page">
      <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-20 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50" data-testid="reels-back-btn">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="absolute top-4 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <span className="text-white text-sm font-semibold tracking-[0.15em] uppercase">Explore</span>
      </div>

      <div ref={containerRef} className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide" style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}>
        {products.map((product, idx) => (
          <div key={product.product_id} data-reel-index={idx} className="w-full h-screen flex-shrink-0" style={{ scrollSnapAlign: "start" }}>
            <ReelCard product={product} isActive={idx === activeIdx} onSwipeLeft={(vid) => setVendorStripId(vid)} />
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-[2px]">
        {products.slice(0, 20).map((_, i) => (
          <div key={i} className={`w-[3px] rounded-full transition-all duration-200 ${i === activeIdx ? "h-4 bg-white" : "h-1.5 bg-white/25"}`} />
        ))}
      </div>

      {/* Swipe-left hint */}
      <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center pointer-events-none">
        <span className="text-white/30 text-[9px] tracking-wider">Swipe left for more from seller</span>
      </div>

      {/* Vendor Strip Overlay */}
      <AnimatePresence>
        {vendorStripId && (
          <VendorStrip vendorId={vendorStripId} onClose={() => setVendorStripId(null)} currentProductId={products[activeIdx]?.product_id} />
        )}
      </AnimatePresence>
    </div>
  );
}
