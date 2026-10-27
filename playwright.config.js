import { defineConfig, devices } from '@playwright/test';

// Browser end-to-end tests against the production build (npm run build first).
// They exercise the same web bundle the Android app ships, in a phone-sized
// touch browser. They do not replace testing on a real Android device.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'pixel-5', use: { ...devices['Pixel 5'] } },
    {
      name: 'budget-phone-360x640',
      use: { browserName: 'chromium', viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
  ],
});
