import React, { useState } from 'react';
// Убираем пока импорты Howler и GameScene для теста

function App() {
  const [testCount, setTestCount] = useState(0);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: '#0f172a', 
      color: 'white', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center'
    }}>
      <h1 style={{ color: '#4ade80' }}>ИНТЕРФЕЙС ЗАГРУЗИЛСЯ!</h1>
      <p>Проверка реактивности: {testCount}</p>
      <button 
        onClick={() => setTestCount(testCount + 1)}
        style={{ padding: '10px 20px', background: '#eab308', border: 'none', borderRadius: '8px' }}
      >
        ЖМИ СЮДА
      </button>
      
      <div style={{ marginTop: '20px', color: '#94a3b8' }}>
        Если ты это видишь, значит React работает стабильно.
      </div>
    </div>
  );
}

export default App;
