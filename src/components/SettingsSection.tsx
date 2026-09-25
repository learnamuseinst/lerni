import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Download, 
  Upload, 
  Trash2, 
  Moon, 
  Sun, 
  Volume2, 
  VolumeX, 
  Tag, 
  Plus, 
  RotateCcw,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  CalendarCheck,
  BookOpenText,
  Sprout,
  Timer,
  Brain,
  Sliders,
  Sparkles,
  CheckCircle2,
  Volume1,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Globe,
  Save,
  Clock
} from 'lucide-react';
import { UserPreferences, NavSection, DEFAULT_NAV_ORDER, Language, FocusTab, DEFAULT_FOCUS_TAB_ORDER } from '../types';
import { storage, DEFAULT_JOURNAL_CATEGORIES } from '../utils/storage';
import { soundEngine } from '../utils/audioSynth';
import { LerniMascot } from './Mascot/LerniMascot';
import { useI18n, getCategoryLabel, translations, TranslationKey } from '../utils/i18n';

interface SettingsSectionProps {
  prefs: UserPreferences;
  onUpdatePrefs: (updated: Partial<UserPreferences>) => void;
  onReloadAllData: () => void;
  onBack: () => void;
}

const SECTION_ICONS: Record<NavSection, React.ReactNode> = {
  planner: <CalendarCheck className="w-5 h-5" />,
  journal: <BookOpenText className="w-5 h-5" />,
  habits: <Sprout className="w-5 h-5" />,
  focus: <Timer className="w-5 h-5" />,
  braindump: <Brain className="w-5 h-5" />,
};

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  prefs,
  onUpdatePrefs,
  onReloadAllData,
  onBack,
}) => {
  const { language, setLanguage, t, isRtl } = useI18n();

  // Local draft state of user preferences (changes are only applied when user clicks Save)
  const [draftPrefs, setDraftPrefs] = useState<UserPreferences>(() => ({ ...prefs }));
  const prevPrefsRef = useRef(prefs);

  // Synchronize draft state if initial prefs prop changes externally (e.g. after a backup restore or reset)
  useEffect(() => {
    if (prevPrefsRef.current !== prefs) {
      const propsChanged =
        prevPrefsRef.current.language !== prefs.language ||
        prevPrefsRef.current.theme !== prefs.theme ||
        prevPrefsRef.current.geminiApiKey !== prefs.geminiApiKey ||
        prevPrefsRef.current.plannerCustomInstructions !== prefs.plannerCustomInstructions ||
        prevPrefsRef.current.navOrder !== prefs.navOrder ||
        prevPrefsRef.current.focusTabOrder !== prefs.focusTabOrder ||
        prevPrefsRef.current.journalCategories !== prefs.journalCategories;

      if (propsChanged) {
        setDraftPrefs({ ...prefs });
        setApiKeyInput(prefs.geminiApiKey || '');
        setPlannerInstructionsInput(prefs.plannerCustomInstructions || '');
      }
      prevPrefsRef.current = prefs;
    }
  }, [prefs]);

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [newCatInput, setNewCatInput] = useState('');
  const [catError, setCatError] = useState<string | null>(null);

  // Gemini API Key state
  const [apiKeyInput, setApiKeyInput] = useState(prefs.geminiApiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [keySavedMessage, setKeySavedMessage] = useState<string | null>(null);
  const [serverHasSharedKey, setServerHasSharedKey] = useState<boolean | null>(null);

  // Smart Planner Custom Instructions state
  const [plannerInstructionsInput, setPlannerInstructionsInput] = useState(prefs.plannerCustomInstructions || '');
  const [instructionsSavedMessage, setInstructionsSavedMessage] = useState<string | null>(null);

  // Active language in current session; language only changes when user clicks Save
  const isFa = language === 'fa';
  const isDraftFa = isFa;
  const selectedLanguage: Language = draftPrefs.language || language || 'en';

  useEffect(() => {
    // Check server key configuration
    fetch('/api/gemini/config')
      .then((res) => res.json())
      .then((data) => setServerHasSharedKey(Boolean(data.hasServerKey)))
      .catch(() => setServerHasSharedKey(false));
  }, []);

  // Update language in draft preferences only; does not apply until user clicks Save
  const handleLanguageChange = (newLang: Language) => {
    soundEngine.playGentleChime();
    setDraftPrefs((prev) => ({ ...prev, language: newLang }));
  };

  const handleSavePlannerInstructions = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    soundEngine.playGentleChime();
    setDraftPrefs((prev) => ({ ...prev, plannerCustomInstructions: plannerInstructionsInput.trim() }));
    setInstructionsSavedMessage(isDraftFa ? 'دستورالعمل‌ها ثبت شدند (برای ذخیره، روی «ذخیره» کلیک کنید)' : 'Planner custom instructions staged (click Save to apply)!');
    setTimeout(() => setInstructionsSavedMessage(null), 3500);
  };

  const handleClearPlannerInstructions = () => {
    soundEngine.playPop();
    setPlannerInstructionsInput('');
    setDraftPrefs((prev) => ({ ...prev, plannerCustomInstructions: '' }));
    setInstructionsSavedMessage(isDraftFa ? 'دستورالعمل‌ها پاک شدند.' : 'Instructions cleared.');
    setTimeout(() => setInstructionsSavedMessage(null), 3000);
  };

  const handleSaveCustomKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = apiKeyInput.trim();
    soundEngine.playGentleChime();
    setDraftPrefs((prev) => ({ ...prev, geminiApiKey: clean, useSharedFreeKey: false }));
    setTestResult(null);
    if (clean) {
      setKeySavedMessage(isDraftFa ? 'کلید ثبت شد (برای اعمال، روی «ذخیره» کلیک کنید)' : 'Personal Gemini API key staged (click Save to apply)!');
    } else {
      setKeySavedMessage(isDraftFa ? 'کلید سفارشی پاک شد.' : 'Custom key cleared.');
    }
    setTimeout(() => setKeySavedMessage(null), 3500);
  };

  const handleUseSharedKey = () => {
    soundEngine.playGentleChime();
    setApiKeyInput('');
    setDraftPrefs((prev) => ({ ...prev, geminiApiKey: '', useSharedFreeKey: true }));
    setTestResult(null);
    setKeySavedMessage(isDraftFa ? 'به سهمیه رایگان تغییر یافت (برای اعمال، روی «ذخیره» کلیک کنید)' : 'Switched to shared free key (click Save to apply).');
    setTimeout(() => setKeySavedMessage(null), 3500);
  };

  const handleClearKey = () => {
    soundEngine.playPop();
    setApiKeyInput('');
    setDraftPrefs((prev) => ({ ...prev, geminiApiKey: '', useSharedFreeKey: false }));
    setTestResult(null);
    setKeySavedMessage(isDraftFa ? 'کلید پاک شد.' : 'API key cleared.');
    setTimeout(() => setKeySavedMessage(null), 3000);
  };

  const handleTestConnection = async () => {
    setTestingKey(true);
    setTestResult(null);
    soundEngine.playPop();

    try {
      const activeKey = apiKeyInput.trim() || draftPrefs.geminiApiKey?.trim() || prefs.geminiApiKey?.trim();
      const res = await fetch('/api/gemini/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: activeKey || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        soundEngine.playGentleChime();
        setTestResult({
          success: true,
          message: data.message || (isDraftFa ? 'اتصال به Gemini با موفقیت برقرار شد!' : 'Connected to Gemini API successfully!'),
        });
      } else {
        soundEngine.playPop();
        setTestResult({
          success: false,
          message: data.message || (isDraftFa ? 'عدم امکان اتصال به Gemini.' : 'Could not connect to Gemini API.'),
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || (isDraftFa ? 'خطای شبکه در بررسی اتصال.' : 'Network error while testing Gemini connection.'),
      });
    } finally {
      setTestingKey(false);
    }
  };

  const currentNavOrder: NavSection[] = (draftPrefs.navOrder && draftPrefs.navOrder.length === 5)
    ? draftPrefs.navOrder
    : (prefs.navOrder && prefs.navOrder.length === 5 ? prefs.navOrder : DEFAULT_NAV_ORDER);

  const currentFocusTabOrder: FocusTab[] = (draftPrefs.focusTabOrder && draftPrefs.focusTabOrder.length === 2)
    ? draftPrefs.focusTabOrder
    : (prefs.focusTabOrder && prefs.focusTabOrder.length === 2 ? prefs.focusTabOrder : DEFAULT_FOCUS_TAB_ORDER);

  const currentCategories = (draftPrefs.journalCategories && draftPrefs.journalCategories.length > 0)
    ? draftPrefs.journalCategories
    : (prefs.journalCategories && prefs.journalCategories.length > 0 ? prefs.journalCategories : DEFAULT_JOURNAL_CATEGORIES);

  const initialNavOrder = (prefs.navOrder && prefs.navOrder.length === 5) ? prefs.navOrder : DEFAULT_NAV_ORDER;
  const initialFocusTabOrder = (prefs.focusTabOrder && prefs.focusTabOrder.length === 2) ? prefs.focusTabOrder : DEFAULT_FOCUS_TAB_ORDER;
  const initialCategories = (prefs.journalCategories && prefs.journalCategories.length > 0) ? prefs.journalCategories : DEFAULT_JOURNAL_CATEGORIES;

  // Track if any setting has changed compared to initial prefs
  const hasChanges =
    (draftPrefs.language && draftPrefs.language !== (prefs.language || 'en')) ||
    draftPrefs.theme !== prefs.theme ||
    (draftPrefs.soundEffectsEnabled ?? true) !== (prefs.soundEffectsEnabled ?? true) ||
    (draftPrefs.soundAlerts ?? true) !== (prefs.soundAlerts ?? true) ||
    Boolean(draftPrefs.useSharedFreeKey) !== Boolean(prefs.useSharedFreeKey) ||
    apiKeyInput.trim() !== (prefs.geminiApiKey || '') ||
    plannerInstructionsInput.trim() !== (prefs.plannerCustomInstructions || '') ||
    JSON.stringify(currentNavOrder) !== JSON.stringify(initialNavOrder) ||
    JSON.stringify(currentFocusTabOrder) !== JSON.stringify(initialFocusTabOrder) ||
    JSON.stringify(currentCategories) !== JSON.stringify(initialCategories);

  // Apply all draft settings and return
  const handleDone = () => {
    soundEngine.playGentleChime();
    const cleanApiKey = apiKeyInput.trim();
    const targetLang = draftPrefs.language || prefs.language || 'en';
    const finalPrefs: UserPreferences = {
      ...draftPrefs,
      language: targetLang,
      navOrder: currentNavOrder,
      focusTabOrder: currentFocusTabOrder,
      journalCategories: currentCategories,
      geminiApiKey: draftPrefs.useSharedFreeKey ? '' : cleanApiKey,
      useSharedFreeKey: cleanApiKey ? false : Boolean(draftPrefs.useSharedFreeKey),
      plannerCustomInstructions: plannerInstructionsInput.trim(),
    };
    if (targetLang !== language) {
      setLanguage(targetLang);
    }
    onUpdatePrefs(finalPrefs);
    onBack();
  };

  // Discard all draft changes and return
  const handleBack = () => {
    soundEngine.playPop();
    // Do not call onUpdatePrefs — all draft modifications are discarded!
    onBack();
  };

  // Reorder Navigation Section Handlers
  const handleMoveNavSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentNavOrder.length) return;

    const newOrder = [...currentNavOrder];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    soundEngine.playPop();
    setDraftPrefs((prev) => ({ ...prev, navOrder: newOrder }));
  };

  const handleResetNavOrder = () => {
    soundEngine.playPop();
    setDraftPrefs((prev) => ({ ...prev, navOrder: DEFAULT_NAV_ORDER }));
  };

  // Reorder Timer Section Tabs (Focus vs Tracker) Handlers
  const handleMoveTimerTab = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentFocusTabOrder.length) return;

    const newOrder = [...currentFocusTabOrder];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    soundEngine.playPop();
    setDraftPrefs((prev) => ({ ...prev, focusTabOrder: newOrder }));
  };

  const handleResetTimerTabOrder = () => {
    soundEngine.playPop();
    setDraftPrefs((prev) => ({ ...prev, focusTabOrder: DEFAULT_FOCUS_TAB_ORDER }));
  };

  // Category Handlers
  const handleAddCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCatInput.trim();
    if (!trimmed) return;

    if (currentCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCatError(isDraftFa ? `برچسب "${trimmed}" قبلاً وجود دارد.` : `Category "${trimmed}" already exists.`);
      soundEngine.playPop();
      return;
    }

    const updated = [...currentCategories, trimmed];
    setDraftPrefs((prev) => ({ ...prev, journalCategories: updated }));
    setNewCatInput('');
    setCatError(null);
    soundEngine.playGentleChime();
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (currentCategories.length <= 1) {
      setCatError(isDraftFa ? 'حداقل یک دسته‌بندی باید وجود داشته باشد.' : 'You need at least one category.');
      soundEngine.playPop();
      return;
    }
    const updated = currentCategories.filter((c) => c !== catToRemove);
    setDraftPrefs((prev) => ({ ...prev, journalCategories: updated }));
    setCatError(null);
    soundEngine.playPop();
  };

  const handleResetCategories = () => {
    setDraftPrefs((prev) => ({ ...prev, journalCategories: DEFAULT_JOURNAL_CATEGORIES }));
    setCatError(null);
    soundEngine.playPop();
  };

  // Backup Handlers
  const handleExport = () => {
    const json = storage.exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lerni-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    soundEngine.playGentleChime();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const success = storage.importAllData(content);
        if (success) {
          setImportStatus(isDraftFa ? 'اطلاعات با موفقیت بازیابی شد!' : 'Data successfully restored!');
          soundEngine.playGentleChime();
          onReloadAllData();
        } else {
          setImportStatus(isDraftFa ? 'خطا در خواندن فایل JSON.' : 'Failed to parse JSON file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    const confirmPrompt = isDraftFa
      ? 'آیا مطمئن هستید که می‌خواهید تمام اطلاعات لرنی را به حالت پیش‌فرض بازنشانی کنید؟ این عمل غیرقابل بازگشت است.'
      : 'Reset all Lerni data back to defaults? This cannot be undone.';
    if (window.confirm(confirmPrompt)) {
      localStorage.clear();
      onReloadAllData();
      soundEngine.playPop();
      onBack();
    }
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-2 space-y-6">
      
      {/* Header: Cancel on start, Save on end, Pending changes banner below, Title below */}
      <div className="space-y-3 pb-4 border-b border-[#D8E8D0] dark:border-[#22301F]">
        {/* Top Control Bar with Cancel and Save */}
        <div className="flex items-center justify-between">
          <motion.button
            id="btn-settings-cancel"
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] text-[#3B4E37] dark:text-[#B6CCB0] hover:text-[#151E14] dark:hover:text-[#E8F2E4] text-xs font-bold border border-[#D8E8D0] dark:border-[#273722] transition-colors shadow-2xs cursor-pointer"
            title={isDraftFa ? 'انصراف' : 'Cancel'}
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span>{t('common.cancel', 'Cancel')}</span>
          </motion.button>

          <button
            id="btn-settings-save"
            type="button"
            onClick={handleDone}
            className="px-5 py-2 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-xs font-bold text-[#0F2600] shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            title={isDraftFa ? 'ذخیره' : 'Save'}
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{isDraftFa ? 'ذخیره' : 'Save'}</span>
          </button>
        </div>

        {/* Pending changes text displayed just below the Cancel and Save buttons */}
        {hasChanges && (
          <div
            id="settings-pending-changes-banner"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold text-amber-800 dark:text-amber-300"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>
              {isDraftFa
                ? 'تغییراتی اعمال‌نشده وجود دارد. برای ثبت تغییرات روی «ذخیره» کلیک کنید.'
                : 'You have pending changes. Click "Save" to apply.'}
            </span>
          </div>
        )}

        {/* Title and Mascot on the line below (subtitle removed) */}
        <div className="flex items-center gap-3.5 pt-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center p-1.5 shadow-xs shrink-0">
            <LerniMascot pose="waving" size="xs" interactive={false} />
          </div>
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#151E14] dark:text-[#E8F2E4]">
              {t('settings.title', 'Settings & Preferences')}
            </h2>
          </div>
        </div>
      </div>

      {/* Grid Layout for Settings Options */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Language, AI Configuration, Navigation Order */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Multilingual Selection (English & Persian RTL) */}
          <section id="section-settings-language" className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141]">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('settings.languageSection', 'Language & Direction')}
                  </h3>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                    {t('settings.languageDesc', 'Select your preferred interface language')}
                  </p>
                </div>
              </div>
            </div>

            {/* Language Toggle Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* English (LTR) */}
              <button
                id="btn-lang-en"
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`p-4 rounded-2xl flex items-center justify-between border transition-all text-start cursor-pointer ${
                  selectedLanguage === 'en'
                    ? 'bg-[#80D141]/15 dark:bg-[#80D141]/20 border-[#80D141] shadow-xs ring-1 ring-[#80D141]'
                    : 'bg-[#F7FAF4] dark:bg-[#1C2919] text-[#485B44] dark:text-[#9EB598] border-[#DCEAD4] dark:border-[#2A3E26] hover:bg-[#E2F5D1]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    English
                  </div>
                  <div className="text-[10px] text-[#485B44] dark:text-[#9EB598]">
                    Left-to-Right (LTR)
                  </div>
                </div>
                {selectedLanguage === 'en' && (
                  <div className="w-6 h-6 rounded-full bg-[#80D141] text-[#0F2600] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Persian (RTL) */}
              <button
                id="btn-lang-fa"
                type="button"
                onClick={() => handleLanguageChange('fa')}
                className={`p-4 rounded-2xl flex items-center justify-between border transition-all text-start cursor-pointer ${
                  selectedLanguage === 'fa'
                    ? 'bg-[#80D141]/15 dark:bg-[#80D141]/20 border-[#80D141] shadow-xs ring-1 ring-[#80D141]'
                    : 'bg-[#F7FAF4] dark:bg-[#1C2919] text-[#485B44] dark:text-[#9EB598] border-[#DCEAD4] dark:border-[#2A3E26] hover:bg-[#E2F5D1]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    فارسی (Persian)
                  </div>
                  <div className="text-[10px] text-[#485B44] dark:text-[#9EB598]">
                    راست‌به‌چپ (RTL)
                  </div>
                </div>
                {selectedLanguage === 'fa' && (
                  <div className="w-6 h-6 rounded-full bg-[#80D141] text-[#0F2600] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </section>
          
          {/* Feature: Gemini AI API Key Configuration */}
          <section id="section-settings-gemini" className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {t('settings.geminiSection', 'Gemini AI Configuration')}
                    </h3>
                  </div>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                    {t('settings.geminiDesc', 'Fast schedule generator and gentle task breakdown')}
                  </p>
                </div>
              </div>
            </div>

            {/* Free Community Shared Key vs Custom Personal Key Option */}
            <div className="p-4 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {isDraftFa ? 'سهمیه اشتراکی رایگان لرنی' : 'Free Community Gemini Key'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1E4300] dark:text-[#80D141]">
                      {isDraftFa ? 'بدون نیاز به تنظیمات' : 'Ready to use'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#485B44] dark:text-[#9EB598]">
                    {isDraftFa 
                      ? 'همراه با کلید از پیش تنظیم‌شده سرور برای تولید فوری برنامه.'
                      : 'Built-in Gemini API key for instant smart schedule synthesis.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleUseSharedKey}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    draftPrefs.useSharedFreeKey && !draftPrefs.geminiApiKey
                      ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                      : 'bg-white dark:bg-[#263722] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#33482E]'
                  }`}
                >
                  {draftPrefs.useSharedFreeKey && !draftPrefs.geminiApiKey
                    ? (isDraftFa ? '✓ فعال' : '✓ Active')
                    : (isDraftFa ? 'استفاده' : 'Use Free Key')}
                </button>
              </div>

              {/* Custom Key Accordion / Form */}
              <div className="pt-3 border-t border-[#DCEAD4] dark:border-[#2A3E26] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#80D141]" />
                    <span>{t('settings.customApiKey', 'Personal Gemini API Key')}</span>
                  </label>

                  {(draftPrefs.geminiApiKey || apiKeyInput) && (
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="text-[11px] text-[#B3261E] dark:text-[#F2B8B5] hover:underline font-medium cursor-pointer"
                    >
                      {isDraftFa ? 'پاک کردن کلید' : 'Clear key'}
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveCustomKey} className="space-y-2">
                  <div className="relative flex items-center">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={isDraftFa ? 'کلید اختصاصی خود (AIzaSy...) را وارد کنید' : 'Paste your API key (AIzaSy...)'}
                      className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-white dark:bg-[#22301F] border border-[#DCEAD4] dark:border-[#2E402B] text-xs font-mono text-[#151E14] dark:text-[#E8F2E4] placeholder:font-sans placeholder:text-[#79747E] dark:placeholder:text-[#8D9E8A] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 p-1 rounded-lg text-[#79747E] hover:text-[#151E14] dark:hover:text-[#E8F2E4] transition-colors cursor-pointer"
                      title={showKey ? 'Hide key' : 'Show key'}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={!apiKeyInput.trim() || apiKeyInput === (draftPrefs.geminiApiKey || '')}
                      className="px-4 py-2 rounded-xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      {t('settings.saveKey', 'Save API Key')}
                    </button>

                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingKey || (!apiKeyInput.trim() && !draftPrefs.geminiApiKey)}
                      className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#263722] hover:bg-[#E2F2D9] dark:hover:bg-[#2E4229] disabled:opacity-40 text-[#3B4E37] dark:text-[#B6CCB0] text-xs font-bold border border-[#DCEAD4] dark:border-[#33482E] transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {testingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>{t('settings.testKey', 'Test Connection')}</span>
                    </button>
                  </div>
                </form>

                {/* Helper Link */}
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-[#485B44] dark:text-[#9EB598]">
                    {isDraftFa ? 'ذخیره‌شده محلی در مرورگر' : 'Stored locally in your browser'}
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#3B7E10] dark:text-[#80D141] hover:underline font-bold flex items-center gap-1"
                  >
                    <span>{isDraftFa ? 'دریافت کلید رایگان Google AI Studio' : 'Get free key from Google AI Studio'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Notification & Test Result Feedback Banners */}
            <AnimatePresence>
              {keySavedMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-2.5 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 text-xs font-bold text-[#1C3700] dark:text-[#80D141] flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{keySavedMessage}</span>
                </motion.div>
              )}

              {testResult && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-[#E8F8D8] dark:bg-[#1E3800] border-[#80D141]/50 text-[#1C3700] dark:text-[#80D141]'
                      : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300'
                  }`}
                >
                  {testResult.success ? (
                    <ShieldCheck className="w-4 h-4 shrink-0 text-[#80D141] mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="font-bold">{testResult.success ? (isDraftFa ? 'اتصال موفق: ' : 'Connection Verified: ') : (isDraftFa ? 'خطا در اتصال: ' : 'Connection Issue: ')}</span>
                    <span>{testResult.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestResult(null)}
                    className="p-0.5 rounded-full hover:bg-black/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Smart Planner Custom Instructions Section */}
          <section id="section-settings-planner-instructions" className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('settings.plannerInstructionsSection', 'Smart Planner Custom Instructions')}
                  </h3>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                    {t('settings.plannerInstructionsDesc', 'Persistent rules & preferences for how AI structures your daily schedules')}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSavePlannerInstructions} className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <textarea
                  value={plannerInstructionsInput}
                  onChange={(e) => setPlannerInstructionsInput(e.target.value)}
                  placeholder={t('settings.plannerInstructionsPlaceholder', 'e.g., Never schedule deep work after 4 PM; Always add 15min rest after meetings; Group errands together in the morning...')}
                  rows={4}
                  className="w-full p-3.5 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] text-xs text-[#151E14] dark:text-[#E8F2E4] placeholder:text-[#79747E] dark:placeholder:text-[#7D917A] focus:outline-none focus:ring-2 focus:ring-[#80D141] resize-none transition-all leading-relaxed"
                />
              </div>

              {/* Example suggestions chips */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-bold text-[#485B44] dark:text-[#9EB598]">
                  {isDraftFa ? 'پیشنهادهای سریع:' : 'Quick ideas:'}
                </span>
                {[
                  isDraftFa ? '🚫 بعد از ساعت ۵ عصر کار سنگین نگذار' : '🚫 No heavy work after 5 PM',
                  isDraftFa ? '☕ بعد از هر کار فکری ۱۰ دقیقه استراحت بده' : '☕ 10min buffer between focus blocks',
                  isDraftFa ? '🏃 کارهای حرکتی را اول صبح قرار بده' : '🏃 Put physical tasks in morning',
                ].map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => {
                      soundEngine.playPop();
                      setPlannerInstructionsInput((prev) => {
                        const trimmed = prev.trim();
                        return trimmed ? `${trimmed}\n${idea}` : idea;
                      });
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] text-[#2F6B12] dark:text-[#9DD97A] border border-[#DCEAD4] dark:border-[#2C4027] font-medium transition-colors cursor-pointer"
                  >
                    {idea}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={plannerInstructionsInput.trim() === (draftPrefs.plannerCustomInstructions || '')}
                    className="px-4 py-2 rounded-xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{t('settings.saveInstructions', 'Save Instructions')}</span>
                  </button>

                  {(plannerInstructionsInput || draftPrefs.plannerCustomInstructions) && (
                    <button
                      type="button"
                      onClick={handleClearPlannerInstructions}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-[#22301F] text-[#B3261E] dark:text-[#F2B8B5] hover:bg-[#FFEAEA] dark:hover:bg-[#3B1C1A] text-xs font-bold border border-[#DCEAD4] dark:border-[#33482E] transition-all cursor-pointer"
                    >
                      {isDraftFa ? 'پاک کردن' : 'Clear'}
                    </button>
                  )}
                </div>

                <span className="text-[11px] text-[#485B44] dark:text-[#9EB598]">
                  {isDraftFa ? 'در تمام برنامه‌ریزی‌های هوشمند اعمال می‌شود' : 'Applied across all AI schedules'}
                </span>
              </div>
            </form>

            <AnimatePresence>
              {instructionsSavedMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-2.5 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 text-xs font-bold text-[#1C3700] dark:text-[#80D141] flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{instructionsSavedMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Feature 1: Reorder Navigation Sections */}
          <section id="section-settings-navigation" className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141]">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('settings.navOrderSection', 'Navigation Section Order')}
                  </h3>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                    {t('settings.navOrderDesc', 'Reorder tabs in the navigation bar')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetNavOrder}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-[#3B7E10] dark:text-[#80D141] bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] border border-[#D8E8D0] dark:border-[#273722] flex items-center gap-1.5 transition-colors"
                title={t('settings.resetNavOrder', 'Reset Order')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('settings.resetNavOrder', 'Reset Order')}</span>
              </button>
            </div>

            {/* Interactive Reordering List */}
            <div className="space-y-2 pt-1">
              {currentNavOrder.map((secId, index) => {
                const icon = SECTION_ICONS[secId];
                const label = t(`nav.${secId}`, secId);
                const isFirst = index === 0;
                const isLast = index === currentNavOrder.length - 1;

                return (
                  <motion.div
                    key={secId}
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] hover:border-[#80D141]/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Position Number */}
                      <span className="w-6 h-6 rounded-full bg-white dark:bg-[#263722] border border-[#DCEAD4] dark:border-[#344D2F] flex items-center justify-center text-xs font-bold text-[#485B44] dark:text-[#9EB598] shrink-0">
                        {isDraftFa ? (index + 1).toLocaleString('fa-IR') : index + 1}
                      </span>

                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1E4300] dark:text-[#80D141] flex items-center justify-center shrink-0">
                        {icon}
                      </div>

                      {/* Section Name */}
                      <h4 className="font-bold text-sm text-[#151E14] dark:text-[#E8F2E4] truncate">
                        {label}
                      </h4>
                    </div>

                    {/* Reorder Buttons (Move Up / Move Down) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveNavSection(index, 'up')}
                        disabled={isFirst}
                        aria-label={`Move ${label} Up`}
                        className="p-2 rounded-xl bg-white dark:bg-[#263722] border border-[#DCEAD4] dark:border-[#33482E] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] hover:bg-[#E2F2D9] dark:hover:bg-[#2E4229] disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveNavSection(index, 'down')}
                        disabled={isLast}
                        aria-label={`Move ${label} Down`}
                        className="p-2 rounded-xl bg-white dark:bg-[#263722] border border-[#DCEAD4] dark:border-[#33482E] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] hover:bg-[#E2F2D9] dark:hover:bg-[#2E4229] disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Feature: Timer Tabs Reordering (Focus vs Tracker) */}
          <section className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#162114] border border-[#DCEAD4] dark:border-[#22301F] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1E4300] dark:text-[#80D141] flex items-center justify-center">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('settings.timerTabOrderSection', 'Timer Tabs Order')}
                  </h3>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                    {t('settings.timerTabOrderDesc', 'Reorder Focus and Tracker in the Timer section')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetTimerTabOrder}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-[#3B7E10] dark:text-[#80D141] bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] border border-[#D8E8D0] dark:border-[#273722] flex items-center gap-1.5 transition-colors cursor-pointer"
                title={t('settings.resetTimerTabOrder', 'Reset Tabs Order')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('settings.resetNavOrder', 'Reset Order')}</span>
              </button>
            </div>

            {/* Interactive Reordering List */}
            <div className="space-y-2 pt-1">
              {currentFocusTabOrder.map((tabId, index) => {
                const isFocus = tabId === 'focus';
                const icon = isFocus ? <Timer className="w-5 h-5" /> : <Clock className="w-5 h-5" />;
                const label = isFocus ? t('timer.tabFocus') : t('timer.tabTracker');
                const desc = isFocus ? t('settings.timerFocusDesc') : t('settings.timerTrackerDesc');
                const isFirst = index === 0;
                const isLast = index === currentFocusTabOrder.length - 1;

                return (
                  <motion.div
                    key={tabId}
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] hover:border-[#80D141]/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Position Number */}
                      <span className="w-6 h-6 rounded-full bg-white dark:bg-[#263722] border border-[#DCEAD4] dark:border-[#344D2F] flex items-center justify-center text-xs font-bold text-[#485B44] dark:text-[#9EB598] shrink-0">
                        {isDraftFa ? (index + 1).toLocaleString('fa-IR') : index + 1}
                      </span>

                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1E4300] dark:text-[#80D141] flex items-center justify-center shrink-0">
                        {icon}
                      </div>

                      {/* Name & Subtitle */}
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-[#151E14] dark:text-[#E8F2E4] truncate">
                          {label}
                        </h4>
                        <p className="text-[11px] text-[#485B44] dark:text-[#9EB598] truncate hidden sm:block">
                          {desc}
                        </p>
                      </div>
                    </div>

                    {/* Reorder Buttons (Move Up / Move Down) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveTimerTab(index, 'up')}
                        disabled={isFirst}
                        aria-label={`Move ${label} Up`}
                        className="p-2 rounded-xl bg-white dark:bg-[#263722] border border-[#DCEAD4] dark:border-[#33482E] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] hover:bg-[#E2F2D9] dark:hover:bg-[#2E4229] disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveTimerTab(index, 'down')}
                        disabled={isLast}
                        aria-label={`Move ${label} Down`}
                        className="p-2 rounded-xl bg-white dark:bg-[#263722] border border-[#DCEAD4] dark:border-[#33482E] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] hover:bg-[#E2F2D9] dark:hover:bg-[#2E4229] disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Feature 2: Journal Categories Customization */}
          <section className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141]">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('settings.categoriesSection', 'Journal & Task Categories')}
                  </h3>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                    {t('settings.categoriesDesc', 'Personalize categorization tags for your notes and tasks')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetCategories}
                className="px-3 py-1.5 rounded-full text-xs font-bold text-[#3B7E10] dark:text-[#80D141] bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] border border-[#D8E8D0] dark:border-[#273722] flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset to default tags"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('common.reset', 'Reset')}</span>
              </button>
            </div>

            {/* Category Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {currentCategories.map((cat) => (
                <div
                  key={cat}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] shadow-2xs group"
                >
                  <span>{getCategoryLabel(cat, language)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(cat)}
                    disabled={currentCategories.length <= 1}
                    className="p-0.5 rounded-full hover:bg-[#FFEAEA] dark:hover:bg-[#3E1C18] text-[#79747E] hover:text-[#B3261E] dark:hover:text-[#F2B8B5] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    title={`Remove ${cat}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Category Input */}
            <form onSubmit={handleAddCategory} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newCatInput}
                onChange={(e) => {
                  setNewCatInput(e.target.value);
                  if (catError) setCatError(null);
                }}
                maxLength={20}
                placeholder={t('settings.categoryPlaceholder', 'Add new category (e.g. Creative, Finance)...')}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
              />
              <button
                type="submit"
                disabled={!newCatInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t('settings.addCategory', 'Add Tag')}</span>
              </button>
            </form>

            {catError && (
              <p className="text-[11px] font-semibold text-[#B3261E] dark:text-[#F2B8B5]">
                {catError}
              </p>
            )}
          </section>

        </div>

        {/* Right Column: Appearance, Audio & Data Management */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Theme & Visuals */}
          <section className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141]">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                  {t('settings.themeSection', 'Visual Theme')}
                </h3>
                <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                  {t('settings.themeDesc', 'Eye-safe Forest Dark or Gentle Light')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDraftPrefs((prev) => ({ ...prev, theme: 'dark' }));
                  soundEngine.playPop();
                }}
                className={`py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  draftPrefs.theme === 'dark'
                    ? 'bg-[#80D141] text-[#0F2600] border-[#80D141] shadow-xs'
                    : 'bg-[#F7FAF4] dark:bg-[#1C2919] text-[#485B44] dark:text-[#9EB598] border-[#DCEAD4] dark:border-[#2A3E26] hover:bg-[#E2F5D1]'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>{t('settings.themeDark', 'Forest Dark')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDraftPrefs((prev) => ({ ...prev, theme: 'light' }));
                  soundEngine.playPop();
                }}
                className={`py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  draftPrefs.theme === 'light'
                    ? 'bg-[#80D141] text-[#0F2600] border-[#80D141] shadow-xs'
                    : 'bg-[#F7FAF4] dark:bg-[#1C2919] text-[#485B44] dark:text-[#9EB598] border-[#DCEAD4] dark:border-[#2A3E26] hover:bg-[#E2F5D1]'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>{t('settings.themeLight', 'Gentle Light')}</span>
              </button>
            </div>
          </section>

          {/* Audio & Sensory Feedback */}
          <section className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141]">
                  {(draftPrefs.soundEffectsEnabled ?? true) ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('settings.audioSection', 'Audio & Sensory Cues')}
                  </h3>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                    {t('settings.audioDesc', 'Haptic audio clicks & completion chimes')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playGentleChime();
                }}
                className="px-2.5 py-1 rounded-full bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] text-[11px] font-bold text-[#3B4E37] dark:text-[#B6CCB0] border border-[#D8E8D0] dark:border-[#273722] flex items-center gap-1 cursor-pointer"
                title="Play test chime"
              >
                <Volume1 className="w-3.5 h-3.5" />
                <span>{t('common.test', 'Test')}</span>
              </button>
            </div>

            {/* Master UI Sounds */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26]">
              <div className="text-xs">
                <div className="font-bold text-[#151E14] dark:text-[#E8F2E4]">{t('settings.uiSounds', 'UI Sound Effects')}</div>
                <div className="text-[#485B44] dark:text-[#9EB598] text-[11px]">{t('settings.uiSoundsSub', 'Subtle pops, navigation taps, and feedback')}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftPrefs.soundEffectsEnabled ?? true}
                  onChange={(e) => {
                    const isEnabled = e.target.checked;
                    setDraftPrefs((prev) => ({ ...prev, soundEffectsEnabled: isEnabled }));
                    if (isEnabled) {
                      soundEngine.playPop();
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:left-auto rtl:after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#80D141]"></div>
              </label>
            </div>

            {/* Harmonic Completion Chime */}
            <div className={`flex items-center justify-between p-3.5 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] transition-opacity ${
              !(draftPrefs.soundEffectsEnabled ?? true) ? 'opacity-50 pointer-events-none' : ''
            }`}>
              <div className="text-xs">
                <div className="font-bold text-[#151E14] dark:text-[#E8F2E4]">{t('settings.taskChimes', 'Task Completion Chimes')}</div>
                <div className="text-[#485B44] dark:text-[#9EB598] text-[11px]">{t('settings.taskChimesSub', 'Gentle arpeggio on task done & timer finish')}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!(draftPrefs.soundEffectsEnabled ?? true)}
                  checked={(draftPrefs.soundAlerts ?? true) && (draftPrefs.soundEffectsEnabled ?? true)}
                  onChange={(e) => {
                    const isAlerts = e.target.checked;
                    setDraftPrefs((prev) => ({ ...prev, soundAlerts: isAlerts }));
                    if (isAlerts && (draftPrefs.soundEffectsEnabled ?? true)) {
                      soundEngine.playGentleChime();
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:left-auto rtl:after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#80D141]"></div>
              </label>
            </div>
          </section>

          {/* Backup, Export & Danger Zone */}
          <section className="p-5 sm:p-6 rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141]">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                  {t('settings.backupSection', 'Backup & Data')}
                </h3>
                <p className="text-xs text-[#485B44] dark:text-[#9EB598]">
                  {t('settings.backupDesc', 'Export or restore your workspace locally')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="py-2.5 px-3 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] hover:bg-[#E2F5D1] dark:hover:bg-[#2E422A] text-[#1D3A00] dark:text-[#A2EB68] text-xs font-bold border border-[#DCEAD4] dark:border-[#2A3E26] shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('settings.exportBtn', 'Export JSON')}</span>
              </button>

              <label className="py-2.5 px-3 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] hover:bg-[#E2F5D1] dark:hover:bg-[#2E422A] text-[#1D3A00] dark:text-[#A2EB68] text-xs font-bold border border-[#DCEAD4] dark:border-[#2A3E26] shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{t('settings.restoreBtn', 'Restore JSON')}</span>
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>
            </div>

            {importStatus && (
              <div className="text-xs font-bold text-green-700 dark:text-green-400 text-center">
                {importStatus}
              </div>
            )}

            <div className="pt-3 border-t border-[#DCEAD4] dark:border-[#2A3E26] flex justify-between items-center">
              <button
                onClick={handleResetData}
                className="text-xs text-[#B3261E] dark:text-[#F2B8B5] hover:underline flex items-center gap-1.5 font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('settings.resetDemoBtn', 'Reset Demo Data')}</span>
              </button>
            </div>
          </section>

        </div>

      </div>

    </div>
  );
};
