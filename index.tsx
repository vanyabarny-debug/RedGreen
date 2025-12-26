import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TonConnectUIProvider, THEME } from '@tonconnect/ui-react';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Fatal: Root element not found. Check your index.html");
}

// Ссылка на твой будущий манифест (замени на свою при деплое)
const MANIFEST_URL = 'https://your-game-domain.com/tonconnect-manifest.json';

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    {/* Добавлена базовая кастомизация темы */}
    <TonConnectUIProvider 
      manifestUrl={MANIFEST_URL}
      uiPreferences={{ theme: THEME.DARK }} 
    >
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);
