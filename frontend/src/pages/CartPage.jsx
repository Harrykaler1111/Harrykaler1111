import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Plus, Minus, ArrowRight, Tag, ShoppingBag,
  Zap, Gift, Sparkles, ChevronRight, Star, X, ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

// ============== DISCOUNT SLAB CONFIG ==============
const SLABS = [
  { threshold: 1200, discount: 100, label: "100 OFF" },
  { threshold: 3330, discount: 200, label: "200 OFF" },
];

const getActiveSlab = (total) => {
  let active = null;
  let next = null;
  for (let i = SLABS.length - 1; i >= 0; i--) {
    if (total >= SLABS[i].threshold) { active = SLABS[i]; next = SLABS[i + 1] || null; break; }
  }
  if (!active) next = SLABS[0];
  return { active, next };
};

const getProgress = (total) => {
  if (total >= SLABS[SLABS.length - 1].threshold) return 100;
  if (total <= 0) return 0;
  const maxThreshold = SLABS[SLABS.length - 1].threshold;
  return Math.min((total / maxThreshold) * 100, 100);
};

// ============== CONFETTI COMPONENT ==============
const Confetti = ({ show }) => {
  if (!show) return null;
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: ["#C9A050", "#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#fff"][Math.floor(Math.random() * 6)],
    size: 4 + Math.random() * 6,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]" data-testid="confetti">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: -20, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ y: "110vh", opacity: 0, rotate: 720, scale: 0.5 }}
          transition={{ duration: 2 + Math.random(), delay: p.delay, ease: "easeOut" }}
          className="absolute rounded-sm"
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
        />
      ))}
    </div>
  );
};

// ============== PROGRESS BAR ==============
const CartProgressBar = ({ total, prevTotal }) => {
  const progress = getProgress(total);
  const { active, next } = getActiveSlab(total);

  return (
    <div className="bg-black rounded-2xl p-5 md:p-6" data-testid="cart-progress-bar">
      {/* Slab milestones */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-gold" />
          <span className="text-xs font-mono uppercase tracking-wider text-gold">Cart Value Booster</span>
        </div>
        <span className="text-xs text-neutral-400">Rs.{total.toLocaleString()}</span>
      </div>

      {/* Progress track */}
      <div className="relative h-3 bg-neutral-800 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold/80 to-gold rounded-full"
          initial={{ width: `${getProgress(prevTotal)}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        {/* Milestone markers */}
        {SLABS.map((slab) => {
          const pos = (slab.threshold / SLABS[SLABS.length - 1].threshold) * 100;
          const unlocked = total >= slab.threshold;
          return (
            <div
              key={slab.threshold}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${pos}%` }}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                unlocked ? "bg-gold border-gold scale-110" : "bg-neutral-700 border-neutral-600"
              }`}>
                {unlocked && <Sparkles className="h-2.5 w-2.5 text-black" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Labels under milestones */}
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-neutral-500">Rs.0</span>
        {SLABS.map((slab) => (
          <span key={slab.threshold} className={`text-[10px] font-medium ${total >= slab.threshold ? "text-gold" : "text-neutral-500"}`}>
            Rs.{slab.threshold.toLocaleString()} = Rs.{slab.discount} OFF
          </span>
        ))}
      </div>

      {/* Message */}
      <div className="mt-4">
        {active ? (
          <div className="space-y-1">
            <motion.p
              key={`active-${active.threshold}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-400 font-semibold text-sm flex items-center gap-1"
              data-testid="slab-active-msg"
            >
              <Gift className="h-4 w-4" /> You unlocked Rs.{active.discount} OFF!
            </motion.p>
            {next && (
              <p className="text-neutral-400 text-xs" data-testid="slab-next-msg">
                Add Rs.{(next.threshold - total).toLocaleString()} more to unlock Rs.{next.discount} OFF
              </p>
            )}
          </div>
        ) : next ? (
          <motion.p
            key={`next-${next.threshold}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-neutral-300 text-sm"
            data-testid="slab-next-msg"
          >
            Add <span className="text-gold font-bold">Rs.{(next.threshold - total).toLocaleString()}</span> more to get <span className="text-gold font-bold">Rs.{next.discount} OFF</span>
          </motion.p>
        ) : null}

        {/* Urgency text */}
        {next && (next.threshold - total) <= 500 && (next.threshold - total) > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xs text-yellow-400 mt-1 font-medium"
            data-testid="urgency-text"
          >
            Almost there! Don't miss your discount
          </motion.p>
        )}
      </div>
    </div>
  );
};

// ============== UPSELL SUGGESTIONS ==============
const UpsellSuggestions = ({ total, token, onAddToCart }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const { next } = getActiveSlab(total);

  useEffect(() => {
    if (!next || !token) { setLoading(false); return; }
    const remaining = next.threshold - total;
    if (remaining <= 0 || remaining > 500) { setLoading(false); return; }
    const maxPrice = Math.min(remaining + 100, 500);
    axios.get(`${API}/cart/upsell-suggestions?max_price=${maxPrice}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => setProducts(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [total, token, next]);

  if (!next || (next.threshold - total) > 500 || (next.threshold - total) <= 0 || products.length === 0) return null;

  const remaining = next.threshold - total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black rounded-2xl p-5 md:p-6"
      data-testid="upsell-section"
    >
      <div className="flex items-center gap-2 mb-3">
        <Star className="h-4 w-4 text-gold" />
        <span className="text-sm font-semibold text-white">Add Rs.{remaining.toLocaleString()} more to unlock Rs.{next.discount} OFF</span>
      </div>
      <p className="text-xs text-neutral-400 mb-4">Quick picks to boost your cart</p>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {products.map((p) => (
          <motion.div
            key={p.product_id}
            whileHover={{ scale: 1.03 }}
            className="min-w-[140px] max-w-[140px] bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 flex-shrink-0 group"
            data-testid={`upsell-product-${p.product_id}`}
          >
            <div className="aspect-square bg-neutral-800 overflow-hidden">
              <img
                src={p.images?.[0] || "https://via.placeholder.com/200"}
                alt={p.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="p-2.5">
              <p className="text-xs text-white font-medium truncate">{p.name}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-gold text-sm font-bold">Rs.{p.price?.toLocaleString()}</span>
                <button
                  onClick={() => onAddToCart(p)}
                  className="bg-gold text-black text-[10px] font-bold px-2 py-1 rounded-md hover:bg-gold/80 transition-colors"
                  data-testid={`upsell-add-${p.product_id}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ============== FLOATING MINI CART (Mobile) ==============
const FloatingMiniCart = ({ total, itemCount }) => {
  const { active, next } = getActiveSlab(total);
  const progress = getProgress(total);

  if (itemCount === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-black border-t border-neutral-800 px-4 py-3 safe-area-bottom"
      data-testid="floating-mini-cart"
    >
      {/* Progress bar */}
      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full bg-gold rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm">Rs.{total.toLocaleString()}</p>
          {active ? (
            <p className="text-green-400 text-[10px] font-medium">Rs.{active.discount} OFF unlocked!</p>
          ) : next ? (
            <p className="text-gold text-[10px]">Rs.{(next.threshold - total).toLocaleString()} more for Rs.{next.discount} OFF</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-neutral-400 text-xs">{itemCount} items</span>
          <ShoppingCart className="h-4 w-4 text-gold" />
        </div>
      </div>
    </motion.div>
  );
};

// ============== MAIN CART PAGE ==============
export const CartPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [prevTotal, setPrevTotal] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [prevSlab, setPrevSlab] = useState(null);

  const cartTotal = cart?.total || 0;
  const { active: activeSlab } = getActiveSlab(cartTotal);
  const slabDiscount = activeSlab?.discount || 0;
  const totalDiscount = slabDiscount + couponDiscount;
  const shipping = cartTotal >= 2999 ? 0 : 199;
  const finalTotal = Math.max(cartTotal - totalDiscount + shipping, 0);

  const fetchCart = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/cart`, { headers: { Authorization: `Bearer ${token}` } });
      setPrevTotal(cart?.total || 0);
      setCart(res.data);

      // Check if new slab unlocked
      const newSlab = getActiveSlab(res.data.total || 0).active;
      if (newSlab && (!prevSlab || newSlab.threshold > prevSlab.threshold)) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      setPrevSlab(newSlab);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchCart(); }, [token]);

  const updateQuantity = async (item, newQty) => {
    if (newQty < 1) return;
    try {
      await axios.put(`${API}/cart/update`, { ...item, quantity: newQty }, { headers: { Authorization: `Bearer ${token}` } });
      fetchCart();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const removeItem = async (item) => {
    try {
      await axios.delete(`${API}/cart/item/${item.product_id}?size=${item.size}&color=${item.color}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Item removed");
      fetchCart();
    } catch { toast.error("Failed to remove item"); }
  };

  const addUpsellToCart = async (product) => {
    try {
      await axios.post(`${API}/cart/add`, {
        product_id: product.product_id,
        quantity: 1,
        size: product.sizes?.[0] || "M",
        color: product.colors?.[0] || "Default"
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`${product.name} added!`);
      fetchCart();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to add"); }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await axios.post(`${API}/coupons/validate?code=${couponCode}&subtotal=${cartTotal}`);
      setAppliedCoupon(res.data.coupon);
      setCouponDiscount(res.data.discount);
      toast.success("Coupon applied!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid coupon");
      setAppliedCoupon(null);
      setCouponDiscount(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold" />
      </div>
    );
  }

  const isEmpty = !cart?.items?.length;

  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-neutral-50 pb-24 lg:pb-8" data-testid="cart-page">
      <Confetti show={showConfetti} />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-serif text-3xl md:text-4xl font-bold mb-8"
        >
          Shopping Cart
        </motion.h1>

        {isEmpty ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <ShoppingBag className="h-16 w-16 mx-auto text-neutral-300 mb-6" />
            <h2 className="font-serif text-2xl font-bold mb-4">Your cart is empty</h2>
            <p className="text-neutral-500 mb-8">Looks like you haven't added any items yet</p>
            <Button onClick={() => navigate("/products")} className="bg-black text-white hover:bg-neutral-800 uppercase tracking-widest px-8 py-6" data-testid="continue-shopping-btn">
              Continue Shopping <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Left Column - Cart Items + Booster */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cart Value Booster */}
              <CartProgressBar total={cartTotal} prevTotal={prevTotal} />

              {/* Upsell Suggestions */}
              <UpsellSuggestions total={cartTotal} token={token} onAddToCart={addUpsellToCart} />

              {/* Cart Items */}
              <div className="space-y-3">
                <p className="text-xs font-mono uppercase tracking-wider text-neutral-400">{cart.items.length} item{cart.items.length !== 1 ? "s" : ""} in cart</p>
                {cart.items.map((item, index) => (
                  <motion.div
                    key={`${item.product_id}-${item.size}-${item.color}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl p-4 md:p-5 flex gap-4 md:gap-6 shadow-sm hover:shadow-md transition-shadow"
                    data-testid={`cart-item-${item.product_id}`}
                  >
                    <Link to={`/product/${item.product_id}`} className="w-20 md:w-28 flex-shrink-0">
                      <div className="aspect-[3/4] bg-neutral-100 rounded-lg overflow-hidden">
                        <img src={item.product?.images?.[0] || "https://via.placeholder.com/200x300"} alt={item.product?.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      </div>
                    </Link>

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <Link to={`/product/${item.product_id}`} className="font-medium text-sm md:text-base hover:text-gold transition-colors line-clamp-1">
                          {item.product?.name || "Product"}
                        </Link>
                        <p className="text-xs text-neutral-500 mt-0.5">Size: {item.size} | Color: {item.color}</p>
                        <p className="font-bold text-lg mt-1">Rs.{(item.product?.price || 0).toLocaleString()}</p>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center bg-neutral-100 rounded-lg overflow-hidden">
                          <button onClick={() => updateQuantity(item, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-neutral-200 transition-colors" data-testid={`decrease-qty-${item.product_id}`}>
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-neutral-200 transition-colors" data-testid={`increase-qty-${item.product_id}`}>
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-neutral-700">Rs.{((item.product?.price || 0) * item.quantity).toLocaleString()}</span>
                          <button onClick={() => removeItem(item)} className="text-neutral-400 hover:text-red-500 transition-colors p-1" data-testid={`remove-item-${item.product_id}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 sticky top-28 shadow-sm">
                <h2 className="font-serif text-xl font-bold mb-6">Order Summary</h2>

                {/* Coupon */}
                <div className="mb-6">
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">Discount Code</label>
                  <div className="flex gap-2">
                    <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter code" className="uppercase text-sm" data-testid="coupon-input" />
                    <Button onClick={applyCoupon} variant="outline" className="flex-shrink-0" data-testid="apply-coupon-btn">
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                  {appliedCoupon && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> {appliedCoupon.code} applied! -Rs.{couponDiscount.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-3 pb-5 border-b border-neutral-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Subtotal</span>
                    <span className="font-medium">Rs.{cartTotal.toLocaleString()}</span>
                  </div>

                  {/* Slab discount */}
                  {slabDiscount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-green-600 flex items-center gap-1"><Gift className="h-3 w-3" /> Cart Booster</span>
                      <span className="text-green-600 font-medium" data-testid="slab-discount">-Rs.{slabDiscount.toLocaleString()}</span>
                    </motion.div>
                  )}

                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 flex items-center gap-1"><Tag className="h-3 w-3" /> Coupon</span>
                      <span className="text-green-600 font-medium">-Rs.{couponDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Shipping</span>
                    <span className={shipping === 0 ? "text-green-600 font-medium" : ""}>
                      {shipping === 0 ? "Free" : `Rs.${shipping}`}
                    </span>
                  </div>
                </div>

                {/* Total Savings Banner */}
                {totalDiscount > 0 && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-green-50 border border-green-200 rounded-lg p-3 my-4 text-center"
                    data-testid="savings-banner"
                  >
                    <p className="text-green-700 text-sm font-semibold">
                      You're saving Rs.{totalDiscount.toLocaleString()} on this order!
                    </p>
                  </motion.div>
                )}

                <div className="flex justify-between py-5 text-lg font-bold">
                  <span>Total</span>
                  <span data-testid="cart-total">Rs.{finalTotal.toLocaleString()}</span>
                </div>

                <Button
                  onClick={() => navigate("/checkout", { state: { coupon: appliedCoupon?.code, discount: totalDiscount, slabDiscount } })}
                  className="w-full bg-black text-white hover:bg-neutral-800 py-6 text-base font-semibold rounded-xl group"
                  data-testid="checkout-btn"
                >
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="text-[10px] text-neutral-400 text-center mt-4">
                  Free shipping on orders over Rs.2,999
                </p>

                <Button onClick={() => navigate("/products")} variant="ghost" className="w-full mt-2 text-neutral-500 hover:text-gold text-sm">
                  Continue Shopping
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Mini Cart - Mobile */}
      {!isEmpty && <FloatingMiniCart total={cartTotal} itemCount={cart?.items?.length || 0} />}
    </div>
  );
};
