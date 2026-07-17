import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Read the Android versionName so the web updater can compare against the
// installed APK version (single source of truth in android/app/build.gradle).
function readAndroidVersion(): string {
  try {
    const gradle = fs.readFileSync(
      path.resolve(__dirname, 'android/app/build.gradle'),
      'utf-8'
    );
    const m = gradle.match(/versionName\s+"([^"]+)"/);
    if (m) return m[1];
  } catch {
    /* ignore */
  }
  return process.env.VITE_APP_VERSION || '1.0.0';
}

function readAndroidVersionCode(): number {
  try {
    const gradle = fs.readFileSync(
      path.resolve(__dirname, 'android/app/build.gradle'),
      'utf-8'
    );
    const m = gradle.match(/versionCode\s+(\d+)/);
    if (m) return parseInt(m[1], 10);
  } catch {
    /* ignore */
  }
  return parseInt(process.env.VITE_APP_VERSION_CODE || '0', 10) || 0;
}

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
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(readAndroidVersion()),
      'import.meta.env.VITE_APP_VERSION_CODE': JSON.stringify(readAndroidVersionCode()),
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
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
    allowedHosts: ['localhost', '127.0.0.1', '::1'],
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
