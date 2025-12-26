import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

// 1. Сразу инициализируем Telegram
if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 2. Используй лучше свой домен для манифеста, GitHub часто блочит новые Safari
const MANIFEST_URL = 'https://raw.githubusercontent.com/ton-community/tutorials/main/03-client/test/public/tonconnect-manifest.json';

const root = ReactDOM.createRoot(rootElement);

// 3. Убираем StrictMode для теста (он часто причина двойных багов на новых iOS)
root.render(
  <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
    <App />
  </TonConnectUIProvider>
);
