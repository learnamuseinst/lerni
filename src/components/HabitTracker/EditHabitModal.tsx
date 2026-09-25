import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Zap, Sun, Clock, Moon, Sparkles, Heart, HelpCircle } from 'lucide-react';
import { Habit, EnergyLevel, TimeBucket, ENERGY_LEVELS } from '../../types';
import { soundEngine } from '../../utils/audioSynth';
import { useI18n, getEnergyLabel } from '../../utils/i18n';
import { MaterialExpressiveTimePicker } from '../common/MaterialExpressiveTimePicker';

interface EditHabitModalProps {
  habit: Habit | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedHabit: Habit) => void;
}

export const EditHabitModal: React.FC<EditHabitModalProps> = ({
  habit,
  isOpen,
  onClose,
  onSave,
}) => {
  const { t, language } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeBucket, setTimeBucket] = useState<TimeBucket>('morning');
  const [targetTime, setTargetTime] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [energyCost, setEnergyCost] = useState<EnergyLevel>('low');
  const [unstickTip, setUnstickTip] = useState('');
  const [showUnstickHelp, setShowUnstickHelp] = useState(false);

  const timeBuckets: { id: TimeBucket; label: string; icon: React.ReactNode }[] = [
    { id: 'morning', label: t('habits.bucketMorning'), icon: <Sun className="w-4 h-4 text-amber-500" /> },
    { id: 'midday', label: t('habits.bucketMidday'), icon: <Clock className="w-4 h-4 text-emerald-500" /> },
    { id: 'evening', label: t('habits.bucketEvening'), icon: <Moon className="w-4 h-4 text-teal-500" /> },
    { id: 'anytime', label: t('habits.bucketAnytime'), icon: <Sparkles className="w-4 h-4 text-[#80D141]" /> },
  ];

  useEffect(() => {
    if (habit && isOpen) {
      setTitle(habit.title);
      setDescription(habit.description || '');
      setTimeBucket(habit.timeBucket);
      setTargetTime(habit.time || '');
      setDurationMinutes(habit.durationMinutes ? String(habit.durationMinutes) : '');
      setEnergyCost(habit.energyCost);
      setUnstickTip(habit.unstickTip || '');
      setShowUnstickHelp(false);
    }
  }, [habit, isOpen]);

  if (!isOpen || !habit) return null;

  const handleAdjustDuration = (delta: number) => {
    soundEngine.playPop();
    const cur = parseInt(durationMinutes || '0', 10);
    const next = cur + delta;
    if (next <= 0) {
      setDurationMinutes('');
    } else {
      setDurationMinutes(String(next));
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    const parsedDuration = durationMinutes ? parseInt(durationMinutes, 10) : undefined;

    const updated: Habit = {
      ...habit,
      title: title.trim(),
      description: description.trim() || undefined,
      timeBucket,
      time: targetTime.trim() ? targetTime.trim() : undefined,
      durationMinutes: parsedDuration && !isNaN(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined,
      energyCost,
      unstickTip: unstickTip.trim() || undefined,
    };

    onSave(updated);
    soundEngine.playGentleChime();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="w-full max-w-lg p-5 sm:p-6 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#DCEAD4] dark:border-[#263722]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] flex items-center justify-center text-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
                {t('habits.editHabitTitle')}
              </h3>
              <p className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
                {t('habits.tweakRoutine')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playPop();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-[#EDF6E8] dark:hover:bg-[#202C1E] text-[#485B44] dark:text-[#9EB598] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title & Description */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {t('habits.habitName')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 1 Glass of Water, Stretch for 20s..."
              className="w-full px-4 py-2.5 rounded-2xl bg-[#EDF6E8] dark:bg-[#1E291C] border border-[#DCEAD4] dark:border-[#263722] text-sm text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {t('habits.whyMatters')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Hydrates neurons after sleep..."
              className="w-full px-4 py-2 rounded-2xl bg-[#EDF6E8] dark:bg-[#1E291C] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
            />
          </div>
        </div>

        {/* Time Bucket */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
            {t('habits.timeOfDayAnchor')}
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {timeBuckets.map((b) => {
              const isSelected = timeBucket === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setTimeBucket(b.id);
                    soundEngine.playPop();
                  }}
                  className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#80D141] text-[#0F2600] border-[#80D141] shadow-xs'
                      : 'bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] border-[#DCEAD4] dark:border-[#263722] hover:bg-[#EDF6E8]'
                  }`}
                >
                  <span>{b.icon}</span>
                  <span className="truncate">{b.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Energy Cost */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-[#80D141]" />
            <span>{t('habits.energyNeeded')}</span>
          </label>
          <div className="flex rounded-2xl bg-[#EDF6E8] dark:bg-[#1E291C] p-1 gap-1 border border-[#DCEAD4] dark:border-[#263722]">
            {ENERGY_LEVELS.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => {
                  setEnergyCost(lvl.id);
                  soundEngine.playPop();
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  energyCost === lvl.id
                    ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                    : 'text-[#485B44] dark:text-[#9EB598]'
                }`}
              >
                <span>{lvl.icon}</span>
                <span className="capitalize">{getEnergyLabel(lvl.id, language)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional Time & Duration Row (Smart Planner Integration) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Preferred Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
              <span>{t('habits.timeOptional', 'Preferred Time (Optional)')}</span>
            </label>
            <MaterialExpressiveTimePicker
              value={targetTime}
              onChange={(newTime) => setTargetTime(newTime)}
              label={t('habits.selectTime', 'Select Preferred Time')}
              placeholder={t('habits.noTimeSet', 'No specific time')}
              buttonClassName="w-full justify-between"
            />
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
                <span>{t('habits.durationOptional', 'Duration (Optional)')}</span>
              </label>
              {durationMinutes && (
                <button
                  type="button"
                  onClick={() => {
                    setDurationMinutes('');
                    soundEngine.playPop();
                  }}
                  className="text-[10px] text-[#485B44] dark:text-[#9EB598] hover:text-[#B3261E] font-medium cursor-pointer"
                >
                  {t('habits.clear', 'Clear')}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* -5 and +5 Steppers */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAdjustDuration(-5)}
                  className="px-2 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722] hover:bg-[#EDF6E8] active:scale-95 transition-all cursor-pointer"
                  title="-5 mins"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustDuration(5)}
                  className="px-2 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722] hover:bg-[#EDF6E8] active:scale-95 transition-all cursor-pointer"
                  title="+5 mins"
                >
                  +5
                </button>
              </div>

              {/* Number Input */}
              <div className="w-16 min-w-[55px]">
                <input
                  type="number"
                  min="1"
                  max="360"
                  step="5"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder={t('habits.mins', 'min')}
                  className="w-full px-2 py-1.5 rounded-xl bg-[#EDF6E8] dark:bg-[#1E291C] border border-[#DCEAD4] dark:border-[#263722] text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] text-center focus:outline-none focus:ring-2 focus:ring-[#80D141]"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1">
                {[5, 10, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      soundEngine.playPop();
                      setDurationMinutes(String(mins));
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      durationMinutes === String(mins)
                        ? 'bg-[#80D141] text-[#0F2600]'
                        : 'bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722] hover:bg-[#EDF6E8]'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-[#485B44] dark:text-[#9EB598] -mt-1">
          💡 {t('habits.smartPlannerNote', 'Used by the Smart Planner to place this habit into your daily schedule')}
        </p>

        {/* 10-Second Low Barrier Fallback (Unstick Tip) */}
        <div className="p-3.5 rounded-2xl bg-[#E8F8D8]/70 dark:bg-[#20341B] border border-[#80D141]/50 dark:border-[#80D141]/30">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-[#1C3700] dark:text-[#A2EB68] flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-[#80D141]" />
              <span>{t('habits.fallbackHeader')}</span>
            </label>
            <button
              type="button"
              onClick={() => {
                soundEngine.playPop();
                setShowUnstickHelp(!showUnstickHelp);
              }}
              className="p-1 rounded-full text-[#3B7E10] dark:text-[#A2EB68] hover:bg-[#D7EECD] dark:hover:bg-[#2A4423] transition-colors"
              title="Toggle description"
              aria-label="Toggle description"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence>
            {showUnstickHelp && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[11px] text-[#485B44] dark:text-[#9EB598] mb-2 leading-relaxed font-medium overflow-hidden"
              >
                {t('habits.fallbackExplain')}
              </motion.p>
            )}
          </AnimatePresence>

          <input
            type="text"
            value={unstickTip}
            onChange={(e) => setUnstickTip(e.target.value)}
            placeholder="e.g. Just take 1 single sip. Stopping is 100% fine."
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#182316] border border-[#80D141]/50 text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
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
            className="px-4 py-2.5 rounded-full text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] transition-colors"
          >
            {t('common.cancel')}
          </button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => handleSubmit()}
            disabled={!title.trim()}
            className="px-6 py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] font-bold text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{t('habits.saveHabitBtn')}</span>
          </motion.button>
        </div>

      </motion.div>
    </div>
  );
};
