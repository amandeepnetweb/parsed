import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import cssInjectedByJs from "vite-plugin-css-injected-by-js";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss(), cssInjectedByJs()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.tsx"),
      name: "ParsedWidget",
      formats: ["iife"],
      fileName: () => "parsed-widget.js",
    },
    rollupOptions: {
      // Bundle React — external sites won't have it
    },
    cssCodeSplit: false,
    minify: true,
  },
});
