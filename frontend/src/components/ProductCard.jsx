import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Star, Plus, Minus, Check, ShoppingBag } from "lucide-react";
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
      {/* Clean image — no overlapping elements */}
      <div className={`relative aspect-[4/5] overflow-hidden bg-neutral-50 ${isOutOfStock ? "opacity-50" : ""}`}>
        <img
          src={normalizeImageUrl(product.images?.[0]) || FALLBACK_IMAGE}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          loading="lazy"
          onError={handleImageError}
        />

        {/* Minimal top-left badge — only one, subtle */}
        {isLowStock && (
          <span
            className="absolute top-2.5 left-2.5 text-[8px] font-medium uppercase tracking-[0.12em] bg-white/90 backdrop-blur-sm text-neutral-700 px-2 py-0.5 rounded-sm"
            data-testid={`low-stock-badge-${product.product_id}`}
          >
            Low Stock
          </span>
        )}
        {isOutOfStock && (
          <span className="absolute top-2.5 left-2.5 text-[8px] font-medium uppercase tracking-[0.12em] bg-white/90 backdrop-blur-sm text-neutral-500 px-2 py-0.5 rounded-sm">
            Sold Out
          </span>
        )}
        {!isLowStock && !isOutOfStock && product.is_limited_edition && (
          <span className="absolute top-2.5 left-2.5 text-[8px] font-medium uppercase tracking-[0.12em] bg-white/90 backdrop-blur-sm text-neutral-700 px-2 py-0.5 rounded-sm">
            Limited Edition
          </span>
        )}

        {/* Wishlist — appears on hover */}
        <button
          onClick={handleAddToWishlist}
          className="absolute top-2.5 right-2.5 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          data-testid={`wishlist-btn-${product.product_id}`}
        >
          <Heart className="h-3 w-3 text-neutral-600" />
        </button>
      </div>

      {/* Product info — clean hierarchy below image */}
      <div className="pt-3 pb-1 space-y-1">
        <h3
          className="text-[12px] sm:text-[13px] leading-tight text-neutral-900 line-clamp-2 tracking-wide"
          style={{ fontWeight: 400 }}
        >
          {product.name}
        </h3>

        {product.category && (
          <p className="text-[9px] text-neutral-400 uppercase tracking-[0.15em]">
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
            <span className="text-[9px] text-neutral-400">({product.review_count || 0})</span>
          </div>
        )}

        {/* Price row */}
        <div className="flex items-baseline gap-1.5 pt-0.5">
          <span className="text-[13px] sm:text-sm font-semibold text-neutral-900 tracking-wide">
            Rs.{product.price.toLocaleString()}
          </span>
          {product.compare_price && (
            <span className="text-[10px] text-neutral-400 line-through">
              Rs.{product.compare_price.toLocaleString()}
            </span>
          )}
          {discount > 0 && (
            <span className="text-[9px] font-medium text-emerald-600 tracking-wide">
              {discount}% off
            </span>
          )}
        </div>

        {/* Add to cart — below product info */}
        <div className="pt-1.5" onClick={e => e.preventDefault()}>
          <AnimatePresence mode="wait">
            {isOutOfStock ? (
              <motion.div
                key="oos"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] text-neutral-400 uppercase tracking-[0.1em] font-medium text-center py-1.5"
              >
                Notify Me
              </motion.div>
            ) : cartQty > 0 ? (
              <motion.div
                key="qty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between border border-neutral-200 rounded-sm overflow-hidden"
                data-testid={`qty-controller-${product.product_id}`}
              >
                <button
                  onClick={handleDecrease}
                  className="w-9 h-8 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 transition-colors active:scale-90"
                  data-testid={`qty-decrease-${product.product_id}`}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <motion.span
                  key={cartQty}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-xs font-semibold text-neutral-900 min-w-[24px] text-center"
                  data-testid={`qty-value-${product.product_id}`}
                >
                  {cartQty}
                </motion.span>
                <button
                  onClick={handleIncrease}
                  className="w-9 h-8 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 transition-colors active:scale-90"
                  data-testid={`qty-increase-${product.product_id}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="add"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleQuickAdd}
                disabled={adding}
                className="w-full border border-neutral-900 text-neutral-900 py-1.5 rounded-sm text-[10px] font-medium uppercase tracking-[0.12em] flex items-center justify-center gap-1 hover:bg-neutral-900 hover:text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
                data-testid={`quick-add-${product.product_id}`}
              >
                {justAdded ? (
                  <><Check className="h-3 w-3" /> Added</>
                ) : adding ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-t border-neutral-900" />
                ) : (
                  <>Add to Bag</>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Link>
  );
};
