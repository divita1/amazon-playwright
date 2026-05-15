import { chromium } from '@playwright/test'
import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config()

const PROFILE_PATH = path.join(__dirname, '../.browser-profile')

async function debug() {
    const browser = await chromium.launchPersistentContext(PROFILE_PATH, {
        headless: false,
        viewport: { width: 1280, height: 720 },
        slowMo: 500,
    })
    const page = await browser.newPage()
    await page.goto('https://www.amazon.in')
    await page.waitForLoadState('domcontentloaded')

    await page.fill('#twotabsearchtextbox', 'wireless headphones')
    await page.click('#nav-search-submit-button')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)

    console.log('URL after search:', page.url())

    const resultCount = await page.locator('div[data-component-type="s-search-result"]').count()
    console.log('Result count with s-search-result:', resultCount)

    const allDivs = await page.locator('[data-asin]').count()
    console.log('Elements with data-asin:', allDivs)

    const title = await page.title()
    console.log('Page title:', title)

    // Check if CAPTCHA or bot detection page
    const bodyText = await page.locator('body').innerText()
    const isCaptcha = bodyText.toLowerCase().includes('captcha') || bodyText.toLowerCase().includes('robot')
    console.log('CAPTCHA detected:', isCaptcha)

    await page.screenshot({ path: path.join(__dirname, '../logs/after-search.png') })
    console.log('Screenshot saved to logs/after-search.png')

    await browser.close()
}

debug().catch(console.error)
