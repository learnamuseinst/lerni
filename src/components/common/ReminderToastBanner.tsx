import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, Clock, X, Sparkles, Volume2, AlertTriangle } from 'lucide-react';
import { ActiveReminderAlert } from '../../utils/reminderManager';
import { useI18n, toPersianDigits } from '../../utils/i18n';
import { soundEngine } from '../../utils/audioSynth';

interface ReminderToastBannerProps {
  alerts: ActiveReminderAlert[];
  onDismiss: (alertId: string) => void;
  onSnooze: (alert: ActiveReminderAlert, minutes: number) => void;
  onCompleteItem?: (entryId: string, entryType: 'task' | 'event' | 'habit') => void;
}

export const ReminderToastBanner: React.FC<ReminderToastBannerProps> = ({
  alerts,
  onDismiss,
  onSnooze,
  onCompleteItem,
}) => {
  const { t, language } = useI18n();
  const isFa = language === 'fa';

  // For Strong reminders: play audio pulse every 3 seconds until dismissed or snoozed
  useEffect(() => {
    const hasStrong = alerts.some((a) => a.intensity === 'strong');
    if (!hasStrong) return;

    soundEngine.playStrongAlarmPulse();

    const interval = setInterval(() => {
      soundEngine.playStrongAlarmPulse();
    }, 3000);

    return () => clearInterval(interval);
  }, [alerts]);

  if (!alerts || alerts.length === 0) return null;

  return (
    <div
      id="container-reminder-toasts"
      className="fixed top-4 sm:top-6 inset-x-0 z-50 flex flex-col items-center pointer-events-none px-4 gap-2.5 max-w-xl mx-auto"
    >
      <AnimatePresence>
        {alerts.map((alert) => {
          const isStrong = alert.intensity === 'strong';

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -25, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              className={`w-full pointer-events-auto rounded-3xl bg-white dark:bg-[#182617] shadow-2xl p-4 sm:p-4.5 text-[#151E14] dark:text-[#E8F2E4] relative overflow-hidden backdrop-blur-md transition-all ${
                isStrong
                  ? 'border-2 border-rose-500 dark:border-rose-500 shadow-rose-500/20 ring-4 ring-rose-500/20'
                  : 'border-2 border-[#80D141] dark:border-[#80D141]'
              }`}
              role="alert"
              aria-live="assertive"
            >
              {/* Ambient accent pulse line */}
              <div
                className={`absolute top-0 inset-x-0 h-1.5 ${
                  isStrong
                    ? 'bg-gradient-to-r from-rose-600 via-amber-400 to-rose-600 animate-pulse'
                    : 'bg-gradient-to-r from-[#80D141] via-[#B2F082] to-[#80D141]'
                }`}
              />

              <div className="flex items-start gap-3">
                {/* Glowing Icon */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                    isStrong
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 border border-rose-400 dark:border-rose-700 animate-bounce'
                      : 'bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] border border-[#80D141]/50'
                  }`}
                >
                  {isStrong ? (
                    <AlertTriangle className="w-5 h-5 fill-current" />
                  ) : (
                    <Bell className="w-5 h-5 fill-current" />
                  )}
                </div>

                {/* Title & Info */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {/* Strong Indicator Pill */}
                    {isStrong && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <span>{isFa ? 'یادآور شدید (تکرار ۳ ثانیه)' : 'Strong (Repeats every 3s)'}</span>
                      </span>
                    )}

                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] border border-[#80D141]/40">
                      {alert.entryType === 'event'
                        ? (isFa ? 'رویداد' : 'Event')
                        : alert.entryType === 'habit'
                        ? (isFa ? 'عادت' : 'Habit')
                        : (isFa ? 'وظیفه' : 'Task')}
                    </span>

                    <span className="text-[11px] font-semibold text-[#485B44] dark:text-[#9EB598] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#80D141]" />
                      <span>{alert.reminderLabel}</span>
                      {alert.time && (
                        <span className="font-bold text-[#151E14] dark:text-[#E8F2E4]">
                          • {isFa ? toPersianDigits(alert.time) : alert.time}
                        </span>
                      )}
                    </span>
                  </div>

                  <h4 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4] leading-snug break-words">
                    {alert.title}
                  </h4>

                  {/* Action Buttons Row */}
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#DCEAD4]/80 dark:border-[#2A3E26] flex-wrap">
                    {/* Complete Action for Tasks & Habits */}
                    {onCompleteItem && (alert.entryType === 'task' || alert.entryType === 'habit') && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playGentleChime();
                          onCompleteItem(alert.entryId, alert.entryType);
                          onDismiss(alert.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{isFa ? 'انجام شد' : 'Mark Done'}</span>
                      </button>
                    )}

                    {/* Snooze 5 minutes */}
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playPop();
                        onSnooze(alert, 5);
                        onDismiss(alert.id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#EDF6E8] dark:bg-[#202E1E] hover:bg-[#DDF4CD] text-[#2F6B12] dark:text-[#9DD97A] border border-[#DCEAD4] dark:border-[#2C4027] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{isFa ? 'به‌تعویق ۵ دقیقه' : 'Snooze 5m'}</span>
                    </button>

                    {/* Dismiss */}
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playPop();
                        onDismiss(alert.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ml-auto ${
                        isStrong
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                          : 'text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E]'
                      }`}
                    >
                      {isFa ? 'بستن / رد کردن' : 'Dismiss Alert'}
                    </button>
                  </div>
                </div>

                {/* Close Button Top Right */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playPop();
                    onDismiss(alert.id);
                  }}
                  className="p-1 rounded-full text-[#79747E] dark:text-[#8D9E8A] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] transition-colors shrink-0 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

