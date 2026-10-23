import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Clock, Sparkles } from 'lucide-react';
import { EntryReminder } from '../../types';
import { ReminderPicker } from './ReminderPicker';
import { soundEngine } from '../../utils/audioSynth';
import { useI18n, toPersianDigits } from '../../utils/i18n';

interface QuickReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  itemType: 'task' | 'event' | 'habit';
  targetTime?: string;
  targetDate?: string;
  reminders: EntryReminder[];
  onSave: (reminders: EntryReminder[]) => void;
}

export const QuickReminderModal: React.FC<QuickReminderModalProps> = ({
  isOpen,
  onClose,
  title,
  itemType,
  targetTime,
  targetDate,
  reminders = [],
  onSave,
}) => {
  const { t, language } = useI18n();
  const isFa = language === 'fa';
  const [draftReminders, setDraftReminders] = useState<EntryReminder[]>(reminders);

  useEffect(() => {
    if (isOpen) {
      setDraftReminders(reminders || []);
    }
  }, [isOpen, reminders]);

  if (!isOpen) return null;

  const handleSave = () => {
    soundEngine.playGentleChime();
    onSave(draftReminders);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="w-full max-w-md p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl space-y-4"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#DCEAD4] dark:border-[#263722]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] flex items-center justify-center">
              <Bell className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                {isFa ? 'تنظیم یادآورها' : 'Manage Reminders'}
              </h3>
              <p className="text-[11px] text-[#485B44] dark:text-[#9EB598] truncate max-w-[240px]">
                {title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reminder Picker Controls */}
        <div className="py-1">
          <ReminderPicker
            reminders={draftReminders}
            onChange={setDraftReminders}
            targetTime={targetTime}
            targetDate={targetDate}
            itemType={itemType}
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCEAD4] dark:border-[#263722]">
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] transition-colors cursor-pointer"
          >
            {isFa ? 'انصراف' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{isFa ? 'ذخیره یادآورها' : 'Save Reminders'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
