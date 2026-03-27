import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "@/App";

const CartContext = createContext(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) return { cart: null, cartTotal: 0, cartCount: 0, refreshCart: () => {}, slabs: [], messages: {}, boosterConfig: null, lastAddedAmount: 0, isCartOpen: false, openCart: () => {}, closeCart: () => {} };
  return ctx;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [boosterConfig, setBoosterConfig] = useState(null);
  const [lastAddedAmount, setLastAddedAmount] = useState(0);
  const [prevUnlockedSlab, setPrevUnlockedSlab] = useState(null);
  const [newSlabUnlocked, setNewSlabUnlocked] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const prevTotalRef = useRef(0);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const token = localStorage.getItem("pigma_token");
  const cartTotal = cart?.total || 0;
  const cartCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
  const slabs = boosterConfig?.slabs || [];
  const messages = boosterConfig?.messages || {};

  // Get active/next slab
  const getActiveSlab = useCallback((total) => {
    let active = null;
    let next = null;
    const enabledSlabs = slabs.filter(s => s.is_enabled);
    for (let i = enabledSlabs.length - 1; i >= 0; i--) {
      if (total >= enabledSlabs[i].min_cart_value) {
        active = enabledSlabs[i];
        next = enabledSlabs[i + 1] || null;
        break;
      }
    }
    if (!active && enabledSlabs.length > 0) next = enabledSlabs[0];
    return { active, next };
  }, [slabs]);

  const fetchBoosterConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/booster/config`);
      setBoosterConfig(res.data);
    } catch { /* ignore */ }
  }, []);

  const refreshCart = useCallback(async () => {
    if (!token) { setCart(null); return; }
    try {
      const res = await axios.get(`${API}/cart`, { headers: { Authorization: `Bearer ${token}` } });
      const newTotal = res.data.total || 0;
      const diff = newTotal - prevTotalRef.current;
      if (diff > 0) setLastAddedAmount(diff);
      else setLastAddedAmount(0);

      // Check slab unlock
      if (boosterConfig?.slabs) {
        const oldSlab = getActiveSlab(prevTotalRef.current).active;
        const newSlab = getActiveSlab(newTotal).active;
        if (newSlab && (!oldSlab || newSlab.min_cart_value > oldSlab.min_cart_value)) {
          setNewSlabUnlocked(newSlab);
          // Track unlock
          axios.post(`${API}/booster/track-unlock?slab_id=${newSlab.slab_id}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {});
          setTimeout(() => setNewSlabUnlocked(null), 4000);
        }
      }

      prevTotalRef.current = newTotal;
      setCart(res.data);
    } catch { /* ignore */ }
  }, [token, boosterConfig, getActiveSlab]);

  const addToCart = useCallback(async (productId, quantity = 1, size = "M", color = "Default") => {
    if (!token) return false;
    try {
      const res = await axios.post(`${API}/cart/add`, {
        product_id: productId, quantity, size, color
      }, { headers: { Authorization: `Bearer ${token}` } });
      const newTotal = res.data.total || 0;
      const diff = newTotal - prevTotalRef.current;
      if (diff > 0) setLastAddedAmount(diff);
      prevTotalRef.current = newTotal;
      setCart(res.data);

      // Check slab unlock
      if (boosterConfig?.slabs) {
        const oldSlab = getActiveSlab(prevTotalRef.current - diff).active;
        const newSlab = getActiveSlab(newTotal).active;
        if (newSlab && (!oldSlab || newSlab.min_cart_value > oldSlab.min_cart_value)) {
          setNewSlabUnlocked(newSlab);
          axios.post(`${API}/booster/track-unlock?slab_id=${newSlab.slab_id}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {});
          setTimeout(() => setNewSlabUnlocked(null), 4000);
        }
      }

      return true;
    } catch { return false; }
  }, [token, boosterConfig, getActiveSlab]);

  useEffect(() => { fetchBoosterConfig(); }, [fetchBoosterConfig]);
  useEffect(() => { refreshCart(); }, [token]);

  // Clear last added amount after 3s
  useEffect(() => {
    if (lastAddedAmount > 0) {
      const t = setTimeout(() => setLastAddedAmount(0), 3000);
      return () => clearTimeout(t);
    }
  }, [lastAddedAmount]);

  return (
    <CartContext.Provider value={{
      cart, cartTotal, cartCount, refreshCart, addToCart,
      slabs, messages, boosterConfig, getActiveSlab,
      lastAddedAmount, newSlabUnlocked, prevTotal: prevTotalRef.current,
      isCartOpen, openCart, closeCart
    }}>
      {children}
    </CartContext.Provider>
  );
};
