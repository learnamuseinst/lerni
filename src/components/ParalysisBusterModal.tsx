import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { X, Dices, Play, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { BujoEntry, Habit, EnergyLevel, ENERGY_LEVELS } from '../types';
import { soundEngine } from '../utils/audioSynth';
import { useI18n, toPersianDigits } from '../utils/i18n';

interface ParalysisBusterModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: BujoEntry[];
  habits: Habit[];
  currentEnergy?: EnergyLevel;
  onStartFocus: (taskTitle: string, minutes: number) => void;
}

export const ParalysisBusterModal: React.FC<ParalysisBusterModalProps> = ({
  isOpen,
  onClose,
  entries,
  habits,
  currentEnergy = 'medium',
  onStartFocus,
}) => {
  const { t, language } = useI18n();
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  if (!isOpen) return null;

  const energyMeta = ENERGY_LEVELS.find((l) => l.id === currentEnergy) || ENERGY_LEVELS[1];
  const energyLabel = t(`energy.${currentEnergy === 'high' ? 'high' : currentEnergy === 'low' ? 'low' : 'med'}` as any, energyMeta.label);

  // Open tasks and uncompleted habits that match current user energy level
  const candidateTasks: string[] = [
    ...entries
      .filter((e) => e.type === 'task' && e.status === 'open' && (e.energyCost || 'medium') === currentEnergy)
      .map((e) => e.content),
    ...habits
      .filter(
        (h) =>
          !h.completedDates.includes(new Date().toISOString().slice(0, 10)) &&
          (h.energyCost || 'medium') === currentEnergy
      )
      .map((h) => h.title),
  ];

  const countFormatted = language === 'fa' ? toPersianDigits(candidateTasks.length) : candidateTasks.length;
  const itemsText = candidateTasks.length === 1 ? t('paralysis.item', 'item') : t('paralysis.items', 'items');

  const handleSpinWheel = () => {
    if (candidateTasks.length === 0) return;
    setIsSpinning(true);
    soundEngine.playPop();

    let counter = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * candidateTasks.length);
      setSelectedTask(candidateTasks[randomIdx]);
      soundEngine.playPop();
      counter++;
      if (counter > 15) {
        clearInterval(interval);
        setIsSpinning(false);
        soundEngine.playGentleChime();
        try {
          confetti({
            particleCount: 30,
            spread: 50,
            origin: { y: 0.7 },
          });
        } catch (e) {}
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        className="w-full max-w-md rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl p-6 space-y-5 text-center"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-start">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 dark:bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                {t('paralysis.title', 'Anti-Paralysis Picker')}
              </h3>
              <p className="text-[11px] text-[#485B44] dark:text-[#9EB598] font-medium">
                {t('paralysis.sub', 'Bypass decision fatigue — do just ONE task')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#EDF6E8] dark:hover:bg-[#263722] text-[#485B44] dark:text-[#9EB598] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EDF6E8] dark:bg-[#1C281A] text-[#3B7E10] dark:text-[#80D141] border border-[#DCEAD4] dark:border-[#263722]">
            <span>{t('paralysis.currentEnergy', 'Current Energy:')}</span>
            <span>{energyMeta.icon} {energyLabel} ({countFormatted} {itemsText})</span>
          </span>
        </div>

        <p className="text-xs text-[#485B44] dark:text-[#9EB598] leading-relaxed font-medium">
          {t('paralysis.desc', 'When staring at a long to-do list makes your brain lock up, eliminate the choice. Let the algorithm pick your next 5-minute action tailored to your current energy.')}
        </p>

        {/* Selected Task Spotlight */}
        <div className="p-5 rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] min-h-[90px] flex flex-col items-center justify-center">
          {selectedTask ? (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#3B7E10] dark:text-[#80D141]">
                {t('paralysis.singleFocus', 'Your Single Focus Right Now:')}
              </span>
              <div className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                "{selectedTask}"
              </div>
            </div>
          ) : (
            <span className="text-xs text-[#79747E] dark:text-[#9EB598] font-medium italic">
              {t('paralysis.placeholder', 'Tap "Spin to Pick" below to break the freeze...')}
            </span>
          )}
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={isSpinning || candidateTasks.length === 0}
            onClick={handleSpinWheel}
            className="w-full py-3 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
          >
            <Dices className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? t('paralysis.spinning', 'Picking randomly...') : t('paralysis.spinBtn', '🎲 Spin to Pick 1 Task')}</span>
          </motion.button>

          {selectedTask && (
            <motion.button
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                onStartFocus(selectedTask, 5);
                onClose();
              }}
              className="w-full py-3 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{t('paralysis.startSprint', 'Start 5-Min Dopamine Sprint')}</span>
            </motion.button>
          )}
        </div>

        {candidateTasks.length === 0 && (
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold p-2 bg-[#EDF6E8] dark:bg-[#1C281A] rounded-xl border border-[#DCEAD4] dark:border-[#263722]">
            {t('paralysis.noTasks', 'No open tasks match your current energy. Add an item or adjust energy level.')}
          </div>
        )}
      </motion.div>
    </div>
  );
};
