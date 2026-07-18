import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {HashRouter} from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { initMonitor } from './lib/monitor.ts';
import { initFrontendSentry } from './lib/sentry.ts';

initMonitor();
initFrontendSentry();

// Register service worker for PWA (web only). Skip inside the Capacitor
// native app: its WebView runs on a different origin (https://localhost) and
// the SW's cross-origin fetch interception breaks API calls such as login.
const isNative = !!(window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative;
if (!isNative && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) =>
      console.warn('[SW] registration failed', err)
    );
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
