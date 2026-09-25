import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Star, Plus } from 'lucide-react';
import { BujoEntry } from '../../types';
import { 
  getMonthCalendarMatrix, 
  getJalaliMonthCalendarMatrix,
  getMonthName, 
  getJalaliMonthName,
  getTodayKey, 
  parseDateKey, 
  formatDateKey,
  formatDateDisplay,
  gregorianToJalali,
  toPersianDigits,
  JALALI_WEEKDAYS_SHORT,
  JALALI_WEEKDAYS_LONG
} from '../../utils/dateUtils';
import { soundEngine } from '../../utils/audioSynth';
import { useI18n } from '../../utils/i18n';

interface JournalCalendarProps {
  entries: BujoEntry[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onClose?: () => void;
}

const GREGORIAN_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const GREGORIAN_WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const JournalCalendar: React.FC<JournalCalendarProps> = ({
  entries,
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  const { t, language } = useI18n();
  const isPersian = language === 'fa';
  const todayStr = getTodayKey();

  const getInitialView = (dateStr: string, fa: boolean) => {
    const [gy, gm, gd] = (dateStr || todayStr).split('-').map((n) => parseInt(n, 10));
    if (fa) {
      const { jy, jm } = gregorianToJalali(gy, gm, gd);
      return { year: jy, month: jm }; // 1..12
    }
    const d = new Date(gy, gm - 1, gd);
    return { year: d.getFullYear(), month: d.getMonth() }; // 0..11
  };

  const [viewYear, setViewYear] = useState<number>(() => getInitialView(selectedDate, isPersian).year);
  const [viewMonth, setViewMonth] = useState<number>(() => getInitialView(selectedDate, isPersian).month);

  useEffect(() => {
    const next = getInitialView(selectedDate, isPersian);
    setViewYear(next.year);
    setViewMonth(next.month);
  }, [isPersian, selectedDate]);

  const handlePrevMonth = () => {
    soundEngine.playPop();
    if (isPersian) {
      if (viewMonth === 1) {
        setViewMonth(12);
        setViewYear((prev) => prev - 1);
      } else {
        setViewMonth((prev) => prev - 1);
      }
    } else {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear((prev) => prev - 1);
      } else {
        setViewMonth((prev) => prev - 1);
      }
    }
  };

  const handleNextMonth = () => {
    soundEngine.playPop();
    if (isPersian) {
      if (viewMonth === 12) {
        setViewMonth(1);
        setViewYear((prev) => prev + 1);
      } else {
        setViewMonth((prev) => prev + 1);
      }
    } else {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear((prev) => prev + 1);
      } else {
        setViewMonth((prev) => prev + 1);
      }
    }
  };

  const handleJumpToToday = () => {
    soundEngine.playPop();
    const todayTarget = getInitialView(todayStr, isPersian);
    setViewYear(todayTarget.year);
    setViewMonth(todayTarget.month);
    onSelectDate(todayStr);
  };

  // Group entries by date
  type DateMeta = { total: number; tasks: number; completedTasks: number; events: number; notes: number; hasPriority: boolean };
  const initialEntriesByDate: Record<string, DateMeta> = {};
  const entriesByDate = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = { total: 0, tasks: 0, completedTasks: 0, events: 0, notes: 0, hasPriority: false };
    }
    acc[entry.date].total += 1;
    if (entry.type === 'task') {
      acc[entry.date].tasks += 1;
      if (entry.status === 'completed') {
        acc[entry.date].completedTasks += 1;
      }
    } else if (entry.type === 'event') {
      acc[entry.date].events += 1;
    } else if (entry.type === 'note') {
      acc[entry.date].notes += 1;
    }
    if (entry.isPriority) {
      acc[entry.date].hasPriority = true;
    }
    return acc;
  }, initialEntriesByDate);

  const calendarDays = isPersian
    ? getJalaliMonthCalendarMatrix(viewYear, viewMonth)
    : getMonthCalendarMatrix(viewYear, viewMonth);

  const weekdays = isPersian ? JALALI_WEEKDAYS_SHORT : GREGORIAN_WEEKDAYS;
  const weekdaysTitles = isPersian ? JALALI_WEEKDAYS_LONG : GREGORIAN_WEEKDAYS_LONG;

  const headerMonthTitle = isPersian
    ? `${getJalaliMonthName(viewMonth)} ${toPersianDigits(viewYear)}`
    : getMonthName(viewYear, viewMonth, 'en');

  return (
    <div className="p-4 sm:p-5 rounded-[24px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-xs space-y-4">
      
      {/* Calendar Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] flex items-center justify-center font-bold">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {headerMonthTitle}
            </h3>
            <p className="text-[11px] text-[#485B44] dark:text-[#9EB598] font-medium">
              {isPersian ? 'انتخاب شده: ' : 'Selected: '}
              <span className="font-bold text-[#151E14] dark:text-[#E8F2E4]">
                {formatDateDisplay(selectedDate, { showDayOfWeek: true, includeYear: false, lang: language })}
              </span>
            </p>
          </div>
        </div>

        {/* Navigation & Jump to Today */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleJumpToToday}
            className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EDF6E8] dark:bg-[#202E1E] text-[#3B7E10] dark:text-[#80D141] hover:bg-[#DDF4CD] transition-colors border border-[#DCEAD4] dark:border-[#263722]"
          >
            {isPersian ? 'امروز' : 'Today'}
          </button>

          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-[#EDF6E8] dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] transition-colors"
            title={isPersian ? 'ماه قبل' : 'Previous Month'}
          >
            <ChevronLeft className={`w-4 h-4 ${isPersian ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-[#EDF6E8] dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] dark:hover:text-[#E8F2E4] transition-colors"
            title={isPersian ? 'ماه بعد' : 'Next Month'}
          >
            <ChevronRight className={`w-4 h-4 ${isPersian ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#485B44] dark:text-[#9EB598] pb-1 border-b border-[#DCEAD4]/70 dark:border-[#263722]/70">
        {weekdays.map((day, idx) => (
          <div key={day} className="py-1" title={weekdaysTitles[idx]}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Day Cells */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {calendarDays.map((calDay) => {
          const isSelected = calDay.dateStr === selectedDate;
          const meta = entriesByDate[calDay.dateStr];
          const hasEntries = Boolean(meta && meta.total > 0);
          const allTasksDone = Boolean(meta && meta.tasks > 0 && meta.completedTasks === meta.tasks);

          return (
            <button
              key={calDay.dateStr}
              onClick={() => {
                soundEngine.playPop();
                onSelectDate(calDay.dateStr);
              }}
              className={`min-h-[46px] sm:min-h-[52px] p-1.5 rounded-2xl flex flex-col items-center justify-between transition-all relative border text-center ${
                isSelected
                  ? 'bg-[#80D141] text-[#0F2600] border-[#80D141] shadow-md font-bold z-10 scale-[1.02]'
                  : calDay.isToday
                  ? 'bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] border-[#80D141]/60 font-bold'
                  : calDay.isCurrentMonth
                  ? 'bg-white dark:bg-[#1A2618] text-[#151E14] dark:text-[#E8F2E4] border-[#DCEAD4] dark:border-[#263722] hover:border-[#80D141]/50 hover:bg-[#F2F9ED]'
                  : 'bg-transparent text-[#485B44]/40 dark:text-[#9EB598]/30 border-transparent hover:border-[#DCEAD4] dark:hover:border-[#263722]'
              }`}
            >
              {/* Day Number */}
              <div className="flex items-center justify-center gap-0.5 text-xs font-semibold">
                <span>{isPersian && calDay.persianDayNumber ? calDay.persianDayNumber : calDay.dayNumber}</span>
                {meta?.hasPriority && (
                  <Star className={`w-2.5 h-2.5 fill-current ${isSelected ? 'text-[#0F2600]' : 'text-amber-500'}`} />
                )}
              </div>

              {/* Badges / Dots for Entries */}
              <div className="flex items-center justify-center gap-1 mt-0.5 w-full">
                {hasEntries ? (
                  <div className="flex items-center gap-0.5 flex-wrap justify-center">
                    {/* Tasks indicator */}
                    {meta.tasks > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected
                            ? 'bg-[#0F2600]'
                            : allTasksDone
                            ? 'bg-[#3B7E10] dark:bg-[#80D141]'
                            : 'bg-amber-500'
                        }`}
                        title={
                          isPersian
                            ? `${toPersianDigits(meta.completedTasks)} از ${toPersianDigits(meta.tasks)} کار تکمیل شده`
                            : `${meta.completedTasks}/${meta.tasks} tasks done`
                        }
                      />
                    )}
                    {/* Events indicator */}
                    {meta.events > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-[#0F2600]' : 'bg-blue-500'
                        }`}
                        title={isPersian ? `${toPersianDigits(meta.events)} رویداد` : `${meta.events} event(s)`}
                      />
                    )}
                    {/* Notes indicator */}
                    {meta.notes > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-[#0F2600]' : 'bg-purple-500'
                        }`}
                        title={isPersian ? `${toPersianDigits(meta.notes)} یادداشت` : `${meta.notes} note(s)`}
                      />
                    )}
                  </div>
                ) : (
                  <span className="w-1.5 h-1.5 opacity-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#DCEAD4]/70 dark:border-[#263722]/70 text-[11px] text-[#485B44] dark:text-[#9EB598]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> {isPersian ? 'کار در انتظار' : 'Pending Task'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#3B7E10] dark:bg-[#80D141]" /> {isPersian ? 'تکمیل شده' : 'Complete'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> {isPersian ? 'رویداد' : 'Event'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> {isPersian ? 'یادداشت' : 'Note'}
          </span>
        </div>

        <button
          onClick={() => {
            soundEngine.playPop();
            handleJumpToToday();
          }}
          className="text-[#3B7E10] dark:text-[#80D141] font-bold hover:underline"
        >
          {isPersian
            ? `پرش به امروز (${formatDateDisplay(todayStr, { showDayOfWeek: false, includeYear: false, lang: 'fa' })})`
            : `Jump to Today (${formatDateDisplay(todayStr, { showDayOfWeek: false, includeYear: false })})`}
        </button>
      </div>

    </div>
  );
};

