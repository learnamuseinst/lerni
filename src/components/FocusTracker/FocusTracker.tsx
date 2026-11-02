import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  Timer, 
  Sparkles, 
  Coffee, 
  CheckCircle2, 
  Sliders, 
  Radio, 
  Heart,
  TrendingUp,
  Award,
  Clock,
  Layers,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { FocusTimerMode, FocusSession, AmbientSoundType, UserPreferences, FocusTab, DEFAULT_FOCUS_TAB_ORDER, FocusTimerPreset, DEFAULT_FOCUS_PRESETS } from '../../types';
import { getTodayDateString } from '../../utils/storage';
import { soundEngine } from '../../utils/audioSynth';
import { useI18n, toPersianDigits } from '../../utils/i18n';
import { TimeTracker } from './TimeTracker';

interface FocusTrackerProps {
  sessions: FocusSession[];
  onAddSession: (session: FocusSession) => void;
  activeTaskAnchor?: string;
  activeTaskDuration?: number;
  onClearTaskAnchor?: () => void;
  ambientSound: AmbientSoundType;
  ambientVolume: number;
  onUpdatePrefs: (updated: Partial<UserPreferences>) => void;
  setIsRunningToNav?: (isRunning: boolean) => void;
  focusTabOrder?: FocusTab[];
  customFocusPresets?: FocusTimerPreset[];
}

export const FocusTracker: React.FC<FocusTrackerProps> = ({
  sessions,
  onAddSession,
  activeTaskAnchor = '',
  activeTaskDuration,
  onClearTaskAnchor,
  ambientSound,
  ambientVolume,
  onUpdatePrefs,
  setIsRunningToNav,
  focusTabOrder,
  customFocusPresets,
}) => {
  const { t, language } = useI18n();

  const effectiveTabOrder: FocusTab[] = (focusTabOrder && focusTabOrder.length === 2)
    ? focusTabOrder
    : DEFAULT_FOCUS_TAB_ORDER;

  const [activeTab, setActiveTab] = useState<FocusTab>(() => {
    return (focusTabOrder && focusTabOrder[0]) ? focusTabOrder[0] : 'focus';
  });

  const hasManuallySelectedTab = useRef(false);

  const presetsList: FocusTimerPreset[] = (customFocusPresets && customFocusPresets.length > 0)
    ? customFocusPresets
    : DEFAULT_FOCUS_PRESETS;

  // Preset manager modal & form state
  const [showPresetManagerModal, setShowPresetManagerModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<FocusTimerPreset | null>(null);
  const [isCreatingNewPreset, setIsCreatingNewPreset] = useState(false);
  const [presetFormLabel, setPresetFormLabel] = useState('');
  const [presetFormMinutes, setPresetFormMinutes] = useState(25);
  const [presetFormIcon, setPresetFormIcon] = useState('⚡');
  const [presetFormDesc, setPresetFormDesc] = useState('');
  const [presetFormError, setPresetFormError] = useState<string | null>(null);
  const [presetSuccessMsg, setPresetSuccessMsg] = useState<string | null>(null);

  // Dispatch modal state change when preset manager full screen view opens/closes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('app:modal-state-change', { detail: { isOpen: showPresetManagerModal } }));
    return () => {
      window.dispatchEvent(new CustomEvent('app:modal-state-change', { detail: { isOpen: false } }));
    };
  }, [showPresetManagerModal]);

  const [mode, setMode] = useState<FocusTimerMode>(() => {
    return presetsList[0]?.id || 'sprint_5';
  });
  const [customMinutes, setCustomMinutes] = useState(20);
  const [durationSeconds, setDurationSeconds] = useState(5 * 60);
  const [secondsRemaining, setSecondsRemaining] = useState(5 * 60);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [taskName, setTaskName] = useState(activeTaskAnchor || '');
  const [category, setCategory] = useState('Focus');

  // If focusTabOrder changes externally (e.g. from settings) and no timer is running, update default active tab
  useEffect(() => {
    if (!isRunning && !hasManuallySelectedTab.current && !activeTaskAnchor) {
      setActiveTab(effectiveTabOrder[0]);
    }
  }, [effectiveTabOrder, isRunning, activeTaskAnchor]);

  // Checkpoint Reminder State (Anti-side-quest prompt)
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const checkpointTimerRef = useRef<number | null>(null);

  // Reflection Modal after session complete
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [completedSessionDuration, setCompletedSessionDuration] = useState(0);
  const [reflectionRating, setReflectionRating] = useState(4);
  const [reflectionNote, setReflectionNote] = useState('');

  // Dynamically map presets to modes with bilingual localized fallbacks
  const modes: { id: FocusTimerMode; label: string; minutes: number; icon: string; desc: string; rawPreset: FocusTimerPreset }[] = presetsList.map((preset) => {
    let label = preset.label;
    let desc = preset.desc || '';
    if (preset.id === 'sprint_5' && preset.label === 'Dopamine Sprint') {
      label = t('focus.modeSprint');
      desc = t('focus.modeSprintDesc');
    } else if (preset.id === 'burst_15' && preset.label === 'Focus Burst') {
      label = t('focus.modeBurst');
      desc = t('focus.modeBurstDesc');
    } else if (preset.id === 'pomodoro_25' && preset.label === 'Pomodoro') {
      label = t('focus.modePomodoro');
      desc = t('focus.modePomodoroDesc');
    } else if (preset.id === 'deep_45' && preset.label === 'Deep Immersion') {
      label = t('focus.modeDeep');
      desc = t('focus.modeDeepDesc');
    } else if (preset.id === 'flowmodoro' && preset.label === 'Flowmodoro') {
      label = t('focus.modeFlow');
      desc = t('focus.modeFlowDesc');
    } else if (preset.id === 'custom' && preset.label === 'Custom') {
      label = t('focus.modeCustom');
      desc = t('focus.modeCustomDesc');
    }
    return {
      id: preset.id as FocusTimerMode,
      label,
      minutes: preset.minutes,
      icon: preset.icon,
      desc,
      rawPreset: preset,
    };
  });

  const sounds: { id: AmbientSoundType; label: string; icon: string; desc: string }[] = [
    { id: 'off', label: t('focus.soundOff'), icon: '🔇', desc: t('focus.soundOffDesc') },
    { id: 'brown', label: t('focus.soundBrown'), icon: '🔊', desc: t('focus.soundBrownDesc') },
    { id: 'pink', label: t('focus.soundPink'), icon: '🌧️', desc: t('focus.soundPinkDesc') },
    { id: 'binaural_40hz', label: t('focus.soundBinaural'), icon: '🧠', desc: t('focus.soundBinauralDesc') },
    { id: 'rain_hum', label: t('focus.soundRain'), icon: '🌿', desc: t('focus.soundRainDesc') },
  ];

  // Update task name if activeTaskAnchor changes
  useEffect(() => {
    if (activeTaskAnchor) {
      setTaskName(activeTaskAnchor);
      setActiveTab('focus');
    }
  }, [activeTaskAnchor]);

  // Update timer mode and duration when activeTaskDuration is provided
  useEffect(() => {
    if (activeTaskDuration && activeTaskDuration > 0) {
      const matched = modes.find((m) => m.minutes === activeTaskDuration && m.id !== 'flowmodoro' && m.id !== 'custom');
      if (matched) {
        setMode(matched.id);
        const sec = matched.minutes * 60;
        setDurationSeconds(sec);
        setSecondsRemaining(sec);
        setSecondsElapsed(0);
        setIsRunning(false);
      } else {
        setMode('custom');
        setCustomMinutes(activeTaskDuration);
        const sec = activeTaskDuration * 60;
        setDurationSeconds(sec);
        setSecondsRemaining(sec);
        setSecondsElapsed(0);
        setIsRunning(false);
      }
    }
  }, [activeTaskDuration, activeTaskAnchor]);

  // Set duration when mode changes
  const handleSelectMode = (newMode: FocusTimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    if (newMode === 'custom') {
      const sec = customMinutes * 60;
      setDurationSeconds(sec);
      setSecondsRemaining(sec);
      setSecondsElapsed(0);
    } else {
      const selected = modes.find((m) => m.id === newMode);
      if (selected) {
        if (selected.minutes === 0 || selected.id === 'flowmodoro') {
          setDurationSeconds(0);
          setSecondsRemaining(0);
          setSecondsElapsed(0);
        } else {
          const sec = selected.minutes * 60;
          setDurationSeconds(sec);
          setSecondsRemaining(sec);
          setSecondsElapsed(0);
        }
      }
    }
    soundEngine.playPop();
  };

  // Preset Management Handlers
  const handleOpenAddPreset = () => {
    soundEngine.playPop();
    setEditingPreset(null);
    setIsCreatingNewPreset(true);
    setPresetFormLabel('');
    setPresetFormMinutes(25);
    setPresetFormIcon('🎯');
    setPresetFormDesc('');
    setPresetFormError(null);
  };

  const handleOpenEditPreset = (preset: FocusTimerPreset) => {
    soundEngine.playPop();
    setEditingPreset(preset);
    setIsCreatingNewPreset(false);
    setPresetFormLabel(preset.label);
    setPresetFormMinutes(preset.minutes);
    setPresetFormIcon(preset.icon || '⏱️');
    setPresetFormDesc(preset.desc || '');
    setPresetFormError(null);
  };

  const handleCancelPresetForm = () => {
    soundEngine.playPop();
    setEditingPreset(null);
    setIsCreatingNewPreset(false);
    setPresetFormError(null);
  };

  const handleSavePresetForm = () => {
    const cleanLabel = presetFormLabel.trim();
    if (!cleanLabel) {
      setPresetFormError(language === 'fa' ? 'لطفاً نام پیش‌تنظیم را وارد کنید.' : 'Please enter a preset name.');
      return;
    }
    const cleanMins = Math.max(0, Math.min(360, Number(presetFormMinutes) || 0));
    const cleanIcon = presetFormIcon.trim() || '⏱️';
    const cleanDesc = presetFormDesc.trim() || undefined;

    let updatedList: FocusTimerPreset[];
    if (isCreatingNewPreset) {
      const newPreset: FocusTimerPreset = {
        id: `preset_${Date.now()}`,
        label: cleanLabel,
        minutes: cleanMins,
        icon: cleanIcon,
        desc: cleanDesc,
      };
      updatedList = [...presetsList, newPreset];
    } else if (editingPreset) {
      updatedList = presetsList.map((p) =>
        p.id === editingPreset.id
          ? {
              ...p,
              label: cleanLabel,
              minutes: cleanMins,
              icon: cleanIcon,
              desc: cleanDesc,
            }
          : p
      );
    } else {
      return;
    }

    soundEngine.playGentleChime();
    onUpdatePrefs({ customFocusPresets: updatedList });
    setPresetSuccessMsg(language === 'fa' ? 'پیش‌تنظیم با موفقیت ذخیره شد!' : 'Preset saved successfully!');
    setTimeout(() => setPresetSuccessMsg(null), 3000);
    setEditingPreset(null);
    setIsCreatingNewPreset(false);
    setPresetFormError(null);
  };

  const handleDeletePreset = (presetId: string) => {
    if (presetsList.length <= 1) {
      setPresetFormError(language === 'fa' ? 'حداقل یک پیش‌تنظیم باید حفظ شود.' : 'At least one preset must be kept.');
      return;
    }
    soundEngine.playPop();
    const updatedList = presetsList.filter((p) => p.id !== presetId);
    onUpdatePrefs({ customFocusPresets: updatedList });
    if (mode === presetId) {
      const fallback = updatedList[0];
      handleSelectMode(fallback.id as FocusTimerMode);
    }
    setPresetSuccessMsg(language === 'fa' ? 'پیش‌تنظیم حذف شد.' : 'Preset removed.');
    setTimeout(() => setPresetSuccessMsg(null), 3000);
    if (editingPreset?.id === presetId) {
      setEditingPreset(null);
      setIsCreatingNewPreset(false);
    }
  };

  const handleResetPresets = () => {
    soundEngine.playPop();
    onUpdatePrefs({ customFocusPresets: DEFAULT_FOCUS_PRESETS });
    setPresetSuccessMsg(language === 'fa' ? 'پیش‌تنظیم‌ها به پیش‌فرض بازگشتند.' : 'Presets restored to defaults.');
    setTimeout(() => setPresetSuccessMsg(null), 3000);
    setEditingPreset(null);
    setIsCreatingNewPreset(false);
    setPresetFormError(null);
  };

  const handleCustomMinutesChange = (newMins: number) => {
    const clamped = Math.max(1, Math.min(180, newMins));
    setCustomMinutes(clamped);
    if (mode === 'custom' && !isRunning) {
      const sec = clamped * 60;
      setDurationSeconds(sec);
      setSecondsRemaining(sec);
      setSecondsElapsed(0);
    }
  };

  // Timer Tick Hook
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        if (mode === 'flowmodoro') {
          setSecondsElapsed((prev) => prev + 1);
        } else {
          setSecondsRemaining((prev) => {
            if (prev <= 1) {
              handleSessionComplete();
              return 0;
            }
            return prev - 1;
          });
          setSecondsElapsed((prev) => prev + 1);
        }
      }, 1000);
    }

    if (setIsRunningToNav) {
      setIsRunningToNav(isRunning);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode]);

  // Ambient sound sync
  useEffect(() => {
    if (isRunning && ambientSound !== 'off') {
      soundEngine.setVolume(ambientVolume);
      soundEngine.playAmbient(ambientSound);
    } else {
      soundEngine.stopAmbient();
    }
    return () => {
      soundEngine.stopAmbient();
    };
  }, [isRunning, ambientSound, ambientVolume]);

  const handleTogglePlay = () => {
    if (!isRunning) {
      soundEngine.playPop();
      setIsRunning(true);
      // Optional 10-minute check in for side quests
      if (checkpointTimerRef.current) clearTimeout(checkpointTimerRef.current);
      checkpointTimerRef.current = window.setTimeout(() => {
        if (isRunning) {
          setShowCheckpoint(true);
          soundEngine.playGentleChime();
        }
      }, 10 * 60 * 1000);
    } else {
      soundEngine.playPop();
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    soundEngine.playPop();
    setIsRunning(false);
    if (mode === 'flowmodoro') {
      setSecondsElapsed(0);
    } else {
      setSecondsRemaining(durationSeconds);
      setSecondsElapsed(0);
    }
  };

  const handleSessionComplete = () => {
    setIsRunning(false);
    soundEngine.playGentleChime();
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7e57c2', '#9c27b0', '#ffb74d', '#4caf50']
      });
    } catch (e) {}

    const totalSeconds = mode === 'flowmodoro' ? secondsElapsed : durationSeconds;
    setCompletedSessionDuration(totalSeconds);
    setShowReflectionModal(true);
  };

  const handleSaveReflection = () => {
    const newSession: FocusSession = {
      id: `fs-${Date.now()}`,
      timestamp: Date.now(),
      date: getTodayDateString(),
      durationSeconds: completedSessionDuration,
      mode,
      taskTitle: taskName.trim() || 'General Focus Burst',
      category: category.trim() || 'General',
      moodRating: reflectionRating,
      notes: reflectionNote.trim() || undefined,
    };

    onAddSession(newSession);
    setShowReflectionModal(false);
    setReflectionNote('');
    handleReset();
    if (onClearTaskAnchor) onClearTaskAnchor();
  };

  // Format MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const str = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return language === 'fa' ? toPersianDigits(str) : str;
  };

  // Progress percentage
  const progressPct =
    mode === 'flowmodoro'
      ? Math.min(100, (secondsElapsed / 1800) * 100) // visual pulse
      : durationSeconds > 0
      ? ((durationSeconds - secondsRemaining) / durationSeconds) * 100
      : 0;

  // Stats today
  const today = getTodayDateString();
  const todaySessions = sessions.filter((s) => s.date === today);
  const totalFocusSecondsToday = todaySessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalFocusMinutesToday = Math.round(totalFocusSecondsToday / 60);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-20 space-y-6">
      
      {/* Top Panel: Focus / Tracker Toggle */}
      <div className="flex items-center justify-center pt-1">
        <div className="inline-flex items-center bg-[#EDF6E8] dark:bg-[#182316] p-1.5 rounded-2xl border border-[#DCEAD4] dark:border-[#263722] shadow-xs">
          {effectiveTabOrder.map((tabId) => {
            const isFocus = tabId === 'focus';
            const Icon = isFocus ? Timer : Clock;
            const label = isFocus ? t('timer.tabFocus') : t('timer.tabTracker');
            const isCurrent = activeTab === tabId;

            return (
              <button
                key={tabId}
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  hasManuallySelectedTab.current = true;
                  setActiveTab(tabId);
                }}
                className={`relative px-5 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isCurrent
                    ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                    : 'text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'tracker' ? (
        <TimeTracker setIsRunningToNav={setIsRunningToNav} />
      ) : (
        <>
          {/* Visual Timer Hero Container */}
          <div className="p-6 sm:p-8 rounded-[28px] bg-white dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-xs relative overflow-hidden">
        
        {/* Ambient Glow / Pulse Background */}
        {isRunning && (
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.35, 0.15] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-gradient-to-br from-[#80D141] to-[#469B14] blur-3xl pointer-events-none -z-0"
          />
        )}

        <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* Left Column (Desktop): Presets, Focus Modes & Custom Duration */}
          <div className="lg:col-span-6 space-y-4 flex flex-col justify-center order-2 lg:order-1">
            <div className="flex items-center justify-between px-1 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#485B44] dark:text-[#9EB598] uppercase tracking-wider">
                  {t('focus.presetsAndModes')}
                </span>
                <button
                  type="button"
                  id="btn-focus-manage-presets"
                  onClick={() => {
                    soundEngine.playPop();
                    setShowPresetManagerModal(true);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] text-[#245209] dark:text-[#80D141] text-xs font-bold flex items-center gap-1.5 border border-[#DCEAD4] dark:border-[#263722] transition-colors cursor-pointer shadow-2xs active:scale-95"
                  title={t('focus.managePresets', 'Manage Presets')}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{t('focus.managePresets', 'Manage Presets')}</span>
                </button>
              </div>
              <div className="text-[11px] font-bold text-[#3B7E10] dark:text-[#80D141]">
                {modes.find((m) => m.id === mode)?.desc || ''}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMode(m.id)}
                  className={`p-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-between text-center min-h-[96px] gap-1.5 ${
                    mode === m.id
                      ? 'bg-[#80D141] text-[#0F2600] shadow-md border border-[#80D141]'
                      : 'bg-[#EDF6E8] dark:bg-[#1C281A] hover:bg-[#E8F8D8] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722]'
                  }`}
                >
                  <span className="text-base">{m.icon}</span>
                  <span className="leading-tight text-center">{m.label}</span>
                  {m.minutes > 0 ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      mode === m.id
                        ? 'bg-[#0F2600]/15 text-[#0F2600]'
                        : 'bg-[#DCEAD4] dark:bg-[#263722] text-[#485B44] dark:text-[#9EB598]'
                    }`}>
                      {language === 'fa' ? toPersianDigits(m.minutes) : m.minutes}{t('focus.minsUnit')}
                    </span>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      mode === m.id
                        ? 'bg-[#0F2600]/15 text-[#0F2600]'
                        : 'bg-[#DCEAD4] dark:bg-[#263722] text-[#485B44] dark:text-[#9EB598]'
                    }`}>
                      {m.id === 'flowmodoro' ? t('focus.modeFlow') : t('focus.modeCustom')}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Custom Duration Controller (Active when Custom mode selected) */}
            {mode === 'custom' && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] w-full"
              >
                {/* Quick preset values */}
                <div className="flex items-center justify-center flex-wrap gap-1.5">
                  <span className="text-[11px] font-bold text-[#485B44] dark:text-[#9EB598] mr-1">
                    {t('focus.quick')}
                  </span>
                  {[10, 20, 30, 45, 60, 90].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        soundEngine.playPop();
                        handleCustomMinutesChange(preset);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                        customMinutes === preset
                          ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                          : 'bg-[#F8FAF5] dark:bg-[#253522] text-[#485B44] dark:text-[#9EB598] hover:bg-[#E8F8D8]'
                      }`}
                    >
                      {language === 'fa' ? toPersianDigits(preset) : preset}{t('focus.minsUnit')}
                    </button>
                  ))}
                </div>

                {/* Stepper & manual input */}
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#485B44] dark:text-[#9EB598] mr-1">
                    {t('focus.duration')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playPop();
                      handleCustomMinutesChange(customMinutes - 5);
                    }}
                    className="w-8 h-8 rounded-xl bg-[#F8FAF5] dark:bg-[#253522] text-xs font-bold flex items-center justify-center hover:bg-[#E8F8D8] text-[#151E14] dark:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#263722]"
                    title="-5"
                  >
                    -5
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={customMinutes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) handleCustomMinutesChange(val);
                    }}
                    className="w-14 text-center px-1.5 py-1 rounded-xl bg-[#F8FAF5] dark:bg-[#253522] text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#263722] focus:outline-none focus:ring-1 focus:ring-[#80D141]"
                  />
                  <span className="text-xs text-[#485B44] dark:text-[#9EB598] font-semibold">{t('focus.minsUnit')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playPop();
                      handleCustomMinutesChange(customMinutes + 5);
                    }}
                    className="w-8 h-8 rounded-xl bg-[#F8FAF5] dark:bg-[#253522] text-xs font-bold flex items-center justify-center hover:bg-[#E8F8D8] text-[#151E14] dark:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#263722]"
                    title="+5"
                  >
                    +5
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column (Desktop): Task Anchor, Timer Gauge Circle & Controls */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center space-y-5 sm:space-y-6 order-1 lg:order-2">
            
            {/* Current Task Anchor Input */}
            <div className="w-full max-w-sm text-center">
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder={t('focus.anchorTaskPlaceholder')}
                className="w-full px-4 py-2 rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-center text-xs sm:text-sm font-semibold text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141] placeholder:text-[#79747E]"
              />
            </div>

            {/* Large Visual Liquid Gauge */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              
              {/* Circular SVG Gauge */}
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background track */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="text-[#DCEAD4] dark:text-[#263722]"
                  strokeWidth="6"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Active animated stroke */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  strokeWidth="6"
                  strokeDasharray={263.89}
                  strokeDashoffset={263.89 - (263.89 * progressPct) / 100}
                  strokeLinecap="round"
                  className="text-[#80D141]"
                  stroke="currentColor"
                  fill="transparent"
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
              </svg>

              {/* Time & State readout inside circle */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <div className="font-display font-black text-4xl sm:text-5xl text-[#151E14] dark:text-[#E8F2E4] tracking-tight">
                  {mode === 'flowmodoro' ? formatTime(secondsElapsed) : formatTime(secondsRemaining)}
                </div>

                <div className="text-xs font-bold text-[#485B44] dark:text-[#9EB598] mt-1 flex items-center gap-1">
                  <span>{isRunning ? `🔥 ${t('focus.flowActive')}` : `⏸️ ${t('focus.paused')}`}</span>
                </div>

                {taskName && (
                  <div className="text-[11px] font-semibold text-[#3B7E10] dark:text-[#80D141] mt-1 max-w-[170px] truncate">
                    "{taskName}"
                  </div>
                )}
              </div>

            </div>

            {/* Primary Controls */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleReset}
                className="w-12 h-12 rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-[#485B44] dark:text-[#9EB598] flex items-center justify-center shadow-xs active:scale-95"
                title={t('focus.reset')}
              >
                <RotateCcw className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleTogglePlay}
                className="px-8 py-3.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-display font-bold text-base sm:text-lg shadow-md active:scale-95 flex items-center gap-2.5"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" />
                    <span>{t('focus.pause')}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>{secondsElapsed > 0 ? t('focus.resume') : t('focus.start')}</span>
                  </>
                )}
              </motion.button>

              {/* Quick finish / Complete session early button */}
              {(isRunning || secondsElapsed > 30) && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handleSessionComplete}
                  className="w-12 h-12 rounded-2xl bg-[#E8F8D8] dark:bg-[#1E301B] border border-[#80D141]/50 text-[#1C3700] dark:text-[#80D141] flex items-center justify-center shadow-xs active:scale-95"
                  title={t('focus.finish')}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </motion.button>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Ambient Sound Synthesizer Card */}
      <div className="p-5 rounded-[28px] bg-white dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] space-y-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#80D141]" />
          <h3 className="font-display text-sm font-bold text-[#151E14] dark:text-[#E8F2E4]">
            {t('focus.synthTitle')}
          </h3>
        </div>

        {/* Ambient Noise Option Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {sounds.map((snd) => (
            <button
              key={snd.id}
              onClick={() => {
                onUpdatePrefs({ ambientSound: snd.id });
                if (isRunning) {
                  soundEngine.playAmbient(snd.id);
                }
                soundEngine.playPop();
              }}
              className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                ambientSound === snd.id
                  ? 'bg-[#E8F8D8] dark:bg-[#1E3800] border-[#80D141] text-[#1C3700] dark:text-[#80D141] font-bold shadow-xs'
                  : 'bg-white dark:bg-[#1C281A] border-[#DCEAD4] dark:border-[#263722] text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-base">{snd.icon}</span>
                {ambientSound === snd.id && isRunning && (
                  <span className="w-2 h-2 rounded-full bg-[#80D141] animate-ping" />
                )}
              </div>
              <div className="text-xs font-bold truncate">{snd.label}</div>
              <div className="text-[10px] text-[#485B44] dark:text-[#9EB598] line-clamp-1">
                {snd.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Focus Daily Summary & History */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* Minutes Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] flex items-center justify-center font-bold">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
              {t('focus.focusTimeToday')}
            </div>
            <div className="font-display text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {language === 'fa' ? toPersianDigits(totalFocusMinutesToday) : totalFocusMinutesToday} {t('focus.minsUnit')}
            </div>
          </div>
        </div>

        {/* Sessions Completed */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] text-[#3B7E10] dark:text-[#80D141] flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
              {t('focus.completedSprints')}
            </div>
            <div className="font-display text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {language === 'fa' ? toPersianDigits(todaySessions.length) : todaySessions.length} {t('focus.sessionsUnit')}
            </div>
          </div>
        </div>

      </div>

      {/* Gentle Non-Shaming Checkpoint Modal */}
      <AnimatePresence>
        {showCheckpoint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-md p-6 rounded-[28px] bg-white dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl text-center space-y-4"
            >
              <span className="text-3xl">⚓</span>
              <h3 className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                {t('focus.checkpointTitle')}
              </h3>
              <p className="text-xs text-[#485B44] dark:text-[#9EB598] leading-relaxed font-medium">
                {t('focus.checkpointBody').replace('{task}', taskName || (language === 'fa' ? 'تمرکز' : 'your focus task'))}
                <br />
                <span className="italic text-[#3B7E10] dark:text-[#80D141]">
                  {t('focus.checkpointSub')}
                </span>
              </p>

              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowCheckpoint(false);
                    soundEngine.playPop();
                  }}
                  className="px-5 py-2.5 rounded-full bg-[#EDF6E8] dark:bg-[#1C281A] text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#E8F8D8]"
                >
                  {t('focus.onTrack')}
                </button>
                <button
                  onClick={() => {
                    setShowCheckpoint(false);
                    soundEngine.playGentleChime();
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-md"
                >
                  {t('focus.reanchor')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post-Session Reflection Modal */}
      <AnimatePresence>
        {showReflectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              className="w-full max-w-md p-6 rounded-[28px] bg-white dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl space-y-4"
            >
              <div className="text-center space-y-1">
                <span className="text-3xl">🎉</span>
                <h3 className="font-display text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
                  {t('focus.sessionCompleted')}
                </h3>
                <p className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
                  {t('focus.focusedFor')
                    .replace('{mins}', language === 'fa' ? toPersianDigits(Math.round(completedSessionDuration / 60)) : String(Math.round(completedSessionDuration / 60)))
                    .replace('{task}', taskName || (language === 'fa' ? 'تمرکز' : 'Focus'))}
                </p>
              </div>

              {/* Mood / Flow Rating */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] text-center">
                  {t('focus.reflectionPrompt')}
                </label>
                <div className="flex justify-center gap-2">
                  {[
                    { rating: 1, label: language === 'fa' ? '😫 سخت / مه مغزی' : '😫 Hard/Foggy' },
                    { rating: 2, label: language === 'fa' ? '😐 متوسط' : '😐 Okay' },
                    { rating: 3, label: language === 'fa' ? '🙂 خوب' : '🙂 Good' },
                    { rating: 4, label: language === 'fa' ? '⚡ روان' : '⚡ Flowing' },
                    { rating: 5, label: language === 'fa' ? '🚀 غوطه‌وری کامل' : '🚀 Hyperfocus' },
                  ].map((r) => (
                    <button
                      key={r.rating}
                      onClick={() => setReflectionRating(r.rating)}
                      className={`p-2 rounded-xl text-xs transition-all flex flex-col items-center ${
                        reflectionRating === r.rating
                          ? 'bg-[#80D141] text-[#0F2600] font-bold shadow-xs'
                          : 'bg-[#EDF6E8] dark:bg-[#1C281A] text-[#485B44] dark:text-[#9EB598]'
                      }`}
                    >
                      <span>{r.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Win Note */}
              <div>
                <label className="block text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] mb-1">
                  {t('focus.winPrompt')}
                </label>
                <input
                  type="text"
                  value={reflectionNote}
                  onChange={(e) => setReflectionNote(e.target.value)}
                  placeholder={t('focus.winPlaceholder')}
                  className="w-full px-3 py-2 rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
                />
              </div>

              {/* Save */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleSaveReflection}
                  className="w-full py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-bold text-xs shadow-md"
                >
                  {t('focus.saveWin')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preset Manager Full-Screen View */}
      <AnimatePresence>
        {showPresetManagerModal && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-[#F4F8F1] dark:bg-[#0E170C] flex flex-col overflow-hidden"
          >
            {/* Top Navigation Bar */}
            <header className="h-16 sm:h-20 bg-white/95 dark:bg-[#152014]/95 backdrop-blur-md border-b border-[#DCEAD4] dark:border-[#263722] px-4 sm:px-8 flex items-center justify-between shrink-0 shadow-xs z-10">
              <div className="flex items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  id="btn-back-to-focus-timer"
                  onClick={() => {
                    soundEngine.playPop();
                    setShowPresetManagerModal(false);
                    setEditingPreset(null);
                    setIsCreatingNewPreset(false);
                    setPresetFormError(null);
                  }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#DDF4CD] dark:hover:bg-[#283A23] text-[#245209] dark:text-[#80D141] font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  {language === 'fa' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  <span>{language === 'fa' ? 'بازگشت به تایمر تمرکز' : 'Back to Focus Timer'}</span>
                </button>

                <div className="hidden md:flex items-center gap-2.5 border-l rtl:border-l-0 rtl:border-r border-[#DCEAD4] dark:border-[#263722] pl-3.5 rtl:pl-0 rtl:pr-3.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1E4300] dark:text-[#80D141] flex items-center justify-center shadow-xs">
                    <Sliders className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#151E14] dark:text-[#E8F2E4] font-display">
                      {t('focus.managePresets', 'Focus Timer Presets')}
                    </h2>
                    <p className="text-[11px] text-[#485B44] dark:text-[#9EB598]">
                      {language === 'fa'
                        ? 'شخصی‌سازی زمان‌ها، نمادها و حالت‌های تمرکز'
                        : 'Customize timer durations, emoji icons, and focus modes'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2">
                {!isCreatingNewPreset && !editingPreset && (
                  <>
                    <button
                      type="button"
                      id="btn-add-new-preset-header"
                      onClick={handleOpenAddPreset}
                      className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>{t('focus.addPreset', 'Add Preset')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetPresets}
                      className="hidden sm:flex px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] text-[#245209] dark:text-[#80D141] text-xs sm:text-sm font-bold border border-[#DCEAD4] dark:border-[#263722] items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
                      title={t('focus.resetPresets', 'Reset to Defaults')}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('focus.resetPresets', 'Reset Defaults')}</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playPop();
                    setShowPresetManagerModal(false);
                    setEditingPreset(null);
                    setIsCreatingNewPreset(false);
                    setPresetFormError(null);
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Scrollable Full-Screen Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
              <div className="max-w-5xl mx-auto space-y-6">

                {/* Success feedback toast */}
                <AnimatePresence>
                  {presetSuccessMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-sm font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5 shadow-sm"
                    >
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{presetSuccessMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error feedback toast */}
                <AnimatePresence>
                  {presetFormError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-sm font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2.5 shadow-sm"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>{presetFormError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* View 1: Form View when Creating or Editing */}
                {(isCreatingNewPreset || editingPreset) ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSavePresetForm();
                    }}
                    className="bg-white dark:bg-[#182316] rounded-3xl p-5 sm:p-8 shadow-sm border border-[#DCEAD4] dark:border-[#263722] space-y-6"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-[#DCEAD4] dark:border-[#263722]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1E4300] dark:text-[#80D141] flex items-center justify-center text-lg">
                          {presetFormIcon || '⏱️'}
                        </div>
                        <div>
                          <h3 className="font-bold text-base sm:text-lg text-[#151E14] dark:text-[#E8F2E4] font-display">
                            {isCreatingNewPreset
                              ? (language === 'fa' ? 'ایجاد پیش‌تنظیم جدید' : 'Create New Focus Preset')
                              : (language === 'fa' ? `ویرایش پیش‌تنظیم: ${presetFormLabel || ''}` : `Edit Preset: ${presetFormLabel || ''}`)}
                          </h3>
                          <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                            {language === 'fa'
                              ? 'تنظیمات زمان و نام پیش‌تنظیم را وارد کرده و پیش‌نمایش آن را در سمت راست مشاهده کنید'
                              : 'Configure duration, icon, and label, and review live card appearance'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCancelPresetForm}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] transition-colors cursor-pointer"
                      >
                        {language === 'fa' ? 'انصراف' : 'Cancel'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
                      {/* Left: Form Controls */}
                      <div className="lg:col-span-7 space-y-5">
                        {/* Preset Name */}
                        <div>
                          <label className="block text-xs sm:text-sm font-bold text-[#151E14] dark:text-[#E8F2E4] mb-1.5">
                            {t('focus.presetName', 'Preset Name')} *
                          </label>
                          <input
                            type="text"
                            value={presetFormLabel}
                            onChange={(e) => setPresetFormLabel(e.target.value)}
                            placeholder={t('focus.presetNamePlaceholder', 'e.g. Ultra Deep Work, Power Nap...')}
                            className="w-full px-4 py-3 rounded-2xl bg-[#F8FAF5] dark:bg-[#202D1D] border border-[#DCEAD4] dark:border-[#2E402B] text-sm text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141] font-semibold"
                            required
                            autoFocus
                          />
                        </div>

                        {/* Duration in Minutes */}
                        <div>
                          <label className="block text-xs sm:text-sm font-bold text-[#151E14] dark:text-[#E8F2E4] mb-1.5">
                            {t('focus.presetMinutes', 'Duration (Minutes, 0 for Flowmodoro)')} *
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min={0}
                              max={360}
                              value={presetFormMinutes}
                              onChange={(e) => setPresetFormMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="w-32 px-4 py-3 rounded-2xl bg-[#F8FAF5] dark:bg-[#202D1D] border border-[#DCEAD4] dark:border-[#2E402B] text-base text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141] font-mono text-center font-bold"
                              required
                            />
                            <span className="text-xs sm:text-sm text-[#485B44] dark:text-[#9EB598] font-medium">
                              {presetFormMinutes === 0
                                ? (language === 'fa' ? '🚀 شمارش رو به بالا (فلومودورو نامحدود)' : '🚀 Open-ended count-up flowmodoro')
                                : (language === 'fa' ? `${toPersianDigits(presetFormMinutes)} دقیقه تایمر معکوس` : `${presetFormMinutes} minutes countdown timer`)}
                            </span>
                          </div>

                          {/* Quick pick buttons */}
                          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                            <span className="text-xs text-[#485B44] dark:text-[#9EB598] font-bold mr-1">
                              {language === 'fa' ? 'انتخاب سریع:' : 'Quick set:'}
                            </span>
                            {[5, 15, 20, 25, 45, 60, 90, 0].map((mins) => (
                              <button
                                key={mins}
                                type="button"
                                onClick={() => {
                                  soundEngine.playPop();
                                  setPresetFormMinutes(mins);
                                }}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  presetFormMinutes === mins
                                    ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                                    : 'bg-[#F8FAF5] dark:bg-[#202D1D] text-[#485B44] dark:text-[#9EB598] hover:bg-[#E8F8D8] border border-[#DCEAD4] dark:border-[#2E402B]'
                                }`}
                              >
                                {mins === 0 ? (language === 'fa' ? 'فلومودورو' : 'Flow') : `${language === 'fa' ? toPersianDigits(mins) : mins}m`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Emoji Icon Picker */}
                        <div>
                          <label className="block text-xs sm:text-sm font-bold text-[#151E14] dark:text-[#E8F2E4] mb-1.5">
                            {t('focus.presetIcon', 'Emoji Icon')}
                          </label>
                          <div className="flex items-center gap-3 mb-2.5">
                            <input
                              type="text"
                              value={presetFormIcon}
                              onChange={(e) => setPresetFormIcon(e.target.value)}
                              maxLength={4}
                              className="w-16 h-12 rounded-2xl bg-[#F8FAF5] dark:bg-[#202D1D] border border-[#DCEAD4] dark:border-[#2E402B] text-2xl text-center focus:outline-none focus:ring-2 focus:ring-[#80D141] shadow-inner"
                            />
                            <span className="text-xs text-[#485B44] dark:text-[#9EB598]">
                              {language === 'fa' ? 'یا روی نمادهای پیشنهادی کلیک کنید:' : 'or click any icon below to select:'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {['⚡', '🎯', '🍅', '🌊', '🚀', '⏱️', '🧘', '☕', '💡', '🔥', '🏆', '🧠', '📚', '💻', '🌿', '✨', '⭐', '🎨'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  soundEngine.playPop();
                                  setPresetFormIcon(emoji);
                                }}
                                className={`w-10 h-10 rounded-2xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                                  presetFormIcon === emoji
                                    ? 'bg-[#80D141] scale-110 shadow-md ring-2 ring-[#80D141]'
                                    : 'bg-[#F8FAF5] dark:bg-[#202D1D] hover:bg-[#E8F8D8] dark:hover:bg-[#2A3E26] border border-[#DCEAD4] dark:border-[#2E402B]'
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-xs sm:text-sm font-bold text-[#151E14] dark:text-[#E8F2E4] mb-1.5">
                            {t('focus.presetDesc', 'Description (Optional)')}
                          </label>
                          <input
                            type="text"
                            value={presetFormDesc}
                            onChange={(e) => setPresetFormDesc(e.target.value)}
                            placeholder={t('focus.presetDescPlaceholder', 'e.g. 60 min sustained deep flow')}
                            className="w-full px-4 py-3 rounded-2xl bg-[#F8FAF5] dark:bg-[#202D1D] border border-[#DCEAD4] dark:border-[#2E402B] text-xs sm:text-sm text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
                          />
                        </div>
                      </div>

                      {/* Right: Live Interactive Tile Preview */}
                      <div className="lg:col-span-5 flex flex-col justify-between p-5 sm:p-6 rounded-3xl bg-[#F8FAF5] dark:bg-[#1E2B1A] border border-[#DCEAD4] dark:border-[#2A3E26]">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-[#3B7E10] dark:text-[#80D141] block mb-2">
                            {language === 'fa' ? 'پیش‌نمایش زنده کلید تایمر' : 'Live Tile Preview'}
                          </span>
                          <p className="text-xs text-[#485B44] dark:text-[#9EB598] mb-5">
                            {language === 'fa'
                              ? 'کلید انتخابی در نوار حالت‌های تایمر به این شکل نمایش داده خواهد شد:'
                              : 'This is how your preset button will appear in the focus timer bar:'}
                          </p>

                          {/* Preview Tile */}
                          <div className="max-w-[220px] mx-auto p-4 rounded-3xl bg-[#80D141] text-[#0F2600] shadow-md border border-[#80D141] flex flex-col items-center justify-between text-center min-h-[110px] gap-2">
                            <span className="text-2xl">{presetFormIcon || '⏱️'}</span>
                            <span className="font-bold text-sm leading-tight">
                              {presetFormLabel.trim() || (language === 'fa' ? 'نام پیش‌تنظیم' : 'Preset Name')}
                            </span>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#0F2600]/15 text-[#0F2600]">
                              {presetFormMinutes === 0
                                ? (language === 'fa' ? 'فلومودورو' : 'Flowmodoro')
                                : `${language === 'fa' ? toPersianDigits(presetFormMinutes) : presetFormMinutes} ${t('focus.minsUnit')}`}
                            </span>
                          </div>

                          {presetFormDesc && (
                            <p className="text-center text-xs text-[#485B44] dark:text-[#9EB598] mt-3 italic">
                              "{presetFormDesc}"
                            </p>
                          )}
                        </div>

                        {/* Form Action Buttons in Preview Column */}
                        <div className="flex items-center gap-3 pt-6 mt-6 border-t border-[#DCEAD4] dark:border-[#2A3E26]">
                          <button
                            type="button"
                            onClick={handleCancelPresetForm}
                            className="flex-1 py-3 rounded-2xl text-xs sm:text-sm font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#253522] transition-colors cursor-pointer text-center"
                          >
                            {language === 'fa' ? 'انصراف' : 'Cancel'}
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-3 rounded-2xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>{language === 'fa' ? 'ذخیره پیش‌تنظیم' : 'Save Preset'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                ) : (
                  /* View 2: Presets Grid List with Quick Actions */
                  <div className="space-y-6">
                    {/* Header Banner & Stats */}
                    <div className="bg-white dark:bg-[#182316] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#DCEAD4] dark:border-[#263722] flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#80D141] animate-pulse" />
                          <h3 className="font-bold text-base text-[#151E14] dark:text-[#E8F2E4] font-display">
                            {language === 'fa'
                              ? `${toPersianDigits(presetsList.length)} پیش‌تنظیم تمرکز پیکربندی‌شده`
                              : `${presetsList.length} Focus Presets Configured`}
                          </h3>
                        </div>
                        <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                          {language === 'fa'
                            ? 'روی هر پیش‌تنظیم کلیک کنید تا به عنوان حالت فعال تایمر انتخاب شود یا آن را ویرایش کنید'
                            : 'Click any preset to activate it immediately in the timer, or use Edit/Delete to customize'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          id="btn-add-new-preset-body"
                          onClick={handleOpenAddPreset}
                          className="px-4 py-2.5 rounded-2xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>{t('focus.addPreset', 'Add Preset')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleResetPresets}
                          className="px-3.5 py-2.5 rounded-2xl bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] text-[#245209] dark:text-[#80D141] text-xs sm:text-sm font-bold border border-[#DCEAD4] dark:border-[#263722] flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow-xs"
                          title={t('focus.resetPresets', 'Reset to Defaults')}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t('focus.resetPresets', 'Reset Defaults')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {presetsList.map((preset, idx) => {
                        const isCurrentActive = mode === preset.id;
                        return (
                          <div
                            key={preset.id || idx}
                            className={`p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                              isCurrentActive
                                ? 'bg-[#80D141]/10 dark:bg-[#80D141]/15 border-[#80D141] ring-2 ring-[#80D141]/30 shadow-sm'
                                : 'bg-white dark:bg-[#182316] border-[#DCEAD4] dark:border-[#263722] hover:border-[#80D141]/50 shadow-2xs'
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <span className="w-12 h-12 rounded-2xl bg-[#EDF6E8] dark:bg-[#263722] border border-[#DCEAD4] dark:border-[#33482E] flex items-center justify-center text-2xl shrink-0 shadow-xs">
                                  {preset.icon || '⏱️'}
                                </span>

                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  {isCurrentActive && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#80D141] text-[#0F2600] flex items-center gap-1 shadow-2xs">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                      <span>{language === 'fa' ? 'انتخاب‌شده' : 'Active'}</span>
                                    </span>
                                  )}
                                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EDF6E8] dark:bg-[#233520] text-[#3B7E10] dark:text-[#80D141] border border-[#D0E2C8] dark:border-[#2E432A]">
                                    {preset.minutes === 0
                                      ? (language === 'fa' ? 'فلومودورو' : 'Flowmodoro')
                                      : `${language === 'fa' ? toPersianDigits(preset.minutes) : preset.minutes} ${t('focus.minsUnit')}`}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-bold text-base text-[#151E14] dark:text-[#E8F2E4] truncate">
                                  {preset.label}
                                </h4>
                                {preset.desc ? (
                                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] line-clamp-2 mt-1">
                                    {preset.desc}
                                  </p>
                                ) : (
                                  <p className="text-xs text-[#79747E] dark:text-[#7D9179] mt-1 italic">
                                    {language === 'fa' ? 'بدون توضیح' : 'No description'}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="pt-3 border-t border-[#DCEAD4]/80 dark:border-[#263722] flex items-center justify-between gap-2">
                              {isCurrentActive ? (
                                <span className="text-xs font-bold text-[#3B7E10] dark:text-[#80D141] flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>{language === 'fa' ? 'در حال اجرا' : 'Current Mode'}</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSelectMode(preset.id as FocusTimerMode);
                                    soundEngine.playGentleChime();
                                    setPresetSuccessMsg(language === 'fa' ? `حالت ${preset.label} فعال شد!` : `Activated ${preset.label}!`);
                                    setTimeout(() => setPresetSuccessMsg(null), 2500);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-[#EDF6E8] dark:bg-[#22301F] hover:bg-[#DDF4CD] text-[#245209] dark:text-[#80D141] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                >
                                  {language === 'fa' ? 'انتخاب برای تایمر' : 'Set as Active'}
                                </button>
                              )}

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPreset(preset)}
                                  className="p-2 rounded-xl bg-[#F8FAF5] dark:bg-[#263722] hover:bg-[#E8F8D8] dark:hover:bg-[#2E4229] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#33482E] transition-all cursor-pointer shadow-2xs"
                                  title={t('focus.editPreset', 'Edit Preset')}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeletePreset(preset.id)}
                                  disabled={presetsList.length <= 1}
                                  className="p-2 rounded-xl bg-[#F8FAF5] dark:bg-[#263722] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#485B44] dark:text-[#9EB598] hover:text-rose-600 dark:hover:text-rose-400 border border-[#DCEAD4] dark:border-[#33482E] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                                  title={t('focus.deletePreset', 'Delete Preset')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Footer Bar */}
            <footer className="h-14 sm:h-16 bg-white/95 dark:bg-[#152014]/95 backdrop-blur-md border-t border-[#DCEAD4] dark:border-[#263722] px-4 sm:px-8 flex items-center justify-between text-xs sm:text-sm text-[#485B44] dark:text-[#9EB598] shrink-0">
              <span className="font-medium">
                {language === 'fa'
                  ? `${toPersianDigits(presetsList.length)} پیش‌تنظیم در دسترس در صفحه تمرکز`
                  : `${presetsList.length} presets available in Focus mode`}
              </span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  setShowPresetManagerModal(false);
                  setEditingPreset(null);
                  setIsCreatingNewPreset(false);
                }}
                className="px-5 py-2 rounded-xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-bold shadow-xs transition-colors cursor-pointer active:scale-95"
              >
                {language === 'fa' ? 'اتمام و بازگشت' : 'Done & Return'}
              </button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}

    </div>
  );
};
