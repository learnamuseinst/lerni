import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi } from 'lucide-react';
import { useI18n } from '../utils/i18n';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showReconnectedToast, setShowReconnectedToast] = useState<boolean>(false);
  const { language } = useI18n();
  const isFa = language === 'fa';

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedToast(true);
      const timer = setTimeout(() => {
        setShowReconnectedToast(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div id="offline-indicator-wrapper" className="fixed bottom-20 sm:bottom-4 left-4 rtl:left-auto rtl:right-4 z-40 flex flex-col gap-2 pointer-events-none">
      {/* Offline Status Badge */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            id="offline-status-badge"
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#E8F8D8] dark:bg-[#1E3800] border-2 border-[#80D141] text-[#1C3700] dark:text-[#A2EB68] text-xs font-bold shadow-lg backdrop-blur-md"
            role="status"
            aria-live="polite"
          >
            <div className="relative flex items-center justify-center">
              <WifiOff className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            </div>
            <span>{isFa ? 'حالت آفلاین' : 'Offline Mode'}</span>
            <span className="text-[#3B7E10] dark:text-[#80D141]/80 font-medium text-[11px] hidden sm:inline">
              {isFa ? '• ذخیره محلی' : '• Saved locally'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Online Reconnected Toast */}
      <AnimatePresence>
        {showReconnectedToast && isOnline && (
          <motion.div
            id="online-status-toast"
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#80D141] text-[#0F2600] text-xs font-bold shadow-lg"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>{isFa ? 'اتصال مجدد برقرار شد' : 'Back Online'}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
