import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/get-codebase": "http://localhost:8000",
      "/analyze": "http://localhost:8000",
      "/analyze-file": "http://localhost:8000",
      "/export-issues-excel": "http://localhost:8000",
      "/api": "http://localhost:8000",
      "/health": "http://localhost:8000",
      "/cases": "http://localhost:8000",
      "/chat": "http://localhost:8000",
      "/generate-backend-zip": "http://localhost:8000",
      "/aura-chat": "http://localhost:8000",
    },
  },
  build: {
    outDir: path.resolve(__dirname, "../backend/templates"),
    emptyOutDir: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
