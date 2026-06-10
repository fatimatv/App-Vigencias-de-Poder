import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scripts',
  testMatch: /.*\.spec\.ts/,
  use: {
    browserName: 'chromium',
    headless: true
  }
});
