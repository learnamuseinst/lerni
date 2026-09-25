/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { Habit, BujoEntry, FocusSession, UserPreferences, BrainDumpItem, ActiveSection, DEFAULT_NAV_ORDER } from './types';
import { storage, getTodayDateString } from './utils/storage';
import { soundEngine } from './utils/audioSynth';
import { applyThemeToDocument, DEFAULT_ACCENT_COLOR } from './utils/themeColors';
import { I18nProvider, isRTL } from './utils/i18n';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { BrainDump } from './components/BrainDump/BrainDump';
import { HabitTracker } from './components/HabitTracker/HabitTracker';
import { BulletJournal } from './components/BulletJournal/BulletJournal';
import { Planner } from './components/Planner/Planner';
import { FocusTracker } from './components/FocusTracker/FocusTracker';
import { SettingsSection } from './components/SettingsSection';
import { ParalysisBusterModal } from './components/ParalysisBusterModal';
import { GroundingModal } from './components/GroundingModal';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [prefs, setPrefs] = useState<UserPreferences>(() => storage.getPreferences());
  const [brainDumpItems, setBrainDumpItems] = useState<BrainDumpItem[]>(() => storage.getBrainDumpItems());
  const [habits, setHabits] = useState<Habit[]>(() => storage.getHabits());
  const [bujoEntries, setBujoEntries] = useState<BujoEntry[]>(() => storage.getBujoEntries());
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => storage.getFocusSessions());

  const [activeSection, setActiveSection] = useState<ActiveSection>(() => {
    const saved = storage.getPreferences();
    return (saved.navOrder && saved.navOrder[0]) ? saved.navOrder[0] : 'planner';
  });
  const [previousSection, setPreviousSection] = useState<ActiveSection>('planner');
  const [activeTaskAnchor, setActiveTaskAnchor] = useState<string>('');
  const [activeTaskDuration, setActiveTaskDuration] = useState<number | undefined>(undefined);
  const [isFocusRunning, setIsFocusRunning] = useState<boolean>(false);
  const [isPlannerGenerating, setIsPlannerGenerating] = useState<boolean>(false);

  // Modals
  const [isParalysisOpen, setIsParalysisOpen] = useState(false);
  const [isGroundingOpen, setIsGroundingOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  // Listen for section full-screen modal state changes to hide/show FAB smoothly
  useEffect(() => {
    const handleModalState = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsSubModalOpen(Boolean(customEvent.detail?.isOpen));
    };
    window.addEventListener('app:modal-state-change', handleModalState);
    return () => window.removeEventListener('app:modal-state-change', handleModalState);
  }, []);

  const isAnyModalOpen = isSubModalOpen || isParalysisOpen || isGroundingOpen || isStatusModalOpen;

  // Sync dark theme & dynamic accent colors on document element
  useEffect(() => {
    const isDark = prefs.theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    applyThemeToDocument(prefs.accentColor || DEFAULT_ACCENT_COLOR, isDark);
  }, [prefs.theme, prefs.accentColor]);

  // Sync Language & RTL direction on document element
  useEffect(() => {
    const isRtl = isRTL(prefs.language);
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = prefs.language || 'en';
  }, [prefs.language]);

  // Sync sound effects preference
  useEffect(() => {
    soundEngine.setEffectsEnabled(prefs.soundEffectsEnabled ?? true);
  }, [prefs.soundEffectsEnabled]);

  // Persist State
  const handleUpdatePrefs = (updated: Partial<UserPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...updated };
      storage.savePreferences(next);
      return next;
    });
  };

  const handleSendSingleToJournal = (entry: Partial<BujoEntry>) => {
    const newEntry: BujoEntry = {
      id: `bujo-${Date.now()}`,
      date: entry.date || getTodayDateString(),
      type: entry.type || 'task',
      status: entry.status || 'open',
      content: entry.content || '',
      energyCost: entry.energyCost || 'low',
      category: entry.category || 'General',
      isPriority: entry.isPriority || false,
      createdAt: Date.now(),
      tags: entry.tags || (entry.category ? [entry.category] : []),
    };
    handleUpdateBujoEntries([newEntry, ...bujoEntries]);
  };

  const handleUpdateBrainDump = (newItems: BrainDumpItem[]) => {
    setBrainDumpItems(newItems);
    storage.saveBrainDumpItems(newItems);
  };

  const handleUpdateHabits = (newHabits: Habit[]) => {
    setHabits(newHabits);
    storage.saveHabits(newHabits);
  };

  const handleUpdateBujoEntries = (newEntries: BujoEntry[]) => {
    setBujoEntries(newEntries);
    storage.saveBujoEntries(newEntries);
  };

  const handleAddFocusSession = (session: FocusSession) => {
    const next = [session, ...focusSessions];
    setFocusSessions(next);
    storage.saveFocusSessions(next);
  };

  const handleSendToFocusTimer = (taskTitle: string, minutes: number = 15) => {
    setActiveTaskAnchor(taskTitle);
    setActiveTaskDuration(minutes);
    setActiveSection('focus');
  };

  const handleOpenSettings = () => {
    if (activeSection !== 'settings') {
      setPreviousSection(activeSection);
    }
    setActiveSection('settings');
  };

  const handleReloadAllData = () => {
    setPrefs(storage.getPreferences());
    setBrainDumpItems(storage.getBrainDumpItems());
    setHabits(storage.getHabits());
    setBujoEntries(storage.getBujoEntries());
    setFocusSessions(storage.getFocusSessions());
  };

  const lang = prefs.language || 'en';

  const fabConfig = useMemo(() => {
    switch (activeSection) {
      case 'planner':
        return {
          id: 'fab-generate-schedule',
          label: lang === 'fa' ? 'تنظیم برنامه با هوش مصنوعی' : 'Generate schedule with AI',
          icon: isPlannerGenerating ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#0F2600]" />
          ) : (
            <Sparkles className="w-6 h-6 stroke-[2.2]" />
          ),
          iconKey: isPlannerGenerating ? 'loading' : 'sparkles',
        };
      case 'journal':
        return {
          id: 'fab-add-bujo-entry',
          label: lang === 'fa' ? 'افزودن به دفترچه' : 'New Entry',
          icon: <Plus className="w-6 h-6 stroke-[2.5]" />,
          iconKey: 'plus',
        };
      case 'habits':
        return {
          id: 'fab-add-habit',
          label: lang === 'fa' ? 'عادت جدید' : 'New Habit',
          icon: <Plus className="w-6 h-6 stroke-[2.5]" />,
          iconKey: 'plus',
        };
      case 'braindump':
        return {
          id: 'fab-add-thought',
          label: lang === 'fa' ? 'ثبت فکر' : 'Drop Thought',
          icon: <Plus className="w-6 h-6 stroke-[2.5]" />,
          iconKey: 'plus',
        };
      default:
        return null;
    }
  }, [activeSection, isPlannerGenerating, lang]);

  const handleFabClick = () => {
    soundEngine.playPop();
    window.dispatchEvent(
      new CustomEvent('app:fab-clicked', { detail: { section: activeSection } })
    );
  };

  return (
    <I18nProvider
      language={prefs.language || 'en'}
      onLanguageChange={(lang) => handleUpdatePrefs({ language: lang })}
    >
      <div className={`min-h-screen transition-colors duration-300 ${prefs.theme === 'dark' ? 'dark bg-[#121B11] text-[#E8F2E4]' : 'bg-[#F7FAF4] text-[#151E14]'}`}>
        
        {/* Material Expressive Geometric Top Bar with Lerni Mascot */}
        <Header
          prefs={prefs}
          onUpdatePrefs={handleUpdatePrefs}
          onOpenParalysisBuster={() => setIsParalysisOpen(true)}
          onOpenGrounding={() => setIsGroundingOpen(true)}
          onOpenSettings={handleOpenSettings}
          activeSection={activeSection}
          isStatusOpen={isStatusModalOpen}
          onOpenStatus={() => setIsStatusModalOpen(true)}
          onCloseStatus={() => setIsStatusModalOpen(false)}
        />

        {/* Main Workspace Layout with Desktop Navigation Rail & Content Area */}
        <div className="flex-1 md:flex w-full">
          <Navigation
            activeSection={activeSection}
            onChangeSection={setActiveSection}
            isFocusRunning={isFocusRunning}
            navOrder={prefs.navOrder || DEFAULT_NAV_ORDER}
          />

          {/* Main Content Area */}
          <main id="main-content" className="flex-1 min-w-0 relative pt-4 sm:pt-6 pb-36 sm:pb-32 md:pb-24">
            <AnimatePresence mode="wait">
              {activeSection === 'planner' && (
                <motion.div
                  key="planner"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Planner
                    entries={bujoEntries}
                    habits={habits}
                    focusSessions={focusSessions}
                    prefs={prefs}
                    onUpdateEntries={handleUpdateBujoEntries}
                    onSendToFocusTimer={handleSendToFocusTimer}
                    onOpenSettings={handleOpenSettings}
                    onUpdatePrefs={handleUpdatePrefs}
                    onOpenStatusModal={() => setIsStatusModalOpen(true)}
                    onGeneratingChange={setIsPlannerGenerating}
                  />
                </motion.div>
              )}

              {activeSection === 'journal' && (
                <motion.div
                  key="journal"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <BulletJournal
                    entries={bujoEntries}
                    onUpdateEntries={handleUpdateBujoEntries}
                    onSendToFocusTimer={handleSendToFocusTimer}
                    currentEnergy={prefs.currentEnergy}
                    categories={prefs.journalCategories}
                    onOpenSettings={handleOpenSettings}
                  />
                </motion.div>
              )}

              {activeSection === 'habits' && (
                <motion.div
                  key="habits"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <HabitTracker
                    habits={habits}
                    onUpdateHabits={handleUpdateHabits}
                    currentEnergy={prefs.currentEnergy}
                  />
                </motion.div>
              )}

              {activeSection === 'braindump' && (
                <motion.div
                  key="braindump"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <BrainDump
                    items={brainDumpItems}
                    onUpdateItems={handleUpdateBrainDump}
                    onSendToJournal={handleSendSingleToJournal}
                    onOpenUnstickModal={(taskTitle) => {
                      setActiveTaskAnchor(taskTitle);
                      setIsParalysisOpen(true);
                    }}
                    currentEnergy={prefs.currentEnergy}
                    categories={prefs.journalCategories}
                    onOpenSettings={handleOpenSettings}
                  />
                </motion.div>
              )}

              {activeSection === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <SettingsSection
                    prefs={prefs}
                    onUpdatePrefs={handleUpdatePrefs}
                    onReloadAllData={handleReloadAllData}
                    onBack={() => {
                      const fallback = (prefs.navOrder && prefs.navOrder[0]) ? prefs.navOrder[0] : 'planner';
                      setActiveSection(previousSection !== 'settings' ? previousSection : fallback);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Keep FocusTracker mounted to preserve timer state, countdown, and audio in background */}
            <div
              id="focus-section-container"
              className={activeSection === 'focus' ? 'block' : 'hidden'}
              aria-hidden={activeSection !== 'focus'}
            >
              <FocusTracker
                sessions={focusSessions}
                onAddSession={handleAddFocusSession}
                activeTaskAnchor={activeTaskAnchor}
                activeTaskDuration={activeTaskDuration}
                onClearTaskAnchor={() => {
                  setActiveTaskAnchor('');
                  setActiveTaskDuration(undefined);
                }}
                ambientSound={prefs.ambientSound}
                ambientVolume={prefs.ambientVolume}
                onUpdatePrefs={handleUpdatePrefs}
                setIsRunningToNav={setIsFocusRunning}
                focusTabOrder={prefs.focusTabOrder}
              />
            </div>
          </main>
        </div>

        {/* Unified Floating Action Button (FAB) anchored to Bottom Right */}
        <AnimatePresence>
          {fabConfig && !isAnyModalOpen && (
            <motion.button
              id={fabConfig.id}
              type="button"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={handleFabClick}
              disabled={activeSection === 'planner' && isPlannerGenerating}
              className="fixed bottom-24 right-5 sm:bottom-8 sm:right-8 z-30 w-14 h-14 rounded-2xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] flex items-center justify-center shadow-xl hover:shadow-2xl border border-[#6EBD32] select-none touch-manipulation cursor-pointer disabled:opacity-80 transition-shadow"
              aria-label={fabConfig.label}
              title={fabConfig.label}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={fabConfig.iconKey}
                  initial={{ opacity: 0, rotate: -25, scale: 0.85 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 25, scale: 0.85 }}
                  transition={{ duration: 0.14 }}
                  className="flex items-center justify-center"
                >
                  {fabConfig.icon}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Modals */}
        <ParalysisBusterModal
          isOpen={isParalysisOpen}
          onClose={() => setIsParalysisOpen(false)}
          entries={bujoEntries}
          habits={habits}
          currentEnergy={prefs.currentEnergy}
          onStartFocus={handleSendToFocusTimer}
        />

        <GroundingModal
          isOpen={isGroundingOpen}
          onClose={() => setIsGroundingOpen(false)}
        />

        {/* Offline Status & PWA Install Prompt Indicator */}
        <OfflineIndicator />

      </div>
    </I18nProvider>
  );
}
