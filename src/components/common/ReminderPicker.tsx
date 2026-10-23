import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Clock, 
  Check, 
  AlertCircle, 
  Sparkles,
  ChevronDown,
  Volume2
} from 'lucide-react';
import { EntryReminder, Language } from '../../types';
import { 
  REMINDER_PRESETS, 
  formatReminderOffset, 
  isNotificationSupported, 
  getNotificationPermission, 
  requestNotificationPermission 
} from '../../utils/reminderManager';
import { useI18n, toPersianDigits } from '../../utils/i18n';
import { soundEngine } from '../../utils/audioSynth';

interface ReminderPickerProps {
  reminders: EntryReminder[];
  onChange: (reminders: EntryReminder[]) => void;
  targetTime?: string; // e.g. "14:30"
  targetDate?: string; // e.g. "2026-10-23"
  itemType?: 'task' | 'event' | 'habit';
  allowMultiple?: boolean;
}

export const ReminderPicker: React.FC<ReminderPickerProps> = ({
  reminders = [],
  onChange,
  targetTime,
  itemType = 'task',
}) => {
  const { t, language } = useI18n();
  const isFa = language === 'fa';
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customMinutesInput, setCustomMinutesInput] = useState('45');
  const [permission, setPermission] = useState(getNotificationPermission());

  const handleRequestPermission = async () => {
    soundEngine.playPop();
    const result = await requestNotificationPermission();
    setPermission(result);
  };

  const handleAddPreset = (offsetMinutes: number) => {
    soundEngine.playPop();
    // Don't duplicate exact same offset
    if (reminders.some((r) => r.offsetMinutes === offsetMinutes)) return;

    const newReminder: EntryReminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      offsetMinutes,
      enabled: true,
      label: formatReminderOffset(offsetMinutes, language),
    };

    onChange([...reminders, newReminder]);

    // If notifications not granted, gently ask
    if (isNotificationSupported() && permission === 'default') {
      requestNotificationPermission().then(setPermission);
    }
  };

  const handleAddCustomMinutes = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const mins = parseInt(customMinutesInput, 10);
    if (isNaN(mins) || mins < 0) return;

    soundEngine.playPop();
    const newReminder: EntryReminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      offsetMinutes: mins,
      enabled: true,
      label: formatReminderOffset(mins, language),
    };

    onChange([...reminders, newReminder]);
    setIsAddingCustom(false);
  };

  const handleRemoveReminder = (id: string) => {
    soundEngine.playPop();
    onChange(reminders.filter((r) => r.id !== id));
  };

  const handleToggleReminder = (id: string) => {
    soundEngine.playPop();
    onChange(
      reminders.map((r) =>
        r.id === id ? { ...r, enabled: r.enabled === false ? true : false } : r
      )
    );
  };

  return (
    <div className="space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
          <span>{isFa ? 'یادآورها و اعلان‌ها' : 'Reminders & Notifications'}</span>
          {reminders.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] border border-[#80D141]/30">
              {isFa ? `${toPersianDigits(reminders.length)} یادآور` : `${reminders.length} active`}
            </span>
          )}
        </label>

        {isNotificationSupported() && permission === 'default' && (
          <button
            type="button"
            onClick={handleRequestPermission}
            className="text-[11px] font-bold text-[#2A650F] dark:text-[#9DD97A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-[#80D141]" />
            <span>{isFa ? 'فعال‌سازی اعلان مرورگر' : 'Enable browser alerts'}</span>
          </button>
        )}
      </div>

      {/* Untimed Notice Hint */}
      {!targetTime && itemType !== 'habit' && (
        <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            {isFa
              ? 'زمان مشخصی برای این مورد تنظیم نشده است. یادآور در ساعت ۰۹:۰۰ روز انتخابی اجرا می‌شود.'
              : 'No start time set. Reminders will anchor to 09:00 AM on the scheduled day.'}
          </span>
        </div>
      )}

      {/* Existing Attached Reminders Chips */}
      {reminders.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {reminders.map((reminder) => {
            const isEnabled = reminder.enabled !== false;
            const offsetLabel = formatReminderOffset(reminder.offsetMinutes, language);

            return (
              <div
                key={reminder.id}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                  isEnabled
                    ? 'bg-[#E8F8D8] dark:bg-[#1C3317] border-[#80D141]/60 text-[#153400] dark:text-[#B1F082]'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 opacity-60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleReminder(reminder.id)}
                  className="hover:opacity-80 flex items-center gap-1 cursor-pointer"
                  title={isEnabled ? (isFa ? 'غیرفعال‌سازی' : 'Disable') : (isFa ? 'فعال‌سازی' : 'Enable')}
                >
                  <Bell className="w-3 h-3 fill-current" />
                  <span>{offsetLabel}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRemoveReminder(reminder.id)}
                  className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-inherit transition-colors cursor-pointer"
                  title={isFa ? 'حذف این یادآور' : 'Remove reminder'}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-[#485B44] dark:text-[#9EB598]">
          {isFa
            ? 'یادآوری تنظیم نشده است. می‌توانید یک یا چند اعلان (مثلاً ۳۰ دقیقه قبل و در زمان شروع) بیفزایید.'
            : 'No reminders set. You can attach multiple notifications (e.g. 30 mins before + at time).'}
        </p>
      )}

      {/* Quick Add Preset Buttons */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] font-bold text-[#485B44] dark:text-[#9EB598] block">
          {isFa ? 'افزودن یادآور:' : 'Add a reminder:'}
        </span>

        <div className="flex flex-wrap gap-1.5">
          {REMINDER_PRESETS.map((preset) => {
            const isAlreadyAdded = reminders.some((r) => r.offsetMinutes === preset.offsetMinutes);
            const label = isFa ? preset.labelFa : preset.labelEn;

            return (
              <button
                key={preset.offsetMinutes}
                type="button"
                disabled={isAlreadyAdded}
                onClick={() => handleAddPreset(preset.offsetMinutes)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                  isAlreadyAdded
                    ? 'bg-[#80D141]/20 border-[#80D141]/40 text-[#1C3700] dark:text-[#80D141] opacity-50 cursor-default'
                    : 'bg-[#F7FAF4] dark:bg-[#1C2919] hover:bg-[#E2F2D9] dark:hover:bg-[#283C25] text-[#2F6B12] dark:text-[#9DD97A] border-[#DCEAD4] dark:border-[#2A3E26]'
                }`}
              >
                {isAlreadyAdded ? (
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                ) : (
                  <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                )}
                <span>{label}</span>
              </button>
            );
          })}

          {/* Custom Minutes Option */}
          {!isAddingCustom ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playPop();
                setIsAddingCustom(true);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F7FAF4] dark:bg-[#1C2919] hover:bg-[#E2F2D9] dark:hover:bg-[#283C25] text-[#2F6B12] dark:text-[#9DD97A] border border-[#DCEAD4] dark:border-[#2A3E26] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Clock className="w-2.5 h-2.5" />
              <span>{isFa ? 'دقیقه دلخواه...' : 'Custom time...'}</span>
            </button>
          ) : (
            <form onSubmit={handleAddCustomMinutes} className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="10080"
                value={customMinutesInput}
                onChange={(e) => setCustomMinutesInput(e.target.value)}
                placeholder="45"
                className="w-16 px-2 py-0.5 rounded-lg bg-white dark:bg-[#202E1E] border border-[#80D141] text-xs font-bold text-center focus:outline-none"
                autoFocus
              />
              <span className="text-[11px] font-medium text-[#485B44] dark:text-[#9EB598]">
                {isFa ? 'دقیقه قبل' : 'min before'}
              </span>
              <button
                type="submit"
                className="px-2.5 py-0.5 rounded-lg bg-[#80D141] text-[#0F2600] text-xs font-bold hover:bg-[#72BF36] cursor-pointer"
              >
                {isFa ? 'ثبت' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
