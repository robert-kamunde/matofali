# Project audit (Phase A)

Audit date: 27 October 2026.

## Starting state

| Item | Found |
| --- | --- |
| Repository | None. No GitHub repository was attached; there was no Git history, `package.json`, build scripts, tests or Android project. |
| Prototype | One file, `matofali.html` (18.6 KB) in the project files, published as a browser artifact. Plain HTML, CSS and JavaScript with a canvas. Functional: verified by loading it in Chromium with no errors and scoring points. |
| Design spec | "Matofali: Game Design and Android Launch Guide" (Claude Doc). Used as the source of truth. |
| Android / Capacitor config | None. |
| Art assets | None as files. All art is drawn in code (canvas). No icon, splash or store graphics. |
| Sound | Prototype synthesises beeps with Web Audio. |
| Fonts | Prototype loaded Bungee and Outfit from Google Fonts over the internet (would break offline). |

## Prototype against the spec

| Area | Prototype | Spec | Gap |
| --- | --- | --- | --- |
| Rules (speeds, hits, scores, power-ups, lives) | Implemented with the same numbers | Same | Matches. Constants scattered through the code. |
| Levels | 4 levels as text grids | 4 named levels | Matches. Grids partly irregular (one row 11 cells wide). |
| Screens | One overlay reused for start, level card, pause and game over | 6 screens incl. settings, how to play | Settings, how to play, privacy, splash and home missing. |
| Language | Swahili/English mixed in fixed strings | Swahili/English with three modes, translation files | Missing. |
| Storage | localStorage for best score and mute | Best score, highest level, sound, vibration, language | Partial. |
| Android lifecycle | None (no Back button, no auto-pause) | Required | Missing. |
| Offline | Fonts from the internet | Fully offline | Gap. |
| Tests | None | Full automated suite | Missing. |
| Architecture | Single closure | Modular, data-driven | Rewrite needed (D-02). |

## Tools available in the development machine

| Tool | Version | Status |
| --- | --- | --- |
| Node.js / npm | 22.22.0 / 10.9.4 | OK. npm 10 has a bug resolving Vitest's optional peers on a fresh install; `npm ci` from the lockfile works. |
| Java | OpenJDK 21 | OK |
| Gradle | 8.14.3 (wrapper downloads fine) | OK |
| Android SDK | Not installed | **Blocked**: `dl.google.com` returns HTTP 403 through the network proxy, so neither the SDK nor the Android Gradle Plugin can be downloaded. Confirmed by running `./gradlew help`: "Could not GET https://dl.google.com/dl/android/maven2/com/android/tools/build/gradle/8.13.0/gradle-8.13.0.pom. Received status code 403". |
| Android emulator | Not possible (no SDK, no `/dev/kvm`) | Blocked |
| Chromium + Playwright | 1.63 | OK, used for browser end-to-end tests |
| npm registry | Reachable | OK |

## Risks

1. **No Android build in this environment.** Mitigation: GitHub Actions workflow (D-22), or build on a computer with Android Studio.
2. **No physical device testing yet.** Touch feel, WebView performance on 2 GB phones, Back button and lifecycle must be checked on a real phone (see TEST_PLAN.md, device section).
3. **Application ID is permanent** once uploaded (D-18).
4. **Swahili text** has not been reviewed by a native speaker (SWAHILI_REVIEW.md).
5. **Old WebViews.** Android 7 phones that never updated "Android System WebView" may run an old Chromium. The build targets ES2019 to reduce this risk; unverified on device.
