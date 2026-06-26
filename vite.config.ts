import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-motion': ['motion'],
          'vendor-lucide': ['lucide-react'],
          'vendor-d3': ['d3'],
          'vendor-tesseract': ['tesseract.js'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
     proxy: {
       '/api': {
         target: 'http://localhost:4000',
         changeOrigin: true,
         configure: (proxy) => {
           proxy.on('proxyReq', (proxyReq, req) => {
             if (req.method === 'OPTIONS') {
               proxyReq.setHeader('Access-Control-Request-Method', 'POST');
             }
           });
           proxy.on('proxyRes', (proxyRes, req) => {
             if (req.method === 'OPTIONS') {
               proxyRes.headers['access-control-allow-origin'] = req.headers.origin || '*';
               proxyRes.headers['access-control-allow-methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
               proxyRes.headers['access-control-allow-headers'] = 'Content-Type,Authorization,X-CSRF-Token,X-CSRF-Hash,X-Refresh-Token';
               proxyRes.headers['access-control-allow-credentials'] = 'true';
             }
           });
         },
       },
     },
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
