# Matofali: Brick Breaker

The first Tanzanian-made brick game. An offline, free Android game with four levels drawn in bricks (Bendera, Kilimanjaro, Mlango wa Zanzibar and Serengeti), in Swahili and English. It has no ads, accounts, analytics or networking.

Built with Vite, plain JavaScript and Canvas 2D, and packaged for Android with Capacitor 8.

## Requirements

- Node.js 22 or newer
- For Android builds: Android Studio (JDK 21, Android SDK 36), **or** the GitHub Actions workflow included in this repository

## Install

```
npm ci
```

npm 10.9 has a bug that can stop a *fresh* install (no lockfile) with "Cannot read properties of null (reading 'edgesOut')". `npm ci` from the lockfile works. To add or upgrade packages, use `npx npm@11.6.2 install <package>`.

## Run and test

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server in the browser |
| `npm run build` | Production web build into `dist/` |
| `npm run lint` | ESLint |
| `npm test` | 77 unit tests (Vitest) |
| `npm run test:e2e` | 40 browser tests (Playwright, phone profiles). The first time, run `npx playwright install chromium`. |
| `npm run check` | All of the above in order |

Add `?seed=123` to the URL for a repeatable game.

## Build for Android

**With GitHub (no Android tools needed):** push the repository to GitHub. `.github/workflows/android.yml` runs the tests and builds `app-debug.apk` and `app-release.aab` as downloadable artifacts. Add the four signing secrets listed in `docs/RELEASE_CHECKLIST.md` to get a signed AAB.

**With Android Studio:**

```
npm ci
npm run cap:sync          # builds the web app and copies it into android/
cd android
./gradlew assembleDebug   # android/app/build/outputs/apk/debug/app-debug.apk
./gradlew bundleRelease   # needs android/keystore.properties (see below)
```

`android/keystore.properties` (never commit it; it is in `.gitignore`):

```
storeFile=/full/path/to/matofali-upload.jks
storePassword=...
keyAlias=matofali
keyPassword=...
```

Regenerate the icon and splash after changing the artwork: `node scripts/make-brand-assets.mjs && npm run assets:android`.

## Where things are

| Path | Contents |
| --- | --- |
| `src/config/rules.js` | Every gameplay number (sizes, speeds, scoring, power-up odds) |
| `src/config/levels.js` | The four level maps |
| `src/engine/` | Game state machine, physics, seeded random numbers. No browser code; fully unit-tested. |
| `src/render/` | Canvas drawing |
| `src/ui/app.js` | Screens, input, Back button, pause on background |
| `src/i18n/` | Swahili and English text |
| `src/storage/`, `src/platform/` | Saved data and Android integration |
| `tests/unit/`, `tests/e2e/` | Tests |
| `android/` | Capacitor Android project |
| `store/` | Play Store icon, feature graphic, screenshots, listing text |
| `docs/` | Audit, architecture, decisions, plans, QA report, release checklist, handover |

Start with `docs/HANDOVER.md`.

## Licence

Code and artwork are the project's own. Fonts are under the SIL Open Font License; see `docs/ASSET_LICENSES.md`.
