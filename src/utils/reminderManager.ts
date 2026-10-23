import { BujoEntry, Habit, EntryReminder, UserPreferences, Language, isHabitActiveOnDate } from '../types';
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
 * Dispatches a native browser system notification
 */
export async function dispatchBrowserNotification(title: string, body: string, tag?: string): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: tag || `lerni-${Date.now()}`,
          data: { url: '/' },
        } as any);
        return true;
      }
    }

    new Notification(title, {
      body,
      icon: '/icon.svg',
      tag: tag || `lerni-${Date.now()}`,
    });
    return true;
  } catch (e) {
    console.warn('Could not dispatch browser notification:', e);
    return false;
  }
}

/**
 * Send a sample/test notification to verify system sounds and display
 */
export async function sendTestReminderNotification(lang: Language = 'en'): Promise<boolean> {
  const isFa = lang === 'fa';
  const title = isFa ? '🔔 لرنی — یادآور آزمایشی' : '🔔 Lerni — Test Reminder';
  const body = isFa
    ? 'سیستم یادآورها و اعلان‌های لرنی به درستی فعال است!'
    : 'Lerni reminders & notifications are active and ready!';

  soundEngine.playGentleChime();
  return dispatchBrowserNotification(title, body, 'lerni-test-reminder');
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
        };

        // Notify in-app
        onTrigger(alert);

        // Sound alert
        if (prefs.reminderSoundEnabled !== false && prefs.soundEffectsEnabled !== false) {
          soundEngine.playGentleChime();
        }

        // Native Browser Notification
        if (prefs.reminderNotificationsEnabled !== false) {
          const notifTitle = `🔔 ${typeLabel}: ${entry.content}`;
          const notifBody = `${timingLabel}${entry.time ? ` · ${entry.time}` : ''}`;
          dispatchBrowserNotification(notifTitle, notifBody, firedKey);
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
        };

        onTrigger(alert);

        if (prefs.reminderSoundEnabled !== false && prefs.soundEffectsEnabled !== false) {
          soundEngine.playGentleChime();
        }

        if (prefs.reminderNotificationsEnabled !== false) {
          const notifTitle = `🔔 ${typeLabel}: ${habit.title}`;
          const notifBody = `${timingLabel}${habit.time ? ` · ${habit.time}` : ''}`;
          dispatchBrowserNotification(notifTitle, notifBody, firedKey);
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
      });
    }
  }

  // Sort chronologically by reminder date/time
  return items.sort((a, b) => a.reminderDateTime.getTime() - b.reminderDateTime.getTime());
}
