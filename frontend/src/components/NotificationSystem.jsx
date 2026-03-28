import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing, X, Zap, ArrowRight } from "lucide-react";
import { API } from "@/App";
import { toast } from "sonner";
import axios from "axios";
import { Link } from "react-router-dom";

const VAPID_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ========== NOTIFICATION BELL ==========
export const NotificationBell = () => {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_KEY) return;
      setSupported(true);

      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          setSubscribed(!!sub);
        }
      } catch {}
    };
    checkStatus();
  }, []);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (subscribed) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await axios.post(`${API}/notifications/unsubscribe`, {
              endpoint: sub.endpoint
            });
            await sub.unsubscribe();
          }
        }
        setSubscribed(false);
        toast.success("Notifications turned off");
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Please allow notifications in your browser settings");
          setLoading(false);
          return;
        }

        const reg = await navigator.serviceWorker.register("/sw-push.js");
        await navigator.serviceWorker.ready;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        });

        const subJson = sub.toJSON();
        await axios.post(`${API}/notifications/subscribe`, {
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        });

        setSubscribed(true);
        toast.success("You'll be notified about flash sales!");
      }
    } catch (err) {
      console.error("Notification error:", err);
      toast.error("Failed to update notifications");
    } finally {
      setLoading(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`relative p-2 rounded-lg transition-all ${
        subscribed
          ? "text-gold hover:bg-gold/10"
          : "text-neutral-400 hover:text-white hover:bg-neutral-800"
      }`}
      title={subscribed ? "Notifications on" : "Get flash sale alerts"}
      data-testid="notification-bell"
    >
      {subscribed ? (
        <BellRing className="h-5 w-5" />
      ) : (
        <Bell className="h-5 w-5" />
      )}
      {subscribed && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1 right-1 w-2 h-2 bg-gold rounded-full"
        />
      )}
    </button>
  );
};

// ========== IN-APP FLASH SALE TOAST ==========
export const FlashSaleToast = () => {
  const [flashSales, setFlashSales] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed_key = sessionStorage.getItem("pigma_flash_dismissed");
    if (dismissed_key) { setDismissed(true); return; }

    axios.get(`${API}/bundles/flash-sales`)
      .then(r => {
        if (r.data?.length > 0) {
          setFlashSales(r.data);
          // Slight delay so page loads first
          setTimeout(() => setVisible(true), 800);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-hide after 7 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setDismissed(true);
        sessionStorage.setItem("pigma_flash_dismissed", "1");
      }, 400);
    }, 7000);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      setDismissed(true);
      sessionStorage.setItem("pigma_flash_dismissed", "1");
    }, 400);
  };

  if (dismissed || flashSales.length === 0) return null;

  const sale = flashSales[0];

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Desktop: top-right floating card */}
          <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="hidden md:block fixed top-[140px] right-5 z-[45] w-[340px]"
            data-testid="flash-sale-toast"
          >
            <div className="bg-neutral-950 border border-gold/30 rounded-xl shadow-xl shadow-black/40 overflow-hidden">
              {/* Gold accent top bar */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />

              <div className="p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gold/15 rounded-lg flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-white tracking-wide">
                      Flash Sale is Live
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {sale.name} — Save Rs.{sale.discount_amount?.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-white/10 rounded-md transition-colors shrink-0"
                    data-testid="flash-toast-dismiss"
                  >
                    <X className="h-3.5 w-3.5 text-neutral-500" />
                  </button>
                </div>

                <Link
                  to={`/bundle/${sale.bundle_id}`}
                  onClick={handleDismiss}
                  className="mt-3 flex items-center justify-center gap-1.5 w-full bg-gold hover:bg-yellow-500 text-black text-xs font-bold py-2 rounded-lg transition-colors"
                  data-testid="flash-toast-shop-btn"
                >
                  Shop Now <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Auto-hide progress bar */}
              <div className="h-[2px] bg-neutral-800">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 7, ease: "linear" }}
                  className="h-full bg-gold/50"
                />
              </div>
            </div>
          </motion.div>

          {/* Mobile: bottom bar above booster (z-[55] between booster z-[60] and content) */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="md:hidden fixed bottom-16 left-3 right-3 z-[55]"
            data-testid="flash-sale-toast-mobile"
          >
            <div className="bg-neutral-950 border border-gold/30 rounded-xl shadow-xl shadow-black/50 overflow-hidden">
              <div className="flex items-center gap-2.5 p-2.5 pr-2">
                <div className="w-7 h-7 bg-gold/15 rounded-lg flex items-center justify-center shrink-0">
                  <Zap className="h-3.5 w-3.5 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[11px] text-white truncate">
                    Flash Sale Live
                  </p>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {sale.name} — Save Rs.{sale.discount_amount?.toLocaleString()}
                  </p>
                </div>
                <Link
                  to={`/bundle/${sale.bundle_id}`}
                  onClick={handleDismiss}
                  className="bg-gold text-black text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0"
                  data-testid="flash-toast-shop-btn-mobile"
                >
                  Shop
                </Link>
                <button
                  onClick={handleDismiss}
                  className="p-1 hover:bg-white/10 rounded-md transition-colors shrink-0"
                >
                  <X className="h-3 w-3 text-neutral-500" />
                </button>
              </div>
              {/* Progress bar */}
              <div className="h-[1.5px] bg-neutral-800">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 7, ease: "linear" }}
                  className="h-full bg-gold/40"
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
