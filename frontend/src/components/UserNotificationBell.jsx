import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Package, Truck, Check, AlertCircle, MessageSquare, Tag, X, Settings, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API, useAuth } from "@/App";
import axios from "axios";
import { toast } from "sonner";

const TYPE_CONFIG = {
  order: { icon: Package, color: "text-blue-400", bg: "bg-blue-500/10" },
  issue: { icon: MessageSquare, color: "text-amber-400", bg: "bg-amber-500/10" },
  promotion: { icon: Tag, color: "text-green-400", bg: "bg-green-500/10" },
  system: { icon: Bell, color: "text-neutral-400", bg: "bg-neutral-500/10" },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export const UserNotificationBell = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const bellRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const openPrefs = async () => {
    setShowPrefs(p => !p);
    if (!prefs) {
      try {
        const { data } = await axios.get(`${API}/notifications/user/preferences`, { headers });
        setPrefs(data);
      } catch {}
    }
  };

  const togglePref = async (key) => {
    const newVal = !prefs[key];
    setPrefs(p => ({ ...p, [key]: newVal }));
    try {
      await axios.put(`${API}/notifications/user/preferences`, { [key]: newVal }, { headers });
    } catch {
      setPrefs(p => ({ ...p, [key]: !newVal }));
      toast.error("Failed to update preference");
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/notifications/user/list?limit=20`, { headers });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error("Failed to fetch user notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/notifications/user/unread-count`, { headers });
      setUnreadCount(res.data.unread_count || 0);
    } catch {}
  }, [token]);

  // Poll unread count every 15s
  useEffect(() => {
    if (!token) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [token, fetchUnreadCount]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = async (notif) => {
    // Optimistic mark as read
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => n.notification_id === notif.notification_id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      try {
        await axios.put(`${API}/notifications/user/read/${notif.notification_id}`, {}, { headers });
      } catch {
        // Rollback on failure
        setNotifications(prev => prev.map(n => n.notification_id === notif.notification_id ? { ...n, is_read: false } : n));
        setUnreadCount(prev => prev + 1);
      }
    }
    setOpen(false);

    // Navigate
    const url = notif.redirect_url;
    if (url) {
      navigate(url);
    } else {
      const fallback = { order: "/orders", issue: "/support", promotion: "/" };
      navigate(fallback[notif.type] || "/");
    }
  };

  const markAllRead = async () => {
    const prevNotifications = notifications;
    const prevCount = unreadCount;
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await axios.put(`${API}/notifications/user/read-all`, {}, { headers });
    } catch {
      // Rollback
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
    }
  };

  // Don't render for guests
  if (!user || !token) return null;

  return (
    <div ref={bellRef} className="relative" data-testid="user-notification-bell">
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-2 text-white hover:text-[#C9A050] transition-colors"
        data-testid="user-notification-bell-btn"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1" data-testid="user-unread-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 bg-black/40 z-[199] sm:hidden" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-3 top-16 max-h-[80vh] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-h-[auto] bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl shadow-black/50 z-[200] overflow-hidden"
            data-testid="user-notification-dropdown"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-[#C9A050] hover:underline" data-testid="mark-all-read-btn">
                    Mark all read
                  </button>
                )}
                <button onClick={openPrefs} className={`p-1 rounded hover:bg-neutral-800 transition-colors ${showPrefs ? "bg-neutral-800" : ""}`} title="Preferences" data-testid="user-prefs-btn">
                  <Settings className="h-3.5 w-3.5 text-neutral-400" />
                </button>
                <button onClick={() => setOpen(false)} className="text-neutral-500 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Email Preferences Panel */}
            {showPrefs && (
              <div className="border-b border-neutral-800 px-4 py-3 bg-neutral-800/40" data-testid="user-prefs-panel">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">Email Preferences</span>
                  <button onClick={() => setShowPrefs(false)} className="text-[10px] text-neutral-500 hover:text-white">Done</button>
                </div>
                {prefs ? (
                  <div className="space-y-1">
                    {[
                      { key: "email_order", label: "Order updates" },
                      { key: "email_return", label: "Returns & refunds" },
                      { key: "email_promotion", label: "Promotions & offers" },
                      { key: "email_support", label: "Support replies" },
                      { key: "email_digest", label: "Weekly digest" },
                    ].map(({ key, label }) => (
                      <button key={key} onClick={() => togglePref(key)}
                        className="w-full flex items-center justify-between py-1.5 px-2 rounded hover:bg-neutral-700/50 transition-colors"
                        data-testid={`user-pref-${key}`}>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-neutral-500" />
                          <span className="text-xs text-neutral-300">{label}</span>
                        </div>
                        <div className={`w-7 h-4 rounded-full transition-colors flex items-center ${prefs[key] ? "bg-[#C9A050] justify-end" : "bg-neutral-600 justify-start"}`}>
                          <div className="w-3 h-3 rounded-full bg-white mx-0.5 shadow-sm" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2"><div className="animate-spin h-4 w-4 border-2 border-[#C9A050]/30 border-t-[#C9A050] rounded-full mx-auto" /></div>
                )}
              </div>
            )}

            {/* Notification List */}
            <div className="max-h-[360px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="animate-spin h-5 w-5 border-2 border-[#C9A050] border-t-transparent rounded-full mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center" data-testid="no-user-notifications">
                  <Bell className="h-8 w-8 text-neutral-700 mx-auto mb-2" />
                  <p className="text-xs text-neutral-500">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={n.notification_id}
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-neutral-800/60 transition-colors border-b border-neutral-800/50 ${!n.is_read ? "bg-neutral-800/30" : ""}`}
                      data-testid={`user-notif-item-${n.notification_id}`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center mt-0.5`}>
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${!n.is_read ? "text-white" : "text-neutral-300"}`}>
                            {n.title}
                          </p>
                          {!n.is_read && <span className="w-2 h-2 bg-[#C9A050] rounded-full flex-shrink-0 mt-1" />}
                        </div>
                        <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-neutral-600 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* View All */}
            <div className="border-t border-neutral-800 px-4 py-2.5">
              <button
                onClick={() => { setOpen(false); navigate("/notifications"); }}
                className="w-full text-center text-xs text-[#C9A050] hover:text-yellow-400 font-medium transition-colors"
                data-testid="user-view-all-notifications"
              >
                View All Notifications
              </button>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
