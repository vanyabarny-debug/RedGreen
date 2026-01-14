import React, { useState } from 'react';
import { X, Trophy, Zap, BarChart2, UserPlus, UserMinus, Lock, Check, Scroll, ArrowRight } from 'lucide-react';
import { getMotivationMessage, getWeekProgress, getUserPercentileLabel } from '../utils/gameLogic';
import { User, Task } from '../types';
import { useGame } from '../context/GameContext';
import { playSound } from '../utils/audio';

interface ProfileModalProps {
    user: User;
    tasks: Task[];
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user: targetUser, tasks, onClose }) => {
  const { state, dispatch } = useGame();
  const currentUser = state.user;
  const [hasSent, setHasSent] = useState(false);

  if (!targetUser || !currentUser) return null;

  const isMe = currentUser.username === targetUser.username;
  const isFriend = currentUser.friends && currentUser.friends.includes(targetUser.username);
  
  // Check if request is already pending (from data or local action)
  const isPending = targetUser.friendRequests?.some(r => r.fromUsername === currentUser.username);
  const showSent = isPending || hasSent;
  
  // Privacy Logic
  const privacy = targetUser.privacyMode || 'public';
  let canViewStats = true;
  if (!isMe) {
      if (privacy === 'private') canViewStats = false;
      if (privacy === 'friends' && !isFriend) canViewStats = false;
  }

  const weekStats = getWeekProgress(tasks, targetUser.settings);
  const motivation = getMotivationMessage(weekStats.percentage, targetUser.communicationStyle);
  const xpPercent = Math.min(100, (targetUser.currentXP / targetUser.maxXP) * 100);
  const percentileLabel = getUserPercentileLabel(targetUser);

  // Helper to check if avatar is image or text
  const isImageAvatar = (avatar: string) => {
      return avatar && (avatar.length > 10 || avatar.startsWith('data:') || avatar.startsWith('http'));
  };

  const activeQuest = targetUser.currentQuestId ? state.quests.find(q => q.id === targetUser.currentQuestId) : null;
  const myActiveQuest = state.user?.currentQuestId;

  const handleFriendAction = () => {
      if (isFriend) {
          if (window.confirm(`Вы действительно хотите удалить ${targetUser.username} из друзей?`)) {
              dispatch({ type: 'REMOVE_FRIEND', payload: targetUser.username });
          }
      } else if (!showSent) {
          dispatch({ type: 'SEND_FRIEND_REQUEST', payload: targetUser.username });
          setHasSent(true); // Immediate visual feedback
      }
  };

  const handleJoinQuest = () => {
      if (!activeQuest) return;
      if (myActiveQuest) {
          alert("Вы уже выполняете квест. Завершите или откажитесь от него, чтобы присоединиться.");
          return;
      }
      dispatch({ type: 'ACCEPT_QUEST', payload: activeQuest.id });
      playSound('success');
      alert(`Вы присоединились к квесту "${activeQuest.title}"!`);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[150] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-rpg-panel border border-rpg-primary w-full max-w-2xl rounded-lg shadow-[0_0_30px_rgba(34,211,238,0.2)] relative flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="h-24 bg-gradient-to-r from-rpg-primary/20 to-rpg-secondary/20 relative">
             <div className="absolute -bottom-10 left-8">
                 <div className="w-24 h-24 rounded-full bg-rpg-bg border-4 border-rpg-primary flex items-center justify-center text-4xl shadow-lg overflow-hidden">
                      {isImageAvatar(targetUser.avatar) ? 
                        <img src={targetUser.avatar} className="w-full h-full object-cover"/> : 
                        <span className="text-4xl">{targetUser.avatar}</span>
                     }
                 </div>
             </div>
             <button onClick={onClose} className="absolute top-4 right-4 text-rpg-muted hover:text-white">
                 <X size={24} />
             </button>
             
             {/* Friend Button */}
             {!isMe && (
                 <button 
                    onClick={handleFriendAction}
                    disabled={showSent}
                    className={`absolute bottom-4 right-4 px-3 py-1 rounded text-xs font-bold flex items-center gap-2 transition-colors ${
                        isFriend ? 'bg-rpg-card text-gray-400 hover:text-white' : 
                        showSent ? 'bg-green-500/10 text-green-500 border border-green-500/30 cursor-default' :
                        'bg-rpg-secondary text-white hover:bg-blue-600'
                    }`}
                 >
                     {isFriend ? <><UserMinus size={14}/> Удалить</> : 
                      showSent ? <><Check size={14}/> Отправлено</> :
                      <><UserPlus size={14}/> Добавить</>}
                 </button>
             )}

             {/* Rank Badge (Only if allowed) */}
             {canViewStats && (
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded border border-rpg-primary/50 flex items-center gap-2">
                    <BarChart2 size={16} className="text-rpg-primary"/>
                    <span className="text-xs font-mono text-white uppercase tracking-wider">{percentileLabel}</span>
                </div>
             )}
        </div>

        <div className="pt-12 px-8 pb-8">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-bold font-mono text-white flex items-center gap-2">
                        {targetUser.username}
                        {!canViewStats && <Lock size={20} className="text-gray-500" title="Статистика скрыта"/>}
                    </h2>
                    
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-rpg-primary font-mono">Level {targetUser.level} Hero</p>
                        <span className="text-gray-600">|</span>
                        <div className="flex items-center gap-1 bg-gray-800/50 px-2 py-0.5 rounded text-xs font-mono text-gray-400">
                             ID: {targetUser.uniqueId} 
                        </div>
                    </div>
                    
                    <p className="text-gray-500 text-sm mt-3 italic">"{targetUser.description}"</p>
                </div>
            </div>

            {/* Main Stats or Privacy Message */}
            {canViewStats ? (
                <div className="space-y-6">
                    {/* Active Quest Banner (if any) */}
                    {activeQuest && (
                        <div className="bg-rpg-secondary/10 border border-rpg-secondary/50 rounded p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rpg-secondary/20 rounded-full text-rpg-secondary">
                                    <Scroll size={20}/>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase text-rpg-secondary font-bold">Выполняет Квест</div>
                                    <div className="text-white font-bold text-sm">{activeQuest.title}</div>
                                </div>
                            </div>
                            {!isMe && !myActiveQuest && (
                                <button 
                                    onClick={handleJoinQuest}
                                    className="px-3 py-1.5 bg-rpg-secondary hover:bg-blue-600 text-white rounded text-xs font-bold flex items-center gap-1 transition-colors"
                                >
                                    Присоединиться <ArrowRight size={12}/>
                                </button>
                            )}
                        </div>
                    )}

                    <div>
                        <div className="flex justify-between text-sm mb-1 font-mono text-rpg-muted">
                            <span>XP Progress</span>
                            <span>{targetUser.currentXP} / {targetUser.maxXP}</span>
                        </div>
                        <div className="h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                            <div className="h-full bg-gradient-to-r from-blue-600 to-rpg-primary transition-all duration-500 relative" style={{width: `${xpPercent}%`}}>
                                <div className="absolute inset-0 bg-white/20 animate-pulse-fast"></div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
                            <div className="flex items-center gap-2 text-rpg-secondary mb-2">
                                <Trophy size={18} />
                                <span className="font-bold">Всего задач</span>
                            </div>
                            <div className="text-2xl font-mono text-white">{targetUser.totalTasksCompleted}</div>
                        </div>
                        <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
                            <div className="flex items-center gap-2 text-rpg-success mb-2">
                                <Zap size={18} />
                                <span className="font-bold">Эффективность</span>
                            </div>
                            <div className="text-2xl font-mono text-white">{weekStats.percentage}%</div>
                        </div>
                    </div>

                    <div className="bg-rpg-bg p-4 rounded border border-rpg-border">
                        <h3 className="text-rpg-muted text-sm mb-2 uppercase tracking-wider">Недельный Анализ</h3>
                        <p className="text-lg italic text-white/90">"{motivation}"</p>
                    </div>
                </div>
            ) : (
                <div className="py-12 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-800 rounded bg-gray-900/30">
                    <Lock size={48} className="mb-4 opacity-30"/>
                    <p className="font-mono text-sm uppercase">Данные профиля скрыты</p>
                    <p className="text-xs mt-2">Пользователь ограничил доступ к своей статистике</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;