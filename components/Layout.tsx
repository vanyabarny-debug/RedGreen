import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { getMotivationMessage, getPeriodProgress, getGlobalLeaderboard } from '../utils/gameLogic';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Network, Target, Sword, LogOut, ShoppingBag, Backpack, Edit2, StickyNote, BarChart3, Upload, Settings, Moon, Sun, Lock, Users, Globe, Search, UserPlus, UserCheck, X, Activity, AlertTriangle, Menu, Calendar as CalendarIcon } from 'lucide-react';
import { playSound } from '../utils/audio';
import ProfileModal from './ProfileModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// ... SettingsModal (Keep as is) ...
const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { state, dispatch } = useGame();
    const [min, setMin] = useState(state.user?.settings.dailyMin || 3);
    const [max, setMax] = useState(state.user?.settings.dailyMax || 10);
    const [theme, setTheme] = useState(state.user?.themeId || 'theme-default');
    const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>(state.user?.privacyMode || 'public');

    const handleSave = () => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: { min, max } });
        if (theme !== state.user?.themeId) {
            dispatch({ type: 'EQUIP_ITEM', payload: { category: 'theme', value: theme }});
        }
        if (privacy !== state.user?.privacyMode) {
            dispatch({ type: 'UPDATE_PRIVACY', payload: privacy });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] backdrop-blur-sm p-4">
            <div className="bg-rpg-panel p-6 rounded-lg border border-rpg-border w-full max-w-md text-rpg-text shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Настройки</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-rpg-text"><X size={24}/></button>
                </div>
                
                <div className="space-y-6 mb-8 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    <div>
                        <h4 className="text-xs font-mono uppercase text-gray-500 mb-3 border-b border-rpg-border pb-1">Сложность</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Минимум задач в день</label>
                                <input type="number" value={min} onChange={e => setMin(Number(e.target.value))} className="w-full bg-rpg-card p-2 border border-rpg-border rounded text-rpg-text focus:border-rpg-primary outline-none" />
                            </div>
                             <div>
                                <label className="block text-sm text-gray-400 mb-1">Максимум (для 100%)</label>
                                <input type="number" value={max} onChange={e => setMax(Number(e.target.value))} className="w-full bg-rpg-card p-2 border border-rpg-border rounded text-rpg-text focus:border-rpg-primary outline-none" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-mono uppercase text-gray-500 mb-3 border-b border-rpg-border pb-1">Приватность Профиля</h4>
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={() => setPrivacy('public')}
                                className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors border ${privacy === 'public' ? 'bg-rpg-primary/10 border-rpg-primary text-rpg-primary' : 'bg-rpg-card border-rpg-border text-gray-400'}`}
                            >
                                <Globe size={16}/> Виден всем
                            </button>
                            <button 
                                onClick={() => setPrivacy('friends')}
                                className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors border ${privacy === 'friends' ? 'bg-rpg-secondary/10 border-rpg-secondary text-rpg-secondary' : 'bg-rpg-card border-rpg-border text-gray-400'}`}
                            >
                                <Users size={16}/> Только друзья
                            </button>
                            <button 
                                onClick={() => setPrivacy('private')}
                                className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors border ${privacy === 'private' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-rpg-card border-rpg-border text-gray-400'}`}
                            >
                                <Lock size={16}/> Скрыт ото всех
                            </button>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-mono uppercase text-gray-500 mb-3 border-b border-rpg-border pb-1">Интерфейс</h4>
                        <div className="flex bg-rpg-card rounded border border-rpg-border p-1">
                            <button 
                                onClick={() => setTheme('theme-default')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-colors ${theme === 'theme-default' ? 'bg-rpg-panel border border-rpg-border text-rpg-text shadow' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <Moon size={14}/> Темная
                            </button>
                            <button 
                                onClick={() => setTheme('theme-light')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-colors ${theme === 'theme-light' ? 'bg-rpg-panel border border-rpg-border text-rpg-text shadow' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <Sun size={14}/> Светлая
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-rpg-text text-sm">Отмена</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-rpg-primary text-rpg-bg rounded text-sm font-bold hover:opacity-90">Сохранить</button>
                </div>
            </div>
        </div>
    );
}

// ... SocialHub (Keep as is) ...
const SocialHub: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { state, dispatch } = useGame();
    const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
    const [searchId, setSearchId] = useState('');
    const [foundUser, setFoundUser] = useState<any | null>(null);
    const [msg, setMsg] = useState('');

    const friends = state.user?.friends || [];
    const requests = state.user?.friendRequests || [];

    const handleSearch = () => {
        if (!state.user) return;
        const leaderboard = getGlobalLeaderboard(state.user);
        const player = leaderboard.find(p => p.uniqueId.toUpperCase() === searchId.toUpperCase());
        
        if (player) {
            setFoundUser(player);
            setMsg('');
        } else {
            setFoundUser(null);
            setMsg('Герой не найден');
        }
    };

    const handleSendRequest = () => {
        if (foundUser) {
            dispatch({ type: 'SEND_FRIEND_REQUEST', payload: foundUser.username });
            setMsg('Запрос отправлен!');
        }
    };

    const handleRemoveFriend = (username: string) => {
        if(window.confirm(`Удалить ${username} из друзей?`)) {
            dispatch({ type: 'REMOVE_FRIEND', payload: username });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] backdrop-blur-sm p-4">
             <div className="bg-rpg-panel rounded-lg border border-rpg-border w-full max-w-lg h-[80vh] text-rpg-text shadow-2xl flex flex-col overflow-hidden">
                 <div className="flex border-b border-rpg-border bg-rpg-card shrink-0">
                     <button onClick={() => setTab('friends')} className={`flex-1 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors ${tab === 'friends' ? 'border-rpg-primary text-rpg-primary' : 'border-transparent text-gray-500 hover:text-rpg-text'}`}>Друзья ({friends.length})</button>
                     <button onClick={() => setTab('requests')} className={`flex-1 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors ${tab === 'requests' ? 'border-rpg-secondary text-rpg-secondary' : 'border-transparent text-gray-500 hover:text-rpg-text'}`}>
                        Запросы {requests.length > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-[10px]">{requests.length}</span>}
                     </button>
                     <button onClick={() => setTab('search')} className={`flex-1 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors ${tab === 'search' ? 'border-rpg-success text-rpg-success' : 'border-transparent text-gray-500 hover:text-rpg-text'}`}>Поиск</button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-rpg-bg">
                    {tab === 'friends' && (
                        <div className="space-y-2">
                            {friends.length === 0 && <div className="text-center text-gray-500 mt-10 text-sm">Список друзей пуст</div>}
                            {friends.map(friend => (
                                <div key={friend} className="bg-rpg-card p-3 rounded border border-rpg-border flex justify-between items-center group">
                                    <span className="font-bold">{friend}</span>
                                    <button onClick={() => handleRemoveFriend(friend)} className="text-gray-600 hover:text-red-500 p-1"><X size={16}/></button>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'requests' && (
                        <div className="space-y-4">
                            {requests.length === 0 && <div className="text-center text-gray-500 mt-10 text-sm">Нет входящих запросов</div>}
                            {requests.map(req => (
                                <div key={req.fromUsername} className="bg-rpg-card p-4 rounded border border-rpg-border flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-rpg-panel border border-rpg-border flex items-center justify-center text-lg">{req.fromAvatar}</div>
                                        <div>
                                            <p className="font-bold text-sm">{req.fromUsername}</p>
                                            <p className="text-[10px] text-gray-500">ID: {req.fromId}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => dispatch({type: 'ACCEPT_FRIEND_REQUEST', payload: req.fromUsername})}
                                            className="flex-1 bg-rpg-secondary hover:bg-blue-600 text-white py-1.5 rounded text-xs font-bold transition-colors"
                                        >
                                            Принять
                                        </button>
                                        <button 
                                            onClick={() => dispatch({type: 'REJECT_FRIEND_REQUEST', payload: req.fromUsername})}
                                            className="flex-1 bg-rpg-panel border border-rpg-border hover:bg-rpg-border text-gray-400 hover:text-rpg-text py-1.5 rounded text-xs font-bold transition-colors"
                                        >
                                            Отклонить
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'search' && (
                        <div>
                             <div className="flex gap-2 mb-6">
                                <input 
                                    className="flex-1 bg-rpg-card border border-rpg-border rounded p-2 text-rpg-text outline-none focus:border-rpg-primary placeholder-gray-600"
                                    placeholder="#ID"
                                    value={searchId}
                                    onChange={e => setSearchId(e.target.value)}
                                />
                                <button onClick={handleSearch} className="bg-rpg-card border border-rpg-border hover:bg-rpg-border p-2 rounded text-rpg-text"><Search size={20}/></button>
                            </div>

                            {msg && <p className={`text-sm mb-4 text-center ${msg.includes('отправлен') ? 'text-green-500' : 'text-red-500'}`}>{msg}</p>}

                            {foundUser && (
                                <div className="bg-rpg-card p-4 rounded border border-rpg-border flex justify-between items-center animate-fade-in">
                                    <div>
                                        <p className="font-bold text-lg">{foundUser.username}</p>
                                        <p className="text-xs text-gray-500">Уровень {foundUser.level}</p>
                                    </div>
                                    {state.user?.friends?.includes(foundUser.username) ? (
                                        <span className="text-green-500 text-xs font-bold flex items-center gap-1"><UserCheck size={14}/> Друг</span>
                                    ) : (
                                        <button onClick={handleSendRequest} className="bg-rpg-primary text-rpg-bg px-4 py-2 rounded text-sm font-bold hover:opacity-90 flex items-center gap-2">
                                            <UserPlus size={16}/> В друзья
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                 </div>

                 <div className="p-4 border-t border-rpg-border bg-rpg-card flex justify-between items-center shrink-0">
                     <span className="text-xs text-gray-500">ID: <span className="text-rpg-primary font-mono cursor-pointer" onClick={() => {navigator.clipboard.writeText(state.user!.uniqueId); alert('ID скопирован')}}>{state.user?.uniqueId}</span></span>
                     <button onClick={onClose} className="text-gray-500 hover:text-rpg-text text-sm">Закрыть</button>
                 </div>
             </div>
        </div>
    )
}

// ... MoodCaptcha (Keep as is) ...
const MoodCaptcha: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { state, dispatch } = useGame();
    const [selectedMood, setSelectedMood] = useState<number | null>(null);
    const [warning, setWarning] = useState('');

    const MOOD_OPTIONS = [
        { val: 1, text: '×_×', label: 'Ужасно' },
        { val: 2, text: 'T_T', label: 'Плохо' },
        { val: 3, text: '-_-', label: 'Норм' },
        { val: 4, text: '^_^', label: 'Хорошо' },
        { val: 5, text: '^o^', label: 'Отлично' },
        { val: 6, text: '*_*', label: 'Супер' },
    ];

    const handleSubmit = () => {
        if (selectedMood === null) return;
        if (state.user?.moodHistory && state.user.moodHistory.length > 0) {
            const lastEntry = state.user.moodHistory[state.user.moodHistory.length - 1];
            if (Math.abs(lastEntry.value - selectedMood) >= 3) {
                 setWarning("Замечен резкий перепад настроения!");
                 dispatch({ type: 'LOG_MOOD', payload: selectedMood });
                 playSound('fail'); 
                 setTimeout(() => onClose(), 5000);
                 return;
            }
        }
        dispatch({ type: 'LOG_MOOD', payload: selectedMood });
        playSound('success');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300] backdrop-blur-md p-4">
            <div className="bg-rpg-panel border border-rpg-primary/50 w-full max-w-lg p-6 rounded-lg shadow-2xl relative overflow-hidden text-center">
                 <div className="absolute top-0 left-0 w-full h-1 bg-rpg-primary animate-pulse"></div>
                 <div className="mb-4 flex justify-center text-rpg-primary">
                     <Activity size={40} className="animate-pulse"/>
                 </div>
                 <h2 className="text-xl font-bold font-mono text-rpg-text mb-2">Какое у тебя настроение?</h2>
                 
                 {warning ? (
                     <div className="bg-red-500/10 border border-red-500 p-4 rounded mb-4 animate-fade-in">
                         <div className="flex items-center justify-center gap-2 text-red-500 font-bold mb-2">
                             <AlertTriangle size={20}/> ВНИМАНИЕ
                         </div>
                         <p className="text-white text-sm">{warning}</p>
                     </div>
                 ) : (
                     <div className="grid grid-cols-3 gap-3 mb-6">
                        {MOOD_OPTIONS.map(opt => (
                            <button
                                key={opt.val}
                                onClick={() => setSelectedMood(opt.val)}
                                className={`flex flex-col items-center justify-center py-3 rounded border transition-all duration-200 ${selectedMood === opt.val ? 'bg-rpg-primary border-rpg-primary shadow-lg' : 'bg-rpg-card border-rpg-border'}`}
                            >
                                <span className="text-lg font-bold mb-1 font-mono whitespace-nowrap">{opt.text}</span>
                                <span className={`text-[10px] uppercase font-bold ${selectedMood === opt.val ? 'text-black' : 'text-gray-500'}`}>{opt.label}</span>
                            </button>
                        ))}
                     </div>
                 )}
                 
                 {!warning && (
                    <button onClick={handleSubmit} disabled={selectedMood === null} className={`w-full py-3 rounded uppercase font-bold tracking-widest transition-all ${selectedMood !== null ? 'bg-rpg-primary text-black hover:opacity-90 shadow-lg' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                        Подтвердить
                    </button>
                 )}
            </div>
        </div>
    );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useGame();
  const { user, showLevelUp, xpGain, tasks } = state;
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [showProfileStats, setShowProfileStats] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [progressMode, setProgressMode] = useState<'week' | 'month' | 'year'>('week');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Swipe Logic Refs
  const touchStartRef = useRef<number | null>(null);

  useEffect(() => {
      if (user?.themeId === 'theme-light') document.body.classList.add('light-theme');
      else document.body.classList.remove('light-theme');
  }, [user?.themeId]);

  useEffect(() => {
      if (user) {
          const today = format(new Date(), 'yyyy-MM-dd');
          const hasLoggedToday = user.moodHistory?.some(m => m.date === today);
          if (!hasLoggedToday) {
              const t = setTimeout(() => setMoodOpen(true), 1000);
              return () => clearTimeout(t);
          }
      }
  }, [user]);

  useEffect(() => {
    if (xpGain) {
        const timer = setTimeout(() => dispatch({type: 'CLEAR_XP_ANIMATION'}), 1000);
        return () => clearTimeout(timer);
    }
  }, [xpGain, dispatch]);

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const touchEnd = e.changedTouches[0].clientX;
      const deltaX = touchStartRef.current - touchEnd;

      // Swipe Right to Open Menu (start near left edge)
      if (touchStartRef.current < 50 && deltaX < -50) {
          setMobileMenuOpen(true);
      }
      
      // Swipe Left to Close Menu (if open)
      if (mobileMenuOpen && deltaX > 50) {
          setMobileMenuOpen(false);
      }
      
      touchStartRef.current = null;
  };

  if (!user) return null;

  const progressStats = getPeriodProgress(state.tasks, user.settings, progressMode);
  const xpPercent = Math.min(100, (user.currentXP / user.maxXP) * 100);
  const requestsCount = user.friendRequests?.length || 0;
  const motivation = getMotivationMessage(progressStats.pacePercent, user.communicationStyle);

  const toggleProgressMode = () => {
      playSound('click');
      if (progressMode === 'week') setProgressMode('month');
      else if (progressMode === 'month') setProgressMode('year');
      else setProgressMode('week');
  };

  const handleUpdateProfile = () => {
      dispatch({type: 'UPDATE_PROFILE', payload: { avatar: user.avatar, description: newDesc || user.description }});
      setEditProfileOpen(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              dispatch({type: 'UPDATE_PROFILE', payload: { avatar: reader.result as string, description: user.description }});
          };
          reader.readAsDataURL(file);
      }
  };

  const isImageAvatar = (avatar: string) => avatar.length > 10 || avatar.startsWith('data:') || avatar.startsWith('http');

  // Sidebar Content (Reused for Desktop Sidebar and Mobile Menu)
  const SidebarContent = () => (
      <>
        <div className="p-6 border-b border-rpg-border flex flex-col items-center text-center relative group">
             <div className="relative cursor-pointer mt-4" onClick={() => { setShowProfileStats(true); playSound('click'); }}>
                 <div className="w-20 h-20 md:w-24 md:h-24 bg-rpg-card rounded-full flex items-center justify-center text-3xl md:text-4xl mb-4 border border-rpg-border shadow-lg overflow-hidden hover:border-rpg-primary transition-colors">
                     {isImageAvatar(user.avatar) ? 
                        <img src={user.avatar} className="w-full h-full object-cover"/> : 
                        <span className="text-rpg-text">{user.avatar}</span>
                     }
                 </div>
                 <button 
                    onClick={(e) => { e.stopPropagation(); setNewDesc(user.description); setEditProfileOpen(true); }}
                    className="absolute bottom-0 right-0 bg-rpg-card border border-rpg-border p-2 rounded-full hover:bg-rpg-primary hover:text-rpg-bg transition-colors text-rpg-text"
                 >
                     <Edit2 size={12}/>
                 </button>
             </div>
             
             <h2 className="font-bold text-lg md:text-xl text-rpg-primary tracking-tight cursor-pointer hover:underline" onClick={() => setShowProfileStats(true)}>{user.username}</h2>
             <p className="text-xs font-mono text-rpg-muted uppercase tracking-wider mb-2">Level {user.level}</p>
             <p className="text-xs text-gray-500 italic max-w-[200px] leading-relaxed">"{user.description}"</p>
             
             <div className="w-full mt-6 bg-rpg-card rounded-full h-2 overflow-hidden shadow-inner">
                 <div className="h-full bg-rpg-primary transition-all duration-300" style={{width: `${xpPercent}%`}}></div>
             </div>
             <div className="flex justify-between w-full text-[10px] font-mono text-gray-500 mt-1.5">
                 <span>XP {user.currentXP}</span>
                 <span>MAX {user.maxXP}</span>
             </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Планировщик" onClick={() => setMobileMenuOpen(false)}/>
            <NavItem to="/goals" icon={<Target size={18} />} label="Несрочные задачи" onClick={() => setMobileMenuOpen(false)}/>
            <NavItem to="/skills" icon={<Network size={18} />} label="Навыки" onClick={() => setMobileMenuOpen(false)}/>
            <NavItem to="/quests" icon={<Sword size={18} />} label="Квесты" onClick={() => setMobileMenuOpen(false)}/>
            <NavItem to="/inventory" icon={<Backpack size={18} />} label="Инвентарь" onClick={() => setMobileMenuOpen(false)}/>
            <NavItem to="/notes" icon={<StickyNote size={18} />} label="Заметки" onClick={() => setMobileMenuOpen(false)}/>
            <NavItem to="/analytics" icon={<BarChart3 size={18} />} label="Аналитика" onClick={() => setMobileMenuOpen(false)}/>
            <div className="h-px bg-rpg-border my-4 mx-4"></div>
            <NavItem to="/shop" icon={<ShoppingBag size={18} />} label="Магазин" onClick={() => setMobileMenuOpen(false)}/>
            
            <button 
                onClick={() => { setSocialOpen(true); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-gray-400 hover:text-rpg-text hover:bg-rpg-card/50 w-full text-left relative"
            >
                <Users size={18}/>
                <span className="font-medium text-sm">Социальный Центр</span>
                {requestsCount > 0 && <span className="absolute right-4 bg-red-500 text-white text-[10px] px-1.5 rounded-full animate-pulse">{requestsCount}</span>}
            </button>
        </nav>

        <div className="p-4 border-t border-rpg-border">
            <button onClick={() => dispatch({type: 'LOGOUT'})} className="flex items-center gap-3 text-rpg-muted hover:text-rpg-text transition-colors w-full px-4 py-2 hover:bg-rpg-card rounded-lg text-sm font-medium">
                <LogOut size={18} /> Выход
            </button>
        </div>
      </>
  );

  return (
    <div 
        className="flex h-screen bg-rpg-bg text-rpg-text overflow-hidden font-sans selection:bg-rpg-primary selection:text-rpg-bg transition-colors duration-300"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
    >
      
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex w-72 bg-rpg-panel border-r border-rpg-border flex-col shrink-0 transition-colors duration-300">
          <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-rpg-bg relative transition-colors duration-300">
          
          {/* Responsive Header */}
          <header className="h-auto md:h-32 bg-rpg-bg/90 backdrop-blur border-b border-rpg-border flex flex-col md:flex-row md:items-center justify-between px-4 py-4 md:px-8 z-10 shrink-0">
               {/* Mobile Top Bar: Level & Quick Settings */}
               <div className="flex md:hidden justify-between items-center w-full mb-4">
                   <button onClick={() => setMobileMenuOpen(true)} className="flex items-center gap-3">
                       <Menu size={24} className="text-rpg-primary"/>
                       <div className="w-10 h-10 bg-rpg-card rounded-full border border-rpg-primary flex items-center justify-center overflow-hidden">
                            {isImageAvatar(user.avatar) ? <img src={user.avatar} className="w-full h-full object-cover"/> : user.avatar}
                       </div>
                   </button>
                   <div className="flex gap-2">
                       <button onClick={() => setSettingsOpen(true)} className="p-2 bg-rpg-card rounded border border-rpg-border text-gray-400"><Settings size={18}/></button>
                   </div>
               </div>

               <div className="flex-1 w-full max-w-3xl flex items-center gap-4">
                   {/* Main Progress Bar */}
                   <div className="flex flex-col flex-1 cursor-pointer group" onClick={toggleProgressMode}>
                       <div className="flex justify-between items-end mb-1 md:mb-2">
                           <div className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-rpg-primary transition-colors">
                               {progressMode === 'week' ? 'Неделя' : progressMode === 'month' ? 'Месяц' : 'Год'}
                           </div>
                           <span className={`text-base md:text-xl font-bold font-mono ${progressStats.absolutePercent >= 100 ? 'text-rpg-success' : 'text-rpg-primary'}`}>
                               {progressStats.absolutePercent}%
                           </span>
                       </div>
                       <div className="w-full bg-rpg-card h-4 md:h-8 rounded-lg overflow-hidden border border-rpg-border shadow-inner relative">
                            <div 
                                className={`h-full ${progressStats.absolutePercent >= 100 ? 'bg-rpg-success shadow-[0_0_20px_#10b981]' : 'bg-rpg-primary shadow-[0_0_20px_#fafafa]'} transition-all duration-1000 relative flex items-center justify-end px-3 ${progressStats.absolutePercent === 0 ? 'hidden' : ''}`} 
                                style={{width: `${progressStats.absolutePercent}%`}}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse hidden md:block"></div>
                            </div>
                       </div>
                       <div className="mt-1 md:mt-2 text-right">
                           <span className="text-xs md:text-lg font-bold text-white block line-clamp-1">
                               {motivation}
                           </span>
                       </div>
                   </div>
               </div>
               
               {/* Desktop Header Extras */}
               <div className="hidden md:flex items-center gap-6 ml-4">
                   <div className="text-right flex flex-col items-end">
                       <p className="text-lg font-bold text-rpg-primary capitalize">
                           {format(new Date(), 'd MMM yyyy', { locale: ru })}
                       </p>
                       <p className="text-xs text-gray-500 font-mono">Сегодня</p>
                   </div>
                   <button 
                        onClick={() => setSettingsOpen(true)}
                        className="bg-rpg-card border border-rpg-border p-2.5 rounded-lg text-gray-400 hover:text-rpg-primary hover:border-rpg-primary transition-all shadow-sm"
                   >
                       <Settings size={20} />
                   </button>
               </div>
          </header>

          <main className="flex-1 p-4 md:p-8 overflow-auto pb-24 md:pb-8">
              {children}
          </main>

          {/* XP Float Animation */}
          {xpGain && (
              <div 
                  className="fixed pointer-events-none text-rpg-primary font-bold text-2xl animate-fade-in z-50 flex items-center gap-1 font-mono"
                  style={{ left: xpGain.x, top: xpGain.y, transform: 'translate(-50%, -100%)' }}
              >
                  +{xpGain.amount} XP
              </div>
          )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-rpg-panel/95 backdrop-blur border-t border-rpg-border flex justify-around items-center z-40 px-2 pb-safe">
            <MobileNavLink to="/" icon={<CalendarIcon size={20} />} label="Календарь" />
            
            <button onClick={() => { playSound('click'); setSocialOpen(true); }} className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-rpg-primary">
                <Users size={20} />
                <span className="text-[10px] font-medium">Друзья</span>
            </button>
            
            <div className="relative -top-5">
                <NavLink to="/dashboard" onClick={() => playSound('click')} className={({isActive}) => `flex items-center justify-center w-14 h-14 rounded-full border-4 border-rpg-bg shadow-lg ${isActive ? 'bg-rpg-primary text-black' : 'bg-rpg-card text-gray-400 border-rpg-border'}`}>
                    <Sword size={24} />
                </NavLink>
            </div>
            
            <MobileNavLink to="/notes" icon={<StickyNote size={20} />} label="Заметки" />
            
            <button onClick={() => setMobileMenuOpen(true)} className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-rpg-primary">
                <Menu size={20} />
                <span className="text-[10px] font-medium">Меню</span>
            </button>
      </div>

      {/* Mobile Menu Drawer (Left Side) */}
      {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
              {/* Menu slides in from LEFT now */}
              <div className="absolute left-0 top-0 bottom-0 w-[80%] max-w-[300px] bg-rpg-panel border-r border-rpg-border shadow-2xl flex flex-col animate-slide-in-left">
                   <div className="p-4 flex justify-between items-center">
                       <span className="text-rpg-primary font-bold">МЕНЮ</span>
                       <button onClick={() => setMobileMenuOpen(false)}><X size={24} className="text-gray-500"/></button>
                   </div>
                   <SidebarContent />
              </div>
          </div>
      )}

      {/* Level Up Overlay */}
      {showLevelUp && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-fade-in backdrop-blur-md px-4 text-center">
               <div className="text-5xl md:text-7xl mb-6 font-thin text-white tracking-tighter">LEVEL UP</div>
               <div className="w-24 h-1 bg-rpg-primary mb-8"></div>
               <p className="text-lg md:text-xl text-gray-400 font-light mb-12">Уровень доступа повышен.</p>
               <button 
                onClick={() => dispatch({type: 'CLOSE_LEVEL_UP'})}
                className="px-12 py-3 border border-white text-white hover:bg-white hover:text-black transition-all uppercase tracking-widest text-sm font-bold"
               >
                   Продолжить
               </button>
          </div>
      )}

      {moodOpen && <MoodCaptcha onClose={() => setMoodOpen(false)} />}
      {showProfileStats && <ProfileModal user={user} tasks={tasks} onClose={() => setShowProfileStats(false)} />}
      {editProfileOpen && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center backdrop-blur-sm p-4">
              <div className="bg-rpg-panel p-6 rounded-lg w-full max-w-sm border border-rpg-border shadow-2xl">
                  <h3 className="text-xl font-bold mb-6 text-rpg-primary tracking-tight">Профиль</h3>
                  <div className="space-y-6">
                      <div>
                          <label className="block text-xs font-mono uppercase text-gray-500 mb-2">Загрузить Аватар</label>
                          <div className="relative">
                              <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                              <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 bg-rpg-card border border-rpg-border rounded hover:border-rpg-primary text-sm text-gray-400 flex items-center justify-center gap-2 transition-colors">
                                  <Upload size={16}/> Выбрать файл
                              </button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-mono uppercase text-gray-500 mb-2">Статус / Био</label>
                          <textarea className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-rpg-text h-24 resize-none focus:border-rpg-primary outline-none" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                      </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-8">
                      <button onClick={() => setEditProfileOpen(false)} className="px-4 py-2 text-gray-500 hover:text-rpg-text text-sm">Отмена</button>
                      <button onClick={handleUpdateProfile} className="px-6 py-2 bg-rpg-primary text-rpg-bg text-sm font-bold rounded hover:opacity-90">Сохранить</button>
                  </div>
              </div>
          </div>
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {socialOpen && <SocialHub onClose={() => setSocialOpen(false)} />}
    </div>
  );
};

const NavItem: React.FC<any> = ({ to, icon, label, onClick }) => (
    <NavLink to={to} onClick={() => { playSound('hover'); if(onClick) onClick(); }} className={({isActive}) => `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${isActive ? 'bg-rpg-card text-rpg-text border border-rpg-border shadow-sm' : 'text-gray-400 hover:text-rpg-text hover:bg-rpg-card/50'}`}>
        {icon}
        <span className="font-medium text-sm">{label}</span>
    </NavLink>
);

const MobileNavLink: React.FC<any> = ({ to, icon, label }) => (
    <NavLink to={to} onClick={() => playSound('hover')} className={({isActive}) => `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? 'text-rpg-primary' : 'text-gray-400'}`}>
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
);

export default Layout;