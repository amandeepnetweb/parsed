import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Widget } from "./components/Widget";
import type { WidgetConfig } from "./types";
import "./index.css";

function init(config: WidgetConfig) {
  if (!config.apiUrl || !config.folderId || !config.token) {
    console.error("[ParsedWidget] Missing required config: apiUrl, folderId, token");
    return;
  }

  let container = document.getElementById("parsed-widget-root");
  if (!container) {
    container = document.createElement("div");
    container.id = "parsed-widget-root";
    document.body.appendChild(container);
  }

  const root = createRoot(container);
  root.render(
    <StrictMode>
      <Widget config={config} />
    </StrictMode>,
  );
}

// Expose globally
(window as unknown as Record<string, unknown>).ParsedWidget = { init };

// Auto-init if config is already set by the loader script
const preConfig = (window as unknown as Record<string, unknown>).ParsedWidgetConfig as
  | WidgetConfig
  | undefined;
if (preConfig) {
  init(preConfig);
}
