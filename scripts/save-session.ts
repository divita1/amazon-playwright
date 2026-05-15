import { chromium } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import * as dotenv from 'dotenv'
dotenv.config()

const PROFILE_PATH = path.join(__dirname, '../.browser-profile')
const AMAZON_URL = process.env.AMAZON_URL ?? 'https://www.amazon.in'

export function profileExists(): boolean {
    return fs.existsSync(PROFILE_PATH) && fs.readdirSync(PROFILE_PATH).length > 0
}

export async function saveSession(): Promise<void> {
    console.log('\n► No browser session found. Opening browser for login...')
    console.log('► Please log in to Amazon.in in the browser that opens.')
    console.log('► Once logged in and you see your account name, press Enter here.\n')

    const browser = await chromium.launchPersistentContext(PROFILE_PATH, {
        headless: false,
        viewport: { width: 1280, height: 720 },
        slowMo: 300,
    })

    const page = await browser.newPage()
    await page.goto(AMAZON_URL)

    await new Promise<void>((resolve) => {
        process.stdin.once('data', () => resolve())
    })

    await browser.close()
    console.log('✅ Session saved. Continuing...\n')
}
