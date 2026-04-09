import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// import sharpOptimizer from "./vite-plugin-sharp.js";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react(),
    /*
    sharpOptimizer({
      inputDir: "src/assets",
      outputDir: "public/optimized",
      formats: ["webp", "jpeg"],
      quality: 80,
    }),
    */
  ],
  server: {
    port: 5173,
    host: true,
  },
});
