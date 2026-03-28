import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Star, Plus, Minus, Check, ShoppingBag } from "lucide-react";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import axios from "axios";

export const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { cart, addToCart, updateCartItem, removeFromCart } = useCart();
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Find this product in cart
  const cartItem = cart?.items?.find(i => i.product_id === product.product_id);
  const cartQty = cartItem?.quantity || 0;

  const handleQuickAdd = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error("Please sign in first"); navigate("/auth"); return; }
    if (product.stock <= 0) return;

    setAdding(true);
    const defaultSize = product.sizes?.[0] || "M";
    const defaultColor = product.colors?.[0] || "Default";
    const ok = await addToCart(product.product_id, 1, defaultSize, defaultColor);
    if (ok) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1200);
    }
    setAdding(false);
  }, [user, product, addToCart, navigate]);

  const handleIncrease = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) return;
    if (cartQty >= product.stock) { toast.error("Max stock reached"); return; }
    await updateCartItem(product.product_id, cartQty + 1, cartItem.size, cartItem.color);
  }, [cartItem, cartQty, product, updateCartItem]);

  const handleDecrease = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) return;
    if (cartQty <= 1) {
      await removeFromCart(product.product_id, cartItem.size, cartItem.color);
    } else {
      await updateCartItem(product.product_id, cartQty - 1, cartItem.size, cartItem.color);
    }
  }, [cartItem, cartQty, product, updateCartItem, removeFromCart]);

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

  return (
    <Link
      to={`/product/${product.product_id}`}
      className="group block product-card-hover"
      data-testid={`product-card-${product.product_id}`}
    >
      <div className={`relative aspect-[4/5] overflow-hidden rounded-lg bg-neutral-100 ${isOutOfStock ? "opacity-60" : ""}`}>
        <img
          src={product.images?.[0] || "https://via.placeholder.com/400x600"}
          alt={product.name}
          className="w-full h-full object-cover product-image"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_limited_edition && (
            <span className="font-mono text-[9px] uppercase tracking-widest bg-gold text-black px-2 py-0.5">Limited</span>
          )}
          {discount > 0 && (
            <span className="font-mono text-[9px] uppercase tracking-widest bg-black text-white px-2 py-0.5">-{discount}%</span>
          )}
          {product.stock > 0 && product.stock < 10 && (
            <span className="font-mono text-[9px] uppercase tracking-widest bg-red-500 text-white px-2 py-0.5">Low Stock</span>
          )}
          {isOutOfStock && (
            <span className="font-mono text-[9px] uppercase tracking-widest bg-neutral-700 text-white px-2 py-0.5">Out of Stock</span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={handleAddToWishlist}
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gold hover:text-black"
          data-testid={`wishlist-btn-${product.product_id}`}
        >
          <Heart className="h-3.5 w-3.5" />
        </button>

        {/* Quick Add Button - Always visible at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 p-2" onClick={e => e.preventDefault()}>
          <AnimatePresence mode="wait">
            {isOutOfStock ? (
              <motion.div
                key="oos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-neutral-400 text-white text-center py-2 rounded-md text-[11px] font-bold uppercase tracking-wider"
              >
                Out of Stock
              </motion.div>
            ) : cartQty > 0 ? (
              <motion.div
                key="qty"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center justify-between bg-black rounded-md overflow-hidden shadow-lg"
                data-testid={`qty-controller-${product.product_id}`}
              >
                <button
                  onClick={handleDecrease}
                  className="w-10 h-9 flex items-center justify-center text-white hover:bg-neutral-700 transition-colors active:scale-90"
                  data-testid={`qty-decrease-${product.product_id}`}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <motion.span
                  key={cartQty}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="text-gold font-bold text-sm min-w-[28px] text-center"
                  data-testid={`qty-value-${product.product_id}`}
                >
                  {cartQty}
                </motion.span>
                <button
                  onClick={handleIncrease}
                  className="w-10 h-9 flex items-center justify-center text-white hover:bg-neutral-700 transition-colors active:scale-90"
                  data-testid={`qty-increase-${product.product_id}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="add"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                onClick={handleQuickAdd}
                disabled={adding}
                className="w-full bg-black/90 backdrop-blur-sm text-white py-2 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-gold hover:text-black transition-all active:scale-95 disabled:opacity-50"
                data-testid={`quick-add-${product.product_id}`}
              >
                {justAdded ? (
                  <><Check className="h-3.5 w-3.5" /> Added</>
                ) : adding ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white" />
                ) : (
                  <><Plus className="h-3.5 w-3.5" /> Add</>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="pt-2 space-y-1">
        <h3 className="font-medium text-[13px] leading-tight truncate group-hover:text-gold transition-colors">
          {product.name}
        </h3>
        <p className="text-[9px] text-neutral-500 uppercase tracking-wider">
          {product.category}
        </p>
        {product.average_rating > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`h-2.5 w-2.5 ${s <= Math.round(product.average_rating) ? "fill-gold text-gold" : "fill-none text-neutral-300"}`} />
              ))}
            </div>
            <span className="text-[9px] text-neutral-400">({product.review_count || 0})</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-sm">Rs.{product.price.toLocaleString()}</span>
          {product.compare_price && (
            <span className="text-[10px] text-neutral-400 line-through">Rs.{product.compare_price.toLocaleString()}</span>
          )}
          {discount > 0 && (
            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded">{discount}% OFF</span>
          )}
        </div>
      </div>
    </Link>
  );
};
