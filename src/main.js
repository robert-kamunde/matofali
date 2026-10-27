import './styles/main.css';
import { App } from './ui/app.js';
import { createStorageBackend, attachLifecycle, vibrate, prefersReducedMotion } from './platform/platform.js';

async function boot() {
  const storageBackend = await createStorageBackend();
  const params = new URLSearchParams(location.search);
  const platform = { vibrate, exitApp: () => {} };
  const app = new App({
    storageBackend,
    platform,
    version: __APP_VERSION__,
    seed: params.has('seed') ? Number(params.get('seed')) : undefined,
    reducedMotion: prefersReducedMotion(),
  });
  const lifecycle = await attachLifecycle({
    onBack: () => app.handleBack(),
    onBackground: () => app.onBackground(),
    onForeground: () => app.onForeground(),
  });
  platform.exitApp = lifecycle.exitApp;
  // Test hook for the browser end-to-end tests only.
  if (params.has('e2e')) globalThis.__matofali = app;
  await app.start();
}

boot();
