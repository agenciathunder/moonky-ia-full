import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    // Force dependency pre-bundling to avoid rare dev-cache cases where multiple
    // React instances end up in the graph, causing hooks to crash (dispatcher null).
    force: true,
    include: ["react", "react-dom", "@tanstack/react-query", "next-themes"],
  },
}));
