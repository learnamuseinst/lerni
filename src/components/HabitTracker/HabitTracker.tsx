import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Sprout, 
  Check, 
  Flame, 
  Trash2, 
  Pencil,
  Sun, 
  Moon, 
  Clock, 
  Award,
  ChevronDown,
  Filter,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Sparkles,
  Loader2,
  Bell
} from 'lucide-react';
import { Habit, TimeBucket, EnergyLevel, ENERGY_LEVELS, isHabitActiveOnDate, UserPreferences, EntryReminder } from '../../types';
import { 
  getTodayKey, 
  shiftDate, 
  formatDateDisplay, 
  getRelativeDayLabel 
} from '../../utils/dateUtils';
import { soundEngine } from '../../utils/audioSynth';
import { useI18n, toPersianDigits, getEnergyLabel } from '../../utils/i18n';
import { storage } from '../../utils/storage';
import { generateTenSecondHabitFallback } from '../../utils/aiScheduler';
import { AddHabitModal } from './AddHabitModal';
import { EditHabitModal } from './EditHabitModal';
import { MaterialExpressiveDatePicker } from '../common/MaterialExpressiveDatePicker';
import { QuickReminderModal } from '../common/QuickReminderModal';

interface HabitTrackerProps {
  habits: Habit[];
  onUpdateHabits: (habits: Habit[]) => void;
  currentEnergy: EnergyLevel;
  prefs?: UserPreferences;
  onOpenSettings?: () => void;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({
  habits,
  onUpdateHabits,
  currentEnergy,
  prefs,
  onOpenSettings,
}) => {
  const { t, language } = useI18n();
  const isFa = language === 'fa';
  const todayStr = getTodayKey();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [showAllHabits, setShowAllHabits] = useState<boolean>(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [reminderTargetHabit, setReminderTargetHabit] = useState<Habit | null>(null);
  const [selectedHabitForUnstick, setSelectedHabitForUnstick] = useState<Habit | null>(null);
  const [generatingFallbackHabitId, setGeneratingFallbackHabitId] = useState<string | null>(null);
  const [filterEnergy, setFilterEnergy] = useState<EnergyLevel | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [expandedHabitIds, setExpandedHabitIds] = useState<Set<string>>(new Set());

  // Listen for unified FAB click from App
  useEffect(() => {
    const handleFabClick = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.section === 'habits') {
        setIsAddModalOpen(true);
      }
    };
    window.addEventListener('app:fab-clicked', handleFabClick);
    return () => window.removeEventListener('app:fab-clicked', handleFabClick);
  }, []);

  const bucketInfo: Record<TimeBucket, { title: string; icon: React.ReactNode; color: string; desc: string }> = {
    morning: {
      title: t('habits.bucketMorning'),
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      color: 'from-amber-500/10 to-orange-500/10 border-amber-200/50 dark:border-amber-900/30',
      desc: t('habits.bucketMorningDesc')
    },
    midday: {
      title: t('habits.bucketMidday'),
      icon: <Clock className="w-4 h-4 text-emerald-500" />,
      color: 'from-emerald-500/10 to-teal-500/10 border-emerald-200/50 dark:border-emerald-900/30',
      desc: t('habits.bucketMiddayDesc')
    },
    evening: {
      title: t('habits.bucketEvening'),
      icon: <Moon className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
      color: 'from-teal-500/10 to-emerald-500/10 border-teal-200/50 dark:border-teal-900/30',
      desc: t('habits.bucketEveningDesc')
    },
    anytime: {
      title: t('habits.bucketAnytime'),
      icon: <Sprout className="w-4 h-4 text-[#80D141]" />,
      color: 'from-lime-500/10 to-emerald-500/10 border-lime-200/50 dark:border-lime-900/30',
      desc: t('habits.bucketAnytimeDesc')
    }
  };

  const formatActiveDaysLabel = (activeDays?: number[]) => {
    if (!activeDays || activeDays.length === 0 || activeDays.length === 7) {
      return null;
    }
    const isWeekdays = isFa
      ? activeDays.length === 5 && [6, 0, 1, 2, 3].every((d) => activeDays.includes(d))
      : activeDays.length === 5 && [1, 2, 3, 4, 5].every((d) => activeDays.includes(d));
    if (isWeekdays) return t('habits.weekdays', 'Weekdays');

    const isWeekends = isFa
      ? activeDays.length === 2 && [4, 5].every((d) => activeDays.includes(d))
      : activeDays.length === 2 && [0, 6].every((d) => activeDays.includes(d));
    if (isWeekends) return t('habits.weekends', 'Weekends');

    const dayOrder = isFa ? [6, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];
    const dayMap: Record<number, string> = isFa
      ? { 6: 'ش', 0: 'ی', 1: 'د', 2: 'س', 3: 'چ', 4: 'پ', 5: 'ج' }
      : { 0: 'Su', 1: 'Mo', 2: 'Tu', 3: 'We', 4: 'Th', 5: 'Fr', 6: 'Sa' };

    return dayOrder
      .filter((d) => activeDays.includes(d))
      .map((d) => dayMap[d])
      .join(isFa ? '، ' : ', ');
  };

  const toggleExpandHabit = (id: string) => {
    soundEngine.playPop();
    setExpandedHabitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (selectedHabitForUnstick?.id === id) setSelectedHabitForUnstick(null);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Date navigation helpers
  const handlePrevDay = () => {
    soundEngine.playPop();
    setSelectedDate((prev) => shiftDate(prev, -1));
  };

  const handleNextDay = () => {
    soundEngine.playPop();
    setSelectedDate((prev) => shiftDate(prev, 1));
  };

  const handleJumpToToday = () => {
    soundEngine.playPop();
    setSelectedDate(todayStr);
  };

  // Toggle Completion for selectedDate
  const handleToggleHabit = (habitId: string) => {
    const updated = habits.map((h) => {
      if (h.id !== habitId) return h;
      const isCompletedOnDate = h.completedDates.includes(selectedDate);
      const newCompleted = isCompletedOnDate
        ? h.completedDates.filter((d) => d !== selectedDate)
        : [...h.completedDates, selectedDate];

      const newTotal = isCompletedOnDate ? Math.max(0, h.totalCompletions - 1) : h.totalCompletions + 1;
      const newStreak = isCompletedOnDate ? Math.max(0, h.streakCount - 1) : h.streakCount + 1;

      if (!isCompletedOnDate) {
        soundEngine.playGentleChime();
        try {
          confetti({
            particleCount: 30,
            spread: 50,
            origin: { y: 0.8 },
            colors: ['#7e57c2', '#9c27b0', '#ffb74d', '#4caf50']
          });
        } catch (e) {}
      } else {
        soundEngine.playPop();
      }

      return {
        ...h,
        completedDates: newCompleted,
        totalCompletions: newTotal,
        streakCount: newStreak,
      };
    });

    onUpdateHabits(updated);
  };

  const handleDeleteHabit = (habitId: string) => {
    if (window.confirm(t('habits.deleteConfirm'))) {
      onUpdateHabits(habits.filter((h) => h.id !== habitId));
      soundEngine.playPop();
    }
  };

  // 10-Second Low Barrier Fallback (Unstick) Handler with AI Generation & Persistence
  const handleTriggerTenSecFallback = async (habit: Habit) => {
    soundEngine.playPop();

    // If already saved on the habit, simply toggle the drawer open or closed!
    // This avoids calling AI repeatedly or regenerating every time section expands
    if (habit.unstickTip && habit.unstickTip.trim()) {
      setSelectedHabitForUnstick(selectedHabitForUnstick?.id === habit.id ? null : habit);
      return;
    }

    // If not generated yet, generate with AI and persist immediately to storage
    const activePrefs = prefs || storage.getPreferences();
    setGeneratingFallbackHabitId(habit.id);

    try {
      const generatedTip = await generateTenSecondHabitFallback(
        habit.title,
        habit.energyCost,
        activePrefs
      );

      const updatedHabits = habits.map((h) =>
        h.id === habit.id ? { ...h, unstickTip: generatedTip } : h
      );
      onUpdateHabits(updatedHabits);
      setSelectedHabitForUnstick({ ...habit, unstickTip: generatedTip });
      soundEngine.playGentleChime();
    } catch (err) {
      console.error('Failed to generate 10-second fallback:', err);
    } finally {
      setGeneratingFallbackHabitId(null);
    }
  };

  const handleRegenerateFallback = async (habit: Habit) => {
    soundEngine.playPop();
    const activePrefs = prefs || storage.getPreferences();
    setGeneratingFallbackHabitId(habit.id);

    try {
      const generatedTip = await generateTenSecondHabitFallback(
        habit.title,
        habit.energyCost,
        activePrefs
      );

      const updatedHabits = habits.map((h) =>
        h.id === habit.id ? { ...h, unstickTip: generatedTip } : h
      );
      onUpdateHabits(updatedHabits);
      setSelectedHabitForUnstick({ ...habit, unstickTip: generatedTip });
      soundEngine.playGentleChime();
    } catch (err) {
      console.error('Failed to regenerate 10-second fallback:', err);
    } finally {
      setGeneratingFallbackHabitId(null);
    }
  };

  // Habits scheduled for the selected date
  const dateScheduledHabits = habits.filter((h) => isHabitActiveOnDate(h, selectedDate));
  const baseHabits = showAllHabits ? habits : dateScheduledHabits;

  // Filter habits by energy
  const filteredHabits = baseHabits.filter((h) => {
    if (filterEnergy !== null && h.energyCost !== filterEnergy) return false;
    return true;
  });

  const totalCompletionsOnDate = baseHabits.filter((h) => h.completedDates.includes(selectedDate)).length;
  const habitCompletionRate = baseHabits.length > 0 ? Math.round((totalCompletionsOnDate / baseHabits.length) * 100) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-20 space-y-6">
      
      {/* Expandable Habit Date Navigation, Progress & Filters Top Panel */}
      <div className="bg-[#F8FAF5] dark:bg-[#182316] p-4 sm:p-5 rounded-[28px] border border-[#DCEAD4] dark:border-[#263722] shadow-xs space-y-3">
        {/* Header Bar with Date Summary, Progress & Quick Date Stepper */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            id="btn-toggle-habit-filters"
            onClick={() => {
              soundEngine.playPop();
              setIsFilterExpanded((prev) => !prev);
            }}
            className="flex items-center gap-2.5 group text-left cursor-pointer"
            aria-expanded={isFilterExpanded}
          >
            <div className="w-8 h-8 rounded-xl bg-[#EDF6E8] dark:bg-[#1E2E1B] text-[#3B7E10] dark:text-[#80D141] flex items-center justify-center border border-[#DCEAD4] dark:border-[#263722] group-hover:scale-105 transition-transform shrink-0">
              <Filter className="w-4 h-4" />
            </div>
            
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-[#151E14] dark:text-[#E8F2E4]">
                  {formatDateDisplay(selectedDate, { showDayOfWeek: true, includeYear: true, lang: language })}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EDF6E8] dark:bg-[#1E2E1B] text-[#3B7E10] dark:text-[#80D141] font-bold">
                  {getRelativeDayLabel(selectedDate, language)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#485B44] dark:text-[#9EB598] font-medium mt-0.5">
                <span>
                  <strong className="text-[#151E14] dark:text-[#E8F2E4]">
                    {language === 'fa' ? toPersianDigits(totalCompletionsOnDate) : totalCompletionsOnDate}/
                    {language === 'fa' ? toPersianDigits(baseHabits.length) : baseHabits.length}
                  </strong>{' '}
                  {selectedDate === todayStr ? t('habits.nurturedToday') : t('habits.nurturedOnDate', 'nurtured')} ({language === 'fa' ? toPersianDigits(habitCompletionRate) : habitCompletionRate}%)
                </span>
                <div className="w-16 sm:w-24 h-1.5 rounded-full bg-[#EDF6E8] dark:bg-[#1C281A] overflow-hidden border border-[#DCEAD4] dark:border-[#263722]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${habitCompletionRate}%` }}
                    className="h-full bg-[#80D141] rounded-full"
                  />
                </div>
              </div>
            </div>
          </button>

          {/* Quick Date Stepper & Expand Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevDay}
                className="p-1.5 rounded-lg bg-[#EDF6E8] dark:bg-[#1C281A] hover:bg-[#DDF4CD] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] border border-[#DCEAD4] dark:border-[#263722] transition-colors cursor-pointer"
                title={t('journal.prevDay')}
              >
                <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
              {selectedDate !== todayStr && (
                <button
                  onClick={handleJumpToToday}
                  className="px-2.5 py-1 rounded-lg bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-[11px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  {t('journal.jumpToday')}
                </button>
              )}
              <button
                onClick={handleNextDay}
                className="p-1.5 rounded-lg bg-[#EDF6E8] dark:bg-[#1C281A] hover:bg-[#DDF4CD] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] border border-[#DCEAD4] dark:border-[#263722] transition-colors cursor-pointer"
                title={t('journal.nextDay')}
              >
                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>

            {/* Expand Toggle Button */}
            <button
              onClick={() => {
                soundEngine.playPop();
                setIsFilterExpanded((prev) => !prev);
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#EDF6E8] dark:bg-[#1E2E1B] hover:bg-[#DEEED6] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#263722] text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
              title={isFilterExpanded ? t('habits.hideFilters') : t('habits.filters')}
              aria-label={isFilterExpanded ? t('habits.hideFilters') : t('habits.filters')}
            >
              <span className="hidden sm:inline text-[11px] font-bold">{isFilterExpanded ? t('habits.hideFilters') : t('habits.filters')}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFilterExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Expandable Date Picker & Energy Filter Controls */}
        <AnimatePresence>
          {isFilterExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-[#DCEAD4] dark:border-[#263722] space-y-3 text-xs">
                {/* Row 1: Date Picker & Scheduled vs All Habits Switch */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap w-full sm:w-auto">
                    <button
                      onClick={handlePrevDay}
                      className="p-2 rounded-xl bg-[#EDF6E8] dark:bg-[#1C281A] hover:bg-[#DDF4CD] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] border border-[#DCEAD4] dark:border-[#263722] transition-colors cursor-pointer"
                      title={t('journal.prevDay')}
                    >
                      <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                    </button>

                    <MaterialExpressiveDatePicker
                      id="input-habits-selected-date"
                      value={selectedDate}
                      onChange={(newDate) => setSelectedDate(newDate)}
                      label={t('journal.targetDate')}
                    />

                    <button
                      onClick={handleNextDay}
                      className="p-2 rounded-xl bg-[#EDF6E8] dark:bg-[#1C281A] hover:bg-[#DDF4CD] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] border border-[#DCEAD4] dark:border-[#263722] transition-colors cursor-pointer"
                      title={t('journal.nextDay')}
                    >
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                    </button>

                    {selectedDate !== todayStr && (
                      <button
                        onClick={handleJumpToToday}
                        className="px-3 py-1.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        {t('journal.jumpToday')}
                      </button>
                    )}
                  </div>

                  {/* Scheduled for Day vs All Habits Toggle */}
                  <div className="flex rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] p-1 gap-1 border border-[#DCEAD4] dark:border-[#263722] shrink-0">
                    <button
                      onClick={() => {
                        soundEngine.playPop();
                        setShowAllHabits(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !showAllHabits
                          ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                          : 'text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14]'
                      }`}
                    >
                      {t('habits.showScheduledOnly', 'Scheduled for Day')}
                    </button>
                    <button
                      onClick={() => {
                        soundEngine.playPop();
                        setShowAllHabits(true);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        showAllHabits
                          ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                          : 'text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14]'
                      }`}
                    >
                      {t('habits.showAllHabits', 'All Habits')}
                    </button>
                  </div>
                </div>

                {/* Row 2: Energy Filter Controls */}
                <div className="pt-2 border-t border-[#DCEAD4]/70 dark:border-[#263722]/70 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        soundEngine.playPop();
                        setFilterEnergy(null);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        filterEnergy === null
                          ? 'bg-[#80D141] text-[#0F2600]'
                          : 'bg-[#EDF6E8] dark:bg-[#1C281A] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722] hover:bg-[#DEEED6]'
                      }`}
                    >
                      {t('habits.allEnergy')}
                    </button>
                    {ENERGY_LEVELS.map((lvl) => (
                      <button
                        key={lvl.id}
                        onClick={() => {
                          soundEngine.playPop();
                          setFilterEnergy(lvl.id === filterEnergy ? null : lvl.id);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          filterEnergy === lvl.id
                            ? 'bg-[#80D141] text-[#0F2600]'
                            : 'bg-[#EDF6E8] dark:bg-[#1C281A] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722] hover:bg-[#DEEED6]'
                        }`}
                      >
                        <span>{lvl.icon}</span>
                        <span className="capitalize">{getEnergyLabel(lvl.id, language)}</span>
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] text-[#485B44] dark:text-[#9EB598] font-medium">
                    {t('habits.showingCount')
                      .replace('{count}', language === 'fa' ? toPersianDigits(filteredHabits.length) : String(filteredHabits.length))
                      .replace('{total}', language === 'fa' ? toPersianDigits(habits.length) : String(habits.length))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Empty state if no habits scheduled for this day of the week */}
      {filteredHabits.length === 0 && (
        <div className="p-8 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F8D8] dark:bg-[#20381B] text-[#3B7E10] dark:text-[#80D141] flex items-center justify-center mx-auto">
            <Sprout className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-[#151E14] dark:text-[#E8F2E4]">
            {habits.length === 0 ? t('habits.empty') : t('habits.noHabitsForDay', 'No habits scheduled for this day of the week.')}
          </p>
          {habits.length > 0 && !showAllHabits && (
            <button
              onClick={() => {
                soundEngine.playPop();
                setShowAllHabits(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#EDF6E8] dark:bg-[#202E1E] hover:bg-[#DDF4CD] text-[#3B7E10] dark:text-[#80D141] text-xs font-bold transition-colors cursor-pointer"
            >
              {t('habits.showAllHabitsBtn', 'Show all habits anyway')}
            </button>
          )}
        </div>
      )}

      {/* Habit Groups by Time of Day */}
      {(['morning', 'midday', 'evening', 'anytime'] as TimeBucket[]).map((bucket) => {
        const bucketHabits = filteredHabits.filter((h) => h.timeBucket === bucket);
        if (bucketHabits.length === 0) return null;

        const info = bucketInfo[bucket];

        return (
          <section key={bucket} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-8 h-8 rounded-xl bg-[#E8F8D8] dark:bg-[#20381B] text-[#1C3700] dark:text-[#A2EB68] flex items-center justify-center">
                {info.icon}
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                {info.title}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bucketHabits.map((habit) => {
                const isCompletedOnDate = habit.completedDates.includes(selectedDate);
                const habitEnergyMeta = ENERGY_LEVELS.find((l) => l.id === habit.energyCost) || ENERGY_LEVELS[0];
                const repeatDaysBadge = formatActiveDaysLabel(habit.activeDays);

                return (
                  <motion.div
                    key={habit.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => toggleExpandHabit(habit.id)}
                    className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                      isCompletedOnDate
                        ? 'bg-[#E1F6D0] dark:bg-[#1B3618] border-[#72C833] dark:border-[#529E25] shadow-xs'
                        : 'bg-white dark:bg-[#182316] border-[#DCEAD4] dark:border-[#263722] hover:border-[#80D141]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      
                      {/* Left: Checkbox & Info */}
                      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                        {/* Expressive Checkbox */}
                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleHabit(habit.id);
                          }}
                          className={`w-9 h-9 shrink-0 mt-0.5 sm:mt-0 rounded-xl flex items-center justify-center transition-all ${
                            isCompletedOnDate
                              ? 'bg-[#80D141] text-[#0F2600] shadow-md font-bold'
                              : 'bg-[#EDF6E8] dark:bg-[#202E1E] text-[#3B7E10] dark:text-[#A2EB68] hover:bg-[#DDF4CD] border border-[#DCEAD4] dark:border-[#263722]'
                          }`}
                          title={isCompletedOnDate ? t('habits.markNotCompleted') : t('habits.markCompleted')}
                        >
                          {isCompletedOnDate ? (
                            <Check className="w-5 h-5 stroke-[2.5]" />
                          ) : (
                            <Check className="w-4 h-4 opacity-0 group-hover:opacity-40 transition-opacity" />
                          )}
                        </motion.button>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium break-words leading-snug text-[#151E14] dark:text-[#E8F2E4] transition-all">
                            {habit.title}
                          </h4>

                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {/* Energy Badge */}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 transition-colors shrink-0 ${
                              isCompletedOnDate
                                ? 'bg-[#CCEBB6] dark:bg-[#254A20] text-[#14300B] dark:text-[#CFF3B8]'
                                : 'bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#A2EB68]'
                            }`}>
                              <span>{habitEnergyMeta.icon}</span>
                              <span>{getEnergyLabel(habit.energyCost, language)}</span>
                            </span>

                            {/* Scheduled Time & Duration Badge */}
                            {(habit.time || habit.durationMinutes) && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 ${
                                isCompletedOnDate
                                  ? 'bg-[#CCEBB6] dark:bg-[#254A20] text-[#14300B] dark:text-[#CFF3B8]'
                                  : 'bg-[#EDF6E8] dark:bg-[#1E291C] text-[#3B7E10] dark:text-[#9DD97A] border border-[#DCEAD4] dark:border-[#263722]'
                              }`}>
                                <Clock className="w-2.5 h-2.5" />
                                <span>
                                  {habit.time ? (language === 'fa' ? toPersianDigits(habit.time) : habit.time) : ''}
                                  {habit.time && habit.durationMinutes ? ' • ' : ''}
                                  {habit.durationMinutes ? `${language === 'fa' ? toPersianDigits(habit.durationMinutes) : habit.durationMinutes} ${t('habits.mins', 'min')}` : ''}
                                </span>
                              </span>
                            )}

                            {/* Specific Days of Week Badge */}
                            {repeatDaysBadge && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 ${
                                isCompletedOnDate
                                  ? 'bg-[#CCEBB6] dark:bg-[#254A20] text-[#14300B] dark:text-[#CFF3B8]'
                                  : 'bg-[#EDF6E8] dark:bg-[#1E291C] text-[#3B7E10] dark:text-[#9DD97A] border border-[#DCEAD4] dark:border-[#263722]'
                              }`}>
                                <CalendarDays className="w-2.5 h-2.5" />
                                <span>{repeatDaysBadge}</span>
                              </span>
                            )}

                            {/* Reminder Badge */}
                            {habit.reminders && habit.reminders.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  soundEngine.playPop();
                                  setReminderTargetHabit(habit);
                                }}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 cursor-pointer hover:scale-105 transition-transform ${
                                  isCompletedOnDate
                                    ? 'bg-[#CCEBB6] dark:bg-[#254A20] text-[#14300B] dark:text-[#CFF3B8]'
                                    : 'bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#A2EB68] border border-[#80D141]/40 shadow-2xs'
                                }`}
                                title={language === 'fa' ? 'مدیریت یادآورها' : 'Manage reminders'}
                              >
                                <Bell className="w-2.5 h-2.5 fill-current" />
                                <span>
                                  {language === 'fa'
                                    ? `${toPersianDigits(habit.reminders.length)} یادآور`
                                    : `${habit.reminders.length} reminder${habit.reminders.length > 1 ? 's' : ''}`}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Expand / Collapse Down Arrow */}
                      <div className="shrink-0 self-start sm:self-center mt-1 sm:mt-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandHabit(habit.id);
                          }}
                          className={`p-1.5 rounded-full transition-all ${
                            expandedHabitIds.has(habit.id)
                              ? 'bg-[#EDF6E8] dark:bg-[#202E1E] text-[#151E14] dark:text-[#E8F2E4]'
                              : 'text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] hover:text-[#151E14] dark:hover:text-[#E8F2E4]'
                          }`}
                          title={expandedHabitIds.has(habit.id) ? t('common.close') : t('habits.filters')}
                          aria-label={expandedHabitIds.has(habit.id) ? t('common.close') : t('habits.filters')}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              expandedHabitIds.has(habit.id) ? 'rotate-180 text-[#3B7E10] dark:text-[#A2EB68]' : ''
                            }`}
                          />
                        </button>
                      </div>

                    </div>

                    {/* Downward Expandable Details & Actions Area */}
                    <AnimatePresence>
                      {expandedHabitIds.has(habit.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={(e) => e.stopPropagation()}
                          className="overflow-hidden cursor-default"
                        >
                          <div className="mt-3 pt-3 border-t border-[#DCEAD4] dark:border-[#263722] space-y-2.5">
                            {/* Streak & Lifetime wins */}
                            <div className={`flex items-center gap-3 text-[11px] font-medium transition-colors ${
                              isCompletedOnDate
                                ? 'text-[#2D5221] dark:text-[#9EC992]'
                                : 'text-[#485B44] dark:text-[#9EB598]'
                            }`}>
                              <span className="flex items-center gap-1 font-bold text-[#276007] dark:text-[#A2EB68]">
                                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                                {t('habits.dayStreak').replace('{count}', language === 'fa' ? toPersianDigits(habit.streakCount) : String(habit.streakCount))}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-semibold">
                                <Award className="w-3.5 h-3.5 text-amber-500" />
                                {t('habits.totalWins').replace('{count}', language === 'fa' ? toPersianDigits(habit.totalCompletions) : String(habit.totalCompletions))}
                              </span>
                            </div>

                            {/* Actions Bar: 10-Second Fallback & Management */}
                            <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
                              {/* Left: 10-Second Fallback Button */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleTriggerTenSecFallback(habit)}
                                  disabled={generatingFallbackHabitId === habit.id}
                                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                                    selectedHabitForUnstick?.id === habit.id
                                      ? 'bg-[#80D141] text-[#0F2600]'
                                      : 'bg-[#EDF6E8] dark:bg-[#202E1E] hover:bg-[#DDF4CD] dark:hover:bg-[#283C25] text-[#3B7E10] dark:text-[#A2EB68]'
                                  }`}
                                  title={habit.unstickTip ? t('habits.secFallback') : t('habits.generateSecFallback', 'Generate 10s Fallback with AI')}
                                >
                                  {generatingFallbackHabitId === habit.id ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>{t('habits.generatingFallback', 'Generating with AI...')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span>{t('habits.secFallback')}</span>
                                      {!habit.unstickTip && (
                                        <Sparkles className="w-3 h-3 text-[#3B7E10] dark:text-[#80D141]" />
                                      )}
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Right: Reminder, Edit & Delete */}
                              <div className="flex items-center gap-1 ml-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playPop();
                                    setReminderTargetHabit(habit);
                                  }}
                                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                                    habit.reminders && habit.reminders.length > 0
                                      ? 'text-[#2C690F] dark:text-[#9DD97A] bg-[#E8F8D8] dark:bg-[#1E3800]'
                                      : 'text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] hover:text-[#151E14] dark:hover:text-[#E8F2E4]'
                                  }`}
                                  title={language === 'fa' ? 'تنظیم یادآور' : 'Set reminder'}
                                >
                                  <Bell className={`w-4 h-4 ${habit.reminders && habit.reminders.length > 0 ? 'fill-current' : ''}`} />
                                </button>

                                <button
                                  onClick={() => {
                                    soundEngine.playPop();
                                    setEditingHabit(habit);
                                  }}
                                  className="p-1.5 rounded-full hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] transition-all cursor-pointer"
                                  title={t('habits.editHabit')}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleDeleteHabit(habit.id)}
                                  className="p-1.5 rounded-full hover:bg-[#FFE9E9] dark:hover:bg-[#422125] text-[#B3261E] transition-all cursor-pointer"
                                  title={t('habits.removeHabit')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Unstick / Fallback Drawer Inside Expanded Section */}
                            {selectedHabitForUnstick?.id === habit.id && (selectedHabitForUnstick.unstickTip || habit.unstickTip) && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 p-3.5 rounded-2xl bg-[#EDF6E8] dark:bg-[#1E2B1A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#122A00] dark:text-[#E2FBD0]"
                              >
                                <div className="flex items-center justify-between mb-1.5 gap-2">
                                  <span className="font-bold flex items-center gap-1 text-[11px] text-[#1C3700] dark:text-[#A2EB68]">
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
                                    {t('habits.fallbackTitle')}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRegenerateFallback(habit)}
                                      disabled={generatingFallbackHabitId === habit.id}
                                      className="text-[10.5px] font-bold text-[#3B7E10] dark:text-[#A2EB68] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                      title="Regenerate fallback with AI"
                                    >
                                      {generatingFallbackHabitId === habit.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Sparkles className="w-3 h-3" />
                                      )}
                                      <span>{t('habits.regenerateFallback', 'Regenerate')}</span>
                                    </button>
                                    <span className="text-[#9EB598] dark:text-[#485B44]">•</span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedHabitForUnstick(null)}
                                      className="text-[10.5px] font-bold text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] cursor-pointer"
                                    >
                                      {t('common.close')}
                                    </button>
                                  </div>
                                </div>
                                <p className="leading-relaxed text-[#3B4E37] dark:text-[#B6CCB0] font-medium">
                                  {habit.unstickTip || selectedHabitForUnstick.unstickTip}
                                </p>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Add Habit Modal */}
      <AddHabitModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddHabit={(newHabit) => {
          onUpdateHabits([...habits, newHabit]);
        }}
      />

      {/* Edit Habit Modal */}
      <EditHabitModal
        habit={editingHabit}
        isOpen={Boolean(editingHabit)}
        onClose={() => setEditingHabit(null)}
        onSave={(updatedHabit) => {
          onUpdateHabits(habits.map((h) => (h.id === updatedHabit.id ? updatedHabit : h)));
        }}
      />

      {/* Quick Reminder Modal for Habits */}
      <QuickReminderModal
        isOpen={Boolean(reminderTargetHabit)}
        onClose={() => setReminderTargetHabit(null)}
        title={reminderTargetHabit?.title || ''}
        itemType="habit"
        targetTime={reminderTargetHabit?.time}
        reminders={reminderTargetHabit?.reminders || []}
        onSave={(updatedReminders) => {
          if (!reminderTargetHabit) return;
          const updated = habits.map((h) =>
            h.id === reminderTargetHabit.id
              ? { ...h, reminders: updatedReminders.length > 0 ? updatedReminders : undefined }
              : h
          );
          onUpdateHabits(updated);
        }}
      />

    </div>
  );
};

