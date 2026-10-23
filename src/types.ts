export type EnergyLevel = 'low' | 'medium' | 'high'; // low = 🤏, medium = 🤌, high = 💪

// Backward-compatibility alias
export type SpoonLevel = EnergyLevel;

export const ENERGY_LEVELS: { id: EnergyLevel; label: string; icon: string; name: string }[] = [
  { id: 'low', label: 'Low', icon: '🤏', name: 'Low Energy' },
  { id: 'medium', label: 'Medium', icon: '🤌', name: 'Medium Energy' },
  { id: 'high', label: 'High', icon: '💪', name: 'High Energy' },
];

export type TimeBucket = 'morning' | 'midday' | 'evening' | 'anytime';

export interface EntryReminder {
  id: string;
  // Offset in minutes before the target time (0 = at the time, 5 = 5m before, 15 = 15m before, etc.)
  offsetMinutes: number;
  customTime?: string; // Optional HH:mm if specific time of day is chosen
  label?: string; // Optional custom title/label
  enabled?: boolean; // Defaults to true
}

export interface Habit {
  id: string;
  title: string;
  timeBucket: TimeBucket;
  time?: string; // Optional HH:mm preferred anchor time (e.g. "08:00")
  durationMinutes?: number; // Optional duration in minutes (e.g. 5, 15, 30)
  activeDays?: number[]; // Optional days of week [0..6] where 0=Sun..6=Sat. Undefined or length 7 means every day.
  energyCost: EnergyLevel;
  iconName?: string;
  color?: string;
  createdAt: string;
  // History is keyed by ISO date YYYY-MM-DD
  completedDates: string[];
  streakCount: number;
  totalCompletions: number;
  unstickTip?: string; // Low barrier fallback prompt
  isArchived?: boolean;
  reminders?: EntryReminder[];
}

export function isHabitActiveOnDate(habit: Habit, dateStr: string): boolean {
  if (!habit.activeDays || habit.activeDays.length === 0 || habit.activeDays.length === 7) {
    return true;
  }
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  if (isNaN(y) || isNaN(m) || isNaN(d)) return true;
  const dateObj = new Date(y, m - 1, d);
  return habit.activeDays.includes(dateObj.getDay());
}

export type BujoType = 'task' | 'note' | 'event';
export type BujoStatus = 'open' | 'completed' | 'migrated' | 'cancelled';

export interface MicroStep {
  id: string;
  title: string;
  completed: boolean;
  durationMinutes: number;
  energyCost: EnergyLevel;
  tip?: string;
}

export interface BujoEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // Optional HH:mm (e.g., "14:30")
  durationMinutes?: number; // Optional duration in minutes (e.g., 25, 45, 60)
  type: BujoType;
  status: BujoStatus;
  content: string;
  energyCost: EnergyLevel;
  isPriority?: boolean;
  category?: string;
  tags?: string[];
  microSteps?: MicroStep[];
  linkedHabitId?: string;
  createdAt: number;
  completedAt?: number;
  reminders?: EntryReminder[];
}

export type FocusTimerMode = 'sprint_5' | 'burst_15' | 'pomodoro_25' | 'deep_45' | 'flowmodoro' | 'custom';

export type AmbientSoundType = 'off' | 'brown' | 'pink' | 'binaural_40hz' | 'rain_hum';

export interface Project {
  id: string;
  name: string;
  color: string;
  iconName?: string;
  createdAt: number;
  isArchived?: boolean;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  isCompleted?: boolean;
  createdAt: number;
  estimatedMinutes?: number;
}

export interface TimeLog {
  id: string;
  projectId: string;
  taskId?: string;
  taskTitle?: string;
  description?: string;
  startTime: number; // timestamp in ms
  endTime: number; // timestamp in ms
  durationSeconds: number;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

export interface ActiveTimeTrackerState {
  projectId: string;
  taskId?: string;
  taskTitle?: string;
  description?: string;
  startTime: number;
  isRunning: boolean;
}

export interface FocusSession {
  id: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
  durationSeconds: number;
  mode: FocusTimerMode;
  taskTitle?: string;
  category?: string;
  moodRating?: number; // 1-5
  notes?: string;
}

export type SensoryState = 'balanced' | 'overwhelmed' | 'brain_fog' | 'hyperfocus' | 'low_energy';

export interface BrainDumpItem {
  id: string;
  content: string;
  createdAt: number;
  isProcessed?: boolean;
  isPinned?: boolean;
}

export type NavSection = 'planner' | 'journal' | 'habits' | 'focus' | 'braindump';
export type ActiveSection = NavSection | 'settings';
export type Language = 'en' | 'fa';

export const DEFAULT_NAV_ORDER: NavSection[] = [
  'planner',
  'journal',
  'habits',
  'focus',
  'braindump'
];

export type FocusTab = 'focus' | 'tracker';

export const DEFAULT_FOCUS_TAB_ORDER: FocusTab[] = [
  'focus',
  'tracker',
];

export type AiProvider = 'gemini' | 'openrouter' | 'custom';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash';
export const DEFAULT_CUSTOM_OPENAI_BASE_URL = 'http://localhost:11434/v1';
export const DEFAULT_CUSTOM_OPENAI_MODEL = 'llama3.2';

export interface AiModelPreset {
  id: string;
  name: string;
}

export interface CustomOpenAiPreset {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  description: string;
  keyRequired: boolean;
  models: AiModelPreset[];
}

export const CUSTOM_OPENAI_PRESETS: CustomOpenAiPreset[] = [
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    description: 'Local private models via Ollama. No API key needed.',
    keyRequired: false,
    models: [
      { id: 'llama3.2', name: 'Llama 3.2' },
      { id: 'llama3.1', name: 'Llama 3.1' },
      { id: 'mistral', name: 'Mistral' },
      { id: 'qwen2.5', name: 'Qwen 2.5' },
      { id: 'deepseek-r1', name: 'DeepSeek R1' },
      { id: 'phi4', name: 'Phi-4' },
    ],
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (Local)',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    description: 'Local LM Studio developer server. No API key needed.',
    keyRequired: false,
    models: [
      { id: 'local-model', name: 'Loaded Local Model' },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    description: 'Ultra-fast LPU inference with generous free quota.',
    keyRequired: true,
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    description: 'DeepSeek V3 & R1 OpenAI-compatible endpoint.',
    keyRequired: true,
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1' },
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    description: 'Open-source models cloud endpoint.',
    keyRequired: true,
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo' },
      { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B Turbo' },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B' },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    description: 'Direct official Mistral platform API.',
    keyRequired: true,
    models: [
      { id: 'mistral-small-latest', name: 'Mistral Small' },
      { id: 'mistral-large-latest', name: 'Mistral Large' },
      { id: 'codestral-latest', name: 'Codestral' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI (Official)',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    description: 'Direct official OpenAI API.',
    keyRequired: true,
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ],
  },
];

export const GEMINI_MODEL_PRESETS: AiModelPreset[] = [
  { id: 'gemini-flash-lite-latest', name: 'Flash-Lite' },
  { id: 'gemini-flash-latest', name: 'Flash' },
  { id: 'gemma-4-26b-a4b-it', name: 'Gemma 4 26B' },
  { id: 'gemma-4-31b-it', name: 'Gemma 4 31B' },
];

export const OPENROUTER_MODEL_PRESETS: AiModelPreset[] = [
  { id: 'liquid/lfm-2.5-2.6b:free', name: 'LFM 2.5' },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', name: 'Nemotron 3 Nano' },
  { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron 3.5' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra' },
  { id: 'thinkingmachines/inkling-small:free', name: 'Inkling Small' },
];

export interface UserPreferences {
  userName: string;
  language?: Language; // 'en' (LTR) | 'fa' (RTL)
  currentEnergy: EnergyLevel; // 'low' (🤏) | 'medium' (🤌) | 'high' (💪)
  sensoryState: SensoryState;
  chronotype?: Chronotype; // 'morning' | 'balanced' | 'afternoon' | 'evening'
  ambientSound: AmbientSoundType;
  ambientVolume: number;
  soundAlerts: boolean;
  soundEffectsEnabled: boolean; // Master toggle for all UI audio effects & clicks
  journalCategories?: string[]; // Custom list of Journal tags/categories
  navOrder?: NavSection[]; // Custom ordered list of navigation sections
  focusTabOrder?: FocusTab[]; // Custom ordered list of Timer tabs ('focus' and 'tracker')
  theme: 'light' | 'dark';
  accentColor: string; // e.g. '#80D141'
  accentColorName?: string;
  aiProvider?: AiProvider; // 'gemini' | 'openrouter' | 'custom'
  geminiApiKey?: string; // Custom user-entered Gemini API key
  geminiModel?: string; // Selected Gemini model ID
  openRouterApiKey?: string; // Custom user-entered OpenRouter API key
  openRouterModel?: string; // Selected OpenRouter model ID
  customOpenAiBaseUrl?: string; // Custom OpenAI-compatible Base URL
  customOpenAiApiKey?: string; // Custom user-entered API key (optional for local)
  customOpenAiModel?: string; // Selected Model ID
  customOpenAiApiVersion?: string; // Optional API version (e.g. for Azure)
  useSharedFreeKey?: boolean; // Whether the user uses the shared community free API key
  plannerCustomInstructions?: string; // Persistent custom instructions for smart planner
  reminderNotificationsEnabled?: boolean; // Whether browser notifications are active
  reminderSoundEnabled?: boolean; // Whether reminder chime is enabled
}

export function isLocalEndpoint(url?: string): boolean {
  if (!url) return false;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|::1|\.local\b/i.test(url);
}

export function hasActiveAiKey(prefs: UserPreferences): boolean {
  const provider: AiProvider = prefs.aiProvider || 'gemini';
  if (provider === 'openrouter') {
    return Boolean(prefs.openRouterApiKey && prefs.openRouterApiKey.trim() !== '');
  }
  if (provider === 'custom') {
    const baseUrl = prefs.customOpenAiBaseUrl?.trim() || (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_BASE_URL : '') || '';
    const key = prefs.customOpenAiApiKey?.trim() || (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_API_KEY : '') || '';
    if (baseUrl && isLocalEndpoint(baseUrl)) {
      // Local endpoints like Ollama or LM Studio don't require API keys
      return true;
    }
    return Boolean(key || baseUrl);
  }
  return Boolean(prefs.geminiApiKey && prefs.geminiApiKey.trim() !== '');
}

export type Chronotype = 'morning' | 'afternoon' | 'evening' | 'balanced';
export type PlanningPace = 'gentle' | 'balanced' | 'intensive';
export type SchedulingConstraint = 'all_priority' | 'all_tasks' | 'balanced';

export interface ScheduleBlock {
  id: string;
  startTime: string; // HH:mm format, e.g. "09:00"
  endTime: string; // HH:mm format, e.g. "09:45"
  title: string;
  type: 'task' | 'event' | 'break' | 'habit' | 'micro_reset';
  energyDemand: EnergyLevel;
  durationMinutes: number;
  bujoEntryId?: string;
  executiveRationale: string;
  microStarterSteps: string[];
  isBreak?: boolean;
  completed?: boolean;
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  summary: string;
  predictedEnergyRhythm: {
    morning: EnergyLevel;
    afternoon: EnergyLevel;
    evening: EnergyLevel;
    rhythmNote: string;
  };
  scheduleBlocks: ScheduleBlock[];
  pacingAdvice: string[];
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  createdAt: number;
}
