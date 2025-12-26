return (
  <div className="w-full h-screen relative bg-[#0f172a] flex items-center justify-center">
    <h1 className="text-white">ПРОВЕРКА КОМПОНЕНТОВ:</h1>
    
    {/* 1. Включай их по одному, чтобы найти, на каком всё сереет */}
    
    {/* <UI 
        state={gameState} 
        playerId={MY_PLAYER_ID} 
        userProfile={userProfile}
        isTrainingMode={isTrainingMode}
        onToggleMode={() => setIsTrainingMode(!isTrainingMode)}
        onStart={() => serverInstance.startGame()}
        onReset={() => serverInstance.reset()}
        playCashSound={() => sounds.cash?.play()}
        onUpdateProfile={handleUpdateProfile}
    /> */}

    {/* <GameScene 
        gameState={gameState} 
        playerId={MY_PLAYER_ID} 
        onMove={(x, z) => serverInstance.playerMove(MY_PLAYER_ID, x, z)} 
        controlsRef={controlsRef}
    /> */}
  </div>
);
