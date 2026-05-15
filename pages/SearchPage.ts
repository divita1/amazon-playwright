import { Page } from '@playwright/test'
import { SearchLocators } from '@/properties/search.locators'
import { amazonTenant } from '@/config/tenants/amazon.tenant'

export class SearchPage {
    readonly page: Page

    constructor(page: Page) {
        this.page = page
    }

    async navigate() {
        await this.page.goto(amazonTenant.url)
        await this.page.waitForLoadState('domcontentloaded')
    }

    async search(keyword: string) {
        await this.page.waitForSelector(SearchLocators.searchBox, { timeout: 15_000 })
        await this.page.fill(SearchLocators.searchBox, keyword)
        await this.page.click(SearchLocators.searchButton)
        await this.page.waitForLoadState('networkidle', { timeout: 30_000 })
    }

    async hasResults(): Promise<boolean> {
        try {
            await this.page.waitForSelector(SearchLocators.resultItem, { timeout: 15_000 })
            const count = await this.page.locator(SearchLocators.resultItem).count()
            return count > 0
        } catch {
            return false
        }
    }

    async selectFirstResult() {
        await this.page.waitForSelector(SearchLocators.resultItem, { timeout: 15_000 })
        // Get the first result link and click it directly — no scroll loop needed
        const firstLink = this.page.locator(SearchLocators.firstResultLink).first()
        await firstLink.waitFor({ state: 'visible', timeout: 15_000 })
        await firstLink.click()
        await this.page.waitForLoadState('domcontentloaded')
    }

    async findProductByName(productName: string): Promise<boolean> {
        try {
            await this.page.waitForSelector(SearchLocators.resultItem, { timeout: 15_000 })
            const links = this.page.locator(SearchLocators.firstResultLink)
            const count = await links.count()

            for (let i = 0; i < count; i++) {
                const text = await links.nth(i).innerText()
                if (text.toLowerCase().includes(productName.toLowerCase())) {
                    await links.nth(i).click()
                    await this.page.waitForLoadState('domcontentloaded')
                    return true
                }
            }
            return false
        } catch {
            return false
        }
    }
}
