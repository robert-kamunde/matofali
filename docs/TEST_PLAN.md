# Test plan

## Automated (run on every change)

| Command | What it runs |
| --- | --- |
| `npm run lint` | ESLint over source, tests and scripts |
| `npm test` | 77 Vitest unit tests in Node (engine, rules, levels, translations, storage, layout) |
| `npm run build` | Production web build into `dist/` |
| `npm run test:e2e` | 40 Playwright tests of the built app, in a Pixel 5 profile and a 360 × 640 budget-phone profile, both with touch |
| `npm run check` | All four in order |

The GitHub workflow runs the same commands, then builds the Android APK and AAB.

### What the unit tests cover

Paddle movement and limits; launch angles and the shallow-angle guard; wall bounces; paddle bounce angles (centre, ends, halfway); brick strengths in rounds 1 and 2; scoring of every hit; corner hits, side hits and seam hits on two bricks; no tunnelling at maximum speed; level completion bonus; progression through all four levels into round 2; life loss, game over and restart; multi-ball (angles, speed, losing one ball, losing all); extra-life cap; wide-paddle duration to the exact step; power-up drop rate and shares over 200,000 seeded draws; a 20-minute autopilot run checking the ball never leaves the field or stalls; translations complete in both languages; saved data persistence, recovery from corrupt values and storage failure; field scaling.

### What the browser tests cover

Splash then home; no requests to the internet; level card text; tap to launch; drag to move (paddle follows x only); pause and resume freeze and continue the simulation; quit to home; automatic pause when the app goes to the background and staying paused on return; the Back button on every screen; language switching on every screen and after restart; sound and vibration settings remembered; level clear toast and next level card; game over with new best and restart; a lower score is not a best; corrupt saved data; how-to-play illustrations; privacy policy offline; reduced-motion preference; layout on 320 × 568, 360 × 640, 360 × 800, 412 × 915 and 800 × 1280 screens; resizing mid-game.

## On a real Android phone (manual, not yet done)

Use the debug APK from the GitHub workflow. Test on at least one budget phone (Tecno, Itel or Infinix, 2 GB RAM, Android 10 or older if possible) and one recent phone.

| # | Check | Expected |
| --- | --- | --- |
| 1 | Install with mobile data off, open the app | Splash, then home. Everything works offline. |
| 2 | Play level 1 for 2 minutes | Smooth movement, no stutter; paddle follows the finger closely. |
| 3 | Drag with the thumb low on the screen and high on the screen | Paddle moves the same way in both. |
| 4 | Tap to launch | Ball launches immediately. |
| 5 | Press the phone's Back button while playing, on pause, on the level card, in settings, on home | As in DECISIONS D-13; Back on home closes the app. |
| 6 | Press Home while playing, wait, return | Game is paused; tapping Endelea resumes. |
| 7 | Receive a call or lock the screen while playing | Same as 6; no crash. |
| 8 | Switch languages, close the app fully, reopen | Language kept. |
| 9 | Turn sound off, restart the app | Still off. |
| 10 | Turn vibration on and lose a life | Short vibration. Off: none. |
| 11 | Get a best score, force-close, reopen | Best score kept on home. |
| 12 | Turn on Android "Remove animations" (Accessibility) | No particles or screen shake. Record whether the WebView honours it. |
| 13 | Rotate the phone | Stays portrait. |
| 14 | Phone with a notch or gesture bar | Nothing hidden under the status bar or navigation bar. |
| 15 | Play 15 minutes | No slowdown; battery drop reasonable (note the %). |
| 16 | App size in Settings → Apps | Note the installed size; download size is shown in Play Console. |
