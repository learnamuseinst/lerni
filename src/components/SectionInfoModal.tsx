import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, Sparkles, CheckCircle2, ShieldCheck, Timer, BookOpen, Brain, Sprout, CalendarCheck } from 'lucide-react';
import { LerniMascot } from './Mascot/LerniMascot';
import { soundEngine } from '../utils/audioSynth';

export type SectionInfoType = 'braindump' | 'habits' | 'journal' | 'planner' | 'focus';

interface SectionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: SectionInfoType;
}

const SECTION_GUIDES: Record<SectionInfoType, {
  tabLabel: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  mascotPose: 'zen' | 'thinking' | 'speaking' | 'cheering';
  tips: { title: string; desc: string; icon: string }[];
}> = {
  braindump: {
    tabLabel: 'Dump',
    title: 'Dump Guide',
    subtitle: 'Zero-friction working memory offloader',
    icon: <Brain className="w-4 h-4" />,
    mascotPose: 'speaking',
    tips: [
      {
        title: 'Fast Thought Capture',
        desc: 'Type or click the microphone to dictate any raw thoughts, tasks, sudden distractions, or worries before you forget them.',
        icon: '🎙️'
      },
      {
        title: 'Zero Pressure to Organize',
        desc: 'Do not worry about structure or categories right away. Just dump the thought to free up executive bandwidth.',
        icon: '🧘'
      },
      {
        title: 'Tidy & Organize Dump',
        desc: 'When you are ready, click "Tidy Dump" to automatically group thoughts into prioritized journal tasks or notes.',
        icon: '🪄'
      },
      {
        title: 'Transfer to Journal',
        desc: 'Send any thought straight into your Bullet Journal with customizable type, date, energy cost, and category.',
        icon: '📓'
      }
    ]
  },
  habits: {
    tabLabel: 'Habits',
    title: 'Habit Tracker Guide',
    subtitle: 'Neuro-affirming micro-routines with zero guilt',
    icon: <Sprout className="w-4 h-4" />,
    mascotPose: 'cheering',
    tips: [
      {
        title: 'Atomic 30-Second Habits',
        desc: 'Keep habits tiny enough that you can do them even on your lowest energy days.',
        icon: '🌱'
      },
      {
        title: 'Energy Level Match',
        desc: 'Filter habits by energy cost (Low 🤏, Medium 🤌, High 💪) to match your current executive bandwidth.',
        icon: '⚡'
      },
      {
        title: 'Streak & Lifetime Wins',
        desc: 'Build momentum with guilt-free streaks and total milestone celebrations.',
        icon: '🏆'
      },
      {
        title: 'Time Buckets',
        desc: 'Group routines into Morning Launchpad, Midday Anchor, Evening Wind-down, or Anytime.',
        icon: '⏰'
      }
    ]
  },
  journal: {
    tabLabel: 'Journal',
    title: 'Bullet Journal Guide',
    subtitle: 'Low-friction rapid logging key',
    icon: <BookOpen className="w-4 h-4" />,
    mascotPose: 'zen',
    tips: [
      {
        title: 'Rapid Log Symbols',
        desc: '⬜ Task (to do), ⏳ Event (time-based), ✒️ Note (thought or memory), 🌱 Habit Seed (future idea).',
        icon: '📓'
      },
      {
        title: 'Status Cycling',
        desc: 'Tap the status icon next to any entry to cycle: Open (⬜) → Completed (✓) → Migrated (→).',
        icon: '🔄'
      },
      {
        title: 'Energy Level Budgeting',
        desc: 'Tag tasks with Low (🤏), Medium (🤌), or High (💪) energy so you never overcommit on low-battery days.',
        icon: '🤌'
      },
      {
        title: 'Unstick Tool ✨',
        desc: 'Paralyzed on a task? Click "Unstick" to slice it into gentle 2-minute micro-actions.',
        icon: '✨'
      }
    ]
  },
  planner: {
    tabLabel: 'Planner',
    title: 'AI Energy Planner Guide',
    subtitle: 'Energy-aware daily scheduling & executive pacing',
    icon: <CalendarCheck className="w-4 h-4" />,
    mascotPose: 'zen',
    tips: [
      {
        title: 'AI Energy Optimization ✨',
        desc: 'Gemini analyzes your logged Journal tasks, habits, and real-time energy levels to build an optimized daily blueprint.',
        icon: '⚡'
      },
      {
        title: 'Energy Rhythm Forecast',
        desc: 'Visualizes predicted morning, midday, and evening energy peaks so high cognitive tasks are placed when your focus is highest.',
        icon: '🧠'
      },
      {
        title: 'Built-in Somatic Buffers',
        desc: 'Automatically schedules essential restorative breaks and hydration pauses between deep focus blocks to prevent burnout.',
        icon: '☕'
      },
      {
        title: '2-Minute Starter Steps',
        desc: 'Overcome ADHD task initiation resistance with custom micro starter steps for every scheduled focus block.',
        icon: '🌱'
      },
      {
        title: 'Sync to Bullet Journal',
        desc: 'One click updates start times and durations directly on your Bullet Journal tasks.',
        icon: '🔄'
      }
    ]
  },
  focus: {
    tabLabel: 'Timer & Audio',
    title: 'Timer & Audio Guide',
    subtitle: 'Anti-paralysis timer with neuro-acoustic hums',
    icon: <Timer className="w-4 h-4" />,
    mascotPose: 'thinking',
    tips: [
      {
        title: 'Preset & Custom Timers',
        desc: 'Pick quick 5-min Dopamine Sprints, 15-min Bursts, 25-min Pomodoro, 45-min Deep Immersion, or set any Custom duration.',
        icon: '⏱️'
      },
      {
        title: 'Flowmodoro (Count Up)',
        desc: 'No countdown alarm anxiety. Ride the wave of hyperfocus at your own natural pace.',
        icon: '🚀'
      },
      {
        title: 'Brown & Pink Noise 🔊',
        desc: 'Deep warm brown and rain noise create an auditory blanket that quiets ADHD racing thoughts.',
        icon: '🎧'
      },
      {
        title: '40Hz Gamma Binaural Beats 🧠',
        desc: 'Acoustic frequency designed for mental clarity and sustained working focus.',
        icon: '🌊'
      }
    ]
  }
};

export const SectionInfoModal: React.FC<SectionInfoModalProps> = ({
  isOpen,
  onClose,
  initialSection = 'braindump'
}) => {
  const [activeTab, setActiveTab] = useState<SectionInfoType>(initialSection);

  // Sync initial tab when reopened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialSection);
    }
  }, [isOpen, initialSection]);

  if (!isOpen) return null;

  const currentGuide = SECTION_GUIDES[activeTab];

  return (
    <div 
      id="help-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        id="help-modal-window"
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-5 pb-3 border-b border-[#DCEAD4] dark:border-[#263722] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center p-1">
              <LerniMascot pose={currentGuide.mascotPose} size="xs" interactive={false} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#3B7E10] dark:text-[#80D141]" />
                <h3 className="font-display text-base sm:text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
                  Lerni App Guides & Tips
                </h3>
              </div>
              <p className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
                Neuro-affirming workflows & executive function tools
              </p>
            </div>
          </div>

          <button
            id="btn-close-help-modal"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#EDF6E8] dark:hover:bg-[#263722] text-[#485B44] dark:text-[#9EB598] transition-colors"
            aria-label="Close Help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Segmented Navigation Tabs */}
        <div className="px-5 pt-3 pb-2 shrink-0 bg-[#F2F7EE] dark:bg-[#141E12] border-b border-[#DCEAD4] dark:border-[#263722]">
          <div className="grid grid-cols-4 gap-1.5 bg-[#E4EFE0] dark:bg-[#1C281A] p-1 rounded-2xl border border-[#D0E2C8] dark:border-[#263722]">
            {(Object.keys(SECTION_GUIDES) as SectionInfoType[]).map((secKey) => {
              const sec = SECTION_GUIDES[secKey];
              const isActive = activeTab === secKey;
              return (
                <button
                  key={secKey}
                  id={`tab-help-${secKey}`}
                  onClick={() => {
                    soundEngine.playPop();
                    setActiveTab(secKey);
                  }}
                  className={`px-2 py-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-center ${
                    isActive
                      ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                      : 'text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4]'
                  }`}
                >
                  {sec.icon}
                  <span className="truncate">{sec.tabLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Active section header badge */}
          <div className="flex items-center justify-between pb-1">
            <div>
              <h4 className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                {currentGuide.title}
              </h4>
              <p className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
                {currentGuide.subtitle}
              </p>
            </div>
          </div>

          {/* Tips List */}
          <div className="space-y-2.5">
            {currentGuide.tips.map((tip, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] flex items-start gap-3"
              >
                <span className="text-xl shrink-0 mt-0.5">{tip.icon}</span>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs sm:text-sm font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {tip.title}
                  </h5>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] mt-0.5 leading-relaxed font-medium">
                    {tip.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-5 border-t border-[#DCEAD4] dark:border-[#263722] flex items-center justify-between shrink-0 bg-[#F8FAF5] dark:bg-[#182316]">
          <div className="text-[11px] text-[#485B44] dark:text-[#9EB598] font-medium flex items-center gap-1">
            <span>💡 Click any tab above to switch guides</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            Got it, thanks!
          </button>
        </div>
      </motion.div>
    </div>
  );
};

