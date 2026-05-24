import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

const base = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: 'AYANAKOJI OS',
        short_name: 'AYANAKOJI',
        description: 'Personal Tactical Operating System',
        theme_color: '#0a0e14',
        background_color: '#0a0e14',
        display: 'standalone',
        lang: 'ru',
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
});
