import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, ShoppingBag, Truck, RefreshCw, Shield, Minus, Plus,
  Check, Star, Volume2, VolumeX, ChevronLeft, ChevronRight,
  Play, Pause, ZoomIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductReviews } from "@/components/ProductReviews";
import { FrequentlyBoughtTogether } from "@/components/FrequentlyBoughtTogether";
import { ProductBundleBanner } from "@/components/BundleDeals";
import { ProductPartnerLinks } from "@/components/ProductPartnerLinks";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import axios from "axios";
import { normalizeImageUrl, handleImageError, FALLBACK_IMAGE } from "@/utils/imageUtils";
import { whatsappProductLink, PHONE_NUMBER } from "@/components/WhatsAppButton";

// ====== Image with Zoom on Hover (Desktop) + Pinch/Tap Zoom (Mobile) ======
const ZoomableImage = ({ src, alt }) => {
  const containerRef = useRef(null);
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  const updateOrigin = useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }, []);

  // Desktop mouse
  const handleMouseMove = useCallback((e) => updateOrigin(e.clientX, e.clientY), [updateOrigin]);

  // Mobile touch
  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    if (t) { updateOrigin(t.clientX, t.clientY); setZooming(true); }
  }, [updateOrigin]);
  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) updateOrigin(t.clientX, t.clientY);
  }, [updateOrigin]);
  const handleTouchEnd = useCallback(() => setZooming(false), []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-crosshair overflow-hidden group touch-none"
      onMouseEnter={() => setZooming(true)}
      onMouseLeave={() => setZooming(false)}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="zoomable-image"
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain transition-transform duration-150 ease-out"
        style={{
          transform: zooming ? "scale(2.2)" : "scale(1)",
          transformOrigin: origin,
        }}
        draggable={false}
        onError={handleImageError}
        data-testid="product-main-image"
      />
      {/* Zoom hint */}
      {!zooming && (
        <span className="absolute bottom-3 right-3 bg-black/50 text-white text-[9px] px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1 pointer-events-none opacity-0 group-hover:opacity-70 sm:group-hover:opacity-70 transition-opacity sm:flex hidden">
          <ZoomIn className="h-3 w-3" /> Hover to zoom
        </span>
      )}
      {/* Mobile zoom hint */}
      {!zooming && (
        <span className="absolute bottom-3 right-3 bg-black/50 text-white text-[9px] px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1 pointer-events-none opacity-70 sm:hidden">
          <ZoomIn className="h-3 w-3" /> Hold to zoom
        </span>
      )}
    </div>
  );
};

// ====== Video Player with Play/Pause + Mute + Progress ======
const ProductVideo = ({ src }) => {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showCenter, setShowCenter] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      if (video.duration) setProgress((video.currentTime / video.duration) * 100);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); } else { v.pause(); }
    setShowCenter(true);
    setTimeout(() => setShowCenter(false), 600);
  };

  const handleProgressClick = (e) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  };

  return (
    <div className="relative w-full h-full bg-black group">
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted={muted}
        loop
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        data-testid="product-main-video"
      />

      {/* Center play/pause indicator (briefly shows on toggle) */}
      <AnimatePresence>
        {showCenter && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
              {playing
                ? <Play className="h-8 w-8 text-white fill-white" />
                : <Pause className="h-8 w-8 text-white fill-white" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity px-3 pb-2.5 pt-8">
        {/* Progress bar */}
        <div
          className="w-full h-1 bg-white/20 rounded-full mb-2 cursor-pointer"
          onClick={handleProgressClick}
          data-testid="video-progress-bar"
        >
          <div
            className="h-full bg-gold rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={togglePlay}
            className="text-white hover:text-gold transition-colors p-1"
            data-testid="video-play-pause"
          >
            {playing
              ? <Pause className="h-4 w-4 fill-current" />
              : <Play className="h-4 w-4 fill-current" />}
          </button>
          <button
            onClick={() => setMuted(!muted)}
            className="text-white hover:text-gold transition-colors p-1"
            data-testid="video-mute-toggle"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProductDetailPage = () => {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { addToCart, openCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  // Reseller price override from URL
  const urlResellerId = searchParams.get("reseller_id");
  const urlPrice = parseFloat(searchParams.get("price"));
  const isResellerView = !!(urlResellerId && urlPrice && !isNaN(urlPrice));

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        // Pass reseller params to API — backend overrides price in response
        let url = `${API}/products/${productId}`;
        if (urlResellerId && urlPrice && !isNaN(urlPrice)) {
          url += `?reseller_id=${urlResellerId}&price=${urlPrice}`;
        }
        const response = await axios.get(url);
        setProduct(response.data);
        if (response.data.sizes?.length > 0) setSelectedSize(response.data.sizes[0]);
        if (response.data.colors?.length > 0) setSelectedColor(response.data.colors[0]);
      } catch {
        toast.error("Product not found");
        navigate("/products");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, navigate, urlResellerId, urlPrice]);

  const handleAddToCart = async () => {
    if (!selectedSize || !selectedColor) { toast.error("Please select size and color"); return; }
    setAddingToCart(true);
    try {
      const ok = await addToCart(
        product.product_id, quantity, selectedSize, selectedColor, product
      );
      if (ok) { openCart(); }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add to cart");
    } finally { setAddingToCart(false); }
  };

  const handleAddToWishlist = async () => {
    if (!user) { toast.error("Please sign in"); navigate("/auth"); return; }
    try {
      await axios.post(`${API}/wishlist/add`, { product_id: product.product_id }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Added to wishlist");
    } catch { toast.error("Failed to add to wishlist"); }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold" />
      </div>
    );
  }

  if (!product) return null;

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  // Build media array
  const allMedia = [
    ...(product.images || []).map(u => ({ url: normalizeImageUrl(u), type: "image" })),
    ...(product.videos || []).map(u => ({ url: u, type: "video" })),
  ];
  if (allMedia.length === 0) allMedia.push({ url: FALLBACK_IMAGE, type: "image" });
  const current = allMedia[activeImage] || allMedia[0];

  const goMedia = (dir) => {
    setActiveImage(prev => {
      if (dir === "next") return (prev + 1) % allMedia.length;
      return (prev - 1 + allMedia.length) % allMedia.length;
    });
  };

  return (
    <div className="min-h-screen pt-24 md:pt-28 pb-12 bg-white" data-testid="product-detail-page">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">

          {/* ====== LEFT: Media Gallery ====== */}
          <div className="space-y-3">
            {/* Main Image/Video */}
            <div className="relative bg-neutral-50 rounded-lg overflow-hidden group">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="aspect-[4/5] w-full"
                >
                  {current.type === "video" ? (
                    <ProductVideo src={current.url} />
                  ) : (
                    <ZoomableImage src={current.url} alt={product.name} />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Prev/Next arrows */}
              {allMedia.length > 1 && (
                <>
                  <button onClick={() => goMedia("prev")}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    data-testid="media-prev">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => goMedia("next")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    data-testid="media-next">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* Badges on image */}
              <div className="absolute top-3 left-3 flex gap-1.5">
                {product.is_limited_edition && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-gold text-black px-2.5 py-1 rounded-sm">
                    Limited
                  </span>
                )}
                {discount > 0 && !isResellerView && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-black text-white px-2.5 py-1 rounded-sm">
                    -{discount}%
                  </span>
                )}
              </div>

              {/* Image counter */}
              {allMedia.length > 1 && (
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] bg-black/50 text-white px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {activeImage + 1} / {allMedia.length}
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {allMedia.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {allMedia.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`flex-shrink-0 w-16 h-20 rounded overflow-hidden border-2 transition-all ${
                      activeImage === idx ? "border-black ring-1 ring-black" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                    data-testid={`product-thumbnail-${idx}`}
                  >
                    {m.type === "video" ? (
                      <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-white/70" />
                      </div>
                    ) : (
                      <img src={m.url} alt="" className="w-full h-full object-cover" onError={handleImageError} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ====== RIGHT: Product Info ====== */}
          <div className="lg:sticky lg:top-36 lg:self-start space-y-5">
            {/* Category & Vendor */}
            <div>
              <p className="text-[11px] text-neutral-400 uppercase tracking-widest mb-1" data-testid="product-category">
                {product.category}
              </p>
              {product.vendor_name && (
                <Link to={`/store/${product.vendor_id}`}
                  className="text-[11px] text-gold/80 hover:text-gold transition-colors uppercase tracking-wider"
                  data-testid="product-vendor">
                  By {product.vendor_name}
                </Link>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif text-2xl md:text-[28px] font-bold leading-tight" data-testid="product-name">
              {product.name}
            </h1>

            {/* Rating */}
            {product.average_rating > 0 && (
              <div className="flex items-center gap-2" data-testid="product-rating-summary">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(product.average_rating) ? "fill-gold text-gold" : "fill-none text-neutral-200"}`} />
                  ))}
                </div>
                <span className="text-xs text-neutral-400">
                  {product.average_rating.toFixed(1)} ({product.review_count || 0})
                </span>
              </div>
            )}

            {/* Price */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold" data-testid="product-price">
                  Rs.{product.price.toLocaleString()}
                </span>
                {product.compare_price && (
                  <>
                    <span className="text-base text-neutral-400 line-through">
                      Rs.{product.compare_price.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      Save {discount}%
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-neutral-500 leading-relaxed" data-testid="product-description">
              {product.description}
            </p>

            {/* Divider */}
            <div className="border-t border-neutral-100" />

            {/* Size Selection */}
            {product.sizes?.length > 0 && (
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2.5 block">
                  Size: <span className="text-black">{selectedSize}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button key={size} onClick={() => setSelectedSize(size)}
                      className={`min-w-[44px] h-10 px-3 border text-sm font-medium rounded transition-all ${
                        selectedSize === size
                          ? "border-black bg-black text-white"
                          : "border-neutral-200 hover:border-neutral-400 text-neutral-700"
                      }`}
                      data-testid={`size-${size}`}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {product.colors?.length > 0 && (
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2.5 block">
                  Color: <span className="text-black">{selectedColor}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button key={color} onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 border text-xs font-medium rounded transition-all ${
                        selectedColor === color
                          ? "border-black bg-black text-white"
                          : "border-neutral-200 hover:border-neutral-400 text-neutral-700"
                      }`}
                      data-testid={`color-${color}`}>
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Stock */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-2.5 block">Quantity</label>
                <div className="flex items-center border border-neutral-200 rounded overflow-hidden w-fit">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-neutral-50 transition-colors"
                    data-testid="qty-decrease">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium" data-testid="qty-value">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-neutral-50 transition-colors"
                    data-testid="qty-increase">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {product.stock > 0 ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">
                      {product.stock < 10 ? `Only ${product.stock} left` : "In Stock"}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-red-500 font-medium">Out of Stock</span>
                )}
              </div>
            </div>

            {/* Scarcity & Conversion Triggers */}
            <div className="flex flex-wrap gap-2 py-1">
              {product.stock > 0 && product.stock <= 10 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full animate-pulse" data-testid="scarcity-low-stock">
                  Only {product.stock} pieces left
                </span>
              )}
              {product.is_limited_edition && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full" data-testid="scarcity-limited">
                  Limited drop - no restock
                </span>
              )}
              {product.sold_count > 20 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full" data-testid="selling-fast">
                  Selling Fast
                </span>
              )}
            </div>

            {/* Conversion Triggers */}
            <div className="grid grid-cols-2 gap-2 bg-neutral-50 rounded-lg p-3">
              {[
                { text: "Delivery in 3-5 days", icon: Truck },
                { text: "COD Available", icon: Shield },
              ].map(({ text, icon: Icon }) => (
                <div key={text} className="flex items-center gap-2 text-xs text-neutral-600">
                  <Icon className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                  <span className="font-medium">{text}</span>
                </div>
              ))}
            </div>

            {/* Bullet Description */}
            {product.description && (
              <div className="text-xs text-neutral-500 space-y-1.5 py-1">
                <p className="font-bold text-neutral-700 text-sm mb-2">Product Details</p>
                {product.description.split("\n").filter(l => l.trim()).map((line, i) => (
                  <p key={i} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-gold flex-shrink-0 mt-1.5" />
                    {line.replace(/^[-*]\s*/, "")}
                  </p>
                ))}
              </div>
            )}

            {/* Add to Cart & Wishlist */}
            <div className="flex gap-2.5 pt-2">
              <Button onClick={handleAddToCart}
                disabled={product.stock === 0 || addingToCart}
                className="flex-1 btn-gold py-5 text-sm font-bold uppercase tracking-wider rounded"
                data-testid="add-to-cart-btn">
                {addingToCart ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black" />
                ) : (
                  <><ShoppingBag className="mr-2 h-4 w-4" /> Add to Cart</>
                )}
              </Button>
              <Button onClick={handleAddToWishlist} variant="outline"
                className="w-12 h-12 p-0 border-neutral-200 hover:border-gold hover:text-gold rounded"
                data-testid="wishlist-btn">
                <Heart className="h-4 w-4" />
              </Button>
            </div>

            {/* Features */}
            <div className="pt-4 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: Truck, text: "Free shipping over Rs.2999" },
                { icon: RefreshCw, text: "14-day returns" },
                { icon: Shield, text: "Authentic guarantee" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs text-neutral-500">
                  <Icon className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-3">
                {product.tags.map((tag) => (
                  <span key={tag} className="text-[10px] text-neutral-400 bg-neutral-50 px-2.5 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Partner Links (Affiliate / Reseller) — hidden on reseller views */}
            {!isResellerView && <ProductPartnerLinks product={product} />}
          </div>
        </div>

        {/* Bundle Deal Banner */}
        <ProductBundleBanner productId={product.product_id} />

        {/* Frequently Bought Together */}
        <FrequentlyBoughtTogether productId={product.product_id} currentProduct={product} />

        {/* Reviews Section */}
        <div className="mt-12">
          <ProductReviews productId={product.product_id} vendorId={product.vendor_id} />
        </div>
      </div>

    </div>
  );
};
