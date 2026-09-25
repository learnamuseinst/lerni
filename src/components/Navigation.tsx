import React from 'react';
import { motion } from 'motion/react';
import { Brain, Sprout, BookOpenText, CalendarCheck, Timer } from 'lucide-react';
import { soundEngine } from '../utils/audioSynth';
import { ActiveSection, NavSection, DEFAULT_NAV_ORDER } from '../types';
import { useI18n } from '../utils/i18n';

export type { ActiveSection };

interface NavigationProps {
  activeSection: ActiveSection;
  onChangeSection: (section: ActiveSection) => void;
  isFocusRunning?: boolean;
  navOrder?: NavSection[];
}

const SECTION_ICONS: Record<NavSection, React.ReactNode> = {
  planner: <CalendarCheck className="w-5 h-5" />,
  journal: <BookOpenText className="w-5 h-5" />,
  habits: <Sprout className="w-5 h-5" />,
  focus: <Timer className="w-5 h-5" />,
  braindump: <Brain className="w-5 h-5" />,
};

export const Navigation: React.FC<NavigationProps> = ({
  activeSection,
  onChangeSection,
  isFocusRunning = false,
  navOrder = DEFAULT_NAV_ORDER,
}) => {
  const { t } = useI18n();
  const currentOrder = (navOrder && navOrder.length === 5) ? navOrder : DEFAULT_NAV_ORDER;

  const sections = currentOrder.map((secId) => ({
    id: secId,
    label: t(`nav.${secId}`, secId),
    icon: SECTION_ICONS[secId] || <Brain className="w-5 h-5" />,
    isPulsing: secId === 'focus' ? isFocusRunning : false,
  }));

  const handleSelect = (secId: ActiveSection) => {
    soundEngine.playPop();
    onChangeSection(secId);
  };

  return (
    <>
      {/* =========================================================================
          1. Desktop Navigation Rail (md and up)
         ========================================================================= */}
      <aside 
        id="desktop-navigation-rail"
        aria-label="Desktop Navigation Rail"
        className="hidden md:flex flex-col items-center justify-between sticky top-[69px] h-[calc(100vh-69px)] w-20 lg:w-24 shrink-0 py-6 px-2 border-r rtl:border-r-0 rtl:border-l border-[#D8E8D0] dark:border-[#22301F] bg-[#EDF6E8]/40 dark:bg-[#162014]/40 backdrop-blur-xs select-none z-20 transition-colors"
      >
        <div className="flex flex-col items-center gap-4 w-full">
          {sections.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                id={`rail-nav-tab-${sec.id}`}
                key={`rail-${sec.id}`}
                onClick={() => handleSelect(sec.id)}
                className="group relative flex flex-col items-center justify-center w-full py-2 px-1 rounded-2xl transition-all duration-200 active:scale-95 focus:outline-none"
              >
                {/* M3 Active Indicator Pill */}
                <div className="relative w-14 lg:w-16 h-8 flex items-center justify-center rounded-full transition-all">
                  {isActive && (
                    <motion.div
                      layoutId="m3-rail-active-pill"
                      className="absolute inset-0 rounded-full bg-[#80D141] shadow-xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}

                  {/* Icon */}
                  <div 
                    className={`relative z-10 transition-transform duration-200 group-hover:scale-110 ${
                      isActive
                        ? 'text-[#0F2600] font-bold'
                        : 'text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4]'
                    }`}
                  >
                    {sec.icon}
                  </div>

                  {/* Running Focus Status Ping */}
                  {sec.isPulsing && (
                    <span className="absolute -top-0.5 -right-0.5 z-20 w-2.5 h-2.5 rounded-full bg-[#80D141] animate-ping" />
                  )}
                </div>

                {/* M3 Label underneath active indicator */}
                <span
                  className={`mt-1 text-[11px] font-bold tracking-tight transition-colors text-center ${
                    isActive
                      ? 'text-[#151E14] dark:text-[#E8F2E4]'
                      : 'text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4]'
                  }`}
                >
                  {sec.label}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* =========================================================================
          2. Mobile Bottom Navigation Bar (below md)
         ========================================================================= */}
      <div 
        id="mobile-navigation-wrapper"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 w-full"
      >
        <nav 
          id="m3-mobile-navigation-bar"
          aria-label="Mobile Navigation"
          className="pointer-events-auto w-full bg-[#EDF6E8]/98 dark:bg-[#162014]/98 backdrop-blur-xl border-t border-[#D8E8D0] dark:border-[#22301F] shadow-[0_-4px_24px_rgba(0,0,0,0.07)] px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] flex items-center justify-around gap-1"
        >
          {sections.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                id={`mobile-nav-tab-${sec.id}`}
                key={`mobile-${sec.id}`}
                onClick={() => handleSelect(sec.id)}
                className="group relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 focus:outline-none"
              >
                {/* M3 Active Indicator Pill */}
                <div className="relative w-14 h-8 flex items-center justify-center rounded-full transition-all">
                  {isActive && (
                    <motion.div
                      layoutId="m3-mobile-active-pill"
                      className="absolute inset-0 rounded-full bg-[#80D141] shadow-xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}

                  {/* Icon */}
                  <div 
                    className={`relative z-10 transition-transform duration-200 group-hover:scale-110 ${
                      isActive
                        ? 'text-[#0F2600] font-bold'
                        : 'text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4]'
                    }`}
                  >
                    {sec.icon}
                  </div>

                  {/* Running Focus Status Ping */}
                  {sec.isPulsing && (
                    <span className="absolute -top-0.5 -right-0.5 z-20 w-2.5 h-2.5 rounded-full bg-[#80D141] animate-ping" />
                  )}
                </div>

                {/* M3 Label underneath active indicator */}
                <span
                  className={`mt-1 text-[11px] font-bold tracking-tight transition-colors truncate max-w-[80px] text-center ${
                    isActive
                      ? 'text-[#151E14] dark:text-[#E8F2E4]'
                      : 'text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4]'
                  }`}
                >
                  {sec.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};


