import { test, expect } from '@playwright/test';

const START = '/?e2e&seed=7';

async function openHome(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(START);
  await expect(page.locator('#screen-home')).toBeVisible({ timeout: 5000 });
  return errors;
}

async function startPlaying(page) {
  await page.click('#btn-play');
  await expect(page.locator('#overlay-card')).toBeVisible();
  await page.click('#btn-go');
  await expect(page.locator('#overlay-card')).toBeHidden();
}

const state = (page) => page.evaluate(() => window.__matofali.game.state);

test('splash shows first, then the home screen', async ({ page }) => {
  await page.goto(START);
  await expect(page.locator('#screen-splash')).toBeVisible();
  await expect(page.locator('#screen-home')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#screen-splash')).toBeHidden();
  await expect(page.locator('#btn-play')).toContainText('Anza');
  await expect(page.locator('#btn-play')).toContainText('Play');
  await expect(page.locator('#btn-settings')).toContainText('Mipangilio');
  await expect(page.locator('#btn-howto')).toContainText('Jinsi ya kucheza');
  await expect(page.locator('#home-best')).toHaveText('0');
});

test('loads no files from the internet', async ({ page }) => {
  const external = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol !== 'data:') external.push(r.url());
  });
  const errors = await openHome(page);
  await startPlaying(page);
  await page.waitForTimeout(500);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('level card, tap to launch, live score', async ({ page }) => {
  await openHome(page);
  await page.click('#btn-play');
  await expect(page.locator('#card-level')).toHaveText('Ngazi 1 · Level 1');
  await expect(page.locator('#card-name')).toContainText('Bendera');
  await expect(page.locator('#card-subtitle')).toContainText('The flag');
  await page.click('#btn-go');
  await expect(page.locator('#launch-hint')).toBeVisible();
  expect(await state(page)).toBe('playing');
  const box = await page.locator('#game-canvas').boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.8);
  await expect(page.locator('#launch-hint')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__matofali.game.balls[0].stuck)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__matofali.game.score), { timeout: 10000 }).toBeGreaterThan(0);
  await expect(page.locator('#hud-score')).not.toHaveText('0');
});

test('dragging anywhere moves the paddle horizontally', async ({ page }) => {
  await openHome(page);
  await startPlaying(page);
  const box = await page.locator('#game-canvas').boundingBox();
  // Drag along the top of the play area: the paddle still follows x.
  await page.mouse.move(box.x + box.width * 0.5, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.15, box.y + 30, { steps: 5 });
  await expect.poll(() => page.evaluate(() => window.__matofali.game.paddle.x)).toBeLessThan(110);
  await page.mouse.move(box.x + box.width * 0.9, box.y + 60, { steps: 5 });
  await expect.poll(() => page.evaluate(() => window.__matofali.game.paddle.x)).toBeGreaterThan(400);
  await page.mouse.up();
});

test('pause stops the game and resume continues it', async ({ page }) => {
  await openHome(page);
  await startPlaying(page);
  await page.evaluate(() => window.__matofali.game.launch());
  await page.click('#btn-pause');
  await expect(page.locator('#overlay-pause')).toBeVisible();
  await expect(page.locator('#overlay-pause')).toContainText('Pumzika');
  const y1 = await page.evaluate(() => window.__matofali.game.balls[0].y);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__matofali.game.balls[0].y)).toBe(y1);
  await page.click('#btn-resume');
  await expect(page.locator('#overlay-pause')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__matofali.game.balls[0].y)).not.toBe(y1);
});

test('quit from pause returns home', async ({ page }) => {
  await openHome(page);
  await startPlaying(page);
  await page.click('#btn-pause');
  await page.click('#btn-quit');
  await expect(page.locator('#screen-home')).toBeVisible();
  expect(await state(page)).toBe('idle');
});

test('going to the background pauses and stays paused on return', async ({ page }) => {
  await openHome(page);
  await startPlaying(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await state(page)).toBe('paused');
  await expect(page.locator('#overlay-pause')).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(300);
  expect(await state(page)).toBe('paused');
});

test('Back button moves through the screens sensibly', async ({ page }) => {
  await openHome(page);
  const back = () => page.evaluate(() => window.__matofali.handleBack());
  await page.click('#btn-settings');
  await back();
  await expect(page.locator('#screen-home')).toBeVisible();
  await page.click('#btn-settings');
  await page.click('#btn-privacy');
  await back();
  await expect(page.locator('#screen-settings')).toBeVisible();
  await back();
  await startPlaying(page);
  await back();
  expect(await state(page)).toBe('paused');
  await back();
  expect(await state(page)).toBe('playing');
  await page.click('#btn-pause');
  await page.click('#btn-quit');
  await page.click('#btn-play');
  await expect(page.locator('#overlay-card')).toBeVisible();
  await back();
  await expect(page.locator('#screen-home')).toBeVisible();
  // On the home screen Back leaves the app, so it reports "not handled".
  expect(await back()).toBe(false);
});

test('language switching updates every screen and is remembered', async ({ page }) => {
  await openHome(page);
  await page.click('#btn-settings');
  await page.click('.choice[data-lang="en"]');
  await expect(page.locator('#screen-settings .page-title')).toHaveText('Settings');
  await page.click('[data-back]:visible');
  await expect(page.locator('#btn-play')).toHaveText('Play');
  await expect(page.locator('#btn-howto')).toHaveText('How to play');
  await page.click('#btn-play');
  await expect(page.locator('#card-level')).toHaveText('Level 1');
  await expect(page.locator('#btn-go')).toHaveText('Go');
  await page.click('#btn-go');
  await page.click('#btn-pause');
  await expect(page.locator('#overlay-pause .panel-title')).toHaveText('Paused');
  await page.reload();
  await expect(page.locator('#btn-play')).toHaveText('Play', { timeout: 4000 });
  await page.click('#btn-settings');
  await page.click('.choice[data-lang="sw"]');
  await page.click('[data-back]:visible');
  await expect(page.locator('#btn-play')).toHaveText('Anza');
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('sw');
});

test('sound and vibration settings are remembered', async ({ page }) => {
  await openHome(page);
  await page.click('#btn-settings');
  await page.click('#set-sound');
  await page.click('#set-vibration');
  await expect(page.locator('#set-sound')).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await expect(page.locator('#screen-home')).toBeVisible({ timeout: 4000 });
  await page.click('#btn-settings');
  await expect(page.locator('#set-sound')).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('#set-vibration')).toHaveAttribute('aria-checked', 'false');
  expect(await page.evaluate(() => window.__matofali.sfx.enabled)).toBe(false);
  // The pause screen toggle changes the same setting.
  await page.click('[data-back]:visible');
  await startPlaying(page);
  await page.click('#btn-pause');
  await page.click('#btn-pause-sound');
  await expect(page.locator('#btn-pause-sound')).toHaveAttribute('aria-checked', 'true');
});

test('clearing a level shows the bonus and the next level card', async ({ page }) => {
  await openHome(page);
  await startPlaying(page);
  await page.evaluate(() => {
    const g = window.__matofali.game;
    g.bricks = g.bricks.slice(0, 1);
    const br = g.bricks[0];
    br.hp = 1;
    g.balls = [{ x: br.x + 18, y: br.y + br.h + 9, r: 7, vx: 0, vy: -5, stuck: false }];
  });
  await expect(page.locator('#toast')).toBeVisible();
  await expect(page.locator('#toast')).toContainText('+250');
  await expect(page.locator('#overlay-card')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#card-level')).toHaveText('Ngazi 2 · Level 2');
  await expect(page.locator('#card-name')).toContainText('Kilimanjaro');
  await expect(page.locator('#card-subtitle')).toContainText('Paa la Afrika');
  expect(await page.evaluate(() => window.__matofali.save.highestLevel)).toBe(2);
});

test('game over shows the score and new best, and the best is kept', async ({ page }) => {
  await openHome(page);
  await startPlaying(page);
  await page.evaluate(() => {
    const g = window.__matofali.game;
    g.score = 1234;
    g.lives = 1;
    g.balls = [{ x: 240, y: 700, r: 7, vx: 0, vy: 5, stuck: false }];
  });
  await expect(page.locator('#overlay-over')).toBeVisible();
  await expect(page.locator('#overlay-over')).toContainText('Mchezo umekwisha');
  await expect(page.locator('#over-score')).toHaveText('1234');
  await expect(page.locator('#over-best')).toBeVisible();
  await page.click('#btn-again');
  await expect(page.locator('#card-level')).toHaveText('Ngazi 1 · Level 1');
  expect(await page.evaluate(() => window.__matofali.game.score)).toBe(0);
  expect(await page.evaluate(() => window.__matofali.game.lives)).toBe(3);
  await expect(page.locator('#hud-best')).toHaveText('1234');
  await page.reload();
  await expect(page.locator('#home-best')).toHaveText('1234', { timeout: 4000 });
});

test('a lower score is not a new best', async ({ page }) => {
  await page.goto(START);
  await page.evaluate(() => localStorage.setItem('matofali.best', '5000'));
  await page.reload();
  await expect(page.locator('#home-best')).toHaveText('5000', { timeout: 4000 });
  await startPlaying(page);
  await page.evaluate(() => {
    const g = window.__matofali.game;
    g.score = 10;
    g.lives = 1;
    g.balls = [{ x: 240, y: 700, r: 7, vx: 0, vy: 5, stuck: false }];
  });
  await expect(page.locator('#overlay-over')).toBeVisible();
  await expect(page.locator('#over-best')).toBeHidden();
  await page.click('#btn-over-home');
  await expect(page.locator('#home-best')).toHaveText('5000');
});

test('corrupt saved data does not stop the game from starting', async ({ page }) => {
  await page.goto(START);
  await page.evaluate(() => {
    localStorage.setItem('matofali.best', '{{{');
    localStorage.setItem('matofali.settings', 'not json');
  });
  await page.reload();
  await expect(page.locator('#screen-home')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#home-best')).toHaveText('0');
  await expect(page.locator('#btn-play')).toContainText('Anza');
});

test('how to play has three illustrated steps', async ({ page }) => {
  await openHome(page);
  await page.click('#btn-howto');
  const steps = page.locator('.howto > li');
  await expect(steps).toHaveCount(3);
  for (let i = 0; i < 3; i++) await expect(steps.nth(i).locator('svg')).toBeVisible();
  await expect(steps.nth(0)).toContainText('Buruta');
  await expect(steps.nth(1)).toContainText('Gusa');
  await expect(steps.nth(2)).toContainText('Daka');
});

test('privacy policy is reachable from settings, offline', async ({ page }) => {
  await openHome(page);
  await page.click('#btn-settings');
  await page.click('#btn-privacy');
  await expect(page.locator('#screen-privacy .prose')).toContainText('haikusanyi');
  await expect(page.locator('#screen-privacy .prose')).toContainText('does not collect');
});

test('reduced-motion preference turns off particles and shake', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 393, height: 851 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(START);
  await expect(page.locator('#screen-home')).toBeVisible({ timeout: 4000 });
  expect(await page.evaluate(() => window.__matofali.renderer.reducedMotion)).toBe(true);
  await ctx.close();
});
