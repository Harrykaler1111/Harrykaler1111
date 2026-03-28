import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Package, Home, Banknote, CreditCard, Truck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, API } from "@/App";
import axios from "axios";

export const OrderSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("id");
  const paymentMethod = searchParams.get("method") || "prepaid";
  const advanceAmount = parseFloat(searchParams.get("advance") || "0");
  const { token } = useAuth();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (orderId && token) {
      axios.get(`${API}/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setOrder(r.data))
        .catch(() => {});
    }
  }, [orderId, token]);

  const isCod = paymentMethod === "cod";

  return (
    <div className="min-h-screen pt-24 pb-16 bg-black flex items-start justify-center" data-testid="order-success-page">
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

          <h1 className="font-serif text-2xl md:text-3xl font-bold text-white mb-2" data-testid="success-heading">
            Order Placed Successfully!
          </h1>
          <p className="text-neutral-400 text-sm">
            {isCod ? "Your COD order has been confirmed." : "Payment received. Thank you for your purchase."}
          </p>
        </div>

        {/* Order card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4"
        >
          {orderId && (
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-xs text-neutral-500 uppercase tracking-wider">Order ID</span>
              <span className="font-mono text-sm font-medium text-gold" data-testid="success-order-id">{orderId}</span>
            </div>
          )}

          {/* Payment Method Badge */}
          <div className={`flex items-center gap-2 p-3 rounded-lg ${isCod ? "bg-amber-500/10 border border-amber-500/20" : "bg-green-500/10 border border-green-500/20"}`}>
            {isCod ? <Banknote className="h-4 w-4 text-amber-400" /> : <CreditCard className="h-4 w-4 text-green-400" />}
            <span className={`text-xs font-medium ${isCod ? "text-amber-400" : "text-green-400"}`}>
              {isCod ? "Cash on Delivery" : "Paid Online"}
            </span>
          </div>

          {order && (
            <>
              {/* Items */}
              <div className="space-y-2">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {item.product_image && (
                      <img src={item.product_image} alt="" className="w-10 h-12 object-cover rounded-lg border border-neutral-800" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-200 truncate">{item.product_name}</p>
                      <p className="text-xs text-neutral-500">Qty: {item.quantity} | {item.size} | {item.color}</p>
                    </div>
                    <span className="text-sm font-medium text-white">Rs.{item.item_total?.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-800 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">Subtotal</span>
                  <span className="text-neutral-300">Rs.{order.subtotal?.toLocaleString()}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">Discount</span>
                    <span className="text-green-400">-Rs.{order.discount?.toLocaleString()}</span>
                  </div>
                )}
                {order.prepaid_discount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-green-400">Prepaid Discount</span>
                    <span className="text-green-400">-Rs.{order.prepaid_discount?.toLocaleString()}</span>
                  </div>
                )}
                {order.cod_charge > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-400">COD Fee</span>
                    <span className="text-amber-400">+Rs.{order.cod_charge?.toLocaleString()}</span>
                  </div>
                )}
                {order.shipping_charge > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Shipping</span>
                    <span className="text-neutral-300">Rs.{order.shipping_charge?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-neutral-800">
                  <span className="text-white">Total</span>
                  <span className="text-gold" data-testid="success-total">Rs.{order.total?.toLocaleString()}</span>
                </div>
              </div>

              {/* COD Advance breakdown */}
              {isCod && advanceAmount > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-300">Advance Paid</span>
                    <span className="text-amber-400 font-bold">Rs.{advanceAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Remaining (on delivery)</span>
                    <span className="text-white font-bold">Rs.{(order.total - advanceAmount).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Shipping */}
              {order.shipping_address && (
                <div className="bg-neutral-900 rounded-lg p-3">
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Shipping to</p>
                  <p className="text-sm font-medium text-white">{order.shipping_address.name}</p>
                  <p className="text-xs text-neutral-400">
                    {order.shipping_address.address}, {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Status indicator */}
          <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-3">
            <Truck className="h-5 w-5 text-gold shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Order is being processed</p>
              <p className="text-xs text-neutral-400">Expected delivery in 3-5 business days</p>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button onClick={() => navigate("/orders")} className="flex-1 bg-gold hover:bg-yellow-500 text-black font-bold h-12 rounded-xl" data-testid="view-orders-btn">
            <Package className="mr-2 h-4 w-4" /> View My Orders
          </Button>
          <Button onClick={() => navigate("/")} variant="outline" className="flex-1 border-neutral-700 text-white hover:bg-neutral-900 h-12 rounded-xl" data-testid="continue-shopping-btn">
            <Home className="mr-2 h-4 w-4" /> Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
