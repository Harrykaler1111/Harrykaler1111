import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Clock, CheckCircle, Truck, XCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, API } from "@/App";
import axios from "axios";

export const OrdersPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${API}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(response.data);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [token]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "confirmed":
      case "processing":
        return <Package className="h-4 w-4" />;
      case "shipped":
        return <Truck className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "confirmed":
      case "processing":
        return "bg-blue-100 text-blue-700";
      case "shipped":
        return "bg-purple-100 text-purple-700";
      case "delivered":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-neutral-100 text-neutral-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-neutral-50" data-testid="orders-page">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <Package className="h-16 w-16 mx-auto text-neutral-300 mb-6" />
            <h2 className="font-serif text-2xl font-bold mb-4">No orders yet</h2>
            <p className="text-neutral-500 mb-8">Start shopping to see your orders here</p>
            <Button
              onClick={() => navigate("/products")}
              className="bg-black text-white hover:bg-neutral-800 uppercase tracking-widest px-8 py-6"
              data-testid="start-shopping-btn"
            >
              Start Shopping
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => (
              <motion.div
                key={order.order_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-4 md:p-6"
                data-testid={`order-${order.order_id}`}
              >
                {/* Order Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
                  <div>
                    <p className="font-mono text-xs text-neutral-500">Order ID</p>
                    <p className="font-medium">{order.order_id}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-neutral-500">Date</p>
                    <p className="font-medium">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-neutral-500">Total</p>
                    <p className="font-semibold">Rs.{order.total.toLocaleString()}</p>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="text-sm capitalize">{order.status}</span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="py-4 space-y-3">
                  {order.items?.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-16 h-20 bg-neutral-100 flex-shrink-0 overflow-hidden">
                        <img
                          src={item.product_image || "https://via.placeholder.com/100"}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <p className="text-xs text-neutral-500">
                          {item.size} | {item.color} | Qty: {item.quantity}
                        </p>
                        <p className="text-sm font-medium mt-1">Rs.{item.price?.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {order.items?.length > 2 && (
                    <p className="text-sm text-neutral-500">
                      +{order.items.length - 2} more item(s)
                    </p>
                  )}
                </div>

                {/* Order Footer */}
                <div className="pt-4 border-t flex justify-between items-center">
                  <div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      order.payment_status === "paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      Payment: {order.payment_status}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    className="text-sm"
                    onClick={() => {/* View order details */}}
                    data-testid={`view-order-${order.order_id}`}
                  >
                    View Details
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
