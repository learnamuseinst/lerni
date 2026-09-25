import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, HeartHandshake, Play, RotateCcw, Check, Sparkles, Box, Wind } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';
import { useI18n, toPersianDigits } from '../utils/i18n';

interface GroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GroundingTab = 'box' | 'relax_478' | 'sensory';

export const GroundingModal: React.FC<GroundingModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useI18n();
  const [tab, setTab] = useState<GroundingTab>('box');

  // 4-7-8 Breathing state: 'inhale' (4s), 'hold' (7s), 'exhale' (8s)
  const [relaxPhase, setRelaxPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [relaxCounter, setRelaxCounter] = useState(4);
  const [isRelaxActive, setIsRelaxActive] = useState(false);

  // Box Breathing state: 'inhale' (4s), 'hold1' (4s), 'exhale' (4s), 'hold2' (4s)
  const [boxPhase, setBoxPhase] = useState<'inhale' | 'hold_in' | 'exhale' | 'hold_out'>('inhale');
  const [boxCounter, setBoxCounter] = useState(4);
  const [isBoxActive, setIsBoxActive] = useState(false);

  // 5-4-3-2-1 Sensory Checklist
  const [sensoryChecked, setSensoryChecked] = useState<Record<number, boolean>>({});

  // 4-7-8 Timer
  useEffect(() => {
    let timer: any = null;
    if (isRelaxActive && tab === 'relax_478') {
      timer = setInterval(() => {
        setRelaxCounter((prev) => {
          if (prev <= 1) {
            if (relaxPhase === 'inhale') {
              setRelaxPhase('hold');
              soundEngine.playPop();
              return 7;
            } else if (relaxPhase === 'hold') {
              setRelaxPhase('exhale');
              soundEngine.playPop();
              return 8;
            } else {
              setRelaxPhase('inhale');
              soundEngine.playPop();
              return 4;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRelaxActive, relaxPhase, tab]);

  // Box Breathing Timer (4 - 4 - 4 - 4)
  useEffect(() => {
    let timer: any = null;
    if (isBoxActive && tab === 'box') {
      timer = setInterval(() => {
        setBoxCounter((prev) => {
          if (prev <= 1) {
            if (boxPhase === 'inhale') {
              setBoxPhase('hold_in');
              soundEngine.playPop();
              return 4;
            } else if (boxPhase === 'hold_in') {
              setBoxPhase('exhale');
              soundEngine.playPop();
              return 4;
            } else if (boxPhase === 'exhale') {
              setBoxPhase('hold_out');
              soundEngine.playPop();
              return 4;
            } else {
              setBoxPhase('inhale');
              soundEngine.playPop();
              return 4;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isBoxActive, boxPhase, tab]);

  if (!isOpen) return null;

  const SENSORY_STEPS = [
    { 
      num: 5, 
      label: t('grounding.sensory5Label', '5 things you can SEE around you'), 
      icon: '👁️', 
      desc: t('grounding.sensory5Desc', 'Look at shapes, textures, light on the wall') 
    },
    { 
      num: 4, 
      label: t('grounding.sensory4Label', '4 things you can physically TOUCH'), 
      icon: '✋', 
      desc: t('grounding.sensory4Desc', 'Your chair, your sleeve, smooth phone glass, your feet on floor') 
    },
    { 
      num: 3, 
      label: t('grounding.sensory3Label', '3 things you can HEAR right now'), 
      icon: '👂', 
      desc: t('grounding.sensory3Desc', 'Air conditioner hum, distance cars, your own breath') 
    },
    { 
      num: 2, 
      label: t('grounding.sensory2Label', '2 things you can SMELL'), 
      icon: '👃', 
      desc: t('grounding.sensory2Desc', 'Coffee, fabric, air in the room') 
    },
    { 
      num: 1, 
      label: t('grounding.sensory1Label', '1 thing you can TASTE or FEEL inside'), 
      icon: '👅', 
      desc: t('grounding.sensory1Desc', 'Sip of water or feeling of relaxation') 
    },
  ];

  const boxStepItems = [
    { id: 'inhale', label: t('grounding.boxStep1', '1. Inhale'), time: language === 'fa' ? '۴ ثانیه' : '4s' },
    { id: 'hold_in', label: t('grounding.boxStep2', '2. Hold'), time: language === 'fa' ? '۴ ثانیه' : '4s' },
    { id: 'exhale', label: t('grounding.boxStep3', '3. Exhale'), time: language === 'fa' ? '۴ ثانیه' : '4s' },
    { id: 'hold_out', label: t('grounding.boxStep4', '4. Hold'), time: language === 'fa' ? '۴ ثانیه' : '4s' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      dir={language === 'fa' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-[#F8FAF5] dark:bg-[#141C13] flex flex-col overflow-hidden text-start"
    >
      {/* Top Header Bar */}
      <div className="w-full bg-[#EDF6E8] dark:bg-[#182316] border-b border-[#D8E8D0] dark:border-[#263722] px-4 sm:px-8 py-3.5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#80D141] text-[#0F2600] flex items-center justify-center shadow-xs shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {t('grounding.title', 'Nervous System Grounding')}
            </h2>
            <p className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
              {t('grounding.sub', 'Down-regulate when in freeze, panic, or overwhelm')}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label={language === 'fa' ? 'بستن' : 'Close'}
          className="p-2 sm:px-4 sm:py-2 rounded-full bg-[#EDF6E8] dark:bg-[#202E1E] hover:bg-[#DCEAD4] dark:hover:bg-[#2A3D26] text-[#3B4E37] dark:text-[#B6CCB0] text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
          <span className="hidden sm:inline">{language === 'fa' ? 'بستن' : 'Close'}</span>
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8 flex flex-col items-center">
        <div className="w-full max-w-2xl space-y-6">
          {/* Tab Toggle - 3 Options: Box Breathing, 4-7-8 Breathing, Sensory Reset */}
          <div className="grid grid-cols-3 rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] p-1.5 gap-1.5 border border-[#DCEAD4] dark:border-[#263722] shadow-xs">
            <button
              onClick={() => {
                setTab('box');
                soundEngine.playPop();
              }}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all truncate text-center ${
                tab === 'box'
                  ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                  : 'text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14]'
              }`}
            >
              {t('grounding.tabBox', '📦 Box (4-4-4-4)')}
            </button>
            <button
              onClick={() => {
                setTab('relax_478');
                soundEngine.playPop();
              }}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all truncate text-center ${
                tab === 'relax_478'
                  ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                  : 'text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14]'
              }`}
            >
              {t('grounding.tabRelax', '🫁 4-7-8 Relax')}
            </button>
            <button
              onClick={() => {
                setTab('sensory');
                soundEngine.playPop();
              }}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all truncate text-center ${
                tab === 'sensory'
                  ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                  : 'text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14]'
              }`}
            >
              {t('grounding.tabSensory', '🌿 5-4-3-2-1 Reset')}
            </button>
          </div>

        {/* 1. Box Breathing Technique (4s Inhale, 4s Hold, 4s Exhale, 4s Hold) */}
        {tab === 'box' && (
          <div className="py-2 flex flex-col items-center justify-center space-y-5">
            {/* Box Phase Flow Indicators */}
            <div className="grid grid-cols-4 gap-1.5 w-full max-w-sm text-center">
              {boxStepItems.map((step) => {
                const isActiveStep = boxPhase === step.id && isBoxActive;
                return (
                  <div
                    key={step.id}
                    className={`py-1.5 px-1 rounded-xl border text-[11px] font-bold transition-all ${
                      isActiveStep
                        ? 'bg-[#80D141] text-[#0F2600] border-[#80D141] shadow-xs'
                        : 'bg-[#EDF6E8] dark:bg-[#1C281A] border-[#DCEAD4] dark:border-[#263722] text-[#485B44] dark:text-[#9EB598]'
                    }`}
                  >
                    <div>{step.label}</div>
                    <div className="text-[10px] opacity-80">{step.time}</div>
                  </div>
                );
              })}
            </div>

            {/* Animated Box Visual Sphere */}
            <div className="relative w-56 h-56 flex items-center justify-center">
              {/* Outer boundary frame */}
              <div className="absolute inset-4 rounded-3xl border-2 border-dashed border-[#80D141]/40 dark:border-[#80D141]/30 animate-pulse pointer-events-none" />

              <motion.div
                animate={{
                  scale:
                    boxPhase === 'inhale'
                      ? [1, 1.4]
                      : boxPhase === 'hold_in'
                      ? 1.4
                      : boxPhase === 'exhale'
                      ? [1.4, 1]
                      : 1,
                  borderRadius: boxPhase === 'hold_in' || boxPhase === 'hold_out' ? '28px' : '50%',
                }}
                transition={{
                  duration: 4,
                  ease: 'easeInOut',
                }}
                className="w-32 h-32 bg-gradient-to-tr from-[#2C630C] via-[#80D141] to-[#438814] opacity-95 shadow-xl flex items-center justify-center text-white"
              />

              <div className="absolute text-center text-white z-10 drop-shadow">
                <div className="font-display font-black text-4xl">
                  {language === 'fa' ? `${toPersianDigits(boxCounter)} ثانیه` : `${boxCounter}s`}
                </div>
                <div className="text-xs font-bold uppercase tracking-wider mt-1 px-2.5 py-0.5 rounded-full bg-black/30 backdrop-blur-xs">
                  {boxPhase === 'inhale'
                    ? t('grounding.boxInhaleLabel', 'Inhale Slowly')
                    : boxPhase === 'hold_in'
                    ? t('grounding.boxHoldInLabel', 'Hold Full')
                    : boxPhase === 'exhale'
                    ? t('grounding.boxExhaleLabel', 'Exhale Gently')
                    : t('grounding.boxHoldOutLabel', 'Hold Empty')}
                </div>
              </div>
            </div>

            {/* Instruction */}
            <p className="text-xs text-center text-[#485B44] dark:text-[#9EB598] max-w-sm font-medium leading-relaxed">
              {t('grounding.boxDesc', 'Box Breathing (equal 4-count rhythm) calms acute panic, regulates heart-rate variability, and restores cognitive control.')}
            </p>

            {/* Controls */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsBoxActive(!isBoxActive);
                  soundEngine.playPop();
                }}
                className="px-7 py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-bold text-xs shadow-md active:scale-95 transition-transform"
              >
                {isBoxActive 
                  ? t('grounding.boxPause', 'Pause Box Breathing') 
                  : t('grounding.boxStart', 'Start Box Breathing (4-4-4-4)')}
              </button>
            </div>
          </div>
        )}

        {/* 2. 4-7-8 Relaxing Breath Mode */}
        {tab === 'relax_478' && (
          <div className="py-2 flex flex-col items-center justify-center space-y-5">
            {/* Animated Sphere */}
            <div className="relative w-56 h-56 flex items-center justify-center">
              <motion.div
                animate={{
                  scale:
                    relaxPhase === 'inhale'
                      ? [1, 1.45]
                      : relaxPhase === 'hold'
                      ? 1.45
                      : [1.45, 1],
                }}
                transition={{
                  duration: relaxPhase === 'inhale' ? 4 : relaxPhase === 'hold' ? 7 : 8,
                  ease: 'easeInOut',
                }}
                className="w-36 h-36 rounded-full bg-gradient-to-tr from-[#3B7E10] via-[#80D141] to-[#3B7E10] opacity-90 shadow-2xl flex items-center justify-center text-white"
              />

              <div className="absolute text-center text-white z-10 drop-shadow">
                <div className="font-display font-black text-3xl">
                  {language === 'fa' ? `${toPersianDigits(relaxCounter)} ثانیه` : `${relaxCounter}s`}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest mt-1">
                  {relaxPhase === 'inhale'
                    ? t('grounding.relaxInhaleLabel', 'Inhale (4s)')
                    : relaxPhase === 'hold'
                    ? t('grounding.relaxHoldLabel', 'Hold (7s)')
                    : t('grounding.relaxExhaleLabel', 'Slow Exhale (8s)')}
                </div>
              </div>
            </div>

            {/* Instruction */}
            <p className="text-xs text-center text-[#485B44] dark:text-[#9EB598] max-w-sm font-medium leading-relaxed">
              {t('grounding.relaxDesc', 'The 4-7-8 rhythm stimulates the vagus nerve to pull your brain out of fight-or-flight freeze.')}
            </p>

            {/* Controls */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsRelaxActive(!isRelaxActive);
                  soundEngine.playPop();
                }}
                className="px-6 py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-bold text-xs shadow-md active:scale-95 transition-transform"
              >
                {isRelaxActive ? t('grounding.relaxPause', 'Pause Breathing') : t('grounding.relaxStart', 'Start 4-7-8 Breathing')}
              </button>
            </div>
          </div>
        )}

        {/* 3. 5-4-3-2-1 Sensory Grounding Mode */}
        {tab === 'sensory' && (
          <div className="space-y-3">
            <p className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
              {t('grounding.sensoryIntro', 'Take your time with each sensory anchor. Click the box once you notice it:')}
            </p>

            <div className="space-y-2">
              {SENSORY_STEPS.map((step) => {
                const isDone = Boolean(sensoryChecked[step.num]);
                return (
                  <button
                    key={step.num}
                    onClick={() => {
                      setSensoryChecked((prev) => ({ ...prev, [step.num]: !prev[step.num] }));
                      soundEngine.playPop();
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-start transition-all flex items-start gap-3 ${
                      isDone
                        ? 'bg-[#E8F8D8] dark:bg-[#1E3800] border-[#80D141] dark:border-[#3B7E10]'
                        : 'bg-white dark:bg-[#1C281A] border-[#DCEAD4] dark:border-[#263722]'
                    }`}
                  >
                    <span className="text-xl mt-0.5">{step.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                        {step.label}
                      </div>
                      <div className="text-[11px] text-[#485B44] dark:text-[#9EB598] mt-0.5 font-medium">
                        {step.desc}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center mt-1 transition-all ${
                        isDone ? 'bg-[#80D141] text-[#0F2600]' : 'border border-[#C5DAC0]'
                      }`}
                    >
                      {isDone && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="w-full border-t border-[#D8E8D0] dark:border-[#263722] bg-[#EDF6E8]/95 dark:bg-[#182316]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-center shrink-0">
        <button
          onClick={onClose}
          className="px-8 py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs sm:text-sm font-bold shadow-md active:scale-95 transition-all"
        >
          {t('grounding.feelCalmer', 'I Feel Calmer')}
        </button>
      </div>
    </motion.div>
  );
};

