import { BujoEntry, Habit, EntryReminder, UserPreferences, Language, isHabitActiveOnDate, ReminderIntensity } from '../types';
import { getTodayDateString } from './storage';
import { soundEngine } from './audioSynth';
import { toPersianDigits } from './i18n';

export interface ActiveReminderAlert {
  id: string; // Unique fired key
  reminderId: string;
  entryId: string;
  entryType: 'task' | 'event' | 'habit';
  title: string;
  content: string;
  time?: string;
  reminderLabel: string;
  offsetMinutes: number;
  triggeredAt: number;
  intensity?: ReminderIntensity;
}

export interface UpcomingReminderItem {
  id: string;
  reminderId: string;
  entryId: string;
  entryType: 'task' | 'event' | 'habit';
  title: string;
  entryTime?: string;
  reminderTime: string; // HH:mm
  reminderDateTime: Date;
  offsetMinutes: number;
  label: string;
  isPast: boolean;
  intensity?: ReminderIntensity;
}

export const REMINDER_PRESETS: { offsetMinutes: number; labelEn: string; labelFa: string }[] = [
  { offsetMinutes: 0, labelEn: 'At the time', labelFa: 'در زمان شروع' },
  { offsetMinutes: 5, labelEn: '5 mins before', labelFa: '۵ دقیقه قبل' },
  { offsetMinutes: 10, labelEn: '10 mins before', labelFa: '۱۰ دقیقه قبل' },
  { offsetMinutes: 15, labelEn: '15 mins before', labelFa: '۱۵ دقیقه قبل' },
  { offsetMinutes: 30, labelEn: '30 mins before', labelFa: '۳۰ دقیقه قبل' },
  { offsetMinutes: 60, labelEn: '1 hour before', labelFa: '۱ ساعت قبل' },
  { offsetMinutes: 120, labelEn: '2 hours before', labelFa: '۲ ساعت قبل' },
  { offsetMinutes: 1440, labelEn: '1 day before', labelFa: '۱ روز قبل' },
];

/**
 * Human-readable label for a given reminder offset in English or Persian
 */
export function formatReminderOffset(offsetMinutes: number, lang: Language = 'en'): string {
  const isFa = lang === 'fa';
  const found = REMINDER_PRESETS.find((p) => p.offsetMinutes === offsetMinutes);
  if (found) {
    return isFa ? found.labelFa : found.labelEn;
  }
  if (offsetMinutes === 0) {
    return isFa ? 'در زمان شروع' : 'At the time';
  }
  if (offsetMinutes < 60) {
    return isFa ? `${toPersianDigits(offsetMinutes)} دقیقه قبل` : `${offsetMinutes} mins before`;
  }
  if (offsetMinutes % 60 === 0 && offsetMinutes < 1440) {
    const hours = offsetMinutes / 60;
    return isFa ? `${toPersianDigits(hours)} ساعت قبل` : `${hours} hr${hours > 1 ? 's' : ''} before`;
  }
  const days = Math.round(offsetMinutes / 1440);
  return isFa ? `${toPersianDigits(days)} روز قبل` : `${days} day${days > 1 ? 's' : ''} before`;
}

/**
 * Checks whether Web Notifications API is supported in this browser
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Returns current permission status ('granted' | 'denied' | 'default' | 'unsupported')
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

/**
 * Dispatches a native browser system notification with intensity awareness
 */
export async function dispatchBrowserNotification(
  title: string,
  body: string,
  tag?: string,
  intensity: ReminderIntensity = 'normal',
  dataPayload?: any
): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const isStrong = intensity === 'strong';
  const notificationTag = tag || `lerni-${Date.now()}`;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: notificationTag,
          renotify: true,
          requireInteraction: isStrong,
          vibrate: isStrong ? [400, 150, 400, 150, 400] : [250, 100, 250],
          data: { url: '/', intensity, ...dataPayload },
          actions: [
            { action: 'dismiss', title: 'Dismiss' },
            { action: 'snooze', title: 'Snooze 5m' },
          ],
        } as any);
        return true;
      }
    }

    new Notification(title, {
      body,
      icon: '/icon.svg',
      tag: notificationTag,
      renotify: true,
      requireInteraction: isStrong,
    } as any);
    return true;
  } catch (e) {
    console.warn('Could not dispatch browser notification:', e);
    return false;
  }
}

/**
 * Send a sample/test notification to verify system sounds and display
 */
export async function sendTestReminderNotification(
  lang: Language = 'en',
  intensity: ReminderIntensity = 'normal'
): Promise<boolean> {
  const isFa = lang === 'fa';
  const isStrong = intensity === 'strong';

  if (isStrong) {
    soundEngine.startStrongAlarmLoop('lerni-test-strong');
    const title = isFa ? '🚨 لرنی — یادآور آزمایشی شدید (Strong)' : '🚨 Lerni — Test Strong Reminder';
    const body = isFa
      ? 'یادآور شدید لرنی: تکرار اعلان هر ۳ ثانیه تا زمان باز شدن برنامه و رد یا تعویق!'
      : 'Lerni Strong Reminder: Repeated alert every 3s until opened and dismissed/snoozed!';
    startStrongReminderInSW('lerni-test-strong', title, body, { isTest: true, isFa });
    return dispatchBrowserNotification(title, body, 'lerni-test-strong', 'strong', { isTest: true, isFa });
  }

  soundEngine.playGentleChime();
  const title = isFa ? '🔔 لرنی — یادآور آزمایشی معمولی' : '🔔 Lerni — Test Normal Reminder';
  const body = isFa
    ? 'سیستم یادآورها و اعلان‌های لرنی به درستی فعال است!'
    : 'Lerni reminders & notifications are active and ready!';
  return dispatchBrowserNotification(title, body, 'lerni-test-normal', 'normal', { isTest: true, isFa });
}

// -------------------------------------------------------------
// Closed-App & Offline IndexedDB Synchronization
// -------------------------------------------------------------
const DB_NAME = 'lerni_reminders_db';
const DB_VERSION = 1;
const STORE_NAME = 'scheduled_reminders';

function openRemindersDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

/**
 * Synchronizes all upcoming reminders to IndexedDB and the Service Worker
 * so alarms trigger accurately even when the application tab is closed.
 */
export async function syncRemindersWithServiceWorker(
  bujoEntries: BujoEntry[],
  habits: Habit[],
  prefs: UserPreferences
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const scheduledItems: any[] = [];
    const now = new Date();
    const nowMs = now.getTime();
    const lang = prefs.language || 'en';
    const isFa = lang === 'fa';

    // Build next 7 days date strings
    const dateStrings: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dateStrings.push(`${y}-${m}-${day}`);
    }

    for (const dateStr of dateStrings) {
      // 1. Tasks & Events
      for (const entry of bujoEntries) {
        if (entry.date !== dateStr) continue;
        if (entry.status !== 'open') continue;
        if (entry.type !== 'task' && entry.type !== 'event') continue;
        if (!entry.reminders || entry.reminders.length === 0) continue;

        for (const rem of entry.reminders) {
          if (rem.enabled === false) continue;
          const triggerDate = calculateReminderTriggerTime(entry.date, entry.time, rem, '09:00');
          if (!triggerDate) continue;

          const triggerMs = triggerDate.getTime();
          if (triggerMs > nowMs - 60000) {
            scheduledItems.push({
              id: `bujo-${entry.id}-${rem.id}-${entry.date}`,
              reminderId: rem.id,
              entryId: entry.id,
              entryType: entry.type,
              title: entry.content,
              time: entry.time,
              label: formatReminderOffset(rem.offsetMinutes, lang),
              triggerTimeMs: triggerMs,
              intensity: rem.intensity || 'normal',
              isFa,
            });
          }
        }
      }

      // 2. Habits
      for (const habit of habits) {
        if (habit.isArchived) continue;
        if (!habit.reminders || habit.reminders.length === 0) continue;
        if (!isHabitActiveOnDate(habit, dateStr)) continue;

        const defaultHabitTime =
          habit.timeBucket === 'morning'
            ? '08:00'
            : habit.timeBucket === 'midday'
            ? '12:30'
            : habit.timeBucket === 'evening'
            ? '20:30'
            : '09:00';

        for (const rem of habit.reminders) {
          if (rem.enabled === false) continue;
          const triggerDate = calculateReminderTriggerTime(dateStr, habit.time, rem, defaultHabitTime);
          if (!triggerDate) continue;

          const triggerMs = triggerDate.getTime();
          if (triggerMs > nowMs - 60000) {
            scheduledItems.push({
              id: `habit-${habit.id}-${rem.id}-${dateStr}`,
              reminderId: rem.id,
              entryId: habit.id,
              entryType: 'habit',
              title: habit.title,
              time: habit.time || defaultHabitTime,
              label: formatReminderOffset(rem.offsetMinutes, lang),
              triggerTimeMs: triggerMs,
              intensity: rem.intensity || 'normal',
              isFa,
            });
          }
        }
      }
    }

    // Write to IndexedDB for persistent background access by Service Worker
    const db = await openRemindersDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const item of scheduledItems) {
        store.put(item);
      }
    }

    // Post to Service Worker
    if ('serviceWorker' in navigator) {
      const controller = navigator.serviceWorker.controller;
      if (controller) {
        controller.postMessage({
          type: 'SYNC_SCHEDULED_REMINDERS',
          reminders: scheduledItems,
        });
      } else {
        navigator.serviceWorker.ready.then((reg) => {
          reg.active?.postMessage({
            type: 'SYNC_SCHEDULED_REMINDERS',
            reminders: scheduledItems,
          });
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('Failed to sync reminders to service worker:', e);
  }
}

export function startStrongReminderInSW(
  alertId: string,
  title: string,
  body: string,
  data?: any
): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const payload = {
      type: 'START_STRONG_REMINDER',
      id: alertId,
      title,
      body,
      data: { id: alertId, intensity: 'strong', ...data },
    };
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(payload);
    } else {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.active?.postMessage(payload);
        })
        .catch(() => {});
    }
  } catch {}
}

export function stopStrongReminderInSW(alertId: string): void {
  // Always stop client audio loop as well
  soundEngine.stopStrongAlarmLoop(alertId);
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.controller?.postMessage({
      type: 'STOP_STRONG_REMINDER',
      id: alertId,
    });
  } catch {}
}

export function notifyServiceWorkerUserEntered(): void {
  // Silence all active client strong alarms
  soundEngine.stopAllStrongAlarms();
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.controller?.postMessage({
      type: 'CLIENT_ENTERED_APP',
    });
  } catch {}
}

// -------------------------------------------------------------
// Unthrottled Web Worker Background Heartbeat
// Bypasses browser timer throttling when tab is hidden or backgrounded
// -------------------------------------------------------------
let backgroundHeartbeatWorker: Worker | null = null;
let heartbeatTickCallback: (() => void) | null = null;

export function initBackgroundHeartbeat(onTick: () => void): () => void {
  heartbeatTickCallback = onTick;

  if (typeof window === 'undefined') return () => {};

  if (!backgroundHeartbeatWorker) {
    try {
      const code = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(function() {
              self.postMessage('tick');
            }, 1000);
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
      `;
      const blob = new Blob([code], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      backgroundHeartbeatWorker = new Worker(workerUrl);
      backgroundHeartbeatWorker.onmessage = () => {
        if (heartbeatTickCallback) {
          heartbeatTickCallback();
        }
      };
      backgroundHeartbeatWorker.postMessage('start');
    } catch (e) {
      console.warn('Background heartbeat Web Worker not available, fallback to standard timer:', e);
    }
  }

  return () => {
    heartbeatTickCallback = null;
    if (backgroundHeartbeatWorker) {
      try {
        backgroundHeartbeatWorker.postMessage('stop');
        backgroundHeartbeatWorker.terminate();
      } catch {}
      backgroundHeartbeatWorker = null;
    }
  };
}

const FIRED_STORAGE_KEY = 'lerni_fired_reminders_v2';

/**
 * Retrieves the set of already-fired reminder keys from localStorage
 */
function getFiredReminderKeys(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(FIRED_STORAGE_KEY);
    if (!data) return {};
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * Marks a reminder key as fired and cleans up keys older than 7 days
 */
export function markReminderFired(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const fired = getFiredReminderKeys();
    const now = Date.now();
    fired[key] = now;

    // Prune keys older than 7 days (7 * 86400000 ms)
    const sevenDaysAgo = now - 7 * 86400000;
    const cleaned: Record<string, number> = {};
    for (const [k, timestamp] of Object.entries(fired)) {
      if (timestamp > sevenDaysAgo) {
        cleaned[k] = timestamp;
      }
    }
    localStorage.setItem(FIRED_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (e) {
    console.error('Failed to mark reminder fired:', e);
  }
}

/**
 * Converts date string (YYYY-MM-DD) and time string (HH:mm) to a Date object in local time
 */
export function parseDateTime(dateStr: string, timeStr: string): Date | null {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const [hourStr, minuteStr] = timeStr.split(':');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
    return null;
  }
  return new Date(year, month, day, hour, minute, 0, 0);
}

/**
 * Calculates the exact Date when a reminder should trigger
 */
export function calculateReminderTriggerTime(
  dateStr: string,
  timeStr: string | undefined,
  reminder: EntryReminder,
  defaultTime: string = '09:00'
): Date | null {
  const effectiveTime = reminder.customTime || timeStr || defaultTime;
  const targetDate = parseDateTime(dateStr, effectiveTime);
  if (!targetDate) return null;

  // Subtract offset in minutes
  const triggerMs = targetDate.getTime() - (reminder.offsetMinutes || 0) * 60 * 1000;
  return new Date(triggerMs);
}

/**
 * Core reminder checker engine.
 * Evaluates all journal tasks, events, and active habits.
 * Dispatches alerts when due and marks them as fired.
 */
export function checkAndTriggerDueReminders(
  bujoEntries: BujoEntry[],
  habits: Habit[],
  prefs: UserPreferences,
  onTrigger: (alert: ActiveReminderAlert) => void
): void {
  if (typeof window === 'undefined') return;

  const now = new Date();
  const nowMs = now.getTime();
  const todayStr = getTodayDateString();
  const firedKeys = getFiredReminderKeys();
  const lang = prefs.language || 'en';
  const isFa = lang === 'fa';

  // 1. Check Journal Entries (Tasks and Events)
  for (const entry of bujoEntries) {
    // Only check open tasks and events
    if (entry.status !== 'open') continue;
    if (entry.type !== 'task' && entry.type !== 'event') continue;
    if (!entry.reminders || entry.reminders.length === 0) continue;

    for (const reminder of entry.reminders) {
      if (reminder.enabled === false) continue;

      const triggerDate = calculateReminderTriggerTime(entry.date, entry.time, reminder, '09:00');
      if (!triggerDate) continue;

      const triggerMs = triggerDate.getTime();
      const diffMs = nowMs - triggerMs;

      // Eligible window: from 0 seconds up to 90 seconds after trigger time
      // This ensures even with 10-second polling interval, we never miss an alert
      const firedKey = `bujo-${entry.id}-${reminder.id}-${entry.date}`;

      if (diffMs >= 0 && diffMs <= 95000 && !firedKeys[firedKey]) {
        markReminderFired(firedKey);

        const timingLabel = formatReminderOffset(reminder.offsetMinutes, lang);
        const typeLabel = entry.type === 'event'
          ? (isFa ? 'رویداد' : 'Event')
          : (isFa ? 'وظیفه' : 'Task');
        const intensity = reminder.intensity || 'normal';

        const alert: ActiveReminderAlert = {
          id: firedKey,
          reminderId: reminder.id,
          entryId: entry.id,
          entryType: entry.type,
          title: entry.content,
          content: `${typeLabel} · ${entry.time || ''} (${timingLabel})`,
          time: entry.time,
          reminderLabel: timingLabel,
          offsetMinutes: reminder.offsetMinutes,
          triggeredAt: nowMs,
          intensity,
        };

        // Notify in-app
        onTrigger(alert);

        // Sound alert
        if (prefs.reminderSoundEnabled !== false && prefs.soundEffectsEnabled !== false) {
          if (intensity === 'strong') {
            soundEngine.startStrongAlarmLoop(firedKey);
          } else {
            soundEngine.playGentleChime();
          }
        }

        // Native Browser Notification
        if (prefs.reminderNotificationsEnabled !== false) {
          const prefix = intensity === 'strong' ? '🚨 [STRONG / شدید] ' : '🔔 ';
          const notifTitle = `${prefix}${typeLabel}: ${entry.content}`;
          const notifBody = `${timingLabel}${entry.time ? ` · ${entry.time}` : ''}${
            intensity === 'strong' ? (isFa ? ' — تکرار مداوم هر ۳ ثانیه' : ' — Repeating every 3s') : ''
          }`;
          if (intensity === 'strong') {
            startStrongReminderInSW(firedKey, notifTitle, notifBody, {
              id: firedKey,
              reminderId: reminder.id,
              entryId: entry.id,
              entryType: entry.type,
              isFa,
            });
          }
          dispatchBrowserNotification(notifTitle, notifBody, firedKey, intensity, {
            id: firedKey,
            reminderId: reminder.id,
            entryId: entry.id,
            entryType: entry.type,
            isFa,
          });
        }
      }
    }
  }

  // 2. Check Habits scheduled for today
  for (const habit of habits) {
    if (habit.isArchived) continue;
    if (!habit.reminders || habit.reminders.length === 0) continue;
    // Check if habit is active on today's day of week
    if (!isHabitActiveOnDate(habit, todayStr)) continue;

    // Default time bucket anchor if no specific time set
    const defaultHabitTime =
      habit.timeBucket === 'morning'
        ? '08:00'
        : habit.timeBucket === 'midday'
        ? '12:30'
        : habit.timeBucket === 'evening'
        ? '20:30'
        : '09:00';

    for (const reminder of habit.reminders) {
      if (reminder.enabled === false) continue;

      const triggerDate = calculateReminderTriggerTime(todayStr, habit.time, reminder, defaultHabitTime);
      if (!triggerDate) continue;

      const triggerMs = triggerDate.getTime();
      const diffMs = nowMs - triggerMs;
      const firedKey = `habit-${habit.id}-${reminder.id}-${todayStr}`;

      if (diffMs >= 0 && diffMs <= 95000 && !firedKeys[firedKey]) {
        markReminderFired(firedKey);

        const timingLabel = formatReminderOffset(reminder.offsetMinutes, lang);
        const typeLabel = isFa ? 'عادت' : 'Habit';
        const intensity = reminder.intensity || 'normal';

        const alert: ActiveReminderAlert = {
          id: firedKey,
          reminderId: reminder.id,
          entryId: habit.id,
          entryType: 'habit',
          title: habit.title,
          content: `${typeLabel} · ${habit.time || defaultHabitTime} (${timingLabel})`,
          time: habit.time || defaultHabitTime,
          reminderLabel: timingLabel,
          offsetMinutes: reminder.offsetMinutes,
          triggeredAt: nowMs,
          intensity,
        };

        onTrigger(alert);

        if (prefs.reminderSoundEnabled !== false && prefs.soundEffectsEnabled !== false) {
          if (intensity === 'strong') {
            soundEngine.startStrongAlarmLoop(firedKey);
          } else {
            soundEngine.playGentleChime();
          }
        }

        if (prefs.reminderNotificationsEnabled !== false) {
          const prefix = intensity === 'strong' ? '🚨 [STRONG / شدید] ' : '🔔 ';
          const notifTitle = `${prefix}${typeLabel}: ${habit.title}`;
          const notifBody = `${timingLabel}${habit.time ? ` · ${habit.time}` : ''}${
            intensity === 'strong' ? (isFa ? ' — تکرار مداوم هر ۳ ثانیه' : ' — Repeating every 3s') : ''
          }`;
          if (intensity === 'strong') {
            startStrongReminderInSW(firedKey, notifTitle, notifBody, {
              id: firedKey,
              reminderId: reminder.id,
              entryId: habit.id,
              entryType: 'habit',
              isFa,
            });
          }
          dispatchBrowserNotification(notifTitle, notifBody, firedKey, intensity, {
            id: firedKey,
            reminderId: reminder.id,
            entryId: habit.id,
            entryType: 'habit',
            isFa,
          });
        }
      }
    }
  }
}

/**
 * Returns a sorted list of all upcoming reminders scheduled for a specific date (defaults to today)
 */
export function getUpcomingRemindersForDate(
  bujoEntries: BujoEntry[],
  habits: Habit[],
  dateStr: string = getTodayDateString(),
  lang: Language = 'en'
): UpcomingReminderItem[] {
  const items: UpcomingReminderItem[] = [];
  const now = new Date();

  // Bujo entries for this date
  for (const entry of bujoEntries) {
    if (entry.date !== dateStr) continue;
    if (entry.status !== 'open') continue;
    if (entry.type !== 'task' && entry.type !== 'event') continue;
    if (!entry.reminders || entry.reminders.length === 0) continue;

    for (const rem of entry.reminders) {
      if (rem.enabled === false) continue;
      const triggerDate = calculateReminderTriggerTime(entry.date, entry.time, rem, '09:00');
      if (!triggerDate) continue;

      const hours = String(triggerDate.getHours()).padStart(2, '0');
      const mins = String(triggerDate.getMinutes()).padStart(2, '0');

      items.push({
        id: `bujo-${entry.id}-${rem.id}`,
        reminderId: rem.id,
        entryId: entry.id,
        entryType: entry.type,
        title: entry.content,
        entryTime: entry.time,
        reminderTime: `${hours}:${mins}`,
        reminderDateTime: triggerDate,
        offsetMinutes: rem.offsetMinutes,
        label: formatReminderOffset(rem.offsetMinutes, lang),
        isPast: triggerDate.getTime() < now.getTime(),
        intensity: rem.intensity || 'normal',
      });
    }
  }

  // Habits active on this date
  for (const habit of habits) {
    if (habit.isArchived) continue;
    if (!habit.reminders || habit.reminders.length === 0) continue;
    if (!isHabitActiveOnDate(habit, dateStr)) continue;

    const defaultHabitTime =
      habit.timeBucket === 'morning'
        ? '08:00'
        : habit.timeBucket === 'midday'
        ? '12:30'
        : habit.timeBucket === 'evening'
        ? '20:30'
        : '09:00';

    for (const rem of habit.reminders) {
      if (rem.enabled === false) continue;
      const triggerDate = calculateReminderTriggerTime(dateStr, habit.time, rem, defaultHabitTime);
      if (!triggerDate) continue;

      const hours = String(triggerDate.getHours()).padStart(2, '0');
      const mins = String(triggerDate.getMinutes()).padStart(2, '0');

      items.push({
        id: `habit-${habit.id}-${rem.id}`,
        reminderId: rem.id,
        entryId: habit.id,
        entryType: 'habit',
        title: habit.title,
        entryTime: habit.time || defaultHabitTime,
        reminderTime: `${hours}:${mins}`,
        reminderDateTime: triggerDate,
        offsetMinutes: rem.offsetMinutes,
        label: formatReminderOffset(rem.offsetMinutes, lang),
        isPast: triggerDate.getTime() < now.getTime(),
        intensity: rem.intensity || 'normal',
      });
    }
  }

  // Sort chronologically by reminder date/time
  return items.sort((a, b) => a.reminderDateTime.getTime() - b.reminderDateTime.getTime());
}
