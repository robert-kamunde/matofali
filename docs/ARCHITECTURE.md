# Architecture

Matofali is a web game (HTML, CSS, JavaScript, one `<canvas>`) packaged as an Android app with Capacitor. The game logic has no dependency on the browser, so it runs unchanged in Node for tests.

```
index.html            screens and overlays (static markup, text filled from translations)
src/
  main.js             boot: picks storage, wires Android lifecycle, starts the App
  config/
    rules.js          every gameplay number (speeds, hits, scores, power-ups, lives)
    levels.js         the four levels as 12-wide text grids + validator
  engine/
    game.js           Game: state machine, fixed-step simulation, events (no DOM)
    physics.js        pure geometry: circle–rectangle hits, angles
    rng.js            seedable random numbers for repeatable tests
  render/
    renderer.js       draws a Game on the canvas; particles and screen shake
    palette.js        flag and brick colours
  ui/
    app.js            connects game, renderer, sound, storage and screens; main loop; Back button
    layout.js         fits the 480 × 640 field into any screen
  i18n/
    sw.js, en.js      all player-facing text
    i18n.js           bilingual / Swahili / English modes
  audio/sfx.js        synthesised sound effects
  storage/storage.js  validated save data over Capacitor Preferences or localStorage
  platform/platform.js  Android vs browser: storage backend, haptics, Back, pause/resume
android/              Capacitor Android project (generated, then configured)
tests/unit/           Vitest: rules, levels, engine, i18n, storage, layout
tests/e2e/            Playwright: the built app in phone-sized touch browsers
```

## Game states

`idle → ready → playing ⇄ paused`, `playing → levelComplete → ready`, `playing → gameOver → ready`, and any running state → `idle` (quit). Invalid transitions throw, which the tests check.

| State | Meaning | Screen |
| --- | --- | --- |
| idle | No game running | Home, settings, how to play |
| ready | Level loaded, waiting for the player | Level card |
| playing | Simulation runs (the ball may still be resting on the paddle) | Gameplay |
| paused | Simulation frozen | Pause overlay |
| levelComplete | Board cleared, bonus added | "Level cleared" toast, then the next level card after 1.1 s |
| gameOver | No lives left | Game over overlay |

## Timing

The simulation advances in fixed steps of 1/60 s, independent of the screen's frame rate. Each animation frame runs as many steps as the elapsed time requires, up to 5; if a phone falls further behind, the extra time is dropped rather than piling up. Frame gaps longer than 100 ms (for example after returning from the background) are clamped.

## Collisions

Each step moves each ball in substeps (at least 3, more at high speed, D-05). In each substep the ball is checked against the walls, the paddle and every brick. Bricks overlapping the ball are all damaged, and the ball bounces once per axis, so hitting the seam between two bricks behaves naturally. Corner hits bounce on whichever axes the ball was moving toward.

## Adding a level

1. Add an entry to `LEVELS` in `src/config/levels.js` with an `id`, two translation keys and up to 10 rows of 12 characters.
2. Add the two keys to `src/i18n/sw.js` and `src/i18n/en.js`.
3. Run `npm test`. The level validator and the translation tests catch mistakes.

New brick types are a new letter in `RULES.bricks` and a colour in `render/palette.js`.

## Data the app stores

Only on the phone, through Capacitor Preferences (Android SharedPreferences): best score, highest level reached, and the sound, vibration and language settings. Invalid stored values fall back to defaults. Nothing is sent anywhere.
