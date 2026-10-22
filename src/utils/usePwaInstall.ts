import { useState, useEffect, useCallback } from 'react';

// Store global beforeinstallprompt event so it is never lost regardless of component mount timing
let globalDeferredPrompt: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent default browser banner to control installation UI
    e.preventDefault();
    globalDeferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState<boolean>(() => !!globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  });
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone display mode
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    checkStandalone();

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    const updatePromptState = () => {
      setCanInstall(!!globalDeferredPrompt);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setIsInstalling(false);
    };

    window.addEventListener('pwa-prompt-available', updatePromptState);
    window.addEventListener('pwa-installed', handleAppInstalled);

    // Initial check
    updatePromptState();

    return () => {
      window.removeEventListener('pwa-prompt-available', updatePromptState);
      window.removeEventListener('pwa-installed', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!globalDeferredPrompt) {
      return false;
    }

    try {
      setIsInstalling(true);
      await globalDeferredPrompt.prompt();
      const choiceResult = await globalDeferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
        globalDeferredPrompt = null;
        return true;
      }
    } catch (err) {
      console.warn('PWA install prompt error:', err);
    } finally {
      setIsInstalling(false);
    }

    return false;
  }, []);

  return {
    canInstall,
    isInstalled,
    isInstalling,
    isIos,
    promptInstall,
  };
}
