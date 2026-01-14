import React, { useState } from 'react';
import { useGame, defaultState } from '../context/GameContext';
import { calculateMaxXP } from '../utils/gameLogic';
import { Sword, AlertCircle } from 'lucide-react';

const Auth: React.FC = () => {
  const { dispatch } = useGame();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const registerUserInIndex = (userToCheck: string) => {
      const indexKey = 'liferpg_users_index';
      try {
          const raw = localStorage.getItem(indexKey);
          let users: string[] = raw ? JSON.parse(raw) : [];
          if (!users.includes(userToCheck)) {
              users.push(userToCheck);
              localStorage.setItem(indexKey, JSON.stringify(users));
          }
      } catch (e) {
          console.error("Failed to update user index", e);
      }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) return;

    const saveKey = `liferpg_user_${username}`;
    const savedData = localStorage.getItem(saveKey);

    if (savedData) {
        // User exists
        try {
            const parsedState = JSON.parse(savedData);
            if (parsedState.user && parsedState.user.password === password) {
                // Password match
                registerUserInIndex(username); // Ensure they are in index
                dispatch({ type: 'LOAD_GAME', payload: parsedState });
            } else {
                setError('Неверный пароль для этого героя.');
                return;
            }
        } catch (e) {
            setError('Ошибка чтения сохранения.');
        }
    } else {
        // New User
        // Generate short unique ID
        const uniqueId = '#' + Math.random().toString(36).substr(2, 6).toUpperCase();

        const newState = {
            ...defaultState,
            user: {
                username: username,
                uniqueId: uniqueId,
                password: password,
                avatar: username.charAt(0).toUpperCase(), // Default avatar is first letter
                description: 'Начинающий герой',
                level: 1,
                currentXP: 0,
                maxXP: calculateMaxXP(1),
                totalTasksCompleted: 0,
                missedTasks: 0,
                communicationStyle: 'intellectual' as const, // Default set to AI Assistant
                themeId: 'theme-tiffany', // Default to Tiffany
                settings: { dailyMin: 3, dailyMax: 10, monthlyIncomeGoal: 1000 },
                friends: [],
                friendRequests: [], // Important init
                privacyMode: 'public' as const,
                moodHistory: [], // Important init
                onboardingStep: 0 // START ONBOARDING FOR NEW USERS
            }
        };
        registerUserInIndex(username);
        dispatch({ type: 'LOAD_GAME', payload: newState });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-rpg-bg text-rpg-text p-4">
      <div className="bg-rpg-panel p-8 rounded-lg shadow-[0_0_50px_rgba(0,209,193,0.1)] border border-rpg-border max-w-md w-full relative overflow-hidden">
        {/* Gradient: White to Theme */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-white to-rpg-primary"></div>
        
        <div className="flex justify-center mb-6 text-white">
          <Sword size={64} />
        </div>
        <h1 className="text-4xl font-bold text-center mb-8 font-mono tracking-tighter text-white">
          Grind
        </h1>
        
        {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-4 text-sm flex items-center gap-2">
                <AlertCircle size={16}/> {error}
            </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-gray-500 mb-1">Идентификатор (Логин)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-rpg-card border border-rpg-border rounded px-4 py-3 text-rpg-text focus:border-white outline-none transition-colors"
              placeholder="HeroName"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase text-gray-500 mb-1">Ключ Доступа (Пароль)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-rpg-card border border-rpg-border rounded px-4 py-3 text-rpg-text focus:border-white outline-none transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 px-4 rounded transition-all duration-200 uppercase tracking-wider text-sm shadow-lg"
          >
            Инициализация
          </button>
          <p className="text-xs text-center text-gray-600 mt-4">
              * Если логин не найден, будет создан новый профиль.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Auth;