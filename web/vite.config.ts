import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em dev, o Vite roda na 5173 e o servidor Node na 4321.
// Proxiamos /api -> servidor Node pra que fetch/EventSource funcionem
// com caminhos relativos, iguais aos de produção.
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind no loopback IPv4. Sem isso, em alguns Macs o Vite escuta só em
    // IPv6 (::1) e o navegador, que resolve "localhost" como 127.0.0.1,
    // recebe ERR_CONNECTION_REFUSED.
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4321",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
