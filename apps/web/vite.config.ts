import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig(({ mode }) => ({
  base: mode === 'static' ? './' : '/',
  define: { __BOT_ONLY__: JSON.stringify(mode === 'static') },
  server: { port: 5173, strictPort: true },
  build: mode === 'static' ? { outDir: fileURLToPath(new URL('../../../hex-mahjong-play/', import.meta.url)), emptyOutDir: true } : {},
  worker: { format: 'es' },
}));
