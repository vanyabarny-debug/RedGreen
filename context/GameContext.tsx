import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { GameState, GameAction, User, Skill, Task, Quest, ShopItem, Note, InventoryItem, Habit, Transaction, Asset, InventoryList, StructureNode, StructureConnection, StructureMap, StructureInvite } from '../types';
import { calculateMaxXP, processTaskCompletion, processTaskUncheck, checkMissedTasks, GlobalMapDB, SharedMapData } from '../utils/gameLogic';
import { playSound } from '../utils/audio';
import { format, addDays } from 'date-fns';

const INITIAL_SKILLS: Skill[] = [];

const INITIAL_QUESTS: Quest[] = [
  { id: 'q1', title: 'Начало Пути', description: 'Выполни 5 задач для калибровки системы.', xpReward: 100, status: 'available', requirementType: 'task_count', requirementValue: 5, currentProgress: 0 },
  { id: 'q_monk', title: 'Режим Монаха', description: 'Тотальная дисциплина. Выполни 15 задач.', xpReward: 500, status: 'available', requirementType: 'task_count', requirementValue: 15, currentProgress: 0 },
  { id: 'q_scholar', title: 'Нейропластичность', description: 'Прокачай интеллект. Выполни 3 задачи категории "Учеба" или "Навыки".', xpReward: 250, status: 'available', requirementType: 'task_count', requirementValue: 3, requirementSkillId: 'skill_learning', currentProgress: 0 },
  { id: 'q_finance', title: 'Волк с Уолл-стрит', description: 'Управляй ресурсами. Внеси 5 финансовых операций.', xpReward: 300, status: 'available', requirementType: 'task_count', requirementValue: 5, currentProgress: 0 },
  { id: 'q_iron_body', title: 'Железное Тело', description: 'Инвестиции в биооболочку. Выполни 5 спортивных задач.', xpReward: 400, status: 'available', requirementType: 'task_count', requirementValue: 5, requirementSkillId: 'skill_sport', currentProgress: 0 },
  { id: 'q_social_net', title: 'Нетворкинг', description: 'Укрепи связи. Выполни 3 социальные задачи.', xpReward: 200, status: 'available', requirementType: 'task_count', requirementValue: 3, currentProgress: 0 },
  { id: 'q_clean_slate', title: 'Чистый Лист', description: 'Наведи порядок в хаосе. Выполни 10 мелких бытовых задач.', xpReward: 350, status: 'available', requirementType: 'task_count', requirementValue: 10, currentProgress: 0 },
  { id: 'q_deep_work', title: 'Глубокое Погружение', description: 'Состояние потока. Закрой 5 задач с высоким приоритетом.', xpReward: 600, status: 'available', requirementType: 'task_count', requirementValue: 5, currentProgress: 0 },
  { id: 'q_creator', title: 'Демиург', description: 'Создай нечто новое. 3 творческие задачи.', xpReward: 450, status: 'available', requirementType: 'task_count', requirementValue: 3, currentProgress: 0 },
  { id: 'q_marathon', title: 'Ультрамарафон', description: 'Выносливость духа. Выполни 30 задач.', xpReward: 1000, status: 'available', requirementType: 'task_count', requirementValue: 30, currentProgress: 0 },
  { id: 'q_zen', title: 'Цифровой Детокс', description: 'Очисти разум. Выполни 1 задачу без использования гаджетов.', xpReward: 150, status: 'available', requirementType: 'task_count', requirementValue: 1, currentProgress: 0 },
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

const DEFAULT_MAP_ID = 'default_map';

export const defaultState: GameState = {
  user: null,
  skills: INITIAL_SKILLS, // Now Categories
  structureMaps: [], // Will be loaded from GlobalDB
  structures: [], 
  structureConnections: [],
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
          if (!Array.isArray(loadedUser.structureInvites)) loadedUser.structureInvites = [];
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
      
      // STRUCTURE MAPS LOADING FROM GLOBAL DB
      // 1. Check if legacy structures exist in user file, if so, migrate to GlobalDB
      if (loadedState.structureMaps && loadedState.structureMaps.length > 0) {
          // It's possible this user has data from previous version in their local state.
          // We should ensure these maps exist in GlobalDB.
          loadedState.structureMaps.forEach(map => {
              // Check if map exists in global, if not, save it
              if (!GlobalMapDB.getMapById(map.id)) {
                  const nodes = loadedState.structures.filter(s => s.mapId === map.id);
                  const connections = loadedState.structureConnections.filter(c => c.mapId === map.id);
                  GlobalMapDB.createOrUpdateMap({
                      map: { ...map, ownerId: map.ownerId || loadedUser?.username, members: map.members || [], roles: map.roles || {} },
                      nodes,
                      connections
                  });
              }
          });
      }

      // 2. Load fresh from Global DB
      if (loadedUser) {
          const globalData = GlobalMapDB.getUserMaps(loadedUser.username);
          loadedState.structureMaps = globalData.maps;
          loadedState.structures = globalData.nodes;
          loadedState.structureConnections = globalData.connections;
          
          // Fallback if no maps
          if (loadedState.structureMaps.length === 0) {
              const defaultMap: StructureMap = { id: DEFAULT_MAP_ID, title: 'Главная Карта', ownerId: loadedUser.username, members: [], roles: {} };
              GlobalMapDB.createOrUpdateMap({ map: defaultMap, nodes: [], connections: [] });
              loadedState.structureMaps = [defaultMap];
          }
      }

      // INVENTORY MIGRATION (Array of Items -> Array of Lists)
      // Check if inventory[0] exists and does NOT have 'items' property (meaning it's an old item)
      if (loadedState.inventory && loadedState.inventory.length > 0 && !(loadedState.inventory[0] as any).items) {
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
      
      // Ensure Quests are updated if user has old array
      if (loadedState.quests.length < INITIAL_QUESTS.length) {
          const existingIds = new Set(loadedState.quests.map(q => q.id));
          const newQuests = INITIAL_QUESTS.filter(q => !existingIds.has(q.id));
          loadedState.quests = [...loadedState.quests, ...newQuests];
      }

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
    case 'UPDATE_TASK':
        return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t) };
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
    
    // --- STRUCTURES (GlobalDB Intergration) ---
    case 'ADD_STRUCTURE_MAP': {
        const newMap = { ...action.payload, ownerId: state.user?.username, members: [], roles: {}, pendingInvites: [] };
        GlobalMapDB.createOrUpdateMap({ map: newMap, nodes: [], connections: [] });
        return { ...state, structureMaps: [...state.structureMaps, newMap] };
    }
    case 'DELETE_STRUCTURE_MAP': {
        GlobalMapDB.deleteMap(action.payload);
        return {
            ...state,
            structureMaps: state.structureMaps.filter(m => m.id !== action.payload),
            structures: state.structures.filter(s => s.mapId !== action.payload),
            structureConnections: state.structureConnections.filter(c => c.mapId !== action.payload)
        };
    }
    case 'UPDATE_STRUCTURE_MAP': {
        const updatedMap = action.payload;
        GlobalMapDB.updateMapContent(updatedMap.id, (data) => ({ ...data, map: updatedMap }));
        return { ...state, structureMaps: state.structureMaps.map(m => m.id === updatedMap.id ? updatedMap : m) };
    }
    case 'ADD_STRUCTURE': {
        const node = action.payload;
        if (!node.mapId) return state;
        GlobalMapDB.updateMapContent(node.mapId, (data) => ({ ...data, nodes: [...data.nodes, node] }));
        return { ...state, structures: [...state.structures, node] };
    }
    case 'UPDATE_STRUCTURE': {
        const node = action.payload;
        if (!node.mapId) return state;
        GlobalMapDB.updateMapContent(node.mapId, (data) => ({ 
            ...data, 
            nodes: data.nodes.map(n => n.id === node.id ? node : n) 
        }));
        return { ...state, structures: state.structures.map(s => s.id === node.id ? node : s) };
    }
    case 'DELETE_STRUCTURE': {
        const nodeId = action.payload;
        const node = state.structures.find(s => s.id === nodeId);
        if (!node || !node.mapId) return state;
        
        GlobalMapDB.updateMapContent(node.mapId, (data) => ({ 
            ...data, 
            nodes: data.nodes.filter(n => n.id !== nodeId),
            connections: data.connections.filter(c => c.fromId !== nodeId && c.toId !== nodeId)
        }));

        return { 
            ...state, 
            structures: state.structures.filter(s => s.id !== nodeId),
            structureConnections: state.structureConnections.filter(c => c.fromId !== nodeId && c.toId !== nodeId)
        };
    }
    case 'ADD_STRUCTURE_CONNECTION': {
        const conn = action.payload;
        if (!conn.mapId) return state;
        GlobalMapDB.updateMapContent(conn.mapId, (data) => ({ ...data, connections: [...data.connections, conn] }));
        return { ...state, structureConnections: [...state.structureConnections, conn] };
    }
    case 'DELETE_STRUCTURE_CONNECTION': {
        const connId = action.payload;
        const conn = state.structureConnections.find(c => c.id === connId);
        if (!conn || !conn.mapId) return state;
        GlobalMapDB.updateMapContent(conn.mapId, (data) => ({ ...data, connections: data.connections.filter(c => c.id !== connId) }));
        return { ...state, structureConnections: state.structureConnections.filter(c => c.id !== connId) };
    }
    case 'SET_AFFILIATION': {
        if (!state.user) return state;
        return {
            ...state,
            user: { ...state.user, affiliatedMapId: action.payload }
        };
    }
    
    // --- STRUCTURE INVITES ---
    case 'INVITE_TO_MAP': {
        if (!state.user) return state;
        const { mapId, targetUsername, isVirtual, role } = action.payload;
        
        // Use global DB to find fresh map state
        const mapData = GlobalMapDB.getMapById(mapId);
        if (!mapData) return state;
        const map = mapData.map;

        if (isVirtual) {
            const updatedMembers = [...(map.members || [])];
            if (!updatedMembers.includes(targetUsername)) updatedMembers.push(targetUsername);
            const updatedRoles = { ...map.roles, [targetUsername]: 'viewer' as const };
            const updatedMap = { ...map, members: updatedMembers, roles: updatedRoles };
            
            // Save to Global
            GlobalMapDB.createOrUpdateMap({ ...mapData, map: updatedMap });

            return {
                ...state,
                structureMaps: state.structureMaps.map(m => m.id === mapId ? updatedMap : m)
            };
        } else {
            // Real User Invite
            const invite: StructureInvite = {
                id: `inv_${Date.now()}`,
                mapId: mapId,
                mapTitle: map.title,
                inviter: state.user.username,
                role: role
            };

            const success = modifyOtherUser(targetUsername, (targetState) => {
                if (!targetState.user) return targetState;
                return {
                    ...targetState,
                    user: {
                        ...targetState.user,
                        structureInvites: [...(targetState.user.structureInvites || []), invite]
                    }
                };
            });

            if (success) {
                const updatedPending = [...(map.pendingInvites || [])];
                if (!updatedPending.includes(targetUsername)) updatedPending.push(targetUsername);
                const updatedMap = { ...map, pendingInvites: updatedPending };
                
                GlobalMapDB.createOrUpdateMap({ ...mapData, map: updatedMap });

                return {
                    ...state,
                    structureMaps: state.structureMaps.map(m => m.id === mapId ? updatedMap : m)
                };
            }
            return state;
        }
    }

    case 'ACCEPT_MAP_INVITE': {
        if (!state.user) return state;
        const invite = action.payload;
        
        // Remove invite from local state
        const newInvites = state.user.structureInvites.filter(i => i.id !== invite.id);
        const newState = { ...state, user: { ...state.user, structureInvites: newInvites } };

        // Update Global Map DB
        const mapData = GlobalMapDB.getMapById(invite.mapId);
        if (mapData) {
            const map = mapData.map;
            const newMembers = [...(map.members || [])];
            if (!newMembers.includes(state.user!.username)) newMembers.push(state.user!.username);
            const newPending = (map.pendingInvites || []).filter(u => u !== state.user!.username);
            const newRoles = { ...(map.roles || {}), [state.user!.username]: invite.role };

            const updatedMap = { ...map, members: newMembers, pendingInvites: newPending, roles: newRoles };
            
            // Save to Global
            GlobalMapDB.createOrUpdateMap({ ...mapData, map: updatedMap });

            // Load this new map into local state
            return {
                ...newState,
                structureMaps: [...newState.structureMaps, updatedMap],
                structures: [...newState.structures, ...mapData.nodes],
                structureConnections: [...newState.structureConnections, ...mapData.connections]
            };
        }

        return newState;
    }

    case 'REJECT_MAP_INVITE': {
        if (!state.user) return state;
        return {
            ...state,
            user: {
                ...state.user,
                structureInvites: state.user.structureInvites.filter(i => i.id !== action.payload)
            }
        };
    }

    case 'REMOVE_MAP_MEMBER': {
        const { mapId, username } = action.payload;
        const mapData = GlobalMapDB.getMapById(mapId);
        if (!mapData) return state;
        
        const map = mapData.map;
        const updatedMembers = (map.members || []).filter(m => m !== username);
        const updatedRoles = { ...(map.roles || {}) };
        delete updatedRoles[username];

        const updatedMap = { ...map, members: updatedMembers, roles: updatedRoles };
        
        // Global Update
        GlobalMapDB.createOrUpdateMap({ ...mapData, map: updatedMap });

        return {
            ...state,
            structureMaps: state.structureMaps.map(m => m.id === mapId ? updatedMap : m)
        };
    }

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
        // We only save User-specific data here. Shared maps are saved via GlobalMapDB immediately.
        // We can safely save the whole state because structureMaps will just be the user's view of them.
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