import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { getMotivationMessage, getPeriodProgress, GlobalMapDB } from '../utils/gameLogic';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Network, Target, Sword, LogOut, ShoppingBag, Backpack, Edit2, StickyNote, BarChart3, Upload, Settings, Moon, Sun, Lock, Users, Globe, X, Activity, AlertTriangle, Menu, Calendar as CalendarIcon, Repeat, Wallet, Plus, Minus, ArrowRight, ChevronLeft, Camera, CheckSquare, Square, Zap, Clock, Calendar, Check, Link as LinkIcon, Tag, Layers, GitMerge, Briefcase } from 'lucide-react';
import { playSound } from '../utils/audio';
import ProfileModal from './ProfileModal';
import OnboardingWizard from './OnboardingWizard';
import QuickTaskWizard from './QuickTaskWizard'; // Import here
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Task } from '../types';
import { THEME_COLORS } from '../context/GameContext';

// ... SettingsModal ...
const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { state, dispatch } = useGame();
    const [min, setMin] = useState(state.user?.settings.dailyMin || 3);
    const [max, setMax] = useState(state.user?.settings.dailyMax || 10);
    const [theme, setTheme] = useState(state.user?.themeId || 'theme-tiffany');
    const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>(state.user?.privacyMode || 'public');
    const [appMode, setAppMode] = useState<'standard' | 'advanced'>(state.user?.appMode || 'advanced');

    const handleSave = () => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: { min, max } });
        if (privacy !== state.user?.privacyMode) {
            dispatch({ type: 'UPDATE_PRIVACY', payload: privacy });
        }
        
        // Trigger Onboarding if switching to Advanced and RESET skills
        if (appMode === 'advanced' && state.user?.appMode !== 'advanced') {
            dispatch({ type: 'RESET_SKILLS' }); // Clear standard tags
            dispatch({ type: 'SET_APP_MODE', payload: 'advanced' });
            dispatch({ type: 'SET_ONBOARDING_STEP', payload: 2 }); // Reset to Step 2 (Warning -> Builder)
        } else if (appMode !== state.user?.appMode) {
            dispatch({ type: 'SET_APP_MODE', payload: appMode });
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
                    {/* App Mode Section */}
                    <div>
                        <h4 className="text-xs font-mono uppercase text-gray-500 mb-3 border-b border-rpg-border pb-1">Режим Приложения</h4>
                        <div className="flex bg-rpg-card rounded border border-rpg-border p-1">
                            <button 
                                onClick={() => setAppMode('standard')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-colors ${appMode === 'standard' ? 'bg-white text-black shadow' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <Layers size={14}/> Стандарт
                            </button>
                            <button 
                                onClick={() => setAppMode('advanced')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-colors ${appMode === 'advanced' ? 'bg-rpg-primary text-black shadow' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <Sword size={14}/> Продвинутый
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">
                            {appMode === 'standard' ? 'Простой список задач и теги. Без дерева и квестов.' : 'Полная RPG система с деревом навыков и квестами.'}
                        </p>
                    </div>

                    <div>
                        <h4 className="text-xs font-mono uppercase text-gray-500 mb-3 border-b border-rpg-border pb-1">Сложность</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Минимум задач в день</label>
                                <input type="number" value={min} onChange={e => setMin(Number(e.target.value))} className="w-full bg-rpg-card p-2 border border-rpg-border rounded text-rpg-text focus:border-white outline-none" />
                            </div>
                             <div>
                                <label className="block text-sm text-gray-400 mb-1">Максимум (для 100%)</label>
                                <input type="number" value={max} onChange={e => setMax(Number(e.target.value))} className="w-full bg-rpg-card p-2 border border-rpg-border rounded text-rpg-text focus:border-white outline-none" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-mono uppercase text-gray-500 mb-3 border-b border-rpg-border pb-1">Приватность Профиля</h4>
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={() => setPrivacy('public')}
                                className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors border ${privacy === 'public' ? 'bg-white text-black border-white' : 'bg-rpg-card border-rpg-border text-gray-400'}`}
                            >
                                <Globe size={16}/> Виден всем
                            </button>
                            <button 
                                onClick={() => setPrivacy('friends')}
                                className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors border ${privacy === 'friends' ? 'bg-white text-black border-white' : 'bg-rpg-card border-rpg-border text-gray-400'}`}
                            >
                                <Users size={16}/> Только друзья
                            </button>
                            <button 
                                onClick={() => setPrivacy('private')}
                                className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors border ${privacy === 'private' ? 'bg-red-500 text-white border-red-500' : 'bg-rpg-card border-rpg-border text-gray-400'}`}
                            >
                                <Lock size={16}/> Скрыт ото всех
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-rpg-text text-sm">Отмена</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-white text-black rounded text-sm font-bold hover:bg-gray-200">Сохранить</button>
                </div>
            </div>
        </div>
    );
}

// ... MoodCaptcha ...
const MoodCaptcha: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    // ... existing implementation
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
            <div className="bg-rpg-panel border border-rpg-border w-full max-w-lg p-6 rounded-lg shadow-2xl relative overflow-hidden text-center">
                 <div className="absolute top-0 left-0 w-full h-1 bg-white"></div>
                 <div className="mb-4 flex justify-center text-white">
                     <Activity size={40} className=""/>
                 </div>
                 <h2 className="text-xl font-bold font-mono text-white mb-2">Какое у тебя настроение?</h2>
                 
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
                                className={`flex flex-col items-center justify-center py-3 rounded border transition-all duration-200 ${selectedMood === opt.val ? 'bg-white text-black border-white shadow-lg' : 'bg-rpg-card border-rpg-border text-gray-400'}`}
                            >
                                <span className="text-lg font-bold mb-1 font-mono whitespace-nowrap">{opt.text}</span>
                                <span className={`text-[10px] uppercase font-bold ${selectedMood === opt.val ? 'text-black' : 'text-gray-500'}`}>{opt.label}</span>
                            </button>
                        ))}
                     </div>
                 )}
                 
                 {!warning && (
                    <button 
                        onClick={handleSubmit} 
                        disabled={selectedMood === null} 
                        className={`w-full py-3 rounded uppercase font-bold tracking-widest transition-all ${
                            selectedMood !== null 
                                ? 'bg-white text-black hover:bg-gray-200 shadow-lg' 
                                : 'bg-rpg-card border border-rpg-border text-gray-600 cursor-not-allowed'
                        }`}
                    >
                        Подтвердить
                    </button>
                 )}
            </div>
        </div>
    );
};

const QuickFinanceModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    // ... existing implementation
    const { dispatch } = useGame();
    const [step, setStep] = useState(1);
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [amount, setAmount] = useState('');
    const [attachReceipt, setAttachReceipt] = useState(false);
    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const EXPENSE_CATEGORIES = ['Еда', 'Жилье', 'Транспорт', 'Здоровье', 'Отдых', 'Образование', 'Другое'];
    const INCOME_CATEGORIES = ['Зарплата', 'Фриланс', 'Подарок', 'Продажа', 'Другое'];
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    const handleTypeSelect = (t: 'income' | 'expense') => { setType(t); setStep(2); playSound('click'); };
    const handleAmountNext = () => { if (!amount) return; setStep(3); playSound('click'); };
    const handleCategorySelect = (cat: string) => { setSelectedCategory(cat); if (attachReceipt) { setStep(4); } else { saveTransaction(cat, null); } playSound('click'); };
    const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = reader.result as string;
                setReceiptImage(img);
                saveTransaction(selectedCategory, img);
            };
            reader.readAsDataURL(file);
        }
    };
    const saveTransaction = (cat: string, img: string | null) => {
        dispatch({
            type: 'ADD_TRANSACTION',
            payload: { id: `trans_${Date.now()}`, amount: Number(amount), type, category: cat, date: new Date().toISOString(), description: 'Быстрая запись', receiptImage: img || undefined }
        });
        playSound('success');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-[400] flex flex-col items-center justify-center p-4 animate-fade-in">
             <div className="w-full max-w-md h-full max-h-[600px] flex flex-col relative">
                <button onClick={onClose} className="absolute top-0 right-0 p-4 text-gray-500 z-50"><X size={28}/></button>
                {step > 1 && (<button onClick={() => setStep(step - 1)} className="absolute top-0 left-0 p-4 text-gray-500 z-50"><ChevronLeft size={28}/></button>)}
                {step === 1 && (
                    <div className="flex-1 flex flex-col justify-center gap-6 animate-fade-in">
                        <h2 className="text-2xl font-bold text-center text-white mb-4">Тип Операции</h2>
                        <button onClick={() => handleTypeSelect('income')} className="flex-1 bg-green-900/20 border-2 border-green-600 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-green-900/40 transition-all active:scale-95"><div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-black"><Plus size={40}/></div><span className="text-3xl font-bold text-green-500">Доход</span></button>
                        <button onClick={() => handleTypeSelect('expense')} className="flex-1 bg-red-900/20 border-2 border-red-600 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-red-900/40 transition-all active:scale-95"><div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white"><Minus size={40}/></div><span className="text-3xl font-bold text-red-500">Расход</span></button>
                    </div>
                )}
                {step === 2 && (
                    <div className="flex-1 flex flex-col justify-center animate-fade-in">
                        <h2 className={`text-2xl font-bold text-center mb-8 ${type === 'income' ? 'text-green-500' : 'text-red-500'}`}>{type === 'income' ? 'Сумма Дохода' : 'Сумма Расхода'}</h2>
                        <input type="number" className="w-full bg-transparent border-b-2 border-gray-700 text-center text-5xl font-mono text-white p-4 outline-none focus:border-white transition-colors" placeholder="0" autoFocus value={amount} onChange={e => setAmount(e.target.value)}/>
                        <div className="mt-8 flex justify-center"><button onClick={() => setAttachReceipt(!attachReceipt)} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">{attachReceipt ? (<CheckSquare size={24} className="text-white"/>) : (<Square size={24}/>)}<span className="text-lg">Прикрепить чек</span></button></div>
                        <button onClick={handleAmountNext} disabled={!amount} className={`mt-12 w-full py-4 rounded-xl font-bold text-xl transition-all ${amount ? 'bg-white text-black' : 'bg-gray-800 text-gray-500'}`}>Далее</button>
                    </div>
                )}
                {step === 3 && (
                    <div className="flex-1 flex flex-col animate-fade-in pt-12">
                        <h2 className="text-2xl font-bold text-center text-white mb-8">Выберите категорию</h2>
                        <div className="grid grid-cols-2 gap-4 overflow-y-auto pb-4">
                            {categories.map(cat => (<button key={cat} onClick={() => handleCategorySelect(cat)} className="bg-rpg-card border border-rpg-border p-6 rounded-xl text-lg font-bold text-gray-300 hover:border-white hover:text-white transition-all active:scale-95 flex flex-col items-center justify-center text-center h-32">{cat}</button>))}
                        </div>
                    </div>
                )}
                {step === 4 && (
                    <div className="flex-1 flex flex-col justify-center items-center animate-fade-in text-center p-6">
                        <Camera size={64} className="text-white mb-6 animate-pulse"/>
                        <h2 className="text-2xl font-bold text-white mb-4">Фото чека</h2>
                        <p className="text-gray-400 mb-8">Сфотографируйте чек для сохранения в архиве.</p>
                        <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleCameraCapture}/>
                        <button onClick={() => fileInputRef.current?.click()} className="w-full bg-white text-black font-bold py-4 rounded-xl text-xl hover:bg-gray-200 transition-colors mb-4">Открыть Камеру</button>
                        <button onClick={() => saveTransaction(selectedCategory, null)} className="text-gray-500 hover:text-white underline text-sm">Пропустить</button>
                    </div>
                )}
             </div>
        </div>
    );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useGame();
  const { user, showLevelUp, xpGain, tasks } = state;
  const shouldShowOnboarding = user && (user.onboardingStep === undefined || user.onboardingStep < 4);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [showProfileStats, setShowProfileStats] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newAffiliation, setNewAffiliation] = useState<string>(''); // New State for edit modal
  
  const [progressMode, setProgressMode] = useState<'week' | 'month' | 'year'>('week');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [quickFinanceOpen, setQuickFinanceOpen] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const touchStartRef = useRef<number | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
      const themeId = user?.themeId || 'theme-tiffany';
      const color = THEME_COLORS[themeId] || THEME_COLORS['theme-tiffany'];
      document.documentElement.style.setProperty('--primary-color', color);
  }, [user?.themeId]);

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

  // Keyboard Navigation for Sidebar (Direct Route Switching)
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (window.innerWidth < 768) return; // PC only
          if (editProfileOpen || settingsOpen || moodOpen || quickFinanceOpen || quickTaskOpen || shouldShowOnboarding) return; // Modals
          const target = e.target as HTMLElement;
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return;

          const isAdvanced = state.user?.appMode === 'advanced';
          // UPDATED NAVIGATION ORDER
          const navOrder = [
              '/',              // Planner
              '/goals',         // Goals
              ...(isAdvanced ? ['/quests'] : []), // Quests
              '/structures',    // Structures
              '/wallet',        // Finance
              '/skills',        // Categories
              '/habits',        // Habits
              '/analytics',     // Analytics
              // --- Divider ---
              '/inventory',     // Inventory
              '/notes',         // Notes
              // --- Divider ---
              '/shop',          // Shop
              '/social'         // Social
          ];

          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              
              const currentPath = location.pathname;
              // Check if we are on a known path, defaults to index 0 if unknown (or sub-route not handled perfectly)
              let currentIndex = navOrder.indexOf(currentPath);
              
              if (currentIndex === -1) {
                  // Fallback for sub-routes if needed, or default to home
                  currentIndex = 0;
              }

              let nextIndex;
              if (e.key === 'ArrowDown') {
                  nextIndex = (currentIndex + 1) % navOrder.length;
              } else {
                  nextIndex = (currentIndex - 1 + navOrder.length) % navOrder.length;
              }

              navigate(navOrder[nextIndex]);
              playSound('click'); 
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editProfileOpen, settingsOpen, moodOpen, quickFinanceOpen, quickTaskOpen, location.pathname, state.user?.appMode, shouldShowOnboarding]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartRef.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const touchEnd = e.changedTouches[0].clientX;
      const deltaX = touchStartRef.current - touchEnd;
      if (touchStartRef.current < 50 && deltaX < -50) setMobileMenuOpen(true);
      if (mobileMenuOpen && deltaX > 50) setMobileMenuOpen(false);
      touchStartRef.current = null;
  };

  if (!user) return null;
  const isAdvanced = user.appMode === 'advanced';
  const progressStats = getPeriodProgress(state.tasks, user.settings, progressMode);
  const requestsCount = user.friendRequests?.length || 0;
  const motivation = getMotivationMessage(progressStats.pacePercent, user.communicationStyle);
  const toggleProgressMode = () => { playSound('click'); if (progressMode === 'week') setProgressMode('month'); else if (progressMode === 'month') setProgressMode('year'); else setProgressMode('week'); };
  
  const handleUpdateProfile = () => { 
      dispatch({type: 'UPDATE_PROFILE', payload: { avatar: user.avatar, description: newDesc || user.description }});
      // Also update affiliation
      dispatch({ type: 'SET_AFFILIATION', payload: newAffiliation || undefined });
      setEditProfileOpen(false); 
  };
  
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { dispatch({type: 'UPDATE_PROFILE', payload: { avatar: reader.result as string, description: user.description }}); }; reader.readAsDataURL(file); } };
  const isImageAvatar = (avatar: string) => avatar.length > 10 || avatar.startsWith('data:') || avatar.startsWith('http');

  // --- AFFILIATION / WORKPLACE ---
  // Try to find the map from state, or fallback to GlobalDB if the ID exists but map not in local state
  const affiliatedMapData = user.affiliatedMapId ? (
      state.structureMaps.find(m => m.id === user.affiliatedMapId) || GlobalMapDB.getMapById(user.affiliatedMapId)?.map
  ) : null;
  const affiliatedMap = affiliatedMapData;

  const SidebarContent = () => {
      return (
      <>
        <div className="p-6 border-b border-rpg-border flex flex-col items-center text-center relative group">
             <div className="relative cursor-pointer mt-4" onClick={() => { setShowProfileStats(true); playSound('click'); }}>
                 <div className="w-20 h-20 md:w-24 md:h-24 bg-rpg-card rounded-full flex items-center justify-center text-3xl md:text-4xl mb-4 border border-white shadow-lg overflow-hidden hover:border-gray-300 transition-colors">
                     {isImageAvatar(user.avatar) ? <img src={user.avatar} className="w-full h-full object-cover"/> : <span className="text-rpg-text">{user.avatar}</span>}
                 </div>
                 <button onClick={(e) => { e.stopPropagation(); setNewDesc(user.description); setNewAffiliation(user.affiliatedMapId || ''); setEditProfileOpen(true); }} className="absolute bottom-0 right-0 bg-rpg-card border border-rpg-border p-2 rounded-full hover:bg-white hover:text-black transition-colors text-rpg-text"><Edit2 size={12}/></button>
             </div>
             <h2 className="font-bold text-lg md:text-xl text-white tracking-tight cursor-pointer hover:underline" onClick={() => setShowProfileStats(true)}>{user.username}</h2>
             <p className="text-xs font-mono text-rpg-primary uppercase tracking-wider mb-2">Level {user.level}</p>
             <p className="text-xs text-gray-500 italic max-w-[200px] leading-relaxed mb-3">"{user.description}"</p>
             
             {/* WORKS AT BADGE */}
             {affiliatedMap && (
                 <div className="flex items-center gap-2 bg-gray-800/80 px-3 py-1.5 rounded-full border border-gray-600 mt-2 shadow-sm animate-fade-in cursor-default">
                     <div className="w-4 h-4 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center">
                         {affiliatedMap.avatar ? <img src={affiliatedMap.avatar} className="w-full h-full object-cover"/> : <Briefcase size={10} className="text-white"/>}
                     </div>
                     <span className="text-[10px] text-white font-bold uppercase truncate max-w-[120px]">{affiliatedMap.title}</span>
                 </div>
             )}
        </div>
        <nav id="sidebar-nav" className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* 1. Planner */}
            <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Планировщик" onClick={() => setMobileMenuOpen(false)}/>
            
            {/* 2. Goals */}
            <NavItem to="/goals" icon={<Target size={18} />} label="Несрочные задачи" onClick={() => setMobileMenuOpen(false)}/>
            
            {/* 3. Quests (Conditional) */}
            {isAdvanced && <NavItem to="/quests" icon={<Sword size={18} />} label="Квесты" onClick={() => setMobileMenuOpen(false)}/>}
            
            {/* 4. Structures */}
            <NavItem to="/structures" icon={<GitMerge size={18} />} label="Структуры" onClick={() => setMobileMenuOpen(false)}/>
            
            {/* 5. Finances */}
            <NavItem to="/wallet" icon={<Wallet size={18} />} label="Финансы" onClick={() => setMobileMenuOpen(false)}/>
            
            {/* 6. Categories */}
            <NavItem to="/skills" icon={<Tag size={18} />} label="Категории" onClick={() => setMobileMenuOpen(false)}/>
            
            {/* 7. Habits */}
            <NavItem to="/habits" icon={<Repeat size={18} />} label="Привычки" onClick={() => setMobileMenuOpen(false)}/>
            
            {/* 8. Analytics */}
            <NavItem to="/analytics" icon={<BarChart3 size={18} />} label="Аналитика" onClick={() => setMobileMenuOpen(false)}/>
            
            {/* DIVIDER */}
            <div className="h-px bg-rpg-border my-4 mx-4"></div>
            
            {/* 9. Inventory */}
            <NavItem to="/inventory" icon={<Backpack size={18} />} label="Склад" onClick={() => setMobileMenuOpen(false)}/>
            
            {/* 10. Notes */}
            <NavItem to="/notes" icon={<StickyNote size={18} />} label="Заметки" onClick={() => setMobileMenuOpen(false)}/>
            
            {/* DIVIDER */}
            <div className="h-px bg-rpg-border my-4 mx-4"></div>
            
            {/* 11. Shop */}
            <NavItem to="/shop" icon={<ShoppingBag size={18} />} label="Магазин" onClick={() => setMobileMenuOpen(false)}/>
            
            {/* 12. Social */}
            <div className="relative"><NavItem to="/social" icon={<Users size={18} />} label="Социальный Центр" onClick={() => setMobileMenuOpen(false)}/>{requestsCount > 0 && <span className="absolute right-4 top-3 bg-red-500 text-white text-[10px] px-1.5 rounded-full animate-pulse">{requestsCount}</span>}</div>
        </nav>
        <div className="p-4 border-t border-rpg-border">
            <button onClick={() => dispatch({type: 'LOGOUT'})} className="logout-btn flex items-center gap-3 text-rpg-muted hover:text-rpg-text transition-colors w-full px-4 py-2 hover:bg-rpg-card rounded-lg text-sm font-medium focus:bg-rpg-card focus:text-white focus:outline-none"><LogOut size={18} /> Выход</button>
        </div>
      </>
  )};

  return (
    <div className="flex h-screen bg-rpg-bg text-rpg-text overflow-hidden font-sans selection:bg-rpg-primary selection:text-rpg-bg transition-colors duration-300" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <aside className="hidden md:flex w-72 bg-rpg-panel border-r border-rpg-border flex-col shrink-0 transition-colors duration-300"><SidebarContent /></aside>
      <div className="flex-1 flex flex-col min-w-0 bg-rpg-bg relative transition-colors duration-300">
          {/* HEADER with enhanced glass effect and visible border */}
          <header className="absolute top-0 left-0 right-0 h-auto md:h-24 bg-rpg-bg/50 backdrop-blur-xl border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between px-4 py-4 md:px-8 z-30 transition-all duration-300 shadow-md">
               <div className="flex md:hidden justify-between items-center w-full mb-4">
                   <button onClick={() => setMobileMenuOpen(true)} className="flex items-center gap-3"><Menu size={24} className="text-white"/><div className="w-10 h-10 bg-rpg-card rounded-full border border-white flex items-center justify-center overflow-hidden">{isImageAvatar(user.avatar) ? <img src={user.avatar} className="w-full h-full object-cover"/> : user.avatar}</div></button>
                   <div className="flex gap-2"><button onClick={() => setSettingsOpen(true)} className="p-2 bg-rpg-card rounded border border-rpg-border text-gray-400"><Settings size={18}/></button></div>
               </div>
               <div className="flex-1 w-full max-w-3xl flex items-center gap-4">
                   <div className="flex flex-col flex-1 cursor-pointer group space-y-1">
                       <div className="flex flex-col" onClick={toggleProgressMode}>
                           <div className="flex justify-between items-end mb-1"><div className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">{progressMode === 'week' ? 'Неделя' : progressMode === 'month' ? 'Месяц' : 'Год'}</div><span className={`text-sm md:text-base font-bold font-mono ${progressStats.absolutePercent >= 100 ? 'text-rpg-success' : 'text-white'}`}>{progressStats.absolutePercent}%</span></div>
                           <div className="w-full bg-rpg-card h-3 md:h-4 rounded-full overflow-hidden border border-rpg-border shadow-inner relative"><div className={`h-full ${progressStats.absolutePercent >= 100 ? 'bg-rpg-success shadow-[0_0_10px_#10b981]' : 'bg-rpg-primary shadow-[0_0_10px_var(--primary-color)]'} transition-all duration-1000 relative flex items-center justify-end px-3 ${progressStats.absolutePercent === 0 ? 'hidden' : ''}`} style={{width: `${progressStats.absolutePercent}%`}}></div></div>
                       </div>
                       <div className="mt-1 text-right"><span className="text-[10px] md:text-xs font-bold text-white block line-clamp-1 opacity-70">{motivation}</span></div>
                   </div>
               </div>
               <div className="hidden md:flex items-center gap-6 ml-4"><div className="text-right flex flex-col items-end"><p className="text-lg font-bold text-white capitalize">{format(new Date(), 'd MMM yyyy', { locale: ru })}</p><p className="text-xs text-gray-500 font-mono">Сегодня</p></div><button onClick={() => setSettingsOpen(true)} className="bg-rpg-card border border-rpg-border p-2.5 rounded-lg text-gray-400 hover:text-white hover:border-white transition-all shadow-sm"><Settings size={20} /></button></div>
          </header>
          
          <main className="flex-1 overflow-y-auto overflow-x-hidden relative h-full pt-40 md:pt-28" id="main-scroll-container">
              {/* Content Container */}
              <div className="px-4 md:px-8 pb-24 md:pb-8 relative z-0">
                  {children}
              </div>
          </main>

          {xpGain && <div className="fixed pointer-events-none text-rpg-primary font-bold text-2xl animate-fade-in z-50 flex items-center gap-1 font-mono" style={{ left: xpGain.x, top: xpGain.y, transform: 'translate(-50%, -100%)' }}>+{xpGain.amount} XP</div>}
      </div>
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-rpg-panel/95 backdrop-blur border-t border-rpg-border flex justify-around items-center z-40 px-2 pb-safe">
            <button onClick={() => setQuickTaskOpen(true)} className="flex flex-col items-center gap-1 p-2 transition-all text-gray-400 hover:text-white active:scale-95"><Zap size={20} className="text-white"/><span className="text-[10px] font-medium text-white">Быстрая</span></button>
            <button onClick={() => setQuickFinanceOpen(true)} className="flex flex-col items-center gap-1 p-2 transition-all text-gray-400 hover:text-white"><Wallet size={20} /><span className="text-[10px] font-medium">Учет</span></button>
            <div className="relative -top-5"><NavLink to="/dashboard" onClick={() => playSound('click')} className={({isActive}) => `flex items-center justify-center w-14 h-14 rounded-full border-4 border-rpg-bg shadow-lg ${isActive ? 'bg-white text-black' : 'bg-rpg-card text-gray-400 border-rpg-border'}`}><Sword size={24} /></NavLink></div>
            <MobileNavLink to="/notes" icon={<StickyNote size={20} />} label="Заметки" />
            <button onClick={() => setMobileMenuOpen(true)} className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-white"><Menu size={20} /><span className="text-[10px] font-medium">Меню</span></button>
      </div>
      {mobileMenuOpen && <div className="fixed inset-0 z-50 md:hidden"><div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div><div className="absolute left-0 top-0 bottom-0 w-[80%] max-w-[300px] bg-rpg-panel border-r border-rpg-border shadow-2xl flex flex-col animate-slide-in-left"><div className="p-4 flex justify-between items-center"><span className="text-white font-bold">МЕНЮ</span><button onClick={() => setMobileMenuOpen(false)}><X size={24} className="text-gray-500"/></button></div><SidebarContent /></div></div>}
      {showLevelUp && <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-fade-in backdrop-blur-md px-4 text-center"><div className="text-5xl md:text-7xl mb-6 font-thin text-white tracking-tighter">LEVEL UP</div><div className="w-24 h-1 bg-rpg-primary mb-8"></div><p className="text-lg md:text-xl text-gray-400 font-light mb-12">Уровень доступа повышен.</p><button onClick={() => dispatch({type: 'CLOSE_LEVEL_UP'})} className="px-12 py-3 border border-white text-white hover:bg-white hover:text-black transition-all uppercase tracking-widest text-sm font-bold">Продолжить</button></div>}
      {moodOpen && <MoodCaptcha onClose={() => setMoodOpen(false)} />}
      {shouldShowOnboarding && <OnboardingWizard />}
      {showProfileStats && <ProfileModal user={user} tasks={tasks} onClose={() => setShowProfileStats(false)} />}
      {quickFinanceOpen && <QuickFinanceModal onClose={() => setQuickFinanceOpen(false)} />}
      {quickTaskOpen && <QuickTaskWizard onClose={() => setQuickTaskOpen(false)} />}
      
      {/* EDIT PROFILE MODAL (UPDATED) */}
      {editProfileOpen && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-rpg-panel p-6 rounded-lg w-full max-w-sm border border-rpg-border shadow-2xl">
                  <h3 className="text-xl font-bold mb-6 text-white tracking-tight">Профиль</h3>
                  <div className="space-y-6">
                      <div>
                          <label className="block text-xs font-mono uppercase text-gray-500 mb-2">Загрузить Аватар</label>
                          <div className="relative">
                              <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                              <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 bg-rpg-card border border-rpg-border rounded hover:border-white text-sm text-gray-400 flex items-center justify-center gap-2 transition-colors">
                                  <Upload size={16}/> Выбрать файл
                              </button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-mono uppercase text-gray-500 mb-2">Статус / Био</label>
                          <textarea className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-rpg-text h-24 resize-none focus:border-white outline-none" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                      </div>
                      
                      {/* AFFILIATION SELECTOR */}
                      <div>
                          <label className="block text-xs font-mono uppercase text-gray-500 mb-2 flex items-center gap-2">
                              <Briefcase size={12}/> Место работы / Проект
                          </label>
                          <select 
                              className="w-full bg-rpg-card border border-rpg-border rounded p-2 text-white text-sm outline-none"
                              value={newAffiliation}
                              onChange={e => setNewAffiliation(e.target.value)}
                          >
                              <option value="">Не выбрано</option>
                              {state.structureMaps.map(map => (
                                  <option key={map.id} value={map.id}>
                                      {map.title} {map.ownerId === user.username ? '(Владелец)' : '(Участник)'}
                                  </option>
                              ))}
                          </select>
                          <p className="text-[10px] text-gray-500 mt-1">
                              Выберите карту, которая будет отображаться в вашем профиле как основная деятельность.
                          </p>
                      </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-8">
                      <button onClick={() => setEditProfileOpen(false)} className="px-4 py-2 text-gray-500 hover:text-rpg-text text-sm">Отмена</button>
                      <button onClick={handleUpdateProfile} className="px-6 py-2 bg-white text-black text-sm font-bold rounded hover:bg-gray-200">Сохранить</button>
                  </div>
              </div>
          </div>
      )}
      
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
};

const NavItem: React.FC<any> = ({ to, icon, label, onClick }) => (
    <NavLink to={to} onClick={() => { playSound('hover'); if(onClick) onClick(); }} className={({isActive}) => `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 focus:outline-none ${isActive ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white hover:bg-rpg-card/50'}`}>
        {icon}
        <span className="font-medium text-sm">{label}</span>
    </NavLink>
);

const MobileNavLink: React.FC<any> = ({ to, icon, label }) => (
    <NavLink to={to} onClick={() => playSound('hover')} className={({isActive}) => `flex flex-col items-center gap-1 p-2 transition-all ${isActive ? 'text-white' : 'text-gray-400'}`}>
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
);

export default Layout;