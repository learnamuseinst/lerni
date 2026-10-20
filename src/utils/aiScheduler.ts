import { GoogleGenAI, Type } from '@google/genai';
import {
  BujoEntry,
  Habit,
  FocusSession,
  UserPreferences,
  EnergyLevel,
  DayPlan,
  ScheduleBlock,
  Chronotype,
  PlanningPace,
  SensoryState,
  SchedulingConstraint,
  AiProvider,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENROUTER_MODEL,
  DEFAULT_CUSTOM_OPENAI_BASE_URL,
  DEFAULT_CUSTOM_OPENAI_MODEL,
  isLocalEndpoint,
  isHabitActiveOnDate,
} from '../types';
import { formatDateDisplay } from './dateUtils';

export interface GenerateScheduleParams {
  targetDate: string;
  entries: BujoEntry[];
  habits: Habit[];
  focusSessions: FocusSession[];
  prefs: UserPreferences;
  chronotype?: Chronotype;
  pace?: PlanningPace;
  schedulingConstraint?: SchedulingConstraint;
  customInstructions?: string;
  dayStartTime?: string;
  dayEndTime?: string;
  includeBacklog?: boolean;
}

export interface OptimizationResult {
  plan: DayPlan;
  isAiGenerated: boolean;
  source: 'gemini' | 'heuristic_fallback';
  message?: string;
}

export interface OpenAiCompatibleCallOptions {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  apiVersion?: string;
  systemInstruction?: string;
  userPrompt: string;
  expectJson?: boolean;
  extraHeaders?: Record<string, string>;
}

export function normalizeOpenAiEndpoint(baseUrl?: string, apiVersion?: string): string {
  let url = (baseUrl || '').trim();
  if (!url) {
    url = DEFAULT_CUSTOM_OPENAI_BASE_URL;
  }
  url = url.replace(/\/+$/, '');

  if (!url.endsWith('/chat/completions')) {
    url = `${url}/chat/completions`;
  }

  if (apiVersion && apiVersion.trim() && !url.includes('api-version=')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}api-version=${encodeURIComponent(apiVersion.trim())}`;
  }

  return url;
}

// Unified caller for ANY OpenAI-compatible endpoint (Ollama, LM Studio, Groq, DeepSeek, Together, Mistral, OpenAI, Azure, etc.)
export async function callOpenAiCompatible({
  baseUrl,
  apiKey,
  model,
  apiVersion,
  systemInstruction,
  userPrompt,
  expectJson = false,
  extraHeaders = {},
}: OpenAiCompatibleCallOptions): Promise<string> {
  const endpoint = normalizeOpenAiEndpoint(baseUrl, apiVersion);
  const cleanKey = apiKey?.trim() || '';
  const cleanModel = model?.trim() || DEFAULT_CUSTOM_OPENAI_MODEL;

  const messages: Array<{ role: string; content: string }> = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: userPrompt });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  if (cleanKey) {
    headers['Authorization'] = `Bearer ${cleanKey}`;
    headers['api-key'] = cleanKey; // Support Azure OpenAI
  }

  if (endpoint.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://lerni.app';
    headers['X-Title'] = 'Lerni Focus & Executive Function Companion';
  }

  const payload: any = {
    model: cleanModel,
    messages,
  };

  if (expectJson) {
    payload.response_format = { type: 'json_object' };
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (networkErr: any) {
    if (isLocalEndpoint(endpoint)) {
      throw new Error(
        `Could not connect to local model at ${endpoint}. Make sure your local server (Ollama, LM Studio, etc.) is running and CORS allows connections.`
      );
    }
    throw new Error(`Network error calling AI endpoint (${endpoint}): ${networkErr?.message || networkErr}`);
  }

  // If response_format caused an error on some local/custom models, retry once without it
  if (!response.ok && response.status === 400 && expectJson) {
    delete payload.response_format;
    const retry = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    }).catch(() => null);
    if (retry && retry.ok) {
      response = retry;
    }
  }

  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errMsg = data?.error?.message || data?.message || `AI API error (${response.status})`;
    throw new Error(errMsg);
  }

  const rawText = data?.choices?.[0]?.message?.content?.trim() || '';
  if (!rawText) {
    throw new Error('Empty response received from AI model.');
  }

  if (!expectJson) {
    return rawText;
  }

  // Strip markdown code fences if present
  let cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // If model included conversational text before/after JSON object, extract the JSON block
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

// OpenRouter Chat Completions wrapper
export async function callOpenRouter({
  apiKey,
  model = DEFAULT_OPENROUTER_MODEL,
  systemInstruction,
  userPrompt,
  expectJson = true,
}: {
  apiKey: string;
  model?: string;
  systemInstruction?: string;
  userPrompt: string;
  expectJson?: boolean;
}): Promise<string> {
  return callOpenAiCompatible({
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey,
    model,
    systemInstruction,
    userPrompt,
    expectJson,
  });
}

// Test AI connection directly from browser (supports Gemini, OpenRouter, and Custom OpenAI-compatible)
export interface AiPromptTestResult {
  valid: boolean;
  message: string;
  response?: string;
  latencyMs: number;
  provider: AiProvider;
  model: string;
  endpoint?: string;
}

export async function testAiPrompt({
  provider = 'gemini',
  apiKey,
  model,
  prompt,
  baseUrl,
  apiVersion,
}: {
  provider: AiProvider;
  apiKey?: string;
  model?: string;
  prompt: string;
  baseUrl?: string;
  apiVersion?: string;
}): Promise<AiPromptTestResult> {
  const startTime = performance.now();
  const cleanKey = apiKey?.trim() || '';
  const cleanPrompt = prompt?.trim() || 'What is the capital of France?';
  const activeBaseUrl = baseUrl?.trim() || DEFAULT_CUSTOM_OPENAI_BASE_URL;

  let activeModel = '';
  if (provider === 'custom') {
    activeModel = model?.trim() || DEFAULT_CUSTOM_OPENAI_MODEL;
  } else if (provider === 'openrouter') {
    activeModel = model?.trim() || DEFAULT_OPENROUTER_MODEL;
  } else {
    activeModel = model?.trim() || DEFAULT_GEMINI_MODEL;
  }

  // Key validation: local custom endpoints don't need keys
  if (!cleanKey) {
    if (provider === 'custom' && isLocalEndpoint(activeBaseUrl)) {
      // Allowed without key!
    } else {
      return {
        valid: false,
        message:
          provider === 'custom'
            ? 'No API key provided for your custom cloud endpoint. Please enter your API key.'
            : provider === 'openrouter'
            ? 'No OpenRouter API key provided. Please enter your API key.'
            : 'No Gemini API key provided. Please enter your API key.',
        latencyMs: 0,
        provider,
        model: activeModel,
        endpoint: provider === 'custom' ? normalizeOpenAiEndpoint(activeBaseUrl, apiVersion) : undefined,
      };
    }
  }

  try {
    let reply = '';
    if (provider === 'custom') {
      reply = await callOpenAiCompatible({
        baseUrl: activeBaseUrl,
        apiKey: cleanKey,
        model: activeModel,
        apiVersion,
        userPrompt: cleanPrompt,
        expectJson: false,
      });
    } else if (provider === 'openrouter') {
      reply = await callOpenRouter({
        apiKey: cleanKey,
        model: activeModel,
        userPrompt: cleanPrompt,
        expectJson: false,
      });
    } else {
      const client = new GoogleGenAI({ apiKey: cleanKey });
      const response = await client.models.generateContent({
        model: activeModel,
        contents: cleanPrompt,
      });
      reply = response.text?.trim() || '(No response text returned)';
    }

    const latencyMs = Math.round(performance.now() - startTime);
    return {
      valid: true,
      message: 'Success',
      response: reply,
      latencyMs,
      provider,
      model: activeModel,
      endpoint: provider === 'custom' ? normalizeOpenAiEndpoint(activeBaseUrl, apiVersion) : undefined,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    console.error('AI prompt test error:', err?.message || err);
    const isQuotaError = /quota|rate limit|429|resource exhausted|insufficient credits/i.test(err?.message || '');
    const isAuthError = /api key not valid|invalid api key|unauthenticated|unauthorized|401|403|no auth credentials/i.test(err?.message || '');

    let userFriendlyMsg = err?.message || 'Failed to communicate with AI provider.';
    if (isAuthError) {
      userFriendlyMsg =
        provider === 'custom'
          ? 'Invalid API Key for custom endpoint. Please verify your credentials.'
          : provider === 'openrouter'
          ? 'Invalid OpenRouter API Key. Please verify your key from openrouter.ai/keys.'
          : 'Invalid Gemini API Key. Please verify your key from Google AI Studio.';
    } else if (isQuotaError) {
      userFriendlyMsg = 'Quota or rate limit reached. Please check your account credits or rate limits.';
    }

    return {
      valid: false,
      message: userFriendlyMsg,
      latencyMs,
      provider,
      model: activeModel,
      endpoint: provider === 'custom' ? normalizeOpenAiEndpoint(activeBaseUrl, apiVersion) : undefined,
    };
  }
}

export async function testAiConnection({
  provider = 'gemini',
  apiKey,
  model,
  baseUrl,
  apiVersion,
}: {
  provider: AiProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  apiVersion?: string;
}): Promise<{ valid: boolean; message: string; model?: string; sampleResponse?: string; latencyMs?: number }> {
  const result = await testAiPrompt({
    provider,
    apiKey,
    model,
    baseUrl,
    apiVersion,
    prompt: "Respond with only 'OK'.",
  });

  const providerName =
    provider === 'custom'
      ? 'Custom OpenAI API'
      : provider === 'openrouter'
      ? 'OpenRouter'
      : 'Gemini';

  return {
    valid: result.valid,
    message: result.valid
      ? `${providerName} connected successfully (${result.model}, ${result.latencyMs}ms)!`
      : result.message,
    model: result.model,
    sampleResponse: result.response,
    latencyMs: result.latencyMs,
  };
}

/**
 * Assumes the Day Pacing style based on Mind & Sensory State and Energy battery level.
 * - 'overwhelmed', 'brain_fog', or 'low_energy' -> 'gentle' (low friction, generous restorative buffers, shorter task chunks)
 * - 'hyperfocus' -> 'intensive' (deep flow sprints, compact breaks)
 * - 'balanced' -> matches current energy level
 */
export function derivePaceFromSensoryState(sensoryState?: SensoryState, currentEnergy?: EnergyLevel): PlanningPace {
  if (sensoryState === 'overwhelmed' || sensoryState === 'brain_fog' || sensoryState === 'low_energy') {
    return 'gentle';
  }
  if (sensoryState === 'hyperfocus') {
    return 'intensive';
  }
  if (currentEnergy === 'low') {
    return 'gentle';
  }
  if (currentEnergy === 'high') {
    return 'intensive';
  }
  return 'balanced';
}

// Generate schedule directly via Gemini or OpenRouter API from the browser with graceful local heuristic fallback
export async function optimizeDailySchedule(params: GenerateScheduleParams): Promise<OptimizationResult> {
  const {
    targetDate,
    entries,
    habits,
    focusSessions,
    prefs,
    chronotype = prefs.chronotype || 'balanced',
    pace = derivePaceFromSensoryState(prefs.sensoryState, prefs.currentEnergy),
    schedulingConstraint = 'all_priority',
    customInstructions,
    dayStartTime = '09:00',
    dayEndTime = '18:00',
    includeBacklog = true,
  } = params;

  // Filter relevant journal entries for target date (plus uncompleted priority backlog if enabled)
  const targetDayEntries = entries.filter((e) => e.date === targetDate && e.status !== 'cancelled');
  const backlogEntries = includeBacklog
    ? entries.filter(
        (e) =>
          e.date < targetDate &&
          e.status === 'open' &&
          (e.isPriority || e.energyCost === 'high' || e.type === 'task')
      ).slice(0, 5)
    : [];

  const combinedCandidateEntries = [...targetDayEntries, ...backlogEntries];

  // If no journal entries exist, we can still generate an intentional template or use habits
  const activeHabits = habits.filter((h) => !h.isArchived && isHabitActiveOnDate(h, targetDate));

  // Compute focus stats
  const recentSessions = focusSessions.slice(0, 10);
  const totalFocusMinutes = Math.round(recentSessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60);

  const provider: AiProvider = prefs.aiProvider || 'gemini';
  const currentEnergy = prefs.currentEnergy || 'medium';
  const sensoryState = prefs.sensoryState || 'balanced';
  const dayOfWeek = formatDateDisplay(targetDate, { showDayOfWeek: true, includeYear: false });

  const constraintNote = schedulingConstraint === 'all_priority'
    ? "PRIORITY MANDATE: Every task marked as 'isPriority: true' MUST be scheduled within the day range without exception."
    : schedulingConstraint === 'all_tasks'
    ? "FULL COMPLETION MANDATE: ALL provided open tasks must be scheduled within the day range (compress durations slightly or streamline transitions to fit them all)."
    : "BALANCED CAPACITY: Schedule tasks comfortably according to current energy capacity, prioritizing key items without overload.";

  const customInstructionNote = customInstructions && typeof customInstructions === 'string' && customInstructions.trim()
    ? `\n8. USER'S CUSTOM SCHEDULING INSTRUCTIONS: "${customInstructions.trim()}". (Strictly adhere to and incorporate these specific guidelines).`
    : '';

  const systemInstruction = `You are Lerni's Intelligent Executive Function & Energy-Aware Schedule Planner.
Your purpose is to synthesize a user's Bullet Journal tasks, recurring habits, and real-time neurodivergent energy patterns to create an empowering, realistic daily time-blocked schedule.

CRITICAL NEURODIVERGENT (ADHD / EXECUTIVE FUNCTION) PRINCIPLES:
1. ENERGY MATCHING: Match demanding/high cognitive load tasks (high energy) with peak predicted energy periods. Never stack two high-energy tasks back-to-back without a buffer or restorative break.
2. LOW INITIATION FRICTION: For EVERY task block, break down the initiation barrier with 2-3 extremely small, ultra-clear micro starter steps (<2 minutes each, e.g., "Open tab and log in", "Write first bullet point").
3. REALISTIC PACING: Respect the user's current sensory state (${sensoryState}) and current energy (${currentEnergy}). If the user is overwhelmed or low energy, schedule generous transitions, gentle warm-ups, and keep task durations shorter (15-25m).
4. CHRONOTYPE & DAY BOUNDS: Align with chronotype '${chronotype}' between ${dayStartTime} and ${dayEndTime}.
5. BUFFER & RESTORATIVE BLOCKS: Include sensory rest / somatic resets / hydration pauses between focused blocks.
6. PRESERVE FIXED TIMES & HABITS: If a Journal entry or Habit has a designated 'time' (e.g. 08:00 for morning routine or 14:00 for doctor appointment), anchor it at that exact time and schedule other tasks around it. Respect each Habit's designated 'durationMinutes' and time bucket (morning, midday, evening, anytime) when creating schedule blocks.
7. ${constraintNote}${customInstructionNote}`;

  const promptPayload = {
    targetDate,
    dayOfWeek: dayOfWeek || 'Today',
    userStatus: {
      currentEnergy,
      sensoryState,
      chronotype,
      pace,
    },
    customInstructions: customInstructions?.trim() || undefined,
    dayTimeRange: { start: dayStartTime, end: dayEndTime },
    journalEntries: combinedCandidateEntries.map((e) => ({
      id: e.id,
      content: e.content,
      type: e.type,
      status: e.status,
      energyCost: e.energyCost,
      durationMinutes: e.durationMinutes || (e.energyCost === 'high' ? 45 : e.energyCost === 'medium' ? 25 : 15),
      time: e.time,
      isPriority: Boolean(e.isPriority),
      category: e.category || 'General',
    })),
    habits: activeHabits.map((h) => ({
      id: h.id,
      title: h.title,
      timeBucket: h.timeBucket,
      energyCost: h.energyCost,
      time: h.time,
      durationMinutes: h.durationMinutes || (h.energyCost === 'high' ? 20 : h.energyCost === 'medium' ? 10 : 5),
      unstickTip: h.unstickTip,
    })),
    recentFocusStats: {
      totalMinutesLogged: totalFocusMinutes,
      sessionCount: recentSessions.length,
    },
  };

  try {
    let scheduleData: any;

    if (provider === 'custom') {
      const baseUrl =
        prefs.customOpenAiBaseUrl?.trim() ||
        (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_BASE_URL : '') ||
        DEFAULT_CUSTOM_OPENAI_BASE_URL;
      const customKey =
        prefs.customOpenAiApiKey?.trim() ||
        (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_API_KEY : '') ||
        '';
      const customModel =
        prefs.customOpenAiModel?.trim() ||
        (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_MODEL : '') ||
        DEFAULT_CUSTOM_OPENAI_MODEL;
      const apiVersion =
        prefs.customOpenAiApiVersion?.trim() ||
        (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_API_VERSION : '') ||
        '';

      if (!isLocalEndpoint(baseUrl) && !customKey) {
        throw new Error(
          'No API key provided for your custom OpenAI-compatible endpoint. Please enter your API key in Settings.'
        );
      }

      const jsonSchemaInstruction = `
Return ONLY a valid JSON object matching this exact structure (no markdown fences, no commentary):
{
  "summary": "string (1-2 sentence overview)",
  "predictedEnergyRhythm": {
    "morning": "low | medium | high",
    "afternoon": "low | medium | high",
    "evening": "low | medium | high",
    "rhythmNote": "string"
  },
  "scheduleBlocks": [
    {
      "id": "block-1",
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "title": "string",
      "type": "task | event | break | habit | micro_reset",
      "energyDemand": "low | medium | high",
      "durationMinutes": 25,
      "bujoEntryId": "string or empty",
      "executiveRationale": "string",
      "isBreak": false
    }
  ],
  "pacingAdvice": ["tip 1", "tip 2", "tip 3"],
  "totalFocusMinutes": 120,
  "totalBreakMinutes": 45
}`;

      const responseText = await callOpenAiCompatible({
        baseUrl,
        apiKey: customKey,
        model: customModel,
        apiVersion,
        systemInstruction: `${systemInstruction}\n${jsonSchemaInstruction}`,
        userPrompt: `Analyze these tasks and energy patterns to construct the optimal daily schedule:\n${JSON.stringify(promptPayload, null, 2)}`,
        expectJson: true,
      });

      scheduleData = JSON.parse(responseText);
    } else if (provider === 'openrouter') {
      const orKey = prefs.openRouterApiKey?.trim() || '';
      if (!orKey) {
        throw new Error('No OpenRouter API key available. Please enter your OpenRouter API key in Settings.');
      }

      const jsonSchemaInstruction = `
Return ONLY a valid JSON object matching this exact structure (no markdown fences, no commentary):
{
  "summary": "string (1-2 sentence overview)",
  "predictedEnergyRhythm": {
    "morning": "low | medium | high",
    "afternoon": "low | medium | high",
    "evening": "low | medium | high",
    "rhythmNote": "string"
  },
  "scheduleBlocks": [
    {
      "id": "block-1",
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "title": "string",
      "type": "task | event | break | habit | micro_reset",
      "energyDemand": "low | medium | high",
      "durationMinutes": 25,
      "bujoEntryId": "string or empty",
      "executiveRationale": "string",
      "isBreak": false
    }
  ],
  "pacingAdvice": ["tip 1", "tip 2", "tip 3"],
  "totalFocusMinutes": 120,
  "totalBreakMinutes": 45
}`;

      const responseText = await callOpenRouter({
        apiKey: orKey,
        model: prefs.openRouterModel?.trim() || DEFAULT_OPENROUTER_MODEL,
        systemInstruction: `${systemInstruction}\n${jsonSchemaInstruction}`,
        userPrompt: `Analyze these tasks and energy patterns to construct the optimal daily schedule:\n${JSON.stringify(promptPayload, null, 2)}`,
        expectJson: true,
      });

      scheduleData = JSON.parse(responseText);
    } else {
      const geminiKey = prefs.geminiApiKey?.trim() || '';
      if (!geminiKey) {
        throw new Error('No Gemini API key available. Please enter your API key in Settings.');
      }

      const activeGeminiModel = prefs.geminiModel?.trim() || DEFAULT_GEMINI_MODEL;
      const client = new GoogleGenAI({ apiKey: geminiKey });

      const response = await client.models.generateContent({
        model: activeGeminiModel,
        contents: `Analyze these tasks and energy patterns to construct the optimal daily schedule:\n${JSON.stringify(promptPayload, null, 2)}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: "Warm, empowering 1-2 sentence overview of how today's flow aligns with their energy.",
              },
              predictedEnergyRhythm: {
                type: Type.OBJECT,
                properties: {
                  morning: { type: Type.STRING, description: "Predicted morning energy: 'low', 'medium', or 'high'" },
                  afternoon: { type: Type.STRING, description: "Predicted afternoon energy: 'low', 'medium', or 'high'" },
                  evening: { type: Type.STRING, description: "Predicted evening energy: 'low', 'medium', or 'high'" },
                  rhythmNote: { type: Type.STRING, description: '1 sentence explaining the predicted energy curve.' },
                },
                required: ['morning', 'afternoon', 'evening', 'rhythmNote'],
              },
              scheduleBlocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: 'Unique block id, e.g. block-1' },
                    startTime: { type: Type.STRING, description: 'HH:mm 24hr format, e.g. 09:00' },
                    endTime: { type: Type.STRING, description: 'HH:mm 24hr format, e.g. 09:30' },
                    title: { type: Type.STRING, description: 'Clear descriptive task or activity title' },
                    type: { type: Type.STRING, description: "'task', 'event', 'break', 'habit', or 'micro_reset'" },
                    energyDemand: { type: Type.STRING, description: "'low', 'medium', or 'high'" },
                    durationMinutes: { type: Type.INTEGER, description: 'Duration in minutes' },
                    bujoEntryId: { type: Type.STRING, description: 'Matched BujoEntry id if mapped, or empty string' },
                    executiveRationale: { type: Type.STRING, description: 'Encouraging, ADHD-friendly reason for this placement' },
                    isBreak: { type: Type.BOOLEAN, description: 'True if rest/recharge block' },
                  },
                  required: ['id', 'startTime', 'endTime', 'title', 'type', 'energyDemand', 'durationMinutes', 'executiveRationale'],
                },
              },
              pacingAdvice: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 concise, actionable executive-function tips tailored to their current state',
              },
              totalFocusMinutes: { type: Type.INTEGER, description: 'Sum of productive work minutes' },
              totalBreakMinutes: { type: Type.INTEGER, description: 'Sum of scheduled rest minutes' },
            },
            required: ['summary', 'predictedEnergyRhythm', 'scheduleBlocks', 'pacingAdvice', 'totalFocusMinutes', 'totalBreakMinutes'],
          },
        },
      });

      const responseText = response.text?.trim();
      if (!responseText) {
        throw new Error('Empty response received from Gemini model.');
      }

      scheduleData = JSON.parse(responseText);
    }

    const plan: DayPlan = {
      date: targetDate,
      summary: scheduleData.summary || 'Optimized energy-aware daily schedule created.',
      predictedEnergyRhythm: scheduleData.predictedEnergyRhythm || {
        morning: 'medium',
        afternoon: 'high',
        evening: 'low',
        rhythmNote: 'Standard executive distribution curve.',
      },
      scheduleBlocks: (scheduleData.scheduleBlocks || []).map((b: any, idx: number) => ({
        id: b.id || `block-${idx + 1}`,
        startTime: b.startTime || '09:00',
        endTime: b.endTime || '09:30',
        title: b.title || 'Scheduled Block',
        type: b.type || 'task',
        energyDemand: (b.energyDemand as EnergyLevel) || 'medium',
        durationMinutes: Number(b.durationMinutes) || 25,
        bujoEntryId: b.bujoEntryId || undefined,
        executiveRationale: b.executiveRationale || 'Strategically scheduled for your cognitive flow.',
        microStarterSteps: Array.isArray(b.microStarterSteps) && b.microStarterSteps.length > 0 ? b.microStarterSteps : undefined,
        isBreak: Boolean(b.isBreak || b.type === 'break' || b.type === 'micro_reset'),
        completed: false,
      })),
      pacingAdvice: Array.isArray(scheduleData.pacingAdvice)
        ? scheduleData.pacingAdvice
        : ['Pace yourself and take sensory resets between deep focus blocks.'],
      totalFocusMinutes: Number(scheduleData.totalFocusMinutes) || 120,
      totalBreakMinutes: Number(scheduleData.totalBreakMinutes) || 45,
      createdAt: Date.now(),
    };

    return {
      plan,
      isAiGenerated: true,
      source: 'gemini',
    };
  } catch (err: any) {
    console.warn('AI API issue, falling back to local heuristic scheduler:', err?.message || err);
    const fallbackPlan = generateLocalHeuristicSchedule(params, combinedCandidateEntries);
    return {
      plan: fallbackPlan,
      isAiGenerated: false,
      source: 'heuristic_fallback',
      message: err?.message || 'Generated using local energy-aware scheduler.',
    };
  }
}

// Fallback neurodivergent-friendly schedule synthesizer
export function generateLocalHeuristicSchedule(
  params: GenerateScheduleParams,
  candidateEntries: BujoEntry[]
): DayPlan {
  const { targetDate, prefs, habits = [], chronotype = prefs.chronotype || 'balanced', dayStartTime = '09:00' } = params;
  const currentEnergy = prefs.currentEnergy || 'medium';

  // Predict rhythm
  let morningEnergy: EnergyLevel = 'medium';
  let afternoonEnergy: EnergyLevel = 'high';
  let eveningEnergy: EnergyLevel = 'low';
  let rhythmNote = 'Gentle morning warm-up followed by peak focus window before midday lull.';

  if (chronotype === 'morning') {
    morningEnergy = 'high';
    afternoonEnergy = 'medium';
    eveningEnergy = 'low';
    rhythmNote = 'Frontloaded high cognitive capacity in the morning; gentle wrap-up in the afternoon.';
  } else if (chronotype === 'evening') {
    morningEnergy = 'low';
    afternoonEnergy = 'medium';
    eveningEnergy = 'high';
    rhythmNote = 'Gentle slow morning with late afternoon and evening hyperfocus bursts.';
  } else if (currentEnergy === 'low') {
    morningEnergy = 'low';
    afternoonEnergy = 'low';
    eveningEnergy = 'low';
    rhythmNote = 'Low-spoon day detected: gentle pacing with low-friction tasks and generous restorative buffers.';
  }

  // Parse start hour & minute
  const [startH, startM] = dayStartTime.split(':').map((n) => parseInt(n, 10) || 0);
  let currentMinutes = startH * 60 + startM;

  const formatClock = (totalMins: number): string => {
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const blocks: ScheduleBlock[] = [];
  let focusMins = 0;
  let breakMins = 0;

  // Active unarchived habits for the target date
  const activeHabits = habits.filter((h) => !h.isArchived && isHabitActiveOnDate(h, targetDate));
  const morningHabits = activeHabits.filter((h) => h.timeBucket === 'morning');
  const middayHabits = activeHabits.filter((h) => h.timeBucket === 'midday');
  const eveningHabits = activeHabits.filter((h) => h.timeBucket === 'evening');

  // 1. Morning anchor / gentle kickoff & morning habits
  if (morningHabits.length > 0) {
    morningHabits.forEach((mh) => {
      const duration = mh.durationMinutes || (mh.energyCost === 'high' ? 20 : mh.energyCost === 'medium' ? 10 : 5);
      const startTime = mh.time || formatClock(currentMinutes);
      if (mh.time) {
        const [h, m] = mh.time.split(':').map((n) => parseInt(n, 10) || 0);
        currentMinutes = h * 60 + m + duration;
      } else {
        currentMinutes += duration;
      }
      blocks.push({
        id: `block-habit-${mh.id}`,
        startTime,
        endTime: formatClock(currentMinutes),
        title: `🌱 ${mh.title}`,
        type: 'habit',
        energyDemand: mh.energyCost,
        durationMinutes: duration,
        executiveRationale: mh.unstickTip || 'Daily micro-habit anchor to start the day with low friction.',
        microStarterSteps: [
          mh.unstickTip ? `10s fallback: ${mh.unstickTip}` : `Start with just 1 tiny step for ${mh.title}`,
          'Take a slow breath and celebrate the small win'
        ],
        isBreak: mh.energyCost === 'low',
        completed: mh.completedDates.includes(targetDate),
      });
      if (mh.energyCost === 'low') breakMins += duration;
      else focusMins += duration;
    });
  } else {
    const kickoffStart = formatClock(currentMinutes);
    currentMinutes += 15;
    blocks.push({
      id: `block-kickoff`,
      startTime: kickoffStart,
      endTime: formatClock(currentMinutes),
      title: 'Morning Somatic Check-in & Water',
      type: 'micro_reset',
      energyDemand: 'low',
      durationMinutes: 15,
      executiveRationale: 'Gentle somatic transition to reduce cortisol and orient your mind for the day.',
      microStarterSteps: ['Pour a glass of water', 'Take 3 deep shoulder drops', 'Review today’s simple intention'],
      isBreak: true,
      completed: false,
    });
    breakMins += 15;
  }

  // 2. Schedule candidate entries
  const sortedEntries = [...candidateEntries].sort((a, b) => {
    // Priority first
    if (a.isPriority && !b.isPriority) return -1;
    if (!a.isPriority && b.isPriority) return 1;
    // Match energy
    const weight = { high: 3, medium: 2, low: 1 };
    return (weight[b.energyCost] || 2) - (weight[a.energyCost] || 2);
  });

  if (sortedEntries.length === 0) {
    // Provide a sample balanced structure
    const task1Start = formatClock(currentMinutes);
    currentMinutes += 30;
    blocks.push({
      id: `block-sample-1`,
      startTime: task1Start,
      endTime: formatClock(currentMinutes),
      title: 'Top Priority Focus Sprint',
      type: 'task',
      energyDemand: currentEnergy === 'low' ? 'low' : 'medium',
      durationMinutes: 30,
      executiveRationale: 'Tackle your primary objective in a contained 30-minute burst before cognitive fatigue.',
      microStarterSteps: ['Write the single main outcome on scratch paper', 'Set 25 min timer', 'Start 1 sentence'],
      isBreak: false,
      completed: false,
    });
    focusMins += 30;

    // Restorative break
    const break1Start = formatClock(currentMinutes);
    currentMinutes += 15;
    blocks.push({
      id: `block-break-1`,
      startTime: break1Start,
      endTime: formatClock(currentMinutes),
      title: 'Sensory Recharge & Dopamine Reset',
      type: 'break',
      energyDemand: 'low',
      durationMinutes: 15,
      executiveRationale: 'Prevent hyperfocus burnout and refresh executive neurotransmitters.',
      microStarterSteps: ['Step away from screens', 'Gentle stretch or look outdoors', 'Hydrate'],
      isBreak: true,
      completed: false,
    });
    breakMins += 15;

    // Second task
    const task2Start = formatClock(currentMinutes);
    currentMinutes += 25;
    blocks.push({
      id: `block-sample-2`,
      startTime: task2Start,
      endTime: formatClock(currentMinutes),
      title: 'Admin & Low-Friction Tasks',
      type: 'task',
      energyDemand: 'low',
      durationMinutes: 25,
      executiveRationale: 'Quick low-barrier wins to build dopamine momentum without heavy cognitive load.',
      microStarterSteps: ['Gather links/documents', 'Complete 1 small item', 'Clear workspace'],
      isBreak: false,
      completed: false,
    });
    focusMins += 25;
  } else {
    // Iterate over entries
    sortedEntries.forEach((entry, idx) => {
      // Buffer before task if not first
      if (idx > 0 && idx % 2 === 0) {
        const breakStart = formatClock(currentMinutes);
        currentMinutes += 15;
        blocks.push({
          id: `block-break-${idx}`,
          startTime: breakStart,
          endTime: formatClock(currentMinutes),
          title: 'Sensory Reset & Hydration Break',
          type: 'break',
          energyDemand: 'low',
          durationMinutes: 15,
          executiveRationale: 'Essential cognitive buffer to prevent dopamine depletion.',
          microStarterSteps: ['Stand up and roll wrists', 'Sip water', 'Take 3 steady breaths'],
          isBreak: true,
          completed: false,
        });
        breakMins += 15;
      }

      const duration = entry.durationMinutes || (entry.energyCost === 'high' ? 45 : entry.energyCost === 'medium' ? 25 : 15);
      const taskStart = entry.time || formatClock(currentMinutes);
      
      // Calculate minutes
      if (!entry.time) {
        currentMinutes += duration;
      } else {
        const [h, m] = entry.time.split(':').map((n) => parseInt(n, 10) || 0);
        currentMinutes = h * 60 + m + duration;
      }

      blocks.push({
        id: `block-entry-${entry.id}`,
        startTime: taskStart,
        endTime: formatClock(currentMinutes),
        title: entry.content,
        type: entry.type === 'event' ? 'event' : 'task',
        energyDemand: entry.energyCost,
        durationMinutes: duration,
        bujoEntryId: entry.id,
        executiveRationale: entry.isPriority
          ? 'High-impact anchor scheduled to maximize your peak executive focus window.'
          : 'Low-friction task positioned to prevent decision fatigue.',
        microStarterSteps: [
          `Open necessary window or notebook for "${entry.content.slice(0, 24)}"`,
          'Write or outline the first tiny sub-action',
          'Work for just 2 uninterrupted minutes'
        ],
        isBreak: false,
        completed: entry.status === 'completed',
      });
      focusMins += duration;
    });
  }

  // Evening habits & wrap-up
  if (eveningHabits.length > 0) {
    eveningHabits.forEach((eh) => {
      const duration = eh.durationMinutes || (eh.energyCost === 'high' ? 20 : eh.energyCost === 'medium' ? 10 : 5);
      const startTime = eh.time || formatClock(currentMinutes);
      if (eh.time) {
        const [h, m] = eh.time.split(':').map((n) => parseInt(n, 10) || 0);
        currentMinutes = h * 60 + m + duration;
      } else {
        currentMinutes += duration;
      }
      blocks.push({
        id: `block-habit-${eh.id}`,
        startTime,
        endTime: formatClock(currentMinutes),
        title: `🌙 ${eh.title}`,
        type: 'habit',
        energyDemand: eh.energyCost,
        durationMinutes: duration,
        executiveRationale: eh.unstickTip || 'Evening wind-down routine.',
        microStarterSteps: [
          eh.unstickTip ? `10s fallback: ${eh.unstickTip}` : `Start with just 1 tiny step for ${eh.title}`,
          'Acknowledge taking care of yourself'
        ],
        isBreak: eh.energyCost === 'low',
        completed: eh.completedDates.includes(targetDate),
      });
      if (eh.energyCost === 'low') breakMins += duration;
      else focusMins += duration;
    });
  }

  // Evening wrap-up
  const wrapStart = formatClock(currentMinutes);
  currentMinutes += 15;
  blocks.push({
    id: `block-wrapup`,
    startTime: wrapStart,
    endTime: formatClock(currentMinutes),
    title: 'Daily Reflection & Brain Dump',
    type: 'micro_reset',
    energyDemand: 'low',
    durationMinutes: 15,
    executiveRationale: 'Unload working memory before evening so your mind feels clear and grounded.',
    microStarterSteps: ['Check off completed journal tasks', 'Jot any lingering thoughts into Brain Dump', 'Celebrate 1 win'],
    isBreak: true,
    completed: false,
  });
  breakMins += 15;

  return {
    date: targetDate,
    summary: `Personalized ${chronotype} rhythm plan with ${focusMins}m structured focus and ${breakMins}m restorative buffers.`,
    predictedEnergyRhythm: {
      morning: morningEnergy,
      afternoon: afternoonEnergy,
      evening: eveningEnergy,
      rhythmNote,
    },
    scheduleBlocks: blocks,
    pacingAdvice: [
      'Take the scheduled somatic breaks seriously — they recharge dopamine for the next task.',
      'If initiation friction feels heavy, do only the first 2-minute starter step.',
      'Adjust or swap time slots freely without guilt if your energy shifts.'
    ],
    totalFocusMinutes: focusMins,
    totalBreakMinutes: breakMins,
    createdAt: Date.now(),
  };
}

// Helper to sync scheduled times from DayPlan back to BujoEntries
export function syncPlanToBujoEntries(plan: DayPlan, currentEntries: BujoEntry[]): BujoEntry[] {
  const blockMap = new Map<string, ScheduleBlock>();
  plan.scheduleBlocks.forEach((b) => {
    if (b.bujoEntryId) {
      blockMap.set(b.bujoEntryId, b);
    }
  });

  return currentEntries.map((entry) => {
    const matchedBlock = blockMap.get(entry.id);
    if (matchedBlock) {
      return {
        ...entry,
        time: matchedBlock.startTime,
        durationMinutes: matchedBlock.durationMinutes,
      };
    }
    return entry;
  });
}

// Generate 2-minute starter steps for a single schedule block on demand directly from the browser
export async function generateStarterStepsForBlock(
  taskTitle: string,
  energyDemand: EnergyLevel = 'medium',
  prefs: UserPreferences
): Promise<string[]> {
  const isFa = prefs.language === 'fa';
  const sensoryState = prefs.sensoryState || 'balanced';
  const provider: AiProvider = prefs.aiProvider || 'gemini';

  const prompt = `You are an ADHD executive function initiation coach.
The user wants to start this task: "${taskTitle}".
Task cognitive energy level: ${energyDemand}.
User sensory state: ${sensoryState}.
Language target: ${isFa ? 'Persian (Farsi / فارسی)' : 'English'}.

Generate exactly 3 gentle, concrete, ultra-low-friction 2-minute micro starter steps designed to break task paralysis and build initial dopamine momentum.
Rules:
1. Each step MUST take under 2 minutes (e.g., "Open tab and search document", "Write 1 messy bullet point", "Place notebook and pen on desk").
2. Tone: warm, non-judgmental, zero cognitive load.
3. Keep each step under 15 words.
${isFa ? '4. IMPORTANT: Write all 3 starter steps strictly in natural, encouraging Persian (Farsi / فارسی).' : ''}`;

  try {
    if (provider === 'custom') {
      const baseUrl =
        prefs.customOpenAiBaseUrl?.trim() ||
        (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_BASE_URL : '') ||
        DEFAULT_CUSTOM_OPENAI_BASE_URL;
      const customKey =
        prefs.customOpenAiApiKey?.trim() ||
        (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_API_KEY : '') ||
        '';
      const customModel =
        prefs.customOpenAiModel?.trim() ||
        (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_MODEL : '') ||
        DEFAULT_CUSTOM_OPENAI_MODEL;
      const apiVersion =
        prefs.customOpenAiApiVersion?.trim() ||
        (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_API_VERSION : '') ||
        '';

      const responseText = await callOpenAiCompatible({
        baseUrl,
        apiKey: customKey,
        model: customModel,
        apiVersion,
        systemInstruction:
          'Return ONLY a valid JSON object with key "steps" containing an array of 3 strings: {"steps": ["step 1", "step 2", "step 3"]}.',
        userPrompt: prompt,
        expectJson: true,
      });

      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        return parsed.steps;
      }
    } else if (provider === 'openrouter') {
      const orKey = prefs.openRouterApiKey?.trim() || '';
      if (!orKey) {
        throw new Error('No OpenRouter API key available.');
      }

      const responseText = await callOpenRouter({
        apiKey: orKey,
        model: prefs.openRouterModel?.trim() || DEFAULT_OPENROUTER_MODEL,
        systemInstruction: 'Return ONLY a valid JSON object with key "steps" containing an array of 3 strings: {"steps": ["step 1", "step 2", "step 3"]}.',
        userPrompt: prompt,
        expectJson: true,
      });

      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        return parsed.steps;
      }
    } else {
      const geminiKey = prefs.geminiApiKey?.trim() || '';
      if (!geminiKey) {
        throw new Error('No Gemini API key available.');
      }

      const activeGeminiModel = prefs.geminiModel?.trim() || DEFAULT_GEMINI_MODEL;
      const client = new GoogleGenAI({ apiKey: geminiKey });

      const response = await client.models.generateContent({
        model: activeGeminiModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 3 low-barrier 2-minute initiation subtasks',
              },
            },
            required: ['steps'],
          },
        },
      });

      const responseText = response.text?.trim();
      if (responseText) {
        const parsed = JSON.parse(responseText);
        if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
          return parsed.steps;
        }
      }
    }
  } catch (err) {
    console.warn('Network/API issue generating starter steps, using heuristic steps:', err);
  }

  // Graceful ADHD initiation heuristic fallback
  if (isFa) {
    return [
      `باز کردن پنجره یا فضای کاری برای «${taskTitle.slice(0, 24)}»`,
      'نوشتن فقط ۱ جمله یا پیش‌نویس اولیه بسیار ساده',
      'کار کردن به مدت ۲ دقیقه آرام بدون قضاوت در مورد کیفیت'
    ];
  }

  return [
    `Open window or workspace for "${taskTitle.slice(0, 24)}"`,
    'Write down just 1 messy first bullet or sentence',
    'Work for 2 low-pressure minutes without judging quality'
  ];
}

// Generate a low-barrier 10-second "unstick" fallback micro-action for a habit using AI
export async function generateTenSecondHabitFallback(
  habitTitle: string,
  energyCost: EnergyLevel = 'low',
  prefs: UserPreferences
): Promise<string> {
  const isFa = prefs.language === 'fa';
  const provider: AiProvider = prefs.aiProvider || 'gemini';

  const systemInstruction = `You are an ADHD executive function initiation coach.
Your job is to generate a single ultra-low-barrier, 10-second "unstick" micro-action for the user's habit to overcome initial friction and task paralysis.
Rules:
1. The micro-action MUST take 10 seconds or less (e.g. "Take 1 small sip of water", "Put on running shoes and touch the door handle", "Open book to page 1 without reading", "Sit on yoga mat for 3 deep breaths").
2. Tone: Warm, forgiving, zero judgment. Emphasize that doing just this 10-second action counts as a 100% complete victory.
3. Length: Keep it under 20 words maximum. Single sentence. No markdown code blocks.
${isFa ? '4. Return ONLY in natural, encouraging Persian (Farsi / فارسی).' : '4. Return in concise English.'}`;

  const prompt = `Habit: "${habitTitle}". Energy cost: ${energyCost}. Generate the 10-second fallback action.`;

  try {
    if (provider === 'custom') {
      const baseUrl =
        prefs.customOpenAiBaseUrl?.trim() ||
        (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_BASE_URL : '') ||
        DEFAULT_CUSTOM_OPENAI_BASE_URL;
      const customKey =
        prefs.customOpenAiApiKey?.trim() ||
        (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_API_KEY : '') ||
        '';
      const customModel =
        prefs.customOpenAiModel?.trim() ||
        (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_MODEL : '') ||
        DEFAULT_CUSTOM_OPENAI_MODEL;
      const apiVersion =
        prefs.customOpenAiApiVersion?.trim() ||
        (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_OPENAI_COMPATIBLE_API_VERSION : '') ||
        '';

      const responseText = await callOpenAiCompatible({
        baseUrl,
        apiKey: customKey,
        model: customModel,
        apiVersion,
        systemInstruction,
        userPrompt: prompt,
        expectJson: false,
      });

      const cleaned = responseText.replace(/^["'`]+|["'`]+$/g, '').trim();
      if (cleaned) return cleaned;
    } else if (provider === 'openrouter') {
      const orKey = prefs.openRouterApiKey?.trim() || '';
      if (!orKey) {
        throw new Error('No OpenRouter API key configured');
      }

      const responseText = await callOpenRouter({
        apiKey: orKey,
        model: prefs.openRouterModel?.trim() || DEFAULT_OPENROUTER_MODEL,
        systemInstruction,
        userPrompt: prompt,
        expectJson: false,
      });

      const cleaned = responseText.replace(/^["'`]+|["'`]+$/g, '').trim();
      if (cleaned) return cleaned;
    } else {
      const geminiKey = prefs.geminiApiKey?.trim() || '';
      if (!geminiKey) {
        throw new Error('No Gemini API key configured');
      }

      const activeGeminiModel = prefs.geminiModel?.trim() || DEFAULT_GEMINI_MODEL;
      const client = new GoogleGenAI({ apiKey: geminiKey });

      const response = await client.models.generateContent({
        model: activeGeminiModel,
        contents: `${systemInstruction}\n\n${prompt}`,
      });

      const responseText = response.text?.replace(/^["'`]+|["'`]+$/g, '').trim();
      if (responseText) return responseText;
    }
  } catch (err) {
    console.warn('Network/API issue generating 10s fallback, using heuristic fallback:', err);
  }

  // Empathetic heuristic fallback if offline or no key configured
  if (isFa) {
    return `فقط ۱۰ ثانیه برای «${habitTitle.slice(0, 24)}» وقت بگذار یا به وسایل آن دست بزن؛ همین مقدار یک پیروزی کامل است.`;
  }
  return `Just spend 10 seconds with "${habitTitle.slice(0, 24)}" or touch the equipment. Stopping immediately is 100% fine.`;
}

/**
 * Constructs a self-contained, high-quality prompt for external chatbots (ChatGPT, Claude, Gemini, DeepSeek, etc.)
 * allowing users to plan their day without needing an API key.
 */
export function buildChatbotPlanningPrompt(params: GenerateScheduleParams, lang: 'en' | 'fa' = 'en'): string {
  const {
    targetDate,
    entries,
    habits,
    prefs,
    chronotype = prefs.chronotype || 'balanced',
    pace = derivePaceFromSensoryState(prefs.sensoryState, prefs.currentEnergy),
    schedulingConstraint = 'all_priority',
    customInstructions,
    dayStartTime = '09:00',
    dayEndTime = '18:00',
    includeBacklog = true,
  } = params;

  const targetDayEntries = entries.filter((e) => e.date === targetDate && e.status !== 'cancelled');
  const backlogEntries = includeBacklog
    ? entries.filter(
        (e) =>
          e.date < targetDate &&
          e.status === 'open' &&
          (e.isPriority || e.energyCost === 'high' || e.type === 'task')
      ).slice(0, 5)
    : [];
  const combinedEntries = [...targetDayEntries, ...backlogEntries];
  const activeHabits = habits.filter((h) => !h.isArchived && isHabitActiveOnDate(h, targetDate));

  const currentEnergy = prefs.currentEnergy || 'medium';
  const sensoryState = prefs.sensoryState || 'balanced';
  const dayDisplay = formatDateDisplay(targetDate, { showDayOfWeek: true, includeYear: true, lang });

  const constraintText = schedulingConstraint === 'all_priority'
    ? (lang === 'fa' ? 'تمام کارهای با اولویت بالا و ستاره‌دار باید حتما در این بازه گنجانده شوند.' : 'All high priority / starred tasks MUST be scheduled within this time window.')
    : schedulingConstraint === 'all_tasks'
    ? (lang === 'fa' ? 'تمام تسک‌ها باید در این بازه قرار بگیرند (در صورت نیاز زمان‌ها فشرده شوند).' : 'All provided tasks must be scheduled within this window (compress blocks if needed).')
    : (lang === 'fa' ? 'برنامه‌ریزی متعادل بر اساس ظرفیت انرژی بدون تحمیل فشار شناختی.' : 'Balanced capacity: schedule comfortably according to energy levels without cognitive overload.');

  const tasksList = combinedEntries.length > 0
    ? combinedEntries.map((e, i) => {
        const timeNote = e.time ? ` [Fixed time: ${e.time}]` : '';
        const prioNote = e.isPriority ? ' [PRIORITY]' : '';
        const dur = e.durationMinutes || (e.energyCost === 'high' ? 45 : e.energyCost === 'medium' ? 25 : 15);
        return `${i + 1}. ${e.content}${prioNote}${timeNote} (Est: ${dur}m, Energy: ${e.energyCost || 'medium'}, Category: ${e.category || 'General'})`;
      }).join('\n')
    : (lang === 'fa' ? 'هیچ تسک خاصی تعریف نشده است (یک ریتم متعادل کاری/یادگیری عمومی بچین).' : 'No specific tasks provided (design a balanced work/focus and restoration template).');

  const habitsList = activeHabits.length > 0
    ? activeHabits.map((h, i) => {
        const timeNote = h.time ? ` [Fixed time: ${h.time}]` : ` [Bucket: ${h.timeBucket}]`;
        const dur = h.durationMinutes || (h.energyCost === 'high' ? 20 : h.energyCost === 'medium' ? 10 : 5);
        return `${i + 1}. ${h.title}${timeNote} (${dur}m, Energy: ${h.energyCost || 'low'})`;
      }).join('\n')
    : (lang === 'fa' ? 'عادت روزانه خاصی وجود ندارد.' : 'No active recurring habits.');

  if (lang === 'fa') {
    return `شما نقش «برنامه‌ریز هوشمند مدیریت انرژی و کارکردهای اجرایی لرنی (Lerni)» را دارید که برای افراد با ADHD یا خستگی تصمیم‌گیری طراحی شده است.

لطفاً بر اساس مشخصات و کارهای من، یک برنامه زمان‌بندی روزانه واقع‌بینانه، متناسب با ریتم انرژی و کم‌اصطکاک برای تاریخ ${dayDisplay} [${targetDate}] تنظیم کنید.

=== مشخصات فردی و ریتم روز ===
• بازه زمانی مجاز: از ساعت ${dayStartTime} تا ${dayEndTime}
• سطح انرژی کنونی من: ${currentEnergy === 'high' ? 'زیاد (💪)' : currentEnergy === 'low' ? 'کم (🤏)' : 'متوسط (🤌)'}
• وضعیت ذهنی و حسی: ${sensoryState}
• کرونوتایپ (ساعت زیستی): ${chronotype}
• ریتم گام‌برداری روز: ${pace}
• هدف و محدودیت برنامه‌ریزی: ${constraintText}
${customInstructions?.trim() ? `• دستورالعمل‌های خاص و شخصی من: "${customInstructions.trim()}"` : ''}

=== لیست تسک‌ها و یادداشت‌های امروز ===
${tasksList}

=== عادت‌های روزانه ===
${habitsList}

=== اصول حیاتی برنامه‌ریزی عصبی-شناختی (ADHD-Friendly) ===
1. تطابق انرژی: کارهای با بار شناختی سنگین را در زمان‌های اوج انرژی قرار دهید. هرگز دو کار سنگین را پشت سر هم بدون وقفه نگذارید.
2. گام‌های شروع ۲ دقیقه‌ای: برای هر بلوک کاری، ۲ تا ۳ گام فوق‌العاده کوچک و عینی برای شکستن مقاومت شروع کار (task initiation paralysis) ارائه دهید.
3. وقت‌های تنفس و استراحت حسی: بین جلسات تمرکز، وقت استراحت، نوشیدن آب و ریکاوری قرار دهید.
4. تثبیت ساعت‌های مشخص: تسک‌ها یا عادت‌هایی که ساعت مشخص دارند (Fixed time) را در ساعت دقیق خود قفل کنید و بقیه را حول آن بچینید.

=== قالب پاسخ مورد انتظار ===
لطفاً پاسخ را در دو بخش ارائه دهید:
بخش ۱: جدول زمانی واضح، خوش‌بینانه و زیبا به زبان فارسی برای خواندن فوری من.
بخش ۲: یک بلوک JSON معتبر دقیقاً با ساختار زیر درون یک کدبلاک \`\`\`json تا بتوانم آن را در نرم‌افزارم کپی و جای‌گذاری (Import) کنم:

\`\`\`json
{
  "summary": "۱ الی ۲ جمله جمع‌بندی استراتژی امروز",
  "predictedEnergyRhythm": {
    "morning": "low | medium | high",
    "afternoon": "low | medium | high",
    "evening": "low | medium | high",
    "rhythmNote": "توضیح منحنی انرژی روز"
  },
  "scheduleBlocks": [
    {
      "id": "block-1",
      "startTime": "09:00",
      "endTime": "09:45",
      "title": "عنوان تسک یا استراحت",
      "type": "task | event | break | habit | micro_reset",
      "energyDemand": "low | medium | high",
      "durationMinutes": 45,
      "executiveRationale": "علت انتخاب این زمان",
      "microStarterSteps": ["گام اول شروع", "گام دوم شروع"],
      "isBreak": false
    }
  ],
  "pacingAdvice": ["نکته ۱", "نکته ۲", "نکته ۳"],
  "totalFocusMinutes": 180,
  "totalBreakMinutes": 45
}
\`\`\``;
  }

  // English version:
  return `You are Lerni's Intelligent Executive Function & Energy-Aware Schedule Planner, specialized in neurodivergent (ADHD, brain fog, sensory burnout) friendly day architecture.

Please build a realistic, empowering, and low-friction time-blocked schedule for ${dayDisplay} [${targetDate}] between ${dayStartTime} and ${dayEndTime}.

=== USER PROFILE & ENERGY STATE ===
• Time Window: ${dayStartTime} to ${dayEndTime}
• Current Battery / Energy: ${currentEnergy.toUpperCase()} (${currentEnergy === 'high' ? 'High 💪' : currentEnergy === 'low' ? 'Low 🤏' : 'Medium 🤌'})
• Sensory / Cognitive State: ${sensoryState}
• Chronotype: ${chronotype}
• Pacing Style: ${pace}
• Scheduling Mandate: ${constraintText}
${customInstructions?.trim() ? `• Custom User Instructions: "${customInstructions.trim()}"` : ''}

=== TASKS TO SCHEDULE (BULLET JOURNAL) ===
${tasksList}

=== RECURRING HABITS ===
${habitsList}

=== CRITICAL SCHEDULING PRINCIPLES ===
1. ENERGY MATCHING: Match demanding / high-cognitive load tasks with peak energy periods. Never place two high-demand tasks back-to-back without a restorative buffer.
2. 2-MINUTE MICRO STARTER STEPS: For every task block, provide 2-3 tiny, concrete starter steps (<2 min each) to defeat task initiation paralysis.
3. RESTORATIVE BUFFERS: Include somatic resets, hydration breaks, and transitions.
4. RESPECT ANCHORED TIMES: Keep fixed-time tasks or habits anchored at their designated times.

=== REQUIRED OUTPUT FORMAT ===
Please provide your response in two sections:
Section 1: A warm, clear, human-readable timeline schedule that I can read right here.
Section 2: A strictly valid JSON object inside a \`\`\`json code block matching the following schema, so I can copy and import it back into my Lerni planner:

\`\`\`json
{
  "summary": "1-2 sentence encouraging overview of today's strategy",
  "predictedEnergyRhythm": {
    "morning": "low | medium | high",
    "afternoon": "low | medium | high",
    "evening": "low | medium | high",
    "rhythmNote": "Brief explanation of the predicted curve"
  },
  "scheduleBlocks": [
    {
      "id": "block-1",
      "startTime": "09:00",
      "endTime": "09:45",
      "title": "Clear task or activity title",
      "type": "task | event | break | habit | micro_reset",
      "energyDemand": "low | medium | high",
      "durationMinutes": 45,
      "executiveRationale": "Encouraging explanation for why it is scheduled here",
      "microStarterSteps": ["Tiny step 1 (<2m)", "Tiny step 2 (<2m)"],
      "isBreak": false
    }
  ],
  "pacingAdvice": ["Tip 1", "Tip 2", "Tip 3"],
  "totalFocusMinutes": 180,
  "totalBreakMinutes": 45
}
\`\`\``;
}

/**
 * Safely parses and normalizes a DayPlan from raw text or JSON returned by any external chatbot (ChatGPT, Claude, Gemini, etc.)
 */
export function parseScheduleFromAiResponse(rawInput: string, fallbackDate: string): DayPlan {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('No content provided to import.');
  }

  let text = rawInput.trim();

  // 1. Try to find json block in markdown code fence: ```json ... ``` or ``` ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    text = codeBlockMatch[1].trim();
  } else {
    // 2. Look for outer curly braces
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err: any) {
    throw new Error('Could not find a valid JSON schedule block in the pasted text. Please make sure the code block from the chatbot is included.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Parsed content is not a valid schedule object.');
  }

  // Normalize scheduleBlocks
  const rawBlocks = Array.isArray(parsed.scheduleBlocks) ? parsed.scheduleBlocks : [];
  if (rawBlocks.length === 0) {
    throw new Error('No schedule blocks found in the imported data.');
  }

  const scheduleBlocks: ScheduleBlock[] = rawBlocks.map((b: any, idx: number) => {
    const isBreak = Boolean(b.isBreak || b.type === 'break' || b.type === 'micro_reset');
    const duration = Math.max(5, Number(b.durationMinutes) || 25);
    const microSteps = Array.isArray(b.microStarterSteps) 
      ? b.microStarterSteps.map(String).filter(Boolean)
      : [];

    return {
      id: String(b.id || `imported-block-${Date.now()}-${idx + 1}`),
      startTime: String(b.startTime || '09:00'),
      endTime: String(b.endTime || '09:30'),
      title: String(b.title || `Task ${idx + 1}`),
      type: (['task', 'event', 'break', 'habit', 'micro_reset'].includes(b.type) ? b.type : (isBreak ? 'break' : 'task')),
      energyDemand: (['low', 'medium', 'high'].includes(b.energyDemand) ? b.energyDemand : 'medium') as EnergyLevel,
      durationMinutes: duration,
      bujoEntryId: b.bujoEntryId ? String(b.bujoEntryId) : undefined,
      executiveRationale: String(b.executiveRationale || ''),
      microStarterSteps: microSteps,
      isBreak,
      completed: Boolean(b.completed),
    };
  });

  const calculatedFocus = scheduleBlocks.filter(b => !b.isBreak).reduce((acc, b) => acc + b.durationMinutes, 0);
  const calculatedBreak = scheduleBlocks.filter(b => b.isBreak).reduce((acc, b) => acc + b.durationMinutes, 0);

  const plan: DayPlan = {
    date: parsed.date || fallbackDate,
    summary: String(parsed.summary || 'Custom AI Chatbot Schedule'),
    predictedEnergyRhythm: {
      morning: (['low', 'medium', 'high'].includes(parsed.predictedEnergyRhythm?.morning) ? parsed.predictedEnergyRhythm.morning : 'medium') as EnergyLevel,
      afternoon: (['low', 'medium', 'high'].includes(parsed.predictedEnergyRhythm?.afternoon) ? parsed.predictedEnergyRhythm.afternoon : 'medium') as EnergyLevel,
      evening: (['low', 'medium', 'high'].includes(parsed.predictedEnergyRhythm?.evening) ? parsed.predictedEnergyRhythm.evening : 'low') as EnergyLevel,
      rhythmNote: String(parsed.predictedEnergyRhythm?.rhythmNote || 'Energy curve aligned with your personal rhythms.'),
    },
    scheduleBlocks,
    pacingAdvice: Array.isArray(parsed.pacingAdvice) && parsed.pacingAdvice.length > 0 
      ? parsed.pacingAdvice.map(String)
      : ['Take micro-breaks between high focus tasks.', 'Keep hydration close by.', 'Celebrate finishing each block.'],
    totalFocusMinutes: Number(parsed.totalFocusMinutes) || calculatedFocus,
    totalBreakMinutes: Number(parsed.totalBreakMinutes) || calculatedBreak,
    createdAt: Date.now(),
  };

  return plan;
}



