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
  AlertCircle,
  Loader2,
  ListTodo,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  ArrowLeft,
  Download,
  Check,
  Copy,
  ClipboardPaste,
} from 'lucide-react';
import {
  BujoEntry,
  Habit,
  FocusSession,
  UserPreferences,
  DayPlan,
  ScheduleBlock,
  SchedulingConstraint,
  hasActiveAiKey,
} from '../../types';
import { storage } from '../../utils/storage';
import { getTodayKey, shiftDate, formatDateDisplay, getRelativeDayLabel } from '../../utils/dateUtils';
import { soundEngine } from '../../utils/audioSynth';
import {
  optimizeDailySchedule,
  generateStarterStepsForBlock,
  OptimizationResult,
  derivePaceFromSensoryState,
  buildChatbotPlanningPrompt,
  parseScheduleFromAiResponse,
} from '../../utils/aiScheduler';
import { MaterialExpressiveTimePicker } from '../common/MaterialExpressiveTimePicker';
import { useI18n, formatMinutes, toPersianDigits } from '../../utils/i18n';
import { downloadScheduleAsText } from '../../utils/scheduleExport';

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
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [generatingStepsBlockId, setGeneratingStepsBlockId] = useState<string | null>(null);
  const [isPromptCopied, setIsPromptCopied] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);

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
  
  // Track expandable schedule blocks (collapsed by default for clean, calm scan, matching Journal expandable items)
  const [expandedBlockIds, setExpandedBlockIds] = useState<Set<string>>(new Set());

  const toggleExpandBlock = (blockId: string) => {
    soundEngine.playPop();
    setExpandedBlockIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  };

  // Sync plan whenever selectedDate changes
  useEffect(() => {
    const saved = storage.getDayPlan(selectedDate);
    setDayPlan(saved);
    setErrorMessage(null);
    setExpandedBlockIds(new Set());
    setIsHeaderExpanded(false);
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

  // Generate / Optimize Schedule with AI
  const handleGenerateSchedule = async () => {
    const hasUserApiKey = hasActiveAiKey(prefs);
    if (!hasUserApiKey) {
      soundEngine.playPop();
      setShowConfigModal(false);
      setErrorMessage(
        t('planner.noApiKeyError', 'Please add your API key in Settings to generate AI-powered features.')
      );
      return;
    }

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

    const hasUserApiKey = hasActiveAiKey(prefs);
    if (!hasUserApiKey) {
      soundEngine.playPop();
      setErrorMessage(
        t('planner.noApiKeyError', 'Please add your API key in Settings to generate AI-powered features.')
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Download human-readable schedule as .txt file with date + time in filename
  const handleDownloadSchedule = () => {
    if (!dayPlan) return;
    soundEngine.playGentleChime();
    const exportedFilename = downloadScheduleAsText(dayPlan, language);
    setDownloadToast(exportedFilename);
    setTimeout(() => {
      setDownloadToast(null);
    }, 4500);
  };

  // Copy full prompt formatted for external chatbots (ChatGPT, Claude, Gemini, DeepSeek, etc.)
  const handleCopyPlanningPrompt = async () => {
    soundEngine.playGentleChime();
    const activeChronotype = prefs.chronotype || 'balanced';
    const assumedPace = derivePaceFromSensoryState(prefs.sensoryState, prefs.currentEnergy);
    const combinedInstructions = [
      prefs.plannerCustomInstructions?.trim(),
      oneTimeInstructions.trim(),
    ].filter(Boolean).join('\n');

    const prompt = buildChatbotPlanningPrompt({
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
    }, language);

    try {
      await navigator.clipboard.writeText(prompt);
      setIsPromptCopied(true);
      setCopyToast(t('planner.copyPromptSuccess', 'Planning prompt copied! Paste it into ChatGPT, Claude, or any chatbot.'));
      setTimeout(() => setIsPromptCopied(false), 2500);
      setTimeout(() => setCopyToast(null), 4500);
    } catch (err) {
      console.error('Clipboard copy error:', err);
    }
  };

  // Import schedule response from external AI chatbot
  const handleImportAiResponse = () => {
    if (!importText.trim()) return;
    try {
      soundEngine.playGentleChime();
      const plan = parseScheduleFromAiResponse(importText, selectedDate);
      storage.saveDayPlan(plan);
      setDayPlan(plan);
      setShowImportModal(false);
      setShowConfigModal(false);
      setImportText('');
      setImportError(null);
      setDownloadToast(t('planner.importSuccess', 'Schedule imported successfully!'));
      setTimeout(() => setDownloadToast(null), 4500);
    } catch (err: any) {
      soundEngine.playPop();
      setImportError(err?.message || t('planner.importInvalidError', 'Could not find a valid schedule in the pasted text.'));
    }
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
      
      {/* Top Banner: Date Navigation & Chevron-Style Expandable Area */}
      <section className="p-4 sm:p-5 rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-2xs transition-all">
        <div className="flex items-center justify-between gap-3">
          
          {/* Date Selector with Next / Prev */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#F2F8EE] dark:bg-[#141F12] p-1 rounded-2xl border border-[#DCEAD4] dark:border-[#2A3E26]">
              <button
                type="button"
                onClick={() => setSelectedDate((prev) => shiftDate(prev, -1))}
                className="p-2 rounded-xl text-[#33462E] dark:text-[#C8DEC2] hover:bg-white dark:hover:bg-[#1F2D1C] transition-colors cursor-pointer"
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
                className="p-2 rounded-xl text-[#33462E] dark:text-[#C8DEC2] hover:bg-white dark:hover:bg-[#1F2D1C] transition-colors cursor-pointer"
                title={language === 'fa' ? 'روز بعد' : 'Next Day'}
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>

            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayKey())}
                className="px-3 py-2 rounded-xl bg-[#F2F8EE] dark:bg-[#141F12] text-xs font-bold text-[#3B7E10] dark:text-[#80D141] border border-[#DCEAD4] dark:border-[#2A3E26] hover:bg-[#E2F5D1] transition-colors cursor-pointer"
              >
                {t('planner.jumpToday', 'Jump to Today')}
              </button>
            )}
          </div>

          {/* Chevron Expand Button */}
          <button
            type="button"
            id="btn-toggle-planner-header-actions"
            onClick={() => {
              soundEngine.playPop();
              setIsHeaderExpanded((prev) => !prev);
            }}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              isHeaderExpanded
                ? 'bg-[#E8F8D8] dark:bg-[#1E3800] border-[#80D141] text-[#1C3700] dark:text-[#80D141] shadow-2xs'
                : 'bg-[#F2F8EE] dark:bg-[#141F12] border-[#DCEAD4] dark:border-[#2A3E26] text-[#33462E] dark:text-[#C8DEC2] hover:bg-[#E2F5D1] dark:hover:bg-[#1F2D1C]'
            }`}
            aria-expanded={isHeaderExpanded}
            aria-label={
              isHeaderExpanded
                ? (language === 'fa' ? 'بستن گزینه‌ها' : 'Collapse options')
                : (language === 'fa' ? 'نمایش گزینه‌ها' : 'Expand options')
            }
            title={
              isHeaderExpanded
                ? (language === 'fa' ? 'بستن گزینه‌ها' : 'Collapse options')
                : (language === 'fa' ? 'گزینه‌های برنامه' : 'Schedule options')
            }
          >
            <motion.div
              animate={{ rotate: isHeaderExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </button>
        </div>

        {/* Chevron-Style Expandable Area: Download .txt and Clear Plan buttons */}
        <AnimatePresence>
          {isHeaderExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-[#DCEAD4] dark:border-[#22301F] flex items-center gap-2.5 flex-wrap">
                {/* Download Plan as Text File Button */}
                <button
                  type="button"
                  id="btn-download-schedule-txt"
                  onClick={handleDownloadSchedule}
                  disabled={!dayPlan || dayPlan.scheduleBlocks.length === 0}
                  className="px-3.5 py-2 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] hover:bg-[#D6F0BF] dark:hover:bg-[#284B00] text-[#1C3700] dark:text-[#80D141] border border-[#80D141]/50 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                  title={t('planner.downloadTxtTitle', 'Download schedule as a readable text file for sharing or offline use')}
                >
                  <Download className="w-4 h-4" />
                  <span>{t('planner.downloadTxt', 'Download .txt')}</span>
                </button>

                {/* Clear All Plans / Clear Schedule Button */}
                <button
                  type="button"
                  id="btn-clear-plan"
                  onClick={handleClearPlan}
                  disabled={!dayPlan}
                  className="px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title={t('planner.clearPlan', 'Clear Plan')}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t('planner.clearPlan', 'Clear Plan')}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
            id="planner-api-key-alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-start gap-2.5 flex-1">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-medium">{errorMessage}</span>
                {(/quota|api key|کلید|تنظیمات/i.test(errorMessage) || !prefs.geminiApiKey?.trim()) && (
                  <button
                    id="btn-planner-go-to-settings"
                    type="button"
                    onClick={onOpenSettings}
                    className="mx-2 font-bold underline text-[#3B7E10] dark:text-[#80D141] hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    {t('planner.openSettingsLink', 'Go to Settings')}
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 rounded-full hover:bg-amber-200/50 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 transition-colors shrink-0 cursor-pointer"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {downloadToast && (
          <motion.div
            id="planner-download-success-toast"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-100 flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-300 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <span className="font-bold">{t('planner.downloadSuccess', 'Schedule exported to .txt successfully!')}</span>
                <span className="block text-[11px] opacity-80 font-mono truncate mt-0.5">
                  {downloadToast}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDownloadToast(null)}
              className="p-1 rounded-full hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 transition-colors shrink-0 cursor-pointer"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        {copyToast && (
          <motion.div
            id="planner-copy-toast"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3.5 rounded-2xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141] text-xs text-[#1C3700] dark:text-[#80D141] flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-[#80D141] text-[#0F2600] flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <span className="font-bold">{copyToast}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCopyToast(null)}
              className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[#1C3700] dark:text-[#80D141] transition-colors shrink-0 cursor-pointer"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Schedule Details or Pre-Generation Guide State */}
      {dayPlan ? (
        <div className="space-y-6">
          
          {/* Time-Blocked Schedule */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1 flex-wrap gap-2">
              <h3 className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-2">
                <span>{t('planner.schedule', 'Schedule')}</span>
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {dayPlan.scheduleBlocks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playPop();
                      const areAllOpen = dayPlan.scheduleBlocks.every((b) => expandedBlockIds.has(b.id));
                      if (areAllOpen) {
                        setExpandedBlockIds(new Set());
                      } else {
                        setExpandedBlockIds(new Set(dayPlan.scheduleBlocks.map((b) => b.id)));
                      }
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold text-[#3B4E37] dark:text-[#C5DDC0] bg-[#F2F8EE] dark:bg-[#141F12] hover:bg-[#E2F5D1] dark:hover:bg-[#1C2E17] border border-[#DCEAD4] dark:border-[#2A3E26] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    {dayPlan.scheduleBlocks.every((b) => expandedBlockIds.has(b.id)) ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {dayPlan.scheduleBlocks.every((b) => expandedBlockIds.has(b.id))
                        ? (language === 'fa' ? 'بستن همه' : 'Collapse All')
                        : (language === 'fa' ? 'نمایش همه' : 'Expand All')}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  id="btn-download-schedule-section"
                  onClick={handleDownloadSchedule}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold text-[#234A00] dark:text-[#80D141] bg-[#F2F8EE] dark:bg-[#141F12] hover:bg-[#E2F5D1] dark:hover:bg-[#1C2E17] border border-[#DCEAD4] dark:border-[#2A3E26] flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title={t('planner.downloadTxtTitle', 'Download schedule as a readable text file for sharing or offline use')}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('planner.downloadTxt', 'Download .txt')}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {dayPlan.scheduleBlocks.map((block, idx) => {
                const isBreak = block.isBreak || block.type === 'break' || block.type === 'micro_reset';
                const isExpanded = expandedBlockIds.has(block.id);
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
                    {/* Collapsed Top Header: Time, Duration, Energy Level, Title, and Chevron */}
                    <div
                      onClick={() => toggleExpandBlock(block.id)}
                      className="flex items-center justify-between gap-3 cursor-pointer select-none group"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
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

                        {/* Title of that time box / entry */}
                        <div className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4] truncate">
                          {block.title}
                        </div>
                      </div>

                      {/* Right: Expand / Collapse Down Arrow (Journal style) */}
                      <div className="shrink-0 self-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandBlock(block.id);
                          }}
                          className={`p-1.5 rounded-full transition-all cursor-pointer ${
                            isExpanded
                              ? 'bg-[#EDF6E8] dark:bg-[#202E1E] text-[#151E14] dark:text-[#E8F2E4]'
                              : 'text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] hover:text-[#151E14] dark:hover:text-[#E8F2E4]'
                          }`}
                          title={isExpanded ? t('journal.hideButtons') : t('journal.showButtons')}
                          aria-label={isExpanded ? t('journal.hideButtons') : t('journal.showButtons')}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-[#3B7E10] dark:text-[#80D141]' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Downward Expandable Area: Description and Bottom Buttons */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={(e) => e.stopPropagation()}
                          className="overflow-hidden cursor-default"
                        >
                          <div className="mt-3 pt-3 border-t border-[#DCEAD4] dark:border-[#263722] space-y-3">
                            {/* Description of the task */}
                            {block.executiveRationale && (
                              <div className="text-xs text-[#485B44] dark:text-[#9EB598] leading-relaxed">
                                {block.executiveRationale}
                              </div>
                            )}

                            {/* Buttons at the bottom of the entry */}
                            <div className="flex items-center gap-2 flex-wrap pt-0.5">
                              {!isBreak && (
                                <button
                                  type="button"
                                  onClick={() => onSendToFocusTimer(block.title, block.durationMinutes)}
                                  className="px-3 py-1.5 rounded-full bg-[#EDF6E8] dark:bg-[#202E1E] hover:bg-[#DDF4CD] text-[#163300] dark:text-[#A2EB68] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
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
                                  className="px-3 py-1.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] hover:bg-[#D5F7B8] text-[#1C3700] dark:text-[#A2EB68] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-75 cursor-pointer"
                                  title="Generate gentle 2-minute starter steps"
                                >
                                  {generatingStepsBlockId === block.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3B7E10] dark:text-[#80D141]" />
                                  ) : (
                                    <Sparkles className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
                                  )}
                                  <span>
                                    {generatingStepsBlockId === block.id ? (language === 'fa' ? 'در حال تولید...' : 'Generating...') : t('planner.helpMeStart', 'Help me start')}
                                  </span>
                                  {block.microStarterSteps && block.microStarterSteps.length > 0 && (
                                    isStepsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Expandable 2-Minute Micro Starter Steps */}
                            <AnimatePresence>
                              {isStepsOpen && block.microStarterSteps && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden mt-2 pt-2 border-t border-[#DCEAD4]/70 dark:border-[#2A3E26]/70"
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
                                            className={`w-full text-start p-2 rounded-xl flex items-center gap-2 text-xs transition-colors cursor-pointer ${
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
        <section className="p-8 sm:p-10 rounded-[32px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 mx-auto flex items-center justify-center text-[#234A00] dark:text-[#80D141]">
            <Calendar className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-display text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {language === 'fa' 
                ? `هیچ برنامه‌ای برای ${getRelativeDayLabel(selectedDate, language)} تنظیم نشده است`
                : `No Schedule Planned for ${getRelativeDayLabel(selectedDate, language)}`}
            </h3>
            <p className="text-xs text-[#556D50] dark:text-[#8EA887] leading-relaxed">
              {language === 'fa'
                ? 'با هوش مصنوعی برنامه روزانه‌تان را متناسب با سطح انرژی تنظیم کنید، یا پرامپت را در چت‌جی‌پی‌تی/کلود کپی کرده و پاسخ را وارد کنید.'
                : 'Structure your day with energy-aware AI scheduling, or copy the prompt into ChatGPT or Claude and paste the response back here.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
            <button
              type="button"
              onClick={handleOpenConfigModal}
              className="px-5 py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('planner.planSchedule', 'Plan Schedule')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playPop();
                setShowImportModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#F2F8EE] dark:bg-[#141F12] hover:bg-[#E2F5D1] dark:hover:bg-[#1E2E1B] text-[#33462E] dark:text-[#C8DEC2] border border-[#DCEAD4] dark:border-[#2A3E26] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ClipboardPaste className="w-4 h-4 text-[#3B7E10] dark:text-[#80D141]" />
              <span>{t('planner.importChatbotResponse', 'Import AI Response')}</span>
            </button>
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
                  className="p-2 rounded-xl text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] hover:bg-[#EAEFE6] dark:hover:bg-[#1C281A] transition-colors cursor-pointer"
                  aria-label={t('common.close', 'Close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8 py-6">
              <div className="max-w-2xl mx-auto space-y-5 text-xs">
                {!hasActiveAiKey(prefs) && (
                  <div className="p-4 rounded-2xl bg-[#E8F8D8]/70 dark:bg-[#1E3800]/50 border border-[#80D141]/60 text-xs text-[#1C3700] dark:text-[#E8FAD6] space-y-2.5 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-[#3B7E10] dark:text-[#80D141] shrink-0 mt-0.5" />
                      <div className="flex-1 leading-relaxed">
                        <span className="font-bold">
                          {t('planner.noKeyChatbotAlternative', 'No API key? You can copy the planning prompt to use ChatGPT, Claude, or Gemini for free, then import the response here.')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleCopyPlanningPrompt}
                        className="px-3.5 py-1.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95"
                      >
                        {isPromptCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isPromptCopied ? (language === 'fa' ? 'کپی شد!' : 'Copied!') : t('planner.copyPromptShort', 'Copy Prompt')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playPop();
                          setShowImportModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E2E1B] border border-[#DCEAD4] dark:border-[#2B4026] text-[#2B4622] dark:text-[#C5DDC0] font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-[#F2F8EE]"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
                        <span>{t('planner.importChatbotResponse', 'Import AI Response')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowConfigModal(false);
                          onOpenSettings();
                        }}
                        className="px-2 py-1 text-[11px] underline text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] cursor-pointer"
                      >
                        {t('planner.openSettingsLink', 'Go to Settings')}
                      </button>
                    </div>
                  </div>
                )}

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
            <div className="shrink-0 sticky bottom-0 z-20 bg-[#F7FAF4]/95 dark:bg-[#121B11]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 border-t border-[#DCEAD4] dark:border-[#22301F] flex items-center justify-between gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#F2F8EE] dark:bg-[#1A2617] text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#E2F5D1] transition-colors cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>

                {/* Import AI Response Button */}
                <button
                  type="button"
                  id="btn-planner-import-modal-open"
                  onClick={() => {
                    soundEngine.playPop();
                    setShowImportModal(true);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1E2E1B] hover:bg-[#EDF6E8] dark:hover:bg-[#263722] text-[#33462E] dark:text-[#C8DEC2] border border-[#DCEAD4] dark:border-[#2E402B] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={t('planner.importChatbotResponse', 'Import AI Response')}
                >
                  <ClipboardPaste className="w-4 h-4 text-[#3B7E10] dark:text-[#80D141]" />
                  <span>{t('planner.importChatbotResponse', 'Import AI Response')}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap flex-1 sm:flex-initial justify-end">
                {/* Copy Prompt for Chatbot Button placed right next to Start Planning */}
                <button
                  type="button"
                  id="btn-planner-copy-prompt"
                  onClick={handleCopyPlanningPrompt}
                  className="px-4 py-2.5 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] hover:bg-[#D5F7B8] dark:hover:bg-[#284B00] text-[#1C3700] dark:text-[#80D141] border border-[#80D141]/60 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-2xs"
                  title={t('planner.copyPrompt', 'Copy Prompt for Chatbot')}
                >
                  {isPromptCopied ? <Check className="w-4 h-4 text-[#3B7E10] dark:text-[#80D141]" /> : <Copy className="w-4 h-4" />}
                  <span>{isPromptCopied ? (language === 'fa' ? 'پرامپت کپی شد!' : 'Prompt Copied!') : t('planner.copyPromptShort', 'Copy Prompt')}</span>
                </button>

                {/* Start Planning / Re-optimize Button */}
                <button
                  type="button"
                  id="btn-planner-start-planning"
                  onClick={handleGenerateSchedule}
                  disabled={isGenerating}
                  className="px-6 py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{dayPlan ? t('planner.reoptimize', 'Re-optimize Schedule') : t('planner.startPlanning', 'Start Planning')}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Schedule from AI Chatbot Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#263722] rounded-[28px] shadow-2xl overflow-hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label={t('planner.importModalTitle', 'Import Schedule from AI Chatbot')}
            >
              {/* Header */}
              <div className="p-5 border-b border-[#DCEAD4] dark:border-[#263722] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#1C3700] dark:text-[#80D141]">
                    <ClipboardPaste className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {t('planner.importModalTitle', 'Import Schedule from AI Chatbot')}
                    </h3>
                    <p className="text-[11px] text-[#556D50] dark:text-[#8EA887]">
                      {t('planner.importModalDesc', 'Paste the response from ChatGPT, Claude, Gemini, or any AI tool to instantly load your schedule into Lerni.')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportError(null);
                  }}
                  className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#485B44] dark:text-[#9EB598] transition-colors cursor-pointer"
                  aria-label={t('common.close', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <div className="text-[11px] text-[#485B44] dark:text-[#9EB598] bg-[#F4F8F0] dark:bg-[#141F12] p-3 rounded-xl border border-[#DCEAD4] dark:border-[#2A3E26] space-y-1">
                  <div className="font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {language === 'fa' ? 'راهنمای ۳ مرحله‌ای:' : 'Quick 3-Step Guide:'}
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 leading-relaxed">
                    <li>{language === 'fa' ? 'روی دکمه «کپی پرامپت» کلیک کنید تا تمام تنظیمات کپی شود.' : 'Click "Copy Prompt" in the planning settings.'}</li>
                    <li>{language === 'fa' ? 'آن را در چت‌جی‌پی‌تی (ChatGPT)، کلود یا هر چت‌بات رایگان پیست کنید.' : 'Paste it into ChatGPT, Claude, Gemini, or DeepSeek.'}</li>
                    <li>{language === 'fa' ? 'پاسخ یا کد JSON دریافتی را کپی کرده و در کادر زیر قرار دهید.' : 'Copy the chatbot response or JSON block and paste it below.'}</li>
                  </ol>
                </div>

                <textarea
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    if (importError) setImportError(null);
                  }}
                  placeholder={t('planner.importPlaceholder', 'Paste the chatbot response or JSON block here...')}
                  rows={8}
                  className="w-full p-3.5 rounded-2xl bg-[#F9FCF7] dark:bg-[#121B10] border border-[#DCEAD4] dark:border-[#2A3E26] text-xs font-mono text-[#151E14] dark:text-[#E8F2E4] placeholder:font-sans placeholder:text-[#79747E] dark:placeholder:text-[#7D917A] focus:outline-none focus:ring-2 focus:ring-[#80D141] resize-none"
                  autoFocus
                />

                {importError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <span>{importError}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#DCEAD4] dark:border-[#263722] bg-[#F7FAF4] dark:bg-[#141F12] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportError(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#485B44] dark:text-[#9EB598] hover:bg-[#EAEFE6] dark:hover:bg-[#1E2E1B] transition-colors cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  id="btn-submit-import-schedule"
                  onClick={handleImportAiResponse}
                  disabled={!importText.trim()}
                  className="px-5 py-2 rounded-xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>{t('planner.importSubmit', 'Import Schedule')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
