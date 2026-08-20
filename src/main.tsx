import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './app';

const rootEl = document.querySelector('#root');
if (!rootEl) throw new Error('No root element found');
const root = createRoot(rootEl);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
