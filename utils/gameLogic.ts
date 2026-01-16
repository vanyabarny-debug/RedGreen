
import { Skill, Task, User, Quest, CommunicationStyle, GameState, StructureMap, StructureNode, StructureConnection, MapRole } from '../types';
import { differenceInCalendarWeeks, parseISO, startOfWeek, isBefore, startOfDay, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, eachDayOfInterval, isSameDay, isAfter } from 'date-fns';

export const XP_TO_LEVEL_UP_BASE = 100;
export const XP_MULTIPLIER = 1.2;

// --- GLOBAL SHARED MAP DATABASE (Simulation of Backend) ---
const SHARED_MAPS_KEY = 'liferpg_shared_maps_v2';

export interface SharedMapData {
    map: StructureMap;
    nodes: StructureNode[];
    connections: StructureConnection[];
}

export const GlobalMapDB = {
    getAllMaps: (): SharedMapData[] => {
        try {
            const raw = localStorage.getItem(SHARED_MAPS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    },

    saveAllMaps: (data: SharedMapData[]) => {
        localStorage.setItem(SHARED_MAPS_KEY, JSON.stringify(data));
    },

    getMapById: (mapId: string): SharedMapData | undefined => {
        const all = GlobalMapDB.getAllMaps();
        return all.find(d => d.map.id === mapId);
    },

    createOrUpdateMap: (mapData: SharedMapData) => {
        const all = GlobalMapDB.getAllMaps();
        const index = all.findIndex(d => d.map.id === mapData.map.id);
        if (index >= 0) {
            all[index] = mapData;
        } else {
            all.push(mapData);
        }
        GlobalMapDB.saveAllMaps(all);
    },

    deleteMap: (mapId: string) => {
        const all = GlobalMapDB.getAllMaps().filter(d => d.map.id !== mapId);
        GlobalMapDB.saveAllMaps(all);
    },

    // Get all maps accessible by a specific user (Owner or Member)
    getUserMaps: (username: string): { maps: StructureMap[], nodes: StructureNode[], connections: StructureConnection[] } => {
        const allData = GlobalMapDB.getAllMaps();
        const accessibleData = allData.filter(d => 
            d.map.ownerId === username || 
            (d.map.members && d.map.members.includes(username))
        );

        return {
            maps: accessibleData.map(d => d.map),
            nodes: accessibleData.flatMap(d => d.nodes),
            connections: accessibleData.flatMap(d => d.connections)
        };
    },
    
    // Perform an update on a specific map
    updateMapContent: (mapId: string, updater: (data: SharedMapData) => SharedMapData) => {
        const all = GlobalMapDB.getAllMaps();
        const index = all.findIndex(d => d.map.id === mapId);
        if (index >= 0) {
            all[index] = updater(all[index]);
            GlobalMapDB.saveAllMaps(all);
            return all[index]; // Return updated data
        }
        return null;
    }
};

export const calculateMaxXP = (level: number) => {
  return Math.floor(XP_TO_LEVEL_UP_BASE * Math.pow(XP_MULTIPLIER, level - 1));
};

export const getMotivationMessage = (percentage: number, style: CommunicationStyle): string => {
  switch (style) {
    case 'rude':
        if (percentage < 10) return "Ты ленивый кусок... Вставай и делай!";
        if (percentage < 50) return "Позорище. Моя бабушка работает быстрее.";
        if (percentage < 90) return "Ну, хотя бы не ноль. Но ты все равно слабак.";
        return "Неплохо. Для неудачника.";
    case 'cute':
        if (percentage < 10) return "Котик, давай проснемся! 🐾";
        if (percentage < 50) return "Ты стараешься, я вижу! У тебя все получится! ✨";
        if (percentage < 90) return "Вау! Ты просто солнышко! Еще чуть-чуть! ☀️";
        return "Ты супер-пупер молодец! Я горжусь тобой! ❤️";
    case 'intellectual':
        if (percentage < 10) return "Ваша продуктивность стремится к статистической погрешности.";
        if (percentage < 50) return "Анализ показывает умеренную активность. Рекомендую ускорение.";
        if (percentage < 90) return "Показатели эффективности выше среднего. Продолжайте наблюдение.";
        return "Феноменальный результат. Вы превзошли ожидания.";
    case 'friendly':
        if (percentage < 10) return "Йоу, бро! Тяжелый день? Давай, соберись!";
        if (percentage < 50) return "Нормально идем, но можем лучше, правда?";
        if (percentage < 90) return "Красава! Отличный темп!";
        return "Легенда! Ты разорвал этот день!";
    default: // Default / Normal
        if (percentage < 10) return "Начало положено. Или нет...";
        if (percentage < 50) return "Экватор пройден. Не останавливайся.";
        if (percentage < 90) return "Отличная работа. Почти финиш.";
        return "Идеально. День прожит не зря.";
  }
};

export const getWeekProgress = (tasks: Task[], settings: { dailyMin: number }) => {
  // Legacy wrapper for compatibility if needed, essentially calls getPeriodProgress for week
  const stats = getPeriodProgress(tasks, settings, 'week');
  return {
    completed: stats.completed,
    total: stats.target,
    percentage: stats.absolutePercent
  };
};

export const getPeriodProgress = (tasks: Task[], settings: { dailyMin: number }, period: 'week' | 'month' | 'year') => {
    const now = new Date();
    let start: Date, end: Date;

    if (period === 'week') {
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
    } else if (period === 'month') {
        start = startOfMonth(now);
        end = endOfMonth(now);
    } else {
        start = startOfYear(now);
        end = endOfYear(now);
    }

    // 1. Calculate Target based on days in period
    const allDays = eachDayOfInterval({ start, end });
    const totalDaysCount = allDays.length;
    const target = totalDaysCount * settings.dailyMin;

    // 2. Calculate Completed Tasks within this period
    const periodTasks = tasks.filter(t => {
        if (t.type !== 'daily' || !t.date || !t.completed) return false;
        const tDate = parseISO(t.date);
        return (isSameDay(tDate, start) || isAfter(tDate, start)) && (isSameDay(tDate, end) || isBefore(tDate, end));
    });
    const completed = periodTasks.length;

    // 3. Calculate "Absolute" Progress (Visual Bar)
    // How much of the TOTAL period goal is done? (e.g. at start of month it's low)
    const absolutePercent = target === 0 ? 0 : Math.min(100, Math.round((completed / target) * 100));

    // 4. Calculate "Pace" Progress (Motivation)
    // How well are we doing relative to how many days have passed?
    const daysPassed = allDays.filter(d => isBefore(d, now) || isSameDay(d, now)).length;
    const paceTarget = Math.max(1, daysPassed * settings.dailyMin);
    const pacePercent = Math.min(100, Math.round((completed / paceTarget) * 100));

    return {
        completed,
        target,
        absolutePercent, // For the Progress Bar width (fills up over time)
        pacePercent // For the Motivation Text (are you good TODAY?)
    };
};

export const processTaskCompletion = (
  state: { user: User; skills: Skill[]; quests: Quest[] },
  task: Task
) => {
  const newUser = { ...state.user };
  const newSkills = [...state.skills];
  // Deep copy quests to avoid mutation issues
  const newQuests = state.quests.map(q => ({...q}));
  let leveledUp = false;

  newUser.currentXP += task.xpReward;
  newUser.totalTasksCompleted += 1;
  
  // Level Up Logic
  while (newUser.currentXP >= newUser.maxXP) {
    newUser.currentXP -= newUser.maxXP;
    newUser.level += 1;
    newUser.maxXP = calculateMaxXP(newUser.level);
    leveledUp = true;
  }

  // Skill Progression
  const skillIndex = newSkills.findIndex(s => s.id === task.skillId);
  if (skillIndex !== -1) {
    const skill = { ...newSkills[skillIndex] };
    skill.currentXP += task.xpReward;
    
    while (skill.currentXP >= skill.maxXP) {
      skill.currentXP -= skill.maxXP;
      skill.level += 1;
      skill.maxXP = Math.floor(skill.maxXP * 1.5);
    }
    newSkills[skillIndex] = skill;
  }

  // Quest Logic
  for (const quest of newQuests) {
    if (quest.status === 'active') {
        let matched = false;
        
        if (quest.requirementType === 'task_count') {
            // Check if quest requires a specific skill
            if (!quest.requirementSkillId || quest.requirementSkillId === task.skillId) {
                matched = true;
            }
        }

        if (matched) {
            quest.currentProgress += 1;
            
            // Check Completion
            if (quest.currentProgress >= quest.requirementValue) {
                quest.status = 'completed';
                newUser.currentQuestId = undefined; // Clear active quest on completion
                
                const totalReward = quest.xpReward + (quest.betAmount ? Math.floor(quest.betAmount * 1.5) : 0);
                newUser.currentXP += totalReward;
                
                // Re-check level up after quest reward
                while (newUser.currentXP >= newUser.maxXP) {
                    newUser.currentXP -= newUser.maxXP;
                    newUser.level += 1;
                    newUser.maxXP = calculateMaxXP(newUser.level);
                    leveledUp = true;
                }
            }
        }
    }
  }
  
  return { user: newUser, skills: newSkills, quests: newQuests, leveledUp };
};

export const processTaskUncheck = (
   state: { user: User; skills: Skill[]; quests: Quest[] },
   task: Task
) => {
    const newUser = { ...state.user };
    newUser.currentXP = Math.max(0, newUser.currentXP - task.xpReward);
    newUser.totalTasksCompleted = Math.max(0, newUser.totalTasksCompleted - 1);
    
    return { user: newUser, skills: state.skills, quests: state.quests };
}

export const checkMissedTasks = (tasks: Task[]): number => {
    const yesterday = startOfDay(new Date());
    return tasks.filter(t => {
        if (t.completed || t.type !== 'daily' || !t.date) return false;
        try {
            return isBefore(parseISO(t.date), yesterday);
        } catch (e) { return false; }
    }).length;
};

// --- Leaderboard Logic ---
export interface LeaderboardPlayer {
    rank: number;
    username: string;
    uniqueId: string;
    level: number;
    efficiency: number; // 0-100%
    isUser: boolean;
    isFriend: boolean;
    isHidden: boolean; // For privacy
    percentile: string; // "Top 1%", "Top 0.5%" etc
    avatar: string; // Avatar property
    data: GameState; // Full data to view profile (if public)
}

// Scans LocalStorage for all users registered in 'liferpg_users_index'
export const getGlobalLeaderboard = (currentUser: User | null): LeaderboardPlayer[] => {
    if (!currentUser) return [];

    let players: LeaderboardPlayer[] = [];
    const indexKey = 'liferpg_users_index';
    
    try {
        const rawIndex = localStorage.getItem(indexKey);
        if (!rawIndex) return [];
        const usernames: string[] = JSON.parse(rawIndex);

        // 1. First pass: Collect all data and calculate efficiency
        const rawPlayers = usernames.map(username => {
            const saveKey = `liferpg_user_${username}`;
            const rawData = localStorage.getItem(saveKey);
            if (!rawData) return null;
            
            try {
                const gameState: GameState = JSON.parse(rawData);
                if (!gameState.user) return null;

                // Calculate Efficiency
                const totalCompleted = gameState.user.totalTasksCompleted || 0;
                const totalMissed = gameState.tasks.filter(t => {
                    if (t.completed || t.type !== 'daily' || !t.date) return false;
                    try {
                        return isBefore(parseISO(t.date), startOfDay(new Date()));
                    } catch (e) { return false; }
                }).length;
                
                const efficiency = (totalCompleted + totalMissed) > 0 ? (totalCompleted / (totalCompleted + totalMissed)) * 100 : 100;
                
                return {
                    username: gameState.user.username,
                    uniqueId: gameState.user.uniqueId || '???',
                    level: gameState.user.level,
                    avatar: gameState.user.avatar || gameState.user.username.charAt(0).toUpperCase(),
                    privacyMode: gameState.user.privacyMode || 'public',
                    efficiency,
                    data: gameState
                };
            } catch (e) { return null; }
        }).filter(p => p !== null) as any[];

        // 2. Sort by Efficiency (DESCENDING) - High efficiency = Better Rank
        // If efficiency is same, sort by Level (Descending)
        rawPlayers.sort((a, b) => {
            if (Math.abs(b.efficiency - a.efficiency) > 0.1) return b.efficiency - a.efficiency;
            return b.level - a.level;
        });

        const totalPlayers = rawPlayers.length;

        // 3. Second pass: Build Final Leaderboard Objects with Privacy & Percentile
        players = rawPlayers.map((p, index) => {
            const rank = index + 1;
            
            // Calculate Top X%
            let percentile = (rank / totalPlayers) * 100;
            
            let percentileStr = "100%";
            if (percentile <= 0.1) percentileStr = "0.1%";
            else if (percentile <= 1) percentileStr = "1%";
            else if (percentile <= 5) percentileStr = percentile.toFixed(1) + "%";
            else percentileStr = Math.ceil(percentile) + "%";

            // Privacy Logic
            const isUser = currentUser && p.username === currentUser.username;
            const isFriend = currentUser && currentUser.friends && currentUser.friends.includes(p.username);
            const privacy = p.privacyMode || 'public';
            
            let isHidden = false;
            if (!isUser) {
                if (privacy === 'private') isHidden = true;
                if (privacy === 'friends' && !isFriend) isHidden = true;
            }

            return {
                rank,
                username: p.username, 
                uniqueId: isHidden ? 'HIDDEN' : p.uniqueId,
                level: p.level,
                efficiency: Math.round(p.efficiency),
                avatar: isHidden ? '🔒' : p.avatar,
                isUser,
                isFriend,
                isHidden,
                percentile: percentileStr,
                data: p.data
            };
        });

    } catch (e) {
        console.error("Error building leaderboard", e);
    }

    return players;
};

export const getUserPercentileLabel = (user: User): string => {
    // For this simple implementation, we just call the main function
    const leaderboard = getGlobalLeaderboard(user);
    const me = leaderboard.find(p => p.username === user.username);
    return me ? `Топ ${me.percentile}` : "N/A";
};

// --- Quest Participants Helper ---
export interface QuestParticipant {
    username: string;
    avatar: string;
}

export const getQuestParticipants = (questId: string): QuestParticipant[] => {
    const indexKey = 'liferpg_users_index';
    const participants: QuestParticipant[] = [];
    
    try {
        const rawIndex = localStorage.getItem(indexKey);
        if (!rawIndex) return [];
        const usernames: string[] = JSON.parse(rawIndex);

        usernames.forEach(username => {
             const saveKey = `liferpg_user_${username}`;
             const rawData = localStorage.getItem(saveKey);
             if (rawData) {
                 const gs: GameState = JSON.parse(rawData);
                 if (gs.user && gs.user.currentQuestId === questId) {
                     participants.push({
                         username: gs.user.username,
                         avatar: gs.user.avatar
                     });
                 }
             }
        });
    } catch (e) {}
    
    return participants;
}
