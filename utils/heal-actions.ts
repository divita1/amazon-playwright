import { Page } from '@playwright/test'

export async function healClick(page: Page, locator: string): Promise<void> {
    await page.locator(locator).first().click({ timeout: 15_000 })
}

export async function healFill(page: Page, locator: string, value: string): Promise<void> {
    await page.locator(locator).fill(value)
}
