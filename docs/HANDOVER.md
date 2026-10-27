# Handover: Matofali 1.0.0

Date: 27 October 2026

## Where the project stands

| State | Status |
| --- | --- |
| Implemented | **Yes.** The full game, four levels, Swahili/English, sound, vibration, settings, saved best score, Android project, store art and listing text |
| Automatically tested | **Yes.** 77 unit tests and 40 browser tests pass, lint is clean, and the web build works (`docs/QA_REPORT.md`) |
| Device tested | **No.** No Android phone or emulator was available |
| Release candidate generated | **No.** The APK/AAB has not been built, because the development machine cannot reach Google's Android servers |
| Published | **No** |

## What Robert needs to do, in order

1. **Create an empty GitHub repository** (private is fine) and tell Claude its name. Claude will push the code, and the workflow will build a test APK.
2. **Confirm the application ID `com.matofali.game`** (D-18). It can never change after the first upload.
3. **Install the debug APK on a real phone** (a budget Tecno, Itel or Infinix if possible) and go through the 16 checks in `docs/TEST_PLAN.md`. Report anything that feels wrong.
4. **Confirm the ball speed cap of 14** (D-04), or choose another value after playing.
5. **Create the upload key** on your own computer and add the four GitHub secrets (`docs/RELEASE_CHECKLIST.md`, "Build and signing"). Never send the key or its passwords in chat.
6. **Host the privacy policy** (`docs/privacy-policy.html`) and add your contact email to it first. GitHub Pages is free. Put the URL in Play Console (D-17).
7. **Ask a native Swahili speaker to review the text** (`docs/SWAHILI_REVIEW.md`).
8. In Play Console: fill in the forms, upload the AAB to internal testing, then run closed testing with 12 testers for 14 days, then apply for production (`docs/RELEASE_CHECKLIST.md`).

## Document map

| Document | Use it for |
| --- | --- |
| `README.md` | Install, run, test, build |
| `docs/PROJECT_AUDIT.md` | What the original prototype had, and its gaps |
| `docs/ARCHITECTURE.md` | How the code is organised |
| `docs/DEVELOPMENT_PLAN.md` | Phases and what was done in each |
| `docs/DECISIONS.md` | Every choice made, with reasons; four need Robert |
| `docs/TEST_PLAN.md` | Automated tests and the manual phone checks |
| `docs/QA_REPORT.md` | Actual test results |
| `docs/RELEASE_CHECKLIST.md` | Google Play submission, step by step |
| `docs/SWAHILI_REVIEW.md` | Every Swahili string for review |
| `docs/ASSET_LICENSES.md` | Fonts and artwork licences |
| `docs/ROADMAP.md` | Known limitations and future versions |
| `docs/privacy-policy.html` | Privacy policy to host |
| `store/` | Icon, feature graphic, screenshots, listing text |

## Changing the game later

- **Gameplay numbers:** `src/config/rules.js`. Run `npm test` afterwards; tests that pin exact values will tell you what changed.
- **New level:** add a map to `src/config/levels.js`, and add its name and subtitle keys to `src/i18n/sw.js` and `en.js`. `validateLevel` and the unit tests check the grid.
- **Text:** `src/i18n/sw.js` and `src/i18n/en.js`. A test fails if one language is missing a key.
- **Each new Play upload:** raise `versionCode` by 1 in `android/app/build.gradle`.
- **Privacy:** version 1 sends no data. Before adding ads, analytics, accounts or online features, update the privacy policy and the Data safety form first.

## Security notes

No keys, passwords or signing files are in the repository. `.gitignore` excludes `*.jks`, `*.keystore` and `keystore.properties`. The CI workflow writes the key from secrets only for the build and deletes it afterwards.
