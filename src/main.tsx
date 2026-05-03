// App entry point - v3
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initDevToolsBlocker } from "./utils/devtools-blocker";

// Initialize DevTools blocker
initDevToolsBlocker();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
