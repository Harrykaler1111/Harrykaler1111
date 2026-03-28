import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { Zap, Gift, Sparkles, ChevronRight, X, Plus, Minus, Star, ShoppingBag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";

// Confetti burst
const ConfettiBurst = ({ show }) => {
  if (!show) return null;
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.3,
    color: ["#C9A050", "#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#fff"][i % 6],
    size: 3 + Math.random() * 5,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-[200]" data-testid="confetti-burst">
      {particles.map((p) => (
        <motion.div key={p.id}
          initial={{ x: `${p.x}vw`, y: -10, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", opacity: 0, rotate: 720 }}
          transition={{ duration: 1.8 + Math.random(), delay: p.delay, ease: "easeOut" }}
          className="absolute rounded-sm"
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
        />
      ))}
    </div>
  );
};

// +₹XXX added popup
const AddedPopup = ({ amount }) => (
  <AnimatePresence>
    {amount > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute -top-8 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-50"
        data-testid="added-popup"
      >
        +Rs.{amount.toLocaleString()} added
      </motion.div>
    )}
  </AnimatePresence>
);

// ============== UPSELL POPUP WITH QUANTITY CONTROLLER ==============
const UpsellModal = ({ open, onClose, amountNeeded, rewardLabel }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { cart, addToCart, updateCartItem, removeFromCart, refreshCart } = useCart();
  const { token } = useAuth();

  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    axios.get(`${API}/cart/upsell-suggestions?max_price=500`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => setProducts(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [open, token]);

  const getCartQty = useCallback((productId) => {
    return cart?.items?.find(i => i.product_id === productId)?.quantity || 0;
  }, [cart]);

  const getCartItem = useCallback((productId) => {
    return cart?.items?.find(i => i.product_id === productId);
  }, [cart]);

  const handleAdd = async (product) => {
    const ok = await addToCart(product.product_id, 1, product.sizes?.[0] || "M", product.colors?.[0] || "Default");
    if (ok) refreshCart();
  };

  const handleIncrease = async (product) => {
    const item = getCartItem(product.product_id);
    if (!item) return handleAdd(product);
    if (item.quantity >= product.stock) return;
    await updateCartItem(product.product_id, item.quantity + 1, item.size, item.color);
  };

  const handleDecrease = async (product) => {
    const item = getCartItem(product.product_id);
    if (!item) return;
    if (item.quantity <= 1) {
      await removeFromCart(product.product_id, item.size, item.color);
    } else {
      await updateCartItem(product.product_id, item.quantity - 1, item.size, item.color);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center"
        onClick={onClose}
        data-testid="upsell-overlay"
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-neutral-950 border border-neutral-800 rounded-t-3xl md:rounded-2xl w-full md:max-w-3xl max-h-[85vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
          data-testid="upsell-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-neutral-800">
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Add More to Unlock</h3>
              {amountNeeded > 0 && (
                <p className="text-xs text-gold mt-0.5">
                  Rs.{amountNeeded.toLocaleString()} away from <span className="font-bold">{rewardLabel}</span>
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors" data-testid="upsell-close">
              <X className="h-5 w-5 text-neutral-400" />
            </button>
          </div>

          {/* Products Grid */}
          <div className="p-4 overflow-y-auto max-h-[65vh]">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-10">
                <ShoppingBag className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400 text-sm">No recommendations available right now</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {products.map(p => {
                  const qty = getCartQty(p.product_id);
                  const isOutOfStock = p.stock <= 0;

                  return (
                    <motion.div
                      key={p.product_id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 group"
                      data-testid={`upsell-item-${p.product_id}`}
                    >
                      <div className="aspect-[4/5] bg-neutral-800 overflow-hidden relative">
                        <img
                          src={p.images?.[0] || "/placeholder-product.svg"}
                          alt={p.name}
                          onError={e => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect fill='%23262626' width='200' height='200'/%3E%3Ctext fill='%23666' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E"; }}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        {qty > 0 && (
                          <div className="absolute top-1.5 right-1.5 bg-gold text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                            {qty}
                          </div>
                        )}
                        {p.compare_price && (
                          <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                            -{Math.round(((p.compare_price - p.price) / p.compare_price) * 100)}%
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-[11px] font-medium text-neutral-200 truncate">{p.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs font-bold text-gold">Rs.{p.price?.toLocaleString()}</span>
                          {p.compare_price && (
                            <span className="text-[9px] text-neutral-500 line-through">Rs.{p.compare_price?.toLocaleString()}</span>
                          )}
                        </div>

                        {/* Quick Add / Quantity Controller */}
                        <div className="mt-1.5">
                          {isOutOfStock ? (
                            <div className="bg-neutral-800 text-neutral-500 text-[10px] text-center py-1.5 rounded-md font-medium">
                              Out of Stock
                            </div>
                          ) : qty > 0 ? (
                            <div className="flex items-center justify-between bg-neutral-800 rounded-md overflow-hidden" data-testid={`upsell-qty-${p.product_id}`}>
                              <button
                                onClick={() => handleDecrease(p)}
                                className="w-8 h-7 flex items-center justify-center text-white hover:bg-neutral-700 transition-colors active:scale-90"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <motion.span
                                key={qty}
                                initial={{ scale: 1.4 }}
                                animate={{ scale: 1 }}
                                className="text-gold font-bold text-xs"
                              >
                                {qty}
                              </motion.span>
                              <button
                                onClick={() => handleIncrease(p)}
                                className="w-8 h-7 flex items-center justify-center text-white hover:bg-neutral-700 transition-colors active:scale-90"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAdd(p)}
                              className="w-full bg-gold/10 border border-gold/30 text-gold text-[11px] font-bold py-1.5 rounded-md hover:bg-gold hover:text-black transition-all active:scale-95 flex items-center justify-center gap-1"
                              data-testid={`upsell-add-${p.product_id}`}
                            >
                              <Plus className="h-3 w-3" /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============== MAIN STICKY BOOSTER BAR ==============
export const BoosterBar = () => {
  const navigate = useNavigate();
  const { cartTotal, cartCount, slabs, messages, getActiveSlab, lastAddedAmount, newSlabUnlocked, openCart } = useCart();
  const [showUpsell, setShowUpsell] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const enabledSlabs = slabs.filter(s => s.is_enabled).sort((a, b) => a.min_cart_value - b.min_cart_value);
  if (enabledSlabs.length === 0) return null;

  const { active, next } = getActiveSlab(cartTotal);
  const maxThreshold = enabledSlabs[enabledSlabs.length - 1]?.min_cart_value || 1;
  const progress = Math.min((cartTotal / maxThreshold) * 100, 100);
  const amountToNext = next ? next.min_cart_value - cartTotal : 0;
  const nearNext = next && amountToNext <= 300 && amountToNext > 0;

  const msgCfg = messages || {};
  const nearText = (msgCfg.near_threshold_text || "You're just {amount} away from saving {reward}")
    .replace("{amount}", `Rs.${amountToNext.toLocaleString()}`)
    .replace("{reward}", next?.reward_label || "");

  return (
    <>
      <ConfettiBurst show={!!newSlabUnlocked} />
      <UpsellModal
        open={showUpsell}
        onClose={() => setShowUpsell(false)}
        amountNeeded={amountToNext}
        rewardLabel={next?.reward_label || ""}
      />

      {/* Desktop Bar */}
      <div className="hidden lg:block fixed top-[68px] left-0 right-0 z-40 will-change-transform" style={{ transform: 'translateZ(0)' }} data-testid="booster-bar-desktop">
        <div className="relative bg-black border-b border-gold/20 overflow-hidden">
          {active && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/10 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          )}

          <div className="max-w-7xl mx-auto px-8 py-2.5 relative">
            <div className="flex items-center gap-6">
              {/* Icon + Label */}
              <div className="flex items-center gap-2 shrink-0">
                <Zap className="h-4 w-4 text-gold" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-gold">Booster</span>
              </div>

              {/* Progress Bar */}
              <div className="flex-1 relative">
                <div className="relative h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`absolute inset-y-0 left-0 rounded-full ${active ? "bg-gradient-to-r from-gold to-yellow-400" : "bg-gold/60"}`}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                  {nearNext && (
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-gold/30"
                      animate={{ width: [`${progress}%`, `${progress + 3}%`, `${progress}%`], opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                  {enabledSlabs.map(s => {
                    const pos = (s.min_cart_value / maxThreshold) * 100;
                    const unlocked = cartTotal >= s.min_cart_value;
                    return (
                      <div key={s.slab_id} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${pos}%` }}>
                        <motion.div
                          animate={unlocked ? { scale: [1, 1.3, 1] } : {}}
                          transition={{ duration: 0.5 }}
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[6px] ${
                            unlocked ? "bg-gold border-gold shadow-[0_0_8px_rgba(201,160,80,0.6)]" : "bg-neutral-700 border-neutral-600"
                          }`}
                        >
                          {unlocked && <Sparkles className="h-2 w-2 text-black" />}
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  {enabledSlabs.map(s => (
                    <span key={s.slab_id} className={`text-[9px] ${cartTotal >= s.min_cart_value ? "text-gold" : "text-neutral-500"}`}>
                      Rs.{s.min_cart_value.toLocaleString()} = {s.reward_label}
                    </span>
                  ))}
                </div>
              </div>

              <AddedPopup amount={lastAddedAmount} />

              {/* Message */}
              <div className="shrink-0 text-right min-w-[200px]">
                <AnimatePresence mode="wait">
                  {newSlabUnlocked ? (
                    <motion.p key="unlocked" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
                      className="text-green-400 text-sm font-bold flex items-center gap-1 justify-end" data-testid="slab-unlocked-msg">
                      <Gift className="h-4 w-4" /> {newSlabUnlocked.reward_label} {msgCfg.unlocked_text || "Unlocked!"}
                    </motion.p>
                  ) : active && !next ? (
                    <motion.p key="max" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
                      className="text-gold text-sm font-bold" data-testid="max-unlocked-msg">
                      {msgCfg.max_unlocked_text || "Maximum reward unlocked!"}
                    </motion.p>
                  ) : next ? (
                    <motion.p key="next" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
                      className={`text-sm ${nearNext ? "text-yellow-400 font-semibold" : "text-neutral-300"}`} data-testid="next-slab-msg">
                      {nearNext ? nearText : `${msgCfg.bar_prefix || "Add"} Rs.${amountToNext.toLocaleString()} ${msgCfg.bar_suffix || "more to unlock reward"}`}
                    </motion.p>
                  ) : (
                    <span className="text-neutral-400 text-xs">Add items to unlock rewards</span>
                  )}
                </AnimatePresence>
              </div>

              {/* CTA Button — Always visible when there's a next reward */}
              {next && amountToNext > 0 && (
                <motion.button
                  onClick={() => setShowUpsell(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gold text-black text-xs font-bold px-5 py-2 rounded-full shrink-0 flex items-center gap-1.5 shadow-[0_0_12px_rgba(201,160,80,0.3)] hover:shadow-[0_0_20px_rgba(201,160,80,0.5)] transition-shadow"
                  data-testid="upsell-trigger-btn"
                >
                  <Gift className="h-3.5 w-3.5" />
                  Add more to unlock
                  <ChevronRight className="h-3 w-3" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Spacer */}
      <div className="hidden lg:block h-[48px] bg-black" />

      {/* Mobile Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[60]" data-testid="booster-bar-mobile">
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="bg-black border-t border-gold/20 safe-area-bottom"
        >
          {/* Expandable section */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-neutral-800 px-4 py-3"
              >
                <div className="flex flex-wrap gap-2 mb-2">
                  {enabledSlabs.map(s => (
                    <span key={s.slab_id} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      cartTotal >= s.min_cart_value ? "border-gold/50 text-gold bg-gold/10" : "border-neutral-700 text-neutral-500"
                    }`}>
                      Rs.{s.min_cart_value.toLocaleString()} = {s.reward_label}
                    </span>
                  ))}
                </div>
                {next && amountToNext > 0 && (
                  <Button onClick={() => { setShowUpsell(true); setIsExpanded(false); }} size="sm"
                    className="w-full bg-gold text-black text-xs font-bold rounded-full mt-1" data-testid="mobile-upsell-btn">
                    <Gift className="h-3.5 w-3.5 mr-1.5" /> Add more to unlock rewards <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-4 py-2.5 flex items-center gap-3" onClick={() => setIsExpanded(!isExpanded)}>
            {/* Progress */}
            <div className="flex-1">
              <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-1.5">
                <motion.div className="h-full bg-gold rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-gold" />
                  {active ? (
                    <span className="text-green-400 text-[10px] font-bold">{active.reward_label} unlocked!</span>
                  ) : next ? (
                    <span className="text-neutral-300 text-[10px]">Rs.{amountToNext.toLocaleString()} more for {next.reward_label}</span>
                  ) : (
                    <span className="text-neutral-400 text-[10px]">Add items</span>
                  )}
                </div>
                <span className="text-gold text-xs font-bold">Rs.{cartTotal.toLocaleString()}</span>
              </div>
            </div>
            {/* Cart icon */}
            <button onClick={(e) => { e.stopPropagation(); openCart(); }}
              className="relative bg-gold text-black p-2 rounded-full" data-testid="mobile-cart-btn">
              <ShoppingBag className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
};
