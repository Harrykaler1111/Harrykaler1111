import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag, CreditCard, CheckCircle, Package, Truck,
  MapPin, XCircle, Clock, FileText
} from "lucide-react";
import { API } from "@/App";
import axios from "axios";

const EVENT_ICONS = {
  order_placed: ShoppingBag,
  payment_verified: CreditCard,
  status_change: CheckCircle,
  tracking_added: Truck,
};

const STATUS_ICONS = {
  confirmed: CheckCircle,
  processing: Package,
  shipped: Truck,
  delivered: MapPin,
  cancelled: XCircle,
};

const EVENT_COLORS = {
  order_placed: "bg-blue-500",
  payment_verified: "bg-green-500",
  tracking_added: "bg-indigo-500",
  status_change: "bg-purple-500",
};

const STATUS_COLORS = {
  confirmed: "bg-blue-500",
  processing: "bg-purple-500",
  shipped: "bg-indigo-500",
  delivered: "bg-green-600",
  cancelled: "bg-red-500",
};

function getEventIcon(event) {
  const newStatus = event.meta?.new_status;
  if (event.event_type === "status_change" && newStatus && STATUS_ICONS[newStatus]) {
    return STATUS_ICONS[newStatus];
  }
  return EVENT_ICONS[event.event_type] || Clock;
}

function getEventColor(event) {
  const newStatus = event.meta?.new_status;
  if (event.event_type === "status_change" && newStatus && STATUS_COLORS[newStatus]) {
    return STATUS_COLORS[newStatus];
  }
  return EVENT_COLORS[event.event_type] || "bg-neutral-400";
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export const OrderTimeline = ({ orderId, token, isAdmin = false }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !token) return;
    const endpoint = isAdmin
      ? `${API}/admin/orders/${orderId}/timeline`
      : `${API}/orders/${orderId}/timeline`;

    axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setEvents(r.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [orderId, token, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-neutral-400">
        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-neutral-300" />
        Loading timeline...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-4 text-xs text-neutral-400 flex items-center gap-2">
        <FileText className="h-3.5 w-3.5" /> No timeline events yet
      </div>
    );
  }

  return (
    <div className="relative" data-testid="order-timeline">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-neutral-200" />

      <div className="space-y-0">
        {events.map((event, i) => {
          const Icon = getEventIcon(event);
          const color = getEventColor(event);
          const isLast = i === events.length - 1;

          return (
            <motion.div
              key={event.event_id || i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative flex gap-3 pb-4"
              data-testid={`timeline-event-${event.event_type}`}
            >
              {/* Icon dot */}
              <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full ${color} flex items-center justify-center shadow-sm ${isLast ? "ring-2 ring-offset-2 ring-current" : ""}`}>
                <Icon className="h-3 w-3 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 -mt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-800 truncate">
                    {event.title}
                  </p>
                  <span className="text-[10px] text-neutral-400 whitespace-nowrap flex-shrink-0">
                    {formatTime(event.created_at)}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">{event.description}</p>
                {/* Admin view: show actor info */}
                {isAdmin && event.actor_type === "admin" && event.actor_name && (
                  <p className="text-[10px] text-neutral-400 mt-1">
                    by {event.actor_name}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
