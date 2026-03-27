import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { Zap, Gift, Sparkles, ChevronRight, X, Plus, Star, ShoppingBag } from "lucide-react";
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
        +₹{amount.toLocaleString()} added
      </motion.div>
    )}
  </AnimatePresence>
);

// Upsell modal
const UpsellModal = ({ open, onClose }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, refreshCart } = useCart();
  const { token } = useAuth();

  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    axios.get(`${API}/cart/upsell-suggestions?max_price=500`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => setProducts(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [open, token]);

  const handleAdd = async (product) => {
    const ok = await addToCart(product.product_id, 1, product.sizes?.[0] || "M", product.colors?.[0] || "Default");
    if (ok) refreshCart();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-lg max-h-[80vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
          data-testid="upsell-modal"
        >
          <div className="flex items-center justify-between p-5 border-b border-neutral-100">
            <div>
              <h3 className="font-serif text-lg font-bold">Quick Add-ons</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Boost your cart to unlock rewards</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-full">
              <X className="h-5 w-5 text-neutral-400" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" /></div>
            ) : products.length === 0 ? (
              <p className="text-center py-8 text-neutral-500">No suggestions available</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map(p => (
                  <motion.div key={p.product_id} whileHover={{ scale: 1.02 }}
                    className="bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100 group"
                    data-testid={`upsell-item-${p.product_id}`}>
                    <div className="aspect-square bg-neutral-100 overflow-hidden">
                      <img src={p.images?.[0] || "https://via.placeholder.com/200"} alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold">₹{p.price?.toLocaleString()}</span>
                        <button onClick={() => handleAdd(p)}
                          className="bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-gold hover:text-black transition-colors"
                          data-testid={`upsell-add-${p.product_id}`}>
                          <Plus className="h-3 w-3 inline mr-0.5" /> Add
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
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
  const { cartTotal, cartCount, slabs, messages, getActiveSlab, lastAddedAmount, newSlabUnlocked } = useCart();
  const [showUpsell, setShowUpsell] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const enabledSlabs = slabs.filter(s => s.is_enabled).sort((a, b) => a.min_cart_value - b.min_cart_value);
  if (enabledSlabs.length === 0) return null;

  const { active, next } = getActiveSlab(cartTotal);
  const maxThreshold = enabledSlabs[enabledSlabs.length - 1]?.min_cart_value || 1;
  const progress = Math.min((cartTotal / maxThreshold) * 100, 100);
  const nearNext = next && (next.min_cart_value - cartTotal) <= 300 && (next.min_cart_value - cartTotal) > 0;

  const msgCfg = messages || {};
  const nearText = (msgCfg.near_threshold_text || "You're just {amount} away from saving {reward}")
    .replace("{amount}", `₹${next ? (next.min_cart_value - cartTotal).toLocaleString() : 0}`)
    .replace("{reward}", next?.reward_label || "");

  return (
    <>
      <ConfettiBurst show={!!newSlabUnlocked} />
      <UpsellModal open={showUpsell} onClose={() => setShowUpsell(false)} />

      {/* Desktop Bar */}
      <div className="hidden lg:block sticky top-[72px] z-40" data-testid="booster-bar-desktop">
        <div className="relative bg-black border-b border-gold/20 overflow-hidden">
          {/* Animated glow when slab unlocked */}
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
                  {/* Pulse when near next slab */}
                  {nearNext && (
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-gold/30"
                      animate={{ width: [`${progress}%`, `${progress + 3}%`, `${progress}%`], opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                  {/* Slab markers */}
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
                {/* Slab labels */}
                <div className="flex justify-between mt-1">
                  {enabledSlabs.map(s => (
                    <span key={s.slab_id} className={`text-[9px] ${cartTotal >= s.min_cart_value ? "text-gold" : "text-neutral-500"}`}>
                      ₹{s.min_cart_value.toLocaleString()} = {s.reward_label}
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
                      {nearNext ? nearText : `${msgCfg.bar_prefix || "Add"} ₹${(next.min_cart_value - cartTotal).toLocaleString()} ${msgCfg.bar_suffix || "more to unlock reward"}`}
                    </motion.p>
                  ) : (
                    <span className="text-neutral-400 text-xs">Add items to unlock rewards</span>
                  )}
                </AnimatePresence>
                {nearNext && (
                  <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                    className="text-[10px] text-yellow-400/70 mt-0.5" data-testid="urgency-msg">
                    {msgCfg.urgency_text || "Almost there! Don't miss your discount"}
                  </motion.p>
                )}
              </div>

              {/* Upsell Button */}
              {next && (next.min_cart_value - cartTotal) <= 500 && (next.min_cart_value - cartTotal) > 0 && (
                <Button onClick={() => setShowUpsell(true)} size="sm"
                  className="bg-gold text-black text-xs font-bold hover:bg-gold/80 shrink-0 rounded-full px-4"
                  data-testid="upsell-trigger-btn">
                  {msgCfg.upsell_button_text || "View items under ₹300"} <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

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
                {/* Slab labels */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {enabledSlabs.map(s => (
                    <span key={s.slab_id} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      cartTotal >= s.min_cart_value ? "border-gold/50 text-gold bg-gold/10" : "border-neutral-700 text-neutral-500"
                    }`}>
                      ₹{s.min_cart_value.toLocaleString()} = {s.reward_label}
                    </span>
                  ))}
                </div>
                {next && (next.min_cart_value - cartTotal) <= 500 && (
                  <Button onClick={() => { setShowUpsell(true); setIsExpanded(false); }} size="sm"
                    className="w-full bg-gold text-black text-xs font-bold rounded-full mt-1" data-testid="mobile-upsell-btn">
                    {msgCfg.upsell_button_text || "View items under ₹300"} <ChevronRight className="h-3 w-3 ml-1" />
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
                    <span className="text-neutral-300 text-[10px]">₹{(next.min_cart_value - cartTotal).toLocaleString()} more for {next.reward_label}</span>
                  ) : (
                    <span className="text-neutral-400 text-[10px]">Add items</span>
                  )}
                </div>
                <span className="text-gold text-xs font-bold">₹{cartTotal.toLocaleString()}</span>
              </div>
            </div>
            {/* Cart icon */}
            <button onClick={(e) => { e.stopPropagation(); navigate("/cart"); }}
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
