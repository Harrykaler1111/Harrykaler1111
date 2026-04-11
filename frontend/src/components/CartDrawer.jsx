import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  X, Plus, Minus, Trash2, Tag, Gift, Sparkles,
  ArrowRight, ShoppingBag, ChevronUp, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { FrequentlyBoughtTogetherCompact } from "@/components/FrequentlyBoughtTogether";
import { toast } from "sonner";
import axios from "axios";
import { normalizeImageUrl, handleImageError, FALLBACK_IMAGE } from "@/utils/imageUtils";

// UPI / Payment brand strip (clean, subtle)
const PaymentBrandStrip = () => (
  <div className="flex items-center justify-center gap-3 py-1" data-testid="payment-brand-strip">
    {/* Visa */}
    <svg viewBox="0 0 48 16" className="h-3 w-auto opacity-40">
      <path d="M17.4 1.2L14.7 14.8h-3.1L14.3 1.2h3.1zm14.8 8.8l1.6-4.5.9 4.5h-2.5zm3.5 5.8h2.9L36.1 1.2h-2.6c-.6 0-1.1.3-1.3.8L27.7 15.8h3.2l.6-1.8h3.9l.3 1.8zm-8.5-4.5c0-3.6-5-3.8-5-5.4 0-.5.5-1 1.6-1.1.8-.1 2.3 0 2.9.4l.5-2.5c-.7-.3-1.6-.5-2.8-.5-3 0-5.1 1.6-5.1 3.8 0 1.7 1.5 2.6 2.6 3.1 1.1.6 1.5 1 1.5 1.5 0 .8-.9 1.2-1.7 1.2-1.5 0-2.3-.4-3-.7l-.5 2.5c.7.3 2 .6 3.3.6 3.2 0 5.3-1.6 5.3-3.9h-.6zM12 1.2L7.4 15.8H4.2L1.7 3.5c-.2-.7-.3-1-.8-1.2C.3 2.1-.1 1.7-.1 1.7L0 1.2h5.2c.7 0 1.3.5 1.4 1.2l1.3 6.8L11 1.2H12z" fill="#1A1F71"/>
    </svg>
    {/* Mastercard */}
    <svg viewBox="0 0 32 20" className="h-3.5 w-auto opacity-40">
      <circle cx="12" cy="10" r="7" fill="#EB001B"/>
      <circle cx="20" cy="10" r="7" fill="#F79E1B"/>
      <path d="M16 4.5c1.5 1.3 2.5 3.2 2.5 5.5s-1 4.2-2.5 5.5c-1.5-1.3-2.5-3.2-2.5-5.5s1-4.2 2.5-5.5z" fill="#FF5F00"/>
    </svg>
    {/* UPI text */}
    <span className="text-[9px] font-bold text-neutral-400 tracking-wider">UPI</span>
    {/* GPay */}
    <span className="text-[8px] font-semibold text-neutral-400">GPay</span>
    {/* PhonePe */}
    <span className="text-[8px] font-semibold text-neutral-400">PhonePe</span>
    {/* COD */}
    <span className="text-[8px] font-semibold text-neutral-400">COD</span>
  </div>
);

// "You May Also Like" product card
const RecommendedCard = ({ product, onAdd }) => (
  <motion.div
    whileHover={{ y: -2 }}
    className="min-w-[130px] max-w-[130px] bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100 flex-shrink-0 group"
    data-testid={`rec-product-${product.product_id}`}
  >
    <div className="aspect-square bg-neutral-100 overflow-hidden">
      <img
        src={normalizeImageUrl(product.images?.[0]) || FALLBACK_IMAGE}
        alt={product.name}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        onError={handleImageError}
      />
    </div>
    <div className="p-2">
      <p className="text-[10px] text-neutral-600 truncate">{product.name}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs font-bold">₹{product.price?.toLocaleString()}</span>
        <button
          onClick={() => onAdd(product)}
          className="bg-black text-white text-[8px] font-bold px-2 py-1 rounded-md hover:bg-gold hover:text-black transition-colors uppercase"
          data-testid={`rec-add-${product.product_id}`}
        >
          + Add
        </button>
      </div>
    </div>
  </motion.div>
);

// ============== MAIN CART DRAWER ==============
export const CartDrawer = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const {
    cartItems, cartTotal, cartCount, addToCart,
    updateQuantity: ctxUpdateQty, removeFromCart, fetchCart
  } = useCart();

  // Get the correct image for a cart item based on its selected color variant
  const getCartItemImage = (item) => {
    const product = item.product;
    if (!product) return FALLBACK_IMAGE;
    const images = (product.images || []).filter(Boolean);
    const colors = product.colors || [];
    if (item.color && colors.length > 1 && images.length > 1) {
      const colorIdx = colors.findIndex(c => c.toLowerCase() === item.color.toLowerCase());
      if (colorIdx >= 0 && colorIdx < images.length) {
        return normalizeImageUrl(images[colorIdx]) || FALLBACK_IMAGE;
      }
    }
    return normalizeImageUrl(images[0]) || FALLBACK_IMAGE;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [slabs, setSlabs] = useState([]);
  const scrollRef = useRef(null);

  // Cart open/close via custom event
  useEffect(() => {
    const openHandler = () => setIsOpen(true);
    window.addEventListener("open-cart", openHandler);
    return () => window.removeEventListener("open-cart", openHandler);
  }, []);

  const closeCart = () => setIsOpen(false);

  // Fetch slabs
  useEffect(() => {
    axios.get(`${API}/booster/config`).then(r => setSlabs(r.data?.slabs || [])).catch(() => {});
  }, []);

  const getActiveSlab = useCallback((total) => {
    const active = slabs.filter(s => s.is_enabled && total >= s.min_cart_value).sort((a, b) => b.min_cart_value - a.min_cart_value)[0] || null;
    const next = slabs.filter(s => s.is_enabled && total < s.min_cart_value).sort((a, b) => a.min_cart_value - b.min_cart_value)[0] || null;
    return { active, next };
  }, [slabs]);

  const total = cartTotal || 0;
  const { active: activeSlab } = getActiveSlab(total);
  const slabDiscount = activeSlab?.reward_type === "fixed" ? activeSlab.reward_value
    : activeSlab?.reward_type === "percentage" ? Math.round(total * activeSlab.reward_value / 100)
    : 0;
  const totalDiscount = slabDiscount + couponDiscount;
  const shipping = total >= 2999 ? 0 : 199;
  const finalTotal = Math.max(total - totalDiscount + shipping, 0);
  const savingsPercent = total > 0 ? Math.round((totalDiscount / total) * 100) : 0;

  // Fetch "You May Also Like" products
  useEffect(() => {
    if (!isOpen) return;
    setRecsLoading(true);
    axios.get(`${API}/cart/upsell-suggestions?max_price=5000`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(r => setRecommendations(r.data || []))
      .catch(() => {})
      .finally(() => setRecsLoading(false));
  }, [isOpen, token, cartCount]);

  const updateQuantity = async (item, newQty) => {
    if (newQty < 1) return;
    await ctxUpdateQty(item.product_id, newQty, item.size, item.color);
  };

  const removeItem = async (item) => {
    await removeFromCart(item.product_id, item.size, item.color);
  };

  const handleAddRecommended = async (product) => {
    const ok = await addToCart(product.product_id, 1, product.sizes?.[0] || "M", product.colors?.[0] || "Default", product);
    if (ok) toast.success(`${product.name} added!`);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await axios.post(`${API}/coupons/validate?code=${couponCode}&subtotal=${total}`);
      setAppliedCoupon(res.data.coupon);
      setCouponDiscount(res.data.discount);
      toast.success("Coupon applied!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid coupon");
      setAppliedCoupon(null);
      setCouponDiscount(0);
    }
  };

  const handleCheckout = () => {
    closeCart();
    navigate("/cart-page");
  };

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const items = cartItems || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000]"
            onClick={closeCart}
            data-testid="cart-drawer-backdrop"
          />

          {/* Center Modal Wrapper */}
          <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center pointer-events-none p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="w-full max-w-[420px] bg-white flex flex-col shadow-2xl rounded-3xl overflow-hidden pointer-events-auto"
              style={{ maxHeight: 'calc(100vh - 100px)' }}
              data-testid="cart-drawer"
            >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                <h2 className="font-serif text-lg font-bold" data-testid="cart-drawer-title">
                  Your Cart ({cartCount} item{cartCount !== 1 ? "s" : ""})
                </h2>
              </div>
              <button
                onClick={closeCart}
                className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors"
                data-testid="cart-drawer-close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0" ref={scrollRef}>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                  <ShoppingBag className="h-14 w-14 text-neutral-200 mb-4" />
                  <p className="font-serif text-xl font-bold mb-2">Your cart is empty</p>
                  <p className="text-neutral-400 text-sm mb-6">Add items to get started</p>
                  <Button onClick={() => { closeCart(); navigate("/products"); }}
                    className="bg-black text-white hover:bg-neutral-800 rounded-full px-8"
                    data-testid="empty-cart-shop-btn">
                    Start Shopping <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="px-4 py-3 space-y-3">
                    {items.map((item, i) => (
                      <motion.div
                        key={`${item.product_id}-${item.size}-${item.color}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex gap-3 pb-3 border-b border-neutral-50 last:border-0"
                        data-testid={`drawer-item-${item.product_id}`}
                      >
                        {/* Thumbnail — show variant image matching selected color */}
                        <Link to={`/product/${item.product_id}`} onClick={closeCart}
                          className="w-16 h-20 flex-shrink-0 bg-neutral-50 rounded-lg overflow-hidden">
                          <img src={getCartItemImage(item)}
                            alt={item.product?.name}
                            className="w-full h-full object-cover"
                            onError={handleImageError} />
                        </Link>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <Link to={`/product/${item.product_id}`} onClick={closeCart}
                            className="text-sm font-medium hover:text-gold transition-colors line-clamp-1 block">
                            {item.product?.name || "Product"}
                          </Link>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            {item.size} | {item.color}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-bold">
                              ₹{(item.price_override || item.product?.price || 0).toLocaleString()}
                            </span>
                            {/* Qty Controls */}
                            <div className="flex items-center gap-0 border border-neutral-200 rounded-lg overflow-hidden">
                              <button onClick={() => updateQuantity(item, item.quantity - 1)}
                                className="w-7 h-7 flex items-center justify-center hover:bg-neutral-50 transition-colors"
                                data-testid={`drawer-qty-minus-${item.product_id}`}>
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-7 h-7 flex items-center justify-center text-xs font-semibold border-x border-neutral-200 bg-neutral-50">
                                {item.quantity}
                              </span>
                              <button onClick={() => updateQuantity(item, item.quantity + 1)}
                                className="w-7 h-7 flex items-center justify-center hover:bg-neutral-50 transition-colors"
                                data-testid={`drawer-qty-plus-${item.product_id}`}>
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <button onClick={() => removeItem(item)}
                              className="text-neutral-300 hover:text-red-500 transition-colors p-1"
                              data-testid={`drawer-remove-${item.product_id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Estimated Total (collapsible bill) */}
                  <div className="px-4 pt-3 pb-2">
                    <button
                      onClick={() => setShowBillDetails(!showBillDetails)}
                      className="w-full flex items-center justify-between py-2"
                      data-testid="toggle-bill-details"
                    >
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-neutral-500" />
                        <span className="font-semibold text-base">Estimated Total</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {totalDiscount > 0 && (
                          <span className="text-xs text-neutral-400 line-through">₹{total.toLocaleString()}</span>
                        )}
                        <span className="font-bold text-lg">₹{finalTotal.toLocaleString()}</span>
                        {savingsPercent > 0 && (
                          <span className="text-xs text-emerald-600 font-bold">({savingsPercent}% OFF)</span>
                        )}
                        {showBillDetails ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
                      </div>
                    </button>

                    {/* Detailed Bill Breakdown */}
                    <AnimatePresence>
                      {showBillDetails && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-neutral-50 rounded-xl p-4 space-y-2.5 mb-3" data-testid="bill-breakdown">
                            <h4 className="font-semibold text-sm mb-3 flex items-center justify-between">
                              Order Summary
                              {totalDiscount > 0 && (
                                <span className="text-emerald-600 text-xs font-bold">₹{totalDiscount.toLocaleString()} saved so far</span>
                              )}
                            </h4>

                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-500">Subtotal</span>
                              <span>₹{total.toLocaleString()}</span>
                            </div>

                            {slabDiscount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-emerald-600 flex items-center gap-1">
                                  <Gift className="h-3 w-3" /> Cart Booster
                                </span>
                                <span className="text-emerald-600 font-medium">-₹{slabDiscount.toLocaleString()}</span>
                              </div>
                            )}

                            {couponDiscount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-emerald-600 flex items-center gap-1">
                                  <Tag className="h-3 w-3" /> Coupon ({appliedCoupon?.code})
                                </span>
                                <span className="text-emerald-600 font-medium">-₹{couponDiscount.toLocaleString()}</span>
                              </div>
                            )}

                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-500">Cart Subtotal</span>
                              <span>₹{Math.max(total - totalDiscount, 0).toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-neutral-500">Shipping Charges</span>
                              <span className={shipping === 0 ? "text-emerald-600 font-medium" : ""}>
                                {shipping === 0 ? "FREE" : `₹${shipping}`}
                              </span>
                            </div>

                            {totalDiscount > 0 && (
                              <div className="flex justify-between text-sm pt-1 border-t border-neutral-200">
                                <span className="text-emerald-600 font-medium">Total Savings</span>
                                <span className="text-emerald-600 font-bold">₹{totalDiscount.toLocaleString()}</span>
                              </div>
                            )}

                            <div className="flex justify-between text-base font-bold pt-2 border-t border-neutral-200">
                              <span>Estimated Total</span>
                              <span>₹{finalTotal.toLocaleString()}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* You May Also Like */}
                  {recommendations.length > 0 && (
                    <div className="px-4 pb-3" data-testid="you-may-also-like">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                        You May Also Like
                      </h3>
                      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                        {recommendations.slice(0, 6).map(p => (
                          <RecommendedCard key={p.product_id} product={p} onAdd={handleAddRecommended} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Frequently Bought Together (Compact) */}
                  <FrequentlyBoughtTogetherCompact cartItems={items} />

                  {/* Coupon Code — after recommendations */}
                  <div className="px-4 py-3 border-t border-neutral-100">
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter Coupon Code"
                        className="text-xs uppercase h-9 rounded-lg"
                        data-testid="drawer-coupon-input"
                      />
                      <Button onClick={applyCoupon} size="sm"
                        className="bg-black text-white text-xs h-9 px-4 rounded-lg hover:bg-neutral-800"
                        data-testid="drawer-apply-coupon">
                        Apply
                      </Button>
                    </div>
                    {appliedCoupon && (
                      <p className="text-[10px] text-green-600 mt-1.5 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> {appliedCoupon.code} applied! -₹{couponDiscount.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Savings Bar */}
                  {totalDiscount > 0 && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      className="mx-4 mb-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg px-4 py-2 origin-left"
                      data-testid="savings-bar"
                    >
                      <p className="text-white text-sm font-bold text-center">
                        ₹{totalDiscount.toLocaleString()} Saved so far!
                      </p>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* Sticky Footer - Checkout */}
            {items.length > 0 && (
              <div className="border-t border-neutral-100 bg-white px-4 pt-3 shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }} data-testid="cart-drawer-footer">
                {/* Checkout Button — clean, bold, no clutter */}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-black hover:bg-neutral-900 text-white font-bold py-6 rounded-2xl text-base relative overflow-hidden group shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                    data-testid="drawer-checkout-btn"
                  >
                    {/* Shimmer sweep */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      <span className="tracking-wider">CHECKOUT</span>
                      <span className="text-neutral-400">|</span>
                      <span className="font-black">₹{finalTotal.toLocaleString()}</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </motion.div>

                {/* Payment brands strip */}
                <PaymentBrandStrip />
              </div>
            )}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
