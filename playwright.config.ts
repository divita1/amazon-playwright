import { defineConfig } from '@playwright/test'
import * as dotenv from 'dotenv'
dotenv.config()

export default defineConfig({
    testDir: './tests',
    timeout: 120_000,
    use: {
        headless: false,
        viewport: { width: 1280, height: 720 },
        screenshot: 'only-on-failure',
        launchOptions: {
            slowMo: 300,
        },
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
    reporter: [['html', { outputFolder: 'test-reports/html' }]],
})
