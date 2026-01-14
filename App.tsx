import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider, useGame } from './context/GameContext';
import Auth from './components/Auth';
import Layout from './components/Layout';
import WeeklyCalendar from './components/WeeklyCalendar';
import SkillTree from './components/SkillTree';
import QuestBoard from './components/QuestBoard';
import Analytics from './components/Analytics';
import Shop from './components/Shop';
import Goals from './components/Goals';
import Inventory from './components/Inventory';
import Notes from './components/Notes';
import MobileDashboard from './components/MobileDashboard';
import HabitTracker from './components/HabitTracker';
import WalletPage from './components/Wallet';
import SocialHub from './components/SocialHub';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useGame();
  if (!state.user) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  const { state } = useGame();

  return (
    <Routes>
        <Route path="/login" element={state.user ? <Navigate to="/" /> : <Auth />} />
        
        <Route path="/" element={<ProtectedRoute><WeeklyCalendar /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><MobileDashboard /></ProtectedRoute>} />
        <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
        <Route path="/skills" element={<ProtectedRoute><SkillTree /></ProtectedRoute>} />
        <Route path="/quests" element={<ProtectedRoute><QuestBoard /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
        <Route path="/habits" element={<ProtectedRoute><HabitTracker /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
        <Route path="/social" element={<ProtectedRoute><SocialHub /></ProtectedRoute>} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <GameProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </GameProvider>
  );
};

export default App;