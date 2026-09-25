import { Language } from '../types';

export interface CalendarDay {
  dateStr: string; // YYYY-MM-DD (Gregorian key)
  dayNumber: number; // Day of month in active calendar (1..31)
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  persianDayNumber?: string;
}

export const padZero = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (dateStr: string): Date => {
  if (!dateStr || !dateStr.includes('-')) return new Date();
  const [y, m, d] = dateStr.split('-').map((num) => parseInt(num, 10));
  return new Date(y, m - 1, d);
};

export const getTodayKey = (): string => {
  return formatDateKey(new Date());
};

export const shiftDate = (dateStr: string, offsetDays: number): string => {
  const d = parseDateKey(dateStr);
  d.setDate(d.getDate() + offsetDays);
  return formatDateKey(d);
};

export const toPersianDigits = (str: string | number): string => {
  if (str === null || str === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.toString().replace(/[0-9]/g, (w) => persianDigits[+w]);
};

// ==========================================
// JALALI (SHAMSI) CALENDAR CORE CONVERSIONS
// ==========================================

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const JALALI_WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
export const JALALI_WEEKDAYS_LONG = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

export const gregorianToJalali = (
  gy: number,
  gm: number,
  gd: number
): { jy: number; jm: number; jd: number } => {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
};

export const jalaliToGregorian = (
  jy: number,
  jm: number,
  jd: number
): { gy: number; gm: number; gd: number } => {
  let jy2 = jy - 979;
  let j_day_no = 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4);
  for (let i = 0; i < jm - 1; ++i) {
    j_day_no += i < 6 ? 31 : 30;
  }
  j_day_no += jd - 1;

  let g_day_no = j_day_no + 79;
  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no %= 146097;

  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no %= 36524;
    if (g_day_no >= 365) {
      g_day_no++;
    } else {
      leap = false;
    }
  }

  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;

  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no %= 365;
  }

  const g_days_in_month = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (let i = 0; i < 12; i++) {
    if (g_day_no < g_days_in_month[i]) {
      gm = i + 1;
      break;
    }
    g_day_no -= g_days_in_month[i];
  }
  let gd = g_day_no + 1;

  return { gy, gm, gd };
};

export const isJalaliLeapYear = (jy: number): boolean => {
  const g30 = jalaliToGregorian(jy, 12, 30);
  const jBack = gregorianToJalali(g30.gy, g30.gm, g30.gd);
  return jBack.jy === jy && jBack.jm === 12 && jBack.jd === 30;
};

export const getJalaliMonthDays = (jy: number, jm: number): number => {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
};

export const getJalaliMonthName = (jm: number): string => {
  return JALALI_MONTH_NAMES[jm - 1] || '';
};

export const getRelativeDayLabel = (dateStr: string, lang: Language = 'en'): string => {
  const todayStr = getTodayKey();
  const tomorrowStr = shiftDate(todayStr, 1);
  const yesterdayStr = shiftDate(todayStr, -1);

  if (dateStr === todayStr) return lang === 'fa' ? 'امروز' : 'Today';
  if (dateStr === tomorrowStr) return lang === 'fa' ? 'فردا' : 'Tomorrow';
  if (dateStr === yesterdayStr) return lang === 'fa' ? 'دیروز' : 'Yesterday';

  if (lang === 'fa') {
    return formatDateDisplay(dateStr, { showDayOfWeek: true, includeYear: false, lang: 'fa' });
  }

  const d = parseDateKey(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

export const formatDateDisplay = (
  dateStr: string,
  options: { showDayOfWeek?: boolean; includeYear?: boolean; lang?: Language } = { showDayOfWeek: true, includeYear: true, lang: 'en' }
): string => {
  if (!dateStr) return '';
  const lang = options.lang || 'en';

  if (lang === 'fa') {
    const [y, m, d] = dateStr.split('-').map((num) => parseInt(num, 10));
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const { jy, jm, jd } = gregorianToJalali(y, m, d);
      const curDate = new Date(y, m - 1, d);
      const weekdayIndex = (curDate.getDay() + 1) % 7;
      const weekdayName = JALALI_WEEKDAYS_LONG[weekdayIndex];
      const monthName = JALALI_MONTH_NAMES[jm - 1];

      if (options.showDayOfWeek) {
        return `${weekdayName}، ${toPersianDigits(jd)} ${monthName}${options.includeYear ? ` ${toPersianDigits(jy)}` : ''}`;
      }
      return `${toPersianDigits(jd)} ${monthName}${options.includeYear ? ` ${toPersianDigits(jy)}` : ''}`;
    }
  }

  const d = parseDateKey(dateStr);
  const weekday = options.showDayOfWeek ? d.toLocaleDateString(undefined, { weekday: 'long' }) + ', ' : '';
  const monthDay = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const year = options.includeYear ? `, ${d.getFullYear()}` : '';
  return `${weekday}${monthDay}${year}`;
};

export const getMonthName = (year: number, monthIndex: number, lang: Language = 'en'): string => {
  if (lang === 'fa') {
    if (year >= 1300 && year <= 1600) {
      const jm = monthIndex >= 1 && monthIndex <= 12 ? monthIndex : monthIndex + 1;
      return `${JALALI_MONTH_NAMES[jm - 1]} ${toPersianDigits(year)}`;
    }
    const gDate = new Date(year, monthIndex, 1);
    const j = gregorianToJalali(gDate.getFullYear(), gDate.getMonth() + 1, gDate.getDate());
    return `${JALALI_MONTH_NAMES[j.jm - 1]} ${toPersianDigits(j.jy)}`;
  }
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

export const getMonthCalendarMatrix = (year: number, monthIndex: number): CalendarDay[] => {
  const todayStr = getTodayKey();
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

  const calendarDays: CalendarDay[] = [];

  // Previous month trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = daysInPrevMonth - i;
    const prevDate = new Date(year, monthIndex - 1, dayNumber);
    const dateStr = formatDateKey(prevDate);
    calendarDays.push({
      dateStr,
      dayNumber,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
    });
  }

  // Current month days
  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
    const curDate = new Date(year, monthIndex, dayNumber);
    const dateStr = formatDateKey(curDate);
    calendarDays.push({
      dateStr,
      dayNumber,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
    });
  }

  // Next month leading days (fill out remaining slots to complete rows of 7, up to 35 or 42)
  const totalSlots = calendarDays.length <= 35 ? 35 : 42;
  const remaining = totalSlots - calendarDays.length;
  for (let dayNumber = 1; dayNumber <= remaining; dayNumber++) {
    const nextDate = new Date(year, monthIndex + 1, dayNumber);
    const dateStr = formatDateKey(nextDate);
    calendarDays.push({
      dateStr,
      dayNumber,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
    });
  }

  return calendarDays;
};

export const getJalaliMonthCalendarMatrix = (jy: number, jm: number): CalendarDay[] => {
  const todayStr = getTodayKey();
  const daysInMonth = getJalaliMonthDays(jy, jm);

  // Prev month info
  const prevJYear = jm === 1 ? jy - 1 : jy;
  const prevJMonth = jm === 1 ? 12 : jm - 1;
  const daysInPrevMonth = getJalaliMonthDays(prevJYear, prevJMonth);

  // First day of current Jalali month in Gregorian
  const firstG = jalaliToGregorian(jy, jm, 1);
  const firstDate = new Date(firstG.gy, firstG.gm - 1, firstG.gd);
  // In Persian calendar, week starts on Saturday (0) to Friday (6)
  // JS getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const startDayOfWeek = (firstDate.getDay() + 1) % 7;

  const calendarDays: CalendarDay[] = [];

  // Trailing days from previous month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = daysInPrevMonth - i;
    const g = jalaliToGregorian(prevJYear, prevJMonth, dayNumber);
    const prevDate = new Date(g.gy, g.gm - 1, g.gd);
    const dateStr = formatDateKey(prevDate);
    calendarDays.push({
      dateStr,
      dayNumber,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
      persianDayNumber: toPersianDigits(dayNumber),
    });
  }

  // Current month days
  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
    const g = jalaliToGregorian(jy, jm, dayNumber);
    const curDate = new Date(g.gy, g.gm - 1, g.gd);
    const dateStr = formatDateKey(curDate);
    calendarDays.push({
      dateStr,
      dayNumber,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
      persianDayNumber: toPersianDigits(dayNumber),
    });
  }

  // Next month leading days (fill rows of 7, up to 35 or 42)
  const totalSlots = calendarDays.length <= 35 ? 35 : 42;
  const remaining = totalSlots - calendarDays.length;
  const nextJYear = jm === 12 ? jy + 1 : jy;
  const nextJMonth = jm === 12 ? 1 : jm + 1;

  for (let dayNumber = 1; dayNumber <= remaining; dayNumber++) {
    const g = jalaliToGregorian(nextJYear, nextJMonth, dayNumber);
    const nextDate = new Date(g.gy, g.gm - 1, g.gd);
    const dateStr = formatDateKey(nextDate);
    calendarDays.push({
      dateStr,
      dayNumber,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
      persianDayNumber: toPersianDigits(dayNumber),
    });
  }

  return calendarDays;
};

