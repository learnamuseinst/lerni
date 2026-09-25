import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Tag, 
  Zap, 
  Star, 
  Settings, 
  Plus,
  Clock
} from 'lucide-react';
import { BrainDumpItem, BujoEntry, BujoType, EnergyLevel, ENERGY_LEVELS } from '../../types';
import { soundEngine } from '../../utils/audioSynth';
import { getTodayKey } from '../../utils/dateUtils';
import { DEFAULT_JOURNAL_CATEGORIES } from '../../utils/storage';
import { useI18n, getCategoryLabel, getEnergyLabel, toPersianDigits } from '../../utils/i18n';
import { MaterialExpressiveDatePicker } from '../common/MaterialExpressiveDatePicker';
import { MaterialExpressiveTimePicker } from '../common/MaterialExpressiveTimePicker';

interface SendToJournalModalProps {
  item: BrainDumpItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (entryData: Partial<BujoEntry>) => void;
  currentEnergy?: EnergyLevel;
  categories?: string[];
  onOpenSettings?: () => void;
}

export const SendToJournalModal: React.FC<SendToJournalModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
  currentEnergy = 'low',
  categories,
  onOpenSettings,
}) => {
  const { t, language } = useI18n();
  const todayStr = getTodayKey();
  const availableCategories = categories && categories.length > 0 ? categories : DEFAULT_JOURNAL_CATEGORIES;

  const TYPE_CONFIG: Record<BujoType, { symbol: string; label: string; desc: string }> = {
    task: { symbol: '⬜', label: t('journal.typeTask'), desc: language === 'fa' ? 'مورد کاری قابل انجام' : 'Actionable to-do item' },
    event: { symbol: '⏳', label: t('journal.typeEvent'), desc: language === 'fa' ? 'زمان‌بندی یا قرار ملاقات' : 'Scheduled time or appointment' },
    note: { symbol: '✒️', label: t('journal.typeNote'), desc: language === 'fa' ? 'تأمل، مشاهده یا ایده' : 'Reflection, observation, or idea' },
    habit_seed: { symbol: '🌱', label: t('journal.typeHabitSeed'), desc: language === 'fa' ? 'عادت یا روتین جدید' : 'Routine or habit to cultivate' },
  };

  const [content, setContent] = useState('');
  const [type, setType] = useState<BujoType>('task');
  const [targetDate, setTargetDate] = useState<string>(todayStr);
  const [targetTime, setTargetTime] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [energyCost, setEnergyCost] = useState<EnergyLevel>(currentEnergy);
  const [isPriority, setIsPriority] = useState(false);
  const [category, setCategory] = useState<string>(availableCategories[0] || 'General');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && item) {
      setContent(item.content);
      setIsPriority(Boolean(item.isPinned));
      setTargetDate(todayStr);
      setTargetTime('');
      setDurationMinutes('');
      setEnergyCost(currentEnergy);

      // Guess a sensible initial type from keywords
      const text = item.content.toLowerCase();
      if (/meet|call|appointment|doctor|dentist|birthday|party/i.test(text)) {
        setType('event');
      } else if (/idea|think|maybe|note|quote|remember|read/i.test(text)) {
        setType('note');
      } else {
        setType('task');
      }

      if (!availableCategories.includes(category)) {
        setCategory(availableCategories[0] || 'General');
      }

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, item, todayStr, currentEnergy, availableCategories]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) return;

    const parsedDuration = durationMinutes ? parseInt(durationMinutes, 10) : undefined;

    soundEngine.playGentleChime();
    onConfirm({
      content: content.trim(),
      type: type,
      date: targetDate || todayStr,
      time: targetTime.trim() ? targetTime.trim() : undefined,
      durationMinutes: parsedDuration && !isNaN(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined,
      energyCost: energyCost,
      isPriority: isPriority,
      category: category.trim() || availableCategories[0] || 'General',
      tags: [category.trim() || availableCategories[0] || 'General'],
    });

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
            <div className="w-10 h-10 rounded-2xl bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] flex items-center justify-center font-bold text-lg">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
                {language === 'fa' ? 'انتقال به ژورنال بولت' : 'Send to Bullet Journal'}
              </h3>
              <p className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
                {language === 'fa' ? 'تبدیل فکر به یک مورد ساختاریافته در ژورنال' : 'Turn your thought into a structured journal entry'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playPop();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entry Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
            {t('journal.entryType')}
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(TYPE_CONFIG) as BujoType[]).map((tKey) => {
              const itemType = TYPE_CONFIG[tKey];
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
                  <span className="text-base">{itemType.symbol}</span>
                  <span className="text-xs font-bold leading-none">{itemType.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Input with Priority Star */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {language === 'fa' ? 'متن ورودی' : 'Entry Content'}
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

          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === 'fa' ? 'ویرایش متن قبل از ارسال به ژورنال...' : 'Edit text before sending to journal...'}
            className="w-full px-4 py-3 rounded-2xl bg-[#EDF6E8] dark:bg-[#1E291C] border border-[#DCEAD4] dark:border-[#263722] text-sm text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
          />
        </div>

        {/* Date Selection Strip with Material Expressive Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] block">
            {t('journal.targetDate')}
          </label>
          <MaterialExpressiveDatePicker
            value={targetDate}
            onChange={(newDate) => setTargetDate(newDate)}
            label={t('journal.targetDate')}
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
              label={t('journal.timeOptional')}
              placeholder={language === 'fa' ? 'بدون زمان' : 'No time set'}
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
                  {language === 'fa' ? 'پاک کردن' : 'Clear'}
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
                  title={language === 'fa' ? 'کاهش ۵ دقیقه' : 'Decrease by 5 mins'}
                >
                  {language === 'fa' ? '۵-' : '-5'}
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustDuration(5)}
                  className="px-2 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722] hover:bg-[#EDF6E8] active:scale-95 transition-all"
                  title={language === 'fa' ? 'افزایش ۵ دقیقه' : 'Increase by 5 mins'}
                >
                  {language === 'fa' ? '۵+' : '+5'}
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
                  placeholder={language === 'fa' ? 'دقیقه' : 'Mins'}
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
                    {language === 'fa' ? `${toPersianDigits(mins)}د` : `${mins}m`}
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
            <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#80D141]" />
              <span>{t('journal.energyNeeded')}</span>
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
                  <span className="capitalize">
                    {getEnergyLabel(lvl.id, language)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Tag with Horizontal Scroll and Edit in Settings */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#80D141]" />
                <span>{t('journal.category')}</span>
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
                  <span>{language === 'fa' ? 'ویرایش در تنظیمات' : 'Edit in Settings'}</span>
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
            disabled={!content.trim()}
            className="px-6 py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] font-bold text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t('braindump.addToJournal')}</span>
          </motion.button>
        </div>

      </motion.div>
    </div>
  );
};
