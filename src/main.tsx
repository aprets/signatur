import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './app';

// Temporary: `?pack-designs=1` opens the disposable signature pack design comparison (src/pack-designs).
const PackDesignsPage = lazy(() => import('./pack-designs/page'));
const isPackDesignsPreview = new URLSearchParams(window.location.search).has('pack-designs');

const rootEl = document.querySelector('#root');
if (!rootEl) throw new Error('No root element found');
const root = createRoot(rootEl);
root.render(
  <React.StrictMode>
    {isPackDesignsPreview ? (
      <Suspense fallback={null}>
        <PackDesignsPage />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
