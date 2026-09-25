import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  BookOpenText, 
  Plus, 
  Sparkles, 
  Check, 
  ArrowRight, 
  Star, 
  Calendar as CalendarIcon, 
  FileText, 
  CheckSquare, 
  Zap, 
  Trash2, 
  Pencil,
  Play, 
  Filter, 
  RefreshCw,
  Clock,
  Heart,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  ChevronDown
} from 'lucide-react';
import { BujoEntry, BujoType, BujoStatus, EnergyLevel, ENERGY_LEVELS } from '../../types';
import { soundEngine } from '../../utils/audioSynth';
import { 
  getTodayKey, 
  shiftDate, 
  formatDateDisplay, 
  getRelativeDayLabel 
} from '../../utils/dateUtils';
import { useI18n, getCategoryLabel, getEnergyLabel, toPersianDigits, formatMinutes } from '../../utils/i18n';
import { JournalCalendar } from './JournalCalendar';
import { AddBujoModal } from './AddBujoModal';
import { EditBujoModal } from './EditBujoModal';
import { UnstickModal, getLocalizedTaskTitle } from '../UnstickModal';
import { MaterialExpressiveDatePicker } from '../common/MaterialExpressiveDatePicker';

interface BulletJournalProps {
  entries: BujoEntry[];
  onUpdateEntries: (entries: BujoEntry[]) => void;
  onSendToFocusTimer: (taskTitle: string, minutes: number) => void;
  currentEnergy: EnergyLevel;
  categories?: string[];
  onOpenSettings?: () => void;
}

const TYPE_SYMBOLS: Record<BujoType, { symbol: string; label: string; icon: React.ReactNode }> = {
  task: { symbol: '⬜', label: 'Task (To-Do)', icon: <span className="text-xs">⬜</span> },
  event: { symbol: '⏳', label: 'Event', icon: <span className="text-xs">⏳</span> },
  note: { symbol: '✒️', label: 'Note / Reflection', icon: <span className="text-xs">✒️</span> },
  habit_seed: { symbol: '🌱', label: 'Habit Idea', icon: <span className="text-xs">🌱</span> },
};

export const BulletJournal: React.FC<BulletJournalProps> = ({
  entries,
  onUpdateEntries,
  onSendToFocusTimer,
  currentEnergy,
  categories,
  onOpenSettings,
}) => {
  const { t, language } = useI18n();
  const todayStr = getTodayKey();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [journalView, setJournalView] = useState<'day' | 'calendar' | 'timeline'>('day');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BujoEntry | null>(null);
  const [unstickEntry, setUnstickEntry] = useState<BujoEntry | null>(null);

  // Listen for unified FAB click from App
  useEffect(() => {
    const handleFabClick = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.section === 'journal') {
        setIsAddModalOpen(true);
      }
    };
    window.addEventListener('app:fab-clicked', handleFabClick);
    return () => window.removeEventListener('app:fab-clicked', handleFabClick);
  }, []);
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(new Set());

  const toggleExpandEntry = (id: string) => {
    soundEngine.playPop();
    setExpandedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'task' | 'note' | 'event' | 'priority'>('all');
  const [filterEnergy, setFilterEnergy] = useState<EnergyLevel | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  // Add Rapid Log Entry from Modal
  const handleAddEntry = (newEntry: BujoEntry) => {
    onUpdateEntries([newEntry, ...entries]);
    // If the new entry belongs to another date, switch to that date in Day view
    if (newEntry.date && newEntry.date !== selectedDate && journalView === 'day') {
      setSelectedDate(newEntry.date);
    }
  };

  // Toggle Status: open <-> completed (clicking checked entry unchecks it)
  const handleToggleStatus = (entry: BujoEntry) => {
    let nextStatus: BujoStatus = 'completed';
    if (entry.status === 'completed') {
      nextStatus = 'open';
      soundEngine.playPop();
    } else {
      nextStatus = 'completed';
      soundEngine.playGentleChime();
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#7e57c2', '#9c27b0', '#ffb74d', '#4caf50']
        });
      } catch (e) {}
    }

    const updated = entries.map((e) =>
      e.id === entry.id
        ? {
            ...e,
            status: nextStatus,
            completedAt: nextStatus === 'completed' ? Date.now() : undefined,
          }
        : e
    );
    onUpdateEntries(updated);
  };

  const handleTogglePriority = (id: string) => {
    const updated = entries.map((e) =>
      e.id === id ? { ...e, isPriority: !e.isPriority } : e
    );
    onUpdateEntries(updated);
    soundEngine.playPop();
  };

  const handleDeleteEntry = (id: string) => {
    onUpdateEntries(entries.filter((e) => e.id !== id));
    soundEngine.playPop();
  };

  // Quick navigation helpers
  const handlePrevDay = () => {
    soundEngine.playPop();
    handleSelectDate(shiftDate(selectedDate, -1));
  };

  const handleNextDay = () => {
    soundEngine.playPop();
    handleSelectDate(shiftDate(selectedDate, 1));
  };

  const handleJumpToToday = () => {
    soundEngine.playPop();
    handleSelectDate(todayStr);
  };

  // Filter entries based on viewMode and active filters
  const dateFilteredEntries = entries.filter((e) => {
    if (journalView === 'day' || journalView === 'calendar') {
      return e.date === selectedDate;
    }
    return true;
  });

  const filteredEntries = dateFilteredEntries.filter((e) => {
    if (activeFilter === 'task' && e.type !== 'task') return false;
    if (activeFilter === 'note' && e.type !== 'note') return false;
    if (activeFilter === 'event' && e.type !== 'event') return false;
    if (activeFilter === 'priority' && !e.isPriority) return false;
    if (filterEnergy !== null && e.energyCost !== filterEnergy) return false;
    return true;
  });

  // Calculate day-specific stats
  const dayEntries = entries.filter((e) => e.date === selectedDate);
  const dayTasks = dayEntries.filter((e) => e.type === 'task');
  const dayCompletedTasks = dayTasks.filter((e) => e.status === 'completed');
  const dayEvents = dayEntries.filter((e) => e.type === 'event');
  const dayNotes = dayEntries.filter((e) => e.type === 'note');

  // Grouping for Timeline / All View
  const initialGrouped: Record<string, BujoEntry[]> = {};
  const entriesGroupedByDate = filteredEntries.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, initialGrouped);
  
  // Sort dates ascending (past to future)
  const sortedDates = Object.keys(entriesGroupedByDate).sort((a, b) => a.localeCompare(b));

  const currentEnergyMeta = ENERGY_LEVELS.find((l) => l.id === currentEnergy) || ENERGY_LEVELS[0];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-24 space-y-6">
      
      {/* Expandable Journal Navigation & Filters Top Panel */}
      <div className="bg-[#F8FAF5] dark:bg-[#182316] p-4 sm:p-5 rounded-[28px] border border-[#DCEAD4] dark:border-[#263722] shadow-xs space-y-3">
        {/* Header Summary Row & Expand Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            id="btn-toggle-bujo-filters"
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-[#151E14] dark:text-[#E8F2E4]">
                  {formatDateDisplay(selectedDate, { showDayOfWeek: true, includeYear: true, lang: language })}
                </span>
              </div>
              <p className="text-[11px] text-[#485B44] dark:text-[#9EB598]">
                {journalView === 'day' ? getRelativeDayLabel(selectedDate, language) : journalView === 'calendar' ? t('journal.calendarView') : t('journal.allDates')}
              </p>
            </div>
          </button>

          {/* Quick Date Stepper & Expand Toggle */}
          <div className="flex items-center gap-2">
            {journalView === 'day' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevDay}
                  className="p-1.5 rounded-lg bg-[#EDF6E8] dark:bg-[#1C281A] hover:bg-[#DDF4CD] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] border border-[#DCEAD4] dark:border-[#263722] transition-colors"
                  title={t('journal.prevDay')}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {selectedDate !== todayStr && (
                  <button
                    onClick={handleJumpToToday}
                    className="px-2.5 py-1 rounded-lg bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-[11px] font-bold shadow-xs active:scale-95 transition-all"
                  >
                    {t('journal.jumpToday')}
                  </button>
                )}
                <button
                  onClick={handleNextDay}
                  className="p-1.5 rounded-lg bg-[#EDF6E8] dark:bg-[#1C281A] hover:bg-[#DDF4CD] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] border border-[#DCEAD4] dark:border-[#263722] transition-colors"
                  title={t('journal.nextDay')}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                soundEngine.playPop();
                setIsFilterExpanded((prev) => !prev);
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#EDF6E8] dark:bg-[#1E2E1B] hover:bg-[#DEEED6] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#263722] text-xs font-semibold flex items-center gap-1 transition-colors"
              title={isFilterExpanded ? t('journal.hideFilters') : t('journal.filters')}
              aria-label={isFilterExpanded ? t('journal.hideFilters') : t('journal.filters')}
            >
              <span className="hidden sm:inline text-[11px] font-bold">{isFilterExpanded ? t('journal.hideFilters') : t('journal.filters')}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFilterExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Expandable Navigation & Filter Controls */}
        <AnimatePresence>
          {isFilterExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-[#DCEAD4] dark:border-[#263722] space-y-3">
                {/* Row 1: Date Selector & View Mode Switcher */}
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3">
                  {/* Date Selector (Day Stepper, Date Picker, Today Jump) */}
                  <div className="flex items-center justify-center gap-1.5 flex-wrap w-full sm:w-auto">
                    <button
                      id="btn-bujo-prev-day"
                      onClick={handlePrevDay}
                      className="p-2 rounded-xl bg-[#EDF6E8] dark:bg-[#1C281A] hover:bg-[#DDF4CD] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] border border-[#DCEAD4] dark:border-[#263722] transition-colors"
                      title={t('journal.prevDay')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Material Expressive Date Picker Pill */}
                    <MaterialExpressiveDatePicker
                      id="input-bujo-selected-date"
                      value={selectedDate}
                      onChange={(newDate) => handleSelectDate(newDate)}
                      label={t('journal.targetDate')}
                    />

                    <button
                      id="btn-bujo-next-day"
                      onClick={handleNextDay}
                      className="p-2 rounded-xl bg-[#EDF6E8] dark:bg-[#1C281A] hover:bg-[#DDF4CD] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] border border-[#DCEAD4] dark:border-[#263722] transition-colors"
                      title={t('journal.nextDay')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Quick Today Jump */}
                    {selectedDate !== todayStr && (
                      <button
                        id="btn-bujo-jump-today"
                        onClick={handleJumpToToday}
                        className="px-3 py-1.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-xs active:scale-95 transition-all"
                      >
                        {t('journal.jumpToday')}
                      </button>
                    )}
                  </div>

                  {/* View Mode Switcher: Daily Log / Calendar / All Dates */}
                  <div className="flex rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] p-1 gap-1 border border-[#DCEAD4] dark:border-[#263722] shrink-0 justify-center w-full sm:w-auto overflow-x-auto">
                    <button
                      id="btn-bujo-view-day"
                      onClick={() => {
                        soundEngine.playPop();
                        setJournalView('day');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        journalView === 'day'
                          ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                          : 'text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14]'
                      }`}
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{t('journal.viewDaily')}</span>
                    </button>

                    <button
                      id="btn-bujo-view-calendar"
                      onClick={() => {
                        soundEngine.playPop();
                        setJournalView('calendar');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        journalView === 'calendar'
                          ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                          : 'text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14]'
                      }`}
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{t('journal.viewCalendar')}</span>
                    </button>

                    <button
                      id="btn-bujo-view-timeline"
                      onClick={() => {
                        soundEngine.playPop();
                        setJournalView('timeline');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        journalView === 'timeline'
                          ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                          : 'text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14]'
                      }`}
                    >
                      <CalendarRange className="w-3.5 h-3.5" />
                      <span>{t('journal.viewTimeline')}</span>
                    </button>
                  </div>
                </div>

                {/* Row 2: Type Filters & Energy Filters */}
                <div className="pt-2 border-t border-[#DCEAD4]/70 dark:border-[#263722]/70 flex flex-wrap items-center justify-between gap-3">
                  {/* Type Tabs */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'all', label: t('journal.filterAll') },
                      { id: 'priority', label: `⭐ ${t('journal.priority')}` },
                      { id: 'task', label: `⬜ ${t('journal.filterTasks')}` },
                      { id: 'event', label: `⏳ ${t('journal.filterEvents')}` },
                      { id: 'note', label: `✒️ ${t('journal.filterNotes')}` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          soundEngine.playPop();
                          setActiveFilter(tab.id as any);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                          activeFilter === tab.id
                            ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                            : 'bg-[#EDF6E8] dark:bg-[#1C281A] text-[#485B44] dark:text-[#9EB598] hover:bg-[#E8F8D8]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Energy Filter */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        soundEngine.playPop();
                        setFilterEnergy(null);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        filterEnergy === null
                          ? 'bg-[#80D141] text-[#0F2600]'
                          : 'bg-[#EDF6E8] dark:bg-[#1C281A] text-[#485B44] dark:text-[#9EB598] hover:bg-[#E8F8D8]'
                      }`}
                    >
                      {t('journal.filterEnergy')}
                    </button>
                    {ENERGY_LEVELS.map((lvl) => (
                      <button
                        key={lvl.id}
                        onClick={() => {
                          soundEngine.playPop();
                          setFilterEnergy(filterEnergy === lvl.id ? null : lvl.id);
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                          filterEnergy === lvl.id
                            ? 'bg-[#80D141] text-[#0F2600]'
                            : 'bg-[#EDF6E8] dark:bg-[#1C281A] text-[#485B44] dark:text-[#9EB598] hover:bg-[#E8F8D8]'
                        }`}
                      >
                        <span>{lvl.icon}</span>
                        <span className="capitalize">{getEnergyLabel(lvl.id, language)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Embedded Month Calendar View if selected */}
      {journalView === 'calendar' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <JournalCalendar
            entries={entries}
            selectedDate={selectedDate}
            onSelectDate={(date) => handleSelectDate(date)}
          />

          {/* Current Date Banner below Calendar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#80D141]" />
              <span className="font-display text-sm font-bold text-[#151E14] dark:text-[#E8F2E4]">
                {t('journal.entriesFor')} {formatDateDisplay(selectedDate, { showDayOfWeek: true, includeYear: true, lang: language })}
              </span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white dark:bg-[#253522] text-[#3B4E37] dark:text-[#B6CCB0] border border-[#DCEAD4] dark:border-[#2E422A]">
              {language === 'fa' ? toPersianDigits(filteredEntries.length) : filteredEntries.length} {filteredEntries.length === 1 ? t('journal.item') : t('journal.items')}
            </span>
          </div>
        </motion.div>
      )}



      {/* Bullet Journal Entries Display */}
      {journalView === 'timeline' ? (
        /* Timeline / All Dates Grouped View */
        <div className="space-y-6">
          {sortedDates.length === 0 ? (
            <div className="p-8 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] text-center space-y-2">
              <span className="text-3xl">🌱</span>
              <h4 className="font-display font-bold text-sm text-[#151E14] dark:text-[#E8F2E4]">
                {t('journal.noEntriesTimelineTitle')}
              </h4>
              <p className="text-xs text-[#485B44] dark:text-[#9EB598] max-w-sm mx-auto font-medium">
                {t('journal.noEntriesTimelineSub')}
              </p>
            </div>
          ) : (
            sortedDates.map((dateStr) => {
              const groupEntries = entriesGroupedByDate[dateStr] || [];

              return (
                <div key={dateStr} className="space-y-2.5">
                  {/* Date Section Header */}
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-[#80D141]" />
                      <h3 className="font-display text-sm font-bold text-[#151E14] dark:text-[#E8F2E4]">
                        {formatDateDisplay(dateStr, { showDayOfWeek: true, includeYear: true, lang: language })}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#EDF6E8] dark:bg-[#202E1E] text-[#3B7E10] dark:text-[#80D141] font-bold">
                        {getRelativeDayLabel(dateStr, language)}
                      </span>
                    </div>
                  </div>

                  {/* Entry list for this date */}
                  <div className="space-y-2.5">
                    {groupEntries.map((entry) => renderEntryCard(entry))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Day / Selected Date View */
        <div className="space-y-2.5">
          {filteredEntries.length === 0 ? (
            <div className="p-8 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] text-center space-y-3">
              <span className="text-3xl">🌱</span>
              <h4 className="font-display font-bold text-sm text-[#151E14] dark:text-[#E8F2E4]">
                {t('journal.noEntriesDayTitle')} {formatDateDisplay(selectedDate, { showDayOfWeek: true, includeYear: false, lang: language })}
              </h4>
              <p className="text-xs text-[#485B44] dark:text-[#9EB598] max-w-sm mx-auto font-medium">
                {t('journal.noEntriesDaySub')}
              </p>
              <button
                onClick={() => {
                  soundEngine.playPop();
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-bold text-xs shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t('journal.logEntryForDate')}</span>
              </button>
            </div>
          ) : (
            filteredEntries.map((entry) => renderEntryCard(entry))
          )}
        </div>
      )}

      {/* Add Bujo Entry Modal */}
      <AddBujoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddEntry={handleAddEntry}
        defaultDate={selectedDate}
        currentEnergy={currentEnergy}
        categories={categories}
        onOpenSettings={onOpenSettings}
      />

      {/* Edit Bujo Entry Modal */}
      <EditBujoModal
        entry={editingEntry}
        isOpen={Boolean(editingEntry)}
        onClose={() => setEditingEntry(null)}
        onSave={(updatedEntry) => {
          onUpdateEntries(entries.map((e) => (e.id === updatedEntry.id ? updatedEntry : e)));
        }}
        categories={categories}
        onOpenSettings={onOpenSettings}
      />

      {/* Unstick AI Modal */}
      <UnstickModal
        entry={unstickEntry}
        isOpen={Boolean(unstickEntry)}
        onClose={() => setUnstickEntry(null)}
        onUpdateEntry={(updated) => {
          onUpdateEntries(entries.map((e) => (e.id === updated.id ? updated : e)));
          setUnstickEntry(updated);
        }}
        onSendToFocusTimer={onSendToFocusTimer}
        currentEnergy={currentEnergy}
      />

    </div>
  );

  function renderEntryCard(entry: BujoEntry) {
    const isTask = entry.type === 'task';
    const isCompleted = entry.status === 'completed';
    const isMigrated = entry.status === 'migrated';
    const microSteps = entry.microSteps || [];
    const completedMicroStepsCount = microSteps.filter((s) => s.completed).length;
    const energyMeta = ENERGY_LEVELS.find((l) => l.id === entry.energyCost) || ENERGY_LEVELS[0];

    return (
      <motion.div
        key={entry.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => toggleExpandEntry(entry.id)}
        className={`group p-4 sm:p-5 rounded-[24px] border transition-all cursor-pointer select-none ${
          isCompleted
            ? 'bg-[#E1F6D0] dark:bg-[#1B3618] border-[#72C833] dark:border-[#529E25] shadow-xs'
            : isMigrated
            ? 'bg-[#FFF8E1] dark:bg-[#2D291E] border-[#FFE082] dark:border-[#4C442E]'
            : 'bg-white dark:bg-[#182316] border-[#DCEAD4] dark:border-[#263722] hover:border-[#80D141]/60 dark:hover:border-[#80D141]/40 shadow-xs'
        }`}
      >
        <div className="flex items-start justify-between gap-2.5 sm:gap-3">
          
          {/* Left: Bullet Key Icon & Text */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            
            {/* Interactive Key Symbol Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleStatus(entry);
              }}
              className={`w-8 h-8 mt-0.5 shrink-0 rounded-xl flex items-center justify-center font-mono font-bold text-sm transition-all ${
                isCompleted
                  ? 'bg-[#80D141] text-[#0F2600] shadow-md font-bold'
                  : isMigrated
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                  : 'bg-[#EDF6E8] dark:bg-[#202E1E] text-[#3B7E10] dark:text-[#80D141] hover:bg-[#DDF4CD]'
              }`}
              title={isCompleted ? t('journal.clickToUncheck') : t('journal.clickToComplete')}
            >
              {isCompleted ? '✓' : isMigrated ? '→' : TYPE_SYMBOLS[entry.type]?.symbol || '⬜'}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {entry.isPriority && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFE9E9] dark:bg-[#3D1E22] text-[#B3261E] dark:text-[#F2B8B5] flex items-center gap-0.5 shrink-0">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    {t('journal.priority')}
                  </span>
                )}

                <span className="text-sm font-bold leading-relaxed break-words text-[#151E14] dark:text-[#E8F2E4] transition-all">
                  {getLocalizedTaskTitle(entry.content, language === 'fa')}
                </span>
              </div>

              {/* Micro-steps status banner if present */}
              {microSteps.length > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-[11px] font-bold text-[#3B7E10] dark:text-[#80D141]">
                    {t('journal.microStepsDone')
                      .replace('{done}', language === 'fa' ? toPersianDigits(completedMicroStepsCount) : String(completedMicroStepsCount))
                      .replace('{total}', language === 'fa' ? toPersianDigits(microSteps.length) : String(microSteps.length))}
                  </span>
                  <div className="w-20 h-1.5 rounded-full bg-[#EDF6E8] dark:bg-[#263722] overflow-hidden">
                    <div
                      className="h-full bg-[#80D141] rounded-full"
                      style={{ width: `${(completedMicroStepsCount / microSteps.length) * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUnstickEntry(entry);
                    }}
                    className="text-[11px] text-[#3B7E10] dark:text-[#80D141] font-bold hover:underline"
                  >
                    {t('journal.viewSteps')}
                  </button>
                </div>
              )}

              {/* Tags & Energy Meta & Date Badge */}
              <div className="flex items-center gap-2 mt-2 text-[11px] text-[#485B44] dark:text-[#9EB598] flex-wrap font-medium">
                <span className="px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] font-bold flex items-center gap-1">
                  <span>{energyMeta.icon}</span>
                  <span className="capitalize">{getEnergyLabel(energyMeta.id, language)}</span>
                </span>

                {entry.date && journalView !== 'day' && (
                  <span className="px-2 py-0.5 rounded-full bg-[#EDF6E8] dark:bg-[#202E1E] text-[#3B7E10] dark:text-[#80D141] font-semibold border border-[#DCEAD4] dark:border-[#263722] flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    <span>{getRelativeDayLabel(entry.date, language)}</span>
                  </span>
                )}

                {entry.category && (
                  <span className="px-2 py-0.5 rounded-full bg-[#EDF6E8] dark:bg-[#202E1E] text-[#485B44] dark:text-[#80D141] font-semibold border border-[#DCEAD4] dark:border-[#263722]">
                    {getCategoryLabel(entry.category, language)}
                  </span>
                )}

                {/* Scheduled Time & Duration Badge */}
                {(entry.time || entry.durationMinutes) && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 shrink-0 ${
                    isCompleted
                      ? 'bg-[#CCEBB6] dark:bg-[#254A20] text-[#14300B] dark:text-[#CFF3B8]'
                      : 'bg-[#EDF6E8] dark:bg-[#202E1E] text-[#3B7E10] dark:text-[#9DD97A] border border-[#DCEAD4] dark:border-[#263722]'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>
                      {entry.time ? (language === 'fa' ? toPersianDigits(entry.time) : entry.time) : ''}
                      {entry.time && entry.durationMinutes ? ' • ' : ''}
                      {entry.durationMinutes ? formatMinutes(entry.durationMinutes, language) : ''}
                    </span>
                  </span>
                )}

                {isMigrated && (
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {t('journal.migrated')}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Right: Expand / Collapse Down Arrow */}
          <div className="shrink-0 self-start sm:self-center mt-0.5 sm:mt-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpandEntry(entry.id);
              }}
              className={`p-1.5 rounded-full transition-all ${
                expandedEntryIds.has(entry.id)
                  ? 'bg-[#EDF6E8] dark:bg-[#202E1E] text-[#151E14] dark:text-[#E8F2E4]'
                  : 'text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] hover:text-[#151E14] dark:hover:text-[#E8F2E4]'
              }`}
              title={expandedEntryIds.has(entry.id) ? t('journal.hideButtons') : t('journal.showButtons')}
              aria-label={expandedEntryIds.has(entry.id) ? t('journal.hideButtons') : t('journal.showButtons')}
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedEntryIds.has(entry.id) ? 'rotate-180 text-[#3B7E10] dark:text-[#80D141]' : ''
                }`}
              />
            </button>
          </div>

        </div>

        {/* Downward Expandable Actions Area */}
        <AnimatePresence>
          {expandedEntryIds.has(entry.id) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="overflow-hidden cursor-default"
            >
              <div className="mt-3 pt-3 border-t border-[#DCEAD4] dark:border-[#263722] flex flex-wrap items-center justify-between gap-2">
                {/* Left: Quick Actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* "Unstick Me" AI button on tasks */}
                  {isTask && !isCompleted && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setUnstickEntry(entry)}
                      className="px-3 py-1.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] hover:bg-[#D5F7B8] text-[#1C3700] dark:text-[#A2EB68] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                      title={t('unstick.subtitle')}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('journal.unstick')}</span>
                    </motion.button>
                  )}

                  {/* Send to Timer */}
                  {isTask && !isCompleted && (
                    <button
                      onClick={() => onSendToFocusTimer(entry.content, entry.durationMinutes || 15)}
                      className="px-3 py-1.5 rounded-full bg-[#EDF6E8] dark:bg-[#202E1E] hover:bg-[#DDF4CD] text-[#163300] dark:text-[#A2EB68] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                      title={`${t('focus.start')} (${formatMinutes(entry.durationMinutes || 15, language)})`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{t('journal.focus')} {entry.durationMinutes ? `(${formatMinutes(entry.durationMinutes, language)})` : ''}</span>
                    </button>
                  )}
                </div>

                {/* Right: Entry Management Actions (Star, Edit, Delete) */}
                <div className="flex items-center gap-1 ml-auto">
                  {/* Priority Star Toggle */}
                  <button
                    onClick={() => handleTogglePriority(entry.id)}
                    className={`p-1.5 rounded-full transition-all ${
                      entry.isPriority 
                        ? 'text-amber-500 bg-[#FFF8E1] dark:bg-[#332A15]' 
                        : 'text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E]'
                    }`}
                    title={t('journal.priorityStar')}
                  >
                    <Star className={`w-4 h-4 ${entry.isPriority ? 'fill-current' : ''}`} />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => {
                      soundEngine.playPop();
                      setEditingEntry(entry);
                    }}
                    className="p-1.5 rounded-full text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] transition-colors"
                    title={t('common.edit')}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-1.5 rounded-full text-[#B3261E] hover:bg-[#FFE9E9] dark:hover:bg-[#432125] transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
};
