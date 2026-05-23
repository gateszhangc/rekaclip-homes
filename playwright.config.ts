import { defineConfig, devices } from '@playwright/test';

const playwrightPort = process.env.PLAYWRIGHT_PORT || '3002';
const playwrightBaseUrl = `http://localhost:${playwrightPort}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  webServer: {
    command: `cross-env PLAYWRIGHT_PORT=${playwrightPort} npm run dev:playwright`,
    url: `${playwrightBaseUrl}/en`,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === 'true',
    timeout: 120 * 1000,
  },
  use: {
    baseURL: playwrightBaseUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
