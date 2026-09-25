import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  Sparkles,
  CalendarDays
} from 'lucide-react';
import { 
  formatDateKey, 
  parseDateKey, 
  getTodayKey, 
  shiftDate, 
  formatDateDisplay, 
  getMonthName, 
  getJalaliMonthName,
  getMonthCalendarMatrix,
  getJalaliMonthCalendarMatrix,
  gregorianToJalali,
  toPersianDigits,
  JALALI_WEEKDAYS_SHORT,
  JALALI_WEEKDAYS_LONG
} from '../../utils/dateUtils';
import { soundEngine } from '../../utils/audioSynth';
import { useI18n } from '../../utils/i18n';

interface MaterialExpressiveDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (newDate: string) => void;
  label?: string;
  showQuickPresets?: boolean;
  className?: string;
  buttonClassName?: string;
  id?: string;
  placeholder?: string;
}

export const MaterialExpressiveDatePicker: React.FC<MaterialExpressiveDatePickerProps> = ({
  value,
  onChange,
  label,
  showQuickPresets = true,
  className = '',
  buttonClassName = '',
  id,
  placeholder = 'Select date'
}) => {
  const { language } = useI18n();
  const isPersian = language === 'fa';
  const [isOpen, setIsOpen] = useState(false);
  const todayStr = getTodayKey();
  const selectedDateStr = value || todayStr;

  // Selected date temporary state while modal is open
  const [tempDate, setTempDate] = useState<string>(selectedDateStr);
  
  const getInitialView = (dateStr: string, fa: boolean) => {
    const [gy, gm, gd] = (dateStr || todayStr).split('-').map((n) => parseInt(n, 10));
    if (fa) {
      const { jy, jm } = gregorianToJalali(gy, gm, gd);
      return { year: jy, month: jm }; // 1..12
    }
    const d = new Date(gy, gm - 1, gd);
    return { year: d.getFullYear(), month: d.getMonth() }; // 0..11
  };

  // Navigation state for calendar month/year
  const [viewYear, setViewYear] = useState<number>(() => getInitialView(selectedDateStr, isPersian).year);
  const [viewMonth, setViewMonth] = useState<number>(() => getInitialView(selectedDateStr, isPersian).month);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    if (value) {
      setTempDate(value);
      const target = getInitialView(value, isPersian);
      setViewYear(target.year);
      setViewMonth(target.month);
    }
  }, [value, isOpen, isPersian]);

  const handleOpen = () => {
    soundEngine.playPop();
    const cur = value || todayStr;
    setTempDate(cur);
    const target = getInitialView(cur, isPersian);
    setViewYear(target.year);
    setViewMonth(target.month);
    setIsYearPickerOpen(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    soundEngine.playPop();
    setIsOpen(false);
  };

  const handleConfirm = () => {
    soundEngine.playGentleChime();
    onChange(tempDate);
    setIsOpen(false);
  };

  const handleSelectDay = (dateStr: string) => {
    soundEngine.playPop();
    setTempDate(dateStr);
  };

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

  const calendarDays = isPersian
    ? getJalaliMonthCalendarMatrix(viewYear, viewMonth)
    : getMonthCalendarMatrix(viewYear, viewMonth);

  // Year options for fast jump
  const yearRange = Array.from({ length: 21 }, (_, i) => viewYear - 10 + i);

  // Quick preset dates
  const tomorrowStr = shiftDate(todayStr, 1);
  const nextTwoDaysStr = shiftDate(todayStr, 2);
  const nextWeekStr = shiftDate(todayStr, 7);

  const monthTitle = isPersian
    ? `${getJalaliMonthName(viewMonth)} ${toPersianDigits(viewYear)}`
    : getMonthName(viewYear, viewMonth, 'en');

  const weekdays = isPersian ? JALALI_WEEKDAYS_SHORT : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weekdaysTitles = isPersian ? JALALI_WEEKDAYS_LONG : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button (Material 3 Expressive Outlined / Tonal Chip) */}
      <button
        id={id}
        type="button"
        onClick={handleOpen}
        className={`flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#EDF6E8] dark:bg-[#1E291C] border border-[#DCEAD4] dark:border-[#263722] hover:border-[#80D141] dark:hover:border-[#80D141] text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] transition-all cursor-pointer shadow-2xs group ${buttonClassName}`}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141] transition-transform group-hover:scale-110" />
        <span>
          {value
            ? formatDateDisplay(value, { showDayOfWeek: true, includeYear: true, lang: language })
            : placeholder}
        </span>
        {value === todayStr && (
          <span className="px-1.5 py-0.5 rounded-md bg-[#80D141]/20 text-[#255000] dark:text-[#A2EB68] text-[10px] font-bold">
            {isPersian ? 'امروز' : 'Today'}
          </span>
        )}
      </button>

      {/* Material 3 Expressive Date Picker Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="w-full max-w-sm sm:max-w-md rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* MD3 Expressive Header */}
              <div className="px-6 pt-5 pb-4 bg-[#EDF6E8] dark:bg-[#1C281A] border-b border-[#DCEAD4] dark:border-[#263722]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#485B44] dark:text-[#9EB598]">
                    {label || (isPersian ? 'انتخاب تاریخ' : 'Select Date')}
                  </span>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1 rounded-full text-[#485B44] dark:text-[#9EB598] hover:bg-[#DCEAD4] dark:hover:bg-[#263722] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Prominent Large Date Headline */}
                <div className="mt-1">
                  <h3 className="font-display text-xl sm:text-2xl font-extrabold text-[#151E14] dark:text-[#E8F2E4] tracking-tight">
                    {formatDateDisplay(tempDate, {
                      showDayOfWeek: true,
                      includeYear: true,
                      lang: language
                    })}
                  </h3>
                </div>

                {/* Quick Presets Bar */}
                {showQuickPresets && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3">
                    {[
                      { label: isPersian ? 'امروز' : 'Today', date: todayStr },
                      { label: isPersian ? 'فردا' : 'Tomorrow', date: tomorrowStr },
                      { label: isPersian ? '۲ روز بعد' : '+2 Days', date: nextTwoDaysStr },
                      { label: isPersian ? '۱ هفته بعد' : '+1 Week', date: nextWeekStr },
                    ].map((preset) => {
                      const isSelected = tempDate === preset.date;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            handleSelectDay(preset.date);
                            const target = getInitialView(preset.date, isPersian);
                            setViewYear(target.year);
                            setViewMonth(target.month);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                            isSelected
                              ? 'bg-[#80D141] text-[#0F2600] shadow-xs scale-105'
                              : 'bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722] hover:bg-[#EDF6E8]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* MD3 Calendar Body */}
              <div className="p-4 sm:p-5">
                {/* Month & Year Navigation Toolbar */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playPop();
                      setIsYearPickerOpen(!isYearPickerOpen);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-[#151E14] dark:text-[#E8F2E4] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] transition-colors flex items-center gap-1.5"
                  >
                    <span>{monthTitle}</span>
                    <span className="text-[10px] text-[#3B7E10] dark:text-[#80D141]">
                      {isYearPickerOpen ? '▲' : '▼'}
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-full hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] transition-colors"
                      title={isPersian ? 'ماه قبل' : 'Previous month'}
                    >
                      <ChevronLeft className={`w-4 h-4 ${isPersian ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-full hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] transition-colors"
                      title={isPersian ? 'ماه بعد' : 'Next month'}
                    >
                      <ChevronRight className={`w-4 h-4 ${isPersian ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {isYearPickerOpen ? (
                  /* Year Selector Grid */
                  <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto p-2 no-scrollbar">
                    {yearRange.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          setViewYear(yr);
                          setIsYearPickerOpen(false);
                          soundEngine.playPop();
                        }}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          yr === viewYear
                            ? 'bg-[#80D141] text-[#0F2600] shadow-xs font-extrabold'
                            : 'bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8]'
                        }`}
                      >
                        {isPersian ? toPersianDigits(yr) : yr}
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Days of Week Header and Calendar Matrix */
                  <div>
                    <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                      {weekdays.map((day, idx) => (
                        <div
                          key={idx}
                          title={weekdaysTitles[idx]}
                          className="text-[11px] font-bold text-[#485B44] dark:text-[#9EB598] py-1"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((d, index) => {
                        const isSelected = d.dateStr === tempDate;
                        const isToday = d.dateStr === todayStr;

                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSelectDay(d.dateStr)}
                            className={`h-9 w-full rounded-2xl flex flex-col items-center justify-center text-xs font-bold transition-all relative ${
                              isSelected
                                ? 'bg-[#80D141] text-[#0F2600] font-extrabold shadow-md scale-105 z-10'
                                : d.isCurrentMonth
                                ? 'text-[#151E14] dark:text-[#E8F2E4] hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E]'
                                : 'text-[#8CA086] dark:text-[#556950] opacity-40 hover:opacity-80'
                            }`}
                          >
                            <span>{isPersian && d.persianDayNumber ? d.persianDayNumber : d.dayNumber}</span>
                            {isToday && !isSelected && (
                              <span className="w-1 h-1 rounded-full bg-[#80D141] absolute bottom-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* MD3 Dialog Actions */}
              <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-[#EDF6E8]/60 dark:bg-[#1C281A]/60 border-t border-[#DCEAD4] dark:border-[#263722]">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-full text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#DCEAD4] dark:hover:bg-[#263722] transition-colors"
                >
                  {isPersian ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-5 py-2 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isPersian ? 'تایید تاریخ' : 'Select Date'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

