import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initPerformanceMonitoring, optimizeImages } from "./utils/performance";
import "./i18n"; // Import i18n configuration

// Initialize performance monitoring
initPerformanceMonitoring();

// Optimize images after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  optimizeImages();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
