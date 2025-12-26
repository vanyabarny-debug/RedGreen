import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Manifest URL required for TON Connect
const MANIFEST_URL = 'https://red-green-gray.vercel.app/tonconnect-manifest.json';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);
