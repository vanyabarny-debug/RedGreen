
export type CommunicationStyle = 'default' | 'rude' | 'cute' | 'intellectual' | 'friendly';
export type TaskType = 'daily' | 'goal';

export interface FriendRequest {
    fromUsername: string;
    fromId: string;
    fromAvatar: string;
    createdAt: string;
}

export interface MoodEntry {
    date: string; // yyyy-MM-dd
    value: number; // 1-6
}

export interface User {
  username: string;
  uniqueId: string; // Unique short code for finding friends
  password?: string; // Simple auth
  avatar: string; // URL or Emoji or Base64
  description: string; // Bio
  level: number;
  currentXP: number;
  maxXP: number;
  // gold removed
  totalTasksCompleted: number;
  missedTasks: number;
  communicationStyle: CommunicationStyle;
  themeId: string;
  settings: {
    dailyMin: number;
    dailyMax: number;
  };
  // Social & Privacy
  friends: string[]; // List of usernames
  friendRequests: FriendRequest[]; // Incoming requests
  privacyMode: 'public' | 'friends' | 'private';
  
  // Mood Tracking
  moodHistory: MoodEntry[];
  
  // Questing
  currentQuestId?: string; // ID of the quest the user is currently doing
}

export interface Skill {
  id: string;
  parentId: string | null;
  name: string;
  color: string;
  level: number;
  currentXP: number;
  maxXP: number;
}

export interface TaskChecklistItem {
    id: string;
    text: string;
    completed: boolean;
}

export interface Task {
  id: string;
  type: TaskType;
  date?: string; // Only for daily
  deadline?: string; // Optional for daily, required for goals
  createdAt?: string; // Required for goal timers
  title: string;
  description: string;
  skillId: string;
  xpReward: number; // Max 20 for daily, 200 for goals
  completed: boolean;
  fileName?: string;
  taskImage?: string; // Base64 image
  linkedNoteId?: string;
  checklist?: TaskChecklistItem[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  status: 'available' | 'active' | 'completed' | 'failed';
  requirementType: 'task_count' | 'skill_level';
  requirementValue: number;
  requirementSkillId?: string; // If present, only tasks with this skill count
  currentProgress: number;
  isCustom?: boolean;
  betAmount?: number;
  deadline?: string;
}

export interface ShopItem {
  id: string;
  category: 'style' | 'theme';
  name: string;
  value: string; // style key or css class
  description: string;
}

export interface GameState {
  user: User | null;
  skills: Skill[];
  tasks: Task[];
  quests: Quest[];
  notes: Note[];
  inventory: InventoryItem[];
  shopItems: ShopItem[];
  showLevelUp: boolean;
  xpGain: { amount: number; x: number; y: number } | null; // For animation
}

export type GameAction =
  | { type: 'LOAD_GAME'; payload: GameState }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_PROFILE'; payload: { avatar: string; description: string } }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'ADD_TASKS_BATCH'; payload: Task[] } // New action for recurring tasks
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'UPDATE_TASK_DATE'; payload: { id: string; date: string } } // New action for DnD
  | { type: 'UPDATE_TASK_CHECKLIST'; payload: { taskId: string; checklist: TaskChecklistItem[] } }
  | { type: 'TOGGLE_TASK'; payload: { id: string; x?: number; y?: number } } 
  | { type: 'ADD_SKILL'; payload: Skill }
  | { type: 'DELETE_SKILL'; payload: string }
  | { type: 'ACCEPT_QUEST'; payload: string }
  | { type: 'CREATE_CUSTOM_QUEST'; payload: Quest }
  | { type: 'COMPLETE_QUEST'; payload: string }
  | { type: 'FAIL_QUEST'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: { min: number; max: number } }
  | { type: 'ADD_NOTE'; payload: Note }
  | { type: 'UPDATE_NOTE'; payload: { id: string; title: string; content: string } }
  | { type: 'DELETE_NOTE'; payload: string }
  | { type: 'ADD_INVENTORY'; payload: InventoryItem }
  | { type: 'TOGGLE_INVENTORY'; payload: string }
  | { type: 'DELETE_INVENTORY'; payload: string }
  | { type: 'CLEAR_INVENTORY' }
  | { type: 'EQUIP_ITEM'; payload: { category: 'style' | 'theme'; value: string } }
  | { type: 'CLOSE_LEVEL_UP' }
  | { type: 'CLEAR_XP_ANIMATION' }
  // Social Actions
  | { type: 'UPDATE_PRIVACY'; payload: 'public' | 'friends' | 'private' }
  | { type: 'SEND_FRIEND_REQUEST'; payload: string } // payload = target username
  | { type: 'ACCEPT_FRIEND_REQUEST'; payload: string } // payload = target username
  | { type: 'REJECT_FRIEND_REQUEST'; payload: string } // payload = target username
  | { type: 'REMOVE_FRIEND'; payload: string }
  // Mood
  | { type: 'LOG_MOOD'; payload: number };