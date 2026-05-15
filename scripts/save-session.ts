import { chromium } from '@playwright/test'
import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config()

async function saveSession() {
    const profilePath = path.join(__dirname, '../.browser-profile')

    const browser = await chromium.launchPersistentContext(profilePath, {
        headless: false,
        viewport: { width: 1280, height: 720 },
        slowMo: 300,
    })

    const page = await browser.newPage()
    await page.goto('https://www.amazon.in')

    console.log('\n✅ Browser opened.')
    console.log('👉 Please log in to Amazon.in manually in the browser.')
    console.log('👉 Once you are logged in and see your account name, come back here and press Enter.\n')

    await new Promise<void>((resolve) => {
        process.stdin.once('data', () => resolve())
    })

    await browser.close()
    console.log('✅ Session saved! Your tests will now reuse this login.')
}

saveSession()
