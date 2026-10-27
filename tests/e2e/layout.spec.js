import { test, expect } from '@playwright/test';

// Checks the field scaling on a range of phone sizes (runs in one project only).
const SIZES = [
  { name: 'small 320x568', width: 320, height: 568 },
  { name: 'budget 360x640', width: 360, height: 640 },
  { name: 'common 360x800', width: 360, height: 800 },
  { name: 'tall 412x915', width: 412, height: 915 },
  { name: 'tablet 800x1280', width: 800, height: 1280 },
];

for (const s of SIZES) {
  test(`playfield keeps its 3:4 shape and fits on ${s.name}`, async ({ browser }, info) => {
    test.skip(info.project.name !== 'pixel-5', 'size sweep runs in one project');
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('/?e2e');
    await expect(page.locator('#screen-home')).toBeVisible({ timeout: 4000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(s.width);
    await expect(page.locator('#btn-howto')).toBeInViewport();
    await page.click('#btn-play');
    await page.click('#btn-go');
    const c = await page.locator('#game-canvas').boundingBox();
    expect(Math.abs(c.width / c.height - 0.75)).toBeLessThan(0.01);
    expect(c.x).toBeGreaterThanOrEqual(0);
    expect(c.y).toBeGreaterThanOrEqual(0);
    expect(c.x + c.width).toBeLessThanOrEqual(s.width);
    expect(c.y + c.height).toBeLessThanOrEqual(s.height);
    await expect(page.locator('#btn-pause')).toBeInViewport();
    await expect(page.locator('#hud-lives')).toBeInViewport();
    // Backing store is sharp but capped at 2x for budget phones.
    const ratio = await page.evaluate(() => {
      const el = document.getElementById('game-canvas');
      return el.width / el.getBoundingClientRect().width;
    });
    expect(ratio).toBeLessThanOrEqual(2.01);
    await ctx.close();
  });
}

test('resizing mid-game rescales the field and keeps playing', async ({ page }, info) => {
  test.skip(info.project.name !== 'pixel-5', 'runs in one project');
  await page.goto('/?e2e');
  await expect(page.locator('#screen-home')).toBeVisible({ timeout: 4000 });
  await page.click('#btn-play');
  await page.click('#btn-go');
  const before = await page.locator('#game-canvas').boundingBox();
  await page.setViewportSize({ width: 360, height: 640 });
  await expect.poll(async () => (await page.locator('#game-canvas').boundingBox()).width).not.toBe(before.width);
  const after = await page.locator('#game-canvas').boundingBox();
  expect(Math.abs(after.width / after.height - 0.75)).toBeLessThan(0.01);
  expect(await page.evaluate(() => window.__matofali.game.state)).toBe('playing');
});
