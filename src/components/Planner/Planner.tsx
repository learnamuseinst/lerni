import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Clock,
  Zap,
  Play,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Coffee,
  AlertCircle,
  Loader2,
  ListTodo,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import {
  BujoEntry,
  Habit,
  FocusSession,
  UserPreferences,
  DayPlan,
  ScheduleBlock,
  SchedulingConstraint,
} from '../../types';
import { storage } from '../../utils/storage';
import { getTodayKey, shiftDate, formatDateDisplay, getRelativeDayLabel } from '../../utils/dateUtils';
import { soundEngine } from '../../utils/audioSynth';
import { optimizeDailySchedule, generateStarterStepsForBlock, OptimizationResult, derivePaceFromSensoryState } from '../../utils/aiScheduler';
import { MaterialExpressiveTimePicker } from '../common/MaterialExpressiveTimePicker';
import { useI18n, formatMinutes, toPersianDigits } from '../../utils/i18n';

interface PlannerProps {
  entries: BujoEntry[];
  habits: Habit[];
  focusSessions: FocusSession[];
  prefs: UserPreferences;
  onUpdateEntries: (entries: BujoEntry[]) => void;
  onSendToFocusTimer: (taskTitle: string, minutes?: number) => void;
  onOpenSettings: () => void;
  onUpdatePrefs: (updated: Partial<UserPreferences>) => void;
  onOpenStatusModal?: () => void;
  onGeneratingChange?: (generating: boolean) => void;
}

export const Planner: React.FC<PlannerProps> = ({
  entries,
  habits,
  focusSessions,
  prefs,
  onSendToFocusTimer,
  onOpenSettings,
  onOpenStatusModal,
  onGeneratingChange,
}) => {
  const { t, language } = useI18n();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey());
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(() => storage.getDayPlan(getTodayKey()));
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [generatingStepsBlockId, setGeneratingStepsBlockId] = useState<string | null>(null);

  // Listen for unified FAB click from App
  useEffect(() => {
    const handleFabClick = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.section === 'planner') {
        setShowConfigModal(true);
      }
    };
    window.addEventListener('app:fab-clicked', handleFabClick);
    return () => window.removeEventListener('app:fab-clicked', handleFabClick);
  }, []);

  // Sync modal state with app for FAB animation
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('app:modal-state-change', { detail: { isOpen: showConfigModal } })
    );
  }, [showConfigModal]);

  // Planning Configuration state
  const [dayStartTime, setDayStartTime] = useState('09:00');
  const [dayEndTime, setDayEndTime] = useState('18:00');
  const [includeBacklog, setIncludeBacklog] = useState(true);
  const [schedulingConstraint, setSchedulingConstraint] = useState<SchedulingConstraint>('all_priority');
  const [oneTimeInstructions, setOneTimeInstructions] = useState('');

  // Micro-steps expansion tracking
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [completedMicroSteps, setCompletedMicroSteps] = useState<Record<string, Record<number, boolean>>>({});

  // Sync plan whenever selectedDate changes
  useEffect(() => {
    const saved = storage.getDayPlan(selectedDate);
    setDayPlan(saved);
    setErrorMessage(null);
  }, [selectedDate]);

  const backlogCandidates = useMemo(() => {
    return entries.filter(
      (e) => e.date < selectedDate && e.status === 'open' && (e.isPriority || e.type === 'task')
    );
  }, [entries, selectedDate]);

  // Open planning modal
  const handleOpenConfigModal = () => {
    soundEngine.playPop();
    setShowConfigModal(true);
  };

  // Generate / Optimize Schedule with Gemini
  const handleGenerateSchedule = async () => {
    setIsGenerating(true);
    onGeneratingChange?.(true);
    setShowConfigModal(false);
    setErrorMessage(null);
    soundEngine.playPop();

    const step1 = language === 'fa' ? 'در حال تحلیل تسک‌های دفترچه و توان شناختی...' : 'Analyzing journal tasks & cognitive demand...';
    const step2 = language === 'fa' ? 'پیش‌بینی ریتم‌های انرژی و محدودیت‌های حسی...' : 'Predicting energy rhythms & sensory constraints...';
    const step3 = language === 'fa' ? 'ترکیب زمان‌های تنفس و گام‌های شروع...' : 'Synthesizing restorative buffers & starter steps...';

    setGenerationStep(step1);
    await new Promise((r) => setTimeout(r, 450));

    setGenerationStep(step2);
    await new Promise((r) => setTimeout(r, 450));

    setGenerationStep(step3);

    try {
      const activeChronotype = prefs.chronotype || 'balanced';
      const assumedPace = derivePaceFromSensoryState(prefs.sensoryState, prefs.currentEnergy);
      const combinedInstructions = [
        prefs.plannerCustomInstructions?.trim(),
        oneTimeInstructions.trim(),
      ].filter(Boolean).join('\n');

      const result: OptimizationResult = await optimizeDailySchedule({
        targetDate: selectedDate,
        entries,
        habits,
        focusSessions,
        prefs,
        chronotype: activeChronotype,
        pace: assumedPace,
        schedulingConstraint,
        customInstructions: combinedInstructions || undefined,
        dayStartTime,
        dayEndTime,
        includeBacklog,
      });

      storage.saveDayPlan(result.plan);
      setDayPlan(result.plan);
      soundEngine.playGentleChime();

      if (result.message && result.source === 'heuristic_fallback') {
        setErrorMessage(`Note: ${result.message}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || (language === 'fa' ? 'خطا در برنامه‌ریزی روزانه.' : 'Could not generate schedule.'));
    } finally {
      setIsGenerating(false);
      onGeneratingChange?.(false);
      setGenerationStep('');
    }
  };

  // Generate 2-minute starter steps on demand when "Help me start" is pressed
  const handleHelpMeStart = async (block: ScheduleBlock) => {
    // If steps already exist, toggle open/close
    if (block.microStarterSteps && block.microStarterSteps.length > 0) {
      soundEngine.playPop();
      setExpandedSteps((prev) => ({
        ...prev,
        [block.id]: !prev[block.id],
      }));
      return;
    }

    // Generate steps on-demand
    setGeneratingStepsBlockId(block.id);
    soundEngine.playPop();

    try {
      const steps = await generateStarterStepsForBlock(block.title, (block.energyDemand as any) || 'medium', prefs);
      
      if (dayPlan) {
        const updatedBlocks = dayPlan.scheduleBlocks.map((b) =>
          b.id === block.id ? { ...b, microStarterSteps: steps } : b
        );
        const updatedPlan: DayPlan = {
          ...dayPlan,
          scheduleBlocks: updatedBlocks,
        };
        storage.saveDayPlan(updatedPlan);
        setDayPlan(updatedPlan);
      }

      setExpandedSteps((prev) => ({
        ...prev,
        [block.id]: true,
      }));
      soundEngine.playGentleChime();
    } catch (err) {
      console.error('Error generating starter steps:', err);
      // Fallback steps
      const fallbackSteps = language === 'fa'
        ? [
            `پنجره کار مرتبط با "${block.title}" را باز کنید.`,
            'یک تایمر ۲ دقیقه‌ای بگذارید و اولین اقدام کوچک را انجام دهید.',
            'به خودتان برای شروع اولین قدم آفرین بگویید!'
          ]
        : [
            `Open the workspace or notes for "${block.title}".`,
            'Set a 2-minute timer and write just one line or sentence.',
            'Give yourself permission to pause or continue gently.'
          ];

      if (dayPlan) {
        const updatedBlocks = dayPlan.scheduleBlocks.map((b) =>
          b.id === block.id ? { ...b, microStarterSteps: fallbackSteps } : b
        );
        const updatedPlan: DayPlan = {
          ...dayPlan,
          scheduleBlocks: updatedBlocks,
        };
        storage.saveDayPlan(updatedPlan);
        setDayPlan(updatedPlan);
      }

      setExpandedSteps((prev) => ({
        ...prev,
        [block.id]: true,
      }));
    } finally {
      setGeneratingStepsBlockId(null);
    }
  };

  // Toggle single micro starter step completion
  const handleToggleMicroStep = (blockId: string, stepIndex: number) => {
    soundEngine.playPop();
    setCompletedMicroSteps((prev) => {
      const blockSteps = { ...(prev[blockId] || {}) };
      blockSteps[stepIndex] = !blockSteps[stepIndex];
      return {
        ...prev,
        [blockId]: blockSteps,
      };
    });
  };

  // Clear plan (deletes stored plan directly without blocking modal)
  const handleClearPlan = () => {
    soundEngine.playPop();
    storage.deleteDayPlan(selectedDate);
    setDayPlan(null);
  };

  const isToday = selectedDate === getTodayKey();

  const getEnergyBadgeText = (demand?: string) => {
    if (demand === 'high') {
      return { icon: '💪', label: t('energy.high', 'High') };
    }
    if (demand === 'low') {
      return { icon: '🤏', label: t('energy.low', 'Low') };
    }
    return { icon: '🤌', label: t('energy.med', 'Med') };
  };

  return (
    <div id="planner-section" className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-24 space-y-6">
      
      {/* Top Banner: Date Navigation, Focus/Rest indicators, & Actions */}
      <section className="p-4 sm:p-5 rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Date Selector with Next / Prev */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#F2F8EE] dark:bg-[#141F12] p-1 rounded-2xl border border-[#DCEAD4] dark:border-[#2A3E26]">
              <button
                type="button"
                onClick={() => setSelectedDate((prev) => shiftDate(prev, -1))}
                className="p-2 rounded-xl text-[#33462E] dark:text-[#C8DEC2] hover:bg-white dark:hover:bg-[#1F2D1C] transition-colors"
                title={language === 'fa' ? 'روز قبل' : 'Previous Day'}
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>

              <div className="px-3 py-1 text-center min-w-[140px]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#485B44] dark:text-[#9EB598]">
                  {getRelativeDayLabel(selectedDate, language)}
                </div>
                <div className="font-display font-bold text-sm text-[#151E14] dark:text-[#E8F2E4]">
                  {formatDateDisplay(selectedDate, { showDayOfWeek: false, includeYear: true, lang: language })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDate((prev) => shiftDate(prev, 1))}
                className="p-2 rounded-xl text-[#33462E] dark:text-[#C8DEC2] hover:bg-white dark:hover:bg-[#1F2D1C] transition-colors"
                title={language === 'fa' ? 'روز بعد' : 'Next Day'}
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>

            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayKey())}
                className="px-3 py-2 rounded-xl bg-[#F2F8EE] dark:bg-[#141F12] text-xs font-bold text-[#3B7E10] dark:text-[#80D141] border border-[#DCEAD4] dark:border-[#2A3E26] hover:bg-[#E2F5D1] transition-colors"
              >
                {t('planner.jumpToday', 'Jump to Today')}
              </button>
            )}
          </div>

          {/* Right Area: Focus / Rest Indicators & Clear Plan Button */}
          <div className="flex items-center gap-2 flex-wrap">
            {dayPlan && (
              <>
                {/* Focus Minutes Indicator */}
                <span className="px-2.5 py-1.5 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] text-xs font-bold text-[#1C3700] dark:text-[#80D141] border border-[#80D141]/40 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatMinutes(dayPlan.totalFocusMinutes, language)} {t('planner.focusTime', 'Focus')}</span>
                </span>

                {/* Rest Minutes Indicator */}
                <span className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-xs font-bold text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5" />
                  <span>{formatMinutes(dayPlan.totalBreakMinutes, language)} {t('planner.restTime', 'Rest')}</span>
                </span>

                {/* Clear Plan Button */}
                <button
                  type="button"
                  id="btn-clear-plan"
                  onClick={handleClearPlan}
                  className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title={t('planner.clearPlan', 'Clear Plan')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('planner.clearPlan', 'Clear Plan')}</span>
                </button>
              </>
            )}
          </div>

        </div>
      </section>

      {/* Global Status / Progress & Feedback Notifications */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-[#EAF7DC] to-[#F2FAF0] dark:from-[#182B14] dark:to-[#162413] border border-[#80D141]/50 text-xs font-bold text-[#1C3700] dark:text-[#80D141] flex items-center gap-3 shadow-xs"
          >
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-[#80D141]" />
            <span>{generationStep || (language === 'fa' ? 'در حال ترکیب و بهینه‌سازی برنامه متناسب با انرژی...' : 'Synthesizing energy-aware daily schedule...')}</span>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 shadow-xs"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMessage}</span>
              {/quota|api key/i.test(errorMessage) && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="mx-2 font-bold underline text-[#3B7E10] dark:text-[#80D141]"
                >
                  {language === 'fa' ? 'باز کردن تنظیمات برای ثبت کلید اختصاصی' : 'Open Settings to add your free personal key'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Schedule Details or Pre-Generation Guide State */}
      {dayPlan ? (
        <div className="space-y-6">
          
          {/* Time-Blocked Schedule */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-2">
                <span>{t('planner.schedule', 'Schedule')}</span>
              </h3>
            </div>

            <div className="space-y-3">
              {dayPlan.scheduleBlocks.map((block, idx) => {
                const isBreak = block.isBreak || block.type === 'break' || block.type === 'micro_reset';
                const isStepsOpen = expandedSteps[block.id] ?? false;
                const blockStepStatus = completedMicroSteps[block.id] || {};
                const energyMeta = getEnergyBadgeText(block.energyDemand);

                const timeStart = language === 'fa' ? toPersianDigits(block.startTime) : block.startTime;
                const timeEnd = language === 'fa' ? toPersianDigits(block.endTime) : block.endTime;
                const durationFormatted = formatMinutes(block.durationMinutes, language);

                return (
                  <motion.div
                    key={block.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`p-4 sm:p-5 rounded-[24px] border transition-all ${
                      isBreak
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50'
                        : block.energyDemand === 'high'
                        ? 'bg-white dark:bg-[#182316] border-[#80D141]/80 shadow-2xs'
                        : 'bg-white dark:bg-[#182316] border-[#D8E8D0] dark:border-[#22301F] shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      
                      {/* Left/Start: Time & Content */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="space-y-1 flex-1 min-w-0">
                          {/* Time & Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141]">
                              {timeStart} - {timeEnd}
                            </span>
                            <span className="text-xs text-[#556D50] dark:text-[#8EA887]">
                              ({durationFormatted})
                            </span>

                            {/* Energy Badge - energy emoji followed by Low/Med/High */}
                            <span className="px-2 py-0.5 rounded-full bg-[#EDF6E8] dark:bg-[#202E1E] text-[#485B44] dark:text-[#80D141] text-[11px] font-semibold border border-[#DCEAD4] dark:border-[#263722] flex items-center gap-1">
                              <span>{energyMeta.icon}</span>
                              <span>{energyMeta.label}</span>
                            </span>

                            {isBreak && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                {t('planner.restBreak', 'Restorative Break')}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <div className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                            {block.title}
                          </div>

                          {/* Executive Rationale */}
                          {block.executiveRationale && (
                            <div className="text-xs text-[#485B44] dark:text-[#9EB598] leading-relaxed">
                              {block.executiveRationale}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right/End: Actions (Focus Sprint Button, Help me start Button) */}
                      <div className="flex items-center gap-2 self-end sm:self-start shrink-0 flex-wrap">
                        {!isBreak && (
                          <button
                            type="button"
                            onClick={() => onSendToFocusTimer(block.title, block.durationMinutes)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#F2F8EE] dark:bg-[#141F12] hover:bg-[#E2F5D1] text-xs font-medium text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#2A3E26] flex items-center gap-1.5 transition-colors"
                            title="Start Focus Timer for this block"
                          >
                            <Play className="w-3.5 h-3.5 fill-current text-[#3B7E10] dark:text-[#80D141]" />
                            <span>{t('planner.focusBtn', 'Focus')}</span>
                          </button>
                        )}

                        {!isBreak && (
                          <button
                            type="button"
                            onClick={() => handleHelpMeStart(block)}
                            disabled={generatingStepsBlockId === block.id}
                            className="px-2.5 py-1.5 rounded-xl bg-[#F2F8EE] dark:bg-[#141F12] hover:bg-[#E2F5D1] text-xs font-medium text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#2A3E26] flex items-center gap-1.5 transition-colors disabled:opacity-75"
                            title="Generate gentle 2-minute starter steps"
                          >
                            {generatingStepsBlockId === block.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3B7E10] dark:text-[#80D141]" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
                            )}
                            <span className="text-[11px] font-bold">
                              {generatingStepsBlockId === block.id ? (language === 'fa' ? 'در حال تولید...' : 'Generating...') : t('planner.helpMeStart', 'Help me start')}
                            </span>
                            {block.microStarterSteps && block.microStarterSteps.length > 0 && (
                              isStepsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                    </div>

                    {/* Expandable 2-Minute Micro Starter Steps */}
                    <AnimatePresence>
                      {isStepsOpen && block.microStarterSteps && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-3 pt-3 border-t border-[#DCEAD4] dark:border-[#2A3E26]"
                        >
                          <div className="space-y-1.5 bg-[#F9FCF7] dark:bg-[#121B10] p-3 rounded-2xl border border-[#DCEAD4] dark:border-[#2A3E26]">
                            <div className="text-[11px] font-bold text-[#3B7E10] dark:text-[#80D141] flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              <span>{t('planner.adhdSteps', 'ADHD Initiation Steps (Break through task paralysis):')}</span>
                            </div>
                            <div className="space-y-1.5 pt-1">
                              {block.microStarterSteps.map((step, sIdx) => {
                                const isDone = blockStepStatus[sIdx] ?? false;
                                return (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => handleToggleMicroStep(block.id, sIdx)}
                                    className={`w-full text-start p-2 rounded-xl flex items-center gap-2 text-xs transition-colors ${
                                      isDone
                                        ? 'bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] line-through'
                                        : 'bg-white dark:bg-[#192617] text-[#151E14] dark:text-[#E8F2E4] hover:bg-[#F2F8EE]'
                                    }`}
                                  >
                                    <span className="w-4 h-4 rounded-md border border-[#80D141] flex items-center justify-center text-[10px] font-bold shrink-0">
                                      {isDone ? '✓' : (language === 'fa' ? toPersianDigits(sIdx + 1) : sIdx + 1)}
                                    </span>
                                    <span className="flex-1">{step}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </motion.div>
                );
              })}
            </div>
          </section>

        </div>
      ) : (
        /* Empty / Pre-Generation Guide State */
        <section className="p-8 sm:p-10 rounded-[32px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 mx-auto flex items-center justify-center text-[#234A00] dark:text-[#80D141]">
            <Calendar className="w-8 h-8" />
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-display text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {language === 'fa' 
                ? `هیچ برنامه‌ای برای ${getRelativeDayLabel(selectedDate, language)} تنظیم نشده است`
                : `No Schedule Planned for ${getRelativeDayLabel(selectedDate, language)}`}
            </h3>
          </div>
        </section>
      )}

      {/* Planning & Rhythm Options Full-Screen Window */}
      <AnimatePresence>
        {showConfigModal && (
          <motion.div
            id="planner-config-fullscreen"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-50 w-full h-full bg-[#F7FAF4] dark:bg-[#121B11] text-[#151E14] dark:text-[#E8F2E4] flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={t('planner.modalTitle', 'Step back and hand it over to me')}
          >
            {/* Header */}
            <div className="shrink-0 sticky top-0 z-20 bg-[#F7FAF4]/95 dark:bg-[#121B11]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 border-b border-[#DCEAD4] dark:border-[#22301F] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="p-2 -ml-2 rounded-xl text-[#485B44] dark:text-[#9EB598] hover:bg-[#EAEFE6] dark:hover:bg-[#1C281A] transition-colors flex items-center gap-1.5 font-medium text-sm cursor-pointer"
                  aria-label={t('common.close', 'Close')}
                >
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                  <span className="hidden sm:inline">{t('common.back', 'Back')}</span>
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#1C3700] dark:text-[#80D141]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base sm:text-lg font-bold text-[#151E14] dark:text-[#E8F2E4] leading-tight">
                      {t('planner.modalTitle', 'Step back and hand it over to me')}
                    </h2>
                    <p className="text-[11px] text-[#556D50] dark:text-[#8EA887] font-medium hidden sm:block">
                      {formatDateDisplay(selectedDate, language)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-[#F2F8EE] dark:hover:bg-[#1F2D1C] transition-colors sm:hidden"
                  aria-label={t('common.close', 'Close')}
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleGenerateSchedule}
                  disabled={isGenerating}
                  className="hidden sm:flex px-5 py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-xs items-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{dayPlan ? t('planner.reoptimize', 'Re-optimize Schedule') : t('planner.startPlanning', 'Start Planning')}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8 py-6">
              <div className="max-w-2xl mx-auto space-y-5 text-xs">
                {/* Time Range with Now Button */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>{t('planner.activeRange', 'Time Range')}</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#556D50] dark:text-[#8EA887] font-semibold block">{t('planner.startTime', 'Start Time')}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <MaterialExpressiveTimePicker
                            value={dayStartTime}
                            onChange={(newTime) => setDayStartTime(newTime || '08:30')}
                            label="Schedule Start Time"
                            placeholder="08:30"
                            allowClear={false}
                            buttonClassName="w-full justify-between"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const now = new Date();
                            const hh = String(now.getHours()).padStart(2, '0');
                            const mm = String(now.getMinutes()).padStart(2, '0');
                            setDayStartTime(`${hh}:${mm}`);
                            soundEngine.playPop();
                          }}
                          className="h-[42px] px-3 rounded-xl bg-[#E2F2D9] dark:bg-[#253922] hover:bg-[#D6ECCE] text-[#1E3800] dark:text-[#C5E8B7] text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer shrink-0 border border-[#D8E8D0] dark:border-[#2E4229]"
                          title={language === 'fa' ? 'تنظیم روی ساعت کنونی' : 'Set to current time'}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{t('planner.now', 'Now')}</span>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#556D50] dark:text-[#8EA887] font-semibold block">{t('planner.endTime', 'End Time')}</span>
                      <MaterialExpressiveTimePicker
                        value={dayEndTime}
                        onChange={(newTime) => setDayEndTime(newTime || '18:00')}
                        label="Schedule End Time"
                        placeholder="18:00"
                        allowClear={false}
                        buttonClassName="w-full justify-between"
                      />
                    </div>
                  </div>
                </div>

                {/* Scheduling Constraints / Goal Options */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#80D141]" />
                    <span>{t('planner.constraintTitle', 'Task Scheduling Goal')}</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        id: 'all_priority' as const,
                        icon: '⭐',
                        title: t('planner.constraintAllPriority', 'All priority tasks must be done in this range'),
                        desc: language === 'fa' ? 'تضمین زمان‌بندی تمام تسک‌های ستاره‌دار و ضروری' : 'Guarantees all starred & urgent tasks are scheduled',
                      },
                      {
                        id: 'all_tasks' as const,
                        icon: '📋',
                        title: t('planner.constraintAllTasks', 'All tasks must be done in this range'),
                        desc: language === 'fa' ? 'تطبیق و فشرده‌سازی بازه‌ها برای انجام کل لیست' : 'Fits all pending items by optimizing block sizes',
                      },
                      {
                        id: 'balanced' as const,
                        icon: '⚖️',
                        title: t('planner.constraintBalanced', 'Balanced capacity (fit comfortably based on energy)'),
                        desc: language === 'fa' ? 'تنظیم برنامه بر اساس توان بدنی بدون تحمیل فشار' : 'Schedules comfortably without cognitive overload',
                      },
                    ].map((opt) => {
                      const isSelected = schedulingConstraint === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playPop();
                            setSchedulingConstraint(opt.id);
                          }}
                          className={`p-2.5 rounded-xl text-start transition-all flex items-start gap-2.5 border cursor-pointer ${
                            isSelected
                              ? 'bg-[#E8F8D8] dark:bg-[#203618] border-[#80D141] text-[#0E2300] dark:text-[#E8FAD6] shadow-xs'
                              : 'bg-[#F7FAF4] dark:bg-[#1A2617] border-[#DCEAD4] dark:border-[#273922] text-[#485B44] dark:text-[#A4BCA0] hover:bg-[#EEF7E8]'
                          }`}
                        >
                          <span className="text-base shrink-0 mt-0.5">{opt.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs flex items-center justify-between">
                              <span>{opt.title}</span>
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-[#80D141] shrink-0 ml-1"></span>
                              )}
                            </div>
                            <div className="text-[10px] opacity-80 mt-0.5">{opt.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* One-Time Custom Instructions Box */}
                <div className="space-y-1.5">
                  <label className="font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#80D141]" />
                      <span>{t('planner.oneTimeInstructions', 'One-Time Custom Instructions')}</span>
                    </span>
                    {oneTimeInstructions && (
                      <button
                        type="button"
                        onClick={() => setOneTimeInstructions('')}
                        className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                      >
                        {language === 'fa' ? 'پاک کردن' : 'Clear'}
                      </button>
                    )}
                  </label>
                  <textarea
                    value={oneTimeInstructions}
                    onChange={(e) => setOneTimeInstructions(e.target.value)}
                    placeholder={t('planner.oneTimeInstructionsPlaceholder', 'e.g. Schedule gym after 4 PM, keep morning meeting-free, break down math homework...')}
                    rows={2}
                    className="w-full p-3 rounded-xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] text-xs text-[#151E14] dark:text-[#E8F2E4] placeholder:text-[#79747E] dark:placeholder:text-[#7D917A] focus:outline-none focus:ring-2 focus:ring-[#80D141] resize-none transition-all"
                  />
                </div>

                {/* Backlog Toggle */}
                <div className="p-3 rounded-xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26]">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeBacklog}
                      onChange={(e) => setIncludeBacklog(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#80D141] focus:ring-[#80D141]"
                    />
                    <div className="space-y-0.5">
                      <span className="font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1.5">
                        <ListTodo className="w-3.5 h-3.5 text-purple-500" />
                        <span>{t('planner.includeBacklog', 'Include Priority Backlog Tasks')}</span>
                      </span>
                      <p className="text-[11px] text-[#556D50] dark:text-[#8EA887]">
                        {language === 'fa'
                          ? `${backlogCandidates.length} تسک اولویت‌دار انجام‌نشده یا موعدگذشته را به بهینه‌سازی برنامه اضافه می‌کند.`
                          : `Pulls ${backlogCandidates.length} overdue or unscheduled priority tasks into today's schedule optimization.`}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="shrink-0 sticky bottom-0 z-20 bg-[#F7FAF4]/95 dark:bg-[#121B11]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 border-t border-[#DCEAD4] dark:border-[#22301F] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#F2F8EE] dark:bg-[#1A2617] text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#E2F5D1] transition-colors cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleGenerateSchedule}
                disabled={isGenerating}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{dayPlan ? t('planner.reoptimize', 'Re-optimize Schedule') : t('planner.startPlanning', 'Start Planning')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
