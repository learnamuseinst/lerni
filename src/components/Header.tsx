import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dices, 
  HeartHandshake, 
  Settings,
  X
} from 'lucide-react';
import { UserPreferences, SensoryState, EnergyLevel, ENERGY_LEVELS, ActiveSection, Chronotype } from '../types';
import { soundEngine } from '../utils/audioSynth';
import { LerniMascot } from './Mascot/LerniMascot';
import { useI18n } from '../utils/i18n';

interface HeaderProps {
  prefs: UserPreferences;
  onUpdatePrefs: (updated: Partial<UserPreferences>) => void;
  onOpenParalysisBuster: () => void;
  onOpenGrounding: () => void;
  onOpenHelp?: () => void;
  onOpenSettings: () => void;
  activeSection?: ActiveSection;
  isStatusOpen?: boolean;
  onOpenStatus?: () => void;
  onCloseStatus?: () => void;
}

const SENSORY_STATES: { id: SensoryState; labelKey: string; defaultLabel: string; icon: string; descKey: string; defaultDesc: string }[] = [
  { id: 'balanced', labelKey: 'sensory.balanced', defaultLabel: 'Balanced', icon: '🌱', descKey: 'sensory.balancedDesc', defaultDesc: 'Ready for normal pacing' },
  { id: 'low_energy', labelKey: 'sensory.low', defaultLabel: 'Low Energy', icon: '🪫', descKey: 'sensory.lowDesc', defaultDesc: 'Energy saving mode' },
  { id: 'brain_fog', labelKey: 'sensory.fog', defaultLabel: 'Brain Fog', icon: '🌫️', descKey: 'sensory.fogDesc', defaultDesc: 'Need micro-steps & low text' },
  { id: 'overwhelmed', labelKey: 'sensory.overwhelmed', defaultLabel: 'Overwhelmed', icon: '🌀', descKey: 'sensory.overwhelmedDesc', defaultDesc: 'Sensory overload / pause' },
  { id: 'hyperfocus', labelKey: 'sensory.hyper', defaultLabel: 'Hyperfocus', icon: '⚡', descKey: 'sensory.hyperDesc', defaultDesc: 'Deep in the zone' },
];

const CHRONOTYPES: { id: Chronotype; label: string; faLabel: string; icon: string; desc: string; faDesc: string }[] = [
  { id: 'morning', label: 'Morning Lark', faLabel: 'سحرخیز', icon: '🌅', desc: 'Early peak energy', faDesc: 'اوج انرژی در ساعات اولیه' },
  { id: 'balanced', label: 'Balanced Rhythms', faLabel: 'ریتم متعادل', icon: '☀️', desc: 'Midday focus flow', faDesc: 'جریان پایدار در طول روز' },
  { id: 'afternoon', label: 'Afternoon Window', faLabel: 'بازه بعدازظهر', icon: '🌤️', desc: 'Peak focus in PM', faDesc: 'اوج تمرکز در بعدازظهر' },
  { id: 'evening', label: 'Night Owl', faLabel: 'شب‌بیدار', icon: '🌙', desc: 'Late peak energy', faDesc: 'اوج انرژی در ساعات شب' },
];

export const Header: React.FC<HeaderProps> = ({
  prefs,
  onUpdatePrefs,
  onOpenParalysisBuster,
  onOpenGrounding,
  onOpenHelp,
  onOpenSettings,
  activeSection,
  isStatusOpen,
  onOpenStatus,
  onCloseStatus,
}) => {
  const [internalShowEnergyModal, setInternalShowEnergyModal] = useState(false);
  const showEnergyModal = isStatusOpen !== undefined ? isStatusOpen : internalShowEnergyModal;
  const handleOpenStatusModal = () => {
    if (onOpenStatus) {
      onOpenStatus();
    } else {
      setInternalShowEnergyModal(true);
    }
  };
  const handleCloseStatusModal = () => {
    if (onCloseStatus) {
      onCloseStatus();
    } else {
      setInternalShowEnergyModal(false);
    }
  };
  const { t, language } = useI18n();

  const handleEnergyChange = (level: EnergyLevel) => {
    soundEngine.playPop();
    onUpdatePrefs({ currentEnergy: level });
  };

  const getEnergyLabel = (level: EnergyLevel) => {
    if (level === 'low') return t('header.lowEnergy', 'Low Energy');
    if (level === 'high') return t('header.highEnergy', 'High Energy');
    return t('header.medEnergy', 'Medium Energy');
  };

  const currentEnergyMeta = ENERGY_LEVELS.find((l) => l.id === prefs.currentEnergy) || ENERGY_LEVELS[1];
  const currentEnergyName = getEnergyLabel(prefs.currentEnergy);

  return (
    <header className="w-full bg-[#EDF6E8] dark:bg-[#162014] border-b border-[#D8E8D0] dark:border-[#22301F] sticky top-0 z-30 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3">
        
        {/* Brand & Mascot */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <motion.div 
            whileHover={{ scale: 1.08, rotate: 3 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[18px] bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 text-white flex items-center justify-center shadow-xs sm:shadow-md cursor-pointer active:scale-95 overflow-hidden p-0.5 sm:p-1"
            title={language === 'fa' ? 'همراه خرسی لرنی' : 'Lerni Bear Companion'}
          >
            <LerniMascot pose="waving" size="sm" interactive={false} />
          </motion.div>

          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#151E14] dark:text-[#E8F2E4]">
              {t('app.name', 'Lerni')}
            </h1>
          </div>
        </div>

        {/* Executive Function Tools & State Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Energy Level Trigger Button */}
          <motion.button
            id="btn-open-energy-modal"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              soundEngine.playPop();
              handleOpenStatusModal();
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-full bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] text-[#3B4E37] dark:text-[#B6CCB0] hover:text-[#151E14] dark:hover:text-[#E8F2E4] text-xs font-bold border border-[#D8E8D0] dark:border-[#273722] transition-all active:scale-95"
            title={`${currentEnergyName}`}
          >
            <span className="text-base leading-none">{currentEnergyMeta.icon}</span>
            <span className="hidden sm:inline">{currentEnergyName}</span>
          </motion.button>

          {/* Decision Paralysis Buster */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenParalysisBuster}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-full bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] text-[#3B4E37] dark:text-[#B6CCB0] hover:text-[#151E14] dark:hover:text-[#E8F2E4] text-xs font-bold border border-[#D8E8D0] dark:border-[#273722] active:scale-95"
            title={t('header.paralysisBuster', 'Paralysis Buster')}
          >
            <Dices className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('header.paralysisBuster', 'Paralysis Buster')}</span>
          </motion.button>

          {/* Panic / Sensory Reset */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenGrounding}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-full bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] text-[#3B4E37] dark:text-[#B6CCB0] hover:text-[#151E14] dark:hover:text-[#E8F2E4] text-xs font-bold border border-[#D8E8D0] dark:border-[#273722] active:scale-95"
            title={t('header.sensoryReset', 'Sensory Reset')}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('header.sensoryReset', 'Sensory Reset')}</span>
          </motion.button>

          {/* Settings */}
          <motion.button
            id="btn-header-settings"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              soundEngine.playPop();
              onOpenSettings();
            }}
            className={`p-2 sm:p-2.5 rounded-full border transition-all active:scale-95 ${
              activeSection === 'settings'
                ? 'bg-[#80D141] text-[#0F2600] border-[#80D141] shadow-xs'
                : 'bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] text-[#3B4E37] dark:text-[#B6CCB0] hover:text-[#151E14] dark:hover:text-[#E8F2E4] border-[#D8E8D0] dark:border-[#273722]'
            }`}
            title={t('header.settings', 'Settings')}
            aria-label={t('header.settings', 'Settings')}
          >
            <Settings className={`w-4 h-4 transition-transform ${activeSection === 'settings' ? 'rotate-90' : ''}`} />
          </motion.button>
        </div>

      </div>

      {/* Full-Screen Status & Energy Check-in Window */}
      <AnimatePresence>
        {showEnergyModal && (
          <motion.div 
            id="status-window-fullscreen"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            dir={language === 'fa' ? 'rtl' : 'ltr'}
            className="fixed inset-0 z-50 bg-[#F8FAF5] dark:bg-[#141C13] flex flex-col overflow-hidden text-start"
          >
            {/* Top Bar */}
            <div className="w-full bg-[#EDF6E8] dark:bg-[#182316] border-b border-[#D8E8D0] dark:border-[#263722] px-4 sm:px-8 py-3.5 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-xl shrink-0 shadow-xs">
                  ⚡
                </div>
                <div>
                  <h2 className="font-display font-bold text-base sm:text-lg text-[#151E14] dark:text-[#E8F2E4]">
                    {t('header.energyModalTitle', 'Check in on your current battery')}
                  </h2>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                    {t('header.energyModalSub', 'Tasks and schedule advice adapt to your current energy level.')}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseStatusModal}
                aria-label={language === 'fa' ? 'بستن' : 'Close'}
                className="p-2 sm:px-4 sm:py-2 rounded-full bg-[#EDF6E8] dark:bg-[#202E1E] hover:bg-[#DCEAD4] dark:hover:bg-[#2A3D26] text-[#3B4E37] dark:text-[#B6CCB0] text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
                <span className="hidden sm:inline">{language === 'fa' ? 'بستن' : 'Close'}</span>
              </button>
            </div>

            {/* Main Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8">
              <div className="max-w-3xl mx-auto w-full space-y-8">
                {/* 1. Energy Level Section */}
                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-2">
                      <span>🔋</span>
                      <span>{language === 'fa' ? 'میزان باتری درونی (سطح انرژی)' : 'Internal Battery Level (Energy)'}</span>
                    </h3>
                    <p className="text-xs text-[#485B44] dark:text-[#9EB598] mt-0.5">
                      {language === 'fa' 
                        ? 'میزان توان اجرایی خود را مشخص کنید تا برنامه‌ریز و هوش مصنوعی کارهای متناسب با آن پیشنهاد دهند.'
                        : 'Choose your operational capacity so the AI and schedule adapt to your cognitive bandwidth.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {ENERGY_LEVELS.map((lvl) => {
                      const isSelected = prefs.currentEnergy === lvl.id;
                      const label = lvl.id === 'low' ? t('header.lowEnergy') : lvl.id === 'medium' ? t('header.medEnergy') : t('header.highEnergy');
                      const desc = lvl.id === 'low' 
                        ? (language === 'fa' ? 'فشار بسیار کم، گام‌های ۲ دقیقه‌ای' : 'Gentle 2-min starter steps & micro-effort')
                        : lvl.id === 'medium'
                        ? (language === 'fa' ? 'جریان استاندارد و متوازن' : 'Standard flow with structured pacing')
                        : (language === 'fa' ? 'آماده برای تمرکز عمیق و چالش بالا' : 'Deep focus & high cognitive tasks');

                      return (
                        <motion.button
                          key={lvl.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleEnergyChange(lvl.id)}
                          className={`p-4 sm:p-5 rounded-2xl flex flex-col items-center sm:items-start text-center sm:text-start gap-2 border transition-all ${
                            isSelected
                              ? 'bg-[#80D141] text-[#0E2300] border-[#80D141] shadow-md font-bold ring-2 ring-[#80D141]/30'
                              : 'bg-[#EDF6E8] dark:bg-[#1E2B1A] text-[#3B4E37] dark:text-[#B6CCB0] border-[#DCEAD4] dark:border-[#273722] hover:bg-[#E2F2D9] dark:hover:bg-[#253621]'
                          }`}
                        >
                          <div className="text-3xl">{lvl.icon}</div>
                          <div className="font-bold text-sm text-[#151E14] dark:text-[#E8F2E4]">{label}</div>
                          <div className={`text-xs leading-relaxed ${isSelected ? 'text-[#0E2300]/80' : 'text-[#485B44] dark:text-[#9EB598]'}`}>
                            {desc}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>

                {/* 2. Sensory State Section */}
                <section className="space-y-3 pt-6 border-t border-[#DCEAD4] dark:border-[#263722]">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-2">
                      <span>🧠</span>
                      <span>{language === 'fa' ? 'وضعیت ذهنی و حسی فعلی' : 'Current Mind & Sensory State'}</span>
                    </h3>
                    <p className="text-xs text-[#485B44] dark:text-[#9EB598] mt-0.5">
                      {language === 'fa'
                        ? 'درک احساس ذهنی لحظه‌ای شما به متعادل‌سازی بار حسی کمک می‌کند.'
                        : 'Identifies cognitive load, hyperfocus, or sensory overload.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {SENSORY_STATES.map((st) => {
                      const isSelected = prefs.sensoryState === st.id;
                      const label = t(st.labelKey as any, st.defaultLabel);
                      const desc = t(st.descKey as any, st.defaultDesc);
                      return (
                        <button
                          key={st.id}
                          onClick={() => {
                            onUpdatePrefs({ sensoryState: st.id });
                            soundEngine.playPop();
                          }}
                          className={`p-3.5 rounded-2xl text-start text-xs transition-all flex items-start gap-3 border ${
                            isSelected
                              ? 'bg-[#D6F3BF] dark:bg-[#2A4023] text-[#122A00] dark:text-[#E2FBD0] font-bold border-[#80D141] shadow-xs'
                              : 'bg-[#EDF6E8] dark:bg-[#1E2B1A] text-[#485B44] dark:text-[#A6BC9F] border-[#DCEAD4] dark:border-[#273722] hover:bg-[#E2F2D9] dark:hover:bg-[#253621]'
                          }`}
                        >
                          <span className="text-2xl shrink-0 mt-0.5">{st.icon}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-[#151E14] dark:text-[#E8F2E4]">{label}</div>
                            <div className="text-xs opacity-80 mt-0.5 leading-relaxed">{desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* 3. Chronotype Section */}
                <section className="space-y-3 pt-6 border-t border-[#DCEAD4] dark:border-[#263722]">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-2">
                      <span>🕰️</span>
                      <span>{language === 'fa' ? 'ریتم زیستی و اوج انرژی (کرونوتیپ)' : 'Peak Chronotype (Biological Rhythm)'}</span>
                    </h3>
                    <p className="text-xs text-[#485B44] dark:text-[#9EB598] mt-0.5">
                      {language === 'fa'
                        ? 'بهترین ساعات تمرکز مغز شما در طول شبانه‌روز برای توزیع بهینه وظایف.'
                        : 'Aligns deep focus blocks with your natural circadian peak energy windows.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CHRONOTYPES.map((ct) => {
                      const isSelected = (prefs.chronotype || 'balanced') === ct.id;
                      const label = language === 'fa' ? ct.faLabel : ct.label;
                      const desc = language === 'fa' ? ct.faDesc : ct.desc;
                      return (
                        <button
                          key={ct.id}
                          onClick={() => {
                            onUpdatePrefs({ chronotype: ct.id });
                            soundEngine.playPop();
                          }}
                          className={`p-3.5 rounded-2xl text-start text-xs transition-all flex items-start gap-3 border ${
                            isSelected
                              ? 'bg-[#D6F3BF] dark:bg-[#2A4023] text-[#122A00] dark:text-[#E2FBD0] font-bold border-[#80D141] shadow-xs'
                              : 'bg-[#EDF6E8] dark:bg-[#1E2B1A] text-[#485B44] dark:text-[#A6BC9F] border-[#DCEAD4] dark:border-[#273722] hover:bg-[#E2F2D9] dark:hover:bg-[#253621]'
                          }`}
                        >
                          <span className="text-2xl shrink-0 mt-0.5">{ct.icon}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-[#151E14] dark:text-[#E8F2E4]">{label}</div>
                            <div className="text-xs opacity-80 mt-0.5 leading-relaxed">{desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="w-full border-t border-[#D8E8D0] dark:border-[#263722] bg-[#EDF6E8]/95 dark:bg-[#182316]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between shrink-0">
              <div className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium hidden sm:flex items-center gap-2">
                <span>{currentEnergyMeta.icon}</span>
                <span className="font-bold text-[#151E14] dark:text-[#E8F2E4]">{currentEnergyName}</span>
                <span>•</span>
                <span>{SENSORY_STATES.find(s => s.id === prefs.sensoryState)?.icon}</span>
                <span>{t((SENSORY_STATES.find(s => s.id === prefs.sensoryState)?.labelKey || 'sensory.balanced') as any)}</span>
              </div>

              <div className="flex items-center gap-3 ms-auto">
                <button
                  onClick={handleCloseStatusModal}
                  className="px-6 py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs sm:text-sm font-bold shadow-md active:scale-95 transition-all"
                >
                  {t('common.done', 'Apply & Close')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
