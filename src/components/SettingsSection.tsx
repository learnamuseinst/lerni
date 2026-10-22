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
  Eraser,
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
  Clock,
  Copy,
  Terminal,
  Send,
  MessageSquare,
  Zap,
  Server,
  Layers,
  Cpu,
  ChevronDown,
  ChevronsUpDown,
  Smartphone,
} from 'lucide-react';
import {
  UserPreferences,
  NavSection,
  DEFAULT_NAV_ORDER,
  Language,
  FocusTab,
  DEFAULT_FOCUS_TAB_ORDER,
  AiProvider,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  DEFAULT_CUSTOM_OPENAI_BASE_URL,
  DEFAULT_CUSTOM_OPENAI_MODEL,
  GEMINI_MODEL_PRESETS,
  OPENROUTER_MODEL_PRESETS,
  isLocalEndpoint,
} from '../types';
import { storage, DEFAULT_JOURNAL_CATEGORIES } from '../utils/storage';
import { soundEngine } from '../utils/audioSynth';
import { LerniMascot } from './Mascot/LerniMascot';
import { useI18n, getCategoryLabel, translations, TranslationKey } from '../utils/i18n';
import { testAiConnection, testAiPrompt } from '../utils/aiScheduler';
import { usePwaInstall } from '../utils/usePwaInstall';

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
        prevPrefsRef.current.aiProvider !== prefs.aiProvider ||
        prevPrefsRef.current.geminiApiKey !== prefs.geminiApiKey ||
        prevPrefsRef.current.geminiModel !== prefs.geminiModel ||
        prevPrefsRef.current.openRouterApiKey !== prefs.openRouterApiKey ||
        prevPrefsRef.current.openRouterModel !== prefs.openRouterModel ||
        prevPrefsRef.current.customOpenAiBaseUrl !== prefs.customOpenAiBaseUrl ||
        prevPrefsRef.current.customOpenAiApiKey !== prefs.customOpenAiApiKey ||
        prevPrefsRef.current.customOpenAiModel !== prefs.customOpenAiModel ||
        prevPrefsRef.current.customOpenAiApiVersion !== prefs.customOpenAiApiVersion ||
        prevPrefsRef.current.plannerCustomInstructions !== prefs.plannerCustomInstructions ||
        prevPrefsRef.current.navOrder !== prefs.navOrder ||
        prevPrefsRef.current.focusTabOrder !== prefs.focusTabOrder ||
        prevPrefsRef.current.journalCategories !== prefs.journalCategories;

      if (propsChanged) {
        setDraftPrefs({ ...prefs });
        setApiKeyInput(prefs.geminiApiKey || '');
        setGeminiModelInput(prefs.geminiModel || DEFAULT_GEMINI_MODEL);
        setOpenRouterKeyInput(prefs.openRouterApiKey || '');
        setOpenRouterModelInput(prefs.openRouterModel || DEFAULT_OPENROUTER_MODEL);
        setCustomBaseUrlInput(
          prefs.customOpenAiBaseUrl ||
            (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_BASE_URL : '') ||
            ''
        );
        setCustomKeyInput(
          prefs.customOpenAiApiKey ||
            (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_API_KEY : '') ||
            ''
        );
        setCustomModelInput(
          prefs.customOpenAiModel ||
            (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_MODEL : '') ||
            ''
        );
        setCustomApiVersionInput(
          prefs.customOpenAiApiVersion ||
            (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_API_VERSION : '') ||
            ''
        );
        setPlannerInstructionsInput(prefs.plannerCustomInstructions || '');
      }
      prevPrefsRef.current = prefs;
    }
  }, [prefs]);

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [newCatInput, setNewCatInput] = useState('');
  const [catError, setCatError] = useState<string | null>(null);
  const [showCleanConfirm, setShowCleanConfirm] = useState(false);
  const [cleanSuccessMessage, setCleanSuccessMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // AI Provider & API Key state
  const [apiKeyInput, setApiKeyInput] = useState(prefs.geminiApiKey || '');
  const [geminiModelInput, setGeminiModelInput] = useState(prefs.geminiModel || DEFAULT_GEMINI_MODEL);
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState(prefs.openRouterApiKey || '');
  const [openRouterModelInput, setOpenRouterModelInput] = useState(prefs.openRouterModel || DEFAULT_OPENROUTER_MODEL);

  // Custom OpenAI-compatible state (clean inputs, user defines everything)
  const [customBaseUrlInput, setCustomBaseUrlInput] = useState(
    prefs.customOpenAiBaseUrl ||
      (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_BASE_URL : '') ||
      ''
  );
  const [customKeyInput, setCustomKeyInput] = useState(
    prefs.customOpenAiApiKey ||
      (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_API_KEY : '') ||
      ''
  );
  const [customModelInput, setCustomModelInput] = useState(
    prefs.customOpenAiModel ||
      (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_MODEL : '') ||
      ''
  );
  const [customApiVersionInput, setCustomApiVersionInput] = useState(
    prefs.customOpenAiApiVersion ||
      (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_API_VERSION : '') ||
      ''
  );

  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [keySavedMessage, setKeySavedMessage] = useState<string | null>(null);

  // Interactive API Key Tester / Playground state
  const [testPromptInput, setTestPromptInput] = useState('');
  const [testingPrompt, setTestingPrompt] = useState(false);
  const [promptTestResult, setPromptTestResult] = useState<{
    success: boolean;
    prompt: string;
    response: string;
    error?: string;
    latencyMs: number;
    model: string;
    provider: AiProvider;
    timestamp: string;
  } | null>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const selectedProvider: AiProvider = draftPrefs.aiProvider || prefs.aiProvider || 'gemini';

  // PWA install prompt & standalone detection hook
  const { canInstall, isInstalled, isInstalling, isIos, promptInstall } = usePwaInstall();

  // Section accordion state: track which sections are expanded
  // Expandable sections state - keeps the settings clean and uncluttered
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    language: true,
    theme: false,
    install: false,
    ai: true,
    planner: false,
    navigation: false,
    focus: false,
    categories: false,
    audio: false,
    backup: false,
  });

  const toggleSection = (id: string) => {
    soundEngine.playPop();
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allExpanded = Object.values(expandedSections).every(Boolean);
  const toggleAllSections = () => {
    soundEngine.playPop();
    const nextState = !allExpanded;
    setExpandedSections({
      language: nextState,
      theme: nextState,
      install: nextState,
      ai: nextState,
      planner: nextState,
      navigation: nextState,
      focus: nextState,
      categories: nextState,
      audio: nextState,
      backup: nextState,
    });
  };

  // Smart Planner Custom Instructions state
  const [plannerInstructionsInput, setPlannerInstructionsInput] = useState(prefs.plannerCustomInstructions || '');
  const [instructionsSavedMessage, setInstructionsSavedMessage] = useState<string | null>(null);

  // Active language in current session and draft preview
  const selectedLanguage: Language = draftPrefs.language || language || 'en';
  const isDraftFa = selectedLanguage === 'fa';
  const isFa = language === 'fa';

  // Update language in draft preferences only; does not apply until user clicks Save
  const handleLanguageChange = (newLang: Language) => {
    soundEngine.playGentleChime();
    setDraftPrefs((prev) => ({ ...prev, language: newLang }));
  };

  const handleProviderChange = (provider: AiProvider) => {
    soundEngine.playPop();
    setTestResult(null);
    setKeySavedMessage(null);
    setDraftPrefs((prev) => ({ ...prev, aiProvider: provider }));
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
    soundEngine.playGentleChime();
    setTestResult(null);

    if (selectedProvider === 'custom') {
      const cleanBaseUrl = customBaseUrlInput.trim();
      const cleanKey = customKeyInput.trim();
      const cleanModel = customModelInput.trim();
      const cleanApiVersion = customApiVersionInput.trim();

      setDraftPrefs((prev) => ({
        ...prev,
        aiProvider: 'custom',
        customOpenAiBaseUrl: cleanBaseUrl,
        customOpenAiApiKey: cleanKey,
        customOpenAiModel: cleanModel,
        customOpenAiApiVersion: cleanApiVersion,
      }));
      setKeySavedMessage(
        isDraftFa
          ? 'تنظیمات API سفارشی ثبت شد (برای اعمال، روی «ذخیره» کلیک کنید)'
          : 'Custom OpenAI-compatible API staged (click Save to apply)!'
      );
    } else if (selectedProvider === 'openrouter') {
      const cleanOrKey = openRouterKeyInput.trim();
      const cleanModel = openRouterModelInput.trim() || DEFAULT_OPENROUTER_MODEL;
      setDraftPrefs((prev) => ({
        ...prev,
        aiProvider: 'openrouter',
        openRouterApiKey: cleanOrKey,
        openRouterModel: cleanModel,
      }));
      if (cleanOrKey) {
        setKeySavedMessage(isDraftFa ? 'کلید OpenRouter ثبت شد (برای اعمال، روی «ذخیره» کلیک کنید)' : 'OpenRouter API key staged (click Save to apply)!');
      } else {
        setKeySavedMessage(isDraftFa ? 'کلید OpenRouter پاک شد.' : 'OpenRouter key cleared.');
      }
    } else {
      const clean = apiKeyInput.trim();
      const cleanGeminiModel = geminiModelInput.trim() || DEFAULT_GEMINI_MODEL;
      setDraftPrefs((prev) => ({
        ...prev,
        aiProvider: 'gemini',
        geminiApiKey: clean,
        geminiModel: cleanGeminiModel,
        useSharedFreeKey: false,
      }));
      if (clean) {
        setKeySavedMessage(isDraftFa ? 'کلید Gemini ثبت شد (برای اعمال، روی «ذخیره» کلیک کنید)' : 'Personal Gemini API key staged (click Save to apply)!');
      } else {
        setKeySavedMessage(isDraftFa ? 'کلید سفارشی پاک شد.' : 'Custom key cleared.');
      }
    }
    setTimeout(() => setKeySavedMessage(null), 3500);
  };

  const handleClearKey = () => {
    soundEngine.playPop();
    setTestResult(null);
    if (selectedProvider === 'custom') {
      setCustomKeyInput('');
      setCustomBaseUrlInput('');
      setCustomModelInput('');
      setCustomApiVersionInput('');
      setDraftPrefs((prev) => ({
        ...prev,
        customOpenAiApiKey: '',
        customOpenAiBaseUrl: '',
        customOpenAiModel: '',
        customOpenAiApiVersion: '',
      }));
      setKeySavedMessage(isDraftFa ? 'تنظیمات API سفارشی پاک شدند.' : 'Custom API settings cleared.');
    } else if (selectedProvider === 'openrouter') {
      setOpenRouterKeyInput('');
      setDraftPrefs((prev) => ({ ...prev, openRouterApiKey: '' }));
      setKeySavedMessage(isDraftFa ? 'کلید OpenRouter پاک شد.' : 'OpenRouter API key cleared.');
    } else {
      setApiKeyInput('');
      setDraftPrefs((prev) => ({ ...prev, geminiApiKey: '', useSharedFreeKey: false }));
      setKeySavedMessage(isDraftFa ? 'کلید پاک شد.' : 'API key cleared.');
    }
    setTimeout(() => setKeySavedMessage(null), 3000);
  };

  const handleTestConnection = async () => {
    setTestingKey(true);
    setTestResult(null);
    soundEngine.playPop();

    try {
      const isCustom = selectedProvider === 'custom';
      const isOpenRouter = selectedProvider === 'openrouter';

      let activeKey = '';
      let activeModel = '';
      let activeBaseUrl: string | undefined = undefined;
      let activeApiVersion: string | undefined = undefined;

      if (isCustom) {
        activeKey =
          customKeyInput.trim() ||
          draftPrefs.customOpenAiApiKey?.trim() ||
          prefs.customOpenAiApiKey?.trim() ||
          '';
        activeModel =
          customModelInput.trim() ||
          draftPrefs.customOpenAiModel ||
          DEFAULT_CUSTOM_OPENAI_MODEL;
        activeBaseUrl =
          customBaseUrlInput.trim() ||
          draftPrefs.customOpenAiBaseUrl ||
          DEFAULT_CUSTOM_OPENAI_BASE_URL;
        activeApiVersion =
          customApiVersionInput.trim() ||
          draftPrefs.customOpenAiApiVersion ||
          undefined;
      } else if (isOpenRouter) {
        activeKey =
          openRouterKeyInput.trim() ||
          draftPrefs.openRouterApiKey?.trim() ||
          prefs.openRouterApiKey?.trim() ||
          '';
        activeModel =
          openRouterModelInput.trim() ||
          draftPrefs.openRouterModel ||
          DEFAULT_OPENROUTER_MODEL;
      } else {
        activeKey =
          apiKeyInput.trim() ||
          draftPrefs.geminiApiKey?.trim() ||
          prefs.geminiApiKey?.trim() ||
          '';
        activeModel =
          geminiModelInput.trim() ||
          draftPrefs.geminiModel ||
          DEFAULT_GEMINI_MODEL;
      }

      const data = await testAiConnection({
        provider: selectedProvider,
        apiKey: activeKey || undefined,
        model: activeModel,
        baseUrl: activeBaseUrl,
        apiVersion: activeApiVersion,
      });

      if (data.valid) {
        soundEngine.playGentleChime();
        setTestResult({
          success: true,
          message:
            data.message ||
            (isDraftFa ? 'اتصال با موفقیت برقرار شد!' : 'Connected to AI API successfully!'),
        });
      } else {
        soundEngine.playPop();
        setTestResult({
          success: false,
          message:
            data.message ||
            (isDraftFa ? 'عدم امکان اتصال به سرویس هوش مصنوعی.' : 'Could not connect to AI API.'),
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message:
          err.message ||
          (isDraftFa ? 'خطای شبکه در بررسی اتصال.' : 'Network error while testing connection.'),
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSendTestPrompt = async (customPrompt?: string) => {
    const promptToSend = (typeof customPrompt === 'string' ? customPrompt : testPromptInput).trim();
    if (!promptToSend) return;

    const isCustom = selectedProvider === 'custom';
    const isOpenRouter = selectedProvider === 'openrouter';

    let activeKey = '';
    let activeModel = '';
    let activeBaseUrl: string | undefined = undefined;
    let activeApiVersion: string | undefined = undefined;

    if (isCustom) {
      activeKey =
        customKeyInput.trim() ||
        draftPrefs.customOpenAiApiKey?.trim() ||
        prefs.customOpenAiApiKey?.trim() ||
        '';
      activeModel =
        customModelInput.trim() ||
        draftPrefs.customOpenAiModel ||
        DEFAULT_CUSTOM_OPENAI_MODEL;
      activeBaseUrl =
        customBaseUrlInput.trim() ||
        draftPrefs.customOpenAiBaseUrl ||
        DEFAULT_CUSTOM_OPENAI_BASE_URL;
      activeApiVersion =
        customApiVersionInput.trim() ||
        draftPrefs.customOpenAiApiVersion ||
        undefined;
    } else if (isOpenRouter) {
      activeKey =
        openRouterKeyInput.trim() ||
        draftPrefs.openRouterApiKey?.trim() ||
        prefs.openRouterApiKey?.trim() ||
        '';
      activeModel =
        openRouterModelInput.trim() ||
        draftPrefs.openRouterModel ||
        DEFAULT_OPENROUTER_MODEL;
    } else {
      activeKey =
        apiKeyInput.trim() ||
        draftPrefs.geminiApiKey?.trim() ||
        prefs.geminiApiKey?.trim() ||
        '';
      activeModel =
        geminiModelInput.trim() ||
        draftPrefs.geminiModel ||
        DEFAULT_GEMINI_MODEL;
    }

    if (!activeKey && !(isCustom && isLocalEndpoint(activeBaseUrl))) {
      soundEngine.playPop();
      setPromptTestResult({
        success: false,
        prompt: promptToSend,
        response: '',
        error: t('settings.missingKeyPromptError', 'Please enter an API key above before sending a test query.'),
        latencyMs: 0,
        model: activeModel,
        provider: selectedProvider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
      return;
    }

    setTestingPrompt(true);
    soundEngine.playPop();

    try {
      const result = await testAiPrompt({
        provider: selectedProvider,
        apiKey: activeKey || undefined,
        model: activeModel,
        prompt: promptToSend,
        baseUrl: activeBaseUrl,
        apiVersion: activeApiVersion,
      });

      if (result.valid) {
        soundEngine.playGentleChime();
        setPromptTestResult({
          success: true,
          prompt: promptToSend,
          response: result.response || '',
          latencyMs: result.latencyMs,
          model: result.model,
          provider: result.provider,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      } else {
        soundEngine.playPop();
        setPromptTestResult({
          success: false,
          prompt: promptToSend,
          response: '',
          error: result.message,
          latencyMs: result.latencyMs,
          model: result.model,
          provider: result.provider,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      }
    } catch (err: any) {
      soundEngine.playPop();
      setPromptTestResult({
        success: false,
        prompt: promptToSend,
        response: '',
        error: err?.message || 'Error occurred while contacting AI service.',
        latencyMs: 0,
        model: activeModel,
        provider: selectedProvider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    } finally {
      setTestingPrompt(false);
    }
  };

  const handleCopyTestResponse = async () => {
    if (!promptTestResult?.response) return;
    try {
      await navigator.clipboard.writeText(promptTestResult.response);
      soundEngine.playGentleChime();
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    } catch {
      // Fallback
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
    selectedProvider !== (prefs.aiProvider || 'gemini') ||
    apiKeyInput.trim() !== (prefs.geminiApiKey || '') ||
    (geminiModelInput.trim() || DEFAULT_GEMINI_MODEL) !== (prefs.geminiModel || DEFAULT_GEMINI_MODEL) ||
    openRouterKeyInput.trim() !== (prefs.openRouterApiKey || '') ||
    (openRouterModelInput.trim() || DEFAULT_OPENROUTER_MODEL) !== (prefs.openRouterModel || DEFAULT_OPENROUTER_MODEL) ||
    customBaseUrlInput.trim() !== (prefs.customOpenAiBaseUrl || '') ||
    customKeyInput.trim() !== (prefs.customOpenAiApiKey || '') ||
    customModelInput.trim() !== (prefs.customOpenAiModel || '') ||
    customApiVersionInput.trim() !== (prefs.customOpenAiApiVersion || '') ||
    plannerInstructionsInput.trim() !== (prefs.plannerCustomInstructions || '') ||
    JSON.stringify(currentNavOrder) !== JSON.stringify(initialNavOrder) ||
    JSON.stringify(currentFocusTabOrder) !== JSON.stringify(initialFocusTabOrder) ||
    JSON.stringify(currentCategories) !== JSON.stringify(initialCategories);

  // Apply all draft settings and return
  const handleDone = () => {
    soundEngine.playGentleChime();
    const cleanApiKey = apiKeyInput.trim();
    const cleanGeminiModel = geminiModelInput.trim() || DEFAULT_GEMINI_MODEL;
    const cleanOpenRouterKey = openRouterKeyInput.trim();
    const cleanOpenRouterModel = openRouterModelInput.trim() || DEFAULT_OPENROUTER_MODEL;
    const cleanCustomBaseUrl = customBaseUrlInput.trim();
    const cleanCustomKey = customKeyInput.trim();
    const cleanCustomModel = customModelInput.trim();
    const cleanCustomApiVersion = customApiVersionInput.trim();
    const targetLang = draftPrefs.language || prefs.language || 'en';
    const finalPrefs: UserPreferences = {
      ...draftPrefs,
      language: targetLang,
      navOrder: currentNavOrder,
      focusTabOrder: currentFocusTabOrder,
      journalCategories: currentCategories,
      aiProvider: selectedProvider,
      geminiApiKey: cleanApiKey,
      geminiModel: cleanGeminiModel,
      openRouterApiKey: cleanOpenRouterKey,
      openRouterModel: cleanOpenRouterModel,
      customOpenAiBaseUrl: cleanCustomBaseUrl,
      customOpenAiApiKey: cleanCustomKey,
      customOpenAiModel: cleanCustomModel,
      customOpenAiApiVersion: cleanCustomApiVersion,
      useSharedFreeKey: false,
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

  const handleCleanPredefinedData = () => {
    soundEngine.playGentleChime();
    storage.cleanAllPredefinedData();
    onReloadAllData();
    setShowCleanConfirm(false);
    setShowResetConfirm(false);
    setCleanSuccessMessage(
      t(
        'settings.cleanSuccess',
        'Workspace cleaned! All sample data has been cleared and your companion is ready to start fresh.'
      )
    );
    setTimeout(() => setCleanSuccessMessage(null), 4500);
  };

  const handleResetDemoData = () => {
    soundEngine.playGentleChime();
    storage.resetToDemoData();
    onReloadAllData();
    setShowResetConfirm(false);
    setShowCleanConfirm(false);
    setResetSuccessMessage(
      t(
        'settings.resetSuccess',
        'Demo data restored! Sample tasks, habits, and journal entries are ready to explore.'
      )
    );
    setTimeout(() => setResetSuccessMessage(null), 4500);
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

        {/* Title and Mascot on the line below with Expand/Collapse toggle */}
        <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center p-1.5 shadow-xs shrink-0">
              <LerniMascot pose="waving" size="xs" interactive={false} />
            </div>
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#151E14] dark:text-[#E8F2E4]">
                {t('settings.title', 'Settings & Preferences')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isInstalled && (
              <button
                type="button"
                id="btn-settings-header-install"
                onClick={promptInstall}
                disabled={isInstalling}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#0F2600] bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-50 border border-[#80D141] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                title={isDraftFa ? 'نصب لرنی به عنوان برنامه مستقل روی دستگاه' : 'Install Lerni as a native app on your device'}
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {isInstalling
                    ? (isDraftFa ? 'در حال نصب...' : 'Installing...')
                    : (isDraftFa ? 'نصب برنامه' : 'Install App')}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleAllSections}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#3B7E10] dark:text-[#80D141] bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] border border-[#D8E8D0] dark:border-[#273722] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title={allExpanded ? (isDraftFa ? 'بستن همه بخش‌ها' : 'Collapse All Sections') : (isDraftFa ? 'باز کردن همه بخش‌ها' : 'Expand All Sections')}
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
              <span>{allExpanded ? (isDraftFa ? 'بستن همه' : 'Collapse All') : (isDraftFa ? 'باز کردن همه' : 'Expand All')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout for Settings Options */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Language, AI Configuration, Navigation Order */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Multilingual Selection (English & Persian RTL) */}
          <section id="section-settings-language" className="rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm transition-all duration-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('language')}
              aria-expanded={expandedSections['language']}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-start gap-3 hover:bg-[#F9FAF6] dark:hover:bg-[#1C2819] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141] shrink-0 group-hover:scale-105 transition-transform">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {t('settings.languageSection', 'Language & Direction')}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#3B7E10] dark:text-[#80D141] px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/30">
                      {selectedLanguage === 'fa' ? 'فارسی (RTL)' : 'English (LTR)'}
                    </span>
                  </div>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] truncate">
                    {t('settings.languageDesc', 'Select your preferred interface language')}
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4] group-hover:bg-[#EDF6E8] dark:group-hover:bg-[#202E1E] transition-colors shrink-0">
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSections['language'] ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {expandedSections['language'] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-[#DCEAD4]/80 dark:border-[#263722] space-y-4">
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Theme & Visuals (Expandable) */}
          <section id="section-settings-theme" className="rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm transition-all duration-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('theme')}
              aria-expanded={expandedSections['theme']}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-start gap-3 hover:bg-[#F9FAF6] dark:hover:bg-[#1C2819] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141] shrink-0 group-hover:scale-105 transition-transform">
                  {draftPrefs.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {t('settings.themeSection', 'Visual Theme')}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#3B7E10] dark:text-[#80D141] px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/30">
                      {draftPrefs.theme === 'dark' ? (isDraftFa ? 'تیره جنگلی' : 'Forest Dark') : (isDraftFa ? 'روشن ملایم' : 'Gentle Light')}
                    </span>
                  </div>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] truncate">
                    {t('settings.themeDesc', 'Eye-safe Forest Dark or Gentle Light')}
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4] group-hover:bg-[#EDF6E8] dark:group-hover:bg-[#202E1E] transition-colors shrink-0">
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSections['theme'] ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {expandedSections['theme'] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-[#DCEAD4]/80 dark:border-[#263722] space-y-4">
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDraftPrefs((prev) => ({ ...prev, theme: 'dark' }));
                          onUpdatePrefs({ theme: 'dark' });
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
                          onUpdatePrefs({ theme: 'light' });
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Feature: Install Application (PWA - Expandable) */}
          <section id="section-settings-install" className="rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm transition-all duration-200 overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleSection('install')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('install');
                }
              }}
              aria-expanded={expandedSections['install']}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-start gap-3 hover:bg-[#F9FAF6] dark:hover:bg-[#1C2819] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141] shrink-0 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {t('settings.installAppSection', 'Install Application')}
                    </h3>
                    {isInstalled ? (
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isDraftFa ? 'نصب شده' : 'Installed'}</span>
                      </span>
                    ) : canInstall ? (
                      <span className="text-[11px] font-semibold text-[#3B7E10] dark:text-[#80D141] px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/30">
                        {isDraftFa ? 'آماده نصب' : 'Ready to Install'}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#485B44] dark:text-[#9EB598] px-2 py-0.5 rounded-full bg-[#EDF6E8] dark:bg-[#1E2B1A] border border-[#D8E8D0] dark:border-[#273722]">
                        {isDraftFa ? 'وب‌اپلیکیشن' : 'Web App'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] truncate">
                    {t('settings.installAppDesc', 'Install Lerni as a native app on your phone, tablet, or desktop')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isInstalled && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await promptInstall();
                    }}
                    disabled={isInstalling || (!canInstall && !isIos)}
                    className="px-2.5 py-1 rounded-full text-xs font-bold text-[#0F2600] bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 border border-[#80D141] flex items-center gap-1 transition-colors cursor-pointer"
                    title={isDraftFa ? 'نصب برنامه' : 'Install App'}
                  >
                    <Download className="w-3 h-3 stroke-[2.5]" />
                    <span className="hidden sm:inline">
                      {isInstalling
                        ? (isDraftFa ? 'در حال نصب...' : 'Installing...')
                        : (isDraftFa ? 'نصب برنامه' : 'Install App')}
                    </span>
                  </button>
                )}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4] group-hover:bg-[#EDF6E8] dark:group-hover:bg-[#202E1E] transition-colors">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSections['install'] ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expandedSections['install'] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-[#DCEAD4]/80 dark:border-[#263722] space-y-4">
                    <p className="text-xs text-[#485B44] dark:text-[#9EB598] leading-relaxed">
                      {t('settings.installAppDesc', 'Install Lerni as a native app on your phone, tablet, or desktop for instant access and distraction-free offline use.')}
                    </p>

                    {isInstalled ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs font-medium text-emerald-900 dark:text-emerald-200 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                            {isDraftFa ? 'برنامه نصب شده و آماده استفاده است' : 'Application Installed & Running'}
                          </div>
                          <div className="text-[11px] opacity-80 mt-0.5">
                            {t('settings.appInstalledDesc', 'Lerni is running as an installed standalone application on this device.')}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                              {isDraftFa ? 'افزودن به صفحه اصلی و برنامه‌ها' : 'Add to Home Screen & Apps'}
                            </div>
                            <div className="text-[11px] text-[#485B44] dark:text-[#9EB598] mt-0.5">
                              {t('settings.installReadyDesc', 'Tap the button below to add Lerni to your home screen or desktop application launcher.')}
                            </div>
                          </div>

                          <button
                            type="button"
                            id="btn-settings-install-app-main"
                            onClick={promptInstall}
                            disabled={isInstalling || (!canInstall && !isIos)}
                            className="px-5 py-2.5 rounded-2xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-50 text-[#0F2600] text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
                          >
                            <Download className="w-4 h-4 stroke-[2.5]" />
                            <span>
                              {isInstalling
                                ? t('settings.installing', 'Installing...')
                                : t('settings.installBtn', 'Install App')}
                            </span>
                          </button>
                        </div>

                        {isIos ? (
                          <div className="p-3.5 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] text-xs text-[#3B4E37] dark:text-[#A6BC9F] flex items-start gap-2.5">
                            <span className="text-base shrink-0">📱</span>
                            <div className="text-[11px] leading-relaxed">
                              <span className="font-bold text-[#151E14] dark:text-[#E8F2E4] block mb-0.5">
                                {isDraftFa ? 'راهنمای نصب در آیفون و آی‌پد (iOS):' : 'Installation on iOS (iPhone / iPad):'}
                              </span>
                              {t('settings.installManualIos', 'To install on iOS: Tap the Share button in Safari (⎙ / ⎋) and select "Add to Home Screen".')}
                            </div>
                          </div>
                        ) : !canInstall ? (
                          <div className="p-3.5 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] text-xs text-[#3B4E37] dark:text-[#A6BC9F] flex items-start gap-2.5">
                            <span className="text-base shrink-0">💡</span>
                            <div className="text-[11px] leading-relaxed">
                              <span className="font-bold text-[#151E14] dark:text-[#E8F2E4] block mb-0.5">
                                {isDraftFa ? 'نصب دستی از طریق مرورگر:' : 'Manual Browser Installation:'}
                              </span>
                              {t('settings.installManualGeneral', 'To install Lerni: Open your browser menu (⋮ or ⋯) and select "Install Lerni" or "Add to Home screen".')}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
          
          {/* Feature: AI Provider & API Key Configuration */}
          <section id="section-settings-gemini" className="rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm transition-all duration-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('ai')}
              aria-expanded={expandedSections['ai']}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-start gap-3 hover:bg-[#F9FAF6] dark:hover:bg-[#1C2819] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141] shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {t('settings.geminiSection', 'AI Provider & API Key')}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#3B7E10] dark:text-[#80D141] px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/30">
                      {selectedProvider === 'custom'
                        ? (customModelInput ? `Custom · ${customModelInput}` : 'Custom (OpenAI)')
                        : selectedProvider === 'openrouter'
                        ? `OpenRouter · ${openRouterModelInput ? openRouterModelInput.split('/')[1] || openRouterModelInput : 'Default'}`
                        : `Gemini · ${geminiModelInput ? geminiModelInput.replace('gemini-', '') : 'Flash'}`}
                    </span>
                  </div>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] truncate">
                    {t('settings.geminiDesc', 'Configure Google Gemini, OpenRouter, or Custom OpenAI API')}
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4] group-hover:bg-[#EDF6E8] dark:group-hover:bg-[#202E1E] transition-colors shrink-0">
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSections['ai'] ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {expandedSections['ai'] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-[#DCEAD4]/80 dark:border-[#263722] space-y-4">
                    {/* AI Provider Selector Tabs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                id="btn-provider-gemini"
                type="button"
                onClick={() => handleProviderChange('gemini')}
                className={`p-3 rounded-2xl flex items-center justify-between border transition-all text-start cursor-pointer ${
                  selectedProvider === 'gemini'
                    ? 'bg-[#80D141]/15 dark:bg-[#80D141]/20 border-[#80D141] shadow-xs ring-1 ring-[#80D141]'
                    : 'bg-[#F7FAF4] dark:bg-[#1C2919] text-[#485B44] dark:text-[#9EB598] border-[#DCEAD4] dark:border-[#2A3E26] hover:bg-[#E2F5D1]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('settings.providerGemini', 'Google Gemini')}
                  </div>
                  <div className="text-[10px] text-[#485B44] dark:text-[#9EB598]">
                    {isDraftFa ? 'مدل سریع Gemini Flash' : 'Direct Google AI Studio'}
                  </div>
                </div>
                {selectedProvider === 'gemini' && (
                  <div className="w-5 h-5 rounded-full bg-[#80D141] text-[#0F2600] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>

              <button
                id="btn-provider-openrouter"
                type="button"
                onClick={() => handleProviderChange('openrouter')}
                className={`p-3 rounded-2xl flex items-center justify-between border transition-all text-start cursor-pointer ${
                  selectedProvider === 'openrouter'
                    ? 'bg-[#80D141]/15 dark:bg-[#80D141]/20 border-[#80D141] shadow-xs ring-1 ring-[#80D141]'
                    : 'bg-[#F7FAF4] dark:bg-[#1C2919] text-[#485B44] dark:text-[#9EB598] border-[#DCEAD4] dark:border-[#2A3E26] hover:bg-[#E2F5D1]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('settings.providerOpenRouter', 'OpenRouter')}
                  </div>
                  <div className="text-[10px] text-[#485B44] dark:text-[#9EB598]">
                    {isDraftFa ? 'دسترسی به تمام مدل‌های هوش مصنوعی' : 'Multi-model AI router'}
                  </div>
                </div>
                {selectedProvider === 'openrouter' && (
                  <div className="w-5 h-5 rounded-full bg-[#80D141] text-[#0F2600] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>

              <button
                id="btn-provider-custom"
                type="button"
                onClick={() => handleProviderChange('custom')}
                className={`p-3 rounded-2xl flex items-center justify-between border transition-all text-start cursor-pointer ${
                  selectedProvider === 'custom'
                    ? 'bg-[#80D141]/15 dark:bg-[#80D141]/20 border-[#80D141] shadow-xs ring-1 ring-[#80D141]'
                    : 'bg-[#F7FAF4] dark:bg-[#1C2919] text-[#485B44] dark:text-[#9EB598] border-[#DCEAD4] dark:border-[#2A3E26] hover:bg-[#E2F5D1]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('settings.providerCustom', 'Custom (OpenAI)')}
                  </div>
                  <div className="text-[10px] text-[#485B44] dark:text-[#9EB598]">
                    {isDraftFa ? 'اتصال به Ollama، Groq و...' : 'Ollama, Groq, DeepSeek, etc.'}
                  </div>
                </div>
                {selectedProvider === 'custom' && (
                  <div className="w-5 h-5 rounded-full bg-[#80D141] text-[#0F2600] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>

            {/* Active Provider Key & Model Configuration */}
            <div className="p-4 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] space-y-3">
              {selectedProvider === 'gemini' ? (
                <div className="space-y-3">
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

                  <form onSubmit={handleSaveCustomKey} className="space-y-3">
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

                    {/* Gemini Model Field with Presets */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#151E14] dark:text-[#E8F2E4] block">
                          {t('settings.geminiModel', 'Gemini Model')}
                        </label>
                        <span className="text-[10px] text-[#556D50] dark:text-[#8EA887]">
                          {t('settings.presetModels', 'Preset Models')}
                        </span>
                      </div>

                      {/* Gemini Preset Model Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {GEMINI_MODEL_PRESETS.map((preset) => {
                          const isSelected = geminiModelInput === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                soundEngine.playPop();
                                setGeminiModelInput(preset.id);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#E8F8D8] dark:bg-[#1E3800] border-[#80D141] text-[#1C3700] dark:text-[#80D141] font-bold shadow-2xs scale-[1.02]'
                                  : 'bg-white dark:bg-[#202E1E] hover:bg-[#EDF6E8] dark:hover:bg-[#283A24] border-[#DCEAD4] dark:border-[#2E4229] text-[#3B4E37] dark:text-[#C5DDC0]'
                              }`}
                              title={preset.id}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-[#80D141]' : 'bg-transparent'}`} />
                              <span>{preset.name}</span>
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        value={geminiModelInput}
                        onChange={(e) => setGeminiModelInput(e.target.value)}
                        placeholder="gemini-flash-lite-latest"
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#22301F] border border-[#DCEAD4] dark:border-[#2E402B] text-xs font-mono text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={
                          !apiKeyInput.trim() ||
                          (apiKeyInput === (draftPrefs.geminiApiKey || '') &&
                            geminiModelInput === (draftPrefs.geminiModel || DEFAULT_GEMINI_MODEL))
                        }
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
              ) : selectedProvider === 'openrouter' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#80D141]" />
                      <span>{t('settings.openRouterApiKey', 'OpenRouter API Key')}</span>
                    </label>

                    {(draftPrefs.openRouterApiKey || openRouterKeyInput) && (
                      <button
                        type="button"
                        onClick={handleClearKey}
                        className="text-[11px] text-[#B3261E] dark:text-[#F2B8B5] hover:underline font-medium cursor-pointer"
                      >
                        {isDraftFa ? 'پاک کردن کلید' : 'Clear key'}
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveCustomKey} className="space-y-3">
                    <div className="relative flex items-center">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={openRouterKeyInput}
                        onChange={(e) => setOpenRouterKeyInput(e.target.value)}
                        placeholder={isDraftFa ? 'کلید OpenRouter خود (sk-or-v1-...) را وارد کنید' : 'Paste your OpenRouter key (sk-or-v1-...)'}
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

                    {/* OpenRouter Model Field with Presets */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-1.5">
                        <label className="text-[11px] font-bold text-[#151E14] dark:text-[#E8F2E4] block">
                          {t('settings.openRouterModel', 'OpenRouter Model')}
                        </label>
                        <a
                          href="https://openrouter.ai/models?variant=free&output_modalities=text"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[#3B7E10] dark:text-[#80D141] hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <span>{t('settings.openRouterFreeModelsLink', 'Browse Free Text Models')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* OpenRouter Preset Model Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {OPENROUTER_MODEL_PRESETS.map((preset) => {
                          const isSelected = openRouterModelInput === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                soundEngine.playPop();
                                setOpenRouterModelInput(preset.id);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#E8F8D8] dark:bg-[#1E3800] border-[#80D141] text-[#1C3700] dark:text-[#80D141] font-bold shadow-2xs scale-[1.02]'
                                  : 'bg-white dark:bg-[#202E1E] hover:bg-[#EDF6E8] dark:hover:bg-[#283A24] border-[#DCEAD4] dark:border-[#2E4229] text-[#3B4E37] dark:text-[#C5DDC0]'
                              }`}
                              title={preset.id}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-[#80D141]' : 'bg-transparent'}`} />
                              <span>{preset.name}</span>
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        value={openRouterModelInput}
                        onChange={(e) => setOpenRouterModelInput(e.target.value)}
                        placeholder="liquid/lfm-2.5-2.6b:free"
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#22301F] border border-[#DCEAD4] dark:border-[#2E402B] text-xs font-mono text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
                      />
                      <p className="text-[10.5px] text-[#485B44] dark:text-[#9EB598]">
                        {t('settings.openRouterFreeModelsHint', 'OpenRouter offers free models ending with :free (e.g., google/gemini-2.5-flash:free)')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={
                          !openRouterKeyInput.trim() ||
                          (openRouterKeyInput === (draftPrefs.openRouterApiKey || '') &&
                            openRouterModelInput === (draftPrefs.openRouterModel || DEFAULT_OPENROUTER_MODEL))
                        }
                        className="px-4 py-2 rounded-xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        {t('settings.saveKey', 'Save API Key')}
                      </button>

                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testingKey || (!openRouterKeyInput.trim() && !draftPrefs.openRouterApiKey)}
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
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#3B7E10] dark:text-[#80D141] hover:underline font-bold flex items-center gap-1"
                    >
                      <span>{isDraftFa ? 'دریافت کلید از OpenRouter.ai' : 'Get API key from OpenRouter.ai'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#80D141]" />
                      <span>{t('settings.providerCustom', 'Custom OpenAI-Compatible API')}</span>
                    </label>

                    {(draftPrefs.customOpenAiApiKey || customKeyInput || customBaseUrlInput || customModelInput || customApiVersionInput) && (
                      <button
                        type="button"
                        onClick={handleClearKey}
                        className="text-[11px] text-[#B3261E] dark:text-[#F2B8B5] hover:underline font-medium cursor-pointer"
                      >
                        {isDraftFa ? 'پاک کردن تنظیمات' : 'Clear configuration'}
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveCustomKey} className="space-y-3">
                    {/* Endpoint / Base URL */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <label className="text-[11px] font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5 text-[#80D141]" />
                          <span>{t('settings.customEndpointLabel', 'API Base URL / Endpoint')}</span>
                        </label>
                        {customBaseUrlInput && isLocalEndpoint(customBaseUrlInput) ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] border border-[#80D141]/40 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#80D141] animate-pulse" />
                            {isDraftFa ? 'سرویس محلی (بدون نیاز به کلید)' : 'Local server (no key needed)'}
                          </span>
                        ) : customBaseUrlInput ? (
                          <span className="text-[10px] text-[#556D50] dark:text-[#8EA887]">
                            {isDraftFa ? 'پایانه ابری (نیاز به کلید Bearer)' : 'Cloud endpoint (Bearer key required)'}
                          </span>
                        ) : null}
                      </div>

                      <input
                        type="text"
                        value={customBaseUrlInput}
                        onChange={(e) => setCustomBaseUrlInput(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#22301F] border border-[#DCEAD4] dark:border-[#2E402B] text-xs font-mono text-[#151E14] dark:text-[#E8F2E4] placeholder:font-sans placeholder:text-[#79747E] dark:placeholder:text-[#8D9E8A] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
                      />
                      <p className="text-[10.5px] text-[#485B44] dark:text-[#9EB598]">
                        {t('settings.customEndpointHint', 'Works with any OpenAI-compatible /chat/completions endpoint (local or cloud).')}
                      </p>
                    </div>

                    {/* API Key */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-[#80D141]" />
                          <span>{t('settings.customApiKeyLabel', 'API Key (Optional for Local)')}</span>
                        </label>
                        {customBaseUrlInput && isLocalEndpoint(customBaseUrlInput) && (
                          <span className="text-[10px] text-[#556D50] dark:text-[#8EA887]">
                            {isDraftFa ? 'اختیاری برای سرورهای محلی' : 'Optional for local servers'}
                          </span>
                        )}
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={customKeyInput}
                          onChange={(e) => setCustomKeyInput(e.target.value)}
                          placeholder={
                            customBaseUrlInput && isLocalEndpoint(customBaseUrlInput)
                              ? (isDraftFa ? 'اختیاری برای سرورهای محلی' : 'Optional for local servers')
                              : (isDraftFa ? 'کلید API را وارد کنید (Bearer token)' : 'Paste API Key (Bearer token)')
                          }
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
                    </div>

                    {/* Model Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#80D141]" />
                        <span>{t('settings.customModelLabel', 'Model Name / ID')}</span>
                      </label>

                      <input
                        type="text"
                        value={customModelInput}
                        onChange={(e) => setCustomModelInput(e.target.value)}
                        placeholder="e.g. gpt-4o, llama3.3, deepseek-chat, mistral-large"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#22301F] border border-[#DCEAD4] dark:border-[#2E402B] text-xs font-mono text-[#151E14] dark:text-[#E8F2E4] placeholder:font-sans placeholder:text-[#79747E] dark:placeholder:text-[#8D9E8A] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
                      />
                    </div>

                    {/* API Version (Optional, for Azure or Gateways) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-[#80D141]" />
                          <span>{t('settings.customApiVersionLabel', 'API Version (Optional)')}</span>
                        </label>
                        <span className="text-[10px] text-[#556D50] dark:text-[#8EA887]">
                          {isDraftFa ? 'مثلاً برای Azure' : 'e.g. for Azure'}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={customApiVersionInput}
                        onChange={(e) => setCustomApiVersionInput(e.target.value)}
                        placeholder="e.g. 2024-02-15-preview"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#22301F] border border-[#DCEAD4] dark:border-[#2E402B] text-xs font-mono text-[#151E14] dark:text-[#E8F2E4] placeholder:font-sans placeholder:text-[#79747E] dark:placeholder:text-[#8D9E8A] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
                      />
                      <p className="text-[10px] text-[#485B44] dark:text-[#9EB598]">
                        {isDraftFa
                          ? 'سرورهای معمولی OpenAI نیازی به نسخه ندارند. در صورت استفاده از Azure، نسخه API را اینجا بنویسید.'
                          : 'Standard OpenAI & local servers leave this blank. For Azure OpenAI, enter your api-version query string.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        {t('settings.saveKey', 'Save Configuration')}
                      </button>

                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testingKey}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#263722] hover:bg-[#E2F2D9] dark:hover:bg-[#2E4229] disabled:opacity-40 text-[#3B4E37] dark:text-[#B6CCB0] text-xs font-bold border border-[#DCEAD4] dark:border-[#33482E] transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {testingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        <span>{t('settings.testKey', 'Test Connection')}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
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

            {/* Interactive API Key Tester & Single-Turn Query Playground */}
            <div id="section-api-test-playground" className="p-4 sm:p-5 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E8F8D8] dark:bg-[#20361C] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141] shrink-0">
                    <Terminal className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#151E14] dark:text-[#E8F2E4] flex items-center gap-2 flex-wrap">
                      <span>{t('settings.testPlaygroundTitle', 'API Key Tester & Query Playground')}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#23351F] text-[#2C5214] dark:text-[#9DD86A] border border-[#80D141]/40">
                        {selectedProvider === 'custom'
                          ? `Custom · ${customModelInput || (isDraftFa ? 'مدل سفارشی' : 'custom model')}`
                          : selectedProvider === 'openrouter'
                          ? `OpenRouter · ${openRouterModelInput || DEFAULT_OPENROUTER_MODEL}`
                          : `Gemini · ${geminiModelInput || DEFAULT_GEMINI_MODEL}`}
                      </span>
                    </h4>
                    <p className="text-[11px] text-[#485B44] dark:text-[#9EB598] mt-0.5 flex items-center justify-between flex-wrap gap-2">
                      <span>{t('settings.testPlaygroundDesc', 'Send a single-turn prompt to verify your API key and chosen model respond accurately in real time.')}</span>
                      {selectedProvider === 'openrouter' ? (
                        <a
                          href="https://openrouter.ai/models?variant=free&output_modalities=text"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#3B7E10] dark:text-[#80D141] hover:underline font-bold inline-flex items-center gap-1 text-[11px]"
                        >
                          <span>{t('settings.openRouterFreeModelsLink', 'Browse Free Text Models')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : selectedProvider === 'custom' ? (
                        <span className="text-[10.5px] font-mono text-[#3B7E10] dark:text-[#80D141]">
                          {customBaseUrlInput || (isDraftFa ? 'آدرس سفارشی' : 'custom endpoint')}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Sample Prompts */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#485B44] dark:text-[#9EB598]">
                  {t('settings.samplePrompts', 'Quick Examples')}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const q = t('settings.samplePrompt1', "What's your name and model version?");
                      setTestPromptInput(q);
                      handleSendTestPrompt(q);
                    }}
                    disabled={testingPrompt}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-white dark:bg-[#243321] hover:bg-[#E8F8D8] dark:hover:bg-[#2C4028] text-[#3B4E37] dark:text-[#C5DDC0] border border-[#DCEAD4] dark:border-[#30442B] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    🤖 {t('settings.samplePrompt1', "What's your name and model version?")}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const q = t('settings.samplePrompt2', 'Give 1 micro-step to start when overwhelmed (under 15 words).');
                      setTestPromptInput(q);
                      handleSendTestPrompt(q);
                    }}
                    disabled={testingPrompt}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-white dark:bg-[#243321] hover:bg-[#E8F8D8] dark:hover:bg-[#2C4028] text-[#3B4E37] dark:text-[#C5DDC0] border border-[#DCEAD4] dark:border-[#30442B] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    🎯 {t('settings.samplePrompt2', 'Give 1 micro-step to start when overwhelmed (under 15 words).')}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const q = t('settings.samplePrompt3', 'Give 1 practical tip to break task paralysis (under 15 words).');
                      setTestPromptInput(q);
                      handleSendTestPrompt(q);
                    }}
                    disabled={testingPrompt}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-white dark:bg-[#243321] hover:bg-[#E8F8D8] dark:hover:bg-[#2C4028] text-[#3B4E37] dark:text-[#C5DDC0] border border-[#DCEAD4] dark:border-[#30442B] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    🧠 {t('settings.samplePrompt3', 'Give 1 practical tip to break task paralysis (under 15 words).')}
                  </button>
                </div>
              </div>

              {/* Prompt Input & Send */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendTestPrompt();
                }}
                className="space-y-2"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={testPromptInput}
                    onChange={(e) => setTestPromptInput(e.target.value)}
                    placeholder={t('settings.testPromptPlaceholder', 'Type a prompt to test your API key (e.g., What is your model name?)...')}
                    className="w-full sm:flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#22301F] border border-[#DCEAD4] dark:border-[#2E402B] text-xs text-[#151E14] dark:text-[#E8F2E4] placeholder:text-[#79747E] dark:placeholder:text-[#8D9E8A] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
                  />

                  <button
                    type="submit"
                    disabled={testingPrompt || !testPromptInput.trim()}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {testingPrompt ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('settings.testingPrompt', 'Sending Query...')}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 stroke-[2.5] rtl:rotate-180" />
                        <span>{t('settings.sendTestPrompt', 'Send Test Query')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Model Response Container */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] flex-wrap gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#80D141]" />
                    <span>{t('settings.testResponseLabel', 'Model Response')}</span>
                  </span>

                  {promptTestResult && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {promptTestResult.latencyMs > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#EDF6E8] dark:bg-[#20311D] text-[#3B4E37] dark:text-[#A7C59E] border border-[#D8E8D0] dark:border-[#2B4026] flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>{promptTestResult.latencyMs}ms</span>
                        </span>
                      )}

                      {promptTestResult.response && (
                        <button
                          type="button"
                          onClick={handleCopyTestResponse}
                          className="text-[11px] font-medium text-[#3B4E37] dark:text-[#B6CCB0] hover:text-[#151E14] dark:hover:text-[#E8F2E4] flex items-center gap-1 cursor-pointer"
                        >
                          {copiedResponse ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t('settings.copiedResponse', 'Copied!')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{t('settings.copyResponse', 'Copy')}</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setPromptTestResult(null);
                          setTestPromptInput('');
                        }}
                        className="text-[11px] text-[#79747E] hover:text-[#B3261E] dark:hover:text-[#F2B8B5] transition-colors cursor-pointer"
                      >
                        {t('settings.clearResponse', 'Clear')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Output Box */}
                <div
                  id="api-test-output-box"
                  className={`p-3.5 rounded-xl border text-xs leading-relaxed transition-all min-h-[72px] flex flex-col justify-center ${
                    testingPrompt
                      ? 'bg-white dark:bg-[#202E1D] border-[#80D141]/50 text-[#485B44] dark:text-[#9EB598] animate-pulse'
                      : promptTestResult?.success
                      ? 'bg-white dark:bg-[#1E2D1B] border-[#80D141]/50 text-[#151E14] dark:text-[#E8F2E4] shadow-2xs'
                      : promptTestResult?.error
                      ? 'bg-red-50/70 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-300'
                      : 'bg-white/60 dark:bg-[#202E1D]/50 border-dashed border-[#DCEAD4] dark:border-[#2C3E27] text-[#79747E] dark:text-[#8D9E8A]'
                  }`}
                >
                  {testingPrompt ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-[#3B4E37] dark:text-[#A7C59E]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#80D141]" />
                      <span>
                        {isDraftFa
                          ? `در حال ارسال پرسش به ${selectedProvider === 'openrouter' ? 'OpenRouter' : 'Google Gemini'}...`
                          : `Querying ${selectedProvider === 'openrouter' ? 'OpenRouter' : 'Google Gemini'} (${selectedProvider === 'openrouter' ? (openRouterModelInput || DEFAULT_OPENROUTER_MODEL) : (geminiModelInput || DEFAULT_GEMINI_MODEL)})...`}
                      </span>
                    </div>
                  ) : promptTestResult?.success ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{promptTestResult.model}</span>
                        <span className="text-[#79747E] dark:text-[#8D9E8A] font-normal">({promptTestResult.timestamp})</span>
                      </div>
                      <div className="whitespace-pre-wrap font-sans text-xs text-[#151E14] dark:text-[#E8F2E4] selection:bg-[#80D141]/30">
                        {promptTestResult.response}
                      </div>
                    </div>
                  ) : promptTestResult?.error ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-700 dark:text-red-400">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{isDraftFa ? 'خطا در اجرای پرسش' : 'Query Failed'}</span>
                      </div>
                      <p className="text-xs text-red-800 dark:text-red-300">
                        {promptTestResult.error}
                      </p>
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#79747E] dark:text-[#8D9E8A] italic">
                      {t('settings.noResponseYet', 'Type a prompt above or pick a quick example to test your API key response.')}
                    </div>
                  )}
                </div>

                {/* Single-turn isolation hint */}
                <div className="text-[10px] text-[#556950] dark:text-[#8DA589] flex items-center gap-1.5 pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#80D141] shrink-0" />
                  <span>{t('settings.isolatedContextHint', 'All queries are completely independent single-turn calls (zero conversation context or history retained).')}</span>
                </div>
              </div>
            </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Smart Planner Custom Instructions Section */}
          <section id="section-settings-planner-instructions" className="rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm transition-all duration-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('planner')}
              aria-expanded={expandedSections['planner']}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-start gap-3 hover:bg-[#F9FAF6] dark:hover:bg-[#1C2819] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141] shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {t('settings.plannerInstructionsSection', 'Smart Planner Custom Instructions')}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#3B7E10] dark:text-[#80D141] px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/30">
                      {plannerInstructionsInput.trim() ? (isDraftFa ? 'سفارشی فعال' : 'Custom Rules Active') : (isDraftFa ? 'پیش‌فرض' : 'Default Rules')}
                    </span>
                  </div>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] truncate">
                    {t('settings.plannerInstructionsDesc', 'Persistent rules & preferences for how AI structures your daily schedules')}
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4] group-hover:bg-[#EDF6E8] dark:group-hover:bg-[#202E1E] transition-colors shrink-0">
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSections['planner'] ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {expandedSections['planner'] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-[#DCEAD4]/80 dark:border-[#263722] space-y-4">
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* Right Column: Workflows, Categories, Audio & Data Management */}
        <div className="lg:col-span-5 space-y-6">
          {/* Feature 1: Reorder Navigation Sections */}
          <section id="section-settings-navigation" className="rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm transition-all duration-200 overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleSection('navigation')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('navigation');
                }
              }}
              aria-expanded={expandedSections['navigation']}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-start gap-3 hover:bg-[#F9FAF6] dark:hover:bg-[#1C2819] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141] shrink-0 group-hover:scale-105 transition-transform">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {t('settings.navOrderSection', 'Navigation Section Order')}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#3B7E10] dark:text-[#80D141] px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/30">
                      {isDraftFa ? `${currentNavOrder.length} بخش` : `${currentNavOrder.length} tabs`}
                    </span>
                  </div>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] truncate">
                    {t('settings.navOrderDesc', 'Reorder tabs in the navigation bar')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetNavOrder();
                  }}
                  className="px-2.5 py-1 rounded-full text-xs font-bold text-[#3B7E10] dark:text-[#80D141] bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] border border-[#D8E8D0] dark:border-[#273722] flex items-center gap-1 transition-colors cursor-pointer"
                  title={t('settings.resetNavOrder', 'Reset Order')}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">{t('settings.resetNavOrder', 'Reset Order')}</span>
                </button>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4] group-hover:bg-[#EDF6E8] dark:group-hover:bg-[#202E1E] transition-colors">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSections['navigation'] ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expandedSections['navigation'] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-[#DCEAD4]/80 dark:border-[#263722] space-y-4">
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Feature: Timer Tabs Reordering (Focus vs Tracker - Expandable) */}
          <section id="section-settings-timer-tabs" className="rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm transition-all duration-200 overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleSection('focus')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('focus');
                }
              }}
              aria-expanded={expandedSections['focus']}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-start gap-3 hover:bg-[#F9FAF6] dark:hover:bg-[#1C2819] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141] shrink-0 group-hover:scale-105 transition-transform">
                  <Timer className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {t('settings.timerTabOrderSection', 'Timer Tabs Order')}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#3B7E10] dark:text-[#80D141] px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/30">
                      {currentFocusTabOrder[0] === 'focus' ? (isDraftFa ? 'تمرکز اول' : 'Focus First') : (isDraftFa ? 'ردیاب اول' : 'Tracker First')}
                    </span>
                  </div>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] truncate">
                    {t('settings.timerTabOrderDesc', 'Reorder Focus and Tracker in the Timer section')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetTimerTabOrder();
                  }}
                  className="px-2.5 py-1 rounded-full text-xs font-bold text-[#3B7E10] dark:text-[#80D141] bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] border border-[#D8E8D0] dark:border-[#273722] flex items-center gap-1 transition-colors cursor-pointer"
                  title={t('settings.resetTimerTabOrder', 'Reset Tabs Order')}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">{t('settings.resetNavOrder', 'Reset Order')}</span>
                </button>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4] group-hover:bg-[#EDF6E8] dark:group-hover:bg-[#202E1E] transition-colors">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSections['focus'] ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expandedSections['focus'] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-[#DCEAD4]/80 dark:border-[#263722] space-y-4">
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Feature 2: Journal Categories Customization (Expandable) */}
          <section id="section-settings-categories" className="rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm transition-all duration-200 overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleSection('categories')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('categories');
                }
              }}
              aria-expanded={expandedSections['categories']}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-start gap-3 hover:bg-[#F9FAF6] dark:hover:bg-[#1C2819] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141] shrink-0 group-hover:scale-105 transition-transform">
                  <Tag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {t('settings.categoriesSection', 'Journal & Task Categories')}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#3B7E10] dark:text-[#80D141] px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/30">
                      {isDraftFa ? `${currentCategories.length} برچسب` : `${currentCategories.length} tags`}
                    </span>
                  </div>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] truncate">
                    {t('settings.categoriesDesc', 'Personalize categorization tags for your notes and tasks')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetCategories();
                  }}
                  className="px-2.5 py-1 rounded-full text-xs font-bold text-[#3B7E10] dark:text-[#80D141] bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] dark:hover:bg-[#283A23] border border-[#D8E8D0] dark:border-[#273722] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Reset to default tags"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">{t('common.reset', 'Reset')}</span>
                </button>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4] group-hover:bg-[#EDF6E8] dark:group-hover:bg-[#202E1E] transition-colors">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSections['categories'] ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expandedSections['categories'] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-[#DCEAD4]/80 dark:border-[#263722] space-y-4">
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Audio & Sensory Feedback (Expandable) */}
          <section id="section-settings-audio" className="rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm transition-all duration-200 overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleSection('audio')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleSection('audio');
                }
              }}
              aria-expanded={expandedSections['audio']}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-start gap-3 hover:bg-[#F9FAF6] dark:hover:bg-[#1C2819] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141] shrink-0 group-hover:scale-105 transition-transform">
                  {(draftPrefs.soundEffectsEnabled ?? true) ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {t('settings.audioSection', 'Audio & Sensory Cues')}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#3B7E10] dark:text-[#80D141] px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/30">
                      {(draftPrefs.soundEffectsEnabled ?? true) ? (isDraftFa ? 'صدا فعال' : 'Sound On') : (isDraftFa ? 'بی‌صدا' : 'Muted')}
                    </span>
                  </div>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] truncate">
                    {t('settings.audioDesc', 'Haptic audio clicks & completion chimes')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playGentleChime();
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#EDF6E8] dark:bg-[#1E2B1A] hover:bg-[#E2F2D9] text-[11px] font-bold text-[#3B4E37] dark:text-[#B6CCB0] border border-[#D8E8D0] dark:border-[#273722] flex items-center gap-1 cursor-pointer"
                  title="Play test chime"
                >
                  <Volume1 className="w-3.5 h-3.5" />
                  <span>{t('common.test', 'Test')}</span>
                </button>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4] group-hover:bg-[#EDF6E8] dark:group-hover:bg-[#202E1E] transition-colors">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSections['audio'] ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {expandedSections['audio'] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-[#DCEAD4]/80 dark:border-[#263722] space-y-4">
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Backup, Export & Danger Zone (Expandable) */}
          <section id="section-settings-backup" className="rounded-[28px] bg-white dark:bg-[#182316] border border-[#D8E8D0] dark:border-[#22301F] shadow-sm transition-all duration-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('backup')}
              aria-expanded={expandedSections['backup']}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-start gap-3 hover:bg-[#F9FAF6] dark:hover:bg-[#1C2819] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/50 flex items-center justify-center text-[#234A00] dark:text-[#80D141] shrink-0 group-hover:scale-105 transition-transform">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                      {t('settings.backupSection', 'Backup & Data')}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#3B7E10] dark:text-[#80D141] px-2 py-0.5 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] border border-[#80D141]/30">
                      {isDraftFa ? 'صادرات و بازنشانی' : 'Export & Reset'}
                    </span>
                  </div>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] truncate">
                    {t('settings.backupDesc', 'Export or restore your workspace locally')}
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#485B44] dark:text-[#9EB598] group-hover:text-[#151E14] dark:group-hover:text-[#E8F2E4] group-hover:bg-[#EDF6E8] dark:group-hover:bg-[#202E1E] transition-colors shrink-0">
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSections['backup'] ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {expandedSections['backup'] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-[#DCEAD4]/80 dark:border-[#263722] space-y-4">
                    <div className="grid grid-cols-2 gap-2 pt-1">
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

                    {/* Clean All Predefined Data (Start Fresh) */}
                    <div className="p-4 rounded-2xl bg-[#F7FAF4] dark:bg-[#1C2919] border border-[#DCEAD4] dark:border-[#2A3E26] space-y-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                          <Eraser className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-[#151E14] dark:text-[#E8F2E4]">
                            {t('settings.cleanWorkspaceBtn', 'Clean All Predefined Tasks & Habits')}
                          </h4>
                          <p className="text-[11px] text-[#485B44] dark:text-[#9EB598] leading-relaxed mt-0.5">
                            {t('settings.cleanWorkspaceDesc', 'Wipe out sample tasks, habits, and notes so you have a pristine, clean workspace ready for your own use. Your settings, API keys, and theme are preserved.')}
                          </p>
                        </div>
                      </div>

                      {!showCleanConfirm ? (
                        <button
                          type="button"
                          id="btn-clean-predefined-data"
                          onClick={() => {
                            soundEngine.playPop();
                            setShowCleanConfirm(true);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-[#202E1E] hover:bg-amber-50 dark:hover:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-800/80 shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                          <span>{t('settings.cleanWorkspaceBtn', 'Clean All Predefined Tasks & Habits')}</span>
                        </button>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 space-y-2.5">
                          <p className="text-xs font-semibold text-amber-950 dark:text-amber-200 leading-relaxed">
                            {t('settings.cleanConfirmDesc', 'This will remove all sample habits, journal entries, brain dump thoughts, and schedules. Your settings and API keys will remain untouched.')}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowCleanConfirm(false)}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-white dark:bg-[#1C281A] text-xs font-bold text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#2A3E26] hover:bg-[#EDF6E8] cursor-pointer"
                            >
                              {t('common.cancel', 'Cancel')}
                            </button>
                            <button
                              type="button"
                              id="btn-confirm-clean-workspace"
                              onClick={handleCleanPredefinedData}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{isDraftFa ? 'بله، همه را پاک کن' : 'Yes, Clean All'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {cleanSuccessMessage && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>{cleanSuccessMessage}</span>
                        </div>
                      )}
                    </div>

                    {/* Reset Demo Data */}
                    <div className="p-4 rounded-2xl bg-[#F7FAF4] dark:bg-[#1A2617] border border-[#DCEAD4] dark:border-[#2A3E26] space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                          <RotateCcw className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-[#151E14] dark:text-[#E8F2E4]">
                            {t('settings.resetDemoBtn', 'Reset Demo Data')}
                          </h4>
                          <p className="text-[11px] text-[#485B44] dark:text-[#9EB598] leading-relaxed mt-0.5">
                            {t('settings.resetConfirmDesc', 'Restore sample habits, tasks, projects, and journal entries so you can explore all Lerni companion features? Your settings and API keys will remain untouched.')}
                          </p>
                        </div>
                      </div>

                      {!showResetConfirm ? (
                        <button
                          type="button"
                          id="btn-reset-demo-data"
                          onClick={() => {
                            soundEngine.playPop();
                            setShowResetConfirm(true);
                            setShowCleanConfirm(false);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-[#202E1E] hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-800 dark:text-blue-300 text-xs font-bold border border-blue-300 dark:border-blue-800/80 shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t('settings.resetDemoBtn', 'Reset Demo Data')}</span>
                        </button>
                      ) : (
                        <div className="p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 space-y-2.5">
                          <p className="text-xs font-semibold text-blue-950 dark:text-blue-200 leading-relaxed">
                            {t('settings.resetConfirmDesc', 'Restore sample habits, tasks, projects, and journal entries so you can explore all Lerni companion features? Your settings and API keys will remain untouched.')}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowResetConfirm(false)}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-white dark:bg-[#1C281A] text-xs font-bold text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#2A3E26] hover:bg-[#EDF6E8] cursor-pointer"
                            >
                              {t('common.cancel', 'Cancel')}
                            </button>
                            <button
                              type="button"
                              id="btn-confirm-reset-demo"
                              onClick={handleResetDemoData}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{isDraftFa ? 'بله، بازنشانی داده‌های نمونه' : 'Yes, Reset Demo Data'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {resetSuccessMessage && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>{resetSuccessMessage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

        </div>

      </div>

    </div>
  );
};
