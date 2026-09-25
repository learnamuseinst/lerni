export type EnergyLevel = 'low' | 'medium' | 'high'; // low = 🤏, medium = 🤌, high = 💪

// Backward-compatibility alias
export type SpoonLevel = EnergyLevel;

export const ENERGY_LEVELS: { id: EnergyLevel; label: string; icon: string; name: string }[] = [
  { id: 'low', label: 'Low', icon: '🤏', name: 'Low Energy' },
  { id: 'medium', label: 'Medium', icon: '🤌', name: 'Medium Energy' },
  { id: 'high', label: 'High', icon: '💪', name: 'High Energy' },
];

export type TimeBucket = 'morning' | 'midday' | 'evening' | 'anytime';

export interface Habit {
  id: string;
  title: string;
  description?: string;
  timeBucket: TimeBucket;
  time?: string; // Optional HH:mm preferred anchor time (e.g. "08:00")
  durationMinutes?: number; // Optional duration in minutes (e.g. 5, 15, 30)
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
}

export type BujoType = 'task' | 'note' | 'event' | 'habit_seed';
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
  geminiApiKey?: string; // Custom user-entered Gemini API key
  useSharedFreeKey?: boolean; // Whether the user uses the shared community free API key
  plannerCustomInstructions?: string; // Persistent custom instructions for smart planner
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
