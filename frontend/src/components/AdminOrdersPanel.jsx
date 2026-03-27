import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Clock, Truck, Check, ChevronDown, ChevronUp, Eye,
  MapPin, Phone, Mail, User, AlertCircle, Volume2, VolumeX, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

// Notification sound (short ding using Web Audio API)
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
    // Second tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.65);
  } catch (e) {
    console.warn("Could not play notification sound:", e);
  }
};

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Check },
  processing: { label: "Processing", color: "bg-purple-50 text-purple-700 border-purple-200", icon: Package },
  shipped: { label: "Shipped", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-50 text-green-700 border-green-200", icon: Check },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.color}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
};

// New order popup notification
const NewOrderPopup = ({ orders, onDismiss }) => (
  <AnimatePresence>
    {orders.length > 0 && (
      <motion.div
        initial={{ y: -80, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -80, opacity: 0, scale: 0.9 }}
        className="fixed top-4 right-4 z-[300] bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-2xl shadow-orange-500/30 p-4 max-w-sm"
        data-testid="new-order-popup"
      >
        <div className="flex items-start gap-3">
          <div className="bg-white/20 rounded-full p-2">
            <Bell className="h-5 w-5 animate-bounce" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">New Order Received!</p>
            {orders.map(o => (
              <p key={o.order_id} className="text-xs text-white/80 mt-0.5">
                #{o.order_id?.slice(-6)} - ₹{o.total?.toLocaleString()}
              </p>
            ))}
          </div>
          <button onClick={onDismiss} className="text-white/60 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Order detail row
const OrderRow = ({ order, token, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [trackingId, setTrackingId] = useState(order.tracking_id || "");
  const [courierName, setCourierName] = useState(order.courier_name || "Standard Shipping");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingTracking, setUpdatingTracking] = useState(false);

  const date = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const updateStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await axios.put(`${API}/admin/orders/${order.order_id}/status`, null, {
        params: { status: newStatus },
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Order ${newStatus}`);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const saveTracking = async () => {
    if (!trackingId.trim()) { toast.error("Enter tracking ID"); return; }
    setUpdatingTracking(true);
    try {
      await axios.put(`${API}/admin/orders/${order.order_id}/tracking`, {
        tracking_id: trackingId.trim(),
        courier_name: courierName.trim()
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Tracking saved, order shipped");
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally {
      setUpdatingTracking(false);
    }
  };

  const isNew = (Date.now() - new Date(order.created_at).getTime()) < 300000; // 5 min

  return (
    <div
      className={`border rounded-lg bg-white transition-all ${isNew ? "border-orange-300 ring-1 ring-orange-200" : "border-neutral-200"}`}
      data-testid={`admin-order-${order.order_id}`}
    >
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {isNew && <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse flex-shrink-0" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium">#{order.order_id?.slice(-8)}</span>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">{date}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold">₹{order.total?.toLocaleString()}</p>
            <p className="text-xs text-neutral-400">{order.items?.length || 0} item(s)</p>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-neutral-100 pt-3">
              {/* Customer info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-neutral-50 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Customer</p>
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="h-3.5 w-3.5 text-neutral-400" />
                    <span>{order.shipping_address?.name || order.customer?.name || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Phone className="h-3.5 w-3.5 text-neutral-400" />
                    <span>{order.shipping_address?.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Mail className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="text-xs truncate">{order.customer?.email || "N/A"}</span>
                  </div>
                </div>
                <div className="bg-neutral-50 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Shipping Address</p>
                  <div className="flex items-start gap-1.5 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
                    <span>
                      {order.shipping_address?.address}, {order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pincode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium mb-2">Items</p>
                <div className="space-y-2">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-neutral-50 rounded-lg p-2">
                      {item.product_image && (
                        <img src={item.product_image} alt="" className="w-10 h-12 object-cover rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-neutral-400">
                          Qty: {item.quantity} | {item.size} | {item.color}
                        </p>
                      </div>
                      <span className="text-sm font-medium flex-shrink-0">₹{item.item_total?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking */}
              {(order.status === "confirmed" || order.status === "processing" || order.status === "shipped") && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-indigo-700 uppercase tracking-wider font-medium flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" /> Shipping & Tracking
                  </p>
                  {order.tracking_id ? (
                    <div className="text-sm">
                      <span className="text-neutral-500">Tracking ID: </span>
                      <span className="font-mono font-bold">{order.tracking_id}</span>
                      <span className="text-neutral-400 ml-2">({order.courier_name})</span>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      <Input value={trackingId} onChange={e => setTrackingId(e.target.value)}
                        placeholder="Tracking ID" className="flex-1 min-w-[140px] h-8 text-sm" data-testid="tracking-id-input" />
                      <Input value={courierName} onChange={e => setCourierName(e.target.value)}
                        placeholder="Courier name" className="w-40 h-8 text-sm" data-testid="courier-name-input" />
                      <Button size="sm" onClick={saveTracking} disabled={updatingTracking}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs" data-testid="save-tracking-btn">
                        <Truck className="h-3 w-3 mr-1" /> {updatingTracking ? "Saving..." : "Ship Now"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Status Actions */}
              <div className="flex gap-2 flex-wrap">
                {order.status === "pending" && (
                  <Button size="sm" onClick={() => updateStatus("confirmed")} disabled={updatingStatus}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs" data-testid="confirm-order-btn">
                    <Check className="h-3 w-3 mr-1" /> Confirm Order
                  </Button>
                )}
                {order.status === "confirmed" && (
                  <Button size="sm" onClick={() => updateStatus("processing")} disabled={updatingStatus}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs" data-testid="process-order-btn">
                    <Package className="h-3 w-3 mr-1" /> Mark Processing
                  </Button>
                )}
                {(order.status === "shipped") && (
                  <Button size="sm" onClick={() => updateStatus("delivered")} disabled={updatingStatus}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs" data-testid="deliver-order-btn">
                    <Check className="h-3 w-3 mr-1" /> Mark Delivered
                  </Button>
                )}
                {!["delivered", "cancelled"].includes(order.status) && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus("cancelled")} disabled={updatingStatus}
                    className="border-red-300 text-red-600 hover:bg-red-50 text-xs" data-testid="cancel-order-btn">
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ====== MAIN PANEL ======
export const AdminOrdersPanel = () => {
  const token = localStorage.getItem("pigma_admin_token");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderPopup, setNewOrderPopup] = useState([]);
  const lastCheckRef = useRef(new Date().toISOString());
  const knownOrderIds = useRef(new Set());

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/orders?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allOrders = res.data || [];
      setOrders(allOrders);

      // Track known order IDs on first load
      if (knownOrderIds.current.size === 0) {
        allOrders.forEach(o => knownOrderIds.current.add(o.order_id));
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token]);

  // Poll for new orders every 10 seconds
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/admin/orders/new-count?since=${lastCheckRef.current}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.count > 0) {
          const newOnes = (res.data.latest || []).filter(o => !knownOrderIds.current.has(o.order_id));
          if (newOnes.length > 0) {
            setNewOrderPopup(newOnes);
            if (soundEnabled) playNotificationSound();
            newOnes.forEach(o => knownOrderIds.current.add(o.order_id));
            fetchOrders();
          }
        }
        lastCheckRef.current = new Date().toISOString();
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [token, soundEnabled, fetchOrders]);

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    confirmed: orders.filter(o => o.status === "confirmed").length,
    shipped: orders.filter(o => o.status === "shipped").length,
    delivered: orders.filter(o => o.status === "delivered").length,
  };

  return (
    <div className="space-y-4" data-testid="admin-orders-panel">
      <NewOrderPopup orders={newOrderPopup} onDismiss={() => setNewOrderPopup([])} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Order Management</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`text-xs flex items-center gap-1 ${soundEnabled ? "text-green-600" : "text-neutral-400"}`}
            data-testid="toggle-sound-btn"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            Sound {soundEnabled ? "On" : "Off"}
          </button>
          {counts.pending > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              {counts.pending} new
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-lg overflow-x-auto" data-testid="order-filter-tabs">
        {[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "confirmed", label: "Confirmed" },
          { key: "shipped", label: "Shipped" },
          { key: "delivered", label: "Delivered" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 text-xs font-medium py-2 px-3 rounded-md transition-colors whitespace-nowrap ${
              filter === tab.key ? "bg-white shadow-sm text-black" : "text-neutral-500 hover:text-neutral-700"
            }`}
            data-testid={`order-tab-${tab.key}`}
          >
            {tab.label} <span className="ml-1 text-neutral-400">{counts[tab.key] || 0}</span>
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-sm">
          No {filter === "all" ? "" : filter} orders
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => (
            <OrderRow key={order.order_id} order={order} token={token} onRefresh={fetchOrders} />
          ))}
        </div>
      )}
    </div>
  );
};
