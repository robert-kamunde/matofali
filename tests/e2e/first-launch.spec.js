import { test, expect } from '@playwright/test';

// No skipLanguagePrompt here: this is a fresh install.

test('first launch asks for a language, then remembers it', async ({ page }) => {
  await page.goto('/?e2e');
  await expect(page.locator('#screen-language')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#screen-home')).toBeHidden();
  await expect(page.locator('#screen-language')).toContainText('Chagua lugha');
  await expect(page.locator('#screen-language')).toContainText('Choose your language');
  await page.click('[data-first-lang="en"]');
  await expect(page.locator('#screen-home')).toBeVisible();
  await expect(page.locator('#btn-play')).toHaveText('Play');
  await page.reload();
  await expect(page.locator('#screen-home')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#screen-language')).toBeHidden();
  await expect(page.locator('#btn-play')).toHaveText('Play');
});

test('each first-launch choice sets that language', async ({ page }) => {
  for (const [lang, play] of [['sw', 'Anza'], ['en', 'Play']]) {
    await page.goto('/?e2e');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#screen-language')).toBeVisible({ timeout: 4000 });
    await page.click(`[data-first-lang="${lang}"]`);
    await expect(page.locator('#btn-play')).toHaveText(play);
  }
});

test('two language choices and no tagline under the logo', async ({ page }) => {
  await page.goto('/?e2e');
  await expect(page.locator('#screen-language')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('[data-first-lang]')).toHaveCount(2);
  await page.click('[data-first-lang="sw"]');
  await expect(page.locator('#screen-home')).not.toContainText('Tanzania');
});
