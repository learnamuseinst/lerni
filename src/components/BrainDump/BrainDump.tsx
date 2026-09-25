import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Brain, 
  Mic, 
  MicOff, 
  Plus, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Trash2, 
  Pencil,
  Pin, 
  Search, 
  BookOpen, 
  Wand2,
  CheckCircle2,
  X,
  ChevronDown,
  Clock,
  Filter
} from 'lucide-react';
import { BrainDumpItem, EnergyLevel, ENERGY_LEVELS, BujoEntry, Habit } from '../../types';
import { LerniMascot } from '../Mascot/LerniMascot';
import { soundEngine } from '../../utils/audioSynth';
import { useI18n, toPersianDigits, getCategoryLabel, getEnergyLabel } from '../../utils/i18n';
import { EditBrainDumpModal } from './EditBrainDumpModal';
import { SendToJournalModal } from './SendToJournalModal';

interface BrainDumpProps {
  items: BrainDumpItem[];
  onUpdateItems: (items: BrainDumpItem[]) => void;
  onSendToJournal: (entry: Partial<BujoEntry>) => void;
  onOpenUnstickModal?: (taskTitle: string) => void;
  currentEnergy?: EnergyLevel;
  categories?: string[];
  onOpenSettings?: () => void;
}

export const BrainDump: React.FC<BrainDumpProps> = ({
  items,
  onUpdateItems,
  onSendToJournal,
  onOpenUnstickModal,
  currentEnergy = 'medium',
  categories,
  onOpenSettings,
}) => {
  const { t, language } = useI18n();
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unprocessed' | 'processed' | 'pinned'>('all');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BrainDumpItem | null>(null);
  const [journalTransferItem, setJournalTransferItem] = useState<BrainDumpItem | null>(null);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());

  // Listen for unified FAB click from App
  useEffect(() => {
    const handleFabClick = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.section === 'braindump') {
        setIsAddModalOpen(true);
      }
    };
    window.addEventListener('app:fab-clicked', handleFabClick);
    return () => window.removeEventListener('app:fab-clicked', handleFabClick);
  }, []);

  // Sync modal state with App for FAB visibility
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('app:modal-state-change', { detail: { isOpen: isAddModalOpen } })
    );
  }, [isAddModalOpen]);

  const toggleExpandItem = (id: string) => {
    soundEngine.playPop();
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  // Voice Dictation state
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // AI Tidy Up state
  const [isTidying, setIsTidying] = useState(false);
  const [tidyResult, setTidyResult] = useState<{ summary?: string; items: any[] } | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'fa' ? 'fa-IR' : 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError(language === 'fa' ? 'دسترسی میکروفون رد شد.' : 'Microphone permission was denied.');
        } else {
          setSpeechError(language === 'fa' ? 'خطا در تایپ صوتی. لطفاً تایپ کنید.' : 'Voice dictation error. Please try typing.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setSpeechError(language === 'fa' ? 'تشخیص صدا در این مرورگر پشتیبانی نمی‌شود.' : 'Speech recognition is not supported in this browser.');
      return;
    }

    setSpeechError(null);
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      soundEngine.playPop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        soundEngine.playGentleChime();
      } catch (err) {
        console.error(err);
        setIsListening(false);
      }
    }
  };

  const handleAddThought = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    soundEngine.playPop();
    const newItem: BrainDumpItem = {
      id: `bd-${Date.now()}`,
      content: trimmed,
      createdAt: Date.now(),
      isProcessed: false,
      isPinned: false,
    };

    onUpdateItems([newItem, ...items]);
    setInputText('');
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    setIsAddModalOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddThought();
    }
  };

  const handleTogglePin = (id: string) => {
    soundEngine.playPop();
    onUpdateItems(
      items.map((it) => (it.id === id ? { ...it, isPinned: !it.isPinned } : it))
    );
  };

  const handleToggleProcessed = (id: string) => {
    const item = items.find((it) => it.id === id);
    const willBeProcessed = item ? !item.isProcessed : true;

    if (willBeProcessed) {
      soundEngine.playGentleChime();
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#7e57c2', '#9c27b0', '#ffb74d', '#4caf50']
        });
      } catch (e) {}
    } else {
      soundEngine.playPop();
    }

    onUpdateItems(
      items.map((it) => (it.id === id ? { ...it, isProcessed: !it.isProcessed } : it))
    );
  };

  const handleDeleteItem = (id: string) => {
    soundEngine.playPop();
    onUpdateItems(items.filter((it) => it.id !== id));
  };

  const handleConfirmSendToJournal = (entryData: Partial<BujoEntry>) => {
    if (!journalTransferItem) return;
    onSendToJournal(entryData);
    // Remove the item from Brain Dump completely
    onUpdateItems(items.filter((it) => it.id !== journalTransferItem.id));
    setJournalTransferItem(null);
  };

  // Local Tidy Up (Fast & Offline)
  const handleAITidyUp = () => {
    const unprocessed = items.filter((i) => !i.isProcessed);

    if (unprocessed.length === 0) {
      alert(t('braindump.noUnprocessed'));
      return;
    }

    soundEngine.playGentleChime();

    // Instant local grouping by content keywords
    const structuredItems = unprocessed.map((it) => {
      const text = it.content.toLowerCase();
      let type: 'task' | 'note' | 'event' = 'task';
      let category = 'General';
      let energy: EnergyLevel = (currentEnergy as EnergyLevel) || 'low';

      if (/meet|call|appointment|doctor|dentist|birthday|party/i.test(text)) {
        type = 'event';
        category = 'Schedule';
      } else if (/idea|think|maybe|note|quote|remember|read/i.test(text)) {
        type = 'note';
        category = 'Ideas';
      } else if (/buy|shop|groceries|order|clean|wash|fix/i.test(text)) {
        type = 'task';
        category = 'Chores';
      } else if (/project|code|write|draft|email|work/i.test(text)) {
        type = 'task';
        category = 'Work';
        energy = 'medium';
      }

      return {
        type,
        content: it.content,
        energyCost: energy,
        category,
        isPriority: it.isPinned,
      };
    });

    setTidyResult({
      summary: language === 'fa' 
        ? `${toPersianDigits(unprocessed.length)} فکر دسته‌بندی و به موارد ساختاریافته تبدیل شد:`
        : `Organized ${unprocessed.length} thoughts into actionable journal items:`,
      items: structuredItems,
    });
  };

  const handleImportTidyItem = (item: any) => {
    soundEngine.playGentleChime();
    onSendToJournal({
      content: item.content,
      type: item.type || 'task',
      status: 'open',
      energyCost: item.energyCost || 'low',
      category: item.category || 'General',
      isPriority: item.isPriority || false
    });
    // remove from Brain Dump
    onUpdateItems(items.filter((i) => i.content !== item.content));
    // remove imported from tidy result view
    setTidyResult((prev) => prev ? {
      ...prev,
      items: prev.items.filter((i) => i.content !== item.content)
    } : null);
  };

  const handleImportAllTidy = () => {
    if (!tidyResult?.items) return;
    soundEngine.playGentleChime();
    const tidyContents = new Set(tidyResult.items.map((i) => i.content));
    tidyResult.items.forEach((item) => {
      onSendToJournal({
        content: item.content,
        type: item.type || 'task',
        status: 'open',
        energyCost: item.energyCost || 'low',
        category: item.category || 'General',
        isPriority: item.isPriority || false
      });
    });
    // Remove imported items from Brain Dump
    onUpdateItems(items.filter((i) => !tidyContents.has(i.content)));
    setTidyResult(null);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterMode === 'unprocessed' && item.isProcessed) return false;
    if (filterMode === 'processed' && !item.isProcessed) return false;
    if (filterMode === 'pinned' && !item.isPinned) return false;
    if (searchQuery.trim()) {
      return item.content.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const unprocessedCount = items.filter((i) => !i.isProcessed).length;

  const getFilterModeTitle = () => {
    switch (filterMode) {
      case 'unprocessed':
        return t('braindump.filterUnprocessed');
      case 'pinned':
        return t('braindump.filterPinned');
      case 'processed':
        return t('braindump.filterProcessed');
      case 'all':
      default:
        return t('braindump.filterAll');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-24 space-y-6">
      
      {/* Expandable Brain Dump Filters & Actions Top Panel */}
      <div className="bg-[#F8FAF5] dark:bg-[#182316] p-4 sm:p-5 rounded-[28px] border border-[#DCEAD4] dark:border-[#263722] shadow-xs space-y-3">
        {/* Header Bar with Filter Summary & Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            id="btn-toggle-braindump-filters"
            onClick={() => {
              soundEngine.playPop();
              setIsFilterExpanded((prev) => !prev);
            }}
            className="flex items-center gap-2 group text-left cursor-pointer"
            aria-expanded={isFilterExpanded}
          >
            <div className="w-8 h-8 rounded-xl bg-[#EDF6E8] dark:bg-[#1E2E1B] text-[#3B7E10] dark:text-[#80D141] flex items-center justify-center border border-[#DCEAD4] dark:border-[#263722] group-hover:scale-105 transition-transform">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-[#151E14] dark:text-[#E8F2E4]">
                  {getFilterModeTitle()}
                </span>
              </div>
              <p className="text-[11px] text-[#485B44] dark:text-[#9EB598]">
                {searchQuery 
                  ? `${language === 'fa' ? 'جستجو:' : 'Search:'} "${searchQuery}"` 
                  : `${language === 'fa' ? toPersianDigits(filteredItems.length) : filteredItems.length} ${filteredItems.length === 1 ? t('braindump.thoughtUnit') : t('braindump.thoughtsUnit')}`}
              </p>
            </div>
          </button>

          {/* Action Buttons & Expand Toggle */}
          <div className="flex items-center gap-2">
            {unprocessedCount > 0 && (
              <motion.button
                id="btn-tidy-brain-dump"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleAITidyUp}
                className="px-3 sm:px-3.5 py-1.5 rounded-full bg-[#EDF6E8] dark:bg-[#1E2E1B] hover:bg-[#DEEED6] text-[#151E14] dark:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#263722] font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
                title={t('braindump.tidyDump')}
              >
                <Wand2 className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
                <span className="hidden sm:inline">{t('braindump.tidyDump')}</span>
                <span className="sm:hidden">{t('braindump.tidy')}</span>
              </motion.button>
            )}

            <button
              onClick={() => {
                soundEngine.playPop();
                setIsFilterExpanded((prev) => !prev);
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#EDF6E8] dark:bg-[#1E2E1B] hover:bg-[#DEEED6] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#263722] text-xs font-semibold flex items-center gap-1 transition-colors"
              title={isFilterExpanded ? t('braindump.hide') : t('braindump.filters')}
              aria-label={isFilterExpanded ? t('braindump.hide') : t('braindump.filters')}
            >
              <span className="hidden sm:inline text-[11px] font-bold">{isFilterExpanded ? t('braindump.hide') : t('braindump.filters')}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFilterExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Expandable Filter Controls */}
        <AnimatePresence>
          {isFilterExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-[#DCEAD4] dark:border-[#263722] flex flex-wrap items-center justify-between gap-3">
                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-[#EDF6E8] dark:bg-[#1A2518] p-1 rounded-full border border-[#D4E6CC] dark:border-[#283824] overflow-x-auto max-w-full">
                  {[
                    { id: 'all', label: `${t('braindump.filterAll')} (${language === 'fa' ? toPersianDigits(items.length) : items.length})` },
                    { id: 'unprocessed', label: `${t('braindump.filterUnprocessed')} (${language === 'fa' ? toPersianDigits(unprocessedCount) : unprocessedCount})` },
                    { id: 'pinned', label: `${t('braindump.filterPinned')} (${language === 'fa' ? toPersianDigits(items.filter((i) => i.isPinned).length) : items.filter((i) => i.isPinned).length})` },
                    { id: 'processed', label: t('braindump.filterProcessed') },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setFilterMode(tab.id as any);
                        soundEngine.playPop();
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        filterMode === tab.id
                          ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                          : 'text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#677C62]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('braindump.searchPlaceholder')}
                    className="w-full pl-9 pr-7 py-1.5 rounded-full bg-white dark:bg-[#111A10] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:border-[#80D141]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#677C62] hover:text-[#151E14]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Thought Modal Window */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div 
            id="add-thought-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsAddModalOpen(false);
              }
            }}
          >
            <motion.div
              id="add-thought-modal-window"
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="bg-[#F8FAF5] dark:bg-[#182316] rounded-[28px] p-5 sm:p-6 border border-[#DCEAD4] dark:border-[#263722] shadow-2xl w-full max-w-xl space-y-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-thought-title"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#DCEAD4] dark:border-[#263722]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#A2EB68] flex items-center justify-center font-bold">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 id="add-thought-title" className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {t('braindump.dropThought')}
                    </h3>
                    <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                      {t('braindump.freeWorkingMemory')}
                    </p>
                  </div>
                </div>

                <button
                  id="btn-close-add-thought-modal"
                  onClick={() => {
                    soundEngine.playPop();
                    setIsAddModalOpen(false);
                  }}
                  className="p-1.5 rounded-full text-[#485B44] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] transition-colors"
                  aria-label="Close add thought window"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Text Input Area */}
              <div className="relative">
                <textarea
                  id="input-thought-content"
                  ref={inputRef}
                  autoFocus
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={4}
                  placeholder={t('braindump.thoughtInputPlaceholder')}
                  className="w-full p-3.5 rounded-2xl bg-[#EDF6E8] dark:bg-[#1C281A] text-[#151E14] dark:text-[#E8F2E4] placeholder-[#677C62] dark:placeholder-[#889E84] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#80D141] leading-relaxed font-medium"
                />

                {/* Listening indicator */}
                {isListening && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full bg-[#FEE1DC] dark:bg-[#3E1C18] text-[#B3261E] dark:text-[#F2B8B5] text-xs font-bold w-fit animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-[#B3261E] animate-ping" />
                    <span>{t('braindump.listeningVoice')}</span>
                  </div>
                )}

                {speechError && (
                  <p className="text-xs text-[#B3261E] dark:text-[#F2B8B5] mt-1.5 font-medium">
                    {speechError}
                  </p>
                )}
              </div>

              {/* Modal Controls Bar */}
              <div className="flex items-center justify-between pt-1">
                {/* Dictate Voice Button */}
                <motion.button
                  id="btn-thought-dictate"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={toggleListening}
                  className={`px-3 py-2 rounded-full transition-all flex items-center gap-1.5 text-xs font-bold ${
                    isListening
                      ? 'bg-[#B3261E] text-white shadow-md animate-pulse'
                      : 'bg-[#EDF6E8] dark:bg-[#202E1E] text-[#1C3700] dark:text-[#A2EB68] hover:bg-[#D5F7B8]'
                  }`}
                  title={isListening ? (language === 'fa' ? 'توقف ضبط' : 'Stop Dictating') : t('braindump.voiceDictation')}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isListening ? t('braindump.listening') : t('braindump.voiceDictation')}</span>
                </motion.button>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-cancel-add-thought"
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] transition-colors"
                  >
                    {t('common.cancel')}
                  </button>

                  <motion.button
                    id="btn-submit-add-thought"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={handleAddThought}
                    disabled={!inputText.trim()}
                    className="px-5 py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] font-bold text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>{t('braindump.dropThoughtBtn')}</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Tidy Results Review Dialog if active */}
      <AnimatePresence>
        {tidyResult && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="bg-[#F8FAF5] dark:bg-[#182316] rounded-[28px] p-6 border-2 border-[#80D141] shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#80D141] text-[#0F2600] flex items-center justify-center font-bold">
                  ✨
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('braindump.tidySuggestions')}
                  </h3>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                    {tidyResult.summary || t('braindump.tidySub')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleImportAllTidy}
                  className="px-3.5 py-1.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-bold text-xs shadow-xs flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('braindump.acceptAllTidy')}</span>
                </button>
                <button
                  onClick={() => setTidyResult(null)}
                  className="p-1.5 rounded-full text-[#485B44] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E]"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {tidyResult.items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#EDF6E8] dark:bg-[#202E1E] border border-[#D4E6CC] dark:border-[#2C3E28] flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#80D141] text-[#0F2600]">
                        {it.type === 'task' ? t('journal.typeTask') : it.type === 'event' ? t('journal.typeEvent') : t('journal.typeNote')}
                      </span>
                      <span className="text-[10px] text-[#485B44] dark:text-[#9EB598] flex items-center gap-1 font-semibold">
                        <span>{ENERGY_LEVELS.find((l) => l.id === it.energyCost)?.icon || '🤏'}</span>
                        <span className="capitalize">{getEnergyLabel(it.energyCost, language)}</span>
                        <span>•</span>
                        <span>{getCategoryLabel(it.category, language)}</span>
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#151E14] dark:text-[#E8F2E4] leading-relaxed">
                      {it.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#D4E6CC]/60 dark:border-[#2C3E28]">
                    <button
                      onClick={() => handleImportTidyItem(it)}
                      className="px-2.5 py-1 rounded-full bg-[#80D141] text-[#0F2600] text-[11px] font-bold hover:bg-[#72BF36] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{t('braindump.addToJournal')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Thoughts List */}
      {filteredItems.length === 0 ? (
        <div id="braindump-empty-state" className="text-center py-12 px-4 rounded-[28px] bg-[#F8FAF5]/50 dark:bg-[#182316]/50 border border-dashed border-[#DCEAD4] dark:border-[#263722] space-y-3">
          <LerniMascot pose="zen" size="md" className="mb-2 mx-auto" />
          <h3 className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4] mb-1">
            {searchQuery ? t('braindump.noMatchingSearch') : (language === 'fa' ? 'ذهن شما پاک و آرام است!' : 'Your mind is clear!')}
          </h3>
          <p className="text-xs text-[#485B44] dark:text-[#9EB598] max-w-sm mx-auto">
            {searchQuery 
              ? t('braindump.clearSearchFilter') 
              : t('braindump.mindClearSub')}
          </p>
          {!searchQuery && (
            <motion.button
              id="btn-empty-drop-thought"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                soundEngine.playPop();
                setIsAddModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-bold text-xs sm:text-sm shadow-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('braindump.dropFirstThought')}</span>
            </motion.button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredItems.map((item) => {
              const isPinned = item.isPinned;
              const isProcessed = item.isProcessed;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => toggleExpandItem(item.id)}
                  className={`p-4 sm:p-5 rounded-[24px] transition-all border cursor-pointer select-none ${
                    isProcessed
                      ? 'bg-[#E1F6D0] dark:bg-[#1B3618] border-[#72C833] dark:border-[#529E25] shadow-xs'
                      : isPinned
                      ? 'bg-[#F8FAF5] dark:bg-[#1C281A] border-2 border-[#80D141] shadow-sm'
                      : 'bg-[#F8FAF5] dark:bg-[#182316] border-[#DCEAD4] dark:border-[#263722] hover:border-[#80D141]/60 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                    
                    {/* Content & Metadata */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      
                      {/* Check off / Mark processed */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleProcessed(item.id);
                        }}
                        className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center transition-all ${
                          isProcessed
                            ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                            : 'border-2 border-[#677C62] hover:border-[#80D141]'
                        }`}
                        title={isProcessed ? (language === 'fa' ? 'علامت‌گذاری به عنوان فعال' : 'Mark as active thought') : (language === 'fa' ? 'علامت‌گذاری به عنوان انجام‌شده' : 'Mark as dealt with')}
                      >
                        {isProcessed && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        {isPinned && (
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF8E1] text-[#B45309]">
                              📌 {t('braindump.filterPinned')}
                            </span>
                          </div>
                        )}

                        <p className="text-sm font-medium leading-relaxed break-words text-[#151E14] dark:text-[#E8F2E4] transition-all">
                          {item.content}
                        </p>
                      </div>

                    </div>

                    {/* Right: Expand / Collapse Down Arrow Button */}
                    <div className="shrink-0 self-start sm:self-center mt-0.5 sm:mt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandItem(item.id);
                        }}
                        className={`p-1.5 rounded-full transition-all ${
                          expandedItemIds.has(item.id)
                            ? 'bg-[#EDF6E8] dark:bg-[#202E1E] text-[#151E14] dark:text-[#E8F2E4]'
                            : 'text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] hover:text-[#151E14] dark:hover:text-[#E8F2E4]'
                        }`}
                        title={expandedItemIds.has(item.id) ? (language === 'fa' ? 'بستن گزینه‌ها' : 'Hide buttons') : (language === 'fa' ? 'نمایش گزینه‌ها' : 'Show buttons')}
                        aria-label={expandedItemIds.has(item.id) ? (language === 'fa' ? 'بستن گزینه‌ها' : 'Hide buttons') : (language === 'fa' ? 'نمایش گزینه‌ها' : 'Show buttons')}
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            expandedItemIds.has(item.id) ? 'rotate-180 text-[#3B7E10] dark:text-[#A2EB68]' : ''
                          }`}
                        />
                      </button>
                    </div>

                  </div>

                  {/* Downward Expandable Actions Area */}
                  <AnimatePresence>
                    {expandedItemIds.has(item.id) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        className="overflow-hidden cursor-default"
                      >
                        <div className="mt-3 pt-3 border-t border-[#DCEAD4] dark:border-[#263722] space-y-2.5">
                          {/* Time / Creation Indicator */}
                          <div className="flex items-center gap-1.5 text-xs text-[#485B44] dark:text-[#9EB598]">
                            <Clock className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
                            <span>
                              {t('braindump.recordedAt')} {language === 'fa' 
                                ? toPersianDigits(new Date(item.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })) 
                                : new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Actions Row */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            {/* Left: Quick Actions */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Unstick with AI (First) */}
                              {onOpenUnstickModal && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => onOpenUnstickModal(item.content)}
                                  className="px-3 py-1.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] hover:bg-[#D5F7B8] text-[#1C3700] dark:text-[#A2EB68] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                                  title={t('braindump.unstick')}
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>{t('braindump.unstick')}</span>
                                </motion.button>
                              )}

                              {/* Send to Bullet Journal */}
                              <button
                                onClick={() => {
                                  soundEngine.playPop();
                                  setJournalTransferItem(item);
                                }}
                                className="px-3 py-1.5 rounded-full bg-[#EDF6E8] dark:bg-[#202E1E] hover:bg-[#DDF4CD] text-[#163300] dark:text-[#A2EB68] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                                title={t('braindump.addToJournal')}
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>{t('braindump.addToJournal')}</span>
                              </button>
                            </div>

                            {/* Right: Item Management Actions */}
                            <div className="flex items-center gap-1 ml-auto">
                              {/* Pin */}
                              <button
                                onClick={() => handleTogglePin(item.id)}
                                className={`p-1.5 rounded-full transition-all ${
                                  isPinned ? 'text-[#80D141] bg-[#E8F8D8] dark:bg-[#1E3800]' : 'text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E]'
                                }`}
                                title={isPinned ? t('braindump.unpin') : t('braindump.pin')}
                              >
                                <Pin className="w-4 h-4" />
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => {
                                  soundEngine.playPop();
                                  setEditingItem(item);
                                }}
                                className="p-1.5 rounded-full text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] transition-colors"
                                title={language === 'fa' ? 'ویرایش فکر' : 'Edit thought'}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 rounded-full text-[#B3261E] hover:bg-[#FEE1DC] dark:hover:bg-[#3E1C18] transition-colors"
                                title={language === 'fa' ? 'حذف فکر' : 'Delete thought'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Brain Dump Item Modal */}
      <EditBrainDumpModal
        item={editingItem}
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        onSave={(updatedItem) => {
          onUpdateItems(items.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
        }}
      />

      {/* Send to Journal Configuration Modal */}
      <SendToJournalModal
        item={journalTransferItem}
        isOpen={Boolean(journalTransferItem)}
        onClose={() => setJournalTransferItem(null)}
        onConfirm={handleConfirmSendToJournal}
        currentEnergy={currentEnergy}
        categories={categories}
        onOpenSettings={onOpenSettings}
      />

    </div>
  );
};
