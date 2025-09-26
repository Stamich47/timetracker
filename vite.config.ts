import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: "dist/stats.html",
      open: false,
      gzipSize: true,
    }),
  ],
  server: {
    port: 5173,
    strictPort: true, // Fail if port is already in use instead of trying next port
    host: true, // Allow external connections
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor libraries into their own chunks
          "vendor-react": ["react", "react-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-pdf": ["jspdf", "html2canvas"],
          "vendor-ui": ["lucide-react", "react-hook-form"],
          "vendor-utils": ["date-fns"],
        },
      },
    },
    // Increase chunk size warning limit to 1MB for large vendor libraries
    chunkSizeWarningLimit: 1000,
  },
});
