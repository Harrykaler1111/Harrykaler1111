import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress harmless ResizeObserver error from React error overlay
// This is a known browser issue triggered by animations/dynamic layouts
const suppressResizeObserver = (e) => {
  if (e.message?.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation();
  }
};
window.addEventListener('error', suppressResizeObserver);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
