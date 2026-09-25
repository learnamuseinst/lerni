import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  X, 
  Check, 
  RotateCcw,
  Sparkles,
  Keyboard,
  Clock3
} from 'lucide-react';
import { soundEngine } from '../../utils/audioSynth';

interface MaterialExpressiveTimePickerProps {
  value: string; // "HH:mm" in 24h format e.g. "14:30", or ""
  onChange: (newTime: string) => void;
  label?: string;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
  buttonClassName?: string;
  id?: string;
}

export const MaterialExpressiveTimePicker: React.FC<MaterialExpressiveTimePickerProps> = ({
  value,
  onChange,
  label = 'Select Time',
  placeholder = 'Set time',
  allowClear = true,
  className = '',
  buttonClassName = '',
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeUnit, setActiveUnit] = useState<'hour' | 'minute'>('hour');
  const [viewMode, setViewMode] = useState<'dial' | 'presets'>('dial');

  // Internal time breakdown state
  // 12-hour format internally for MD3 expressive picker
  const [hour12, setHour12] = useState<number>(12);
  const [minute, setMinute] = useState<number>(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  // Parse 24-hour HH:mm string
  const parse24Hour = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) {
      const now = new Date();
      let h = now.getHours();
      const m = Math.round(now.getMinutes() / 5) * 5 % 60;
      const p: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return { h, m, p };
    }
    const [hStr, mStr] = timeStr.split(':');
    let h24 = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    const p: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
    let h = h24 % 12 || 12;
    return { h, m, p };
  };

  // Convert 12h + period to 24h HH:mm string
  const to24HourStr = (h: number, m: number, p: 'AM' | 'PM'): string => {
    let h24 = h % 12;
    if (p === 'PM') h24 += 12;
    const hPad = h24 < 10 ? `0${h24}` : `${h24}`;
    const mPad = m < 10 ? `0${m}` : `${m}`;
    return `${hPad}:${mPad}`;
  };

  // Format for display
  const formatDisplayTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const { h, m, p } = parse24Hour(timeStr);
    const mPad = m < 10 ? `0${m}` : `${m}`;
    return `${h}:${mPad} ${p}`;
  };

  useEffect(() => {
    if (value) {
      const { h, m, p } = parse24Hour(value);
      setHour12(h);
      setMinute(m);
      setPeriod(p);
    }
  }, [value, isOpen]);

  const handleOpen = () => {
    soundEngine.playPop();
    const { h, m, p } = parse24Hour(value);
    setHour12(h);
    setMinute(m);
    setPeriod(p);
    setActiveUnit('hour');
    setIsOpen(true);
  };

  const handleClose = () => {
    soundEngine.playPop();
    setIsOpen(false);
  };

  const handleConfirm = () => {
    soundEngine.playGentleChime();
    const time24 = to24HourStr(hour12, minute, period);
    onChange(time24);
    setIsOpen(false);
  };

  const handleClear = () => {
    soundEngine.playPop();
    onChange('');
    setIsOpen(false);
  };

  const handleSetCurrentTime = () => {
    soundEngine.playPop();
    const now = new Date();
    let h = now.getHours();
    const m = Math.round(now.getMinutes() / 5) * 5 % 60;
    const p: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    setHour12(h);
    setMinute(m);
    setPeriod(p);
  };

  const adjustMinutes = (delta: number) => {
    soundEngine.playPop();
    let total = (hour12 % 12) * 60 + minute + (period === 'PM' ? 720 : 0) + delta;
    total = (total + 1440) % 1440;
    const h24 = Math.floor(total / 60);
    const newM = total % 60;
    const newP: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
    const newH = h24 % 12 || 12;
    setHour12(newH);
    setMinute(newM);
    setPeriod(newP);
  };

  // Clock Dial Geometry
  const dialRef = useRef<HTMLDivElement>(null);
  const RADIUS = 88; // radius of clock face
  const CENTER = 110; // center offset in 220px box

  const handleDialClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - CENTER;
    const y = e.clientY - rect.top - CENTER;

    // Calculate angle in degrees from top (12 o'clock = 0 deg)
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    soundEngine.playPop();

    if (activeUnit === 'hour') {
      // 12 hours -> 30 deg per hour
      let h = Math.round(angle / 30) % 12;
      if (h === 0) h = 12;
      setHour12(h);
      // Auto-advance to minute selection in MD3 style
      setActiveUnit('minute');
    } else {
      // 60 minutes -> 6 deg per minute, snap to 5 mins or nearest minute
      let m = Math.round(angle / 6) % 60;
      setMinute(m);
    }
  };

  // Compute angle of active hand
  const currentAngle = activeUnit === 'hour' ? (hour12 % 12) * 30 : minute * 6;
  const handRadians = (currentAngle - 90) * (Math.PI / 180);
  const handX = CENTER + RADIUS * Math.cos(handRadians);
  const handY = CENTER + RADIUS * Math.sin(handRadians);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button (Material 3 Expressive Outlined / Tonal Chip) */}
      <div className="flex items-center gap-1">
        <button
          id={id}
          type="button"
          onClick={handleOpen}
          className={`flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#EDF6E8] dark:bg-[#1E291C] border border-[#DCEAD4] dark:border-[#263722] hover:border-[#80D141] dark:hover:border-[#80D141] text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] transition-all cursor-pointer shadow-2xs group ${buttonClassName}`}
        >
          <Clock className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141] transition-transform group-hover:scale-110" />
          <span>{value ? formatDisplayTime(value) : placeholder}</span>
        </button>

        {value && allowClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playPop();
              onChange('');
            }}
            className="p-1.5 rounded-full text-[#485B44] dark:text-[#9EB598] hover:text-[#B3261E] hover:bg-[#EDF6E8] dark:hover:bg-[#1E291C] transition-colors"
            title="Clear time"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Material 3 Expressive Time Picker Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="w-full max-w-xs sm:max-w-sm rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* MD3 Header */}
              <div className="px-6 pt-5 pb-3 bg-[#EDF6E8] dark:bg-[#1C281A] border-b border-[#DCEAD4] dark:border-[#263722]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#485B44] dark:text-[#9EB598]">
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1 rounded-full text-[#485B44] dark:text-[#9EB598] hover:bg-[#DCEAD4] dark:hover:bg-[#263722] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* MD3 Segmented Time Display */}
                <div className="flex items-center justify-center gap-2 pt-1 pb-1">
                  {/* Hour Box */}
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playPop();
                      setActiveUnit('hour');
                      setViewMode('dial');
                    }}
                    className={`px-4 py-2 rounded-2xl text-3xl font-extrabold font-display transition-all ${
                      activeUnit === 'hour'
                        ? 'bg-[#80D141] text-[#0F2600] shadow-md scale-105 ring-2 ring-[#80D141]'
                        : 'bg-white dark:bg-[#202E1E] text-[#151E14] dark:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#263722]'
                    }`}
                  >
                    {hour12 < 10 ? `0${hour12}` : `${hour12}`}
                  </button>

                  <span className="text-2xl font-black text-[#485B44] dark:text-[#9EB598] animate-pulse">
                    :
                  </span>

                  {/* Minute Box */}
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playPop();
                      setActiveUnit('minute');
                      setViewMode('dial');
                    }}
                    className={`px-4 py-2 rounded-2xl text-3xl font-extrabold font-display transition-all ${
                      activeUnit === 'minute'
                        ? 'bg-[#80D141] text-[#0F2600] shadow-md scale-105 ring-2 ring-[#80D141]'
                        : 'bg-white dark:bg-[#202E1E] text-[#151E14] dark:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#263722]'
                    }`}
                  >
                    {minute < 10 ? `0${minute}` : `${minute}`}
                  </button>

                  {/* AM / PM Segmented Switcher */}
                  <div className="flex flex-col gap-1 ml-1">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playPop();
                        setPeriod('AM');
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                        period === 'AM'
                          ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                          : 'bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722]'
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playPop();
                        setPeriod('PM');
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                        period === 'PM'
                          ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                          : 'bg-white dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] border border-[#DCEAD4] dark:border-[#263722]'
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>

              {/* MD3 Body (Interactive Dial or Keypad/Preset Grid) */}
              <div className="p-4 flex flex-col items-center">
                {/* View Switcher Bar */}
                <div className="flex items-center justify-between w-full mb-3 px-1">
                  <span className="text-xs font-bold text-[#485B44] dark:text-[#9EB598]">
                    {activeUnit === 'hour' ? 'Tap Hour on Clock' : 'Tap Minute on Clock'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === 'dial' ? 'presets' : 'dial')}
                      className="px-2 py-1 rounded-xl text-[11px] font-bold bg-[#EDF6E8] dark:bg-[#202E1E] text-[#3B7E10] dark:text-[#80D141] border border-[#DCEAD4] dark:border-[#263722] hover:bg-[#DDF4CD] transition-colors flex items-center gap-1"
                    >
                      {viewMode === 'dial' ? (
                        <>
                          <Keyboard className="w-3 h-3" />
                          <span>Presets</span>
                        </>
                      ) : (
                        <>
                          <Clock3 className="w-3 h-3" />
                          <span>Clock Dial</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {viewMode === 'dial' ? (
                  /* MD3 Radial Clock Face */
                  <div
                    ref={dialRef}
                    onClick={handleDialClick}
                    className="relative w-[220px] h-[220px] rounded-full bg-[#EDF6E8] dark:bg-[#1E291C] border border-[#DCEAD4] dark:border-[#263722] shadow-inner select-none cursor-pointer flex items-center justify-center"
                  >
                    {/* Center Pivot Point */}
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-[#80D141] z-20" />

                    {/* Clock Arm / Pointer */}
                    <div
                      className="absolute top-1/2 left-1/2 origin-left pointer-events-none z-10"
                      style={{
                        width: `${RADIUS}px`,
                        height: '2px',
                        backgroundColor: '#80D141',
                        transform: `rotate(${currentAngle - 90}deg)`
                      }}
                    >
                      {/* Outer Selection Disk */}
                      <div className="absolute -right-3.5 -top-3.5 w-8 h-8 rounded-full bg-[#80D141] flex items-center justify-center text-xs font-black text-[#0F2600] shadow-md" />
                    </div>

                    {/* Clock Face Numbers */}
                    {activeUnit === 'hour'
                      ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h, i) => {
                          const angle = (i * 30 - 90) * (Math.PI / 180);
                          const x = CENTER + RADIUS * Math.cos(angle) - 12;
                          const y = CENTER + RADIUS * Math.sin(angle) - 12;
                          const isSelected = hour12 === h;

                          return (
                            <div
                              key={h}
                              style={{ left: `${x}px`, top: `${y}px` }}
                              className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors pointer-events-none ${
                                isSelected
                                  ? 'text-[#0F2600] font-black z-20'
                                  : 'text-[#151E14] dark:text-[#E8F2E4]'
                              }`}
                            >
                              {h}
                            </div>
                          );
                        })
                      : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m, i) => {
                          const angle = (i * 30 - 90) * (Math.PI / 180);
                          const x = CENTER + RADIUS * Math.cos(angle) - 12;
                          const y = CENTER + RADIUS * Math.sin(angle) - 12;
                          const isSelected = minute === m;

                          return (
                            <div
                              key={m}
                              style={{ left: `${x}px`, top: `${y}px` }}
                              className={`absolute w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors pointer-events-none ${
                                isSelected
                                  ? 'text-[#0F2600] font-black z-20'
                                  : 'text-[#151E14] dark:text-[#E8F2E4]'
                              }`}
                            >
                              {m < 10 ? `0${m}` : m}
                            </div>
                          );
                        })}
                  </div>
                ) : (
                  /* MD3 Quick Presets Grid */
                  <div className="w-full space-y-3">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Now', action: handleSetCurrentTime },
                        { label: '09:00 AM', h: 9, m: 0, p: 'AM' as const },
                        { label: '12:00 PM', h: 12, m: 0, p: 'PM' as const },
                        { label: '02:30 PM', h: 2, m: 30, p: 'PM' as const },
                        { label: '05:00 PM', h: 5, m: 0, p: 'PM' as const },
                        { label: '08:00 PM', h: 8, m: 0, p: 'PM' as const },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if ('action' in item && item.action) {
                              item.action();
                            } else if (item.h !== undefined) {
                              setHour12(item.h);
                              setMinute(item.m);
                              setPeriod(item.p);
                              soundEngine.playPop();
                            }
                          }}
                          className="px-2 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#202E1E] text-[#151E14] dark:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#263722] hover:bg-[#EDF6E8] dark:hover:bg-[#263722] transition-colors"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Step Increments */}
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      {[-15, -5, +5, +15].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => adjustMinutes(d)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#EDF6E8] dark:bg-[#1E291C] text-[#3B7E10] dark:text-[#80D141] border border-[#DCEAD4] dark:border-[#263722] hover:bg-[#DDF4CD]"
                        >
                          {d > 0 ? `+${d}m` : `${d}m`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* MD3 Dialog Actions */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-[#EDF6E8]/60 dark:bg-[#1C281A]/60 border-t border-[#DCEAD4] dark:border-[#263722]">
                <div>
                  {value && allowClear && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-3 py-1.5 rounded-full text-xs font-bold text-[#B3261E] hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-3.5 py-2 rounded-full text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#DCEAD4] dark:hover:bg-[#263722] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="px-4 py-2 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Set Time</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
