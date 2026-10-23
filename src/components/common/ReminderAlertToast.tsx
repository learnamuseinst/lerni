import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, Clock, X, Calendar, CheckSquare, Sparkles } from 'lucide-react';
import { FiredReminderAlert } from '../../utils/reminderService';
import { useI18n } from '../../utils/i18n';
import { soundEngine } from '../../utils/audioSynth';

interface ReminderAlertToastProps {
  alerts: FiredReminderAlert[];
  onDismiss: (alertId: string) => void;
  onSnooze: (alert: FiredReminderAlert, minutes: number) => void;
  onCompleteItem: (alert: FiredReminderAlert) => void;
}

export const ReminderAlertToast: React.FC<ReminderAlertToastProps> = ({
  alerts,
  onDismiss,
  onSnooze,
  onCompleteItem,
}) => {
  const { t, language } = useI18n();
  const isFa = language === 'fa';

  if (!alerts || alerts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed top-4 sm:top-6 inset-x-0 z-50 flex flex-col items-center pointer-events-none px-3 sm:px-4 space-y-2.5 max-w-lg mx-auto"
    >
      <AnimatePresence>
        {alerts.map((alert) => {
          const isTask = alert.itemType === 'task';
          const isEvent = alert.itemType === 'event';
          const isHabit = alert.itemType === 'habit';

          const icon = isTask ? (
            <CheckSquare className="w-5 h-5 text-[#80D141]" />
          ) : isEvent ? (
            <Calendar className="w-5 h-5 text-amber-500" />
          ) : (
            <Sparkles className="w-5 h-5 text-emerald-500" />
          );

          const typeLabel = isTask
            ? t('reminders.taskReminder', 'Task Reminder')
            : isEvent
            ? t('reminders.eventReminder', 'Event Reminder')
            : t('reminders.habitReminder', 'Habit Reminder');

          return (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, y: -25, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full pointer-events-auto rounded-[24px] bg-white dark:bg-[#182416] border-2 border-[#80D141] shadow-2xl p-4 sm:p-4.5 flex flex-col gap-3 backdrop-blur-md"
            >
              {/* Header row with Type & Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#3B7E10] dark:text-[#80D141] uppercase tracking-wider">
                        {typeLabel}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EDF6E8] dark:bg-[#202E1E] text-[#485B44] dark:text-[#A6BC9F] border border-[#DCEAD4] dark:border-[#263722]">
                        {alert.label}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#151E14] dark:text-[#E8F2E4] truncate mt-0.5">
                      {alert.title}
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playPop();
                    onDismiss(alert.id);
                  }}
                  className="p-1.5 rounded-full text-[#79747E] hover:text-[#151E14] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                  title={t('common.close', 'Dismiss')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action buttons row */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#DCEAD4]/70 dark:border-[#273823]/70">
                {/* Snooze 5 min */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playPop();
                    onSnooze(alert, 5);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#EDF6E8] dark:bg-[#202E1E] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] text-xs font-bold text-[#3B4E37] dark:text-[#A6BC9F] border border-[#DCEAD4] dark:border-[#263722] flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={t('reminders.snooze5Tooltip', 'Remind again in 5 minutes')}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t('reminders.snooze5', 'Snooze 5m')}</span>
                </button>

                {/* Complete Item Action */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playGentleChime();
                    onCompleteItem(alert);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{t('reminders.markDone', 'Mark Done')}</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
