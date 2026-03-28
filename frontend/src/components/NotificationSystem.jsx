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
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const dismissed_key = sessionStorage.getItem("pigma_flash_dismissed");
    if (dismissed_key) { setDismissed(true); return; }

    axios.get(`${API}/bundles/flash-sales`)
      .then(r => {
        if (r.data?.length > 0) setFlashSales(r.data);
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pigma_flash_dismissed", "1");
  };

  if (dismissed || flashSales.length === 0) return null;

  const sale = flashSales[currentIndex % flashSales.length];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-[95vw] max-w-lg"
        data-testid="flash-sale-toast"
      >
        <div className="bg-red-600 text-white rounded-xl shadow-2xl shadow-red-500/30 overflow-hidden">
          <div className="flex items-center gap-3 p-3 pr-2">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center shrink-0 animate-pulse">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">
                Flash Sale is LIVE!
              </p>
              <p className="text-xs text-red-100 truncate">
                {sale.name} — Save Rs.{sale.discount_amount?.toLocaleString()}
              </p>
            </div>
            <Link
              to={`/bundle/${sale.bundle_id}`}
              onClick={handleDismiss}
              className="bg-white text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
              data-testid="flash-toast-shop-btn"
            >
              Shop <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0"
              data-testid="flash-toast-dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Progress bar showing time urgency */}
          <div className="h-0.5 bg-white/20">
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 8, ease: "linear" }}
              className="h-full bg-white/60"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
