import { Page } from '@playwright/test'
import { suggestFix } from './ai-healer'
import * as path from 'path'
import * as fs from 'fs'

export async function healClick(page: Page, locator: string, testName: string): Promise<void> {
    try {
        await page.locator(locator).click({ timeout: 10_000 })
    } catch (err) {
        console.log(`\n[Healer] Locator failed: ${locator}`)
        console.log(`[Healer] Asking Claude for a fix...`)

        const screenshotDir = path.join(__dirname, '../logs/screenshots')
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true })

        const screenshotPath = path.join(screenshotDir, `${testName}-${Date.now()}.png`)
        await page.screenshot({ path: screenshotPath, fullPage: true })

        const suggested = await suggestFix({
            error: String(err),
            locator,
            screenshotPath,
        })

        if (suggested) {
            console.log(`[Healer] Trying suggested locator: ${suggested}`)
            await page.locator(suggested).click({ timeout: 10_000 })
            console.log(`[Healer] Success with: ${suggested}`)
        } else {
            throw err
        }
    }
}

export async function healFill(page: Page, locator: string, value: string, testName: string): Promise<void> {
    try {
        await page.locator(locator).fill(value, )
    } catch (err) {
        console.log(`\n[Healer] Fill failed: ${locator}`)
        console.log(`[Healer] Asking Claude for a fix...`)

        const screenshotDir = path.join(__dirname, '../logs/screenshots')
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true })

        const screenshotPath = path.join(screenshotDir, `${testName}-${Date.now()}.png`)
        await page.screenshot({ path: screenshotPath, fullPage: true })

        const suggested = await suggestFix({
            error: String(err),
            locator,
            screenshotPath,
        })

        if (suggested) {
            console.log(`[Healer] Trying suggested locator: ${suggested}`)
            await page.locator(suggested).fill(value)
            console.log(`[Healer] Success with: ${suggested}`)
        } else {
            throw err
        }
    }
}
