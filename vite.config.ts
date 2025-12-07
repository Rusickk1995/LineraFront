// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // Критично для работы wasm + web workers в браузере
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  },

  // Не позволяем Vite "оптимизировать" @linera/client,
  // иначе ломается wasm и Conway не поднимается.
  optimizeDeps: {
    exclude: ["@linera/client"]
  },

  build: {
    rollupOptions: {
      // Нужно для корректной сборки wasm-модуля и воркеров
      preserveEntrySignatures: "strict",
      input: "index.html"
    }
  }
});
