import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trash2, Plus, Minus, ArrowRight, Tag, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const CartPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);

  const fetchCart = async () => {
    try {
      const response = await axios.get(`${API}/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCart(response.data);
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [token]);

  const updateQuantity = async (item, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await axios.put(
        `${API}/cart/update`,
        { ...item, quantity: newQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCart();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update quantity");
    }
  };

  const removeItem = async (item) => {
    try {
      await axios.delete(
        `${API}/cart/item/${item.product_id}?size=${item.size}&color=${item.color}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Item removed");
      fetchCart();
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const response = await axios.post(
        `${API}/coupons/validate?code=${couponCode}&subtotal=${cart?.total || 0}`
      );
      setAppliedCoupon(response.data.coupon);
      setDiscount(response.data.discount);
      toast.success("Coupon applied!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid coupon");
      setAppliedCoupon(null);
      setDiscount(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  const isEmpty = !cart?.items?.length;

  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-neutral-50" data-testid="cart-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">Shopping Cart</h1>

        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <ShoppingBag className="h-16 w-16 mx-auto text-neutral-300 mb-6" />
            <h2 className="font-serif text-2xl font-bold mb-4">Your cart is empty</h2>
            <p className="text-neutral-500 mb-8">Looks like you haven't added any items yet</p>
            <Button
              onClick={() => navigate("/products")}
              className="bg-black text-white hover:bg-neutral-800 uppercase tracking-widest px-8 py-6"
              data-testid="continue-shopping-btn"
            >
              Continue Shopping
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item, index) => (
                <motion.div
                  key={`${item.product_id}-${item.size}-${item.color}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-4 md:p-6 flex gap-4 md:gap-6"
                  data-testid={`cart-item-${item.product_id}`}
                >
                  {/* Image */}
                  <Link
                    to={`/product/${item.product_id}`}
                    className="w-24 md:w-32 flex-shrink-0"
                  >
                    <div className="aspect-[3/4] bg-neutral-100 overflow-hidden">
                      <img
                        src={item.product?.images?.[0] || "https://via.placeholder.com/200x300"}
                        alt={item.product?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <Link
                        to={`/product/${item.product_id}`}
                        className="font-medium hover:text-gold transition-colors"
                      >
                        {item.product?.name || "Product"}
                      </Link>
                      <p className="text-sm text-neutral-500 mt-1">
                        Size: {item.size} | Color: {item.color}
                      </p>
                      <p className="font-semibold mt-2">
                        Rs.{(item.product?.price || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      {/* Quantity */}
                      <div className="flex items-center border border-neutral-300">
                        <button
                          onClick={() => updateQuantity(item, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100"
                          data-testid={`decrease-qty-${item.product_id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100"
                          data-testid={`increase-qty-${item.product_id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item)}
                        className="text-neutral-400 hover:text-red-500 transition-colors"
                        data-testid={`remove-item-${item.product_id}`}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 sticky top-28">
                <h2 className="font-serif text-xl font-bold mb-6">Order Summary</h2>

                {/* Coupon */}
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">Discount Code</label>
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="uppercase"
                      data-testid="coupon-input"
                    />
                    <Button
                      onClick={applyCoupon}
                      variant="outline"
                      className="flex-shrink-0"
                      data-testid="apply-coupon-btn"
                    >
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                  {appliedCoupon && (
                    <p className="text-sm text-green-600 mt-2">
                      {appliedCoupon.code} applied! You save Rs.{discount.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-3 pb-6 border-b">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Subtotal</span>
                    <span>Rs.{(cart?.total || 0).toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-Rs.{discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Shipping</span>
                    <span>{(cart?.total || 0) >= 2999 ? "Free" : "Rs.199"}</span>
                  </div>
                </div>

                <div className="flex justify-between py-6 text-lg font-semibold">
                  <span>Total</span>
                  <span>
                    Rs.{(
                      (cart?.total || 0) - discount + ((cart?.total || 0) < 2999 ? 199 : 0)
                    ).toLocaleString()}
                  </span>
                </div>

                <Button
                  onClick={() => navigate("/checkout", { state: { coupon: appliedCoupon?.code, discount } })}
                  className="w-full btn-gold py-6"
                  data-testid="checkout-btn"
                >
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-xs text-neutral-500 text-center mt-4">
                  Free shipping on orders over Rs.2999
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
