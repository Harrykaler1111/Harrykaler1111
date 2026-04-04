import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trash2, Plus, Minus, ArrowRight, Tag, ShoppingBag,
  Gift, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import axios from "axios";
import { normalizeImageUrl, handleImageError, FALLBACK_IMAGE } from "@/utils/imageUtils";

// ============== MAIN CART PAGE ==============
export const CartPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { cartTotal, getActiveSlab, refreshCart } = useCart();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const localTotal = cart?.total || 0;
  const { active: activeSlab } = getActiveSlab(localTotal);
  const slabDiscount = activeSlab?.reward_type === "fixed" ? activeSlab.reward_value
    : activeSlab?.reward_type === "percentage" ? Math.round(localTotal * activeSlab.reward_value / 100)
    : 0;
  const totalDiscount = slabDiscount + couponDiscount;
  const shipping = localTotal >= 2999 ? 0 : 199;
  const finalTotal = Math.max(localTotal - totalDiscount + shipping, 0);

  const fetchCart = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/cart`, { headers: { Authorization: `Bearer ${token}` } });
      setCart(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchCart(); }, [token]);

  const updateQuantity = async (item, newQty) => {
    if (newQty < 1) return;
    try {
      await axios.put(`${API}/cart/update`, { ...item, quantity: newQty }, { headers: { Authorization: `Bearer ${token}` } });
      fetchCart();
      refreshCart();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const removeItem = async (item) => {
    try {
      await axios.delete(`${API}/cart/item/${item.product_id}?size=${item.size}&color=${item.color}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Item removed");
      fetchCart();
      refreshCart();
    } catch { toast.error("Failed to remove item"); }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await axios.post(`${API}/coupons/validate?code=${couponCode}&subtotal=${localTotal}`);
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
            {/* Left Column - Cart Items */}
            <div className="lg:col-span-2 space-y-6">
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
                        <img src={normalizeImageUrl(item.product?.images?.[0]) || FALLBACK_IMAGE} alt={item.product?.name}
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
                    <span className="font-medium">Rs.{localTotal.toLocaleString()}</span>
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
    </div>
  );
};
