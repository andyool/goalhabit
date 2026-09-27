/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the app works at any sub-path (e.g. GitHub Pages /goalhabit/).
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: "node",
  },
});
