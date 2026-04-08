import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingBag, Share2, ChevronLeft, ChevronRight, Plus, Minus, Volume2, VolumeX, ArrowLeft, X, Store, Zap } from "lucide-react";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import axios from "axios";
import { normalizeImageUrl, handleImageError, FALLBACK_IMAGE } from "@/utils/imageUtils";

/* ─── Vendor Side Panel (Kuaishou-style right side thumbnails) ─── */
const VendorSidePanel = ({ groupKey, groupValue, currentProductId, onClose, onSelectProduct }) => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [groupLabel, setGroupLabel] = useState("");

  useEffect(() => {
    if (!groupValue) return;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/vendor-credits/group-products?group_key=${groupKey}&group_value=${encodeURIComponent(groupValue)}`);
        const all = data.products || [];
        setProducts(all);
        setIsPaid(data.is_paid);
        setGroupLabel(data.group_label || groupValue);
      } catch {}
      setLoading(false);
    })();
  }, [groupKey, groupValue]);

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
      transition={{ type: "spring", damping: 30, stiffness: 350 }}
      className="absolute top-0 right-0 bottom-0 w-[38%] max-w-[180px] bg-black/90 backdrop-blur-md z-[15] flex flex-col border-l border-white/10"
      data-testid="vendor-side-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 pt-3 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Store className="h-3 w-3 text-white" />
          </div>
          <span className="text-white text-[10px] font-medium truncate">{groupLabel || "Seller"}</span>
        </div>
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center" data-testid="vendor-panel-close">
          <X className="h-3.5 w-3.5 text-white/60" />
        </button>
      </div>

      {/* Product count */}
      <div className="px-2 pb-2">
        <span className="text-[9px] text-white/40">{products.length} products{!isPaid && " (Free tier)"}</span>
      </div>

      {/* Thumbnail grid */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-3 scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-4 w-4 border border-white/20 border-t-white" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-white/30 text-[10px] text-center mt-6">No products</p>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map(p => {
              const isCurrent = p.product_id === currentProductId;
              return (
                <div
                  key={p.product_id}
                  onClick={() => onSelectProduct(p)}
                  className={`relative rounded-lg overflow-hidden cursor-pointer ${isCurrent ? "ring-2 ring-gold" : ""}`}
                  data-testid={`vendor-thumb-${p.product_id}`}
                >
                  <div className="aspect-[3/4]">
                    <img
                      src={normalizeImageUrl(p.images?.[0]) || FALLBACK_IMAGE}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={handleImageError}
                    />
                  </div>
                  {/* Overlay info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-white text-[8px] line-clamp-1 leading-tight">{p.name}</p>
                    <p className="text-white text-[9px] font-bold">Rs.{p.price?.toLocaleString()}</p>
                  </div>
                  {/* Quick add */}
                  {!isCurrent && (
                    <button
                      onClick={(e) => handleAdd(e, p)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 bg-white/90 rounded-full flex items-center justify-center"
                    >
                      <Plus className="h-3 w-3 text-black" />
                    </button>
                  )}
                  {isCurrent && (
                    <div className="absolute top-1.5 left-1.5 text-[7px] bg-gold/90 text-black font-bold px-1 py-[1px] rounded">
                      Now
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ─── Single Reel Card ─── */
const ReelCard = ({ product, isActive, onSwipeLeft, showPanel }) => {
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
  const touchStartTime = useRef(0);

  // Determine the group identifier (vendor_id if available, otherwise category)
  const groupKey = product.vendor_id ? "vendor_id" : "category";
  const groupValue = product.vendor_id || product.category;
  const sellerLabel = product.vendor_name || product.brand || product.category || "Pigma";

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
    if (isActive && imgIdx === 0 && hasVideo) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
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
    touchStartTime.current = Date.now();
  };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const dt = Date.now() - touchStartTime.current;
    // Only handle horizontal swipes (not vertical scroll)
    if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 50 && dt < 500) {
      if (dx < 0 && groupValue) {
        // Swipe LEFT → open vendor panel
        onSwipeLeft(groupKey, groupValue);
      }
      // Swipe RIGHT on images (if panel not open)
      if (dx > 0 && !showPanel) {
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
          <button onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }} className="absolute top-14 right-4 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white" data-testid="reel-mute-toggle">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      );
    }
    const src = normalizeImageUrl(images[hasVideo ? imgIdx - 1 : imgIdx]) || FALLBACK_IMAGE;
    return <img src={src} alt={product.name} className="w-full h-full object-cover" loading="lazy" onError={handleImageError} />;
  };

  return (
    <div className="relative w-full h-full snap-start snap-always flex-shrink-0 bg-black overflow-hidden" data-testid={`reel-card-${product.product_id}`}>
      {/* Main content area */}
      <div className="absolute inset-0" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={goToProduct}>
        {renderSlide()}
        <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Boost badge */}
      {product.is_boosted && (
        <div className="absolute top-12 left-3 z-10 flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" data-testid="boosted-badge">
          <Zap className="h-2.5 w-2.5" /> Promoted
        </div>
      )}

      {/* Image carousel dots */}
      {totalSlides > 1 && (
        <div className="absolute top-12 left-0 right-0 flex justify-center gap-1 z-10">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div key={i} className={`h-[3px] rounded-full transition-all duration-300 ${i === imgIdx ? "w-5 bg-white" : "w-2 bg-white/40"}`} />
          ))}
        </div>
      )}

      {/* Desktop carousel arrows */}
      {totalSlides > 1 && (
        <>
          <button onClick={prevSlide} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full items-center justify-center text-white/80 hidden md:flex z-10"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={nextSlide} className="absolute right-14 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full items-center justify-center text-white/80 hidden md:flex z-10"><ChevronRight className="h-4 w-4" /></button>
        </>
      )}

      {/* Right side action buttons */}
      <div className={`absolute bottom-32 flex flex-col items-center gap-5 z-10 transition-all duration-200 ${showPanel ? "right-[40%]" : "right-3"}`}>
        {/* Vendor avatar + seller button */}
        {groupValue && (
          <button onClick={(e) => { e.stopPropagation(); onSwipeLeft(groupKey, groupValue); }} className="flex flex-col items-center gap-0.5 relative" data-testid={`reel-vendor-${product.product_id}`}>
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

      {/* Bottom info — vendor name + product */}
      <div className={`absolute bottom-5 left-4 z-10 transition-all duration-200 ${showPanel ? "right-[42%]" : "right-16"}`} onClick={goToProduct}>
        {/* Vendor name */}
        {sellerLabel && (
          <div className="flex items-center gap-1.5 mb-2">
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
  const [vendorPanelGroup, setVendorPanelGroup] = useState(null); // { key, value }
  const containerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/vendor-credits/reels-feed?limit=50`);
        setProducts(data.products || []);
      } catch {
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

  // Close vendor panel when scrolling to a different reel
  useEffect(() => { setVendorPanelGroup(null); }, [activeIdx]);

  const handleSwipeLeft = useCallback((groupKey, groupValue) => {
    setVendorPanelGroup(prev =>
      prev && prev.key === groupKey && prev.value === groupValue ? null : { key: groupKey, value: groupValue }
    );
  }, []);

  const handleSelectFromPanel = useCallback((product) => {
    navigate(`/product/${product.product_id}`);
  }, [navigate]);

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
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="absolute top-3 left-3 z-20 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50" data-testid="reels-back-btn">
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Title */}
      <div className="absolute top-3 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <span className="text-white text-sm font-semibold tracking-[0.15em] uppercase">Explore</span>
      </div>

      {/* Vertical snap scroll container */}
      <div ref={containerRef} className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide" style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}>
        {products.map((product, idx) => {
          const gKey = product.vendor_id ? "vendor_id" : "category";
          const gVal = product.vendor_id || product.category;
          const panelOpen = vendorPanelGroup && vendorPanelGroup.key === gKey && vendorPanelGroup.value === gVal && idx === activeIdx;
          return (
            <div key={product.product_id} data-reel-index={idx} className="w-full h-screen flex-shrink-0 relative" style={{ scrollSnapAlign: "start" }}>
              <ReelCard
                product={product}
                isActive={idx === activeIdx}
                onSwipeLeft={handleSwipeLeft}
                showPanel={panelOpen}
              />
              <AnimatePresence>
                {panelOpen && (
                  <VendorSidePanel
                    groupKey={gKey}
                    groupValue={gVal}
                    currentProductId={product.product_id}
                    onClose={() => setVendorPanelGroup(null)}
                    onSelectProduct={handleSelectFromPanel}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Swipe hint */}
      {!vendorPanelGroup && (
        <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center pointer-events-none">
          <span className="text-white/25 text-[9px] tracking-wider">Swipe left for more from seller</span>
        </div>
      )}
    </div>
  );
}
