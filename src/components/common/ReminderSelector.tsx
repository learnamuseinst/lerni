import React, { useState } from 'react';
import { Bell, Plus, X, Clock, Check } from 'lucide-react';
import { Reminder } from '../../types';
import { REMINDER_PRESETS, formatReminderLabel } from '../../utils/reminderService';
import { soundEngine } from '../../utils/audioSynth';
import { useI18n, toPersianDigits } from '../../utils/i18n';
import { MaterialExpressiveTimePicker } from './MaterialExpressiveTimePicker';

interface ReminderSelectorProps {
  reminders: Reminder[];
  onChange: (reminders: Reminder[]) => void;
  itemTime?: string; // e.g. "14:30"
  itemTypeLabel?: string; // e.g. "task" or "event" or "habit"
}

export const ReminderSelector: React.FC<ReminderSelectorProps> = ({
  reminders = [],
  onChange,
  itemTime,
  itemTypeLabel,
}) => {
  const { t, language } = useI18n();
  const isFa = language === 'fa';
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('09:00');

  const handleAddPreset = (offsetMinutes: number) => {
    soundEngine.playPop();
    // Prevent duplicate offset
    if (reminders.some((r) => r.offsetMinutes === offsetMinutes)) return;

    const newReminder: Reminder = {
      id: `rem-${Date.now()}-${offsetMinutes}`,
      offsetMinutes,
      label: formatReminderLabel({ id: '', offsetMinutes }, isFa),
    };

    onChange([...reminders, newReminder]);
  };

  const handleAddCustom = () => {
    if (!customTimeInput.trim()) return;
    soundEngine.playPop();

    // Prevent duplicate custom time
    if (reminders.some((r) => r.offsetMinutes === -1 && r.customTime === customTimeInput.trim())) {
      setShowCustomPicker(false);
      return;
    }

    const newReminder: Reminder = {
      id: `rem-${Date.now()}-custom`,
      offsetMinutes: -1,
      customTime: customTimeInput.trim(),
      label: isFa ? `در ساعت ${toPersianDigits(customTimeInput.trim())}` : `At ${customTimeInput.trim()}`,
    };

    onChange([...reminders, newReminder]);
    setShowCustomPicker(false);
  };

  const handleRemoveReminder = (id: string) => {
    soundEngine.playPop();
    onChange(reminders.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-2.5 p-3.5 sm:p-4 rounded-2xl bg-[#F7FAF4] dark:bg-[#1A2617] border border-[#DCEAD4] dark:border-[#273823]">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1E4300] dark:text-[#80D141] flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1.5">
              <span>{t('reminders.title', 'Reminders & Notifications')}</span>
              {reminders.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#80D141] text-[#0F2600] text-[10px] font-black">
                  {isFa ? toPersianDigits(reminders.length) : reminders.length}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#485B44] dark:text-[#9EB598]">
              {t('reminders.multipleHint', 'Add multiple reminders (e.g. at the time, 30m before)')}
            </p>
          </div>
        </div>
      </div>

      {/* Active Reminder Chips List */}
      {reminders.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {reminders.map((rem) => {
            const label = formatReminderLabel(rem, isFa);
            return (
              <div
                key={rem.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-[#202E1D] border border-[#80D141]/60 text-[#1C3700] dark:text-[#9DD97A] text-xs font-bold shadow-2xs group"
              >
                <Bell className="w-3 h-3 text-[#589E1E] dark:text-[#80D141] fill-current/20 shrink-0" />
                <span>{label}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveReminder(rem.id)}
                  className="p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-950/60 text-[#79747E] hover:text-[#B3261E] dark:hover:text-[#F2B8B5] transition-colors cursor-pointer ml-0.5 rtl:mr-0.5 rtl:ml-0"
                  title={t('common.delete', 'Remove')}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[11px] text-[#79747E] dark:text-[#889B84] italic pt-0.5">
          {t('reminders.noRemindersYet', 'No reminders added yet. Tap a quick preset below:')}
        </div>
      )}

      {/* Quick Preset Buttons */}
      <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-[#DCEAD4]/80 dark:border-[#273823]/80">
        {REMINDER_PRESETS.map((preset) => {
          const isAdded = reminders.some((r) => r.offsetMinutes === preset.offsetMinutes);
          const label = isFa
            ? preset.offsetMinutes === 0
              ? 'در زمان مقرر'
              : preset.offsetMinutes === 60
              ? '۱ ساعت قبل'
              : preset.offsetMinutes === 120
              ? '۲ ساعت قبل'
              : preset.offsetMinutes === 1440
              ? '۱ روز قبل'
              : `${toPersianDigits(preset.offsetMinutes)} دقیقه قبل`
            : preset.defaultLabel;

          return (
            <button
              key={preset.offsetMinutes}
              type="button"
              onClick={() => handleAddPreset(preset.offsetMinutes)}
              disabled={isAdded}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                isAdded
                  ? 'bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1E4300] dark:text-[#80D141] border-[#80D141]/40 opacity-70 cursor-default'
                  : 'bg-white dark:bg-[#202E1D] text-[#3B4E37] dark:text-[#A6BC9F] border-[#DCEAD4] dark:border-[#2C3F28] hover:bg-[#EAF5E3] hover:text-[#151E14] dark:hover:text-[#E8F2E4]'
              }`}
              title={isAdded ? t('reminders.alreadyAdded', 'Already added') : `Add ${label}`}
            >
              {isAdded ? <Check className="w-3 h-3 text-[#589E1E] dark:text-[#80D141] stroke-[3]" /> : <Plus className="w-3 h-3" />}
              <span>{label}</span>
            </button>
          );
        })}

        {/* Custom Exact Time Button */}
        {!showCustomPicker ? (
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowCustomPicker(true);
            }}
            className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white dark:bg-[#202E1D] text-[#3B4E37] dark:text-[#A6BC9F] border border-[#DCEAD4] dark:border-[#2C3F28] hover:bg-[#EAF5E3] transition-all cursor-pointer flex items-center gap-1"
          >
            <Clock className="w-3 h-3" />
            <span>{t('reminders.customTimeBtn', 'Exact Time...')}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-[#202E1D] border border-[#80D141]">
            <MaterialExpressiveTimePicker
              id="reminder-custom-time-input"
              value={customTimeInput}
              onChange={(val) => setCustomTimeInput(val)}
              label={t('reminders.customTimeLabel', 'Reminder Time')}
            />
            <button
              type="button"
              onClick={handleAddCustom}
              className="px-2.5 py-1.5 rounded-lg bg-[#80D141] text-[#0F2600] text-xs font-bold shadow-xs hover:bg-[#72BF36] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
            <button
              type="button"
              onClick={() => setShowCustomPicker(false)}
              className="p-1 rounded-lg text-[#79747E] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
