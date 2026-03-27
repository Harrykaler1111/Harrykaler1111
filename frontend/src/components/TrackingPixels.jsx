import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";

export const TrackingPixels = () => {
  const [pixels, setPixels] = useState({ meta_pixel_id: null, google_ads_id: null });
  const location = useLocation();

  useEffect(() => {
    axios.get(`${API}/admin/site/tracking-pixels`).then(r => setPixels(r.data)).catch(() => {});
  }, []);

  // Inject Meta Pixel
  useEffect(() => {
    if (!pixels.meta_pixel_id) return;
    const id = pixels.meta_pixel_id;

    // Remove existing pixel script if any
    const existing = document.getElementById("meta-pixel-script");
    if (existing) existing.remove();

    // Inject Meta Pixel base code
    const script = document.createElement("script");
    script.id = "meta-pixel-script";
    script.innerHTML = `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${id}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    // Noscript pixel
    const noscript = document.createElement("noscript");
    noscript.id = "meta-pixel-noscript";
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"/>`;
    document.body.appendChild(noscript);

    return () => {
      const s = document.getElementById("meta-pixel-script");
      const ns = document.getElementById("meta-pixel-noscript");
      if (s) s.remove();
      if (ns) ns.remove();
    };
  }, [pixels.meta_pixel_id]);

  // Inject Google Ads Pixel
  useEffect(() => {
    if (!pixels.google_ads_id) return;
    const id = pixels.google_ads_id;

    const existing = document.getElementById("gtag-script");
    if (existing) existing.remove();

    const gtagScript = document.createElement("script");
    gtagScript.id = "gtag-script";
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(gtagScript);

    const gtagInit = document.createElement("script");
    gtagInit.id = "gtag-init";
    gtagInit.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${id}');
    `;
    document.head.appendChild(gtagInit);

    return () => {
      const s = document.getElementById("gtag-script");
      const i = document.getElementById("gtag-init");
      if (s) s.remove();
      if (i) i.remove();
    };
  }, [pixels.google_ads_id]);

  // Track page views on route change
  useEffect(() => {
    if (window.fbq) window.fbq("track", "PageView");
    if (window.gtag) window.gtag("event", "page_view", { page_path: location.pathname });
  }, [location.pathname]);

  return null;
};

// Helper functions for tracking events from anywhere
export const trackEvent = (eventName, data = {}) => {
  // Meta Pixel
  if (window.fbq) window.fbq("track", eventName, data);
  // Google Ads
  if (window.gtag) window.gtag("event", eventName, data);
};

export const trackPurchase = (value, currency = "INR", orderId = "") => {
  trackEvent("Purchase", { value, currency, content_ids: [orderId] });
};

export const trackAddToCart = (productId, value, currency = "INR") => {
  trackEvent("AddToCart", { content_ids: [productId], value, currency });
};
