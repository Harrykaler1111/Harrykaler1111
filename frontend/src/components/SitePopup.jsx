import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;
const STORAGE_KEY = "pigma_popup_closed";

export const SitePopup = () => {
  const [config, setConfig] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get(`${API}/api/popup/config`);
        if (!data.enabled) return;

        // Check localStorage unless force_show is on
        if (!data.force_show && localStorage.getItem(STORAGE_KEY)) return;

        setConfig(data);
        // Delay before showing
        const delay = (data.delay_seconds || 1) * 1000;
        setTimeout(() => setVisible(true), delay);
      } catch (_) {}
    };
    fetchConfig();
  }, []);

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  if (!config) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          data-testid="site-popup-overlay"
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

          {/* Content box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden z-10"
            data-testid="site-popup-box"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors"
              data-testid="popup-close-btn"
            >
              <X className="h-4 w-4 text-neutral-600" />
            </button>

            {/* Media */}
            {config.video ? (
              <div className="w-full aspect-video bg-black">
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
              <div className="w-full max-h-[240px] overflow-hidden bg-neutral-100">
                <img
                  src={config.image}
                  alt={config.title}
                  className="w-full h-full object-cover"
                  data-testid="popup-image"
                />
              </div>
            ) : null}

            {/* Text content */}
            <div className="p-6 sm:p-8 text-center">
              {config.title && (
                <h2
                  className="text-xl sm:text-2xl font-bold text-neutral-900 leading-tight"
                  data-testid="popup-title"
                >
                  {config.title}
                </h2>
              )}
              {config.description && (
                <p
                  className="mt-3 text-sm sm:text-base text-neutral-500 leading-relaxed"
                  data-testid="popup-description"
                >
                  {config.description}
                </p>
              )}

              {/* CTA Button */}
              {config.cta_text && (
                <a
                  href={config.cta_link || "#"}
                  onClick={config.cta_link ? undefined : handleClose}
                  className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-black text-white font-semibold text-sm rounded-full hover:bg-neutral-800 transition-colors"
                  data-testid="popup-cta-btn"
                >
                  {config.cta_text}
                  {config.cta_link && <ExternalLink className="h-3.5 w-3.5" />}
                </a>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
