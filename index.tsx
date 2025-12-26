import React from 'react';
import ReactDOM from 'react-dom/client';

// ВРЕМЕННО УБИРАЕМ ВСЁ ТЯЖЕЛОЕ (TonConnect, App, Three)
// Мы хотим проверить, заведется ли просто голый React

const TestApp = () => (
  <div style={{ background: 'blue', color: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyCenter: 'center', flexDirection: 'column' }}>
    <h1>REACT ЗАПУСТИЛСЯ!</h1>
    <p>Если ты это видишь на Маке, значит проблема в TonConnect или App.tsx</p>
  </div>
);

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<TestApp />);
}

// Телега
if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.ready();
}
