import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Clock, Truck, Check, ChevronDown, ChevronUp, Eye,
  MapPin, Phone, Mail, User, AlertCircle, Volume2, VolumeX, Bell,
  Search, Calendar, Filter, RefreshCw, X, PhoneCall, ExternalLink,
  CreditCard, FileText, Inbox
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API } from "@/App";
import { OrderTimeline } from "@/components/OrderTimeline";
import { toast } from "sonner";
import axios from "axios";

// ─── Notification Sounds ───

const playOrderSound = (isHighValue = false) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (isHighValue) {
      // Shopify "cha-ching" style for high-value orders
      const notes = [
        { freq: 1318, start: 0, dur: 0.12 },
        { freq: 1568, start: 0.12, dur: 0.12 },
        { freq: 2093, start: 0.24, dur: 0.3 },
      ];
      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.35, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      });
    } else {
      // Standard two-tone ding
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
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
    }
  } catch (e) {
    console.warn("Sound error:", e);
  }
};

// ─── Status Config ───

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Check },
  processing: { label: "Processing", color: "bg-purple-50 text-purple-700 border-purple-200", icon: Package },
  shipped: { label: "Shipped", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-50 text-green-700 border-green-200", icon: Check },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
  payment_failed: { label: "Pay Failed", color: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
  cod_confirmed: { label: "COD", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CreditCard },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.color}`} data-testid={`status-badge-${status}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
};

const PaymentBadge = ({ method, status }) => {
  const isPaid = status === "paid";
  const isCod = method === "cod";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
      isPaid ? "bg-green-900/40 text-green-400 border border-green-700/40" :
      isCod ? "bg-amber-900/40 text-amber-400 border border-amber-700/40" :
      "bg-neutral-800 text-neutral-400 border border-neutral-700"
    }`}>
      <CreditCard className="h-3 w-3" />
      {method?.toUpperCase()} {isPaid ? "Paid" : status}
    </span>
  );
};

// ─── New Order Popup ───

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
                #{o.order_id?.slice(-6)} — Rs.{o.total?.toLocaleString()}
              </p>
            ))}
          </div>
          <button onClick={onDismiss} className="text-white/60 hover:text-white text-xs" data-testid="dismiss-popup-btn">Dismiss</button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Order Detail Row ───

const OrderRow = ({ order, token, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [trackingId, setTrackingId] = useState(order.tracking_id || "");
  const [courierName, setCourierName] = useState(order.courier_name || "Standard Shipping");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingTracking, setUpdatingTracking] = useState(false);
  const [emailLogs, setEmailLogs] = useState(null);

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

  const fetchEmailLogs = async () => {
    try {
      const res = await axios.get(`${API}/email-logs/order/${order.order_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmailLogs(res.data.logs || []);
    } catch { setEmailLogs([]); }
  };

  const isNew = (Date.now() - new Date(order.created_at).getTime()) < 300000;
  const customerPhone = order.shipping_address?.phone;

  return (
    <div
      className={`border rounded-lg bg-neutral-800/50 transition-all ${isNew ? "border-orange-500/40 ring-1 ring-orange-500/20" : "border-neutral-700"}`}
      data-testid={`admin-order-${order.order_id}`}
    >
      {/* Summary row */}
      <button
        onClick={() => { setExpanded(!expanded); if (!expanded && emailLogs === null) fetchEmailLogs(); }}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-neutral-700/30 transition-colors"
        data-testid={`order-row-${order.order_id}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isNew && <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse flex-shrink-0" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-medium text-white">#{order.order_id?.slice(-8)}</span>
              <StatusBadge status={order.status} />
              <PaymentBadge method={order.payment_method} status={order.payment_status} />
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-xs text-neutral-400">{date}</p>
              {order.shipping_address?.name && (
                <p className="text-xs text-neutral-500">
                  <User className="h-3 w-3 inline mr-0.5" />{order.shipping_address.name}
                </p>
              )}
              {order.vendor_name && (
                <p className="text-xs text-neutral-500">
                  Vendor: {order.vendor_name}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold text-white">Rs.{order.total?.toLocaleString()}</p>
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
            <div className="px-4 pb-4 space-y-4 border-t border-neutral-700 pt-3">
              {/* Customer info + Shipping */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-neutral-900/50 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Customer</p>
                  <div className="flex items-center gap-1.5 text-sm text-neutral-200">
                    <User className="h-3.5 w-3.5 text-neutral-400" />
                    <span>{order.shipping_address?.name || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-neutral-200">
                    <Phone className="h-3.5 w-3.5 text-neutral-400" />
                    <span>{customerPhone || "N/A"}</span>
                    {customerPhone && (
                      <a href={`tel:${customerPhone}`} className="ml-2 text-green-500 hover:text-green-400" title="Click to Call" data-testid="click-to-call">
                        <PhoneCall className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-neutral-200">
                    <Mail className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="text-xs truncate">{order.customer?.email || order.shipping_address?.email || "N/A"}</span>
                  </div>
                </div>
                <div className="bg-neutral-900/50 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Shipping Address</p>
                  <div className="flex items-start gap-1.5 text-sm text-neutral-200">
                    <MapPin className="h-3.5 w-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
                    <span>
                      {order.shipping_address?.address}, {order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pincode}
                    </span>
                  </div>
                  {order.razorpay_payment_id && (
                    <div className="mt-2">
                      <p className="text-xs text-neutral-500">Txn ID: <span className="font-mono text-neutral-400">{order.razorpay_payment_id}</span></p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium mb-2">Items</p>
                <div className="space-y-2">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-neutral-900/50 rounded-lg p-2">
                      {item.product_image && (
                        <img src={item.product_image} alt="" className="w-10 h-12 object-cover rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-white">{item.product_name}</p>
                        <p className="text-xs text-neutral-400">
                          Qty: {item.quantity} | {item.size} | {item.color}
                        </p>
                      </div>
                      <span className="text-sm font-medium flex-shrink-0 text-white">Rs.{item.item_total?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commission breakdown (if settled) */}
              {order.settlement_status === "settled" && (
                <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-3">
                  <p className="text-xs text-green-400 uppercase tracking-wider font-medium mb-2">Settlement</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-neutral-400">Platform</p>
                      <p className="text-sm font-bold text-green-400">Rs.{order.platform_commission?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Vendor</p>
                      <p className="text-sm font-bold text-blue-400">Rs.{order.vendor_amount?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Influencer</p>
                      <p className="text-sm font-bold text-purple-400">Rs.{order.influencer_commission?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tracking */}
              {["confirmed", "processing", "shipped"].includes(order.status) && (
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-indigo-400 uppercase tracking-wider font-medium flex items-center gap-1">
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

              {/* Email Delivery Status */}
              {emailLogs && emailLogs.length > 0 && (
                <div className="bg-neutral-900/50 rounded-lg p-3">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium mb-2 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email Notifications
                  </p>
                  <div className="space-y-1">
                    {emailLogs.map((log, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400 capitalize">{log.recipient_type}: {log.recipient_email}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          log.status === "sent" ? "bg-green-900/40 text-green-400" :
                          log.status === "failed" ? "bg-red-900/40 text-red-400" :
                          log.status === "skipped" ? "bg-amber-900/40 text-amber-400" :
                          "bg-neutral-700 text-neutral-400"
                        }`} data-testid={`email-status-${log.recipient_type}`}>
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-neutral-900/50 rounded-lg p-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium mb-2">Activity Log</p>
                <OrderTimeline orderId={order.order_id} token={token} isAdmin={true} />
              </div>

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
                {order.status === "shipped" && (
                  <Button size="sm" onClick={() => updateStatus("delivered")} disabled={updatingStatus}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs" data-testid="deliver-order-btn">
                    <Check className="h-3 w-3 mr-1" /> Mark Delivered
                  </Button>
                )}
                {!["delivered", "cancelled"].includes(order.status) && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus("cancelled")} disabled={updatingStatus}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs" data-testid="cancel-order-btn">
                    Cancel
                  </Button>
                )}
                {customerPhone && (
                  <a href={`tel:${customerPhone}`}>
                    <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10 text-xs" data-testid="call-customer-btn">
                      <PhoneCall className="h-3 w-3 mr-1" /> Call Customer
                    </Button>
                  </a>
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
  const [payFilter, setPayFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderPopup, setNewOrderPopup] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const lastCheckRef = useRef(new Date().toISOString());
  const knownOrderIds = useRef(new Set());
  const searchTimeout = useRef(null);
  const wsRef = useRef(null);

  const fetchOrders = useCallback(async (params = {}) => {
    try {
      setSearching(true);
      const query = new URLSearchParams({
        limit: "100",
        ...(searchQuery && { q: searchQuery }),
        ...(filter !== "all" && { status: filter }),
        ...(payFilter !== "all" && { payment_status: payFilter }),
        ...(timeRange !== "all" && { time_range: timeRange }),
        ...params,
      });
      const res = await axios.get(`${API}/admin/orders/search?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      setOrders(data.orders || []);
      setTotalResults(data.total || 0);
      setTotalValue(data.total_value || 0);

      if (knownOrderIds.current.size === 0) {
        (data.orders || []).forEach(o => knownOrderIds.current.add(o.order_id));
      }
    } catch {
      // Fallback to basic endpoint
      try {
        const res = await axios.get(`${API}/admin/orders?limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(res.data || []);
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [token, searchQuery, filter, payFilter, timeRange]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchOrders();
    }, searchQuery ? 400 : 0);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery, filter, payFilter, timeRange, fetchOrders]);

  // WebSocket for real-time + fallback polling
  useEffect(() => {
    let pollInterval;

    const setupWs = () => {
      try {
        const wsUrl = API.replace("https://", "wss://").replace("http://", "ws://");
        const ws = new WebSocket(`${wsUrl}/ws/notifications?token=${token}&role=admin`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === "notification" && data.data?.type === "order") {
              const orderData = { order_id: data.data.reference_id, total: 0 };
              // Extract amount from message
              const match = data.data.message?.match(/Rs\.([\d,]+)/);
              if (match) orderData.total = parseInt(match[1].replace(/,/g, ""));

              if (!knownOrderIds.current.has(orderData.order_id)) {
                knownOrderIds.current.add(orderData.order_id);
                setNewOrderPopup(prev => [...prev, orderData]);
                if (soundEnabled) playOrderSound(orderData.total >= 5000);
                fetchOrders();
              }
            }
          } catch {}
        };

        ws.onclose = () => {
          // Fallback to polling
          pollInterval = setInterval(async () => {
            try {
              const res = await axios.get(`${API}/admin/orders/new-count?since=${lastCheckRef.current}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (res.data.count > 0) {
                const newOnes = (res.data.latest || []).filter(o => !knownOrderIds.current.has(o.order_id));
                if (newOnes.length > 0) {
                  setNewOrderPopup(newOnes);
                  const highValue = newOnes.some(o => (o.total || 0) >= 5000);
                  if (soundEnabled) playOrderSound(highValue);
                  newOnes.forEach(o => knownOrderIds.current.add(o.order_id));
                  fetchOrders();
                }
              }
              lastCheckRef.current = new Date().toISOString();
            } catch {}
          }, 10000);
        };
      } catch {
        // WS not available, use polling only
        pollInterval = setInterval(async () => {
          try {
            const res = await axios.get(`${API}/admin/orders/new-count?since=${lastCheckRef.current}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.count > 0) {
              const newOnes = (res.data.latest || []).filter(o => !knownOrderIds.current.has(o.order_id));
              if (newOnes.length > 0) {
                setNewOrderPopup(newOnes);
                if (soundEnabled) playOrderSound(false);
                newOnes.forEach(o => knownOrderIds.current.add(o.order_id));
                fetchOrders();
              }
            }
            lastCheckRef.current = new Date().toISOString();
          } catch {}
        }, 10000);
      }
    };

    setupWs();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [token, soundEnabled, fetchOrders]);

  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending" || o.status === "cod_confirmed").length,
    confirmed: orders.filter(o => o.status === "confirmed").length,
    shipped: orders.filter(o => o.status === "shipped").length,
    delivered: orders.filter(o => o.status === "delivered").length,
    cancelled: orders.filter(o => o.status === "cancelled").length,
  };

  return (
    <div className="space-y-4" data-testid="admin-orders-panel">
      <NewOrderPopup orders={newOrderPopup} onDismiss={() => setNewOrderPopup([])} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-white" data-testid="orders-panel-title">Order Management</h2>
          <p className="text-xs text-neutral-500">
            {totalResults} orders {totalValue > 0 && `| Total: Rs.${totalValue.toLocaleString()}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`text-xs flex items-center gap-1 ${soundEnabled ? "text-green-500" : "text-neutral-500"}`}
            data-testid="toggle-sound-btn"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            Sound {soundEnabled ? "On" : "Off"}
          </button>
          <Button size="sm" variant="ghost" onClick={() => fetchOrders()} className="text-xs text-neutral-400 hover:text-white h-7" data-testid="refresh-orders-btn">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${searching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {counts.pending > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse" data-testid="pending-badge">
              {counts.pending} new
            </span>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative" data-testid="order-search-bar">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by Order ID, Customer Name, Phone, User ID..."
          className="pl-10 pr-10 h-10 bg-neutral-800/80 border-neutral-700 text-sm"
          data-testid="order-search-input"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Row: Status + Payment + Time */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Status tabs */}
        <div className="flex gap-1 bg-neutral-800 p-1 rounded-lg overflow-x-auto flex-1" data-testid="order-filter-tabs">
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "confirmed", label: "Confirmed" },
            { key: "shipped", label: "Shipped" },
            { key: "delivered", label: "Delivered" },
            { key: "cancelled", label: "Cancelled" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-colors whitespace-nowrap ${
                filter === tab.key ? "bg-neutral-700 shadow-sm text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
              data-testid={`order-tab-${tab.key}`}
            >
              {tab.label} <span className="text-neutral-500">{counts[tab.key] || 0}</span>
            </button>
          ))}
        </div>

        {/* Time filter */}
        <div className="flex gap-1 bg-neutral-800 p-1 rounded-lg" data-testid="time-filter">
          {[
            { key: "all", label: "All Time" },
            { key: "today", label: "Today" },
            { key: "7d", label: "7 Days" },
            { key: "30d", label: "30 Days" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setTimeRange(tab.key)}
              className={`text-xs font-medium py-1.5 px-3 rounded-md transition-colors whitespace-nowrap ${
                timeRange === tab.key ? "bg-neutral-700 shadow-sm text-white" : "text-neutral-400 hover:text-neutral-200"
              }`}
              data-testid={`time-tab-${tab.key}`}
            >
              {tab.key === "all" ? <Calendar className="h-3 w-3 inline mr-1" /> : null}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Payment filter */}
        <select
          value={payFilter}
          onChange={e => setPayFilter(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs rounded-lg px-3 py-1.5"
          data-testid="payment-filter"
        >
          <option value="all">All Payments</option>
          <option value="paid">Paid</option>
          <option value="pending">Payment Pending</option>
          <option value="cod">COD</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C9A050] mx-auto" />
          <p className="text-xs text-neutral-500 mt-3">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12" data-testid="no-orders">
          <Inbox className="h-12 w-12 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">
            {searchQuery ? `No orders found for "${searchQuery}"` : "No orders yet"}
          </p>
          {searchQuery && (
            <Button size="sm" variant="ghost" onClick={() => setSearchQuery("")} className="mt-2 text-xs text-neutral-400">
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <OrderRow key={order.order_id} order={order} token={token} onRefresh={fetchOrders} />
          ))}
        </div>
      )}
    </div>
  );
};
