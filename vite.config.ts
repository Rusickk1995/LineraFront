// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: "index.html",
        linera: "@linera/client",
      },
      preserveEntrySignatures: "strict",
    },
  },
  optimizeDeps: {
    exclude: ["@linera/client"],
  },
});
