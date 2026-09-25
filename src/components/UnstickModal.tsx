import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Zap, Play, CheckCircle2, Circle, RefreshCw } from 'lucide-react';
import { BujoEntry, MicroStep, EnergyLevel } from '../types';
import { soundEngine } from '../utils/audioSynth';
import { useI18n, toPersianDigits } from '../utils/i18n';
import confetti from 'canvas-confetti';

interface UnstickModalProps {
  entry: BujoEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateEntry: (updated: BujoEntry) => void;
  onSendToFocusTimer: (taskTitle: string, minutes: number) => void;
  currentEnergy: EnergyLevel;
}

const DEFAULT_TASK_FA_MAP: Record<string, string> = {
  'Send reply to schedule dental cleaning': 'ارسال پاسخ برای تعیین وقت دندانپزشکی',
  '3:00 PM Focus sprint with body double': 'ساعت ۱۵:۰۰ اسپرینت تمرکز با همراه',
  'Brown noise in Focus Tracker made writing feel 50% easier today!': 'نویز قهوه‌ای در بخش تایمر نوشتن را ۵۰٪ آسان‌تر کرد!',
  'Put clean laundry from dryer into basket': 'جمع‌آوری لباس‌های تمیز از خشک‌کن در سبد',
};

const DEFAULT_MICRO_STEP_TITLES_FA: Record<string, string> = {
  'Open email app or tab': 'باز کردن برنامه یا تب ایمیل',
  'Find dentist email and click Reply': 'یافتن ایمیل دندانپزشکی و زدن دکمه پاسخ',
  'Hit Send and close the tab': 'ارسال ایمیل و بستن تب',
  'Open the space or file for "Send reply to schedule dental cleaning"': 'باز کردن برنامه ایمیل برای پاسخ به نوبت دندانپزشکی',
  'Do the first 2 minutes of "Send reply to schedule dental cleaning"': 'انجام ۲ دقیقه اول پاسخ به نوبت دندانپزشکی',
  'Review what you touched and pause': 'بررسی کار انجام‌شده و یک مکث کوتاه',
  'Open a blank page and type 1 ugly draft sentence': 'باز کردن یک صفحه خالی و نوشتن ۱ جمله چرک‌نویس',
  'Write for 3 uninterrupted minutes': '۳ دقیقه نوشتن متوالی بدون وقفه و بدون ویرایش',
  'Pick up just 3 items or clear 1 small surface': 'برداشتن فقط ۳ وسیله یا مرتب‌سازی یک سطح کوچک',
  'Put on upbeat music and do a 3-minute quick sprint': 'پخش یک موسیقی پرانرژی و یک تکاپوی سریع ۳ دقیقه‌ای',
  'Find the phone number, link, or paperwork': 'پیدا کردن شماره تماس، لینک یا مدارک لازم',
  'Dial or open the portal': 'شماره‌گیری یا ورود به سامانه مورد نظر',
};

const DEFAULT_MICRO_STEP_TIPS_FA: Record<string, string> = {
  'Just open it, do not read other emails.': 'فقط بازش کن، هیچ ایمیل دیگری را نخوان.',
  'Use a 1-sentence template: "Tuesday at 10am works for me, thank you!"': 'از یک الگوی تک‌جمله‌ای استفاده کن: «سه‌شنبه ساعت ۱۰ برای من عالیه، متشکرم!»',
  'Dopamine win unlocked.': 'پیروزی دوپامینی ثبت شد!',
  'Just sit down and look at it. No obligation to write or do anything yet.': 'فقط بنشین و به آن نگاه کن. هنوز هیچ الزامی به نوشتن یا کاری نداری.',
  'Doing 1% is infinitely better than 0%. Set a gentle pace.': 'انجام دادن ۱٪ بی‌نهایت بهتر از ۰٪ است. با ریتم ملایم پیش برو.',
  'Acknowledge your effort. You overcame task initiation friction!': 'تلاش خود را تحسین کن. بر سد اولیه شروع کار غلبه کردی!',
  'Lower your standards completely. Permitted to be messy.': 'استانداردها را کاملاً پایین بیاور. پیش‌نویس حق دارد نامرتب باشد.',
  'Do not edit while typing. Let thoughts flow.': 'هنگام نوشتن ویرایش نکن. بگذار افکار آزادانه جاری شوند.',
  'Focus solely on this tiny square foot of space.': 'فقط روی همین چند وجب تمرکز کن، نه کل فضا.',
  'Stop whenever the 3 minutes end.': 'به محض پایان ۳ دقیقه می‌توانی متوقف شوی.',
  "Just locate the info. Don't start the call yet.": 'فقط اطلاعات را آماده کن. هنوز نیازی به برقراری تماس نیست.',
  'Take a deep breath and relax your shoulders.': 'یک نفس عمیق بکش و شانه‌هایت را رها کن.',
};

export const getLocalizedTaskTitle = (content: string, isPersian: boolean): string => {
  if (!isPersian) return content;
  return DEFAULT_TASK_FA_MAP[content] || content;
};

export const getLocalizedStepTitle = (title: string, isPersian: boolean): string => {
  if (!isPersian) return title;
  return DEFAULT_MICRO_STEP_TITLES_FA[title] || title;
};

export const getLocalizedStepTip = (tip: string | undefined, isPersian: boolean): string | undefined => {
  if (!tip || !isPersian) return tip;
  return DEFAULT_MICRO_STEP_TIPS_FA[tip] || tip;
};

export const UnstickModal: React.FC<UnstickModalProps> = ({
  entry,
  isOpen,
  onClose,
  onUpdateEntry,
  onSendToFocusTimer,
  currentEnergy,
}) => {
  const { t, language } = useI18n();
  const isPersian = language === 'fa';

  const [affirmation, setAffirmation] = useState('');
  const [contextInput, setContextInput] = useState('');

  // Sync affirmation when modal opens or language changes
  useEffect(() => {
    if (isOpen) {
      setAffirmation(t('unstick.affirmation'));
    }
  }, [isOpen, language, t]);

  if (!isOpen || !entry) return null;

  const handleGenerateMicroSteps = () => {
    soundEngine.playGentleChime();

    // Instant local heuristic task decomposition
    const taskName = isPersian ? getLocalizedTaskTitle(entry.content.trim(), true) : entry.content.trim();
    const isWriting = /write|email|essay|draft|message|text|نویس|ایمیل|پیام|مقاله|نامه/i.test(entry.content) || /write|email|essay|draft|message|text|نویس|ایمیل|پیام|مقاله|نامه/i.test(taskName);
    const isCleaning = /clean|tidy|wash|dishes|laundry|organize|تمیز|شست|مرتب|ظرف|لباس|اتاق/i.test(entry.content) || /clean|tidy|wash|dishes|laundry|organize|تمیز|شست|مرتب|ظرف|لباس|اتاق/i.test(taskName);
    const isCallOrAdmin = /call|schedule|book|pay|bill|form|tax|dental|cleaning|تماس|زنگ|پرداخت|قبض|فرم|ثبت|اداری|دندان/i.test(entry.content) || /call|schedule|book|pay|bill|form|tax|تماس|زنگ|پرداخت|قبض|فرم|ثبت|اداری/i.test(taskName);

    let step1Title = isPersian 
      ? `باز کردن فضا، برنامه یا پیام مربوط به «${taskName}»`
      : `Open the space or file for "${taskName}"`;
    let step1Tip = isPersian
      ? 'فقط بنشین و به آن نگاه کن. هنوز هیچ الزامی به نوشتن یا انجام کاری نداری.'
      : 'Just sit down and look at it. No obligation to write or do anything yet.';
    let step2Title = isPersian
      ? `انجام فقط ۲ دقیقه ابتدایی از «${taskName}»`
      : `Do the first 2 minutes of "${taskName}"`;
    let step2Tip = isPersian
      ? 'انجام دادن ۱٪ بی‌نهایت بهتر از ۰٪ است. با ریتمی آرام پیش برو.'
      : 'Doing 1% is infinitely better than 0%. Set a gentle pace.';
    let step3Title = isPersian
      ? `بررسی کار انجام‌شده و یک مکث کوتاه`
      : `Review what you touched and pause`;
    let step3Tip = isPersian
      ? 'تلاش خودت را تحسین کن. بر مقاومت اولیه شروع کار غلبه کردی!'
      : 'Acknowledge your effort. You overcame task initiation friction!';

    if (isWriting) {
      step1Title = isPersian
        ? `باز کردن یک صفحه خالی و نوشتن ۱ جمله چرک‌نویس`
        : `Open a blank page and type 1 ugly draft sentence`;
      step1Tip = isPersian
        ? 'استانداردها را کاملاً پایین بیاور. این پیش‌نویس حق دارد نامرتب باشد.'
        : 'Lower your standards completely. Permitted to be messy.';
      step2Title = isPersian
        ? `۳ دقیقه نوشتن متوالی بدون وقفه و بدون ویرایش`
        : `Write for 3 uninterrupted minutes`;
      step2Tip = isPersian
        ? 'هنگام نوشتن ویرایش نکن. بگذار افکار آزادانه جاری شوند.'
        : 'Do not edit while typing. Let thoughts flow.';
    } else if (isCleaning) {
      step1Title = isPersian
        ? `برداشتن فقط ۳ وسیله یا خلوت کردن ۱ گوشه کوچک`
        : `Pick up just 3 items or clear 1 small surface`;
      step1Tip = isPersian
        ? 'فقط روی همین چند وجب تمرکز کن، نه کل فضا.'
        : 'Focus solely on this tiny square foot of space.';
      step2Title = isPersian
        ? `پخش یک موسیقی پرانرژی و یک تکاپوی سریع ۳ دقیقه‌ای`
        : `Put on upbeat music and do a 3-minute quick sprint`;
      step2Tip = isPersian
        ? 'به محض پایان ۳ دقیقه می‌توانی متوقف شوی.'
        : 'Stop whenever the 3 minutes end.';
    } else if (isCallOrAdmin) {
      step1Title = isPersian
        ? `پیدا کردن شماره تماس، پیام یا مدارک مربوط به «${taskName}»`
        : `Find the phone number, link, or paperwork`;
      step1Tip = isPersian
        ? 'فقط اطلاعات را آماده کن. هنوز نیازی به برقراری تماس یا اقدام نیست.'
        : 'Just locate the info. Don\'t start the call yet.';
      step2Title = isPersian
        ? `انجام اولین اقدام ۱ دقیقه‌ای برای «${taskName}»`
        : `Dial or open the portal`;
      step2Tip = isPersian
        ? 'یک نفس عمیق بکش و شانه‌هایت را رها کن.'
        : 'Take a deep breath and relax your shoulders.';
    }

    const localMicroSteps: MicroStep[] = [
      {
        id: `ms-${Date.now()}-1`,
        title: step1Title,
        completed: false,
        durationMinutes: 1,
        energyCost: 'low',
        tip: step1Tip,
      },
      {
        id: `ms-${Date.now()}-2`,
        title: step2Title,
        completed: false,
        durationMinutes: 2,
        energyCost: 'low',
        tip: step2Tip,
      },
      {
        id: `ms-${Date.now()}-3`,
        title: step3Title,
        completed: false,
        durationMinutes: 1,
        energyCost: 'low',
        tip: step3Tip,
      },
    ];

    setAffirmation(t('unstick.affirmation'));
    onUpdateEntry({
      ...entry,
      microSteps: localMicroSteps,
    });
  };

  const handleToggleStep = (stepId: string) => {
    if (!entry.microSteps) return;
    const updatedSteps = entry.microSteps.map((s) => {
      if (s.id !== stepId) return s;
      const isNowCompleted = !s.completed;
      if (isNowCompleted) {
        soundEngine.playGentleChime();
        try {
          confetti({
            particleCount: 20,
            spread: 40,
            origin: { y: 0.7 },
          });
        } catch (e) {}
      } else {
        soundEngine.playPop();
      }
      return { ...s, completed: isNowCompleted };
    });

    const allCompleted = updatedSteps.every((s) => s.completed);

    onUpdateEntry({
      ...entry,
      microSteps: updatedSteps,
      status: allCompleted ? 'completed' : entry.status,
    });
  };

  const microSteps = entry.microSteps || [];
  const completedCount = microSteps.filter((s) => s.completed).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      dir={isPersian ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-[#F8FAF5] dark:bg-[#141C13] flex flex-col overflow-hidden text-start"
    >
      {/* Top Header Bar */}
      <div className="w-full bg-[#EDF6E8] dark:bg-[#182316] border-b border-[#D8E8D0] dark:border-[#263722] px-4 sm:px-8 py-3.5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#80D141] text-[#0F2600] flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {t('unstick.title')}
            </h2>
            <p className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
              {t('unstick.subtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label={t('unstick.close')}
          title={t('unstick.close')}
          className="p-2 sm:px-4 sm:py-2 rounded-full bg-[#EDF6E8] dark:bg-[#202E1E] hover:bg-[#DCEAD4] dark:hover:bg-[#2A3D26] text-[#3B4E37] dark:text-[#B6CCB0] text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
          <span className="hidden sm:inline">{t('unstick.close')}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="max-w-2xl mx-auto w-full space-y-5">
          {/* Task Spotlight Banner */}
          <div className="p-4 rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#3B7E10] dark:text-[#80D141] mb-1">
              {t('unstick.stickyTask')}
            </div>
            <div className="text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {getLocalizedTaskTitle(entry.content, isPersian)}
            </div>
          </div>

          {/* Affirmation Note if present */}
          {affirmation && (
            <div className="p-3.5 rounded-2xl bg-[#E8F8D8]/60 dark:bg-[#1E3800] border border-[#80D141]/50 dark:border-[#3B7E10] flex items-center gap-2.5 text-xs text-[#1C3700] dark:text-[#80D141]">
              <span className="text-lg">💖</span>
              <p className="font-semibold italic leading-relaxed">
                {isPersian ? `«${affirmation}»` : `"${affirmation}"`}
              </p>
            </div>
          )}

          {/* If no microsteps generated yet, show Generate Button */}
          {microSteps.length === 0 ? (
          <div className="space-y-4 text-center py-4">
            <p className="text-xs text-[#485B44] dark:text-[#9EB598] max-w-md mx-auto font-medium">
              {t('unstick.desc')}
            </p>

            <div className="text-start">
              <label className="block text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] mb-1">
                {t('unstick.optionalNote')}
              </label>
              <input
                type="text"
                value={contextInput}
                onChange={(e) => setContextInput(e.target.value)}
                placeholder={t('unstick.notePlaceholder')}
                className="w-full px-4 py-2.5 rounded-full bg-[#EDF6E8] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141] font-medium"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerateMicroSteps}
              className="w-full py-3.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('unstick.sliceBtn')}</span>
            </motion.button>
          </div>
        ) : (
          /* Micro-Steps List */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#151E14] dark:text-[#E8F2E4]">
                {t('unstick.microActions')} (
                {t('unstick.doneCount')
                  .replace('{done}', isPersian ? toPersianDigits(completedCount) : String(completedCount))
                  .replace('{total}', isPersian ? toPersianDigits(microSteps.length) : String(microSteps.length))}
                )
              </span>
              <button
                onClick={handleGenerateMicroSteps}
                className="text-[#3B7E10] dark:text-[#80D141] font-bold hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{t('unstick.regenerate')}</span>
              </button>
            </div>

            <div className="space-y-2">
              {microSteps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    step.completed
                      ? 'bg-[#E1F6D0] dark:bg-[#1B3618] border-[#72C833] dark:border-[#529E25] shadow-xs'
                      : 'bg-white dark:bg-[#1C281A] border-[#DCEAD4] dark:border-[#263722]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => handleToggleStep(step.id)}
                      className="flex items-start gap-2.5 text-start flex-1 min-w-0"
                    >
                      <div className="mt-0.5 text-[#3B7E10] dark:text-[#80D141]">
                        {step.completed ? (
                          <CheckCircle2 className="w-5 h-5 fill-[#80D141] text-[#0F2600]" />
                        ) : (
                          <Circle className="w-5 h-5 text-[#79747E] dark:text-[#CAC4D0]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141]">
                            {t('unstick.step')} {isPersian ? toPersianDigits(idx + 1) : idx + 1}
                          </span>
                          <span className="text-[10px] font-bold text-[#485B44] dark:text-[#9EB598]">
                            ~{isPersian ? toPersianDigits(step.durationMinutes) : step.durationMinutes} {t('unstick.min')}
                          </span>
                        </div>
                        <div
                          className={`text-xs sm:text-sm font-bold mt-1 transition-all ${
                            step.completed
                              ? 'text-[#18360D] dark:text-[#E2FBD0]'
                              : 'text-[#151E14] dark:text-[#E8F2E4]'
                          }`}
                        >
                          {getLocalizedStepTitle(step.title, isPersian)}
                        </div>
                        {step.tip && (
                          <div className="text-[11px] text-[#485B44] dark:text-[#9EB598] mt-1 font-medium italic">
                            💡 {t('unstick.tip')}: {getLocalizedStepTip(step.tip, isPersian)}
                          </div>
                        )}
                      </div>
                    </button>

                    {/* Launch into Focus Timer */}
                    {!step.completed && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          onSendToFocusTimer(getLocalizedStepTitle(step.title, isPersian), step.durationMinutes || 3);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] hover:bg-[#D4F0B8] text-[#1C3700] dark:text-[#80D141] text-xs font-bold flex items-center gap-1 shrink-0"
                        title={t('unstick.startTimerTip')}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span className="hidden sm:inline">{t('unstick.timer')}</span>
                      </motion.button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="w-full border-t border-[#D8E8D0] dark:border-[#263722] bg-[#EDF6E8]/95 dark:bg-[#182316]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-end shrink-0">
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs sm:text-sm font-bold shadow-md active:scale-95 transition-all"
        >
          {t('unstick.done')}
        </button>
      </div>
    </motion.div>
  );
};
