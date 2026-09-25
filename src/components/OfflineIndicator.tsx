import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi, HardDrive, Download, CheckCircle2 } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showReconnectedToast, setShowReconnectedToast] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

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

    // Listen for PWA installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div id="offline-pwa-indicator-wrapper" className="fixed bottom-20 sm:bottom-4 left-4 z-40 flex flex-col gap-2 pointer-events-none">
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
            <span>Offline Mode</span>
            <span className="text-[#3B7E10] dark:text-[#80D141]/80 font-medium text-[11px] hidden sm:inline">
              • Saved locally
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
            <span>Back Online</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Install Button (shown when install prompt is available) */}
      <AnimatePresence>
        {deferredPrompt && !isInstalled && (
          <motion.button
            id="btn-install-pwa-app"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={handleInstallApp}
            className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#F8FAF5] dark:bg-[#182316] hover:bg-[#E8F8D8] text-[#151E14] dark:text-[#E8F2E4] border border-[#DCEAD4] dark:border-[#263722] text-xs font-bold shadow-md active:scale-95 transition-all"
            title="Install Lerni as a native app on your device"
          >
            <Download className="w-3.5 h-3.5 text-[#3B7E10] dark:text-[#80D141]" />
            <span>Install App</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
