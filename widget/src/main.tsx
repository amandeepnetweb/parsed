import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Widget } from "./components/Widget";
import "./index.css";

// Dev preview with mock config — replace with your own values
const DEV_CONFIG = {
  apiUrl: "http://localhost:3000",
  folderId: "your-folder-id",
  token: "your-widget-token",
  title: "Ask our docs",
  welcomeMessage: "Hi! Ask me anything about our documents.",
  primaryColor: "#18181b",
  position: "bottom-right" as const,
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-800">Parsed Widget — Dev Preview</h1>
      <p className="text-sm text-gray-500">
        Edit <code>src/main.tsx</code> to change the dev config.
      </p>
    </div>
    <Widget config={DEV_CONFIG} />
  </StrictMode>,
);
