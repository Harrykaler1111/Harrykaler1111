import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingBag, Share2, ChevronLeft, ChevronRight, Plus, Volume2, VolumeX, ArrowLeft } from "lucide-react";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import axios from "axios";
import { normalizeImageUrl, handleImageError, FALLBACK_IMAGE } from "@/utils/imageUtils";

/* ─── Single Reel Card ─── */
const ReelCard = ({ product, isActive }) => {
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

  // Auto-play / pause video when active
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

  // Swipe detection for image carousel (horizontal)
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) nextSlide(); else prevSlide();
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    const newLiked = !liked;
    setLiked(newLiked);

    // Store locally so anyone can like
    const stored = JSON.parse(localStorage.getItem("pigma_reel_likes") || "[]");
    if (newLiked) {
      if (!stored.includes(product.product_id)) stored.push(product.product_id);
    } else {
      const idx = stored.indexOf(product.product_id);
      if (idx > -1) stored.splice(idx, 1);
    }
    localStorage.setItem("pigma_reel_likes", JSON.stringify(stored));

    // Also sync to wishlist API if logged in
    if (user && token) {
      try {
        if (newLiked) {
          await axios.post(`${API}/wishlist/add`, { product_id: product.product_id }, { headers: { Authorization: `Bearer ${token}` } });
        } else {
          await axios.delete(`${API}/wishlist/remove/${product.product_id}`, { headers: { Authorization: `Bearer ${token}` } });
        }
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
    if (navigator.share) {
      try { await navigator.share({ title: product.name, url }); } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  const goToProduct = () => navigate(`/product/${product.product_id}`);
  const discount = product.compare_price ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0;

  const renderSlide = () => {
    const slideIdx = hasVideo ? imgIdx - 1 : imgIdx;
    if (hasVideo && imgIdx === 0) {
      return (
        <div className="relative w-full h-full bg-black">
          <video
            ref={videoRef}
            src={product.video_url}
            className="w-full h-full object-cover"
            loop
            muted={muted}
            playsInline
          />
          <button
            onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
            className="absolute top-4 right-4 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
            data-testid="reel-mute-toggle"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      );
    }
    const src = normalizeImageUrl(images[hasVideo ? slideIdx : imgIdx]) || FALLBACK_IMAGE;
    return (
      <img
        src={src}
        alt={product.name}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={handleImageError}
      />
    );
  };

  return (
    <div
      className="relative w-full h-full snap-start snap-always flex-shrink-0 bg-black"
      data-testid={`reel-card-${product.product_id}`}
    >
      {/* Image / Video area */}
      <div
        className="absolute inset-0"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={goToProduct}
      >
        {renderSlide()}
        {/* Bottom gradient for readability */}
        <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Carousel dots */}
      {totalSlides > 1 && (
        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 z-10">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div
              key={i}
              className={`h-[3px] rounded-full transition-all duration-300 ${i === imgIdx ? "w-5 bg-white" : "w-2 bg-white/40"}`}
            />
          ))}
        </div>
      )}

      {/* Carousel arrows (desktop) */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full items-center justify-center text-white/80 hover:text-white hover:bg-black/50 transition-all hidden md:flex z-10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-14 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full items-center justify-center text-white/80 hover:text-white hover:bg-black/50 transition-all hidden md:flex z-10"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Right side action buttons */}
      <div className="absolute right-3 bottom-36 flex flex-col items-center gap-5 z-10">
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-0.5"
          data-testid={`reel-like-${product.product_id}`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${liked ? "bg-red-500" : "bg-white/15 backdrop-blur-sm"}`}>
            <Heart className={`h-5 w-5 ${liked ? "fill-white text-white" : "text-white"}`} />
          </div>
          <span className="text-[9px] text-white/70">Like</span>
        </button>

        <button
          onClick={handleAddToCart}
          disabled={adding || product.stock <= 0}
          className="flex flex-col items-center gap-0.5 disabled:opacity-40"
          data-testid={`reel-cart-${product.product_id}`}
        >
          <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center">
            {adding ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
            ) : (
              <ShoppingBag className="h-5 w-5 text-white" />
            )}
          </div>
          <span className="text-[9px] text-white/70">Cart</span>
        </button>

        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-0.5"
          data-testid={`reel-share-${product.product_id}`}
        >
          <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Share2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-[9px] text-white/70">Share</span>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-6 left-4 right-16 z-10" onClick={goToProduct}>
        <h3 className="text-white text-base font-medium leading-tight line-clamp-2 mb-1">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-white text-lg font-bold">
            Rs.{product.price?.toLocaleString()}
          </span>
          {product.compare_price && (
            <span className="text-white/50 text-sm line-through">
              Rs.{product.compare_price?.toLocaleString()}
            </span>
          )}
          {discount > 0 && (
            <span className="text-emerald-400 text-xs font-semibold">
              {discount}% off
            </span>
          )}
        </div>
        {product.stock > 0 && product.stock < 10 && (
          <span className="inline-block mt-1.5 text-[9px] font-semibold uppercase tracking-wider bg-red-500/80 text-white px-2 py-0.5 rounded">
            Low Stock
          </span>
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
  const containerRef = useRef(null);

  // Fetch products
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/products?limit=50`);
        // Only show products with images
        const withImages = (data.products || data || []).filter(p => p.images?.length > 0);
        setProducts(withImages);
      } catch { toast.error("Failed to load products"); }
      setLoading(false);
    })();
  }, []);

  // Track active reel via Intersection Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = Number(e.target.dataset.reelIndex);
            if (!isNaN(idx)) setActiveIdx(idx);
          }
        });
      },
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
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-20 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors"
        data-testid="reels-back-btn"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Title */}
      <div className="absolute top-4 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <span className="text-white text-sm font-semibold tracking-[0.15em] uppercase">Explore</span>
      </div>

      {/* Vertical snap scroll container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {products.map((product, idx) => (
          <div
            key={product.product_id}
            data-reel-index={idx}
            className="w-full h-screen flex-shrink-0"
            style={{ scrollSnapAlign: "start" }}
          >
            <ReelCard product={product} isActive={idx === activeIdx} />
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-[2px]">
        {products.slice(0, 20).map((_, i) => (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-200 ${i === activeIdx ? "h-4 bg-white" : "h-1.5 bg-white/25"}`}
          />
        ))}
      </div>
    </div>
  );
}
