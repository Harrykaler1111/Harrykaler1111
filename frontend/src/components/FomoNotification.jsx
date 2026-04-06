import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, MapPin, X } from "lucide-react";
import { API } from "@/App";
import axios from "axios";

export const FomoNotification = () => {
  const [notification, setNotification] = useState(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const freqRef = useRef({ min: 300000, max: 600000 });

  const fetchNotification = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/fomo/notification`);
      if (res.data?.show) {
        freqRef.current = {
          min: (res.data.frequency_min || 300) * 1000,
          max: (res.data.frequency_max || 600) * 1000
        };
        setNotification(res.data);
        setVisible(true);
        setTimeout(() => setVisible(false), 5000);
      }
    } catch { /* silent */ }
  }, []);

  const scheduleNext = useCallback(() => {
    const delay = freqRef.current.min + Math.random() * (freqRef.current.max - freqRef.current.min);
    timerRef.current = setTimeout(() => {
      fetchNotification();
      scheduleNext();
    }, delay);
  }, [fetchNotification]);

  useEffect(() => {
    // Initial delay before first notification
    const initDelay = setTimeout(() => {
      fetchNotification();
      scheduleNext();
    }, 15000);
    return () => {
      clearTimeout(initDelay);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchNotification, scheduleNext]);

  return (
    <AnimatePresence>
      {visible && notification && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 left-6 z-[9997] max-w-xs"
          data-testid="fomo-notification"
        >
          <div className="bg-white shadow-2xl rounded-xl p-4 border border-neutral-100 flex items-start gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-800 leading-tight">
                {notification.text}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3 text-neutral-400" />
                <span className="text-xs text-neutral-400">{notification.city}</span>
                <span className="text-xs text-neutral-300 ml-1">just now</span>
              </div>
            </div>
            <button onClick={() => setVisible(false)} className="text-neutral-300 hover:text-neutral-500 p-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
