import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // API roda em `bun run dev` (wrangler dev) na 8787
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
