import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Package, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, API } from "@/App";
import axios from "axios";

export const OrderSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("id");
  const { token } = useAuth();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (orderId && token) {
      axios.get(`${API}/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setOrder(r.data))
        .catch(() => {});
    }
  }, [orderId, token]);

  return (
    <div className="min-h-screen pt-28 pb-16 bg-neutral-50 flex items-start justify-center" data-testid="order-success-page">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg mx-4"
      >
        {/* Animated checkmark */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-500/30"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <Check className="h-10 w-10 text-white" strokeWidth={3} />
            </motion.div>
          </motion.div>

          <h1 className="font-serif text-2xl md:text-3xl font-bold mb-2" data-testid="success-heading">
            Order Placed Successfully!
          </h1>
          <p className="text-neutral-500 text-sm">
            Thank you for your purchase. We'll send you updates on your order.
          </p>
        </div>

        {/* Order card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4 shadow-sm"
        >
          {orderId && (
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="text-xs text-neutral-400 uppercase tracking-wider">Order ID</span>
              <span className="font-mono text-sm font-medium" data-testid="success-order-id">{orderId}</span>
            </div>
          )}

          {order && (
            <>
              {/* Items */}
              <div className="space-y-2">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {item.product_image && (
                      <img src={item.product_image} alt="" className="w-10 h-12 object-cover rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-neutral-400">Qty: {item.quantity} | {item.size} | {item.color}</p>
                    </div>
                    <span className="text-sm font-medium">₹{item.item_total?.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-100 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Subtotal</span>
                  <span>₹{order.subtotal?.toLocaleString()}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Discount</span>
                    <span className="text-green-600">-₹{order.discount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-neutral-100">
                  <span>Total</span>
                  <span data-testid="success-total">₹{order.total?.toLocaleString()}</span>
                </div>
              </div>

              {/* Shipping */}
              {order.shipping_address && (
                <div className="bg-neutral-50 rounded-lg p-3">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">Shipping to</p>
                  <p className="text-sm font-medium">{order.shipping_address.name}</p>
                  <p className="text-xs text-neutral-500">
                    {order.shipping_address.address}, {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Status indicator */}
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <Package className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Order is being processed</p>
              <p className="text-xs text-amber-600">You'll receive a confirmation shortly</p>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button onClick={() => navigate("/orders")} className="flex-1 btn-gold py-5" data-testid="view-orders-btn">
            <Package className="mr-2 h-4 w-4" /> View My Orders
          </Button>
          <Button onClick={() => navigate("/")} variant="outline" className="flex-1 py-5 border-neutral-300" data-testid="continue-shopping-btn">
            <Home className="mr-2 h-4 w-4" /> Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
