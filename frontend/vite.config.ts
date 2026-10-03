import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxies API calls to the FastAPI backend during local dev, so the
      // frontend can just call relative paths like "/run" without hardcoding
      // http://localhost:8000 everywhere (and so the WebSocket upgrade works
      // through the same origin too).
      "/run": "http://localhost:8000",
      "/runs": "http://localhost:8000",
      "/report": "http://localhost:8000",
      "/compare": "http://localhost:8000",
      "/health": "http://localhost:8000",
      "/auth": "http://localhost:8000",
    },
  },
});
