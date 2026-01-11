const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  testMatch: ['**/*.spec.cjs'],
  timeout: 420000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 60000
  },
  projects: [
    {
      name: 'chromium',
      use: {
        launchOptions: {
          args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
        }
      }
    },
    {
      name: 'webgl-disabled',
      use: {
        launchOptions: {
          args: ['--disable-webgl', '--disable-webgl2']
        }
      }
    }
  ]
});

