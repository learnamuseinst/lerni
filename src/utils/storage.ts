import { Habit, BujoEntry, FocusSession, UserPreferences, BrainDumpItem, EnergyLevel, DEFAULT_NAV_ORDER, NavSection, DayPlan, Chronotype, Project, ProjectTask, TimeLog, ActiveTimeTrackerState, FocusTab, DEFAULT_FOCUS_TAB_ORDER } from '../types';

export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getPastDateString = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeEnergy = (val: any): EnergyLevel => {
  if (val === 'low' || val === 'medium' || val === 'high') return val;
  if (val === 1 || val === '1') return 'low';
  if (val === 2 || val === '2') return 'medium';
  if (val === 3 || val === '3') return 'high';
  return 'medium';
};

const DEFAULT_HABITS: Habit[] = [
  {
    id: 'habit-1',
    title: 'Morning Water & Gentle Sip',
    description: 'Place cup near bedside the night before to reduce friction.',
    timeBucket: 'morning',
    time: '08:00',
    durationMinutes: 5,
    energyCost: 'low',
    iconName: 'Droplets',
    color: '#80D141', // Lerni Green
    createdAt: getPastDateString(10),
    completedDates: [getPastDateString(3), getPastDateString(2), getPastDateString(1)],
    streakCount: 3,
    totalCompletions: 8,
    unstickTip: 'Just take 1 single sip. You do not have to finish the whole glass.'
  },
  {
    id: 'habit-2',
    title: '30-Second Sun & Sky Gaze',
    description: 'Natural light anchors circadian rhythm and raises dopamine.',
    timeBucket: 'morning',
    time: '08:15',
    durationMinutes: 5,
    energyCost: 'low',
    iconName: 'Sun',
    color: '#fbbf24', // Amber
    createdAt: getPastDateString(7),
    completedDates: [getPastDateString(2), getPastDateString(1)],
    streakCount: 2,
    totalCompletions: 5,
    unstickTip: 'Look out any window for just 3 breaths.'
  },
  {
    id: 'habit-3',
    title: 'Midday Shoulder & Jaw Un-clench',
    description: 'Physical reset to release sensory tension.',
    timeBucket: 'midday',
    time: '12:30',
    durationMinutes: 5,
    energyCost: 'low',
    iconName: 'Smile',
    color: '#4ade80', // Emerald
    createdAt: getPastDateString(5),
    completedDates: [getPastDateString(1)],
    streakCount: 1,
    totalCompletions: 4,
    unstickTip: 'Drop shoulders down away from your ears, take 1 deep exhale.'
  },
  {
    id: 'habit-4',
    title: '2-Minute Surface Rescue',
    description: 'Put just 2 items back in their home.',
    timeBucket: 'evening',
    time: '21:00',
    durationMinutes: 10,
    energyCost: 'low',
    iconName: 'Sparkles',
    color: '#80D141', // Lerni Green
    createdAt: getPastDateString(6),
    completedDates: [getPastDateString(2), getPastDateString(1)],
    streakCount: 2,
    totalCompletions: 6,
    unstickTip: 'Pick up only 1 trash wrapper or 1 mug. Stop right after.'
  }
];

const DEFAULT_BUJO: BujoEntry[] = [
  {
    id: 'bujo-1',
    date: getTodayDateString(),
    type: 'task',
    status: 'open',
    content: 'Send reply to schedule dental cleaning',
    energyCost: 'low',
    isPriority: true,
    category: 'Health',
    tags: ['Quick', 'Health'],
    createdAt: Date.now() - 3600000 * 4,
    microSteps: [
      { id: 'ms-1', title: 'Open email app or tab', completed: true, durationMinutes: 1, energyCost: 'low', tip: 'Just open it, do not read other emails.' },
      { id: 'ms-2', title: 'Find dentist email and click Reply', completed: false, durationMinutes: 2, energyCost: 'low', tip: 'Use a 1-sentence template: "Tuesday at 10am works for me, thank you!"' },
      { id: 'ms-3', title: 'Hit Send and close the tab', completed: false, durationMinutes: 1, energyCost: 'low', tip: 'Dopamine win unlocked.' }
    ]
  },
  {
    id: 'bujo-2',
    date: getTodayDateString(),
    type: 'event',
    status: 'open',
    content: '3:00 PM Focus sprint with body double',
    energyCost: 'low',
    category: 'Work',
    tags: ['Calendar'],
    createdAt: Date.now() - 3600000 * 3
  },
  {
    id: 'bujo-3',
    date: getTodayDateString(),
    type: 'note',
    status: 'open',
    content: 'Brown noise in Focus Tracker made writing feel 50% easier today!',
    energyCost: 'low',
    category: 'Reflection',
    tags: ['Win', 'Sensory'],
    createdAt: Date.now() - 3600000 * 2
  },
  {
    id: 'bujo-4',
    date: getTodayDateString(),
    type: 'task',
    status: 'open',
    content: 'Put clean laundry from dryer into basket',
    energyCost: 'medium',
    isPriority: false,
    category: 'Home',
    tags: ['Chore'],
    createdAt: Date.now() - 3600000 * 1
  }
];

const DEFAULT_BRAIN_DUMP: BrainDumpItem[] = [
  {
    id: 'bd-1',
    content: 'Need to research noise-canceling foam tips for earplugs',
    createdAt: Date.now() - 7200000,
    isProcessed: false,
    isPinned: true
  },
  {
    id: 'bd-2',
    content: 'Did I remember to turn off the oven before leaving earlier? (Yes, verified!)',
    createdAt: Date.now() - 5400000,
    isProcessed: true,
  },
  {
    id: 'bd-3',
    content: 'Book recommendation from friend: "How to Keep House While Drowning"',
    createdAt: Date.now() - 3600000,
    isProcessed: false,
  },
  {
    id: 'bd-4',
    content: 'Check tire pressure next time at gas station',
    createdAt: Date.now() - 1800000,
    isProcessed: false,
  }
];

const DEFAULT_FOCUS_SESSIONS: FocusSession[] = [
  {
    id: 'fs-1',
    timestamp: Date.now() - 86400000,
    date: getPastDateString(1),
    durationSeconds: 1500, // 25 min
    mode: 'pomodoro_25',
    taskTitle: 'Organize study notes',
    category: 'Study',
    moodRating: 4,
    notes: 'Used brown noise, got into the groove nicely.'
  },
  {
    id: 'fs-2',
    timestamp: Date.now() - 86400000 * 2,
    date: getPastDateString(2),
    durationSeconds: 900, // 15 min
    mode: 'burst_15',
    taskTitle: 'Email inbox triage',
    category: 'Admin',
    moodRating: 3
  }
];

const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Deep Work & Projects',
    color: '#80D141',
    iconName: 'Briefcase',
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'proj-2',
    name: 'Learning & Research',
    color: '#3B82F6',
    iconName: 'BookOpen',
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'proj-3',
    name: 'Creative Studio',
    color: '#EC4899',
    iconName: 'Palette',
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'proj-4',
    name: 'Admin & Personal',
    color: '#F59E0B',
    iconName: 'CheckSquare',
    createdAt: Date.now() - 86400000 * 2,
  },
];

const DEFAULT_PROJECT_TASKS: ProjectTask[] = [
  {
    id: 'ptask-1',
    projectId: 'proj-1',
    title: 'Core App Development & Logic',
    isCompleted: false,
    estimatedMinutes: 60,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'ptask-2',
    projectId: 'proj-1',
    title: 'Writing Documentation & Architecture',
    isCompleted: false,
    estimatedMinutes: 30,
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'ptask-3',
    projectId: 'proj-2',
    title: 'Read ADHD executive function paper',
    isCompleted: false,
    estimatedMinutes: 25,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'ptask-4',
    projectId: 'proj-3',
    title: 'Visual UI Mockups & Color System',
    isCompleted: false,
    estimatedMinutes: 45,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'ptask-5',
    projectId: 'proj-4',
    title: 'Organize files & clear inbox',
    isCompleted: false,
    estimatedMinutes: 15,
    createdAt: Date.now() - 86400000 * 1,
  },
];

const DEFAULT_TIME_LOGS: TimeLog[] = [
  {
    id: 'tlog-1',
    projectId: 'proj-1',
    taskId: 'ptask-1',
    taskTitle: 'Core App Development & Logic',
    description: 'Refined time tracking components and storage',
    startTime: Date.now() - 3600000 * 3,
    endTime: Date.now() - 3600000 * 2.25,
    durationSeconds: 45 * 60,
    date: getTodayDateString(),
    createdAt: Date.now() - 3600000 * 2.25,
  },
  {
    id: 'tlog-2',
    projectId: 'proj-2',
    taskId: 'ptask-3',
    taskTitle: 'Read ADHD executive function paper',
    description: 'Literature review on cognitive momentum',
    startTime: Date.now() - 3600000 * 5,
    endTime: Date.now() - 3600000 * 4.5,
    durationSeconds: 30 * 60,
    date: getTodayDateString(),
    createdAt: Date.now() - 3600000 * 4.5,
  }
];

export const DEFAULT_JOURNAL_CATEGORIES = ['General', 'Personal', 'Work', 'Health', 'Errands', 'Home'];

const DEFAULT_PREFERENCES: UserPreferences = {
  userName: 'Friend',
  language: 'en',
  currentEnergy: 'medium',
  sensoryState: 'balanced',
  chronotype: 'balanced',
  ambientSound: 'off',
  ambientVolume: 0.4,
  soundAlerts: true,
  soundEffectsEnabled: true,
  journalCategories: DEFAULT_JOURNAL_CATEGORIES,
  navOrder: DEFAULT_NAV_ORDER,
  focusTabOrder: DEFAULT_FOCUS_TAB_ORDER,
  theme: 'dark',
  accentColor: '#80D141',
  accentColorName: 'Lerni Green (Default)',
  geminiApiKey: '',
  useSharedFreeKey: true,
  plannerCustomInstructions: '',
};

const STORAGE_KEYS = {
  HABITS: 'lerni_habits_v1',
  BUJO: 'lerni_bujo_v1',
  BRAIN_DUMP: 'lerni_braindump_v1',
  FOCUS: 'lerni_focus_v1',
  PREFS: 'lerni_prefs_v1',
  PLANS: 'lerni_day_plans_v1',
  PROJECTS: 'lerni_projects_v1',
  PROJECT_TASKS: 'lerni_project_tasks_v1',
  TIME_LOGS: 'lerni_time_logs_v1',
  ACTIVE_TRACKER: 'lerni_active_tracker_v1'
};

export const storage = {
  getHabits: (): Habit[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HABITS) || localStorage.getItem('kinetic_habits_v1');
      if (!data) return DEFAULT_HABITS;
      const parsed: any[] = JSON.parse(data);
      return parsed.map((h) => ({
        ...h,
        energyCost: normalizeEnergy(h.energyCost || h.spoonCost),
      }));
    } catch {
      return DEFAULT_HABITS;
    }
  },
  saveHabits: (habits: Habit[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
    } catch (e) {
      console.error(e);
    }
  },

  getBujoEntries: (): BujoEntry[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUJO) || localStorage.getItem('kinetic_bujo_v1');
      if (!data) return DEFAULT_BUJO;
      const parsed: any[] = JSON.parse(data);
      return parsed.map((e) => ({
        ...e,
        energyCost: normalizeEnergy(e.energyCost || e.spoonCost),
        microSteps: (e.microSteps || []).map((s: any) => ({
          ...s,
          energyCost: normalizeEnergy(s.energyCost || s.spoonCost),
        })),
      }));
    } catch {
      return DEFAULT_BUJO;
    }
  },
  saveBujoEntries: (entries: BujoEntry[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.BUJO, JSON.stringify(entries));
    } catch (e) {
      console.error(e);
    }
  },

  getBrainDump: (): BrainDumpItem[] => {
    return storage.getBrainDumpItems();
  },
  getBrainDumpItems: (): BrainDumpItem[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BRAIN_DUMP);
      if (!data) return DEFAULT_BRAIN_DUMP;
      const parsed: any[] = JSON.parse(data);
      return parsed.map((item) => ({
        ...item,
        energyEstimate: item.energyEstimate
          ? normalizeEnergy(item.energyEstimate)
          : item.spoonEstimate
          ? normalizeEnergy(item.spoonEstimate)
          : undefined,
      }));
    } catch {
      return DEFAULT_BRAIN_DUMP;
    }
  },
  saveBrainDump: (items: BrainDumpItem[]) => {
    storage.saveBrainDumpItems(items);
  },
  saveBrainDumpItems: (items: BrainDumpItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.BRAIN_DUMP, JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  },

  getFocusSessions: (): FocusSession[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FOCUS) || localStorage.getItem('kinetic_focus_v1');
      return data ? JSON.parse(data) : DEFAULT_FOCUS_SESSIONS;
    } catch {
      return DEFAULT_FOCUS_SESSIONS;
    }
  },
  saveFocusSessions: (sessions: FocusSession[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.FOCUS, JSON.stringify(sessions));
    } catch (e) {
      console.error(e);
    }
  },

  getPreferences: (): UserPreferences => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PREFS) || localStorage.getItem('kinetic_prefs_v1');
      if (!data) return DEFAULT_PREFERENCES;
      const parsed = JSON.parse(data);
      const currentEnergy: EnergyLevel = parsed.currentEnergy
        ? normalizeEnergy(parsed.currentEnergy)
        : parsed.currentSpoons
        ? (parsed.currentSpoons <= 2 ? 'low' : parsed.currentSpoons <= 4 ? 'medium' : 'high')
        : 'medium';

      const soundEffectsEnabled = parsed.soundEffectsEnabled !== undefined ? Boolean(parsed.soundEffectsEnabled) : true;
      const journalCategories = Array.isArray(parsed.journalCategories) && parsed.journalCategories.length > 0 
        ? parsed.journalCategories 
        : DEFAULT_JOURNAL_CATEGORIES;

      let navOrder: NavSection[] = DEFAULT_NAV_ORDER;
      if (Array.isArray(parsed.navOrder) && parsed.navOrder.length > 0) {
        // Filter valid nav sections and append any missing defaults
        const validItems = parsed.navOrder.filter((item: any): item is NavSection => 
          DEFAULT_NAV_ORDER.includes(item)
        );
        const uniqueSet = new Set<NavSection>(validItems);
        DEFAULT_NAV_ORDER.forEach((def) => uniqueSet.add(def));
        navOrder = Array.from(uniqueSet);
      }

      let focusTabOrder: FocusTab[] = DEFAULT_FOCUS_TAB_ORDER;
      if (Array.isArray(parsed.focusTabOrder) && parsed.focusTabOrder.length > 0) {
        const validTabs = parsed.focusTabOrder.filter((item: any): item is FocusTab =>
          DEFAULT_FOCUS_TAB_ORDER.includes(item)
        );
        const uniqueSet = new Set<FocusTab>(validTabs);
        DEFAULT_FOCUS_TAB_ORDER.forEach((def) => uniqueSet.add(def));
        focusTabOrder = Array.from(uniqueSet);
      }

      const validChronotypes: Chronotype[] = ['morning', 'balanced', 'afternoon', 'evening'];
      const chronotype: Chronotype = validChronotypes.includes(parsed.chronotype)
        ? parsed.chronotype
        : 'balanced';

      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        currentEnergy,
        chronotype,
        soundEffectsEnabled,
        journalCategories,
        navOrder,
        focusTabOrder,
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },
  savePreferences: (prefs: UserPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(prefs));
    } catch (e) {
      console.error(e);
    }
  },

  getDayPlans: (): Record<string, DayPlan> => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLANS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  getDayPlan: (dateStr: string): DayPlan | null => {
    try {
      const plans = storage.getDayPlans();
      return plans[dateStr] || null;
    } catch {
      return null;
    }
  },

  saveDayPlan: (plan: DayPlan) => {
    try {
      const plans = storage.getDayPlans();
      plans[plan.date] = plan;
      localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
    } catch (e) {
      console.error("Failed to save day plan:", e);
    }
  },

  deleteDayPlan: (dateStr: string) => {
    try {
      const plans = storage.getDayPlans();
      delete plans[dateStr];
      localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
    } catch (e) {
      console.error("Failed to delete day plan:", e);
    }
  },

  getProjects: (): Project[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      return data ? JSON.parse(data) : DEFAULT_PROJECTS;
    } catch {
      return DEFAULT_PROJECTS;
    }
  },

  saveProjects: (projects: Project[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.error("Failed to save projects:", e);
    }
  },

  getProjectTasks: (): ProjectTask[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECT_TASKS);
      return data ? JSON.parse(data) : DEFAULT_PROJECT_TASKS;
    } catch {
      return DEFAULT_PROJECT_TASKS;
    }
  },

  saveProjectTasks: (tasks: ProjectTask[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECT_TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error("Failed to save project tasks:", e);
    }
  },

  getTimeLogs: (): TimeLog[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TIME_LOGS);
      return data ? JSON.parse(data) : DEFAULT_TIME_LOGS;
    } catch {
      return DEFAULT_TIME_LOGS;
    }
  },

  saveTimeLogs: (logs: TimeLog[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.TIME_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error("Failed to save time logs:", e);
    }
  },

  getActiveTimeTracker: (): ActiveTimeTrackerState | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_TRACKER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveActiveTimeTracker: (state: ActiveTimeTrackerState | null) => {
    try {
      if (state) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_TRACKER, JSON.stringify(state));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRACKER);
      }
    } catch (e) {
      console.error("Failed to save active tracker:", e);
    }
  },

  exportAllData: () => {
    return JSON.stringify({
      habits: storage.getHabits(),
      bujo: storage.getBujoEntries(),
      brainDump: storage.getBrainDump(),
      focusSessions: storage.getFocusSessions(),
      projects: storage.getProjects(),
      projectTasks: storage.getProjectTasks(),
      timeLogs: storage.getTimeLogs(),
      prefs: storage.getPreferences(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  },

  importAllData: (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.habits) storage.saveHabits(parsed.habits);
      if (parsed.bujo) storage.saveBujoEntries(parsed.bujo);
      if (parsed.brainDump) storage.saveBrainDump(parsed.brainDump);
      if (parsed.focusSessions) storage.saveFocusSessions(parsed.focusSessions);
      if (parsed.projects) storage.saveProjects(parsed.projects);
      if (parsed.projectTasks) storage.saveProjectTasks(parsed.projectTasks);
      if (parsed.timeLogs) storage.saveTimeLogs(parsed.timeLogs);
      if (parsed.prefs) storage.savePreferences(parsed.prefs);
      return true;
    } catch (e) {
      console.error("Failed import:", e);
      return false;
    }
  }
};

