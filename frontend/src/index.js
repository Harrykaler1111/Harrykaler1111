import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress ResizeObserver loop error — harmless browser warning
// that React dev overlay incorrectly shows as a crash on mobile
const ro = window.ResizeObserver;
window.ResizeObserver = class extends ro {
  constructor(cb) {
    super((entries, observer) => {
      requestAnimationFrame(() => { cb(entries, observer); });
    });
  }
};
window.addEventListener('error', (e) => {
  if (e.message?.includes?.('ResizeObserver')) {
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
