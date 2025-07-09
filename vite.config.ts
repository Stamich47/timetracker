import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
