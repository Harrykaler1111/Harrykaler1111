import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

const GUEST_CART_KEY = "pigma_guest_cart";

const getGuestCart = () => {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || [];
  } catch { return []; }
};

const saveGuestCart = (items) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

const clearGuestCart = () => localStorage.removeItem(GUEST_CART_KEY);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const token = localStorage.getItem("pigma_token");
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const mergeAttempted = useRef(false);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Compute totals from items
  const computeTotals = useCallback((items) => {
    const count = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
    const total = items.reduce((sum, i) => sum + ((i.product?.price || i.price || 0) * (i.quantity || 1)), 0);
    setCartCount(count);
    setCartTotal(total);
  }, []);

  // Fetch server cart (logged-in user)
  const fetchCart = useCallback(async () => {
    if (!token) {
      const guest = getGuestCart();
      setCartItems(guest);
      computeTotals(guest);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API}/cart`, { headers });
      const items = res.data.items || [];
      setCartItems(items);
      computeTotals(items);
    } catch {
      setCartItems([]);
      setCartCount(0);
      setCartTotal(0);
    } finally { setLoading(false); }
  }, [token]);

  // Merge guest cart into server cart on login
  const mergeGuestCart = useCallback(async () => {
    if (!token || mergeAttempted.current) return;
    mergeAttempted.current = true;
    const guestItems = getGuestCart();
    if (guestItems.length === 0) return;

    for (const item of guestItems) {
      try {
        await axios.post(`${API}/cart/add`, {
          product_id: item.product_id,
          quantity: item.quantity || 1,
          size: item.size || null,
          color: item.color || null
        }, { headers });
      } catch { /* skip failed items */ }
    }
    clearGuestCart();
    await fetchCart();
    toast.success("Your cart items have been saved to your account");
  }, [token, fetchCart]);

  // On login: merge guest cart then fetch
  useEffect(() => {
    if (token && !mergeAttempted.current) {
      mergeGuestCart();
    } else {
      fetchCart();
    }
  }, [token]);

  // On logout: reset
  useEffect(() => {
    if (!token) {
      mergeAttempted.current = false;
      const guest = getGuestCart();
      setCartItems(guest);
      computeTotals(guest);
    }
  }, [token]);

  const addToCart = async (productId, quantity = 1, size = null, color = null, productData = null) => {
    // Guest mode: store in localStorage
    if (!token) {
      const guest = getGuestCart();
      const existIdx = guest.findIndex(i =>
        i.product_id === productId && i.size === size && i.color === color
      );
      if (existIdx >= 0) {
        guest[existIdx].quantity = (guest[existIdx].quantity || 1) + quantity;
      } else {
        guest.push({
          product_id: productId,
          quantity,
          size,
          color,
          product: productData || { product_id: productId, price: 0, name: "Product", images: [] },
          price: productData?.price || 0
        });
      }
      saveGuestCart(guest);
      setCartItems(guest);
      computeTotals(guest);
      toast.success("Added to cart!");
      return true;
    }

    // Logged-in: server cart
    try {
      await axios.post(`${API}/cart/add`, {
        product_id: productId, quantity, size, color
      }, { headers });
      await fetchCart();
      toast.success("Added to cart!");
      return true;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to add to cart");
      return false;
    }
  };

  const updateQuantity = async (productId, quantity, size = null, color = null) => {
    if (!token) {
      const guest = getGuestCart();
      const item = guest.find(i =>
        i.product_id === productId && i.size === size && i.color === color
      );
      if (item) {
        item.quantity = Math.max(1, quantity);
        saveGuestCart(guest);
        setCartItems([...guest]);
        computeTotals(guest);
      }
      return true;
    }

    try {
      await axios.put(`${API}/cart/update`, {
        product_id: productId, quantity, size, color
      }, { headers });
      await fetchCart();
      return true;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update");
      return false;
    }
  };

  const removeFromCart = async (productId, size = null, color = null) => {
    if (!token) {
      let guest = getGuestCart();
      guest = guest.filter(i =>
        !(i.product_id === productId && i.size === size && i.color === color)
      );
      saveGuestCart(guest);
      setCartItems(guest);
      computeTotals(guest);
      toast.success("Removed from cart");
      return true;
    }

    try {
      await axios.delete(`${API}/cart/remove/${productId}`, {
        headers,
        params: { size, color }
      });
      await fetchCart();
      toast.success("Removed from cart");
      return true;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to remove");
      return false;
    }
  };

  const clearCart = async () => {
    if (!token) {
      clearGuestCart();
      setCartItems([]);
      setCartCount(0);
      setCartTotal(0);
      return;
    }
    try {
      await axios.delete(`${API}/cart/clear`, { headers });
      setCartItems([]);
      setCartCount(0);
      setCartTotal(0);
    } catch { /* silent */ }
  };

  const openCart = useCallback(() => {
    window.dispatchEvent(new Event("open-cart"));
  }, []);

  return (
    <CartContext.Provider value={{
      cartItems, cartCount, cartTotal, loading,
      addToCart, updateQuantity, removeFromCart, clearCart, fetchCart, openCart
    }}>
      {children}
    </CartContext.Provider>
  );
};
