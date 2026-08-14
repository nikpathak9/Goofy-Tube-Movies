import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // The app previously shipped as a single ~1MB chunk. Video.js is only
        // needed on /watch, so splitting it out keeps it off every other page.
        manualChunks: {
          player: ["video.js", "videojs-youtube"],
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
