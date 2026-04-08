import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, BellRing, Volume2, VolumeX, Check, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";
import { useNavigate } from "react-router-dom";

const SOUND_COOLDOWN = 5000; // 5 seconds between sounds

// Generate notification sound using Web Audio API
const playNotificationSound = (() => {
  let lastPlayed = 0;
  return () => {
    const now = Date.now();
    if (now - lastPlayed < SOUND_COOLDOWN) return;
    lastPlayed = now;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Two-tone ring
      [880, 1100].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.3);
      });
    } catch {}
  };
})();

const TYPE_ICONS = {
  order: "🛒",
  issue: "🎫",
  promotion: "📢",
  credit: "💰",
  kyc: "📄",
  system: "⚙️",
};

const PRIORITY_COLORS = {
  high: "border-l-red-500 bg-red-500/5",
  medium: "border-l-amber-500 bg-amber-500/5",
  low: "border-l-neutral-500 bg-neutral-500/5",
};

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export const NotificationBell = ({ role, token }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [muted, setMuted] = useState(() => localStorage.getItem("pigma_mute_notif") === "true");
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);
  const bellRef = useRef(null);
  const seenIds = useRef(new Set());
  const navigate = useNavigate();
  const prefix = role === "admin" ? "admin" : "vendor";

  const headers = { Authorization: `Bearer ${token}` };

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/notifications/${prefix}/list?limit=20`, { headers });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
      // Track seen IDs
      (data.notifications || []).forEach(n => seenIds.current.add(n.notification_id));
    } catch {}
  }, [prefix, token]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll unread count every 30s as fallback
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API}/notifications/${prefix}/unread-count`, { headers });
        setUnreadCount(data.unread_count || 0);
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [prefix, token]);

  // WebSocket connection
  useEffect(() => {
    if (!token) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsBase = API.replace(/^https?:/, wsProtocol).replace(/\/api$/, '');
    const wsUrl = `${wsBase}/api/ws/notifications?token=${token}&role=${prefix}`;

    let ws;
    let reconnectTimer;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("WS connected for notifications");
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === "notification") {
              const n = msg.data;
              // Deduplicate
              if (seenIds.current.has(n.notification_id)) return;
              seenIds.current.add(n.notification_id);

              // Add to list
              setNotifications(prev => [n, ...prev].slice(0, 30));
              setUnreadCount(prev => prev + 1);

              // Sound for high priority
              if (n.priority === "high" && !muted) {
                playNotificationSound();
              }

              // Toast
              toast(n.title, {
                description: n.message,
                duration: 5000,
                action: n.redirect_url ? {
                  label: "View",
                  onClick: () => handleRedirect(n),
                } : undefined,
              });
            }
          } catch {}
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {}
    };

    connect();

    // Ping to keep alive
    const pingInterval = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send("ping");
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [token, prefix, muted]);

  // Handle redirect on notification click
  const handleRedirect = async (notif) => {
    // Mark as read
    if (!notif.is_read) {
      try {
        await axios.put(`${API}/notifications/${prefix}/read/${notif.notification_id}`, {}, { headers });
        setNotifications(prev => prev.map(n => n.notification_id === notif.notification_id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {}
    }

    setOpen(false);

    // Smart redirect
    const url = notif.redirect_url;
    if (url) {
      const base = role === "vendor" ? "/vendor" : "";
      navigate(`${base}${url}`);
    }
  };

  // Mark all as read
  const markAllRead = async () => {
    try {
      await axios.put(`${API}/notifications/${prefix}/read-all`, {}, { headers });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {}
  };

  // Toggle mute
  const toggleMute = () => {
    const newVal = !muted;
    setMuted(newVal);
    localStorage.setItem("pigma_mute_notif", String(newVal));
    toast(newVal ? "Notifications muted" : "Notifications unmuted");
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={bellRef} data-testid="notification-bell">
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-lg hover:bg-neutral-800 transition-colors"
        data-testid="notification-bell-btn"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-gold animate-pulse" />
        ) : (
          <Bell className="h-5 w-5 text-neutral-400" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" data-testid="unread-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[500px] bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-[200] overflow-hidden" data-testid="notification-dropdown">
          {/* Header */}
          <div className="sticky top-0 bg-neutral-900 border-b border-neutral-700 px-4 py-3 flex items-center justify-between z-10">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-1.5">
              <button onClick={toggleMute} className="p-1.5 rounded hover:bg-neutral-800 transition-colors" title={muted ? "Unmute" : "Mute"} data-testid="mute-toggle">
                {muted ? <VolumeX className="h-3.5 w-3.5 text-red-400" /> : <Volume2 className="h-3.5 w-3.5 text-neutral-400" />}
              </button>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-gold hover:underline flex items-center gap-1" data-testid="mark-all-read">
                  <CheckCheck className="h-3 w-3" /> Read all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[420px]">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 text-sm" data-testid="no-notifications">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.notification_id}
                  onClick={() => handleRedirect(n)}
                  className={`w-full text-left px-4 py-3 border-b border-neutral-800 border-l-2 hover:bg-neutral-800/50 transition-colors ${
                    n.is_read ? "border-l-transparent opacity-60" : PRIORITY_COLORS[n.priority] || PRIORITY_COLORS.medium
                  }`}
                  data-testid={`notification-item-${n.notification_id}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base mt-0.5 flex-shrink-0">{TYPE_ICONS[n.type] || "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-white truncate">{n.title}</span>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-neutral-500">{timeAgo(n.created_at)}</span>
                        {n.priority === "high" && <span className="text-[8px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded font-bold">URGENT</span>}
                        {n.redirect_url && <ExternalLink className="h-2.5 w-2.5 text-neutral-600" />}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
