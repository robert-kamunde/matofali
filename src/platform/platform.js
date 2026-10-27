// Everything that differs between the Android app and a plain browser:
// storage, vibration, the Back button and app pause/resume.

import { Capacitor } from '@capacitor/core';
import { localStorageBackend, preferencesBackend } from '../storage/storage.js';

export const isNative = () => Capacitor.isNativePlatform();

export async function createStorageBackend() {
  if (isNative()) {
    const { Preferences } = await import('@capacitor/preferences');
    return preferencesBackend(Preferences);
  }
  return localStorageBackend();
}

export async function vibrate(ms = 120) {
  try {
    if (isNative()) {
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.vibrate({ duration: ms });
    } else {
      globalThis.navigator?.vibrate?.(ms);
    }
  } catch {
    /* vibration is optional */
  }
}

/**
 * Wires the Back button and background/foreground events.
 * handlers: { onBack(): void, onBackground(): void, onForeground(): void }
 */
export async function attachLifecycle({ onBack, onBackground, onForeground }) {
  // Browser fallback (also fires inside the Android WebView).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) onBackground();
    else onForeground();
  });
  globalThis.addEventListener('pagehide', onBackground);
  if (!isNative()) return { exitApp: () => {} };
  const { App } = await import('@capacitor/app');
  await App.addListener('backButton', () => onBack());
  await App.addListener('pause', () => onBackground());
  await App.addListener('resume', () => onForeground());
  return { exitApp: () => App.exitApp() };
}

export function prefersReducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
