import { useState, useEffect, useRef } from "react";
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

// UPI Logo SVGs
const PaytmLogo = () => (
  <div className="flex items-center justify-center w-8 h-8 bg-[#00BAF2] rounded-md" data-testid="upi-paytm">
    <span className="text-white text-[7px] font-black leading-none">Pay<br/>tm</span>
  </div>
);

const PhonePeLogo = () => (
  <div className="flex items-center justify-center w-8 h-8 bg-[#5F259F] rounded-md" data-testid="upi-phonepe">
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5v-4.34l-3.5 3.5-1.42-1.42L10.34 12l-4.26-3.24 1.42-1.42L11 10.84V6.5h2v11h-2z"/>
    </svg>
  </div>
);

const GPayLogo = () => (
  <div className="flex items-center justify-center w-8 h-8 bg-white border border-neutral-200 rounded-md" data-testid="upi-gpay">
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="#4285F4"/>
    </svg>
  </div>
);

const UPIBadge = () => (
  <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5">
    <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">UPI</span>
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
        src={product.images?.[0] || "https://via.placeholder.com/200"}
        alt={product.name}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
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
    cart, cartTotal, cartCount, refreshCart, addToCart,
    getActiveSlab, isCartOpen, closeCart
  } = useCart();

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const scrollRef = useRef(null);

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
    if (!isCartOpen || !token) return;
    setRecsLoading(true);
    axios.get(`${API}/cart/upsell-suggestions?max_price=5000`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => setRecommendations(r.data || []))
      .catch(() => {})
      .finally(() => setRecsLoading(false));
  }, [isCartOpen, token, cartCount]);

  const updateQuantity = async (item, newQty) => {
    if (newQty < 1) return;
    try {
      await axios.put(`${API}/cart/update`, { ...item, quantity: newQty }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      refreshCart();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const removeItem = async (item) => {
    try {
      await axios.delete(`${API}/cart/item/${item.product_id}?size=${item.size}&color=${item.color}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Removed");
      refreshCart();
    } catch { toast.error("Failed to remove"); }
  };

  const handleAddRecommended = async (product) => {
    const ok = await addToCart(product.product_id, 1, product.sizes?.[0] || "M", product.colors?.[0] || "Default");
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
    navigate("/checkout", { state: { coupon: appliedCoupon?.code, discount: totalDiscount, slabDiscount } });
  };

  // Lock body scroll when open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen]);

  const items = cart?.items || [];

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={closeCart}
            data-testid="cart-drawer-backdrop"
          />

          {/* Center Modal Wrapper */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="w-full max-w-[480px] bg-white flex flex-col shadow-2xl rounded-2xl overflow-hidden pointer-events-auto"
              style={{ maxHeight: 'calc(100vh - 32px)' }}
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
                        {/* Thumbnail */}
                        <Link to={`/product/${item.product_id}`} onClick={closeCart}
                          className="w-16 h-20 flex-shrink-0 bg-neutral-50 rounded-lg overflow-hidden">
                          <img src={item.product?.images?.[0] || "https://via.placeholder.com/100x120"}
                            alt={item.product?.name}
                            className="w-full h-full object-cover" />
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
                            <span className="text-sm font-bold">₹{(item.product?.price || 0).toLocaleString()}</span>
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

                  {/* Coupon Code */}
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
                      className="mx-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg px-4 py-2 origin-left"
                      data-testid="savings-bar"
                    >
                      <p className="text-white text-sm font-bold text-center">
                        ₹{totalDiscount.toLocaleString()} Saved so far!
                      </p>
                    </motion.div>
                  )}

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
                </>
              )}
            </div>

            {/* Sticky Footer - Checkout */}
            {items.length > 0 && (
              <div className="border-t border-neutral-100 bg-white px-4 py-3 space-y-2 shrink-0" data-testid="cart-drawer-footer">
                {/* Checkout Button */}
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-6 rounded-xl text-base relative overflow-hidden group"
                  data-testid="drawer-checkout-btn"
                >
                  <span className="flex items-center gap-2">
                    CHECKOUT
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  {/* UPI Logos */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <PaytmLogo />
                    <PhonePeLogo />
                    <GPayLogo />
                  </div>
                </Button>

                {/* Extra Discount on UPI */}
                <p className="text-center text-[10px] text-neutral-400" data-testid="upi-extra-discount">
                  Extra Discount On <span className="font-bold text-neutral-600">UPI</span> Payments
                </p>
              </div>
            )}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
