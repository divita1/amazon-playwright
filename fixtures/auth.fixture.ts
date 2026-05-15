import { test as base, chromium, BrowserContext } from '@playwright/test'
import { execSync } from 'child_process'
import * as path from 'path'

const PROFILE_PATH = path.join(__dirname, '../.browser-profile')

function killExistingChrome() {
    try {
        execSync('pkill -9 -f "Google Chrome for Testing"', { stdio: 'ignore' })
        // Give OS time to release file locks
        execSync('sleep 1', { stdio: 'ignore' })
    } catch {
        // No process running — that's fine
    }
}

export const test = base.extend<{ context: BrowserContext }>({
    context: async ({}, use) => {
        killExistingChrome()
        const context = await chromium.launchPersistentContext(PROFILE_PATH, {
            headless: false,
            viewport: { width: 1280, height: 720 },
            slowMo: 300,
        })
        await use(context)
        await context.close()
    },

    page: async ({ context }, use) => {
        const page = await context.newPage()
        await use(page)
    },
})
