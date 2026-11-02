// Lerni PWA Service Worker - Offline First & Caching
const CACHE_NAME = 'lerni-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap'
];

// Install Event: pre-cache critical app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Failed to pre-cache some assets:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Stale-While-Revalidate / Cache First for assets, Network first for API/navigation
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept or cache dev requests, vite internals, or source files
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.includes('/src/') ||
    url.pathname.includes('/node_modules/') ||
    url.searchParams.has('t') ||
    (url.port === '3000' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1'))
  ) {
    return;
  }

  // For API endpoints, try network, return offline JSON if unreachable
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ offline: true, error: 'Operating in offline mode' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // For HTML navigation requests (App Shell)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          return caches.match('/index.html');
        })
    );
    return;
  }

  // For static assets (scripts, styles, images, fonts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // If not in cache, fetch from network and cache
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Fallback for image requests
          if (event.request.destination === 'image') {
            return caches.match('/icon.svg');
          }
        });
    })
  );
});

// Notification Click Event: Handle Dismiss, Snooze 5m, or Open Application
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data || {};
  const alertId = data.id || event.notification.tag?.replace('lerni-rem-', '');

  // Stop 3-second repeating loop if this was a Strong reminder
  if (alertId) {
    stopStrongAlarmInSW(alertId);
  }

  if (action === 'dismiss') {
    event.waitUntil(
      (async () => {
        await markReminderDismissedInDb(alertId);
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: 'REMINDER_DISMISSED', alertId, data });
        }
      })()
    );
    return;
  }

  if (action === 'snooze') {
    event.waitUntil(
      (async () => {
        await scheduleSnoozeInDb(data, 5);
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: 'REMINDER_SNOOZED', alertId, minutes: 5, data });
        }
      })()
    );
    return;
  }

  // User clicked notification body or 'open' action -> focus or open app
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus();
          client.postMessage({ type: 'REMINDER_OPENED_FROM_NOTIFICATION', data });
          return;
        }
      }
      if (self.clients.openWindow) {
        const newClient = await self.clients.openWindow('/');
        if (newClient) {
          setTimeout(() => {
            newClient.postMessage({ type: 'REMINDER_OPENED_FROM_NOTIFICATION', data });
          }, 1000);
        }
      }
    })()
  );
});

// -------------------------------------------------------------
// Offline Background Reminder Engine & Strong 3-Second Alarms
// -------------------------------------------------------------
const DB_NAME = 'lerni_reminders_db';
const DB_VERSION = 1;
const STORE_NAME = 'scheduled_reminders';
const activeStrongAlarms = new Map(); // alertId -> { intervalId, count }
let nextAlarmTimeoutId = null;

function openRemindersDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function getStoredReminders() {
  const db = await openRemindersDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function saveStoredReminders(reminders) {
  const db = await openRemindersDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const r of reminders) {
        store.put(r);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function markReminderDismissedInDb(alertId) {
  const db = await openRemindersDB();
  if (!db || !alertId) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(alertId);
  } catch {}
}

async function scheduleSnoozeInDb(data, minutes = 5) {
  const db = await openRemindersDB();
  if (!db || !data) return;
  try {
    const triggerMs = Date.now() + minutes * 60 * 1000;
    const snoozedItem = {
      ...data,
      id: `snooze-${data.id || Date.now()}`,
      triggerTimeMs: triggerMs,
      label: data.isFa ? `به‌تعویق افتاده (${minutes} د)` : `Snoozed (${minutes}m)`,
      isSnoozed: true,
    };
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(snoozedItem);
    scheduleNextAlarmInSW();
  } catch {}
}

function stopStrongAlarmInSW(alertId) {
  if (activeStrongAlarms.has(alertId)) {
    const record = activeStrongAlarms.get(alertId);
    if (record && record.intervalId) {
      clearInterval(record.intervalId);
    }
    activeStrongAlarms.delete(alertId);
  }
}

function stopAllStrongAlarmsInSW() {
  for (const [id, record] of activeStrongAlarms.entries()) {
    if (record && record.intervalId) {
      clearInterval(record.intervalId);
    }
  }
  activeStrongAlarms.clear();
}

// Dispatches system notification and sets up 3-second repetition for Strong reminders
async function dispatchServiceWorkerNotification(item) {
  const isFa = Boolean(item.isFa);
  const isStrong = item.intensity === 'strong';
  const tag = `lerni-rem-${item.id}`;

  const titlePrefix = isStrong ? '🚨 [STRONG / شدید] ' : '🔔 ';
  const title = `${titlePrefix}${item.entryType === 'event' ? (isFa ? 'رویداد' : 'Event') : item.entryType === 'habit' ? (isFa ? 'عادت' : 'Habit') : (isFa ? 'وظیفه' : 'Task')}: ${item.title}`;
  const body = `${item.label || ''}${item.time ? ` · ${item.time}` : ''}${isStrong ? (isFa ? ' — تکرار مداوم هر ۳ ثانیه تا زمان باز شدن برنامه' : ' — Repeating every 3s until app is opened') : ''}`;

  const notificationOptions = {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag,
    renotify: true,
    requireInteraction: isStrong,
    vibrate: isStrong ? [400, 150, 400, 150, 400] : [250, 100, 250],
    data: {
      ...item,
      url: '/',
    },
    actions: [
      { action: 'dismiss', title: isFa ? 'رد کردن' : 'Dismiss' },
      { action: 'snooze', title: isFa ? 'تعویق ۵ د' : 'Snooze 5m' },
    ],
  };

  try {
    // Show first notification immediately
    await self.registration.showNotification(title, notificationOptions);

    // If Strong reminder, start repeating every 3 seconds!
    if (isStrong) {
      stopStrongAlarmInSW(item.id);
      let repeatCount = 0;
      const intervalId = setInterval(async () => {
        repeatCount++;
        // Safety cap: max 300 cycles (15 minutes) of 3-second repeating notifications
        if (repeatCount > 300 || !activeStrongAlarms.has(item.id)) {
          clearInterval(intervalId);
          activeStrongAlarms.delete(item.id);
          return;
        }

        try {
          await self.registration.showNotification(title, {
            ...notificationOptions,
            tag,
            renotify: true,
          });
        } catch (err) {
          console.warn('Repeating strong notification failed:', err);
        }
      }, 3000);

      activeStrongAlarms.set(item.id, { intervalId, item, repeatCount });
    }
  } catch (err) {
    console.warn('Service worker notification dispatch failed:', err);
  }
}

// Background scheduler for closed app
async function checkDueRemindersInSW() {
  const reminders = await getStoredReminders();
  if (!reminders || reminders.length === 0) return;

  const nowMs = Date.now();
  const remaining = [];

  for (const item of reminders) {
    const diff = nowMs - item.triggerTimeMs;

    // Trigger if due (within window from 0 to 120 seconds after triggerTimeMs)
    if (diff >= 0 && diff <= 120000 && !item.fired) {
      item.fired = true;
      dispatchServiceWorkerNotification(item);
    }

    // Keep items that haven't passed or were snoozed
    if (item.triggerTimeMs > nowMs - 60000) {
      remaining.push(item);
    }
  }

  await saveStoredReminders(remaining);
  scheduleNextAlarmInSW();
}

async function scheduleNextAlarmInSW() {
  if (nextAlarmTimeoutId) {
    clearTimeout(nextAlarmTimeoutId);
    nextAlarmTimeoutId = null;
  }

  const reminders = await getStoredReminders();
  if (!reminders || reminders.length === 0) return;

  const nowMs = Date.now();
  const futureReminders = reminders.filter((r) => r.triggerTimeMs > nowMs);
  if (futureReminders.length === 0) return;

  futureReminders.sort((a, b) => a.triggerTimeMs - b.triggerTimeMs);
  const nextEarliest = futureReminders[0];
  const delayMs = Math.max(1000, nextEarliest.triggerTimeMs - nowMs);

  // If modern Notification Triggers API (Chromium showTrigger) is supported, register it natively!
  try {
    if ('showTrigger' in Notification.prototype && typeof TimestampTrigger !== 'undefined') {
      for (const item of futureReminders) {
        if (item.triggerTimeMs > nowMs) {
          const isFa = Boolean(item.isFa);
          const isStrong = item.intensity === 'strong';
          const titlePrefix = isStrong ? '🚨 [STRONG / شدید] ' : '🔔 ';
          const title = `${titlePrefix}${item.entryType === 'event' ? (isFa ? 'رویداد' : 'Event') : item.entryType === 'habit' ? (isFa ? 'عادت' : 'Habit') : (isFa ? 'وظیفه' : 'Task')}: ${item.title}`;
          self.registration.showNotification(title, {
            body: `${item.label || ''}${item.time ? ` · ${item.time}` : ''}${isStrong ? (isFa ? ' — تکرار مداوم هر ۳ ثانیه تا زمان باز شدن برنامه' : ' — Repeating every 3s until app is opened') : ''}`,
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: `lerni-rem-${item.id}`,
            showTrigger: new TimestampTrigger(item.triggerTimeMs),
            data: item,
            actions: [
              { action: 'dismiss', title: isFa ? 'رد کردن' : 'Dismiss' },
              { action: 'snooze', title: isFa ? 'تعویق ۵ د' : 'Snooze 5m' },
            ],
          }).catch(() => {});
        }
      }
    }
  } catch (e) {
    // TimestampTrigger not supported in this browser version; fallback to setTimeout
  }

  // SW setTimeout alarm scheduler
  // Browsers allow setTimeout in SW; capping at 24 hours
  if (delayMs <= 86400000) {
    nextAlarmTimeoutId = setTimeout(() => {
      checkDueRemindersInSW();
    }, delayMs);
  }
}

// Background sync events for browser wake-up
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkDueRemindersInSW());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'check-reminders' || event.tag === 'sync-reminders') {
    event.waitUntil(checkDueRemindersInSW());
  }
});

// Service Worker Message Listener
self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  const { type, reminders, id, title, body, data } = event.data;

  if (type === 'SYNC_SCHEDULED_REMINDERS' && Array.isArray(reminders)) {
    event.waitUntil(
      (async () => {
        await saveStoredReminders(reminders);
        await scheduleNextAlarmInSW();
      })()
    );
  } else if (type === 'START_STRONG_REMINDER') {
    if (id) {
      stopStrongAlarmInSW(id);
      const isFa = Boolean(data?.isFa);
      const tag = `lerni-rem-${id}`;
      const notificationOptions = {
        body: body || 'Strong Reminder',
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag,
        renotify: true,
        requireInteraction: true,
        vibrate: [400, 150, 400, 150, 400],
        data: { id, intensity: 'strong', ...data, url: '/' },
        actions: [
          { action: 'dismiss', title: isFa ? 'رد کردن' : 'Dismiss' },
          { action: 'snooze', title: isFa ? 'تعویق ۵ د' : 'Snooze 5m' },
        ],
      };

      self.registration.showNotification(title || '🚨 Strong Reminder', notificationOptions).catch(() => {});

      let repeatCount = 0;
      const intervalId = setInterval(async () => {
        repeatCount++;
        if (repeatCount > 300 || !activeStrongAlarms.has(id)) {
          clearInterval(intervalId);
          activeStrongAlarms.delete(id);
          return;
        }
        try {
          await self.registration.showNotification(title || '🚨 Strong Reminder', {
            ...notificationOptions,
            tag,
            renotify: true,
          });
        } catch (err) {}
      }, 3000);

      activeStrongAlarms.set(id, { intervalId, repeatCount });
    }
  } else if (type === 'STOP_STRONG_REMINDER') {
    if (id) {
      stopStrongAlarmInSW(id);
    }
  } else if (type === 'CLIENT_ENTERED_APP') {
    // When the user opens/enters the app, stop SW 3s notifications so in-app banner handles it
    stopAllStrongAlarmsInSW();
  } else if (type === 'CHECK_REMINDERS_NOW') {
    event.waitUntil(checkDueRemindersInSW());
  }
});

