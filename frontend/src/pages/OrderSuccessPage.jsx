import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Package, Home, Banknote, CreditCard, Truck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, API } from "@/App";
import axios from "axios";
import { whatsappLink, PHONE_NUMBER } from "@/components/WhatsAppButton";

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

          {/* WhatsApp Contact */}
          <a href={whatsappLink(`Hi, I placed an order (ID: ${orderId || "N/A"}) and would like updates.`)}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "#25D366" }}
            data-testid="order-whatsapp-updates">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            For order updates, contact us on WhatsApp: {PHONE_NUMBER}
          </a>
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
