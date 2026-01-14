import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { GameState, GameAction, User, Skill, Task, Quest, ShopItem, Note, InventoryItem } from '../types';
import { calculateMaxXP, processTaskCompletion, processTaskUncheck, checkMissedTasks } from '../utils/gameLogic';
import { playSound } from '../utils/audio';
import { format } from 'date-fns';

const INITIAL_SKILLS: Skill[] = [
  { id: 'root_health', parentId: null, name: 'Спорт', color: '#ef4444', level: 1, currentXP: 0, maxXP: 100 },
  { id: 'root_intellect', parentId: null, name: 'Интеллект', color: '#3b82f6', level: 1, currentXP: 0, maxXP: 100 },
  { id: 'root_creative', parentId: null, name: 'Творчество', color: '#d946ef', level: 1, currentXP: 0, maxXP: 100 },
];

const INITIAL_QUESTS: Quest[] = [
  { id: 'q1', title: 'Начало Пути', description: 'Выполни 5 задач.', xpReward: 100, status: 'available', requirementType: 'task_count', requirementValue: 5, currentProgress: 0 },
];

const INITIAL_SHOP: ShopItem[] = [
  { id: 's_rude', category: 'style', name: 'Грубый Тренер', value: 'rude', description: 'Жесткая мотивация без соплей.' },
  { id: 's_cute', category: 'style', name: 'Милый Котик', value: 'cute', description: 'Поддержка и любовь.' },
  { id: 's_intel', category: 'style', name: 'ИИ Аналитик', value: 'intellectual', description: 'Сухие факты и статистика.' },
  { id: 's_friend', category: 'style', name: 'Бро', value: 'friendly', description: 'Дружеское плечо.' },
];

export const defaultState: GameState = {
  user: null,
  skills: INITIAL_SKILLS,
  tasks: [],
  quests: INITIAL_QUESTS,
  notes: [],
  inventory: [],
  shopItems: INITIAL_SHOP,
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
      if (loadedUser) {
          if (!Array.isArray(loadedUser.friends)) loadedUser.friends = [];
          if (!Array.isArray(loadedUser.friendRequests)) loadedUser.friendRequests = [];
          if (!Array.isArray(loadedUser.moodHistory)) loadedUser.moodHistory = [];
          if (!loadedUser.privacyMode) loadedUser.privacyMode = 'public';
          if (!loadedUser.uniqueId) loadedUser.uniqueId = '#' + Math.random().toString(36).substr(2, 6).toUpperCase();
          
          // Force migration to intellectual style if default or missing
          if (!loadedUser.communicationStyle || loadedUser.communicationStyle === 'default') {
              loadedUser.communicationStyle = 'intellectual';
          }
      }
      return action.payload;
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
    case 'DELETE_SKILL':
        const deleteIds = new Set<string>();
        const collectChildren = (id: string) => {
            deleteIds.add(id);
            state.skills.filter(s => s.parentId === id).forEach(s => collectChildren(s.id));
        }
        collectChildren(action.payload);
        return { ...state, skills: state.skills.filter(s => !deleteIds.has(s.id)) };
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
            user: { ...state.user, settings: { dailyMin: action.payload.min, dailyMax: action.payload.max } }
        };
    case 'ADD_NOTE':
        return { ...state, notes: [action.payload, ...state.notes] };
    case 'UPDATE_NOTE': {
        const { id, title, content } = action.payload;
        return {
            ...state,
            notes: state.notes.map(n => n.id === id ? { ...n, title, content } : n)
        };
    }
    case 'DELETE_NOTE':
        return { ...state, notes: state.notes.filter(n => n.id !== action.payload) };
    case 'ADD_INVENTORY':
        return { ...state, inventory: [...state.inventory, action.payload] };
    case 'TOGGLE_INVENTORY':
        return { 
            ...state, 
            inventory: state.inventory.map(i => i.id === action.payload ? { ...i, checked: !i.checked } : i) 
        };
    case 'DELETE_INVENTORY':
        return { ...state, inventory: state.inventory.filter(i => i.id !== action.payload) };
    case 'CLEAR_INVENTORY':
        return { ...state, inventory: [] };
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
            // Safety check for user existence
            if (!targetState.user) return targetState;
            
            // Ensure friendRequests array exists
            const currentRequests = targetState.user.friendRequests || [];
            
            // Check if request already exists to avoid duplicates
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
        // Filter out if already exists for today (overwrite)
        const history = state.user.moodHistory || [];
        const newHistory = [...history.filter(m => m.date !== today), { date: today, value: action.payload }];
        // Sort by date
        newHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        return {
            ...state,
            user: { ...state.user, moodHistory: newHistory }
        };
    }

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