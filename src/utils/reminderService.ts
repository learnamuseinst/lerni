import { Reminder, BujoEntry, Habit, isHabitActiveOnDate } from '../types';
import { getTodayKey, formatDateKey } from './dateUtils';
import { soundEngine } from './audioSynth';

export interface ScheduledReminderItem {
  id: string; // `${itemType}_${itemId}_${reminderId}`
  reminderId: string;
  itemId: string;
  itemType: 'task' | 'event' | 'habit';
  title: string;
  category?: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  scheduledTimestamp: number; // epoch ms
  offsetMinutes: number;
  label: string;
  itemTime?: string;
}

export interface FiredReminderAlert {
  id: string;
  reminderId: string;
  itemId: string;
  itemType: 'task' | 'event' | 'habit';
  title: string;
  category?: string;
  label: string;
  timeStr: string;
  timestamp: number;
}

export interface SnoozedReminder {
  id: string;
  originalAlert: FiredReminderAlert;
  dueTimestamp: number;
}

// Preset options for quick reminder creation
export const REMINDER_PRESETS: { offsetMinutes: number; labelKey: string; defaultLabel: string }[] = [
  { offsetMinutes: 0, labelKey: 'reminders.atTime', defaultLabel: 'At time' },
  { offsetMinutes: 5, labelKey: 'reminders.5mBefore', defaultLabel: '5 mins before' },
  { offsetMinutes: 10, labelKey: 'reminders.10mBefore', defaultLabel: '10 mins before' },
  { offsetMinutes: 15, labelKey: 'reminders.15mBefore', defaultLabel: '15 mins before' },
  { offsetMinutes: 30, labelKey: 'reminders.30mBefore', defaultLabel: '30 mins before' },
  { offsetMinutes: 60, labelKey: 'reminders.1hBefore', defaultLabel: '1 hour before' },
  { offsetMinutes: 120, labelKey: 'reminders.2hBefore', defaultLabel: '2 hours before' },
  { offsetMinutes: 1440, labelKey: 'reminders.1dBefore', defaultLabel: '1 day before' },
];

/**
 * Format a human-readable label for a reminder
 */
export function formatReminderLabel(reminder: Reminder, isFa: boolean = false): string {
  if (reminder.label) return reminder.label;

  if (reminder.offsetMinutes === -1 && reminder.customTime) {
    return isFa ? `در ساعت ${reminder.customTime}` : `At ${reminder.customTime}`;
  }

  switch (reminder.offsetMinutes) {
    case 0:
      return isFa ? 'در زمان مقرر' : 'At time';
    case 5:
      return isFa ? '۵ دقیقه قبل' : '5 mins before';
    case 10:
      return isFa ? '۱۰ دقیقه قبل' : '10 mins before';
    case 15:
      return isFa ? '۱۵ دقیقه قبل' : '15 mins before';
    case 30:
      return isFa ? '۳۰ دقیقه قبل' : '30 mins before';
    case 60:
      return isFa ? '۱ ساعت قبل' : '1 hour before';
    case 120:
      return isFa ? '۲ ساعت قبل' : '2 hours before';
    case 1440:
      return isFa ? '۱ روز قبل' : '1 day before';
    default:
      if (reminder.offsetMinutes > 0 && reminder.offsetMinutes < 60) {
        return isFa ? `${reminder.offsetMinutes} دقیقه قبل` : `${reminder.offsetMinutes} mins before`;
      } else if (reminder.offsetMinutes >= 60 && reminder.offsetMinutes % 60 === 0) {
        const h = reminder.offsetMinutes / 60;
        return isFa ? `${h} ساعت قبل` : `${h}h before`;
      }
      return isFa ? `${reminder.offsetMinutes} دقیقه قبل` : `${reminder.offsetMinutes} mins before`;
  }
}

/**
 * Convert Date object to HH:mm string
 */
function toHHmm(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Compute scheduled timestamp for a Bujo Entry (Task or Event)
 */
export function computeEntryReminderSchedule(
  entry: BujoEntry,
  reminder: Reminder
): { scheduledDate: string; scheduledTime: string; scheduledTimestamp: number } | null {
  if (entry.type !== 'task' && entry.type !== 'event') return null;
  if (entry.status === 'completed' || entry.status === 'cancelled') return null;

  const entryDate = entry.date || getTodayKey();

  // If custom explicit time is set on reminder
  if (reminder.offsetMinutes === -1 && reminder.customTime) {
    const [hh, mm] = reminder.customTime.split(':').map((s) => parseInt(s, 10));
    if (isNaN(hh) || isNaN(mm)) return null;

    const [y, m, d] = entryDate.split('-').map((s) => parseInt(s, 10));
    const targetDate = new Date(y, m - 1, d, hh, mm, 0, 0);
    return {
      scheduledDate: formatDateKey(targetDate),
      scheduledTime: toHHmm(targetDate),
      scheduledTimestamp: targetDate.getTime(),
    };
  }

  // If offset >= 0
  const baselineTime = entry.time || '09:00';
  const [hh, mm] = baselineTime.split(':').map((s) => parseInt(s, 10));
  if (isNaN(hh) || isNaN(mm)) return null;

  const [y, m, d] = entryDate.split('-').map((s) => parseInt(s, 10));
  const baseDate = new Date(y, m - 1, d, hh, mm, 0, 0);
  const targetTimestamp = baseDate.getTime() - (reminder.offsetMinutes || 0) * 60 * 1000;
  const targetDate = new Date(targetTimestamp);

  return {
    scheduledDate: formatDateKey(targetDate),
    scheduledTime: toHHmm(targetDate),
    scheduledTimestamp: targetTimestamp,
  };
}

/**
 * Compute scheduled timestamp for a Habit on a given target date
 */
export function computeHabitReminderSchedule(
  habit: Habit,
  reminder: Reminder,
  targetDateStr: string = getTodayKey()
): { scheduledDate: string; scheduledTime: string; scheduledTimestamp: number } | null {
  if (habit.isArchived) return null;
  if (!isHabitActiveOnDate(habit, targetDateStr)) return null;
  if (habit.completedDates?.includes(targetDateStr)) return null;

  // If custom time
  if (reminder.offsetMinutes === -1 && reminder.customTime) {
    const [hh, mm] = reminder.customTime.split(':').map((s) => parseInt(s, 10));
    if (isNaN(hh) || isNaN(mm)) return null;

    const [y, m, d] = targetDateStr.split('-').map((s) => parseInt(s, 10));
    const targetDate = new Date(y, m - 1, d, hh, mm, 0, 0);
    return {
      scheduledDate: formatDateKey(targetDate),
      scheduledTime: toHHmm(targetDate),
      scheduledTimestamp: targetDate.getTime(),
    };
  }

  // Fallback habit baseline time based on anchor time or timeBucket
  let habitBaselineTime = habit.time;
  if (!habitBaselineTime) {
    switch (habit.timeBucket) {
      case 'morning':
        habitBaselineTime = '08:00';
        break;
      case 'midday':
        habitBaselineTime = '12:30';
        break;
      case 'evening':
        habitBaselineTime = '20:00';
        break;
      default:
        habitBaselineTime = '09:30';
        break;
    }
  }

  const [hh, mm] = habitBaselineTime.split(':').map((s) => parseInt(s, 10));
  if (isNaN(hh) || isNaN(mm)) return null;

  const [y, m, d] = targetDateStr.split('-').map((s) => parseInt(s, 10));
  const baseDate = new Date(y, m - 1, d, hh, mm, 0, 0);
  const targetTimestamp = baseDate.getTime() - (reminder.offsetMinutes || 0) * 60 * 1000;
  const targetDate = new Date(targetTimestamp);

  return {
    scheduledDate: formatDateKey(targetDate),
    scheduledTime: toHHmm(targetDate),
    scheduledTimestamp: targetTimestamp,
  };
}

/**
 * Gather all scheduled reminders for today (Tasks, Events, Habits)
 */
export function getAllScheduledRemindersForDate(
  targetDateStr: string,
  entries: BujoEntry[],
  habits: Habit[],
  isFa: boolean = false
): ScheduledReminderItem[] {
  const result: ScheduledReminderItem[] = [];

  // 1. Tasks and Events in Journal
  for (const entry of entries) {
    if (entry.type !== 'task' && entry.type !== 'event') continue;
    if (entry.status === 'completed' || entry.status === 'cancelled') continue;
    if (!entry.reminders || entry.reminders.length === 0) continue;

    for (const reminder of entry.reminders) {
      const schedule = computeEntryReminderSchedule(entry, reminder);
      if (schedule && schedule.scheduledDate === targetDateStr) {
        result.push({
          id: `${entry.type}_${entry.id}_${reminder.id}`,
          reminderId: reminder.id,
          itemId: entry.id,
          itemType: entry.type,
          title: entry.content,
          category: entry.category,
          itemTime: entry.time,
          scheduledDate: schedule.scheduledDate,
          scheduledTime: schedule.scheduledTime,
          scheduledTimestamp: schedule.scheduledTimestamp,
          offsetMinutes: reminder.offsetMinutes,
          label: formatReminderLabel(reminder, isFa),
        });
      }
    }
  }

  // 2. Habits
  for (const habit of habits) {
    if (habit.isArchived) continue;
    if (!isHabitActiveOnDate(habit, targetDateStr)) continue;
    if (habit.completedDates?.includes(targetDateStr)) continue;
    if (!habit.reminders || habit.reminders.length === 0) continue;

    for (const reminder of habit.reminders) {
      const schedule = computeHabitReminderSchedule(habit, reminder, targetDateStr);
      if (schedule && schedule.scheduledDate === targetDateStr) {
        result.push({
          id: `habit_${habit.id}_${reminder.id}`,
          reminderId: reminder.id,
          itemId: habit.id,
          itemType: 'habit',
          title: habit.title,
          category: habit.timeBucket,
          itemTime: habit.time,
          scheduledDate: schedule.scheduledDate,
          scheduledTime: schedule.scheduledTime,
          scheduledTimestamp: schedule.scheduledTimestamp,
          offsetMinutes: reminder.offsetMinutes,
          label: formatReminderLabel(reminder, isFa),
        });
      }
    }
  }

  // Sort ascending by scheduled timestamp
  return result.sort((a, b) => a.scheduledTimestamp - b.scheduledTimestamp);
}

// ==========================================
// BROWSER NOTIFICATIONS HELPER
// ==========================================

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getBrowserNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm as NotificationPermissionState;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return getBrowserNotificationPermission();
  }
}

export function sendBrowserNotification(
  title: string,
  options?: { body?: string; tag?: string; icon?: string; badge?: string }
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const icon = options?.icon || '/icon-192.png';
    const notification = new Notification(title, {
      body: options?.body || 'Lerni Executive Function Companion',
      tag: options?.tag,
      icon,
      badge: icon,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (err) {
    console.warn('Could not dispatch browser notification:', err);
    return false;
  }
}

// ==========================================
// FIRED REMINDERS PERSISTENCE (PER-DAY DEDUPLICATION)
// ==========================================

const FIRED_STORAGE_PREFIX = 'lerni_fired_reminders_';

export function getFiredReminderKeys(dateStr: string = getTodayKey()): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`${FIRED_STORAGE_PREFIX}${dateStr}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (e) {}
  return new Set();
}

export function markReminderFired(key: string, dateStr: string = getTodayKey()): void {
  if (typeof window === 'undefined') return;
  try {
    const set = getFiredReminderKeys(dateStr);
    set.add(key);
    localStorage.setItem(`${FIRED_STORAGE_PREFIX}${dateStr}`, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function clearFiredReminders(dateStr: string = getTodayKey()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${FIRED_STORAGE_PREFIX}${dateStr}`);
  } catch (e) {}
}
