import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Star, Plus, Minus, Check } from "lucide-react";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import axios from "axios";
import { normalizeImageUrl, handleImageError, FALLBACK_IMAGE } from "@/utils/imageUtils";

export const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const cartItem = cartItems?.find(i => i.product_id === product.product_id);
  const cartQty = cartItem?.quantity || 0;

  const handleQuickAdd = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;
    setAdding(true);
    const defaultSize = product.sizes?.[0] || "M";
    const defaultColor = product.colors?.[0] || "Default";
    const ok = await addToCart(product.product_id, 1, defaultSize, defaultColor, product);
    if (ok) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1200);
    }
    setAdding(false);
  }, [product, addToCart]);

  const handleIncrease = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) return;
    if (cartQty >= product.stock) { toast.error("Max stock reached"); return; }
    await updateQuantity(product.product_id, cartQty + 1, cartItem.size, cartItem.color);
  }, [cartItem, cartQty, product, updateQuantity]);

  const handleDecrease = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) return;
    if (cartQty <= 1) {
      await removeFromCart(product.product_id, cartItem.size, cartItem.color);
    } else {
      await updateQuantity(product.product_id, cartQty - 1, cartItem.size, cartItem.color);
    }
  }, [cartItem, cartQty, product, updateQuantity, removeFromCart]);

  const handleAddToWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error("Please sign in to add to wishlist"); navigate("/auth"); return; }
    try {
      await axios.post(`${API}/wishlist/add`, { product_id: product.product_id }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Added to wishlist");
    } catch { toast.error("Failed to add to wishlist"); }
  };

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock < 10;

  return (
    <Link
      to={`/product/${product.product_id}`}
      className="group block"
      data-testid={`product-card-${product.product_id}`}
    >
      {/* Clean image */}
      <div className={`relative aspect-[4/5] overflow-hidden bg-neutral-50 rounded-lg ${isOutOfStock ? "opacity-50" : ""}`}>
        <img
          src={normalizeImageUrl(product.images?.[0]) || FALLBACK_IMAGE}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          loading="lazy"
          onError={handleImageError}
        />

        {/* Top-left badge — small, subtle */}
        {isLowStock && (
          <span
            className="absolute top-2 left-2 text-[7px] font-semibold uppercase tracking-wider bg-red-500/85 text-white px-1.5 py-[2px] rounded"
            data-testid={`low-stock-badge-${product.product_id}`}
          >
            Low Stock
          </span>
        )}
        {isOutOfStock && (
          <span className="absolute top-2 left-2 text-[7px] font-semibold uppercase tracking-wider bg-neutral-600/85 text-white px-1.5 py-[2px] rounded">
            Sold Out
          </span>
        )}
        {!isLowStock && !isOutOfStock && product.is_limited_edition && (
          <span className="absolute top-2 left-2 text-[7px] font-semibold uppercase tracking-wider bg-neutral-900/80 text-white px-1.5 py-[2px] rounded">
            Limited
          </span>
        )}

        {/* Wishlist — appears on hover */}
        <button
          onClick={handleAddToWishlist}
          className="absolute top-2 right-2 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          data-testid={`wishlist-btn-${product.product_id}`}
        >
          <Heart className="h-3 w-3 text-neutral-600" />
        </button>

        {/* Bottom-right: small Blinkit-style add / qty controller */}
        {!isOutOfStock && (
          <div className="absolute bottom-2 right-2" onClick={e => e.preventDefault()}>
            <AnimatePresence mode="wait">
              {cartQty > 0 ? (
                <motion.div
                  key="qty"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center bg-white rounded-full shadow-md border border-neutral-100 overflow-hidden"
                  data-testid={`qty-controller-${product.product_id}`}
                >
                  <button
                    onClick={handleDecrease}
                    className="w-7 h-7 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors active:scale-90"
                    data-testid={`qty-decrease-${product.product_id}`}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <motion.span
                    key={cartQty}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-[11px] font-bold text-neutral-900 min-w-[18px] text-center"
                    data-testid={`qty-value-${product.product_id}`}
                  >
                    {cartQty}
                  </motion.span>
                  <button
                    onClick={handleIncrease}
                    className="w-7 h-7 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors active:scale-90"
                    data-testid={`qty-increase-${product.product_id}`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="add"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={handleQuickAdd}
                  disabled={adding}
                  className="w-8 h-8 bg-white rounded-full shadow-md border border-neutral-100 flex items-center justify-center hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all duration-150 active:scale-90 disabled:opacity-40"
                  data-testid={`quick-add-${product.product_id}`}
                >
                  {justAdded ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : adding ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-neutral-400" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Product info below image */}
      <div className="pt-2.5 pb-1 space-y-0.5">
        <h3 className="text-[12px] sm:text-[13px] leading-snug text-neutral-900 line-clamp-2" style={{ fontWeight: 450 }}>
          {product.name}
        </h3>

        {product.category && (
          <p className="text-[8px] text-neutral-400 uppercase tracking-[0.15em]">
            {product.category}
          </p>
        )}

        {product.average_rating > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex gap-px">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`h-2.5 w-2.5 ${s <= Math.round(product.average_rating) ? "fill-neutral-800 text-neutral-800" : "fill-none text-neutral-200"}`} />
              ))}
            </div>
            <span className="text-[8px] text-neutral-400">({product.review_count || 0})</span>
          </div>
        )}

        {/* Price row */}
        <div className="flex items-baseline gap-1.5 pt-0.5">
          <span className="text-[13px] sm:text-sm font-semibold text-neutral-900">
            Rs.{product.price.toLocaleString()}
          </span>
          {product.compare_price && (
            <span className="text-[10px] text-neutral-400 line-through">
              Rs.{product.compare_price.toLocaleString()}
            </span>
          )}
          {discount > 0 && (
            <span className="text-[9px] font-medium text-emerald-600">
              {discount}% off
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
