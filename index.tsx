import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

// Инициализация телеги (обязательно!)
if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.ready();
}

const rootElement = document.getElementById('root');

// Ссылка теперь ведет на ТВОЙ домен на Vercel
const MANIFEST_URL = 'https://red-green-gray.vercel.app/tonconnect-manifest.json';

const root = ReactDOM.createRoot(rootElement);
root.render(
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <App />
    </TonConnectUIProvider>
);
