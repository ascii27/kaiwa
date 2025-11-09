import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:4000",
      "/sessions": "http://localhost:4000",
      "/templates": "http://localhost:4000"
    }
  }
});
