import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Heart, HelpCircle, Sparkles, Clock, Zap, ArrowLeft } from 'lucide-react';
import { Habit, EnergyLevel, TimeBucket, ENERGY_LEVELS } from '../../types';
import { getTodayDateString } from '../../utils/storage';
import { soundEngine } from '../../utils/audioSynth';
import { useI18n, getEnergyLabel } from '../../utils/i18n';
import { MaterialExpressiveTimePicker } from '../common/MaterialExpressiveTimePicker';

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddHabit: (habit: Habit) => void;
}

export const AddHabitModal: React.FC<AddHabitModalProps> = ({ isOpen, onClose, onAddHabit }) => {
  const { t, language } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeBucket, setTimeBucket] = useState<TimeBucket>('morning');
  const [targetTime, setTargetTime] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [energyCost, setEnergyCost] = useState<EnergyLevel>('low');
  const [unstickTip, setUnstickTip] = useState('');
  const [showUnstickHelp, setShowUnstickHelp] = useState(false);

  // Sync modal state with app for FAB animation
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('app:modal-state-change', { detail: { isOpen } })
    );
  }, [isOpen]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedDuration = durationMinutes ? parseInt(durationMinutes, 10) : undefined;

    const newHabit: Habit = {
      id: `habit-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      timeBucket,
      time: targetTime.trim() ? targetTime.trim() : undefined,
      durationMinutes: parsedDuration && !isNaN(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined,
      energyCost,
      color: '#80D141',
      createdAt: getTodayDateString(),
      completedDates: [],
      streakCount: 0,
      totalCompletions: 0,
      unstickTip: unstickTip.trim() || 'Do just 5% of this habit. Any effort counts.',
    };

    onAddHabit(newHabit);
    soundEngine.playGentleChime();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="habit-modal-fullscreen"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed inset-0 z-50 w-full h-full bg-[#F7FAF4] dark:bg-[#121B11] text-[#151E14] dark:text-[#E8F2E4] flex flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t('habits.createMicroHabit')}
        >
          <form onSubmit={handleSubmit} className="flex flex-col h-full w-full overflow-hidden">
            {/* Header */}
            <div className="shrink-0 sticky top-0 z-20 bg-[#F7FAF4]/95 dark:bg-[#121B11]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 border-b border-[#DCEAD4] dark:border-[#22301F] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 -ml-2 rounded-xl text-[#485B44] dark:text-[#9EB598] hover:bg-[#EAEFE6] dark:hover:bg-[#1C281A] transition-colors flex items-center gap-1.5 font-medium text-sm cursor-pointer"
                  aria-label={t('common.close', 'Close')}
                >
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                  <span className="hidden sm:inline">{t('common.back', 'Back')}</span>
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#20381B] text-[#1C3700] dark:text-[#A2EB68] flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-base sm:text-lg font-bold text-[#151E14] dark:text-[#E8F2E4] leading-tight">
                      {t('habits.createMicroHabit')}
                    </h2>
                    <p className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium hidden sm:block">
                      {t('habits.keepTiny')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-[#F2F8EE] dark:hover:bg-[#1F2D1C] transition-colors sm:hidden"
                  aria-label={t('common.close', 'Close')}
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="hidden sm:flex px-6 py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] font-bold text-xs shadow-xs items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('habits.plantHabit')}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8 py-6">
              <div className="max-w-2xl mx-auto space-y-5">
                <div>
            <label className="block text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] mb-1">
              {t('habits.habitName')} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 1 sip of water, touch 1 page"
              className="w-full px-4 py-2.5 rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-sm text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] mb-1">
              {t('habits.whyMatters')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Keeps my brain hydrated and energized"
              className="w-full px-4 py-2 rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-sm text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Time Bucket */}
            <div>
              <label className="block text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] mb-1">
                {t('habits.timeOfDayAnchor')}
              </label>
              <select
                value={timeBucket}
                onChange={(e) => setTimeBucket(e.target.value as TimeBucket)}
                className="w-full px-3 py-2 rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
              >
                <option value="morning">🌅 {t('habits.bucketMorning')}</option>
                <option value="midday">☀️ {t('habits.bucketMidday')}</option>
                <option value="evening">🌙 {t('habits.bucketEvening')}</option>
                <option value="anytime">🔄 {t('habits.bucketAnytime')}</option>
              </select>
            </div>

            {/* Energy Cost */}
            <div>
              <label className="block text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] mb-1">
                {t('habits.energyNeeded')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {ENERGY_LEVELS.map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setEnergyCost(lvl.id)}
                    className={`py-2 px-1 rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                      energyCost === lvl.id
                        ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                        : 'bg-[#EDF6E8] dark:bg-[#1C281A] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722]'
                    }`}
                  >
                    <span className="text-base">{lvl.icon}</span>
                    <span className="text-[11px]">{getEnergyLabel(lvl.id, language)}</span>
                  </button>
                ))}
              </div>
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

          {/* Unstick Tip Fallback */}
          <div className="p-3.5 rounded-2xl bg-[#E8F8D8]/70 dark:bg-[#20341B] border border-[#80D141]/50 dark:border-[#80D141]/30">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C3700] dark:text-[#A2EB68]">
                <Heart className="w-3.5 h-3.5 text-[#80D141]" />
                <span>{t('habits.fallbackHeader')}</span>
              </div>
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
              placeholder="e.g. Just take 1 sip; just open the app; just sit in chair."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#182316] border border-[#80D141]/50 text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
            />
          </div>

            </div>
          </div>

          {/* Bottom Sticky Action Bar */}
          <div className="shrink-0 sticky bottom-0 z-20 bg-[#F7FAF4]/95 dark:bg-[#121B11]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 border-t border-[#DCEAD4] dark:border-[#22301F] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#F2F8EE] dark:bg-[#1A2617] text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#E2F5D1] transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('habits.plantHabit')}</span>
            </button>
          </div>
        </form>
      </motion.div>
    )}
  </AnimatePresence>
);
};
