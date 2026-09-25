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
  Layers
} from 'lucide-react';
import { FocusTimerMode, FocusSession, AmbientSoundType, UserPreferences, FocusTab, DEFAULT_FOCUS_TAB_ORDER } from '../../types';
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
}) => {
  const { t, language } = useI18n();

  const effectiveTabOrder: FocusTab[] = (focusTabOrder && focusTabOrder.length === 2)
    ? focusTabOrder
    : DEFAULT_FOCUS_TAB_ORDER;

  const [activeTab, setActiveTab] = useState<FocusTab>(() => {
    return (focusTabOrder && focusTabOrder[0]) ? focusTabOrder[0] : 'focus';
  });

  const hasManuallySelectedTab = useRef(false);

  const [mode, setMode] = useState<FocusTimerMode>('sprint_5');
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

  const modes: { id: FocusTimerMode; label: string; minutes: number; icon: string; desc: string }[] = [
    { id: 'sprint_5', label: t('focus.modeSprint'), minutes: 5, icon: '⚡', desc: t('focus.modeSprintDesc') },
    { id: 'burst_15', label: t('focus.modeBurst'), minutes: 15, icon: '🎯', desc: t('focus.modeBurstDesc') },
    { id: 'pomodoro_25', label: t('focus.modePomodoro'), minutes: 25, icon: '🍅', desc: t('focus.modePomodoroDesc') },
    { id: 'deep_45', label: t('focus.modeDeep'), minutes: 45, icon: '🌊', desc: t('focus.modeDeepDesc') },
    { id: 'flowmodoro', label: t('focus.modeFlow'), minutes: 0, icon: '🚀', desc: t('focus.modeFlowDesc') },
    { id: 'custom', label: t('focus.modeCustom'), minutes: 20, icon: '⏱️', desc: t('focus.modeCustomDesc') },
  ];

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
        const sec = selected.minutes * 60;
        setDurationSeconds(sec);
        setSecondsRemaining(sec);
        setSecondsElapsed(0);
      }
    }
    soundEngine.playPop();
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
          <div className="p-6 sm:p-8 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-xs relative overflow-hidden">
        
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
            <div className="flex items-center justify-between px-1">
              <div className="text-[11px] font-bold text-[#485B44] dark:text-[#9EB598] uppercase tracking-wider">
                {t('focus.presetsAndModes')}
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
      <div className="p-5 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] space-y-4">
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
        <div className="p-4 rounded-2xl bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] flex items-center gap-3">
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
        <div className="p-4 rounded-2xl bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] flex items-center gap-3">
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
              className="w-full max-w-md p-6 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl text-center space-y-4"
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
              className="w-full max-w-md p-6 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl space-y-4"
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
      </>
      )}

    </div>
  );
};
