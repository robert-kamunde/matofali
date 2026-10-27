# QA report: Matofali 1.0.0

Generated 27 October 2026 from the actual runs of `npm run lint`, `npx vitest run`, `npm run build` and `npx playwright test` on the development machine (Linux, Node 22, headless Chromium from Playwright 1.63.0). Every row below was executed; nothing is marked as passed without a run. To regenerate the tables: run both test suites with their JSON reporters, then `node scripts/qa-report.cjs vitest.json playwright.json`.

## Summary

| Check | Result |
| --- | --- |
| Lint (ESLint) | Clean, 0 errors, 0 warnings |
| Unit tests | 77 passed, 0 failed |
| Production build | OK, 208 KB in 15 files (main script 43 KB, 15 KB gzipped) |
| Browser tests | 40 passed, 0 failed, 6 skipped by design (the layout tests run in the Pixel 5 profile only) |
| Android Gradle build | **Passed on GitHub Actions** ([run 40580035069](https://github.com/robert-kamunde/matofali/actions/runs/40580035069), 27 October 2026): debug APK and an **unsigned** release AAB, 6.9 MB zipped artifact. The first run failed on an invalid XML comment in `colors.xml`, fixed in cd7f2bc. Signing secrets are not set yet, so the AAB cannot be uploaded to Play. |
| Real Android phone | **Not run.** See "Not yet verified" below. |

## Completion states

| State | Status |
| --- | --- |
| Implemented | Yes: engine, four levels, UI, Swahili/English, sound, settings, saved data, Capacitor Android project, store materials |
| Automatically tested | Yes: results below |
| Device tested | No |
| Release candidate generated | No. A debug APK and unsigned AAB are built; a signed AAB needs the upload key secrets |
| Published | No |

## Performance (emulated)

Headless Chromium at 360 × 640 with the CPU slowed 1×, 4× and 6×: median frame 16.7 ms, 95th percentile 16.8 ms, worst 33.4 ms, simulation steps matched frames, JavaScript heap about 10 MB. This is an emulation on a desktop CPU, not a measurement on a budget phone.

## Not yet verified (needs a real phone)

Hardware Back button, pause when Home is pressed or a call comes in, vibration, status-bar and gesture-bar insets, splash and icon, portrait lock, whether Android's "Remove animations" reaches the game, touch feel, frame rate and battery on a 2 GB phone, installed size. The 16 manual checks are in `docs/TEST_PLAN.md`.

## Defects

No open failing tests. Known limitations are listed in `docs/ROADMAP.md` (L-1 to L-6). None is a crash or data-loss bug found by the tests.

## Results

### Unit tests (Vitest): 77 passed, 0 failed, 0 skipped of 77

| File | Test | Result |
| --- | --- | --- |
| unit/game.test.js | state machine › runs idle → ready → playing → paused → playing | PASS |
| unit/game.test.js | state machine › refuses invalid transitions | PASS |
| unit/game.test.js | state machine › does not simulate while paused | PASS |
| unit/game.test.js | state machine › can quit to home from any running state | PASS |
| unit/game.test.js | paddle › follows the finger horizontally | PASS |
| unit/game.test.js | paddle › stays inside the playfield | PASS |
| unit/game.test.js | paddle › starts 84 units wide with the ball resting on it | PASS |
| unit/game.test.js | launch › launches upward at the level speed within the spread | PASS |
| unit/game.test.js | launch › never produces a shallow launch even at the extremes of the random range | PASS |
| unit/game.test.js | launch › only launches while playing | PASS |
| unit/game.test.js | walls › bounces off left, right and top walls | PASS |
| unit/game.test.js | paddle bounce angles › sends a centre hit straight up | PASS |
| unit/game.test.js | paddle bounce angles › sends an end hit toward that side at up to 60° | PASS |
| unit/game.test.js | paddle bounce angles › scales the angle with distance from centre | PASS |
| unit/game.test.js | paddle bounce angles › keeps level speed after the bounce | PASS |
| unit/game.test.js | bricks › a one-hit brick breaks, scores and bounces the ball | PASS |
| unit/game.test.js | bricks › a black brick cracks first, then breaks, and every hit scores | PASS |
| unit/game.test.js | bricks › door wood takes three hits | PASS |
| unit/game.test.js | bricks › a ball hitting the seam of two bricks damages both and bounces once | PASS |
| unit/game.test.js | bricks › a corner hit reflects on both axes it was moving toward | PASS |
| unit/game.test.js | bricks › a side hit only reverses horizontal motion | PASS |
| unit/game.test.js | bricks › does not tunnel through a brick at maximum speed | PASS |
| unit/game.test.js | bricks › keeps every brick bounce steeper than the shallow-angle limit | PASS |
| unit/game.test.js | level completion and progression › awards 250 and stops at level complete when the last brick breaks | PASS |
| unit/game.test.js | level completion and progression › advances through the four levels and into round 2 with tougher bricks | PASS |
| unit/game.test.js | level completion and progression › doubles points per hit in round 2 | PASS |
| unit/game.test.js | level completion and progression › keeps the score and lives when moving to the next level | PASS |
| unit/game.test.js | lives › starts with 3 and loses one when the last ball falls | PASS |
| unit/game.test.js | lives › ends the game at zero lives | PASS |
| unit/game.test.js | lives › restarts cleanly from game over | PASS |
| unit/game.test.js | lives › losing one ball during multi-ball costs nothing | PASS |
| unit/game.test.js | lives › losing the last of several balls costs one life and clears effects | PASS |
| unit/game.test.js | power-ups › maps rolls to the documented shares | PASS |
| unit/game.test.js | power-ups › drops about 12% of the time with 45/44/11 shares over many breaks | PASS |
| unit/game.test.js | power-ups › falls at 2.4 units per step and is caught by the paddle for 50 points | PASS |
| unit/game.test.js | power-ups › a missed power-up disappears off the bottom | PASS |
| unit/game.test.js | power-ups › wide paddle grows to 130 for exactly 12 seconds | PASS |
| unit/game.test.js | power-ups › extra life stops at 6 | PASS |
| unit/game.test.js | power-ups › multi-ball adds two balls about 30° to each side at the level speed | PASS |
| unit/game.test.js | power-ups › multi-ball from an already steep ball never goes flatter than the limit | PASS |
| unit/game.test.js | power-ups › multi-ball while the ball rests on the paddle launches all three | PASS |
| unit/game.test.js | long-run stability › plays 20 minutes of automated rallies without leaving the field or stalling | PASS |
| unit/i18n-storage.test.js | translations › Swahili and English have exactly the same keys | PASS |
| unit/i18n-storage.test.js | translations › every key used in the HTML and code exists | PASS |
| unit/i18n-storage.test.js | translations › no string is empty | PASS |
| unit/i18n-storage.test.js | translations › defaults to Swahili first with English beneath | PASS |
| unit/i18n-storage.test.js | translations › switches to Swahili only and English only | PASS |
| unit/i18n-storage.test.js | translations › shows one line when both languages read the same | PASS |
| unit/i18n-storage.test.js | translations › fills in values | PASS |
| unit/i18n-storage.test.js | translations › throws on a missing key so mistakes are caught in tests | PASS |
| unit/i18n-storage.test.js | translations › offers the three documented language modes | PASS |
| unit/i18n-storage.test.js | saved data › starts with defaults on a fresh install | PASS |
| unit/i18n-storage.test.js | saved data › keeps the best score across restarts and only raises it | PASS |
| unit/i18n-storage.test.js | saved data › keeps the highest level reached | PASS |
| unit/i18n-storage.test.js | saved data › persists sound, vibration and language | PASS |
| unit/i18n-storage.test.js | saved data › recovers from corrupt or tampered data | PASS |
| unit/i18n-storage.test.js | saved data › keeps valid fields when others are bad | PASS |
| unit/i18n-storage.test.js | saved data › ignores invalid settings updates | PASS |
| unit/i18n-storage.test.js | saved data › keeps playing when the storage itself fails | PASS |
| unit/i18n-storage.test.js | playfield scaling › keeps the 480 × 640 shape on tall and wide screens | PASS |
| unit/i18n-storage.test.js | playfield scaling › never returns negative sizes | PASS |
| unit/rules.test.js | difficulty progression › groups four levels into each round | PASS |
| unit/rules.test.js | difficulty progression › matches the speed examples in the design guide | PASS |
| unit/rules.test.js | difficulty progression › caps speed so endless rounds stay playable | PASS |
| unit/rules.test.js | difficulty progression › gives each brick its documented strength | PASS |
| unit/rules.test.js | difficulty progression › adds one hit from round 2, except Zanzibar door wood | PASS |
| unit/rules.test.js | difficulty progression › scores 10 × round per hit | PASS |
| unit/rules.test.js | difficulty progression › rejects unknown bricks | PASS |
| unit/rules.test.js | difficulty progression › power-up shares add up to 1 | PASS |
| unit/rules.test.js | levels › ships the four documented levels in order | PASS |
| unit/rules.test.js | levels › bendera is a valid 12-wide grid of known bricks | PASS |
| unit/rules.test.js | levels › kilimanjaro is a valid 12-wide grid of known bricks | PASS |
| unit/rules.test.js | levels › zanzibar is a valid 12-wide grid of known bricks | PASS |
| unit/rules.test.js | levels › serengeti is a valid 12-wide grid of known bricks | PASS |
| unit/rules.test.js | levels › uses the multi-hit bricks each level is documented with | PASS |
| unit/rules.test.js | levels › cycles back to level 1 after level 4 | PASS |
| unit/rules.test.js | levels › reports a malformed level clearly | PASS |

### Browser tests (Playwright): 40 passed, 0 failed, 6 skipped

| File | Test | Device profile | Result |
| --- | --- | --- | --- |
| app.spec.js | splash shows first, then the home screen | pixel-5 | PASS |
| app.spec.js | loads no files from the internet | pixel-5 | PASS |
| app.spec.js | level card, tap to launch, live score | pixel-5 | PASS |
| app.spec.js | dragging anywhere moves the paddle horizontally | pixel-5 | PASS |
| app.spec.js | pause stops the game and resume continues it | pixel-5 | PASS |
| app.spec.js | quit from pause returns home | pixel-5 | PASS |
| app.spec.js | going to the background pauses and stays paused on return | pixel-5 | PASS |
| app.spec.js | Back button moves through the screens sensibly | pixel-5 | PASS |
| app.spec.js | language switching updates every screen and is remembered | pixel-5 | PASS |
| app.spec.js | sound and vibration settings are remembered | pixel-5 | PASS |
| app.spec.js | clearing a level shows the bonus and the next level card | pixel-5 | PASS |
| app.spec.js | game over shows the score and new best, and the best is kept | pixel-5 | PASS |
| app.spec.js | a lower score is not a new best | pixel-5 | PASS |
| app.spec.js | corrupt saved data does not stop the game from starting | pixel-5 | PASS |
| app.spec.js | how to play has three illustrated steps | pixel-5 | PASS |
| app.spec.js | privacy policy is reachable from settings, offline | pixel-5 | PASS |
| app.spec.js | reduced-motion preference turns off particles and shake | pixel-5 | PASS |
| app.spec.js | splash shows first, then the home screen | budget-phone-360x640 | PASS |
| app.spec.js | loads no files from the internet | budget-phone-360x640 | PASS |
| app.spec.js | level card, tap to launch, live score | budget-phone-360x640 | PASS |
| app.spec.js | dragging anywhere moves the paddle horizontally | budget-phone-360x640 | PASS |
| app.spec.js | pause stops the game and resume continues it | budget-phone-360x640 | PASS |
| app.spec.js | quit from pause returns home | budget-phone-360x640 | PASS |
| app.spec.js | going to the background pauses and stays paused on return | budget-phone-360x640 | PASS |
| app.spec.js | Back button moves through the screens sensibly | budget-phone-360x640 | PASS |
| app.spec.js | language switching updates every screen and is remembered | budget-phone-360x640 | PASS |
| app.spec.js | sound and vibration settings are remembered | budget-phone-360x640 | PASS |
| app.spec.js | clearing a level shows the bonus and the next level card | budget-phone-360x640 | PASS |
| app.spec.js | game over shows the score and new best, and the best is kept | budget-phone-360x640 | PASS |
| app.spec.js | a lower score is not a new best | budget-phone-360x640 | PASS |
| app.spec.js | corrupt saved data does not stop the game from starting | budget-phone-360x640 | PASS |
| app.spec.js | how to play has three illustrated steps | budget-phone-360x640 | PASS |
| app.spec.js | privacy policy is reachable from settings, offline | budget-phone-360x640 | PASS |
| app.spec.js | reduced-motion preference turns off particles and shake | budget-phone-360x640 | PASS |
| layout.spec.js | playfield keeps its 3:4 shape and fits on small 320x568 | pixel-5 | PASS |
| layout.spec.js | playfield keeps its 3:4 shape and fits on budget 360x640 | pixel-5 | PASS |
| layout.spec.js | playfield keeps its 3:4 shape and fits on common 360x800 | pixel-5 | PASS |
| layout.spec.js | playfield keeps its 3:4 shape and fits on tall 412x915 | pixel-5 | PASS |
| layout.spec.js | playfield keeps its 3:4 shape and fits on tablet 800x1280 | pixel-5 | PASS |
| layout.spec.js | resizing mid-game rescales the field and keeps playing | pixel-5 | PASS |
| layout.spec.js | playfield keeps its 3:4 shape and fits on small 320x568 | budget-phone-360x640 | SKIPPED (by design) |
| layout.spec.js | playfield keeps its 3:4 shape and fits on budget 360x640 | budget-phone-360x640 | SKIPPED (by design) |
| layout.spec.js | playfield keeps its 3:4 shape and fits on common 360x800 | budget-phone-360x640 | SKIPPED (by design) |
| layout.spec.js | playfield keeps its 3:4 shape and fits on tall 412x915 | budget-phone-360x640 | SKIPPED (by design) |
| layout.spec.js | playfield keeps its 3:4 shape and fits on tablet 800x1280 | budget-phone-360x640 | SKIPPED (by design) |
| layout.spec.js | resizing mid-game rescales the field and keeps playing | budget-phone-360x640 | SKIPPED (by design) |
