import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter as Router } from "react-router-dom";

/**
 * Removes the boot loader defined in index.html.
 *
 * This is the ONLY place the loader is torn down. Previously both App.jsx
 * (on a 20s timer) and Homepage.jsx (in a fetch `finally`) tried to remove
 * it, which meant any route other than "/" — a shared /details link, or a
 * refresh on /watch — sat behind a full-screen spinner for 20 seconds.
 */
function hideBootLoader() {
  const loader = document.getElementById("loader");
  if (!loader) return;
  loader.classList.add("fade-out");
  loader.addEventListener("transitionend", () => loader.remove(), {
    once: true,
  });
  // Fallback in case the transition never fires (reduced motion, tab in bg).
  setTimeout(() => loader.remove(), 600);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <App onReady={hideBootLoader} />
    </Router>
  </StrictMode>
);
