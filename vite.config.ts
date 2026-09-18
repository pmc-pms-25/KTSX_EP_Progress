import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset URLs so the bundle works from any folder on the intranet server.
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'xlsx', test: /node_modules[\/]xlsx/ },
            { name: 'echarts', test: /node_modules[\/](echarts|zrender)/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'] },
});
