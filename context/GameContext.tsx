import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { GameState, GameAction, User, Skill, Task, Quest, ShopItem, Note, InventoryItem, Habit, Transaction, Asset, InventoryList } from '../types';
import { calculateMaxXP, processTaskCompletion, processTaskUncheck, checkMissedTasks } from '../utils/gameLogic';
import { playSound } from '../utils/audio';
import { format, addDays } from 'date-fns';

const INITIAL_SKILLS: Skill[] = [];

const INITIAL_QUESTS: Quest[] = [
  { id: 'q1', title: 'Начало Пути', description: 'Выполни 5 задач.', xpReward: 100, status: 'available', requirementType: 'task_count', requirementValue: 5, currentProgress: 0 },
];

const INITIAL_INVENTORY: InventoryList[] = [
    {
        id: 'inv_movies',
        title: 'Фильмы',
        items: [
            { id: 'i1', text: 'Матрица', checked: false, type: 'text' },
            { id: 'i2', text: 'Интерстеллар', checked: false, type: 'text' },
            { id: 'i3', text: 'Бойцовский клуб', checked: false, type: 'text' }
        ]
    },
    {
        id: 'inv_food',
        title: 'Продукты',
        items: [
            { id: 'f1', text: 'Молоко', checked: false, type: 'text' },
            { id: 'f2', text: 'Хлеб', checked: false, type: 'text' },
            { id: 'f3', text: 'Яйца', checked: false, type: 'text' }
        ]
    },
    {
        id: 'inv_inspire',
        title: 'Вдохновение',
        items: [
            { id: 'in1', text: 'https://www.pinterest.com', checked: false, type: 'link' },
            { id: 'in2', text: 'https://dribbble.com', checked: false, type: 'link' }
        ]
    }
];

// Mapping for theme ID to HEX Color
export const THEME_COLORS: Record<string, string> = {
    'theme-tiffany': '#00D1C1', // Default
    'theme-neon': '#d946ef',    // Magenta/Purple
    'theme-ocean': '#3b82f6',   // Classic Blue
    'theme-sunset': '#f97316',  // Orange
    'theme-matrix': '#22c55e',  // Green
    'theme-crimson': '#ef4444', // Red
    'theme-gold': '#eab308'     // Yellow
};

const INITIAL_SHOP: ShopItem[] = [
  // Communication Styles
  { id: 's_rude', category: 'style', name: 'Грубый Тренер', value: 'rude', description: 'Жесткая мотивация без соплей.' },
  { id: 's_cute', category: 'style', name: 'Милый Котик', value: 'cute', description: 'Поддержка и любовь.' },
  { id: 's_intel', category: 'style', name: 'ИИ Аналитик', value: 'intellectual', description: 'Сухие факты и статистика.' },
  { id: 's_friend', category: 'style', name: 'Бро', value: 'friendly', description: 'Дружеское плечо.' },
  
  // Color Themes
  { id: 't_tiffany', category: 'theme', name: 'Тиффани (Base)', value: 'theme-tiffany', description: 'Элегантный бирюзовый.' },
  { id: 't_neon', category: 'theme', name: 'Киберпанк', value: 'theme-neon', description: 'Яркий неон для ночного города.' },
  { id: 't_ocean', category: 'theme', name: 'Глубина', value: 'theme-ocean', description: 'Спокойный синий океан.' },
  { id: 't_sunset', category: 'theme', name: 'Закат', value: 'theme-sunset', description: 'Теплый оранжевый вайб.' },
  { id: 't_matrix', category: 'theme', name: 'Матрица', value: 'theme-matrix', description: 'Цифровой зеленый код.' },
  { id: 't_crimson', category: 'theme', name: 'Самурай', value: 'theme-crimson', description: 'Агрессивный красный.' },
  { id: 't_gold', category: 'theme', name: 'Мидас', value: 'theme-gold', description: 'Золотой стандарт успеха.' },
];

export const defaultState: GameState = {
  user: null,
  skills: INITIAL_SKILLS,
  tasks: [],
  quests: INITIAL_QUESTS,
  notes: [],
  inventory: INITIAL_INVENTORY,
  shopItems: INITIAL_SHOP,
  habits: [],
  transactions: [],
  assets: [],
  showLevelUp: false,
  xpGain: null
};

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}>({ state: defaultState, dispatch: () => null });

// Helper to modify OTHER users' data in localStorage (Simulating Backend)
const modifyOtherUser = (targetUsername: string, modifier: (state: GameState) => GameState) => {
    const key = `liferpg_user_${targetUsername}`;
    const data = localStorage.getItem(key);
    if (!data) return false;
    try {
        const parsed: GameState = JSON.parse(data);
        const newState = modifier(parsed);
        localStorage.setItem(key, JSON.stringify(newState));
        return true;
    } catch (e) {
        return false;
    }
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'LOAD_GAME':
      playSound('success');
      // Migration Logic
      const loadedUser = action.payload.user;
      let loadedState = action.payload;
      
      if (loadedUser) {
          if (!Array.isArray(loadedUser.friends)) loadedUser.friends = [];
          if (!Array.isArray(loadedUser.friendRequests)) loadedUser.friendRequests = [];
          if (!Array.isArray(loadedUser.moodHistory)) loadedUser.moodHistory = [];
          if (!loadedUser.privacyMode) loadedUser.privacyMode = 'public';
          if (!loadedUser.uniqueId) loadedUser.uniqueId = '#' + Math.random().toString(36).substr(2, 6).toUpperCase();
          if (!loadedUser.settings.monthlyIncomeGoal) loadedUser.settings.monthlyIncomeGoal = 1000; // Default goal
          if (loadedUser.onboardingStep === undefined) loadedUser.onboardingStep = 0;
          if (!loadedUser.appMode) loadedUser.appMode = 'advanced'; // DEFAULT FOR EXISTING USERS
          // Fix old default theme
          if (!loadedUser.themeId || loadedUser.themeId === 'theme-default') loadedUser.themeId = 'theme-tiffany';
          
          if (!loadedUser.communicationStyle || loadedUser.communicationStyle === 'default') {
              loadedUser.communicationStyle = 'intellectual';
          }
      }
      // Migration for new modules
      if (!Array.isArray(loadedState.habits)) loadedState.habits = [];
      if (!Array.isArray(loadedState.transactions)) loadedState.transactions = [];
      if (!Array.isArray(loadedState.assets)) loadedState.assets = [];
      
      // INVENTORY MIGRATION (Array of Items -> Array of Lists)
      // Check if inventory[0] exists and does NOT have 'items' property (meaning it's an old item)
      if (loadedState.inventory && loadedState.inventory.length > 0 && !(loadedState.inventory[0] as any).items) {
          console.log("Migrating Inventory to Backpacks...");
          const oldItems = loadedState.inventory as any as InventoryItem[];
          const defaultList: InventoryList = {
              id: 'migrated_backpack',
              title: 'Старый Склад',
              items: oldItems
          };
          // Preserve defaults if not present
          loadedState.inventory = [defaultList, ...INITIAL_INVENTORY];
      } else if (!loadedState.inventory || loadedState.inventory.length === 0) {
          loadedState.inventory = INITIAL_INVENTORY;
      }
      
      // Update Shop Items if new ones added
      loadedState.shopItems = INITIAL_SHOP;

      return loadedState;
    case 'LOGOUT':
      return { ...defaultState, user: null };
    case 'UPDATE_PROFILE':
        if (!state.user) return state;
        return {
            ...state,
            user: { ...state.user, avatar: action.payload.avatar, description: action.payload.description }
        };
    case 'ADD_TASK':
      playSound('click');
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'ADD_TASKS_BATCH':
      playSound('click');
      return { ...state, tasks: [...state.tasks, ...action.payload] };
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };
    case 'UPDATE_TASK_DATE': {
      return {
          ...state,
          tasks: state.tasks.map(t => t.id === action.payload.id ? { ...t, date: action.payload.date } : t)
      };
    }
    case 'UPDATE_TASK_CHECKLIST': {
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.payload.taskId ? { ...t, checklist: action.payload.checklist } : t)
      };
    }
    case 'TOGGLE_TASK': {
      const taskIndex = state.tasks.findIndex(t => t.id === action.payload.id);
      if (taskIndex === -1) return state;

      const task = state.tasks[taskIndex];
      const isCompleting = !task.completed;
      
      const updatedTask = { ...task, completed: isCompleting };
      const newTasks = [...state.tasks];
      newTasks[taskIndex] = updatedTask;

      if (isCompleting) {
        const processed = processTaskCompletion(state, task);
        if (processed.leveledUp) playSound('levelup');
        else playSound('success');
        
        return { 
            ...state, 
            tasks: newTasks, 
            user: processed.user, 
            skills: processed.skills, 
            quests: processed.quests, 
            showLevelUp: processed.leveledUp,
            xpGain: action.payload.x ? { amount: task.xpReward, x: action.payload.x, y: action.payload.y! } : null
        };
      } else {
        const processed = processTaskUncheck(state, task);
         return { ...state, tasks: newTasks, user: processed.user };
      }
    }
    case 'CLEAR_XP_ANIMATION':
        return { ...state, xpGain: null };
    case 'ADD_SKILL':
      return { ...state, skills: [...state.skills, action.payload] };
    case 'ADD_SKILLS_BATCH':
      return { ...state, skills: [...state.skills, ...action.payload] };
    case 'UPDATE_SKILL': // New Action
      return { ...state, skills: state.skills.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SKILL':
        const deleteIds = new Set<string>();
        const collectChildren = (id: string) => {
            deleteIds.add(id);
            state.skills.filter(s => s.parentId === id).forEach(s => collectChildren(s.id));
        }
        collectChildren(action.payload);
        return { ...state, skills: state.skills.filter(s => !deleteIds.has(s.id)) };
    case 'RESET_SKILLS':
        return { ...state, skills: [] };
    case 'ACCEPT_QUEST': {
      const quests = state.quests.map(q => 
        q.status === 'active' ? { ...q, status: 'available' } as Quest : q
      );
      const targetIndex = quests.findIndex(q => q.id === action.payload);
      if (targetIndex !== -1) {
        quests[targetIndex] = { ...quests[targetIndex], status: 'active', currentProgress: 0 };
        playSound('click');
      }
      return { 
          ...state, 
          quests,
          user: state.user ? { ...state.user, currentQuestId: action.payload } : state.user
      };
    }
    case 'CREATE_CUSTOM_QUEST': {
        return { ...state, quests: [...state.quests, action.payload] };
    }
    case 'FAIL_QUEST': {
        const questIdx = state.quests.findIndex(q => q.id === action.payload);
        if(questIdx === -1) return state;
        const newQuests = [...state.quests];
        newQuests[questIdx] = { ...newQuests[questIdx], status: 'failed' };
        
        let newUser = state.user ? {...state.user} : null;
        if (newUser) {
            newUser.currentQuestId = undefined; // Clear active quest
            if (newQuests[questIdx].betAmount) {
                newUser.currentXP = Math.max(0, newUser.currentXP - (newQuests[questIdx].betAmount || 0));
            }
        }
        playSound('fail');
        return { ...state, quests: newQuests, user: newUser };
    }
    case 'UPDATE_SETTINGS':
        if (!state.user) return state;
        return {
            ...state,
            user: { 
                ...state.user, 
                settings: { 
                    dailyMin: action.payload.min ?? state.user.settings.dailyMin, 
                    dailyMax: action.payload.max ?? state.user.settings.dailyMax,
                    monthlyIncomeGoal: action.payload.incomeGoal ?? state.user.settings.monthlyIncomeGoal
                } 
            }
        };
    case 'ADD_NOTE':
        return { ...state, notes: [action.payload, ...state.notes] };
    case 'UPDATE_NOTE': {
        const { id, title, content, images } = action.payload;
        return {
            ...state,
            notes: state.notes.map(n => n.id === id ? { ...n, title, content, images } : n)
        };
    }
    case 'DELETE_NOTE':
        return { ...state, notes: state.notes.filter(n => n.id !== action.payload) };
    
    // --- INVENTORY REDUCERS ---
    case 'ADD_INVENTORY_LIST':
        return { ...state, inventory: [...state.inventory, action.payload] };
    case 'DELETE_INVENTORY_LIST':
        return { ...state, inventory: state.inventory.filter(l => l.id !== action.payload) };
    case 'UPDATE_INVENTORY_LIST_NAME':
        return { ...state, inventory: state.inventory.map(l => l.id === action.payload.id ? { ...l, title: action.payload.name } : l) };
    case 'ADD_INVENTORY_ITEM':
        return {
            ...state,
            inventory: state.inventory.map(l => l.id === action.payload.listId ? { ...l, items: [...l.items, action.payload.item] } : l)
        };
    case 'TOGGLE_INVENTORY_ITEM':
        return {
            ...state,
            inventory: state.inventory.map(l => l.id === action.payload.listId ? {
                ...l,
                items: l.items.map(i => i.id === action.payload.itemId ? { ...i, checked: !i.checked } : i)
            } : l)
        };
    case 'DELETE_INVENTORY_ITEM':
        return {
            ...state,
            inventory: state.inventory.map(l => l.id === action.payload.listId ? {
                ...l,
                items: l.items.filter(i => i.id !== action.payload.itemId)
            } : l)
        };

    case 'EQUIP_ITEM':
        if (!state.user) return state;
        const updatedUser = { ...state.user };
        if (action.payload.category === 'style') updatedUser.communicationStyle = action.payload.value as any;
        if (action.payload.category === 'theme') updatedUser.themeId = action.payload.value;
        return { ...state, user: updatedUser };
    case 'CLOSE_LEVEL_UP':
        return { ...state, showLevelUp: false };
    case 'UPDATE_PRIVACY':
        if (!state.user) return state;
        return { ...state, user: { ...state.user, privacyMode: action.payload } };
    
    // --- SOCIAL LOGIC ---
    case 'SEND_FRIEND_REQUEST': {
        if (!state.user) return state;
        const targetUsername = action.payload;
        
        if (targetUsername === state.user.username) return state;
        if (state.user.friends.includes(targetUsername)) return state;

        const success = modifyOtherUser(targetUsername, (targetState) => {
            if (!targetState.user) return targetState;
            const currentRequests = targetState.user.friendRequests || [];
            if (currentRequests.some(r => r.fromUsername === state.user!.username)) {
                return targetState;
            }
            return {
                ...targetState,
                user: {
                    ...targetState.user,
                    friendRequests: [
                        ...currentRequests,
                        {
                            fromUsername: state.user!.username,
                            fromId: state.user!.uniqueId,
                            fromAvatar: state.user!.avatar,
                            createdAt: new Date().toISOString()
                        }
                    ]
                }
            };
        });

        if (success) playSound('success');
        return state; 
    }

    case 'ACCEPT_FRIEND_REQUEST': {
        if (!state.user) return state;
        const targetUsername = action.payload;

        const updatedRequests = state.user.friendRequests.filter(r => r.fromUsername !== targetUsername);
        const updatedFriends = [...state.user.friends];
        if (!updatedFriends.includes(targetUsername)) updatedFriends.push(targetUsername);

        modifyOtherUser(targetUsername, (targetState) => {
            if (!targetState.user) return targetState;
            const theirFriends = targetState.user.friends || [];
            if (!theirFriends.includes(state.user!.username)) theirFriends.push(state.user!.username);
            return {
                ...targetState,
                user: { ...targetState.user, friends: theirFriends }
            };
        });

        playSound('success');
        return { ...state, user: { ...state.user, friends: updatedFriends, friendRequests: updatedRequests } };
    }

    case 'REJECT_FRIEND_REQUEST': {
        if (!state.user) return state;
        return {
            ...state,
            user: {
                ...state.user,
                friendRequests: state.user.friendRequests.filter(r => r.fromUsername !== action.payload)
            }
        };
    }

    case 'REMOVE_FRIEND': {
        if (!state.user) return state;
        const targetUsername = action.payload;

        const myNewFriends = state.user.friends.filter(f => f !== targetUsername);

        modifyOtherUser(targetUsername, (targetState) => {
            if (!targetState.user) return targetState;
            const theirFriends = targetState.user.friends || [];
            return {
                ...targetState,
                user: {
                    ...targetState.user,
                    friends: theirFriends.filter(f => f !== state.user!.username)
                }
            };
        });

        return { ...state, user: { ...state.user, friends: myNewFriends } };
    }

    // --- MOOD TRACKER ---
    case 'LOG_MOOD': {
        if (!state.user) return state;
        const today = format(new Date(), 'yyyy-MM-dd');
        const history = state.user.moodHistory || [];
        const newHistory = [...history.filter(m => m.date !== today), { date: today, value: action.payload }];
        newHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        return {
            ...state,
            user: { ...state.user, moodHistory: newHistory }
        };
    }

    // --- HABITS ---
    case 'ADD_HABIT': {
        const habit = action.payload;
        const newTasks: Task[] = [];
        const today = new Date();
        
        for (let i = 0; i < 14; i++) {
            const date = addDays(today, i);
            newTasks.push({
                id: `htask_${habit.id}_${i}_${Date.now()}`,
                type: 'daily',
                date: format(date, 'yyyy-MM-dd'),
                title: habit.title,
                description: 'Ежедневная привычка',
                skillId: 'habit',
                xpReward: habit.xpReward,
                completed: false,
                habitId: habit.id
            });
        }
        
        return { 
            ...state, 
            habits: [...state.habits, habit],
            tasks: [...state.tasks, ...newTasks] 
        };
    }
    case 'DELETE_HABIT':
        return { 
            ...state, 
            habits: state.habits.filter(h => h.id !== action.payload),
            tasks: state.tasks.filter(t => t.habitId !== action.payload || t.completed)
        };

    // --- FINANCE ---
    case 'ADD_TRANSACTION':
        playSound('success');
        return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'DELETE_TRANSACTION':
        return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    case 'ADD_ASSET':
        return { ...state, assets: [...state.assets, action.payload] };
    case 'UPDATE_ASSET':
        return { ...state, assets: state.assets.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'DELETE_ASSET':
        return { ...state, assets: state.assets.filter(a => a.id !== action.payload) };

    // --- ONBOARDING & SYSTEM ---
    case 'SET_ONBOARDING_STEP':
        if (!state.user) return state;
        return { ...state, user: { ...state.user, onboardingStep: action.payload } };
    case 'SET_APP_MODE':
        if (!state.user) return state;
        return { ...state, user: { ...state.user, appMode: action.payload } };

    default:
        return state;
  }
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, defaultState);

  useEffect(() => {
    if (state.user && state.user.username) {
        const saveKey = `liferpg_user_${state.user.username}`;
        localStorage.setItem(saveKey, JSON.stringify(state));
    }
  }, [state]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);