import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Sprout, 
  Plus, 
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
  Info,
  ShieldCheck
} from 'lucide-react';
import { Habit, TimeBucket, EnergyLevel, ENERGY_LEVELS } from '../../types';
import { getTodayDateString } from '../../utils/storage';
import { soundEngine } from '../../utils/audioSynth';
import { useI18n, toPersianDigits, getEnergyLabel } from '../../utils/i18n';
import { AddHabitModal } from './AddHabitModal';
import { EditHabitModal } from './EditHabitModal';

interface HabitTrackerProps {
  habits: Habit[];
  onUpdateHabits: (habits: Habit[]) => void;
  currentEnergy: EnergyLevel;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({
  habits,
  onUpdateHabits,
  currentEnergy
}) => {
  const { t, language } = useI18n();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedHabitForUnstick, setSelectedHabitForUnstick] = useState<Habit | null>(null);
  const [selectedHabitForWhyHelps, setSelectedHabitForWhyHelps] = useState<Habit | null>(null);
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

  const toggleExpandHabit = (id: string) => {
    soundEngine.playPop();
    setExpandedHabitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (selectedHabitForWhyHelps?.id === id) setSelectedHabitForWhyHelps(null);
        if (selectedHabitForUnstick?.id === id) setSelectedHabitForUnstick(null);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const today = getTodayDateString();

  // Toggle Completion
  const handleToggleHabit = (habitId: string) => {
    const updated = habits.map((h) => {
      if (h.id !== habitId) return h;
      const isCompletedToday = h.completedDates.includes(today);
      let newCompleted = isCompletedToday
        ? h.completedDates.filter((d) => d !== today)
        : [...h.completedDates, today];

      const newTotal = isCompletedToday ? Math.max(0, h.totalCompletions - 1) : h.totalCompletions + 1;
      const newStreak = isCompletedToday ? Math.max(0, h.streakCount - 1) : h.streakCount + 1;

      if (!isCompletedToday) {
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

  // Filter habits
  const filteredHabits = habits.filter((h) => {
    if (filterEnergy !== null && h.energyCost !== filterEnergy) return false;
    return true;
  });

  const totalCompletionsToday = habits.filter((h) => h.completedDates.includes(today)).length;
  const habitCompletionRate = habits.length > 0 ? Math.round((totalCompletionsToday / habits.length) * 100) : 0;
  const currentEnergyMeta = ENERGY_LEVELS.find((l) => l.id === currentEnergy) || ENERGY_LEVELS[1];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-20 space-y-6">
      
      {/* Expandable Habit Progress & Filters Top Panel */}
      <div className="bg-[#F8FAF5] dark:bg-[#182316] p-4 sm:p-5 rounded-[28px] border border-[#DCEAD4] dark:border-[#263722] shadow-xs space-y-3">
        {/* Header Bar with Summary & Expand Toggle */}
        <div className="flex items-center justify-between gap-3">
          <button
            id="btn-toggle-habit-filters"
            onClick={() => {
              soundEngine.playPop();
              setIsFilterExpanded((prev) => !prev);
            }}
            className="flex items-center gap-2.5 group text-left cursor-pointer flex-1"
            aria-expanded={isFilterExpanded}
          >
            <div className="w-8 h-8 rounded-xl bg-[#EDF6E8] dark:bg-[#1E2E1B] text-[#3B7E10] dark:text-[#80D141] flex items-center justify-center border border-[#DCEAD4] dark:border-[#263722] group-hover:scale-105 transition-transform shrink-0">
              <Filter className="w-4 h-4" />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#151E14] dark:text-[#E8F2E4] font-medium">
                <span className="font-bold">
                  {language === 'fa' ? toPersianDigits(totalCompletionsToday) : totalCompletionsToday}/
                  {language === 'fa' ? toPersianDigits(habits.length) : habits.length}
                </span>{' '}
                {t('habits.nurturedToday')} ({language === 'fa' ? toPersianDigits(habitCompletionRate) : habitCompletionRate}%)
                <div className="w-20 sm:w-32 h-2 rounded-full bg-[#EDF6E8] dark:bg-[#1C281A] overflow-hidden border border-[#DCEAD4] dark:border-[#263722]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${habitCompletionRate}%` }}
                    className="h-full bg-[#80D141] rounded-full"
                  />
                </div>
              </div>
            </div>
          </button>

          {/* Expand Toggle Button */}
          <button
            onClick={() => {
              soundEngine.playPop();
              setIsFilterExpanded((prev) => !prev);
            }}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#EDF6E8] dark:bg-[#1E2E1B] hover:bg-[#DEEED6] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#263722] text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
            title={isFilterExpanded ? t('habits.hideFilters') : t('habits.filters')}
            aria-label={isFilterExpanded ? t('habits.hideFilters') : t('habits.filters')}
          >
            <span className="hidden sm:inline text-[11px] font-bold">{isFilterExpanded ? t('habits.hideFilters') : t('habits.filters')}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFilterExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expandable Energy Filter Controls */}
        <AnimatePresence>
          {isFilterExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-[#DCEAD4] dark:border-[#263722] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      soundEngine.playPop();
                      setFilterEnergy(null);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
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
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
                const isCompletedToday = habit.completedDates.includes(today);
                const habitEnergyMeta = ENERGY_LEVELS.find((l) => l.id === habit.energyCost) || ENERGY_LEVELS[0];

                return (
                  <motion.div
                    key={habit.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => toggleExpandHabit(habit.id)}
                    className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                      isCompletedToday
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
                            isCompletedToday
                              ? 'bg-[#80D141] text-[#0F2600] shadow-md font-bold'
                              : 'bg-[#EDF6E8] dark:bg-[#202E1E] text-[#3B7E10] dark:text-[#A2EB68] hover:bg-[#DDF4CD] border border-[#DCEAD4] dark:border-[#263722]'
                          }`}
                          title={isCompletedToday ? t('habits.markNotCompleted') : t('habits.markCompleted')}
                        >
                          {isCompletedToday ? (
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
                              isCompletedToday
                                ? 'bg-[#CCEBB6] dark:bg-[#254A20] text-[#14300B] dark:text-[#CFF3B8]'
                                : 'bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#A2EB68]'
                            }`}>
                              <span>{habitEnergyMeta.icon}</span>
                              <span>{getEnergyLabel(habit.energyCost, language)}</span>
                            </span>

                            {/* Scheduled Time & Duration Badge */}
                            {(habit.time || habit.durationMinutes) && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 ${
                                isCompletedToday
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
                              isCompletedToday
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

                            {/* Actions Bar: Why This Helps, 10-Second Fallback & Management */}
                            <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
                              {/* Left: Quick Guidance Buttons */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {habit.description && (
                                  <button
                                    onClick={() => {
                                      soundEngine.playPop();
                                      setSelectedHabitForWhyHelps(selectedHabitForWhyHelps?.id === habit.id ? null : habit);
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                                      selectedHabitForWhyHelps?.id === habit.id
                                        ? 'bg-[#80D141] text-[#0F2600]'
                                        : 'bg-[#EDF6E8] dark:bg-[#202E1E] hover:bg-[#DDF4CD] text-[#3B7E10] dark:text-[#A2EB68]'
                                    }`}
                                    title={t('habits.whyHelps')}
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                    <span>{t('habits.whyHelps')}</span>
                                  </button>
                                )}

                                {habit.unstickTip && (
                                  <button
                                    onClick={() => {
                                      soundEngine.playPop();
                                      setSelectedHabitForUnstick(selectedHabitForUnstick?.id === habit.id ? null : habit);
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                                      selectedHabitForUnstick?.id === habit.id
                                        ? 'bg-[#80D141] text-[#0F2600]'
                                        : 'bg-[#EDF6E8] dark:bg-[#202E1E] hover:bg-[#DDF4CD] text-[#3B7E10] dark:text-[#A2EB68]'
                                    }`}
                                    title={t('habits.secFallback')}
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>{t('habits.secFallback')}</span>
                                  </button>
                                )}
                              </div>

                              {/* Right: Edit & Delete */}
                              <div className="flex items-center gap-1 ml-auto">
                                <button
                                  onClick={() => {
                                    soundEngine.playPop();
                                    setEditingHabit(habit);
                                  }}
                                  className="p-1.5 rounded-full hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] transition-all"
                                  title={t('habits.editHabit')}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleDeleteHabit(habit.id)}
                                  className="p-1.5 rounded-full hover:bg-[#FFE9E9] dark:hover:bg-[#422125] text-[#B3261E] transition-all"
                                  title={t('habits.removeHabit')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Why This Helps Drawer Inside Expanded Section */}
                            {selectedHabitForWhyHelps?.id === habit.id && habit.description && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 p-3.5 rounded-2xl bg-[#EDF6E8] dark:bg-[#1E2B1A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#122A00] dark:text-[#E2FBD0]"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold flex items-center gap-1 text-[11px] text-[#1C3700] dark:text-[#A2EB68]">
                                    <Info className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
                                    {t('habits.whyHelpsTitle')}
                                  </span>
                                  <button
                                    onClick={() => setSelectedHabitForWhyHelps(null)}
                                    className="text-[10px] font-bold text-[#3B7E10] dark:text-[#A2EB68] hover:underline"
                                  >
                                    {t('common.close')}
                                  </button>
                                </div>
                                <p className="leading-relaxed text-[#3B4E37] dark:text-[#B6CCB0] font-medium">
                                  {habit.description}
                                </p>
                              </motion.div>
                            )}

                            {/* Unstick / Fallback Drawer Inside Expanded Section */}
                            {selectedHabitForUnstick?.id === habit.id && habit.unstickTip && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 p-3.5 rounded-2xl bg-[#EDF6E8] dark:bg-[#1E2B1A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#122A00] dark:text-[#E2FBD0]"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold flex items-center gap-1 text-[11px] text-[#1C3700] dark:text-[#A2EB68]">
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
                                    {t('habits.fallbackTitle')}
                                  </span>
                                  <button
                                    onClick={() => setSelectedHabitForUnstick(null)}
                                    className="text-[10px] font-bold text-[#3B7E10] dark:text-[#A2EB68] hover:underline"
                                  >
                                    {t('common.close')}
                                  </button>
                                </div>
                                <p className="leading-relaxed text-[#3B4E37] dark:text-[#B6CCB0] font-medium">
                                  {habit.unstickTip}
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

    </div>
  );
};

