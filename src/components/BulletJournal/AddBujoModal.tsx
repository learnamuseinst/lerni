import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  Star, 
  Sparkles, 
  Check, 
  Clock, 
  Tag, 
  Zap,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { BujoEntry, BujoType, EnergyLevel, ENERGY_LEVELS } from '../../types';
import { soundEngine } from '../../utils/audioSynth';
import { getTodayKey } from '../../utils/dateUtils';
import { DEFAULT_JOURNAL_CATEGORIES } from '../../utils/storage';
import { useI18n, getCategoryLabel, getEnergyLabel } from '../../utils/i18n';
import { MaterialExpressiveDatePicker } from '../common/MaterialExpressiveDatePicker';
import { MaterialExpressiveTimePicker } from '../common/MaterialExpressiveTimePicker';

interface AddBujoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEntry: (entry: BujoEntry) => void;
  defaultDate: string;
  currentEnergy?: EnergyLevel;
  categories?: string[];
  onOpenSettings?: () => void;
}

const TYPE_SYMBOLS: Record<BujoType, { symbol: string; typeKey: string; descKey: string }> = {
  task: { symbol: '⬜', typeKey: 'journal.typeTask', descKey: 'journal.typeTaskDesc' },
  event: { symbol: '⏳', typeKey: 'journal.typeEvent', descKey: 'journal.typeEventDesc' },
  note: { symbol: '✒️', typeKey: 'journal.typeNote', descKey: 'journal.typeNoteDesc' },
  habit_seed: { symbol: '🌱', typeKey: 'journal.typeHabitSeed', descKey: 'journal.typeHabitSeedDesc' },
};

export const AddBujoModal: React.FC<AddBujoModalProps> = ({
  isOpen,
  onClose,
  onAddEntry,
  defaultDate,
  currentEnergy = 'low',
  categories,
  onOpenSettings,
}) => {
  const { t, language } = useI18n();
  const todayStr = getTodayKey();
  const availableCategories = categories && categories.length > 0 ? categories : DEFAULT_JOURNAL_CATEGORIES;

  const [content, setContent] = useState('');
  const [type, setType] = useState<BujoType>('task');
  const [targetDate, setTargetDate] = useState<string>(defaultDate || todayStr);
  const [targetTime, setTargetTime] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [energyCost, setEnergyCost] = useState<EnergyLevel>(currentEnergy);
  const [isPriority, setIsPriority] = useState(false);
  const [category, setCategory] = useState<string>(availableCategories[0] || 'General');

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync defaultDate & category when opened
  useEffect(() => {
    if (isOpen) {
      setTargetDate(defaultDate || todayStr);
      setTargetTime('');
      setDurationMinutes('');
      setContent('');
      setIsPriority(false);
      if (!availableCategories.includes(category)) {
        setCategory(availableCategories[0] || 'General');
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, defaultDate, todayStr, availableCategories]);

  // Sync modal state with app for FAB animation
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('app:modal-state-change', { detail: { isOpen } })
    );
  }, [isOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) return;

    const parsedDuration = durationMinutes ? parseInt(durationMinutes, 10) : undefined;

    const newEntry: BujoEntry = {
      id: `bujo-${Date.now()}`,
      date: targetDate || todayStr,
      time: targetTime.trim() ? targetTime.trim() : undefined,
      durationMinutes: parsedDuration && !isNaN(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined,
      type: type,
      status: 'open',
      content: content.trim(),
      energyCost: energyCost,
      isPriority: isPriority,
      category: category.trim() || availableCategories[0] || 'General',
      tags: [category.trim() || availableCategories[0] || 'General'],
      createdAt: Date.now(),
    };

    onAddEntry(newEntry);
    soundEngine.playGentleChime();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="bujo-modal-fullscreen"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed inset-0 z-50 w-full h-full bg-[#F7FAF4] dark:bg-[#121B11] text-[#151E14] dark:text-[#E8F2E4] flex flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t('journal.newEntryModalTitle')}
        >
          {/* Header */}
          <div className="shrink-0 sticky top-0 z-20 bg-[#F7FAF4]/95 dark:bg-[#121B11]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 border-b border-[#DCEAD4] dark:border-[#22301F] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  onClose();
                }}
                className="p-2 -ml-2 rounded-xl text-[#485B44] dark:text-[#9EB598] hover:bg-[#EAEFE6] dark:hover:bg-[#1C281A] transition-colors flex items-center gap-1.5 font-medium text-sm cursor-pointer"
                aria-label={t('common.close', 'Close')}
              >
                <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                <span className="hidden sm:inline">{t('common.back', 'Back')}</span>
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] flex items-center justify-center font-bold text-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-[#151E14] dark:text-[#E8F2E4] leading-tight">
                    {t('journal.newEntryModalTitle')}
                  </h2>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium hidden sm:block">
                    {t('journal.newEntryModalSub')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPop();
                  onClose();
                }}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-[#F2F8EE] dark:hover:bg-[#1F2D1C] transition-colors sm:hidden"
                aria-label={t('common.close', 'Close')}
              >
                <X className="w-5 h-5" />
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handleSubmit()}
                disabled={!content.trim()}
                className="hidden sm:flex px-6 py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] font-bold text-xs shadow-xs items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t('journal.addEntryBtn')}</span>
              </motion.button>
            </div>
          </div>

          {/* Scrollable Form Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8 py-6">
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Entry Type Selector */}
              <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
            {t('journal.entryType')}
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(TYPE_SYMBOLS) as BujoType[]).map((tKey) => {
              const item = TYPE_SYMBOLS[tKey];
              const isSelected = type === tKey;
              return (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => {
                    setType(tKey);
                    soundEngine.playPop();
                  }}
                  className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'bg-[#80D141] text-[#0F2600] border-[#80D141] shadow-xs font-bold'
                      : 'bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] border-[#DCEAD4] dark:border-[#263722] hover:bg-[#EDF6E8]'
                  }`}
                >
                  <span className="text-base">{item.symbol}</span>
                  <span className="text-xs font-bold leading-none">{t(item.typeKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Input with Priority Star */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {t('journal.entryContent')}
            </label>
            <button
              type="button"
              onClick={() => {
                setIsPriority(!isPriority);
                soundEngine.playPop();
              }}
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors ${
                isPriority
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  : 'bg-[#EDF6E8] dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598]'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isPriority ? 'fill-amber-400 text-amber-500' : ''}`} />
              <span>{t('journal.priorityStar')}</span>
            </button>
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                type === 'task'
                  ? t('journal.taskPlaceholder')
                  : type === 'event'
                  ? t('journal.eventPlaceholder')
                  : t('journal.notePlaceholder')
              }
              className="w-full px-4 py-3 rounded-2xl bg-[#EDF6E8] dark:bg-[#1E291C] border border-[#DCEAD4] dark:border-[#263722] text-sm text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
            />
          </div>
        </div>

        {/* Date Selection Strip with Material Expressive Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] block">
            {t('journal.targetDate')}
          </label>
          <MaterialExpressiveDatePicker
            value={targetDate}
            onChange={(newDate) => setTargetDate(newDate)}
            label={t('journal.selectDate')}
            buttonClassName="w-full justify-between"
          />
        </div>

        {/* Optional Time & Duration Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Optional Time with Material Expressive Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
              <span>{t('journal.timeOptional')}</span>
            </label>
            <MaterialExpressiveTimePicker
              value={targetTime}
              onChange={(newTime) => setTargetTime(newTime)}
              label={t('journal.selectTime')}
              placeholder={t('journal.noTimeSet')}
              buttonClassName="w-full justify-between"
            />
          </div>

          {/* Optional Duration with -5 / +5 and presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
                <span>{t('journal.durationOptional')}</span>
              </label>
              {durationMinutes && (
                <button
                  type="button"
                  onClick={() => {
                    setDurationMinutes('');
                    soundEngine.playPop();
                  }}
                  className="text-[10px] text-[#485B44] dark:text-[#9EB598] hover:text-[#B3261E] font-medium"
                >
                  {t('journal.clear')}
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-1 flex-wrap">
              {/* -5 and +5 Steppers */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAdjustDuration(-5)}
                  className="px-2 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722] hover:bg-[#EDF6E8] active:scale-95 transition-all"
                  title="Decrease by 5 mins"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustDuration(5)}
                  className="px-2 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722] hover:bg-[#EDF6E8] active:scale-95 transition-all"
                  title="Increase by 5 mins"
                >
                  +5
                </button>
              </div>

              {/* Number Input */}
              <div className="w-16 min-w-[55px]">
                <input
                  type="number"
                  min="1"
                  max="720"
                  step="5"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder={t('journal.mins')}
                  className="w-full px-2 py-1.5 rounded-xl bg-[#EDF6E8] dark:bg-[#1E291C] border border-[#DCEAD4] dark:border-[#263722] text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] text-center focus:outline-none focus:ring-2 focus:ring-[#80D141]"
                />
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1">
                {[15, 25, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setDurationMinutes(String(mins));
                      soundEngine.playPop();
                    }}
                    className={`px-1.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all active:scale-95 ${
                      durationMinutes === String(mins)
                        ? 'bg-[#80D141] text-[#0F2600] border-[#80D141]'
                        : 'bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] border-[#DCEAD4] dark:border-[#263722] hover:bg-[#EDF6E8]'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Energy & Category Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          
          {/* Energy Cost */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {t('journal.energyNeeded')}
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
                  title={`${getEnergyLabel(lvl.id, language)}`}
                >
                  <span>{lvl.icon}</span>
                  <span className="capitalize">{getEnergyLabel(lvl.id, language)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Tag with Horizontal Scroll and Edit in Settings */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                {t('journal.category')}
              </label>

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playPop();
                    onClose();
                    onOpenSettings();
                  }}
                  className="text-[10px] font-bold text-[#3B7E10] dark:text-[#80D141] hover:underline flex items-center gap-0.5"
                >
                  <Settings className="w-2.5 h-2.5" />
                  <span>{t('journal.editInSettings')}</span>
                </button>
              )}
            </div>

            {/* Horizontally Scrollable Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap py-1 w-full">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    soundEngine.playPop();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                    category === cat
                      ? 'bg-[#80D141] text-[#0F2600] shadow-xs scale-105'
                      : 'bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722] hover:bg-[#EDF6E8]'
                  }`}
                >
                  {getCategoryLabel(cat, language)}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>

          {/* Bottom Sticky Action Bar */}
          <div className="shrink-0 sticky bottom-0 z-20 bg-[#F7FAF4]/95 dark:bg-[#121B11]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 border-t border-[#DCEAD4] dark:border-[#22301F] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                soundEngine.playPop();
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#F2F8EE] dark:bg-[#1A2617] text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#E2F5D1] transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => handleSubmit()}
              disabled={!content.trim()}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('journal.addEntryBtn')}</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
