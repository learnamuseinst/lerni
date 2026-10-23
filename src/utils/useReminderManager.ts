import { useState, useEffect, useCallback, useRef } from 'react';
import { BujoEntry, Habit, UserPreferences } from '../types';
import {
  FiredReminderAlert,
  SnoozedReminder,
  ScheduledReminderItem,
  getAllScheduledRemindersForDate,
  getFiredReminderKeys,
  markReminderFired,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
  NotificationPermissionState,
} from './reminderService';
import { getTodayKey } from './dateUtils';
import { soundEngine } from './audioSynth';
import { useI18n } from './i18n';

interface UseReminderManagerProps {
  entries: BujoEntry[];
  habits: Habit[];
  prefs: UserPreferences;
  onUpdateEntries: (entries: BujoEntry[]) => void;
  onUpdateHabits: (habits: Habit[]) => void;
}

export function useReminderManager({
  entries,
  habits,
  prefs,
  onUpdateEntries,
  onUpdateHabits,
}: UseReminderManagerProps) {
  const { language: contextLang } = useI18n();
  const activeLang = prefs.language || contextLang || 'en';
  const isFa = activeLang === 'fa';
  const [activeAlerts, setActiveAlerts] = useState<FiredReminderAlert[]>([]);
  const [snoozedList, setSnoozedList] = useState<SnoozedReminder[]>([]);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(
    getBrowserNotificationPermission()
  );

  const notificationsEnabled = prefs.notificationsEnabled ?? true;
  const reminderSoundEnabled = prefs.reminderSoundEnabled ?? true;

  // Sync browser permission on mount
  useEffect(() => {
    setPermissionState(getBrowserNotificationPermission());
  }, []);

  // Request browser notification permission
  const handleRequestPermission = useCallback(async () => {
    const res = await requestBrowserNotificationPermission();
    setPermissionState(res);
    return res;
  }, []);

  // Dismiss in-app alert
  const dismissAlert = useCallback((alertId: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  // Snooze in-app alert
  const snoozeAlert = useCallback((alert: FiredReminderAlert, minutes: number = 5) => {
    dismissAlert(alert.id);
    const dueTimestamp = Date.now() + minutes * 60 * 1000;
    const snoozed: SnoozedReminder = {
      id: `snooze-${Date.now()}-${alert.itemId}`,
      originalAlert: alert,
      dueTimestamp,
    };
    setSnoozedList((prev) => [...prev, snoozed]);
  }, [dismissAlert]);

  // Mark item as completed directly from alert
  const completeAlert = useCallback(
    (alert: FiredReminderAlert) => {
      dismissAlert(alert.id);

      if (alert.itemType === 'task' || alert.itemType === 'event') {
        onUpdateEntries(
          entries.map((e) =>
            e.id === alert.itemId
              ? { ...e, status: 'completed', completedAt: Date.now() }
              : e
          )
        );
      } else if (alert.itemType === 'habit') {
        const todayStr = getTodayKey();
        onUpdateHabits(
          habits.map((h) => {
            if (h.id !== alert.itemId) return h;
            if (h.completedDates.includes(todayStr)) return h;
            return {
              ...h,
              completedDates: [...h.completedDates, todayStr],
              totalCompletions: h.totalCompletions + 1,
              streakCount: h.streakCount + 1,
            };
          })
        );
      }
    },
    [dismissAlert, entries, habits, onUpdateEntries, onUpdateHabits]
  );

  // Trigger alert execution
  const fireAlert = useCallback(
    (alert: FiredReminderAlert) => {
      // 1. Play sound chime if enabled
      if (reminderSoundEnabled) {
        soundEngine.playReminderAlert();
      }

      // 2. Add to in-app toast alerts
      setActiveAlerts((prev) => {
        if (prev.some((a) => a.id === alert.id)) return prev;
        return [alert, ...prev];
      });

      // 3. Dispatch browser native notification if permitted
      if (notificationsEnabled) {
        const prefix =
          alert.itemType === 'task'
            ? '📌 Task Reminder'
            : alert.itemType === 'event'
            ? '⏳ Event Reminder'
            : '🌱 Habit Reminder';

        sendBrowserNotification(`${prefix}: ${alert.title}`, {
          body: `${alert.label} • Lerni Companion`,
          tag: `lerni-${alert.id}`,
        });
      }
    },
    [notificationsEnabled, reminderSoundEnabled]
  );

  // Test Reminder function (can be called from Settings)
  const testReminder = useCallback(() => {
    const testAlert: FiredReminderAlert = {
      id: `test-${Date.now()}`,
      reminderId: 'test-reminder',
      itemId: 'test-item',
      itemType: 'task',
      title: isFa ? 'بررسی برنامه‌ریزی روزانه و نوشیدن آب' : 'Review Daily Planner & Hydrate',
      label: isFa ? 'تست یادآور' : 'Test Reminder (Now)',
      timeStr: 'Now',
      timestamp: Date.now(),
    };
    fireAlert(testAlert);
  }, [fireAlert, isFa]);

  // Periodic Reminder Checker
  useEffect(() => {
    if (!notificationsEnabled) return;

    const checkInterval = setInterval(() => {
      const todayStr = getTodayKey();
      const now = Date.now();
      const firedKeys = getFiredReminderKeys(todayStr);

      // Check standard scheduled reminders
      const scheduledList = getAllScheduledRemindersForDate(todayStr, entries, habits, isFa);

      for (const item of scheduledList) {
        const fireKey = `${item.id}_${item.scheduledDate}_${item.scheduledTime}`;
        if (firedKeys.has(fireKey)) continue;

        // Tolerance window: trigger if scheduled time is reached (within past 2 minutes)
        if (now >= item.scheduledTimestamp && now <= item.scheduledTimestamp + 2 * 60 * 1000) {
          markReminderFired(fireKey, todayStr);
          fireAlert({
            id: fireKey,
            reminderId: item.reminderId,
            itemId: item.itemId,
            itemType: item.itemType,
            title: item.title,
            category: item.category,
            label: item.label,
            timeStr: item.scheduledTime,
            timestamp: now,
          });
        }
      }

      // Check snoozed reminders
      setSnoozedList((prevSnoozed) => {
        const remaining: SnoozedReminder[] = [];
        for (const item of prevSnoozed) {
          if (now >= item.dueTimestamp) {
            fireAlert(item.originalAlert);
          } else {
            remaining.push(item);
          }
        }
        return remaining;
      });
    }, 15000); // Check every 15 seconds

    return () => clearInterval(checkInterval);
  }, [notificationsEnabled, entries, habits, isFa, fireAlert]);

  // Scheduled for today summary
  const todayStr = getTodayKey();
  const scheduledToday = getAllScheduledRemindersForDate(todayStr, entries, habits, isFa);

  return {
    activeAlerts,
    dismissAlert,
    snoozeAlert,
    completeAlert,
    scheduledToday,
    permissionState,
    requestPermission: handleRequestPermission,
    testReminder,
  };
}
