import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('@missing mounts a truly empty board and saves one explicit stroke', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  await page.goto('/');
  await expect(page.locator('#TD-PrimaryTools')).toBeVisible();
  await expect(page.locator('[data-shape]')).toHaveCount(0);
  await expect(page.locator('[data-testid="whiteboard-build-identity"]')).toContainText(
    /unreleased(?:-dirty)?@[0-9a-f]{7} · SDK 1\.26\.2 · development/u,
  );
  await expect.poll(() => page.evaluate(() => ({ ...window.__WHITEBOARD_FIXTURE_COUNTS__ })))
    .toEqual({ 'load-document': 1 });

  await page.locator('#TD-PrimaryTools-Pencil').click();
  await page.mouse.move(300, 180);
  await page.mouse.down();
  await page.mouse.move(380, 230, { steps: 12 });
  await page.mouse.up();

  await expect(page.locator('[data-shape]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.__WHITEBOARD_FIXTURE_COUNTS__['save-document']))
    .toBe(1);

  await page.reload();
  await expect(page.locator('#TD-PrimaryTools')).toBeVisible();
  await expect(page.locator('[data-shape]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => ({ ...window.__WHITEBOARD_FIXTURE_COUNTS__ })))
    .toEqual({ 'load-document': 1 });
  expect(pageErrors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('missing-draw-saved.png'), fullPage: true });
});

test('@invalid stays non-editable and downloads the fixed recovery wrapper', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  await page.goto('/');
  await expect(page.locator('[data-testid="whiteboard-load-error"]')).toContainText(
    'Your stored data has not been changed. (document_schema_invalid)',
  );
  await expect(page.locator('#TD-PrimaryTools')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => ({ ...window.__WHITEBOARD_FIXTURE_COUNTS__ })))
    .toEqual({ 'load-document': 1 });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download recovery file' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('whiteboard-recovery.json');
  const recoveryPath = await download.path();
  expect(recoveryPath).not.toBeNull();
  const recovery = JSON.parse(await readFile(recoveryPath!, 'utf8'));
  expect(recovery).toEqual({
    kind: 'whiteboard-recovery',
    formatVersion: 1,
    source: 'stored',
    value: { syntheticInvalid: true },
  });
  await expect.poll(() => page.evaluate(() => ({ ...window.__WHITEBOARD_FIXTURE_COUNTS__ })))
    .toEqual({ 'load-document': 1, 'download-recovery': 1 });
  expect(pageErrors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('invalid-recovery.png'), fullPage: true });
});
