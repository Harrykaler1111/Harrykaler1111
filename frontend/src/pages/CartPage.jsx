import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trash2, Plus, Minus, ArrowRight, Tag, ShoppingBag,
  Gift, Sparkles, Shield, Truck, RotateCcw, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { CheckoutAuthModal } from "@/components/CheckoutAuthModal";
import { toast } from "sonner";
import axios from "axios";
import { normalizeImageUrl, handleImageError, FALLBACK_IMAGE } from "@/utils/imageUtils";
import { whatsappLink } from "@/components/WhatsAppButton";

export const CartPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { cartItems, cartTotal, updateQuantity: ctxUpdateQty, removeFromCart, fetchCart, addToCart } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [slabs, setSlabs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const localTotal = cartTotal || 0;
  const shipping = localTotal >= 2999 ? 0 : 199;

  useEffect(() => {
    axios.get(`${API}/booster/config`).then(r => setSlabs(r.data?.slabs || [])).catch(() => {});
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    axios.get(`${API}/cart/upsell-suggestions?max_price=5000`, { headers }).then(r => setRecommendations(r.data || [])).catch(() => {});
  }, [token]);

  const getActiveSlab = useCallback((total) => {
    const active = slabs.filter(s => s.is_enabled && total >= s.min_cart_value).sort((a, b) => b.min_cart_value - a.min_cart_value)[0] || null;
    const next = slabs.filter(s => s.is_enabled && total < s.min_cart_value).sort((a, b) => a.min_cart_value - b.min_cart_value)[0] || null;
    return { active, next };
  }, [slabs]);

  const { active: activeSlab, next: nextSlab } = getActiveSlab(localTotal);
  const slabDiscount = activeSlab?.reward_type === "fixed" ? activeSlab.reward_value
    : activeSlab?.reward_type === "percentage" ? Math.round(localTotal * activeSlab.reward_value / 100)
    : 0;
  const totalDiscount = slabDiscount + couponDiscount;
  const finalTotal = Math.max(localTotal - totalDiscount + shipping, 0);

  const handleUpdateQty = async (item, newQty) => {
    if (newQty < 1) return;
    await ctxUpdateQty(item.product_id, newQty, item.size, item.color);
  };

  const handleRemove = async (item) => {
    await removeFromCart(item.product_id, item.size, item.color);
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

  const handleCheckout = () => {
    if (!token) {
      setShowAuthModal(true);
    } else {
      navigate("/checkout", { state: { coupon: appliedCoupon?.code, discount: totalDiscount, slabDiscount } });
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setTimeout(() => {
      navigate("/checkout", { state: { coupon: appliedCoupon?.code, discount: totalDiscount, slabDiscount } });
    }, 500);
  };

  const isEmpty = !cartItems?.length;

  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-neutral-50 pb-24 lg:pb-8" data-testid="cart-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <motion.h1
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
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
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item, idx) => {
                const stock = item.product?.stock;
                const lowStock = stock && stock > 0 && stock <= 5;
                return (
                  <motion.div key={`${item.product_id}-${item.size}-${item.color}-${idx}`}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-xl p-4 md:p-5 shadow-sm flex gap-4"
                    data-testid={`cart-item-${item.product_id}`}>
                    <Link to={`/product/${item.product_id}`} className="shrink-0 w-20 h-24 md:w-24 md:h-28 bg-neutral-100 rounded-lg overflow-hidden">
                      <img src={normalizeImageUrl(item.product?.images?.[0]) || FALLBACK_IMAGE} alt={item.product?.name}
                        className="w-full h-full object-cover" onError={handleImageError} />
                    </Link>

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <Link to={`/product/${item.product_id}`} className="font-medium text-sm md:text-base hover:text-gold transition-colors line-clamp-1">
                          {item.product?.name || "Product"}
                        </Link>
                        <p className="text-xs text-neutral-500 mt-0.5">Size: {item.size} | Color: {item.color}</p>
                        <p className="font-bold text-lg mt-1">Rs.{(item.product?.price || 0).toLocaleString()}</p>
                        {lowStock && (
                          <div className="flex items-center gap-1 mt-1" data-testid={`low-stock-${item.product_id}`}>
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            <span className="text-[11px] font-semibold text-red-600">Only {stock} left in stock!</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center bg-neutral-100 rounded-lg overflow-hidden">
                          <button onClick={() => handleUpdateQty(item, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-neutral-200 transition-colors" data-testid={`decrease-qty-${item.product_id}`}>
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button onClick={() => handleUpdateQty(item, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-neutral-200 transition-colors" data-testid={`increase-qty-${item.product_id}`}>
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-neutral-700">Rs.{((item.product?.price || 0) * item.quantity).toLocaleString()}</span>
                          <button onClick={() => handleRemove(item)} className="text-neutral-400 hover:text-red-500 transition-colors p-1" data-testid={`remove-item-${item.product_id}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-3" data-testid="cart-trust-badges">
                {[
                  { icon: Shield, label: "COD Available", color: "text-green-600", bg: "bg-green-50" },
                  { icon: Truck, label: "Fast Delivery", color: "text-blue-600", bg: "bg-blue-50" },
                  { icon: RotateCcw, label: "Easy Returns", color: "text-amber-600", bg: "bg-amber-50" },
                ].map(({ icon: Icon, label, color, bg }) => (
                  <div key={label} className={`${bg} rounded-lg py-3 px-2 flex flex-col items-center gap-1.5 text-center`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className={`text-[10px] font-semibold ${color} uppercase tracking-wider`}>{label}</span>
                  </div>
                ))}
              </div>

              {/* You May Also Like */}
              {recommendations.length > 0 && (
                <div data-testid="cart-recommendations">
                  <h3 className="font-serif text-lg font-bold mb-3">You May Also Like</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {recommendations.slice(0, 6).map(p => {
                      const inCart = cartItems?.find(i => i.product_id === p.product_id);
                      const qty = inCart?.quantity || 0;

                      const handleQuickAdd = async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await addToCart(p.product_id, 1, p.sizes?.[0] || "Free Size", p.colors?.[0] || "Default", p);
                        toast.success(`${p.name} added to cart`);
                      };

                      const handleIncrease = async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (inCart && qty >= (p.stock || 99)) return;
                        await ctxUpdateQty(p.product_id, qty + 1, inCart?.size, inCart?.color);
                      };

                      const handleDecrease = async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (qty <= 1) {
                          await removeFromCart(p.product_id, inCart?.size, inCart?.color);
                        } else {
                          await ctxUpdateQty(p.product_id, qty - 1, inCart?.size, inCart?.color);
                        }
                      };

                      return (
                        <Link key={p.product_id} to={`/product/${p.product_id}`}
                          className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative"
                          data-testid={`rec-product-${p.product_id}`}>
                          <div className="aspect-square bg-neutral-100 overflow-hidden relative">
                            <img src={normalizeImageUrl(p.images?.[0]) || FALLBACK_IMAGE} alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={handleImageError} />
                          </div>
                          <div className="p-2.5 flex items-center justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-neutral-800 line-clamp-1">{p.name}</p>
                              <p className="text-sm font-bold mt-0.5">Rs.{(p.price || 0).toLocaleString()}</p>
                            </div>
                            {qty === 0 ? (
                              <button
                                onClick={handleQuickAdd}
                                className="shrink-0 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-gold hover:text-black transition-colors shadow-md"
                                data-testid={`quick-add-${p.product_id}`}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            ) : (
                              <div className="shrink-0 flex items-center bg-black rounded-full overflow-hidden shadow-md">
                                <button onClick={handleDecrease}
                                  className="w-7 h-7 flex items-center justify-center text-white hover:bg-neutral-700 transition-colors"
                                  data-testid={`rec-decrease-${p.product_id}`}>
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-white text-xs font-bold w-5 text-center">{qty}</span>
                                <button onClick={handleIncrease}
                                  className="w-7 h-7 flex items-center justify-center text-white hover:bg-neutral-700 transition-colors"
                                  data-testid={`rec-increase-${p.product_id}`}>
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* WhatsApp Help */}
              <a href={whatsappLink("Hi, I have a question about my cart")} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 text-xs text-neutral-400 hover:text-green-500 transition-colors rounded-lg border border-neutral-200 hover:border-green-300"
                data-testid="cart-whatsapp-help">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Need help? Chat on WhatsApp
              </a>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
                <h3 className="font-serif text-lg font-bold mb-4">Order Summary</h3>

                {nextSlab && (
                  <div className="bg-gradient-to-r from-amber-50 to-gold/10 border border-gold/20 rounded-lg p-3 mb-4" data-testid="cart-booster-progress">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift className="h-3.5 w-3.5 text-gold" />
                      <span className="text-xs font-bold text-amber-800">
                        Add Rs.{(nextSlab.min_cart_value - localTotal).toLocaleString()} more for {nextSlab.reward_type === "fixed" ? `Rs.${nextSlab.reward_value} off` : `${nextSlab.reward_value}% off`}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-1.5 mt-2">
                      <div className="bg-gold rounded-full h-1.5 transition-all" style={{ width: `${Math.min((localTotal / nextSlab.min_cart_value) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}

                {activeSlab && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mb-4" data-testid="active-slab-discount">
                    <Sparkles className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-bold text-green-700">
                      Cart reward: {activeSlab.reward_type === "fixed" ? `Rs.${activeSlab.reward_value}` : `${activeSlab.reward_value}%`} off applied!
                    </span>
                  </div>
                )}

                <div className="flex gap-2 mb-4">
                  <Input placeholder="Coupon code" value={couponCode} onChange={e => setCouponCode(e.target.value)}
                    className="text-sm" data-testid="coupon-input" />
                  <Button onClick={applyCoupon} variant="outline" size="sm" className="shrink-0" data-testid="apply-coupon-btn">
                    <Tag className="h-3.5 w-3.5 mr-1" /> Apply
                  </Button>
                </div>

                <div className="space-y-3 text-sm border-t pt-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Subtotal</span>
                    <span className="font-medium">Rs.{localTotal.toLocaleString()}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-medium">-Rs.{totalDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Shipping</span>
                    <span className="font-medium">{shipping === 0 ? <span className="text-green-600">FREE</span> : `Rs.${shipping}`}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3 text-lg font-bold">
                    <span>Total</span>
                    <span>Rs.{finalTotal.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  className="w-full mt-6 bg-black text-white hover:bg-neutral-800 uppercase tracking-widest py-6 font-bold"
                  onClick={handleCheckout}
                  disabled={isEmpty}
                  data-testid="checkout-btn"
                >
                  Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                {!token && (
                  <p className="text-xs text-neutral-400 text-center mt-2">You'll sign in at checkout — quick & easy</p>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <CheckoutAuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default CartPage;
