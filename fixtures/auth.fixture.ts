import { test as base, chromium, BrowserContext } from '@playwright/test'
import * as path from 'path'

const PROFILE_PATH = path.join(__dirname, '../.browser-profile')

export const test = base.extend<{ context: BrowserContext }>({
    context: async ({}, use) => {
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
