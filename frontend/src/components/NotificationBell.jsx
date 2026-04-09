import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, BellRing, Volume2, VolumeX, Check, CheckCheck, ExternalLink, BellPlus, Settings, ShoppingCart, Ticket, Megaphone, Coins, FileText, Cog, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";
import { useNavigate } from "react-router-dom";

const SOUND_COOLDOWN = 5000; // 5 seconds between sounds

// Browser notification helper
const showBrowserNotification = (title, body, onClick) => {
  if (Notification.permission !== "granted") return;
  try {
    const notif = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `pigma-${Date.now()}`,
      requireInteraction: false,
    });
    notif.onclick = () => {
      window.focus();
      if (onClick) onClick();
      notif.close();
    };
    // Auto close after 8s
    setTimeout(() => notif.close(), 8000);
  } catch {}
};

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
  const [pushPermission, setPushPermission] = useState(() => typeof Notification !== "undefined" ? Notification.permission : "denied");
  const [showPermPrompt, setShowPermPrompt] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const wsRef = useRef(null);
  const bellRef = useRef(null);
  const seenIds = useRef(new Set());
  const navigate = useNavigate();
  const prefix = role === "admin" ? "admin" : "vendor";

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Check if we should show permission prompt
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      const dismissed = localStorage.getItem("pigma_push_dismissed");
      if (!dismissed) {
        // Show prompt after 3 seconds
        const timer = setTimeout(() => setShowPermPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const requestPushPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPushPermission(result);
      setShowPermPrompt(false);
      if (result === "granted") {
        toast.success("Push notifications enabled!");
      }
    } catch {
      setShowPermPrompt(false);
    }
  };

  const dismissPushPrompt = () => {
    setShowPermPrompt(false);
    localStorage.setItem("pigma_push_dismissed", "true");
  };

  // Notification Preferences
  const fetchPrefs = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/notifications/${prefix}/preferences`, { headers });
      setPrefs(data);
    } catch {}
  }, [prefix, token]);

  const togglePref = async (key) => {
    if (!prefs) return;
    const newVal = !prefs[key];
    setPrefs(prev => ({ ...prev, [key]: newVal }));
    try {
      await axios.put(`${API}/notifications/${prefix}/preferences`, { [key]: newVal }, { headers });
    } catch {
      setPrefs(prev => ({ ...prev, [key]: !newVal })); // rollback
      toast.error("Failed to update preference");
    }
  };

  const openPrefs = () => {
    setShowPrefs(true);
    if (!prefs) fetchPrefs();
  };

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/notifications/${prefix}/list?limit=20`, { headers });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
      // Track seen IDs
      (data.notifications || []).forEach(n => seenIds.current.add(n.notification_id));
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [prefix, token]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll unread count every 30s as fallback
  useEffect(() => {
    if (!token) return;
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

              // Sound — respect server-side preference
              if (n.play_sound !== false && !muted) {
                playNotificationSound();
              }

              // Browser push notification when tab is not focused
              if (!document.hasFocus() && !muted && pushPermission === "granted") {
                showBrowserNotification(
                  n.title,
                  n.message,
                  () => handleRedirect(n)
                );
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
    // Optimistic update for is_read
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => n.notification_id === notif.notification_id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      try {
        await axios.put(`${API}/notifications/${prefix}/read/${notif.notification_id}`, {}, { headers });
      } catch (err) {
        // Rollback on failure
        setNotifications(prev => prev.map(n => n.notification_id === notif.notification_id ? { ...n, is_read: false } : n));
        setUnreadCount(prev => prev + 1);
        toast.error("Failed to mark notification as read");
      }
    }

    setOpen(false);

    let url = notif.redirect_url;

    // Normalize old-style URLs: /admin?tab=orders&id=xxx → /admin/orders
    if (url && url.includes("?tab=")) {
      try {
        const parsed = new URL(url, window.location.origin);
        const tab = parsed.searchParams.get("tab");
        const basePath = parsed.pathname; // /admin
        if (tab) {
          url = `${basePath}/${tab}`;
        }
      } catch {
        // URL parsing failed, use as-is
      }
    }

    if (url) {
      navigate(url);
    } else {
      // Fallback: navigate to dashboard section based on type
      const fallbackRoutes = {
        order: role === "vendor" ? "/vendor/orders" : "/admin/orders",
        issue: role === "vendor" ? "/vendor/support" : "/admin/returns",
        promotion: role === "vendor" ? "/vendor/promotions" : "/admin/monetization",
        credit: role === "vendor" ? "/vendor/wallet" : "/admin/monetization",
        kyc: role === "vendor" ? "/vendor/kyc" : "/admin/vendors",
        system: role === "vendor" ? "/vendor" : "/admin",
      };
      const fallback = fallbackRoutes[notif.type] || (role === "vendor" ? "/vendor" : "/admin");
      navigate(fallback);
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

  // Check if quiet hours currently active
  const isQuietNow = (() => {
    if (!prefs?.quiet_hours_enabled) return false;
    const now = new Date();
    const current = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const start = prefs.quiet_hours_start || "22:00";
    const end = prefs.quiet_hours_end || "08:00";
    if (start > end) return current >= start || current < end;
    return current >= start && current < end;
  })();

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
        {isQuietNow && (
          <span className="absolute -bottom-0.5 -right-0.5 bg-neutral-700 rounded-full w-3.5 h-3.5 flex items-center justify-center border border-neutral-600" title="Quiet Hours active" data-testid="quiet-indicator">
            <VolumeX className="h-2 w-2 text-neutral-400" />
          </span>
        )}
      </button>

      {/* Push Permission Prompt */}
      {showPermPrompt && (
        <div className="absolute right-0 top-full mt-2 w-[320px] bg-neutral-900 border border-gold/30 rounded-xl shadow-2xl z-[200] p-4" data-testid="push-permission-prompt">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
              <BellPlus className="h-4 w-4 text-gold" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-1">Enable Push Notifications</p>
              <p className="text-[11px] text-neutral-400 mb-3">Get instant alerts for new orders, tickets, and important updates — even when this tab is in the background.</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={requestPushPermission} className="bg-gold text-black hover:bg-gold/90 text-xs h-7 px-3" data-testid="enable-push-btn">
                  Enable
                </Button>
                <Button size="sm" variant="ghost" onClick={dismissPushPrompt} className="text-neutral-500 text-xs h-7 px-3" data-testid="dismiss-push-btn">
                  Not now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[600px] bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-[200] overflow-hidden" data-testid="notification-dropdown">
          {/* Header */}
          <div className="sticky top-0 bg-neutral-900 border-b border-neutral-700 px-4 py-3 flex items-center justify-between z-10">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-1.5">
              {pushPermission !== "granted" && typeof Notification !== "undefined" && (
                <button onClick={requestPushPermission} className="p-1.5 rounded hover:bg-neutral-800 transition-colors" title="Enable browser notifications" data-testid="push-enable-btn">
                  <BellPlus className="h-3.5 w-3.5 text-amber-400" />
                </button>
              )}
              <button onClick={toggleMute} className="p-1.5 rounded hover:bg-neutral-800 transition-colors" title={muted ? "Unmute" : "Mute"} data-testid="mute-toggle">
                {muted ? <VolumeX className="h-3.5 w-3.5 text-red-400" /> : <Volume2 className="h-3.5 w-3.5 text-neutral-400" />}
              </button>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-gold hover:underline flex items-center gap-1" data-testid="mark-all-read">
                  <CheckCheck className="h-3 w-3" /> Read all
                </button>
              )}
              <button onClick={openPrefs} className={`p-1.5 rounded hover:bg-neutral-800 transition-colors ${showPrefs ? "bg-neutral-800" : ""}`} title="Preferences" data-testid="notif-prefs-btn">
                <Settings className="h-3.5 w-3.5 text-neutral-400" />
              </button>
            </div>
          </div>

          {/* Preferences Panel */}
          {showPrefs && (
            <div className="border-b border-neutral-700 px-4 py-3 bg-neutral-800/50 max-h-[350px] overflow-y-auto" data-testid="notif-prefs-panel">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white">Notification Preferences</span>
                <button onClick={() => setShowPrefs(false)} className="text-[10px] text-neutral-500 hover:text-white">Done</button>
              </div>
              {prefs ? (
                <div className="space-y-1.5">
                  <p className="text-[9px] text-neutral-500 uppercase tracking-wider mb-1">Event Types</p>
                  {[
                    { key: "order", label: "Orders", icon: ShoppingCart },
                    { key: "issue", label: "Issues / Tickets", icon: Ticket },
                    { key: "promotion", label: "Promotions", icon: Megaphone },
                    { key: "credit", label: "Credits", icon: Coins },
                    { key: "kyc", label: "KYC Updates", icon: FileText },
                    { key: "system", label: "System Alerts", icon: Cog },
                  ].map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => togglePref(key)}
                      className="w-full flex items-center justify-between py-1.5 px-2 rounded hover:bg-neutral-700/50 transition-colors"
                      data-testid={`pref-toggle-${key}`}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-3 w-3 text-neutral-500" />
                        <span className="text-xs text-neutral-300">{label}</span>
                      </div>
                      <div className={`w-7 h-4 rounded-full transition-colors flex items-center ${prefs[key] ? "bg-gold justify-end" : "bg-neutral-600 justify-start"}`}>
                        <div className="w-3 h-3 rounded-full bg-white mx-0.5 shadow-sm" />
                      </div>
                    </button>
                  ))}
                  <p className="text-[9px] text-neutral-500 uppercase tracking-wider mt-3 mb-1">Sound</p>
                  {[
                    { key: "sound_high", label: "High priority ring" },
                    { key: "sound_medium", label: "Medium priority ring" },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => togglePref(key)}
                      className="w-full flex items-center justify-between py-1.5 px-2 rounded hover:bg-neutral-700/50 transition-colors"
                      data-testid={`pref-toggle-${key}`}>
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-3 w-3 text-neutral-500" />
                        <span className="text-xs text-neutral-300">{label}</span>
                      </div>
                      <div className={`w-7 h-4 rounded-full transition-colors flex items-center ${prefs[key] ? "bg-gold justify-end" : "bg-neutral-600 justify-start"}`}>
                        <div className="w-3 h-3 rounded-full bg-white mx-0.5 shadow-sm" />
                      </div>
                    </button>
                  ))}

                  <p className="text-[9px] text-neutral-500 uppercase tracking-wider mt-3 mb-1">Quiet Hours</p>
                  <button onClick={() => togglePref("quiet_hours_enabled")}
                    className="w-full flex items-center justify-between py-1.5 px-2 rounded hover:bg-neutral-700/50 transition-colors"
                    data-testid="pref-toggle-quiet_hours_enabled">
                    <div className="flex items-center gap-2">
                      <VolumeX className="h-3 w-3 text-neutral-500" />
                      <span className="text-xs text-neutral-300">Enable Quiet Hours</span>
                    </div>
                    <div className={`w-7 h-4 rounded-full transition-colors flex items-center ${prefs.quiet_hours_enabled ? "bg-gold justify-end" : "bg-neutral-600 justify-start"}`}>
                      <div className="w-3 h-3 rounded-full bg-white mx-0.5 shadow-sm" />
                    </div>
                  </button>
                  {prefs.quiet_hours_enabled && (
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <input type="time" value={prefs.quiet_hours_start || "22:00"}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setPrefs(p => ({...p, quiet_hours_start: val}));
                          try { await axios.put(`${API}/notifications/${prefix}/preferences`, { quiet_hours_start: val }, { headers }); } catch {}
                        }}
                        className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs text-white w-24"
                        data-testid="quiet-start" />
                      <span className="text-[10px] text-neutral-500">to</span>
                      <input type="time" value={prefs.quiet_hours_end || "08:00"}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setPrefs(p => ({...p, quiet_hours_end: val}));
                          try { await axios.put(`${API}/notifications/${prefix}/preferences`, { quiet_hours_end: val }, { headers }); } catch {}
                        }}
                        className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-xs text-white w-24"
                        data-testid="quiet-end" />
                    </div>
                  )}

                  <p className="text-[9px] text-neutral-500 uppercase tracking-wider mt-3 mb-1">Email Notifications</p>
                  {[
                    { key: "email_order", label: "Order emails" },
                    { key: "email_return", label: "Return & refund emails" },
                    { key: "email_promotion", label: "Promotional emails" },
                    { key: "email_support", label: "Support / ticket emails" },
                    { key: "email_kyc", label: "KYC status emails" },
                    { key: "email_credit", label: "Credit / wallet emails" },
                    { key: "email_digest", label: "Weekly digest" },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => togglePref(key)}
                      className="w-full flex items-center justify-between py-1.5 px-2 rounded hover:bg-neutral-700/50 transition-colors"
                      data-testid={`pref-toggle-${key}`}>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-neutral-500" />
                        <span className="text-xs text-neutral-300">{label}</span>
                      </div>
                      <div className={`w-7 h-4 rounded-full transition-colors flex items-center ${prefs[key] ? "bg-gold justify-end" : "bg-neutral-600 justify-start"}`}>
                        <div className="w-3 h-3 rounded-full bg-white mx-0.5 shadow-sm" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3"><div className="animate-spin rounded-full h-4 w-4 border-2 border-gold/30 border-t-gold mx-auto" /></div>
              )}
            </div>
          )}

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

          {/* View All Link */}
          <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-700 px-4 py-2.5">
            <button
              onClick={() => { setOpen(false); navigate(role === "vendor" ? "/vendor/notifications" : "/admin/notifications"); }}
              className="w-full text-center text-xs text-gold hover:text-yellow-400 font-medium transition-colors"
              data-testid="view-all-notifications"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
