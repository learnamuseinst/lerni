import { BujoEntry, Habit, FocusSession, UserPreferences, EnergyLevel, DayPlan, ScheduleBlock, Chronotype, PlanningPace, SensoryState, SchedulingConstraint } from '../types';
import { getTodayKey, shiftDate, formatDateDisplay } from './dateUtils';

interface GenerateScheduleParams {
  targetDate: string;
  entries: BujoEntry[];
  habits: Habit[];
  focusSessions: FocusSession[];
  prefs: UserPreferences;
  chronotype?: Chronotype;
  pace?: PlanningPace;
  schedulingConstraint?: SchedulingConstraint;
  customInstructions?: string;
  dayStartTime?: string;
  dayEndTime?: string;
  includeBacklog?: boolean;
}

export interface OptimizationResult {
  plan: DayPlan;
  isAiGenerated: boolean;
  source: 'gemini' | 'heuristic_fallback';
  message?: string;
}

/**
 * Assumes the Day Pacing style based on Mind & Sensory State and Energy battery level.
 * - 'overwhelmed', 'brain_fog', or 'low_energy' -> 'gentle' (low friction, generous restorative buffers, shorter task chunks)
 * - 'hyperfocus' -> 'intensive' (deep flow sprints, compact breaks)
 * - 'balanced' -> matches current energy level
 */
export function derivePaceFromSensoryState(sensoryState?: SensoryState, currentEnergy?: EnergyLevel): PlanningPace {
  if (sensoryState === 'overwhelmed' || sensoryState === 'brain_fog' || sensoryState === 'low_energy') {
    return 'gentle';
  }
  if (sensoryState === 'hyperfocus') {
    return 'intensive';
  }
  if (currentEnergy === 'low') {
    return 'gentle';
  }
  if (currentEnergy === 'high') {
    return 'intensive';
  }
  return 'balanced';
}

// Generate schedule via Gemini API endpoint with graceful local heuristic fallback
export async function optimizeDailySchedule(params: GenerateScheduleParams): Promise<OptimizationResult> {
  const {
    targetDate,
    entries,
    habits,
    focusSessions,
    prefs,
    chronotype = prefs.chronotype || 'balanced',
    pace = derivePaceFromSensoryState(prefs.sensoryState, prefs.currentEnergy),
    schedulingConstraint = 'all_priority',
    customInstructions,
    dayStartTime = '09:00',
    dayEndTime = '18:00',
    includeBacklog = true,
  } = params;

  // Filter relevant journal entries for target date (plus uncompleted priority backlog if enabled)
  const targetDayEntries = entries.filter((e) => e.date === targetDate && e.status !== 'cancelled');
  const backlogEntries = includeBacklog
    ? entries.filter(
        (e) =>
          e.date < targetDate &&
          e.status === 'open' &&
          (e.isPriority || e.energyCost === 'high' || e.type === 'task')
      ).slice(0, 5)
    : [];

  const combinedCandidateEntries = [...targetDayEntries, ...backlogEntries];

  // If no journal entries exist, we can still generate an intentional template or use habits
  const activeHabits = habits.filter((h) => !h.isArchived);

  // Compute focus stats
  const recentSessions = focusSessions.slice(0, 10);
  const totalFocusMinutes = Math.round(recentSessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60);

  const payload = {
    apiKey: prefs.geminiApiKey?.trim() || undefined,
    targetDate,
    dayOfWeek: formatDateDisplay(targetDate, { showDayOfWeek: true, includeYear: false }),
    currentEnergy: prefs.currentEnergy || 'medium',
    sensoryState: prefs.sensoryState || 'balanced',
    chronotype,
    pace,
    schedulingConstraint,
    customInstructions: customInstructions?.trim() || undefined,
    dayStartTime,
    dayEndTime,
    bujoEntries: combinedCandidateEntries,
    habits: activeHabits,
    focusStats: {
      totalMinutesLogged: totalFocusMinutes,
      sessionCount: recentSessions.length,
    },
  };

  try {
    const res = await fetch('/api/gemini/optimize-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok && data.success && data.data) {
      const plan: DayPlan = {
        date: targetDate,
        summary: data.data.summary || 'Optimized energy-aware daily schedule created.',
        predictedEnergyRhythm: data.data.predictedEnergyRhythm || {
          morning: 'medium',
          afternoon: 'high',
          evening: 'low',
          rhythmNote: 'Standard executive distribution curve.',
        },
        scheduleBlocks: (data.data.scheduleBlocks || []).map((b: any, idx: number) => ({
          id: b.id || `block-${idx + 1}`,
          startTime: b.startTime || '09:00',
          endTime: b.endTime || '09:30',
          title: b.title || 'Scheduled Block',
          type: b.type || 'task',
          energyDemand: (b.energyDemand as EnergyLevel) || 'medium',
          durationMinutes: Number(b.durationMinutes) || 25,
          bujoEntryId: b.bujoEntryId || undefined,
          executiveRationale: b.executiveRationale || 'Strategically scheduled for your cognitive flow.',
          microStarterSteps: Array.isArray(b.microStarterSteps) && b.microStarterSteps.length > 0 ? b.microStarterSteps : undefined,
          isBreak: Boolean(b.isBreak || b.type === 'break' || b.type === 'micro_reset'),
          completed: false,
        })),
        pacingAdvice: Array.isArray(data.data.pacingAdvice)
          ? data.data.pacingAdvice
          : ['Pace yourself and take sensory resets between deep focus blocks.'],
        totalFocusMinutes: Number(data.data.totalFocusMinutes) || 120,
        totalBreakMinutes: Number(data.data.totalBreakMinutes) || 45,
        createdAt: Date.now(),
      };

      return {
        plan,
        isAiGenerated: true,
        source: 'gemini',
      };
    } else {
      // If server returned an error (e.g. quota or offline), fallback to heuristic engine
      console.warn('AI endpoint issue, falling back to local heuristic scheduler:', data.message);
      const fallbackPlan = generateLocalHeuristicSchedule(params, combinedCandidateEntries);
      return {
        plan: fallbackPlan,
        isAiGenerated: false,
        source: 'heuristic_fallback',
        message: data.message || 'Generated using local smart heuristic scheduler.',
      };
    }
  } catch (err: any) {
    console.warn('Network issue reaching Gemini API, using local smart scheduler:', err);
    const fallbackPlan = generateLocalHeuristicSchedule(params, combinedCandidateEntries);
    return {
      plan: fallbackPlan,
      isAiGenerated: false,
      source: 'heuristic_fallback',
      message: 'Generated using local energy-aware scheduler (offline mode).',
    };
  }
}

// Fallback neurodivergent-friendly schedule synthesizer
export function generateLocalHeuristicSchedule(
  params: GenerateScheduleParams,
  candidateEntries: BujoEntry[]
): DayPlan {
  const { targetDate, prefs, habits = [], chronotype = prefs.chronotype || 'balanced', dayStartTime = '09:00' } = params;
  const currentEnergy = prefs.currentEnergy || 'medium';

  // Predict rhythm
  let morningEnergy: EnergyLevel = 'medium';
  let afternoonEnergy: EnergyLevel = 'high';
  let eveningEnergy: EnergyLevel = 'low';
  let rhythmNote = 'Gentle morning warm-up followed by peak focus window before midday lull.';

  if (chronotype === 'morning') {
    morningEnergy = 'high';
    afternoonEnergy = 'medium';
    eveningEnergy = 'low';
    rhythmNote = 'Frontloaded high cognitive capacity in the morning; gentle wrap-up in the afternoon.';
  } else if (chronotype === 'evening') {
    morningEnergy = 'low';
    afternoonEnergy = 'medium';
    eveningEnergy = 'high';
    rhythmNote = 'Gentle slow morning with late afternoon and evening hyperfocus bursts.';
  } else if (currentEnergy === 'low') {
    morningEnergy = 'low';
    afternoonEnergy = 'low';
    eveningEnergy = 'low';
    rhythmNote = 'Low-spoon day detected: gentle pacing with low-friction tasks and generous restorative buffers.';
  }

  // Parse start hour & minute
  const [startH, startM] = dayStartTime.split(':').map((n) => parseInt(n, 10) || 0);
  let currentMinutes = startH * 60 + startM;

  const formatClock = (totalMins: number): string => {
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const blocks: ScheduleBlock[] = [];
  let focusMins = 0;
  let breakMins = 0;

  // Active unarchived habits
  const activeHabits = habits.filter((h) => !h.isArchived);
  const morningHabits = activeHabits.filter((h) => h.timeBucket === 'morning');
  const middayHabits = activeHabits.filter((h) => h.timeBucket === 'midday');
  const eveningHabits = activeHabits.filter((h) => h.timeBucket === 'evening');

  // 1. Morning anchor / gentle kickoff & morning habits
  if (morningHabits.length > 0) {
    morningHabits.forEach((mh) => {
      const duration = mh.durationMinutes || (mh.energyCost === 'high' ? 20 : mh.energyCost === 'medium' ? 10 : 5);
      const startTime = mh.time || formatClock(currentMinutes);
      if (mh.time) {
        const [h, m] = mh.time.split(':').map((n) => parseInt(n, 10) || 0);
        currentMinutes = h * 60 + m + duration;
      } else {
        currentMinutes += duration;
      }
      blocks.push({
        id: `block-habit-${mh.id}`,
        startTime,
        endTime: formatClock(currentMinutes),
        title: `🌱 ${mh.title}`,
        type: 'habit',
        energyDemand: mh.energyCost,
        durationMinutes: duration,
        executiveRationale: mh.unstickTip || 'Daily micro-habit anchor to start the day with low friction.',
        microStarterSteps: [
          mh.unstickTip ? `10s fallback: ${mh.unstickTip}` : `Start with just 1 tiny step for ${mh.title}`,
          'Take a slow breath and celebrate the small win'
        ],
        isBreak: mh.energyCost === 'low',
        completed: mh.completedDates.includes(targetDate),
      });
      if (mh.energyCost === 'low') breakMins += duration;
      else focusMins += duration;
    });
  } else {
    const kickoffStart = formatClock(currentMinutes);
    currentMinutes += 15;
    blocks.push({
      id: `block-kickoff`,
      startTime: kickoffStart,
      endTime: formatClock(currentMinutes),
      title: 'Morning Somatic Check-in & Water',
      type: 'micro_reset',
      energyDemand: 'low',
      durationMinutes: 15,
      executiveRationale: 'Gentle somatic transition to reduce cortisol and orient your mind for the day.',
      microStarterSteps: ['Pour a glass of water', 'Take 3 deep shoulder drops', 'Review today’s simple intention'],
      isBreak: true,
      completed: false,
    });
    breakMins += 15;
  }

  // 2. Schedule candidate entries
  const sortedEntries = [...candidateEntries].sort((a, b) => {
    // Priority first
    if (a.isPriority && !b.isPriority) return -1;
    if (!a.isPriority && b.isPriority) return 1;
    // Match energy
    const weight = { high: 3, medium: 2, low: 1 };
    return (weight[b.energyCost] || 2) - (weight[a.energyCost] || 2);
  });

  if (sortedEntries.length === 0) {
    // Provide a sample balanced structure
    const task1Start = formatClock(currentMinutes);
    currentMinutes += 30;
    blocks.push({
      id: `block-sample-1`,
      startTime: task1Start,
      endTime: formatClock(currentMinutes),
      title: 'Top Priority Focus Sprint',
      type: 'task',
      energyDemand: currentEnergy === 'low' ? 'low' : 'medium',
      durationMinutes: 30,
      executiveRationale: 'Tackle your primary objective in a contained 30-minute burst before cognitive fatigue.',
      microStarterSteps: ['Write the single main outcome on scratch paper', 'Set 25 min timer', 'Start 1 sentence'],
      isBreak: false,
      completed: false,
    });
    focusMins += 30;

    // Restorative break
    const break1Start = formatClock(currentMinutes);
    currentMinutes += 15;
    blocks.push({
      id: `block-break-1`,
      startTime: break1Start,
      endTime: formatClock(currentMinutes),
      title: 'Sensory Recharge & Dopamine Reset',
      type: 'break',
      energyDemand: 'low',
      durationMinutes: 15,
      executiveRationale: 'Prevent hyperfocus burnout and refresh executive neurotransmitters.',
      microStarterSteps: ['Step away from screens', 'Gentle stretch or look outdoors', 'Hydrate'],
      isBreak: true,
      completed: false,
    });
    breakMins += 15;

    // Second task
    const task2Start = formatClock(currentMinutes);
    currentMinutes += 25;
    blocks.push({
      id: `block-sample-2`,
      startTime: task2Start,
      endTime: formatClock(currentMinutes),
      title: 'Admin & Low-Friction Tasks',
      type: 'task',
      energyDemand: 'low',
      durationMinutes: 25,
      executiveRationale: 'Quick low-barrier wins to build dopamine momentum without heavy cognitive load.',
      microStarterSteps: ['Gather links/documents', 'Complete 1 small item', 'Clear workspace'],
      isBreak: false,
      completed: false,
    });
    focusMins += 25;
  } else {
    // Iterate over entries
    sortedEntries.forEach((entry, idx) => {
      // Buffer before task if not first
      if (idx > 0 && idx % 2 === 0) {
        const breakStart = formatClock(currentMinutes);
        currentMinutes += 15;
        blocks.push({
          id: `block-break-${idx}`,
          startTime: breakStart,
          endTime: formatClock(currentMinutes),
          title: 'Sensory Reset & Hydration Break',
          type: 'break',
          energyDemand: 'low',
          durationMinutes: 15,
          executiveRationale: 'Essential cognitive buffer to prevent dopamine depletion.',
          microStarterSteps: ['Stand up and roll wrists', 'Sip water', 'Take 3 steady breaths'],
          isBreak: true,
          completed: false,
        });
        breakMins += 15;
      }

      const duration = entry.durationMinutes || (entry.energyCost === 'high' ? 45 : entry.energyCost === 'medium' ? 25 : 15);
      const taskStart = entry.time || formatClock(currentMinutes);
      
      // Calculate minutes
      if (!entry.time) {
        currentMinutes += duration;
      } else {
        const [h, m] = entry.time.split(':').map((n) => parseInt(n, 10) || 0);
        currentMinutes = h * 60 + m + duration;
      }

      blocks.push({
        id: `block-entry-${entry.id}`,
        startTime: taskStart,
        endTime: formatClock(currentMinutes),
        title: entry.content,
        type: entry.type === 'event' ? 'event' : 'task',
        energyDemand: entry.energyCost,
        durationMinutes: duration,
        bujoEntryId: entry.id,
        executiveRationale: entry.isPriority
          ? 'High-impact anchor scheduled to maximize your peak executive focus window.'
          : 'Low-friction task positioned to prevent decision fatigue.',
        microStarterSteps: [
          `Open necessary window or notebook for "${entry.content.slice(0, 24)}"`,
          'Write or outline the first tiny sub-action',
          'Work for just 2 uninterrupted minutes'
        ],
        isBreak: false,
        completed: entry.status === 'completed',
      });
      focusMins += duration;
    });
  }

  // Evening habits & wrap-up
  if (eveningHabits.length > 0) {
    eveningHabits.forEach((eh) => {
      const duration = eh.durationMinutes || (eh.energyCost === 'high' ? 20 : eh.energyCost === 'medium' ? 10 : 5);
      const startTime = eh.time || formatClock(currentMinutes);
      if (eh.time) {
        const [h, m] = eh.time.split(':').map((n) => parseInt(n, 10) || 0);
        currentMinutes = h * 60 + m + duration;
      } else {
        currentMinutes += duration;
      }
      blocks.push({
        id: `block-habit-${eh.id}`,
        startTime,
        endTime: formatClock(currentMinutes),
        title: `🌙 ${eh.title}`,
        type: 'habit',
        energyDemand: eh.energyCost,
        durationMinutes: duration,
        executiveRationale: eh.unstickTip || 'Evening wind-down routine.',
        microStarterSteps: [
          eh.unstickTip ? `10s fallback: ${eh.unstickTip}` : `Start with just 1 tiny step for ${eh.title}`,
          'Acknowledge taking care of yourself'
        ],
        isBreak: eh.energyCost === 'low',
        completed: eh.completedDates.includes(targetDate),
      });
      if (eh.energyCost === 'low') breakMins += duration;
      else focusMins += duration;
    });
  }

  // Evening wrap-up
  const wrapStart = formatClock(currentMinutes);
  currentMinutes += 15;
  blocks.push({
    id: `block-wrapup`,
    startTime: wrapStart,
    endTime: formatClock(currentMinutes),
    title: 'Daily Reflection & Brain Dump',
    type: 'micro_reset',
    energyDemand: 'low',
    durationMinutes: 15,
    executiveRationale: 'Unload working memory before evening so your mind feels clear and grounded.',
    microStarterSteps: ['Check off completed journal tasks', 'Jot any lingering thoughts into Brain Dump', 'Celebrate 1 win'],
    isBreak: true,
    completed: false,
  });
  breakMins += 15;

  return {
    date: targetDate,
    summary: `Personalized ${chronotype} rhythm plan with ${focusMins}m structured focus and ${breakMins}m restorative buffers.`,
    predictedEnergyRhythm: {
      morning: morningEnergy,
      afternoon: afternoonEnergy,
      evening: eveningEnergy,
      rhythmNote,
    },
    scheduleBlocks: blocks,
    pacingAdvice: [
      'Take the scheduled somatic breaks seriously — they recharge dopamine for the next task.',
      'If initiation friction feels heavy, do only the first 2-minute starter step.',
      'Adjust or swap time slots freely without guilt if your energy shifts.'
    ],
    totalFocusMinutes: focusMins,
    totalBreakMinutes: breakMins,
    createdAt: Date.now(),
  };
}

// Helper to sync scheduled times from DayPlan back to BujoEntries
export function syncPlanToBujoEntries(plan: DayPlan, currentEntries: BujoEntry[]): BujoEntry[] {
  const blockMap = new Map<string, ScheduleBlock>();
  plan.scheduleBlocks.forEach((b) => {
    if (b.bujoEntryId) {
      blockMap.set(b.bujoEntryId, b);
    }
  });

  return currentEntries.map((entry) => {
    const matchedBlock = blockMap.get(entry.id);
    if (matchedBlock) {
      return {
        ...entry,
        time: matchedBlock.startTime,
        durationMinutes: matchedBlock.durationMinutes,
      };
    }
    return entry;
  });
}

// Generate 2-minute starter steps for a single schedule block on demand
export async function generateStarterStepsForBlock(
  taskTitle: string,
  energyDemand: EnergyLevel = 'medium',
  prefs: UserPreferences
): Promise<string[]> {
  const isFa = prefs.language === 'fa';
  try {
    const res = await fetch('/api/gemini/generate-starter-steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: prefs.geminiApiKey?.trim() || undefined,
        taskTitle,
        energyDemand,
        sensoryState: prefs.sensoryState || 'balanced',
        language: prefs.language || 'en',
      }),
    });

    const data = await res.json();
    if (res.ok && data.success && Array.isArray(data.steps) && data.steps.length > 0) {
      return data.steps;
    }
  } catch (err) {
    console.warn('Network/API issue generating starter steps, using heuristic steps:', err);
  }

  // Graceful ADHD initiation heuristic fallback
  if (isFa) {
    return [
      `باز کردن پنجره یا فضای کاری برای «${taskTitle.slice(0, 24)}»`,
      'نوشتن فقط ۱ جمله یا پیش‌نویس اولیه بسیار ساده',
      'کار کردن به مدت ۲ دقیقه آرام بدون قضاوت در مورد کیفیت'
    ];
  }

  return [
    `Open window or workspace for "${taskTitle.slice(0, 24)}"`,
    'Write down just 1 messy first bullet or sentence',
    'Work for 2 low-pressure minutes without judging quality'
  ];
}

