import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Gemini API config info
  app.get("/api/gemini/config", (_req, res) => {
    res.json({
      hasServerKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== ""),
    });
  });

  // Gemini API key test and verification endpoint
  app.post("/api/gemini/test-key", async (req, res) => {
    try {
      const { apiKey } = req.body;
      const keyToUse = (apiKey && typeof apiKey === "string" && apiKey.trim() !== "")
        ? apiKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!keyToUse) {
        return res.status(400).json({
          valid: false,
          message: "No API key provided, and no shared server key is configured in the environment.",
        });
      }

      const client = new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      const response = await client.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: "Respond with only 'OK'.",
      });

      const reply = response.text?.trim() || "OK";
      return res.json({
        valid: true,
        message: "Gemini API connected successfully!",
        model: "gemini-3.1-flash-lite",
        sampleResponse: reply,
      });
    } catch (err: any) {
      console.error("Gemini API key validation error:", err?.message || err);
      const isQuotaError = /quota|rate limit|429|resource exhausted/i.test(err?.message || "");
      const isAuthError = /api key not valid|invalid api key|unauthenticated|401|403/i.test(err?.message || "");

      let userFriendlyMsg = err?.message || "Failed to communicate with Gemini API.";
      if (isAuthError) {
        userFriendlyMsg = "Invalid API Key. Please verify the key from Google AI Studio.";
      } else if (isQuotaError) {
        userFriendlyMsg = "Quota or rate limit reached. The shared free key may be depleted by other users.";
      }

      return res.status(400).json({
        valid: false,
        message: userFriendlyMsg,
      });
    }
  });

  // AI Schedule Optimizer Endpoint
  app.post("/api/gemini/optimize-schedule", async (req, res) => {
    try {
      const {
        apiKey,
        targetDate,
        dayOfWeek,
        currentEnergy, // 'low' | 'medium' | 'high'
        sensoryState, // 'balanced' | 'overwhelmed' | 'brain_fog' | 'hyperfocus' | 'low_energy'
        chronotype = 'balanced', // 'morning' | 'afternoon' | 'evening' | 'balanced'
        pace = 'balanced', // 'gentle' | 'balanced' | 'intensive'
        schedulingConstraint = 'all_priority', // 'all_priority' | 'all_tasks' | 'balanced'
        customInstructions,
        bujoEntries = [],
        habits = [],
        focusStats,
        dayStartTime = '09:00',
        dayEndTime = '18:00',
      } = req.body;

      const keyToUse = (apiKey && typeof apiKey === "string" && apiKey.trim() !== "")
        ? apiKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!keyToUse) {
        return res.status(400).json({
          error: "NO_API_KEY",
          message: "No Gemini API key available. Please enter your free API key in Settings.",
        });
      }

      const client = new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const constraintNote = schedulingConstraint === 'all_priority'
        ? "PRIORITY MANDATE: Every task marked as 'isPriority: true' MUST be scheduled within the day range without exception."
        : schedulingConstraint === 'all_tasks'
        ? "FULL COMPLETION MANDATE: ALL provided open tasks must be scheduled within the day range (compress durations slightly or streamline transitions to fit them all)."
        : "BALANCED CAPACITY: Schedule tasks comfortably according to current energy capacity, prioritizing key items without overload.";

      const customInstructionNote = customInstructions && typeof customInstructions === 'string' && customInstructions.trim()
        ? `\n8. USER'S CUSTOM SCHEDULING INSTRUCTIONS: "${customInstructions.trim()}". (Strictly adhere to and incorporate these specific guidelines).`
        : "";

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
        journalEntries: bujoEntries.map((e: any) => ({
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
        habits: habits.map((h: any) => ({
          id: h.id,
          title: h.title,
          timeBucket: h.timeBucket,
          energyCost: h.energyCost,
          time: h.time,
          durationMinutes: h.durationMinutes || (h.energyCost === 'high' ? 20 : h.energyCost === 'medium' ? 10 : 5),
          unstickTip: h.unstickTip,
        })),
        recentFocusStats: focusStats,
      };

      const response = await client.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `Analyze these tasks and energy patterns to construct the optimal daily schedule:\n${JSON.stringify(promptPayload, null, 2)}`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
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
                  rhythmNote: { type: Type.STRING, description: "1 sentence explaining the predicted energy curve." },
                },
                required: ["morning", "afternoon", "evening", "rhythmNote"],
              },
              scheduleBlocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Unique block id, e.g. block-1" },
                    startTime: { type: Type.STRING, description: "HH:mm 24hr format, e.g. 09:00" },
                    endTime: { type: Type.STRING, description: "HH:mm 24hr format, e.g. 09:30" },
                    title: { type: Type.STRING, description: "Clear descriptive task or activity title" },
                    type: { type: Type.STRING, description: "'task', 'event', 'break', 'habit', or 'micro_reset'" },
                    energyDemand: { type: Type.STRING, description: "'low', 'medium', or 'high'" },
                    durationMinutes: { type: Type.INTEGER, description: "Duration in minutes" },
                    bujoEntryId: { type: Type.STRING, description: "Matched BujoEntry id if mapped, or empty string" },
                    executiveRationale: { type: Type.STRING, description: "Encouraging, ADHD-friendly reason for this placement" },
                    isBreak: { type: Type.BOOLEAN, description: "True if rest/recharge block" },
                  },
                  required: ["id", "startTime", "endTime", "title", "type", "energyDemand", "durationMinutes", "executiveRationale"],
                },
              },
              pacingAdvice: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 concise, actionable executive-function tips tailored to their current state",
              },
              totalFocusMinutes: { type: Type.INTEGER, description: "Sum of productive work minutes" },
              totalBreakMinutes: { type: Type.INTEGER, description: "Sum of scheduled rest minutes" },
            },
            required: ["summary", "predictedEnergyRhythm", "scheduleBlocks", "pacingAdvice", "totalFocusMinutes", "totalBreakMinutes"],
          },
        },
      });

      const responseText = response.text?.trim();
      if (!responseText) {
        throw new Error("Empty response received from Gemini model.");
      }

      const scheduleData = JSON.parse(responseText);
      return res.json({
        success: true,
        data: scheduleData,
      });

    } catch (err: any) {
      console.error("Schedule optimization error:", err?.message || err);
      const isQuotaError = /quota|rate limit|429|resource exhausted/i.test(err?.message || "");
      const isAuthError = /api key not valid|invalid api key|unauthenticated|401|403/i.test(err?.message || "");

      let errorType = "GENERATION_ERROR";
      let userFriendlyMsg = err?.message || "Failed to generate schedule.";
      if (isAuthError) {
        errorType = "AUTH_ERROR";
        userFriendlyMsg = "Invalid API Key. Please verify or update your key in Settings.";
      } else if (isQuotaError) {
        errorType = "QUOTA_EXHAUSTED";
        userFriendlyMsg = "Daily Gemini quota reached on the shared key. Enter your personal free key in Settings for unlimited runs.";
      }

      return res.status(400).json({
        error: errorType,
        message: userFriendlyMsg,
      });
    }
  });

  // Generate 2-minute starter steps for a specific block on-demand
  app.post("/api/gemini/generate-starter-steps", async (req, res) => {
    try {
      const { apiKey, taskTitle, energyDemand = "medium", sensoryState = "balanced", language = "en" } = req.body;

      const keyToUse = (apiKey && typeof apiKey === "string" && apiKey.trim() !== "")
        ? apiKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!keyToUse) {
        return res.status(400).json({
          error: "NO_API_KEY",
          message: "No Gemini API key available. Please enter your free API key in Settings.",
        });
      }

      const client = new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const isFa = language === 'fa';
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

      const response = await client.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 3 low-barrier 2-minute initiation subtasks",
              },
            },
            required: ["steps"],
          },
        },
      });

      const responseText = response.text?.trim();
      if (!responseText) {
        throw new Error("Empty response received from Gemini model.");
      }

      const parsed = JSON.parse(responseText);
      return res.json({
        success: true,
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      });
    } catch (err: any) {
      console.error("Starter steps generation error:", err?.message || err);
      return res.status(400).json({
        error: "GENERATION_ERROR",
        message: err?.message || "Failed to generate starter steps.",
      });
    }
  });

  // Vite middleware for development vs static dist in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lerni PWA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

