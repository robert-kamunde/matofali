# Development plan

Status as of 27 October 2026. "Done" means implemented and covered by automated tests in this environment; device checks are listed separately because no Android device or emulator was available.

| Phase | Work | Depends on | Acceptance criteria | Verify with | Status |
| --- | --- | --- | --- | --- | --- |
| A | Audit prototype, spec, tools | — | Audit written | docs/PROJECT_AUDIT.md | Done |
| B | Architecture, plan, decisions, test plan | A | Docs written | docs/ | Done |
| C | Game engine: paddle, ball, bricks, lives, power-ups, states, fixed timestep | B | Every rule in the spec has a passing unit test | `npm test` | Done |
| D | Four levels, round difficulty, data-driven grids | C | Levels validate; progression and toughening tested | `npm test` | Done |
| E | Six screens, settings, how to play, art, fonts, Swahili/English, sound, vibration, storage | C, D | Browser tests pass for every screen and setting | `npm run build && npm run test:e2e` | Done |
| F | Capacitor Android project, portrait, icons, splash, Back button, lifecycle | E | `npx cap sync android` succeeds; Gradle build succeeds | `npx cap sync android`, then `cd android && ./gradlew assembleDebug bundleRelease` | Project done; **Gradle build not run here** (network block) |
| G | Automated tests, lint, production build | C–F | All pass | `npm run check` | Done |
| H | Lifecycle, offline, performance, device | F | Browser checks pass; device checklist completed | TEST_PLAN.md device section | Browser part done; **device part open** |
| I | Release candidate and store materials | F, H | Signed `.aab`; listing, graphics, policy forms ready | RELEASE_CHECKLIST.md | Materials done; **signed `.aab` open** |
| J | Handover | all | HANDOVER.md | — | Done |

## Remaining work, in order

1. Create a GitHub repository and push this code; the workflow builds the APK and AAB (needs Robert, D-22).
2. Install the debug APK on a budget Android phone and run the device checklist.
3. Fix anything the device test finds.
4. Create the upload key, add it as GitHub secrets, build the signed AAB.
5. Native-speaker review of the Swahili strings.
6. Host the privacy policy, then complete the Play Console steps.
