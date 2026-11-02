import { EntryReminder, ReminderIntensity } from '../types';

export interface PhoneReminderItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  offsetMinutes?: number;
  intensity?: ReminderIntensity;
  notes?: string;
}

/**
 * Formats a Date object into an iCalendar UTC string: YYYYMMDDTHHMMSSZ
 */
function formatIcsDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

/**
 * Creates an RFC 5545 iCalendar (.ics) string with VALARM audio/display alerts
 * Compatible with Apple Reminders & Calendar, Google Calendar, and Android phone reminders.
 */
export function generateIcsContent(
  item: PhoneReminderItem,
  isCancellation: boolean = false
): string {
  const [yearStr, monthStr, dayStr] = item.date.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10) - 1;
  const d = parseInt(dayStr, 10);

  let hour = 9;
  let min = 0;
  if (item.time) {
    const [hStr, mStr] = item.time.split(':');
    hour = parseInt(hStr, 10) || 9;
    min = parseInt(mStr, 10) || 0;
  }

  const startDate = new Date(y, m, d, hour, min, 0);
  // Default duration 30 mins
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

  const dtStamp = formatIcsDateTime(new Date());
  const dtStart = formatIcsDateTime(startDate);
  const dtEnd = formatIcsDateTime(endDate);
  const uid = `lerni-reminder-${item.id}@lerni.app`;
  const offset = item.offsetMinutes ?? 0;
  const isStrong = item.intensity === 'strong';

  const cleanTitle = item.title.replace(/\n/g, ' ').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const desc = (item.notes || `Reminder set via Lerni companion`).replace(/\n/g, '\\n');

  if (isCancellation) {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Lerni//Executive Function Companion//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:CANCEL',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${cleanTitle}`,
      'STATUS:CANCELLED',
      'SEQUENCE:2',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  // Normal or Strong Alarm block
  // If strong, adds repeating VALARM trigger instructions
  const alarmLines = [
    'BEGIN:VALARM',
    `TRIGGER:-PT${Math.max(0, offset)}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${isStrong ? '🚨 [STRONG] ' : '🔔 '}${cleanTitle}`,
    'END:VALARM',
  ];

  if (isStrong) {
    // Additional audio chime alert
    alarmLines.push(
      'BEGIN:VALARM',
      `TRIGGER:-PT${Math.max(0, offset)}M`,
      'ACTION:AUDIO',
      'ATTACH;VALUE=URI:Basso',
      'END:VALARM'
    );
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lerni//Executive Function Companion//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${isStrong ? '🚨 ' : '🔔 '}${cleanTitle}`,
    `DESCRIPTION:${desc}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:1',
    ...alarmLines,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Triggers a file download or native OS calendar import for the generated .ics
 */
export function promptDownloadIcs(filename: string, icsContent: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 4000);
}

/**
 * 1-Tap: Add reminder to Phone's native Reminders & Calendar
 */
export function addReminderToPhoneCalendar(item: PhoneReminderItem): void {
  const ics = generateIcsContent(item, false);
  const safeTitle = item.title.slice(0, 20).replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
  promptDownloadIcs(`Lerni_${safeTitle}_Reminder.ics`, ics);
}

/**
 * 1-Tap: Remove reminder from Phone's native Reminders & Calendar
 * Generates an RFC 5545 cancellation event with matching UID and SEQUENCE.
 */
export function removeReminderFromPhoneCalendar(item: PhoneReminderItem): void {
  const ics = generateIcsContent(item, true);
  const safeTitle = item.title.slice(0, 20).replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
  promptDownloadIcs(`Lerni_Cancel_${safeTitle}.ics`, ics);
}

/**
 * Uses Web Share API (native on iOS Safari & Android Chrome)
 * Opens the native share sheet where user can tap "Reminders" or "Google Tasks"
 */
export async function shareReminderToPhoneSheet(item: PhoneReminderItem): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    const textParts = [
      item.title,
      item.date ? `Date: ${item.date}` : '',
      item.time ? `Time: ${item.time}` : '',
      item.offsetMinutes !== undefined ? `Alert: ${item.offsetMinutes}m before` : '',
      item.intensity === 'strong' ? 'Type: Strong Alarm (3s Repeat)' : 'Type: Normal',
    ].filter(Boolean);

    await navigator.share({
      title: item.title,
      text: textParts.join('\n'),
    });
    return true;
  } catch (err: any) {
    // User cancelled share sheet or share failed
    if (err?.name !== 'AbortError') {
      console.warn('Share to phone reminders error:', err);
    }
    return false;
  }
}

/**
 * Generates direct Google Calendar / Google Tasks web intent URL
 */
export function getGoogleCalendarReminderUrl(item: PhoneReminderItem): string {
  const [yearStr, monthStr, dayStr] = item.date.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10) - 1;
  const d = parseInt(dayStr, 10);

  let hour = 9;
  let min = 0;
  if (item.time) {
    const [hStr, mStr] = item.time.split(':');
    hour = parseInt(hStr, 10) || 9;
    min = parseInt(mStr, 10) || 0;
  }

  const startDate = new Date(y, m, d, hour, min, 0);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

  const formatGCal = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
  };

  const datesParam = `${formatGCal(startDate)}/${formatGCal(endDate)}`;
  const titleParam = encodeURIComponent(
    `${item.intensity === 'strong' ? '🚨 [STRONG] ' : '🔔 '}${item.title}`
  );
  const detailsParam = encodeURIComponent(
    `Reminder managed via Lerni.\nIntensity: ${item.intensity || 'normal'}\nOffset: ${item.offsetMinutes ?? 0}m`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleParam}&dates=${datesParam}&details=${detailsParam}`;
}

/**
 * Exports all active reminders across the entire app into a single calendar file (.ics)
 * that the user can import into Apple Calendar / Google Calendar / Samsung Calendar at once.
 */
export function exportAllRemindersToIcs(items: PhoneReminderItem[]): void {
  if (items.length === 0) return;

  const dtStamp = formatIcsDateTime(new Date());
  const eventBlocks: string[] = [];

  for (const item of items) {
    const [yearStr, monthStr, dayStr] = item.date.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10) - 1;
    const d = parseInt(dayStr, 10);

    let hour = 9;
    let min = 0;
    if (item.time) {
      const [hStr, mStr] = item.time.split(':');
      hour = parseInt(hStr, 10) || 9;
      min = parseInt(mStr, 10) || 0;
    }

    const startDate = new Date(y, m, d, hour, min, 0);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    const dtStart = formatIcsDateTime(startDate);
    const dtEnd = formatIcsDateTime(endDate);
    const uid = `lerni-reminder-${item.id}@lerni.app`;
    const offset = item.offsetMinutes ?? 0;
    const isStrong = item.intensity === 'strong';
    const cleanTitle = item.title.replace(/\n/g, ' ').replace(/,/g, '\\,').replace(/;/g, '\\;');

    eventBlocks.push(
      [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${isStrong ? '🚨 ' : '🔔 '}${cleanTitle}`,
        'DESCRIPTION:Lerni executive function reminder',
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        `TRIGGER:-PT${Math.max(0, offset)}M`,
        'ACTION:DISPLAY',
        `DESCRIPTION:${cleanTitle}`,
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n')
    );
  }

  const fullIcs = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lerni//Executive Function Companion//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventBlocks,
    'END:VCALENDAR',
  ].join('\r\n');

  promptDownloadIcs(`Lerni_All_Reminders_${new Date().toISOString().slice(0, 10)}.ics`, fullIcs);
}
