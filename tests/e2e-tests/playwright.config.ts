import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: 'list',
  webServer: [
    {
      command: 'VITE_WHITEBOARD_FIXTURE=missing VITE_ENVIRONMENT_TYPE=development pnpm --dir ../../static/spa start:local --host 127.0.0.1 --port 3000',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'VITE_WHITEBOARD_FIXTURE=invalid VITE_ENVIRONMENT_TYPE=development pnpm --dir ../../static/spa start:local --host 127.0.0.1 --port 3001',
      url: 'http://127.0.0.1:3001',
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: 'synthetic-missing',
      grep: /@missing/u,
      use: { baseURL: 'http://127.0.0.1:3000' },
    },
    {
      name: 'synthetic-invalid',
      grep: /@invalid/u,
      use: { baseURL: 'http://127.0.0.1:3001', acceptDownloads: true },
    },
  ],
});
