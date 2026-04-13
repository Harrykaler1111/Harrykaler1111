import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;
const TS_KEY = "pigma_popup_last_shown";

export const SitePopup = () => {
  const [config, setConfig] = useState(null);
  const [visible, setVisible] = useState(false);
  const configRef = useRef(null);
  const timerRef = useRef(null);

  // Check if enough time has passed since last popup
  const shouldShow = useCallback((intervalMinutes) => {
    if (!intervalMinutes || intervalMinutes <= 0) {
      // No recurring — show once per session if not shown before
      const lastTs = localStorage.getItem(TS_KEY);
      return !lastTs;
    }
    const lastTs = localStorage.getItem(TS_KEY);
    if (!lastTs) return true;
    const elapsed = Date.now() - parseInt(lastTs, 10);
    return elapsed >= intervalMinutes * 60 * 1000;
  }, []);

  const showPopup = useCallback(() => {
    setVisible(true);
    localStorage.setItem(TS_KEY, Date.now().toString());
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  // Initial fetch + first show
  useEffect(() => {
    // Don't show popup on admin pages
    if (window.location.pathname.startsWith("/admin")) return;

    const fetchConfig = async () => {
      try {
        const { data } = await axios.get(`${API}/api/popup/config`);
        if (!data.enabled) return;
        setConfig(data);
        configRef.current = data;
        const interval = data.reappear_interval_minutes || 0;
        if (shouldShow(interval)) {
          const delay = (data.delay_seconds || 1) * 1000;
          setTimeout(() => showPopup(), delay);
        }
      } catch (_) {}
    };
    fetchConfig();
  }, [shouldShow, showPopup]);

  // Background timer — checks every 60s if popup should reappear
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (window.location.pathname.startsWith("/admin")) return;
      const cfg = configRef.current;
      if (!cfg || !cfg.enabled) return;
      const interval = cfg.reappear_interval_minutes || 0;
      if (interval <= 0) return;
      if (shouldShow(interval)) {
        showPopup();
      }
    }, 60_000);
    return () => clearInterval(timerRef.current);
  }, [shouldShow, showPopup]);

  if (!config) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-5"
          data-testid="site-popup-overlay"
        >
          {/* Backdrop — blocks all background interaction */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={handleClose}
            data-testid="popup-backdrop"
          />

          {/* Glassmorphic card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="relative w-full max-w-md z-10"
            data-testid="site-popup-box"
          >
            {/* Outer glow ring */}
            <div className="absolute -inset-[1px] rounded-[28px] bg-gradient-to-br from-gold/40 via-white/10 to-gold/20 blur-[1px]" />

            {/* Card body */}
            <div className="relative rounded-[26px] overflow-hidden border border-white/15 bg-black/40 backdrop-blur-2xl shadow-[0_8px_60px_rgba(201,160,80,0.15)]">

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-3.5 right-3.5 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
                data-testid="popup-close-btn"
              >
                <X className="h-3.5 w-3.5 text-white/70" />
              </button>

              {/* Media */}
              {config.video ? (
                <div className="w-full aspect-video">
                  <video
                    src={config.video}
                    controls
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    data-testid="popup-video"
                  />
                </div>
              ) : config.image ? (
                <div className="w-full max-h-[200px] overflow-hidden">
                  <img
                    src={config.image}
                    alt={config.title}
                    className="w-full h-full object-cover opacity-90"
                    data-testid="popup-image"
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              ) : null}

              {/* Content */}
              <div className="px-6 pt-6 pb-7 text-center">
                <div className="w-10 h-[2px] mx-auto mb-4 rounded-full bg-gradient-to-r from-transparent via-gold to-transparent" />

                {config.title && (
                  <h2
                    className="text-lg sm:text-xl font-bold text-white leading-snug tracking-tight"
                    data-testid="popup-title"
                  >
                    {config.title}
                  </h2>
                )}
                {config.description && (
                  <p
                    className="mt-2.5 text-xs sm:text-sm text-white/50 leading-relaxed max-w-[90%] mx-auto"
                    data-testid="popup-description"
                  >
                    {config.description}
                  </p>
                )}

                {/* CTA */}
                {config.cta_text && (
                  <a
                    href={config.cta_link || "#"}
                    onClick={handleClose}
                    className="group inline-flex items-center gap-2 mt-5 px-6 py-2.5 rounded-full text-sm font-semibold text-black bg-gradient-to-r from-gold to-yellow-400 shadow-[0_4px_20px_rgba(201,160,80,0.3)] hover:shadow-[0_4px_30px_rgba(201,160,80,0.5)] transition-all relative overflow-hidden"
                    data-testid="popup-cta-btn"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative z-10">{config.cta_text}</span>
                    <ArrowRight className="relative z-10 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
