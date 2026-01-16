import React, { useState } from 'react';
import { X, Trophy, Zap, UserPlus, UserMinus, Lock, Check, Scroll, ArrowRight, Briefcase, Shield, Activity, Share2, Copy } from 'lucide-react';
import { getMotivationMessage, getWeekProgress, getUserPercentileLabel, GlobalMapDB } from '../utils/gameLogic';
import { User, Task } from '../types';
import { useGame } from '../context/GameContext';
import { playSound } from '../utils/audio';
import { useNavigate } from 'react-router-dom';

interface ProfileModalProps {
    user: User;
    tasks: Task[];
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user: propUser, tasks, onClose }) => {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();
  
  const isMe = state.user?.username === propUser.username;
  const targetUser = isMe && state.user ? state.user : propUser;
  const currentUser = state.user;
  const [hasSent, setHasSent] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  if (!targetUser || !currentUser) return null;

  const isFriend = currentUser.friends && currentUser.friends.includes(targetUser.username);
  const isPending = targetUser.friendRequests?.some(r => r.fromUsername === currentUser.username);
  const showSent = isPending || hasSent;
  
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

  const isImageAvatar = (avatar: string) => {
      return avatar && (avatar.length > 10 || avatar.startsWith('data:') || avatar.startsWith('http'));
  };

  const activeQuest = targetUser.currentQuestId ? state.quests.find(q => q.id === targetUser.currentQuestId) : null;
  const myActiveQuest = state.user?.currentQuestId;

  // Affiliation Logic
  const affiliatedMapId = targetUser.affiliatedMapId;
  let affiliatedMap = affiliatedMapId ? state.structureMaps.find(m => m.id === affiliatedMapId) : null;
  if (!affiliatedMap && affiliatedMapId) {
      affiliatedMap = GlobalMapDB.getMapById(affiliatedMapId)?.map;
  }

  const handleFriendAction = () => {
      if (isFriend) {
          if (window.confirm(`Вы действительно хотите удалить ${targetUser.username} из друзей?`)) {
              dispatch({ type: 'REMOVE_FRIEND', payload: targetUser.username });
          }
      } else if (!showSent) {
          dispatch({ type: 'SEND_FRIEND_REQUEST', payload: targetUser.username });
          setHasSent(true);
      }
  };

  const handleJoinQuest = () => {
      if (!activeQuest) return;
      if (myActiveQuest) {
          alert("Вы уже выполняете квест.");
          return;
      }
      dispatch({ type: 'ACCEPT_QUEST', payload: activeQuest.id });
      playSound('success');
      alert(`Вы присоединились к квесту "${activeQuest.title}"!`);
  };

  const goToMap = () => {
      if (affiliatedMapId) {
          navigate('/structures', { state: { focusNodeId: null } }); 
          onClose();
      }
  };

  const copyId = () => {
      navigator.clipboard.writeText(targetUser.uniqueId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[150] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="bg-rpg-panel w-full max-w-2xl rounded-2xl border border-rpg-border shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col overflow-hidden group" onClick={e => e.stopPropagation()}>
        
        {/* --- DYNAMIC THEME GRADIENT BACKGROUND --- */}
        {/* Pure gradient from Theme to White, adjusted opacity to ensure white is visible but not overwhelming text */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[120%] h-[500px] bg-gradient-to-b from-rpg-primary to-white opacity-25 blur-[100px] pointer-events-none transition-colors duration-500"></div>
        
        {/* Header Actions */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
             {!isMe && (
                 <button 
                    onClick={handleFriendAction}
                    disabled={showSent}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all ${
                        isFriend ? 'bg-red-900/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white' : 
                        showSent ? 'bg-rpg-card text-gray-500 border border-rpg-border cursor-default' :
                        'bg-rpg-primary/10 text-rpg-primary border border-rpg-primary/50 hover:bg-rpg-primary hover:text-black'
                    }`}
                 >
                     {isFriend ? <><UserMinus size={14}/> Удалить</> : 
                      showSent ? <><Check size={14}/> Запрос</> :
                      <><UserPlus size={14}/> Добавить</>}
                 </button>
             )}
             <button onClick={onClose} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                 <X size={20} />
             </button>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="p-8 relative z-10">
            
            {/* Top Section: Avatar & Identity */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center mb-8">
                {/* Avatar with White Border & Level Pill */}
                <div className="relative shrink-0 mx-auto md:mx-0 flex flex-col items-center">
                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-2xl bg-rpg-card flex items-center justify-center overflow-hidden relative z-10">
                        {isImageAvatar(targetUser.avatar) ? 
                            <img src={targetUser.avatar} className="w-full h-full object-cover"/> : 
                            <span className="text-6xl font-bold text-white">{targetUser.avatar}</span>
                        }
                    </div>
                    {/* Level Pill */}
                    <div className="bg-rpg-primary text-black font-black px-4 py-1 rounded-full border-2 border-white -mt-5 relative z-20 shadow-lg text-sm tracking-widest uppercase">
                        LVL {targetUser.level}
                    </div>
                </div>

                {/* Info Block */}
                <div className="flex-1 text-center md:text-left pt-4 md:pt-0">
                    <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2 md:gap-4 mb-2">
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">{targetUser.username}</h2>
                        <div 
                            onClick={copyId}
                            className="flex items-center gap-2 cursor-pointer group"
                            title="Скопировать ID"
                        >
                            <span className="text-xs font-mono text-gray-500 bg-black/40 px-2 py-1 rounded border border-rpg-border group-hover:border-rpg-primary/50 transition-colors">
                                {targetUser.uniqueId}
                            </span>
                            {copiedId && <span className="text-rpg-success text-[10px] animate-fade-in">Скопировано</span>}
                        </div>
                    </div>

                    {/* Affiliation / Guild Tag */}
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                        {affiliatedMap ? (
                            <div 
                                onClick={goToMap}
                                className="flex items-center gap-2 bg-rpg-primary/10 border border-rpg-primary/30 text-rpg-primary px-3 py-1 rounded-full cursor-pointer hover:bg-rpg-primary/20 transition-colors group"
                            >
                                <Briefcase size={12}/>
                                <span className="text-xs font-bold uppercase tracking-wider group-hover:underline">{affiliatedMap.title}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-black/40 border border-rpg-border text-gray-500 px-3 py-1 rounded-full">
                                <Briefcase size={12}/>
                                <span className="text-xs font-bold uppercase tracking-wider">Фрилансер</span>
                            </div>
                        )}
                        
                        {/* Rank Badge */}
                        {canViewStats && (
                            <div className="flex items-center gap-2 bg-black/40 border border-rpg-border text-yellow-500 px-3 py-1 rounded-full">
                                <Trophy size={12}/>
                                <span className="text-xs font-bold uppercase tracking-wider">{percentileLabel}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-gray-400 text-sm italic border-l-2 border-rpg-border pl-3">"{targetUser.description}"</p>
                </div>
            </div>

            {/* --- XP BAR (Using Theme Color) --- */}
            <div className="mb-8 bg-black/40 p-4 rounded-xl border border-rpg-border/50">
                <div className="flex justify-between text-xs font-mono text-gray-500 mb-2 uppercase tracking-widest">
                    <span className="flex items-center gap-2"><Activity size={12} className="text-rpg-primary"/> Прогресс уровня</span>
                    <span className="text-white">{Math.floor(targetUser.currentXP)} <span className="text-gray-600">/</span> {targetUser.maxXP} XP</span>
                </div>
                <div className="h-2 bg-rpg-bg rounded-full overflow-hidden relative">
                    <div 
                        className="absolute inset-y-0 left-0 bg-rpg-primary shadow-[0_0_10px_var(--primary-color)] transition-all duration-500" 
                        style={{width: `${xpPercent}%`}}
                    ></div>
                </div>
            </div>

            {/* --- STATS GRID --- */}
            {canViewStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Tasks Stat - Darker Background */}
                    <div className="bg-black/40 border border-rpg-border p-4 rounded-xl flex items-center justify-between group hover:border-white/20 transition-colors">
                        <div>
                            <div className="text-xs text-gray-500 font-mono uppercase mb-1">Выполнено задач</div>
                            <div className="text-2xl font-bold text-white font-mono">{targetUser.totalTasksCompleted}</div>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-rpg-panel border border-rpg-border flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                            <Check size={20}/>
                        </div>
                    </div>

                    {/* Efficiency Stat - Darker Background */}
                    <div className="bg-black/40 border border-rpg-border p-4 rounded-xl flex items-center justify-between group hover:border-rpg-primary/30 transition-colors">
                        <div>
                            <div className="text-xs text-gray-500 font-mono uppercase mb-1">Эффективность</div>
                            <div className="text-2xl font-bold text-rpg-primary font-mono">{weekStats.percentage}%</div>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-rpg-panel border border-rpg-border flex items-center justify-center text-rpg-primary shadow-[0_0_10px_rgba(0,0,0,0.2)]">
                            <Zap size={20}/>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-8 border border-dashed border-rpg-border rounded-xl bg-black/40 text-center mb-6">
                    <Lock size={32} className="mx-auto text-gray-600 mb-3"/>
                    <p className="text-gray-500 text-sm font-mono uppercase">Досье засекречено</p>
                </div>
            )}

            {/* --- ACTIVE QUEST (If Any) --- */}
            {canViewStats && activeQuest && (
                <div className="relative group">
                    <div className="absolute inset-0 bg-rpg-secondary/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative bg-black/40 border border-rpg-border hover:border-rpg-secondary/50 p-5 rounded-xl transition-colors">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2 text-rpg-secondary">
                                <Scroll size={16}/>
                                <span className="text-xs font-bold uppercase tracking-widest">Текущая Миссия</span>
                            </div>
                            <div className="bg-black/60 px-2 py-1 rounded text-[10px] font-mono text-gray-400 border border-rpg-border">
                                {activeQuest.xpReward} XP
                            </div>
                        </div>
                        <h4 className="text-white font-bold text-lg mb-1">{activeQuest.title}</h4>
                        <p className="text-gray-500 text-xs line-clamp-1 mb-4">{activeQuest.description}</p>
                        
                        {!isMe && !myActiveQuest && (
                            <button 
                                onClick={handleJoinQuest}
                                className="w-full py-2 bg-rpg-secondary/10 border border-rpg-secondary/30 text-rpg-secondary rounded hover:bg-rpg-secondary hover:text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                            >
                                Присоединиться <ArrowRight size={14}/>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Footer Quote */}
            {canViewStats && (
                <div className="mt-6 pt-6 border-t border-rpg-border/50 text-center">
                    <p className="text-gray-600 text-xs italic font-mono">
                        "{motivation}"
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;