import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

const MANIFEST_URL = 'https://raw.githubusercontent.com/ton-community/tutorials/main/03-client/test/public/tonconnect-manifest.json';

const TestTon = () => (
  <div style={{ background: 'green', color: 'white', height: '100vh', padding: '20px' }}>
    <h1>TON CONNECT ЗАГРУЗИЛСЯ!</h1>
    <p>Если экран ЗЕЛЕНЫЙ, значит проблема в твоем App.tsx</p>
  </div>
);

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <TestTon />
    </TonConnectUIProvider>
  );
}

if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.ready();
}
