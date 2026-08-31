import { expect, test } from '@playwright/test';

test('WP1 harness collection sentinel — no product behavior coverage', ({ browserName }, testInfo) => {
  expect(testInfo.project.name).toBe('collection');
  expect(browserName).toBe('chromium');
});
